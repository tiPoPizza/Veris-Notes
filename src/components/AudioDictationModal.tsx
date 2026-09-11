import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Check,
  X,
  Volume2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';
import { NoteAttachment } from '../types';

interface AudioDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
}

export const AudioDictationModal: React.FC<AudioDictationModalProps> = ({
  isOpen,
  onClose,
  noteId,
}) => {
  const { addAttachmentToNote, theme, language, quickSettings } = useApp();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [volumeLevels, setVolumeLevels] = useState<number[]>(new Array(24).fill(10));
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

  const isLight = isLightColor(theme.bg);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.15);
  const accentTextColor = isLightColor(theme.accent) ? '#000000' : '#FFFFFF';

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  // Stop all active recording resources
  const stopAllResources = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // Start audio recording with robust permission & constraint fallback
  const startRecording = async () => {
    try {
      setIsRequestingPermission(true);
      setErrorMessage(null);
      setIsPermissionDenied(false);
      audioChunksRef.current = [];
      setDuration(0);
      setTranscribedText('');

      if (!navigator?.mediaDevices?.getUserMedia && !(navigator as any)?.getUserMedia) {
        setErrorMessage('Аудиозапись не поддерживается данным браузером.');
        setIsRequestingPermission(false);
        return;
      }

      // Request stream with fallback for constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (constraintErr: any) {
        if (
          constraintErr?.name === 'NotAllowedError' ||
          constraintErr?.name === 'PermissionDeniedError' ||
          constraintErr?.message?.includes('Permission denied')
        ) {
          throw constraintErr;
        }
        // Fallback to basic audio request
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;
      setIsRequestingPermission(false);

      // Setup Web Audio Analyser (in try/catch so analyser failure never aborts recording)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume().catch(() => {});
          }
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWaveform = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const step = Math.max(1, Math.floor(dataArray.length / 24));
              const newLevels: number[] = [];
              for (let i = 0; i < 24; i++) {
                const val = dataArray[i * step] || 0;
                const heightPct = Math.min(100, Math.max(12, Math.round((val / 255) * 100)));
                newLevels.push(heightPct);
              }
              setVolumeLevels(newLevels);
            }
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
          };
          updateWaveform();
        }
      } catch (audioCtxErr) {
        console.warn('Live waveform visualizer notice:', audioCtxErr);
        // Fallback pleasant simulated waveform bars while recording
        simIntervalRef.current = setInterval(() => {
          setVolumeLevels(Array.from({ length: 24 }, () => Math.floor(Math.random() * 55 + 20)));
        }, 120);
      }

      // Detect supported MediaRecorder mime types
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      let selectedMime = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        for (const candidate of mimeCandidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            selectedMime = candidate;
            break;
          }
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setIsPaused(false);

      // Start duration counter
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Optional live speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'it-IT';

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setTranscribedText(current);
          };

          recognition.onerror = (e: any) => {
            // Speech recognition errors are non-fatal, audio recording proceeds normally
            console.warn('Speech recognition notice:', e?.error || e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (err) {
          console.warn('Speech recognition init notice:', err);
        }
      }
    } catch (err: any) {
      console.warn('Microphone start error:', err);
      setIsRequestingPermission(false);
      setIsRecording(false);

      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase().includes('permission denied') ||
        err?.message?.toLowerCase().includes('not allowed');

      if (isDenied) {
        setIsPermissionDenied(true);
        setErrorMessage(
          'Доступ к микрофону заблокирован или не был предоставлен. Нажмите кнопку ниже, чтобы запросить разрешение снова.'
        );
      } else {
        setErrorMessage(
          err?.message || 'Не удалось получить доступ к микрофону на вашем устройстве.'
        );
      }
    }
  };

  // Pause / Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      try {
        mediaRecorderRef.current.resume();
      } catch (e) {}
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      try {
        mediaRecorderRef.current.pause();
      } catch (e) {}
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Save voice recording to note
  const handleSaveRecording = async () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size === 0) {
        setErrorMessage('Запись не содержит аудиоданных.');
        return;
      }

      // Convert blob to DataURL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `Голосовая запись ${dateStr}.${ext}`;

        const newAttachment: NoteAttachment = {
          id: `att-voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: fileName,
          size: audioBlob.size,
          type: mimeType,
          dataUrl: dataUrl,
          textContent: transcribedText.trim() ? transcribedText.trim() : undefined,
          updatedAt: Date.now(),
        };

        // Add attachment to note
        addAttachmentToNote(noteId, newAttachment);

        // Dispatch insertion event so it embeds in editor at cursor
        window.dispatchEvent(
          new CustomEvent('veris-insert-attachment', {
            detail: {
              noteId: noteId,
              attachment: newAttachment,
              textTranscript: transcribedText.trim() ? transcribedText.trim() : undefined,
            },
          })
        );

        stopAllResources();
        onClose();
      };
      reader.readAsDataURL(audioBlob);
    };

    try {
      recorder.stop();
    } catch (e) {}
    setIsRecording(false);
  };

  // Cancel & discard
  const handleCancel = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    stopAllResources();
    setIsRecording(false);
    onClose();
  };

  // Re-request microphone permissions with tactile visual feedback & status verification
  const handleRetryPermission = async () => {
    setIsRequestingPermission(true);
    setErrorMessage(null);
    // Visual debounce so the user distinctly sees the retry action taking effect
    await new Promise(resolve => setTimeout(resolve, 450));
    await startRecording();
  };

  // Start recording ONLY when modal opens, clean up when modal closes
  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      stopAllResources();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setTranscribedText('');
      setErrorMessage(null);
      setIsPermissionDenied(false);
    }
    return () => {
      stopAllResources();
    };
  }, [isOpen]);

  // If permission was denied, automatically re-check when user returns to the tab (e.g. from browser settings)
  useEffect(() => {
    if (!isOpen) return;

    let permStatus: any = null;
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((status: any) => {
          permStatus = status;
          status.onchange = () => {
            if (status.state === 'granted') {
              setIsPermissionDenied(false);
              setErrorMessage(null);
              startRecording();
            }
          };
        })
        .catch(() => {});
    }

    const handleWindowFocus = () => {
      if (isPermissionDenied && !isRecording) {
        startRecording();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [isOpen, isPermissionDenied, isRecording]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col border backdrop-blur-2xl transition-all space-y-5 animate-scaleUp"
        style={{
          backgroundColor: hexToRgba(theme.bg, 0.94),
          color: theme.text,
          borderColor: cardBorder,
          boxShadow: `0 25px 50px -12px ${isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.7)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - No divider line, No icon background podlozhka */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-3">
            <Mic
              size={22}
              style={{ color: theme.accent }}
              className={`shrink-0 transition-transform duration-300 ${
                isRecording && !isPaused ? 'animate-pulse scale-110' : ''
              }`}
            />
            <div>
              <h3 className="font-extrabold text-base leading-tight">Голосовая запись</h3>
              <p className="text-[11px] opacity-60">
                {isRequestingPermission
                  ? 'Запрос доступа к микрофону...'
                  : isRecording
                  ? isPaused
                    ? 'Запись приостановлена'
                    : 'Идет запись аудио...'
                  : isPermissionDenied
                  ? 'Требуется разрешение'
                  : 'Подготовка к записи...'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition cursor-pointer"
            style={{ color: theme.text }}
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission Denied / Error Alert with Re-request Button */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              {isPermissionDenied ? (
                <Lock size={18} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col gap-1 flex-1">
                <p className="leading-relaxed font-semibold">{errorMessage}</p>
                {isPermissionDenied && (
                  <p className="text-[11px] opacity-85 leading-normal">
                    Чтобы включить микрофон: нажмите на значок настроек или замка 🔒 в строке адреса браузера → «Разрешения» → разрешите доступ к микрофону, затем нажмите кнопку ниже.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRetryPermission}
                disabled={isRequestingPermission}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-75"
              >
                <RefreshCw size={14} className={isRequestingPermission ? 'animate-spin' : ''} />
                <span>
                  {isRequestingPermission
                    ? 'Проверяем доступ...'
                    : isPermissionDenied
                    ? 'Запросить разрешение ещё раз'
                    : 'Повторить попытку'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Middle Voice Waveform & Duration Display */}
        <div
          className="p-5 rounded-2xl border flex flex-col items-center justify-center space-y-4"
          style={{
            backgroundColor: hexToRgba(theme.text, 0.04),
            borderColor: cardBorder,
          }}
        >
          {/* Large Live Timer */}
          <div className="text-3xl font-mono font-extrabold tracking-wider" style={{ color: theme.accent }}>
            {formatTime(duration)}
          </div>

          {/* Real-time Dynamic Waveform Amplitude Bars */}
          <div className="w-full flex items-center justify-center gap-1.5 h-16 px-2">
            {volumeLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="w-1.5 rounded-full transition-all duration-75"
                style={{
                  height: `${isRecording && !isPaused ? Math.max(12, lvl) : 10}%`,
                  backgroundColor:
                    isRecording && !isPaused
                      ? theme.accent
                      : hexToRgba(theme.text, 0.25),
                  opacity: isRecording && !isPaused ? 0.7 + (lvl / 100) * 0.3 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Dictated text preview if recognized */}
          {transcribedText ? (
            <div className="w-full space-y-2 pt-2 border-t" style={{ borderColor: hexToRgba(theme.text, 0.1) }}>
              <div className="flex items-center justify-between text-[11px] font-bold opacity-60">
                <span className="flex items-center gap-1">
                  <Sparkles size={12} style={{ color: theme.accent }} /> Распознанный текст:
                </span>
              </div>
              <div
                className="p-3 rounded-xl max-h-24 overflow-y-auto text-xs italic font-medium leading-relaxed"
                style={{
                  backgroundColor: hexToRgba(theme.text, 0.05),
                  color: theme.text,
                }}
              >
                "{transcribedText}"
              </div>
            </div>
          ) : isRecording ? (
            <div className="text-[11px] opacity-40 italic">
              Говорите в микрофон...
            </div>
          ) : isPermissionDenied ? (
            <div className="text-[11px] opacity-60 text-center">
              Микрофон отключен. Разрешите доступ для записи.
            </div>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {/* Cancel / Discard */}
          <button
            onClick={handleCancel}
            className="px-4 py-3 rounded-2xl border font-bold text-xs hover:bg-white/10 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            style={{ borderColor: cardBorder, color: theme.text }}
          >
            <Trash2 size={16} />
            <span>Отмена</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Pause / Resume */}
            {isRecording && (
              <button
                onClick={togglePause}
                className="p-3 rounded-2xl border font-bold text-xs hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{ borderColor: cardBorder, color: theme.text }}
                title={isPaused ? 'Продолжить запись' : 'Пауза'}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            )}

            {/* Save & Insert voice message */}
            <button
              onClick={handleSaveRecording}
              disabled={duration < 1 && audioChunksRef.current.length === 0}
              className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                duration >= 1 || audioChunksRef.current.length > 0
                  ? 'hover:opacity-90'
                  : 'opacity-40 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: theme.accent,
                color: accentTextColor,
              }}
            >
              <Check size={16} />
              <span>Сохранить запись</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
