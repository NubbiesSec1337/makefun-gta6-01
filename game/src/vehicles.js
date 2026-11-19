// Cars: shaped models with real paint, glass and lights; traffic drives
// the road graph, police chase the player. No model files.
import * as THREE from '../vendor/three.module.min.js';
import { CAR, PALETTE } from './config.js';
import { pick, range } from './random.js';
const CAR_COLORS = [0xc23b2a, 0x2a6ac2, 0xd8b13a, 0x3aa84f, 0x8a5ac2, 0xd8d8d8, 0x2a2a2e, 0xc27a2a, 0x4fc2c2];
const TAXI_COLOR = 0xf2c230;
function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  return mesh;
}
function profile(points, width, bevel) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) s.lineTo(x, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width - bevel * 2, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
  });
  g.rotateY(-Math.PI / 2);
  g.translate((width - bevel * 2) / 2, 0, 0);
  return g;
}
export function buildCarMesh(type, color) {
  const group = new THREE.Group();
  const isTruck = type === 'truck';
  const isSports = type === 'sports';
  const isPolice = type === 'police';
  const isLow = type === 'lowrider';
  const len = isTruck ? 6.4 : isSports ? 4.0 : CAR.length;
  const paintColor = isPolice ? 0xf0f0f0 : color;
  const paint = new THREE.MeshPhysicalMaterial({
    color: paintColor, metalness: 0.6, roughness: 0.28,
    clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.4, roughness: 0.5 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x10161f, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 1, roughness: 0.15, envMapIntensity: 1.4 });
  const L = len / 2;
  const body = new THREE.Mesh(profile([
    [-L, 0.28], [L - 0.2, 0.28], [L, 0.42], [L, 0.62],
    [L * 0.32, 0.84], [-L * 0.28, 0.84], [-L, 0.62],
  ], CAR.width, 0.07), paint);
  body.castShadow = true;
  body.position.y = isLow ? -0.08 : 0;
  group.add(body);
  if (isPolice) {
    const hoodBlack = box(CAR.width - 0.2, 0.06, len * 0.26, black);
    hoodBlack.position.set(0, 0.9, len * 0.32);
    hoodBlack.rotation.x = -0.1;
    group.add(hoodBlack);
  }
  const cabinZ = isTruck ? len * 0.28 : -len * 0.04;
  const cabinD = len * (isTruck ? 0.3 : 0.42);
  const ch = cabinD / 2;
  const cabin = new THREE.Mesh(profile([
    [-ch, 0.84], [ch - 0.22, 0.84], [ch - 0.52, 1.36], [-ch + 0.08, 1.36],
  ], CAR.width - 0.34, 0.04), glass);
  cabin.castShadow = true;
  cabin.position.set(0, 0, cabinZ);
  group.add(cabin);
  const roof = box(CAR.width - 0.3, 0.07, cabinD * 0.82, paint);
  roof.position.set(0, 1.4, cabinZ - cabinD * 0.03);
  group.add(roof);
  if (isTruck) {
    const bed = box(CAR.width - 0.2, 0.5, len * 0.5, dark);
    bed.position.set(0, 1.0, -len * 0.2);
    group.add(bed);
  }
  if (isSports) {
    const spoiler = box(1.7, 0.08, 0.3, dark);
    spoiler.position.set(0, 1.05, -len / 2 + 0.2);
    group.add(spoiler);
  }
  if (type === 'taxi') {
    const sign = box(0.7, 0.22, 0.4, new THREE.MeshBasicMaterial({ color: 0xffe98a }));
    sign.position.set(0, 1.55, 0);
    group.add(sign);
  }
  // Bumpers, side skirts, grille and mirrors.
  const bumperF = box(CAR.width - 0.1, 0.2, 0.18, dark);
  bumperF.position.set(0, 0.32, len / 2 + 0.02);
  group.add(bumperF);
  const bumperR = box(CAR.width - 0.1, 0.2, 0.18, dark);
  bumperR.position.set(0, 0.32, -len / 2 - 0.02);
  group.add(bumperR);
  for (const sx of [-1, 1]) {
    const skirt = box(0.1, 0.16, len * 0.7, dark);
    skirt.position.set(sx * (CAR.width / 2 - 0.02), 0.3, 0);
    group.add(skirt);
    const mirror = box(0.14, 0.1, 0.22, dark);
    mirror.position.set(sx * (CAR.width / 2 + 0.04), 1.05, len * 0.14);
    group.add(mirror);
  }
  const grille = box(0.9, 0.14, 0.06, dark);
  grille.position.set(0, 0.52, len / 2 + 0.03);
  group.add(grille);
  for (const gy of [0.48, 0.56]) {
    const bar = box(0.8, 0.03, 0.03, chrome);
    bar.position.set(0, gy, len / 2 + 0.06);
    group.add(bar);
  }
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), chrome);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.6, 0.3, -len / 2 - 0.1);
  group.add(exhaust);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff2b0, emissiveIntensity: 3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xdd0000, emissiveIntensity: 2.5 });
  for (const sx of [-0.65, 0.65]) {
    const head = box(0.34, 0.16, 0.08, headMat);
    head.position.set(sx, 0.62, len / 2 + 0.01);
    group.add(head);
    const tail = box(0.34, 0.16, 0.08, tailMat);
    tail.position.set(sx, 0.62, -len / 2 - 0.01);
    group.add(tail);
  }
  const tailBar = box(1.1, 0.07, 0.06, tailMat);
  tailBar.position.set(0, 0.62, -len / 2 - 0.01);
  group.add(tailBar);
  // orients the axle, rotation.x spins).
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.34, 10);
  const hubSideMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.7 });
  const hubCapMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.7, roughness: 0.3 });
  const wheels = [];
  for (const [wx, wz] of [[-0.85, len / 2 - 0.8], [0.85, len / 2 - 0.8], [-0.85, -len / 2 + 0.8], [0.85, -len / 2 + 0.8]]) {
    const wheel = new THREE.Group();
    wheel.rotation.z = Math.PI / 2;
    const tire = new THREE.Mesh(tireGeo, dark);
    tire.castShadow = true;
    wheel.add(tire);
    const hub = new THREE.Mesh(hubGeo, [hubSideMat, hubCapMat, hubCapMat]);
    wheel.add(hub);
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  let lightBar = null;
  if (type === 'police') {
    lightBar = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2a6aff, emissive: 0x2a6aff, emissiveIntensity: 3 });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), redMat);
    red.position.x = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), blueMat);
    blue.position.x = 0.35;
    lightBar.add(red, blue);
    lightBar.position.set(0, 1.52, 0);
    lightBar.userData = { red, blue };
    group.add(lightBar);
  }
  return { group, wheels, lightBar, len };
}
export function buildBoatMesh(type, color) {
  const group = new THREE.Group();
  const isAir = type === 'airboat';
  const len = isAir ? 5.2 : 6.0;
  const L = len / 2;
  const hullMat = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x10161f, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6,
  });
  const hull = new THREE.Mesh(profile([
    [-L, 0.25], [L - 0.5, 0.25], [L, 0.75], [L * 0.4, 0.95], [-L, 0.95],
  ], 2.0, 0.06), hullMat);
  hull.castShadow = true;
  group.add(hull);
  const deck = box(1.7, 0.1, len * 0.55, dark);
  deck.position.set(0, 0.98, -len * 0.08);
  group.add(deck);
  if (isAir) {
    const seat = box(0.7, 0.7, 0.7, dark);
    seat.position.set(0, 1.35, -0.4);
    group.add(seat);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.25, 12, 1, true), dark);
    cage.rotation.x = Math.PI / 2;
    cage.position.set(0, 1.7, -L + 0.5);
    group.add(cage);
    for (let i = 0; i < 3; i += 1) {
      const blade = box(0.16, 1.5, 0.06, new THREE.MeshStandardMaterial({ color: 0xd8b13a, roughness: 0.5 }));
      blade.position.set(0, 1.7, -L + 0.5);
      blade.rotation.z = (i / 3) * Math.PI;
      group.add(blade);
    }
  } else {
    const shield = new THREE.Mesh(profile([
      [-0.5, 0.95], [0.5, 0.95], [0.3, 1.5], [-0.3, 1.5],
    ], 1.7, 0.03), glass);
    shield.position.set(0, 0, len * 0.12);
    group.add(shield);
    const motor = box(0.5, 0.9, 0.4, dark);
    motor.position.set(0, 0.6, -L - 0.1);
    group.add(motor);
    const stripe = box(2.02, 0.14, len * 0.8, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
    stripe.position.set(0, 0.55, 0);
    group.add(stripe);
  }
  return { group, wheels: [], lightBar: null, len };
}
export function buildBikeMesh(color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 1, roughness: 0.15 });
  const body = new THREE.Mesh(profile([
    [-1.1, 0.4], [0.9, 0.4], [1.05, 0.62], [0.55, 0.78], [-0.4, 0.82], [-1.05, 0.62],
  ], 0.42, 0.04), paint);
  body.castShadow = true;
  group.add(body);
  const seat = box(0.4, 0.1, 0.7, dark);
  seat.position.set(0, 0.86, -0.45);
  group.add(seat);
  const bars = box(0.7, 0.07, 0.07, chrome);
  bars.position.set(0, 1.0, 0.85);
  group.add(bars);
  const lamp = box(0.3, 0.16, 0.08, new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff2b0, emissiveIntensity: 3 }));
  lamp.position.set(0, 0.62, 1.12);
  group.add(lamp);
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 12);
  const wheels = [];
  for (const wz of [0.85, -0.85]) {
    const wheel = new THREE.Group();
    wheel.rotation.z = Math.PI / 2;
    const tire = new THREE.Mesh(tireGeo, dark);
    tire.castShadow = true;
    wheel.add(tire);
    wheel.position.set(0, 0.34, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  return { group, wheels, lightBar: null, len: 2.2 };
}
export function buildHeliMesh() {
  const group = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.4, roughness: 0.5 });
  const body = box(3.2, 1.1, 1.6, hull);
  group.add(body);
  const tail = box(2.6, 0.4, 0.4, hull);
  tail.position.set(-2.6, 0.2, 0);
  group.add(tail);
  const rotor = box(7, 0.08, 0.5, new THREE.MeshStandardMaterial({ color: 0x1a1a1e }));
  rotor.position.y = 0.75;
  group.add(rotor);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 45, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  spot.position.y = -22.5;
  group.add(spot);
  return { group, rotor };
}

