import Component from 'flarum/Component';

export default class ChatWelcome extends Component {
    view(vnode) {
        return (
            <div>
                <div className="wrapper" style={{ height: app.chat.getFrameState('transform').y + 40 + 'px' }}>
                    {app.chat.getChats().length ? (
                        <div className="welcome">
                            <h1>{app.translator.trans('xelson-chat.forum.chat.welcome.header')}</h1>
                            <span>{app.translator.trans('xelson-chat.forum.chat.welcome.subheader')}</span>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }
}
