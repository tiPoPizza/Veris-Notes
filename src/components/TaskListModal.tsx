import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { TaskItem, Priority, Tag } from '../types';
import {
  X,
  Plus,
  Trash2,
  Check,
  Tag as TagIcon,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Palette,
  Edit2,
  Sliders,
  Minus,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { ColorSelectGroup } from './ColorSelectGroup';

export const TaskListModal: React.FC = () => {
  const {
    isTaskModalOpen,
    editingTaskList,
    closeTaskModal,
    saveTaskList,
    deleteTaskList,
    tags,
    createTag,
    updateTag,
    deleteTagByName,
    priorities,
    createPriority,
    updatePriority,
    deletePriority,
    theme,
    language,
    quickSettings,
  } = useApp();

  const [title, setTitle] = useState('');
  const [items, setItems] = useState<TaskItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<Priority | null>(null);

  // New item text input
  const [newItemText, setNewItemText] = useState('');

  // Submenu toggle states
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isTagsMenuOpen, setIsTagsMenuOpen] = useState(false);

  // Create/Edit priority state
  const [isCreatingPriority, setIsCreatingPriority] = useState(false);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newPriorityColor, setNewPriorityColor] = useState('#EF4444');
  const [newPriorityLevel, setNewPriorityLevel] = useState<string>('1');

  // Create/Edit tag state
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const tagsMenuRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);

  // Sync state when modal opens or editingTaskList changes
  useEffect(() => {
    if (isTaskModalOpen) {
      if (editingTaskList) {
        setTitle(editingTaskList.title || '');
        setItems(editingTaskList.items ? [...editingTaskList.items] : []);
        setSelectedTags(editingTaskList.tags ? [...editingTaskList.tags] : []);

        // Priority restoration
        if (editingTaskList.priority) {
          setSelectedPriority(editingTaskList.priority);
        } else if (editingTaskList.badgeText) {
          const matched = priorities.find(
            p => p.name.toLowerCase() === editingTaskList.badgeText?.toLowerCase()
          );
          if (matched) {
            setSelectedPriority(matched);
          } else {
            const colorMap: Record<string, string> = {
              red: '#EF4444',
              gold: '#EAB308',
              green: '#22C55E',
              blue: '#3B82F6',
              purple: '#A855F7',
              gray: '#94A3B8',
            };
            setSelectedPriority({
              id: `p-legacy-${editingTaskList.id}`,
              name: editingTaskList.badgeText,
              color:
                (editingTaskList.badgeColor && colorMap[editingTaskList.badgeColor]) ||
                theme.accent,
              level: 3,
            });
          }
        } else {
          setSelectedPriority(null);
        }
      } else {
        setTitle('');
        setItems([]);
        setSelectedTags([]);
        setSelectedPriority(null);
      }
      setNewItemText('');
      setIsPriorityMenuOpen(false);
      setIsTagsMenuOpen(false);
      setIsCreatingTag(false);
      setEditingTagId(null);
      setNewTagName('');
      setNewTagColor(theme.accent || '#3B82F6');
      setIsCreatingPriority(false);
      setEditingPriorityId(null);
      setNewPriorityName('');
      setNewPriorityColor(theme.accent || '#EF4444');
      setNewPriorityLevel(String(priorities.length + 1));
    }
  }, [isTaskModalOpen, editingTaskList]);

  // Close submenus on click outside (safely ignoring button clicks so layout doesn't shift and cancel click events)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Never close on clicks inside any action buttons / modal footer
      if (target.closest('button') || target.closest('.modal-footer-action')) {
        return;
      }

      if (
        priorityMenuRef.current &&
        !priorityMenuRef.current.contains(target)
      ) {
        setIsPriorityMenuOpen(false);
      }
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(target)) {
        setIsTagsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isTaskModalOpen) return null;

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    const newItem: TaskItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: trimmed,
      completed: false,
    };
    setItems(prev => [...prev, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (id: string) => {
    setItems(prev => {
      const updated = prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item));
      const uncompleted = updated.filter(i => !i.completed);
      const completed = updated.filter(i => i.completed);
      return [...uncompleted, ...completed];
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateItemText = (id: string, newText: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, text: newText } : item))
    );
  };

  const handleToggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const handleStartCreateTag = () => {
    setIsCreatingTag(true);
    setEditingTagId(null);
    setNewTagName('');
    setNewTagColor(theme.accent || '#3B82F6');
  };

  const handleStartEditTag = (tag: Tag) => {
    setIsCreatingTag(true);
    setEditingTagId(tag.id);
    setNewTagName(tag.name);
    setNewTagColor(tag.color || theme.accent);
  };

  const handleSaveTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    if (editingTagId) {
      updateTag(editingTagId, {
        name: trimmed,
        color: newTagColor,
      });
      // Update selected tags if name changed
      const oldTag = tags.find(t => t.id === editingTagId);
      if (oldTag && oldTag.name.toLowerCase() !== trimmed.toLowerCase()) {
        setSelectedTags(prev =>
          prev.map(t => (t.toLowerCase() === oldTag.name.toLowerCase() ? trimmed : t))
        );
      }
    } else {
      const created = createTag(trimmed, newTagColor);
      if (!selectedTags.includes(created.name)) {
        setSelectedTags(prev => [...prev, created.name]);
      }
    }
    setNewTagName('');
    setIsCreatingTag(false);
    setEditingTagId(null);
  };

  const handleSelectPriority = (priority: Priority | null) => {
    setSelectedPriority(priority);
    setIsPriorityMenuOpen(false);
  };

  const handleStartCreatePriority = () => {
    setIsCreatingPriority(true);
    setEditingPriorityId(null);
    setNewPriorityName('');
    setNewPriorityColor(theme.accent || '#EF4444');
    setNewPriorityLevel(String(priorities.length + 1));
  };

  const handleStartEditPriority = (p: Priority) => {
    setIsCreatingPriority(true);
    setEditingPriorityId(p.id);
    setNewPriorityName(p.name);
    setNewPriorityColor(p.color);
    setNewPriorityLevel(String(p.level || 1));
  };

  const handleSavePriority = () => {
    const trimmed = newPriorityName.trim();
    if (!trimmed) return;

    const parsedLevel = parseInt(newPriorityLevel, 10);
    const finalLevel = !parsedLevel || parsedLevel < 1 ? 1 : parsedLevel;

    if (editingPriorityId) {
      updatePriority(editingPriorityId, {
        name: trimmed,
        color: newPriorityColor,
        level: finalLevel,
      });
      if (
        selectedPriority?.id === editingPriorityId ||
        selectedPriority?.name.toLowerCase() === trimmed.toLowerCase()
      ) {
        setSelectedPriority({
          id: editingPriorityId,
          name: trimmed,
          color: newPriorityColor,
          level: finalLevel,
        });
      }
    } else {
      const created = createPriority(trimmed, newPriorityColor, finalLevel);
      setSelectedPriority(created);
    }
    setNewPriorityName('');
    setIsCreatingPriority(false);
    setEditingPriorityId(null);
  };

  const handleSave = () => {
    saveTaskList({
      id: editingTaskList?.id,
      title: title.trim() || 'Без названия',
      items,
      tags: selectedTags,
      priority: selectedPriority,
    });
    closeTaskModal();
  };

  const handleDelete = () => {
    if (editingTaskList) {
      deleteTaskList(editingTaskList.id);
      closeTaskModal();
    }
  };

  const colorPalette = [
    theme.accent,
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#2EC4B6', // Teal
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#94A3B8', // Gray
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  const priorityRankOptions = [
    { level: 1, label: '1 · Высочайший' },
    { level: 2, label: '2 · Высокий' },
    { level: 3, label: '3 · Средний' },
    { level: 4, label: '4 · Низкий' },
    { level: 5, label: '5 · Неважно' },
    { level: 6, label: '6 · Когда получится' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md transition-all select-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={closeTaskModal}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl backdrop-blur-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(theme.bg, 0.94),
          color: theme.text,
          borderColor: quickSettings.showBorder ? hexToRgba(theme.text, 0.16) : 'transparent',
          boxShadow: isLight
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.2)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: hexToRgba(theme.text, 0.1) }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.15), color: theme.accent }}
            >
              <CheckSquare size={18} />
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              {editingTaskList ? 'Редактировать список задач' : 'Новый список задач'}
            </h2>
          </div>
          <button
            onClick={closeTaskModal}
            className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1 & 2. Название (Title) with shortened label and compact placeholder */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-60">
                Название
              </label>
              <span className="text-[10px] opacity-40 font-mono">
                {title.length}/50
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={50}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например, покупки..."
              className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-semibold border outline-none transition"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.05),
                borderColor: hexToRgba(theme.text, 0.12),
                color: theme.text,
              }}
            />
          </div>

          {/* 3, 4, 5, 6, 10. Задачи section */}
          <div className="space-y-2.5">
            {/* Header with "ЗАДАЧИ 0" without parentheses, 0 is dimmer */}
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="opacity-60">Задачи</span>
                <span className="opacity-40 font-semibold">{items.length}</span>
              </label>
            </div>

            {/* Add Task Input Row with shortened placeholder and compact "+" button */}
            <form onSubmit={handleAddItem} className="flex items-center gap-2">
              <input
                type="text"
                value={newItemText}
                maxLength={80}
                onChange={e => setNewItemText(e.target.value)}
                placeholder="Новая задача..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm border outline-none transition"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: hexToRgba(theme.text, 0.12),
                  color: theme.text,
                }}
              />
              <button
                type="submit"
                disabled={!newItemText.trim()}
                title="Добавить"
                className="w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95 shadow-sm"
                style={{
                  backgroundColor: theme.accent,
                  color: '#FFFFFF',
                }}
              >
                <Plus size={18} className="stroke-[2.5]" />
              </button>
            </form>

            {/* Task items list (empty state removed completely as requested) */}
            {items.length > 0 && (
              <div
                className="space-y-1.5 max-h-48 overflow-y-auto pr-1 rounded-2xl p-1"
                style={{ backgroundColor: hexToRgba(theme.text, 0.02) }}
              >
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition group"
                    style={{
                      backgroundColor: hexToRgba(theme.text, item.completed ? 0.03 : 0.06),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className="shrink-0 transition cursor-pointer opacity-80 hover:opacity-100"
                      style={{ color: item.completed ? theme.accent : hexToRgba(theme.text, 0.4) }}
                    >
                      {item.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>

                    <input
                      type="text"
                      value={item.text}
                      maxLength={80}
                      onChange={e => handleUpdateItemText(item.id, e.target.value)}
                      className={`flex-1 bg-transparent text-xs sm:text-sm outline-none ${
                        item.completed ? 'line-through opacity-50' : 'opacity-90'
                      }`}
                      style={{ color: theme.text }}
                    />

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition cursor-pointer shrink-0"
                      title="Удалить задачу"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7. ВАЖНОСТЬ (Submenu / Dropdown) */}
          <div className="space-y-1.5 relative" ref={priorityMenuRef}>
            <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
              <AlertCircle size={13} style={{ color: selectedPriority ? selectedPriority.color : theme.accent }} />
              <span>Важность</span>
            </label>

            {/* Submenu Trigger Button (Clean theme-matched row) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPriorityMenuOpen(prev => !prev);
                  setIsTagsMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold transition cursor-pointer text-left"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  borderColor: isPriorityMenuOpen ? theme.accent : hexToRgba(theme.text, 0.12),
                  color: theme.text,
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedPriority ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-xs"
                      style={{
                        backgroundColor: selectedPriority.color,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>{selectedPriority.name}</span>
                    </span>
                  ) : (
                    <span className="opacity-50 text-xs font-normal">Не указана</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-50 shrink-0">
                  {isPriorityMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {selectedPriority && (
                <button
                  type="button"
                  onClick={() => setSelectedPriority(null)}
                  className="p-2 rounded-xl border opacity-60 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
                  style={{ borderColor: hexToRgba(theme.text, 0.12), color: theme.text }}
                  title="Снять важность"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Submenu Popover for Priority */}
            {isPriorityMenuOpen && (
              <div
                className="mt-1 p-3.5 rounded-2xl border shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                  borderColor: hexToRgba(theme.text, 0.16),
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-extrabold opacity-60 uppercase tracking-wider">
                    Важности (по приоритету)
                  </div>
                  <span className="text-[10px] opacity-40 font-mono">1 = наивысший</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPriority(null)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                      !selectedPriority ? 'ring-2' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.05),
                      borderColor: hexToRgba(theme.text, 0.15),
                      color: theme.text,
                    }}
                  >
                    <span>Без важности</span>
                  </button>

                  {[...priorities]
                    .sort((a, b) => (a.level || 999) - (b.level || 999))
                    .map((p, idx) => {
                      const isSelected = selectedPriority?.name.toLowerCase() === p.name.toLowerCase();
                      const priorityLevel = p.level || idx + 1;
                      return (
                        <div
                          key={p.id}
                          className="inline-flex items-center rounded-xl border transition shadow-xs overflow-hidden"
                          style={{
                            backgroundColor: isSelected ? p.color : hexToRgba(p.color, 0.14),
                            borderColor: isSelected ? p.color : hexToRgba(p.color, 0.35),
                          }}
                        >
                          {/* Priority Number Badge */}
                          <button
                            type="button"
                            onClick={() => handleSelectPriority(p)}
                            className="pl-2.5 pr-1 py-1.5 flex items-center cursor-pointer"
                            style={{ color: isSelected ? '#FFFFFF' : p.color }}
                          >
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black"
                              style={{
                                backgroundColor: isSelected ? 'rgba(0,0,0,0.25)' : hexToRgba(p.color, 0.2),
                                color: isSelected ? '#FFFFFF' : p.color,
                              }}
                            >
                              {priorityLevel}
                            </span>
                          </button>

                          {/* Pencil icon placed to the left of the name */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleStartEditPriority(p);
                            }}
                            className={`p-1 rounded-md transition cursor-pointer flex items-center justify-center opacity-70 hover:opacity-100 ${
                              isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-black/10'
                            }`}
                            style={{ color: isSelected ? '#FFFFFF' : p.color }}
                            title={`Настроить «${p.name}» (цвет, приоритет)`}
                          >
                            <Edit2 size={11} />
                          </button>

                          {/* Priority Name & Selection Indicator */}
                          <button
                            type="button"
                            onClick={() => handleSelectPriority(p)}
                            className="flex items-center gap-1.5 pl-1 pr-2 py-1.5 text-xs font-bold transition cursor-pointer"
                            style={{
                              color: isSelected ? '#FFFFFF' : p.color,
                            }}
                          >
                            {isSelected && <Check size={12} className="stroke-[3]" />}
                            <span>{p.name}</span>
                          </button>

                          {/* Separated delete button on far right to prevent misclicks */}
                          <div
                            className="flex items-center pl-1 pr-1.5 border-l py-1"
                            style={{
                              borderColor: isSelected ? 'rgba(255,255,255,0.25)' : hexToRgba(p.color, 0.25),
                            }}
                          >
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                deletePriority(p.id);
                                if (
                                  selectedPriority?.id === p.id ||
                                  (selectedPriority?.name && p.name && selectedPriority.name.toLowerCase() === p.name.toLowerCase())
                                ) {
                                  setSelectedPriority(null);
                                }
                              }}
                              className={`p-1 rounded-md transition cursor-pointer flex items-center justify-center opacity-50 hover:opacity-100 ${
                                isSelected ? 'hover:bg-white/20 text-white hover:text-red-200' : 'hover:bg-red-500/20 hover:text-red-500'
                              }`}
                              style={{ color: isSelected ? '#FFFFFF' : p.color }}
                              title={`Удалить «${p.name}»`}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {!isCreatingPriority ? (
                  <button
                    type="button"
                    onClick={handleStartCreatePriority}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold opacity-80 hover:opacity-100 hover:bg-white/10 transition cursor-pointer border border-dashed"
                    style={{ borderColor: hexToRgba(theme.text, 0.25), color: theme.text }}
                  >
                    <Plus size={14} />
                    <span>Создать свою важность</span>
                  </button>
                ) : (
                  <div
                    className="p-3 rounded-2xl border space-y-3 animate-in fade-in duration-150"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.03),
                      borderColor: hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Sliders size={13} style={{ color: theme.accent }} />
                        <span>{editingPriorityId ? 'Настройка важности' : 'Новая важность'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingPriority(false);
                          setEditingPriorityId(null);
                        }}
                        className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Name input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                        Название
                      </label>
                      <input
                        type="text"
                        value={newPriorityName}
                        onChange={e => setNewPriorityName(e.target.value)}
                        placeholder="Например: Супер Срочно, Второстепенно..."
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.06),
                          borderColor: hexToRgba(theme.text, 0.12),
                          color: theme.text,
                        }}
                        autoFocus
                      />
                    </div>

                    {/* Color Palette + Custom Picker */}
                    <ColorSelectGroup
                      selectedColor={newPriorityColor}
                      onChange={setNewPriorityColor}
                      theme={theme}
                      label="Цвет важности"
                    />

                    {/* Free-form Priority Level: 1 to n */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                          Приоритет (число от 1 до N)
                        </label>
                        <span className="text-[10px] opacity-50 font-mono">1 = наивысшая важность</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const curr = parseInt(newPriorityLevel, 10) || 1;
                            setNewPriorityLevel(String(Math.max(1, curr - 1)));
                          }}
                          className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer opacity-75 hover:opacity-100 transition active:scale-95"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.05),
                            borderColor: hexToRgba(theme.text, 0.15),
                            color: theme.text,
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={newPriorityLevel}
                          onChange={e => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            setNewPriorityLevel(clean);
                          }}
                          onBlur={() => {
                            const parsed = parseInt(newPriorityLevel, 10);
                            if (!parsed || parsed < 1) {
                              setNewPriorityLevel('1');
                            } else {
                              setNewPriorityLevel(String(parsed));
                            }
                          }}
                          placeholder="1"
                          className="flex-1 px-3 py-1.5 rounded-xl text-center font-mono font-black text-sm border outline-none transition"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.06),
                            borderColor: hexToRgba(theme.text, 0.15),
                            color: theme.text,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const curr = parseInt(newPriorityLevel, 10) || 1;
                            setNewPriorityLevel(String(curr + 1));
                          }}
                          className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer opacity-75 hover:opacity-100 transition active:scale-95"
                          style={{
                            backgroundColor: hexToRgba(theme.text, 0.05),
                            borderColor: hexToRgba(theme.text, 0.15),
                            color: theme.text,
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <p className="text-[10px] opacity-50 leading-tight">
                        Чем меньше число, тем важнее список (1 отображается первым при сортировке по важности).
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingPriority(false);
                          setEditingPriorityId(null);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePriority}
                        disabled={!newPriorityName.trim()}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                        style={{ backgroundColor: newPriorityColor, color: '#FFFFFF' }}
                      >
                        {editingPriorityId ? 'Сохранить важность' : 'Добавить важность'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 8. ТЕГИ (Submenu / Dropdown, label shortened to ТЕГИ) */}
          <div className="space-y-1.5 relative" ref={tagsMenuRef}>
            <label className="text-[11px] font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
              <TagIcon size={13} style={{ color: theme.accent }} />
              <span>Теги</span>
            </label>

            {/* Submenu Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setIsTagsMenuOpen(prev => !prev);
                setIsPriorityMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold transition cursor-pointer text-left"
              style={{
                backgroundColor: hexToRgba(theme.text, 0.05),
                borderColor: isTagsMenuOpen ? theme.accent : hexToRgba(theme.text, 0.12),
                color: theme.text,
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap truncate">
                {selectedTags.length > 0 ? (
                  selectedTags.map(tagName => {
                    const tagObj = tags.find(t => t.name === tagName);
                    const color = tagObj?.color || theme.accent;
                    return (
                      <span
                        key={tagName}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: hexToRgba(color, 0.2),
                          color: color,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{tagName}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="opacity-50 text-xs font-normal">Добавить теги...</span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-50 shrink-0 ml-2">
                {isTagsMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {/* Submenu Popover for Tags */}
            {isTagsMenuOpen && (
              <div
                className="mt-1 p-3 rounded-2xl border shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : hexToRgba(theme.bg, 0.98),
                  borderColor: hexToRgba(theme.text, 0.16),
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-bold opacity-60 uppercase tracking-wider">
                  <span>Выберите теги для списка</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <div
                        key={tag.id}
                        className="inline-flex items-center rounded-xl border transition shadow-xs overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? hexToRgba(tag.color, 0.25)
                            : hexToRgba(theme.text, 0.05),
                          borderColor: isSelected ? tag.color : hexToRgba(theme.text, 0.12),
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag.name)}
                          className="flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 text-xs font-bold transition cursor-pointer"
                          style={{
                            color: isSelected ? tag.color : theme.text,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                          {isSelected && <Check size={12} style={{ color: tag.color }} />}
                        </button>

                        {/* Pencil right next to name */}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleStartEditTag(tag);
                          }}
                          className="p-1 mr-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/10 transition cursor-pointer flex items-center justify-center"
                          style={{ color: tag.color }}
                          title={`Настроить тег «${tag.name}» (цвет, название)`}
                        >
                          <Edit2 size={11} />
                        </button>

                        {/* Delete button on far right */}
                        <div className="flex items-center pr-1.5 py-1">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              deleteTagByName(tag.name);
                              setSelectedTags(prev => prev.filter(t => t.toLowerCase() !== tag.name.toLowerCase()));
                            }}
                            className="p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition cursor-pointer flex items-center justify-center"
                            style={{ color: tag.color }}
                            title={`Удалить тег «${tag.name}»`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isCreatingTag ? (
                  <button
                    type="button"
                    onClick={handleStartCreateTag}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold opacity-80 hover:opacity-100 hover:bg-white/10 transition cursor-pointer border border-dashed"
                    style={{ borderColor: hexToRgba(theme.text, 0.25), color: theme.text }}
                  >
                    <Plus size={13} />
                    <span>Создать новый тег</span>
                  </button>
                ) : (
                  <div
                    className="p-3 rounded-2xl border space-y-3 animate-in fade-in duration-150"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.03),
                      borderColor: hexToRgba(theme.text, 0.12),
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{editingTagId ? 'Настройка тега' : 'Новый тег'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingTag(false);
                          setEditingTagId(null);
                        }}
                        className="opacity-60 hover:opacity-100 cursor-pointer p-1"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                        Название тега
                      </label>
                      <input
                        type="text"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="Название тега..."
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none transition"
                        style={{
                          backgroundColor: hexToRgba(theme.text, 0.06),
                          borderColor: hexToRgba(theme.text, 0.12),
                          color: theme.text,
                        }}
                        autoFocus
                      />
                    </div>

                    <ColorSelectGroup
                      selectedColor={newTagColor}
                      onChange={setNewTagColor}
                      theme={theme}
                      label="Цвет тега"
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingTag(false);
                          setEditingTagId(null);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTag}
                        disabled={!newTagName.trim()}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                        style={{ backgroundColor: newTagColor, color: '#FFFFFF' }}
                      >
                        {editingTagId ? 'Сохранить тег' : 'Добавить тег'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 9. Modal Footer with Отмена on the far left and Создать/Сохранить on the far right */}
        <div
          className="flex items-center justify-between px-5 py-4 border-t modal-footer-action"
          style={{ borderColor: hexToRgba(theme.text, 0.1) }}
        >
          {/* Left Side: Отмена (and optional delete button if editing) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeTaskModal}
              className="modal-footer-action px-4 py-2 rounded-2xl text-xs font-bold opacity-70 hover:opacity-100 hover:bg-white/10 transition cursor-pointer"
            >
              Отмена
            </button>
            {editingTaskList && (
              <button
                type="button"
                onClick={handleDelete}
                className="modal-footer-action flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20 text-red-500 transition cursor-pointer"
                title="Удалить список"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Удалить</span>
              </button>
            )}
          </div>

          {/* Right Side: Создать / Сохранить */}
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={handleSave}
            className="modal-footer-action px-6 py-2.5 rounded-2xl text-xs font-extrabold shadow-md hover:opacity-90 active:scale-95 transition cursor-pointer"
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
            }}
          >
            {editingTaskList ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};
