// Keyboard input: WASD or arrows to move, Shift to sneak, P or Escape to pause,
// Enter or Space to confirm. Mouse click on the canvas also confirms (title screens).
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas, onAction) {
  const keys = new Set();
  const pressed = new Set();

  function keyOf(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function onKeyDown(event) {
    const key = keyOf(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(key);
    keys.add(key);
    if (key === 'Enter' || key === ' ') onAction(ACTION_CONFIRM);
    if (key === 'p' || key === 'P' || key === 'Escape') onAction(ACTION_PAUSE);
  }

  function onKeyUp(event) {
    keys.delete(keyOf(event));
  }

  function onBlur() {
    keys.clear();
  }

  function onClick() {
    onAction(ACTION_CONFIRM);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onClick);

  /** Movement vector for this frame, normalised, plus whether sneak is held. */
  function read() {
    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(2);
      dx /= len;
      dy /= len;
    }
    return { dx, dy, sneak: keys.has('Shift') };
  }

  /** Keys pressed since the last call (edge-triggered). */
  function takePressed() {
    const out = new Set(pressed);
    pressed.clear();
    return out;
  }

  function destroy() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousedown', onClick);
  }

  return { read, takePressed, destroy };
}
