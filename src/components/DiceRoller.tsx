import React, { useState } from 'react';
import { sound } from '../utils/soundEngine';
import { Language, translations } from '../utils/translations';

interface DiceRollerProps {
  onRollComplete: (result: { roll: number; isCrit: boolean; isFumble: boolean }) => void;
  isRolling: boolean;
  setIsRolling: (rolling: boolean) => void;
  lang?: Language;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  onRollComplete,
  isRolling,
  setIsRolling,
  lang = 'en',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(20);
  const [lastRoll, setLastRoll] = useState<{ roll: number; isCrit: boolean; isFumble: boolean } | null>(null);

  const t = translations[lang];

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    sound.playDiceRoll();

    let counter = 0;
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 20) + 1);
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 20) + 1;
        setDisplayValue(finalRoll);
        const result = {
          roll: finalRoll,
          isCrit: finalRoll === 20,
          isFumble: finalRoll === 1,
        };
        setLastRoll(result);
        setIsRolling(false);
        if (result.isCrit) sound.playLootChime();
        if (result.isFumble) sound.playHurt();
        onRollComplete(result);
      }
    }, 60);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={rollDice}
        disabled={isRolling}
        title={t.rollFate}
        className="group relative flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#181614] hover:bg-[#25221e] active:scale-95 border border-[#443828] text-xs font-mono tracking-wider transition-all shadow-md text-[#d5c396]"
      >
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded border ${
            isRolling
              ? 'animate-spin border-amber-500 text-amber-300'
              : displayValue === 20
              ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold'
              : displayValue === 1
              ? 'border-red-600 bg-red-950/60 text-red-300 font-bold'
              : 'border-[#554530] bg-[#110f0e] text-[#c9b78c]'
          }`}
        >
          {displayValue}
        </span>
        <span className="font-cinzel text-xs uppercase tracking-widest text-[#d8caaa]">
          {isRolling ? t.castingFate : t.rollFate}
        </span>
      </button>

      {lastRoll && !isRolling && (
        <span
          className={`text-xs font-mono tracking-tight animate-fade-in ${
            lastRoll.isCrit
              ? 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : lastRoll.isFumble
              ? 'text-red-400 font-bold drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]'
              : 'text-[#9c917b]'
          }`}
        >
          {lastRoll.isCrit ? t.critSuccess : lastRoll.isFumble ? t.critFailure : `${t.rolledPrefix} ${lastRoll.roll}`}
        </span>
      )}
    </div>
  );
};
