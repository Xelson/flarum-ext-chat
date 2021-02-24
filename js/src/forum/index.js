import { extend } from 'flarum/extend';
import Application from 'flarum/Application';
import ChatFrame from './components/ChatFrame';

import Chat from './models/Chat';
import Message from './models/Message';
import User from 'flarum/models/User';
import Model from 'flarum/Model';
import ChatState from './states/ChatState';
import addChatPage from './addChatPage';

const chat = document.createElement('div');
chat.setAttribute('id', 'chat');

document.body.append(chat);

app.initializers.add('xelson-chat', (app) => {
    app.store.models.chats = Chat;
    app.store.models.chatmessages = Message;

    function pivot(name, id, attr, transform) {
        pivot.hasOne = function (name, id, attr) {
            return function () {
                const relationship = this.data.attributes[name] && this.data.attributes[name][id] && this.data.attributes[name][id][attr];
                if (relationship) return app.store.getById(relationship.data.type, relationship.data.id);
            };
        };

        return function () {
            const value = this.data.attributes[name] && this.data.attributes[name][id] && this.data.attributes[name][id][attr];
            return transform ? transform(value) : value;
        };
    }

    Object.assign(User.prototype, {
        chat_pivot(chat_id) {
            return {
                role: pivot('chat_pivot', chat_id, 'role').bind(this),
                removed_by: pivot('chat_pivot', chat_id, 'removed_by').bind(this),
                readed_at: pivot('chat_pivot', chat_id, 'readed_at', Model.transformDate).bind(this),
                removed_at: pivot('chat_pivot', chat_id, 'removed_at', Model.transformDate).bind(this),
                joined_at: pivot('chat_pivot', chat_id, 'joined_at', Model.transformDate).bind(this),
            };
        },
    });

    extend(Application.prototype, 'mount', function () {
        if (!app.forum.attribute('xelson-chat.permissions.enabled')) return;

        app.chat = new ChatState();

        m.mount(document.getElementById('chat'), ChatFrame);

        if ('Notification' in window && app.chat.getFrameState('notify')) Notification.requestPermission();

        if (!app.pusher) {
            alert('Please enable Pusher/WebSocket to use Neon Chat!');
            return;
        }

        app.chat.apiFetchChats();
    });

    addChatPage();
});
