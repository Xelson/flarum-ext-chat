import { extend } from 'flarum/extend';
import app from 'flarum/app';
import PermissionGrid from 'flarum/components/PermissionGrid';

app.initializers.add('xelson-chat', (app) => {
    app.extensionData
        .for('xelson-chat')
        .registerSetting({
            setting: 'xelson-chat.settings.charlimit',
            label: app.translator.trans('xelson-chat.admin.settings.charlimit'),
            type: 'number',
        })
        .registerSetting({
            setting: 'xelson-chat.settings.floodgate.number',
            label: app.translator.trans('xelson-chat.admin.settings.floodgate.number'),
            type: 'number',
        })
        .registerSetting({
            setting: 'xelson-chat.settings.floodgate.time',
            label: app.translator.trans('xelson-chat.admin.settings.floodgate.time'),
            type: 'text',
        })
        .registerSetting({
            setting: 'xelson-chat.settings.display.minimize',
            label: app.translator.trans('xelson-chat.admin.settings.display.minimize'),
            type: 'switch',
        })
        .registerSetting({
            setting: 'xelson-chat.settings.display.censor',
            label: app.translator.trans('xelson-chat.admin.settings.display.censor'),
            type: 'switch',
        })
        .registerPermission(
            {
                icon: 'fas fa-eye',
                label: app.translator.trans('xelson-chat.admin.permissions.enabled'),
                permission: 'xelson-chat.permissions.enabled',
                allowGuest: true,
            },
            'view'
        )
        .registerPermission(
            {
                icon: 'fas fa-comment-medical',
                label: app.translator.trans('xelson-chat.admin.permissions.create.chat'),
                permission: 'xelson-chat.permissions.create',
            },
            'start'
        )
        .registerPermission(
            {
                icon: 'fas fa-comment-medical',
                label: app.translator.trans('xelson-chat.admin.permissions.create.channel'),
                permission: 'xelson-chat.permissions.create.channel',
            },
            'start'
        )
        .registerPermission(
            {
                icon: 'fas fa-comments',
                label: app.translator.trans('xelson-chat.admin.permissions.post'),
                permission: 'xelson-chat.permissions.chat',
            },
            'reply'
        )
        .registerPermission(
            {
                icon: 'fas fa-pencil-alt',
                label: app.translator.trans('xelson-chat.admin.permissions.edit'),
                permission: 'xelson-chat.permissions.edit',
            },
            'reply'
        )
        .registerPermission(
            {
                icon: 'far fa-trash-alt',
                label: app.translator.trans('xelson-chat.admin.permissions.delete'),
                permission: 'xelson-chat.permissions.delete',
            },
            'reply'
        )
        .registerPermission(
            {
                icon: 'fas fa-eye',
                label: app.translator.trans('xelson-chat.admin.permissions.moderate.vision'),
                permission: 'xelson-chat.permissions.moderate.vision',
            },
            'moderate'
        )
        .registerPermission(
            {
                icon: 'far fa-trash-alt',
                label: app.translator.trans('xelson-chat.admin.permissions.moderate.delete'),
                permission: 'xelson-chat.permissions.moderate.delete',
            },
            'moderate'
        );
});
