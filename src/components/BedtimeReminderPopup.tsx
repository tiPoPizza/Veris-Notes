import React from 'react';
import { useApp } from '../context/AppContext';
import { Moon, X, PenLine } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

export const BedtimeReminderPopup: React.FC = () => {
  const {
    isBedtimeReminderActive,
    dismissBedtimeReminder,
    snoozeBedtimeReminder,
    quickSettings,
    theme,
    viewMode,
    setViewMode,
    createNote,
    setActiveNoteId,
  } = useApp();

  if (!isBedtimeReminderActive) return null;

  const isLight = isLightColor(theme.bg);
  const popupBg = hexToRgba(theme.bg, 0.96);
  const borderColor = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.2);

  const title = quickSettings.bedtimeReminderTitle?.trim() || 'Подготовка ко сну';
  const description = quickSettings.bedtimeReminderDescription?.trim() || '';
  const time = quickSettings.bedtimeReminderTime || '22:30';

  const handleNightNote = () => {
    // If not in editor, create a note so user can dump thoughts before sleep
    if (viewMode !== 'editor') {
      const newNote = createNote('Ночная мысль', '');
      setActiveNoteId(newNote.id);
      setViewMode('editor');
    }
    // Dismiss reminder for the night so it doesn't disturb typing
    dismissBedtimeReminder(true);
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-bounceIn select-none">
      <div
        className="rounded-3xl p-5 border shadow-2xl backdrop-blur-2xl transition-all space-y-3.5"
        style={{
          backgroundColor: popupBg,
          color: theme.text,
          borderColor: borderColor,
          boxShadow: `0 20px 40px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.6)'}`,
        }}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.2),
                color: theme.accent,
              }}
            >
              <Moon size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold line-clamp-1">
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => dismissBedtimeReminder(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-60 hover:opacity-100 shrink-0"
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info & Content without inner substrate */}
        <div className="text-xs space-y-1.5 px-0.5">
          <div className="font-mono font-bold text-xs opacity-85">
            Время: {time}
          </div>
          {description ? (
            <p className="text-[12px] opacity-75 leading-relaxed pt-0.5 whitespace-pre-wrap">
              {description}
            </p>
          ) : (
            <p className="text-[11px] opacity-60 leading-relaxed pt-0.5">
              Зафиксируйте мысли перед сном, чтобы голова была спокойна.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => dismissBedtimeReminder(true)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              style={{ backgroundColor: theme.accent }}
            >
              <Moon size={14} />
              <span>Иду отдыхать</span>
            </button>

            <button
              onClick={() => snoozeBedtimeReminder(15)}
              className="py-2 px-3 rounded-xl border text-[11px] font-bold transition active:scale-95 cursor-pointer opacity-75 hover:opacity-100"
              style={{
                borderColor: hexToRgba(theme.text, 0.15),
                backgroundColor: hexToRgba(theme.text, 0.04),
                color: theme.text,
              }}
              title="Напомнить снова через 15 минут"
            >
              +15 мин
            </button>
          </div>

          {/* Quick thought / night note button */}
          <button
            onClick={handleNightNote}
            className="w-full py-1.5 px-3 rounded-xl border text-[11px] font-semibold transition active:scale-95 cursor-pointer opacity-70 hover:opacity-100 flex items-center justify-center gap-1.5"
            style={{
              borderColor: hexToRgba(theme.text, 0.12),
              backgroundColor: hexToRgba(theme.text, 0.02),
              color: theme.text,
            }}
          >
            <PenLine size={13} style={{ color: theme.accent }} />
            <span>Записать ночную мысль и спать</span>
          </button>
        </div>
      </div>
    </div>
  );
};
