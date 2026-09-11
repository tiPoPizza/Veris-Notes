import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarModal } from './CalendarModal';
import { CalendarEvent } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const MONTH_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const WEEKDAY_NAMES_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const FULL_WEEKDAYS_RU = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

export const CalendarView: React.FC = () => {
  const {
    events,
    selectedCalendarDate,
    setSelectedCalendarDate,
    deleteCalendarEvent,
    setViewMode,
    previousViewMode,
    setSidebarOpen,
    theme,
    quickSettings,
  } = useApp();

  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.05);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.12);

  // Parse currently selected date
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [currentYear, setCurrentYear] = useState(() => {
    const initial = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    return isNaN(initial.getTime()) ? today.getFullYear() : initial.getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = selectedCalendarDate ? new Date(selectedCalendarDate) : new Date();
    return isNaN(initial.getTime()) ? today.getMonth() : initial.getMonth();
  });

  // Sync calendar month & year if selected date changes externally (e.g. from sidebar day tile)
  useEffect(() => {
    if (selectedCalendarDate) {
      const parts = selectedCalendarDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setCurrentYear(y);
          setCurrentMonth(m);
        }
      }
    }
  }, [selectedCalendarDate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const targetDate = new Date(y, m, d);
    const weekday = FULL_WEEKDAYS_RU[targetDate.getDay()];
    const monthGen = MONTH_GENITIVE_RU[m];
    return `${d} ${monthGen} ${y}, ${weekday}`;
  };

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar grid calculations
  const calendarGrid = useMemo(() => {
    // Days in current month
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // First day of current month (0: Sunday, 1: Monday, ...)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // In Russian calendar: Monday is 0, Sunday is 6
    const startOffset = (firstDayIndex + 6) % 7;

    // Previous month filler days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      eventsCount: number;
    }> = [];

    // Prev month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalendarDate,
        eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        dayNum
      ).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalendarDate,
        eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
      });
    }

    // Next month filler days (fill up to complete weeks of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let dayNum = 1; dayNum <= remaining; dayNum++) {
        const m = currentMonth === 11 ? 1 : currentMonth + 2;
        const y = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        days.push({
          dayNumber: dayNum,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedCalendarDate,
          eventsCount: events.filter(e => !e.deleted && e.date === dateStr).length,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, selectedCalendarDate, todayStr, events]);

  // Events for the selected date
  const selectedDateEvents = useMemo(() => {
    return events.filter(e => !e.deleted && e.date === selectedCalendarDate);
  }, [events, selectedCalendarDate]);

  // Format selected date display header
  const selectedDateTitle = useMemo(() => {
    if (!selectedCalendarDate) return '';
    const parts = selectedCalendarDate.split('-');
    if (parts.length !== 3) return selectedCalendarDate;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const targetDate = new Date(y, m, d);

    const isCurrentDay = selectedCalendarDate === todayStr;
    const weekday = FULL_WEEKDAYS_RU[targetDate.getDay()];
    const monthGen = MONTH_GENITIVE_RU[m];

    if (isCurrentDay) {
      return `Сегодня, ${d} ${monthGen}`;
    }
    return `${d} ${monthGen}, ${weekday}`;
  }, [selectedCalendarDate, todayStr]);

  const isPastDay = Boolean(selectedCalendarDate && selectedCalendarDate < todayStr);

  const handleOpenCreateModal = () => {
    if (isPastDay) return;
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 lg:px-12 pt-6 pb-28 relative select-none">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-center mb-8 pt-1">
        {/* Centered Title */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
          style={{ color: theme.text }}
        >
          Календарь
        </h1>
      </div>

      {/* Main Calendar Container */}
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Calendar Card */}
        <div
          className="p-5 sm:p-7 rounded-3xl backdrop-blur-xl space-y-6"
          style={{
            backgroundColor: cardBg,
            border: quickSettings.showBorder ? `1px solid ${theme.accent}` : 'none',
            boxShadow: isLight
              ? '0 1px 2px rgba(0, 0, 0, 0.03), 0 16px 36px -8px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)'
              : '0 20px 45px -10px rgba(0, 0, 0, 0.6), 0 8px 18px -4px rgba(0, 0, 0, 0.35)',
          }}
        >
          {/* Month & Year Header with Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer"
              style={{ color: theme.text }}
              title="Предыдущий месяц"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: theme.text }}>
                {MONTH_NAMES_RU[currentMonth]} {currentYear}
              </h2>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition cursor-pointer"
              style={{ color: theme.text }}
              title="Следующий месяц"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
            {WEEKDAY_NAMES_RU.map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-extrabold uppercase tracking-wider py-1 ${
                  idx >= 5 ? 'opacity-40' : 'opacity-60'
                }`}
                style={{ color: theme.text }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((item, idx) => {
              // Check states
              const isToday = item.isToday;
              const isSelected = item.isSelected;
              const isCurrent = item.isCurrentMonth;
              const hasEvents = item.eventsCount > 0;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  onClick={() => setSelectedCalendarDate(item.dateStr)}
                  className={`relative flex flex-col items-center justify-center h-10 sm:h-12 w-full transition cursor-pointer active:scale-95 ${
                    !isCurrent ? 'opacity-30' : 'opacity-100'
                  }`}
                  style={{
                    color: theme.text,
                  }}
                >
                  {/* Date Number with Circle for Selected and/or Hollow Circle for Today */}
                  <div
                    className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center text-xs font-black transition relative ${
                      isToday ? 'border-2' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? hexToRgba(theme.accent, 0.28)
                        : 'transparent',
                      borderColor: isToday ? theme.accent : 'transparent',
                      color: isSelected
                        ? theme.accent
                        : isToday
                        ? theme.accent
                        : theme.text,
                    }}
                  >
                    <span className={hasEvents ? '-translate-y-0.5' : ''}>{item.dayNumber}</span>
                    {/* Dot indicator if day has events - cleanly inside circle */}
                    {hasEvents && (
                      <div
                        className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Events Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold" style={{ color: theme.text }}>
                {selectedDateTitle}
              </h3>
              {selectedDateEvents.length > 0 && (
                <p className="text-xs opacity-50">
                  Событий: {selectedDateEvents.length}
                </p>
              )}
            </div>

            {/* + Событие Button (only for today and future days) */}
            {!isPastDay && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-1.5 py-2 px-4 rounded-2xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus size={15} />
                <span>Событие</span>
              </button>
            )}
          </div>

          {/* Events List */}
          {selectedDateEvents.length === 0 ? (
            <div
              className="p-8 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center text-center space-y-3"
              style={{
                backgroundColor: cardBg,
                border: quickSettings.showBorder ? `1px solid ${theme.accent}` : 'none',
              }}
            >
              <CalendarIcon size={32} className="opacity-40" style={{ color: theme.text }} />
              <div>
                <p className="text-sm font-bold opacity-70">
                  {isPastDay ? 'Прошедший день' : 'На этот день событий нет'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setViewingEvent(event)}
                  className="p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-3 shadow-xs transition hover:shadow-md cursor-pointer active:scale-[0.99] group"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  {/* Left: Pencil button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                    className="p-2 -ml-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer shrink-0"
                    style={{ color: theme.accent }}
                    title="Редактировать событие"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Middle: Event details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold truncate" style={{ color: theme.text }}>
                        {event.title}
                      </h4>
                      {event.remindOnDay && (
                        <span
                          className="text-xs font-bold shrink-0"
                          style={{
                            color: theme.accent,
                          }}
                        >
                          Напоминание
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold mt-1" style={{ color: theme.accent }}>
                      <span>
                        {event.isAllDay
                          ? 'Весь день'
                          : `${event.startTime || '--:--'} – ${event.endTime || '--:--'}`}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs opacity-60 line-clamp-1 mt-1 leading-relaxed" style={{ color: theme.text }}>
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Right: Delete button */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setEventToDelete(event);
                    }}
                    className="p-2 -mr-1 rounded-xl hover:bg-red-500/15 active:scale-95 transition cursor-pointer text-red-500 shrink-0"
                    title="Удалить событие"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Details View Modal (Read-only) */}
      {viewingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setViewingEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-5"
            style={{
              backgroundColor: isLight ? '#ffffff' : hexToRgba(theme.bg, 0.96),
              borderColor: cardBorder,
              color: theme.text,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-50">
                Просмотр события
              </span>
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ color: theme.text }}
                title="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            {/* Event Title */}
            <div>
              <h3 className="text-xl font-extrabold tracking-tight break-words">
                {viewingEvent.title}
              </h3>
            </div>

            {/* Date & Time Info Box */}
            <div
              className="p-4 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }}
            >
              {/* Date */}
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <CalendarIcon size={16} style={{ color: theme.accent }} className="shrink-0" />
                <span>{formatEventDate(viewingEvent.date)}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: hexToRgba(theme.accent, 0.18) }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                </div>
                <span>
                  {viewingEvent.isAllDay
                    ? 'Весь день'
                    : `${viewingEvent.startTime || '--:--'} – ${viewingEvent.endTime || '--:--'}`}
                </span>
              </div>

              {/* Reminder if enabled */}
              {viewingEvent.remindOnDay && (
                <div className="flex items-center gap-2.5 text-xs font-semibold" style={{ color: theme.accent }}>
                  <Bell size={16} className="shrink-0" />
                  <span>Напоминание включено</span>
                </div>
              )}
            </div>

            {/* Description if present */}
            {viewingEvent.description && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold opacity-60">Описание</div>
                <div
                  className="p-3.5 rounded-2xl border text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }}
                >
                  {viewingEvent.description}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingEvent(null)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs active:scale-98 transition cursor-pointer text-center"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.08),
                  color: theme.text,
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (matching Photo 2) */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setEventToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4"
            style={{
              backgroundColor: isLight ? '#ffffff' : hexToRgba(theme.bg, 0.96),
              borderColor: cardBorder,
              color: theme.text,
              boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <Trash2 size={24} style={{ color: theme.accent }} className="shrink-0" />
              <div>
                <h3 className="font-extrabold text-base">Переместить в корзину?</h3>
                <p className="text-xs opacity-60 mt-0.5">
                  Событие можно будет восстановить из корзины.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCalendarEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                style={{
                  backgroundColor: theme.accent,
                  color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                }}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Creation & Editing Modal */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        initialDate={selectedCalendarDate}
        editingEvent={editingEvent}
      />
    </div>
  );
};
