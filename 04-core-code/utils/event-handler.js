/**
 * @fileoverview Provides a safe way to handle both click and touch events without duplication.
 */

/**
 * Adds a 'safe' event listener to an element that handles both 'click' and 'touchend' events,
 * preventing the handler from being called twice on touch devices.
 *
 * @param {Element} element The DOM element to attach the listener to.
 * @param {Function} handler The function to execute when the event is triggered.
 */
export function addSafeEventListener(element, handler) {
    if (!element || typeof handler !== 'function') {
        return;
    }

    let touchHandled = false;

    element.addEventListener('touchend', e => {
        e.preventDefault();
        touchHandled = true;
        handler(e);
    });

    element.addEventListener('click', e => {
        if (touchHandled) {
            touchHandled = false; // Reset for the next interaction
            return;
        }
        handler(e);
    });
}