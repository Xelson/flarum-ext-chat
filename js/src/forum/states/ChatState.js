import Message from '../models/Message';

import Model from 'flarum/Model';
import Stream from 'flarum/utils/Stream';

import * as resources from '../resources';
import ViewportState from './ViewportState';

var refAudio = new Audio();
refAudio.src = resources.base64AudioNotificationRef;
refAudio.volume = 0.5;

var audio = new Audio();
audio.src = resources.base64AudioNotification;
audio.volume = 0.5;

export default class ChatState {
    constructor() {
        this.q = Stream('');
        this.chats = [];
        this.chatmessages = [];

        this.chatsLoading = true;
        this.curChat = null;
        this.totalHiddenCount = 0;

        let neonchatState = JSON.parse(localStorage.getItem('neonchat')) ?? {};

        this.frameState = {
            beingShown: neonchatState.beingShown ?? app.forum.attribute('xelson-chat.settings.display.minimize'),
            beingShownChatsList: neonchatState.beingShownChatsList ?? 0,
            isMuted: neonchatState.isMuted ?? false,
            notify: neonchatState.notify ?? false,
            transform: neonchatState.transform ?? { x: 0, y: 400 },
            isActive: true,
            selectedChat: neonchatState.selectedChat ?? 0,
        };

        this.permissions = {
            post: app.forum.attribute('xelson-chat.permissions.chat'),
            edit: app.forum.attribute('xelson-chat.permissions.edit'),
            delete: app.forum.attribute('xelson-chat.permissions.delete'),
            create: {
                channel: app.forum.attribute('xelson-chat.permissions.create.channel'),
                chat: app.forum.attribute('xelson-chat.permissions.create'),
            },
            moderate: {
                delete: app.forum.attribute('xelson-chat.permissions.moderate.delete'),
                vision: app.forum.attribute('xelson-chat.permissions.moderate.vision'),
            },
        };

        this.viewportStates = {};
        if (app.session.user) app.pusher.then(this.listenSocketChannels.bind(this));
    }

    getViewportState(model) {
        return this.viewportStates[model.id()];
    }

    listenSocketChannels(socket) {
        socket.main.bind('neonchat.events', this.handleSocketEvent.bind(this));
        if (socket.user) socket.user.bind('neonchat.events', this.handleSocketEvent.bind(this));
    }

    handleSocketEvent(r) {
        console.log(r);

        let message = r.response.message;
        if (message) message = app.store.pushPayload(message);

        let chat = r.response.chat;
        if (chat) chat = app.store.pushPayload(chat);

        // Workaround for blocking events from a socket if we need it
        if ((message && (message.chat().removed_at() || message.user() == app.session.user)) || (chat && chat.removed_at())) return;

        switch (r.event.id) {
            case 'message.post': {
                if (!app.session.user || message.user().id() != app.session.user.id()) {
                    this.insertChatMessage(message, true);
                    m.redraw();
                }
                break;
            }
            case 'message.edit': {
                let actions = message.data.attributes.actions;
                if (actions.msg !== undefined) {
                    if (!app.session.user || message.user().id() != app.session.user.id()) this.editChatMessage(message, false, actions.msg);
                } else if (actions.hide !== undefined) {
                    if (!app.session.user || actions.invoker != app.session.user.id())
                        actions.hide ? this.hideChatMessage(message, false, message.deleted_by()) : this.restoreChatMessage(message, false);
                }
                break;
            }
            case 'message.delete': {
                if (!app.session.user || message.deleted_by().id() != app.session.user.id())
                    this.deleteChatMessage(message, false, message.deleted_by());

                break;
            }
            case 'chat.create': {
                if (!app.session.user || chat.creator() != app.session.user) {
                    this.addChat(chat, true);
                    m.redraw();
                }
                break;
            }
            case 'chat.edit': {
                this.editChat(chat, true);
                let range = r.response.eventmsg_range;
                if (range.length) this.apiFetchChatMessages(chat, range, { notify: true, withFlash: true, disableLoader: true });

                if (app.session.user && r.response.roles_updated_for && r.response.roles_updated_for.includes(app.session.user.id())) {
                    let role = app.session.user.chat_pivot(chat.id()).role();
                    switch (role) {
                        case 0: {
                            app.alerts.show(
                                { type: 'error' },
                                app.translator.trans('xelson-chat.forum.chat.edit_modal.moderator.lost', { chatname: <b>{chat.title()}</b> })
                            );
                            break;
                        }
                        case 1: {
                            app.alerts.show(
                                { type: 'success' },
                                app.translator.trans('xelson-chat.forum.chat.edit_modal.moderator.got', { chatname: <b>{chat.title()}</b> })
                            );
                            break;
                        }
                    }
                }

                m.redraw();

                break;
            }
            case 'chat.delete': {
                if (!app.session.user || chat.creator() != app.session.user) {
                    this.deleteChat(chat);
                    m.redraw();
                }
                break;
            }
        }
    }

