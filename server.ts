import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const SYSTEM_INSTRUCTION_EN = `You are an expert Text Adventure Game Master (GM) leading an immersive, dark-fantasy survival RPG game.

GAME RULES & MECHANICS:
1. Setting: A grim, dark-fantasy post-apocalyptic world filled with ruins, ancient forbidden magic, terrifying monsters, mutated beasts, and scarce resources. The atmosphere is oppressive, bleak, cold, and mysterious (inspired by Dark Souls, Bloodborne, and grimdark fantasy).
2. Player Stats: Track the following stats at the end of every response:
   - Health (HP): [Current/Max] (Starts at 100/100)
   - Stamina: [Current/Max] (Starts at 100/100)
   - Inventory: [List of items separated by commas] (Starter: Rusty Dagger, Torch, Small Health Potion)
   - Gold: [Amount] (Starts at 10)
3. Pacing & Narrative:
   - Write vivid, visceral, atmospheric descriptions (2-3 paragraphs max per step).
   - Maintain a serious, suspenseful, grim tone.
   - The world is unforgiving: choices have direct consequences. Violent encounters, traps, starvation, exposure, or reckless magic cause HP or Stamina loss. Clever tactics, stealth, resting, or using items can heal or reveal treasures. If HP hits 0, describe their gruesome or tragic demise!
4. Interaction:
   - Always provide 3-4 distinct choices for the player (A, B, C, D).
   - Option D MUST always be: "D) Custom action (type whatever you want)"
5. Exact Format Requirement: ALWAYS format your responses strictly with these Markdown dividers and headers:
---
[Atmospheric Story Narrative & Outcome of Previous Action. 2 to 3 vivid paragraphs describing what happens, what the player senses, and the immediate situation.]

---
**CURRENT STATUS:**
- **HP**: [Current/Max]
- **Stamina**: [Current/Max]
- **Inventory**: [Item 1, Item 2, Item 3...]
- **Gold**: [Number]

---
**WHAT DO YOU DO?**
A) [Choice 1]
B) [Choice 2]
C) [Choice 3]
D) Custom action (type whatever you want)

Do NOT deviate from this structure. Always include the three sections separated by '---'.`;

const SYSTEM_INSTRUCTION_RU = `Вы — опытный Мастер текстовых ролевых игр (Game Master / GM), ведущий атмосферную, мрачную survival RPG в стиле тёмного фэнтези (Dark Fantasy в духе Dark Souls, Bloodborne).

ПРАВИЛА И МЕХАНИКА ИГРЫ:
1. Сеттинг: Суровый, гибнущий мир древней магии, затопленных соборов, чумных катакомб и кошмарных порождений бездны. Ресурсы крайне скудны, смерть подстерегает на каждом шагу.
2. Характеристики игрока: Отслеживайте в конце каждого ответа:
   - Здоровье (HP / ОЗ): [Текущее/Макс] (Старт: 100/100)
   - Выносливость (Stamina): [Текущее/Макс] (Старт: 100/100)
   - Инвентарь (Inventory): [Список предметов через запятую] (Старт: Ржавый кинжал, Факел, Малое зелье исцеления)
   - Золото (Gold): [Количество] (Старт: 10)
3. Повествование и тон:
   - Пишите на богатом, выразительном русском языке. Атмосферные, детальные описания (2–3 абзаца на шаг).
   - Сохраняйте мрачный, напряженный, бескомпромиссный тон.
   - Мир опасен: необдуманные решения ведут к потере HP или сил, поломке снаряжения или гибели. Если HP падает до 0, опишите трагическую смерть персонажа!
4. Варианты действий:
   - В конце всегда предлагайте 4 варианта: A, B, C, D.
   - Вариант D ВСЕГДА должен быть: "D) Свое действие (напишите любой вариант)"
5. СТРОГИЙ ФОРМАТ ОТВЕТА (всегда используйте разделители '---'):
---
[Мрачное художественное повествование и исход действия. 2-3 абзаца на русском языке.]

---
**CURRENT STATUS:**
- **HP**: [Текущее/100]
- **Stamina**: [Текущее/100]
- **Inventory**: [Предмет 1, Предмет 2...]
- **Gold**: [Число]

---
**WHAT DO YOU DO?**
A) [Вариант 1]
B) [Вариант 2]
C) [Вариант 3]
D) Свое действие (напишите любой вариант)

Не отступайте от этой структуры разделителей.`;

