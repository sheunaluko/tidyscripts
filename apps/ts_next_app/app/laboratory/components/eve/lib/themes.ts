import type { EveTheme } from './types';

export const EVE_THEMES: EveTheme[] = [
  {
    id: 'cyber',
    name: 'Cyber',
    primary: '#00ffff',
    secondary: '#ff00ff',
    background: '#0a0a0f',
    scoreGradient: ['#003333', '#00ffff'],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    primary: '#39ff14',
    secondary: '#ffd700',
    background: '#0a0f0a',
    scoreGradient: ['#0a3300', '#39ff14'],
  },
  {
    id: 'neon-red',
    name: 'Neon Red',
    primary: '#ff3131',
    secondary: '#ff8c00',
    background: '#0f0a0a',
    scoreGradient: ['#330a0a', '#ff3131'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    primary: '#7b68ee',
    secondary: '#00fa9a',
    background: '#0a0a12',
    scoreGradient: ['#1a1a33', '#7b68ee'],
  },
];

export const DEFAULT_THEME_ID = 'cyber';

export function getThemeById(id: string): EveTheme {
  return EVE_THEMES.find((t) => t.id === id) ?? EVE_THEMES[0];
}
