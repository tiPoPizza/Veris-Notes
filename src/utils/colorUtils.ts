export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 100 (%)
  v: number; // 0 - 100 (%)
}

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface HSL {
  h: number; // 0 - 360
  s: number; // 0 - 100 (%)
  l: number; // 0 - 100 (%)
}

export interface CMYK {
  c: number; // 0 - 100 (%)
  m: number; // 0 - 100 (%)
  y: number; // 0 - 100 (%)
  k: number; // 0 - 100 (%)
}

export const BASE_8_COLORS: string[] = [
  '#F28B82', // Пастельный коралловый
  '#F8A572', // Пастельный персиковый
  '#F6D06F', // Пастельный тёплый жёлтый
  '#88D49E', // Пастельный мятный
  '#72D5E0', // Пастельный бирюзовый
  '#85B6FF', // Пастельный васильковый
  '#B99AF8', // Пастельный лавандовый
  '#F48FB1', // Пастельный нежно-розовый
];

export function hexToRgb(hex: string): RGB {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 66, g: 135, b: 245 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;
  const c = vNorm * sNorm;
  const hPrime = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = vNorm - c;

  let rNorm = 0;
  let gNorm = 0;
  let bNorm = 0;

  if (hPrime >= 0 && hPrime < 1) {
    rNorm = c; gNorm = x; bNorm = 0;
  } else if (hPrime >= 1 && hPrime < 2) {
    rNorm = x; gNorm = c; bNorm = 0;
  } else if (hPrime >= 2 && hPrime < 3) {
    rNorm = 0; gNorm = c; bNorm = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    rNorm = 0; gNorm = x; bNorm = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    rNorm = x; gNorm = 0; bNorm = c;
  } else if (hPrime >= 5 && hPrime < 6) {
    rNorm = c; gNorm = 0; bNorm = x;
  }

  return {
    r: Math.round((rNorm + m) * 255),
    g: Math.round((gNorm + m) * 255),
    b: Math.round((bNorm + m) * 255),
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export function hexToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

export function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
  const kPct = Math.round(k * 100);

  return {
    c: Math.max(0, Math.min(100, c)),
    m: Math.max(0, Math.min(100, m)),
    y: Math.max(0, Math.min(100, y)),
    k: Math.max(0, Math.min(100, kPct)),
  };
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isValidHex(hex: string): boolean {
  return /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  return `#${clean.toUpperCase()}`;
}
