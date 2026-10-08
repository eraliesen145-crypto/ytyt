import React from 'react';
import { X, Download, Copy, Check, Clock } from 'lucide-react';
import { Language, translations } from '../utils/translations';

export interface TurnRecord {
  turnNumber: number;
  playerAction: string;
  narrative: string;
  stats: {
    hp: number;
    stamina: number;
    gold: number;
  };
}

interface ChronicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  turns: TurnRecord[];
  lang?: Language;
}

export const ChronicleModal: React.FC<ChronicleModalProps> = ({
  isOpen,
  onClose,
  turns,
  lang = 'en',
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const t = translations[lang];

  const exportAsText = () => {
    let text = `# ${t.chroniclesModalTitle.toUpperCase()}\n${t.footerInfo}\n\n`;
    turns.forEach((item) => {
      text += `=== ${t.chapterPrefix.toUpperCase()} ${item.turnNumber} ===\n`;
      text += `${t.actionDeclared} ${item.playerAction}\n`;
      text += `HP: ${item.stats.hp} | Stamina: ${item.stats.stamina} | Gold: ${item.stats.gold}\n\n`;
      text += `${item.narrative}\n\n`;
    });
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportAsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = exportAsText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grimmire-log-turn-${turns.length}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#121011] border border-[#3b3124] rounded-lg shadow-2xl overflow-hidden font-serif">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#29221a] flex items-center justify-between bg-[#171413]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#c5a059]" />
            <h2 className="font-cinzel text-base font-bold text-[#d8caaa] tracking-wider uppercase">
              {t.chroniclesModalTitle} ({turns.length} {t.chaptersSuffix})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#201c18] hover:bg-[#2b2520] border border-[#3d3326] text-xs text-[#c4b69d] transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copiedTooltip : t.copyLog}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#201c18] hover:bg-[#2b2520] border border-[#3d3326] text-xs text-[#c4b69d] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportMd}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8a7f6c] hover:text-[#e4dac6] hover:bg-[#221d19] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 divide-y divide-[#241e18]">
          {turns.length === 0 ? (
            <p className="text-center italic text-[#7c715f] py-12">
              {t.emptyChronicle}
            </p>
          ) : (
            turns.map((item, idx) => (
              <div key={idx} className={idx > 0 ? 'pt-6' : ''}>
                <div className="flex items-center justify-between text-xs font-mono text-[#8a7d68] mb-2">
                  <span className="font-cinzel text-amber-300/80 font-bold">
                    {t.chapterPrefix} {item.turnNumber}
                  </span>
                  <span>HP: {item.stats.hp} | Stamina: {item.stats.stamina} | Gold: {item.stats.gold}g</span>
                </div>
                {item.playerAction && (
                  <p className="text-xs text-[#baa98d] font-cinzel italic mb-2">
                    {t.actionDeclared} "{item.playerAction}"
                  </p>
                )}
                <div className="text-sm text-[#cfc5b2] leading-relaxed space-y-2 whitespace-pre-line">
                  {item.narrative}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
