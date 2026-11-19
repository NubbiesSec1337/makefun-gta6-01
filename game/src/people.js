// People: rounded, proportioned figures with a walk cycle — capsule torso
// (then get back up) when hit.
import * as THREE from '../vendor/three.module.min.js';
import { pick, range } from './random.js';
const SHIRTS = [0xe8e8e8, 0x3a6ac2, 0x2a8f4f, 0xc2a23a, 0x8a4fc2, 0xe07a3a, 0x4fc2c2, 0xc23a6a];
const PANTS = [0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x2a4a2a];
const SKINS = [0xc98a5a, 0x8a5a38, 0xe8b88a, 0x6a4530];
const HAIRS = [0x1a1a1a, 0x3a2410, 0x6a4a2a, 0x8a8a8a, 0xc2a23a];
const std = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
const cap = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 3, 8), m);
const ball = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
function part(mesh) { mesh.castShadow = true; return mesh; }
export function buildPersonMesh(shirt, pants, skin, opts = {}) {
  const group = new THREE.Group();
  const shirtMat = std(shirt);
  const pantsMat = std(pants);
  const skinMat = std(skin, 0.65);
  const hairMat = std(opts.hair ?? 0x1a1a1a, 0.9);
  const shoeMat = std(0x1a1a1a, 0.6);
  const torso = part(cap(0.24, 0.26, shirtMat));
  torso.position.y = 1.09;
  group.add(torso);
  const shoulders = part(cap(0.085, 0.3, shirtMat));
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 1.33;
  group.add(shoulders);
  const belt = part(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.06, 10), std(0x222222, 0.6)));
  belt.position.y = 0.85;
  group.add(belt);
  const neck = part(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skinMat));
  neck.position.y = 1.45;
  group.add(neck);
  const head = part(ball(0.17, skinMat));
  head.position.y = 1.61;
  group.add(head);
  const hair = part(ball(0.185, hairMat));
  hair.scale.set(1, 0.8, 1);
  hair.position.set(0, 1.65, -0.02);
  group.add(hair);
  let mane = null;
  if (opts.longHair) {
    mane = part(cap(0.09, 0.38, hairMat));
    mane.scale.set(1.7, 1, 0.55);
    mane.position.set(0, 1.42, -0.16);
    group.add(mane);
  }
  if (opts.cap) {
    const crown = part(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.09, 10), std(opts.cap, 0.7)));
    crown.position.y = 1.73;
    group.add(crown);
    const brim = part(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 10), std(opts.cap, 0.7)));
    brim.scale.set(1, 1, 1.35);
    brim.position.set(0, 1.69, 0.07);
    group.add(brim);
  }
  function arm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, 1.34, 0);
    const upper = part(cap(0.07, 0.2, shirtMat));
    upper.position.y = -0.16;
    pivot.add(upper);
    const fore = part(cap(0.055, 0.18, skinMat));
    fore.position.y = -0.42;
    pivot.add(fore);
    const hand = part(ball(0.06, skinMat));
    hand.position.y = -0.56;
    pivot.add(hand);
    group.add(pivot);
    return pivot;
  }
  function leg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.13, 0.8, 0);
    const thigh = part(cap(0.09, 0.28, pantsMat));
    thigh.position.y = -0.19;
    pivot.add(thigh);
    const shin = part(cap(0.075, 0.28, pantsMat));
    shin.position.y = -0.52;
    pivot.add(shin);
    const shoe = part(ball(0.1, shoeMat));
    shoe.scale.set(1, 0.55, 1.7);
    shoe.position.set(0, -0.77, 0.04);
    pivot.add(shoe);
    group.add(pivot);
    return pivot;
  }
  const leftArm = arm(-1);
  const rightArm = arm(1);
  const leftLeg = leg(-1);
  const rightLeg = leg(1);
  if (opts.height) group.scale.y = opts.height;
  return { group, leftArm, rightArm, leftLeg, rightLeg, head, shirtMat, hairMat, mane };
}
export function animateWalk(person, phase, amount) {
  const swing = Math.sin(phase) * 0.7 * amount;
  person.leftLeg.rotation.x = swing;
  person.rightLeg.rotation.x = -swing;
  person.leftArm.rotation.x = -swing * 0.8;
  person.rightArm.rotation.x = swing * 0.8;
}
export const HEROES = [
  { name: 'Lucia', shirt: 0xd81b60, pants: 0x2a3a5a, skin: 0xc98a5a, hair: 0x1a1a1a, longHair: true, height: 0.97 },
  { name: 'Jason', shirt: 0x2a6ac2, pants: 0x3a3a3a, skin: 0xe8b88a, hair: 0x3a2410, cap: 0x1a1a1a, height: 1.03 },
];
export function makePlayer(scene, hero = 0) {
  const h = HEROES[hero] ?? HEROES[0];
  const mesh = buildPersonMesh(h.shirt, h.pants, h.skin, {
    hair: h.hair, cap: h.cap ?? null, longHair: h.longHair ?? false, height: h.height,
  });
  scene.add(mesh.group);
  return mesh;
}
export function makePed(scene, random) {
  const mesh = buildPersonMesh(pick(random, SHIRTS), pick(random, PANTS), pick(random, SKINS), {
    hair: pick(random, HAIRS),
    cap: random() < 0.25 ? pick(random, [0xc23b2a, 0x2a6ac2, 0xe8e8e8, 0x2a2a2e]) : null,
    height: range(random, 0.94, 1.08),
  });
  mesh.group.position.set(0, 0, 0);
  scene.add(mesh.group);
  return {
    mesh, x: 0, z: 0, heading: 0, speed: 0, phase: random() * 6,
    targetX: 0, targetZ: 0, state: 'walk', timer: 0, downTimer: 0,
    walkSpeed: range(random, 1.1, 1.9), jog: random() < 0.3,
  };
}
export function sidewalkPoint(city, random) {
  const road = pick(random, city.nodes.map((n) => n));
  const along = Math.random() < 0.5;
  const offset = 9.5;
  if (along) return { x: road.x + (random() < 0.5 ? offset : -offset), z: road.z + range(random, -50, 50) };
  return { x: road.x + range(random, -50, 50), z: road.z + (random() < 0.5 ? offset : -offset) };
}
export function spawnPed(scene, city, random, nearX, nearZ) {
  const ped = makePed(scene, random);
  let p = sidewalkPoint(city, random);
  let tries = 0;
  while (Math.hypot(p.x - nearX, p.z - nearZ) > 100 && tries < 8) {
    p = sidewalkPoint(city, random);
    tries += 1;
  }
  ped.x = p.x;
  ped.z = p.z;
  const t = sidewalkPoint(city, random);
  ped.targetX = t.x;
  ped.targetZ = t.z;
  ped.heading = Math.atan2(t.x - p.x, t.z - p.z);
  ped.mesh.group.position.set(p.x, 0, p.z);
  ped.mesh.group.rotation.y = ped.heading;
  return ped;
}
export function stepPed(ped, city, random, dt, scare) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.state = 'flee';
      ped.timer = 2.5;
      ped.mesh.group.rotation.x = 0;
      ped.mesh.group.position.y = 0;
    }
    return;
  }
  if (scare) {
    ped.state = 'flee';
    ped.timer = 2.5;
    const away = Math.atan2(ped.x - scare.x, ped.z - scare.z);
    ped.targetX = ped.x + Math.sin(away) * 40;
    ped.targetZ = ped.z + Math.cos(away) * 40;
  }
  if (ped.state === 'party') {
    ped.phase += dt * 6;
    ped.mesh.group.position.y = Math.abs(Math.sin(ped.phase)) * 0.15;
    animateWalk(ped.mesh, ped.phase, 0.4);
    return;
  }
  if (ped.state === 'flee') {
    ped.timer -= dt;
    if (ped.timer <= 0) {
      ped.state = 'walk';
      const t = sidewalkPoint(city, random);
      ped.targetX = t.x;
      ped.targetZ = t.z;
    }
  }
  const dx = ped.targetX - ped.x;
  const dz = ped.targetZ - ped.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) {
    if (ped.state === 'walk') {
      const t = sidewalkPoint(city, random);
      ped.targetX = t.x;
      ped.targetZ = t.z;
    } else {
      ped.state = 'walk';
    }
    return;
  }
  const speed = ped.state === 'flee' ? ped.walkSpeed * 2.6 : ped.jog ? ped.walkSpeed * 2.2 : ped.walkSpeed;
  const want = Math.atan2(dx, dz);
  let dh = want - ped.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  ped.heading += dh * Math.min(1, dt * 6);
  ped.x += Math.sin(ped.heading) * speed * dt;
  ped.z += Math.cos(ped.heading) * speed * dt;
  ped.phase += speed * dt * 3.2;
  animateWalk(ped.mesh, ped.phase, 1);
  ped.mesh.group.position.set(ped.x, 0, ped.z);
  ped.mesh.group.rotation.y = ped.heading;
}
export function knockDown(ped, seconds) {
  ped.state = 'down';
  ped.downTimer = seconds;
  ped.mesh.group.rotation.x = -Math.PI / 2;
  ped.mesh.group.position.y = 0.35;
  ped.mesh.leftLeg.rotation.x = 0;
  ped.mesh.rightLeg.rotation.x = 0;
  ped.mesh.leftArm.rotation.x = 0;
  ped.mesh.rightArm.rotation.x = 0;
}
