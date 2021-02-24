import Button from 'flarum/components/Button';
import classList from 'flarum/utils/classList';

import ChatSearchUser from './ChatSearchUser';
import ChatModal from './ChatModal';
import Stream from 'flarum/utils/Stream';

export default class ChatCreateModal extends ChatModal {
    oninit(vnode) {
        super.oninit(vnode);

        this.isChannel = false;
    }

    title() {
        return app.translator.trans('xelson-chat.forum.chat.list.add_modal.title');
    }

    onsubmit() {
        app.store
            .createRecord('chats')
            .save({
                title: this.getInput().title(),
                isChannel: this.isChannel,
                icon: this.getInput().icon(),
                color: this.getInput().color(),
                relationships: { users: [...this.getSelectedUsers(), app.session.user] },
            })
            .then((model) => {
                app.chat.addChat(model);
                app.chat.onChatChanged(model);
                m.redraw();
            });
        this.hide();
    }

    componentFormInputColor() {
        return this.componentFormColor({
            title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.validator'),
            stream: this.getInput().color,
            placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.color.label'),
        });
    }

    componentFormInputIcon() {
        return this.componentFormIcon({
            title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.icon.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.icon.validator', {
                a: <a href="https://fontawesome.com/icons?m=free" tabindex="-1" target="blank" />,
            }),
            stream: this.getInput().icon,
            placeholder: 'fas fa-bolt',
        });
    }

    componentFormChat() {
        return [
            this.usersSelected.length > 1
                ? [
                      this.componentFormInput({
                          title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.chat'),
                          desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.validator'),
                          stream: this.getInput().title,
                          placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.chat'),
                      }),
                      this.componentFormInputColor(),
                      this.componentFormInputIcon(),
                  ]
                : null,
            this.componentFormUsersSelect(),
        ];
    }

    componentFormChannel() {
        return [
            this.componentFormInput({
                title: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.channel'),
                desc: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.validator'),
                stream: this.getInput().title,
                placeholder: app.translator.trans('xelson-chat.forum.chat.list.add_modal.form.title.channel'),
            }),
            this.componentFormInputColor(),
            this.componentFormInputIcon(),
        ];
    }

    isCanCreateChat() {
        if (this.getSelectedUsers().length > 1 && !this.getInput().title().length) return false;
        if (!this.getSelectedUsers().length) return false;
        if (this.alertText()) return false;

        return true;
    }

    isCanCreateChannel() {
        return this.getInput().title().length;
    }

    content() {
        return (
            <div className="Modal-body">
                <div class="Form-group InputTitle">
                    {app.chat.getPermissions().create.channel ? (
                        <div className="ChatType">
                            <div
                                className={classList({ 'Tab Tab--left': true, 'Tab--active': !this.isChannel })}
                                onclick={(() => (this.isChannel = false)).bind(this)}
                            >
                                {app.translator.trans('xelson-chat.forum.chat.list.add_modal.chat')}
                            </div>
                            <div
                                className={classList({ 'Tab Tab--right': true, 'Tab--active': this.isChannel })}
                                onclick={(() => (this.isChannel = true)).bind(this)}
                            >
                                {app.translator.trans('xelson-chat.forum.chat.list.add_modal.channel')}
                            </div>
                        </div>
                    ) : null}
                    {this.isChannel ? this.componentFormChannel() : this.componentFormChat()}
                    <div className="ButtonsPadding"></div>
                    <Button
                        className="Button Button--primary Button--block"
                        disabled={this.isChannel ? !this.isCanCreateChannel() : !this.isCanCreateChat()}
                        onclick={this.onsubmit.bind(this)}
                    >
                        {app.translator.trans('xelson-chat.forum.chat.list.add_modal.create.chat')}
                    </Button>
                </div>
            </div>
        );
    }
}
