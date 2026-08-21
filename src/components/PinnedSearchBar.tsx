import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, X } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

interface PinnedSearchBarProps {
  isTasksMode?: boolean;
}

export const PinnedSearchBar: React.FC<PinnedSearchBarProps> = ({ isTasksMode = false }) => {
  const {
    searchQuery,
    setSearchQuery,
    searchTarget,
    setSearchTarget,
    theme,
  } = useApp();

  const isLight = isLightColor(theme.bg);

  return (
    <div
      className="w-full max-w-sm sm:max-w-md mx-auto mb-3 p-2 rounded-2xl border backdrop-blur-xl transition-all shadow-xs animate-in fade-in duration-150 shrink-0"
      style={{
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : hexToRgba(theme.text, 0.05),
        borderColor: hexToRgba(theme.text, 0.12),
      }}
    >
      {/* Compact Input row */}
      <div className="relative mb-1.5">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={isTasksMode ? 'Поиск задач...' : 'Поиск заметок...'}
          className="w-full py-1.5 pl-8 pr-7 rounded-xl text-xs font-medium border outline-hidden transition"
          style={{
            backgroundColor: hexToRgba(theme.text, isLight ? 0.04 : 0.06),
            borderColor: hexToRgba(theme.text, 0.12),
            color: theme.text,
          }}
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-50">
          <Search size={13} style={{ color: theme.accent }} />
        </div>
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md opacity-60 hover:opacity-100 cursor-pointer flex items-center justify-center transition"
            title="Очистить"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {/* Target Filter Segmented Buttons - Slim & Compact */}
      <div
        className="grid grid-cols-3 gap-1 p-0.5 rounded-xl border"
        style={{
          backgroundColor: hexToRgba(theme.text, 0.03),
          borderColor: hexToRgba(theme.text, 0.08),
        }}
      >
        <button
          type="button"
          onClick={() => setSearchTarget('all')}
          className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
            searchTarget === 'all'
              ? 'border-solid shadow-xs'
              : 'border-transparent opacity-65 hover:opacity-100'
          }`}
          style={{
            borderColor: searchTarget === 'all' ? theme.accent : 'transparent',
            backgroundColor:
              searchTarget === 'all'
                ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                : 'transparent',
            color: searchTarget === 'all' ? theme.accent : theme.text,
          }}
        >
          Все
        </button>

        <button
          type="button"
          onClick={() => setSearchTarget('title')}
          className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
            searchTarget === 'title'
              ? 'border-solid shadow-xs'
              : 'border-transparent opacity-65 hover:opacity-100'
          }`}
          style={{
            borderColor: searchTarget === 'title' ? theme.accent : 'transparent',
            backgroundColor:
              searchTarget === 'title'
                ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                : 'transparent',
            color: searchTarget === 'title' ? theme.accent : theme.text,
          }}
        >
          Название
        </button>

        <button
          type="button"
          onClick={() => setSearchTarget('content')}
          className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer select-none truncate min-w-0 border ${
            searchTarget === 'content'
              ? 'border-solid shadow-xs'
              : 'border-transparent opacity-65 hover:opacity-100'
          }`}
          style={{
            borderColor: searchTarget === 'content' ? theme.accent : 'transparent',
            backgroundColor:
              searchTarget === 'content'
                ? hexToRgba(theme.accent, isLight ? 0.14 : 0.18)
                : 'transparent',
            color: searchTarget === 'content' ? theme.accent : theme.text,
          }}
        >
          {isTasksMode ? 'Задачи' : 'Текст'}
        </button>
      </div>
    </div>
  );
};
