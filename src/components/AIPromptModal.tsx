import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { hexToRgba, isLightColor } from '../themes';

export const AIPromptModal: React.FC = () => {
  const {
    isAIPromptOpen,
    setIsAIPromptOpen,
    activeNoteId,
    notes,
    updateNote,
    theme,
    language,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAIPromptOpen) return null;

  const t = (key: string) => getTranslation(language, key);
  const isLight = isLightColor(theme.bg);
  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleAIAction = async (actionType: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          text: activeNote?.content || '',
          noteTitle: activeNote?.title || '',
          prompt: prompt,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResultText(data.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка обработки ИИ. Проверьте GEMINI_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (!activeNoteId || !resultText) return;
    updateNote(activeNoteId, {
      content: activeNote ? `${activeNote.content}\n\n${resultText}` : resultText,
    });
    setIsAIPromptOpen(false);
    setResultText('');
    setPrompt('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => setIsAIPromptOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 shadow-2xl border transition-all"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : '#1D1922',
          color: theme.text,
          borderColor: hexToRgba(theme.text, 0.15),
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: hexToRgba(theme.text, 0.15) }}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: theme.accent }} />
            <h3 className="text-base font-semibold">{t('aiAssistant')}</h3>
          </div>
          <button
            onClick={() => setIsAIPromptOpen(false)}
            className="p-1 rounded-lg hover:opacity-75 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Presets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            disabled={loading}
            onClick={() => handleAIAction('continue')}
            className="p-2.5 rounded-xl border text-xs font-medium text-left hover:opacity-80 transition flex items-center justify-between"
            style={{ backgroundColor: hexToRgba(theme.text, 0.05), borderColor: hexToRgba(theme.text, 0.15) }}
          >
            <span>✨ {t('continueText')}</span>
            <ArrowRight size={12} />
          </button>

          <button
            disabled={loading}
            onClick={() => handleAIAction('fix')}
            className="p-2.5 rounded-xl border text-xs font-medium text-left hover:opacity-80 transition flex items-center justify-between"
            style={{ backgroundColor: hexToRgba(theme.text, 0.05), borderColor: hexToRgba(theme.text, 0.15) }}
          >
            <span>✏️ {t('improveStyle')}</span>
            <ArrowRight size={12} />
          </button>

          <button
            disabled={loading}
            onClick={() => handleAIAction('summarize')}
            className="p-2.5 rounded-xl border text-xs font-medium text-left hover:opacity-80 transition flex items-center justify-between"
            style={{ backgroundColor: hexToRgba(theme.text, 0.05), borderColor: hexToRgba(theme.text, 0.15) }}
          >
            <span>📋 {t('summarizeText')}</span>
            <ArrowRight size={12} />
          </button>

          <button
            disabled={loading}
            onClick={() => handleAIAction('generate-tasks')}
            className="p-2.5 rounded-xl border text-xs font-medium text-left hover:opacity-80 transition flex items-center justify-between"
            style={{ backgroundColor: hexToRgba(theme.text, 0.05), borderColor: hexToRgba(theme.text, 0.15) }}
          >
            <span>☑️ Создать задачи</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Custom Prompt Input */}
        <div className="mb-4">
          <textarea
            rows={2}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Свой запрос к ИИ (напр., 'Напиши тезисный план статьи')..."
            className="w-full p-3 rounded-xl text-xs border outline-hidden resize-none transition"
            style={{
              backgroundColor: hexToRgba(theme.text, 0.05),
              borderColor: hexToRgba(theme.text, 0.15),
              color: theme.text,
            }}
          />
          <button
            disabled={loading || !prompt.trim()}
            onClick={() => handleAIAction('custom')}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition disabled:opacity-40"
            style={{
              backgroundColor: theme.accent,
              color: '#FFFFFF',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Сгенерировать по запросу</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
            {errorMsg}
          </div>
        )}

        {/* Result Area */}
        {resultText && (
          <div className="space-y-3">
            <div
              className="p-3 rounded-xl border text-xs max-h-48 overflow-y-auto leading-relaxed"
              style={{
                backgroundColor: hexToRgba(theme.accent, 0.1),
                borderColor: theme.accent,
              }}
            >
              {resultText}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyResult}
                className="flex-1 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: theme.accent, color: '#FFFFFF' }}
              >
                {t('apply')}
              </button>
              <button
                onClick={() => setResultText('')}
                className="px-4 py-2 rounded-xl text-xs border hover:opacity-80 transition"
                style={{ borderColor: hexToRgba(theme.text, 0.2) }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
