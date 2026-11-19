// Keyboard and mouse state, read once a frame. Keys report as held; actions fire
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;
export const ACTION_JUMP = 32;
export const ACTION_SWITCH = 64;
export const ACTION_PHONE = 128;
export const ACTION_RADIO = 256;
export const ACTION_NIGHT = 512;
export const ACTION_OUTFIT = 1024;
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let weaponSel = -1;
  let mouseDown = false;
  let mouseClicked = false;
  let dragX = 0;
  let dragY = 0;
  let lastX = 0;
  let lastY = 0;
  function codeOf(event) {
    return event.code;
  }
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(codeOf(event));
    pressed.add(codeOf(event));
    if (codeOf(event) === 'Space' || codeOf(event) === 'Tab') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(codeOf(event)));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousedown', (event) => {
    mouseDown = true;
    lastX = event.clientX;
    lastY = event.clientY;
    mouseClicked = true;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  window.addEventListener('mousemove', (event) => {
    if (!mouseDown) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  function held(code) {
    return keys.has(code);
  }
  function drive() {
    const throttle = (held('KeyW') ? 1 : 0) - (held('KeyS') ? 1 : 0);
    const steer = (held('KeyA') ? 1 : 0) - (held('KeyD') ? 1 : 0);
    return { throttle, steer };
  }
  function walk() {
    const fwd = (held('KeyW') ? 1 : 0) - (held('KeyS') ? 1 : 0);
    const strafe = (held('KeyD') ? 1 : 0) - (held('KeyA') ? 1 : 0);
    return { fwd, strafe, sprint: held('ShiftLeft') || held('ShiftRight') };
  }
  function takeActions() {
    let actions = 0;
    if (pressed.has('Enter') || pressed.has('Space')) actions |= ACTION_CONFIRM;
    if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
    if (pressed.has('KeyE')) actions |= ACTION_ENTER;
    if (pressed.has('KeyR')) actions |= ACTION_RELOAD;
    if (pressed.has('KeyM')) actions |= ACTION_MUTE;
    if (pressed.has('Space')) actions |= ACTION_JUMP;
    if (pressed.has('Tab')) actions |= ACTION_SWITCH;
    if (pressed.has('KeyQ')) actions |= ACTION_PHONE;
    if (pressed.has('KeyG')) actions |= ACTION_RADIO;
    if (pressed.has('KeyN')) actions |= ACTION_NIGHT;
    if (pressed.has('KeyC')) actions |= ACTION_OUTFIT;
    if (pressed.has('Digit1')) weaponSel = 0;
    if (pressed.has('Digit2')) weaponSel = 1;
    if (pressed.has('Digit3')) weaponSel = 2;
    pressed.clear();
    return actions;
  }
  function takeWeapon() {
    const w = weaponSel;
    weaponSel = -1;
    return w;
  }
  function takeClick() {
    const clicked = mouseClicked;
    mouseClicked = false;
    return clicked;
  }
  function takeDrag() {
    const dx = dragX;
    const dy = dragY;
    dragX = 0;
    dragY = 0;
    return { dx, dy };
  }
  return { held, drive, walk, takeActions, takeClick, takeDrag, takeWeapon };
}
