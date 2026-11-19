// Hitscan combat: a ray against spheres (peds, cars), a tracer line and a
import * as THREE from '../vendor/three.module.min.js';
export function raySphere(origin, dir, center, radius) {
  const ox = center.x - origin.x;
  const oy = center.y - origin.y;
  const oz = center.z - origin.z;
  const tca = ox * dir.x + oy * dir.y + oz * dir.z;
  if (tca < 0) return Infinity;
  const d2 = ox * ox + oy * oy + oz * oz - tca * tca;
  const r2 = radius * radius;
  if (d2 > r2) return Infinity;
  return tca - Math.sqrt(r2 - d2);
}
export function createCombat(scene) {
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe98a, transparent: true, opacity: 0.9 });
  const tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
  const tracer = new THREE.Mesh(tracerGeo, tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  let tracerLife = 0;
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0 });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), flashMat);
  flash.visible = false;
  scene.add(flash);
  let flashLife = 0;
  // Sparks: one small pool of boxes that burst and fall.
  const sparks = [];
  const sparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffb03a });
  for (let i = 0; i < 24; i += 1) {
    const s = new THREE.Mesh(sparkGeo, sparkMat);
    s.visible = false;
    scene.add(s);
    sparks.push({ mesh: s, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  function burst(point, count) {
    let made = 0;
    for (const s of sparks) {
      if (made >= count) break;
      if (s.life > 0) continue;
      s.life = 0.5;
      s.mesh.visible = true;
      s.mesh.position.set(point.x, point.y, point.z);
      const a = Math.random() * Math.PI * 2;
      const up = 1 + Math.random() * 3;
      s.vx = Math.cos(a) * 3;
      s.vz = Math.sin(a) * 3;
      s.vy = up;
      made += 1;
    }
  }
  function update(dt) {
    if (tracerLife > 0) {
      tracerLife -= dt;
      tracerMat.opacity = Math.max(0, tracerLife / 0.09) * 0.9;
      if (tracerLife <= 0) tracer.visible = false;
    }
    if (flashLife > 0) {
      flashLife -= dt;
      flashMat.opacity = Math.max(0, flashLife / 0.06);
      if (flashLife <= 0) flash.visible = false;
    }
    for (const s of sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vy -= 12 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      if (s.life <= 0 || s.mesh.position.y < 0.05) {
        s.life = 0;
        s.mesh.visible = false;
      }
    }
  }
  function shoot(origin, dir, targets, range) {
    let best = null;
    let bestT = range ?? 90;
    for (const t of targets) {
      const d = raySphere(origin, dir, { x: t.x, y: t.y, z: t.z }, t.r);
      if (d < bestT) { bestT = d; best = t; }
    }
    const end = {
      x: origin.x + dir.x * bestT,
      y: Math.max(0.05, origin.y + dir.y * bestT),
      z: origin.z + dir.z * bestT,
    };
    // Tracer from the muzzle to the hit point.
    const mid = {
      x: (origin.x + end.x) / 2,
      y: (origin.y + end.y) / 2,
      z: (origin.z + end.z) / 2,
    };
    tracer.position.set(mid.x, mid.y, mid.z);
    tracer.scale.set(1, 1, bestT);
    tracer.lookAt(end.x, end.y, end.z);
    tracer.visible = true;
    tracerLife = 0.09;
    flash.position.set(origin.x, origin.y, origin.z);
    flash.visible = true;
    flashLife = 0.06;
    if (best) burst(end, 6);
    return { hit: best, point: end, distance: bestT };
  }
  return { shoot, update, burst };
}
