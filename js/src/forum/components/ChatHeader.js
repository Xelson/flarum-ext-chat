import Component from 'flarum/Component';
import Link from 'flarum/components/Link';
import ItemList from 'flarum/utils/ItemList';

import ChatEditModal from './ChatEditModal';

export default class ChatHeader extends Component {
    view(vnode) {
        const attrs = {};

        if (this.attrs.ondragstart) attrs.ondragstart = this.attrs.ondragstart;
        if (this.attrs.ondragstart) attrs.onmousedown = this.attrs.onmousedown;

        return (
            <div className="ChatHeader" {...attrs}>
                {this.attrs.showChatListStream ? (
                    <div
                        className="icon"
                        onclick={(e) => {
                            this.attrs.showChatListStream(!this.attrs.showChatListStream());
                            e.stopPropagation();
                        }}
                    >
                        <i className="fas fa-list"></i>
                    </div>
                ) : (
                    ''
                )}
                <h2>
                    {app.chat.getCurrentChat()
                        ? [
                              app.chat.getCurrentChat().icon() ? (
                                  <i
                                      class={app.chat.getCurrentChat().icon()}
                                      style={{ color: app.chat.getCurrentChat().color(), 'margin-right': '3px' }}
                                  ></i>
                              ) : null,
                              app.chat.getCurrentChat().title(),
                          ]
                        : app.translator.trans('xelson-chat.forum.toolbar.title')}
                </h2>
                {!app.chat.getCurrentChat() || !app.session.user ? null : (
                    <div
                        className="icon"
                        data-title={app.translator.trans('xelson-chat.forum.toolbar.chat.settings')}
                        onclick={() => app.modal.show(ChatEditModal, { model: app.chat.getCurrentChat() })}
                    >
                        <i className="fas fa-cog"></i>
                    </div>
                )}
                <div className="window-buttons">{this.windowButtonItems().toArray()}</div>
            </div>
        );
    }

    windowButtonItems() {
        const items = new ItemList();

        items.add(
            'sound',
            <div
                className="icon"
                onclick={this.toggleSound.bind(this)}
                data-title={app.translator.trans(
                    'xelson-chat.forum.toolbar.' + (app.chat.getFrameState('isMuted') ? 'enable_sounds' : 'disable_sounds')
                )}
            >
                <i className={app.chat.getFrameState('isMuted') ? 'fas fa-volume-mute' : 'fas fa-volume-up'}></i>
            </div>
        );

        items.add(
            'notifications',
            <div
                className="icon"
                onclick={this.toggleNotifications.bind(this)}
                data-title={app.translator.trans(
                    'xelson-chat.forum.toolbar.' + (app.chat.getFrameState('notify') ? 'disable_notifications' : 'enable_notifications')
                )}
            >
                <i className={app.chat.getFrameState('notify') ? 'fas fa-bell' : 'fas fa-bell-slash'}></i>
            </div>
        );

        if (this.attrs.inFrame) {
            items.add(
                'minimize',
                <div
                    className="icon"
                    onclick={this.toggleChat.bind(this)}
                    data-title={app.translator.trans('xelson-chat.forum.toolbar.' + (app.chat.getFrameState('beingShown') ? 'minimize' : 'maximize'))}
                >
                    <i className={app.chat.getFrameState('beingShown') ? 'fas fa-window-minimize' : 'fas fa-window-maximize'}></i>
                </div>
            );
        }

        if (this.attrs.inFrame && app.screen() === 'phone') {
            items.add(
                'fullscreen',
                <Link
                    className="icon"
                    href={app.route('chat')}
                    data-title={app.translator.trans('xelson-chat.forum.toolbar.' + (app.chat.getFrameState('beingShown') ? 'minimize' : 'maximize'))}
                >
                    <i className="fas fa-expand"></i>
                </Link>
            );
        }

        return items;
    }

    toggleChat(e) {
        const showing = !app.chat.getFrameState('beingShown');

        app.chat.saveFrameState('beingShown', showing);

        e.preventDefault();
        e.stopPropagation();
    }

    toggleSound(e) {
        app.chat.saveFrameState('isMuted', !app.chat.getFrameState('isMuted'));

        e.preventDefault();
        e.stopPropagation();
    }

    toggleNotifications(e) {
        app.chat.saveFrameState('notify', !app.chat.getFrameState('notify'));
        if ('Notification' in window && app.chat.getFrameState('notify')) Notification.requestPermission();

        e.preventDefault();
        e.stopPropagation();
    }
}
