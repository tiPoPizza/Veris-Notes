import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent } from '../types';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Trash2,
  Check,
  AlignLeft,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { CustomTimePicker } from './CustomTimePicker';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  editingEvent?: CalendarEvent | null;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  editingEvent,
}) => {
  const {
    theme,
    quickSettings,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
  } = useApp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [remindOnDay, setRemindOnDay] = useState(false);
  const [description, setDescription] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setIsDeleteConfirmOpen(false);
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(editingEvent.date);
      setIsAllDay(editingEvent.isAllDay);
      setStartTime(editingEvent.startTime || '12:00');
      setEndTime(editingEvent.endTime || '13:00');
      setRemindOnDay(editingEvent.remindOnDay);
      setDescription(editingEvent.description || '');
    } else {
      const today = new Date();
      const defDate =
        initialDate ||
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate()
        ).padStart(2, '0')}`;
      setTitle('');
      setDate(defDate);
      setIsAllDay(true);
      setStartTime('12:00');
      setEndTime('13:00');
      setRemindOnDay(false);
      setDescription('');
    }
  }, [editingEvent, initialDate, isOpen]);

  if (!isOpen) return null;

  const isLight = isLightColor(theme.bg);
  const modalBg = hexToRgba(theme.bg, 0.94);
  const borderColor = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.15);
  const inputBg = hexToRgba(theme.text, 0.05);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingEvent) {
      updateCalendarEvent(editingEvent.id, {
        title: title.trim(),
        date,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        remindOnDay,
        description: description.trim() || undefined,
        reminderDismissedForever: remindOnDay ? editingEvent.reminderDismissedForever : false,
      });
    } else {
      createCalendarEvent({
        title: title.trim(),
        date,
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        remindOnDay,
        description: description.trim() || undefined,
      });
    }

    onClose();
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (editingEvent) {
      deleteCalendarEvent(editingEvent.id);
      setIsDeleteConfirmOpen(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-5"
        style={{
          backgroundColor: modalBg,
          color: theme.text,
          borderColor: borderColor,
          boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.15), color: theme.accent }}
            >
              <CalendarIcon size={18} />
            </div>
            <h2 className="text-lg font-extrabold">
              {editingEvent ? 'Редактировать событие' : 'Новое событие'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider opacity-60 mb-1.5">
              Название
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Название события"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border text-sm font-semibold outline-hidden transition focus:ring-2"
              style={{
                backgroundColor: inputBg,
                borderColor: borderColor,
                color: theme.text,
              }}
            />
          </div>

          {/* All Day Switch */}
          <div
            className="flex items-center justify-between p-3 rounded-2xl border"
            style={{ backgroundColor: inputBg, borderColor: borderColor }}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={16} style={{ color: theme.accent }} />
              <span className="text-xs font-bold">Весь день</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                isAllDay ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: isAllDay ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Time Range (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
              <CustomTimePicker
                label="Начало"
                value={startTime}
                onChange={setStartTime}
              />
              <CustomTimePicker
                label="Конец"
                value={endTime}
                onChange={setEndTime}
              />
            </div>
          )}

          {/* Reminder Toggle */}
          <div
            className="flex items-center justify-between p-3 rounded-2xl border"
            style={{ backgroundColor: inputBg, borderColor: borderColor }}
          >
            <div className="flex items-center gap-2.5">
              <Bell size={16} style={{ color: theme.accent }} />
              <div>
                <div className="text-xs font-bold">Напомнить в этот день</div>
                <div className="text-[10px] opacity-50">
                  Покажет уведомление при открытии приложения
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRemindOnDay(!remindOnDay)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ml-2 ${
                remindOnDay ? 'justify-end' : 'justify-start'
              }`}
              style={{
                backgroundColor: remindOnDay ? theme.accent : hexToRgba(theme.text, 0.2),
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider opacity-60 mb-1.5 flex items-center gap-1.5">
              <AlignLeft size={13} />
              <span>Описание</span>
            </label>
            <textarea
              rows={2}
              placeholder="Дополнительные детали или заметки..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl border text-xs outline-hidden transition resize-none leading-relaxed"
              style={{
                backgroundColor: inputBg,
                borderColor: borderColor,
                color: theme.text,
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 gap-2">
            {editingEvent ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="py-2.5 px-3.5 rounded-2xl border text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-2xl border text-xs font-bold hover:opacity-80 active:scale-95 transition cursor-pointer"
                style={{
                  borderColor: borderColor,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-2xl text-xs font-bold text-white active:scale-95 transition cursor-pointer shadow-md flex items-center gap-1.5"
                style={{ backgroundColor: theme.accent }}
              >
                <Check size={14} />
                <span>{editingEvent ? 'Сохранить' : 'Создать'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal (matching Photo 2) */}
      {isDeleteConfirmOpen && editingEvent && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4"
            style={{
              backgroundColor: isLight ? '#ffffff' : hexToRgba(theme.bg, 0.96),
              borderColor: borderColor,
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
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  borderColor: borderColor,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
    </div>
  );
};
