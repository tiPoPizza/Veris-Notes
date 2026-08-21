import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { useApp } from '../context/AppContext';

export interface CustomSelectOption<T> {
  value: T;
  label: string;
  cssFamily?: string;
  supportsCyrillic?: boolean;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  className?: string;
  direction?: 'up' | 'down' | 'auto';
  align?: 'left' | 'right';
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  className = '',
  direction = 'auto',
  align = 'right',
}: CustomSelectProps<T>) {
  const { theme } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [autoUpward, setAutoUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isLight = isLightColor(theme.bg);
  const cardBg = isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.96);
  const cardBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : hexToRgba(theme.text, 0.18);

  const selectedOption = options.find(o => o.value === value) || options[0];

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 250 && spaceAbove > 180) {
        setAutoUpward(true);
      } else {
        setAutoUpward(false);
      }
    }
    setIsOpen(prev => !prev);
  };

  const isOpeningUpward = direction === 'up' || (direction === 'auto' && autoUpward);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 active:scale-98 cursor-pointer"
        style={{
          backgroundColor: hexToRgba(theme.text, 0.08),
          borderColor: cardBorder,
          color: theme.text,
        }}
      >
        <span
          className="truncate max-w-[170px] sm:max-w-[220px]"
          style={{ fontFamily: selectedOption?.cssFamily ? selectedOption.cssFamily : undefined }}
        >
          {selectedOption?.label || value}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} w-52 sm:w-60 max-h-56 overflow-y-auto rounded-2xl p-1.5 shadow-2xl border backdrop-blur-2xl z-50 animate-fadeIn space-y-1 ${
            isOpeningUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            color: theme.text,
            boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                  isSelected ? 'font-extrabold shadow-xs' : 'hover:bg-white/10 opacity-85 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isSelected ? hexToRgba(theme.accent, 0.15) : 'transparent',
                  color: isSelected ? theme.accent : theme.text,
                }}
              >
                <span
                  className="truncate text-xs sm:text-sm"
                  style={{ fontFamily: option.cssFamily ? option.cssFamily : undefined }}
                >
                  {option.label}
                </span>
                {isSelected && <Check size={14} style={{ color: theme.accent }} className="shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