export function makeCar(scene, type, color, x, z, heading) {
  const mesh = type === 'airboat' || type === 'speedboat'
    ? buildBoatMesh(type, color ?? pick(Math.random, CAR_COLORS))
    : type === 'bike'
      ? buildBikeMesh(color ?? pick(Math.random, CAR_COLORS))
      : buildCarMesh(type, color ?? pick(Math.random, CAR_COLORS));
  mesh.group.position.set(x, 0, z);
  mesh.group.rotation.y = heading;
  scene.add(mesh.group);
  return {
    type, mesh, x, z, heading, speed: 0, steer: 0,
    len: mesh.len, radius: CAR.radius, bounce: type === 'lowrider',
    boat: type === 'airboat' || type === 'speedboat',
    bike: type === 'bike',
    edge: -1, edgeFrom: -1, edgeTo: -1, edgeT: 0, edgeDir: 1,
    targetSpeed: 0, police: type === 'police', path: [], pathAt: 0, repath: 0,
    stuck: 0, flash: 0, dead: false,
  };
}
export function placeCarOnEdge(car, city, edgeId, dir, t) {
  const edge = city.edges[edgeId];
  const a = city.nodes[dir > 0 ? edge.a : edge.b];
  const b = city.nodes[dir > 0 ? edge.b : edge.a];
  const lane = 1.9; // drive on the right side of the road
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  car.x = a.x + dx * t + nx * lane;
  car.z = a.z + dz * t + nz * lane;
  car.heading = Math.atan2(dx, dz);
  car.edge = edgeId;
  car.edgeFrom = dir > 0 ? edge.a : edge.b;
  car.edgeTo = dir > 0 ? edge.b : edge.a;
  car.edgeT = t;
  car.edgeDir = dir;
  car.speed = 0;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
}
export function spawnTrafficCar(scene, city, random, nearX, nearZ) {
  const near = city.edges.map((e, i) => ({ e, i }))
    .filter(({ e }) => {
      const mx = (city.nodes[e.a].x + city.nodes[e.b].x) / 2;
      const mz = (city.nodes[e.a].z + city.nodes[e.b].z) / 2;
      return Math.hypot(mx - nearX, mz - nearZ) < 110;
    });
  if (!near.length) return null;
  const { i } = pick(random, near);
  const r = random();
  const type = r < 0.08 ? 'taxi' : r < 0.15 ? 'truck' : r < 0.21 ? 'lowrider' : r < 0.27 ? 'muscle' : r < 0.38 ? 'sports' : r < 0.44 ? 'bike' : 'sedan';
  const color = type === 'taxi' ? TAXI_COLOR : pick(random, CAR_COLORS);
  const car = makeCar(scene, type, color, 0, 0, 0);
  placeCarOnEdge(car, city, i, random() < 0.5 ? 1 : -1, random());
  car.targetSpeed = range(random, 7, 12);
  car.speed = car.targetSpeed;
  return car;
}
export function stepTraffic(car, city, dt, carsAhead) {
  const edge = city.edges[car.edge];
  if (!edge) return;
  const a = city.nodes[car.edgeFrom];
  const b = city.nodes[car.edgeTo];
  const edgeLen = edge.len;
  // Slow for a car ahead on the same edge.
  let want = car.targetSpeed;
  for (const other of carsAhead) {
    if (other === car || other.edge !== car.edge || other.edgeDir !== car.edgeDir) continue;
    const gap = (other.edgeT - car.edgeT) * edgeLen;
    if (gap > 0 && gap < 14) want = Math.min(want, Math.max(0, (gap - 7) * 0.8));
  }
  // Ease into the next intersection.
  const remain = (1 - car.edgeT) * edgeLen;
  if (remain < 10) want = Math.min(want, 5 + remain * 0.4);
  car.speed += (want - car.speed) * Math.min(1, dt * 1.6);
  car.edgeT += (car.speed * dt) / edgeLen;
  if (car.edgeT >= 1) {
    const options = city.adjacency[car.edgeTo].filter((o) => o.to !== car.edgeFrom);
    const next = options.length
      ? options[Math.floor(Math.random() * options.length)]
      : city.adjacency[car.edgeTo][0];
    if (!next) return;
    const from = car.edgeTo;
    const to = next.to;
    car.edge = next.edge;
    car.edgeFrom = from;
    car.edgeTo = to;
    car.edgeDir = city.edges[next.edge].a === from ? 1 : -1;
    car.edgeT = 0;
    const na = city.nodes[from];
    const nb = city.nodes[to];
    car.heading = Math.atan2(nb.x - na.x, nb.z - na.z);
  }
  const lane = 1.9;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  car.x = a.x + dx * car.edgeT + nx * lane;
  car.z = a.z + dz * car.edgeT + nz * lane;
  // Smooth the turn at the node.
  const targetHeading = Math.atan2(dx, dz);
  let dh = targetHeading - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  car.heading += dh * Math.min(1, dt * 3);
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  if (car.bounce && Math.abs(car.speed) < 4) car.mesh.group.position.y = 0.12 + Math.sin(performance.now() / 140) * 0.1;
  for (const wheel of car.mesh.wheels) wheel.rotation.x += (car.speed * dt) / 0.36;
}
export function stepDriven(car, throttle, steer, dt, collide) {
  const maxSpeed = car.type === 'sports' ? CAR.sportsMax : car.type === 'bike' ? 32 : CAR.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    car.speed += (car.speed > 0.5 ? -CAR.brake : CAR.accel * 0.7) * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  }
  car.speed = Math.max(-CAR.reverseMax, Math.min(maxSpeed, car.speed));
  const speedFactor = Math.min(1, Math.abs(car.speed) / 10);
  car.steer += (steer * CAR.steer - car.steer) * Math.min(1, dt * 8);
  car.heading += car.steer * speedFactor * Math.sign(car.speed) * dt * 1.9;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const resolved = collide(nx, nz, car);
  car.x = resolved.x;
  car.z = resolved.z;
  if (resolved.hit) car.speed *= 0.55;
  car.mesh.group.position.set(car.x, 0, car.z);
  car.mesh.group.rotation.y = car.heading;
  if (car.bounce && Math.abs(car.speed) < 4) car.mesh.group.position.y = 0.12 + Math.sin(performance.now() / 140) * 0.1;
  for (const wheel of car.mesh.wheels) wheel.rotation.x += (car.speed * dt) / 0.36;
  if (car.mesh.lightBar) {
    car.flash += dt;
    const on = Math.floor(car.flash * 6) % 2 === 0;
    const red = car.mesh.lightBar.userData.red.material;
    const blue = car.mesh.lightBar.userData.blue.material;
    red.color.setHex(on ? 0xff2a2a : 0x551111);
    red.emissive.setHex(on ? 0xff2a2a : 0x220000);
    red.emissiveIntensity = on ? 3 : 0.2;
    blue.color.setHex(on ? 0x112255 : 0x2a6aff);
    blue.emissive.setHex(on ? 0x000022 : 0x2a6aff);
    blue.emissiveIntensity = on ? 0.2 : 3;
  }
}
