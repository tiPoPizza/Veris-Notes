import { ThemeCategory, ThemePreset } from './types';

export const THEME_CATEGORIES: ThemeCategory[] = [
  {
    id: 'drinks',
    name: 'Напитки',
    themes: [
      { id: 'bordeaux', name: 'Бордо', category: 'Напитки', type: 'Prelude', bg: '#F8F6F2', text: '#202223', accent: '#7A1C31' },
      { id: 'marsala', name: 'Марсала', category: 'Напитки', type: 'Prelude', bg: '#141115', text: '#F0E6E8', accent: '#C24D63' },
      { id: 'brandy', name: 'Бренди', category: 'Напитки', type: 'Prelude', bg: '#14110C', text: '#d9c9b4', accent: '#bfa317' },
      { id: 'con_yelo', name: 'Кон йело', category: 'Напитки', type: 'Prelude', bg: '#161210', text: '#daecf2', accent: '#ccac8b' },
    ],
  },
  {
    id: 'literature',
    name: 'Литература',
    themes: [
      { id: 'sealing_wax', name: 'Сургуч', category: 'Литература', type: 'Prelude', bg: '#F2ECE1', text: '#182028', accent: '#A62C2B' },
      { id: 'night_letter', name: 'Ночное письмо', category: 'Литература', type: 'Prelude', bg: '#12161F', text: '#EBE2EE', accent: '#e3a936' },
      { id: 'ink_remnants', name: 'Остатки чернил', category: 'Литература', type: 'Cadenza', bg: '#f5f2ff', text: '#9dd428', accent: '#1b083b' },
      { id: 'ex_libris', name: 'Экслибрис', category: 'Литература', type: 'Cadenza', bg: '#f7f0e1', text: '#241e13', accent: '#917951' },
    ],
  },
  {
    id: 'roses',
    name: 'Розы',
    themes: [
      { id: 'rose_quartz', name: 'Розовый кварц', category: 'Розы', type: 'Cadenza', bg: '#F7EDEF', text: '#3B1F2B', accent: '#C2447A' },
      { id: 'rose_in_dark', name: 'Роза во тьме', category: 'Розы', type: 'Cadenza', bg: '#160D13', text: '#F2DCE4', accent: '#FF5FA0' },
      { id: 'fading_rose', name: 'Увядающая роза', category: 'Розы', type: 'Cadenza', bg: '#1C1D18', text: '#F4ECC2', accent: '#CF9E29' },
    ],
  },
  {
    id: 'jewels',
    name: 'Драгоценности',
    themes: [
      { id: 'necklace', name: 'Ожерелье', category: 'Драгоценности', type: 'Prelude', bg: '#181124', text: '#e7d4fc', accent: '#F59E0B' },
      { id: 'sapphire_clink', name: 'Сапфировый дзынь', category: 'Драгоценности', type: 'Cadenza', bg: '#10193A', text: '#B8C7E8', accent: '#3E80FF' },
    ],
  },
  {
    id: 'spring',
    name: 'Весна',
    themes: [
      { id: 'thawed_icicle', name: 'Подтаявшая сосулька', category: 'Весна', type: 'Prelude', bg: '#EEF1F4', text: '#1C232B', accent: '#3B5BA5' },
      { id: 'hay_under_snow', name: 'Сено под снегом', category: 'Весна', type: 'Cadenza', bg: '#1A1612', text: '#FFFFFF', accent: '#FCE082' },
      { id: 'snowdrop', name: 'Подснежник', category: 'Весна', type: 'Cadenza', bg: '#142903', text: '#FDFDFD', accent: '#86E21D' },
    ],
  },
  {
    id: 'music',
    name: 'Музыка',
    themes: [
      { id: 'saxophone', name: 'Саксофон', category: 'Музыка', type: 'Cadenza', bg: '#1B1613', text: '#EAE1D3', accent: '#D4AF37' },
      { id: 'flute', name: 'Флейта', category: 'Музыка', type: 'Cadenza', bg: '#F4F6F9', text: '#1A2130', accent: '#1E4620' },
      { id: 'old_piano', name: 'Старый рояль', category: 'Музыка', type: 'Cadenza', bg: '#F2EFE9', text: '#4C3C3C', accent: '#3D1F1F' },
    ],
  },
  {
    id: 'sky',
    name: 'Небо',
    themes: [
      { id: 'night_window', name: 'Ночь из окна', category: 'Небо', type: 'Cadenza', bg: '#10141C', text: '#E7E3DA', accent: '#E8934A' },
      { id: 'night_roof', name: 'Ночь с крыши', category: 'Небо', type: 'Cadenza', bg: '#090B14', text: '#DCE3F0', accent: '#7FA8D9' },
      { id: 'belt_of_venus', name: 'Пояс Венеры', category: 'Небо', type: 'Cadenza', bg: '#F2F0F7', text: '#231F2D', accent: '#7C5CBF' },
      { id: 'northern_night', name: 'Северная ночь', category: 'Небо', type: 'Cadenza', bg: '#121A1F', text: '#A3B8C2', accent: '#44C089' },
    ],
  },
  {
    id: 'manor',
    name: 'Усадьба',
    themes: [
      { id: 'windmill', name: 'Мельница в поле', category: 'Усадьба', type: 'Prelude', bg: '#F5F0E6', text: '#2C221E', accent: '#2f6d8a' },
      { id: 'forest_edge', name: 'Опушка леса', category: 'Усадьба', type: 'Prelude', bg: '#F4F7F2', text: '#1E2A1E', accent: '#307A5C' },
      { id: 'bath_broom', name: 'Банный веник', category: 'Усадьба', type: 'Cadenza', bg: '#DCC7A0', text: '#20392D', accent: '#5d6b37' },
    ],
  },
  {
    id: 'oxymoron',
    name: 'Оксюморон',
    themes: [
      { id: 'night_sunflower', name: 'Ночной подсолнух', category: 'Оксюморон', type: 'Cadenza', bg: '#0D1926', text: '#FAEA43', accent: '#F79727' },
      { id: 'cheap_luxury', name: 'Дешёвая роскошь', category: 'Оксюморон', type: 'Cadenza', bg: '#0C1220', text: '#F5F3EC', accent: '#E8C77A' },
      { id: 'humane_execution', name: 'Гуманная казнь', category: 'Оксюморон', type: 'Cadenza', bg: '#EAF6FB', text: '#2B4552', accent: '#C93A24' },
    ],
  },
  {
    id: 'decadence',
    name: 'Декаданс',
    themes: [
      { id: 'weathered_lemon', name: 'Заветренный лимон', category: 'Декаданс', type: 'Cadenza', bg: '#FFFDF5', text: '#1C1A14', accent: '#8F6508' },
      { id: 'drying_blood', name: 'Высыхающая кровь', category: 'Декаданс', type: 'Cadenza', bg: '#451303', text: '#e5fae3', accent: '#E93D7B' },
      { id: 'smoldering_fireplace', name: 'Тлеющий камин', category: 'Декаданс', type: 'Cadenza', bg: '#1C1C1E', text: '#A0A0A5', accent: '#D17A5D' },
    ],
  },
  {
    id: 'herbarium',
    name: 'Гербарий',
    themes: [
      { id: 'dried_sage', name: 'Сушёный шалфей', category: 'Гербарий', type: 'Prelude', bg: '#EFECE6', text: '#232D2D', accent: '#37703b' },
      { id: 'blooming_sunflower', name: 'Цветущий подсолнух', category: 'Гербарий', type: 'Cadenza', bg: '#ECF7FF', text: '#163004', accent: '#A64F00' },
      { id: 'not_lavender', name: 'Не лаванда', category: 'Гербарий', type: 'Cadenza', bg: '#F5F0F7', text: '#241B2E', accent: '#8548D1' },
    ],
  },
  {
    id: 'solitudes',
    name: 'Одиночества',
    themes: [
      { id: 'smooth_surface', name: 'Гладь', category: 'Одиночества', type: 'Prelude', bg: '#0B132B', text: '#E0F2FE', accent: '#76e3cf' },
      { id: 'moss_on_stone', name: 'Мох на камне', category: 'Одиночества', type: 'Cadenza', bg: '#EDEFE8', text: '#1F2621', accent: '#5C7A5A' },
      { id: 'mountain_lake', name: 'Горное озеро', category: 'Одиночества', type: 'Cadenza', bg: '#EFF8F6', text: '#192A27', accent: '#0F7A63' },
      { id: 'escapism', name: 'Эскапизм', category: 'Одиночества', type: 'Cadenza', bg: '#141C22', text: '#A9BAC0', accent: '#5D8EA2' },
      { id: 'vile_people', name: 'Мерзкие люди', category: 'Одиночества', type: 'Cadenza', bg: '#0A1420', text: '#E3F0FA', accent: '#4FD8E8' },
    ],
  },
  {
    id: 'minimalism',
    name: 'Минимализм',
    themes: [
      { id: 'graphite', name: 'Графит', category: 'Минимализм', type: 'Prelude', bg: '#1A1A1A', text: '#E8E8E8', accent: '#8C8C8C' },
      { id: 'tone_in_tone', name: 'Тон в тон', category: 'Минимализм', type: 'Prelude', bg: '#F5F2ED', text: '#2B2622', accent: '#8A7F72' },
      { id: 'rebar', name: 'Арматура', category: 'Минимализм', type: 'Cadenza', bg: '#EDEEF0', text: '#2E3134', accent: '#5A6773' },
    ],
  },
];

// Flat list of all themes
export const ALL_THEMES: ThemePreset[] = THEME_CATEGORIES.flatMap(c => c.themes);

// Default themes: "Подтаявшая сосулька" (light) / "Сено под снегом" (dark)
export const DEFAULT_LIGHT_THEME = ALL_THEMES.find(t => t.id === 'thawed_icicle') || ALL_THEMES[0];
export const DEFAULT_DARK_THEME = ALL_THEMES.find(t => t.id === 'hay_under_snow') || ALL_THEMES[0];
export const DEFAULT_THEME = DEFAULT_LIGHT_THEME;

// Helper to determine if a hex color is light or dark
export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// Convert hex to RGBA string with opacity
export function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
