import React, { useState } from 'react';
import { Sun, Moon, Check, X, ChevronDown, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ALL_THEMES, hexToRgba, isLightColor } from '../themes';
import { ThemePreset } from '../types';
import { CustomTimePicker } from './CustomTimePicker';

interface ThemeSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSchedulerModal: React.FC<ThemeSchedulerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    theme,
    themeSchedule,
    updateThemeSchedule,
  } = useApp();

  const [activePicker, setActivePicker] = useState<'day' | 'night' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrightness, setFilterBrightness] = useState<'all' | 'light' | 'dark'>('all');

  if (!isOpen) return null;

  const isLight = isLightColor(theme.bg);
  const modalBg = isLight ? '#FFFFFF' : (theme.bg.startsWith('#') ? theme.bg : '#18181B');
  const cardBg = hexToRgba(theme.text, 0.04);
  const cardBorder = hexToRgba(theme.text, 0.12);

  const dayTheme = ALL_THEMES.find(t => t.id === themeSchedule.dayThemeId) || ALL_THEMES[0];
  const nightTheme = ALL_THEMES.find(t => t.id === themeSchedule.nightThemeId) || ALL_THEMES[1] || ALL_THEMES[0];

  const filteredThemes = ALL_THEMES.filter(t => {
    if (filterBrightness === 'light' && !isLightColor(t.bg)) return false;
    if (filterBrightness === 'dark' && isLightColor(t.bg)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
  });

  const handleSelectTheme = (selected: ThemePreset) => {
    if (activePicker === 'day') {
      updateThemeSchedule({ dayThemeId: selected.id });
    } else if (activePicker === 'night') {
      updateThemeSchedule({ nightThemeId: selected.id });
    }
    setActivePicker(null);
    setSearchQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-4 sm:p-5 shadow-2xl border flex flex-col max-h-[90vh] transition-all"
        style={{
          backgroundColor: modalBg,
          borderColor: cardBorder,
          color: theme.text,
          boxShadow: isLight ? '0 16px 40px rgba(0,0,0,0.15)' : '0 20px 50px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Title + Toggle Switch + Divider Bar + Close Button */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: cardBorder }}>
          <span className="text-sm sm:text-base font-bold tracking-tight">Смена тем</span>

          <div className="flex items-center gap-2.5">
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => updateThemeSchedule({ enabled: !themeSchedule.enabled })}
              className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
              style={{
                backgroundColor: themeSchedule.enabled ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
              title={themeSchedule.enabled ? 'Включено' : 'Выключено'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  themeSchedule.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            {/* Палка-разделитель между тумблером и крестиком */}
            <div
              className="w-px h-4 opacity-25 shrink-0"
              style={{ backgroundColor: theme.text }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl opacity-60 hover:opacity-100 transition cursor-pointer"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Grouped Day & Night Card with Divider Bar */}
        <div className="py-3 space-y-3 overflow-y-auto flex-1">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            {/* Day Section */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Sun size={15} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-bold">День</span>
                  <span className="text-xs opacity-60">с</span>
                </div>

                {/* Custom Clock (like in calendar) */}
                <div className="w-28 shrink-0">
                  <CustomTimePicker
                    value={themeSchedule.dayStartTime || '06:00'}
                    onChange={val => updateThemeSchedule({ dayStartTime: val })}
                  />
                </div>
              </div>

              {/* Full-width Theme Selector Button so names fit completely */}
              <button
                type="button"
                onClick={() => {
                  setActivePicker(activePicker === 'day' ? null : 'day');
                  setFilterBrightness('light');
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: modalBg,
                  borderColor: activePicker === 'day' ? theme.accent : cardBorder,
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 border"
                    style={{
                      backgroundColor: dayTheme.accent,
                      borderColor: hexToRgba(dayTheme.text, 0.2),
                    }}
                  />
                  <span className="truncate font-bold text-left">{dayTheme.name}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`shrink-0 opacity-60 transition-transform duration-200 ml-2 ${activePicker === 'day' ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Палка-разделитель между блоками дня и ночи */}
            <div className="h-px w-full" style={{ backgroundColor: cardBorder }} />

            {/* Night Section */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Moon size={15} className="text-sky-400 shrink-0" />
                  <span className="text-xs font-bold">Ночь</span>
                  <span className="text-xs opacity-60">с</span>
                </div>

                {/* Custom Clock (like in calendar) */}
                <div className="w-28 shrink-0">
                  <CustomTimePicker
                    value={themeSchedule.nightStartTime || '20:00'}
                    onChange={val => updateThemeSchedule({ nightStartTime: val })}
                  />
                </div>
              </div>

              {/* Full-width Theme Selector Button so names fit completely */}
              <button
                type="button"
                onClick={() => {
                  setActivePicker(activePicker === 'night' ? null : 'night');
                  setFilterBrightness('dark');
                  setSearchQuery('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-[0.99]"
                style={{
                  backgroundColor: modalBg,
                  borderColor: activePicker === 'night' ? theme.accent : cardBorder,
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 border"
                    style={{
                      backgroundColor: nightTheme.accent,
                      borderColor: hexToRgba(nightTheme.text, 0.2),
                    }}
                  />
                  <span className="truncate font-bold text-left">{nightTheme.name}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`shrink-0 opacity-60 transition-transform duration-200 ml-2 ${activePicker === 'night' ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Inline Minimalist Theme Picker */}
          {activePicker && (
            <div
              className="p-2.5 rounded-2xl border space-y-2 animate-fadeIn"
              style={{ backgroundColor: cardBg, borderColor: theme.accent }}
            >
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs" style={{ backgroundColor: modalBg, borderColor: cardBorder }}>
                <Search size={12} className="opacity-40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск темы..."
                  className="w-full bg-transparent outline-none text-xs placeholder:opacity-40"
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="opacity-40 hover:opacity-100">
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {filteredThemes.map(t => {
                  const isSelected = activePicker === 'day' ? themeSchedule.dayThemeId === t.id : themeSchedule.nightThemeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t)}
                      className={`p-1.5 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: t.bg,
                        borderColor: isSelected ? theme.accent : hexToRgba(t.text, 0.15),
                        color: t.text,
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: t.accent }}
                      >
                        {isSelected && <Check size={7} strokeWidth={3} className="text-white" />}
                      </div>
                      <span className="text-[11px] font-semibold truncate flex-1">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSchedulerModal;
