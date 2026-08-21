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
    notes,
    updateNote,
  } = useApp();

  if (!isQuickSettingsOpen) return null;

  const activeNote = notes.find(n => n.id === activeNoteId);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = hexToRgba(theme.text, 0.12);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => setIsQuickSettingsOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl transition-all border backdrop-blur-2xl animate-fadeIn max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: hexToRgba(theme.bg, 0.94),
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 20px 40px ${hexToRgba(theme.text, 0.15)}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b shrink-0" style={{ borderColor: cardBorder }}>
          <h3 className="text-sm font-bold tracking-wide uppercase opacity-90">{t('quickSettings')}</h3>
          <button
            onClick={() => setIsQuickSettingsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Settings Controls - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-0.5 min-h-0">
          {/* Toggle: Obvodka paneley */}
          <div
            className="flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            onClick={() => handleToggle('showBorder')}
          >
            <span className="text-xs font-medium">Обводка панелей</span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                quickSettings.showBorder ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Toggle: Schetchik simvolov */}
          <div
            className="flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            onClick={() => handleToggle('showCharCount')}
          >
            <span className="text-xs font-medium">Счётчик символов</span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                quickSettings.showCharCount ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: quickSettings.showCharCount ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Toggle: Data izmeneniya */}
          <div
            className="flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            onClick={() => handleToggle('showDate')}
          >
            <span className="text-xs font-medium">Дата изменения</span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                quickSettings.showDate ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: quickSettings.showDate ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Toggle: Odnorazovoe formatirovanie */}
          <div
            className="flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
            onClick={() => handleToggle('oneTimeFormatting')}
          >
            <span className="text-xs font-medium">Одноразовое форматирование</span>
            <div
              className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                quickSettings.oneTimeFormatting ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: quickSettings.oneTimeFormatting ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </div>
          </div>

          {/* Font Size Adjuster */}
          <div
            className="flex items-center justify-between py-2 px-3 rounded-xl border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <span className="text-xs font-medium">Размер шрифта</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFontSizeChange(-1)}
                className="w-6 h-6 rounded-lg flex items-center justify-center border hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder }}
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold w-8 text-center">{quickSettings.fontSize}</span>
              <button
                onClick={() => handleFontSizeChange(1)}
                className="w-6 h-6 rounded-lg flex items-center justify-center border hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Line Height Control */}
          <div
            className="flex items-center justify-between py-1.5 px-3 rounded-xl border min-h-[40px]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <span className="text-xs font-medium">Межстрочный интервал</span>
            <CustomSelect
              value={quickSettings.lineHeight || 1.6}
              onChange={val => setQuickSettings(prev => ({ ...prev, lineHeight: val }))}
              options={LINE_HEIGHT_OPTIONS}
              direction="up"
              align="right"
            />
          </div>

          {/* Font Family Selection */}
          <div
            className="flex items-center justify-between py-1.5 px-3 rounded-xl border min-h-[40px]"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <span className="text-xs font-medium">Шрифт системы</span>
            <CustomSelect
              value={quickSettings.fontFamily || 'sans'}
              onChange={val => setQuickSettings(prev => ({ ...prev, fontFamily: val }))}
              options={FONT_FAMILY_OPTIONS}
              direction="up"
              align="right"
            />
          </div>
        </div>

        {/* Footer: Export and All Settings buttons */}
        <div className="space-y-2 pt-3 border-t shrink-0 mt-2" style={{ borderColor: cardBorder }}>
          <button
            onClick={handleExportClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-98 transition cursor-pointer"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
          >
            <Download size={14} />
            <span>Экспортировать заметку</span>
          </button>

          <button
            onClick={() => {
              setIsQuickSettingsOpen(false);
              setViewMode('settings');
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-bold text-xs hover:bg-white/10 active:scale-98 transition cursor-pointer"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: theme.text,
            }}
          >
            <Settings size={14} />
            {t('allSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};
