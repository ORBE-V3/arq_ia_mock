'use client';

import { motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { animate } from 'animejs';
import * as THREE from 'three';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      className="page-transition"
      initial={reduced ? false : { opacity: 0, y: 10, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PremiumScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = 8;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      canvas.parentElement?.classList.add('no-webgl');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);

    const geometry = new THREE.IcosahedronGeometry(2.15, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x7ba58e, wireframe: true, transparent: true, opacity: 0.15 });
    const orb = new THREE.Mesh(geometry, material);
    orb.rotation.set(0.2, -0.6, 0.15);
    scene.add(orb);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    let frame = 0;
    const tick = () => {
      orb.rotation.x += 0.0008;
      orb.rotation.y += 0.0014;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas className="premium-scene" ref={canvasRef} aria-hidden="true" />;
}

export function MotionEnhancer() {
  useEffect(() => {
    const intro = gsap.fromTo('.content > *', { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.055, duration: 0.7, ease: 'power3.out', clearProps: 'all' });
    const nav = document.querySelectorAll('.nav-item');
    const enter = (event: Event) => animate(event.currentTarget as HTMLElement, { translateX: 3, duration: 240, ease: 'outQuad' });
    const leave = (event: Event) => animate(event.currentTarget as HTMLElement, { translateX: 0, duration: 320, ease: 'outCubic' });
    nav.forEach((item) => { item.addEventListener('mouseenter', enter); item.addEventListener('mouseleave', leave); });
    return () => { intro.kill(); nav.forEach((item) => { item.removeEventListener('mouseenter', enter); item.removeEventListener('mouseleave', leave); }); };
  }, []);
  return null;
}
