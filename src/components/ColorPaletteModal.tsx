import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Check, Palette } from 'lucide-react';
import {
  HSV,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  rgbToHex,
  rgbToCmyk,
  rgbToHsl,
  isValidHex,
  normalizeHex,
} from '../utils/colorUtils';
import { hexToRgba, isLightColor } from '../themes';
import { ThemePreset } from '../types';

interface ColorPaletteModalProps {
  isOpen: boolean;
  initialColor: string;
  onClose: () => void;
  onApply: (color: string) => void;
  theme: ThemePreset;
}

export const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({
  isOpen,
  initialColor,
  onClose,
  onApply,
  theme,
}) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initialColor || '#4287f5'));
  const [hexInput, setHexInput] = useState<string>(initialColor || '#4287F5');
  const [copied, setCopied] = useState<boolean>(false);

  const satValBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef<boolean>(false);
  const isDraggingHue = useRef<boolean>(false);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  // Sync initial color when opening
  useEffect(() => {
    if (isOpen) {
      const init = initialColor && isValidHex(initialColor) ? initialColor : '#4287F5';
      const parsed = hexToHsv(init);
      setHsv(parsed);
      setHexInput(normalizeHex(init));
    }
  }, [isOpen, initialColor]);

  // Derive current values
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const currentCmyk = rgbToCmyk(currentRgb.r, currentRgb.g, currentRgb.b);
  const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);

  // Keep hex input in sync when HSV changes via drag
  const updateHsv = useCallback((newHsv: Partial<HSV>) => {
    setHsv(prev => {
      const next = { ...prev, ...newHsv };
      const hex = hsvToHex(next.h, next.s, next.v);
      setHexInput(hex);
      return next;
    });
  }, []);

  // Handle manual HEX input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (isValidHex(val)) {
      const parsed = hexToHsv(val);
      setHsv(parsed);
    }
  };

  const handleCopyHex = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 2D Saturation / Value Box Dragging
  const handleSatValMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!satValBoxRef.current) return;
      const rect = satValBoxRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      updateHsv({ s, v });
    },
    [updateHsv]
  );

  const handleHueMove = useCallback(
    (clientX: number) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      updateHsv({ h });
    },
    [updateHsv]
  );

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      if (isDraggingSatVal.current) {
        e.preventDefault();
        handleSatValMove(clientX, clientY);
      } else if (isDraggingHue.current) {
        e.preventDefault();
        handleHueMove(clientX);
      }
    };

    const handlePointerUp = () => {
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handleSatValMove, handleHueMove]);

  if (!isOpen) return null;

  const isLight = isLightColor(theme.bg);
  // Pure hue color for 2D background
  const pureHueRgb = hsvToRgb(hsv.h, 100, 100);
  const pureHueHex = rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md rounded-3xl p-5 shadow-2xl border backdrop-blur-2xl flex flex-col gap-4 relative overflow-hidden select-none"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.96),
          color: theme.text,
          borderColor: hexToRgba(theme.text, 0.2),
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.5)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette size={20} style={{ color: theme.accent }} />
            <h3 className="text-base font-extrabold tracking-tight">Палитра</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Preview Region (Left: Color block, Right: 2D Sat-Val Gradient) */}
        <div className="grid grid-cols-2 gap-2.5 h-36 rounded-2xl overflow-hidden shadow-inner border" style={{ borderColor: hexToRgba(theme.text, 0.15) }}>
          {/* Left: Solid Selected Color */}
          <div
            className="w-full h-full flex items-end p-2.5 transition-colors duration-75"
            style={{ backgroundColor: currentHex }}
          >
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-xs"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                color: '#FFFFFF',
              }}
            >
              {currentHex}
            </span>
          </div>

          {/* Right: 2D Saturation / Value Gradient */}
          <div
            ref={satValBoxRef}
            className="relative w-full h-full cursor-crosshair touch-none"
            style={{
              backgroundColor: pureHueHex,
              backgroundImage: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, transparent)`,
            }}
            onMouseDown={e => {
              isDraggingSatVal.current = true;
              handleSatValMove(e.clientX, e.clientY);
            }}
            onTouchStart={e => {
              isDraggingSatVal.current = true;
              handleSatValMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
          >
            {/* Draggable Circle Handle */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-md transition-transform"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentHex,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.6)',
              }}
            />
          </div>
        </div>

        {/* Hue Slider */}
        <div className="space-y-1">
          <div
            ref={hueSliderRef}
            className="relative h-6 w-full rounded-full cursor-pointer touch-none shadow-inner border"
            style={{
              background:
                'linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)',
              borderColor: hexToRgba(theme.text, 0.15),
            }}
            onMouseDown={e => {
              isDraggingHue.current = true;
              handleHueMove(e.clientX);
            }}
            onTouchStart={e => {
              isDraggingHue.current = true;
              handleHueMove(e.touches[0].clientX);
            }}
          >
            {/* Hue Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white pointer-events-none shadow-md"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: pureHueHex,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>

        {/* HEX Input Field */}
        <div
          className="relative px-3.5 py-2.5 rounded-2xl border flex items-center justify-between transition-colors"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.04),
            borderColor: hexToRgba(theme.text, 0.15),
          }}
        >
          <span
            className="absolute -top-2 left-4 px-1.5 text-[10px] font-black uppercase tracking-wider rounded"
            style={{
              backgroundColor: isLight ? '#FFFFFF' : theme.bg,
              color: theme.accent,
            }}
          >
            HEX
          </span>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            placeholder="#000000"
            className="w-full bg-transparent font-mono font-bold text-base outline-none tracking-wide"
            style={{ color: theme.text }}
          />
          <button
            type="button"
            onClick={handleCopyHex}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer flex items-center justify-center"
            title="Скопировать HEX"
          >
            {copied ? <Check size={16} className="text-emerald-500 stroke-[3]" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Color Model Info Blocks (RGB, CMYK, HSV, HSL) */}
        <div className="grid grid-cols-2 gap-2">
          {/* RGB */}
          <div
            className="p-2 rounded-xl border flex flex-col"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.03),
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase font-mono">RGB</span>
            <span className="text-xs font-mono font-semibold truncate">
              {currentRgb.r}, {currentRgb.g}, {currentRgb.b}
            </span>
          </div>

          {/* CMYK */}
          <div
            className="p-2 rounded-xl border flex flex-col"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.03),
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase font-mono">CMYK</span>
            <span className="text-xs font-mono font-semibold truncate">
              {currentCmyk.c}%, {currentCmyk.m}%, {currentCmyk.y}%, {currentCmyk.k}%
            </span>
          </div>

          {/* HSV */}
          <div
            className="p-2 rounded-xl border flex flex-col"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.03),
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase font-mono">HSV</span>
            <span className="text-xs font-mono font-semibold truncate">
              {hsv.h}°, {hsv.s}%, {hsv.v}%
            </span>
          </div>

          {/* HSL */}
          <div
            className="p-2 rounded-xl border flex flex-col"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.03),
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <span className="text-[10px] font-bold opacity-50 uppercase font-mono">HSL</span>
            <span className="text-xs font-mono font-semibold truncate">
              {currentHsl.h}°, {currentHsl.s}%, {currentHsl.l}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-black/10 transition cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(currentHex);
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            style={{
              backgroundColor: currentHex,
              color: isLightColor(currentHex) ? '#000000' : '#FFFFFF',
            }}
          >
            <Check size={14} className="stroke-[3]" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
