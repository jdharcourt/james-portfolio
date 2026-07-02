"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function PcbModel() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    let disposed = false;
    const host = canvasRef.current;
    const scene = new THREE.Scene();
    const loader = new GLTFLoader();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const group = new THREE.Group();
    const dragRotation = { x: 0, y: 0 };
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let scrollRotation = 0;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.left = -width / height;
      camera.right = width / height;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();
    };
    const frame = () => {
      if (disposed) {
        return;
      }

      scrollRotation += (window.scrollY * 0.0012 - scrollRotation) * 0.04;
      group.rotation.x = -0.48 + dragRotation.x;
      group.rotation.y = scrollRotation + dragRotation.y;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    };
    const handlePointerDown = (event: PointerEvent) => {
      activePointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      dragRotation.y += (event.clientX - lastPointerX) * 0.008;
      dragRotation.x = Math.max(-0.5, Math.min(0.55, dragRotation.x + (event.clientY - lastPointerY) * 0.006));
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      activePointerId = null;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D model of the GlucoBit PCB");
    host.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    scene.add(group);

    camera.position.set(0, 0, 0.4);
    camera.lookAt(0, 0, 0);

    resize();
    window.addEventListener("resize", resize);

    loader.load(
      "/glucobit-v2.glb",
      (gltf) => {
        if (disposed) {
          return;
        }

        let index = 0;
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || !object.geometry) {
            return;
          }

          object.material = new THREE.MeshBasicMaterial({
            color: index % 5 === 0 ? 0x82d8ad : 0x9fdff2,
            transparent: true,
            opacity: object.name.toLowerCase().includes("board") ? 0.34 : 0.68,
            wireframe: true,
          });
          index += 1;
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);
        group.add(gltf.scene);
        group.rotation.z = -0.2;

        const distance = Math.max(size.x, size.y, size.z) * 1.55;
        camera.position.set(0, -distance * 0.35, distance);
        camera.zoom = 16;
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      },
      undefined,
      () => {},
    );

    frame();

    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.dispose();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="pcb-model" data-cursor="hover">
      <div className="pcb-model__canvas" ref={canvasRef} />
    </div>
  );
}
