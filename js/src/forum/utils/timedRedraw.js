let redrawTimeout;

export default function timedRedraw(timeout, callback) {
    if (!redrawTimeout) {
        redrawTimeout = setTimeout(() => {
            m.redraw();
            if (callback) callback();
            redrawTimeout = null;
        }, timeout);
    }
}
