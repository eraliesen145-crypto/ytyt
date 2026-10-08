import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Scroll, CheckCircle2, Copy, Eye, Terminal } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { Language, translations } from '../utils/translations';

export interface Choice {
  id: string;
  text: string;
}

interface StoryLogProps {
  narrative: string;
  rawText: string;
  choices: Choice[];
  isGameOver: boolean;
  isLoading: boolean;
  onSelectChoice: (choiceText: string, choiceId?: string) => void;
  onCustomAction: (customText: string) => void;
  turnNumber: number;
  lang?: Language;
}

export const StoryLog: React.FC<StoryLogProps> = ({
  narrative,
  rawText,
  choices,
  isGameOver,
  isLoading,
  onSelectChoice,
  onCustomAction,
  turnNumber,
  lang = 'en',
}) => {
  const [customInput, setCustomInput] = useState<string>('');
  const [showRawFormat, setShowRawFormat] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const narrativeRef = useRef<HTMLDivElement | null>(null);

  const t = translations[lang];

  useEffect(() => {
    // Scroll narrative into view smoothly when updated
    if (narrativeRef.current) {
      narrativeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [narrative, turnNumber]);

  const handleChoiceClick = (choice: Choice) => {
    if (isLoading || isGameOver) return;
    const lower = choice.text.toLowerCase();
    if (choice.id === 'D' || lower.includes('custom') || lower.includes('свое') || lower.includes('своё')) {
      const inputEl = document.getElementById('custom-action-input');
      inputEl?.focus();
      return;
    }
    sound.playParchment();
    onSelectChoice(choice.text, choice.id);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isLoading || isGameOver) return;
    sound.playParchment();
    onCustomAction(customInput.trim());
    setCustomInput('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preset quick ideas for option D
  const quickActions = [t.quick1, t.quick2, t.quick3, t.quick4];

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Story Parchment Container */}
      <div
        ref={narrativeRef}
        className="relative p-6 sm:p-8 rounded-lg border border-[#3b3226] bg-[#121011]/95 shadow-2xl backdrop-blur-md overflow-hidden"
      >
        {/* Decorative corner runes */}
        <div className="absolute top-2 left-2 text-[#463a2a] text-xs font-cinzel select-none">ᚱ</div>
        <div className="absolute top-2 right-2 text-[#463a2a] text-xs font-cinzel select-none">ᚦ</div>
        <div className="absolute bottom-2 left-2 text-[#463a2a] text-xs font-cinzel select-none">ᚫ</div>
        <div className="absolute bottom-2 right-2 text-[#463a2a] text-xs font-cinzel select-none">ᛏ</div>

        {/* Header Toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#29221a] mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#c5a059]" />
            <h1 className="font-cinzel text-base tracking-widest text-[#d8caaa] font-bold uppercase">
              {t.chronicleHeader}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawFormat(!showRawFormat)}
              title="Toggle verbatim GM format with dividers"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1a1715] hover:bg-[#26201b] border border-[#382d21] text-[11px] font-mono text-[#aa9c85] transition-colors"
            >
              {showRawFormat ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <Terminal className="w-3.5 h-3.5" />}
              {showRawFormat ? t.storyMode : t.rawFormat}
            </button>
            <button
              onClick={copyToClipboard}
              title="Copy narrative to clipboard"
              className="p-1 rounded bg-[#1a1715] hover:bg-[#26201b] border border-[#382d21] text-[#aa9c85] hover:text-[#d8caaa] transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Narrative Prose */}
        {showRawFormat ? (
          <div className="p-4 rounded bg-[#09090b] border border-[#2b241c] font-mono text-xs text-[#cfc2a9] whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto">
            {rawText}
          </div>
        ) : (
          <div className="font-serif text-[#e4dac6] text-base sm:text-lg leading-relaxed space-y-4">
            {narrative.split(/\n\n+/).map((paragraph, index) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              return (
                <p
                  key={index}
                  className={`first-letter:text-3xl first-letter:font-cinzel first-letter:font-bold first-letter:mr-1 ${
                    index === 0 ? 'first-letter:text-amber-400' : ''
                  }`}
                >
                  {trimmed}
                </p>
              );
            })}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-6 flex items-center gap-3 p-3.5 rounded bg-[#181514] border border-[#382e22] text-[#d4c39f] font-serif italic text-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            {t.weavingFate}
          </div>
        )}
      </div>

      {/* Decision Chamber / What Do You Do */}
      {!isGameOver ? (
        <div className="p-6 rounded-lg border border-[#3b3226] bg-[#121011]/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 pb-3 border-b border-[#2a231b] mb-4">
            <Scroll className="w-4 h-4 text-[#c5a059]" />
            <h2 className="font-cinzel text-sm uppercase tracking-widest text-[#d8caaa] font-bold">
              {t.whatDoYouDo}
            </h2>
          </div>

          {/* Choices List */}
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            {choices.map((choice) => {
              const lower = choice.text.toLowerCase();
              const isCustom = choice.id === 'D' || lower.includes('custom') || lower.includes('свое') || lower.includes('своё');

              return (
                <button
                  key={choice.id}
                  disabled={isLoading}
                  onClick={() => handleChoiceClick(choice)}
                  className={`group relative text-left p-3.5 rounded-lg border transition-all flex items-start gap-3.5 ${
                    isLoading
                      ? 'opacity-50 cursor-not-allowed bg-[#141212] border-[#29221b]'
                      : isCustom
                      ? 'bg-[#181513] border-[#443828] hover:border-amber-600/70 hover:bg-[#231e1a]'
                      : 'bg-[#151312] border-[#31271d] hover:border-[#6a5436] hover:bg-[#1e1a17]'
                  }`}
                >
                  <span
                    className={`shrink-0 flex items-center justify-center w-6 h-6 rounded border font-cinzel text-xs font-bold transition-colors ${
                      isCustom
                        ? 'border-amber-600/60 bg-amber-950/40 text-amber-300 group-hover:border-amber-500'
                        : 'border-[#4b3c29] bg-[#1c1815] text-[#d6c59f] group-hover:border-[#856b46] group-hover:text-amber-200'
                    }`}
                  >
                    {choice.id}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-serif text-sm leading-snug ${
                        isCustom ? 'text-amber-200 font-semibold' : 'text-[#d8cdb8] group-hover:text-[#f3ebda]'
                      }`}
                    >
                      {choice.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Option D Custom Action Form */}
          <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-[#29221a] flex flex-col gap-2.5">
            <label htmlFor="custom-action-input" className="text-xs font-cinzel text-[#a89980] flex items-center gap-1.5">
              <span>{t.optionDTitle}</span>
              <span className="text-[11px] font-serif italic text-[#776c5b]">{t.optionDHint}</span>
            </label>
            <div className="flex gap-2">
              <input
                id="custom-action-input"
                type="text"
                disabled={isLoading}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder={t.customPlaceholder}
                className="flex-1 px-3.5 py-2.5 rounded bg-[#161413] border border-[#3b3023] focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 text-[#e6ddc9] font-serif text-sm outline-none placeholder:text-[#6a5f4f] transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !customInput.trim()}
                className="px-4 py-2.5 rounded bg-[#2e2418] hover:bg-[#453624] disabled:opacity-40 disabled:hover:bg-[#2e2418] border border-[#5c4932] text-amber-200 font-cinzel text-xs tracking-wider uppercase font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t.actBtn}</span>
              </button>
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-mono text-[#6c6150] mr-1">{t.quickIdeas}</span>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setCustomInput(action)}
                  className="text-[11px] font-serif px-2 py-0.5 rounded bg-[#181514] hover:bg-[#25201c] border border-[#2b241c] text-[#a99c86] hover:text-amber-200 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </form>
        </div>
      ) : (
        /* Game Over Death Chamber */
        <div className="p-8 rounded-lg border-2 border-red-950 bg-[#160b0d]/95 shadow-[0_0_40px_rgba(153,27,27,0.3)] text-center space-y-4 animate-fadeIn">
          <h2 className="font-cinzel text-2xl font-black tracking-widest text-red-500 uppercase">
            {t.perishedTitle}
          </h2>
          <p className="font-serif italic text-sm text-[#c7a4a4] max-w-lg mx-auto">
            {t.perishedText}
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => onSelectChoice(lang === 'ru' ? 'Восстать вновь как новый обреченный странник' : 'Awaken anew as another condemned wanderer', 'B')}
              className="px-6 py-2.5 rounded bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-cinzel text-xs uppercase tracking-widest font-bold shadow-lg transition-all"
            >
              {t.riseAnew}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
