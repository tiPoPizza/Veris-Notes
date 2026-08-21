// Utility for stripping HTML tags for note card previews and copy actions
export const stripHtmlTags = (html: string | undefined | null): string => {
  if (!html) return '';
  const clean = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  return clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

// Check if a hex color is light or dark for text contrast
export const isColorLight = (color: string): boolean => {
  if (!color) return false;
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150;
};
