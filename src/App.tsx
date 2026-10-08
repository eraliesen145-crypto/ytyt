import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Flame,
  Skull,
  Languages,
} from 'lucide-react';
import { EmbersCanvas } from './components/EmbersCanvas';
import { StatusHud } from './components/StatusHud';
import { StoryLog, Choice } from './components/StoryLog';
import { DiceRoller } from './components/DiceRoller';
import { ChronicleModal, TurnRecord } from './components/ChronicleModal';
import { OriginSelectModal, CharacterOrigin, ORIGINS_DATA } from './components/OriginSelectModal';
import { sound } from './utils/soundEngine';
import { Language, translations } from './utils/translations';

interface GameState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  inventory: string[];
  gold: number;
  narrative: string;
  rawText: string;
  choices: Choice[];
  turnNumber: number;
  isGameOver: boolean;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  turns: TurnRecord[];
  characterOrigin: string;
  hasStarted: boolean;
  lang: Language;
}

const INITIAL_STATE: GameState = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  inventory: ['Ржавый кинжал', 'Факел', 'Малое зелье исцеления'],
  gold: 10,
  narrative: '',
  rawText: '',
  choices: [],
  turnNumber: 0,
  isGameOver: false,
  history: [],
  turns: [],
  characterOrigin: 'Рыцарь-дезертир',
  hasStarted: false,
  lang: 'ru',
};

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('grimmire_lang') as Language;
    return saved === 'en' ? 'en' : 'ru';
  });

  const [gameState, setGameState] = useState<GameState>(() => ({
    ...INITIAL_STATE,
    lang,
    characterOrigin: lang === 'ru' ? 'Рыцарь-дезертир' : 'Deserter Knight',
    inventory: lang === 'ru' ? ['Ржавый кинжал', 'Факел', 'Малое зелье исцеления'] : ['Rusty Dagger', 'Torch', 'Small Health Potion'],
  }));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isChronicleOpen, setIsChronicleOpen] = useState<boolean>(false);
  const [isOriginModalOpen, setIsOriginModalOpen] = useState<boolean>(false);
  const [pendingDiceRoll, setPendingDiceRoll] = useState<number | null>(null);

  const t = translations[lang];

  // Auto-load saved state or auto-start game
  useEffect(() => {
    const saved = localStorage.getItem('grimmire_save_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hasStarted && parsed.narrative) {
          setGameState(parsed);
          if (parsed.lang) setLang(parsed.lang);
          sound.updateHealthState(parsed.hp);
          return;
        }
      } catch (err) {
        console.error('Error restoring save:', err);
      }
    }

    // Auto-start game in current language
    const defaultOrigin = lang === 'ru' ? 'Рыцарь-дезертир' : 'Deserter Knight';
    startNewAdventure(defaultOrigin, lang);
  }, []);

  // Save state on updates
  useEffect(() => {
    if (gameState.hasStarted) {
      localStorage.setItem('grimmire_save_state', JSON.stringify({ ...gameState, lang }));
      sound.updateHealthState(gameState.hp);
    }
  }, [gameState, lang]);

  // Audio start on first interaction
  const handleUserGesture = () => {
    sound.startAmbient();
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      sound.startAmbient();
    }
  };

  const handleLanguageToggle = () => {
    const nextLang: Language = lang === 'ru' ? 'en' : 'ru';
    setLang(nextLang);
    localStorage.setItem('grimmire_lang', nextLang);
    const nextOrigin = ORIGINS_DATA[nextLang][0].name;

    // Restart in the new language with matching opening
    startNewAdventure(nextOrigin, nextLang);
  };

  // Start new game
  const startNewAdventure = async (originName?: string, targetLang?: Language) => {
    handleUserGesture();
    setIsLoading(true);
    const activeLang = targetLang || lang;
    const origin = originName || (activeLang === 'ru' ? 'Рыцарь-дезертир' : 'Deserter Knight');

    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterOrigin: origin, language: activeLang }),
      });
      const data = await res.json();

      const starterInv = data.inventory ?? (activeLang === 'ru'
        ? ['Ржавый кинжал', 'Факел', 'Малое зелье исцеления']
        : ['Rusty Dagger', 'Torch', 'Small Health Potion']);

      const newTurns: TurnRecord[] = [
        {
          turnNumber: 1,
          playerAction: activeLang === 'ru'
            ? 'Пробуждение в затопленном соборе Орос-Тхол'
            : 'Awakens in the sunken ruins of Oros-Thol',
          narrative: data.narrative,
          stats: {
            hp: data.hp?.current ?? 100,
            stamina: data.stamina?.current ?? 100,
            gold: data.gold ?? 10,
          },
        },
      ];

      setGameState({
        hp: data.hp?.current ?? 100,
        maxHp: data.hp?.max ?? 100,
        stamina: data.stamina?.current ?? 100,
        maxStamina: data.stamina?.max ?? 100,
        inventory: starterInv,
        gold: data.gold ?? 10,
        narrative: data.narrative,
        rawText: data.rawText,
        choices: data.choices ?? [],
        turnNumber: 1,
        isGameOver: false,
        history: [{ role: 'model', text: data.rawText }],
        turns: newTurns,
        characterOrigin: origin,
        hasStarted: true,
        lang: activeLang,
      });

      sound.playParchment();
    } catch (err) {
      console.error('Error starting game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Send turn action to server
  const handlePlayerAction = async (actionText: string, choiceId?: string) => {
    if (isLoading || gameState.isGameOver) return;
    handleUserGesture();
    setIsLoading(true);

    const fatePrefix = lang === 'ru' ? 'Результат броска судьбы d20' : 'Fate d20 check result';
    const fullAction = pendingDiceRoll
      ? `${actionText} [${fatePrefix}: ${pendingDiceRoll}]`
      : actionText;

    // Reset pending dice
    setPendingDiceRoll(null);

    // Play combat clash or parchment sound based on action keywords
    if (/strike|attack|dagger|blade|kill|fight|удар|клинок|атака|бой|меч/i.test(actionText)) {
      sound.playClash();
    } else {
      sound.playParchment();
    }

    try {
      const nextTurnNumber = gameState.turnNumber + 1;
      const res = await fetch('/api/game/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: fullAction,
          history: gameState.history,
          currentStats: {
            hp: gameState.hp,
            maxHp: gameState.maxHp,
            stamina: gameState.stamina,
            maxStamina: gameState.maxStamina,
            inventory: gameState.inventory,
            gold: gameState.gold,
          },
          characterOrigin: gameState.characterOrigin,
          turnNumber: nextTurnNumber,
          language: lang,
        }),
      });

      const data = await res.json();

      // Sound triggers
      if (data.hp?.current < gameState.hp) {
        sound.playHurt();
      } else if (data.gold > gameState.gold || data.inventory?.length > gameState.inventory.length) {
        sound.playLootChime();
      }

      const updatedTurns: TurnRecord[] = [
        ...gameState.turns,
        {
          turnNumber: nextTurnNumber,
          playerAction: fullAction,
          narrative: data.narrative,
          stats: {
            hp: data.hp?.current ?? gameState.hp,
            stamina: data.stamina?.current ?? gameState.stamina,
            gold: data.gold ?? gameState.gold,
          },
        },
      ];

      const newHistory = [
        ...gameState.history,
        { role: 'user' as const, text: fullAction },
        { role: 'model' as const, text: data.rawText },
      ];

      setGameState((prev) => ({
        ...prev,
        hp: data.hp?.current ?? prev.hp,
        maxHp: data.hp?.max ?? prev.maxHp,
        stamina: data.stamina?.current ?? prev.stamina,
        maxStamina: data.stamina?.max ?? prev.maxStamina,
        inventory: data.inventory ?? prev.inventory,
        gold: data.gold ?? prev.gold,
        narrative: data.narrative,
        rawText: data.rawText,
        choices: data.choices ?? [],
        turnNumber: nextTurnNumber,
        isGameOver: data.isGameOver ?? (data.hp?.current <= 0),
        history: newHistory,
        turns: updatedTurns,
      }));
    } catch (err) {
      console.error('Error executing turn:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick use item from inventory HUD
  const handleUseItem = (item: string) => {
    const action = lang === 'ru' ? `Использовать предмет из мешка: ${item}` : `Use item from inventory: ${item}`;
    handlePlayerAction(action);
  };

  // Inspect item from inventory HUD
  const handleInspectItem = (item: string) => {
    const action = lang === 'ru'
      ? `Внимательно осмотреть «${item}», чтобы изучить его свойства и назначение.`
      : `Inspect ${item} closely to evaluate its condition and magical or practical properties.`;
    handlePlayerAction(action);
  };

  // Dice roll complete callback
  const handleRollComplete = (result: { roll: number; isCrit: boolean; isFumble: boolean }) => {
    setPendingDiceRoll(result.roll);
  };

  // Restart adventure confirmation
  const handleRestart = () => {
    if (window.confirm(t.restartConfirm)) {
      localStorage.removeItem('grimmire_save_state');
      startNewAdventure(gameState.characterOrigin, lang);
    }
  };

  return (
    <div
      onClick={handleUserGesture}
      className="min-h-screen bg-[#0a0a0c] text-[#d6d0c4] flex flex-col relative selection:bg-red-950/80 selection:text-red-200"
    >
      {/* Background Embers canvas */}
      <EmbersCanvas intensity={gameState.hp <= 25 ? 'danger' : 'calm'} />

      {/* Top Gothic App Header */}
      <header className="relative z-10 border-b border-[#2d251c] bg-[#100e0f]/90 backdrop-blur-md px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-[#52412d] bg-[#1a1612] flex items-center justify-center text-amber-500 shadow-sm shadow-amber-950">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel text-lg sm:text-xl font-bold tracking-widest text-[#e8dcbf] uppercase">
                  {t.appTitle}
                </span>
                <span className="text-[11px] font-mono text-[#8a7f6c] hidden sm:inline">
                  {t.appSubtitle}
                </span>
              </div>
              <p className="text-[11px] font-serif italic text-[#8a7a63]">
                {t.originLabel} <span className="text-amber-300/80">{gameState.characterOrigin}</span>
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dice Fate Roller */}
            <div className="hidden sm:block">
              <DiceRoller
                onRollComplete={handleRollComplete}
                isRolling={isRolling}
                setIsRolling={setIsRolling}
                lang={lang}
              />
            </div>

            {/* Language Switcher RU / EN */}
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#181514] hover:bg-[#25201c] border border-[#382d20] text-xs font-cinzel text-[#d4c3a1] transition-colors"
              title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
            >
              <Languages className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">{lang.toUpperCase()}</span>
            </button>

            {/* Chronicle Journal Button */}
            <button
              onClick={() => setIsChronicleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181514] hover:bg-[#25201c] border border-[#382d20] text-xs font-cinzel text-[#d4c3a1] transition-colors"
              title={t.chronicleBtn}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{t.chronicleBtn}</span>
              <span className="text-[10px] font-mono text-[#827560]">({gameState.turns.length})</span>
            </button>

            {/* Origin Switcher */}
            <button
              onClick={() => setIsOriginModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#181514] hover:bg-[#25201c] border border-[#382d20] text-xs font-cinzel text-[#b5a78d] transition-colors"
              title={t.originsBtn}
            >
              <Skull className="w-3.5 h-3.5 text-[#9e8f77]" />
              <span>{t.originsBtn}</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded bg-[#181514] hover:bg-[#25201c] border border-[#382d20] text-[#c7b99f] transition-colors"
              title={isMuted ? t.unmuteTitle : t.muteTitle}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="p-2 rounded bg-[#181514] hover:bg-[#25201c] border border-[#382d20] text-[#c7b99f] hover:text-red-300 transition-colors"
              title={t.restartTitle}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Dice Roll Bar */}
        <div className="sm:hidden mt-2 pt-2 border-t border-[#251e18] flex justify-between items-center">
          <DiceRoller
            onRollComplete={handleRollComplete}
            isRolling={isRolling}
            setIsRolling={setIsRolling}
            lang={lang}
          />
        </div>
      </header>

      {/* Main RPG Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Story / Interaction Log */}
        <StoryLog
          narrative={gameState.narrative}
          rawText={gameState.rawText}
          choices={gameState.choices}
          isGameOver={gameState.isGameOver}
          isLoading={isLoading}
          onSelectChoice={handlePlayerAction}
          onCustomAction={handlePlayerAction}
          turnNumber={gameState.turnNumber}
          lang={lang}
        />

        {/* Right Status HUD */}
        <StatusHud
          hp={gameState.hp}
          maxHp={gameState.maxHp}
          stamina={gameState.stamina}
          maxStamina={gameState.maxStamina}
          inventory={gameState.inventory}
          gold={gameState.gold}
          turnNumber={gameState.turnNumber}
          lang={lang}
          onUseItem={handleUseItem}
          onInspectItem={handleInspectItem}
        />
      </main>

      {/* Footer info */}
      <footer className="relative z-10 py-3 px-6 border-t border-[#251e18] bg-[#0c0a0c]/90 text-center font-serif text-xs text-[#706453]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.footerInfo}</span>
          <span className="font-mono text-[11px] text-[#5e5344]">
            {t.healthShort}: {gameState.hp}/100 · {t.staminaShort}: {gameState.stamina}/100 · {t.goldShort}: {gameState.gold} · {t.itemsShort}: {gameState.inventory.length}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ChronicleModal
        isOpen={isChronicleOpen}
        onClose={() => setIsChronicleOpen(false)}
        turns={gameState.turns}
        lang={lang}
      />

      <OriginSelectModal
        isOpen={isOriginModalOpen}
        lang={lang}
        onSelectOrigin={(origin: CharacterOrigin) => {
          setIsOriginModalOpen(false);
          startNewAdventure(origin.name, lang);
        }}
        onClose={() => setIsOriginModalOpen(false)}
      />
    </div>
  );
}