interface TurnRequest {
  action?: string;
  message?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  currentStats?: {
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    inventory: string[];
    gold: number;
  };
  characterOrigin?: string;
  diceRoll?: number;
  language?: 'ru' | 'en';
}

// Fallback generator in case Gemini API key is missing or fails
function generateFallbackTurn(
  action: string,
  turnNumber: number,
  currentStats: TurnRequest['currentStats'] = {
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    inventory: ['Rusty Dagger', 'Torch', 'Small Health Potion'],
    gold: 10,
  },
  language: 'ru' | 'en' = 'en'
) {
  let hp = currentStats.hp;
  let stamina = currentStats.stamina;
  const inventory = [...currentStats.inventory];
  let gold = currentStats.gold;

  const isStart = !action || action.toLowerCase().trim() === 'start' || action.toLowerCase().trim() === 'старт' || turnNumber === 1;

  if (isStart) {
    if (language === 'ru') {
      const narrative = `Ледяной дождь просачивается сквозь разрушенные гранитные нервюры свода и мерно капает на ваше похолодевшее чело. Вы приходите в себя на расколотом алтаре внутри затопленного собора Орос-Тхол. Воздух пропитан запахом истлевшего погребального воска, стоячей болотной сырости и ржавого железа. В полумраке под разрушенным нефом сухие тернии оплетают массивные каменные саркофаги, а из темных галерей эхом доносится влажный скрежет чьих-то когтей о плиты.

Рядом с вашими онемевшими пальцами лежит скудный дорожный набор: зазубренный железный клинок, покрытый рыжими язвами ржавчины, ясеневый факел, пропитанный горючей смолой, и мутная стеклянная склянка с багровым целебным маслом, запечатанная потрескавшимся жиром. Кошель почти пуст — в нем едва звякают десять свинцовых монет павшего королевства.

Два пути манят вперед: левый спускается в затопленные катакомбы костницы, где в черной воде мерцает бледный трупный фосфор; правый круто уходит на разрушенную колокольню, где штормовой ветер воет подобно плачущим сиротам. Между ними на постаменте с плачущими святыми покоится массивный реликварий, стянутый железными цепями.`;

      const ruStarterInv = ['Ржавый кинжал', 'Факел', 'Малое зелье исцеления'];
      return {
        rawText: `---\n${narrative}\n\n---\n**CURRENT STATUS:**\n- **HP**: 100/100\n- **Stamina**: 100/100\n- **Inventory**: ${ruStarterInv.join(', ')}\n- **Gold**: 10\n\n---\n**WHAT DO YOU DO?**\nA) Высечь искру кресалом, зажечь ясеневый факел и осмотреть скованный цепями реликварий\nB) Бесшумно скользнуть к затопленным катакомбам костницы в поисках укрытия\nC) Взобраться по осыпающимся ступеням к плачущей колокольне\nD) Свое действие (напишите любой вариант)`,
        narrative,
        hp: { current: 100, max: 100 },
        stamina: { current: 100, max: 100 },
        inventory: ruStarterInv,
        gold: 10,
        choices: [
          { id: 'A', text: 'Высечь искру кресалом, зажечь ясеневый факел и осмотреть скованный цепями реликварий' },
          { id: 'B', text: 'Бесшумно скользнуть к затопленным катакомбам костницы в поисках укрытия' },
          { id: 'C', text: 'Взобраться по осыпающимся ступеням к плачущей колокольне' },
          { id: 'D', text: 'Свое действие (напишите любой вариант)' },
        ],
        isGameOver: false,
      };
    }

    const narrative = `Cold rain seeps through collapsed granite ribs overhead, dripping onto your cold brow. You awaken on a shattered altar inside the sunken cathedral of Oros-Thol. The air smells of extinguished wax, damp rot, and rusted iron. In the gloom below the broken nave, skeletal brambles clutch ancient stone sarcophagi, and the distant, wet scraping of bone upon slate echoes through the cloisters.

Beside your shuddering fingers lies your meager kit: a jagged iron blade pitted with orange rust, a resin-soaked ashwood torch, and a single vial of cloudy crimson salving oil sealed with cracked tallow. Your purse feels hollow, bearing barely ten stamped lead coins from a forgotten kingdom. 

A choked draft flickers down two corridors ahead: the left descends into flooded ossuary catacombs where pale phosphorescence shimmers; the right ascends toward the shattered bell tower, where wind wails like weeping children. Between them, a freshly chained iron reliquary rests upon a pedestal carved with weeping saints.`;

    return {
      rawText: `---\n${narrative}\n\n---\n**CURRENT STATUS:**\n- **HP**: 100/100\n- **Stamina**: 100/100\n- **Inventory**: Rusty Dagger, Torch, Small Health Potion\n- **Gold**: 10\n\n---\n**WHAT DO YOU DO?**\nA) Strike flint to light your ashwood torch and inspect the chained reliquary\nB) Creep quietly toward the flooded ossuary catacombs to search for shelter\nC) Clamber up the crumbling stairs toward the weeping bell tower\nD) Custom action (type whatever you want)`,
      narrative,
      hp: { current: 100, max: 100 },
      stamina: { current: 100, max: 100 },
      inventory: ['Rusty Dagger', 'Torch', 'Small Health Potion'],
      gold: 10,
      choices: [
        { id: 'A', text: 'Strike flint to light your ashwood torch and inspect the chained reliquary' },
        { id: 'B', text: 'Creep quietly toward the flooded ossuary catacombs to search for shelter' },
        { id: 'C', text: 'Clamber up the crumbling stairs toward the weeping bell tower' },
        { id: 'D', text: 'Custom action (type whatever you want)' },
      ],
      isGameOver: false,
    };
  }

  // Handle standard gameplay branching consequences
  const lower = action.toLowerCase();
  let narrative = '';
  let choices = language === 'ru'
    ? [
        { id: 'A', text: 'Осторожно продвигаться вперед с обнаженным клинком' },
        { id: 'B', text: 'Обыскать тени в поисках припасов или скрытых рун' },
        { id: 'C', text: 'Укрыться за колонной и перевести дух' },
        { id: 'D', text: 'Свое действие (напишите любой вариант)' },
      ]
    : [
        { id: 'A', text: 'Press forward cautiously with blade raised' },
        { id: 'B', text: 'Search the shadows for usable supplies or hidden runes' },
        { id: 'C', text: 'Take cover and catch your breath to restore strength' },
        { id: 'D', text: 'Custom action (type whatever you want)' },
      ];

  if (lower.includes('torch') || lower.includes('факел') || lower.includes('зажечь') || lower.includes('reliquary') || lower.includes('реликварий')) {
    if (language === 'ru') {
      narrative = `Искра вспыхивает с шипением. Рыжее пламя охватывает смоляную паклю, отгоняя удушливый мрак. Свет выхватывает глубокие борозды от когтей на каменных плитах. Вы опускаетесь на колени перед скованным реликварием; навесной замок позеленел от вековой патины.

Острием кинжала вы срываете проржавевшую дужку. Внутри обнаруживается флакон могильной смолы и пять потускневших серебряных монет Старой Империи. Но свет потревожил покой сводов: с готических арок с тихим стрекотом срываются три бледных пепельных ползуна с игловидными жвалами!`;
    } else {
      narrative = `The spark catches with a hissing snap. Ocher flame leaps from your torch, banishing the suffocating black. The flickering glow reveals deep talon-gouges scored across the stone flags. You kneel before the chained reliquary; its iron padlock is corroded with verdigris.

You pry the lock latch with the tang of your dagger. Inside lies an unbroken glass phial of grave-resin and five tarnished silver marks from the Old Empire. But the sudden bloom of light has provoked a hollow scuttling above: three chittering, carrion-pale ash-crawlers drop from the vaulted arches, their needle legs clicking greedily upon the flags!`;
    }
    stamina = Math.max(10, stamina - 15);
    gold += 5;
    const resinItem = language === 'ru' ? 'Могильная смола' : 'Grave-Resin';
    if (!inventory.includes(resinItem)) inventory.push(resinItem);
    choices = language === 'ru'
      ? [
          { id: 'A', text: 'Размахивать пылающим факелом, чтобы отогнать пепельных ползунов' },
          { id: 'B', text: 'Сделать выпад ржавым кинжалом по ближайшей твари' },
          { id: 'C', text: 'Кувырком отпрянуть в темную арку и разорвать дистанцию' },
          { id: 'D', text: 'Свое действие (напишите любой вариант)' },
        ]
      : [
          { id: 'A', text: 'Brandish the roaring torch to drive back the skittering ash-crawlers' },
          { id: 'B', text: 'Lash out with your rusty dagger in a swift defensive arc' },
          { id: 'C', text: 'Tumble backward into the dark archway to escape their reach' },
          { id: 'D', text: 'Custom action (type whatever you want)' },
        ];
  } else if (lower.includes('potion') || lower.includes('drink') || lower.includes('зелье') || lower.includes('выпить')) {
    const potionNameEn = 'Small Health Potion';
    const potionNameRu = 'Малое зелье исцеления';
    const hasPotion = inventory.some(i => i.toLowerCase().includes('potion') || i.toLowerCase().includes('зелье'));

    if (hasPotion) {
      const idx = inventory.findIndex(i => i.toLowerCase().includes('potion') || i.toLowerCase().includes('зелье'));
      if (idx !== -1) inventory.splice(idx, 1);
      hp = Math.min(100, hp + 35);
      if (language === 'ru') {
        narrative = `Вы срываете восковую печать и выпиваете горький, металлический отвар. Жгучий жар разливается по венам, стягивая разорванную плоть и заглушая звон в висках. К пальцам возвращается спасительное тепло.

Вокруг стонет собор под тяжестью веков. Запах целебного масла привлекает нечто чуткое во мгле — желтые огоньки глаз отражаются в мутных лужах на дальнем конце нефа.`;
      } else {
        narrative = `You unstopper the cloudy phial and swallow the bitter, metallic brew. A burning heat surges along your veins, knitting torn flesh and dulling the throb in your skull. Warmth returns to your numb fingers.

Around you, the ruin groans under the weight of centuries. The scent of spilled medicine attracts something watchful in the gloom—eyes like yellow embers reflect in the wet puddles down the corridor.`;
      }
    } else {
      narrative = language === 'ru'
        ? `Вы ощупываете поясные сумки, но лечебных настоев больше не осталось. Лишь ледяной сквозняк холодит шею, пока вы крепче сжимаете рукоять оружия.`
        : `You pat your belt pouches, but find no healing draughts remaining. The icy wind howls through the stone embrasures, stinging your exposed neck as you clutch your weapon tight.`;
    }
  } else if (lower.includes('fight') || lower.includes('attack') || lower.includes('strike') || lower.includes('удар') || lower.includes('бой') || lower.includes('атаковать')) {
    hp = Math.max(0, hp - 20);
    stamina = Math.max(10, stamina - 25);
    if (hp <= 0) {
      narrative = language === 'ru'
        ? `Вы бросаетесь в отчаянную атаку, но тьма безжалостна. Зазубренные когти пробивают истлевшую кожу, ломая ребра. Тёплая кровь хлещет на холодный гранит. Затопленные залы собора смыкаются над вами, поглощая последний вздох. Ваше путешествие окончено.`
        : `You throw yourself forward with wild fury, but the darkness is cruel. A jagged claw rips through your leathers, shattering bone. Blood spills warm and dark into the mire. As darkness claims your vision, the ruined stones swallow your dying breath. Your journey ends here, another forgotten corpse in the hollows.`;
      return {
        rawText: `---\n${narrative}\n\n---\n**CURRENT STATUS:**\n- **HP**: 0/100\n- **Stamina**: 0/100\n- **Inventory**: ${inventory.join(', ')}\n- **Gold**: ${gold}\n\n---\n**WHAT DO YOU DO?**\nA) ${language === 'ru' ? 'Сгинуть в бездне (Конец игры)' : 'Succumb to the dark abyss (Game Over)'}\nB) ${language === 'ru' ? 'Восстать вновь как новый обреченный странник' : 'Awaken anew as another condemned wanderer'}\nC) ${language === 'ru' ? 'Молить забытых богов о перерождении' : 'Pray to forgotten gods for rebirth'}\nD) ${language === 'ru' ? 'Свое действие (напишите любой вариант)' : 'Custom action (type whatever you want)'}`,
        narrative,
        hp: { current: 0, max: 100 },
        stamina: { current: 0, max: 100 },
        inventory,
        gold,
        choices: [
          { id: 'A', text: language === 'ru' ? 'Сгинуть в бездне (Конец игры)' : 'Succumb to the dark abyss (Game Over)' },
          { id: 'B', text: language === 'ru' ? 'Восстать вновь как новый обреченный странник' : 'Awaken anew as another condemned wanderer' },
          { id: 'C', text: language === 'ru' ? 'Молить забытых богов о перерождении' : 'Pray to forgotten gods for rebirth' },
          { id: 'D', text: language === 'ru' ? 'Свое действие (напишите любой вариант)' : 'Custom action (type whatever you want)' },
        ],
        isGameOver: true,
      };
    } else {
      narrative = language === 'ru'
        ? `Вы делаете выпад, вонзая зазубренное лезвие прямо в сочленение панциря твари. Чёрная жижа с шипением брызжет на плиты. Чудовище бьется в агонии, полоснув когтем по вашему плечу, после чего затихает.

Боль пульсирует в ране, но победа за вами. Из пасти поверженного существа выпадает тускло мерцающий синий осколок души.`
        : `You lunge, driving your rusted blade straight through the creature's chitinous breastplate. Black ichor steams upon the cold slate with an agonizing hiss. The beast thrashes wildly, raking sharp talons across your shoulder before collapsing in twitches.

Pain pulses through your arm, but you breathe the heavy air of victory. From its shredded maw falls a blackened soul-shard that pulses with faint indigo light.`;

      const shard = language === 'ru' ? 'Осколок души' : 'Blackened Soul-Shard';
      if (!inventory.includes(shard)) inventory.push(shard);
      choices = language === 'ru'
        ? [
            { id: 'A', text: 'Подобрать пульсирующий осколок души и перевязать плечо' },
            { id: 'B', text: 'Обыскать логово твари на предмет ядовитых желез' },
            { id: 'C', text: 'Поспешить дальше, пока запах крови не привлек стаю' },
            { id: 'D', text: 'Свое действие (напишите любой вариант)' },
          ]
        : [
            { id: 'A', text: 'Pick up the pulsing soul-shard and bind your bleeding shoulder' },
            { id: 'B', text: 'Carve open the beast to search for poison glands or teeth' },
            { id: 'C', text: 'Hurry down the corridor before the smell of blood summons more' },
            { id: 'D', text: 'Custom action (type whatever you want)' },
          ];
    }
  } else {
    narrative = language === 'ru'
      ? `Вы решаетесь действовать: «${action}». Влажный воздух колеблется, пока вы крадетесь сквозь собор. Под сапогами похрустывает известковая крошка, а вековые тени искажаются вокруг вашего силуэта.

Впереди коридор выводит в заросший мхом клуатр, где посреди мертвого сада высится иссохший дуб над древним колодцем. Из темной глубины колодца доносится невнятный шепот, а у корней чернеет кострище давно покинутой стоянки.`
      : `You enact your resolve: "${action}". The damp air shifts as you move with measured breath through the ruin. Crumbling stones click beneath your soles, and ancient shadows bend around your silhouette. 

Ahead, the passage widens into a moss-strangled courtyard where a dead withered tree stands atop an ancient dry well. Soft whispers seem to float from the dark depths of the well, and an abandoned campsite sits cold beneath the roots.`;
    stamina = Math.max(10, stamina - 10);
    choices = language === 'ru'
      ? [
          { id: 'A', text: 'Приблизиться к кострищу и разгрести остывший пепел' },
          { id: 'B', text: 'Осторожно заглянуть в шепчущий колодец с клинком наготове' },
          { id: 'C', text: 'Обойти периметр двора в поисках выхода к разрушенным вратам' },
          { id: 'D', text: 'Свое действие (напишите любой вариант)' },
        ]
      : [
          { id: 'A', text: 'Approach the cold campsite and sift through the blackened ashes' },
          { id: 'B', text: 'Peer carefully down into the whispering well with weapon ready' },
          { id: 'C', text: 'Scout the perimeter of the courtyard for an exit toward the ruined gate' },
          { id: 'D', text: 'Custom action (type whatever you want)' },
        ];
  }

  const rawText = `---\n${narrative}\n\n---\n**CURRENT STATUS:**\n- **HP**: ${hp}/100\n- **Stamina**: ${stamina}/100\n- **Inventory**: ${inventory.join(', ')}\n- **Gold**: ${gold}\n\n---\n**WHAT DO YOU DO?**\nA) ${choices[0].text}\nB) ${choices[1].text}\nC) ${choices[2].text}\nD) ${choices[3].text}`;

  return {
    rawText,
    narrative,
    hp: { current: hp, max: 100 },
    stamina: { current: stamina, max: 100 },
    inventory,
    gold,
    choices,
    isGameOver: hp <= 0,
  };
}

