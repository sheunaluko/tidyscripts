'use client';

import { useState } from 'react';
import ParticleGrid from './ParticleGrid';

export default function ParticleGridDemo() {
  const [particleSize, setParticleSize] = useState(2.5);
  const [waveSpeed, setWaveSpeed] = useState(0.5);
  const [waveAmplitude, setWaveAmplitude] = useState(0.05);
  const [mouseInfluence, setMouseInfluence] = useState(0.15);
  const [glowIntensity, setGlowIntensity] = useState(0.8);
  const [color, setColor] = useState<[number, number, number]>([0.4, 0.7, 1.0]);
  const [showControls, setShowControls] = useState(true);

  const presets = {
    calm: {
      particleSize: 2.0,
      waveSpeed: 0.3,
      waveAmplitude: 0.03,
      mouseInfluence: 0.1,
      glowIntensity: 0.6,
      color: [0.4, 0.7, 1.0] as [number, number, number],
    },
    energetic: {
      particleSize: 3.0,
      waveSpeed: 1.2,
      waveAmplitude: 0.08,
      mouseInfluence: 0.25,
      glowIntensity: 1.0,
      color: [1.0, 0.3, 0.6] as [number, number, number],
    },
    cosmic: {
      particleSize: 2.5,
      waveSpeed: 0.4,
      waveAmplitude: 0.06,
      mouseInfluence: 0.2,
      glowIntensity: 0.9,
      color: [0.6, 0.3, 1.0] as [number, number, number],
    },
    matrix: {
      particleSize: 2.0,
      waveSpeed: 0.6,
      waveAmplitude: 0.04,
      mouseInfluence: 0.15,
      glowIntensity: 0.7,
      color: [0.2, 1.0, 0.3] as [number, number, number],
    },
  };

  const applyPreset = (preset: keyof typeof presets) => {
    const p = presets[preset];
    setParticleSize(p.particleSize);
    setWaveSpeed(p.waveSpeed);
    setWaveAmplitude(p.waveAmplitude);
    setMouseInfluence(p.mouseInfluence);
    setGlowIntensity(p.glowIntensity);
    setColor(p.color);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Particle Grid Background */}
      <div className="absolute inset-0">
        <ParticleGrid
          particleCount={10000}
          particleSize={particleSize}
          waveSpeed={waveSpeed}
          waveAmplitude={waveAmplitude}
          mouseInfluence={mouseInfluence}
          color={color}
          glowIntensity={glowIntensity}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
        <h1 className="text-6xl font-bold mb-4 text-center">
          WebGL Particle Grid
        </h1>
        <p className="text-xl text-gray-300 mb-8 text-center max-w-2xl px-4">
          Move your mouse to interact with the particles
        </p>

        {/* Toggle Controls Button */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>

      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-6 rounded-lg text-white max-w-sm z-20 border border-white/20">
          <h2 className="text-2xl font-bold mb-4">Controls</h2>

          {/* Presets */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(presets).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset as keyof typeof presets)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded transition-all text-sm capitalize"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Particle Size */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Particle Size: {particleSize.toFixed(1)}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={particleSize}
              onChange={(e) => setParticleSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Wave Speed */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Wave Speed: {waveSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={waveSpeed}
              onChange={(e) => setWaveSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Wave Amplitude */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Wave Amplitude: {waveAmplitude.toFixed(3)}
            </label>
            <input
              type="range"
              min="0"
              max="0.15"
              step="0.01"
              value={waveAmplitude}
              onChange={(e) => setWaveAmplitude(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Mouse Influence */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Mouse Influence: {mouseInfluence.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={mouseInfluence}
              onChange={(e) => setMouseInfluence(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Glow Intensity */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Glow Intensity: {glowIntensity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={glowIntensity}
              onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Color</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs">R</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={color[0]}
                  onChange={(e) =>
                    setColor([parseFloat(e.target.value), color[1], color[2]])
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs">G</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={color[1]}
                  onChange={(e) =>
                    setColor([color[0], parseFloat(e.target.value), color[2]])
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs">B</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={color[2]}
                  onChange={(e) =>
                    setColor([color[0], color[1], parseFloat(e.target.value)])
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
