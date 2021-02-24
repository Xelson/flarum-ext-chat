import Stream from 'flarum/utils/Stream';

export default class ViewportState {
    loadingSend = false;

    scroll = {
        autoScroll: true,
        oldScroll: 0,
    };

    loading = false;
    loadingQueries = {};

    input = {
        messageLength: 0,
        rows: 1,
        content: Stream(),
    };

    messagesFetched = false;

    onChatMessageClicked(eventName, model) {
        switch (eventName) {
            case 'dropdownEditStart': {
                this.messageEdit(model, true);
                break;
            }
            case 'dropdownResend': {
                this.messageResend(model);
                break;
            }
            case 'insertMention': {
                this.insertMention(model);
                break;
            }
        }
    }

    getChatInput() {
        return document.querySelector('.NeonChatFrame #chat-input');
    }

    messageSend() {
        const text = this.input.content();

        if (text.trim().length > 0 && !this.loadingSend) {
            if (this.input.writingPreview) {
                this.input.writingPreview = false;

                this.messagePost(this.input.previewModel);
                app.chat.insertChatMessage(Object.assign(this.input.previewModel, {}));

                this.inputClear();
            } else if (this.messageEditing) {
                let model = this.messageEditing;
                if (model.content.trim() !== model.oldContent.trim()) {
                    model.oldContent = model.content;
                    app.chat.editChatMessage(model, true, model.content);
                }
                this.messageEditEnd();
                this.inputClear();
            }
        }
    }

    messageEdit(model) {
        if (this.input.writingPreview) this.inputPreviewEnd();

        model.isEditing = true;
        model.oldContent = model.message();

        this.messageEditing = model;

        this.input.content(model.oldContent);
        this.getChatInput().focus();

        m.redraw();
    }

    messageEditEnd() {
        let message = this.messageEditing;
        if (message) {
            message.isEditing = false;
            message.content = message.oldContent;
            this.inputClear();
            m.redraw();

            this.messageEditing = null;
        }
    }

    messageResend(model) {
        this.messagePost(model);
    }

    messagePost(model) {
        this.loadingSend = true;
        m.redraw();

        return app.chat.postChatMessage(model).then(
            (r) => {
                this.loadingSend = false;

                m.redraw();
            },
            (r) => {
                this.loadingSend = false;

                m.redraw();
            }
        );
    }

    inputClear() {
        this.input.messageLength = 0;
        this.input.rows = 1;
        this.input.content(null);
        m.redraw();
    }

    insertMention(model) {
        let user = model.user();
        if (!app.session.user) return;

        this.input.content(this.input.content() + ` @${user.username()} `);

        var input = this.getChatInput();
        input.focus();
    }
}
