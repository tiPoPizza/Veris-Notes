import React, { useState, useEffect, useRef } from 'react';
import { NoteAttachment } from '../types';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  X,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  Save,
  Check,
  Edit3,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

interface AttachmentPreviewModalProps {
  attachment: NoteAttachment | null;
  noteId: string;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  attachment,
  noteId,
  onClose,
}) => {
  const {
    notes,
    deleteAttachmentFromNote,
    updateAttachmentInNote,
    theme,
    language,
    quickSettings,
  } = useApp();

  const activeNote = notes.find(n => n.id === noteId);
  const liveAttachment = activeNote?.attachments?.find(a => a.id === attachment?.id) || attachment;

  const [editableText, setEditableText] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>(attachment?.name || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (liveAttachment) {
      setEditableText(liveAttachment.textContent || '');
      setNameInput(liveAttachment.name || '');
      setDisplayName(liveAttachment.name || '');
      setIsSaved(false);
      setIsEditingName(false);
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
      setIsDeleteConfirmOpen(false);
    }
  }, [liveAttachment?.id]);

  useEffect(() => {
    if (liveAttachment?.name) {
      setDisplayName(liveAttachment.name);
    }
  }, [liveAttachment?.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Audio cleanup on close or switch
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!liveAttachment) return null;

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const cardBg = hexToRgba(theme.text, 0.06);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.15);
  const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

  const isAudio =
    liveAttachment.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|webm|opus|flac|wma)$/i.test(liveAttachment.name);

  const isImage =
    !isAudio &&
    (liveAttachment.type.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(liveAttachment.name));

  const isText =
    !isAudio &&
    (liveAttachment.textContent !== undefined ||
      liveAttachment.type.startsWith('text/') ||
      /\.(txt|md|json|csv|js|ts|html|css|xml|py)$/i.test(liveAttachment.name));

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Audio controls
  const togglePlayAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio(liveAttachment.dataUrl);
      audio.volume = isMuted ? 0 : audioVolume;
      audio.playbackRate = playbackRate;
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || 0);
      };
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime || 0);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
      };
      audioRef.current = audio;
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(err => console.warn('Audio play failed:', err));
    }
  };

  const cyclePlaybackRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleAudioScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Save renamed file immediately
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== displayName) {
      setDisplayName(trimmed);
      updateAttachmentInNote(noteId, liveAttachment.id, { name: trimmed });
      // Update in-editor DOM chip label if present
      const embedEl = document.querySelector(`[data-attachment-id="${liveAttachment.id}"]`);
      if (embedEl) {
        const titleSpan = embedEl.querySelector('.truncate');
        if (titleSpan) titleSpan.textContent = trimmed;
      }
    } else {
      setNameInput(displayName);
    }
    setIsEditingName(false);
  };

  // Download file
  const handleDownload = (filename: string, contentData: string, mimeType: string, isPlainText = false) => {
    const a = document.createElement('a');
    if (isPlainText) {
      const blob = new Blob([contentData], { type: mimeType || 'text/plain;charset=utf-8' });
      a.href = URL.createObjectURL(blob);
    } else {
      a.href = contentData;
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save changes & download updated version
  const handleSaveTextAndDownload = () => {
    const newMime = liveAttachment.type || 'text/plain';
    const encodedDataUrl = `data:${newMime};base64,${btoa(
      unescape(encodeURIComponent(editableText))
    )}`;

    updateAttachmentInNote(noteId, liveAttachment.id, {
      textContent: editableText,
      dataUrl: encodedDataUrl,
      size: new Blob([editableText]).size,
      updatedAt: Date.now(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    handleDownload(displayName, editableText, newMime, true);
  };

  const confirmDelete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const editorEmbeds = document.querySelectorAll(`[data-attachment-id="${liveAttachment.id}"]`);
    editorEmbeds.forEach(el => el.remove());
    deleteAttachmentFromNote(noteId, liveAttachment.id);
    onClose();
  };

  return (
    <>
      {/* Delete confirmation modal */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border backdrop-blur-2xl transition-all space-y-4 animate-scaleUp"
            style={{
              backgroundColor: hexToRgba(theme.bg, 0.95),
              color: theme.text,
              borderColor: cardBorder,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5">
              <Trash2 size={24} style={{ color: theme.accent }} className="shrink-0" />
              <div>
                <h3 className="font-extrabold text-base">Удалить вложение?</h3>
                <p className="text-xs opacity-60 mt-0.5">
                  Вы действительно хотите удалить это вложение из заметки?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 px-4 rounded-2xl border font-bold text-xs hover:opacity-80 active:scale-98 transition cursor-pointer"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs active:scale-98 transition cursor-pointer shadow-lg hover:opacity-90"
                style={{
                  backgroundColor: theme.accent,
                  color: accentTextColor,
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-fadeIn"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[85vh] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col border backdrop-blur-2xl transition-all overflow-hidden"
          style={{
            backgroundColor: hexToRgba(theme.bg, 0.88),
            color: theme.text,
            borderColor: cardBorder,
            boxShadow: `0 25px 50px -12px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.65)'}`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="shrink-0 flex items-center justify-center">
                {isAudio ? (
                  <Music size={22} style={{ color: theme.accent }} />
                ) : isImage ? (
                  <ImageIcon size={22} style={{ color: theme.accent }} />
                ) : (
                  <FileText size={22} style={{ color: theme.accent }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setNameInput(displayName);
                        setIsEditingName(false);
                      }
                    }}
                    className="w-full max-w-[260px] sm:max-w-md px-3 py-1 rounded-xl border font-extrabold text-sm outline-hidden transition"
                    style={{
                      backgroundColor: hexToRgba(theme.text, 0.08),
                      borderColor: theme.accent,
                      color: theme.text,
                    }}
                    placeholder="Имя вложения..."
                  />
                ) : (
                  <h3
                    className="font-extrabold text-base truncate max-w-[260px] sm:max-w-md cursor-default"
                    title={displayName}
                  >
                    {displayName}
                  </h3>
                )}
                <p className="text-xs opacity-50 font-medium mt-0.5">
                  {formatSize(liveAttachment.size)} {isAudio ? '• Аудио' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition shrink-0 cursor-pointer"
              style={{ color: theme.text }}
              title="Закрыть"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body: Preview content */}
          <div className="flex-1 overflow-y-auto my-4 py-2 flex flex-col items-center justify-center min-h-[200px]">
            {isAudio ? (
              <div className="w-full max-w-lg p-6 rounded-3xl border flex flex-col items-center space-y-5" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                {/* Visualizer Waveform Graphic */}
                <div className="w-full flex items-center justify-center gap-1 h-20 px-4">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const height = Math.max(8, Math.round(Math.abs(Math.sin(i * 0.35)) * 50 + 12));
                    const progress = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                    const isActive = i / 36 <= progress;
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-full transition-all duration-75"
                        style={{
                          height: `${height}%`,
                          backgroundColor: isActive ? theme.accent : hexToRgba(theme.text, 0.25),
                          opacity: isPlayingAudio ? (isActive ? 1 : 0.4) : 0.3,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Scrub Slider */}
                <div className="w-full space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 100}
                    step={0.1}
                    value={audioCurrentTime}
                    onChange={handleAudioScrub}
                    className="w-full accent-purple-500 cursor-pointer"
                    style={{ accentColor: theme.accent }}
                  />
                  <div className="flex items-center justify-between text-xs font-mono opacity-60">
                    <span>{formatAudioTime(audioCurrentTime)}</span>
                    <span>{formatAudioTime(audioDuration)}</span>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        setAudioCurrentTime(0);
                      }
                    }}
                    className="p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                    style={{ color: theme.text }}
                    title="В начало"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button
                    onClick={togglePlayAudio}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
                    style={{ backgroundColor: theme.accent, color: accentTextColor }}
                    title={isPlayingAudio ? 'Пауза' : 'Воспроизвести'}
                  >
                    {isPlayingAudio ? <Pause size={24} /> : <Play size={24} className="translate-x-[2px]" />}
                  </button>

                  <button
                    onClick={cyclePlaybackRate}
                    className="w-11 h-8 min-w-[44px] max-w-[44px] flex items-center justify-center rounded-xl text-xs font-mono font-bold border transition active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: playbackRate > 1 ? theme.accent : 'transparent',
                      color: playbackRate > 1 ? accentTextColor : theme.text,
                      borderColor: playbackRate > 1 ? theme.accent : hexToRgba(theme.text, 0.2),
                    }}
                    title="Скорость воспроизведения"
                  >
                    {playbackRate}x
                  </button>

                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (audioRef.current) {
                        audioRef.current.muted = !isMuted;
                      }
                    }}
                    className="p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                    style={{ color: theme.text }}
                    title={isMuted ? 'Включить звук' : 'Выключить звук'}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>

                {/* Transcribed text if present */}
                {liveAttachment.textContent && (
                  <div className="w-full pt-2 space-y-1.5">
                    <div className="text-[11px] font-bold opacity-60 flex items-center gap-1">
                      <Sparkles size={12} style={{ color: theme.accent }} /> Текст диктовки:
                    </div>
                    <p className="text-xs leading-relaxed italic opacity-85">
                      "{liveAttachment.textContent}"
                    </p>
                  </div>
                )}
              </div>
            ) : isImage ? (
              <div className="w-full flex flex-col items-center justify-center">
                <img
                  src={liveAttachment.dataUrl}
                  alt={displayName}
                  className="max-h-[50vh] max-w-full object-contain rounded-2xl border shadow-none"
                  style={{ borderColor: cardBorder }}
                />
              </div>
            ) : isText ? (
              <div className="w-full flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold opacity-60">
                  <span>Редактор документа</span>
                  {isSaved && (
                    <span className="text-green-400 flex items-center gap-1">
                      <Check size={12} /> Сохранено и скачано!
                    </span>
                  )}
                </div>
                <textarea
                  value={editableText}
                  onChange={e => setEditableText(e.target.value)}
                  placeholder="Содержимое текстового документа..."
                  className="w-full h-64 p-4 rounded-2xl border font-mono text-xs leading-relaxed outline-hidden resize-none transition"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    color: theme.text,
                  }}
                />
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText size={48} className="mx-auto opacity-40" style={{ color: theme.accent }} />
                <p className="text-sm font-semibold opacity-70">
                  Предпросмотр недоступен для данного формата файла
                </p>
                <p className="text-xs opacity-40">
                  Вы можете скачать файл на устройство
                </p>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-3 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto">
            {/* Left Actions: Delete & Edit */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-3 sm:px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 active:scale-95 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                title="Удалить вложение"
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>

              <button
                onClick={() => setIsEditingName(prev => !prev)}
                className="px-3 sm:px-3.5 py-2 rounded-xl border transition text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: isEditingName ? hexToRgba(theme.accent, 0.2) : cardBg,
                  borderColor: isEditingName ? theme.accent : cardBorder,
                  color: isEditingName ? theme.accent : theme.text,
                }}
                title="Редактировать название"
              >
                <Edit3 size={14} style={{ color: isEditingName ? theme.accent : theme.text }} />
                <span>Редактировать</span>
              </button>
            </div>

            {/* Right Actions: Save/Download */}
            <div className="flex items-center gap-2 shrink-0">
              {isText ? (
                <button
                  onClick={handleSaveTextAndDownload}
                  className="px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor: theme.accent,
                    color: accentTextColor,
                  }}
                >
                  <Save size={14} />
                  <span>Сохранить и скачать</span>
                </button>
              ) : (
                <button
                  onClick={() => handleDownload(displayName, liveAttachment.dataUrl, liveAttachment.type)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor: theme.accent,
                    color: accentTextColor,
                  }}
                >
                  <Download size={14} />
                  <span>Скачать</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

