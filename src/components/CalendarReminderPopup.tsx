import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

export const CalendarReminderPopup: React.FC = () => {
  const {
    activeReminderEvent,
    dismissReminder,
    setViewMode,
    setSelectedCalendarDate,
    theme,
    quickSettings,
  } = useApp();

  if (!activeReminderEvent) return null;

  const isLight = isLightColor(theme.bg);
  const popupBg = hexToRgba(theme.bg, 0.95);
  const borderColor = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.2);

  const handleGoToCalendar = () => {
    setSelectedCalendarDate(activeReminderEvent.date);
    setViewMode('calendar');
    dismissReminder(activeReminderEvent.id, false);
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
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 animate-pulse"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.18),
                color: theme.accent,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">
                Напоминание на сегодня
              </span>
              <h3 className="text-sm font-extrabold line-clamp-1">
                {activeReminderEvent.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => dismissReminder(activeReminderEvent.id, false)}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-60 hover:opacity-100 shrink-0"
            title="Закрыть на этот сеанс"
          >
            <X size={16} />
          </button>
        </div>

        {/* Event Info Details */}
        <div
          className="p-3 rounded-2xl border text-xs space-y-1"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.04),
            borderColor: hexToRgba(theme.text, 0.08),
          }}
        >
          <div className="flex items-center gap-2 font-medium opacity-80">
            <Clock size={13} style={{ color: theme.accent }} />
            <span>
              {activeReminderEvent.isAllDay
                ? 'Весь день'
                : `${activeReminderEvent.startTime || '--:--'} – ${activeReminderEvent.endTime || '--:--'}`}
            </span>
          </div>
          {activeReminderEvent.description && (
            <p className="text-[11px] opacity-60 line-clamp-2 leading-relaxed pt-0.5">
              {activeReminderEvent.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleGoToCalendar}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            style={{ backgroundColor: theme.accent }}
          >
            <CalendarIcon size={13} />
            <span>Открыть</span>
          </button>

          <button
            onClick={() => dismissReminder(activeReminderEvent.id, true)}
            className="py-2 px-3 rounded-xl border text-[11px] font-bold transition active:scale-95 cursor-pointer opacity-70 hover:opacity-100"
            style={{
              borderColor: hexToRgba(theme.text, 0.15),
              backgroundColor: hexToRgba(theme.text, 0.04),
              color: theme.text,
            }}
            title="Не показывать это напоминание больше"
          >
            Больше не напоминать
          </button>
        </div>
      </div>
    </div>
  );
};
