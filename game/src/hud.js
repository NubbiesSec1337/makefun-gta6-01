// The HUD: cash, health, wanted stars, objective, speed, toasts, and the
import { WORLD } from './config.js';
export function createHud(city) {
  const el = (id) => document.getElementById(id);
  const cashEl = el('cash');
  const healthFill = el('health-fill');
  const starsEl = el('stars');
  const objectiveEl = el('objective');
  const missionEl = el('mission-title');
  const speedEl = el('speed');
  const ammoEl = el('ammo');
  const msgEl = el('msg');
  const promptEl = el('prompt');
  const crosshairEl = el('crosshair');
  const mapCanvas = el('minimap');
  const mapCtx = mapCanvas.getContext('2d');
  const overlays = { title: el('screen-title'), pause: el('screen-pause'), end: el('screen-end') };
  const endTitle = el('end-title');
  const endText = el('end-text');
  const titleContinue = el('btn-continue');
  const titleCash = el('title-cash');
  const phoneEl = el('phone');
  const feedEl = el('feed');
  const radioEl = el('radio');
  const heroEl = el('hero');
  let feedBuilt = false;
  function setPhone(open, posts) {
    if (open && !feedBuilt && posts) {
      feedEl.innerHTML = posts.map(([u, t, l]) => `<div class="post"><b>${u}</b><span>${t}</span><i>${l} ♥</i></div>`).join('');
      feedBuilt = true;
    }
    phoneEl.classList.toggle('hidden', !open);
  }
  const MAP = 180;
  const scale = MAP / (WORLD.half * 2 + 40);
  function toMap(x, z) {
    return [(x + WORLD.half + 20) * scale, (z + WORLD.half + 20) * scale];
  }
  const base = document.createElement('canvas');
  base.width = MAP;
  base.height = MAP;
  const b = base.getContext('2d');
  b.fillStyle = '#3a4a3a';
  b.fillRect(0, 0, MAP, MAP);
  b.fillStyle = '#2a7fa8';
  b.fillRect(0, toMap(0, 196)[1], MAP, MAP);
  b.fillStyle = '#e8d29a';
  b.fillRect(0, toMap(0, 190)[1], MAP, 8);
  b.fillStyle = '#5da24a';
  const [px, py] = toMap(-23, -23);
  b.fillRect(px, py, 46 * scale, 46 * scale);
  b.strokeStyle = '#2e3138';
  b.lineWidth = 6;
  for (const e of city.edges) {
    const a = city.nodes[e.a];
    const c = city.nodes[e.b];
    b.beginPath();
    b.moveTo(...toMap(a.x, a.z));
    b.lineTo(...toMap(c.x, c.z));
    b.stroke();
    b.save();
    b.strokeStyle = '#d8d3a0';
    b.lineWidth = 1;
    b.setLineDash([4, 4]);
    b.stroke();
    b.restore();
  }
  let msgTimer = null;
  function toast(text, seconds) {
    msgEl.textContent = text;
    msgEl.classList.add('show');
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msgEl.classList.remove('show'), (seconds ?? 3.5) * 1000);
  }
  function showScreen(name, data) {
    for (const key of Object.keys(overlays)) {
      overlays[key].classList.toggle('hidden', key !== name);
    }
    if (name === 'end' && data) {
      endTitle.textContent = data.title;
      endText.textContent = data.text;
    }
    if (name === 'title' && data) {
      titleContinue.classList.toggle('hidden', !data.hasSave);
      titleCash.textContent = data.hasSave ? `Continue — $${data.cash} in the bank` : '';
    }
  }
  let mapTick = 0;
  function drawMinimap(state, dt) {
    mapTick += dt;
    if (mapTick < 0.12) return;
    mapTick = 0;
    mapCtx.drawImage(base, 0, 0);
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);
    if (state.marker) {
      const [mx, my] = toMap(state.marker.x, state.marker.z);
      mapCtx.fillStyle = `rgba(255, 210, 63, ${pulse})`;
      mapCtx.beginPath();
      mapCtx.arc(mx, my, 7, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#1a1a1a';
      mapCtx.lineWidth = 2;
      mapCtx.stroke();
    }
    for (const car of state.traffic) {
      const [cx, cy] = toMap(car.x, car.z);
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    for (const cop of state.police) {
      const [cx, cy] = toMap(cop.x, cop.z);
      mapCtx.fillStyle = Math.floor(performance.now() / 300) % 2 ? '#2a6aff' : '#ff2a2a';
      mapCtx.beginPath();
      mapCtx.arc(cx, cy, 4, 0, Math.PI * 2);
      mapCtx.fill();
    }
    if (state.fare) {
      const [fx, fy] = toMap(state.fare.x, state.fare.z);
      mapCtx.fillStyle = '#3aa84f';
      mapCtx.font = 'bold 12px sans-serif';
      mapCtx.fillText('$', fx - 4, fy + 4);
    }
    const [ux, uy] = toMap(state.x, state.z);
    mapCtx.save();
    mapCtx.translate(ux, uy);
    mapCtx.rotate(-state.heading);
    mapCtx.fillStyle = '#ff2a2a';
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.restore();
  }
  function update(state, dt) {
    cashEl.textContent = `$${Math.floor(state.cash).toLocaleString('en-US')}`;
    healthFill.style.width = `${Math.max(0, state.health)}%`;
    healthFill.style.background = state.health > 50 ? '#3aa84f' : state.health > 25 ? '#d8b13a' : '#c23b2a';
    let stars = '';
    for (let i = 0; i < 6; i += 1) stars += i < state.wanted ? '★' : '☆';
    starsEl.textContent = stars;
    starsEl.classList.toggle('hot', state.wanted > 0);
    objectiveEl.textContent = state.objective || 'Free roam — cause some chaos, or find a fare ($)';
    missionEl.textContent = state.missionTitle || '';
    speedEl.textContent = state.inCar ? `${Math.round(state.speedKmh)} km/h` : '';
    ammoEl.textContent = state.inCar ? '' : state.mag > 0 ? `◈ ${state.weapon} ${state.ammo}/${state.mag}` : `◈ ${state.weapon}`;
    promptEl.textContent = state.prompt || '';
    promptEl.classList.toggle('show', Boolean(state.prompt));
    crosshairEl.classList.toggle('show', !state.inCar && state.screen === 'play');
    radioEl.textContent = state.radio ? `♪ ${state.radio}` : '';
    heroEl.textContent = state.hero || '';
    drawMinimap(state, dt);
  }
  return { toast, showScreen, update, setPhone };
}
