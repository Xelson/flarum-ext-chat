import Component from 'flarum/Component';
import avatar from 'flarum/helpers/avatar';
import username from 'flarum/helpers/username';
import fullTime from 'flarum/helpers/fullTime';
import classList from 'flarum/utils/classList';
import humanTime from 'flarum/utils/humanTime';
import extractText from 'flarum/utils/extractText';
import ItemList from 'flarum/utils/ItemList';
import SubtreeRetainer from 'flarum/utils/SubtreeRetainer';

import Dropdown from 'flarum/components/Dropdown';
import Button from 'flarum/components/Button';
import Separator from 'flarum/components/Separator';
import Link from 'flarum/components/Link';

export default class ChatMessage extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.labels = [];
        this.model = this.attrs.model;
        if (!this.model.content) this.model.content = this.model.message();

        this.initLabels();

        this.subtree = new SubtreeRetainer(
            () => this.model.freshness,
            () => this.model.user().freshness,
            () => app.chat.getCurrentChat(),

            // Reactive attrs
            () => this.model.content,
            () => this.model.isDeletedForever,
            () => this.model.isTimedOut,
            () => this.model.isEditing,
            () => this.model.isNeedToFlash
        );
    }

    modelEvent(name) {
        const viewportState = app.chat.getViewportState(this.model.chat());
        viewportState.onChatMessageClicked(name, this.model);
        app.chat.onChatMessageClicked(name, this.model);
    }

    onbeforeupdate(vnode) {
        super.onbeforeupdate(vnode);
        this.model = this.attrs.model;

        return this.subtree.needsRebuild();
    }

    content() {
        return (
            <div>
                {this.model.user() ? (
                    <Link className="avatar-wrapper" href={app.route.user(this.model.user())}>
                        <span>{avatar(this.model.user(), { className: 'avatar' })}</span>
                    </Link>
                ) : (
                    <div className="avatar-wrapper">
                        <span>{avatar(this.model.user(), { className: 'avatar' })}</span>
                    </div>
                )}
                <div className="message-block">
                    <div className="toolbar">
                        <a className="name" onclick={this.modelEvent.bind(this, 'insertMention')}>
                            {extractText(username(this.model.user())) + ': '}
                        </a>
                        <div className="labels">{this.labels.map((label) => (label.condition() ? label.component() : null))}</div>
                        <div className="right">
                            {this.model.id()
                                ? [
                                      this.model.isDeletedForever ? null : this.editDropDown(),
                                      <a className="timestamp" title={extractText(fullTime(this.model.created_at()))}>
                                          {(this.humanTime = humanTime(this.model.created_at()))}
                                      </a>,
                                  ]
                                : this.model.isTimedOut
                                ? this.editDropDownTimedOut()
                                : null}
                        </div>
                    </div>
                    <div className="message">
                        {this.model.is_censored() ? (
                            <div className="censored actualMessage" title={app.translator.trans('xelson-chat.forum.chat.message.censored')}>
                                {this.model.content}
                            </div>
                        ) : (
                            <div
                                className="actualMessage"
                                oncreate={this.onContentWrapperCreated.bind(this)}
                                onupdate={this.onContentWrapperUpdated.bind(this)}
                            ></div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    view(vnode) {
        return (
            <div
                className={classList({
                    'message-wrapper': true,
                    hidden: this.model.deleted_by(),
                    editing: this.model.isEditing,
                    deleted: !this.isVisible(),
                })}
                data-id={this.model.id()}
            >
                {this.model ? this.content() : null}
            </div>
        );
    }

    initLabels() {
        this.labelBind(
            () => this.model.edited_at(),
            () => (
                <div
                    class="icon"
                    title={extractText(
                        app.translator.trans('core.forum.post.edited_tooltip', { user: this.model.user(), ago: humanTime(this.model.edited_at()) })
                    )}
                >
                    <i class="fas fa-pencil-alt"></i>
                </div>
            )
        );

        this.labelBind(
            () => this.model.deleted_by(),
            () => (
                <div class="icon">
                    <i class="fas fa-trash-alt"></i>{' '}
                    <span>
                        {`(${app.translator.trans('xelson-chat.forum.chat.message.deleted' + (this.model.isDeletedForever ? '_forever' : ''))}`}{' '}
                        {username(this.model.deleted_by())}
                    </span>
                </div>
            )
        );

        this.labelBind(
            () => this.model.isTimedOut,
            () => (
                <div class="icon" style="color: #ff4063">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
            )
        );
    }

    labelBind(condition, component) {
        this.labels.push({ condition: condition, component: component });
    }

    editDropDown() {
        const items = new ItemList();

        if (app.chat.getPermissions().edit && this.model.user() && this.model.user() == app.session.user) {
            items.add(
                'dropdownEditStart',
                <Button
                    onclick={this.modelEvent.bind(this, 'dropdownEditStart')}
                    icon="fas fa-pencil-alt"
                    disabled={this.model.deleted_by() || this.model.isEditing}
                >
                    {app.translator.trans('core.forum.post_controls.edit_button')}
                </Button>
            );
        }

        items.add('separator', <Separator />);

        if (this.model.chat().role() || (app.chat.getPermissions().delete && this.model.user() == app.session.user)) {
            if (this.model.deleted_by()) {
                items.add(
                    'dropdownRestore',
                    <Button
                        onclick={this.modelEvent.bind(this, 'dropdownRestore')}
                        icon="fas fa-reply"
                        disabled={!app.chat.getPermissions().moderate.delete && this.model.deleted_by() != app.session.user}
                    >
                        {app.translator.trans('core.forum.post_controls.restore_button')}
                    </Button>
                );
            } else {
                items.add(
                    'dropdownHide',
                    <Button onclick={this.modelEvent.bind(this, 'dropdownHide')} icon="fas fa-trash-alt" disabled={this.model.isEditing}>
                        {app.translator.trans('core.forum.post_controls.delete_button')}
                    </Button>
                );
            }
        }

        if (this.model.chat().role() && (this.model.deleted_by() || app.chat.totalHidden() >= 3)) {
            items.add(
                'dropdownDelete',
                <Button onclick={this.modelEvent.bind(this, 'dropdownDelete')} icon="fas fa-trash-alt" disabled={!app.chat.getPermissions().delete}>
                    {app.translator.trans('core.forum.post_controls.delete_forever_button')}
                </Button>
            );
        }

        return Object.keys(items.items).length <= 1 ? null : (
            <div className="edit">
                <Dropdown
                    buttonClassName="Button Button--icon Button--flat"
                    menuClassName="Dropdown-menu Dropdown-menu--top Dropdown-menu--bottom Dropdown-menu--left Dropdown-menu--right"
                    icon="fas fa-ellipsis-h"
                >
                    {items.toArray()}
                </Dropdown>
            </div>
        );
    }

    editDropDownTimedOut() {
        return (
            <div className="edit">
                <Dropdown
                    buttonClassName="Button Button--icon Button--flat"
                    menuClassName="Dropdown-menu--top Dropdown-menu--bottom Dropdown-menu--left Dropdown-menu--right"
                    icon="fas fa-ellipsis-h"
                >
                    <Button onclick={this.modelEvent.bind(this, 'dropdownDelete')} icon="fas fa-trash-alt">
                        {app.translator.trans('xelson-chat.forum.chat.message.actions.hide')}
                    </Button>
                    <Button onclick={this.modelEvent.bind(this, 'dropdownResend')} icon="fas fa-reply">
                        {app.translator.trans('xelson-chat.forum.chat.message.actions.resend')}
                    </Button>
                </Dropdown>
            </div>
        );
    }

    oncreate(vnode) {
        super.oncreate(vnode);
        this.messageWrapper = vnode.dom;

        if (!this.attrs.model.exists) {
            this.pollInterval = setInterval(() => {
                this.renderMessage(this.$('.actualMessage')[0]);
            }, 100);
        }
    }

    onremove(vnode) {
        clearInterval(this.pollInterval);
    }

    onContentWrapperUpdated(vnode) {
        this.renderMessage(vnode.dom);
    }

    onContentWrapperCreated(vnode) {
        this.renderMessage(vnode.dom);
    }

    renderMessage(element) {
        if (this.model.isNeedToFlash) {
            app.chat.flashItem($(this.messageWrapper));
            this.model.isNeedToFlash = false;
        }
        if (this.model.content !== this.oldContent) {
            this.oldContent = this.model.content;
            app.chat.renderChatMessage(element, this.model.content);
        }
    }

    isVisible() {
        if (this.model.chat() != app.chat.getCurrentChat()) return false;

        if (this.model.isDeletedForever) return false;

        if (this.model.deleted_by() && !(this.model.chat().role() || this.model.user() == app.session.user)) return false;

        return true;
    }
}
