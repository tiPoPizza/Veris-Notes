import React, { useState } from 'react';
import { Layers, Plus, Check, Trash2, Edit2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hexToRgba } from '../themes';

export const WorkspaceModal: React.FC = () => {
  const {
    theme,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    isWorkspaceModalOpen,
    setIsWorkspaceModalOpen,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isWorkspaceModalOpen) return null;

  const isLight = theme.type === 'Prelude';
  const modalBg = isLight ? 'rgba(255, 255, 255, 0.95)' : hexToRgba(theme.bg, 0.95);
  const itemBg = hexToRgba(theme.text, 0.04);
  const borderColor = hexToRgba(theme.text, 0.1);

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameWorkspace(id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCreate = () => {
    if (newWsName.trim()) {
      const created = createWorkspace(newWsName.trim());
      if (created) {
        switchWorkspace(created.id);
      }
      setNewWsName('');
      setIsCreating(false);
    }
  };

  const handleDeleteConfirm = (id: string) => {
    deleteWorkspace(id);
    setDeletingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => setIsWorkspaceModalOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl backdrop-blur-2xl transition-all space-y-4"
        style={{
          backgroundColor: modalBg,
          color: theme.text,
          border: `1px solid ${borderColor}`,
          boxShadow: isLight ? '0 20px 40px rgba(0, 0, 0, 0.12)' : '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: hexToRgba(theme.accent, 0.15) }}
            >
              <Layers size={16} style={{ color: theme.accent }} />
            </div>
            <div>
              <div className="text-sm font-bold">Воркспейсы</div>
              <div className="text-[11px] opacity-60">
                {workspaces.length} из 3 пространств
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsWorkspaceModalOpen(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspaces List */}
        <div className="space-y-2">
          {workspaces.map(ws => {
            const isActive = ws.id === activeWorkspaceId;
            const isEditing = editingId === ws.id;
            const isDeleting = deletingId === ws.id;

            if (isDeleting) {
              return (
                <div
                  key={ws.id}
                  className="p-3 rounded-2xl flex flex-col gap-2 transition"
                  style={{ backgroundColor: hexToRgba('#EF4444', 0.1) }}
                >
                  <div className="text-xs font-semibold text-red-500">
                    Удалить «{ws.name}» со всеми данными?
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                      style={{ backgroundColor: itemBg }}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(ws.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={ws.id}
                className="group flex items-center justify-between p-2.5 rounded-2xl transition cursor-pointer"
                style={{
                  backgroundColor: isActive ? hexToRgba(theme.accent, 0.14) : itemBg,
                }}
                onClick={() => {
                  if (!isEditing) {
                    switchWorkspace(ws.id);
                  }
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition"
                    style={{
                      backgroundColor: isActive ? theme.accent : hexToRgba(theme.text, 0.15),
                      color: isActive ? '#fff' : 'transparent',
                    }}
                  >
                    {isActive && <Check size={12} strokeWidth={3} />}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRename(ws.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      className="text-xs font-bold px-2 py-1 rounded-lg border outline-none flex-1 min-w-0"
                      style={{
                        backgroundColor: modalBg,
                        borderColor: theme.accent,
                        color: theme.text,
                      }}
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{ws.name}</div>
                      {isActive && (
                        <div className="text-[10px] opacity-70 font-medium" style={{ color: theme.accent }}>
                          Активный
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <button
                      onClick={() => handleSaveRename(ws.id)}
                      className="p-1.5 rounded-xl hover:opacity-80 transition cursor-pointer"
                      style={{ color: theme.accent }}
                      title="Сохранить"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartRename(ws.id, ws.name)}
                        className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-white/10 active:scale-95 transition cursor-pointer"
                        title="Переименовать"
                      >
                        <Edit2 size={13} />
                      </button>

                      {workspaces.length > 1 && (
                        <button
                          onClick={() => setDeletingId(ws.id)}
                          className="p-1.5 rounded-xl opacity-60 hover:opacity-100 hover:bg-red-500/15 text-red-500 active:scale-95 transition cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create workspace action (if < 3) */}
        {workspaces.length < 3 && (
          <div>
            {isCreating ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  placeholder="Название воркспейса..."
                  autoFocus
                  className="flex-1 text-xs px-3 py-2 rounded-xl border outline-none"
                  style={{
                    backgroundColor: itemBg,
                    borderColor: theme.accent,
                    color: theme.text,
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newWsName.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: theme.accent }}
                >
                  Создать
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-2 rounded-xl opacity-60 hover:opacity-100 transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-semibold hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.08),
                  color: theme.accent,
                }}
              >
                <Plus size={14} />
                <span>Создать воркспейс</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
