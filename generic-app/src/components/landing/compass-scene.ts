import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { gsap } from "gsap";

export interface CompassScene {
  setPlaying: (playing: boolean) => void;
  seek: (chapter: number) => void;
  dispose: () => void;
}

const subjects = ["공통국어", "공통수학", "공통영어", "통합사회", "통합과학", "한국사", "문학", "대수", "영어Ⅰ", "물리학", "화학", "정보", "독서와 작문", "미적분Ⅰ", "영어Ⅱ", "역학과 에너지", "인공지능 기초", "융합과학 탐구"];
const blue = 0x79aaff;
const orange = 0xffa15f;

export function createCompassScene(canvas: HTMLCanvasElement, callbacks: {
  onChapter: (chapter: number) => void;
  onProgress: (progress: number) => void;
  onFailure: () => void;
}): CompassScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0, 14);
  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xdbeaff, 0x172955, 2.6));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 5, 7);
  scene.add(light);
  const warm = new THREE.PointLight(orange, 30, 20);
  warm.position.set(4, -2, 4);
  scene.add(warm);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const mesh = <G extends THREE.BufferGeometry, M extends THREE.Material>(geometry: G, material: M, parent: THREE.Object3D = world) => {
    geometries.add(geometry);
    materials.add(material);
    const item = new THREE.Mesh(geometry, material);
    parent.add(item);
    return item;
  };
  const ink = (color: number, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

  // A real paper slab sits behind the same subject tiles that become the orbit and roadmap.
  const paper = new THREE.Group();
  world.add(paper);
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xdbe9fc, roughness: .6, metalness: .15, transparent: true });
  mesh(new RoundedBoxGeometry(4.05, 4.65, .1, 3, .09), paperMaterial, paper).position.z = -.15;
  const headingMaterial = ink(0x2563eb);
  mesh(new THREE.BoxGeometry(2.15, .12, .015), headingMaterial, paper).position.set(-.58, 1.93, -.07);
  mesh(new THREE.BoxGeometry(.75, .065, .015), headingMaterial, paper).position.set(-1.28, 1.66, -.07);

  const tileGeometry = new RoundedBoxGeometry(1.1, .5, .085, 3, .06);
  const labelGeometry = new THREE.PlaneGeometry(1.06, .47);
  const tileMaterial = new THREE.MeshStandardMaterial({ color: 0xe7f0ff, roughness: .38, metalness: .18 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xffb27a, roughness: .4, metalness: .18 });
  const tiles = subjects.map((subject, index) => {
    const tile = new THREE.Group();
    world.add(tile);
    const accent = [7, 9, 13, 16].includes(index);
    mesh(tileGeometry, accent ? accentMaterial : tileMaterial, tile);
    const label = document.createElement("canvas");
    label.width = 384;
    label.height = 170;
    const ctx = label.getContext("2d")!;
    ctx.fillStyle = "#102b4e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${subject.length > 6 ? 31 : 37}px Pretendard, sans-serif`;
    ctx.fillText(subject, 192, 69);
    ctx.fillStyle = "#3a5576";
    ctx.font = "500 21px sans-serif";
    ctx.fillText(index < 6 ? "공통 과목" : "선택 과목", 192, 123);
    const texture = new THREE.CanvasTexture(label);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    textures.add(texture);
    mesh(labelGeometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), tile).position.z = .049;
    return tile;
  });

  // Machined compass: layered rings, 60 ticks, two-tone extruded needle.
  const compass = new THREE.Group();
  compass.position.z = -.45;
  world.add(compass);
  const ringMaterial = new THREE.MeshStandardMaterial({ color: blue, metalness: .75, roughness: .28, transparent: true });
  [1.32, 1.43, 1.7].forEach((radius, i) => {
    mesh(new THREE.TorusGeometry(radius, i === 1 ? .065 : .012, 8, 100), ringMaterial, compass);
  });
  const tickMaterial = ink(0xa5c7ff);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2;
    const tick = mesh(new THREE.BoxGeometry(.018, i % 5 === 0 ? .15 : .065, .016), tickMaterial, compass);
    tick.position.set(Math.sin(a) * 1.57, Math.cos(a) * 1.57, 0);
    tick.rotation.z = -a;
  }
  const needle = new THREE.Group();
  compass.add(needle);
  [orange, 0xd9e7ff].forEach((color, index) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.1);
    shape.lineTo(.28, 0);
    shape.lineTo(0, -.16);
    shape.lineTo(-.28, 0);
    shape.closePath();
    const half = mesh(new THREE.ExtrudeGeometry(shape, { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1 }), new THREE.MeshStandardMaterial({ color, metalness: .45, roughness: .3, transparent: true }), needle);
    half.rotation.z = index * Math.PI;
  });
  mesh(new THREE.SphereGeometry(.115, 20, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .7, roughness: .2, transparent: true }), needle).position.z = .16;

  const route = new THREE.Group();
  route.position.z = -.22;
  world.add(route);
  const routeMaterial = ink(orange);
  const routePoints = Array.from({ length: 6 }, (_, i) => new THREE.Vector3((i - 2.5) * 1.14, -1.62 + (i % 2) * .15, 0));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(routePoints), 80, .018, 5, false), routeMaterial, route);
  for (const point of routePoints) {
    mesh(new THREE.SphereGeometry(.055, 12, 8), routeMaterial, route).position.copy(point);
  }
  for (let i = 0; i < 6; i++) {
    const label = document.createElement("canvas");
    label.width = 256;
    label.height = 80;
    const ctx = label.getContext("2d")!;
    ctx.fillStyle = "#bed6ff";
    ctx.textAlign = "center";
    ctx.font = "500 28px sans-serif";
    ctx.fillText(`${Math.floor(i / 2) + 1}학년 ${i % 2 + 1}학기`, 128, 48);
    const texture = new THREE.CanvasTexture(label);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const semester = mesh(new THREE.PlaneGeometry(1.05, .33), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), route);
    semester.position.set((i - 2.5) * 1.14, 1.48, 0);
  }

  const dustGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    positions[i * 3] = Math.sin(i * 127.1) * 5;
    positions[i * 3 + 1] = Math.cos(i * 311.7) * 3.5;
    positions[i * 3 + 2] = -1.5 - (i % 7) * .3;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometries.add(dustGeometry);
  const dustMaterial = new THREE.PointsMaterial({ color: 0x8baee5, size: .024, transparent: true, opacity: .55 });
  materials.add(dustMaterial);
  world.add(new THREE.Points(dustGeometry, dustMaterial));

  const layout = (index: number, chapter: number) => {
    if (chapter === 0) return { x: (index % 3 - 1) * 1.2, y: 1.17 - Math.floor(index / 3) * .56, z: 0, rz: 0, scale: 1 };
    if (chapter === 1) {
      const angle = index / tiles.length * Math.PI * 2;
      return { x: Math.sin(angle) * 2.75, y: Math.cos(angle) * 2.35, z: Math.sin(angle * 2) * .65, rz: -.08 * Math.sin(angle), scale: .68 };
    }
    return { x: (Math.floor(index / 3) - 2.5) * 1.14, y: .92 - (index % 3) * .77, z: (index % 2) * .08, rz: 0, scale: .94 };
  };
  tiles.forEach((tile, index) => {
    const target = layout(index, 0);
    tile.position.set(target.x, target.y, target.z);
  });
  const state = { paper: 1, compass: 0, route: 0, tilt: -.12 };
  const timeline = gsap.timeline({ paused: true });
  // Start each transition late in the preceding chapter; hold each result for reading.
  [1, 2, 0].forEach((chapter, transition) => {
    const start = transition * 6 + 4.25;
    tiles.forEach((tile, index) => {
      const target = layout(index, chapter);
      const at = start + index * .024;
      timeline.to(tile.position, { x: target.x, y: target.y, z: target.z, duration: 1.15, ease: "power3.inOut" }, at);
      timeline.to(tile.rotation, { z: target.rz, duration: 1.15, ease: "power3.inOut" }, at);
      timeline.to(tile.scale, { x: target.scale, y: target.scale, z: target.scale, duration: 1.15, ease: "power3.inOut" }, at);
    });
    timeline.to(state, { paper: chapter === 0 ? 1 : 0, compass: chapter === 1 ? 1 : 0, route: chapter === 2 ? 1 : 0, tilt: chapter === 0 ? -.12 : chapter === 1 ? .08 : 0, duration: 1.1 }, start);
  });
  timeline.to({}, { duration: .2 }, 17.8);

  let elapsed = 0;
  let active = false;
  let failed = false;
  let lastChapter = -1;
  const pointer = { x: 0, y: 0 };
  const fade = (group: THREE.Group, opacity: number) => {
    group.visible = opacity > .001;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) (object.material as THREE.Material).opacity = opacity;
    });
  };
  const render = () => {
    timeline.time(elapsed % 18, true);
    const chapter = Math.floor(elapsed % 18 / 6);
    if (lastChapter !== chapter) { lastChapter = chapter; callbacks.onChapter(chapter); }
    callbacks.onProgress((elapsed % 18) / 18);
    fade(paper, state.paper);
    fade(compass, state.compass);
    fade(route, state.route);
    compass.rotation.x = .2;
    needle.rotation.z = -.48 + Math.sin(elapsed * .65) * .22;
    world.rotation.x = state.tilt + pointer.y * .035;
    world.rotation.y = pointer.x * .065 + Math.sin(elapsed * .35) * .035;
    world.position.y = Math.sin(elapsed * .7) * .035;
    renderer.render(scene, camera);
  };
  const tick = (_time: number, delta: number) => { elapsed += Math.min(delta, 64) / 1000; render(); };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height || failed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = Math.max(11.2, 12.4 / camera.aspect);
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const move = (event: PointerEvent) => {
    if (!active || event.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - .5;
    pointer.y = (event.clientY - rect.top) / rect.height - .5;
  };
  const leave = () => { pointer.x = 0; pointer.y = 0; };
  const lost = (event: Event) => {
    event.preventDefault();
    failed = true;
    active = false;
    gsap.ticker.remove(tick);
    callbacks.onFailure();
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", lost);
  resize();
  return {
    setPlaying(playing) {
      if (failed || active === playing) return;
      active = playing;
      if (playing) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    },
    seek(chapter) { if (!failed) { elapsed = chapter * 6 + .5; render(); } },
    dispose() {
      gsap.ticker.remove(tick);
      timeline.kill();
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", lost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    },
  };
}