// Helper to parse Gemini's output matching the exact format
function parseGameResponse(rawText: string, fallbackStats?: TurnRequest['currentStats'], language: 'ru' | 'en' = 'en') {
  let narrative = '';
  let hp = { current: fallbackStats?.hp ?? 100, max: fallbackStats?.maxHp ?? 100 };
  let stamina = { current: fallbackStats?.stamina ?? 100, max: fallbackStats?.maxStamina ?? 100 };
  let inventory = fallbackStats?.inventory ? [...fallbackStats.inventory] : (language === 'ru' ? ['Ржавый кинжал', 'Факел', 'Малое зелье исцеления'] : ['Rusty Dagger', 'Torch', 'Small Health Potion']);
  let gold = fallbackStats?.gold ?? 10;
  const choices: Array<{ id: string; text: string }> = [];

  try {
    // Parse HP: e.g. - **HP**: 85/100 or **ОЗ**: 85/100 or HP: 85/100
    const hpMatch = rawText.match(/(?:\*\*|\b)(?:HP|ОЗ|Здоровье|Health)(?:\*\*|\b)[:\s]*(\d+)\/(\d+)/i) || rawText.match(/HP:\s*(\d+)\/(\d+)/i);
    if (hpMatch) {
      hp = { current: parseInt(hpMatch[1], 10), max: parseInt(hpMatch[2], 10) };
    }

    // Parse Stamina: e.g. - **Stamina**: 90/100 or **Выносливость**: 90/100
    const stamMatch = rawText.match(/(?:\*\*|\b)(?:Stamina|Выносливость|Энергия|Vigour)(?:\*\*|\b)[:\s]*(\d+)\/(\d+)/i) || rawText.match(/Stamina:\s*(\d+)\/(\d+)/i);
    if (stamMatch) {
      stamina = { current: parseInt(stamMatch[1], 10), max: parseInt(stamMatch[2], 10) };
    }

    // Parse Inventory: e.g. - **Inventory**: ... or **Инвентарь**: ...
    const invMatch = rawText.match(/(?:\*\*|\b)(?:Inventory|Инвентарь|Предметы)(?:\*\*|\b)[:\s]*([^\n\r]+)/i) || rawText.match(/Inventory:\s*([^\n\r]+)/i);
    if (invMatch && invMatch[1]) {
      const cleaned = invMatch[1].replace(/^\[|\]$/g, '').trim();
      if (cleaned.toLowerCase() === 'empty' || cleaned.toLowerCase() === 'none' || cleaned.toLowerCase() === 'пусто') {
        inventory = [];
      } else {
        inventory = cleaned
          .split(/,\s*/)
          .map((item) => item.replace(/^[•\-\*]\s*/, '').trim())
          .filter((item) => item.length > 0 && !item.toLowerCase().includes('status') && !item.toLowerCase().includes('статус'));
      }
    }

    // Parse Gold: e.g. - **Gold**: 15 or **Золото**: 15
    const goldMatch = rawText.match(/(?:\*\*|\b)(?:Gold(?:\/Coins)?|Золото|Монеты)(?:\*\*|\b)[:\s]*(\d+)/i) || rawText.match(/Gold:\s*(\d+)/i);
    if (goldMatch) {
      gold = parseInt(goldMatch[1], 10);
    }

    // Parse Choices: A), B), C), D) or Cyrillic А), Б), В), Г)
    const choiceRegex = /(?:^|\n)\s*([A-DА-Га-г])\)\s*([^\n\r]+)/gi;
    let match;
    const cyrillicMap: Record<string, string> = { 'А': 'A', 'Б': 'B', 'В': 'C', 'Г': 'D' };

    while ((match = choiceRegex.exec(rawText)) !== null) {
      let letter = match[1].toUpperCase();
      if (cyrillicMap[letter]) {
        letter = cyrillicMap[letter];
      }
      const text = match[2].trim();
      if (!choices.some((c) => c.id === letter)) {
        choices.push({ id: letter, text });
      }
    }

    // Parse Narrative: text before **CURRENT STATUS:** or **ТЕКУЩИЙ СТАТУС:**
    const statusIndex = Math.max(rawText.indexOf('**CURRENT STATUS:**'), rawText.indexOf('**ТЕКУЩИЙ СТАТУС:**'), rawText.indexOf('CURRENT STATUS:'));
    if (statusIndex !== -1) {
      narrative = rawText.substring(0, statusIndex).replace(/^-{3,}\s*/gm, '').trim();
    } else {
      narrative = rawText;
    }

    // Ensure Option D exists
    if (!choices.some((c) => c.id === 'D')) {
      choices.push({
        id: 'D',
        text: language === 'ru' ? 'Свое действие (напишите любой вариант)' : 'Custom action (type whatever you want)',
      });
    }
  } catch (err) {
    console.error('Error parsing GM response:', err);
    narrative = rawText;
  }

  return {
    rawText,
    narrative,
    hp,
    stamina,
    inventory,
    gold,
    choices: choices.length > 0 ? choices : [
      { id: 'A', text: language === 'ru' ? 'Осторожно продвигаться вперед во тьму' : 'Advance cautiously into the gloom' },
      { id: 'B', text: language === 'ru' ? 'Осмотреть окружение на предмет скрытых угроз' : 'Inspect surroundings for concealed threats' },
      { id: 'C', text: language === 'ru' ? 'Приготовить оружие и занять оборонительную стойку' : 'Prepare your weapons and take a defensive stance' },
      { id: 'D', text: language === 'ru' ? 'Свое действие (напишите любой вариант)' : 'Custom action (type whatever you want)' },
    ],
    isGameOver: hp.current <= 0,
  };
}

