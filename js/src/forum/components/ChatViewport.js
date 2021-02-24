import Component from 'flarum/Component';
import LoadingIndicator from 'flarum/components/LoadingIndicator';

import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatEventMessage from './ChatEventMessage';
import ChatWelcome from './ChatWelcome';
import Message from '../models/Message';
import timedRedraw from '../utils/timedRedraw';
import ChatPage from './ChatPage';

export default class ChatViewport extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.model = this.attrs.chatModel;
        this.state = app.chat.getViewportState(this.model);
    }

    oncreate(vnode) {
        super.oncreate(vnode);
        this.loadChat();
    }

    onupdate(vnode) {
        //app.chat.colorizeOddChatMessages();

        const model = this.attrs.chatModel;

        if (model !== this.model) {
            this.model = model;
            this.state = app.chat.getViewportState(this.model);

            this.loadChat();
        }
    }

    loadChat() {
        const oldScroll = this.state.scroll.oldScroll;

        this.reloadMessages();
        m.redraw();

        setTimeout(() => {
            const element = this.element;

            this.getChatWrapper().scrollTop = element.scrollHeight - element.clientHeight - oldScroll;
        }, 200);
    }

    view(vnode) {
        if (this.model) {
            return (
                <div className="ChatViewport">
                    <div
                        className="wrapper"
                        oncreate={this.wrapperOnCreate.bind(this)}
                        onbeforeupdate={this.wrapperOnBeforeUpdate.bind(this)}
                        onupdate={this.wrapperOnUpdate.bind(this)}
                        onremove={this.wrapperOnRemove.bind(this)}
                    >
                        {this.componentLoader(this.state.scroll.loading)}
                        {this.componentsChatMessages(this.model).concat(
                            this.state.input.writingPreview ? this.componentChatMessage(this.state.input.previewModel) : []
                        )}
                    </div>
                    <ChatInput
                        state={this.state}
                        model={this.model}
                        oninput={() => {
                            if (this.nearBottom() && !this.state.messageEditing) {
                                this.scrollToBottom();
                            }
                        }}
                    ></ChatInput>
                    {this.isFastScrollAvailable() ? this.componentScroller() : null}
                </div>
            );
        }

        return <ChatWelcome />;
    }

    componentChatMessage(model) {
        return model.type() ? <ChatEventMessage key={model.id()} model={model} /> : <ChatMessage key={model.id()} model={model} />;
    }

    componentsChatMessages(chat) {
        return app.chat.getChatMessages((message) => message.chat() === chat).map((model) => this.componentChatMessage(model));
    }

    componentScroller() {
        return (
            <div className="scroller" onclick={this.fastScroll.bind(this)}>
                <i class="fas fa-angle-down"></i>
            </div>
        );
    }

    componentLoader(watch) {
        return watch ? (
            <msgloader className="message-wrapper--loading">
                <LoadingIndicator className="loading-old Button-icon" />
            </msgloader>
        ) : null;
    }
    getChatWrapper() {
        return app.screen() === 'phone' && app.current.matches(ChatPage)
            ? document.documentElement
            : document.querySelector('.ChatViewport .wrapper');
    }

    isFastScrollAvailable() {
        let chatWrapper = this.getChatWrapper();
        return (
            (this.state.newPushedPosts ||
                this.model.unreaded() >= 30 ||
                (chatWrapper && chatWrapper.scrollHeight > 2000 && chatWrapper.scrollTop < chatWrapper.scrollHeight - 2000)) &&
            !this.nearBottom()
        );
    }

    fastScroll(e) {
        if (this.model.unreaded() >= 30) this.fastMessagesFetch(e);
        else {
            let chatWrapper = this.getChatWrapper();
            chatWrapper.scrollTop = Math.max(chatWrapper.scrollTop, chatWrapper.scrollHeight - 3000);
            this.scrollToBottom();
        }
    }

    fastMessagesFetch(e) {
        e.redraw = false;
        app.chat.chatmessages = [];

        app.chat.apiFetchChatMessages(this.model).then((r) => {
            this.scrollToBottom();
            timedRedraw(300);

            this.model.pushAttributes({ unreaded: 0 });
            let message = app.chat.getChatMessages((mdl) => mdl.chat() == this.model).slice(-1)[0];
            app.chat.apiReadChat(this.model, message);
        });
    }

    wrapperOnCreate(vnode) {
        super.oncreate(vnode);
        this.wrapperOnUpdate(vnode);

        (app.current.matches(ChatPage) ? window : vnode.dom).addEventListener(
            'scroll',
            (this.boundScrollListener = this.wrapperOnScroll.bind(this)),
            { passive: true }
        );

        if (!app.current.matches(ChatPage) && app.screen() !== 'phone') vnode.dom.style.height = app.chat.getFrameState('transform').y + 'px';
    }

    wrapperOnBeforeUpdate(vnode, vnodeNew) {
        if (!this.state.autoScroll && this.nearBottom() && this.state.newPushedPosts) {
            this.scrollAfterUpdate = true;
        }
    }

    wrapperOnUpdate(vnode) {
        let el = vnode.dom;
        if (this.model && this.state.scroll.autoScroll) {
            if (this.autoScrollTimeout) clearTimeout(this.autoScrollTimeout);
            this.autoScrollTimeout = setTimeout(this.scrollToBottom.bind(this, true), 100);
        }
        if (el.scrollTop <= 0) el.scrollTop = 1;
        this.checkUnreaded();

        if (this.scrollAfterUpdate) {
            this.scrollAfterUpdate = false;
            this.scrollToBottom();
        }
    }

    wrapperOnRemove(vnode) {
        vnode.dom.removeEventListener('scroll', this.boundScrollListener);
    }

    wrapperOnScroll(e) {
        const el = app.current.matches(ChatPage) ? document.documentElement : this.element;

        this.state.scroll.oldScroll = el.scrollHeight - el.clientHeight - el.scrollTop;

        this.checkUnreaded();

        if (this.lastFastScrollStatus != this.isFastScrollAvailable()) {
            this.lastFastScrollStatus = this.isFastScrollAvailable();
            m.redraw();
        }

        let currentHeight = el.scrollHeight;

        if (this.atBottom()) {
            this.state.newPushedPosts = false;
        }

        if (this.state.scroll.autoScroll || this.state.loading || this.scrolling) return;

        if (!this.state.messageEditing && el.scrollTop >= 0) {
            if (el.scrollTop <= 500) {
                let topMessage = app.chat.getChatMessages((model) => model.chat() == this.model)[0];
                if (topMessage && topMessage != this.model.first_message()) {
                    app.chat.apiFetchChatMessages(this.model, topMessage.created_at().toISOString());
                }
            } else if (el.scrollTop + el.offsetHeight >= currentHeight - 500) {
                let bottomMessage = app.chat.getChatMessages((model) => model.chat() == this.model).slice(-1)[0];
                if (bottomMessage && bottomMessage != this.model.last_message()) {
                    app.chat.apiFetchChatMessages(this.model, bottomMessage.created_at().toISOString());
                }
            }
        }
    }

    checkUnreaded() {
        let wrapper = this.getChatWrapper();
        if (wrapper && this.model.unreaded()) {
            let list = app.chat.getChatMessages((mdl) => mdl.chat() == this.model && mdl.created_at() >= this.model.readed_at() && !mdl.isReaded);

            for (const message of list) {
                let msg = document.querySelector(`.message-wrapper[data-id="${message.id()}"`);
                if (msg && wrapper.scrollTop + wrapper.offsetHeight >= msg.offsetTop) {
                    message.isReaded = true;

                    if (this.state.scroll.autoScroll && app.chat.getCurrentChat() == this.model) {
                        app.chat.apiReadChat(this.model, new Date());
                        this.model.pushAttributes({ unreaded: 0 });
                    } else {
                        app.chat.apiReadChat(this.model, message);
                        this.model.pushAttributes({ unreaded: this.model.unreaded() - 1 });
                    }

                    m.redraw();
                }
            }
        }
    }

    scrollToAnchor(anchor) {
        let element;
        if (anchor instanceof Message) element = $(`.message-wrapper[data-id="${anchor.id()}"`)[0];
        else element = anchor;

        let chatWrapper = this.getChatWrapper();
        if (chatWrapper && element)
            $(chatWrapper)
                .stop()
                .animate({ scrollTop: element.offsetTop - element.offsetHeight }, 500);
        else setTimeout(scroll, 100);
    }

    scrollToBottom(force = false) {
        this.scrolling = true;
        let chatWrapper = this.getChatWrapper();
        if (chatWrapper) {
            const notAtBottom = !force && this.atBottom();
            const fewMessages =
                app.current.matches(ChatPage) &&
                document.querySelector('.ChatViewport .wrapper').scrollHeight + 200 < document.documentElement.clientHeight;
            if (notAtBottom || fewMessages) return;

            $(chatWrapper)
                .stop()
                .animate({ scrollTop: chatWrapper.scrollHeight }, 250, 'swing', () => {
                    this.state.scroll.autoScroll = false;
                    this.scrolling = false;
                });
        }
    }

    reloadMessages() {
        if (!this.state.messagesFetched) {
            let query;
            if (this.model.unreaded()) {
                query = this.model.readed_at()?.toISOString() ?? new Date(0).toISOString();
                this.state.scroll.autoScroll = false;
            }

            app.chat.apiFetchChatMessages(this.model, query).then(() => {
                if (this.model.unreaded()) {
                    let anchor = app.chat.getChatMessages((mdl) => mdl.chat() == this.model && mdl.created_at() > this.model.readed_at())[0];
                    this.scrollToAnchor(anchor);
                } else this.state.scroll.autoScroll = true;

                m.redraw();
            });

            this.state.messagesFetched = true;
        }
    }

    nearBottom() {
        return this.pixelsFromBottom() <= 500;
    }

    atBottom() {
        return this.pixelsFromBottom() <= 5;
    }

    pixelsFromBottom() {
        const element = app.current.matches(ChatPage) ? document.documentElement : this.element;
        return Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight);
    }
}
