'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useColorMode } from '../app/ThemeContext';

export const BackgroundAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const { mode } = useColorMode();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let running = true;

    // ===== CONFIGURATION PARAMETERS =====
    const CONFIG = {
      sphereRadius: 0.7,              // Radius of the sphere when collapsed
      pointCloudRadius: 2.5,          // Max radius of point cloud when expanded
      transitionSpeed: 2,             // Transition duration in seconds (expand/contract)
      sphereDuration: 5,            // How long to stay as sphere (seconds)
      pointCloudDuration: 5,        // How long to stay expanded (seconds)
      sphereRotationSpeed: 0.002,     // Rotation speed of sphere (horizontal only)
      latticeRotationSpeed: 0.002,    // Rotation speed of grid lattice
      pointDistribution: 'sphere' as 'sphere' | 'cube' | 'torus' | 'cylinder',  // Shape type
    };
    // =====================================

    // Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isDark = mode === 'dark';
    scene.background = new THREE.Color(isDark ? 0x000000 : 0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Grid (horizontal plane only)
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x1a1a2e, 0x1a1a2e);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Create sphere of points
    const pointCount = 500;

    // Store base positions (sphere) and current positions
    const spherePositions = new Float32Array(pointCount * 3);
    const randomPositions = new Float32Array(pointCount * 3);
    const currentPositions = new Float32Array(pointCount * 3);

    // Generate positions based on distribution type
    for (let i = 0; i < pointCount; i++) {
      let x, y, z;

      if (CONFIG.pointDistribution === 'sphere') {
        // Fibonacci sphere
        const phi = Math.acos(1 - 2 * (i + 0.5) / pointCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        x = CONFIG.sphereRadius * Math.cos(theta) * Math.sin(phi);
        y = CONFIG.sphereRadius * Math.sin(theta) * Math.sin(phi);
        z = CONFIG.sphereRadius * Math.cos(phi);
      } else if (CONFIG.pointDistribution === 'cube') {
        // Random points in a cube
        x = (Math.random() - 0.5) * CONFIG.sphereRadius * 2;
        y = (Math.random() - 0.5) * CONFIG.sphereRadius * 2;
        z = (Math.random() - 0.5) * CONFIG.sphereRadius * 2;
      } else if (CONFIG.pointDistribution === 'torus') {
        // Torus (donut)
        const angle1 = (i / pointCount) * Math.PI * 2;
        const angle2 = ((i * 17) % pointCount / pointCount) * Math.PI * 2;
        const majorRadius = CONFIG.sphereRadius * 0.8;
        const minorRadius = CONFIG.sphereRadius * 0.3;
        x = (majorRadius + minorRadius * Math.cos(angle2)) * Math.cos(angle1);
        y = minorRadius * Math.sin(angle2);
        z = (majorRadius + minorRadius * Math.cos(angle2)) * Math.sin(angle1);
      } else if (CONFIG.pointDistribution === 'cylinder') {
        // Cylinder
        const angle = (i / pointCount) * Math.PI * 2;
        const height = ((i * 7) % pointCount / pointCount - 0.5) * CONFIG.sphereRadius * 2;
        x = CONFIG.sphereRadius * Math.cos(angle);
        y = height;
        z = CONFIG.sphereRadius * Math.sin(angle);
      } else {
        // Default to sphere
        const phi = Math.acos(1 - 2 * (i + 0.5) / pointCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        x = CONFIG.sphereRadius * Math.cos(theta) * Math.sin(phi);
        y = CONFIG.sphereRadius * Math.sin(theta) * Math.sin(phi);
        z = CONFIG.sphereRadius * Math.cos(phi);
      }

      spherePositions[i * 3] = x;
      spherePositions[i * 3 + 1] = y;
      spherePositions[i * 3 + 2] = z;

      // Generate random positions for explosion
      const randomRadius = CONFIG.pointCloudRadius * (0.6 + Math.random() * 0.4);
      const randomPhi = Math.random() * Math.PI;
      const randomTheta = Math.random() * Math.PI * 2;

      randomPositions[i * 3] = randomRadius * Math.cos(randomTheta) * Math.sin(randomPhi);
      randomPositions[i * 3 + 1] = randomRadius * Math.sin(randomTheta) * Math.sin(randomPhi);
      randomPositions[i * 3 + 2] = randomRadius * Math.cos(randomPhi);

      // Start with sphere positions
      currentPositions[i * 3] = x;
      currentPositions[i * 3 + 1] = y;
      currentPositions[i * 3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    // Create gradient colors for points (blue/cyan/purple)
    const colors = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      // Mix between blue, cyan, and purple
      const t = i / pointCount;
      if (t < 0.33) {
        // Blue to cyan
        const local = t / 0.33;
        colors[i * 3] = 0.2 * (1 - local) + 0.0 * local;     // R
        colors[i * 3 + 1] = 0.4 * (1 - local) + 0.8 * local; // G
        colors[i * 3 + 2] = 0.8;                              // B
      } else if (t < 0.67) {
        // Cyan to purple
        const local = (t - 0.33) / 0.34;
        colors[i * 3] = 0.0 * (1 - local) + 0.6 * local;     // R
        colors[i * 3 + 1] = 0.8 * (1 - local) + 0.2 * local; // G
        colors[i * 3 + 2] = 0.8 * (1 - local) + 0.8 * local; // B
      } else {
        // Purple to blue
        const local = (t - 0.67) / 0.33;
        colors[i * 3] = 0.6 * (1 - local) + 0.2 * local;     // R
        colors[i * 3 + 1] = 0.2 * (1 - local) + 0.4 * local; // G
        colors[i * 3 + 2] = 0.8;                              // B
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Animation parameters
    let time = 0;
    const pulseDuration = CONFIG.sphereDuration + CONFIG.transitionSpeed * 2 + CONFIG.pointCloudDuration;

    // Animation loop
    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);

      time += 0.016; // ~60fps

      // Rotate grid slowly
      gridHelper.rotation.y += CONFIG.latticeRotationSpeed;

      // Rotate points (horizontal only)
      points.rotation.y += CONFIG.sphereRotationSpeed;

      // Pulse effect: expand and contract
      const pulseTime = (time % pulseDuration) / pulseDuration;

      const expandStart = CONFIG.sphereDuration / pulseDuration;
      const expandEnd = (CONFIG.sphereDuration + CONFIG.transitionSpeed) / pulseDuration;
      const contractStart = (CONFIG.sphereDuration + CONFIG.transitionSpeed + CONFIG.pointCloudDuration) / pulseDuration;

      let lerpFactor;

      if (pulseTime < expandStart) {
        // Stay as sphere
        lerpFactor = 0.0;
      } else if (pulseTime < expandEnd) {
        // Expand
        lerpFactor = (pulseTime - expandStart) / (expandEnd - expandStart);
      } else if (pulseTime < contractStart) {
        // Stay expanded
        lerpFactor = 1.0;
      } else {
        // Contract back
        lerpFactor = 1.0 - (pulseTime - contractStart) / (1.0 - contractStart);
      }

      // Smooth easing
      lerpFactor = lerpFactor < 0.5
        ? 2 * lerpFactor * lerpFactor
        : 1 - Math.pow(-2 * lerpFactor + 2, 2) / 2;

      // Interpolate between sphere and random positions
      for (let i = 0; i < pointCount; i++) {
        currentPositions[i * 3] =
          spherePositions[i * 3] * (1 - lerpFactor) +
          randomPositions[i * 3] * lerpFactor;
        currentPositions[i * 3 + 1] =
          spherePositions[i * 3 + 1] * (1 - lerpFactor) +
          randomPositions[i * 3 + 1] * lerpFactor;
        currentPositions[i * 3 + 2] =
          spherePositions[i * 3 + 2] * (1 - lerpFactor) +
          randomPositions[i * 3 + 2] * lerpFactor;
      }

      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      running = false;
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  // Update background color when theme changes
  useEffect(() => {
    if (sceneRef.current) {
      const isDark = mode === 'dark';
      sceneRef.current.background = new THREE.Color(isDark ? 0x000000 : 0xffffff);
    }
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default BackgroundAnimation;
