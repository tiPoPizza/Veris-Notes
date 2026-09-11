import React, { useState, useEffect } from 'react';
import { useApp, KANBAN_PASTEL_COLORS } from '../context/AppContext';
import { X, Trash2, Check, AlertTriangle } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

export const KanbanColumnModal: React.FC = () => {
  const {
    theme,
    isKanbanColumnModalOpen,
    editingKanbanColumn,
    closeKanbanColumnModal,
    createKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    kanbanColumns,
    kanbanCards,
  } = useApp();

  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('#93C5FD');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'transfer' | 'delete_cards'>('transfer');
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  useEffect(() => {
    if (editingKanbanColumn) {
      setTitle(editingKanbanColumn.title);
      setSelectedColor(editingKanbanColumn.color || '#93C5FD');
      setShowDeleteConfirm(false);
      const otherCols = kanbanColumns.filter(c => c.id !== editingKanbanColumn.id);
      setTargetColumnId(otherCols[0]?.id || '');
    } else {
      setTitle('');
      setSelectedColor(KANBAN_PASTEL_COLORS[Math.floor(Math.random() * KANBAN_PASTEL_COLORS.length)].color);
      setShowDeleteConfirm(false);
      setTargetColumnId('');
    }
  }, [editingKanbanColumn, isKanbanColumnModalOpen, kanbanColumns]);

  if (!isKanbanColumnModalOpen) return null;

  const isLight = isLightColor(theme.bg);
  const isEditing = Boolean(editingKanbanColumn);
  const columnCardsCount = editingKanbanColumn
    ? kanbanCards.filter(c => c.columnId === editingKanbanColumn.id).length
    : 0;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (isEditing && editingKanbanColumn) {
      updateKanbanColumn(editingKanbanColumn.id, {
        title: trimmedTitle,
        color: selectedColor,
      });
    } else {
      createKanbanColumn(trimmedTitle, selectedColor);
    }
    closeKanbanColumnModal();
  };

  const handleDelete = () => {
    if (!editingKanbanColumn) return;
    deleteKanbanColumn(
      editingKanbanColumn.id,
      deleteAction === 'delete_cards',
      deleteAction === 'transfer' ? targetColumnId : undefined
    );
    closeKanbanColumnModal();
  };

  const otherColumns = kanbanColumns.filter(c => editingKanbanColumn && c.id !== editingKanbanColumn.id);

  return (
    <div
      id="kanban-column-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={closeKanbanColumnModal}
    >
      <div
        id="kanban-column-modal-content"
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-5"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.96),
          color: theme.text,
          borderColor: hexToRgba(theme.text, 0.18),
          boxShadow: `0 25px 50px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: selectedColor }}
            />
            <h2 className="text-base font-extrabold tracking-tight">
              {isEditing ? 'Настройки колонки' : 'Новая колонка'}
            </h2>
          </div>
          <button
            id="close-kanban-col-modal-btn"
            onClick={closeKanbanColumnModal}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer opacity-60 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <>
            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold opacity-60">Название</label>
              <input
                id="kanban-col-title-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                }}
                placeholder="Сделать, В работе, Готово..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-2xl border text-sm font-medium outline-none transition"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.04),
                  borderColor: hexToRgba(theme.text, 0.14),
                  color: theme.text,
                }}
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold opacity-60">Цвет</label>
              <div className="grid grid-cols-4 gap-2.5">
                {KANBAN_PASTEL_COLORS.map(item => {
                  const isSelected = selectedColor.toLowerCase() === item.color.toLowerCase();
                  return (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setSelectedColor(item.color)}
                      className={`h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer border ${
                        isSelected ? 'scale-105 shadow-md' : 'hover:scale-102 opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: item.color,
                        borderColor: isSelected ? theme.text : 'transparent',
                      }}
                      title={item.name}
                    >
                      {isSelected && (
                        <Check size={16} className="text-slate-800" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 gap-2">
              {isEditing ? (
                <button
                  id="delete-kanban-col-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Удалить</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeKanbanColumnModal}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold opacity-70 hover:opacity-100 transition cursor-pointer"
                  style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                >
                  Отмена
                </button>
                <button
                  id="save-kanban-col-btn"
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shadow-md disabled:opacity-40"
                  style={{
                    backgroundColor: theme.accent,
                    color: isLightColor(theme.accent) ? '#000000' : '#FFFFFF',
                  }}
                >
                  {isEditing ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Delete Column Confirmation */
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold">Удалить колонку «{editingKanbanColumn?.title}»?</div>
                {columnCardsCount > 0 ? (
                  <p className="opacity-80">
                    В этой колонке находится {columnCardsCount} карточек. Выберите, что с ними сделать:
                  </p>
                ) : (
                  <p className="opacity-80">Колонка пуста и будет безвозвратно удалена.</p>
                )}
              </div>
            </div>

            {columnCardsCount > 0 && otherColumns.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="deleteAction"
                    checked={deleteAction === 'transfer'}
                    onChange={() => setDeleteAction('transfer')}
                    className="accent-current"
                  />
                  <span>Перенести задачи в другую колонку:</span>
                </label>

                {deleteAction === 'transfer' && (
                  <select
                    value={targetColumnId}
                    onChange={e => setTargetColumnId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none ml-5 max-w-[90%]"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.05),
                      borderColor: hexToRgba(theme.text, 0.15),
                      color: theme.text,
                    }}
                  >
                    {otherColumns.map(col => (
                      <option key={col.id} value={col.id} style={{ backgroundColor: theme.bg, color: theme.text }}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-red-500 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="deleteAction"
                    checked={deleteAction === 'delete_cards'}
                    onChange={() => setDeleteAction('delete_cards')}
                    className="accent-red-500"
                  />
                  <span>Удалить все карточки вместе с колонкой</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-2xl border text-xs font-bold opacity-70 hover:opacity-100 transition cursor-pointer"
                style={{ borderColor: hexToRgba(theme.text, 0.15) }}
              >
                Назад
              </button>
              <button
                id="confirm-delete-col-btn"
                type="button"
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer shadow-md"
                style={{
                  backgroundColor: deleteAction === 'delete_cards' ? '#EF4444' : theme.accent,
                  color: deleteAction === 'delete_cards' ? '#FFFFFF' : (isLightColor(theme.accent) ? '#000000' : '#FFFFFF'),
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
