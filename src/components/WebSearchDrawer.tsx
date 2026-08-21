import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { hexToRgba, isLightColor } from '../themes';
import {
  Globe,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowUp,
  Zap,
  History,
  Trash2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { WebSearchResponse } from '../types';

export const WebSearchDrawer: React.FC = () => {
  const {
    isWebSearchOpen,
    setIsWebSearchOpen,
    webSearchSettings,
    setWebSearchSettings,
    searchHistory,
    addSearchHistoryItem,
    deleteSearchHistoryItem,
    clearSearchHistory,
    insertTextIntoActiveNote,
    setViewMode,
    setActiveSettingsTab,
    theme,
    quickSettings,
  } = useApp();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<WebSearchResponse | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ type: string; message: string } | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [isPowerSettingsOpen, setIsPowerSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset to new clean search session whenever drawer is opened
  useEffect(() => {
    if (isWebSearchOpen) {
      setQuery('');
      setResponse(null);
      setErrorInfo(null);
      setShowHistory(false);
      setIsPowerSettingsOpen(false);
      setCopiedAction(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '28px';
          textareaRef.current.focus();
        }
      }, 150);
    }
  }, [isWebSearchOpen]);

  // Dynamically auto-resize textarea as user types, then add vertical scrollbar
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 28), 120);
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [query]);

  // Scroll to top when new response arrives
  useEffect(() => {
    if (response && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [response]);

  if (!isWebSearchOpen) return null;

  const isLight = isLightColor(theme.bg);

  // Clean aesthetics matching Veris design rules
  const drawerBg = isLight ? hexToRgba(theme.bg, 0.95) : hexToRgba(theme.bg, 0.92);
  const cardBg = hexToRgba(theme.text, isLight ? 0.04 : 0.07);
  const cardBorder = quickSettings.showBorder ? theme.accent : hexToRgba(theme.text, 0.12);
  const floatingBarBg = isLight ? hexToRgba(theme.bg, 0.88) : hexToRgba(theme.bg, 0.82);

  const hasApiKey = Boolean(webSearchSettings.tavilyApiKey?.trim());

  const handleSearch = async (overrideQuery?: string) => {
    const cleanQuery = (overrideQuery ?? query).trim();
    if (!cleanQuery || loading) return;

    // Reset input field so user can type a new prompt immediately
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }

    setLoading(true);
    setErrorInfo(null);
    setShowHistory(false);

    try {
      const res = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanQuery,
          apiKey: webSearchSettings.tavilyApiKey.trim(),
          provider: webSearchSettings.provider,
          searchDepth: webSearchSettings.searchDepth,
          answerDetail: webSearchSettings.answerDetail,
          maxResults: webSearchSettings.maxResults,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorInfo({
          type: data.error || 'ERROR',
          message: data.message || 'Произошла ошибка при поиске. Попробуйте еще раз.',
        });
        return;
      }

      setResponse(data);
      // Save in history using user prompt as title
      addSearchHistoryItem({
        query: cleanQuery,
        response: data,
      });
    } catch (err: any) {
      setErrorInfo({
        type: 'NETWORK_ERROR',
        message: err.message || 'Не удалось подключиться к серверу поиска.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCopySummary = () => {
    if (!response?.answer) return;
    navigator.clipboard.writeText(response.answer);
    setCopiedAction('summary');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleCopyAll = () => {
    if (!response) return;
    let fullText = '';
    if (response.answer) {
      fullText += `### Ответ на запрос: «${response.query}»\n\n${response.answer}\n\n`;
    }
    if (response.results && response.results.length > 0) {
      fullText += `#### Источники:\n`;
      response.results.forEach((item, idx) => {
        fullText += `${idx + 1}. [${item.title}](${item.url})\n`;
      });
    }
    navigator.clipboard.writeText(fullText.trim());
    setCopiedAction('all');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleInsertIntoNote = (customText?: string) => {
    if (customText) {
      insertTextIntoActiveNote(customText);
      setCopiedAction('inserted');
      setTimeout(() => setCopiedAction(null), 2000);
      return;
    }

    if (!response) return;
    let insertHtml = '';
    if (response.answer) {
      insertHtml += `<div style="padding:12px;margin:8px 0;border-left:3px solid ${theme.accent};background:${hexToRgba(theme.text, 0.05)};border-radius:10px;">`;
      insertHtml += `<strong>🔍 Веб-поиск: ${response.query}</strong><br/>`;
      insertHtml += `<p style="margin-top:6px;">${response.answer.replace(/\n/g, '<br/>')}</p>`;
      if (response.results && response.results.length > 0) {
        insertHtml += `<p style="font-size:12px;opacity:0.8;margin-top:8px;"><strong>Источники:</strong></p><ul style="font-size:12px;padding-left:18px;margin:4px 0;">`;
        response.results.slice(0, 4).forEach((r) => {
          insertHtml += `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer" style="color:${theme.accent};text-decoration:underline;">${r.title}</a></li>`;
        });
        insertHtml += `</ul>`;
      }
      insertHtml += `</div>`;
    }
    insertTextIntoActiveNote(insertHtml);
    setCopiedAction('inserted');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const toggleSourceExpand = (index: number) => {
    setExpandedSources(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Сегодня, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={() => setIsWebSearchOpen(false)}
    >
      <div
        className="w-full sm:w-[460px] md:w-[500px] h-full flex flex-col shadow-2xl border-l backdrop-blur-2xl transition-all relative overflow-hidden"
        style={{
          backgroundColor: drawerBg,
          borderColor: cardBorder,
          color: theme.text,
          boxShadow: `-15px 0 50px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.5)'}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b shrink-0 z-10"
          style={{ borderColor: hexToRgba(theme.text, 0.1) }}
        >
          <div className="flex items-center gap-2.5">
            {showHistory ? (
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                title="Назад к поиску"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div
                className="p-2 rounded-2xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: hexToRgba(theme.accent, 0.18),
                  color: theme.accent,
                }}
              >
                <Globe size={18} />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-tight">
                  {showHistory ? 'История поисков' : 'Веб-поиск'}
                </h3>
                {!showHistory && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    Tavily {webSearchSettings.searchDepth === 'advanced' ? 'Глубокий' : 'Быстрый'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* History Toggle Button (No counter badge) */}
            {!showHistory ? (
              <button
                onClick={() => {
                  setShowHistory(true);
                  setIsPowerSettingsOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{
                  color: theme.text,
                }}
                title="История поисков"
              >
                <History size={16} />
              </button>
            ) : (
              searchHistory.length > 0 && (
                <button
                  onClick={clearSearchHistory}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 active:scale-95 transition cursor-pointer"
                  title="Очистить историю"
                >
                  Очистить всё
                </button>
              )
            )}

            {/* Quick Power Mode Toggle (Zap Icon) */}
            {!showHistory && (
              <button
                onClick={() => setIsPowerSettingsOpen(prev => !prev)}
                className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
                style={{
                  backgroundColor: isPowerSettingsOpen ? hexToRgba(theme.accent, 0.2) : 'transparent',
                  color: isPowerSettingsOpen ? theme.accent : theme.text,
                }}
                title="Глубина поиска и параметры"
              >
                <Zap size={16} />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsWebSearchOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer opacity-70 hover:opacity-100"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Power Settings Dropdown */}
        {isPowerSettingsOpen && !showHistory && (
          <div
            className="p-4 border-b space-y-3.5 animate-fadeIn shrink-0 z-10"
            style={{
              backgroundColor: cardBg,
              borderColor: hexToRgba(theme.text, 0.1),
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">Глубина поиска</span>
              <button
                onClick={() => {
                  setIsWebSearchOpen(false);
                  setViewMode('settings');
                  setActiveSettingsTab('ai');
                }}
                className="flex items-center gap-1 text-[11px] font-bold opacity-75 hover:opacity-100 hover:underline cursor-pointer"
                style={{ color: theme.accent }}
              >
                <span>Настройки ИИ</span>
                <ExternalLink size={11} />
              </button>
            </div>

            {/* Depth selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setWebSearchSettings(prev => ({ ...prev, searchDepth: 'basic' }))
                }
                className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                style={{
                  backgroundColor:
                    webSearchSettings.searchDepth === 'basic'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    webSearchSettings.searchDepth === 'basic'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                <div className="text-xs font-bold">Быстрый</div>
                <div className="text-[10px] opacity-60 mt-0.5">1 кредит • Быстрый поиск</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setWebSearchSettings(prev => ({ ...prev, searchDepth: 'advanced' }))
                }
                className="p-2.5 rounded-xl border text-left transition cursor-pointer"
                style={{
                  backgroundColor:
                    webSearchSettings.searchDepth === 'advanced'
                      ? hexToRgba(theme.accent, 0.18)
                      : 'transparent',
                  borderColor:
                    webSearchSettings.searchDepth === 'advanced'
                      ? theme.accent
                      : hexToRgba(theme.text, 0.12),
                }}
              >
                <div className="text-xs font-bold">Глубокий</div>
                <div className="text-[10px] opacity-60 mt-0.5">2 кредита • Анализ источников</div>
              </button>
            </div>

            {/* Answer detail selector */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="opacity-70 font-medium">Детализация:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setWebSearchSettings(prev => ({ ...prev, answerDetail: 'basic' }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    webSearchSettings.answerDetail === 'basic' ? 'shadow-xs' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor:
                      webSearchSettings.answerDetail === 'basic'
                        ? theme.accent
                        : hexToRgba(theme.text, 0.08),
                    color: webSearchSettings.answerDetail === 'basic' ? '#FFFFFF' : theme.text,
                  }}
                >
                  Кратко
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setWebSearchSettings(prev => ({ ...prev, answerDetail: 'advanced' }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    webSearchSettings.answerDetail === 'advanced' ? 'shadow-xs' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor:
                      webSearchSettings.answerDetail === 'advanced'
                        ? theme.accent
                        : hexToRgba(theme.text, 0.08),
                    color: webSearchSettings.answerDetail === 'advanced' ? '#FFFFFF' : theme.text,
                  }}
                >
                  Подробно
                </button>
              </div>
            </div>

            {/* Number of sources setting */}
            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: hexToRgba(theme.text, 0.08) }}>
              <span className="opacity-70 font-medium">Количество источников:</span>
              <div className="flex items-center gap-1">
                {[3, 5, 7, 10].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() =>
                      setWebSearchSettings(prev => ({ ...prev, maxResults: num }))
                    }
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      webSearchSettings.maxResults === num ? 'shadow-xs' : 'opacity-60'
                    }`}
                    style={{
                      backgroundColor:
                        webSearchSettings.maxResults === num
                          ? theme.accent
                          : hexToRgba(theme.text, 0.08),
                      color: webSearchSettings.maxResults === num ? '#FFFFFF' : theme.text,
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Scrollable Area (Content flows under floating bottom bar) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-28 scroll-smooth"
        >
          {/* HISTORY VIEW */}
          {showHistory ? (
            <div className="space-y-3 animate-fadeIn">
              {searchHistory.length === 0 ? (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm font-medium opacity-55 max-w-[300px] leading-relaxed select-none">
                    Кто-то боится пустоты, а кого-то она успокаивает
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setResponse(item.response);
                        setShowHistory(false);
                      }}
                      className="p-3 rounded-2xl border transition hover:border-white/30 cursor-pointer group relative flex flex-col gap-1.5"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: hexToRgba(theme.text, 0.1),
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold truncate flex-1 group-hover:opacity-90">
                          {item.query}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSearchHistoryItem(item.id);
                          }}
                          className="p-1 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition cursor-pointer"
                          title="Удалить из истории"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] opacity-55">
                        <span>{formatTimestamp(item.timestamp)}</span>
                        <div className="flex items-center gap-2">
                          <span>
                            {item.response.results?.length || 0} источников
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded-md font-mono text-[9px] uppercase font-bold"
                            style={{
                              backgroundColor: hexToRgba(theme.accent, 0.15),
                              color: theme.accent,
                            }}
                          >
                            {item.response.searchDepth === 'advanced' ? 'Глубокий' : 'Быстрый'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* SEARCH & RESULTS VIEW */
            <>
              {/* Missing API Key Guidance Banner */}
              {!hasApiKey && (
                <div
                  className="p-4 rounded-2xl border space-y-3 transition-all"
                  style={{
                    backgroundColor: isLight ? 'rgba(234, 179, 8, 0.08)' : 'rgba(234, 179, 8, 0.12)',
                    borderColor: isLight ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.4)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Необходим API-ключ Tavily (BYOK)
                      </h4>
                      <p className="text-[11px] opacity-80 mt-1 leading-relaxed">
                        Веб-поиск работает по системе собственного ключа (BYOK). Получите бесплатный ключ (1000 запросов/мес) на сайте Tavily.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href="https://tavily.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      <span>Получить на tavily.com</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      onClick={() => {
                        setIsWebSearchOpen(false);
                        setViewMode('settings');
                        setActiveSettingsTab('ai');
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-bold border hover:bg-white/10 transition active:scale-98"
                      style={{
                        borderColor: hexToRgba(theme.text, 0.2),
                        color: theme.text,
                      }}
                    >
                      Ввести в Настройках
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorInfo && (
                <div
                  className="p-3.5 rounded-2xl border flex items-start gap-2.5 animate-fadeIn"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                  }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold">Ошибка поиска: </span>
                    <span>{errorInfo.message}</span>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center animate-fadeIn">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center animate-spin"
                    style={{
                      backgroundColor: hexToRgba(theme.accent, 0.15),
                      color: theme.accent,
                    }}
                  >
                    <RefreshCw size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold tracking-tight">Поиск в интернете...</h4>
                    <p className="text-[11px] opacity-60">
                      {webSearchSettings.searchDepth === 'advanced'
                        ? 'Анализируем глубокие источники и формируем подробное саммари'
                        : 'Собираем релевантные факты и готовим выжимку'}
                    </p>
                  </div>
                </div>
              )}

              {/* Response Display */}
              {!loading && response && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Query Pill */}
                  <div className="flex items-center justify-between text-xs opacity-75 px-0.5">
                    <span className="truncate font-semibold">«{response.query}»</span>
                    <span className="shrink-0 text-[10px] font-mono">
                      {response.results.length} {response.results.length === 1 ? 'источник' : 'источников'}
                    </span>
                  </div>

                  {/* Summary Card */}
                  {response.answer && (
                    <div
                      className="p-4 rounded-2xl border space-y-3 shadow-xs transition-all"
                      style={{
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={15} style={{ color: theme.accent }} />
                          <span className="text-xs font-black uppercase tracking-wider">
                            Саммари
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleCopySummary}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition active:scale-95 cursor-pointer opacity-75 hover:opacity-100"
                            title="Скопировать саммари"
                          >
                            {copiedAction === 'summary' ? (
                              <Check size={14} style={{ color: theme.accent }} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleInsertIntoNote()}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-xs"
                            style={{
                              backgroundColor: hexToRgba(theme.accent, 0.2),
                              color: theme.accent,
                            }}
                            title="Вставить саммари в заметку"
                          >
                            <Plus size={12} />
                            <span>В заметку</span>
                          </button>
                        </div>
                      </div>

                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap font-normal select-text">
                        {response.answer}
                      </div>
                    </div>
                  )}

                  {/* Clean Action Buttons: Скопировать / Вставить в заметку */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyAll}
                      className="flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/10 transition active:scale-98 cursor-pointer"
                      style={{
                        borderColor: hexToRgba(theme.text, 0.15),
                        backgroundColor: cardBg,
                      }}
                    >
                      {copiedAction === 'all' ? (
                        <>
                          <Check size={13} style={{ color: theme.accent }} />
                          <span>Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Скопировать</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleInsertIntoNote()}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-sm"
                      style={{
                        backgroundColor: theme.accent,
                        color: '#FFFFFF',
                      }}
                    >
                      {copiedAction === 'inserted' ? (
                        <>
                          <Check size={13} />
                          <span>Вставлено в заметку!</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Вставить в заметку</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sources Section */}
                  {response.results && response.results.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-extrabold opacity-75 uppercase tracking-wider">
                        Источники ({response.results.length})
                      </h4>

                      <div className="space-y-2">
                        {response.results.map((item, idx) => {
                          const isExpanded = expandedSources[idx];
                          let hostname = '';
                          try {
                            hostname = new URL(item.url).hostname.replace(/^www\./, '');
                          } catch {
                            hostname = item.url;
                          }

                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl border transition hover:border-white/30 space-y-2"
                              style={{
                                backgroundColor: cardBg,
                                borderColor: hexToRgba(theme.text, 0.1),
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 text-xs font-bold hover:underline transition truncate flex items-center gap-1.5 group"
                                  style={{ color: theme.accent }}
                                >
                                  <span className="truncate">{item.title}</span>
                                  <ExternalLink
                                    size={11}
                                    className="shrink-0 opacity-60 group-hover:opacity-100"
                                  />
                                </a>

                                <span
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium opacity-60 shrink-0"
                                  style={{ backgroundColor: hexToRgba(theme.text, 0.08) }}
                                >
                                  {hostname}
                                </span>
                              </div>

                              {/* Snippet preview */}
                              <div
                                className={`text-[11px] opacity-80 leading-relaxed ${
                                  isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                                }`}
                              >
                                {item.content}
                              </div>

                              {/* Source item action controls */}
                              <div className="flex items-center justify-between pt-1 text-[10px] opacity-75">
                                <button
                                  onClick={() => toggleSourceExpand(idx)}
                                  className="flex items-center gap-0.5 hover:opacity-100 cursor-pointer font-semibold"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Свернуть</span>
                                      <ChevronUp size={11} />
                                    </>
                                  ) : (
                                    <>
                                      <span>Развернуть</span>
                                      <ChevronDown size={11} />
                                    </>
                                  )}
                                </button>

                                <div className="flex items-center gap-2">
                                  {/* Copy Source Link */}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url);
                                      setCopiedAction(`link-${idx}`);
                                      setTimeout(() => setCopiedAction(null), 1500);
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Скопировать ссылку"
                                  >
                                    {copiedAction === `link-${idx}` ? (
                                      <Check size={11} style={{ color: theme.accent }} />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    <span>Ссылка</span>
                                  </button>

                                  {/* Copy Source Content Text */}
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.content);
                                      setCopiedAction(`txt-${idx}`);
                                      setTimeout(() => setCopiedAction(null), 1500);
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Скопировать текст источника"
                                  >
                                    {copiedAction === `txt-${idx}` ? (
                                      <Check size={11} style={{ color: theme.accent }} />
                                    ) : (
                                      <FileText size={11} />
                                    )}
                                    <span>Текст</span>
                                  </button>

                                  {/* Insert Source into active note */}
                                  <button
                                    onClick={() => {
                                      handleInsertIntoNote(
                                        `📌 **[${item.title}](${item.url})**\n> ${item.content}`
                                      );
                                    }}
                                    className="hover:opacity-100 cursor-pointer flex items-center gap-1 font-bold"
                                    style={{ color: theme.accent }}
                                  >
                                    <Plus size={11} />
                                    <span>В заметку</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Minimalist Empty State */}
              {!loading && !response && (
                <div className="py-24 px-4 flex flex-col items-center justify-center text-center animate-fadeIn">
                  <p className="text-xs sm:text-sm font-medium opacity-55 max-w-[320px] leading-relaxed select-none">
                    Со временем необъятность интернета вызывает странное чувство
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Bottom Input Bar (Auto-resizing textarea, content scrolls underneath) */}
        {!showHistory && (
          <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="p-1.5 pl-3 rounded-2xl border shadow-xl backdrop-blur-2xl flex items-center gap-2 transition-all"
              style={{
                backgroundColor: floatingBarBg,
                borderColor: query.trim() ? theme.accent : hexToRgba(theme.text, 0.18),
                boxShadow: `0 12px 30px ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.45)'}`,
              }}
            >
              <div className="relative flex-1 flex items-center min-h-[36px]">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Что подсказать"
                  disabled={loading}
                  rows={1}
                  className="w-full text-xs font-medium bg-transparent outline-hidden transition resize-none leading-5 py-1.5 px-0.5 block overflow-y-auto"
                  style={{
                    color: theme.text,
                    height: '28px',
                    maxHeight: '120px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!query.trim() || loading || !hasApiKey}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition active:scale-95 shadow-xs ${
                  query.trim() && hasApiKey && !loading
                    ? 'cursor-pointer hover:opacity-90'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: theme.accent,
                  color: '#FFFFFF',
                }}
                title="Отправить запрос (Enter)"
              >
                {loading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <ArrowUp size={16} />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
