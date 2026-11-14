"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Button } from "@/components/button/components/button";

const BASE_PITCH = 0.9;
const BASE_ROLL = -0.12;
const PITCH_LIMIT = 0.7;
const TURNTABLE_SPEED = 0.22; // rad/s
const IDLE_DELAY = 2500; // ms after the last interaction before the turntable resumes

type Motion = { yaw: number; pitch: number; targetYaw: number; targetPitch: number; spin: number; lastInput: number };

export function PcbModel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const motion = useRef<Motion>({ yaw: 0.35, pitch: 0, targetYaw: 0.35, targetPitch: 0, spin: 0, lastInput: 0 });
  const materials = useRef<THREE.Material[]>([]);
  const [wireframe, setWireframe] = useState(false);
  const [status, setStatus] = useState("Loading PCB…");

  useEffect(() => {
    materials.current.forEach(material => {
      if ("wireframe" in material) material.wireframe = wireframe;
    });
  }, [wireframe]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setStatus("3D preview unavailable in this browser."); return; }
    let disposed = false;
    let visible = true;
    let hovering = false;
    let frameId = 0;
    let lastTime = performance.now();
    let activePointer: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    const m = motion.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    camera.position.set(0, 0, 8);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xfff8ec, 0x8a7a62, 3));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(3, 4, 5);
    scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "GlucoBit PCB. Drag or use the arrow keys to rotate.");
    host.appendChild(canvas);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.left = -1.5 * width / height;
      camera.right = 1.5 * width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const touch = () => { m.lastInput = performance.now(); };
    const frame = (time: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(frame);
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!visible || document.hidden) return;
      const idle = activePointer === null && !hovering && time - m.lastInput > IDLE_DELAY;
      if (activePointer === null) {
        // Release inertia, then hand over to the turntable once idle.
        m.targetYaw += m.spin * delta;
        m.spin *= Math.exp(-delta * 4);
        if (idle && !reducedMotion.matches) m.targetYaw += TURNTABLE_SPEED * delta;
        if (idle) m.targetPitch += (0 - m.targetPitch) * (1 - Math.exp(-delta * 1.5));
      }
      const ease = 1 - Math.exp(-delta * 10);
      const moving = Math.abs(m.targetYaw - m.yaw) > 1e-4 || Math.abs(m.targetPitch - m.pitch) > 1e-4;
      m.yaw += (m.targetYaw - m.yaw) * ease;
      m.pitch += (m.targetPitch - m.pitch) * ease;
      if (!moving) return;
      group.rotation.set(BASE_PITCH + m.pitch, m.yaw, BASE_ROLL);
      renderer.render(scene, camera);
    };
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      activePointer = event.pointerId; pointerX = event.clientX; pointerY = event.clientY;
      m.spin = 0; touch();
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      const dx = (event.clientX - pointerX) * 0.008;
      m.targetYaw += dx;
      m.targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, m.targetPitch + (event.clientY - pointerY) * 0.008));
      m.spin = dx * 60;
      pointerX = event.clientX; pointerY = event.clientY;
      touch();
    };
    const pointerUp = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      if (reducedMotion.matches) m.spin = 0;
      touch();
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const keyDown = (event: KeyboardEvent) => {
      const keys: Record<string, [number, number]> = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] };
      const step = keys[event.key];
      if (!step) return;
      event.preventDefault();
      m.spin = 0;
      m.targetYaw += step[0];
      m.targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, m.targetPitch + step[1]));
      touch();
    };
    const pointerEnter = () => { hovering = true; };
    const pointerLeave = () => { hovering = false; };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("pointerenter", pointerEnter);
    canvas.addEventListener("pointerleave", pointerLeave);
    canvas.addEventListener("keydown", keyDown);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    intersection.observe(host);
    const disposeModel = (model: THREE.Object3D) => model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      });
    });
    new GLTFLoader().load("/glucobit-v2.glb", gltf => {
      if (disposed) { disposeModel(gltf.scene); return; }
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
      group.scale.setScalar(2.65 / Math.max(size.x, size.y, size.z));
      gltf.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(material => { if ("wireframe" in material) material.wireframe = false; });
        materials.current.push(...list);
      });
      group.add(gltf.scene);
      group.rotation.set(BASE_PITCH + m.pitch, m.yaw, BASE_ROLL);
      renderer.render(scene, camera);
      setStatus(reducedMotion.matches ? "Drag or use arrow keys to inspect" : "Drag to inspect · idle turntable");
    }, undefined, () => { if (!disposed) setStatus("Couldn't load the PCB. See the source code."); });
    resize();
    frameId = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect(); intersection.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("pointerenter", pointerEnter);
      canvas.removeEventListener("pointerleave", pointerLeave);
      canvas.removeEventListener("keydown", keyDown);
      disposeModel(group);
      materials.current = [];
      renderer.dispose(); canvas.remove();
    };
  }, []);

  const reset = () => {
    const m = motion.current;
    // Ease back to the nearest front-facing turn rather than unwinding every spin.
    m.targetYaw = 0.35 + Math.round((m.yaw - 0.35) / (Math.PI * 2)) * Math.PI * 2;
    m.targetPitch = 0;
    m.spin = 0;
    m.lastInput = performance.now();
  };

  return <figure className="pcb-panel">
    <div className="pcb-heading"><span>Fig. 02 — GlucoBit PCB v2</span><span>WiFi + BLE · Colour LCD</span></div>
    <div className="pcb-canvas" ref={hostRef} />
    <figcaption>
      <p role="status">{status}</p>
      <div className="pcb-controls">
        <Button variant="outline" size="sm" className="h-9 px-3" disabled={status === "Loading PCB…"} aria-pressed={wireframe} onClick={() => setWireframe(value => !value)}>{wireframe ? "Solid" : "Wireframe"}</Button>
        <Button variant="outline" size="sm" className="h-9 px-3" onClick={reset}>Reset</Button>
      </div>
    </figcaption>
  </figure>;
}
