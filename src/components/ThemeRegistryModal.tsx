import React, { useState, useMemo, useEffect } from 'react';
import { ThemePreset } from '../types';
import { THEME_CATEGORIES, ALL_THEMES, hexToRgba, isLightColor } from '../themes';
import {
  X,
  RotateCcw,
  Check,
  Search,
} from 'lucide-react';

export interface ThemeFilters {
  brightness: ('light' | 'dark')[];
  temperature: ('warm' | 'cool' | 'mixed')[];
  contrast: ('high' | 'medium')[];
  mood: ('calm' | 'vibrant')[];
  accentTone: ('warm' | 'cool' | 'neutral')[];
  saturation: ('rich' | 'muted')[];
  search: string;
}

export const DEFAULT_THEME_FILTERS: ThemeFilters = {
  brightness: [],
  temperature: [],
  contrast: [],
  mood: [],
  accentTone: [],
  saturation: [],
  search: '',
};

interface ThemeRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
  filters: ThemeFilters;
  onFiltersChange: (filters: ThemeFilters) => void;
}

export const matchThemeWithFilters = (preset: ThemePreset, filters: ThemeFilters): boolean => {
  const tags = preset.tags;
  if (!tags) return true;

  if (filters.brightness.length > 0 && !filters.brightness.includes(tags.brightness)) return false;
  if (filters.temperature.length > 0 && !filters.temperature.includes(tags.temperature)) return false;
  if (filters.contrast.length > 0 && !filters.contrast.includes(tags.contrast)) return false;
  if (filters.mood.length > 0 && !filters.mood.includes(tags.mood)) return false;
  if (filters.accentTone.length > 0 && !filters.accentTone.includes(tags.accentTone)) return false;
  if (filters.saturation.length > 0 && !filters.saturation.includes(tags.saturation)) return false;

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const nameMatch = preset.name.toLowerCase().includes(q);
    const catMatch = preset.category.toLowerCase().includes(q);
    if (!nameMatch && !catMatch) return false;
  }

  return true;
};

