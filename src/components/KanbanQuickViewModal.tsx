import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Check, Plus, CheckSquare, Trash2, Edit2, Flag, Calendar as CalendarIcon, Tag as TagIcon } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { KanbanCard, KanbanChecklistItem } from '../types';

export const KanbanQuickViewModal: React.FC = () => {
  const {
    theme,
    isKanbanQuickViewOpen,
    quickViewKanbanCard,
    closeQuickViewKanbanCardModal,
    updateKanbanCard,
    openEditKanbanCardModal,
    kanbanColumns,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<KanbanChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    if (quickViewKanbanCard) {
      setTitle(quickViewKanbanCard.title || '');
      setDescription(quickViewKanbanCard.description || '');
      setChecklist(quickViewKanbanCard.checklist || []);
      setNewChecklistText('');
    }
  }, [quickViewKanbanCard, isKanbanQuickViewOpen]);

  if (!isKanbanQuickViewOpen || !quickViewKanbanCard) return null;

  const isLight = isLightColor(theme.bg);
  const column = kanbanColumns.find(c => c.id === quickViewKanbanCard.columnId);
  const cardColor = quickViewKanbanCard.color || column?.color || '#93C5FD';

  const handleTitleChange = (val: string) => {
    setTitle(val);
    updateKanbanCard(quickViewKanbanCard.id, { title: val });
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    updateKanbanCard(quickViewKanbanCard.id, { description: val });
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    updateKanbanCard(quickViewKanbanCard.id, { checklist: updated });
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim();
    if (!trimmed) return;
    const newItem: KanbanChecklistItem = {
      id: `kc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: trimmed,
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText('');
    updateKanbanCard(quickViewKanbanCard.id, { checklist: updated });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const updated = checklist.filter(item => item.id !== itemId);
    setChecklist(updated);
    updateKanbanCard(quickViewKanbanCard.id, { checklist: updated });
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      id="kanban-quick-view-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={closeQuickViewKanbanCardModal}
    >
      <div
        id="kanban-quick-view-modal-content"
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4 max-h-[90vh] overflow-y-auto flex flex-col"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.96),
          color: theme.text,
          borderColor: hexToRgba(theme.text, 0.18),
          boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between shrink-0 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: cardColor }}
            />
            {column && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: hexToRgba(column.color, 0.18),
                  color: theme.text,
                }}
              >
                {column.title}
              </span>
            )}
            {quickViewKanbanCard.priority && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                style={{
                  backgroundColor: hexToRgba(quickViewKanbanCard.priority.color, 0.15),
                  color: quickViewKanbanCard.priority.color,
                }}
              >
                <Flag size={10} />
                <span>{quickViewKanbanCard.priority.name}</span>
              </span>
            )}
            {(quickViewKanbanCard.dueDate || quickViewKanbanCard.dueTime) && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 opacity-80"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.08),
                  color: theme.text,
                }}
              >
                <CalendarIcon size={10} />
                <span>
                  {quickViewKanbanCard.dueDate || ''}
                  {quickViewKanbanCard.dueDate && quickViewKanbanCard.dueTime ? ` • ${quickViewKanbanCard.dueTime}` : quickViewKanbanCard.dueTime || ''}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                closeQuickViewKanbanCardModal();
                openEditKanbanCardModal(quickViewKanbanCard);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer opacity-80 hover:opacity-100 mr-1"
              style={{
                borderColor: hexToRgba(theme.text, 0.14),
                color: theme.text,
              }}
              title="Открыть все настройки"
            >
              <Edit2 size={13} style={{ color: theme.accent }} />
              <span>Настройки</span>
            </button>

            <button
              id="close-kanban-quick-view-btn"
              onClick={closeQuickViewKanbanCardModal}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer opacity-60 hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Title Field */}
        <div className="space-y-1">
          <input
            id="kanban-quick-title-input"
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Название задачи"
            className="w-full text-base font-extrabold bg-transparent outline-none border-b pb-1 transition focus:border-opacity-100"
            style={{
              color: theme.text,
              borderColor: hexToRgba(theme.text, 0.12),
            }}
          />
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold opacity-60">Описание</label>
          <textarea
            id="kanban-quick-description-input"
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="Введите описание, детали или заметки по задаче..."
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-2xl border text-xs font-normal outline-none transition resize-y min-h-[90px]"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.04),
              borderColor: hexToRgba(theme.text, 0.14),
              color: theme.text,
            }}
          />
        </div>

        {/* Checklist Section */}
        <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold opacity-70 flex items-center gap-1.5">
              <CheckSquare size={14} style={{ color: theme.accent }} />
              <span>Чек-лист</span>
              {totalCount > 0 && (
                <span className="text-[11px] font-semibold opacity-75 ml-1">
                  ({completedCount}/{totalCount})
                </span>
              )}
            </label>

            {totalCount > 0 && (
              <div className="w-28 h-2 rounded-full overflow-hidden" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: theme.accent,
                  }}
                />
              </div>
            )}
          </div>

          {/* Checklist Items */}
          {checklist.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {checklist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border text-xs group transition"
                  style={{
                    backgroundColor: hexToRgba(theme.text, item.completed ? 0.02 : 0.04),
                    borderColor: hexToRgba(theme.text, 0.1),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                        item.completed ? 'bg-current text-white' : ''
                      }`}
                      style={{
                        borderColor: item.completed ? theme.accent : hexToRgba(theme.text, 0.35),
                        color: item.completed ? (isLightColor(theme.accent) ? '#000000' : '#ffffff') : 'inherit',
                        backgroundColor: item.completed ? theme.accent : 'transparent',
                      }}
                    >
                      {item.completed && <Check size={11} />}
                    </div>
                    <span className={`text-xs break-words ${item.completed ? 'line-through opacity-45' : 'font-medium'}`}>
                      {item.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:text-red-500 transition cursor-pointer"
                    title="Удалить пункт"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Checklist Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newChecklistText}
              onChange={e => setNewChecklistText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              placeholder="Добавить новый чек-бокс..."
              className="flex-1 px-3.5 py-2 rounded-xl border text-xs font-normal outline-none"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.04),
                borderColor: hexToRgba(theme.text, 0.12),
                color: theme.text,
              }}
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              disabled={!newChecklistText.trim()}
              className="px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-30 flex items-center gap-1"
              style={{
                backgroundColor: theme.accent,
                borderColor: theme.accent,
                color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
              }}
            >
              <Plus size={14} />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 shrink-0">
          <button
            onClick={closeQuickViewKanbanCardModal}
            className="px-5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shadow-sm hover:opacity-90 active:scale-98"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.08),
              color: theme.text,
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
