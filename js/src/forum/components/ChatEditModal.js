import Button from 'flarum/components/Button';
import Dropdown from 'flarum/components/Dropdown';
import classList from 'flarum/utils/classList';
import Model from 'flarum/Model';
import Group from 'flarum/models/Group';

import ChatModal from './ChatModal';
import Stream from 'flarum/utils/Stream';

export default class ChatEditModal extends ChatModal {
    oninit(vnode) {
        super.oninit(vnode);

        this.getInput().title = Stream(this.model.title());
        this.getInput().color = Stream(this.model.color());
        this.getInput().icon = Stream(this.model.icon());

        this.deleteChatTitleInput = Stream('');
        this.deleteState = 0;

        this.initialUsers = this.model.users().filter((mdl) => !mdl.chat_pivot(this.model.id()).removed_at());
        this.setSelectedUsers(this.model.users().filter((mdl) => !mdl.chat_pivot(this.model.id()).removed_at()));
        this.edited = {};

        this.isLocalModerator = this.isModer(app.session.user);
        this.isLocalLeaved = !this.initialUsers.includes(app.session.user);
    }

    title() {
        return app.translator.trans('xelson-chat.forum.chat.edit_modal.title');
    }

    onsubmit() {
        let added = this.getSelectedUsers()
            .map((mdl) => (!this.initialUsers.includes(mdl) ? Model.getIdentifier(mdl) : null))
            .filter((e) => e);
        let removed = this.initialUsers.map((mdl) => (!this.getSelectedUsers().includes(mdl) ? Model.getIdentifier(mdl) : null)).filter((e) => e);
        let edited = Object.keys(this.edited).map((k) => (this.edited[k] = { id: k, ...this.edited[k] }));

        this.model.save({
            title: this.getInput().title(),
            color: this.getInput().color(),
            icon: this.getInput().icon(),
            users: { added, removed, edited },
            relationships: { users: this.getSelectedUsers() },
        });

        this.hide();
    }

    alertText() {
        return null;
    }

    isModer(user) {
        if (!user) return false;
        if (this.edited[user.id()]?.role ?? user.chat_pivot(this.model.id()).role()) return true;
        if (this.isCreator(user)) return true;

        return false;
    }

    isCreator(user) {
        return (
            user.chat_pivot(this.model.id()).role() == 2 ||
            (!this.model.creator() && user.groups() && user.groups().some((g) => g.id() == Group.ADMINISTRATOR_ID))
        );
    }

    userMentionClassname(user) {
        return classList({ editable: true, moder: this.isModer(user), creator: this.isCreator(user) });
    }

    userMentionDropdownOnclick(user, button) {
        switch (button) {
            case 'moder': {
                if (this.isModer(user)) this.edited[user.id()] = { role: 0 };
                else this.edited[user.id()] = { role: 1 };

                break;
            }
            case 'kick': {
                this.getSelectedUsers().splice(this.getSelectedUsers().indexOf(user), 1);
                break;
            }
        }
    }

    componentUserMentionDropdown(user) {
        return (
            <Dropdown
                buttonClassName="Button Button--icon Button--flat Button--mention-edit"
                menuClassName="Dropdown-menu--top Dropdown-menu--bottom Dropdown-menu--left Dropdown-menu--right"
                icon="fas fa-chevron-down"
            >
                <Button
                    icon={this.isModer(user) ? 'fas fa-times' : 'fas fa-users-cog'}
                    onclick={this.userMentionDropdownOnclick.bind(this, user, 'moder')}
                    disabled={user == app.session.user || !this.isCreator(app.session.user) || this.isCreator(user)}
                >
                    {app.translator.trans('xelson-chat.forum.chat.moder')}
                </Button>
                <Button
                    icon="fas fa-trash-alt"
                    onclick={this.userMentionDropdownOnclick.bind(this, user, 'kick')}
                    disabled={user.chat_pivot(this.model.id()).role() >= this.isLocalModerator && user != app.session.user}
                >
                    {app.translator.trans(`xelson-chat.forum.chat.${user == app.session.user ? 'leave' : 'kick'}`)}
                </Button>
            </Dropdown>
        );
    }

    userMentionContent(user) {
        return ['@' + user.displayName(), this.isLocalModerator && !app.chat.isChatPM(this.model) ? this.componentUserMentionDropdown(user) : null];
    }

    userMentionOnClick(user, e) {
        this.$(e.target).find('.Dropdown').trigger('shown.bs.dropdown');
    }

