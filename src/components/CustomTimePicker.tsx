import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Clock, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

interface CustomTimePickerProps {
  value: string; // 'HH:mm' e.g. '14:30' or ''
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Выберите время',
  allowClear = false,
  className = '',
}) => {
  const { theme } = useApp();
  const isLight = isLightColor(theme.bg);

  const [isOpen, setIsOpen] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'hours' | 'minutes'>('hours');
  const [pickerMode, setPickerMode] = useState<'dial' | 'grid'>('dial');

  // Local state for time during selection
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);

  // Parse value prop on open or change
  useEffect(() => {
    if (value && value.includes(':')) {
      const parts = value.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h)) setHours(Math.max(0, Math.min(23, h)));
      if (!isNaN(m)) setMinutes(Math.max(0, Math.min(59, m)));
    } else {
      const now = new Date();
      setHours(now.getHours());
      setMinutes(Math.floor(now.getMinutes() / 5) * 5);
    }
  }, [value, isOpen]);

  const formatDigits = (num: number) => String(num).padStart(2, '0');
  const formattedTime = value ? value : '';

  const handleApply = (h = hours, m = minutes) => {
    const timeStr = `${formatDigits(h)}:${formatDigits(m)}`;
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleSelectHour = (h: number) => {
    setHours(h);
    // Smooth transition to selecting minutes after picking hour in dial mode
    setActiveSegment('minutes');
  };

  const handleSelectMinute = (m: number) => {
    setMinutes(m);
  };

  const handleQuickPreset = (presetH: number, presetM: number) => {
    setHours(presetH);
    setMinutes(presetM);
    handleApply(presetH, presetM);
  };

  const setNow = () => {
    const d = new Date();
    setHours(d.getHours());
    setMinutes(d.getMinutes());
    handleApply(d.getHours(), d.getMinutes());
  };

  // Clock face angle calculations
  const hourAngle = ((hours % 12) / 12) * 360;
  const isOuterHour = hours >= 1 && hours <= 12;
  const hourHandLength = isOuterHour ? 68 : 46;

  const minuteAngle = (minutes / 60) * 360;
  const minuteHandLength = 70;

  const modalBg = isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98);
  const cardBorder = hexToRgba(theme.text, 0.16);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setActiveSegment('hours');
          }}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer hover:border-accent"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.05),
            borderColor: isOpen ? theme.accent : hexToRgba(theme.text, 0.14),
            color: theme.text,
          }}
        >
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: theme.accent }} className="shrink-0" />
            <span className={formattedTime ? 'font-bold' : 'opacity-50'}>
              {formattedTime || placeholder}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {allowClear && formattedTime && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-2 rounded-xl border opacity-60 hover:opacity-100 transition cursor-pointer shrink-0"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.05),
              borderColor: hexToRgba(theme.text, 0.14),
              color: theme.text,
            }}
            title="Очистить время"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Centered Modal Overlay for Custom Clock */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-[310px] rounded-3xl p-5 shadow-2xl border backdrop-blur-2xl animate-scaleUp space-y-3.5 max-h-[95vh] overflow-y-auto"
              style={{
                backgroundColor: modalBg,
                borderColor: cardBorder,
                color: theme.text,
                boxShadow: `0 24px 48px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.7)'}`,
              }}
              onClick={e => e.stopPropagation()}
            >
            {/* Header with Title & Close Button */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: theme.accent }} />
                <span className="text-xs font-extrabold tracking-wide">
                  {label || 'Выбор точного времени'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
                style={{ color: theme.text }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Digital Time Display (Hours : Minutes Switcher) */}
            <div className="flex items-center justify-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => setActiveSegment('hours')}
                className={`px-3.5 py-1.5 rounded-2xl text-2xl font-mono font-black transition cursor-pointer border ${
                  activeSegment === 'hours' ? 'scale-105 shadow-md' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    activeSegment === 'hours'
                      ? hexToRgba(theme.accent, 0.18)
                      : hexToRgba(theme.text, 0.05),
                  borderColor: activeSegment === 'hours' ? theme.accent : 'transparent',
                  color: activeSegment === 'hours' ? theme.accent : theme.text,
                }}
              >
                {formatDigits(hours)}
              </button>

              <span className="text-xl font-bold font-mono opacity-50 animate-pulse">:</span>

              <button
                type="button"
                onClick={() => setActiveSegment('minutes')}
                className={`px-3.5 py-1.5 rounded-2xl text-2xl font-mono font-black transition cursor-pointer border ${
                  activeSegment === 'minutes' ? 'scale-105 shadow-md' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    activeSegment === 'minutes'
                      ? hexToRgba(theme.accent, 0.18)
                      : hexToRgba(theme.text, 0.05),
                  borderColor: activeSegment === 'minutes' ? theme.accent : 'transparent',
                  color: activeSegment === 'minutes' ? theme.accent : theme.text,
                }}
              >
                {formatDigits(minutes)}
              </button>
            </div>

            {/* Mode Switcher: Dial vs Quick Grid */}
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider">
                {activeSegment === 'hours' ? 'Выберите часы' : 'Выберите минуты'}
              </span>

              {/* Segment Switcher with clear theme colors */}
              <div
                className="flex items-center gap-1 p-0.5 rounded-xl border text-[11px] font-bold"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: hexToRgba(theme.text, 0.12),
                }}
              >
                <button
                  type="button"
                  onClick={() => setPickerMode('dial')}
                  className="px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold"
                  style={{
                    backgroundColor: pickerMode === 'dial' ? theme.accent : 'transparent',
                    color: pickerMode === 'dial' ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                    opacity: pickerMode === 'dial' ? 1 : 0.6,
                  }}
                >
                  Циферблат
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode('grid')}
                  className="px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold"
                  style={{
                    backgroundColor: pickerMode === 'grid' ? theme.accent : 'transparent',
                    color: pickerMode === 'grid' ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                    opacity: pickerMode === 'grid' ? 1 : 0.6,
                  }}
                >
                  Список
                </button>
              </div>
            </div>

            {/* View 1: Interactive Clock Face Dial */}
            {pickerMode === 'dial' ? (
              <div className="flex flex-col items-center py-1">
                <div
                  className="relative w-[210px] h-[210px] rounded-full border flex items-center justify-center select-none shadow-inner"
                  style={{
                    backgroundColor: hexToRgba(theme.text, 0.03),
                    borderColor: hexToRgba(theme.text, 0.12),
                  }}
                >
                  {/* Center Pin */}
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full z-20 shadow-sm"
                    style={{ backgroundColor: theme.accent }}
                  />

                  {/* Clock Hand Pointer */}
                  <div
                    className="absolute z-10 origin-bottom transition-all duration-200 pointer-events-none"
                    style={{
                      width: '2px',
                      height: `${activeSegment === 'hours' ? hourHandLength : minuteHandLength}px`,
                      backgroundColor: theme.accent,
                      transform: `translateY(-50%) rotate(${
                        activeSegment === 'hours' ? hourAngle : minuteAngle
                      }deg)`,
                      transformOrigin: '50% 100%',
                      top: '50%',
                      left: 'calc(50% - 1px)',
                    }}
                  >
                    {/* Circle tip on the selected item */}
                    <div
                      className="absolute -top-3 -left-2.5 w-6 h-6 rounded-full opacity-25 animate-pulse"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>

                  {/* Dial Numbers: Hours Mode */}
                  {activeSegment === 'hours' && (
                    <>
                      {/* Outer Ring: 1 to 12 */}
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const radius = 72; // outer radius
                        const x = radius * Math.sin(angle);
                        const y = -radius * Math.cos(angle);
                        const isSelected = hours === h || (h === 12 && (hours === 12 || hours === 0));

                        return (
                          <button
                            key={`hour-outer-${h}`}
                            type="button"
                            onClick={() => handleSelectHour(h)}
                            className={`absolute w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer z-20 ${
                              isSelected ? 'shadow-md scale-110 font-black' : 'opacity-75 hover:opacity-100'
                            }`}
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                              backgroundColor: isSelected ? theme.accent : 'transparent',
                              color: isSelected ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                            }}
                          >
                            {h}
                          </button>
                        );
                      })}

                      {/* Inner Ring: 00, 13, 14, ..., 23 */}
                      {[0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const radius = 46; // inner radius
                        const x = radius * Math.sin(angle);
                        const y = -radius * Math.cos(angle);
                        const isSelected = hours === h;

                        return (
                          <button
                            key={`hour-inner-${h}`}
                            type="button"
                            onClick={() => handleSelectHour(h)}
                            className={`absolute w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer z-20 ${
                              isSelected ? 'shadow-md scale-110 font-black' : 'opacity-50 hover:opacity-90'
                            }`}
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                              backgroundColor: isSelected ? theme.accent : 'transparent',
                              color: isSelected ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                            }}
                          >
                            {formatDigits(h)}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Dial Numbers: Minutes Mode (Step of 5) */}
                  {activeSegment === 'minutes' && (
                    <>
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const radius = 70;
                        const x = radius * Math.sin(angle);
                        const y = -radius * Math.cos(angle);
                        const isSelected = minutes === m;

                        return (
                          <button
                            key={`min-${m}`}
                            type="button"
                            onClick={() => handleSelectMinute(m)}
                            className={`absolute w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer z-20 ${
                              isSelected ? 'shadow-md scale-110 font-black' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{
                              transform: `translate(${x}px, ${y}px)`,
                              backgroundColor: isSelected ? theme.accent : 'transparent',
                              color: isSelected ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                            }}
                          >
                            {formatDigits(m)}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Minute Steppers (+1 / -1) when in minutes segment */}
                {activeSegment === 'minutes' && (
                  <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleSelectMinute((minutes - 1 + 60) % 60)}
                      className="px-2.5 py-1 rounded-xl border text-[11px] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
                      style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                    >
                      -1 мин
                    </button>
                    <span className="text-xs font-mono font-bold opacity-70">
                      {formatDigits(minutes)} мин
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectMinute((minutes + 1) % 60)}
                      className="px-2.5 py-1 rounded-xl border text-[11px] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
                      style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                    >
                      +1 мин
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* View 2: Quick Grid Scroller */
              <div className="max-h-[190px] overflow-y-auto pr-1 space-y-2">
                {activeSegment === 'hours' ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 24 }, (_, i) => i).map(h => {
                      const isSelected = hours === h;
                      return (
                        <button
                          key={`grid-hour-${h}`}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected ? 'shadow-xs font-black' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.04),
                            borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.1),
                            color: isSelected ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                          }}
                        >
                          {formatDigits(h)}:00
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                      const isSelected = minutes === m;
                      return (
                        <button
                          key={`grid-min-${m}`}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected ? 'shadow-xs font-black' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.04),
                            borderColor: isSelected ? theme.accent : hexToRgba(theme.text, 0.1),
                            color: isSelected ? (isLightColor(theme.accent) ? '#000000' : '#FFFFFF') : theme.text,
                          }}
                        >
                          :{formatDigits(m)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quick Presets Row */}
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: cardBorder }}>
              <div className="flex items-center justify-between text-[10px] font-bold opacity-50 uppercase tracking-wider">
                <span>Быстрый выбор</span>
                <button
                  type="button"
                  onClick={setNow}
                  className="hover:underline cursor-pointer flex items-center gap-1"
                  style={{ color: theme.accent }}
                >
                  <Sparkles size={10} />
                  <span>Сейчас</span>
                </button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { label: '09:00', h: 9, m: 0 },
                  { label: '12:00', h: 12, m: 0 },
                  { label: '15:00', h: 15, m: 0 },
                  { label: '18:00', h: 18, m: 0 },
                  { label: '21:00', h: 21, m: 0 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickPreset(preset.h, preset.m)}
                    className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition cursor-pointer shrink-0 opacity-70 hover:opacity-100"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.04),
                      borderColor: hexToRgba(theme.text, 0.12),
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Confirmation Action */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 rounded-2xl border text-xs font-bold transition opacity-70 hover:opacity-100 cursor-pointer"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  color: theme.text,
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleApply()}
                className="flex-1 py-2 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: theme.accent,
                  color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                }}
              >
                <Check size={14} />
                <span>Готово ({formatDigits(hours)}:{formatDigits(minutes)})</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

