import React, { useState, useEffect, useRef } from 'react';
import { useApp, KANBAN_PASTEL_COLORS } from '../context/AppContext';
import {
  X,
  Trash2,
  Check,
  Plus,
  Calendar as CalendarIcon,
  CheckSquare,
  Flag,
  ChevronDown,
  Edit2,
  Sliders,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { KanbanCard, KanbanChecklistItem, Priority } from '../types';
import { CustomTimePicker } from './CustomTimePicker';

const PRIORITY_COLOR_PALETTE = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
];

export const KanbanCardModal: React.FC = () => {
  const {
    theme,
    isKanbanCardModalOpen,
    editingKanbanCard,
    targetKanbanColumnId,
    closeKanbanCardModal,
    createKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    kanbanColumns,
    priorities,
    createPriority,
    updatePriority,
    deletePriority,
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [selectedColor, setSelectedColor] = useState('#93C5FD');
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [checklist, setChecklist] = useState<KanbanChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Custom Dropdown Open States
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  // Create / Edit priority in modal
  const [isCreatingPriority, setIsCreatingPriority] = useState(false);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [priorityFormName, setPriorityFormName] = useState('');
  const [priorityFormColor, setPriorityFormColor] = useState('#EF4444');
  const [priorityFormLevel, setPriorityFormLevel] = useState('1');

  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingKanbanCard) {
      setTitle(editingKanbanCard.title);
      setDescription(editingKanbanCard.description || '');
      setColumnId(editingKanbanCard.columnId);
      setSelectedColor(editingKanbanCard.color || '#93C5FD');
      setSelectedPriority(editingKanbanCard.priority || null);
      setDueDate(editingKanbanCard.dueDate || '');
      setDueTime(editingKanbanCard.dueTime || '');
      setChecklist(editingKanbanCard.checklist || []);
    } else {
      const defaultCol = targetKanbanColumnId || kanbanColumns[0]?.id || '';
      const colObj = kanbanColumns.find(c => c.id === defaultCol);
      setTitle('');
      setDescription('');
      setColumnId(defaultCol);
      setSelectedColor(colObj?.color || KANBAN_PASTEL_COLORS[0].color);
      setSelectedPriority(null);
      setDueDate('');
      setDueTime('');
      setChecklist([]);
    }
    setNewChecklistText('');
    setIsColumnDropdownOpen(false);
    setIsPriorityDropdownOpen(false);
    setIsCreatingPriority(false);
    setEditingPriorityId(null);
    setPriorityFormName('');
  }, [editingKanbanCard, targetKanbanColumnId, isKanbanCardModalOpen, kanbanColumns]);

  // Click outside handler for custom dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(target)
      ) {
        setIsColumnDropdownOpen(false);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(target)
      ) {
        setIsPriorityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!isKanbanCardModalOpen) return null;

  const isLight = isLightColor(theme.bg);
  const isEditing = Boolean(editingKanbanCard);

  const dropdownMenuBg = isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98);
  const dropdownBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : hexToRgba(theme.text, 0.18);

  const currentColumn = kanbanColumns.find(c => c.id === columnId) || kanbanColumns[0];

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const cardData: Partial<KanbanCard> = {
      title: trimmedTitle,
      description: description.trim(),
      columnId: columnId || kanbanColumns[0]?.id || 'col-todo',
      color: selectedColor,
      priority: selectedPriority,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      checklist,
    };

    if (isEditing && editingKanbanCard) {
      updateKanbanCard(editingKanbanCard.id, {
        ...cardData,
        tags: editingKanbanCard.tags || [],
      });
    } else {
      createKanbanCard(cardData.columnId!, cardData);
    }
    closeKanbanCardModal();
  };

  const handleDelete = () => {
    if (editingKanbanCard) {
      deleteKanbanCard(editingKanbanCard.id);
    }
    closeKanbanCardModal();
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim();
    if (!trimmed) return;
    const newItem: KanbanChecklistItem = {
      id: `kc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: trimmed,
      completed: false,
    };
    setChecklist(prev => [...prev, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleStartCreatePriority = () => {
    setIsCreatingPriority(true);
    setEditingPriorityId(null);
    setPriorityFormName('');
    setPriorityFormColor(theme.accent || '#EF4444');
    setPriorityFormLevel(String(priorities.length + 1));
  };

  const handleStartEditPriority = (p: Priority) => {
    setIsCreatingPriority(true);
    setEditingPriorityId(p.id);
    setPriorityFormName(p.name);
    setPriorityFormColor(p.color || theme.accent);
    setPriorityFormLevel(String(p.level || 1));
  };

  const handleSavePriorityForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = priorityFormName.trim();
    if (!trimmed) return;

    const parsedLevel = Math.max(1, parseInt(priorityFormLevel, 10) || 1);

    if (editingPriorityId) {
      updatePriority(editingPriorityId, {
        name: trimmed,
        color: priorityFormColor,
        level: parsedLevel,
      });
      if (selectedPriority?.id === editingPriorityId) {
        setSelectedPriority({
          ...selectedPriority,
          name: trimmed,
          color: priorityFormColor,
          level: parsedLevel,
        });
      }
    } else {
      const created = createPriority(trimmed, priorityFormColor, parsedLevel);
      setSelectedPriority(created);
    }

    setIsCreatingPriority(false);
    setEditingPriorityId(null);
    setPriorityFormName('');
  };

  const completedChecklistCount = checklist.filter(i => i.completed).length;
  const checklistProgress = checklist.length > 0 ? (completedChecklistCount / checklist.length) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeKanbanCardModal}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border backdrop-blur-xl transition-all space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.96),
          borderColor: hexToRgba(theme.text, 0.15),
          color: theme.text,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full shadow-xs"
              style={{ backgroundColor: selectedColor }}
            />
            <h2 className="text-base font-extrabold">
              {isEditing ? 'Редактировать карточку' : 'Новая задача'}
            </h2>
          </div>
          <button
            onClick={closeKanbanCardModal}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer opacity-60 hover:opacity-100"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold opacity-60">Название карточки</label>
            <input
              id="kanban-card-title-input"
              type="text"
              required
              autoFocus
              placeholder="Что нужно сделать?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border text-sm font-semibold outline-hidden transition"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.05),
                borderColor: hexToRgba(theme.text, 0.14),
                color: theme.text,
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold opacity-60">Описание</label>
            <textarea
              id="kanban-card-desc-input"
              rows={2}
              placeholder="Добавьте подробности..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl border text-xs font-medium outline-hidden transition resize-none leading-relaxed"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.05),
                borderColor: hexToRgba(theme.text, 0.14),
                color: theme.text,
              }}
            />
          </div>

          {/* Column & Priority Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Column Selector */}
            <div className="space-y-1.5 relative" ref={columnDropdownRef}>
              <label className="text-[11px] font-bold opacity-60">Колонка</label>
              
              {/* Custom Trigger Button */}
              <button
                type="button"
                id="kanban-card-column-select-btn"
                onClick={() => {
                  setIsColumnDropdownOpen(prev => !prev);
                  setIsPriorityDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition hover:opacity-90 active:scale-98 cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: isColumnDropdownOpen ? theme.accent : hexToRgba(theme.text, 0.14),
                  color: theme.text,
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: currentColumn?.color || theme.accent }}
                  />
                  <span className="truncate">{currentColumn?.title || 'Выберите колонку'}</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`opacity-60 transition-transform duration-200 shrink-0 ${
                    isColumnDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Custom Column Dropdown Popover */}
              {isColumnDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl p-1.5 shadow-2xl border backdrop-blur-2xl z-50 animate-fadeIn space-y-0.5 max-h-52 overflow-y-auto"
                  style={{
                    backgroundColor: dropdownMenuBg,
                    borderColor: dropdownBorder,
                    color: theme.text,
                    boxShadow: `0 16px 36px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                  }}
                >
                  {kanbanColumns.map(col => {
                    const isSelected = col.id === columnId;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setColumnId(col.id);
                          setIsColumnDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                          isSelected ? 'font-extrabold' : 'font-medium hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        style={{
                          backgroundColor: isSelected ? hexToRgba(theme.accent, 0.18) : 'transparent',
                          color: isSelected ? theme.accent : theme.text,
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: col.color || theme.accent }}
                          />
                          <span className="truncate">{col.title}</span>
                        </div>
                        {isSelected && <Check size={14} style={{ color: theme.accent }} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Priority Selector with Full CRUD (Photo 2) */}
            <div className="space-y-1.5 relative" ref={priorityDropdownRef}>
              <label className="text-[11px] font-bold opacity-60 flex items-center gap-1.5">
                <Flag size={13} />
                <span>Приоритет</span>
              </label>

              {/* Custom Trigger Button */}
              <button
                type="button"
                id="kanban-card-priority-select-btn"
                onClick={() => {
                  setIsPriorityDropdownOpen(prev => !prev);
                  setIsColumnDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition hover:opacity-90 active:scale-98 cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: isPriorityDropdownOpen ? theme.accent : hexToRgba(theme.text, 0.14),
                  color: selectedPriority?.color || theme.text,
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <Flag
                    size={14}
                    style={{ color: selectedPriority?.color || hexToRgba(theme.text, 0.4) }}
                    className={`shrink-0 ${selectedPriority ? 'fill-current' : ''}`}
                  />
                  <span className={`truncate ${!selectedPriority ? 'opacity-60' : 'font-bold'}`}>
                    {selectedPriority?.name || 'Без приоритета'}
                  </span>
                </div>
                <ChevronDown
                  size={15}
                  className={`opacity-60 transition-transform duration-200 shrink-0 ${
                    isPriorityDropdownOpen ? 'rotate-180' : ''
                  }`}
                  style={{ color: theme.text }}
                />
              </button>

              {/* Custom Priority Dropdown Popover */}
              {isPriorityDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl p-2.5 shadow-2xl border backdrop-blur-2xl z-50 animate-fadeIn space-y-2 max-h-72 overflow-y-auto"
                  style={{
                    backgroundColor: dropdownMenuBg,
                    borderColor: dropdownBorder,
                    color: theme.text,
                    boxShadow: `0 18px 40px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.6)'}`,
                  }}
                >
                  <div className="flex items-center justify-between px-1 text-[10px] font-bold opacity-60 uppercase tracking-wider">
                    <span>Приоритеты</span>
                    <span className="font-mono opacity-50">1 = наивысший</span>
                  </div>

                  {/* Option: Без приоритета */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPriority(null);
                      setIsPriorityDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer text-left ${
                      selectedPriority === null ? 'font-extrabold' : 'font-medium hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                    style={{
                      backgroundColor: selectedPriority === null ? hexToRgba(theme.accent, 0.15) : 'transparent',
                      color: selectedPriority === null ? theme.accent : theme.text,
                    }}
                  >
                    <div className="flex items-center gap-2 opacity-70">
                      <Flag size={13} className="shrink-0 opacity-40" />
                      <span>Без приоритета</span>
                    </div>
                    {selectedPriority === null && <Check size={14} style={{ color: theme.accent }} className="shrink-0" />}
                  </button>

                  {/* Priority List sorted by level */}
                  <div className="space-y-1">
                    {[...priorities]
                      .sort((a, b) => (a.level || 999) - (b.level || 999))
                      .map((p, idx) => {
                        const isSelected = selectedPriority?.id === p.id;
                        const priorityLevel = p.level || idx + 1;

                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-1 p-1 rounded-xl transition border"
                            style={{
                              backgroundColor: isSelected ? hexToRgba(p.color, 0.12) : 'transparent',
                              borderColor: isSelected ? hexToRgba(p.color, 0.35) : 'transparent',
                            }}
                          >
                            {/* Clickable body to select priority */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPriority(p);
                                setIsPriorityDropdownOpen(false);
                              }}
                              className="flex-1 flex items-center gap-2 px-1.5 py-1 text-left cursor-pointer truncate"
                            >
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black shrink-0"
                                style={{
                                  backgroundColor: hexToRgba(p.color, 0.18),
                                  color: p.color,
                                }}
                              >
                                {priorityLevel}
                              </span>
                              <Flag size={13} style={{ color: p.color }} className="shrink-0 fill-current" />
                              <span className="truncate text-xs font-bold" style={{ color: p.color }}>
                                {p.name}
                              </span>
                            </button>

                            {/* Actions on right: Pencil Edit + Trash Delete */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleStartEditPriority(p);
                                }}
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/15 opacity-60 hover:opacity-100 transition cursor-pointer"
                                style={{ color: p.color }}
                                title="Редактировать приоритет"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  deletePriority(p.id);
                                  if (selectedPriority?.id === p.id) {
                                    setSelectedPriority(null);
                                  }
                                }}
                                className="p-1 rounded-lg hover:bg-red-500/20 text-red-500 opacity-50 hover:opacity-100 transition cursor-pointer"
                                title="Удалить приоритет"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Add / Edit Inline Form */}
                  {isCreatingPriority ? (
                    <form
                      onSubmit={handleSavePriorityForm}
                      className="p-3 rounded-2xl border space-y-2.5 mt-2 animate-fadeIn"
                      style={{
                        backgroundColor: hexToRgba(theme.text, 0.04),
                        borderColor: hexToRgba(theme.text, 0.14),
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sliders size={13} style={{ color: theme.accent }} />
                          <span>{editingPriorityId ? 'Редактирование' : 'Новый приоритет'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingPriority(false);
                            setEditingPriorityId(null);
                          }}
                          className="p-1 rounded-md opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Name input */}
                      <div>
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="Название приоритета"
                          value={priorityFormName}
                          onChange={e => setPriorityFormName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border text-xs font-medium outline-hidden"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.05),
                            borderColor: hexToRgba(theme.text, 0.15),
                            color: theme.text,
                          }}
                        />
                      </div>

                      {/* Importance Level */}
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold opacity-70">
                          Важность (1 = наивысший):
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={priorityFormLevel}
                          onChange={e => setPriorityFormLevel(e.target.value)}
                          className="w-16 px-2 py-1 rounded-xl border text-xs font-mono font-bold text-center outline-hidden"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.05),
                            borderColor: hexToRgba(theme.text, 0.15),
                            color: theme.text,
                          }}
                        />
                      </div>

                      {/* Color Palette */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold opacity-70">Цвет:</label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRIORITY_COLOR_PALETTE.map(c => {
                            const isCSelected = priorityFormColor.toLowerCase() === c.toLowerCase();
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setPriorityFormColor(c)}
                                className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                                  isCSelected ? 'scale-125 ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100'
                                }`}
                                style={{
                                  backgroundColor: c,
                                  borderColor: isCSelected ? '#FFFFFF' : 'transparent',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingPriority(false);
                            setEditingPriorityId(null);
                          }}
                          className="px-2.5 py-1 rounded-xl border text-[11px] font-bold opacity-70 hover:opacity-100 cursor-pointer"
                          style={{ borderColor: hexToRgba(theme.text, 0.15) }}
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-xl text-[11px] font-bold text-white shadow-xs cursor-pointer"
                          style={{ backgroundColor: theme.accent }}
                        >
                          Сохранить
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* + Add Priority Button */
                    <button
                      type="button"
                      onClick={handleStartCreatePriority}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-dashed text-xs font-bold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer mt-1"
                      style={{ borderColor: hexToRgba(theme.text, 0.2), color: theme.text }}
                    >
                      <Plus size={13} />
                      <span>Добавить приоритет</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Due Date & Exact Time (Custom Time Picker) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold opacity-60 flex items-center gap-1.5">
                <CalendarIcon size={13} />
                <span>Срок выполнения (дата)</span>
              </label>
              <input
                id="kanban-card-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-hidden"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: hexToRgba(theme.text, 0.14),
                  color: theme.text,
                }}
              />
            </div>

            {/* Custom Time Picker (Clock) */}
            <div className="space-y-1.5">
              <CustomTimePicker
                label="Время (часы)"
                value={dueTime}
                onChange={setDueTime}
                allowClear
                placeholder="Не указано"
              />
            </div>
          </div>

          {/* Color Swatches */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold opacity-60">Цвет карточки</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {KANBAN_PASTEL_COLORS.map(item => {
                const isSelected = selectedColor.toLowerCase() === item.color.toLowerCase();
                return (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setSelectedColor(item.color)}
                    className={`w-6 h-6 rounded-lg transition-transform cursor-pointer border ${
                      isSelected ? 'scale-110 shadow-xs ring-2' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: item.color,
                      borderColor: isSelected ? theme.text : 'transparent',
                    }}
                    title={item.name}
                  />
                );
              })}
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2 pt-1 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold opacity-60 flex items-center gap-1.5">
                <CheckSquare size={13} />
                <span>Чек-лист</span>
                {checklist.length > 0 && (
                  <span className="text-[10px] opacity-80 ml-1">
                    ({completedChecklistCount}/{checklist.length})
                  </span>
                )}
              </label>

              {checklist.length > 0 && (
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: hexToRgba(theme.text, 0.1) }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${checklistProgress}%`,
                      backgroundColor: theme.accent,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Checklist Items List */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs group"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.03),
                      borderColor: hexToRgba(theme.text, 0.1),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className="flex items-center gap-2 text-left flex-1 truncate cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          item.completed ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: item.completed ? theme.accent : 'transparent',
                          borderColor: item.completed ? theme.accent : hexToRgba(theme.text, 0.3),
                        }}
                      >
                        {item.completed && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className={`truncate ${item.completed ? 'line-through opacity-50' : ''}`}>
                        {item.text}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 rounded-md text-red-500 opacity-40 hover:opacity-100 transition cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Checklist Item Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Добавить пункт чек-листа..."
                value={newChecklistText}
                onChange={e => setNewChecklistText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl border text-xs font-medium outline-hidden"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.03),
                  borderColor: hexToRgba(theme.text, 0.1),
                  color: theme.text,
                }}
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white active:scale-95 transition cursor-pointer flex items-center gap-1 shadow-xs"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus size={13} />
                <span>Добавить</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              className="py-2 px-3.5 rounded-2xl border text-xs font-bold text-red-500 hover:bg-red-500/10 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <Trash2 size={13} />
              <span>Удалить</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeKanbanCardModal}
              className="py-2 px-4 rounded-2xl border text-xs font-bold hover:opacity-80 active:scale-95 transition cursor-pointer"
              style={{
                borderColor: hexToRgba(theme.text, 0.15),
                backgroundColor: hexToRgba(theme.text, 0.05),
                color: theme.text,
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-5 rounded-2xl text-xs font-bold text-white active:scale-95 transition cursor-pointer shadow-md flex items-center gap-1.5"
              style={{ backgroundColor: theme.accent }}
            >
              <Check size={14} />
              <span>{isEditing ? 'Сохранить' : 'Создать'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
