import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check } from 'lucide-react';
import {
  HSV,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  rgbToHex,
  isValidHex,
  normalizeHex,
  BASE_8_COLORS,
} from '../utils/colorUtils';
import { hexToRgba, isLightColor } from '../themes';
import { ThemePreset } from '../types';

interface ColorPaletteModalProps {
  isOpen: boolean;
  initialColor: string;
  onClose: () => void;
  onApply: (color: string) => void;
  theme: ThemePreset;
  title?: string;
}

export const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({
  isOpen,
  initialColor,
  onClose,
  onApply,
  theme,
  title,
}) => {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initialColor || '#85B6FF'));
  const [hexInput, setHexInput] = useState<string>(initialColor || '#85B6FF');
  const [copied, setCopied] = useState<boolean>(false);

  const satValBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef<boolean>(false);
  const isDraggingHue = useRef<boolean>(false);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  // Sync initial color when opening
  useEffect(() => {
    if (isOpen) {
      const init = initialColor && isValidHex(initialColor) ? initialColor : '#85B6FF';
      const parsed = hexToHsv(init);
      setHsv(parsed);
      setHexInput(normalizeHex(init));
    }
  }, [isOpen, initialColor]);

  // Derive current values
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const currentRgb = hsvToRgb(hsv.h, hsv.s, hsv.v);

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
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border backdrop-blur-2xl flex flex-col gap-3 relative select-none my-auto max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
          color: theme.text,
          borderColor: hexToRgba(theme.text, 0.12),
          boxShadow: isLight
            ? '0 16px 40px -6px rgba(0, 0, 0, 0.2)'
            : '0 20px 50px rgba(0, 0, 0, 0.55)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight">{title || 'Выбор цвета'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2D Saturation / Value Gradient Area */}
        <div
          ref={satValBoxRef}
          className="relative w-full h-36 sm:h-40 rounded-xl cursor-crosshair touch-none overflow-hidden border shadow-inner"
          style={{
            backgroundColor: pureHueHex,
            backgroundImage: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #FFFFFF, transparent)`,
            borderColor: hexToRgba(theme.text, 0.15),
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

        {/* Rainbow Hue Slider */}
        <div
          ref={hueSliderRef}
          className="relative h-5 w-full rounded-full cursor-pointer touch-none shadow-inner border"
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
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white pointer-events-none shadow-md"
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: pureHueHex,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.5)',
            }}
          />
        </div>

        {/* Color Preview & HEX Input Row */}
        <div className="flex items-center gap-2.5">
          {/* Color Preview Swatch */}
          <div
            className="w-10 h-10 rounded-xl border shrink-0 shadow-xs transition-colors"
            style={{
              backgroundColor: currentHex,
              borderColor: hexToRgba(theme.text, 0.15),
            }}
          />

          {/* HEX Input */}
          <div
            className="flex-1 flex items-center px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.04),
              borderColor: hexToRgba(theme.text, 0.15),
            }}
          >
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              placeholder="#000000"
              maxLength={7}
              className="w-full bg-transparent font-mono font-bold text-xs sm:text-sm outline-none uppercase"
              style={{ color: theme.text }}
            />
            <button
              type="button"
              onClick={handleCopyHex}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer shrink-0"
              title="Скопировать HEX"
            >
              {copied ? <Check size={14} className="text-emerald-500 stroke-[3]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* RGB Value Label */}
        <div className="flex items-center justify-between text-[11px] font-mono px-1 opacity-60">
          <span>RGB: {currentRgb.r}, {currentRgb.g}, {currentRgb.b}</span>
          <span>{currentHex.toUpperCase()}</span>
        </div>

        {/* Pastel Quick Presets */}
        <div className="space-y-1 pt-0.5">
          <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider">
            Цвета
          </div>
          <div className="flex items-center justify-between gap-1">
            {BASE_8_COLORS.map(color => {
              const isMatch = currentHex.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    const parsed = hexToHsv(color);
                    setHsv(parsed);
                    setHexInput(color.toUpperCase());
                  }}
                  className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center relative ${
                    isMatch ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: hexToRgba(theme.text, 0.15),
                  }}
                  title={color}
                >
                  {isMatch && (
                    <Check
                      size={11}
                      className="stroke-[3]"
                      style={{ color: isLightColor(color) ? '#0F172A' : '#FFFFFF' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 transition cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(currentHex);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            style={{
              backgroundColor: currentHex,
              color: isLightColor(currentHex) ? '#0F172A' : '#FFFFFF',
            }}
          >
            <Check size={13} className="stroke-[3]" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
