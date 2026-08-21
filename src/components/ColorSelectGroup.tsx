import React, { useState } from 'react';
import { Check, Palette, Plus } from 'lucide-react';
import { BASE_8_COLORS, isValidHex, normalizeHex } from '../utils/colorUtils';
import { hexToRgba, isLightColor } from '../themes';
import { ThemePreset } from '../types';
import { ColorPaletteModal } from './ColorPaletteModal';

interface ColorSelectGroupProps {
  selectedColor: string;
  onChange: (color: string) => void;
  theme: ThemePreset;
  label?: string;
  allowManualHex?: boolean;
}

export const ColorSelectGroup: React.FC<ColorSelectGroupProps> = ({
  selectedColor,
  onChange,
  theme,
  label = 'Цвет',
  allowManualHex = true,
}) => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const isLight = isLightColor(theme.bg);

  const isCustomColor = !BASE_8_COLORS.some(
    c => c.toLowerCase() === (selectedColor || '').toLowerCase()
  );

  return (
    <div className="space-y-2">
      {/* Label and current HEX preview */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-extrabold opacity-60 uppercase tracking-wider flex items-center gap-1.5">
          <Palette size={12} style={{ color: theme.accent }} />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 opacity-90 hover:opacity-100 hover:scale-102 transition cursor-pointer"
          style={{
            backgroundColor: hexToRgba(selectedColor, 0.15),
            borderColor: hexToRgba(selectedColor, 0.4),
            color: selectedColor,
          }}
          title="Открыть расширенную палитру"
        >
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: selectedColor }} />
          <span>{selectedColor.toUpperCase()}</span>
        </button>
      </div>

      {/* Swatches: 8 Base Colors + Custom Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {BASE_8_COLORS.map(c => {
          const isSelected = selectedColor.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-7 h-7 rounded-full transition cursor-pointer flex items-center justify-center relative ${
                isSelected
                  ? 'ring-2 ring-offset-2 scale-110 shadow-md'
                  : 'hover:scale-105 opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: c,
                borderColor: hexToRgba(theme.text, 0.2),
              }}
              title={c}
            >
              {isSelected && <Check size={14} className="text-white stroke-[3]" />}
            </button>
          );
        })}

        {/* 9th Button: Custom Color Palette Trigger */}
        <button
          type="button"
          onClick={() => setIsPaletteOpen(true)}
          className={`h-7 px-2.5 rounded-full border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
            isCustomColor
              ? 'ring-2 ring-offset-2 scale-105 shadow-md'
              : 'opacity-80 hover:opacity-100 hover:scale-102'
          }`}
          style={{
            backgroundColor: isCustomColor ? selectedColor : hexToRgba(theme.text, 0.06),
            borderColor: isCustomColor ? selectedColor : hexToRgba(theme.text, 0.25),
            color: isCustomColor
              ? isLightColor(selectedColor)
                ? '#000000'
                : '#FFFFFF'
              : theme.text,
          }}
          title="Выбрать свой цвет из палитры или по HEX"
        >
          {isCustomColor ? (
            <>
              <Check size={12} className="stroke-[3]" />
              <span>Свой</span>
            </>
          ) : (
            <>
              <Palette size={13} style={{ color: theme.accent }} />
              <span>+ Свой</span>
            </>
          )}
        </button>
      </div>

      {/* Color Palette Modal */}
      <ColorPaletteModal
        isOpen={isPaletteOpen}
        initialColor={selectedColor}
        onClose={() => setIsPaletteOpen(false)}
        onApply={color => {
          onChange(color);
        }}
        theme={theme}
      />
    </div>
  );
};
