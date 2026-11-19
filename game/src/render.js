// The three.js stage: renderer, golden-hour sky/sun, third-person camera,
// (vendored, offline), with a fallback to direct rendering.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/postprocessing/OutputPass.js';
import { PALETTE } from './config.js';
import { makeSkyTexture, makeGlowTexture } from './textures.js';
function makeEnvironment(renderer) {
  const envScene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide }),
  );
  envScene.add(sky);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(6), fog: false }),
  );
  const dir = new THREE.Vector3(150, 62, -95).normalize();
  sunDisc.position.copy(dir.clone().multiplyScalar(90));
  sunDisc.lookAt(0, 0, 0);
  envScene.add(sunDisc);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return rt.texture;
}
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 200, 620);
  try {
    scene.environment = makeEnvironment(renderer);
  } catch { /* reflections off: the game still renders */ }
  const skyDayTex = makeSkyTexture();
  const skyNightTex = makeSkyTexture(true);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyDayTex, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 520;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xffe0a0, transparent: true, opacity: 0.75, fog: false, depthWrite: false,
  }));
  glow.scale.set(220, 220, 1);
  scene.add(glow);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1600);
  // falls back to direct rendering if the chain fails.
  let composer = null;
  let bloom = null;
  try {
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.55, 0.82,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  } catch { composer = null; }
  const beaconMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.beacon).multiplyScalar(1.6),
    transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true), beaconMat);
  beacon.visible = false;
  scene.add(beacon);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.marker).multiplyScalar(1.4), transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.4, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  const camState = { x: 0, y: 30, z: 40, lookX: 0, lookY: 0, lookZ: 0, fov: 60 };
  function setBeacon(x, z, visible) {
    beacon.visible = visible;
    ring.visible = visible;
    if (!visible) return;
    beacon.position.set(x, 30, z);
    ring.position.set(x, 0.1, z);
  }
  let night = false;
  function setNight(on) {
    night = on;
    scene.background.setHex(on ? 0x060a18 : PALETTE.sky);
    scene.fog.color.setHex(on ? 0x0a1226 : PALETTE.fog);
    hemi.intensity = on ? 0.22 : 1.1;
    sun.intensity = on ? 0.45 : 3.0;
    sun.color.setHex(on ? 0x8aa8d8 : PALETTE.sun);
    skyMat.map = on ? skyNightTex : skyDayTex;
    skyMat.needsUpdate = true;
    glow.visible = !on;
    if (bloom) bloom.strength = on ? 0.6 : 0.4;
    renderer.toneMappingExposure = on ? 1.05 : 1.15;
  }
  function updateSun(x, z) {
    sun.position.set(x + 150, 62, z - 95);
    sun.target.position.set(x, 0, z);
    sky.position.set(x, 0, z);
    const dir = new THREE.Vector3(150, 62, -95).normalize();
    glow.position.set(x + dir.x * 680, 190, z + dir.z * 680);
  }
  // opens with speed; `drag` is the mouse orbit offset.
  function updateCamera(dt, view) {
    let dist = 7.0;
    let height = 3.2;
    let targetFov = 60;
    if (view.mode === 'car') {
      dist = 10.5;
      height = 4.4;
      targetFov = 58 + view.speed01 * 10;
    } else if (view.mode === 'title') {
      const t = view.time * 0.05;
      const cx = Math.cos(t) * 120;
      const cz = Math.sin(t) * 120;
      camState.x += (cx - camState.x) * Math.min(1, dt * 1.2);
      camState.y += (42 - camState.y) * Math.min(1, dt * 1.2);
      camState.z += (cz - camState.z) * Math.min(1, dt * 1.2);
      camState.lookX += (0 - camState.lookX) * Math.min(1, dt * 1.2);
      camState.lookY += (8 - camState.lookY) * Math.min(1, dt * 1.2);
      camState.lookZ += (0 - camState.lookZ) * Math.min(1, dt * 1.2);
      camera.position.set(camState.x, camState.y, camState.z);
      camera.lookAt(camState.lookX, camState.lookY, camState.lookZ);
      return;
    }
    const yaw = view.heading + Math.PI + (view.dragYaw || 0);
    const tx = view.x + Math.sin(yaw) * dist;
    const tz = view.z + Math.cos(yaw) * dist;
    const ty = height + (view.dragPitch || 0);
    const k = Math.min(1, dt * (view.mode === 'car' ? 7 : 9));
    camState.x += (tx - camState.x) * k;
    camState.y += (ty - camState.y) * k;
    camState.z += (tz - camState.z) * k;
    camState.lookX += (view.x + Math.sin(view.heading) * 4 - camState.lookX) * k;
    camState.lookY += (1.6 - camState.lookY) * k;
    camState.lookZ += (view.z + Math.cos(view.heading) * 4 - camState.lookZ) * k;
    camState.fov += (targetFov - camState.fov) * Math.min(1, dt * 4);
    camera.position.set(camState.x, camState.y, camState.z);
    camera.lookAt(camState.lookX, camState.lookY, camState.lookZ);
    if (Math.abs(camera.fov - camState.fov) > 0.05) {
      camera.fov = camState.fov;
      camera.updateProjectionMatrix();
    }
  }
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  }
  function render() {
    const t = performance.now() / 1000;
    beaconMat.opacity = beacon.visible ? 0.22 + 0.1 * Math.sin(t * 3) : 0;
    ring.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  return { renderer, scene, camera, setBeacon, updateSun, updateCamera, resize, render, setNight, get night() { return night; } };
}
