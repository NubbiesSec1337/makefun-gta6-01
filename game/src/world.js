// Palm City Heat: the game itself. Screens (title, play, pause, busted, wasted,
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, PLAYER, CAR, WANTED, TRAFFIC, WEAPONS, PLACES, MISSIONS, SAVE_KEY, PALETTE, POSTS, CHAOS } from './config.js';
import { createRandom, pick, range } from './random.js';
import { createCity } from './city.js';
import { makeCar, spawnTrafficCar, stepTraffic, stepDriven, buildHeliMesh } from './vehicles.js';
import { makePlayer, makePed, spawnPed, stepPed, knockDown, animateWalk, sidewalkPoint, HEROES } from './people.js';
import { createCombat } from './combat.js';
import { createMissions, missionTitle } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { createStage } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_RELOAD, ACTION_MUTE, ACTION_JUMP, ACTION_SWITCH, ACTION_PHONE, ACTION_RADIO, ACTION_NIGHT, ACTION_OUTFIT } from './input.js';
const STEP = 1 / 60;
export function createGame(canvas, seed) {
  const random = createRandom(seed);
  const stage = createStage(canvas);
  const city = createCity(stage.scene, random);
  const input = createInput(canvas);
  const audio = createAudio();
  const hud = createHud(city);
  const combat = createCombat(stage.scene);
  const missions = createMissions();
  const playerMeshes = [makePlayer(stage.scene, 0), makePlayer(stage.scene, 1)];
  playerMeshes[1].group.visible = false;
  let heroIdx = 0;
  let playerMesh = playerMeshes[0];
  const gators = (city.gators || []).map((g) => ({ mesh: g.mesh, x: g.x, z: g.z, heading: 0, bounds: g.bounds }));
  const gator = gators[0] || null;
  let phoneOpen = false;
  let chaosTimer = 50;
  let postTimer = 35;
  let postIdx = 0;
  const player = {
    mesh: playerMesh, x: PLACES.bar.x, z: PLACES.bar.z - 6, heading: Math.PI,
    speed: 0, vy: 0, y: 0, health: PLAYER.health, walkPhase: 0,
    inCar: null, ammo: WEAPONS[0].mag, reloadTimer: 0, fireTimer: 0, weapon: 0,
    lastHurt: -99, dragYaw: 0, dragPitch: 0,
  };
  playerMesh.group.position.set(player.x, 0, player.z);
  playerMesh.group.rotation.y = player.heading;
  const cars = []; // traffic + parked + player car
  const police = [];
  const peds = [];
  const airboat = makeCar(stage.scene, 'airboat', 0x3a6a3a, -90, -150, 0);
  airboat.edge = -1;
  airboat.waterRect = [-113, -67, -173, -127];
  cars.push(airboat);
  const speedboat = makeCar(stage.scene, 'speedboat', 0x2a6ac2, 123.5, 214, 0);
  speedboat.edge = -1;
  speedboat.waterRect = [-200, 200, 200, 330];
  cars.push(speedboat);
  const bike = makeCar(stage.scene, 'bike', 0xc23b2a, PLACES.bar.x + 4, PLACES.bar.z - 8, 0);
  bike.edge = -1;
  cars.push(bike);
  let cash = 0;
  let wanted = 0;
  let wantedTimer = 0;
  let bustTimer = 0;
  let saveTimer = 0;
  let fareTimer = 20;
  let fare = null;
  let heli = null;
  let outfitIdx = 0;
  const OUTFITS = [0xd81b60, 0x2a6ac2, 0xe07a3a, 0x3a6ac2, 0xc23a6a];
  let screen = 'title';
  let endKind = '';
  let elapsed = 0;
  let stats = { earned: 0, fares: 0, crimes: 0 };
  let hasSave = false;
  function collideCircle(x, z, r) {
    let hit = false;
    for (const b of city.colliders) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          z = cz + (dz / d) * r;
        } else {
          x = b.maxX + r;
        }
      }
    }
    for (const c of city.circles) {
      const dx = x - c.x;
      const dz = z - c.z;
      const rr = r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = c.x + (dx / d) * rr;
        z = c.z + (dz / d) * rr;
        hit = true;
      }
    }
    const bound = WORLD.half - 2;
    if (x < -bound) { x = -bound; hit = true; }
    if (x > bound) { x = bound; hit = true; }
    if (z < -bound) { z = -bound; hit = true; }
    if (z > bound) { z = bound; hit = true; }
    return { x, z, hit };
  }
  function collideCar(x, z, self) {
    const out = collideCircle(x, z, CAR.radius);
    let hit = out.hit;
    for (const other of [...cars, ...police]) {
      if (other === self || other.dead) continue;
      const dx = x - other.x;
      const dz = z - other.z;
      const rr = CAR.radius * 2 - 0.4;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = rr - d;
        x += (dx / d) * push;
        z += (dz / d) * push;
        // both cars at a crawl forever.
        // Rear-end shove: full overlap + speed kick, so a ram can't lock both cars.
        other.x -= (dx / d) * push;
        other.z -= (dz / d) * push;
        other.mesh.group.position.set(other.x, 0, other.z);
        other.speed = Math.max(other.speed * 0.6, self.speed * 0.85);
        hit = true;
      }
    }
    return { x: out.x, z: out.z, hit };
  }
  function waterCollide(x, z, car) {
    const r = car.waterRect || [-200, 200, 200, 330];
    const cx = Math.max(r[0], Math.min(r[1], x));
    const cz = Math.max(r[2], Math.min(r[3], z));
    return { x: cx, z: cz, hit: cx !== x || cz !== z };
  }
  function raiseWanted(n) {
    if (wanted >= WANTED.max) return;
    const before = wanted;
    wanted = Math.min(WANTED.max, wanted + n);
    wantedTimer = 0;
    stats.crimes += 1;
    if (before === 0 && wanted > 0) hud.toast('The cops are on to you — lose them!', 3);
  }
  function setWanted(n) {
    wanted = Math.max(0, Math.min(WANTED.max, n));
    wantedTimer = 0;
  }
  function spawnPolice(count, nearX, nearZ) {
    for (let i = 0; i < count; i += 1) {
      const node = city.nodes[Math.floor(random() * city.nodes.length)];
      if (Math.hypot(node.x - nearX, node.z - nearZ) < 70) continue;
      const cop = makeCar(stage.scene, 'police', PALETTE.police, node.x, node.z, 0);
      cop.targetSpeed = 19;
      cop.speed = 12;
      cop.path = [];
      cop.pathAt = 0;
      cop.repath = 0;
      police.push(cop);
    }
  }
  function stepPolice(cop, dt) {
    const dx = player.x - cop.x;
    const dz = player.z - cop.z;
    const dist = Math.hypot(dx, dz);
    cop.repath -= dt;
    if (dist < 38) {
      // Close in: steer straight at the player and ram.
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, dh * 2.2));
      stepDriven(cop, 1, steer, dt, (x, z) => collideCar(x, z, cop));
    } else {
      if (cop.repath <= 0 || cop.pathAt >= cop.path.length) {
        const from = city.nearestNode(cop.x, cop.z);
        const to = city.nearestNode(player.x, player.z);
        cop.path = city.shortestPath(from, to);
        cop.pathAt = 1;
        cop.repath = 1.5;
      }
      const target = city.nodes[cop.path[Math.min(cop.pathAt, cop.path.length - 1)]];
      if (Math.hypot(target.x - cop.x, target.z - cop.z) < 8) cop.pathAt += 1;
      const wantHeading = Math.atan2(target.x - cop.x, target.z - cop.z);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, dh * 2.2));
      stepDriven(cop, 1, steer, dt, (x, z) => collideCar(x, z, cop));
    }
    // Ram the player's car; catch the player on foot.
    if (player.inCar) {
      const d = Math.hypot(cop.x - player.inCar.x, cop.z - player.inCar.z);
      if (d < 3.4 && Math.abs(cop.speed) > 4) {
        player.inCar.speed *= 0.82;
        audio.crash();
      }
    }
  }
  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of [...cars, ...police]) {
      if (car.dead) continue;
      const d = Math.hypot(car.x - player.x, car.z - player.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
  function enterCar(car) {
    if (!car) return;
    if (car.edge >= 0 && !car.police) {
      const driver = makePed(stage.scene, random);
      driver.x = car.x - Math.sin(car.heading) * 2;
      driver.z = car.z - Math.cos(car.heading) * 2;
      driver.state = 'flee';
      driver.timer = 4;
      driver.mesh.group.position.set(driver.x, 0, driver.z);
      peds.push(driver);
      car.edge = -1;
      car.targetSpeed = 0;
      raiseWanted(WANTED.stealHeat);
      hud.toast('You stole a car!', 2.5);
    }
    if (car.police) {
      raiseWanted(WANTED.stealHeat);
      hud.toast('You stole a police car!', 2.5);
      const idx = police.indexOf(car);
      if (idx >= 0) police.splice(idx, 1);
      cars.push(car);
    }
    player.inCar = car;
    car.speed = 0;
    playerMesh.group.visible = false;
    audio.click();
  }
  function exitCar() {
    const car = player.inCar;
    if (!car) return;
    player.inCar = null;
    player.x = car.x - Math.sin(car.heading + Math.PI / 2) * 2.4;
    player.z = car.z - Math.cos(car.heading + Math.PI / 2) * 2.4;
    const fixed = collideCircle(player.x, player.z, PLAYER.radius);
    player.x = fixed.x;
    player.z = fixed.z;
    player.heading = car.heading;
    playerMesh.group.visible = true;
    playerMesh.group.position.set(player.x, 0, player.z);
    playerMesh.group.rotation.y = player.heading;
    car.edge = -1;
    car.targetSpeed = 0;
    if (fare && fare.state === 'riding') cancelFare('You left the fare behind.');
  }
  function switchHero() {
    if (player.inCar) { hud.toast('Get out of the car to switch', 2); return; }
    playerMesh.group.visible = false;
    heroIdx = 1 - heroIdx;
    playerMesh = playerMeshes[heroIdx];
    playerMesh.group.visible = true;
    playerMesh.group.position.set(player.x, player.y, player.z);
    playerMesh.group.rotation.y = player.heading;
    hud.toast(`You're now ${HEROES[heroIdx].name}`, 2);
    audio.click();
  }
  function spawnFare() {
    const p = sidewalkPoint(city, random);
    if (Math.hypot(p.x - player.x, p.z - player.z) > 120) return;
    const ped = makePed(stage.scene, random);
    ped.x = p.x;
    ped.z = p.z;
    ped.state = 'wait';
    ped.mesh.group.position.set(p.x, 0, p.z);
    const dest = pick(random, Object.values(PLACES));
    fare = {
      ped, state: 'wait', destX: dest.x, destZ: dest.z, destName: dest.name,
      pay: 30 + Math.floor(random() * 50),
    };
    peds.push(ped);
    hud.toast('A fare is waiting ($) — pick them up in a car', 4);
  }
  function cancelFare(text) {
    if (!fare) return;
    if (fare.ped && fare.ped.state === 'wait') {
      fare.ped.state = 'walk';
      const t = sidewalkPoint(city, random);
      fare.ped.targetX = t.x;
      fare.ped.targetZ = t.z;
    }
    fare = null;
    if (text) hud.toast(text, 3);
  }
  function startMission(index) {
    const m = missions.start(index);
    if (!m) return;
    if (m.startStars) setWanted(m.startStars);
    hud.toast(`${m.title} — ${m.giver}: ${m.brief}`, 7);
    audio.pickup();
  }
  function onMissionEvent(event) {
    if (event === 'objective-done') {
      hud.toast(missions.state.objective, 4);
      audio.pickup();
      return;
    }
    if (event === 'mission-failed') {
      const m = MISSIONS[missions.state.index];
      missions.fail();
      hud.toast(`Mission failed: ${m.title} — try again from the start point`, 4);
      audio.fail();
      startMission(missions.state.index);
      return;
    }
    if (event === 'mission-done') {
      const m = missions.complete();
      cash += m.reward;
      stats.earned += m.reward;
      hud.toast(`Mission complete: ${m.title} — $${m.reward}`, 4);
      audio.missionDone();
      saveGame();
      if (missions.state.index >= MISSIONS.length) {
        endScreen('complete');
      } else {
        startMission(missions.state.index);
      }
    }
  }
  function endScreen(kind) {
    screen = 'end';
    endKind = kind;
    player.inCar = null;
    playerMesh.group.visible = true;
    if (kind === 'busted') {
      const fine = Math.floor(cash * WANTED.bustFine);
      cash -= fine;
      hud.showScreen('end', { title: 'BUSTED', text: `The Palm City PD caught you. Fine: $${fine}. Your car is impounded.` });
    } else if (kind === 'wasted') {
      const bill = Math.floor(cash * WANTED.wastedFine);
      cash -= bill;
      hud.showScreen('end', { title: 'WASTED', text: `You wake up in General Hospital. Medical bill: $${bill}.` });
    } else {
      hud.showScreen('end', { title: 'THE BIG SCORE — STORY COMPLETE', text: `Lucia and Jason are rich and Palm City is theirs. Earned: $${stats.earned.toLocaleString('en-US')} across ${MISSIONS.length} jobs. Free roam continues.` });
    }
    saveGame();
    audio.fail();
  }
  function respawn() {
    const spot = endKind === 'wasted' ? PLACES.hospital : PLACES.policeStation;
    player.x = spot.x;
    player.z = spot.z + 8;
    player.heading = 0;
    player.health = PLAYER.health;
    player.vy = 0;
    player.y = 0;
    wanted = 0;
    bustTimer = 0;
    for (const cop of police) {
      cop.mesh.group.visible = false;
      cop.dead = true;
    }
    police.length = 0;
    playerMesh.group.position.set(player.x, 0, player.z);
    playerMesh.group.rotation.y = player.heading;
    screen = 'play';
    hud.showScreen('play');
    saveGame();
  }
  function saveGame() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash, missionIndex: missions.state.index, done: missions.state.done,
        health: player.health, x: player.x, z: player.z, heading: player.heading,
        hero: heroIdx, stats, version: 1,
      }));
      hasSave = true;
    } catch { /* storage off: progress lasts this visit only */ }
  }
  function loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      return data;
    } catch {
      return null;
    }
  }
  function applySave(data) {
    cash = data.cash || 0;
    stats = data.stats || stats;
    player.health = data.health ?? PLAYER.health;
    heroIdx = data.hero ?? 0;
    playerMesh.group.visible = false;
    playerMesh = playerMeshes[heroIdx];
    playerMesh.group.visible = true;
    player.x = data.x ?? PLACES.bar.x;
    player.z = data.z ?? PLACES.bar.z - 6;
    player.heading = data.heading ?? Math.PI;
    playerMesh.group.position.set(player.x, 0, player.z);
    playerMesh.group.rotation.y = player.heading;
    missions.state.done = data.done || [];
    missions.state.index = data.missionIndex ?? 0;
  }
  function maintainPopulation() {
    let driving = 0;
    for (const car of cars) if (car.edge >= 0) driving += 1;
    while (driving < TRAFFIC.cars) {
      const car = spawnTrafficCar(stage.scene, city, random, player.x, player.z);
      if (!car) break;
      cars.push(car);
      driving += 1;
    }
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const car = cars[i];
      if (car === player.inCar || car.edge < 0) continue;
      if (Math.hypot(car.x - player.x, car.z - player.z) > TRAFFIC.despawnRadius) {
        car.mesh.group.visible = false;
        car.dead = true;
        stage.scene.remove(car.mesh.group);
        cars.splice(i, 1);
      }
    }
    let walking = 0;
    let party = 0;
    for (const ped of peds) if (ped.state === 'party') party += 1;
    for (const ped of peds) if (ped.state !== 'down') walking += 1;
    while (walking < TRAFFIC.peds) {
      const ped = spawnPed(stage.scene, city, random, player.x, player.z);
      if (!ped) break;
      if (party < 6 && random() < 0.15) {
        ped.state = 'party';
        ped.x = -60 + random() * 120;
        ped.z = 222 + random() * 10;
        ped.mesh.group.position.set(ped.x, 0, ped.z);
        party += 1;
      }
      peds.push(ped);
      walking += 1;
    }
    for (let i = peds.length - 1; i >= 0; i -= 1) {
      const ped = peds[i];
      if (fare && fare.ped === ped) continue;
      if (Math.hypot(ped.x - player.x, ped.z - player.z) > TRAFFIC.despawnRadius) {
        ped.mesh.group.visible = false;
        stage.scene.remove(ped.mesh.group);
        peds.splice(i, 1);
      }
    }
  }
  function shoot() {
    const W = WEAPONS[player.weapon];
    if (player.fireTimer > 0 || player.reloadTimer > 0 || (W.mag > 0 && player.ammo <= 0)) return;
    player.fireTimer = W.fire;
    if (W.mag > 0) player.ammo -= 1;
    if (W.mag > 0) audio.gunshot(); else audio.hit();
    audio.ensure();
    const dir = new THREE.Vector3();
    stage.camera.getWorldDirection(dir);
    const origin = new THREE.Vector3(player.x, 1.5, player.z);
    const targets = [];
    for (const ped of peds) {
      if (ped.state === 'down') continue;
      targets.push({ x: ped.x, y: 1.2, z: ped.z, r: 0.7, kind: 'ped', ref: ped });
    }
    for (const car of [...cars, ...police]) {
      if (car.dead) continue;
      targets.push({ x: car.x, y: 1.0, z: car.z, r: 2.4, kind: car.police ? 'police' : 'car', ref: car });
    }
    const { hit } = combat.shoot(origin, dir, targets, W.range);
    if (hit) {
      audio.hit();
      if (hit.kind === 'ped') {
        knockDown(hit.ref, 6);
        raiseWanted(WANTED.shootHeat);
        const scare = { x: player.x, z: player.z };
        for (const ped of peds) {
          if (ped !== hit.ref && Math.hypot(ped.x - player.x, ped.z - player.z) < 40) {
            ped.state = 'flee';
            ped.timer = 3;
            const away = Math.atan2(ped.x - scare.x, ped.z - scare.z);
            ped.targetX = ped.x + Math.sin(away) * 40;
            ped.targetZ = ped.z + Math.cos(away) * 40;
          }
        }
      } else if (hit.kind === 'police') {
        raiseWanted(WANTED.shootHeat);
      } else {
        // A traffic car: its driver bails and runs.
        const car = hit.ref;
        if (car.edge >= 0) {
          const driver = makePed(stage.scene, random);
          driver.x = car.x - Math.sin(car.heading) * 2;
          driver.z = car.z - Math.cos(car.heading) * 2;
          driver.state = 'flee';
          driver.timer = 4;
          driver.mesh.group.position.set(driver.x, 0, driver.z);
          peds.push(driver);
          car.edge = -1;
          car.targetSpeed = 0;
          car.speed = 0;
        }
      }
    }
    if (W.mag > 0 && player.ammo === 0) {
      player.reloadTimer = W.reload;
      player.ammo = W.mag;
    }
  }
  function stepPlay(dt, override) {
    elapsed += dt;
    const walk = override?.walk ?? input.walk();
    const drive = override?.drive ?? input.drive();
    const actions = override?.actions ?? input.takeActions();
    const clicked = override?.click ?? input.takeClick();
    const drag = override?.drag ?? input.takeDrag();
    player.dragYaw += drag.dx * 0.004;
    player.dragPitch = Math.max(-1.2, Math.min(1.6, player.dragPitch + drag.dy * 0.003));
    if (actions & ACTION_PAUSE) {
      screen = 'pause';
      hud.showScreen('pause');
      return;
    }
    if (actions & ACTION_MUTE) {
      hud.toast(audio.toggleMute() ? 'Sound off' : 'Sound on', 1.5);
    }
    if (actions & ACTION_SWITCH) switchHero();
    if (actions & ACTION_PHONE) {
      phoneOpen = !phoneOpen;
      hud.setPhone(phoneOpen, POSTS);
    }
    if (actions & ACTION_RADIO) {
      const station = audio.radio();
      hud.toast(station ? `Radio: ${station}` : 'Radio off', 2);
    }
    if (actions & ACTION_NIGHT) {
      const on = !stage.night;
      stage.setNight(on);
      hud.toast(on ? 'Night falls over Leonida — the neon comes alive' : 'Day breaks over Leonida', 2.5);
    }
    if (actions & ACTION_OUTFIT) {
      if (Math.hypot(player.x - PLACES.safehouse.x, player.z - PLACES.safehouse.z) > 12) {
        hud.toast('Change outfits at the Safehouse', 2);
      } else {
        outfitIdx = (outfitIdx + 1) % 5;
        for (const pm of playerMeshes) pm.shirtMat.color.setHex(OUTFITS[outfitIdx]);
        const lucia = playerMeshes[0];
        if (lucia.mane) lucia.mane.visible = outfitIdx !== 4;
        hud.toast(`Outfit ${outfitIdx + 1}/5${outfitIdx === 4 ? ' — black bob wig' : ''}`, 2);
      }
    }
    const ws = override?.weapon ?? input.takeWeapon();
    if (ws >= 0 && ws !== player.weapon) {
      player.weapon = ws;
      player.ammo = WEAPONS[ws].mag;
      player.reloadTimer = 0;
      hud.toast(`Weapon: ${WEAPONS[ws].name}`, 2);
      audio.click();
    }
    // Timers.
    player.fireTimer = Math.max(0, player.fireTimer - dt);
    if (player.reloadTimer > 0) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) player.ammo = WEAPONS[player.weapon].mag;
    }
    if (player.health < PLAYER.health && elapsed - player.lastHurt > 12) {
      player.health = Math.min(PLAYER.health, player.health + 6 * dt);
    }
    if (!player.inCar) {
      const camYaw = player.heading + Math.PI + player.dragYaw;
      const fwdX = -Math.sin(camYaw);
      const fwdZ = -Math.cos(camYaw);
      const rightX = -fwdZ;
      const rightZ = fwdX;
      const mx = fwdX * walk.fwd + rightX * walk.strafe;
      const mz = fwdZ * walk.fwd + rightZ * walk.strafe;
      const moving = Math.hypot(mx, mz) > 0.01;
      const speed = walk.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (moving) {
        const wantHeading = Math.atan2(mx, mz);
        let dh = wantHeading - player.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        player.heading += dh * Math.min(1, dt * 10);
        player.speed = speed;
        const nx = player.x + Math.sin(player.heading) * speed * dt;
        const nz = player.z + Math.cos(player.heading) * speed * dt;
        const fixed = collideCircle(nx, nz, PLAYER.radius);
        player.x = fixed.x;
        player.z = fixed.z;
        player.walkPhase += speed * dt * 2.2;
        animateWalk(playerMesh, player.walkPhase, 1);
      } else {
        player.speed = 0;
        animateWalk(playerMesh, player.walkPhase, 0);
      }
      // Jump.
      if ((actions & ACTION_JUMP) && player.y === 0) player.vy = PLAYER.jumpSpeed;
      if (player.y > 0 || player.vy !== 0) {
        player.vy -= PLAYER.gravity * dt;
        player.y = Math.max(0, player.y + player.vy * dt);
        if (player.y === 0) player.vy = 0;
      }
      playerMesh.group.position.set(player.x, player.y, player.z);
      playerMesh.group.rotation.y = player.heading;
      if (actions & ACTION_ENTER) {
        const car = nearestCar(4.5);
        if (car) enterCar(car);
        else if (fare && fare.state === 'wait' && Math.hypot(fare.ped.x - player.x, fare.ped.z - player.z) < 3.5) {
          hud.toast('Get a car first — the fare needs a ride', 2.5);
        }
      }
      if (actions & ACTION_RELOAD && player.ammo < WEAPONS[player.weapon].mag && player.reloadTimer <= 0) {
        player.reloadTimer = WEAPONS[player.weapon].reload;
        player.ammo = WEAPONS[player.weapon].mag;
      }
      if (clicked) shoot();
      // Bump into parked/traffic cars: push the player out.
      for (const car of [...cars, ...police]) {
        if (car.dead) continue;
        const dx = player.x - car.x;
        const dz = player.z - car.z;
        const rr = CAR.radius + PLAYER.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          player.x = car.x + (dx / d) * rr;
          player.z = car.z + (dz / d) * rr;
        }
      }
    } else {
      const car = player.inCar;
      player.x = car.x;
      player.z = car.z;
      player.heading = car.heading;
      stepDriven(car, drive.throttle, drive.steer, dt, car.boat ? (x, z) => waterCollide(x, z, car) : (x, z) => collideCar(x, z, car));
      if (actions & ACTION_ENTER) exitCar();
      // Running over peds.
      for (const ped of peds) {
        if (ped.state === 'down' || ped.hitByPlayer) continue;
        if (Math.hypot(ped.x - car.x, ped.z - car.z) < 2.2 && Math.abs(car.speed) > 3) {
          ped.hitByPlayer = true;
          knockDown(ped, 5);
          raiseWanted(WANTED.hitPedHeat);
          audio.crash();
          hud.toast('You hit a pedestrian!', 2.5);
        }
      }
      // Fare pickup and delivery.
      if (fare && fare.state === 'wait' && Math.hypot(fare.ped.x - car.x, fare.ped.z - car.z) < 4) {
        fare.state = 'riding';
        fare.ped.mesh.group.visible = false;
        missions.state.marker = { x: fare.destX, z: fare.destZ, label: `Fare — ${fare.destName}` };
        hud.toast(`Fare aboard — take them to ${fare.destName} ($${fare.pay})`, 3);
        audio.pickup();
      } else if (fare && fare.state === 'riding' && Math.hypot(fare.destX - car.x, fare.destZ - car.z) < 9) {
        cash += fare.pay;
        stats.earned += fare.pay;
        stats.fares += 1;
        hud.toast(`Fare complete — $${fare.pay}`, 3);
        audio.missionDone();
        fare = null;
        missions.state.marker = missions.state.active ? missions.state.marker : null;
        if (missions.state.active) {
          const m = MISSIONS[missions.state.index];
          if (m.kind === 'drive') missions.state.marker = { x: PLACES.garage.x, z: PLACES.garage.z, label: 'City Garage' };
          else if (m.kind === 'goto') missions.state.marker = missions.state.phase === 0
            ? { x: PLACES.pier.x, z: PLACES.pier.z, label: 'Package — Sunset Pier' }
            : { x: PLACES.bar.x, z: PLACES.bar.z, label: "Marco's Bar" };
          else if (m.kind === 'checkpoints') {
            const p = m.points[missions.state.phase];
            missions.state.marker = { x: p.x, z: p.z, label: `Drop ${missions.state.phase + 1}/3` };
          } else if (m.kind === 'heist') {
            const tgt = PLACES[m.target];
            const esc = PLACES[m.then];
            missions.state.marker = missions.state.phase === 2
              ? { x: esc.x, z: esc.z, label: `Escape — ${esc.name}` }
              : { x: tgt.x, z: tgt.z, label: tgt.name };
          } else if (m.kind === 'survive') {
            missions.state.marker = missions.state.phase === 1
              ? { x: PLACES.safehouse.x, z: PLACES.safehouse.z, label: 'Safehouse' } : null;
          }
        }
        saveGame();
      }
    }
    for (const car of cars) {
      if (car.edge >= 0 && car !== player.inCar) stepTraffic(car, city, dt, cars);
    }
    const scare = null;
    for (const ped of peds) {
      if (ped.state === 'wait') continue;
      stepPed(ped, city, random, dt, scare);
    }
    for (const gt of gators) {
      gt.heading += (Math.random() - 0.5) * dt * 0.6;
      gt.x += Math.sin(gt.heading) * 1.2 * dt;
      gt.z += Math.cos(gt.heading) * 1.2 * dt;
      const [bx0, bx1, bz0, bz1] = gt.bounds;
      if (gt.x < bx0 || gt.x > bx1 || gt.z < bz0 || gt.z > bz1) gt.heading = Math.atan2((bx0 + bx1) / 2 - gt.x, (bz0 + bz1) / 2 - gt.z);
      gt.x = Math.max(bx0, Math.min(bx1, gt.x));
      gt.z = Math.max(bz0, Math.min(bz1, gt.z));
      gt.mesh.position.set(gt.x, 0, gt.z);
      gt.mesh.rotation.y = gt.heading;
      if (Math.hypot(player.x - gt.x, player.z - gt.z) < 3.5 && elapsed - player.lastHurt > 3) {
        player.health -= 15;
        player.lastHurt = elapsed;
        audio.hit();
        hud.toast('The gator bit you!', 3);
        if (player.health <= 0) { endScreen('wasted'); return; }
      }
    }
    // Wanted decay and police numbers.
    if (wanted > 0) {
      wantedTimer += dt;
      const nearestCop = police.reduce((best, cop) => Math.min(best, Math.hypot(cop.x - player.x, cop.z - player.z)), Infinity);
      if (wantedTimer > WANTED.decaySeconds && nearestCop > 50) {
        wanted -= 1;
        wantedTimer = 0;
        hud.toast(wanted === 0 ? 'You lost them.' : `Heat dropping — ${wanted} star${wanted === 1 ? '' : 's'} left`, 2.5);
      }
    }
    const wantCops = wanted === 0 ? 0 : wanted <= 1 ? 1 : wanted === 2 ? 2 : wanted <= 4 ? 3 : 4;
    if (police.length < wantCops) spawnPolice(wantCops - police.length, player.x, player.z);
    if (wanted >= 5 && !heli) {
      const mesh = buildHeliMesh();
      const hx = player.inCar ? player.x + Math.sin(player.inCar.heading) * 25 : player.x + 30;
      const hz = player.inCar ? player.z + Math.cos(player.inCar.heading) * 25 : player.z - 30;
      mesh.group.position.set(hx, 45, hz);
      stage.scene.add(mesh.group);
      heli = { ...mesh, x: hx, z: hz };
      hud.toast('VCPD Air Unit overhead — the spotlight is on you', 3);
    }
    if (heli) {
      if (wanted === 0) {
        stage.scene.remove(heli.group);
        heli = null;
      } else {
        heli.x += (player.x - heli.x) * 0.4 * dt;
        heli.z += (player.z - heli.z) * 0.4 * dt;
        heli.group.position.set(heli.x, 45 + Math.sin(elapsed * 1.3) * 1.5, heli.z);
        heli.group.rotation.y = Math.atan2(-(player.z - heli.z), player.x - heli.x);
        heli.rotor.rotation.y += dt * 18;
      }
    }
    for (let i = police.length - 1; i >= 0; i -= 1) {
      const cop = police[i];
      if (wanted === 0 && Math.hypot(cop.x - player.x, cop.z - player.z) > 150) {
        cop.mesh.group.visible = false;
        cop.dead = true;
        stage.scene.remove(cop.mesh.group);
        police.splice(i, 1);
        continue;
      }
      stepPolice(cop, dt);
    }
    // Police shoot back when close and the heat is on.
    if (wanted >= 2) {
      const near = police.find((cop) => Math.hypot(cop.x - player.x, cop.z - player.z) < 40);
      if (near && Math.random() < dt * 0.5) {
        player.health -= 8;
        player.lastHurt = elapsed;
        audio.hit();
        if (player.health <= 0) { endScreen('wasted'); return; }
      }
    }
    const closeCop = police.find((cop) => Math.hypot(cop.x - player.x, cop.z - player.z) < WANTED.bustDistance);
    if (wanted > 0 && closeCop && (player.inCar ? Math.abs(player.inCar.speed) < 1 : true)) {
      bustTimer += dt;
      if (bustTimer > WANTED.bustSeconds) { endScreen('busted'); return; }
    } else {
      bustTimer = Math.max(0, bustTimer - dt * 2);
    }
    if (missions.state.active) {
      const ctx = {
        x: player.x, z: player.z, inCar: Boolean(player.inCar),
        speed: player.inCar ? player.inCar.speed : 0, wanted,
      };
      const event = missions.update(dt, ctx);
      if (event) onMissionEvent(event);
    }
    fareTimer -= dt;
    if (fareTimer <= 0) {
      fareTimer = 45;
      if (!fare && screen === 'play') spawnFare();
    }
    // fresh post on the social feed.
    chaosTimer -= dt;
    if (chaosTimer <= 0) {
      chaosTimer = 60 + Math.random() * 40;
      hud.toast(pick(random, CHAOS), 5);
      const ped = peds[Math.floor(random() * peds.length)];
      if (ped && ped.state !== 'down') { ped.state = 'flee'; ped.timer = 4; }
    }
    postTimer -= dt;
    if (postTimer <= 0) {
      postTimer = 55;
      postIdx = (postIdx + 1) % POSTS.length;
      hud.toast(`Leonida Social: new post from ${POSTS[postIdx][0]}`, 3);
    }
    maintainPopulation();
    combat.update(dt);
    const driving = Boolean(player.inCar);
    audio.setEngine(driving ? Math.abs(player.inCar.speed) / CAR.maxSpeed : 0, driving);
    audio.setMusic();
    const nearCop = police.some((cop) => Math.hypot(cop.x - player.x, cop.z - player.z) < 90);
    audio.setSiren(wanted > 0 && nearCop, dt);
    stage.updateSun(player.x, player.z);
    if (missions.state.marker) stage.setBeacon(missions.state.marker.x, missions.state.marker.z, true);
    else if (fare && fare.state === 'riding') stage.setBeacon(fare.destX, fare.destZ, true);
    else stage.setBeacon(0, 0, false);
    stage.updateCamera(dt, {
      mode: driving ? 'car' : 'foot',
      x: player.x, z: player.z, heading: player.heading,
      speed01: driving ? Math.abs(player.inCar.speed) / CAR.maxSpeed : 0,
      dragYaw: player.dragYaw, dragPitch: player.dragPitch,
    });
    saveTimer += dt;
    if (saveTimer > 30) { saveTimer = 0; saveGame(); }
    hud.update({
      cash, health: player.health, wanted,
      hero: HEROES[heroIdx].name, radio: audio.radioName,
      objective: missions.state.active ? missions.state.objective : fare ? 'Fare aboard — follow the yellow marker' : '',
      missionTitle: missions.state.active ? missionTitle(missions.state.index) : 'Free Roam',
      speedKmh: driving ? Math.abs(player.inCar.speed) * 3.6 : 0,
      inCar: driving, ammo: player.ammo, mag: WEAPONS[player.weapon].mag,
      prompt: promptFor(),
      screen, x: player.x, z: player.z, heading: player.heading,
      marker: missions.state.marker || (fare && fare.state === 'riding' ? { x: fare.destX, z: fare.destZ } : null),
      traffic: cars.filter((c) => c.edge >= 0),
      police, fare: fare && fare.state === 'wait' ? { x: fare.ped.x, z: fare.ped.z } : null,
      weapon: WEAPONS[player.weapon].name,
    }, dt);
  }
  function promptFor() {
    if (player.inCar) {
      if (fare && fare.state === 'wait' && Math.hypot(fare.ped.x - player.x, fare.ped.z - player.z) < 4) return 'E — Pick up the fare';
      return 'E — Get out  •  W/S drive  •  A/D steer';
    }
    const car = nearestCar(4.5);
    if (car) return car.police ? 'E — Steal the police car' : 'E — Steal the car';
    if (fare && fare.state === 'wait' && Math.hypot(fare.ped.x - player.x, fare.ped.z - player.z) < 3.5) return 'Fare waiting — get a car first';
    return 'WASD move  •  Shift run  •  Click shoot  •  E enter car';
  }
  function stepTitle(dt) {
    elapsed += dt;
    for (const car of cars) if (car.edge >= 0) stepTraffic(car, city, dt, cars);
    for (const ped of peds) if (ped.state !== 'wait') stepPed(ped, city, random, dt, null);
    maintainPopulation();
    stage.updateSun(0, 0);
    stage.updateCamera(dt, { mode: 'title', time: elapsed });
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) startNew();
  }
  function startNew() {
    cash = 0;
    stats = { earned: 0, fares: 0, crimes: 0 };
    wanted = 0;
    bustTimer = 0;
    player.health = PLAYER.health;
    heroIdx = 0;
    playerMesh.group.visible = false;
    playerMesh = playerMeshes[0];
    playerMesh.group.visible = true;
    player.x = PLACES.bar.x;
    player.z = PLACES.bar.z - 6;
    player.heading = Math.PI;
    player.inCar = null;
    playerMesh.group.visible = true;
    playerMesh.group.position.set(player.x, 0, player.z);
    playerMesh.group.rotation.y = player.heading;
    missions.state.done = [];
    missions.state.index = 0;
    screen = 'play';
    hud.showScreen('play');
    audio.ensure();
    startMission(0);
    saveGame();
  }
  function continueGame() {
    const data = loadGame();
    if (!data) { startNew(); return; }
    applySave(data);
    screen = 'play';
    hud.showScreen('play');
    audio.ensure();
    if (missions.state.index < MISSIONS.length) startMission(missions.state.index);
    else hud.toast('Free roam — the story is done, the city is yours', 4);
  }
  function toTitle() {
    screen = 'title';
    saveGame();
    hud.showScreen('title', { hasSave, cash });
  }
  function frame(dt, override) {
    if (screen === 'play') stepPlay(dt, override);
    else if (screen === 'title') stepTitle(dt);
    else if (screen === 'pause') {
      const actions = input.takeActions();
      if (actions & ACTION_PAUSE) {
        screen = 'play';
        hud.showScreen('play');
      }
    } else if (screen === 'end') {
      const actions = input.takeActions();
      if (actions & ACTION_CONFIRM) {
        if (endKind === 'complete') {
          screen = 'play';
          hud.showScreen('play');
        } else {
          respawn();
        }
      }
    }
    city.tick(dt);
    stage.render();
  }
  function wire(id, fn) {
    const button = document.getElementById(id);
    if (button) button.addEventListener('click', () => { audio.ensure(); fn(); });
  }
  wire('btn-new', startNew);
  wire('btn-continue', continueGame);
  wire('btn-resume', () => { screen = 'play'; hud.showScreen('play'); });
  wire('btn-quit', toTitle);
  wire('btn-end', () => {
    if (endKind === 'complete') { screen = 'play'; hud.showScreen('play'); }
    else respawn();
  });
  window.addEventListener('resize', () => stage.resize());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'pause';
      hud.showScreen('pause');
    }
  });
  // Boot: title screen over the living city.
  hasSave = Boolean(loadGame());
  maintainPopulation();
  hud.showScreen('title', { hasSave, cash: hasSave ? (loadGame()?.cash ?? 0) : 0 });
  return {
    get screen() { return screen; },
    get endKind() { return endKind; },
    get cash() { return cash; },
    get wanted() { return wanted; },
    player, cars, peds, police, city, stage, combat, missions, hud, audio, input,
    frame, startNew, continueGame, toTitle, saveGame, loadGame,
    setWanted, startMission, switchHero, gator,
    openPhone() { phoneOpen = true; hud.setPhone(true, POSTS); },
    get hero() { return HEROES[heroIdx].name; },
    get phoneOpen() { return phoneOpen; },
    get radioName() { return audio.radioName; },
    placePlayer(x, z, heading) {
      player.x = x; player.z = z; player.heading = heading;
      playerMesh.group.position.set(x, 0, z);
      playerMesh.group.rotation.y = heading;
    },
    giveCar(type, x, z) {
      const car = makeCar(stage.scene, type, type === 'taxi' ? 0xf2c230 : pick(random, [0xc23b2a, 0x2a6ac2, 0xd8b13a]), x, z, 0);
      car.edge = -1;
      cars.push(car);
      enterCar(car);
      return car;
    },
    giveBoat(type, x, z) {
      const boat = makeCar(stage.scene, type, type === 'airboat' ? 0x3a6a3a : 0x2a6ac2, x, z, 0);
      boat.edge = -1;
      boat.waterRect = type === 'airboat' ? [-113, -67, -173, -127] : [-200, 200, 200, 330];
      cars.push(boat);
      enterCar(boat);
      return boat;
    },
    setNight(on) { stage.setNight(on); },
    get night() { return stage.night; },
    get heli() { return heli; },
    spawnPoliceNear(count) { spawnPolice(count, player.x, player.z); },
    spawnPoliceAt(x, z, heading) {
      const cop = makeCar(stage.scene, 'police', PALETTE.police, x, z, heading);
      cop.targetSpeed = 19;
      cop.speed = 12;
      cop.path = [];
      cop.pathAt = 0;
      cop.repath = 0;
      police.push(cop);
      return cop;
    },
    setCash(value) { cash = value; },
  };
}
