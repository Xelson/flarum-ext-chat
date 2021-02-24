import { extend } from 'flarum/extend';
import IndexPage from 'flarum/components/IndexPage';
import LinkButton from 'flarum/components/LinkButton';
import ChatPage from './components/ChatPage';

export default function addChatPage() {
    app.routes.chat = { path: '/chat', component: ChatPage };

    extend(IndexPage.prototype, 'navItems', function (items) {
        if (app.screen() !== 'phone') return;

        items.add(
            'chat',
            <LinkButton icon="fas fa-comment" href={app.route('chat')}>
                {app.translator.trans('xelson-chat.forum.index.chat_link')}
            </LinkButton>,
            -10
        );
    });
}
