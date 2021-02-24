import Model from 'flarum/Model';
import computed from 'flarum/utils/computed';

export default class Chat extends Model {}

Object.assign(Chat.prototype, {
    _title: Model.attribute('title'),
    _color: Model.attribute('color'),
    type: Model.attribute('type'),
    created_at: Model.attribute('created_at', Model.transformDate),
    creator: Model.hasOne('creator'),
    users: Model.hasMany('users'),
    first_message: Model.hasOne('first_message'),
    last_message: Model.hasOne('last_message'),
    icon: Model.attribute('icon'),

    role: Model.attribute('role'),
    unreaded: Model.attribute('unreaded', (v) => Math.max(v, 0)),
    readed_at: Model.attribute('readed_at', Model.transformDate),
    removed_at: Model.attribute('removed_at', Model.transformDate),
    joined_at: Model.attribute('joined_at', Model.transformDate),
    removed_by: Model.attribute('removed_by'),

    pm_user: computed('freshness', function (updated) {
        return this.getPMUser();
    }),

    title: computed('pm_user', '_title', function (pm_user, _title) {
        return pm_user ? pm_user.displayName() : _title;
    }),

    color: computed('pm_user', '_color', function (pm_user, _color) {
        return pm_user ? pm_user.color() : _color;
    }),

    avatarUrl: computed('pm_user', function (pm_user) {
        return pm_user ? pm_user.avatarUrl() : null;
    }),

    textColor: computed('color', function (color) {
        return this.pickTextColorBasedOnBgColorSimple(color, '#FFF', '#000');
    }),

    matches(q) {
        return (
            this.title().toLowerCase().includes(q) ||
            this.users().some((user) => {
                return user.displayName().toLowerCase().includes(q);
            })
        );
    },

    getPMUser() {
        let users = this.users();
        if (app.session.user && this.type() == 0 && users.length && users.length < 3) {
            for (const user of users) {
                if (user && user != app.session.user) return user;
            }
        }
        return null;
    },

    pickTextColorBasedOnBgColorSimple(bgColor, lightColor, darkColor) {
        var color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
        var r = parseInt(color.substring(0, 2), 16);
        var g = parseInt(color.substring(2, 4), 16);
        var b = parseInt(color.substring(4, 6), 16);
        return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? darkColor : lightColor;
    },
});
