export interface FontOption {
  value: string;
  label: string;
  cssFamily: string;
  supportsCyrillic: boolean;
  category: 'sans' | 'serif' | 'mono' | 'display' | 'handwriting';
}

export const FONT_FAMILY_OPTIONS: FontOption[] = [
  {
    value: 'sans',
    label: 'Системный',
    cssFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    supportsCyrillic: true,
    category: 'sans',
  },
  {
    value: 'inter',
    label: 'Inter',
    cssFamily: '"Inter", sans-serif',
    supportsCyrillic: true,
    category: 'sans',
  },
  {
    value: 'roboto',
    label: 'Roboto',
    cssFamily: '"Roboto", sans-serif',
    supportsCyrillic: true,
    category: 'sans',
  },
  {
    value: 'open-sans',
    label: 'Open Sans',
    cssFamily: '"Open Sans", sans-serif',
    supportsCyrillic: true,
    category: 'sans',
  },
  {
    value: 'lato',
    label: 'Lato',
    cssFamily: '"Lato", sans-serif',
    supportsCyrillic: false, // Standard Google Fonts Lato lacks Cyrillic subset (falls back to sans-serif)
    category: 'sans',
  },
  {
    value: 'montserrat',
    label: 'Montserrat',
    cssFamily: '"Montserrat", sans-serif',
    supportsCyrillic: true,
    category: 'sans',
  },
  {
    value: 'merriweather',
    label: 'Merriweather',
    cssFamily: '"Merriweather", serif',
    supportsCyrillic: true,
    category: 'serif',
  },
  {
    value: 'lora',
    label: 'Lora',
    cssFamily: '"Lora", serif',
    supportsCyrillic: true,
    category: 'serif',
  },
  {
    value: 'pt-serif',
    label: 'PT Serif',
    cssFamily: '"PT Serif", serif',
    supportsCyrillic: true,
    category: 'serif',
  },
  {
    value: 'noto-serif',
    label: 'Noto Serif',
    cssFamily: '"Noto Serif", serif',
    supportsCyrillic: true,
    category: 'serif',
  },
  {
    value: 'jetbrains-mono',
    label: 'JetBrains Mono',
    cssFamily: '"JetBrains Mono", monospace',
    supportsCyrillic: true,
    category: 'mono',
  },
  {
    value: 'fira-code',
    label: 'Fira Code',
    cssFamily: '"Fira Code", monospace',
    supportsCyrillic: true,
    category: 'mono',
  },
  {
    value: 'roboto-mono',
    label: 'Roboto Mono',
    cssFamily: '"Roboto Mono", monospace',
    supportsCyrillic: true,
    category: 'mono',
  },
  {
    value: 'caveat',
    label: 'Caveat',
    cssFamily: '"Caveat", cursive',
    supportsCyrillic: true,
    category: 'handwriting',
  },
  {
    value: 'amatic-sc',
    label: 'Amatic SC',
    cssFamily: '"Amatic SC", cursive',
    supportsCyrillic: true,
    category: 'display',
  },
  {
    value: 'comfortaa',
    label: 'Comfortaa',
    cssFamily: '"Comfortaa", cursive',
    supportsCyrillic: true,
    category: 'display',
  },
];

/**
 * Maps a font family identifier to the full CSS font-family string.
 */
export function getFontFamilyStyle(fontId: string): string {
  if (!fontId) return FONT_FAMILY_OPTIONS[0].cssFamily;

  const match = FONT_FAMILY_OPTIONS.find(
    f => f.value.toLowerCase() === fontId.toLowerCase()
  );
  if (match) return match.cssFamily;

  // Legacy aliases
  switch (fontId) {
    case 'serif':
      return '"Merriweather", "PT Serif", serif';
    case 'mono':
      return '"JetBrains Mono", "Roboto Mono", monospace';
    case 'playfair':
      return '"Lora", "PT Serif", serif';
    case 'jakarta':
      return '"Inter", sans-serif';
    default:
      return FONT_FAMILY_OPTIONS[0].cssFamily;
  }
}
