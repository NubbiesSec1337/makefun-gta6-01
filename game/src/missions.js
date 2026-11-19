// Missions: Marco's five-job story chain. Each mission is a small state machine
import { MISSIONS, PLACES } from './config.js';
export function createMissions() {
  const state = {
    index: 0,
    phase: 0, // per-mission step
    timer: 0, // countdown for timed missions
    holdTimer: 0, // heist vault hold
    active: false,
    marker: null, // {x, z, label} or null
    objective: '',
    done: [],
  };
  function markerFor(placeKey, label) {
    const p = PLACES[placeKey];
    return { x: p.x, z: p.z, label: label ?? p.name };
  }
  function start(index) {
    const m = MISSIONS[index];
    if (!m) { state.active = false; state.marker = null; state.objective = ''; return null; }
    state.index = index;
    state.phase = 0;
    state.active = true;
    state.holdTimer = 0;
    state.timer = m.seconds ?? 0;
    if (m.kind === 'drive') {
      state.marker = markerFor('garage', 'City Garage');
    } else if (m.kind === 'goto') {
      state.marker = markerFor('pier', 'Package — Sunset Pier');
    } else if (m.kind === 'survive') {
      state.marker = null;
    } else if (m.kind === 'checkpoints') {
      state.marker = { x: m.points[0].x, z: m.points[0].z, label: 'Drop 1/3' };
    } else if (m.kind === 'heist') {
      state.marker = markerFor(m.target, PLACES[m.target].name);
    }
    state.objective = m.objective;
    return m;
  }
  function near(ctx, x, z, r) {
    return Math.hypot(ctx.x - x, ctx.z - z) < r;
  }
  // One fixed step. Returns an event string or null.
  function update(dt, ctx) {
    if (!state.active) return null;
    const m = MISSIONS[state.index];
    if (!m) return null;
    if (m.kind === 'drive') {
      if (ctx.inCar && near(ctx, PLACES.garage.x, PLACES.garage.z, 9)) return 'mission-done';
      return null;
    }
    if (m.kind === 'goto') {
      if (state.phase === 0) {
        if (near(ctx, PLACES.pier.x, PLACES.pier.z, 6)) {
          state.phase = 1;
          state.marker = markerFor('bar', "Marco's Bar");
          state.objective = 'Package collected — take it back to Marco\'s Bar';
          return 'objective-done';
        }
        return null;
      }
      if (near(ctx, PLACES.bar.x, PLACES.bar.z, 8)) return 'mission-done';
      return null;
    }
    if (m.kind === 'survive') {
      if (state.phase === 0) {
        if (ctx.wanted >= 1) state.timer -= dt;
        if (state.timer <= 0) {
          state.phase = 1;
          state.marker = markerFor('safehouse', 'Safehouse');
          state.objective = 'You shook the heat — now get to the Safehouse with 0 stars';
          return 'objective-done';
        }
        return null;
      }
      if (ctx.wanted === 0 && near(ctx, PLACES.safehouse.x, PLACES.safehouse.z, 8)) return 'mission-done';
      return null;
    }
    if (m.kind === 'checkpoints') {
      state.timer -= dt;
      if (state.timer <= 0) return 'mission-failed';
      const p = m.points[state.phase];
      if (ctx.inCar && near(ctx, p.x, p.z, 10)) {
        state.phase += 1;
        if (state.phase >= m.points.length) return 'mission-done';
        const next = m.points[state.phase];
        state.marker = { x: next.x, z: next.z, label: `Drop ${state.phase + 1}/3` };
        state.objective = `Drop ${state.phase + 1}/3 — ${Math.ceil(state.timer)}s left`;
        return 'objective-done';
      }
      return null;
    }
    if (m.kind === 'heist') {
      const tgt = PLACES[m.target];
      const esc = PLACES[m.then];
      if (state.phase === 0) {
        if (m.approachCar && !ctx.inCar) {
          state.objective = 'Drive to the bank — no walking in';
          return null;
        }
        if (near(ctx, tgt.x, tgt.z, 7)) {
          state.phase = 1;
          state.holdTimer = m.holdSeconds;
          state.objective = `Stay inside — cracking it (${Math.ceil(state.holdTimer)}s)`;
          return 'objective-done';
        }
        return null;
      }
      if (state.phase === 1) {
        if (m.approachCar && ctx.inCar) {
          state.objective = 'Get out of the car and get inside';
          return null;
        }
        if (near(ctx, tgt.x, tgt.z, 9)) {
          state.holdTimer -= dt;
          state.objective = `Stay inside — cracking it (${Math.ceil(Math.max(0, state.holdTimer))}s)`;
          if (state.holdTimer <= 0) {
            state.phase = 2;
            state.marker = markerFor(m.then, `Escape — ${esc.name}`);
            state.objective = 'Cash grabbed — run for the escape!';
            return 'objective-done';
          }
        } else {
          state.objective = 'Get back inside to keep cracking it';
        }
        return null;
      }
      if (near(ctx, esc.x, esc.z, 9)) return 'mission-done';
      return null;
    }
    return null;
  }
  function complete() {
    const m = MISSIONS[state.index];
    state.done.push(m.id);
    state.active = false;
    state.marker = null;
    state.index += 1;
    return m;
  }
  function fail() {
    state.active = false;
    state.marker = null;
  }
  return { state, start, update, complete, fail };
}
export function missionTitle(index) {
  return MISSIONS[index] ? MISSIONS[index].title : 'Free Roam';
}
