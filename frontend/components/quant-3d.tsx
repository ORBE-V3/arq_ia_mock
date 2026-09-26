'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Box, Camera, Download, Eye, Scissors, Sun } from 'lucide-react';
import { roomArea, wallSegments } from '@/lib/quant-model';
import type { QRoom, RoomType } from '@/lib/quant-model';

const TYPE_VAR: Record<RoomType, string> = { Sala: '--rv-1', Quarto: '--rv-6', Cozinha: '--rv-4', Banheiro: '--rv-3', Serviço: '--rv-5', Varanda: '--rv-2', Circulação: '--muted-text' };
export const typeColor = (t: RoomType) => `var(${TYPE_VAR[t]})`;
const WALL_T = 0.12;
type Preset = 'iso' | 'top' | 'front';

type Ctx = { renderer: THREE.WebGLRenderer; labels: CSS2DRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; model: THREE.Group; sun: THREE.DirectionalLight; tween: { to: THREE.Vector3; target: THREE.Vector3; t: number } | null; center: THREE.Vector3; size: number };

function cssColor(name: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || '#888888');
}

export function Quant3D({ rooms, selectedId, onSelect, onNotice }: { rooms: QRoom[]; selectedId?: string; onSelect: (id: string) => void; onNotice?: (msg: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<Ctx | null>(null);
  const [cut, setCut] = useState(1);
  const [hour, setHour] = useState(15);
  const [labelsOn, setLabelsOn] = useState(true);
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [failed, setFailed] = useState(false);
  const down = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  function applyPreset(p: Preset, instant = false) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Fit the model's bounding sphere to the narrower of the vertical/horizontal field of view.
    const vfov = THREE.MathUtils.degToRad(ctx.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * ctx.camera.aspect);
    const radius = ctx.size * 0.42 + 1; // flat plan: tighter than a full bounding sphere
    const d = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05;
    const dir = p === 'top' ? new THREE.Vector3(0.001, 1, 0.001) : p === 'front' ? new THREE.Vector3(0, 0.3, 1) : new THREE.Vector3(1, 0.95, 1);
    const to = dir.normalize().multiplyScalar(d);
    if (instant) { ctx.camera.position.copy(to); ctx.controls.target.set(0, 0, 0); return; }
    ctx.tween = { to, target: new THREE.Vector3(0, 0, 0), t: 0 };
  }

  // One renderer for the component's lifetime; the model group is rebuilt on edits.
  useEffect(() => {
    const stage = stageRef.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { queueMicrotask(() => setFailed(true)); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'q3-canvas';
    stage.insertBefore(renderer.domElement, stage.firstChild);
    const labels = new CSS2DRenderer();
    labels.domElement.className = 'q3-labels';
    stage.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
    camera.position.set(22, 20, 22);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 4;
    controls.maxDistance = 120;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8175, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);
    const model = new THREE.Group();
    scene.add(model);
    const ctx: Ctx = { renderer, labels, scene, camera, controls, model, sun, tween: null, center: new THREE.Vector3(), size: 20 };
    ctxRef.current = ctx;

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      renderer.setSize(width, height, false);
      labels.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    let frame = 0;
    const loop = () => {
      if (ctx.tween) {
        ctx.tween.t = Math.min(1, ctx.tween.t + 0.06);
        const e = 1 - (1 - ctx.tween.t) ** 3;
        camera.position.lerp(ctx.tween.to, e * 0.25);
        controls.target.lerp(ctx.tween.target, e * 0.25);
        if (ctx.tween.t >= 1) ctx.tween = null;
      }
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
      ctxRef.current = null;
    };
  }, []);

  // Rebuild geometry on edits / selection / section cut / theme.
  const firstFit = useRef(true);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.model.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } if (o instanceof CSS2DObject) o.element.remove(); });
    ctx.model.clear();
    if (!rooms.length) return;
    const minX = Math.min(...rooms.map((r) => r.x)), maxX = Math.max(...rooms.map((r) => r.x + r.w));
    const minY = Math.min(...rooms.map((r) => r.y)), maxY = Math.max(...rooms.map((r) => r.y + r.d));
    const cx = (minX + maxX) / 2, cz = (minY + maxY) / 2;
    ctx.center.set(0, 0, 0);
    ctx.size = Math.max(maxX - minX, maxY - minY);
    const wallColor = theme === 'dark' ? new THREE.Color('#c9d2d4') : new THREE.Color('#f3efe8');
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({ color: theme === 'dark' ? new THREE.Color('#5b6a70') : new THREE.Color('#3b3a36'), roughness: 0.9 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX + 0.4, 0.18, maxY - minY + 0.4), new THREE.MeshStandardMaterial({ color: theme === 'dark' ? '#3a464c' : '#d9d2c6', roughness: 0.95 }));
    slab.position.set((minX + maxX) / 2 - cx, -0.09, (minY + maxY) / 2 - cz);
    slab.receiveShadow = true;
    ctx.model.add(slab);

    rooms.forEach((r) => {
      const selected = r.id === selectedId;
      const color = cssColor(TYPE_VAR[r.type]);
      const floorColor = selected ? color : color.clone().lerp(new THREE.Color(theme === 'dark' ? '#2a3339' : '#ffffff'), 0.45);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(r.w - 0.02, 0.04, r.d - 0.02), new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.7, emissive: selected ? color : new THREE.Color(0), emissiveIntensity: selected ? 0.12 : 0 }));
      floor.position.set(r.x + r.w / 2 - cx, 0.02, r.y + r.d / 2 - cz);
      floor.receiveShadow = true;
      floor.userData.roomId = r.id;
      floor.name = r.name;
      ctx.model.add(floor);
      if (labelsOn) {
        const el = document.createElement('div');
        el.className = `q3-label ${selected ? 'on' : ''}`;
        el.innerHTML = `<b></b><span></span>`;
        el.querySelector('b')!.textContent = r.name;
        el.querySelector('span')!.textContent = `${roomArea(r).toLocaleString('pt-BR')} m²`;
        const label = new CSS2DObject(el);
        label.position.set(floor.position.x, 0.3, floor.position.z);
        ctx.model.add(label);
      }
    });

    const hWall = Math.max(0.3, (rooms.reduce((t, r) => t + r.h, 0) / rooms.length) * cut);
    wallSegments(rooms).forEach((s) => {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) + WALL_T;
      const horizontal = s.y1 === s.y2;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : WALL_T, hWall, horizontal ? WALL_T : len), wallMat);
      wall.position.set((s.x1 + s.x2) / 2 - cx, hWall / 2, (s.y1 + s.y2) / 2 - cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      ctx.model.add(wall);
      if (cut < 1) { // section cut: dark cap shows where the walls were cut, like a drawn section
        const cap = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : WALL_T, 0.01, horizontal ? WALL_T : len), capMat);
        cap.position.set(wall.position.x, hWall + 0.006, wall.position.z);
        ctx.model.add(cap);
      }
    });

    const shadowCam = ctx.sun.shadow.camera as THREE.OrthographicCamera;
    const half = ctx.size * 0.8 + 4;
    Object.assign(shadowCam, { left: -half, right: half, top: half, bottom: -half, near: 0.5, far: ctx.size * 4 + 40 });
    shadowCam.updateProjectionMatrix();
    // Frame after layout settles, so the camera uses the panel's real aspect ratio.
    if (firstFit.current) { firstFit.current = false; requestAnimationFrame(() => applyPreset('iso', true)); }
  }, [rooms, selectedId, cut, theme, labelsOn]);

  // Sun study: azimuth east→west across the day, elevation peaks at noon (Recife, near-equatorial).
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = (hour - 6) / 12;
    const az = Math.PI * t;
    const el = Math.max(0.12, Math.sin(Math.PI * t)) * (Math.PI / 2.3);
    const d = ctx.size * 1.6 + 12;
    ctx.sun.position.set(Math.cos(az) * d * Math.cos(el), Math.sin(el) * d, -Math.sin(az) * d * 0.35);
    ctx.sun.intensity = 0.8 + 2 * Math.sin(Math.PI * t);
  }, [hour, rooms.length]);

  function pick(event: React.PointerEvent) {
    const ctx = ctxRef.current;
    if (!ctx || Math.hypot(event.clientX - down.current.x, event.clientY - down.current.y) > 4) return; // it was an orbit drag
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), ctx.camera);
    const hit = ray.intersectObjects(ctx.model.children.filter((o) => o.userData.roomId))[0];
    if (hit) onSelect(hit.object.userData.roomId);
  }

  function capture() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.renderer.render(ctx.scene, ctx.camera);
    const link = document.createElement('a');
    link.download = 'arqquant-estudo-3d.png';
    link.href = ctx.renderer.domElement.toDataURL('image/png');
    link.click();
    onNotice?.('Imagem do estudo 3D exportada.');
  }
  function exportGlb() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    new GLTFExporter().parse(ctx.model, (result) => {
      const url = URL.createObjectURL(new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'arqquant-modelo.glb';
      link.click();
      URL.revokeObjectURL(url);
      onNotice?.('Modelo GLB exportado. Abre em Blender, SketchUp, Revit ou no visualizador do Windows.');
    }, () => onNotice?.('Não foi possível exportar o GLB.'), { binary: true, onlyVisible: true });
  }

  if (failed) return <div className="q3 q3-failed">A visualização 3D precisa de aceleração gráfica (WebGL) neste navegador.</div>;

  return <div className="q3" ref={stageRef} onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })} onPointerUp={pick}>
    <div className="q3-toolbar" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div className="q3-seg" aria-label="Câmera">{([['iso', 'Isométrica'], ['top', 'Planta'], ['front', 'Fachada']] as const).map(([p, l]) => <button type="button" key={p} onClick={() => applyPreset(p)}>{l}</button>)}</div>
      <button type="button" className={labelsOn ? 'on' : ''} aria-pressed={labelsOn} onClick={() => setLabelsOn(!labelsOn)}><Eye size={13} />Rótulos</button>
      <button type="button" onClick={capture}><Camera size={13} />PNG</button>
      <button type="button" onClick={exportGlb}><Download size={13} />GLB</button>
    </div>
    <div className="q3-sliders" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <label><Scissors size={13} />Corte<input type="range" min={0.1} max={1} step={0.05} value={cut} onChange={(e) => setCut(Number(e.target.value))} aria-label="Altura do corte das paredes" /><span>{Math.round(cut * 100)}%</span></label>
      <label><Sun size={13} />Sol<input type="range" min={6} max={18} step={0.25} value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Hora do estudo solar" /><span>{String(Math.floor(hour)).padStart(2, '0')}:{String(Math.round((hour % 1) * 60)).padStart(2, '0')}</span></label>
    </div>
    <small className="q3-hint"><Box size={12} />Arraste para orbitar · botão direito para mover · roda para zoom · clique num ambiente para selecionar</small>
  </div>;
}
