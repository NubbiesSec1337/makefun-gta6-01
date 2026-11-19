// Palm City: the ground, the road grid, the buildings, the props and the road
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, PALETTE } from './config.js';
import { pick, range } from './random.js';
import {
  makeFacadeTexture, makeAsphaltTexture, makeSidewalkTexture, makeGrassTexture,
  makeSandTexture, makeWaterTexture, makeBrickTexture,
  makeNeonSignTexture, makeSkylineTexture, makeGlowTexture,
} from './textures.js';
import { buildCarMesh } from './vehicles.js';
const ROADS = WORLD.roadPos;
const BLOCKS = [-150, -90, -30, 30, 90, 150];
const ROAD_W = WORLD.roadWidth;
function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
// faces repeat (d/a, h/b), top/bottom (w/a, d/b).
function boxUV(w, h, d, a, b) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv;
  const faceRepeat = [
    [d / a, h / b], [d / a, h / b],
    [w / a, d / b], [w / a, d / b],
    [w / a, h / b], [w / a, h / b],
  ];
  for (let f = 0; f < 6; f += 1) {
    const [su, sv] = faceRepeat[f];
    for (let v = 0; v < 4; v += 1) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
  }
  return geo;
}
export function createCity(scene, random) {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const circles = [];
  const asphaltTex = makeAsphaltTexture();
  const sidewalkTex = makeSidewalkTexture();
  sidewalkTex.repeat.set(46, 46);
  const grassTex = makeGrassTexture();
  grassTex.repeat.set(4, 4);
  const sandTex = makeSandTexture();
  sandTex.repeat.set(46, 4);
  const waterTex = makeWaterTexture();
  waterTex.repeat.set(24, 10);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const neonMat = (tex, i) => std({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: i, roughness: 0.4 });
  function put(w, h, d, mat, x, y, z) { const m = box(w, h, d, mat); m.position.set(x, y, z); group.add(m); return m; }
  const matSidewalk = std({ map: sidewalkTex, roughness: 0.95, envMapIntensity: 0.4 });
  const matAsphalt = std({ map: asphaltTex, roughness: 0.92, envMapIntensity: 0.35 });
  const matSand = std({ map: sandTex, roughness: 1, envMapIntensity: 0.3 });
  const matWater = std({ map: waterTex, roughness: 0.18, metalness: 0.15, envMapIntensity: 0.4 });
  const matGrass = std({ map: grassTex, roughness: 1, envMapIntensity: 0.3 });
  const matPlaza = std({ color: PALETTE.plaza, roughness: 0.95, envMapIntensity: 0.3 });
  const matRoof = std({ color: PALETTE.roof, roughness: 0.95, envMapIntensity: 0.3 });
  const matTrunk = std({ color: PALETTE.palmTrunk, roughness: 0.9 });
  const matLeaf = std({ color: PALETTE.palmLeaf, roughness: 1 });
  const matSaw = std({ color: 0x2a5a2a, roughness: 1 });
  const matPole = std({ color: 0x3a3f45, roughness: 0.6, metalness: 0.5 });
  const matLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2b0).multiplyScalar(2.2) });
  const matWood = std({ color: 0x8a6a42, roughness: 0.9 });
  const matTank = std({ color: 0x9a8a7a, roughness: 0.8, metalness: 0.3 });
  const matHydrant = std({ color: 0xc23b2a, roughness: 0.5, metalness: 0.2 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 460), matSidewalk);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  for (const x of ROADS) {
    const tex = asphaltTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(57, 1.75);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 460), std({ map: tex, roughness: 0.92, envMapIntensity: 0.35 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);
  }
  for (const z of ROADS) {
    const tex = asphaltTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1.75, 57);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(460, ROAD_W), std({ map: tex, roughness: 0.92, envMapIntensity: 0.35 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.03, z);
    road.receiveShadow = true;
    group.add(road);
  }
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(460, 34), matSand);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 207);
  sand.receiveShadow = true;
  group.add(sand);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 260), matWater);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, 350);
  group.add(water);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), matGrass);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.04, 0);
  plaza.receiveShadow = true;
  group.add(plaza);
  const walkTex = makeSidewalkTexture();
  walkTex.repeat.set(11, 1.2);
  const matWalk = std({ map: walkTex, roughness: 0.95 });
  for (const rot of [0, Math.PI / 2]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(46, 5), matWalk);
    walk.rotation.x = -Math.PI / 2;
    walk.rotation.z = rot;
    walk.position.set(0, 0.05, 0);
    walk.receiveShadow = true;
    group.add(walk);
  }
  const dashGeo = new THREE.BoxGeometry(0.35, 0.06, 3.2);
  const dashMat = std({ color: PALETTE.asphaltLine, roughness: 0.9 });
  const dashPositions = [];
  for (const x of ROADS) {
    for (let z = -210; z < 190; z += 9) {
      if (ROADS.some((r) => Math.abs(z - r) < 9)) continue;
      dashPositions.push([x, z, 0]);
    }
  }
  for (const z of ROADS) {
    for (let x = -210; x < 210; x += 9) {
      if (ROADS.some((r) => Math.abs(x - r) < 9)) continue;
      dashPositions.push([x, z, 1]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashPositions.length);
  const m4 = new THREE.Matrix4();
  dashPositions.forEach(([x, z, rot], i) => {
    m4.makeRotationY(rot ? Math.PI / 2 : 0);
    m4.setPosition(x, 0.06, z);
    dashes.setMatrixAt(i, m4);
  });
  group.add(dashes);
  const stripeGeo = new THREE.BoxGeometry(0.7, 0.05, 3.4);
  const stripeMat = std({ color: 0xe8e8e4, roughness: 0.9 });
  const stripePositions = [];
  for (const x of ROADS) {
    for (const z of ROADS) {
      for (const side of [-1, 1]) {
        for (let k = -2; k <= 2; k += 1) {
          const a = [x + k * 2.8, z + side * 9.5, 0];
          const b = [x + side * 9.5, z + k * 2.8, 1];
          if (Math.abs(a[0]) >= 24 || Math.abs(a[1]) >= 24) stripePositions.push(a);
          if (Math.abs(b[0]) >= 24 || Math.abs(b[1]) >= 24) stripePositions.push(b);
        }
      }
    }
  }
  const stripes = new THREE.InstancedMesh(stripeGeo, stripeMat, stripePositions.length);
  stripePositions.forEach(([x, z, rot], i) => {
    m4.makeRotationY(rot ? Math.PI / 2 : 0);
    m4.setPosition(x, 0.07, z);
    stripes.setMatrixAt(i, m4);
  });
  stripes.receiveShadow = true;
  group.add(stripes);
  const tlSpots = [];
  for (let ix = 0; ix < 7; ix += 2) {
    for (let iz = 0; iz < 7; iz += 2) tlSpots.push([ROADS[ix], ROADS[iz]]);
  }
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.5, 6);
  const poles = new THREE.InstancedMesh(poleGeo, matPole, tlSpots.length);
  const armGeo = new THREE.BoxGeometry(5, 0.22, 0.22);
  const arms = new THREE.InstancedMesh(armGeo, matPole, tlSpots.length);
  const headGeo = new THREE.BoxGeometry(0.5, 1.3, 0.5);
  const heads = new THREE.InstancedMesh(headGeo, matPole, tlSpots.length);
  const tlLampGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const redLamps = new THREE.InstancedMesh(tlLampGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a2a).multiplyScalar(2) }), Math.ceil(tlSpots.length / 2));
  const greenLamps = new THREE.InstancedMesh(tlLampGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2aff5a).multiplyScalar(2) }), Math.floor(tlSpots.length / 2));
  let ri = 0;
  let gi = 0;
  tlSpots.forEach(([x, z], i) => {
    const px = x - 8.5;
    const pz = z - 8.5;
    m4.identity();
    m4.setPosition(px, 3.25, pz);
    poles.setMatrixAt(i, m4);
    m4.identity();
    m4.setPosition(px + 2.5, 6.3, pz);
    arms.setMatrixAt(i, m4);
    m4.identity();
    m4.setPosition(px + 4.8, 5.8, pz);
    heads.setMatrixAt(i, m4);
    m4.identity();
    m4.setPosition(px + 4.8, 5.5, pz + 0.28);
    if ((i % 2) === 0) { redLamps.setMatrixAt(ri, m4); ri += 1; } else { greenLamps.setMatrixAt(gi, m4); gi += 1; }
    circles.push({ x: px, z: pz, r: 0.4 });
  });
  group.add(poles, arms, heads, redLamps, greenLamps);
  const hydBodyGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.7, 8);
  const hydTopGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const hydBodies = new THREE.InstancedMesh(hydBodyGeo, matHydrant, 12);
  const hydTops = new THREE.InstancedMesh(hydTopGeo, matHydrant, 12);
  for (let i = 0; i < 12; i += 1) {
    const x = pick(random, ROADS) + (random() < 0.5 ? 9.5 : -9.5);
    const z = range(random, -180, 180);
    m4.identity();
    m4.setPosition(x, 0.35, z);
    hydBodies.setMatrixAt(i, m4);
    m4.identity();
    m4.setPosition(x, 0.78, z);
    hydTops.setMatrixAt(i, m4);
    circles.push({ x, z, r: 0.4 });
  }
  group.add(hydBodies, hydTops);
  const treeSpots = [];
  for (let i = 0; i < 24; i += 1) {
    const along = random() < 0.5;
    const road = pick(random, ROADS);
    const off = range(random, -180, 180);
    treeSpots.push(along ? { x: road + 9.5, z: off } : { x: off, z: road + 9.5 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 3.4, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, matTrunk, treeSpots.length);
  const canopyGeo = new THREE.SphereGeometry(1.6, 8, 6);
  const canopies = new THREE.InstancedMesh(canopyGeo, std({ color: 0x3f8f4f, roughness: 1 }), treeSpots.length * 3);
  treeSpots.forEach(({ x, z }, i) => {
    m4.identity();
    m4.setPosition(x, 1.7, z);
    trunks.setMatrixAt(i, m4);
    const offs = [[0, 4.4, 0], [1.1, 3.8, 0.6], [-0.9, 3.9, -0.7]];
    offs.forEach(([dx, dy, dz], j) => {
      m4.identity();
      m4.setPosition(x + dx, dy, z + dz);
      canopies.setMatrixAt(i * 3 + j, m4);
    });
    circles.push({ x, z, r: 0.5 });
  });
  trunks.castShadow = true;
  canopies.castShadow = true;
  group.add(trunks, canopies);
  const facadeTexes = [
    makeFacadeTexture(random, 0.25), makeFacadeTexture(random, 0.4),
    makeFacadeTexture(random, 0.15), makeFacadeTexture(random, 0.32),
    makeBrickTexture(random),
  ];
  const wallMats = facadeTexes.map((tex, i) => std({
    map: tex, color: PALETTE.building[(i * 2) % PALETTE.building.length], roughness: 0.85, envMapIntensity: 0.5,
  }));
  const matTrim = std({ color: 0xe8e0d0, roughness: 0.8, envMapIntensity: 0.4 });
  const matGlassShop = new THREE.MeshPhysicalMaterial({
    color: 0x1a2836, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6,
  });
  const matAwningRed = std({ color: 0xc23b2a, roughness: 0.85 });
  const matAwningTeal = std({ color: 0x1a6a6a, roughness: 0.85 });
  const neonSigns = [
    ['BAR', '#ff5a3a'], ['CAFE', '#ffd23f'], ['TACOS', '#ff9a1a'],
    ['24H', '#3aff8a'], ['PIZZA', '#ff6a9a'], ['HOTEL', '#6ac2ff'],
    ['DONUTS', '#ff8ad8'], ['GYM', '#8aff5a'], ['PHARMACY', '#5affc2'],
  ].map(([text, color]) => {
    const tex = makeNeonSignTexture(text, color);
    return neonMat(tex, 1.6);
  });
  const pastelMats = [0xffb8d8, 0x9ad8e8, 0xffe8a8, 0xc8f0d8].map((c) => std({
    map: facadeTexes[0], color: c, roughness: 0.85, envMapIntensity: 0.5,
  }));
  const districtSigns = [
    ['OCEAN', '#ff6ad8'], ['VICE', '#5affc2'], ['DECO', '#ffd23f'], ['NEON', '#6ac2ff'],
  ].map(([text, color]) => {
    const tex = makeNeonSignTexture(text, color);
    return neonMat(tex, 1.6);
  });
  const barSignTex = makeNeonSignTexture("MARCO'S BAR", '#ff5a3a');
  const matBarSign = neonMat(barSignTex, 1.8);
  const tankGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.6, 10);
  const tankRoofGeo = new THREE.ConeGeometry(1.7, 1, 10);
  const billboards = [
    ['PALM CITY', '#1a4a7a', '#ffd23f'], ['HOTEL', '#7a1a2a', '#f2e8d8'],
    ['CINEMA', '#1a1a1a', '#ff7a1a'], ['BANK', '#2a4a2a', '#f2f2f2'],
    ['TACOS', '#c25a1a', '#fff2b0'],
  ];
  let billboardCount = 0;
  function roadFace(ox, oz, w, d) {
    const gx = 30 - Math.abs(ox) - w / 2;
    const gz = 30 - Math.abs(oz) - d / 2;
    if (gx <= gz) return ox <= 0 ? 'west' : 'east';
    return oz <= 0 ? 'north' : 'south';
  }
  const FACES = {
    west: { ax: -1, az: 0, ry: -Math.PI / 2 },
    east: { ax: 1, az: 0, ry: Math.PI / 2 },
    north: { ax: 0, az: -1, ry: Math.PI },
    south: { ax: 0, az: 1, ry: 0 },
  };
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      if (bx === 0 && bz === 0) continue;
      const dist = Math.hypot(bx, bz);
      const tall = dist < 70 ? 1 : 0;
      const isBeach = bz === 150;
      const count = random() < 0.45 ? 1 : random() < 0.7 ? 2 : 4;
      let spots = count === 1 ? [[0, 0, 34, 34]] : count === 2
        ? [[-11, 0, 20, 38], [11, 0, 20, 38]]
        : [[-11, -11, 18, 18], [11, -11, 18, 18], [-11, 11, 18, 18], [11, 11, 18, 18]];
      const isBar = bx === -150 && bz === -150;
      const isSwamp = bx === -90 && bz === -150;
      const isMotel = bx === -150 && bz === 90;
      const isClub = bx === 90 && bz === 150;
      if (isSwamp) {
        const swampWater = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), matWater);
        swampWater.rotation.x = -Math.PI / 2;
        swampWater.position.set(bx, 0.03, bz);
        group.add(swampWater);
        for (const [mx, mz, mr] of [[-12, -8, 7], [10, 6, 8], [2, 14, 6], [14, -14, 5]]) {
          const isl = new THREE.Mesh(new THREE.CylinderGeometry(mr, mr + 1, 0.7, 10), matSand);
          isl.position.set(bx + mx, 0.35, bz + mz);
          group.add(isl);
        }
        const tuftGeo = new THREE.ConeGeometry(0.7, 2.2, 5);
        for (let i = 0; i < 36; i += 1) {
          const tuft = new THREE.Mesh(tuftGeo, matSaw);
          tuft.position.set(bx + range(random, -21, 21), 1.1, bz + range(random, -21, 21));
          tuft.rotation.z = range(random, -0.25, 0.25);
          group.add(tuft);
        }
        const shack = box(7, 4, 5, matWood);
        shack.position.set(bx + 12, 2.6, bz - 10);
        group.add(shack);
        const shackRoof = box(8, 0.4, 6, matRoof);
        shackRoof.position.set(bx + 12, 4.9, bz - 10);
        group.add(shackRoof);
        colliders.push({ minX: bx + 8.5, maxX: bx + 15.5, minZ: bz - 12.5, maxZ: bz - 7.5 });
        continue;
      }
      if (isMotel) {
        spots = [[-6, -8, 26, 16], [-6, 12, 26, 12]];
      }
      if (isClub) spots = [[0, 0, 30, 24]];
      if (isBar) {
        spots = spots.length === 1 ? [[-14, 0, 10, 34]]
          : spots.length === 2 ? [[-14, 0, 14, 38], [14, 0, 14, 38]]
            : [[-13, -11, 14, 18], [13, -11, 14, 18], [-13, 11, 14, 18], [13, 11, 14, 18]];
      }
      for (const [ox, oz, w, d] of spots) {
        const h = tall ? range(random, 20, 46) : range(random, 8, 20);
        const mat = isBeach ? pick(random, pastelMats) : pick(random, wallMats);
        const mesh = new THREE.Mesh(boxUV(w, h, d, 11, 11), mat);
        mesh.scale.set(w, h, d);
        mesh.position.set(bx + ox, h / 2, bz + oz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        put(w + 0.5, 0.35, d + 0.5, matTrim, bx + ox, h - 0.15, bz + oz);
        if (isBeach) {
          put(w * 0.55, 2.2, d * 0.55, matTrim, bx + ox, h + 1.1, bz + oz);
          put(w * 0.6, 0.18, d * 0.6, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff6ad8).multiplyScalar(2) }), bx + ox, h + 2.3, bz + oz);
        }
        put(w * 0.9, 0.8, d * 0.9, matRoof, bx + ox, h + 0.4, bz + oz);
        const face = roadFace(ox, oz, w, d);
        const F = FACES[face];
        const px = bx + ox;
        const pz = bz + oz;
        // the building reads as built, not as a flat box.
        for (const s of [-1, 1]) {
          const pil = box(F.ax ? 0.3 : 0.5, h * 0.7, F.ax ? 0.5 : 0.3, matTrim);
          pil.position.set(px + F.ax * (w / 2 + 0.12) + (F.az ? s * w * 0.28 : 0), h * 0.35, pz + F.az * (d / 2 + 0.12) + (F.ax ? s * d * 0.28 : 0));
          group.add(pil);
        }
        put(w + 0.2, 1.4, d + 0.2, matRoof, px, 0.7, pz);
        put(w + 0.4, 0.35, d + 0.4, matTrim, px, h + 0.95, pz);
        if (!isBar && !isClub && random() < 0.4) {
          const faceW = F.ax ? d * 0.7 : w * 0.7;
          const glass = new THREE.Mesh(new THREE.PlaneGeometry(faceW, 2.6), matGlassShop);
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(faceW, 1.1), pick(random, isBeach ? districtSigns : neonSigns));
          const awn = new THREE.Mesh(
            new THREE.BoxGeometry(F.ax ? 1.1 : faceW, 0.15, F.ax ? faceW : 1.1),
            random() < 0.5 ? matAwningRed : matAwningTeal,
          );
          glass.position.set(px + F.ax * (w / 2 + 0.1), 1.5, pz + F.az * (d / 2 + 0.1));
          glass.rotation.y = F.ry;
          sign.position.set(px + F.ax * (w / 2 + 0.12), 4.3, pz + F.az * (d / 2 + 0.12));
          sign.rotation.y = F.ry;
          awn.position.set(px + F.ax * (w / 2 + 0.55), 3.35, pz + F.az * (d / 2 + 0.55));
          awn.rotation.z = F.ax ? -0.35 * F.ax : 0;
          awn.rotation.x = F.az ? 0.35 * F.az : 0;
          group.add(glass, sign, awn);
        }
        if (tall && h > 20 && random() < 0.5) {
          for (const fy of [7.5, 13.5]) {
            const slab = box(F.ax ? 1.3 : 3.4, 0.25, F.ax ? 3.4 : 1.3, matTrim);
            const rail = box(F.ax ? 0.08 : 3.4, 0.9, F.ax ? 3.4 : 0.08, matPole);
            slab.position.set(px + F.ax * (w / 2 + 0.65), fy, pz + F.az * (d / 2 + 0.65));
            rail.position.set(px + F.ax * (w / 2 + 1.25), fy + 0.55, pz + F.az * (d / 2 + 1.25));
            group.add(slab, rail);
          }
        }
        if (isBar && ((spots.length === 1) || ox === Math.max(...spots.map((s) => s[0])))) {
          const barSign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.8), matBarSign);
          if (spots.length === 1) {
            barSign.position.set(bx + ox + w / 2 + 0.12, 5, bz + oz);
            barSign.rotation.y = Math.PI / 2;
          } else {
            barSign.position.set(bx + ox - w / 2 - 0.12, 5, bz + oz);
            barSign.rotation.y = -Math.PI / 2;
          }
          group.add(barSign);
        }
        if (isMotel && oz === -8) {
          // VACANCY neon + a motel pool out front.
          const vacTex = makeNeonSignTexture('VACANCY', '#ff5a3a');
          const vac = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), neonMat(vacTex, 1.8));
          vac.position.set(px + F.ax * (w / 2 + 0.12), 6.5, pz + F.az * (d / 2 + 0.12));
          vac.rotation.y = F.ry;
          group.add(vac);
          const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 16), matWater);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(px + F.ax * (w / 2 + 6), 0.08, pz + F.az * (d / 2 + 6));
          group.add(pool);
        }
        if (isMotel && oz === 12) {
          const clTex = makeNeonSignTexture('CLOSED', '#9a9a9a');
          const cl = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6), neonMat(clTex, 0.7));
          cl.position.set(px + F.ax * (w / 2 + 0.12), 5, pz + F.az * (d / 2 + 0.12));
          cl.rotation.y = F.ry;
          group.add(cl);
        }
        if (isClub) {
          const nineTex = makeNeonSignTexture('NINE', '#c26aff');
          const nine = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.8), neonMat(nineTex, 2));
          nine.position.set(px + F.ax * (w / 2 + 0.12), 6, pz + F.az * (d / 2 + 0.12));
          nine.rotation.y = F.ry;
          group.add(nine);
          const clubGlow = new THREE.Mesh(new THREE.CircleGeometry(7, 20), new THREE.MeshBasicMaterial({
            map: makeGlowTexture(), color: 0xc26aff, transparent: true, opacity: 0.3, depthWrite: false,
          }));
          clubGlow.rotation.x = -Math.PI / 2;
          clubGlow.position.set(px + F.ax * (w / 2 + 5), 0.06, pz + F.az * (d / 2 + 5));
          group.add(clubGlow);
        }
        if (random() < 0.45) {
          const tank = new THREE.Mesh(tankGeo, matTank);
          tank.position.set(bx + ox + range(random, -6, 6), h + 2.1, bz + oz + range(random, -6, 6));
          tank.castShadow = true;
          group.add(tank);
          const cone = new THREE.Mesh(tankRoofGeo, matTank);
          cone.position.set(tank.position.x, h + 3.9, tank.position.z);
          group.add(cone);
        } else if (random() < 0.5) {
          put(3, 1.6, 3, matPole, bx + ox + range(random, -6, 6), h + 1.6, bz + oz + range(random, -6, 6));
        }
        if (tall && billboardCount < billboards.length && random() < 0.3) {
          const [, bg] = billboards[billboardCount];
          billboardCount += 1;
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(11, 3.2, 0.4),
            std({ color: bg, roughness: 0.7 }),
          );
          sign.position.set(bx + ox, h + 2.4, bz + oz + d / 2 + 0.3);
          if (random() < 0.5) sign.rotation.y = Math.PI;
          sign.castShadow = true;
          group.add(sign);
        }
        colliders.push({
          minX: bx + ox - w / 2, maxX: bx + ox + w / 2,
          minZ: bz + oz - d / 2, maxZ: bz + oz + d / 2,
        });
      }
    }
  }
  const odTex = makeNeonSignTexture('OCEAN DRIVE', '#ff6ad8');
  const odSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4), neonMat(odTex, 1.8));
  odSign.position.set(180, 8, 150);
  odSign.rotation.y = Math.PI;
  group.add(odSign);
  for (const px of [172, 188]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 8, 6), matPole);
    post.position.set(px, 4, 150);
    group.add(post);
  }
  const skylineTex = makeSkylineTexture(random, 0.35);
  const skylineMat = std({
    map: skylineTex, emissive: 0xffffff, emissiveMap: skylineTex,
    emissiveIntensity: 0.55, roughness: 0.9,
  });
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2 + 0.11;
    const r = 300 + range(random, 0, 70);
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r;
    if (tz > 240) continue;
    const tw = range(random, 24, 40);
    const th = range(random, 42, 95);
    const tower = new THREE.Mesh(boxUV(tw, th, tw, 14, 28), skylineMat);
    tower.scale.set(tw, th, tw);
    tower.position.set(tx, th / 2 - 2, tz);
    tower.rotation.y = range(random, 0, Math.PI);
    group.add(tower);
  }
  const palmLoGeo = new THREE.CylinderGeometry(0.26, 0.36, 3.4, 6);
  const palmHiGeo = new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6);
  const frondGeo = new THREE.ConeGeometry(1.2, 3.2, 5);
  function palm(x, z) {
    // straight, with a coconut cluster at the crown.
    const lo = new THREE.Mesh(palmLoGeo, matTrunk);
    lo.position.set(x, 1.7, z);
    lo.rotation.z = 0.14;
    lo.castShadow = true;
    group.add(lo);
    const hi = new THREE.Mesh(palmHiGeo, matTrunk);
    hi.position.set(x - 0.45, 4.6, z);
    hi.rotation.z = -0.1;
    hi.castShadow = true;
    group.add(hi);
    const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), std({ color: 0x6a4a2a, roughness: 0.9 }));
    nuts.position.set(x - 0.6, 5.9, z);
    group.add(nuts);
    for (let i = 0; i < 7; i += 1) {
      const frond = new THREE.Mesh(frondGeo, matLeaf);
      const a = (i / 7) * Math.PI * 2;
      frond.position.set(x - 0.6 + Math.cos(a) * 1.2, 6.1, z + Math.sin(a) * 1.2);
      frond.rotation.z = Math.cos(a) * (1.15 + (i % 2) * 0.25);
      frond.rotation.x = -Math.sin(a) * (1.15 + (i % 2) * 0.25);
      frond.scale.set(0.8, 0.3, 0.9);
      group.add(frond);
    }
    circles.push({ x, z, r: 0.6 });
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    palm(Math.cos(a) * 19, Math.sin(a) * 19);
  }
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 1, 20), matPlaza);
  fountainBase.position.set(0, 0.5, 0);
  fountainBase.receiveShadow = true;
  group.add(fountainBase);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.4, 20), matWater);
  fountainWater.position.set(0, 1.1, 0);
  group.add(fountainWater);
  for (let x = -180; x <= 200; x += 40) palm(x, 196);
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const poolGeo = new THREE.CircleGeometry(5, 20);
  const matPool = new THREE.MeshBasicMaterial({
    map: makeGlowTexture(), color: 0xffd9a0, transparent: true, opacity: 0.2, depthWrite: false,
  });
  for (const x of ROADS) {
    for (const z of ROADS) {
      const pole = new THREE.Mesh(lampGeo, matPole);
      pole.position.set(x + 8.5, 3.5, z + 8.5);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), matLamp);
      head.position.set(x + 8.5, 7.1, z + 8.5);
      group.add(head);
      const pool = new THREE.Mesh(poolGeo, matPool);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x + 8.5, 0.06, z + 8.5);
      group.add(pool);
      circles.push({ x: x + 8.5, z: z + 8.5, r: 0.4 });
    }
  }
  for (let z = 192; z <= 258; z += 4) {
    const plank = box(8, 0.5, 3.6, matWood);
    plank.position.set(120, 0.6, z);
    group.add(plank);
  }
  for (let z = 200; z <= 256; z += 16) {
    for (const dx of [-3.6, 3.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), matWood);
      post.position.set(120 + dx, 0, z);
      group.add(post);
    }
  }
  // houses and a marina past the beach.
  const deck = box(10, 0.6, 52, matWood);
  deck.position.set(120, 0.8, 284);
  group.add(deck);
  for (let z = 264; z <= 304; z += 16) {
    for (const dx of [-4.5, 4.5]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 6), matWood);
      pile.position.set(120 + dx, 0, z);
      group.add(pile);
    }
  }
  for (const [hx, hz] of [[100, 250], [142, 275], [98, 290]]) {
    const stilt = box(6, 3.5, 5, std({ color: 0xe8d8b8, roughness: 0.9 }));
    stilt.position.set(hx, 2.6, hz);
    group.add(stilt);
    const sroof = box(7, 0.4, 6, matRoof);
    sroof.position.set(hx, 4.6, hz);
    group.add(sroof);
    for (const [lx, lz] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 6), matWood);
      leg.position.set(hx + lx, 1.2, hz + lz);
      group.add(leg);
    }
  }
  const boatHull = box(3.2, 1.2, 9, std({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.2 }));
  boatHull.position.set(206, 0.4, 60);
  group.add(boatHull);
  const boatCabin = box(2.2, 1.4, 3.4, std({ color: 0x2a6aff, roughness: 0.35, metalness: 0.3 }));
  boatCabin.position.set(206, 1.6, 59);
  group.add(boatCabin);
  for (const dz of [-20, 0, 20]) {
    const dock = box(2.4, 0.4, 14, matWood);
    dock.position.set(204, 0.5, 60 + dz);
    group.add(dock);
  }
  const boat2 = box(2.8, 1, 7.5, std({ color: 0xc23b2a, roughness: 0.4, metalness: 0.2 }));
  boat2.position.set(212, 0.3, 92);
  boat2.rotation.y = 0.4;
  group.add(boat2);
  const boat3 = box(3.4, 1.3, 10, std({ color: 0x2a4a6a, roughness: 0.4, metalness: 0.25 }));
  boat3.position.set(216, 0.3, 28);
  boat3.rotation.y = -0.3;
  group.add(boat3);
  const parkedColors = [0xc23b2a, 0x2a6ac2, 0xd8d8d8, 0x2a2a2e, 0x3aa84f, 0xc27a2a];
  const parkedSpots = [];
  for (let z = -60; z <= 180; z += 40) parkedSpots.push({ x: -180 + (z % 80 === 0 ? 5.2 : -5.2), z, heading: 0 });
  for (let x = -120; x <= 120; x += 60) parkedSpots.push({ x, z: -180 + 5.2, heading: Math.PI / 2 });
  for (const { x, z, heading } of parkedSpots) {
    const parked = buildCarMesh(random() < 0.15 ? 'taxi' : 'sedan', pick(random, parkedColors));
    parked.group.position.set(x, 0, z);
    parked.group.rotation.y = heading;
    group.add(parked.group);
    if (heading === 0) colliders.push({ minX: x - 1, maxX: x + 1, minZ: z - 2.3, maxZ: z + 2.3 });
    else colliders.push({ minX: x - 2.3, maxX: x + 2.3, minZ: z - 1, maxZ: z + 1 });
  }
  const benchMat = std({ color: 0x6a4a2a, roughness: 0.9 });
  const binMat = std({ color: 0x3a4a3a, roughness: 0.7, metalness: 0.4 });
  const benchSpots = [];
  for (let i = 0; i < 6; i += 1) {
    const x = pick(random, ROADS) + (random() < 0.5 ? 9.5 : -9.5);
    const z = range(random, -180, 180);
    if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
    benchSpots.push({ x, z, rot: random() < 0.5 ? 0 : Math.PI / 2 });
  }
  for (const { x, z, rot } of benchSpots) {
    const bench = new THREE.Group();
    const seat = box(2.2, 0.12, 0.6, benchMat);
    seat.position.y = 0.45;
    const back = box(2.2, 0.7, 0.1, benchMat);
    back.position.set(0, 0.85, -0.28);
    bench.add(seat, back);
    for (const dx of [-0.9, 0.9]) {
      const leg = box(0.1, 0.45, 0.5, matPole);
      leg.position.set(dx, 0.22, 0);
      bench.add(leg);
    }
    bench.position.set(x, 0, z);
    bench.rotation.y = rot;
    group.add(bench);
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 8), binMat);
    bin.position.set(x + 1.6, 0.45, z + 0.8);
    bin.castShadow = true;
    group.add(bin);
    circles.push({ x, z, r: 0.9 });
  }
  const umbrellaColors = [0xff5a3a, 0xffd23f, 0x2a6ac2, 0x3aa84f];
  for (let i = 0; i < 4; i += 1) {
    const ux = -140 + i * 80 + range(random, -10, 10);
    const poleU = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), matPole);
    poleU.position.set(ux, 1.3, 202);
    group.add(poleU);
    const canopyU = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1, 8),
      std({ color: umbrellaColors[i], roughness: 0.9 }),
    );
    canopyU.position.set(ux, 3, 202);
    canopyU.castShadow = true;
    group.add(canopyU);
  }
  for (const pz of [210, 230, 250]) {
    const poleP = new THREE.Mesh(lampGeo, matPole);
    poleP.position.set(123.6, 3.5, pz);
    group.add(poleP);
    const headP = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), matLamp);
    headP.position.set(123.6, 7.1, pz);
    group.add(headP);
  }
  const gatorMat = std({ color: 0x3a5a2a, roughness: 0.9 });
  const gator = new THREE.Group();
  const gBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.4, 3, 8), gatorMat);
  gBody.rotation.x = Math.PI / 2;
  gBody.position.y = 0.35;
  gator.add(gBody);
  const gTail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 8), gatorMat);
  gTail.rotation.x = -Math.PI / 2;
  gTail.position.set(0, 0.3, -1.7);
  gator.add(gTail);
  const gSnout = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), gatorMat);
  gSnout.scale.set(0.85, 0.45, 1.1);
  gSnout.position.set(0, 0.3, 1.15);
  gator.add(gSnout);
  for (const [lx, lz] of [[-0.5, 0.7], [0.5, 0.7], [-0.5, -0.7], [0.5, -0.7]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.25, 6), gatorMat);
    leg.position.set(lx, 0.12, lz);
    gator.add(leg);
  }
  for (const ex of [-0.2, 0.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), std({ color: 0xffd23f, roughness: 0.4 }));
    eye.position.set(ex, 0.72, 1.0);
    gator.add(eye);
  }
  gator.position.set(-40, 0, 205);
  group.add(gator);
  const swampGators = [];
  for (const [gx, gz] of [[-102, -160], [-78, -140]]) {
    const sg = gator.clone();
    sg.position.set(gx, 0, gz);
    group.add(sg);
    swampGators.push({ mesh: sg, x: gx, z: gz });
  }
  const gators = [{ mesh: gator, x: -40, z: 205, bounds: [-200, 200, 196, 214] }];
  for (const s of swampGators) gators.push({ ...s, bounds: [-113, -67, -173, -127] });
  const nodes = [];
  const nodeIndex = new Map();
  ROADS.forEach((x, ix) => {
    ROADS.forEach((z, iz) => {
      const id = nodes.length;
      nodes.push({ id, x, z, ix, iz });
      nodeIndex.set(`${ix},${iz}`, id);
    });
  });
  const edges = [];
  function link(a, b) {
    edges.push({ a, b, len: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z) });
  }
  nodes.forEach((n) => {
    if (n.ix < 6) link(n.id, nodeIndex.get(`${n.ix + 1},${n.iz}`));
    if (n.iz < 6) link(n.id, nodeIndex.get(`${n.ix},${n.iz + 1}`));
  });
  const adjacency = nodes.map(() => []);
  edges.forEach((e, i) => { adjacency[e.a].push({ to: e.b, edge: i }); adjacency[e.b].push({ to: e.a, edge: i }); });
  function nearestNode(x, z) {
    let best = 0;
    let bestD = Infinity;
    nodes.forEach((n) => {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bestD) { bestD = d; best = n.id; }
    });
    return best;
  }
  function shortestPath(from, to) {
    const prev = new Array(nodes.length).fill(-1);
    const queue = [from];
    prev[from] = from;
    while (queue.length) {
      const cur = queue.shift();
      if (cur === to) break;
      for (const { to: nxt } of adjacency[cur]) {
        if (prev[nxt] === -1) { prev[nxt] = cur; queue.push(nxt); }
      }
    }
    if (prev[to] === -1) return [from];
    const path = [to];
    let cur = to;
    while (cur !== from) { cur = prev[cur]; path.push(cur); }
    return path.reverse();
  }
  function onRoad(x, z) {
    return ROADS.some((r) => Math.abs(x - r) < ROAD_W / 2 - 1)
      || ROADS.some((r) => Math.abs(z - r) < ROAD_W / 2 - 1);
  }
  function tick(dt) {
    waterTex.offset.x += dt * 0.004;
    waterTex.offset.y += dt * 0.0015;
  }
  return { group, colliders, circles, nodes, edges, adjacency, nearestNode, shortestPath, onRoad, tick, gator: { mesh: gator, x: -40, z: 205 }, gators };
}