// API Routes
app.post('/api/game/turn', async (req, res) => {
  try {
    const { action, history = [], currentStats, characterOrigin, turnNumber = 1, language = 'en' } = req.body as TurnRequest & { turnNumber?: number };
    const userAction = action ? action.trim() : (language === 'ru' ? 'Начать приключение' : 'Start the adventure');

    // If Gemini client is available and key is configured
    if (ai) {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      const recentHistory = history.slice(-10);
      for (const h of recentHistory) {
        contents.push({
          role: h.role,
          parts: [{ text: h.text }],
        });
      }

      const promptInstruction = language === 'ru'
        ? `[ДЕЙСТВИЕ ИГРОКА]: "${userAction}"
${currentStats ? `[ТЕКУЩИЙ СТАТУС ИГРОКА]: HP: ${currentStats.hp}/${currentStats.maxHp}, Stamina: ${currentStats.stamina}/${currentStats.maxStamina}, Инвентарь: [${currentStats.inventory.join(', ')}], Золото: ${currentStats.gold}` : ''}
${characterOrigin ? `[ПРОИСХОЖДЕНИЕ]: ${characterOrigin}` : ''}

Ответьте как Мастер игры на русском языке в точном требуемом формате:
---
[2-3 атмосферных абзаца на русском языке]

---
**CURRENT STATUS:**
- **HP**: [Текущее/Макс]
- **Stamina**: [Текущее/Макс]
- **Inventory**: [Предмет 1, Предмет 2...]
- **Gold**: [Число]

---
**WHAT DO YOU DO?**
A) [Вариант 1]
B) [Вариант 2]
C) [Вариант 3]
D) Свое действие (напишите любой вариант)`
        : `[PLAYER ACTION / INPUT]: "${userAction}"
${currentStats ? `[CURRENT PLAYER STATUS]: HP: ${currentStats.hp}/${currentStats.maxHp}, Stamina: ${currentStats.stamina}/${currentStats.maxStamina}, Inventory: [${currentStats.inventory.join(', ')}], Gold: ${currentStats.gold}` : ''}
${characterOrigin ? `[PLAYER ORIGIN]: ${characterOrigin}` : ''}

Respond as the Game Master following all game rules and the EXACT required output format:
---
[2-3 vivid, visceral paragraphs]

---
**CURRENT STATUS:**
- **HP**: [Current/Max]
- **Stamina**: [Current/Max]
- **Inventory**: [Item 1, Item 2, ...]
- **Gold**: [Amount]

---
**WHAT DO YOU DO?**
A) [Choice 1]
B) [Choice 2]
C) [Choice 3]
D) Custom action (type whatever you want)`;

      contents.push({
        role: 'user',
        parts: [{ text: promptInstruction }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: language === 'ru' ? SYSTEM_INSTRUCTION_RU : SYSTEM_INSTRUCTION_EN,
          temperature: 0.9,
          topP: 0.95,
        },
      });

      const rawText = response.text || '';
      if (rawText.trim()) {
        const parsed = parseGameResponse(rawText, currentStats, language);
        return res.json(parsed);
      }
    }

    // Fallback if AI not configured or failed to produce output
    const fallback = generateFallbackTurn(userAction, turnNumber, currentStats, language);
    return res.json(fallback);
  } catch (err: any) {
    console.error('Turn generation error, falling back:', err?.message || err);
    const { action = 'Look around', currentStats, turnNumber = 1, language = 'en' } = req.body;
    const fallback = generateFallbackTurn(action, turnNumber, currentStats, language);
    return res.json(fallback);
  }
});