    componentFormInputIcon() {
        return this.componentFormIcon({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.icon.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.icon.validator', {
                a: <a href="https://fontawesome.com/icons?m=free" tabindex="-1" target="blank" />,
            }),
            stream: this.getInput().icon,
            placeholder: 'fas fa-bolt',
        });
    }

    componentFormInputTitle() {
        return this.componentFormInput({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.validator'),
            stream: this.getInput().title,
            placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.title.label'),
        });
    }

    componentFormInputColor() {
        return this.componentFormColor({
            title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.label'),
            desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.validator'),
            stream: this.getInput().color,
            placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.color.label'),
        });
    }

    componentChatInfo() {
        return [
            <label>
                <h2>{this.model.title()}</h2>
            </label>,
            this.componentUsersMentions(),
        ];
    }

    componentFormPM() {
        return this.componentChatInfo();
    }

    componentFormChannel() {
        return this.isLocalModerator
            ? [
                  this.componentFormInputTitle(),
                  this.componentFormInputColor(),
                  this.componentFormInputIcon(),
                  this.componentFormUsersSelect('xelson-chat.forum.chat.edit_modal.form.users.edit'),
              ]
            : this.componentChatInfo();
    }

    componentFormChat() {
        return this.isLocalModerator
            ? [this.componentFormInputTitle(), this.componentFormInputColor(), this.componentFormInputIcon(), this.componentFormUsersSelect()]
            : this.componentChatInfo();
    }

    componentForm() {
        if (this.model.type()) return this.componentFormChannel();
        if (app.chat.isChatPM(this.model)) return this.componentFormPM();

        return this.componentFormChat();
    }

    componentFormButtons() {
        let buttons = [];

        if (this.isLocalModerator && !app.chat.isChatPM(this.model))
            buttons.push(
                <Button
                    className="Button Button--primary Button--block ButtonSave"
                    onclick={this.onsubmit.bind(this)}
                    disabled={this.model.type() ? !this.isCanEditChannel() : !this.isCanEditChat()}
                >
                    {app.translator.trans('xelson-chat.forum.chat.edit_modal.save_button')}
                </Button>
            );

        buttons.push(
            <Button
                className="Button Button--primary Button--block ButtonLeave"
                onclick={this.onleave.bind(this)}
                disabled={this.model.removed_by() && this.model.removed_by() != app.session.user.id()}
            >
                {app.translator.trans(`xelson-chat.forum.chat.edit_modal.form.${this.isLocalLeaved ? 'return' : 'leave'}`)}
            </Button>
        );

        if (!app.chat.isChatPM(this.model) && app.chat.getPermissions().create.channel) buttons.push(this.componentDeleteChat());

        return buttons;
    }

    onleave() {
        if (!this.isLocalLeaved) {
            this.model.save({
                users: { removed: [Model.getIdentifier(app.session.user)] },
                relationships: { users: this.getSelectedUsers() },
            });
        } else {
            this.getSelectedUsers().push(app.session.user);

            this.model.save({
                users: { added: [Model.getIdentifier(app.session.user)] },
                relationships: { users: this.getSelectedUsers() },
            });
        }

        this.hide();
    }

    isCanEditChannel() {
        return this.getInput().title().length;
    }

    isCanEditChat() {
        if (this.alertText()) return false;

        return true;
    }

    componentDeleteChat() {
        return [
            this.deleteState == 1
                ? [
                      <br></br>,
                      this.componentFormInput({
                          title: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.title'),
                          desc: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.desc'),
                          placeholder: app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.placeholder'),
                          stream: this.deleteChatTitleInput,
                      }),
                  ]
                : null,
            <Button
                className="Button Button--primary Button--block ButtonDelete"
                onclick={this.ondelete.bind(this)}
                disabled={this.deleteState == 1 && !this.isValidTitleCopy()}
            >
                {app.translator.trans('xelson-chat.forum.chat.edit_modal.form.delete.button')}
            </Button>,
        ];
    }

    isValidTitleCopy() {
        return this.deleteChatTitleInput() == this.model.title();
    }

    ondelete() {
        switch (this.deleteState) {
            case 0: {
                this.deleteState = 1;
                break;
            }
            case 1: {
                if (this.isValidTitleCopy()) {
                    app.chat.deleteChat(this.model);
                    this.model.delete();

                    this.hide();
                }
                break;
            }
        }
    }

    content() {
        return (
            <div className="Modal-body">
                <div class="Form-group InputTitle">
                    {this.componentForm()}
                    <div className="ButtonsPadding"></div>
                    {this.componentFormButtons()}
                </div>
            </div>
        );
    }
}