export const ThemeRegistryModal: React.FC<ThemeRegistryModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  filters,
  onFiltersChange,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(currentTheme);

  useEffect(() => {
    if (isOpen) {
      setSelectedTheme(currentTheme);
    }
  }, [isOpen, currentTheme]);

  const isLight = isLightColor(currentTheme.bg);
  const modalBg = isLight ? '#FFFFFF' : '#18181B';
  const modalBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
  const surfaceBg = hexToRgba(currentTheme.text, 0.04);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    count += filters.brightness.length;
    count += filters.temperature.length;
    count += filters.contrast.length;
    count += filters.mood.length;
    count += filters.accentTone.length;
    count += filters.saturation.length;
    if (filters.search.trim().length > 0) count++;
    return count;
  }, [filters]);

  const filteredCategories = useMemo(() => {
    return THEME_CATEGORIES.map(category => {
      const matchingThemes = category.themes.filter(theme =>
        matchThemeWithFilters(theme, filters)
      );
      return {
        ...category,
        themes: matchingThemes,
      };
    }).filter(category => category.themes.length > 0);
  }, [filters]);

  const totalMatchingThemes = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.themes.length, 0);
  }, [filteredCategories]);

  const handleResetFilters = () => {
    onFiltersChange(DEFAULT_THEME_FILTERS);
  };

  const toggleFilterOption = <K extends keyof Omit<ThemeFilters, 'search'>>(
    key: K,
    value: ThemeFilters[K][number]
  ) => {
    const currentList = (filters[key] as unknown[]) || [];
    const exists = currentList.includes(value);
    const nextList = exists
      ? currentList.filter(item => item !== value)
      : [...currentList, value];

    onFiltersChange({
      ...filters,
      [key]: nextList,
    });
  };

  const handleApply = () => {
    onSelectTheme(selectedTheme);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all relative"
        style={{
          backgroundColor: modalBg,
          borderColor: modalBorder,
          color: currentTheme.text,
        }}
      >
        {/* Floating Close Button (matching settings top button style) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-2xl border shadow-lg backdrop-blur-xl hover:opacity-80 active:scale-95 transition flex items-center justify-center cursor-pointer"
          style={{
            backgroundColor: hexToRgba(currentTheme.text, 0.08),
            borderColor: hexToRgba(currentTheme.text, 0.12),
            color: currentTheme.text,
          }}
          title="Закрыть"
        >
          <X size={18} />
        </button>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 pb-24">
          {/* Header Title inside scrollable body so it scrolls away */}
          <div className="pt-1 pb-1 text-center">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Фильтры тем
            </h1>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
            />
            <input
              type="text"
              value={filters.search}
              onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Поиск по названию или категории..."
              className="w-full pl-9.5 pr-4 py-2 text-xs font-semibold rounded-2xl border outline-none transition"
              style={{
                backgroundColor: surfaceBg,
                borderColor: modalBorder,
                color: currentTheme.text,
              }}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Groups */}
          <div className="space-y-3.5 p-3.5 rounded-2xl border" style={{ borderColor: modalBorder, backgroundColor: surfaceBg }}>
            {/* 1. Brightness */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Яркость / Тип
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'light', label: 'Светлая' },
                  { value: 'dark', label: 'Тёмная' },
                ].map(opt => {
                  const isFilterActive = filters.brightness.includes(opt.value as 'light' | 'dark');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('brightness', opt.value as 'light' | 'dark')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Temperature */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Температура
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'warm', label: 'Тёплая' },
                  { value: 'cool', label: 'Холодная' },
                  { value: 'mixed', label: 'Смешанная' },
                ].map(opt => {
                  const isFilterActive = filters.temperature.includes(opt.value as 'warm' | 'cool' | 'mixed');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('temperature', opt.value as 'warm' | 'cool' | 'mixed')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Contrast */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Контрастность
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'high', label: 'Высокая' },
                  { value: 'medium', label: 'Средняя' },
                ].map(opt => {
                  const isFilterActive = filters.contrast.includes(opt.value as 'high' | 'medium');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('contrast', opt.value as 'high' | 'medium')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Mood */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Настроение
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'calm', label: 'Спокойная' },
                  { value: 'vibrant', label: 'Яркая' },
                ].map(opt => {
                  const isFilterActive = filters.mood.includes(opt.value as 'calm' | 'vibrant');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('mood', opt.value as 'calm' | 'vibrant')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Accent Tone */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Акцент
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'warm', label: 'Тёплый' },
                  { value: 'cool', label: 'Холодный' },
                  { value: 'neutral', label: 'Нейтральный' },
                ].map(opt => {
                  const isFilterActive = filters.accentTone.includes(opt.value as 'warm' | 'cool' | 'neutral');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('accentTone', opt.value as 'warm' | 'cool' | 'neutral')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Saturation */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                Насыщенность
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'rich', label: 'Насыщенная' },
                  { value: 'muted', label: 'Приглушённая' },
                ].map(opt => {
                  const isFilterActive = filters.saturation.includes(opt.value as 'rich' | 'muted');
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleFilterOption('saturation', opt.value as 'rich' | 'muted')}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isFilterActive ? 'shadow-xs font-bold' : 'opacity-65 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isFilterActive ? currentTheme.accent : hexToRgba(currentTheme.text, 0.06),
                        color: isFilterActive ? '#FFFFFF' : currentTheme.text,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Counter & Quick Reset */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-bold">
              Найдено: <span style={{ color: currentTheme.accent }}>{totalMatchingThemes}</span> из{' '}
              {ALL_THEMES.length} тем
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ color: currentTheme.accent }}
              >
                <RotateCcw size={12} />
                <span>Сбросить фильтры</span>
              </button>
            )}
          </div>

          {/* Filtered Themes Registry List - always 2 items per row, no tags */}
          {totalMatchingThemes === 0 ? (
            <div className="py-12 text-center space-y-2 opacity-60">
              <p className="text-sm font-bold">Нет тем, соответствующих выбранным фильтрам</p>
              <p className="text-xs">Попробуйте смягчить параметры поиска</p>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {filteredCategories.map(category => (
                <div key={category.id} className="space-y-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                    <span>{category.name}</span>
                    <span className="opacity-40 font-normal">{category.themes.length}</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {category.themes.map(preset => {
                      const isCardSelected = selectedTheme.id === preset.id;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => setSelectedTheme(preset)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative shadow-xs hover:shadow-md ${
                            isCardSelected ? 'ring-2 shadow-lg' : 'hover:scale-[1.01]'
                          }`}
                          style={{
                            backgroundColor: preset.bg,
                            borderColor: isCardSelected
                              ? preset.accent
                              : hexToRgba(preset.text, 0.2),
                            color: preset.text,
                          }}
                        >
                          {/* Mini Screen Header without divider */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs truncate">{preset.name}</span>
                            {isCardSelected && (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: preset.accent }}
                              >
                                <Check size={10} />
                              </div>
                            )}
                          </div>

                          {/* Mini Body Preview */}
                          <div
                            className="p-2 rounded-xl border space-y-1"
                            style={{
                              backgroundColor: hexToRgba(preset.text, 0.04),
                              borderColor: hexToRgba(preset.text, 0.1),
                            }}
                          >
                            <div className="font-bold text-[11px] opacity-90 truncate">
                              Заголовок
                            </div>
                            <div className="text-[10px] opacity-70 leading-tight truncate">
                              Текст заметки
                            </div>
                            <div className="pt-1 flex items-center justify-between">
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                                style={{
                                  backgroundColor: hexToRgba(preset.accent, 0.2),
                                  color: preset.accent,
                                }}
                              >
                                Акцент
                              </span>
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: preset.accent }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating "Применить" Button in "Создать" style */}
        <div className="absolute bottom-5 inset-x-0 z-40 pointer-events-none flex justify-center px-4">
          <button
            type="button"
            onClick={handleApply}
            className="pointer-events-auto flex items-center justify-center px-6 py-3 rounded-2xl text-xs font-extrabold shadow-xl backdrop-blur-xl border hover:opacity-80 active:scale-95 transition cursor-pointer"
            style={{
              backgroundColor: hexToRgba(currentTheme.text, 0.08),
              borderColor: hexToRgba(currentTheme.text, 0.12),
              color: currentTheme.text,
            }}
          >
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
