'use client';

import { Camera, Rotate3d } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Room = { name: string; area: number; x: number; y: number; w: number; h: number };

const palettes = {
  Concreto: { room: 0x7faaa0, floor: 0x183b31, line: 0x98d6bd },
  Madeira: { room: 0xb88a5b, floor: 0x3e2b20, line: 0xe4b985 },
  Claro: { room: 0xb8c9c0, floor: 0x1c302c, line: 0xe7f3ec },
} as const;

export function SpatialPreview({ rooms, material = 'Concreto', onCapture }: { rooms: Room[]; material?: keyof typeof palettes; onCapture?: (message: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; group: THREE.Group; camera: THREE.PerspectiveCamera } | null>(null);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(8.4, 7.2, 8.8);
    camera.lookAt(0, 0, 0);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      onCapture?.('A visualização 3D precisa de aceleração gráfica neste navegador.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const ambient = new THREE.HemisphereLight(0xe7fff5, 0x10221d, 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xb7f4da, 3.2);
    key.position.set(5, 10, 3);
    key.castShadow = true;
    scene.add(key);

    const group = new THREE.Group();
    group.rotation.y = -0.32;
    scene.add(group);
    const palette = palettes[material];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.12, 6.4), new THREE.MeshStandardMaterial({ color: palette.floor, roughness: .85, metalness: .05 }));
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    rooms.forEach((room, index) => {
      const width = Math.max(room.w / 84, 0.75);
      const depth = Math.max(room.h / 84, 0.65);
      const height = 0.48 + Math.min(room.area / 120, 0.55);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color: palette.room, roughness: .58, metalness: .08, transparent: true, opacity: .9 }));
      mesh.position.set((room.x - 310) / 78, height / 2, (room.y - 210) / 78);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: palette.line, transparent: true, opacity: .8 }));
      edge.position.copy(mesh.position);
      group.add(edge);
      if (index === 0) mesh.userData.highlight = true;
    });

    const resize = () => {
      const { width, height } = stage.getBoundingClientRect();
      renderer.setSize(Math.max(width, 280), Math.max(height, 280), false);
      camera.aspect = Math.max(width, 280) / Math.max(height, 280);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    let frame = 0;
    const tick = () => { renderer.render(scene, camera); frame = requestAnimationFrame(tick); };
    tick();
    sceneRef.current = { renderer, group, camera };
    return () => { cancelAnimationFrame(frame); observer.disconnect(); scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose()); else object.material.dispose(); } }); renderer.dispose(); sceneRef.current = null; };
  }, [rooms, material, onCapture]);

  function capture() {
    const renderer = sceneRef.current?.renderer;
    if (!renderer) return;
    const link = document.createElement('a');
    link.download = 'arqquant-estudo-3d.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
    onCapture?.('Imagem do estudo 3D gerada e pronta para apresentar.');
  }

  function zoom(value: number) {
    const scene = sceneRef.current;
    if (!scene) return;
    const direction = scene.camera.position.clone().normalize();
    const distance = THREE.MathUtils.clamp(scene.camera.position.length() + value, 5.2, 13);
    scene.camera.position.copy(direction.multiplyScalar(distance));
    scene.camera.lookAt(0, 0, 0);
  }

  function resetView() {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.group.rotation.set(0, -0.32, 0);
    scene.group.position.set(0, 0, 0);
    scene.camera.position.set(8.4, 7.2, 8.8);
    scene.camera.lookAt(0, 0, 0);
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const scene = sceneRef.current;
    if (!scene || !pointerRef.current.active) return;
    const dx = event.clientX - pointerRef.current.x;
    const dy = event.clientY - pointerRef.current.y;
    pointerRef.current.x = event.clientX;
    pointerRef.current.y = event.clientY;
    if (event.shiftKey) {
      scene.group.position.x += dx * .012;
      scene.group.position.z += dy * .012;
    } else {
      scene.group.rotation.y += dx * .012;
      scene.group.rotation.x = THREE.MathUtils.clamp(scene.group.rotation.x + dy * .008, -.75, .6);
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    pointerRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    zoom(event.deltaY > 0 ? .45 : -.45);
  }

  return <div className="spatial-preview" ref={stageRef}>
    <canvas ref={canvasRef} className="spatial-canvas" aria-label="Modelo 3D conceitual do projeto" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} />
    <div className="spatial-overlay"><span className="badge green"><Rotate3d size={12} /> Estudo volumétrico</span><small>Modelo conceitual · {rooms.length} ambientes</small></div>
    <div className="spatial-controls"><button type="button" onClick={() => zoom(.65)} aria-label="Afastar modelo">−</button><button type="button" onClick={() => zoom(-.65)} aria-label="Aproximar modelo">+</button><button type="button" onClick={resetView}>Ajustar</button><small>Arraste para rotacionar · Shift + arraste para mover</small></div>
    <button type="button" className="spatial-capture" onClick={capture}><Camera size={14} />Gerar imagem</button>
  </div>;
}
