<?php
/*
 * This file is part of xelson/flarum-ext-chat
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Xelson\Chat;

use Flarum\Extend;

use Flarum\Api\Serializer\ForumSerializer;
use Illuminate\Contracts\Events\Dispatcher;
use Xelson\Chat\Api\Controllers\PostMessageController;
use Xelson\Chat\Api\Controllers\FetchMessageController;
use Xelson\Chat\Api\Controllers\EditMessageController;
use Xelson\Chat\Api\Controllers\DeleteMessageController;
use Xelson\Chat\Api\Controllers\ShowUserSafeController;
use Xelson\Chat\Api\Controllers\ListChatsController;
use Xelson\Chat\Api\Controllers\CreateChatController;
use Xelson\Chat\Api\Controllers\EditChatController;
use Xelson\Chat\Api\Controllers\DeleteChatController;


use Flarum\User\User;
use Xelson\Chat\Chat;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Frontend('forum'))
        ->css(__DIR__ . '/resources/less/forum.less')
        ->js(__DIR__ . '/js/dist/forum.js')
        ->route('/chat', 'chat'),

    (new Extend\Locales(__DIR__ . '/resources/locale')),

    (new Extend\Routes('api'))
        ->get('/chats', 'neonchat.chats.get', ListChatsController::class)
        ->post('/chats', 'neonchat.chats.create', CreateChatController::class)
        ->patch('/chats/{id}', 'neonchat.chats.edit', EditChatController::class)
        ->delete('/chats/{id}', 'neonchat.chats.delete', DeleteChatController::class)
        ->get('/chatmessages', 'neonchat.chatmessages.fetch', FetchMessageController::class)
        ->post('/chatmessages', 'neonchat.chatmessages.post', PostMessageController::class)
        ->patch('/chatmessages/{id}', 'neonchat.chatmessages.edit', EditMessageController::class)
        ->delete('/chatmessages/{id}', 'neonchat.chatmessages.delete', DeleteMessageController::class)

        ->get('/chat/user/{id}', 'neonchat.chat.user', ShowUserSafeController::class),

    (new Extend\Model(User::class))
        ->relationship('chats', function ($user) {

            return $user->belongsToMany(Chat::class, 'neonchat_chat_user')
                ->withPivot('joined_at', 'removed_by', 'role', 'readed_at', 'removed_at');
        }),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->mutate(function ($serializer, $model, $attributes) {
            $actor = $serializer->getActor();

            $permissions = [
                'xelson-chat.permissions.chat',
                'xelson-chat.permissions.create',
                'xelson-chat.permissions.create.channel',
                'xelson-chat.permissions.enabled',
                'xelson-chat.permissions.edit',
                'xelson-chat.permissions.delete'
            ];

            foreach ($permissions as $permission) {
                $attributes[$permission] = $actor->can($permission);
            }

            return $attributes;
        }),

    (new Extend\ThrottleApi())
        ->set('chat-message', Api\Throttler\ChatMessage::class),

    (new Extend\Settings())
        ->serializeToForum('xelson-chat.settings.charlimit', 'xelson-chat.settings.charlimit')
        ->serializeToForum('xelson-chat.settings.display.minimize', 'xelson-chat.settings.display.minimize')
        ->serializeToForum('xelson-chat.settings.display.censor', 'xelson-chat.settings.display.censor'),

    function (Dispatcher $events) {
        $events->subscribe(Listener\PushChatEvents::class);
    },
];
