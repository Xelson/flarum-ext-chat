import Component from 'flarum/Component';

export default class ChatInput extends Component {
    oninit(vnode) {
        super.oninit(vnode);

        this.model = this.attrs.model;
        this.state = this.attrs.state;

        this.messageCharLimit = app.forum.attribute('xelson-chat.settings.charlimit') ?? 512;

        this.updatePlaceholder();
    }

    oncreate(vnode) {
        super.oncreate(vnode);

        this.updateLimit();
    }

    onupdate(vnode) {
        if (this.model !== this.attrs.model) {
            this.model = this.attrs.model;
            this.state = this.attrs.state;
            this.updatePlaceholder();
        }
    }

    updatePlaceholder() {
        if (!app.session.user) this.inputPlaceholder = app.translator.trans('xelson-chat.forum.errors.unauthenticated');
        else if (!app.chat.getPermissions().post) this.inputPlaceholder = app.translator.trans('xelson-chat.forum.errors.chatdenied');
        else if (this.model.removed_at()) this.inputPlaceholder = app.translator.trans('xelson-chat.forum.errors.removed');
        else this.inputPlaceholder = app.translator.trans('xelson-chat.forum.chat.placeholder');
    }

    view() {
        return (
            <div className="ChatInput input-wrapper">
                <textarea
                    id="chat-input"
                    maxlength={this.messageCharLimit}
                    disabled={!app.chat.getPermissions().post || this.model.removed_at()}
                    placeholder={this.inputPlaceholder}
                    value={this.state.input.content()}
                    onkeypress={this.inputPressEnter.bind(this)}
                    oninput={this.inputProcess.bind(this)}
                    onpaste={this.inputProcess.bind(this)}
                    rows={this.state.input.rows}
                />
                {this.state.messageEditing ? (
                    <div className="icon edit" onclick={this.state.messageEditEnd.bind(this)}>
                        <i class="fas fa-times"></i>
                    </div>
                ) : null}
                <div className="icon send" onclick={this.inputPressButton.bind(this)}>
                    <i class="fas fa-angle-double-right"></i>
                </div>
                <div
                    id="chat-limiter"
                    className={this.reachedLimit() ? 'reaching-limit' : ''}
                    style={{ display: !app.chat.getPermissions().post ? 'none' : '' }}
                ></div>
            </div>
        );
    }

    updateLimit() {
        this.$('#chat-limiter')[0].innerText = this.messageCharLimit - (this.state.input.messageLength || 0) + '/' + this.messageCharLimit;
    }

    reachedLimit() {
        this.oldReached = this.messageCharLimit - (this.state.input.messageLength || 0) < 100;
        return this.oldReached;
    }

    inputProcess(e) {
        if (e) e.redraw = false;

        let input = e.target;
        let inputValue = input.value.trim();
        this.state.input.messageLength = inputValue.length;
        this.updateLimit();
        this.state.input.content(inputValue);

        if (!input.lineHeight) input.lineHeight = parseInt(window.getComputedStyle(input).getPropertyValue('line-height'));
        this.state.input.rows = Math.min(input.scrollHeight / input.lineHeight, app.screen() === 'phone' ? 3 : 5);
        input.rows = this.state.input.rows;

        if (this.state.input.messageLength) {
            if (!this.state.input.writingPreview && !this.state.messageEditing) this.inputPreviewStart(inputValue);
        } else {
            if (this.state.input.writingPreview && !inputValue.length) this.inputPreviewEnd();
        }

        if (this.state.messageEditing) this.state.messageEditing.content = inputValue;
        else if (this.state.input.writingPreview) this.state.input.previewModel.content = inputValue;

        if (this.attrs.oninput) this.attrs.oninput();
    }

    inputPressEnter(e) {
        e.redraw = false;
        if (e.keyCode == 13 && !e.shiftKey) {
            this.state.messageSend();
            return false;
        }
        return true;
    }

    inputPressButton() {
        this.state.messageSend();
    }

    inputPreviewStart(content) {
        if (!this.state.input.writingPreview) {
            this.state.input.writingPreview = true;

            this.state.input.previewModel = app.store.createRecord('chatmessages');
            this.state.input.previewModel.pushData({
                id: 0,
                attributes: { message: ' ', created_at: 0 },
                relationships: { user: app.session.user, chat: this.model },
            });
            Object.assign(this.state.input.previewModel, { isEditing: true, isNeedToFlash: true, content });
        } else this.state.input.previewModel.isNeedToFlash = true;

        m.redraw();
    }

    inputPreviewEnd() {
        this.state.input.writingPreview = false;

        m.redraw();
    }
}
