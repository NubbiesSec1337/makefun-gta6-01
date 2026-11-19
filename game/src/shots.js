// Screenshot staging: fixed-seed scenes stepped with a small autopilot, so
import { WORLD, PLACES } from './config.js';
const STEP = 1 / 60;
const AVENUE_OCEAN = [44, 45, 46, 47, 48];
function stepFor(game, seconds, autopilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const override = autopilot ? autopilot(i) : null;
    game.frame(STEP, override);
  }
}
const IDLE = { walk: { fwd: 0, strafe: 0, sprint: false }, drive: { throttle: 0, steer: 0 }, actions: 0, click: false, drag: { dx: 0, dy: 0 } };
function driveAutopilot(game, route) {
  const city = game.city;
  let at = 0;
  let stuckSteps = 0;
  let reversing = 0;
  let laneOffset = 0;
  let overtakeTarget = null; // car currently being passed
  const sameDir = (car, o) => Math.sin(o.heading) * Math.sin(car.heading) + Math.cos(o.heading) * Math.cos(car.heading) > 0.3;
  return () => {
    clearTraffic(game);
    const car = game.player.inCar;
    if (!car) return IDLE;
    if (reversing > 0) {
      reversing -= 1;
      return { ...IDLE, drive: { throttle: -0.7, steer: 0 } };
    }
    if (Math.abs(car.speed) < 1) {
      stuckSteps += 1;
      if (stuckSteps > 30) {
        stuckSteps = 0;
        reversing = 30;
        laneOffset = laneOffset >= 0 ? -3.8 : 3.8; // come back on the other side
        overtakeTarget = null;
        return { ...IDLE, drive: { throttle: -0.7, steer: 0 } };
      }
    } else {
      stuckSteps = 0;
    }
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const others = [...game.cars, ...game.police].filter((o) => o !== car && !o.dead);
    // (positive = the player's left).
    const rel = (o) => {
      const rx = o.x - car.x;
      const rz = o.z - car.z;
      return { fwd: rx * fx + rz * fz, lat: rx * -fz + rz * fx, o };
    };
    if (overtakeTarget) {
      const r = rel(overtakeTarget);
      if (r.fwd < -5 || Math.hypot(r.fwd, r.lat) > 30) {
        overtakeTarget = null;
        laneOffset = 0;
      } else {
        // (same-direction < 12 m, oncoming < 10 m).
        for (const o of others) {
          if (o === overtakeTarget) continue;
          const q = rel(o);
          const near = sameDir(car, o)
            ? (q.fwd > 0 && q.fwd < 12 && Math.abs(q.lat - laneOffset) < 3.2)
            : (q.fwd > 0 && q.fwd < 10 && Math.abs(q.lat - laneOffset) < 3.2);
          if (near) {
            return { ...IDLE, drive: { throttle: Math.abs(car.speed) > 6 ? -1 : 0.2, steer: 0 } };
          }
        }
      }
    }
    if (!overtakeTarget) {
      let blocked = null;
      for (const o of others) {
        if (!sameDir(car, o)) continue; // oncoming cars are not blockers
        const r = rel(o);
        if (r.fwd > 0 && r.fwd < 32 && Math.abs(r.lat) < 3.4) { blocked = r; break; }
      }
      if (blocked) {
        const side = blocked.lat >= 0 ? -3.8 : 3.8;
        let laneBlocked = false;
        for (const o of others) {
          if (o === blocked.o) continue;
          const r = rel(o);
          const near = sameDir(car, o)
            ? (r.fwd > -2 && r.fwd < 24 && Math.abs(r.lat - side) < 3.2)
            : (r.fwd > -2 && r.fwd < 14 && Math.abs(r.lat - side) < 3.2);
          if (near) { laneBlocked = true; break; }
        }
        if (laneBlocked) {
          const gap = blocked.fwd;
          const want = Math.max(0, blocked.o.speed);
          if (gap < 10 && car.speed > want + 3) {
            return { ...IDLE, drive: { throttle: -1, steer: 0 } };
          }
          const throttle = car.speed > want + 2 ? 0 : gap > 14 ? 0.5 : 0.2;
          return { ...IDLE, drive: { throttle, steer: 0 } };
        }
        laneOffset = side;
        overtakeTarget = blocked.o;
      }
    }
    const target = city.nodes[route[at % route.length]];
    if (Math.hypot(target.x - car.x, target.z - car.z) < 12) at += 1;
    const next = city.nodes[route[at % route.length]];
    const dx = next.x - car.x;
    const dz = next.z - car.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const tx = next.x + px * laneOffset;
    const tz = next.z + pz * laneOffset;
    const want = Math.atan2(tx - car.x, tz - car.z);
    let dh = want - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 1.5));
    return { ...IDLE, drive: { throttle: 0.85, steer } };
  };
}
function walkTo(game, tx, tz, sprint) {
  return () => {
    const p = game.player;
    const dx = tx - p.x;
    const dz = tz - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2) return IDLE;
    const want = Math.atan2(dx, dz);
    const camYaw = p.heading + Math.PI + p.dragYaw;
    const fwdX = -Math.sin(camYaw);
    const fwdZ = -Math.cos(camYaw);
    const rightX = -fwdZ;
    const rightZ = fwdX;
    const mx = Math.sin(want);
    const mz = Math.cos(want);
    const fwd = mx * fwdX + mz * fwdZ;
    const strafe = mx * rightX + mz * rightZ;
    return { ...IDLE, walk: { fwd, strafe, sprint: Boolean(sprint) } };
  };
}
function clearTraffic(game) {
  for (let i = game.cars.length - 1; i >= 0; i -= 1) {
    const c = game.cars[i];
    if (c === game.player.inCar || c.police || c.edge < 0) continue;
    game.cars.splice(i, 1);
    if (c.mesh && c.mesh.group) game.stage.scene.remove(c.mesh.group);
  }
}
export const SHOTS = {
  // Lucia on foot on Ocean Drive at night, phone open on Leonida Social.
  start(game) {
    game.startNew();
    game.setNight(true);
    game.placePlayer(176, 168, Math.PI);
    game.setWanted(0);
    stepFor(game, 2.2, walkTo(game, 176, 152, false));
    game.openPhone();
  },
  // Jason in a lowrider cruising north up Ocean Drive to the neon gantry,
  // at night; wanted is reset AFTER the drive (bumps can raise it).
  play(game) {
    game.startNew();
    game.setNight(true);
    game.switchHero();
    game.placePlayer(180, -80, 0);
    game.giveCar('lowrider', 180, -80);
    clearTraffic(game);
    game.setWanted(0);
    stepFor(game, 8.0, driveAutopilot(game, AVENUE_OCEAN));
    game.setWanted(0);
  },
  // Six stars, Jason in a lowrider tearing north up Ocean Drive at night,
  // two cops staged ahead. Drive runs at wanted 0; heat set to 6 after, so
  // the police helicopter spawns ahead with its spotlight on the road.
  chase(game) {
    game.startNew();
    game.setNight(true);
    game.switchHero();
    game.placePlayer(180, -80, 0);
    game.giveCar('lowrider', 180, -80);
    clearTraffic(game);
    game.setWanted(0);
    stepFor(game, 8.0, driveAutopilot(game, AVENUE_OCEAN));
    game.setWanted(6);
    game.spawnPoliceNear(3);
    const car = game.player.inCar;
    if (car) {
      game.spawnPoliceAt(car.x - 3.5, car.z + 16, Math.PI);
      game.spawnPoliceAt(car.x + 3.5, car.z + 26, Math.PI);
    }
  },
  // Mission 11: Lucia cracks the Harbor Bank vault at night — drive up,
  // get out, hold inside while the vault opens, then run for the Marina.
  mission(game) {
    game.startNew();
    game.setNight(true);
    game.placePlayer(60, -60, 0);
    game.startMission(10);
    game.setWanted(0);
    game.giveCar('sedan', 60, -60);
    stepFor(game, 1.0, null); // idle a second in the car: the approach registers
    game.frame(STEP, { ...IDLE, actions: 4 }); // E: exit the car
    stepFor(game, 2.0, walkTo(game, 60, -58, false));
  },
};
export function stageShot(game, name) {
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot: ${name}`);
  // Render only the final frame: stepping renders 480 bloom frames and crashes SwiftShader.
  const realRender = game.stage.render;
  game.stage.render = () => {};
  try {
    shot(game);
  } finally {
    game.stage.render = realRender;
  }
  game.frame(STEP, IDLE);
  return name;
}
export const SHOT_NAMES = Object.keys(SHOTS);
export { WORLD };
