import React from 'react';
import { Skull } from 'lucide-react';
import { Language, translations } from '../utils/translations';

export interface CharacterOrigin {
  id: string;
  name: string;
  tagline: string;
  description: string;
  starterBonus: string;
}

export const ORIGINS_DATA: Record<Language, CharacterOrigin[]> = {
  en: [
    {
      id: 'knight',
      name: 'Deserter Knight',
      tagline: 'Survivor of the Iron Crusade',
      description: 'You deserted the imperial lines when madness gripped the high command. Hardened by steel, you bear battle instincts and scarred leathers.',
      starterBonus: 'Starts with: Rusty Dagger, Torch, Small Health Potion, +High Combat Resilience',
    },
    {
      id: 'alchemist',
      name: 'Plague Alchemist',
      tagline: 'Seeker of forbidden Panaceas',
      description: 'You fled the quarantined citadels carrying satchels of caustic salts and murky salves. You know how to identify poisonous molds and rare herbs.',
      starterBonus: 'Starts with: Rusty Dagger, Torch, Small Health Potion, +Keen Toxin Knowledge',
    },
    {
      id: 'scavenger',
      name: 'Crypt Desecrator',
      tagline: 'Graverobber of the Sunken Tombs',
      description: 'A life spent in catacombs has gifted you soft steps and the ability to detect sprung deadfalls and hidden masonry before stepping into them.',
      starterBonus: 'Starts with: Rusty Dagger, Torch, Small Health Potion, +Trap Awareness',
    },
    {
      id: 'apostate',
      name: 'Hedge Apostate',
      tagline: 'Exiled Heretic of the Old Gods',
      description: 'Branded with forbidden sigils for whispering prayers to sleeping titans. The dark chill does not frighten you as it does common men.',
      starterBonus: 'Starts with: Rusty Dagger, Torch, Small Health Potion, +Ancient Lore Sense',
    },
  ],
  ru: [
    {
      id: 'knight',
      name: 'Рыцарь-дезертир',
      tagline: 'Уцелевший ветеран Железного похода',
      description: 'Вы бежали из имперских фаланг, когда командиров обуяло безумие. Закалены сталью, обладаете боевыми рефлексами и носите изрубленную броню.',
      starterBonus: 'Старт: Ржавый кинжал, Факел, Малое зелье исцеления, +Стойкость в бою',
    },
    {
      id: 'alchemist',
      name: 'Чумной алхимик',
      tagline: 'Искатель запретной панацеи',
      description: 'Вы бежали из зачумленных цитаделей с сумками едких солей и темных мазей. Умеете распознавать ядовитую плесень и редкие травы в катакомбах.',
      starterBonus: 'Старт: Ржавый кинжал, Факел, Малое зелье исцеления, +Знание ядов',
    },
    {
      id: 'scavenger',
      name: 'Осквернитель гробниц',
      tagline: 'Грабитель затопленных склепов',
      description: 'Годы в катакомбах научили бесшумной поступи и умению замечать скрытые растяжки и нажимные плиты до того, как они сработают.',
      starterBonus: 'Старт: Ржавый кинжал, Факел, Малое зелье исцеления, +Чутье на ловушки',
    },
    {
      id: 'apostate',
      name: 'Мятежный апостат',
      tagline: 'Изгнанный еретик древних титанов',
      description: 'Заклеймен запретными сигилами за молитвы дремлющим богам. Могильный холод и шепот не пугают вас так, как простых смертных.',
      starterBonus: 'Старт: Ржавый кинжал, Факел, Малое зелье исцеления, +Чутье древней магии',
    },
  ],
};

export const ORIGINS: CharacterOrigin[] = ORIGINS_DATA.en;

interface OriginSelectModalProps {
  isOpen: boolean;
  lang?: Language;
  onSelectOrigin: (origin: CharacterOrigin) => void;
  onClose: () => void;
}

export const OriginSelectModal: React.FC<OriginSelectModalProps> = ({
  isOpen,
  lang = 'en',
  onSelectOrigin,
  onClose,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const origins = ORIGINS_DATA[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#121011] border border-[#3f3426] rounded-xl shadow-2xl p-6 sm:p-8 font-serif overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center pb-6 border-b border-[#29221b] mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1e1914] border border-[#483a29] text-[#c5a059] mb-3">
            <Skull className="w-5 h-5" />
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-widest text-[#d8caaa] uppercase">
            {t.chooseOriginTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#958872] max-w-md mx-auto mt-1">
            {t.chooseOriginSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {origins.map((origin) => (
            <div
              key={origin.id}
              onClick={() => onSelectOrigin(origin)}
              className="group p-4 rounded-lg border border-[#2e261f] bg-[#161312] hover:bg-[#201a16] hover:border-[#634e35] cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-cinzel text-sm font-bold text-[#e0d3bc] group-hover:text-amber-300 transition-colors">
                    {origin.name}
                  </h3>
                  <span className="text-[10px] font-mono text-[#8a7f6c] uppercase">
                    {origin.id}
                  </span>
                </div>
                <p className="text-xs font-serif italic text-[#9b8b73] mb-2.5">
                  {origin.tagline}
                </p>
                <p className="text-xs text-[#c4b9a5] leading-relaxed mb-3">
                  {origin.description}
                </p>
              </div>
              <div className="pt-2 border-t border-[#251e18] text-[11px] font-mono text-[#8f7d5f] group-hover:text-amber-200/90 transition-colors">
                {origin.starterBonus}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-[#7f7461] hover:text-[#bbb09c] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onSelectOrigin(origins[0])}
            className="px-5 py-2 rounded bg-[#2e251a] hover:bg-[#453724] border border-[#5c4932] text-amber-200 font-cinzel text-xs uppercase tracking-widest font-bold transition-all"
          >
            {t.beginAs} {origins[0].name}
          </button>
        </div>
      </div>
    </div>
  );
};
