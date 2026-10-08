"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function PcbModel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rotation = useRef({ x: 0, y: 0, reset: 0 });
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
    let frameId = 0;
    let lastTime = 0;
    let scrollAngle = 0;
    let lastReset = 0;
    let activePointer: number | null = null;
    let pointerX = 0;
    let pointerY = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    camera.position.set(0, 0, 8);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x827765, 3));
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(3, 4, 5);
    scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "GlucoBit PCB. Drag or use arrow keys to rotate. Scroll the page to turn the board.");
    host.appendChild(canvas);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.left = -1.5 * width / height;
      camera.right = 1.5 * width / height;
      camera.updateProjectionMatrix();
    };
    const frame = (time: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(frame);
      if (!visible || document.hidden) { lastTime = time; return; }
      if (rotation.current.reset !== lastReset) { scrollAngle = 0; lastReset = rotation.current.reset; }
      const rect = host.closest(".intro")?.getBoundingClientRect() || host.getBoundingClientRect();
      const progress = reducedMotion.matches ? 0 : Math.max(0, Math.min(1, -rect.top / rect.height));
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      scrollAngle += (progress * Math.PI * 1.5 - scrollAngle) * (1 - Math.exp(-delta * 7));
      group.rotation.set(0.95 + rotation.current.x, 0.35 + scrollAngle + rotation.current.y, -0.15 + progress * 0.18);
      renderer.render(scene, camera);
    };
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      activePointer = event.pointerId; pointerX = event.clientX; pointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      rotation.current.y += (event.clientX - pointerX) * 0.008;
      rotation.current.x += (event.clientY - pointerY) * 0.008;
      pointerX = event.clientX; pointerY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") rotation.current.y -= 0.15;
      if (event.key === "ArrowRight") rotation.current.y += 0.15;
      if (event.key === "ArrowUp") rotation.current.x -= 0.15;
      if (event.key === "ArrowDown") rotation.current.x += 0.15;
    };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
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
      setStatus("Scroll to turn · drag to inspect");
    }, undefined, () => { if (!disposed) setStatus("Couldn't load the PCB. Explore the source below."); });
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
      canvas.removeEventListener("keydown", keyDown);
      disposeModel(group);
      materials.current = [];
      renderer.dispose(); canvas.remove();
    };
  }, []);

  return <figure className="pcb-panel">
    <div className="pcb-heading"><span>GlucoBit / PCB v2</span><span>3D preview</span></div>
    <div className="pcb-canvas" ref={hostRef} />
    <figcaption><div><strong>Small board. Real purpose.</strong><p>{status}</p></div><div className="pcb-controls"><button disabled={status === "Loading PCB…"} aria-pressed={wireframe} onClick={() => setWireframe(value => !value)}>{wireframe ? "Solid" : "Wireframe"}</button><button onClick={() => { rotation.current = { x: 0, y: 0, reset: rotation.current.reset + 1 }; }}>Reset</button></div></figcaption>
    <div className="pcb-specs"><span>WiFi + BLE</span><span>Colour LCD</span><a href="https://github.com/jdharcourt/GlucoBit" target="_blank" rel="noopener noreferrer">View project ↗</a></div>
  </figure>;
}
