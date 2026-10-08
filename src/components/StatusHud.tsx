import React, { useState } from 'react';
import { Shield, Flame, Coins, Package, Heart, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/soundEngine';
import { Language, translations } from '../utils/translations';

interface StatusHudProps {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  inventory: string[];
  gold: number;
  turnNumber: number;
  lang?: Language;
  onUseItem?: (item: string) => void;
  onInspectItem?: (item: string) => void;
}

export const StatusHud: React.FC<StatusHudProps> = ({
  hp,
  maxHp,
  stamina,
  maxStamina,
  inventory,
  gold,
  turnNumber,
  lang = 'en',
  onUseItem,
  onInspectItem,
}) => {
  const [isInventoryExpanded, setIsInventoryExpanded] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const t = translations[lang];
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const isCriticalHp = hp <= 25 && hp > 0;

  const handleItemClick = (item: string) => {
    sound.playParchment();
    setSelectedItem(selectedItem === item ? null : item);
  };

  const handleUseItem = (item: string) => {
    if (item.toLowerCase().includes('potion') || item.toLowerCase().includes('зелье')) {
      sound.playDrinkPotion();
    } else if (item.toLowerCase().includes('torch') || item.toLowerCase().includes('факел')) {
      sound.playClash();
    } else {
      sound.playParchment();
    }
    setSelectedItem(null);
    onUseItem?.(item);
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4 font-serif">
      {/* Primary Status Card */}
      <div
        className={`relative p-5 rounded-lg border bg-[#111012]/90 backdrop-blur-md transition-all shadow-xl ${
          isCriticalHp
            ? 'border-red-900/80 shadow-[0_0_25px_rgba(220,38,38,0.25)] animate-pulse'
            : 'border-[#332c25] shadow-black/80'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2a241e] mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#c5a059]" />
            <h2 className="font-cinzel text-sm uppercase tracking-widest text-[#d8caaa] font-bold">
              {t.statusTitle}
            </h2>
          </div>
          <span className="text-xs font-mono text-[#8a7f6c]">
            {t.turnPrefix}{turnNumber}
          </span>
        </div>

        {/* Health Points */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-cinzel text-[#d4bca0]">
              <Heart
                className={`w-3.5 h-3.5 ${
                  isCriticalHp ? 'text-red-500 fill-red-500 animate-ping' : 'text-red-600 fill-red-600/40'
                }`}
              />
              {t.vitality}
            </span>
            <span
              className={`font-mono text-xs font-semibold ${
                isCriticalHp ? 'text-red-400 font-bold' : hp < 50 ? 'text-amber-400' : 'text-[#e2d8c3]'
              }`}
            >
              {hp} / {maxHp}
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#1c1815] rounded-full overflow-hidden border border-[#382b20]">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                isCriticalHp
                  ? 'bg-gradient-to-r from-red-700 to-red-500'
                  : hp < 50
                  ? 'bg-gradient-to-r from-amber-700 to-amber-500'
                  : 'bg-gradient-to-r from-red-800 via-rose-700 to-emerald-700'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          {isCriticalHp && (
            <p className="flex items-center gap-1 text-[11px] text-red-400 font-mono tracking-tight pt-0.5">
              <AlertTriangle className="w-3 h-3" />
              {t.mortalPeril}
            </p>
          )}
        </div>

        {/* Stamina Points */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 font-cinzel text-[#d4bca0]">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {t.stamina}
            </span>
            <span className="font-mono text-xs text-[#e2d8c3]">
              {stamina} / {maxStamina}
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#1c1815] rounded-full overflow-hidden border border-[#382b20]">
            <div
              className="h-full bg-gradient-to-r from-[#6b4712] via-[#b47a22] to-[#e8a338] transition-all duration-500 ease-out rounded-full"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>

        {/* Gold Reserve */}
        <div className="flex items-center justify-between p-2.5 rounded bg-[#161413] border border-[#2b251f]">
          <span className="flex items-center gap-2 text-xs font-cinzel text-[#cbb58c]">
            <Coins className="w-4 h-4 text-[#e0a93b]" />
            {t.purseCoins}
          </span>
          <span className="font-mono text-sm font-bold text-[#f5d061]">
            {gold} <span className="text-xs font-normal text-[#9b8b6a]">{t.marks}</span>
          </span>
        </div>
      </div>

      {/* Inventory Deck */}
      <div className="p-4 rounded-lg border border-[#332c25] bg-[#111012]/90 backdrop-blur-md shadow-xl flex flex-col">
        <div
          onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
          className="flex items-center justify-between cursor-pointer pb-2.5 border-b border-[#28231d] select-none group"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#c5a059]" />
            <h3 className="font-cinzel text-xs uppercase tracking-widest text-[#d8caaa] group-hover:text-amber-300 transition-colors">
              {t.possessions} ({inventory.length})
            </h3>
          </div>
          <button className="text-[#8a7f6c] hover:text-[#d8caaa] transition-colors">
            {isInventoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isInventoryExpanded && (
          <div className="mt-3 space-y-2">
            {inventory.length === 0 ? (
              <p className="text-xs italic text-[#776c5b] py-2 text-center">
                {t.emptyPack}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {inventory.map((item, idx) => {
                  const isSelected = selectedItem === item;
                  const lowerItem = item.toLowerCase();
                  const isPotion = lowerItem.includes('potion') || lowerItem.includes('зелье');
                  const isTorch = lowerItem.includes('torch') || lowerItem.includes('факел');

                  return (
                    <li key={`${item}-${idx}`} className="text-xs">
                      <div
                        onClick={() => handleItemClick(item)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-[#221e1a] border-[#6b583a] text-amber-200'
                            : 'bg-[#151312] border-[#26201b] text-[#c9bea9] hover:bg-[#1a1715] hover:border-[#3d3326]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8f7547] shrink-0" />
                          <span className="font-serif truncate">{item}</span>
                        </span>
                        {isPotion && (
                          <span className="text-[10px] font-mono text-emerald-400/80 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40">
                            {t.consume}
                          </span>
                        )}
                      </div>

                      {/* Item Quick Action Drawer */}
                      {isSelected && (
                        <div className="mt-1 p-2 bg-[#1b1816] rounded border border-[#3b3225] flex flex-wrap gap-1.5 animate-fadeIn">
                          {(isPotion || isTorch) && (
                            <button
                              onClick={() => handleUseItem(item)}
                              className="px-2.5 py-1 text-[11px] rounded bg-[#2e261d] hover:bg-[#423628] text-amber-300 font-cinzel border border-[#52422f] active:scale-95 transition-all"
                            >
                              {isPotion ? t.useDrink : t.useLight}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onInspectItem?.(item);
                              setSelectedItem(null);
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-[#181514] hover:bg-[#25201d] text-[#b3a58e] font-serif border border-[#332b21] active:scale-95 transition-all"
                          >
                            {t.inspectItem}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Atmospheric Survival Note */}
      <div className="p-3.5 rounded-lg border border-[#24201c] bg-[#0d0c0e]/80 text-[#827766] text-xs italic font-serif leading-relaxed">
        <p>{t.atmosphereQuote}</p>
      </div>
    </aside>
  );
};
