import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { X, Minus, Plus, Settings, Download } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { CustomSelect } from './CustomSelect';
import { FONT_FAMILY_OPTIONS } from '../utils/fonts';

const LINE_HEIGHT_OPTIONS = [
  { value: 1.2, label: '1.2' },
  { value: 1.4, label: '1.4' },
  { value: 1.6, label: '1.6' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0' },
];

export const QuickSettingsModal: React.FC = () => {
  const {
    isQuickSettingsOpen,
    setIsQuickSettingsOpen,
    quickSettings,
    setQuickSettings,
    language,
    setViewMode,
    theme,
    openExportModal,
    activeNoteId,
  } = useApp();

  if (!isQuickSettingsOpen) return null;

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  const cardBg = hexToRgba(theme.text, 0.04);
  const cardBorder = hexToRgba(theme.text, 0.1);
  const dividerColor = hexToRgba(theme.text, 0.07);

  const handleToggle = (key: keyof typeof quickSettings) => {
    setQuickSettings(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleFontSizeChange = (delta: number) => {
    setQuickSettings(prev => ({
      ...prev,
      fontSize: Math.min(28, Math.max(10, prev.fontSize + delta)),
    }));
  };

  const handleExportClick = () => {
    setIsQuickSettingsOpen(false);
    openExportModal(activeNoteId || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={() => setIsQuickSettingsOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 transition-all border animate-fadeIn max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: isLight
            ? '0 16px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)'
            : '0 16px 40px rgba(0, 0, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 mb-2.5 shrink-0">
          <h3 className="text-xs font-bold tracking-wider uppercase opacity-80">{t('quickSettings')}</h3>
          <button
            onClick={() => setIsQuickSettingsOpen(false)}
            className="p-1 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Recomposed content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-0.5 pr-0.5 min-h-0">
          {/* Group 1: Параметры отображения (Unified Grouped Card) */}
          <div
            className="rounded-2xl border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {/* Обводка панелей */}
            <div
              className="flex items-center justify-between py-2.5 px-3.5 rounded-t-2xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => handleToggle('showBorder')}
            >
              <span className="text-xs font-medium">Обводка панелей</span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  quickSettings.showBorder ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  backgroundColor: quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.2),
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            <div className="h-px mx-3" style={{ backgroundColor: dividerColor }} />

            {/* Счётчик символов */}
            <div
              className="flex items-center justify-between py-2.5 px-3.5 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => handleToggle('showCharCount')}
            >
              <span className="text-xs font-medium">{t('charCounter')}</span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  quickSettings.showCharCount ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  backgroundColor: quickSettings.showCharCount ? theme.accent : hexToRgba(theme.text, 0.2),
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            <div className="h-px mx-3" style={{ backgroundColor: dividerColor }} />

            {/* Счётчик слов */}
            <div
              className="flex items-center justify-between py-2.5 px-3.5 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => handleToggle('showWordCount')}
            >
              <span className="text-xs font-medium">{t('wordCounter')}</span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  quickSettings.showWordCount ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  backgroundColor: quickSettings.showWordCount ? theme.accent : hexToRgba(theme.text, 0.2),
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            <div className="h-px mx-3" style={{ backgroundColor: dividerColor }} />

            {/* Дата изменения */}
            <div
              className="flex items-center justify-between py-2.5 px-3.5 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => handleToggle('showDate')}
            >
              <span className="text-xs font-medium">Дата изменения</span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  quickSettings.showDate ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  backgroundColor: quickSettings.showDate ? theme.accent : hexToRgba(theme.text, 0.2),
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </div>

            <div className="h-px mx-3" style={{ backgroundColor: dividerColor }} />

            {/* Одноразовое форматирование */}
            <div
              className="flex items-center justify-between py-2.5 px-3.5 rounded-b-2xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
              onClick={() => handleToggle('oneTimeFormatting')}
            >
              <span className="text-xs font-medium">Одноразовое форматирование</span>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  quickSettings.oneTimeFormatting ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  backgroundColor: quickSettings.oneTimeFormatting ? theme.accent : hexToRgba(theme.text, 0.2),
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </div>
            </div>
          </div>

          {/* Group 2: Типографика (Unified Grouped Card) */}
          <div
            className="rounded-2xl border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {/* Top row: Размер шрифта + Межстрочный интервал */}
            <div className="flex items-center rounded-t-2xl">
              {/* Размер шрифта */}
              <div className="flex-1 flex items-center justify-between py-2 px-3">
                <span className="text-xs font-medium opacity-85">Размер</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleFontSizeChange(-1)}
                    className="w-5.5 h-5.5 rounded-md flex items-center justify-center border hover:bg-white/10 active:scale-95 transition cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-xs font-bold w-6 text-center">{quickSettings.fontSize}</span>
                  <button
                    onClick={() => handleFontSizeChange(1)}
                    className="w-5.5 h-5.5 rounded-md flex items-center justify-center border hover:bg-white/10 active:scale-95 transition cursor-pointer"
                    style={{ borderColor: cardBorder }}
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>

              {/* Межстрочный интервал */}
              <div className="flex-1 flex items-center justify-between py-2 px-3">
                <span className="text-xs font-medium opacity-85">Интервал</span>
                <CustomSelect
                  value={quickSettings.lineHeight || 1.6}
                  onChange={val => setQuickSettings(prev => ({ ...prev, lineHeight: val }))}
                  options={LINE_HEIGHT_OPTIONS}
                  direction="auto"
                  align="right"
                />
              </div>
            </div>

            <div className="h-px mx-3" style={{ backgroundColor: dividerColor }} />

            {/* Bottom row: Шрифт системы */}
            <div className="flex items-center justify-between py-2 px-3.5 rounded-b-2xl">
              <span className="text-xs font-medium opacity-85">Шрифт</span>
              <CustomSelect
                value={quickSettings.fontFamily || 'sans'}
                onChange={val => setQuickSettings(prev => ({ ...prev, fontFamily: val }))}
                options={FONT_FAMILY_OPTIONS}
                direction="auto"
                align="right"
              />
            </div>
          </div>
        </div>

        {/* Group 3: Нижние действия (Side-by-side) */}
        <div className="flex items-center gap-2 pt-2.5 shrink-0 mt-1">
          <button
            onClick={handleExportClick}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-98 transition cursor-pointer"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
          >
            <Download size={13} />
            <span className="truncate">Экспорт</span>
          </button>

          <button
            onClick={() => {
              setIsQuickSettingsOpen(false);
              setViewMode('settings');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-98 transition cursor-pointer"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
          >
            <Settings size={13} />
            <span className="truncate">{t('allSettings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