    getFrameState(key) {
        return this.frameState[key];
    }

    saveFrameState(key, value) {
        let neonchatState = JSON.parse(localStorage.getItem('neonchat')) ?? {};
        neonchatState[key] = value;
        localStorage.setItem('neonchat', JSON.stringify(neonchatState));

        this.frameState[key] = value;
    }

    getPermissions() {
        return this.permissions;
    }

    getChats() {
        return this.chats.filter((chat) => (this.q() && chat.matches(this.q().toLowerCase())) || (!this.q() && !chat.removed_at()));
    }

    getChatsSortedByLastUpdate() {
        return this.getChats().sort((a, b) => {
            if (b.last_message() && a.last_message()) {
                return b.last_message()?.created_at() - a.last_message()?.created_at();
            }
            return 0;
        });
    }

    addChat(model, outside = false) {
        this.chats.push(model);
        this.viewportStates[model.id()] = new ViewportState();

        if (model.id() == this.getFrameState('selectedChat')) this.onChatChanged(model);
        if (outside) model.isNeedToFlash = true;
    }

    editChat(model, outside = false) {
        if (outside) model.isNeedToFlash = true;
    }

    apiReadChat(chat, message) {
        if (this.readingTimeout) clearTimeout(this.readingTimeout);

        let timestamp;
        if (message instanceof Date) timestamp = message.toISOString();
        else if (message instanceof Message) timestamp = message.created_at().toISOString();

        this.readingTimeout = setTimeout(() => chat.save({ actions: { reading: timestamp } }), 1000);
    }

    deleteChat(model) {
        this.chats = this.chats.filter((mdl) => mdl != model);
        if (this.getCurrentChat() == model) this.setCurrentChat(null);
    }

    isChatPM(model) {
        return model.type() == 0 && model.users().length <= 2;
    }

    isExistsPMChat(user1, user2) {
        return this.getChats().some((model) => {
            let users = model.users();
            return model.type() === 0 && users.length === 2 && users.some((model) => model == user1) && users.some((model) => model == user2);
        });
    }

    colorizeOddChatMessages() {
        let odd = false;
        $($('.message-wrapper').get().reverse()).each(function () {
            let e = $(this);
            if (!e.hasClass('deleted')) {
                odd = !odd;
                odd ? e.removeClass('odd') : e.addClass('odd');
            }
        });
    }

    onChatChanged(model, e = {}) {
        e.redraw = false;
        if (model == this.getCurrentChat()) return;

        this.setCurrentChat(model);
        m.redraw.sync();
    }

    comporatorAscButZerosDesc(a, b) {
        return a == 0 ? 1 : b == 0 ? -1 : a - b;
    }

    getChatMessages(filter) {
        let list = this.chatmessages.sort((a, b) => this.comporatorAscButZerosDesc(a.id(), b.id()));
        return filter ? list.filter(filter) : list;
    }

    apiFetchChatMessages(model, query, options = {}) {
        let viewport = this.getViewportState(model);
        let self = this;

        if (viewport.loading || viewport.loadingQueries[query]) return;

        viewport.loading = true;
        viewport.loadingQueries[query] = true;

        return app.store.find('chatmessages', { chat_id: model.id(), query }).then((r) => {
            if (r.length) {
                r.map((model) => {
                    if (options.withFlash) model.isNeedToFlash = true;
                    self.insertChatMessage(model);
                });
                if (options.notify) this.messageNotify(r[0]);

                viewport.loading = false;
                viewport.loadingQueries[query] = false;
                viewport.scroll.autoScroll = false;

                m.redraw();
            }
        });
    }

    isChatMessageExists(model) {
        return this.chatmessages.find((e) => e.id() == model.id());
    }

    insertEventChatMessage(model, data, notify = false) {
        model.pushAttributes({ message: JSON.stringify(data) });
        insertChatMessage(model, notify);
    }

    insertChatMessage(model, notify = false) {
        if (this.isChatMessageExists(model)) return null;

        this.chatmessages.push(model);
        if (notify) {
            this.messageNotify(model);
            model.isNeedToFlash = true;

            let chatModel = model.chat();
            chatModel.isNeedToFlash = true;
            chatModel.pushAttributes({ unreaded: chatModel.unreaded() + 1 });
        }

        let list = this.getChatMessages((mdl) => mdl.chat() == model.chat());
        if ((notify || model.chat().removed_at()) && model.id() && list[list.length - 1] == model) {
            model.chat().pushData({ relationships: { last_message: model } });
            this.getViewportState(model.chat()).newPushedPosts = true;
        }
    }

