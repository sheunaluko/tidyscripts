# WebGL Particle Grid

A high-performance, customizable particle grid effect built with pure WebGL and React. Features smooth wave animations and interactive mouse effects.

## Features

- **Pure WebGL**: Custom shaders for maximum performance
- **Interactive**: Mouse repulsion effect
- **Smooth Animations**: Multiple layered sine wave patterns
- **Customizable**: Extensive props for fine-tuning
- **Lightweight**: No heavy dependencies (~300 lines)
- **60 FPS**: Optimized rendering with 10,000+ particles

## Demo

Visit `/laboratory/webgl-particles` to see the interactive demo with real-time controls.

## Usage

```tsx
import ParticleGrid from './ParticleGrid';

export default function MyPage() {
  return (
    <div className="relative w-full h-screen">
      <ParticleGrid
        particleCount={10000}
        particleSize={2.5}
        waveSpeed={0.5}
        waveAmplitude={0.05}
        mouseInfluence={0.15}
        color={[0.4, 0.7, 1.0]}
        glowIntensity={0.8}
      />

      {/* Your content here */}
      <div className="relative z-10">
        <h1>Your Landing Page</h1>
      </div>
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `particleCount` | `number` | `10000` | Total number of particles to render |
| `particleSize` | `number` | `2.5` | Size of each particle in pixels |
| `waveSpeed` | `number` | `0.5` | Speed of wave animation |
| `waveAmplitude` | `number` | `0.05` | Intensity of wave displacement |
| `mouseInfluence` | `number` | `0.15` | Strength of mouse repulsion effect |
| `color` | `[number, number, number]` | `[0.4, 0.7, 1.0]` | RGB color values (0-1 range) |
| `glowIntensity` | `number` | `0.8` | Intensity of particle glow effect |
| `gridSpacing` | `number` | `0.05` | Spacing between particles (not currently used) |
| `className` | `string` | `''` | Additional CSS classes |

## Presets

The demo page includes several presets:

- **Calm**: Gentle waves, subtle colors
- **Energetic**: Fast movement, vibrant pink/red
- **Cosmic**: Purple tones, moderate animation
- **Matrix**: Green color, classic digital aesthetic

## Performance

- Uses WebGL point sprites for efficient rendering
- Handles 10,000+ particles at 60 FPS
- Responsive to window resize
- Automatic cleanup on unmount

## Implementation Details

### Shaders

**Vertex Shader**:
- Calculates particle positions
- Applies multi-layered wave displacement
- Handles mouse interaction and repulsion

**Fragment Shader**:
- Renders circular particles with soft edges
- Applies glow effect
- Brightens particles near mouse cursor

### Animation

The effect uses three layered sine waves with different frequencies and speeds to create organic, flowing motion.

## Browser Support

Requires WebGL support (all modern browsers). Falls back gracefully if WebGL is unavailable.

## Tips

- Use darker backgrounds for better visibility
- Adjust `particleCount` based on target device performance
- Lower `waveAmplitude` for subtle effects
- Increase `mouseInfluence` for more dramatic interaction
- Combine multiple color channels for custom colors

## Example: Landing Page Background

```tsx
<div className="relative w-full min-h-screen bg-black">
  {/* Particle background */}
  <div className="absolute inset-0">
    <ParticleGrid color={[0.2, 1.0, 0.3]} glowIntensity={0.7} />
  </div>

  {/* Content */}
  <div className="relative z-10 container mx-auto px-4 py-20">
    <h1 className="text-6xl font-bold text-white">Welcome</h1>
    <p className="text-xl text-gray-300">Your content here</p>
  </div>
</div>
```
