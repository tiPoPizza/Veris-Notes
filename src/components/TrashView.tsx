import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Note, TaskList, KanbanCard, CalendarEvent } from '../types';
import {
  Trash2,
  RotateCcw,
  FileText,
  CheckSquare,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  X,
  Columns3,
  Tag as TagIcon,
  Check,
  MapPin,
  ListTodo,
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

type TrashPreviewItem =
  | { type: 'note'; data: Note }
  | { type: 'task'; data: TaskList }
  | { type: 'kanban'; data: KanbanCard }
  | { type: 'event'; data: CalendarEvent };

export const TrashView: React.FC = () => {
  const {
    deletedNotes,
    deletedTaskLists,
    deletedEvents,
    deletedKanbanCards,
    kanbanColumns,
    trashPrivacyMode,
    restoreNote,
    restoreTaskList,
    restoreCalendarEvent,
    restoreKanbanCard,
    permanentlyDeleteNote,
    permanentlyDeleteTaskList,
    permanentlyDeleteCalendarEvent,
    permanentlyDeleteKanbanCard,
    clearAllDeletedNotes,
    clearAllDeletedTaskLists,
    clearAllDeletedCalendarEvents,
    clearAllDeletedKanbanCards,
    restoreAllDeletedNotes,
    restoreAllDeletedTaskLists,
    restoreAllDeletedCalendarEvents,
    restoreAllDeletedKanbanCards,
    trashRetentionDays,
    theme,
    quickSettings,
  } = useApp();

  const isPrivateTrash = trashPrivacyMode === 'private';
  const visibleDeletedNotes = isPrivateTrash
    ? deletedNotes.filter(n => Boolean(n.isPrivate))
    : deletedNotes.filter(n => !n.isPrivate);
  const visibleDeletedTaskLists = isPrivateTrash ? [] : deletedTaskLists;
  const visibleDeletedEvents = isPrivateTrash ? [] : (deletedEvents || []);
  const visibleDeletedKanban = isPrivateTrash ? [] : (deletedKanbanCards || []);

  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'tasks' | 'kanban' | 'events'>('all');
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [previewItem, setPreviewItem] = useState<TrashPreviewItem | null>(null);

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

  const getDaysUntilDeletion = (deletedTimestamp?: number) => {
    if (!trashRetentionDays || trashRetentionDays <= 0) return null;
    const deletedTime = deletedTimestamp || Date.now();
    const expireTime = deletedTime + trashRetentionDays * 24 * 60 * 60 * 1000;
    const msLeft = expireTime - Date.now();
    return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  };

  const totalEvents = visibleDeletedEvents.length;
  const totalItems =
    visibleDeletedNotes.length +
    visibleDeletedTaskLists.length +
    visibleDeletedKanban.length +
    totalEvents;

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

  const handleRestorePreview = () => {
    if (!previewItem) return;
    if (previewItem.type === 'note') restoreNote(previewItem.data.id);
    else if (previewItem.type === 'task') restoreTaskList(previewItem.data.id);
    else if (previewItem.type === 'kanban') restoreKanbanCard(previewItem.data.id);
    else if (previewItem.type === 'event') restoreCalendarEvent(previewItem.data.id);
    setPreviewItem(null);
  };

  const handlePermanentDeletePreview = () => {
    if (!previewItem) return;
    const item = previewItem;
    requestConfirm(
      'Удалить навсегда',
      'Этот элемент будет окончательно удален без возможности восстановления.',
      'Удалить',
      true,
      () => {
        if (item.type === 'note') permanentlyDeleteNote(item.data.id);
        else if (item.type === 'task') permanentlyDeleteTaskList(item.data.id);
        else if (item.type === 'kanban') permanentlyDeleteKanbanCard(item.data.id);
        else if (item.type === 'event') permanentlyDeleteCalendarEvent(item.data.id);
        setPreviewItem(null);
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-8 lg:px-12 pt-16 sm:pt-20 pb-28 relative select-none">
      {/* Centered Modern Header */}
      <div className="flex flex-col items-center justify-center mb-6 pt-4 sm:pt-6 text-center">
        <h1
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center"
          style={{ color: theme.text }}
        >
          {isPrivateTrash ? 'Приватная корзина' : 'Корзина'}
        </h1>
        {isPrivateTrash ? (
          <p className="text-xs opacity-60 mt-1.5">
            Только удалённые приватные заметки
          </p>
        ) : trashRetentionDays > 0 ? (
          <p className="text-xs opacity-60 mt-1.5">
            Элементы удаляются навсегда через {trashRetentionDays} дн.
          </p>
        ) : null}
      </div>

      {/* Modern Segmented Filter Bar */}
      {!isPrivateTrash && (
        <div className="flex justify-center mb-7">
          <div
            className="inline-flex items-center gap-1 p-1.5 rounded-2xl border backdrop-blur-xl shadow-xs max-w-full overflow-x-auto"
            style={{ backgroundColor: 'transparent', borderColor: cardBorder }}
          >
            {[
              { id: 'all', label: 'Все', count: totalItems, icon: null },
              { id: 'notes', label: 'Заметки', count: visibleDeletedNotes.length, icon: FileText },
              { id: 'tasks', label: 'Задачи', count: visibleDeletedTaskLists.length, icon: CheckSquare },
              { id: 'kanban', label: 'Канбан', count: visibleDeletedKanban.length, icon: Columns3 },
              { id: 'events', label: 'События', count: totalEvents, icon: CalendarIcon },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'all' | 'notes' | 'tasks' | 'kanban' | 'events')}
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
      )}

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <Trash2 size={40} className="opacity-35" style={{ color: theme.text }} />
          <div className="space-y-1">
            <p className="text-base font-extrabold" style={{ color: theme.text }}>
              Корзина пуста
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Deleted Notes Section */}
        {(activeTab === 'all' || activeTab === 'notes' || isPrivateTrash) && visibleDeletedNotes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="opacity-80">Заметки</span>
                  <span className="opacity-40 font-bold">{visibleDeletedNotes.length}</span>
                </h3>
              </div>

              <div className="flex items-center gap-3.5 text-xs">
                <button
                  onClick={() =>
                    requestConfirm(
                      'Восстановить заметки',
                      isPrivateTrash
                        ? 'Восстановить все удалённые приватные заметки обратно в приватное пространство?'
                        : 'Восстановить все удалённые заметки из корзины?',
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
              {visibleDeletedNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => setPreviewItem({ type: 'note', data: note })}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md hover:border-current group cursor-pointer"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-extrabold truncate pr-2" style={{ color: theme.text }}>
                        {note.title || 'Без названия'}
                      </h4>
                      <span className="text-[10px] opacity-40 shrink-0 font-medium">
                        {formatDate(note.deletedAt || note.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                      {stripHtml(note.content) || 'Пустая заметка'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        restoreNote(note.id);
                      }}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        permanentlyDeleteNote(note.id);
                      }}
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
        {!isPrivateTrash && (activeTab === 'all' || activeTab === 'tasks') && visibleDeletedTaskLists.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="opacity-80">Задачи</span>
                  <span className="opacity-40 font-bold">{visibleDeletedTaskLists.length}</span>
                </h3>
              </div>

              <div className="flex items-center gap-3.5 text-xs">
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
              {visibleDeletedTaskLists.map(list => (
                <div
                  key={list.id}
                  onClick={() => setPreviewItem({ type: 'task', data: list })}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md hover:border-current group cursor-pointer"
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

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        restoreTaskList(list.id);
                      }}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        permanentlyDeleteTaskList(list.id);
                      }}
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

        {/* Deleted Kanban Cards Section */}
        {!isPrivateTrash && (activeTab === 'all' || activeTab === 'kanban') && visibleDeletedKanban.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Columns3 size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="opacity-80">Канбан</span>
                  <span className="opacity-40 font-bold">{visibleDeletedKanban.length}</span>
                </h3>
              </div>

              <div className="flex items-center gap-3.5 text-xs">
                <button
                  onClick={() =>
                    requestConfirm(
                      'Восстановить карточки канбан',
                      'Восстановить все удалённые карточки канбан из корзины?',
                      'Восстановить все',
                      false,
                      restoreAllDeletedKanbanCards
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer"
                  style={{ color: theme.accent }}
                >
                  Восстановить все
                </button>
                <button
                  onClick={() =>
                    requestConfirm(
                      'Удалить карточки навсегда',
                      'Все удалённые карточки канбан будут окончательно стёрты.',
                      'Удалить навсегда',
                      true,
                      clearAllDeletedKanbanCards
                    )
                  }
                  className="font-bold transition hover:opacity-80 active:scale-95 cursor-pointer text-red-500"
                >
                  Очистить все
                </button>
              </div>
            </div>

            {/* Kanban Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleDeletedKanban.map(card => {
                const column = kanbanColumns.find(c => c.id === card.columnId);
                return (
                  <div
                    key={card.id}
                    onClick={() => setPreviewItem({ type: 'kanban', data: card })}
                    className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md hover:border-current group cursor-pointer"
                    style={{ backgroundColor: cardBg, borderColor: cardBorder }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-extrabold truncate pr-2" style={{ color: theme.text }}>
                          {card.title || 'Без названия'}
                        </h4>
                        {column && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md font-semibold truncate max-w-[100px]"
                            style={{
                              backgroundColor: hexToRgba(column.color || theme.accent, 0.15),
                              color: column.color || theme.accent,
                            }}
                          >
                            {column.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">
                        {card.description || (card.checklist && card.checklist.length > 0 ? `${card.checklist.length} подзадач` : 'Без описания')}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          restoreKanbanCard(card.id);
                        }}
                        className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                        style={{ color: theme.accent }}
                      >
                        <RotateCcw size={12} />
                        <span>Восстановить</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          permanentlyDeleteKanbanCard(card.id);
                        }}
                        className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-red-500/20 active:scale-95 cursor-pointer text-red-500"
                      >
                        <Trash2 size={12} />
                        <span>Навсегда</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deleted Calendar Events Section */}
        {!isPrivateTrash && (activeTab === 'all' || activeTab === 'events') && totalEvents > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CalendarIcon size={15} style={{ color: theme.accent }} />
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="opacity-80">События</span>
                  <span className="opacity-40 font-bold">{totalEvents}</span>
                </h3>
              </div>

              <div className="flex items-center gap-3.5 text-xs">
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
              {visibleDeletedEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setPreviewItem({ type: 'event', data: event })}
                  className="p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs transition hover:shadow-md hover:border-current group cursor-pointer"
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

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        restoreCalendarEvent(event.id);
                      }}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-bold transition hover:bg-white/10 active:scale-95 cursor-pointer"
                      style={{ color: theme.accent }}
                    >
                      <RotateCcw size={12} />
                      <span>Восстановить</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        permanentlyDeleteCalendarEvent(event.id);
                      }}
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

        {/* Global Bottom Actions */}
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
                Массовое управление всеми заметками, задачами, канбан и событиями
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() =>
                  requestConfirm(
                    'Восстановить всю корзину',
                    'Восстановить абсолютно все элементы (заметки, задачи, канбан и события) из корзины?',
                    'Восстановить всё',
                    false,
                    () => {
                      restoreAllDeletedNotes();
                      restoreAllDeletedTaskLists();
                      restoreAllDeletedKanbanCards();
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
                      clearAllDeletedKanbanCards();
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

      {/* Item Preview Modal */}
      {previewItem &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="w-full max-w-lg rounded-3xl p-5 sm:p-6 border backdrop-blur-2xl flex flex-col gap-4 relative select-none my-auto max-h-[90vh] overflow-y-auto shadow-2xl"
              style={{
                backgroundColor: modalBg,
                borderColor: modalBorder,
                color: theme.text,
                boxShadow: isLight
                  ? '0 20px 50px -10px rgba(0, 0, 0, 0.25)'
                  : '0 25px 60px rgba(0, 0, 0, 0.65)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header: Icon, Type Badge, Retention Countdown (only if enabled) and Close Button */}
              <div className="flex items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: theme.accent }} className="shrink-0 flex items-center">
                    {previewItem.type === 'note' && <FileText size={18} />}
                    {previewItem.type === 'task' && <CheckSquare size={18} />}
                    {previewItem.type === 'kanban' && <Columns3 size={18} />}
                    {previewItem.type === 'event' && <CalendarIcon size={18} />}
                  </span>

                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {previewItem.type === 'note' && 'Заметка'}
                    {previewItem.type === 'task' && 'Список задач'}
                    {previewItem.type === 'kanban' && 'Канбан-карточка'}
                    {previewItem.type === 'event' && 'Событие'}
                  </span>

                  {/* Show time remaining only if auto-deletion is enabled (retention > 0) */}
                  {(() => {
                    const days = getDaysUntilDeletion(
                      previewItem.data.deletedAt ||
                        (previewItem.data as any).updatedAt ||
                        (previewItem.data as any).createdAt
                    );
                    if (days === null) return null;
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500">
                        <Clock size={11} className="stroke-[2.5]" />
                        <span>Удалится через {days} дн.</span>
                      </span>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: theme.text }}>
                  {previewItem.data.title || 'Без названия'}
                </h3>
              </div>

              {/* Body Content according to type */}
              <div className="space-y-3">
                {/* Note Content */}
                {previewItem.type === 'note' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] opacity-50 font-medium">
                      <span>Изменено: {formatDate(previewItem.data.updatedAt)}</span>
                      {previewItem.data.deletedAt && (
                        <span>• Удалено: {formatDate(previewItem.data.deletedAt)}</span>
                      )}
                    </div>

                    {previewItem.data.tags && previewItem.data.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {previewItem.data.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg opacity-70 font-semibold"
                            style={{ backgroundColor: hexToRgba(theme.text, 0.08) }}
                          >
                            <TagIcon size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className="text-xs sm:text-sm leading-relaxed opacity-85 whitespace-pre-wrap select-text max-h-72 overflow-y-auto p-3.5 rounded-2xl border"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.03),
                        borderColor: hexToRgba(theme.text, 0.08),
                      }}
                    >
                      {stripHtml(previewItem.data.content) || 'Текст заметки отсутствует.'}
                    </div>
                  </div>
                )}

                {/* Task List Content */}
                {previewItem.type === 'task' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="opacity-60">
                        Выполнено {previewItem.data.items.filter(i => i.completed).length} из {previewItem.data.items.length}
                      </span>
                      {previewItem.data.priority && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                          style={{
                            backgroundColor: hexToRgba(previewItem.data.priority.color, 0.15),
                            color: previewItem.data.priority.color,
                          }}
                        >
                          {previewItem.data.priority.name}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {previewItem.data.items.length > 0 && (
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}
                      >
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            backgroundColor: theme.accent,
                            width: `${(previewItem.data.items.filter(i => i.completed).length / previewItem.data.items.length) * 100}%`,
                          }}
                        />
                      </div>
                    )}

                    {/* Checklist Items */}
                    <div
                      className="space-y-2 max-h-72 overflow-y-auto p-3.5 rounded-2xl border"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.03),
                        borderColor: hexToRgba(theme.text, 0.08),
                      }}
                    >
                      {previewItem.data.items.length === 0 ? (
                        <p className="text-xs opacity-50">В списке нет задач.</p>
                      ) : (
                        previewItem.data.items.map(item => (
                          <div key={item.id} className="flex items-start gap-2.5 text-xs py-0.5">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                item.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-current opacity-40'
                              }`}
                            >
                              {item.completed && <Check size={10} className="stroke-[3]" />}
                            </div>
                            <span className={item.completed ? 'line-through opacity-45' : 'opacity-90'}>
                              {item.text}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Kanban Card Content */}
                {previewItem.type === 'kanban' && (() => {
                  const card = previewItem.data;
                  const col = kanbanColumns.find(c => c.id === card.columnId);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {col && (
                          <span
                            className="px-2.5 py-0.5 rounded-lg font-bold"
                            style={{
                              backgroundColor: hexToRgba(col.color || theme.accent, 0.15),
                              color: col.color || theme.accent,
                            }}
                          >
                            Колонка: {col.title}
                          </span>
                        )}
                        {card.priority && (
                          <span
                            className="px-2.5 py-0.5 rounded-lg font-bold"
                            style={{
                              backgroundColor: hexToRgba(card.priority.color, 0.15),
                              color: card.priority.color,
                            }}
                          >
                            {card.priority.name}
                          </span>
                        )}
                        {card.dueDate && (
                          <span className="flex items-center gap-1 opacity-70 font-medium">
                            <Clock size={12} />
                            {card.dueDate} {card.dueTime || ''}
                          </span>
                        )}
                      </div>

                      {card.description && (
                        <div
                          className="text-xs sm:text-sm leading-relaxed opacity-85 whitespace-pre-wrap select-text p-3.5 rounded-2xl border"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.03),
                            borderColor: hexToRgba(theme.text, 0.08),
                          }}
                        >
                          {card.description}
                        </div>
                      )}

                      {card.checklist && card.checklist.length > 0 && (
                        <div
                          className="space-y-2 p-3.5 rounded-2xl border"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.03),
                            borderColor: hexToRgba(theme.text, 0.08),
                          }}
                        >
                          <div className="text-[11px] font-bold opacity-60 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <ListTodo size={13} />
                            Чеклист ({card.checklist.filter(c => c.completed).length}/{card.checklist.length})
                          </div>
                          {card.checklist.map(c => (
                            <div key={c.id} className="flex items-center gap-2.5 text-xs py-0.5">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  c.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-current opacity-40'
                                }`}
                              >
                                {c.completed && <Check size={10} className="stroke-[3]" />}
                              </div>
                              <span className={c.completed ? 'line-through opacity-45' : 'opacity-90'}>
                                {c.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {card.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg opacity-70 font-semibold"
                              style={{ backgroundColor: hexToRgba(theme.text, 0.08) }}
                            >
                              <TagIcon size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Calendar Event Content */}
                {previewItem.type === 'event' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-semibold opacity-75">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon size={14} style={{ color: theme.accent }} />
                        {previewItem.data.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} style={{ color: theme.accent }} />
                        {previewItem.data.isAllDay
                          ? 'Весь день'
                          : `${previewItem.data.startTime || '--:--'} – ${previewItem.data.endTime || '--:--'}`}
                      </span>
                    </div>

                    {previewItem.data.remindOnDay && (
                      <div className="flex items-center gap-1.5 text-xs opacity-70">
                        <Clock size={13} style={{ color: theme.accent }} />
                        <span>Напоминание в день события</span>
                      </div>
                    )}

                    {previewItem.data.description && (
                      <div
                        className="text-xs sm:text-sm leading-relaxed opacity-85 whitespace-pre-wrap select-text p-3.5 rounded-2xl border"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.03),
                          borderColor: hexToRgba(theme.text, 0.08),
                        }}
                      >
                        {previewItem.data.description}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons in Footer */}
              <div className="flex items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handlePermanentDeletePreview}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Удалить навсегда</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestorePreview}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
                  style={{
                    backgroundColor: theme.accent,
                    color: isLightColor(theme.accent) ? '#0F172A' : '#FFFFFF',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Восстановить</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
            <div className="flex items-center gap-2.5">
              <div style={{ color: confirmModal.isDanger ? '#EF4444' : theme.accent }}>
                {confirmModal.isDanger ? <AlertTriangle size={22} /> : <RotateCcw size={22} />}
              </div>
              <h3 className="text-base font-extrabold">{confirmModal.title}</h3>
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