    renderChatMessage(model, content) {
        let element = model instanceof Model ? document.querySelector(`.NeonChatFrame .message-wrapper[data-id="${model.id()}"] .message`) : model;

        if (element) {
            element.innerText = content;
            s9e.TextFormatter.preview(content, element);

            if (this.executeScriptsTimeout) clearTimeout(this.executeScriptsTimeout);
            this.executeScriptsTimeout = setTimeout(() => {
                $('.NeonChatFrame script').each(function () {
                    if (!self.executedScripts) self.executedScripts = {};
                    let scriptURL = $(this).attr('src');
                    if (!self.executedScripts[scriptURL]) {
                        var scriptTag = document.createElement('script');
                        scriptTag.src = scriptURL;
                        document.head.appendChild(scriptTag);

                        self.executedScripts[scriptURL] = true;
                    }
                });
            }, 100);
        }
    }

    onChatMessageClicked(eventName, model) {
        switch (eventName) {
            case 'dropdownHide': {
                this.hideChatMessage(model, true);
                break;
            }
            case 'dropdownRestore': {
                this.restoreChatMessage(model, true);
                break;
            }
            case 'dropdownDelete': {
                this.deleteChatMessage(model, true);
                break;
            }
        }
    }

    postChatMessage(model) {
        return model.save({ message: model.content, created_at: new Date(), chat_id: model.chat().id() }).then(
            (r) => {
                model.isTimedOut = false;
                model.isNeedToFlash = true;
                model.isEditing = false;
                model.chat().pushData({ relationships: { last_message: model } });
            },
            (r) => {
                model.isTimedOut = true;
            }
        );
    }

    editChatMessage(model, sync = false, content) {
        model.content = content;
        model.isNeedToFlash = true;
        model.pushAttributes({ message: content, edited_at: new Date() });
        if (sync) model.save({ actions: { msg: content }, edited_at: new Date(), message: content });

        m.redraw();
    }

    deleteChatMessage(model, sync = false, user = app.session.user) {
        model.isDeletedForever = true;
        if (!model.deleted_by()) model.pushData({ relationships: { deleted_by: user } });
        let list = this.getChatMessages((mdl) => mdl.chat() == model.chat() && !mdl.isDeletedForever);
        if (list.length) model.chat().pushData({ relationships: { last_message: list[list.length - 1] } });

        this.chatmessages = this.chatmessages.filter((mdl) => mdl != model);
        if (sync) model.delete();

        m.redraw();
    }

    totalHidden() {
        return this.totalHiddenCount;
    }

    hideChatMessage(model, sync = false, user = app.session.user) {
        model.pushData({ relationships: { deleted_by: user } });
        if (sync) model.save({ actions: { hide: true }, relationships: { deleted_by: app.session.user } });

        this.totalHiddenCount++;
        m.redraw();
    }

    restoreChatMessage(model, sync = false) {
        if (!this.isChatMessageExists(model)) {
            this.insertChatMessage(model);
            model.isNeedToFlash = true;
        } else {
            model.pushAttributes({ deleted_by: 0 });
            model.isNeedToFlash = true;
            delete model.data.relationships.deleted_by;
        }
        if (sync) model.save({ actions: { hide: false }, deleted_by: 0 });

        m.redraw();
    }

    setCurrentChat(model) {
        this.curChat = model;
        this.saveFrameState('selectedChat', model ? model.id() : null);
    }

    getCurrentChat() {
        return this.curChat;
    }

    apiFetchChats() {
        return app.store.find('chats').then((chats) => {
            chats.map((model) => this.addChat(model));
            this.chatsLoading = false;
            m.redraw();
        });
    }

    messageNotify(model) {
        if (!app.session.user || model.user().id() != app.session.user.id()) this.notifyTry(model);
    }

    notifyTry(model) {
        if (!('Notification' in window)) return;

        if (this.messageIsMention(model)) this.notifySend(model);
        this.notifySound(model);
    }

    messageIsMention(model) {
        return app.session.user && model.message().indexOf('@' + app.session.user.username()) >= 0;
    }

    notifySend(model) {
        let avatar = model.user().avatarUrl();
        if (!avatar) avatar = resources.base64PlaceholderAvatarImage;

        if (this.getFrameState('notify') && document.hidden)
            new Notification(model.chat().title(), {
                body: `${model.user().username()}: ${model.message()}`,
                icon: avatar,
                silent: true,
                timestamp: new Date(),
            });
    }

    notifySound(model) {
        if (!this.getFrameState('isMuted')) {
            let sound = this.messageIsMention(model) ? refAudio : audio;
            sound.currentTime = 0;
            sound.play();
        }
    }

    /**
     * https://github.com/flarum/core/blob/7e74f5a03c7f206014f3f091968625fc0bf29094/js/src/forum/components/PostStream.js#L579
     *
     * 'Flash' the given post, drawing the user's attention to it.
     *
     * @param {jQuery} $item
     */
    flashItem($item) {
        $item.addClass('flash').one('animationend webkitAnimationEnd', () => $item.removeClass('flash'));
    }
}
