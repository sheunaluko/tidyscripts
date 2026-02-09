'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { EvePoint, EveTheme, EveSettings, UseEveReturn } from './types';
import { clusterPoints } from './projection';

// Color parsing helper
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Generate distinct colors for groups
const GROUP_PALETTE = [
  '#00ffff', '#ff00ff', '#ffff00', '#ff3131', '#39ff14',
  '#7b68ee', '#ff8c00', '#00fa9a', '#ff69b4', '#40e0d0',
];

function getGroupColor(group: string, groups: string[]): [number, number, number] {
  const idx = groups.indexOf(group);
  return hexToRgb(GROUP_PALETTE[idx % GROUP_PALETTE.length]);
}

export function useEve(
  points: EvePoint[],
  theme: EveTheme,
  settings: EveSettings,
  query?: number[],
  colorBy?: 'score' | 'group' | 'cluster',
  numClusters?: number,
  onPointSelect?: (point: EvePoint) => void,
): UseEveReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const containerRef = useRef<HTMLDivElement>(null!);
  const [hoveredPoint, setHoveredPoint] = useState<EvePoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EvePoint | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [clusterCount, setClusterCount] = useState<number | null>(null);

  // Store refs for animation loop access
  const pointsRef = useRef(points);
  const themeRef = useRef(theme);
  const settingsRef = useRef(settings);
  pointsRef.current = points;
  themeRef.current = theme;
  settingsRef.current = settings;

  // Scene setup (mount/unmount)
  const sceneObjsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    bloomPass: UnrealBloomPass;
    controls: OrbitControls;
    pointCloud: THREE.Points | null;
    queryMesh: THREE.Mesh | null;
    gridHelper: THREE.GridHelper;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  // Mount scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let running = true;
    const rect = container.getBoundingClientRect();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5 * settings.animationSpeed;
    controls.zoomSpeed = 0.3;
    controls.minDistance = 3;
    controls.maxDistance = 30;

    // Postprocessing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(rect.width, rect.height),
      settings.glowIntensity * 0.8,
      0.6,
      0.1,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20);
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.15;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = -3;
    gridHelper.visible = settings.showGrid;
    scene.add(gridHelper);

    // Ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.3 };
    const mouse = new THREE.Vector2();

    sceneObjsRef.current = {
      scene, camera, renderer, composer, bloomPass,
      controls, pointCloud: null, queryMesh: null,
      gridHelper, raycaster, mouse,
    };

    // Animation
    let time = 0;
    function animate() {
      if (!running) return;
      requestAnimationFrame(animate);

      const s = settingsRef.current;
      time += 0.016 * s.animationSpeed;

      controls.autoRotateSpeed = 0.5 * s.animationSpeed;
      controls.update();

      // Point breathing
      const objs = sceneObjsRef.current;
      if (objs?.pointCloud) {
        const mat = objs.pointCloud.material as THREE.PointsMaterial;
        const breath = 1 + 0.08 * Math.sin(time * 2);
        mat.size = s.pointSize * 0.06 * breath;
      }

      // Query pulse
      if (objs?.queryMesh) {
        const pulse = 1 + 0.15 * Math.sin(time * 3);
        objs.queryMesh.scale.setScalar(pulse);
        objs.queryMesh.rotation.y = time * 0.5;
      }

      composer.render();
    }
    animate();

    // Resize observer
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    });
    observer.observe(container);

    return () => {
      running = false;
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      sceneObjsRef.current = null;
    };
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update points
  useEffect(() => {
    const objs = sceneObjsRef.current;
    if (!objs) return;

    // Remove old point cloud
    if (objs.pointCloud) {
      objs.scene.remove(objs.pointCloud);
      objs.pointCloud.geometry.dispose();
      (objs.pointCloud.material as THREE.Material).dispose();
      objs.pointCloud = null;
    }

    if (points.length === 0) return;

    const is3D = points[0].position.length === 3;
    const count = points.length;

    // Positions
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = points[i].position;
      positions[i * 3] = p[0];
      positions[i * 3 + 1] = is3D ? (p as [number, number, number])[1] : 0;
      positions[i * 3 + 2] = is3D ? (p as [number, number, number])[2] : p[1];
    }

    // Colors
    const colors = new Float32Array(count * 3);
    const groups = Array.from(new Set(points.map((p) => p.group).filter(Boolean))) as string[];
    const primaryRgb = hexToRgb(theme.primary);
    const secondaryRgb = hexToRgb(theme.secondary);
    const gradLow = hexToRgb(theme.scoreGradient[0]);
    const gradHigh = hexToRgb(theme.scoreGradient[1]);

    // Auto-cluster if needed
    const clusterLabels = colorBy === 'cluster' ? clusterPoints(points, numClusters) : null;
    const uniqueClusters = clusterLabels
      ? Array.from(new Set(clusterLabels.filter((l) => l >= 0)))
      : [];
    setClusterCount(clusterLabels ? uniqueClusters.length : null);

    for (let i = 0; i < count; i++) {
      const pt = points[i];
      let c: [number, number, number];

      if (colorBy === 'cluster' && clusterLabels) {
        const label = clusterLabels[i];
        if (label < 0) {
          // Noise point — dim gray
          c = [0.3, 0.3, 0.3];
        } else {
          c = hexToRgb(GROUP_PALETTE[label % GROUP_PALETTE.length]);
        }
      } else if (colorBy === 'group' && pt.group) {
        c = getGroupColor(pt.group, groups);
      } else if (colorBy === 'score' && pt.score != null) {
        c = lerpColor(gradLow, gradHigh, Math.max(0, Math.min(1, pt.score)));
      } else if (pt.score != null) {
        c = lerpColor(gradLow, gradHigh, Math.max(0, Math.min(1, pt.score)));
      } else {
        c = lerpColor(primaryRgb, secondaryRgb, i / Math.max(1, count - 1));
      }

      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: settings.pointSize * 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(geometry, material);
    objs.scene.add(pointCloud);
    objs.pointCloud = pointCloud;

    // Adjust camera for 2D
    if (!is3D) {
      objs.camera.position.set(0, 10, 0.01);
      objs.camera.lookAt(0, 0, 0);
      objs.controls.autoRotate = false;
    } else {
      objs.camera.position.set(0, 4, 10);
      objs.camera.lookAt(0, 0, 0);
      objs.controls.autoRotate = true;
    }
  }, [points, theme, colorBy, numClusters, settings.pointSize]);

  // Update query point
  useEffect(() => {
    const objs = sceneObjsRef.current;
    if (!objs) return;

    // Remove old
    if (objs.queryMesh) {
      objs.scene.remove(objs.queryMesh);
      objs.queryMesh.geometry.dispose();
      (objs.queryMesh.material as THREE.Material).dispose();
      objs.queryMesh = null;
    }

    // Query origin marker at center
    if (query && query.length > 0) {
      const geo = new THREE.IcosahedronGeometry(0.3, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.secondary),
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, 0);
      objs.scene.add(mesh);
      objs.queryMesh = mesh;
    }
  }, [query, theme.secondary]);

  // Settings sync
  useEffect(() => {
    const objs = sceneObjsRef.current;
    if (!objs) return;

    objs.bloomPass.strength = settings.glowIntensity * 0.8;
    objs.gridHelper.visible = settings.showGrid;
    objs.scene.background = new THREE.Color(theme.background);
  }, [settings.glowIntensity, settings.showGrid, theme.background]);

  // Mouse handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const objs = sceneObjsRef.current;
    if (!canvas || !container || !objs) return;

    function onMouseMove(e: MouseEvent) {
      if (!objs) return;
      const rect = container!.getBoundingClientRect();
      objs.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      objs.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      objs.raycaster.setFromCamera(objs.mouse, objs.camera);

      if (objs.pointCloud) {
        const intersects = objs.raycaster.intersectObject(objs.pointCloud);
        if (intersects.length > 0 && intersects[0].index != null) {
          const idx = intersects[0].index;
          const pts = pointsRef.current;
          if (idx < pts.length) {
            setHoveredPoint(pts[idx]);
            setCursorPosition({ x: e.clientX, y: e.clientY });
            canvas!.style.cursor = 'pointer';
            return;
          }
        }
      }

      setHoveredPoint(null);
      setCursorPosition(null);
      canvas!.style.cursor = 'default';
    }

    function onClick(e: MouseEvent) {
      if (!objs) return;
      const rect = container!.getBoundingClientRect();
      objs.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      objs.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      objs.raycaster.setFromCamera(objs.mouse, objs.camera);

      if (objs.pointCloud) {
        const intersects = objs.raycaster.intersectObject(objs.pointCloud);
        if (intersects.length > 0 && intersects[0].index != null) {
          const idx = intersects[0].index;
          const pts = pointsRef.current;
          if (idx < pts.length) {
            setSelectedPoint(pts[idx]);
            onPointSelect?.(pts[idx]);
            return;
          }
        }
      }

      setSelectedPoint(null);
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPointSelect]);

  const setSelected = useCallback((point: EvePoint | null) => {
    setSelectedPoint(point);
  }, []);

  return {
    canvasRef,
    containerRef,
    hoveredPoint,
    selectedPoint,
    cursorPosition,
    isProjecting: false,
    projectedPoints: points,
    clusterCount,
    setSelectedPoint: setSelected,
  };
}
