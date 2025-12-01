'use client';

import { useEffect, useRef, useState } from 'react';

interface ParticleGridProps {
  particleCount?: number;
  particleSize?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  mouseInfluence?: number;
  color?: [number, number, number];
  glowIntensity?: number;
  gridSpacing?: number;
  className?: string;
}

export default function ParticleGrid({
  particleCount = 10000,
  particleSize = 2.5,
  waveSpeed = 0.5,
  waveAmplitude = 0.05,
  mouseInfluence = 0.15,
  color = [0.4, 0.7, 1.0],
  glowIntensity = 0.8,
  gridSpacing = 0.05,
  className = '',
}: ParticleGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl as WebGLRenderingContext;

    // Vertex Shader - handles particle positions and wave displacement
    const vertexShaderSource = `
      attribute vec2 a_position;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_waveSpeed;
      uniform float u_waveAmplitude;
      uniform float u_mouseInfluence;
      uniform float u_particleSize;
      varying float v_distanceFromMouse;

      void main() {
        vec2 pos = a_position;

        // Wave displacement using sine waves
        float wave1 = sin(pos.x * 10.0 + u_time * u_waveSpeed) * u_waveAmplitude;
        float wave2 = cos(pos.y * 10.0 + u_time * u_waveSpeed * 0.7) * u_waveAmplitude;
        float wave3 = sin((pos.x + pos.y) * 8.0 - u_time * u_waveSpeed * 1.3) * u_waveAmplitude * 0.5;

        pos.x += wave1 + wave3;
        pos.y += wave2 + wave3;

        // Mouse interaction - repulsion effect
        vec2 toMouse = pos - u_mouse;
        float distToMouse = length(toMouse);
        v_distanceFromMouse = distToMouse;

        if (distToMouse < 0.3) {
          float repulsion = (1.0 - distToMouse / 0.3) * u_mouseInfluence;
          pos += normalize(toMouse) * repulsion;
        }

        gl_Position = vec4(pos, 0.0, 1.0);
        gl_PointSize = u_particleSize;
      }
    `;

    // Fragment Shader - renders particles with glow effect
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_glowIntensity;
      varying float v_distanceFromMouse;

      void main() {
        // Create circular particles with soft edges
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        if (dist > 0.5) {
          discard;
        }

        // Soft glow falloff
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha = pow(alpha, 2.0) * u_glowIntensity;

        // Brighten particles near mouse
        float mouseBrightness = 1.0 + (1.0 - smoothstep(0.0, 0.3, v_distanceFromMouse)) * 0.5;

        gl_FragColor = vec4(u_color * mouseBrightness, alpha);
      }
    `;

    // Compile shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders');
      return;
    }

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      console.error('Failed to create program');
      return;
    }
    programRef.current = program;

    // Generate particle positions in a grid
    const positions: number[] = [];
    const gridSize = Math.ceil(Math.sqrt(particleCount));

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / gridSize) * 2.0 - 1.0;
        const y = (j / gridSize) * 2.0 - 1.0;
        positions.push(x, y);
      }
    }

    // Create and bind buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Set up attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const uniformLocations = {
      time: gl.getUniformLocation(program, 'u_time'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      waveSpeed: gl.getUniformLocation(program, 'u_waveSpeed'),
      waveAmplitude: gl.getUniformLocation(program, 'u_waveAmplitude'),
      mouseInfluence: gl.getUniformLocation(program, 'u_mouseInfluence'),
      particleSize: gl.getUniformLocation(program, 'u_particleSize'),
      color: gl.getUniformLocation(program, 'u_color'),
      glowIntensity: gl.getUniformLocation(program, 'u_glowIntensity'),
    };

    // Enable blending for glow effect
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Resize handler
    const handleResize = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2.0 - 1.0;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2.0 + 1.0;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    handleResize();

    // Animation loop
    const render = () => {
      timeRef.current += 0.016; // ~60fps

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Set uniforms
      gl.uniform1f(uniformLocations.time, timeRef.current);
      gl.uniform2f(uniformLocations.mouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uniformLocations.waveSpeed, waveSpeed);
      gl.uniform1f(uniformLocations.waveAmplitude, waveAmplitude);
      gl.uniform1f(uniformLocations.mouseInfluence, mouseInfluence);
      gl.uniform1f(uniformLocations.particleSize, particleSize);
      gl.uniform3f(uniformLocations.color, color[0], color[1], color[2]);
      gl.uniform1f(uniformLocations.glowIntensity, glowIntensity);

      // Draw particles
      gl.drawArrays(gl.POINTS, 0, positions.length / 2);

      animationIdRef.current = requestAnimationFrame(render);
    };

    render();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (gl && program) {
        gl.deleteProgram(program);
      }
    };
  }, [particleCount, particleSize, waveSpeed, waveAmplitude, mouseInfluence, color, glowIntensity, gridSpacing]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// Helper functions
function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}
