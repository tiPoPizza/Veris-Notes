import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Check, Search, Type } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { FONT_FAMILY_OPTIONS, FontOption } from '../utils/fonts';

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFont: (fontValue: string, cssFamily: string, target?: 'cursor' | 'title') => void;
  currentFontValue?: string;
  activeTarget?: 'cursor' | 'title';
  onChangeTarget?: (target: 'cursor' | 'title') => void;
  currentTitleFontValue?: string;
}

export const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFont,
  currentFontValue = 'sans',
}) => {
  const { theme, quickSettings } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);
  const modalBg = hexToRgba(theme.bg, 0.95);

  const filteredFonts = FONT_FAMILY_OPTIONS.filter(font => {
    return (
      font.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      font.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activeSelectedValue = currentFontValue || quickSettings.fontFamily || 'sans';

  const handleFontClick = (font: FontOption) => {
    onSelectFont(font.value, font.cssFamily);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border backdrop-blur-2xl transition-all max-h-[85vh] flex flex-col animate-scaleUp"
        style={{
          backgroundColor: modalBg,
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 24px 48px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header without icon container and without divider line */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2.5">
            <Type size={20} style={{ color: theme.accent }} className="shrink-0" />
            <div>
              <h3 className="font-extrabold text-base leading-tight">Выбор шрифта</h3>
              <p className="text-xs opacity-60">Выберите шрифт для заметки</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="py-2 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <Search size={14} className="opacity-50 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск шрифта..."
              className="w-full bg-transparent border-none outline-hidden text-xs"
              style={{ color: theme.text }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100 cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Font List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 p-2 min-h-[220px]">
          {filteredFonts.length === 0 ? (
            <div className="text-center py-8 opacity-50 text-xs">Шрифты не найдены</div>
          ) : (
            filteredFonts.map(font => {
              const isSelected =
                font.value.toLowerCase() === activeSelectedValue.toLowerCase() ||
                (font.value === 'sans' && (!activeSelectedValue || activeSelectedValue === 'sans'));

              return (
                <div
                  key={font.value}
                  onClick={() => handleFontClick(font)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-2 shadow-sm'
                      : 'hover:bg-white/5 active:scale-[0.99]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? hexToRgba(theme.accent, 0.12) : cardBg,
                    borderColor: isSelected ? theme.accent : cardBorder,
                  }}
                >
                  {/* Top Row: Font Name + Badges / Checkmark */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-sm sm:text-base font-bold truncate"
                        style={{ fontFamily: font.cssFamily }}
                      >
                        {font.label}
                      </span>
                      {!font.supportsCyrillic && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-sans font-medium shrink-0">
                          Латиница
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] opacity-40 uppercase tracking-wider font-mono">
                        {font.category}
                      </span>
                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: theme.accent }}
                        >
                          <Check size={13} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Full Sample Pangram without truncation */}
                  <div
                    className="text-xs opacity-75 leading-relaxed break-words pt-0.5"
                    style={{ fontFamily: font.cssFamily }}
                  >
                    Съешь же ещё этих мягких французских булок (123)
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