// Start new adventure route
app.post('/api/game/start', async (req, res) => {
  try {
    const { characterOrigin = 'Deserter Knight', language = 'en' } = req.body;

    if (ai) {
      const openingPrompt = language === 'ru'
        ? `Начните игру немедленно. Игрок выбрал происхождение: ${characterOrigin}.
Создайте захватывающую, мрачную открывающую сцену, где игрок пробуждается в затопленном, полном опасностей соборе Орос-Тхол в мире темного фэнтези.
Дайте ему стартовое снаряжение (Ржавый кинжал, Факел, Малое зелье исцеления) со статусом HP: 100/100, Stamina: 100/100, Золото: 10.
Предложите первые 4 варианта действий на русском языке. Строго соблюдайте формат разделителей '---'.`
        : `Start the game immediately. The player has chosen the origin: ${characterOrigin}.
Create a compelling, grim opening scene where the player wakes up or arrives in a ruined, dangerous location in this dark fantasy world.
Give them their starter gear (e.g. Rusty Dagger, Torch, Small Health Potion) with HP: 100/100, Stamina: 100/100, Gold: 10.
Present the first 4 choices to start the adventure. Follow the exact Markdown format required.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: openingPrompt,
        config: {
          systemInstruction: language === 'ru' ? SYSTEM_INSTRUCTION_RU : SYSTEM_INSTRUCTION_EN,
          temperature: 0.9,
        },
      });

      const rawText = response.text || '';
      if (rawText.trim()) {
        const parsed = parseGameResponse(rawText, undefined, language);
        return res.json(parsed);
      }
    }

    const fallback = generateFallbackTurn(language === 'ru' ? 'Старт' : 'Start', 1, undefined, language);
    return res.json(fallback);
  } catch (err: any) {
    console.error('Start generation error:', err);
    const { language = 'en' } = req.body;
    const fallback = generateFallbackTurn('Start', 1, undefined, language);
    return res.json(fallback);
  }
});

// Vite & Express mounting
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Grimmire Dark Fantasy RPG Server listening on port ${PORT}`);
  });
}

startServer();
