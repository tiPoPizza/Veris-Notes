import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Trash2,
  RotateCcw,
  FileText,
  CheckSquare,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  isDanger: boolean;
  actionText: string;
  onConfirm: () => void;
}

export const TrashView: React.FC = () => {
  const {
    deletedNotes,
    deletedTaskLists,
    deletedEvents,
    restoreNote,
    restoreTaskList,
    restoreCalendarEvent,
    permanentlyDeleteNote,
    permanentlyDeleteTaskList,
    permanentlyDeleteCalendarEvent,
    clearAllDeletedNotes,
    clearAllDeletedTaskLists,
    clearAllDeletedCalendarEvents,
    restoreAllDeletedNotes,
    restoreAllDeletedTaskLists,
    restoreAllDeletedCalendarEvents,
    theme,
    quickSettings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'tasks' | 'events'>('all');
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  const isLight = isLightColor(theme.bg);

  const cardBg = hexToRgba(theme.text, 0.04);
  const cardBorder = quickSettings.showBorder
    ? theme.accent
    : hexToRgba(theme.text, 0.1);

  const modalBg = isLight ? '#FFFFFF' : '#1C1C1E';
  const modalBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';

  const stripHtml = (html?: string) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month} ${hours}:${minutes}`;
  };

  const totalEvents = deletedEvents ? deletedEvents.length : 0;
  const totalItems = deletedNotes.length + deletedTaskLists.length + totalEvents;

  const getItemsWord = (count: number) => {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 19) return 'объектов';
    if (last === 1) return 'объект';
    if (last >= 2 && last <= 4) return 'объекта';
    return 'объектов';
  };

  const requestConfirm = (
    title: string,
    message: string,
    actionText: string,
    isDanger: boolean,
    onConfirm: () => void
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      actionText,
      isDanger,
      onConfirm,
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal) {
      confirmModal.onConfirm();
      setConfirmModal(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 lg:px-12 pt-6 pb-28 relative select-none">
      {/* Centered Modern Header */}
      <div className="flex flex-col items-center justify-center mb-6 pt-1">
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
          style={{ color: theme.text }}
        >
          Корзина
        </h1>
      </div>

      {/* Modern Segmented Filter Bar (Material You / iOS style) */}
      <div className="flex justify-center mb-7">
        <div
          className="inline-flex items-center gap-1 p-1.5 rounded-2xl border backdrop-blur-xl shadow-xs max-w-full overflow-x-auto"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {[
            { id: 'all', label: 'Все', count: totalItems, icon: null },
            { id: 'notes', label: 'Заметки', count: deletedNotes.length, icon: FileText },
            { id: 'tasks', label: 'Задачи', count: deletedTaskLists.length, icon: CheckSquare },
            { id: 'events', label: 'События', count: totalEvents, icon: CalendarIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'all' | 'notes' | 'tasks' | 'events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'shadow-xs scale-[1.02]'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isActive
                    ? isLight
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.14)'
                    : 'transparent',
                  color: isActive ? theme.accent : theme.text,
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{tab.label}</span>
                <span className="text-xs font-bold opacity-60 ml-0.5">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-xs"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.05),
              color: theme.text,
            }}
          >
            <Trash2 size={28} className="opacity-40" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-extrabold" style={{ color: theme.text }}>
              Суд окончен
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Deleted Notes Section */}
        {(activeTab === 'all' || activeTab === 'notes') && deletedNotes.length > 0 && (
          <div className="space-y-3">
            {/* Section Header with Quick Clean Batch Actions */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider opacity-70">
                  Заметки ({deletedNotes.length})
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() =>
                    requestConfirm(
                      'Восстановить заметки',
                      'Восстановить все удалённые заметки из корзины?',
                      'Восстановить все',
                      false,
                      restoreAllDeletedNotes
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer"
                  style={{ color: theme.accent }}
                >
                  Восстановить все
                </button>
                <span className="opacity-20 font-light">|</span>
                <button
                  onClick={() =>
                    requestConfirm(
                      'Удалить заметки навсегда',
                      'Все удалённые заметки будут окончательно стёрты без возможности восстановления.',
                      'Удалить навсегда',
                      true,
                      clearAllDeletedNotes
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer text-red-500"
                >
                  Очистить все
                </button>
              </div>
            </div>

            {/* Notes Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedNotes.map(note => (
                <div
                  key={note.id}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md group"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-extrabold truncate pr-2" style={{ color: theme.text }}>
                        {note.title || 'Без названия'}
                      </h4>
                      <span className="text-[10px] opacity-40 shrink-0 font-medium">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                      {stripHtml(note.content) || 'Пустая заметка'}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 pt-2.5 border-t"
                    style={{ borderColor: hexToRgba(theme.text, 0.06) }}
                  >
                    <button
                      onClick={() => restoreNote(note.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={() => permanentlyDeleteNote(note.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-red-500/20 active:scale-95 cursor-pointer text-red-500"
                    >
                      <Trash2 size={12} />
                      <span>Навсегда</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deleted Task Lists Section */}
        {(activeTab === 'all' || activeTab === 'tasks') && deletedTaskLists.length > 0 && (
          <div className="space-y-3">
            {/* Section Header with Quick Clean Batch Actions */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider opacity-70">
                  Задачи ({deletedTaskLists.length})
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() =>
                    requestConfirm(
                      'Восстановить задачи',
                      'Восстановить все удалённые списки задач из корзины?',
                      'Восстановить все',
                      false,
                      restoreAllDeletedTaskLists
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer"
                  style={{ color: theme.accent }}
                >
                  Восстановить все
                </button>
                <span className="opacity-20 font-light">|</span>
                <button
                  onClick={() =>
                    requestConfirm(
                      'Удалить задачи навсегда',
                      'Все удалённые задачи будут окончательно стёрты без возможности восстановления.',
                      'Удалить навсегда',
                      true,
                      clearAllDeletedTaskLists
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer text-red-500"
                >
                  Очистить все
                </button>
              </div>
            </div>

            {/* Tasks Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedTaskLists.map(list => (
                <div
                  key={list.id}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md group"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-extrabold truncate pr-2" style={{ color: theme.text }}>
                        {list.title || 'Без названия'}
                      </h4>
                      <span className="text-[10px] opacity-40 shrink-0 font-medium">
                        {list.items.length} элементов
                      </span>
                    </div>
                    <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                      {list.items.map(i => i.text).join(', ') || 'Пустой список'}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 pt-2.5 border-t"
                    style={{ borderColor: hexToRgba(theme.text, 0.06) }}
                  >
                    <button
                      onClick={() => restoreTaskList(list.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={() => permanentlyDeleteTaskList(list.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-red-500/20 active:scale-95 cursor-pointer text-red-500"
                    >
                      <Trash2 size={12} />
                      <span>Навсегда</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deleted Calendar Events Section */}
        {(activeTab === 'all' || activeTab === 'events') && totalEvents > 0 && (
          <div className="space-y-3">
            {/* Section Header with Quick Clean Batch Actions */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider opacity-70">
                  События ({totalEvents})
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() =>
                    requestConfirm(
                      'Восстановить события',
                      'Восстановить все удалённые события календаря из корзины?',
                      'Восстановить все',
                      false,
                      restoreAllDeletedCalendarEvents
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer"
                  style={{ color: theme.accent }}
                >
                  Восстановить все
                </button>
                <span className="opacity-20 font-light">|</span>
                <button
                  onClick={() =>
                    requestConfirm(
                      'Удалить события навсегда',
                      'Все удалённые события будут окончательно стёрты из календаря.',
                      'Удалить навсегда',
                      true,
                      clearAllDeletedCalendarEvents
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer text-red-500"
                >
                  Очистить все
                </button>
              </div>
            </div>

            {/* Events Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deletedEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md group"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-extrabold truncate pr-2" style={{ color: theme.text }}>
                        {event.title || 'Без названия'}
                      </h4>
                      <span className="text-[10px] opacity-40 shrink-0 font-medium">
                        {event.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs opacity-60">
                      <Clock size={12} style={{ color: theme.accent }} />
                      <span>
                        {event.isAllDay ? 'Весь день' : `${event.startTime || '--:--'} – ${event.endTime || '--:--'}`}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs opacity-60 line-clamp-2 leading-relaxed mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 pt-2.5 border-t"
                    style={{ borderColor: hexToRgba(theme.text, 0.06) }}
                  >
                    <button
                      onClick={() => restoreCalendarEvent(event.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={() => permanentlyDeleteCalendarEvent(event.id)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-red-500/20 active:scale-95 cursor-pointer text-red-500"
                    >
                      <Trash2 size={12} />
                      <span>Навсегда</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Bottom Actions (Pixel OS / Material You Action Bar) */}
        {totalItems > 0 && (
          <div
            className="p-4 sm:p-5 rounded-3xl border backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 shadow-xs"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <div className="text-center sm:text-left">
              <h4 className="text-sm font-black" style={{ color: theme.text }}>
                Корзина ({totalItems})
              </h4>
              <p className="text-xs opacity-50 mt-0.5">
                Массовое управление всеми заметками, задачами и событиями
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() =>
                  requestConfirm(
                    'Восстановить всю корзину',
                    'Восстановить абсолютно все элементы (заметки, задачи и события) из корзины?',
                    'Восстановить всё',
                    false,
                    () => {
                      restoreAllDeletedNotes();
                      restoreAllDeletedTaskLists();
                      restoreAllDeletedCalendarEvents();
                    }
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl border text-xs font-bold transition active:scale-95 cursor-pointer hover:opacity-90 shadow-xs"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.12),
                  borderColor: cardBorder,
                  color: theme.accent,
                }}
              >
                <RotateCcw size={14} />
                <span>Восстановить всё</span>
              </button>

              <button
                onClick={() =>
                  requestConfirm(
                    'Очистить всю корзину',
                    'Вы уверены, что хотите окончательно очистить всю корзину? Все элементы будут удалены навсегда.',
                    'Очистить всё',
                    true,
                    () => {
                      clearAllDeletedNotes();
                      clearAllDeletedTaskLists();
                      clearAllDeletedCalendarEvents();
                    }
                  )
                }
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl border text-xs font-bold transition active:scale-95 cursor-pointer hover:bg-red-500/20 text-red-500 shadow-xs"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <Trash2 size={14} />
                <span>Очистить всё</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 animate-scaleUp"
            style={{
              backgroundColor: modalBg,
              borderColor: modalBorder,
              color: theme.text,
              boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)'}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: confirmModal.isDanger
                      ? 'rgba(239, 68, 68, 0.15)'
                      : hexToRgba(theme.accent, 0.15),
                    color: confirmModal.isDanger ? '#EF4444' : theme.accent,
                  }}
                >
                  {confirmModal.isDanger ? <AlertTriangle size={18} /> : <RotateCcw size={18} />}
                </div>
                <h3 className="text-base font-extrabold">{confirmModal.title}</h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
                style={{ color: theme.text }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs opacity-70 leading-relaxed font-medium">
              {confirmModal.message}
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 px-4 rounded-2xl border text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                style={{ borderColor: modalBorder, color: theme.text }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-md"
                style={{
                  backgroundColor: confirmModal.isDanger ? '#EF4444' : theme.accent,
                }}
              >
                {confirmModal.actionText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
