"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  dinosaurs,
  formatNumber,
  gameConfig,
  getDinosaurConfig,
  MAX_DINOSAUR_LEVEL,
  NEST_UPGRADE_TIERS,
} from "@/lib/game-config";

type Tab = "nest" | "game" | "shop" | "friends" | "menu";
type Slot = number | null;

type SaveState = {
  coins: number;
  dna: number;
  eggs: number;
  capacity: number;
  board: Slot[];
  lastTick: number;
};

type GameStateResponse = {
  user: {
    id: string;
    telegramId?: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  session?: {
    authenticated: boolean;
  };
  balance: {
    coins: number;
    dna: number;
  };
  nest: {
    currentEggs: number;
    capacity: number;
    lastProductionAt: string | null;
  };
  dinosaurs: Array<{
    id: string;
    level: number;
    boardSlot: number | null;
  }>;
  board: Slot[];
};

type ReferralResponse = {
  ok: boolean;
  enabled: boolean;
  reason?: string;
  invitedCount: number;
  totalBonusCoins: number;
  inviterRewardCoins: number;
  inviteeRewardCoins: number;
  inviteLink: string | null;
  recent: Array<{
    id: string;
    createdAt: string;
    rewardCoins: number;
    friend: {
      id: string;
      username: string | null;
      firstName: string | null;
    };
  }>;
};

type ShopItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  priceCoins: number;
  kind: string;
  amount: number;
};


type DinoCatalogItem = {
  level: number;
  title: string;
  priceCoins: number;
  dailyCoins: number;
  dailyDna: number;
  unlocked: boolean;
  unlockRequirement: string | null;
};

type DepositMethodItem = {
  code: string;
  coin: string;
  network: string;
  label: string;
  providerCurrency: string;
  available: boolean;
};

type DepositItem = {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  methodCode: string;
  payCurrency: string;
  network: string;
  usdAmount: number;
  baseCoins: number;
  bonusPercent: number;
  bonusCoins: number;
  creditedCoins: number;
  status: string;
  payAmount: number | null;
  actuallyPaid: number | null;
  payAddress: string | null;
  createdAt: string;
  updatedAt: string;
  creditedAt: string | null;
};

type DepositConfig = {
  minUsd: number;
  maxUsd: number;
  coinsPerUsd: number;
  firstDepositBonusPercent: number;
  userFeePercent?: number;
};

type DepositLoadResponse = {
  ok: boolean;
  telegramRequired?: boolean;
  providerConfigured?: boolean;
  config?: DepositConfig;
  firstDepositEligible?: boolean;
  methods?: DepositMethodItem[];
  deposits?: DepositItem[];
  error?: string;
  message?: string;
};

type NestUpgradeInfo = {
  currentCapacity: number;
  coins: number;
  maxCapacity: number;
  nextUpgrade: {
    capacity: number;
    priceCoins: number;
    addedCapacity: number;
  } | null;
  tiers: Array<{
    capacity: number;
    priceCoins: number;
    reached: boolean;
  }>;
};

type DailyRewardInfo = {
  canClaim: boolean;
  nextClaimAt: string | null;
  streak: number;
  nextDay: number;
  nextRewardCoins: number;
  rewards: number[];
  totalClaims: number;
  totalCoins: number;
  balance?: {
    coins: number;
  };
};

type TaskItem = {
  code: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  claimed: boolean;
  claimable: boolean;
};

type AchievementItem = {
  code: string;
  icon: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  claimed: boolean;
  claimable: boolean;
};

type PlayerProfile = {
  player: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  };
  balance: {
    coins: number;
    dna: number;
  };
  farm: {
    dinosaurCount: number;
    maxLevel: number;
    levelCounts: number[];
    eggsPerHour: number;
    dailyCoins: number;
    dailyDna: number;
    equivalentFarmCostCoins: number;
    nestCapacity: number;
    currentEggs: number;
    totalEggsCollected: number;
  };
  progress: {
    tasksCompleted: number;
    dailyStreak: number;
    dailyClaims: number;
    dailyCoinsEarned: number;
  };
  referrals: {
    invited: number;
    coinsEarned: number;
  };
  withdrawals: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
    paidUsdt: number;
    totalDnaRequested: number;
  };
};

type WithdrawalConfigResponse = {
  currency: string;
  usdtPerDna: number;
  minDna: number;
  minUsdt: number;
  networkFeePaidBy: "PROJECT";
};

type WithdrawalItem = {
  id: string;
  currency: string;
  network: string;
  walletAddress: string;
  dnaAmount: number;
  rateUsdtPerDna: number;
  usdtAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  note: string | null;
};

type WalletHistoryItem = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  createdAt: string;
  status: string;
  deposit: {
    usdAmount: number;
    baseCoins: number;
    bonusCoins: number;
    creditedCoins: number;
    bonusPercent: number;
    network: string;
    methodCode: string;
    creditedAt: string | null;
  } | null;
  withdrawal: {
    currency: string;
    network: string;
    dnaAmount: number;
    usdtAmount: number;
    processedAt: string | null;
  } | null;
};

type WalletHistorySummary = {
  successfulDeposits: number;
  depositedUsd: number;
  creditedCoins: number;
  bonusCoins: number;
  paidWithdrawals: number;
  paidUsdt: number;
  paidDna: number;
};

function withdrawalStatusMeta(
  status: string,
  note?: string | null,
) {
  if (status === "PENDING") {
    return {
      label: "Ожидает проверки",
      icon: "⏳",
      background: "rgba(255, 193, 7, .14)",
      border: "rgba(255, 193, 7, .30)",
      color: "#ffd76a",
    };
  }

  if (status === "APPROVED") {
    return {
      label: "Одобрено",
      icon: "✅",
      background: "rgba(84, 180, 255, .14)",
      border: "rgba(84, 180, 255, .30)",
      color: "#9bd8ff",
    };
  }

  if (status === "PAID") {
    return {
      label: "Оплачено",
      icon: "💸",
      background: "rgba(129, 230, 96, .14)",
      border: "rgba(129, 230, 96, .30)",
      color: "#a8f58e",
    };
  }

  if (status === "REJECTED") {
    const canceledByPlayer =
      note ===
      "CANCELED_BY_PLAYER";

    return {
      label: canceledByPlayer
        ? "Отменено · DNA возвращена"
        : "Отклонено · DNA возвращена",
      icon: "↩️",
      background:
        "rgba(255, 92, 108, .14)",
      border:
        "rgba(255, 92, 108, .30)",
      color: "#ffabb4",
    };
  }

  return {
    label: status,
    icon: "•",
    background: "rgba(255,255,255,.08)",
    border: "rgba(255,255,255,.14)",
    color: "#dce7df",
  };
}

function formatWithdrawalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата неизвестна";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortWallet(value: string) {
  if (!value) return "—";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function walletOperationStatus(
  type: "DEPOSIT" | "WITHDRAWAL",
  status: string,
) {
  const normalized =
    status.toUpperCase();

  if (type === "DEPOSIT") {
    if (normalized === "FINISHED") {
      return {
        icon: "✅",
        label: "Зачислено",
        color: "#a8f58e",
      };
    }

    if (
      normalized === "FAILED" ||
      normalized === "CREATE_FAILED"
    ) {
      return {
        icon: "❌",
        label: "Ошибка",
        color: "#ffabb4",
      };
    }

    if (normalized === "EXPIRED") {
      return {
        icon: "⌛",
        label: "Истёк",
        color: "#ffcf8e",
      };
    }

    if (normalized === "REFUNDED") {
      return {
        icon: "↩️",
        label: "Возвращено",
        color: "#ffcf8e",
      };
    }

    return {
      icon: "⏳",
      label:
        normalized ===
        "PARTIALLY_PAID"
          ? "Частично оплачено"
          : normalized ===
              "CONFIRMING" ||
            normalized ===
              "CONFIRMED"
            ? "Подтверждается"
            : "Ожидает оплату",
      color: "#ffd76a",
    };
  }

  if (normalized === "PAID") {
    return {
      icon: "✅",
      label: "Выплачено",
      color: "#a8f58e",
    };
  }

  if (normalized === "APPROVED") {
    return {
      icon: "🔄",
      label: "Одобрено",
      color: "#9bd8ff",
    };
  }

  if (normalized === "REJECTED") {
    return {
      icon: "❌",
      label: "Отклонено",
      color: "#ffabb4",
    };
  }

  return {
    icon: "⏳",
    label: "На проверке",
    color: "#ffd76a",
  };
}

function depositStatusMeta(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "FINISHED") {
    return {
      label: "Зачислено",
      icon: "✅",
      color: "#a8f58e",
    };
  }

  if (
    normalized === "CONFIRMING" ||
    normalized === "CONFIRMED" ||
    normalized === "SENDING"
  ) {
    return {
      label: "Подтверждается",
      icon: "🔄",
      color: "#9bd8ff",
    };
  }

  if (
    normalized === "WAITING" ||
    normalized === "PARTIALLY_PAID" ||
    normalized === "CREATING"
  ) {
    return {
      label:
        normalized === "PARTIALLY_PAID"
          ? "Оплачено частично"
          : "Ожидает оплату",
      icon: "⏳",
      color: "#ffd76a",
    };
  }

  if (
    normalized === "FAILED" ||
    normalized === "CREATE_FAILED" ||
    normalized === "EXPIRED"
  ) {
    return {
      label:
        normalized === "EXPIRED"
          ? "Истёк"
          : "Ошибка",
      icon: "❌",
      color: "#ffabb4",
    };
  }

  if (normalized === "REFUNDED") {
    return {
      label: "Возвращено",
      icon: "↩️",
      color: "#ffcf8e",
    };
  }

  return {
    label: status,
    icon: "•",
    color: "#dce7df",
  };
}

function formatDepositDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата неизвестна";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDailyRemaining(nextClaimAt: string | null) {
  if (!nextClaimAt) return "Доступен сейчас";

  const remaining = new Date(nextClaimAt).getTime() - Date.now();

  if (!Number.isFinite(remaining) || remaining <= 0) {
    return "Доступен сейчас";
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.ceil(
    (remaining % (60 * 60 * 1000)) / (60 * 1000),
  );

  if (hours <= 0) {
    return `Через ${minutes} мин`;
  }

  return `Через ${hours} ч ${minutes} мин`;
}

const EMPTY_BOARD: Slot[] = Array(16).fill(null);

const INITIAL_STATE: SaveState = {
  coins: 0,
  dna: 0,
  eggs: 0,
  capacity: gameConfig.initialNestCapacity,
  board: EMPTY_BOARD,
  lastTick: Date.now(),
};

function getDinoAsset(level: number) {
  return level % 3 === 1
    ? "/assets/game/dinosaurs/trex.webp"
    : level % 3 === 2
      ? "/assets/game/dinosaurs/triceratops.webp"
      : "/assets/game/dinosaurs/stegosaurus.webp";
}

function getDinoEvolutionTier(level: number) {
  if (level >= MAX_DINOSAUR_LEVEL) return 5;
  if (level >= 13) return 4;
  if (level >= 9) return 3;
  if (level >= 5) return 2;
  return 1;
}

function getDinoEvolutionMark(level: number) {
  const tier = getDinoEvolutionTier(level);
  return tier === 5 ? "★" : "◆".repeat(tier);
}

function getDinoEvolutionClass(level: number) {
  const tier = getDinoEvolutionTier(level);
  return `dino-evolution-tier-${tier}${
    level >= MAX_DINOSAUR_LEVEL ? " dino-evolution-max" : ""
  }`;
}

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  openTelegramLink?: (url: string) => void;
  BackButton?: {
    show?: () => void;
    hide?: () => void;
    onClick?: (callback: () => void) => void;
    offClick?: (callback: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred?: (type: "error" | "success" | "warning") => void;
    selectionChanged?: () => void;
  };
};



type LanguageCode = "ru" | "en" | "uk" | "it" | "fr" | "es" | "hi" | "pl" | "de" | "tr";

const LANGUAGE_STORAGE_KEY = "dino-farm-language";

const LANGUAGE_OPTIONS: ReadonlyArray<{ code: LanguageCode; short: string; label: string }> = [
  { code: "ru", short: "RU", label: "Русский" },
  { code: "en", short: "EN", label: "English" },
  { code: "uk", short: "UA", label: "Українська" },
  { code: "it", short: "IT", label: "Italiano" },
  { code: "fr", short: "FR", label: "Français" },
  { code: "es", short: "ES", label: "Español" },
  { code: "hi", short: "HI", label: "हिन्दी" },
  { code: "pl", short: "PL", label: "Polski" },
  { code: "de", short: "DE", label: "Deutsch" },
  { code: "tr", short: "TR", label: "Türkçe" },
];

const TUTORIAL_STORAGE_KEY = "dino-farm-tutorial-v1-complete";

type TutorialStep = 0 | 1 | 2 | 3;

type TutorialCopy = {
  menuLabel: string;
  replay: string;
  skip: string;
  next: string;
  start: string;
  openRewards: string;
  stepLabel: string;
  steps: readonly [
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
  ];
};

const TUTORIAL_COPY: Record<LanguageCode, TutorialCopy> = {
  ru: {
    menuLabel: "Обучение", replay: "ПОВТОРИТЬ", skip: "Пропустить", next: "ДАЛЬШЕ", start: "В ИГРУ", openRewards: "ОТКРЫТЬ НАГРАДЫ", stepLabel: "Шаг",
    steps: [
      { title: "Добро пожаловать в DINO EGG FARM!", body: "Начнём с главной механики. Открой раздел «Игра»." },
      { title: "Сделай первый merge", body: "Нажми на двух одинаковых динозавров и подтверди объединение. Так открываются новые уровни." },
      { title: "Собери яйца", body: "Вернись в Гнездо и нажми «Собрать яйца». Ты получишь Coins и DNA." },
      { title: "Открой награды", body: "Нажми «Награды». Там находятся ежедневный бонус, задания и достижения." },
    ],
  },
  en: {
    menuLabel: "Tutorial", replay: "REPLAY", skip: "Skip", next: "NEXT", start: "PLAY", openRewards: "OPEN REWARDS", stepLabel: "Step",
    steps: [
      { title: "Welcome to DINO EGG FARM!", body: "Start with the core mechanic. Open the Game tab." },
      { title: "Make your first merge", body: "Tap two identical dinosaurs and confirm the merge. This unlocks new levels." },
      { title: "Collect eggs", body: "Return to the Nest and tap Collect Eggs. You will receive Coins and DNA." },
      { title: "Open rewards", body: "Tap Rewards to find the daily reward, tasks and achievements." },
    ],
  },
  uk: {
    menuLabel: "Навчання", replay: "ПОВТОРИТИ", skip: "Пропустити", next: "ДАЛІ", start: "ДО ГРИ", openRewards: "ВІДКРИТИ НАГОРОДИ", stepLabel: "Крок",
    steps: [
      { title: "Ласкаво просимо до DINO EGG FARM!", body: "Почнемо з головної механіки. Відкрий розділ «Гра»." },
      { title: "Зроби перший merge", body: "Натисни на двох однакових динозаврів і підтвердь об’єднання. Так відкриваються нові рівні." },
      { title: "Збери яйця", body: "Повернися до Гнізда та натисни «Зібрати яйця». Ти отримаєш Coins і DNA." },
      { title: "Відкрий нагороди", body: "Натисни «Нагороди». Там є щоденний бонус, завдання та досягнення." },
    ],
  },
  it: {
    menuLabel: "Tutorial", replay: "RIPETI", skip: "Salta", next: "AVANTI", start: "GIOCA", openRewards: "APRI RICOMPENSE", stepLabel: "Passo",
    steps: [
      { title: "Benvenuto in DINO EGG FARM!", body: "Inizia dalla meccanica principale. Apri la sezione Gioco." },
      { title: "Fai il primo merge", body: "Tocca due dinosauri identici e conferma la fusione. Così sblocchi nuovi livelli." },
      { title: "Raccogli le uova", body: "Torna al Nido e premi Raccogli uova. Riceverai Coins e DNA." },
      { title: "Apri le ricompense", body: "Premi Ricompense per trovare bonus giornaliero, missioni e obiettivi." },
    ],
  },
  fr: {
    menuLabel: "Tutoriel", replay: "REJOUER", skip: "Passer", next: "SUIVANT", start: "JOUER", openRewards: "OUVRIR RÉCOMPENSES", stepLabel: "Étape",
    steps: [
      { title: "Bienvenue dans DINO EGG FARM !", body: "Commence par la mécanique principale. Ouvre l’onglet Jeu." },
      { title: "Fais ton premier merge", body: "Touche deux dinosaures identiques et confirme la fusion pour débloquer de nouveaux niveaux." },
      { title: "Ramasse les œufs", body: "Retourne au Nid et appuie sur Ramasser les œufs. Tu recevras des Coins et de l’ADN." },
      { title: "Ouvre les récompenses", body: "Appuie sur Récompenses pour voir le bonus quotidien, les tâches et les succès." },
    ],
  },
  es: {
    menuLabel: "Tutorial", replay: "REPETIR", skip: "Omitir", next: "SIGUIENTE", start: "JUGAR", openRewards: "ABRIR RECOMPENSAS", stepLabel: "Paso",
    steps: [
      { title: "¡Bienvenido a DINO EGG FARM!", body: "Empieza con la mecánica principal. Abre la pestaña Juego." },
      { title: "Haz tu primer merge", body: "Toca dos dinosaurios iguales y confirma la fusión. Así desbloqueas nuevos niveles." },
      { title: "Recoge huevos", body: "Vuelve al Nido y pulsa Recoger huevos. Recibirás Coins y DNA." },
      { title: "Abre recompensas", body: "Pulsa Recompensas para ver el bono diario, tareas y logros." },
    ],
  },
  hi: {
    menuLabel: "ट्यूटोरियल", replay: "फिर चलाएँ", skip: "छोड़ें", next: "आगे", start: "खेलें", openRewards: "पुरस्कार खोलें", stepLabel: "चरण",
    steps: [
      { title: "DINO EGG FARM में स्वागत है!", body: "मुख्य मैकेनिक से शुरू करें। गेम टैब खोलें।" },
      { title: "पहला merge करें", body: "दो समान डायनासोर पर टैप करें और merge की पुष्टि करें। इससे नए स्तर खुलते हैं।" },
      { title: "अंडे इकट्ठा करें", body: "घोंसले पर लौटें और अंडे इकट्ठा करें दबाएँ। आपको Coins और DNA मिलेंगे।" },
      { title: "पुरस्कार खोलें", body: "दैनिक पुरस्कार, टास्क और उपलब्धियाँ देखने के लिए पुरस्कार दबाएँ।" },
    ],
  },
  pl: {
    menuLabel: "Samouczek", replay: "POWTÓRZ", skip: "Pomiń", next: "DALEJ", start: "GRAJ", openRewards: "OTWÓRZ NAGRODY", stepLabel: "Krok",
    steps: [
      { title: "Witaj w DINO EGG FARM!", body: "Zacznij od głównej mechaniki. Otwórz zakładkę Gra." },
      { title: "Zrób pierwszy merge", body: "Dotknij dwóch identycznych dinozaurów i potwierdź połączenie. Tak odblokujesz nowe poziomy." },
      { title: "Zbierz jajka", body: "Wróć do Gniazda i naciśnij Zbierz jajka. Otrzymasz Coins i DNA." },
      { title: "Otwórz nagrody", body: "Naciśnij Nagrody, aby zobaczyć bonus dzienny, zadania i osiągnięcia." },
    ],
  },
  de: {
    menuLabel: "Tutorial", replay: "WIEDERHOLEN", skip: "Überspringen", next: "WEITER", start: "SPIELEN", openRewards: "BELOHNUNGEN ÖFFNEN", stepLabel: "Schritt",
    steps: [
      { title: "Willkommen bei DINO EGG FARM!", body: "Starte mit der Kernmechanik. Öffne den Tab Spiel." },
      { title: "Mache deinen ersten Merge", body: "Tippe zwei gleiche Dinosaurier an und bestätige den Merge. So schaltest du neue Level frei." },
      { title: "Sammle Eier", body: "Kehre zum Nest zurück und tippe Eier sammeln. Du erhältst Coins und DNA." },
      { title: "Öffne Belohnungen", body: "Tippe Belohnungen für Tagesbonus, Aufgaben und Erfolge." },
    ],
  },
  tr: {
    menuLabel: "Eğitim", replay: "TEKRARLA", skip: "Atla", next: "İLERİ", start: "OYNA", openRewards: "ÖDÜLLERİ AÇ", stepLabel: "Adım",
    steps: [
      { title: "DINO EGG FARM’a hoş geldin!", body: "Ana mekanikle başla. Oyun sekmesini aç." },
      { title: "İlk merge işlemini yap", body: "İki aynı dinozora dokun ve birleştirmeyi onayla. Böylece yeni seviyeler açılır." },
      { title: "Yumurtaları topla", body: "Yuvaya dön ve Yumurtaları topla düğmesine bas. Coins ve DNA kazanırsın." },
      { title: "Ödülleri aç", body: "Günlük bonus, görevler ve başarılar için Ödüller düğmesine bas." },
    ],
  },
};

const LANGUAGE_COLUMN: Record<LanguageCode, number> = {
  ru: 0,
  en: 1,
  uk: 2,
  it: 3,
  fr: 4,
  es: 5,
  hi: 6,
  pl: 7,
  de: 8,
  tr: 9,
};

const UI_TRANSLATION_ROWS = [
  ["Загрузка данных фермы...", "Loading farm data...", "Завантаження даних ферми...", "Caricamento dati della fattoria...", "Chargement des données de la ferme...", "Cargando datos de la granja...", "फार्म डेटा लोड हो रहा है...", "Ładowanie danych farmy...", "Farmdaten werden geladen...", "Çiftlik verileri yükleniyor..."],
  ["Загрузка...", "Loading...", "Завантаження...", "Caricamento...", "Chargement...", "Cargando...", "लोड हो रहा है...", "Ładowanie...", "Laden...", "Yükleniyor..."],
  ["Гнездо улучшено до максимума", "Nest upgraded to maximum", "Гніздо покращено до максимуму", "Nido potenziato al massimo", "Nid amélioré au maximum", "Nido mejorado al máximo", "घोंसला अधिकतम स्तर पर है", "Gniazdo ulepszone do maksimum", "Nest maximal verbessert", "Yuva maksimuma yükseltildi"],
  ["Можно купить только следующую ступень.", "Only the next tier can be purchased.", "Можна придбати лише наступний рівень.", "Puoi acquistare solo il livello successivo.", "Seul le niveau suivant peut être acheté.", "Solo se puede comprar el siguiente nivel.", "केवल अगला स्तर खरीदा जा सकता है।", "Można kupić tylko następny poziom.", "Nur die nächste Stufe kann gekauft werden.", "Yalnızca sonraki seviye satın alınabilir."],
  ["Цена и текущая вместимость проверяются на сервере перед списанием Coins.", "Price and current capacity are checked by the server before Coins are deducted.", "Ціна й поточна місткість перевіряються сервером перед списанням Coins.", "Prezzo e capacità attuale vengono verificati dal server prima dell'addebito dei Coins.", "Le prix et la capacité actuelle sont vérifiés par le serveur avant le débit des Coins.", "El precio y la capacidad actual se verifican en el servidor antes de descontar Coins.", "Coins काटने से पहले कीमत और वर्तमान क्षमता सर्वर पर जाँची जाती है।", "Cena i aktualna pojemność są sprawdzane na serwerze przed pobraniem Coins.", "Preis und aktuelle Kapazität werden vor dem Abzug der Coins auf dem Server geprüft.", "Coins düşülmeden önce fiyat ve mevcut kapasite sunucuda kontrol edilir."],
  ["Соединяй одинаковых динозавров и открывай новые уровни", "Merge identical dinosaurs to unlock new levels", "Об'єднуй однакових динозаврів і відкривай нові рівні", "Unisci dinosauri uguali e sblocca nuovi livelli", "Fusionne des dinosaures identiques pour débloquer de nouveaux niveaux", "Combina dinosaurios iguales y desbloquea nuevos niveles", "एक जैसे डायनासोर मिलाकर नए स्तर खोलें", "Łącz identyczne dinozaury i odblokowuj nowe poziomy", "Verbinde gleiche Dinosaurier und schalte neue Level frei", "Aynı dinozorları birleştir ve yeni seviyeler aç"],
  ["Lv.2–Lv.16 открываются для прямой покупки только после того, как вы сами получили этот уровень через merge.", "Lv.2–Lv.16 become available for direct purchase only after you obtain that level through merge.", "Lv.2–Lv.16 відкриваються для прямої покупки лише після того, як ви самі отримали цей рівень через merge.", "I livelli 2–16 si sbloccano per l'acquisto diretto solo dopo aver ottenuto quel livello tramite merge.", "Les niveaux 2–16 sont disponibles à l'achat direct seulement après avoir obtenu ce niveau par fusion.", "Los niveles 2–16 se desbloquean para compra directa solo después de obtener ese nivel mediante merge.", "Lv.2–Lv.16 की सीधी खरीद तभी खुलती है जब आप merge से वह स्तर प्राप्त कर लें।", "Poziomy 2–16 można kupić bezpośrednio dopiero po zdobyciu danego poziomu przez merge.", "Lv.2–Lv.16 können erst direkt gekauft werden, nachdem du das Level durch Merge erreicht hast.", "Lv.2–Lv.16 doğrudan satın alma için ancak o seviyeyi merge ile elde ettikten sonra açılır."],
  ["Прямая покупка не открывает следующий уровень. Чтобы разблокировать новый уровень магазина, нужно сделать merge.", "Direct purchase does not unlock the next level. To unlock a new shop level, you must merge.", "Пряма покупка не відкриває наступний рівень. Щоб розблокувати новий рівень магазину, потрібно зробити merge.", "L'acquisto diretto non sblocca il livello successivo. Per sbloccare un nuovo livello del negozio devi fare un merge.", "L'achat direct ne débloque pas le niveau suivant. Pour débloquer un nouveau niveau de boutique, vous devez faire une fusion.", "La compra directa no desbloquea el siguiente nivel. Para desbloquear un nuevo nivel de tienda debes hacer un merge.", "सीधी खरीद अगला स्तर नहीं खोलती। नया दुकान स्तर खोलने के लिए merge करना होगा।", "Bezpośredni zakup nie odblokowuje następnego poziomu. Aby odblokować nowy poziom sklepu, wykonaj merge.", "Direkter Kauf schaltet das nächste Level nicht frei. Für ein neues Shop-Level musst du mergen.", "Doğrudan satın alma sonraki seviyeyi açmaz. Yeni mağaza seviyesi için merge yapmalısın."],
  ["Coins начисляются только после подтверждения криптоплатежа.", "Coins are credited only after the crypto payment is confirmed.", "Coins нараховуються лише після підтвердження криптоплатежу.", "I Coins vengono accreditati solo dopo la conferma del pagamento crypto.", "Les Coins sont crédités uniquement après confirmation du paiement crypto.", "Los Coins se acreditan solo después de confirmar el pago cripto.", "क्रिप्टो भुगतान की पुष्टि के बाद ही Coins जमा होते हैं।", "Coins są naliczane dopiero po potwierdzeniu płatności krypto.", "Coins werden erst nach Bestätigung der Krypto-Zahlung gutgeschrieben.", "Coins yalnızca kripto ödeme onaylandıktan sonra eklenir."],
  ["Минимум рассчитывается отдельно для выбранной монеты и сети и может меняться из-за комиссий и курса.", "The minimum is calculated separately for the selected coin and network and may change due to fees and exchange rates.", "Мінімум розраховується окремо для вибраної монети й мережі та може змінюватися через комісії й курс.", "Il minimo viene calcolato separatamente per moneta e rete selezionate e può variare per commissioni e cambio.", "Le minimum est calculé séparément pour la monnaie et le réseau choisis et peut varier selon les frais et le taux.", "El mínimo se calcula por separado para la moneda y red elegidas y puede cambiar por comisiones y tipo de cambio.", "न्यूनतम राशि चुनी गई कॉइन और नेटवर्क के लिए अलग से गणना होती है और फीस/रेट के कारण बदल सकती है।", "Minimum jest obliczane osobno dla wybranej monety i sieci i może się zmieniać przez opłaty i kurs.", "Das Minimum wird für Coin und Netzwerk separat berechnet und kann sich durch Gebühren und Kurs ändern.", "Minimum tutar seçilen coin ve ağ için ayrı hesaplanır; ücretler ve kur nedeniyle değişebilir."],
  ["Пополнение реального баланса недоступно в демо-режиме браузера.", "Real balance top-up is unavailable in browser demo mode.", "Поповнення реального балансу недоступне в демо-режимі браузера.", "La ricarica del saldo reale non è disponibile nella modalità demo del browser.", "Le rechargement du solde réel n'est pas disponible en mode démo du navigateur.", "La recarga del saldo real no está disponible en el modo demo del navegador.", "ब्राउज़र डेमो मोड में वास्तविक बैलेंस टॉप-अप उपलब्ध नहीं है।", "Doładowanie prawdziwego salda jest niedostępne w trybie demo przeglądarki.", "Das Aufladen des echten Guthabens ist im Browser-Demo-Modus nicht verfügbar.", "Gerçek bakiye yükleme tarayıcı demo modunda kullanılamaz."],
  ["Нажатие «Оплатить» Coins не начисляет. Баланс меняется только после подтверждения платежа сервером.", "Pressing “Pay” does not credit Coins. The balance changes only after the server confirms the payment.", "Натискання «Оплатити» не нараховує Coins. Баланс змінюється лише після підтвердження платежу сервером.", "Premere “Paga” non accredita Coins. Il saldo cambia solo dopo la conferma del pagamento da parte del server.", "Appuyer sur « Payer » ne crédite pas de Coins. Le solde change seulement après confirmation du paiement par le serveur.", "Pulsar “Pagar” no acredita Coins. El saldo cambia solo tras la confirmación del pago por el servidor.", "“भुगतान करें” दबाने से Coins जमा नहीं होते। बैलेंस केवल सर्वर द्वारा भुगतान की पुष्टि के बाद बदलता है।", "Kliknięcie „Zapłać” nie nalicza Coins. Saldo zmienia się dopiero po potwierdzeniu płatności przez serwer.", "Das Drücken von „Bezahlen“ schreibt keine Coins gut. Das Guthaben ändert sich erst nach Serverbestätigung.", "“Öde” düğmesine basmak Coins eklemez. Bakiye yalnızca sunucu ödemeyi onayladıktan sonra değişir."],
  ["Один и тот же платёж не может быть зачислен дважды.", "The same payment cannot be credited twice.", "Один і той самий платіж не може бути зарахований двічі.", "Lo stesso pagamento non può essere accreditato due volte.", "Le même transaction ne peut pas être créditée deux fois.", "El mismo pago no puede acreditarse dos veces.", "एक ही भुगतान दो बार जमा नहीं किया जा सकता।", "Ta sama płatność nie może zostać zaksięgowana dwa razy.", "Dieselbe Zahlung kann nicht zweimal gutgeschrieben werden.", "Aynı ödeme iki kez hesaba geçirilemez."],
  ["Откройте игру через Telegram, чтобы получить личную ссылку приглашения.", "Open the game through Telegram to get your personal invite link.", "Відкрийте гру через Telegram, щоб отримати особисте посилання-запрошення.", "Apri il gioco tramite Telegram per ottenere il tuo link di invito personale.", "Ouvrez le jeu via Telegram pour obtenir votre lien d'invitation personnel.", "Abre el juego desde Telegram para obtener tu enlace personal de invitación.", "अपना व्यक्तिगत आमंत्रण लिंक पाने के लिए गेम Telegram में खोलें।", "Otwórz grę przez Telegram, aby otrzymać osobisty link zaproszenia.", "Öffne das Spiel über Telegram, um deinen persönlichen Einladungslink zu erhalten.", "Kişisel davet bağlantınızı almak için oyunu Telegram üzerinden açın."],
  ["Реферальная ссылка пока недоступна. Попробуйте открыть игру через Telegram ещё раз.", "The referral link is not available yet. Try opening the game through Telegram again.", "Реферальне посилання поки недоступне. Спробуйте ще раз відкрити гру через Telegram.", "Il link referral non è ancora disponibile. Prova a riaprire il gioco tramite Telegram.", "Le lien de parrainage n'est pas encore disponible. Essayez de rouvrir le jeu via Telegram.", "El enlace de referido aún no está disponible. Intenta abrir el juego desde Telegram de nuevo.", "रेफरल लिंक अभी उपलब्ध नहीं है। गेम को Telegram में फिर से खोलें।", "Link polecający nie jest jeszcze dostępny. Spróbuj ponownie otworzyć grę przez Telegram.", "Der Referral-Link ist noch nicht verfügbar. Öffne das Spiel erneut über Telegram.", "Referans bağlantısı henüz kullanılamıyor. Oyunu Telegram üzerinden yeniden açmayı deneyin."],
  ["Здесь появятся пополнения Coins и заявки на вывод DNA.", "Coin deposits and DNA withdrawal requests will appear here.", "Тут з'являться поповнення Coins і заявки на виведення DNA.", "Qui appariranno le ricariche Coins e le richieste di prelievo DNA.", "Les dépôts de Coins et les demandes de retrait DNA apparaîtront ici.", "Aquí aparecerán los depósitos de Coins y las solicitudes de retiro de DNA.", "यहाँ Coins जमा और DNA निकासी अनुरोध दिखाई देंगे।", "Tutaj pojawią się wpłaty Coins i wnioski o wypłatę DNA.", "Hier erscheinen Coin-Einzahlungen und DNA-Auszahlungsanträge.", "Coins yüklemeleri ve DNA çekim talepleri burada görünecek."],
  ["Добавьте динозавров на ферму, и здесь появится персональный расчёт доходности.", "Add dinosaurs to the farm and your personal profitability calculation will appear here.", "Додайте динозаврів на ферму, і тут з'явиться персональний розрахунок прибутковості.", "Aggiungi dinosauri alla fattoria e qui apparirà il tuo calcolo personale della redditività.", "Ajoutez des dinosaures à la ferme et votre calcul personnel de rentabilité apparaîtra ici.", "Añade dinosaurios a la granja y aquí aparecerá tu cálculo personal de rentabilidad.", "फार्म में डायनासोर जोड़ें और यहाँ आपकी व्यक्तिगत लाभ गणना दिखाई देगी।", "Dodaj dinozaury do farmy, a pojawi się tu Twój indywidualny kalkulator opłacalności.", "Füge Dinosaurier zur Farm hinzu; hier erscheint dann deine persönliche Rentabilitätsberechnung.", "Çiftliğe dinozor ekleyin; kişisel kazanç hesabınız burada görünecek."],
  ["Это расчёт по текущему составу вашей фермы и установленной игровой экономике.", "This calculation uses your current farm composition and the configured game economy.", "Цей розрахунок базується на поточному складі вашої ферми та встановленій ігровій економіці.", "Questo calcolo usa la composizione attuale della fattoria e l'economia di gioco impostata.", "Ce calcul utilise la composition actuelle de votre ferme et l'économie du jeu configurée.", "Este cálculo usa la composición actual de tu granja y la economía configurada del juego.", "यह गणना आपके वर्तमान फार्म और सेट की गई गेम अर्थव्यवस्था पर आधारित है।", "To wyliczenie bazuje na aktualnym składzie farmy i ustawionej ekonomii gry.", "Diese Berechnung basiert auf deiner aktuellen Farm und der eingestellten Spielökonomie.", "Bu hesap mevcut çiftlik yapınız ve ayarlı oyun ekonomisine dayanır."],
  ["Два одинаковых динозавра объединяются в один следующего уровня.", "Two identical dinosaurs merge into one dinosaur of the next level.", "Два однакові динозаври об'єднуються в одного динозавра наступного рівня.", "Due dinosauri uguali si uniscono in un dinosauro del livello successivo.", "Deux dinosaures identiques fusionnent en un dinosaure du niveau suivant.", "Dos dinosaurios iguales se combinan en uno del siguiente nivel.", "दो एक जैसे डायनासोर मिलकर अगले स्तर का एक डायनासोर बनाते हैं।", "Dwa identyczne dinozaury łączą się w jednego dinozaura następnego poziomu.", "Zwei gleiche Dinosaurier verschmelzen zu einem Dinosaurier des nächsten Levels.", "İki aynı dinozor birleşerek bir sonraki seviyeden tek dinozor olur."],
  ["Merge оплачивается Coins.", "Merge is paid with Coins.", "Merge оплачується Coins.", "Il merge si paga in Coins.", "La fusion est payée en Coins.", "El merge se paga con Coins.", "Merge का भुगतान Coins से होता है।", "Merge jest opłacany w Coins.", "Merge wird mit Coins bezahlt.", "Merge ücreti Coins ile ödenir."],
  ["Награды за задания выдаются только в Coins. DNA за задания не начисляется.", "Task rewards are paid only in Coins. Tasks do not award DNA.", "Нагороди за завдання видаються лише в Coins. DNA за завдання не нараховується.", "Le ricompense delle missioni sono solo in Coins. Le missioni non danno DNA.", "Les récompenses des tâches sont uniquement en Coins. Les tâches ne donnent pas de DNA.", "Las recompensas de tareas se pagan solo en Coins. Las tareas no otorgan DNA.", "टास्क के पुरस्कार केवल Coins में मिलते हैं। टास्क से DNA नहीं मिलता।", "Nagrody za zadania są wypłacane tylko w Coins. Zadania nie dają DNA.", "Aufgabenbelohnungen werden nur in Coins ausgezahlt. Aufgaben geben keine DNA.", "Görev ödülleri yalnızca Coins olarak verilir. Görevlerden DNA kazanılmaz."],
  ["Каждая награда выдаётся только один раз.", "Each reward can be claimed only once.", "Кожна нагорода видається лише один раз.", "Ogni ricompensa può essere riscattata una sola volta.", "Chaque récompense ne peut être récupérée qu'une seule fois.", "Cada recompensa solo puede reclamarse una vez.", "हर पुरस्कार केवल एक बार लिया जा सकता है।", "Każdą nagrodę można odebrać tylko raz.", "Jede Belohnung kann nur einmal abgeholt werden.", "Her ödül yalnızca bir kez alınabilir."],
  ["Условия проверяются на сервере.", "Conditions are checked on the server.", "Умови перевіряються на сервері.", "Le condizioni vengono verificate sul server.", "Les conditions sont vérifiées sur le serveur.", "Las condiciones se verifican en el servidor.", "शर्तें सर्वर पर जाँची जाती हैं।", "Warunki są sprawdzane na serwerze.", "Bedingungen werden auf dem Server geprüft.", "Koşullar sunucuda kontrol edilir."],
  ["Достижения начисляют только Coins — DNA здесь не выдаётся.", "Achievements award only Coins — no DNA is granted here.", "Досягнення дають лише Coins — DNA тут не нараховується.", "Gli obiettivi danno solo Coins — qui non viene assegnato DNA.", "Les succès donnent uniquement des Coins — aucun DNA n'est attribué ici.", "Los logros otorgan solo Coins; aquí no se entrega DNA.", "Achievements से केवल Coins मिलते हैं — यहाँ DNA नहीं दिया जाता।", "Osiągnięcia dają tylko Coins — DNA nie jest tu przyznawane.", "Erfolge geben nur Coins — hier wird keine DNA vergeben.", "Başarımlar yalnızca Coins verir — burada DNA verilmez."],
  ["Награда выдаётся только в Coins.", "The reward is paid only in Coins.", "Нагорода видається лише в Coins.", "La ricompensa viene pagata solo in Coins.", "La récompense est versée uniquement en Coins.", "La recompensa se paga solo en Coins.", "पुरस्कार केवल Coins में मिलता है।", "Nagroda jest wypłacana tylko w Coins.", "Die Belohnung wird nur in Coins ausgezahlt.", "Ödül yalnızca Coins olarak verilir."],
  ["Новый бонус доступен через 24 часа.", "A new reward is available after 24 hours.", "Новий бонус доступний через 24 години.", "Un nuovo bonus è disponibile dopo 24 ore.", "Un nouveau bonus est disponible après 24 heures.", "Un nuevo bono está disponible después de 24 horas.", "नया बोनस 24 घंटे बाद उपलब्ध होता है।", "Nowy bonus jest dostępny po 24 godzinach.", "Ein neuer Bonus ist nach 24 Stunden verfügbar.", "Yeni bonus 24 saat sonra kullanılabilir."],
  ["Если пропустить более 48 часов, серия начинается с первого дня.", "If more than 48 hours are missed, the streak restarts from day one.", "Якщо пропустити понад 48 годин, серія починається з першого дня.", "Se salti più di 48 ore, la serie riparte dal primo giorno.", "Si vous manquez plus de 48 heures, la série recommence au jour 1.", "Si pasan más de 48 horas, la racha vuelve al día 1.", "48 घंटे से अधिक चूकने पर स्ट्रीक पहले दिन से शुरू होगी।", "Jeśli minie ponad 48 godzin, seria zaczyna się od pierwszego dnia.", "Bei mehr als 48 Stunden Pause startet die Serie wieder bei Tag 1.", "48 saatten fazla kaçırırsanız seri 1. günden başlar."],
  ["Сетевая комиссия оплачивается проектом", "Network fee is paid by the project", "Мережева комісія оплачується проєктом", "La commissione di rete è pagata dal progetto", "Les frais de réseau sont payés par le projet", "La comisión de red la paga el proyecto", "नेटवर्क शुल्क प्रोजेक्ट द्वारा दिया जाता है", "Opłatę sieciową pokrywa projekt", "Die Netzwerkgebühr wird vom Projekt bezahlt", "Ağ ücreti proje tarafından ödenir"],
  ["На кошелёк игрок получает полностью указанную сумму USDT.", "The player receives the full stated USDT amount in the wallet.", "На гаманець гравець отримує повну зазначену суму USDT.", "Il giocatore riceve sul wallet l'intero importo USDT indicato.", "Le joueur reçoit le montant USDT indiqué en totalité sur son portefeuille.", "El jugador recibe en su wallet el importe completo indicado en USDT.", "खिलाड़ी को वॉलेट में पूरी बताई गई USDT राशि मिलती है।", "Gracz otrzymuje na portfel pełną wskazaną kwotę USDT.", "Der Spieler erhält den vollständig angegebenen USDT-Betrag auf die Wallet.", "Oyuncu cüzdanına belirtilen USDT tutarının tamamını alır."],
  ["Статус активной заявки обновляется автоматически примерно каждые 15 секунд.", "The active request status updates automatically about every 15 seconds.", "Статус активної заявки оновлюється автоматично приблизно кожні 15 секунд.", "Lo stato della richiesta attiva si aggiorna automaticamente circa ogni 15 secondi.", "Le statut de la demande active est mis à jour automatiquement environ toutes les 15 secondes.", "El estado de la solicitud activa se actualiza automáticamente aproximadamente cada 15 segundos.", "सक्रिय अनुरोध की स्थिति लगभग हर 15 सेकंड में अपने आप अपडेट होती है।", "Status aktywnego wniosku odświeża się automatycznie mniej więcej co 15 sekund.", "Der Status des aktiven Antrags wird etwa alle 15 Sekunden automatisch aktualisiert.", "Aktif talebin durumu yaklaşık her 15 saniyede otomatik güncellenir."],
  ["DNA резервируется сразу после создания заявки.", "DNA is reserved immediately after the request is created.", "DNA резервується одразу після створення заявки.", "Il DNA viene riservato subito dopo la creazione della richiesta.", "Le DNA est réservé immédiatement après la création de la demande.", "El DNA se reserva inmediatamente después de crear la solicitud.", "अनुरोध बनते ही DNA रिज़र्व हो जाता है।", "DNA jest rezerwowane od razu po utworzeniu wniosku.", "DNA wird direkt nach Erstellung des Antrags reserviert.", "Talep oluşturulur oluşturulmaz DNA rezerve edilir."],
  ["После первого вывода заявка появится здесь вместе со статусом и суммой.", "After your first withdrawal, the request will appear here with its status and amount.", "Після першого виведення заявка з'явиться тут разом зі статусом і сумою.", "Dopo il primo prelievo, la richiesta apparirà qui con stato e importo.", "Après votre premier retrait, la demande apparaîtra ici avec son statut et son montant.", "Después del primer retiro, la solicitud aparecerá aquí con su estado e importe.", "पहली निकासी के बाद अनुरोध यहाँ स्थिति और राशि के साथ दिखाई देगा।", "Po pierwszej wypłacie wniosek pojawi się tutaj wraz ze statusem i kwotą.", "Nach der ersten Auszahlung erscheint der Antrag hier mit Status und Betrag.", "İlk çekimden sonra talep burada durumu ve tutarıyla görünecek."],
  ["Заявка ожидает автоматической проверки и выплаты.", "The request is awaiting automatic review and payout.", "Заявка очікує автоматичної перевірки та виплати.", "La richiesta è in attesa di verifica e pagamento automatici.", "La demande attend la vérification et le paiement automatiques.", "La solicitud está esperando revisión y pago automáticos.", "अनुरोध स्वचालित जाँच और भुगतान की प्रतीक्षा में है।", "Wniosek oczekuje na automatyczną weryfikację i wypłatę.", "Der Antrag wartet auf automatische Prüfung und Auszahlung.", "Talep otomatik kontrol ve ödeme bekliyor."],
  ["Заявка одобрена и ожидает отправки USDT.", "The request is approved and awaiting USDT transfer.", "Заявка схвалена й очікує відправлення USDT.", "La richiesta è approvata e attende l'invio di USDT.", "La demande est approuvée et attend l'envoi des USDT.", "La solicitud está aprobada y esperando el envío de USDT.", "अनुरोध स्वीकृत है और USDT भेजे जाने की प्रतीक्षा में है।", "Wniosek został zatwierdzony i oczekuje na wysłanie USDT.", "Der Antrag ist genehmigt und wartet auf die USDT-Überweisung.", "Talep onaylandı ve USDT gönderimini bekliyor."],
  ["Выплата отправлена на указанный кошелёк.", "The payout was sent to the specified wallet.", "Виплату надіслано на вказаний гаманець.", "Il pagamento è stato inviato al wallet indicato.", "Le paiement a été envoyé au portefeuille indiqué.", "El pago se envió al wallet indicado.", "भुगतान दिए गए वॉलेट पर भेज दिया गया है।", "Wypłata została wysłana na wskazany portfel.", "Die Auszahlung wurde an die angegebene Wallet gesendet.", "Ödeme belirtilen cüzdana gönderildi."],
  ["Динозавр будет добавлен на свободную клетку.", "The dinosaur will be added to a free slot.", "Динозавра буде додано у вільну клітинку.", "Il dinosauro verrà aggiunto a uno slot libero.", "Le dinosaure sera ajouté à une case libre.", "El dinosaurio se añadirá a una casilla libre.", "डायनासोर को खाली स्लॉट में जोड़ा जाएगा।", "Dinozaur zostanie dodany do wolnego pola.", "Der Dinosaurier wird einem freien Feld hinzugefügt.", "Dinozor boş bir alana eklenecek."],
  ["Этот уровень уже разблокирован вашим прогрессом merge.", "This level is already unlocked by your merge progress.", "Цей рівень уже розблоковано вашим прогресом merge.", "Questo livello è già sbloccato dai tuoi progressi di merge.", "Ce niveau est déjà débloqué par votre progression de fusion.", "Este nivel ya está desbloqueado por tu progreso de merge.", "यह स्तर आपके merge प्रगति से पहले ही खुल चुका है।", "Ten poziom został już odblokowany dzięki postępowi w merge.", "Dieses Level ist durch deinen Merge-Fortschritt bereits freigeschaltet.", "Bu seviye merge ilerlemenizle zaten açıldı."],
  ["Coins будут списаны только после подтверждения.", "Coins will be deducted only after confirmation.", "Coins буде списано лише після підтвердження.", "I Coins verranno addebitati solo dopo la conferma.", "Les Coins seront débités uniquement après confirmation.", "Los Coins se descontarán solo después de confirmar.", "पुष्टि के बाद ही Coins काटे जाएंगे।", "Coins zostaną pobrane dopiero po potwierdzeniu.", "Coins werden erst nach der Bestätigung abgezogen.", "Coins yalnızca onaydan sonra düşülür."],
  ["будут объединены без возможности отмены.", "will be merged and cannot be undone.", "будуть об'єднані без можливості скасування.", "verranno uniti e non sarà possibile annullare.", "seront fusionnés sans possibilité d'annuler.", "se combinarán y no se podrá deshacer.", "मिलाए जाएंगे और इसे वापस नहीं किया जा सकेगा।", "zostaną połączone bez możliwości cofnięcia.", "werden zusammengeführt und können nicht rückgängig gemacht werden.", "birleştirilecek ve işlem geri alınamayacak."],
  ["Главная навигация", "Main navigation", "Головна навігація", "Navigazione principale", "Navigation principale", "Navegación principal", "मुख्य नेविगेशन", "Główna nawigacja", "Hauptnavigation", "Ana gezinme"],
  ["Гнездо", "Nest", "Гніздо", "Nido", "Nid", "Nido", "घोंसला", "Gniazdo", "Nest", "Yuva"],
  ["Игра", "Game", "Гра", "Gioco", "Jeu", "Juego", "खेल", "Gra", "Spiel", "Oyun"],
  ["Магазин", "Shop", "Магазин", "Negozio", "Boutique", "Tienda", "दुकान", "Sklep", "Shop", "Mağaza"],
  ["Друзья", "Friends", "Друзі", "Amici", "Amis", "Amigos", "दोस्त", "Znajomi", "Freunde", "Arkadaşlar"],
  ["Меню", "Menu", "Меню", "Menu", "Menu", "Menú", "मेनू", "Menu", "Menü", "Menü"],
  ["Мой профиль", "My profile", "Мій профіль", "Il mio profilo", "Mon profil", "Mi perfil", "मेरी प्रोफ़ाइल", "Mój profil", "Mein Profil", "Profilim"],
  ["История баланса", "Balance history", "Історія балансу", "Cronologia saldo", "Historique du solde", "Historial de saldo", "बैलेंस इतिहास", "Historia salda", "Kontoverlauf", "Bakiye geçmişi"],
  ["Вывод DNA", "DNA withdrawal", "Виведення DNA", "Prelievo DNA", "Retrait DNA", "Retiro de DNA", "DNA निकासी", "Wypłata DNA", "DNA-Auszahlung", "DNA çekimi"],
  ["Уровни динозавров", "Dinosaur levels", "Рівні динозаврів", "Livelli dinosauri", "Niveaux des dinosaures", "Niveles de dinosaurios", "डायनासोर स्तर", "Poziomy dinozaurów", "Dinosaurier-Level", "Dinozor seviyeleri"],
  ["Моя ферма", "My farm", "Моя ферма", "La mia fattoria", "Ma ferme", "Mi granja", "मेरा फार्म", "Moja farma", "Meine Farm", "Çiftliğim"],
  ["Ежедневный бонус", "Daily reward", "Щоденний бонус", "Bonus giornaliero", "Bonus quotidien", "Bono diario", "दैनिक बोनस", "Bonus dzienny", "Tagesbonus", "Günlük bonus"],
  ["Задания", "Tasks", "Завдання", "Missioni", "Tâches", "Tareas", "कार्य", "Zadania", "Aufgaben", "Görevler"],
  ["Достижения", "Achievements", "Досягнення", "Obiettivi", "Succès", "Logros", "उपलब्धियाँ", "Osiągnięcia", "Erfolge", "Başarımlar"],
  ["Награды", "Rewards", "Нагороди", "Ricompense", "Récompenses", "Recompensas", "पुरस्कार", "Nagrody", "Belohnungen", "Ödüller"],
  ["Рулетка", "Roulette", "Рулетка", "Roulette", "Roulette", "Ruleta", "रूलेट", "Ruletka", "Roulette", "Rulet"],
  ["Перезагрузить данные", "Reload data", "Перезавантажити дані", "Ricarica dati", "Recharger les données", "Recargar datos", "डेटा फिर लोड करें", "Odśwież dane", "Daten neu laden", "Verileri yenile"],
  ["Игровая доска", "Game board", "Ігрове поле", "Plancia di gioco", "Plateau de jeu", "Tablero de juego", "गेम बोर्ड", "Plansza gry", "Spielfeld", "Oyun tahtası"],
  ["Общее производство", "Total production", "Загальне виробництво", "Produzione totale", "Production totale", "Producción total", "कुल उत्पादन", "Łączna produkcja", "Gesamtproduktion", "Toplam üretim"],
  ["Магазин динозавров", "Dinosaur shop", "Магазин динозаврів", "Negozio dinosauri", "Boutique de dinosaures", "Tienda de dinosaurios", "डायनासोर दुकान", "Sklep z dinozaurami", "Dinosaurier-Shop", "Dinozor mağazası"],
  ["Пополнение баланса", "Top up balance", "Поповнення балансу", "Ricarica saldo", "Recharger le solde", "Recargar saldo", "बैलेंस टॉप-अप", "Doładowanie salda", "Guthaben aufladen", "Bakiye yükleme"],
  ["Сумма пополнения", "Deposit amount", "Сума поповнення", "Importo ricarica", "Montant du dépôt", "Importe del depósito", "जमा राशि", "Kwota wpłaty", "Einzahlungsbetrag", "Yükleme tutarı"],
  ["Итого", "Total", "Разом", "Totale", "Total", "Total", "कुल", "Razem", "Gesamt", "Toplam"],
  ["Бонус за первое пополнение уже использован.", "The first deposit bonus has already been used.", "Бонус за перше поповнення вже використано.", "Il bonus per il primo deposito è già stato utilizzato.", "Le bonus de premier dépôt a déjà été utilisé.", "El bono del primer depósito ya se ha utilizado.", "पहली जमा का बोनस पहले ही इस्तेमाल किया जा चुका है।", "Bonus za pierwszą wpłatę został już wykorzystany.", "Der Bonus für die erste Einzahlung wurde bereits verwendet.", "İlk yükleme bonusu zaten kullanıldı."],
  ["Первое успешно оплаченное пополнение:", "First successfully paid deposit:", "Перше успішно оплачене поповнення:", "Primo deposito pagato con successo:", "Premier dépôt payé avec succès :", "Primer depósito pagado correctamente:", "पहली सफल जमा:", "Pierwsza pomyślnie opłacona wpłata:", "Erste erfolgreich bezahlte Einzahlung:", "İlk başarıyla ödenen yükleme:"],
  ["Выберите криптовалюту", "Choose cryptocurrency", "Оберіть криптовалюту", "Scegli la criptovaluta", "Choisissez la cryptomonnaie", "Elige la criptomoneda", "क्रिप्टोकरेंसी चुनें", "Wybierz kryptowalutę", "Kryptowährung wählen", "Kripto para seçin"],
  ["Проверяем минимум выбранной сети...", "Checking the selected network minimum...", "Перевіряємо мінімум вибраної мережі...", "Verifica del minimo della rete selezionata...", "Vérification du minimum du réseau sélectionné...", "Comprobando el mínimo de la red seleccionada...", "चुने गए नेटवर्क की न्यूनतम राशि जाँची जा रही है...", "Sprawdzanie minimum dla wybranej sieci...", "Minimum des gewählten Netzwerks wird geprüft...", "Seçilen ağın minimumu kontrol ediliyor..."],
  ["Минимум для", "Minimum for", "Мінімум для", "Minimo per", "Minimum pour", "Mínimo para", "न्यूनतम", "Minimum dla", "Minimum für", "Minimum"],
  [": примерно", ": approx.", ": приблизно", ": circa", " : environ", ": aprox.", ": लगभग", ": około", ": ca.", ": yaklaşık"],
  ["Минимум будет окончательно проверен сервером при создании платежа.", "The minimum will be finally checked by the server when the payment is created.", "Мінімум буде остаточно перевірено сервером під час створення платежу.", "Il minimo verrà verificato definitivamente dal server durante la creazione del pagamento.", "Le minimum sera vérifié définitivement par le serveur lors de la création du paiement.", "El mínimo será verificado definitivamente por el servidor al crear el pago.", "भुगतान बनाते समय सर्वर न्यूनतम राशि की अंतिम जाँच करेगा।", "Minimum zostanie ostatecznie sprawdzone przez serwer podczas tworzenia płatności.", "Das Minimum wird beim Erstellen der Zahlung abschließend vom Server geprüft.", "Minimum tutar ödeme oluşturulurken sunucu tarafından son kez kontrol edilir."],
  ["недоступно", "unavailable", "недоступно", "non disponibile", "indisponible", "no disponible", "उपलब्ध नहीं", "niedostępne", "nicht verfügbar", "kullanılamıyor"],
  ["СОЗДАЁМ ПЛАТЁЖ...", "CREATING PAYMENT...", "СТВОРЮЄМО ПЛАТІЖ...", "CREAZIONE PAGAMENTO...", "CRÉATION DU PAIEMENT...", "CREANDO PAGO...", "भुगतान बनाया जा रहा है...", "TWORZENIE PŁATNOŚCI...", "ZAHLUNG WIRD ERSTELLT...", "ÖDEME OLUŞTURULUYOR..."],
  ["СОЗДАЁМ...", "CREATING...", "СТВОРЮЄМО...", "CREAZIONE...", "CRÉATION...", "CREANDO...", "बनाया जा रहा है...", "TWORZENIE...", "WIRD ERSTELLT...", "OLUŞTURULUYOR..."],
  ["Статус:", "Status:", "Статус:", "Stato:", "Statut :", "Estado:", "स्थिति:", "Status:", "Status:", "Durum:"],
  ["Адрес ·", "Address ·", "Адреса ·", "Indirizzo ·", "Adresse ·", "Dirección ·", "पता ·", "Adres ·", "Adresse ·", "Adres ·"],
  ["ЗАЧИСЛЕНО", "CREDITED", "ЗАРАХОВАНО", "ACCREDITATO", "CRÉDITÉ", "ACREDITADO", "जमा हो गया", "ZAKSIĘGOWANO", "GUTGESCHRIEBEN", "HESABA GEÇTİ"],
  ["ПРОВЕРЯЕМ...", "CHECKING...", "ПЕРЕВІРЯЄМО...", "CONTROLLO...", "VÉRIFICATION...", "COMPROBANDO...", "जाँच हो रही है...", "SPRAWDZANIE...", "WIRD GEPRÜFT...", "KONTROL EDİLİYOR..."],
  ["От $", "From $", "Від $", "Da $", "De $", "De $", "$ से ", "Od $", "Von $", "En az $"],
  ["до $", "to $", "до $", "a $", "à $", "a $", "$ तक", "do $", "bis $", "en çok $"],
  ["Администратору нужно добавить ключи платёжного провайдера.", "The administrator needs to add the payment provider keys.", "Адміністратору потрібно додати ключі платіжного провайдера.", "L'amministratore deve aggiungere le chiavi del provider di pagamento.", "L'administrateur doit ajouter les clés du prestataire de paiement.", "El administrador debe añadir las claves del proveedor de pagos.", "एडमिन को भुगतान प्रदाता की कुंजियाँ जोड़नी होंगी।", "Administrator musi dodać klucze dostawcy płatności.", "Der Administrator muss die Schlüssel des Zahlungsanbieters hinzufügen.", "Yönetici ödeme sağlayıcısı anahtarlarını eklemelidir."],
  ["После создания платежа отправляйте", "After creating the payment, send", "Після створення платежу надсилайте", "Dopo aver creato il pagamento, invia", "Après avoir créé le paiement, envoyez", "Después de crear el pago, envía", "भुगतान बनाने के बाद भेजें", "Po utworzeniu płatności wyślij", "Sende nach dem Erstellen der Zahlung", "Ödemeyi oluşturduktan sonra gönderin"],
  ["только выбранную монету", "only the selected coin", "лише вибрану монету", "solo la moneta selezionata", "uniquement la monnaie sélectionnée", "solo la moneda seleccionada", "केवल चुनी गई कॉइन", "tylko wybraną monetę", "nur den ausgewählten Coin", "yalnızca seçilen coini"],
  ["только по сети", "only on the network", "лише через мережу", "solo sulla rete", "uniquement sur le réseau", "solo en la red", "केवल नेटवर्क पर", "tylko w sieci", "nur über das Netzwerk", "yalnızca ağ üzerinden"],
  ["Не отправляйте другую монету на выданный адрес.", "Do not send another coin to the provided address.", "Не надсилайте іншу монету на видану адресу.", "Non inviare un'altra moneta all'indirizzo fornito.", "N'envoyez pas une autre monnaie à l'adresse fournie.", "No envíes otra moneda a la dirección proporcionada.", "दिए गए पते पर कोई दूसरी कॉइन न भेजें।", "Nie wysyłaj innej monety na podany adres.", "Sende keinen anderen Coin an die angegebene Adresse.", "Verilen adrese başka bir coin göndermeyin."],
  ["Отправляйте только", "Send only", "Надсилайте лише", "Invia solo", "Envoyez uniquement", "Envía solo", "केवल भेजें", "Wysyłaj tylko", "Sende nur", "Yalnızca gönderin"],
  ["по сети", "on the network", "через мережу", "sulla rete", "sur le réseau", "en la red", "नेटवर्क पर", "w sieci", "über das Netzwerk", "ağ üzerinden"],
  ["Другая монета или сеть может привести к потере средств.", "A different coin or network may result in loss of funds.", "Інша монета або мережа може призвести до втрати коштів.", "Una moneta o rete diversa può causare la perdita dei fondi.", "Une autre monnaie ou un autre réseau peut entraîner une perte de fonds.", "Otra moneda o red puede provocar la pérdida de fondos.", "दूसरी कॉइन या नेटवर्क से धन की हानि हो सकती है।", "Inna moneta lub sieć może spowodować utratę środków.", "Ein anderer Coin oder ein anderes Netzwerk kann zum Verlust von Geldern führen.", "Farklı bir coin veya ağ para kaybına yol açabilir."],
  ["Статус проверяется автоматически примерно каждые 15 секунд.", "Status is checked automatically about every 15 seconds.", "Статус перевіряється автоматично приблизно кожні 15 секунд.", "Lo stato viene controllato automaticamente circa ogni 15 secondi.", "Le statut est vérifié automatiquement environ toutes les 15 secondes.", "El estado se comprueba automáticamente aproximadamente cada 15 segundos.", "स्थिति लगभग हर 15 सेकंड में अपने आप जाँची जाती है।", "Status jest sprawdzany automatycznie mniej więcej co 15 sekund.", "Der Status wird ungefähr alle 15 Sekunden automatisch geprüft.", "Durum yaklaşık her 15 saniyede bir otomatik kontrol edilir."],
  ["Стройте ферму вместе", "Build the farm together", "Будуйте ферму разом", "Costruite la fattoria insieme", "Construisez la ferme ensemble", "Construyan la granja juntos", "मिलकर फार्म बनाएं", "Budujcie farmę razem", "Baut die Farm gemeinsam", "Çiftliği birlikte kurun"],
  ["История пополнений", "Deposit history", "Історія поповнень", "Cronologia ricariche", "Historique des dépôts", "Historial de depósitos", "जमा इतिहास", "Historia wpłat", "Einzahlungsverlauf", "Yükleme geçmişi"],
  ["История выплат", "Payout history", "Історія виплат", "Cronologia pagamenti", "Historique des paiements", "Historial de pagos", "भुगतान इतिहास", "Historia wypłat", "Auszahlungsverlauf", "Ödeme geçmişi"],
  ["Пополнение Coins", "Coins deposit", "Поповнення Coins", "Ricarica Coins", "Dépôt de Coins", "Depósito de Coins", "Coins जमा", "Wpłata Coins", "Coin-Einzahlung", "Coins yükleme"],
  ["Вместимость гнезда", "Nest capacity", "Місткість гнізда", "Capacità del nido", "Capacité du nid", "Capacidad del nido", "घोंसला क्षमता", "Pojemność gniazda", "Nestkapazität", "Yuva kapasitesi"],
  ["Следующая награда", "Next reward", "Наступна нагорода", "Prossima ricompensa", "Prochaine récompense", "Próxima recompensa", "अगला पुरस्कार", "Następna nagroda", "Nächste Belohnung", "Sonraki ödül"],
  ["Следующая ступень", "Next tier", "Наступний рівень", "Livello successivo", "Niveau suivant", "Siguiente nivel", "अगला स्तर", "Następny poziom", "Nächste Stufe", "Sonraki seviye"],
  ["Вместимость", "Capacity", "Місткість", "Capacità", "Capacité", "Capacidad", "क्षमता", "Pojemność", "Kapazität", "Kapasite"],
  ["Баланс", "Balance", "Баланс", "Saldo", "Solde", "Saldo", "बैलेंस", "Saldo", "Guthaben", "Bakiye"],
  ["Ваш баланс", "Your balance", "Ваш баланс", "Il tuo saldo", "Votre solde", "Tu saldo", "आपका बैलेंस", "Twoje saldo", "Dein Guthaben", "Bakiyeniz"],
  ["За день", "Per day", "За день", "Al giorno", "Par jour", "Por día", "प्रति दिन", "Dziennie", "Pro Tag", "Günlük"],
  ["расчётно", "estimated", "розрахунково", "stimato", "estimé", "estimado", "अनुमानित", "szacunkowo", "geschätzt", "tahmini"],
  ["Coins / день", "Coins / day", "Coins / день", "Coins / giorno", "Coins / jour", "Coins / día", "Coins / दिन", "Coins / dzień", "Coins / Tag", "Coins / gün"],
  ["DNA / день", "DNA / day", "DNA / день", "DNA / giorno", "DNA / jour", "DNA / día", "DNA / दिन", "DNA / dzień", "DNA / Tag", "DNA / gün"],
  ["яиц / час", "eggs / hour", "яєць / год", "uova / ora", "œufs / heure", "huevos / hora", "अंडे / घंटा", "jaj / godz.", "Eier / Stunde", "yumurta / saat"],
  ["яиц/ч", "eggs/h", "яєць/год", "uova/h", "œufs/h", "huevos/h", "अंडे/घं", "jaj/h", "Eier/h", "yumurta/s"],
  ["яиц", "eggs", "яєць", "uova", "œufs", "huevos", "अंडे", "jaj", "Eier", "yumurta"],
  ["СОБРАТЬ ЯЙЦА", "COLLECT EGGS", "ЗІБРАТИ ЯЙЦЯ", "RACCOGLI UOVA", "RAMASSER LES ŒUFS", "RECOGER HUEVOS", "अंडे इकट्ठा करें", "ZBIERZ JAJKA", "EIER SAMMELN", "YUMURTALARI TOPLA"],
  ["СОБИРАЕМ...", "COLLECTING...", "ЗБИРАЄМО...", "RACCOLTA...", "COLLECTE...", "RECOGIENDO...", "इकट्ठा हो रहा है...", "ZBIERANIE...", "SAMMLE...", "TOPLANIYOR..."],
  ["УЛУЧШИТЬ ГНЕЗДО", "UPGRADE NEST", "ПОКРАЩИТИ ГНІЗДО", "POTENZIA NIDO", "AMÉLIORER LE NID", "MEJORAR NIDO", "घोंसला अपग्रेड करें", "ULEPSZ GNIAZDO", "NEST VERBESSERN", "YUVAYI GELİŞTİR"],
  ["Улучшение гнезда", "Nest upgrade", "Покращення гнізда", "Potenziamento nido", "Amélioration du nid", "Mejora del nido", "घोंसला अपग्रेड", "Ulepszenie gniazda", "Nest-Upgrade", "Yuva geliştirme"],
  ["Загружаем уровни гнезда...", "Loading nest tiers...", "Завантажуємо рівні гнізда...", "Caricamento livelli del nido...", "Chargement des niveaux du nid...", "Cargando niveles del nido...", "घोंसला स्तर लोड हो रहे हैं...", "Ładowanie poziomów gniazda...", "Neststufen werden geladen...", "Yuva seviyeleri yükleniyor..."],
  ["Не удалось загрузить улучшения.", "Failed to load upgrades.", "Не вдалося завантажити покращення.", "Impossibile caricare i potenziamenti.", "Impossible de charger les améliorations.", "No se pudieron cargar las mejoras.", "अपग्रेड लोड नहीं हो सके।", "Nie udało się wczytać ulepszeń.", "Upgrades konnten nicht geladen werden.", "Geliştirmeler yüklenemedi."],
  ["ПОВТОРИТЬ", "RETRY", "ПОВТОРИТИ", "RIPROVA", "RÉESSAYER", "REINTENTAR", "फिर कोशिश करें", "SPRÓBUJ PONOWNIE", "ERNEUT VERSUCHEN", "TEKRAR DENE"],
  ["ПОДТВЕРДИТЬ И СОЗДАТЬ ПЛАТЁЖ", "CONFIRM AND CREATE PAYMENT", "ПІДТВЕРДИТИ Й СТВОРИТИ ПЛАТІЖ", "CONFERMA E CREA PAGAMENTO", "CONFIRMER ET CRÉER LE PAIEMENT", "CONFIRMAR Y CREAR PAGO", "पुष्टि करें और भुगतान बनाएं", "POTWIERDŹ I UTWÓRZ PŁATNOŚĆ", "BESTÄTIGEN UND ZAHLUNG ERSTELLEN", "ONAYLA VE ÖDEME OLUŞTUR"],
  ["ПРОДОЛЖИТЬ К ОПЛАТЕ", "CONTINUE TO PAYMENT", "ПРОДОВЖИТИ ДО ОПЛАТИ", "CONTINUA AL PAGAMENTO", "CONTINUER VERS LE PAIEMENT", "CONTINUAR AL PAGO", "भुगतान पर जाएं", "PRZEJDŹ DO PŁATNOŚCI", "WEITER ZUR ZAHLUNG", "ÖDEMEYE DEVAM ET"],
  ["ПОДТВЕРЖДЕНИЕ ОПЛАТЫ", "PAYMENT CONFIRMATION", "ПІДТВЕРДЖЕННЯ ОПЛАТИ", "CONFERMA PAGAMENTO", "CONFIRMATION DU PAIEMENT", "CONFIRMACIÓN DE PAGO", "भुगतान पुष्टि", "POTWIERDZENIE PŁATNOŚCI", "ZAHLUNGSBESTÄTIGUNG", "ÖDEME ONAYI"],
  ["Создать платёж?", "Create payment?", "Створити платіж?", "Creare il pagamento?", "Créer le paiement ?", "¿Crear pago?", "भुगतान बनाएं?", "Utworzyć płatność?", "Zahlung erstellen?", "Ödeme oluşturulsun mu?"],
  ["Выбранный способ", "Selected method", "Вибраний спосіб", "Metodo selezionato", "Méthode sélectionnée", "Método seleccionado", "चुना गया तरीका", "Wybrana metoda", "Gewählte Methode", "Seçilen yöntem"],
  ["Получите", "You receive", "Отримаєте", "Riceverai", "Vous recevez", "Recibirás", "आपको मिलेगा", "Otrzymasz", "Du erhältst", "Alacaksınız"],
  ["Включён бонус первого пополнения:", "First deposit bonus enabled:", "Увімкнено бонус першого поповнення:", "Bonus primo deposito attivo:", "Bonus de premier dépôt activé :", "Bono de primer depósito activado:", "पहली जमा बोनस सक्रिय:", "Bonus za pierwszą wpłatę aktywny:", "Bonus für erste Einzahlung aktiv:", "İlk yükleme bonusu aktif:"],
  ["Текущий платёж", "Current payment", "Поточний платіж", "Pagamento corrente", "Paiement actuel", "Pago actual", "वर्तमान भुगतान", "Bieżąca płatność", "Aktuelle Zahlung", "Mevcut ödeme"],
  ["Отправить точно", "Send exactly", "Надіслати точно", "Invia esattamente", "Envoyer exactement", "Enviar exactamente", "ठीक इतना भेजें", "Wyślij dokładnie", "Genau senden", "Tam olarak gönder"],
  ["СКОПИРОВАТЬ СУММУ", "COPY AMOUNT", "СКОПІЮВАТИ СУМУ", "COPIA IMPORTO", "COPIER LE MONTANT", "COPIAR IMPORTE", "राशि कॉपी करें", "KOPIUJ KWOTĘ", "BETRAG KOPIEREN", "TUTARI KOPYALA"],
  ["СКОПИРОВАТЬ АДРЕС", "COPY ADDRESS", "СКОПІЮВАТИ АДРЕСУ", "COPIA INDIRIZZO", "COPIER L'ADRESSE", "COPIAR DIRECCIÓN", "पता कॉपी करें", "KOPIUJ ADRES", "ADRESSE KOPIEREN", "ADRESİ KOPYALA"],
  ["ПРОВЕРИТЬ СЕЙЧАС", "CHECK NOW", "ПЕРЕВІРИТИ ЗАРАЗ", "CONTROLLA ORA", "VÉRIFIER MAINTENANT", "COMPROBAR AHORA", "अभी जाँचें", "SPRAWDŹ TERAZ", "JETZT PRÜFEN", "ŞİMDİ KONTROL ET"],
  ["Как начисляются Coins", "How Coins are credited", "Як нараховуються Coins", "Come vengono accreditati i Coins", "Comment les Coins sont crédités", "Cómo se acreditan los Coins", "Coins कैसे जमा होते हैं", "Jak naliczane są Coins", "Wie Coins gutgeschrieben werden", "Coins nasıl eklenir"],
  ["ПРИГЛАСИТЬ ДРУГА", "INVITE A FRIEND", "ЗАПРОСИТИ ДРУГА", "INVITA UN AMICO", "INVITER UN AMI", "INVITAR A UN AMIGO", "दोस्त को आमंत्रित करें", "ZAPROŚ ZNAJOMEGO", "FREUND EINLADEN", "ARKADAŞ DAVET ET"],
  ["Приглашено", "Invited", "Запрошено", "Invitati", "Invités", "Invitados", "आमंत्रित", "Zaproszono", "Eingeladen", "Davet edilen"],
  ["Бонус за друга", "Friend bonus", "Бонус за друга", "Bonus amico", "Bonus ami", "Bono por amigo", "दोस्त बोनस", "Bonus za znajomego", "Freundesbonus", "Arkadaş bonusu"],
  ["Начислено", "Earned", "Нараховано", "Accreditato", "Crédité", "Acreditado", "जमा", "Naliczono", "Gutgeschrieben", "Kazanılan"],
  ["Последние приглашённые", "Recent invites", "Останні запрошені", "Inviti recenti", "Invitations récentes", "Invitaciones recientes", "हाल के आमंत्रण", "Ostatnio zaproszeni", "Letzte Einladungen", "Son davetler"],
  ["Операций пока нет", "No operations yet", "Операцій поки немає", "Nessuna operazione", "Aucune opération pour le moment", "Aún no hay operaciones", "अभी कोई लेनदेन नहीं", "Brak operacji", "Noch keine Vorgänge", "Henüz işlem yok"],
  ["Пополнено", "Deposited", "Поповнено", "Depositato", "Déposé", "Depositado", "जमा", "Wpłacono", "Eingezahlt", "Yüklendi"],
  ["Выплачено", "Paid out", "Виплачено", "Pagato", "Payé", "Pagado", "भुगतान किया", "Wypłacono", "Ausgezahlt", "Ödendi"],
  ["Бонусные Coins", "Bonus Coins", "Бонусні Coins", "Coins bonus", "Coins bonus", "Coins de bonificación", "बोनस Coins", "Bonusowe Coins", "Bonus-Coins", "Bonus Coins"],
  ["Сумма", "Amount", "Сума", "Importo", "Montant", "Importe", "राशि", "Kwota", "Betrag", "Tutar"],
  ["Бонус", "Bonus", "Бонус", "Bonus", "Bonus", "Bono", "बोनस", "Bonus", "Bonus", "Bonus"],
  ["К выплате", "Payout", "До виплати", "Da pagare", "À payer", "A pagar", "भुगतान", "Do wypłaty", "Auszahlung", "Ödenecek"],
  ["Сеть", "Network", "Мережа", "Rete", "Réseau", "Red", "नेटवर्क", "Sieć", "Netzwerk", "Ağ"],
  ["Ферма", "Farm", "Ферма", "Fattoria", "Ferme", "Granja", "फार्म", "Farma", "Farm", "Çiftlik"],
  ["Производство", "Production", "Виробництво", "Produzione", "Production", "Producción", "उत्पादन", "Produkcja", "Produktion", "Üretim"],
  ["Собрано яиц всего", "Total eggs collected", "Усього зібрано яєць", "Uova raccolte totali", "Total d'œufs collectés", "Total de huevos recogidos", "कुल इकट्ठे अंडे", "Łącznie zebrane jaja", "Gesammelte Eier gesamt", "Toplam toplanan yumurta"],
  ["Экв. стоимость фермы", "Equivalent farm cost", "Екв. вартість ферми", "Costo equivalente fattoria", "Coût équivalent de la ferme", "Coste equivalente de la granja", "समतुल्य फार्म लागत", "Równowartość kosztu farmy", "Äquivalente Farmkosten", "Eşdeğer çiftlik maliyeti"],
  ["Прогресс", "Progress", "Прогрес", "Progressi", "Progression", "Progreso", "प्रगति", "Postęp", "Fortschritt", "İlerleme"],
  ["Заданий выполнено", "Tasks completed", "Завдань виконано", "Missioni completate", "Tâches terminées", "Tareas completadas", "पूरे किए गए कार्य", "Ukończone zadania", "Aufgaben abgeschlossen", "Tamamlanan görevler"],
  ["Рефералы", "Referrals", "Реферали", "Referral", "Parrainages", "Referidos", "रेफरल", "Polecenia", "Empfehlungen", "Referanslar"],
  ["Выплаты", "Payouts", "Виплати", "Pagamenti", "Paiements", "Pagos", "भुगतान", "Wypłaty", "Auszahlungen", "Ödemeler"],
  ["Коллекция", "Collection", "Колекція", "Collezione", "Collection", "Colección", "संग्रह", "Kolekcja", "Sammlung", "Koleksiyon"],
  ["Динозавров", "Dinosaurs", "Динозаврів", "Dinosauri", "Dinosaures", "Dinosaurios", "डायनासोर", "Dinozaury", "Dinosaurier", "Dinozorlar"],
  ["Макс. уровень", "Max level", "Макс. рівень", "Livello max", "Niveau max", "Nivel máx.", "अधिकतम स्तर", "Maks. poziom", "Max. Level", "Maks. seviye"],
  ["Теоретическая стоимость фермы", "Theoretical farm cost", "Теоретична вартість ферми", "Costo teorico fattoria", "Coût théorique de la ferme", "Coste teórico de la granja", "सैद्धांतिक फार्म लागत", "Teoretyczny koszt farmy", "Theoretische Farmkosten", "Teorik çiftlik maliyeti"],
  ["Coins-окупаемость", "Coins payback", "Coins-окупність", "Rientro Coins", "Rentabilité Coins", "Retorno Coins", "Coins पेबैक", "Zwrot w Coins", "Coins-Amortisation", "Coins geri dönüşü"],
  ["Состав фермы", "Farm composition", "Склад ферми", "Composizione fattoria", "Composition de la ferme", "Composición de la granja", "फार्म संरचना", "Skład farmy", "Farmzusammensetzung", "Çiftlik yapısı"],
  ["Окупаемость", "Payback", "Окупність", "Rientro", "Rentabilité", "Retorno", "पेबैक", "Zwrot", "Amortisation", "Geri dönüş"],
  ["Полная экв. стоимость", "Full equivalent cost", "Повна екв. вартість", "Costo equivalente totale", "Coût équivalent total", "Coste equivalente total", "पूर्ण समतुल्य लागत", "Pełny koszt równoważny", "Vollständige äquivalente Kosten", "Tam eşdeğer maliyet"],
  ["Для merge", "For merge", "Для merge", "Per il merge", "Pour la fusion", "Para merge", "Merge के लिए", "Do merge", "Für Merge", "Merge için"],
  ["ОТКРЫТ", "UNLOCKED", "ВІДКРИТО", "SBLOCCATO", "DÉBLOQUÉ", "DESBLOQUEADO", "खुला", "ODBLOKOWANY", "FREIGESCHALTET", "AÇIK"],
  ["НЕ ОТКРЫТ", "LOCKED", "НЕ ВІДКРИТО", "BLOCCATO", "VERROUILLÉ", "BLOQUEADO", "बंद", "ZABLOKOWANY", "GESPERRT", "KİLİTLİ"],
  ["Получено", "Claimed", "Отримано", "Riscattato", "Récupéré", "Reclamado", "प्राप्त", "Odebrano", "Abgeholt", "Alındı"],
  ["Можно забрать", "Ready to claim", "Можна забрати", "Da riscattare", "À récupérer", "Listo para reclamar", "ले सकते हैं", "Do odebrania", "Abholbereit", "Alınabilir"],
  ["ПОЛУЧЕНО", "CLAIMED", "ОТРИМАНО", "RISCATTATO", "RÉCUPÉRÉ", "RECLAMADO", "प्राप्त", "ODEBRANO", "ABGEHOLT", "ALINDI"],
  ["ЗАБРАТЬ", "CLAIM", "ЗАБРАТИ", "RISCATTA", "RÉCUPÉRER", "RECLAMAR", "लेें", "ODBIERZ", "ABHOLEN", "AL"],
  ["В процессе", "In progress", "У процесі", "In corso", "En cours", "En progreso", "प्रगति में", "W trakcie", "In Arbeit", "Devam ediyor"],
  ["Серия", "Streak", "Серія", "Serie", "Série", "Racha", "स्ट्रीक", "Seria", "Serie", "Seri"],
  ["Доступно", "Available", "Доступно", "Disponibile", "Disponible", "Disponible", "उपलब्ध", "Dostępne", "Verfügbar", "Mevcut"],
  ["Минимум", "Minimum", "Мінімум", "Minimo", "Minimum", "Mínimo", "न्यूनतम", "Minimum", "Minimum", "Minimum"],
  ["Курс", "Rate", "Курс", "Tasso", "Taux", "Tasa", "दर", "Kurs", "Kurs", "Kur"],
  ["Количество DNA", "DNA amount", "Кількість DNA", "Quantità DNA", "Montant DNA", "Cantidad de DNA", "DNA राशि", "Ilość DNA", "DNA-Menge", "DNA miktarı"],
  ["Сеть USDT", "USDT network", "Мережа USDT", "Rete USDT", "Réseau USDT", "Red USDT", "USDT नेटवर्क", "Sieć USDT", "USDT-Netzwerk", "USDT ağı"],
  ["Адрес USDT-кошелька", "USDT wallet address", "Адреса USDT-гаманця", "Indirizzo wallet USDT", "Adresse du portefeuille USDT", "Dirección de wallet USDT", "USDT वॉलेट पता", "Adres portfela USDT", "USDT-Wallet-Adresse", "USDT cüzdan adresi"],
  ["К получению", "You receive", "До отримання", "Da ricevere", "À recevoir", "A recibir", "प्राप्त होगा", "Do otrzymania", "Zu erhalten", "Alınacak"],
  ["ЗАПРОСИТЬ ВЫПЛАТУ", "REQUEST PAYOUT", "ЗАПРОСИТИ ВИПЛАТУ", "RICHIEDI PAGAMENTO", "DEMANDER LE PAIEMENT", "SOLICITAR PAGO", "भुगतान का अनुरोध करें", "ZLEĆ WYPŁATĘ", "AUSZAHLUNG ANFORDERN", "ÖDEME TALEP ET"],
  ["Заявок пока нет", "No requests yet", "Заявок поки немає", "Nessuna richiesta", "Aucune demande pour le moment", "Aún no hay solicitudes", "अभी कोई अनुरोध नहीं", "Brak wniosków", "Noch keine Anträge", "Henüz talep yok"],
  ["Дата", "Date", "Дата", "Data", "Date", "Fecha", "तारीख", "Data", "Datum", "Tarih"],
  ["Кошелёк", "Wallet", "Гаманець", "Wallet", "Portefeuille", "Wallet", "वॉलेट", "Portfel", "Wallet", "Cüzdan"],
  ["ОТМЕНИТЬ ЗАЯВКУ", "CANCEL REQUEST", "СКАСУВАТИ ЗАЯВКУ", "ANNULLA RICHIESTA", "ANNULER LA DEMANDE", "CANCELAR SOLICITUD", "अनुरोध रद्द करें", "ANULUJ WNIOSEK", "ANTRAG STORNIEREN", "TALEBİ İPTAL ET"],
  ["Подтвердить покупку?", "Confirm purchase?", "Підтвердити покупку?", "Confermare l'acquisto?", "Confirmer l'achat ?", "¿Confirmar compra?", "खरीद की पुष्टि करें?", "Potwierdzić zakup?", "Kauf bestätigen?", "Satın alma onaylansın mı?"],
  ["Стоимость", "Cost", "Вартість", "Costo", "Coût", "Coste", "लागत", "Koszt", "Kosten", "Maliyet"],
  ["Баланс после покупки", "Balance after purchase", "Баланс після покупки", "Saldo dopo l'acquisto", "Solde après achat", "Saldo después de la compra", "खरीद के बाद बैलेंस", "Saldo po zakupie", "Guthaben nach Kauf", "Satın alma sonrası bakiye"],
  ["ОТМЕНА", "CANCEL", "СКАСУВАТИ", "ANNULLA", "ANNULER", "CANCELAR", "रद्द करें", "ANULUJ", "ABBRECHEN", "İPTAL"],
  ["ПОДТВЕРДИТЬ", "CONFIRM", "ПІДТВЕРДИТИ", "CONFERMA", "CONFIRMER", "CONFIRMAR", "पुष्टि करें", "POTWIERDŹ", "BESTÄTIGEN", "ONAYLA"],
  ["Подтвердить merge?", "Confirm merge?", "Підтвердити merge?", "Confermare il merge?", "Confirmer la fusion ?", "¿Confirmar merge?", "Merge की पुष्टि करें?", "Potwierdzić merge?", "Merge bestätigen?", "Merge onaylansın mı?"],
  ["Получите Lv.", "You get Lv.", "Отримаєте Lv.", "Riceverai Lv.", "Vous obtenez Lv.", "Obtendrás Lv.", "आपको Lv. मिलेगा", "Otrzymasz Lv.", "Du erhältst Lv.", "Lv. alacaksınız"],
  ["Комиссия", "Fee", "Комісія", "Commissione", "Frais", "Comisión", "शुल्क", "Opłata", "Gebühr", "Ücret"],
  ["Нужно на балансе", "Required balance", "Потрібно на балансі", "Saldo necessario", "Solde nécessaire", "Saldo necesario", "ज़रूरी बैलेंस", "Wymagane saldo", "Benötigtes Guthaben", "Gerekli bakiye"],
  ["Минимум сети", "Network minimum", "Мінімум мережі", "Minimo rete", "Minimum réseau", "Mínimo de red", "नेटवर्क न्यूनतम", "Minimum sieci", "Netzwerkminimum", "Ağ minimumu"],
  ["рассчитывается", "calculating", "розраховується", "in calcolo", "calcul en cours", "calculando", "गणना हो रही है", "obliczanie", "wird berechnet", "hesaplanıyor"],
  ["Не хватает до минимума", "Short of minimum", "Не вистачає до мінімуму", "Manca al minimo", "Manque pour le minimum", "Falta para el mínimo", "न्यूनतम से कम", "Brakuje do minimum", "Fehlt bis zum Minimum", "Minimuma eksik"],
  ["Минимум соблюдён", "Minimum met", "Мінімум дотримано", "Minimo raggiunto", "Minimum atteint", "Mínimo alcanzado", "न्यूनतम पूरा", "Minimum spełnione", "Minimum erfüllt", "Minimum karşılandı"],
  ["Для выбранной сети NOWPayments сейчас требует минимум.", "NOWPayments currently requires a minimum for the selected network.", "NOWPayments зараз вимагає мінімум для вибраної мережі.", "NOWPayments richiede attualmente un minimo per la rete selezionata.", "NOWPayments exige actuellement un minimum pour le réseau sélectionné.", "NOWPayments exige actualmente un mínimo para la red seleccionada.", "NOWPayments अभी चुने गए नेटवर्क के लिए न्यूनतम राशि मांगता है।", "NOWPayments wymaga obecnie minimum dla wybranej sieci.", "NOWPayments verlangt derzeit ein Minimum für das gewählte Netzwerk.", "NOWPayments şu anda seçilen ağ için minimum tutar istiyor."],
  ["Указано", "Entered", "Вказано", "Inserito", "Saisi", "Indicado", "दर्ज", "Wpisano", "Eingegeben", "Girilen"],
  ["не хватает", "short by", "не вистачає", "mancano", "il manque", "faltan", "कम है", "brakuje", "es fehlen", "eksik"],
  ["Это минимальный размер платежа, а не комиссия.", "This is the minimum payment amount, not a fee.", "Це мінімальний розмір платежу, а не комісія.", "Questo è l'importo minimo del pagamento, non una commissione.", "Il s'agit du montant minimum du paiement, pas de frais.", "Este es el importe mínimo del pago, no una comisión.", "यह न्यूनतम भुगतान राशि है, फीस नहीं।", "To minimalna kwota płatności, a nie opłata.", "Das ist der Mindestzahlungsbetrag, keine Gebühr.", "Bu minimum ödeme tutarıdır, komisyon değildir."],
  ["УСТАНОВИТЬ МИНИМУМ", "SET MINIMUM", "ВСТАНОВИТИ МІНІМУМ", "IMPOSTA MINIMO", "DÉFINIR LE MINIMUM", "ESTABLECER MÍNIMO", "न्यूनतम सेट करें", "USTAW MINIMUM", "MINIMUM SETZEN", "MİNİMUMU AYARLA"],
  ["Минимум сети соблюдён.", "Network minimum is met.", "Мінімум мережі дотримано.", "Il minimo di rete è rispettato.", "Le minimum du réseau est respecté.", "Se cumple el mínimo de la red.", "नेटवर्क न्यूनतम पूरा है।", "Minimum sieci jest spełnione.", "Das Netzwerkminimum ist erfüllt.", "Ağ minimumu karşılandı."],
  ["Точная комиссия NOWPayments будет включена в сумму оплаты после создания платежа.", "The exact NOWPayments fee will be included in the payment amount after the payment is created.", "Точна комісія NOWPayments буде включена в суму оплати після створення платежу.", "La commissione esatta di NOWPayments sarà inclusa nell'importo da pagare dopo la creazione del pagamento.", "Les frais exacts de NOWPayments seront inclus dans le montant à payer après la création du paiement.", "La comisión exacta de NOWPayments se incluirá en el importe a pagar después de crear el pago.", "भुगतान बनने के बाद NOWPayments की सटीक फीस भुगतान राशि में शामिल होगी।", "Dokładna opłata NOWPayments zostanie doliczona do kwoty płatności po jej utworzeniu.", "Die genaue NOWPayments-Gebühr wird nach Erstellung der Zahlung in den Zahlbetrag einbezogen.", "Kesin NOWPayments ücreti ödeme oluşturulduktan sonra ödeme tutarına dahil edilir."],
  ["Комиссия вашего кошелька или биржи за отправку может списываться отдельно.", "Your wallet or exchange may charge a separate sending fee.", "Ваш гаманець або біржа може окремо списати комісію за відправлення.", "Il wallet o l'exchange può addebitare separatamente una commissione di invio.", "Votre portefeuille ou plateforme peut facturer séparément des frais d'envoi.", "Tu wallet o exchange puede cobrar aparte una comisión de envío.", "आपका वॉलेट या एक्सचेंज भेजने की अलग फीस ले सकता है।", "Portfel lub giełda może osobno pobrać opłatę za wysyłkę.", "Wallet oder Börse können zusätzlich eine eigene Sendegebühr berechnen.", "Cüzdanınız veya borsanız ayrıca gönderim ücreti kesebilir."],
  ["Точная сумма в криптовалюте будет рассчитана NOWPayments после создания платежа. Комиссия вашего кошелька или биржи за отправку может списываться отдельно.", "The exact crypto amount will be calculated by NOWPayments after the payment is created. Your wallet or exchange may charge a separate sending fee.", "Точну суму в криптовалюті NOWPayments розрахує після створення платежу. Ваш гаманець або біржа може окремо списати комісію за відправлення.", "L’importo esatto in criptovaluta sarà calcolato da NOWPayments dopo la creazione del pagamento. Il wallet o l’exchange può addebitare separatamente una commissione di invio.", "Le montant exact en cryptomonnaie sera calculé par NOWPayments après la création du paiement. Votre portefeuille ou plateforme peut facturer séparément des frais d’envoi.", "NOWPayments calculará el importe exacto en criptomoneda después de crear el pago. Tu wallet o exchange puede cobrar aparte una comisión de envío.", "भुगतान बनने के बाद सटीक क्रिप्टो राशि NOWPayments द्वारा तय की जाएगी। आपका वॉलेट या एक्सचेंज भेजने की अलग फीस ले सकता है।", "Dokładna kwota w kryptowalucie zostanie obliczona przez NOWPayments po utworzeniu płatności. Portfel lub giełda może osobno pobrać opłatę za wysyłkę.", "Der genaue Kryptobetrag wird von NOWPayments nach Erstellung der Zahlung berechnet. Wallet oder Börse können zusätzlich eine eigene Sendegebühr berechnen.", "Kesin kripto tutarı ödeme oluşturulduktan sonra NOWPayments tarafından hesaplanır. Cüzdanınız veya borsanız ayrıca gönderim ücreti kesebilir."],
  ["Доступен сейчас", "Available now", "Доступний зараз", "Disponibile ora", "Disponible maintenant", "Disponible ahora", "अभी उपलब्ध", "Dostępne teraz", "Jetzt verfügbar", "Şimdi mevcut"],
  ["Ожидает проверки", "Pending review", "Очікує перевірки", "In attesa di verifica", "En attente de vérification", "Pendiente de revisión", "जाँच की प्रतीक्षा", "Oczekuje na weryfikację", "Wartet auf Prüfung", "Kontrol bekliyor"],
  ["Одобрено", "Approved", "Схвалено", "Approvato", "Approuvé", "Aprobado", "स्वीकृत", "Zatwierdzono", "Genehmigt", "Onaylandı"],
  ["Оплачено", "Paid", "Оплачено", "Pagato", "Payé", "Pagado", "भुगतान किया गया", "Opłacono", "Bezahlt", "Ödendi"],
  ["Отменено · DNA возвращена", "Canceled · DNA returned", "Скасовано · DNA повернено", "Annullato · DNA restituito", "Annulé · DNA restitué", "Cancelado · DNA devuelto", "रद्द · DNA वापस", "Anulowano · DNA zwrócone", "Storniert · DNA zurück", "İptal edildi · DNA iade edildi"],
  ["Отклонено · DNA возвращена", "Rejected · DNA returned", "Відхилено · DNA повернено", "Rifiutato · DNA restituito", "Refusé · DNA restitué", "Rechazado · DNA devuelto", "अस्वीकृत · DNA वापस", "Odrzucono · DNA zwrócone", "Abgelehnt · DNA zurück", "Reddedildi · DNA iade edildi"],
  ["Зачислено", "Credited", "Зараховано", "Accreditato", "Crédité", "Acreditado", "जमा", "Zaksięgowano", "Gutgeschrieben", "Hesaba geçti"],
  ["Ошибка", "Error", "Помилка", "Errore", "Erreur", "Error", "त्रुटि", "Błąd", "Fehler", "Hata"],
  ["Истёк", "Expired", "Закінчився", "Scaduto", "Expiré", "Caducado", "समाप्त", "Wygasło", "Abgelaufen", "Süresi doldu"],
  ["Возвращено", "Refunded", "Повернено", "Rimborsato", "Remboursé", "Reembolsado", "वापस किया", "Zwrócono", "Erstattet", "İade edildi"],
  ["Частично оплачено", "Partially paid", "Частково оплачено", "Pagato parzialmente", "Partiellement payé", "Pagado parcialmente", "आंशिक भुगतान", "Częściowo opłacone", "Teilweise bezahlt", "Kısmen ödendi"],
  ["Подтверждается", "Confirming", "Підтверджується", "In conferma", "Confirmation en cours", "Confirmando", "पुष्टि हो रही है", "Potwierdzanie", "Wird bestätigt", "Onaylanıyor"],
  ["Ожидает оплату", "Awaiting payment", "Очікує оплату", "In attesa di pagamento", "En attente de paiement", "Esperando pago", "भुगतान की प्रतीक्षा", "Oczekuje na płatność", "Wartet auf Zahlung", "Ödeme bekliyor"],
  ["Отклонено", "Rejected", "Відхилено", "Rifiutato", "Refusé", "Rechazado", "अस्वीकृत", "Odrzucono", "Abgelehnt", "Reddedildi"],
  ["На проверке", "Under review", "На перевірці", "In verifica", "En vérification", "En revisión", "जाँच में", "W trakcie weryfikacji", "In Prüfung", "İnceleniyor"],
  ["Дата неизвестна", "Unknown date", "Дата невідома", "Data sconosciuta", "Date inconnue", "Fecha desconocida", "अज्ञात तारीख", "Nieznana data", "Unbekanntes Datum", "Tarih bilinmiyor"],
  ["Не удалось загрузить магазин", "Failed to load shop", "Не вдалося завантажити магазин", "Impossibile caricare il negozio", "Impossible de charger la boutique", "No se pudo cargar la tienda", "दुकान लोड नहीं हो सकी", "Nie udało się wczytać sklepu", "Shop konnte nicht geladen werden", "Mağaza yüklenemedi"],
  ["Загружаем товары...", "Loading items...", "Завантажуємо товари...", "Caricamento articoli...", "Chargement des articles...", "Cargando artículos...", "आइटम लोड हो रहे हैं...", "Ładowanie produktów...", "Artikel werden geladen...", "Ürünler yükleniyor..."],
  ["Загружаем способы оплаты...", "Loading payment methods...", "Завантажуємо способи оплати...", "Caricamento metodi di pagamento...", "Chargement des moyens de paiement...", "Cargando métodos de pago...", "भुगतान तरीके लोड हो रहे हैं...", "Ładowanie metod płatności...", "Zahlungsmethoden werden geladen...", "Ödeme yöntemleri yükleniyor..."],
  ["Откройте игру через Telegram", "Open the game through Telegram", "Відкрийте гру через Telegram", "Apri il gioco tramite Telegram", "Ouvrez le jeu via Telegram", "Abre el juego desde Telegram", "गेम Telegram में खोलें", "Otwórz grę przez Telegram", "Öffne das Spiel über Telegram", "Oyunu Telegram üzerinden açın"],
  ["Криптоплатежи ещё не подключены", "Crypto payments are not connected yet", "Криптоплатежі ще не підключені", "I pagamenti crypto non sono ancora collegati", "Les paiements crypto ne sont pas encore connectés", "Los pagos cripto aún no están conectados", "क्रिप्टो भुगतान अभी कनेक्ट नहीं हैं", "Płatności krypto nie są jeszcze podłączone", "Krypto-Zahlungen sind noch nicht verbunden", "Kripto ödemeler henüz bağlı değil"],
  ["Загружаем вашу реферальную ссылку...", "Loading your referral link...", "Завантажуємо ваше реферальне посилання...", "Caricamento del tuo link referral...", "Chargement de votre lien de parrainage...", "Cargando tu enlace de referido...", "आपका रेफरल लिंक लोड हो रहा है...", "Ładowanie linku polecającego...", "Referral-Link wird geladen...", "Referans bağlantınız yükleniyor..."],
  ["Загружаем операции...", "Loading operations...", "Завантажуємо операції...", "Caricamento operazioni...", "Chargement des opérations...", "Cargando operaciones...", "लेनदेन लोड हो रहे हैं...", "Ładowanie operacji...", "Vorgänge werden geladen...", "İşlemler yükleniyor..."],
  ["Не удалось загрузить историю", "Failed to load history", "Не вдалося завантажити історію", "Impossibile caricare la cronologia", "Impossible de charger l'historique", "No se pudo cargar el historial", "इतिहास लोड नहीं हो सका", "Nie udało się wczytać historii", "Verlauf konnte nicht geladen werden", "Geçmiş yüklenemedi"],
  ["Загружаем профиль...", "Loading profile...", "Завантажуємо профіль...", "Caricamento profilo...", "Chargement du profil...", "Cargando perfil...", "प्रोफ़ाइल लोड हो रही है...", "Ładowanie profilu...", "Profil wird geladen...", "Profil yükleniyor..."],
  ["Не удалось загрузить профиль.", "Failed to load profile.", "Не вдалося завантажити профіль.", "Impossibile caricare il profilo.", "Impossible de charger le profil.", "No se pudo cargar el perfil.", "प्रोफ़ाइल लोड नहीं हो सकी।", "Nie udało się wczytać profilu.", "Profil konnte nicht geladen werden.", "Profil yüklenemedi."],
  ["На доске пока нет динозавров", "There are no dinosaurs on the board yet", "На полі поки немає динозаврів", "Non ci sono ancora dinosauri sulla plancia", "Il n'y a pas encore de dinosaures sur le plateau", "Aún no hay dinosaurios en el tablero", "बोर्ड पर अभी कोई डायनासोर नहीं है", "Na planszy nie ma jeszcze dinozaurów", "Noch keine Dinosaurier auf dem Spielfeld", "Tahtada henüz dinozor yok"],
  ["Загружаем достижения...", "Loading achievements...", "Завантажуємо досягнення...", "Caricamento obiettivi...", "Chargement des succès...", "Cargando logros...", "उपलब्धियाँ लोड हो रही हैं...", "Ładowanie osiągnięć...", "Erfolge werden geladen...", "Başarımlar yükleniyor..."],
  ["Не удалось загрузить достижения.", "Failed to load achievements.", "Не вдалося завантажити досягнення.", "Impossibile caricare gli obiettivi.", "Impossible de charger les succès.", "No se pudieron cargar los logros.", "उपलब्धियाँ लोड नहीं हो सकीं।", "Nie udało się wczytać osiągnięć.", "Erfolge konnten nicht geladen werden.", "Başarımlar yüklenemedi."],
  ["Достижений пока нет.", "No achievements yet.", "Досягнень поки немає.", "Nessun obiettivo per ora.", "Aucun succès pour le moment.", "Aún no hay logros.", "अभी कोई उपलब्धि नहीं।", "Brak osiągnięć.", "Noch keine Erfolge.", "Henüz başarım yok."],
  ["Загружаем задания...", "Loading tasks...", "Завантажуємо завдання...", "Caricamento missioni...", "Chargement des tâches...", "Cargando tareas...", "कार्य लोड हो रहे हैं...", "Ładowanie zadań...", "Aufgaben werden geladen...", "Görevler yükleniyor..."],
  ["Не удалось загрузить задания.", "Failed to load tasks.", "Не вдалося завантажити завдання.", "Impossibile caricare le missioni.", "Impossible de charger les tâches.", "No se pudieron cargar las tareas.", "कार्य लोड नहीं हो सके।", "Nie udało się wczytać zadań.", "Aufgaben konnten nicht geladen werden.", "Görevler yüklenemedi."],
  ["Заданий пока нет.", "No tasks yet.", "Завдань поки немає.", "Nessuna missione per ora.", "Aucune tâche pour le moment.", "Aún no hay tareas.", "अभी कोई कार्य नहीं।", "Brak zadań.", "Noch keine Aufgaben.", "Henüz görev yok."],
  ["Загружаем ежедневный бонус...", "Loading daily reward...", "Завантажуємо щоденний бонус...", "Caricamento bonus giornaliero...", "Chargement du bonus quotidien...", "Cargando bono diario...", "दैनिक बोनस लोड हो रहा है...", "Ładowanie bonusu dziennego...", "Tagesbonus wird geladen...", "Günlük bonus yükleniyor..."],
  ["Не удалось загрузить бонус.", "Failed to load reward.", "Не вдалося завантажити бонус.", "Impossibile caricare il bonus.", "Impossible de charger le bonus.", "No se pudo cargar el bono.", "बोनस लोड नहीं हो सका।", "Nie udało się wczytać bonusu.", "Bonus konnte nicht geladen werden.", "Bonus yüklenemedi."],
  ["Загружаем параметры вывода...", "Loading withdrawal settings...", "Завантажуємо параметри виведення...", "Caricamento impostazioni prelievo...", "Chargement des paramètres de retrait...", "Cargando ajustes de retiro...", "निकासी सेटिंग लोड हो रही हैं...", "Ładowanie ustawień wypłaty...", "Auszahlungseinstellungen werden geladen...", "Çekim ayarları yükleniyor..."],
  ["Не удалось загрузить заявки", "Failed to load requests", "Не вдалося завантажити заявки", "Impossibile caricare le richieste", "Impossible de charger les demandes", "No se pudieron cargar las solicitudes", "अनुरोध लोड नहीं हो सके", "Nie udało się wczytać wniosków", "Anträge konnten nicht geladen werden", "Talepler yüklenemedi"],
  ["Например: TON / TRC20 / BEP20", "For example: TON / TRC20 / BEP20", "Наприклад: TON / TRC20 / BEP20", "Ad esempio: TON / TRC20 / BEP20", "Par exemple : TON / TRC20 / BEP20", "Por ejemplo: TON / TRC20 / BEP20", "उदाहरण: TON / TRC20 / BEP20", "Na przykład: TON / TRC20 / BEP20", "Zum Beispiel: TON / TRC20 / BEP20", "Örneğin: TON / TRC20 / BEP20"],
  ["Введите адрес кошелька", "Enter wallet address", "Введіть адресу гаманця", "Inserisci indirizzo wallet", "Saisissez l'adresse du portefeuille", "Introduce la dirección del wallet", "वॉलेट पता दर्ज करें", "Wpisz adres portfela", "Wallet-Adresse eingeben", "Cüzdan adresini girin"],
  ["Закрыть вывод", "Close withdrawal", "Закрити виведення", "Chiudi prelievo", "Fermer le retrait", "Cerrar retiro", "निकासी बंद करें", "Zamknij wypłatę", "Auszahlung schließen", "Çekimi kapat"],
  ["Обновить выплаты", "Refresh payouts", "Оновити виплати", "Aggiorna pagamenti", "Actualiser les paiements", "Actualizar pagos", "भुगतान अपडेट करें", "Odśwież wypłaty", "Auszahlungen aktualisieren", "Ödemeleri yenile"],
  ["Обновить историю", "Refresh history", "Оновити історію", "Aggiorna cronologia", "Actualiser l'historique", "Actualizar historial", "इतिहास अपडेट करें", "Odśwież historię", "Verlauf aktualisieren", "Geçmişi yenile"],
  ["Закрыть историю", "Close history", "Закрити історію", "Chiudi cronologia", "Fermer l'historique", "Cerrar historial", "इतिहास बंद करें", "Zamknij historię", "Verlauf schließen", "Geçmişi kapat"],
  ["Закрыть уровни", "Close levels", "Закрити рівні", "Chiudi livelli", "Fermer les niveaux", "Cerrar niveles", "स्तर बंद करें", "Zamknij poziomy", "Level schließen", "Seviyeleri kapat"],
  ["Подтверждение покупки", "Purchase confirmation", "Підтвердження покупки", "Conferma acquisto", "Confirmation d'achat", "Confirmación de compra", "खरीद पुष्टि", "Potwierdzenie zakupu", "Kaufbestätigung", "Satın alma onayı"],
  ["Подтверждение merge", "Merge confirmation", "Підтвердження merge", "Conferma merge", "Confirmation de fusion", "Confirmación de merge", "Merge पुष्टि", "Potwierdzenie merge", "Merge-Bestätigung", "Merge onayı"],
  ["Динозавр уровня", "Dinosaur level", "Динозавр рівня", "Dinosauro livello", "Dinosaure niveau", "Dinosaurio nivel", "डायनासोर स्तर", "Dinozaur poziomu", "Dinosaurier Level", "Dinozor seviyesi"],
  ["Пустая клетка", "Empty slot", "Порожня клітинка", "Slot vuoto", "Case vide", "Casilla vacía", "खाली स्लॉट", "Puste pole", "Leeres Feld", "Boş alan"],
  ["Открыто до Lv.", "Unlocked up to Lv.", "Відкрито до Lv.", "Sbloccato fino a Lv.", "Débloqué jusqu'au Lv.", "Desbloqueado hasta Lv.", "Lv. तक खुला ", "Odblokowano do Lv.", "Freigeschaltet bis Lv.", "Lv. seviyesine kadar açık "],
  ["Lv.1 доступен сразу.", "Lv.1 is available immediately.", "Lv.1 доступний одразу.", "Lv.1 è disponibile subito.", "Lv.1 est disponible immédiatement.", "Lv.1 está disponible de inmediato.", "Lv.1 तुरंत उपलब्ध है।", "Lv.1 jest dostępny od razu.", "Lv.1 ist sofort verfügbar.", "Lv.1 hemen kullanılabilir."],
  ["ЗАКРЫТО", "LOCKED", "ЗАКРИТО", "BLOCCATO", "VERROUILLÉ", "BLOQUEADO", "बंद", "ZABLOKOWANE", "GESPERRT", "KİLİTLİ"],
  ["ДИНОЗАВРЫ", "DINOSAURS", "ДИНОЗАВРИ", "DINOSAURI", "DINOSAURES", "DINOSAURIOS", "डायनासोर", "DINOZAURY", "DINOSAURIER", "DİNOZORLAR"],
  ["ПОПОЛНИТЬ", "TOP UP", "ПОПОВНИТИ", "RICARICA", "RECHARGER", "RECARGAR", "टॉप-अप", "DOŁADUJ", "AUFLADEN", "YÜKLE"],
  ["НАЗАД", "BACK", "НАЗАД", "INDIETRO", "RETOUR", "ATRÁS", "वापस", "WSTECZ", "ZURÜCK", "GERİ"],
  ["Статус", "Status", "Статус", "Stato", "Statut", "Estado", "स्थिति", "Status", "Status", "Durum"],
  ["Адрес", "Address", "Адреса", "Indirizzo", "Adresse", "Dirección", "पता", "Adres", "Adresse", "Adres"],
  ["Сетевая комиссия", "Network fee", "Мережева комісія", "Commissione di rete", "Frais de réseau", "Comisión de red", "नेटवर्क शुल्क", "Opłata sieciowa", "Netzwerkgebühr", "Ağ ücreti"],
  ["1 день", "1 day", "1 день", "1 giorno", "1 jour", "1 día", "1 दिन", "1 dzień", "1 Tag", "1 gün"],
  ["30 дней", "30 days", "30 днів", "30 giorni", "30 jours", "30 días", "30 दिन", "30 dni", "30 Tage", "30 gün"],
  ["180 дней", "180 days", "180 днів", "180 giorni", "180 jours", "180 días", "180 दिन", "180 dni", "180 Tage", "180 gün"],
  ["1 год", "1 year", "1 рік", "1 anno", "1 an", "1 año", "1 वर्ष", "1 rok", "1 Jahr", "1 yıl"],
  ["дней", "days", "днів", "giorni", "jours", "días", "दिन", "dni", "Tage", "gün"],
  ["без реинвестирования", "without reinvestment", "без реінвестування", "senza reinvestimento", "sans réinvestissement", "sin reinversión", "बिना पुनर्निवेश", "bez reinwestowania", "ohne Reinvestition", "yeniden yatırım olmadan"],
  ["Telegram подтверждён · данные загружены из Neon ✓", "Telegram verified · data loaded from Neon ✓", "Telegram підтверджено · дані завантажено з Neon ✓", "Telegram verificato · dati caricati da Neon ✓", "Telegram vérifié · données chargées depuis Neon ✓", "Telegram verificado · datos cargados desde Neon ✓", "Telegram सत्यापित · Neon से डेटा लोड ✓", "Telegram potwierdzony · dane wczytane z Neon ✓", "Telegram bestätigt · Daten aus Neon geladen ✓", "Telegram doğrulandı · Neon verileri yüklendi ✓"],
  ["Demo-режим · данные загружены из Neon ✓", "Demo mode · data loaded from Neon ✓", "Демо-режим · дані завантажено з Neon ✓", "Modalità demo · dati caricati da Neon ✓", "Mode démo · données chargées depuis Neon ✓", "Modo demo · datos cargados desde Neon ✓", "डेमो मोड · Neon से डेटा लोड ✓", "Tryb demo · dane wczytane z Neon ✓", "Demo-Modus · Daten aus Neon geladen ✓", "Demo modu · Neon verileri yüklendi ✓"],
  ["Auth / Database error", "Auth / Database error", "Помилка Auth / Database", "Errore Auth / Database", "Erreur Auth / Database", "Error Auth / Database", "Auth / Database त्रुटि", "Błąd Auth / Database", "Auth-/Datenbankfehler", "Auth / Database hatası"],
  ["Level 1 · Telegram", "Level 1 · Telegram", "Рівень 1 · Telegram", "Livello 1 · Telegram", "Niveau 1 · Telegram", "Nivel 1 · Telegram", "स्तर 1 · Telegram", "Poziom 1 · Telegram", "Level 1 · Telegram", "Seviye 1 · Telegram"],
  ["Level 1 · Demo", "Level 1 · Demo", "Рівень 1 · Demo", "Livello 1 · Demo", "Niveau 1 · Démo", "Nivel 1 · Demo", "स्तर 1 · Demo", "Poziom 1 · Demo", "Level 1 · Demo", "Seviye 1 · Demo"],

  // LANGUAGE SWITCHER V3 — dynamic Shop / Tasks / Achievements / Profit Plan text.
  // Display-only translations. API payloads, task codes, rewards and callbacks stay unchanged.
  ["Динозавр Lv.", "Dinosaur Lv.", "Динозавр Lv.", "Dinosauro Lv.", "Dinosaure niv.", "Dinosaurio Nv.", "डायनासोर Lv.", "Dinozaur Lv.", "Dinosaurier Lv.", "Dinozor Lv."],
  ["в сутки", "per day", "на добу", "al giorno", "par jour", "al día", "प्रति दिन", "dziennie", "pro Tag", "günlük"],
  ["Coins + столько же DNA", "Coins + the same amount of DNA", "Coins + стільки ж DNA", "Coins + la stessa quantità di DNA", "Coins + la même quantité de DNA", "Coins + la misma cantidad de DNA", "Coins + उतनी ही DNA", "Coins + tyle samo DNA", "Coins + die gleiche Menge DNA", "Coins + aynı miktarda DNA"],
  ["Merge комиссия", "Merge fee", "Merge комісія", "Commissione merge", "Frais de fusion", "Comisión de merge", "Merge शुल्क", "Opłata za merge", "Merge-Gebühr", "Merge ücreti"],
  ["Цена Lv.1", "Lv.1 price", "Ціна Lv.1", "Prezzo Lv.1", "Prix Lv.1", "Precio Lv.1", "Lv.1 कीमत", "Cena Lv.1", "Preis Lv.1", "Lv.1 fiyatı"],

  ["Собери 1 000 яиц", "Collect 1,000 eggs", "Збери 1 000 яєць", "Raccogli 1.000 uova", "Collecte 1 000 œufs", "Recoge 1.000 huevos", "1,000 अंडे इकट्ठा करें", "Zbierz 1 000 jaj", "Sammle 1.000 Eier", "1.000 yumurta topla"],
  ["Соберите суммарно 1 000 яиц из гнезда.", "Collect a total of 1,000 eggs from the nest.", "Збери загалом 1 000 яєць із гнізда.", "Raccogli in totale 1.000 uova dal nido.", "Collecte au total 1 000 œufs dans le nid.", "Recoge un total de 1.000 huevos del nido.", "घोंसले से कुल 1,000 अंडे इकट्ठा करें।", "Zbierz łącznie 1 000 jaj z gniazda.", "Sammle insgesamt 1.000 Eier aus dem Nest.", "Yuvadan toplam 1.000 yumurta topla."],
  ["Собери 3 динозавров", "Collect 3 dinosaurs", "Збери 3 динозаврів", "Raccogli 3 dinosauri", "Obtiens 3 dinosaures", "Consigue 3 dinosaurios", "3 डायनासोर इकट्ठा करें", "Zdobądź 3 dinozaury", "Sammle 3 Dinosaurier", "3 dinozor topla"],
  ["Держите на игровой доске минимум 3 динозавров.", "Keep at least 3 dinosaurs on the game board.", "Тримай на ігровому полі щонайменше 3 динозаврів.", "Tieni almeno 3 dinosauri sulla plancia di gioco.", "Garde au moins 3 dinosaures sur le plateau de jeu.", "Mantén al menos 3 dinosaurios en el tablero de juego.", "गेम बोर्ड पर कम से कम 3 डायनासोर रखें।", "Miej co najmniej 3 dinozaury na planszy gry.", "Halte mindestens 3 Dinosaurier auf dem Spielfeld.", "Oyun tahtasında en az 3 dinozor bulundur."],

  ["Юный заводчик", "Young Breeder", "Юний заводчик", "Giovane allevatore", "Jeune éleveur", "Joven criador", "युवा ब्रीडर", "Młody hodowca", "Junger Züchter", "Genç yetiştirici"],
  ["Мастер эволюции", "Evolution Master", "Майстер еволюції", "Maestro dell'evoluzione", "Maître de l'évolution", "Maestro de la evolución", "विकास मास्टर", "Mistrz ewolucji", "Meister der Evolution", "Evrim ustası"],
  ["Король динозавров", "Dinosaur King", "Король динозаврів", "Re dei dinosauri", "Roi des dinosaures", "Rey de los dinosaurios", "डायनासोर राजा", "Król dinozaurów", "König der Dinosaurier", "Dinozor kralı"],
  ["Получите максимального динозавра Lv.", "Obtain the maximum-level dinosaur Lv.", "Отримайте максимального динозавра Lv.", "Ottieni il dinosauro di livello massimo Lv.", "Obtiens le dinosaure de niveau maximal Lv.", "Consigue el dinosaurio de nivel máximo Nv.", "अधिकतम स्तर का डायनासोर Lv. प्राप्त करें", "Zdobądź dinozaura na maksymalnym poziomie Lv.", "Erhalte den Dinosaurier auf Maximallevel Lv.", "Maksimum seviyedeki dinozoru Lv. elde et"],
  ["Получите динозавра Lv.", "Obtain a dinosaur Lv.", "Отримайте динозавра Lv.", "Ottieni un dinosauro Lv.", "Obtiens un dinosaure niv.", "Consigue un dinosaurio Nv.", "डायनासोर Lv. प्राप्त करें", "Zdobądź dinozaura Lv.", "Erhalte einen Dinosaurier Lv.", "Bir dinozor Lv. elde et"],

  // LANGUAGE SWITCHER V4 — remaining Main Menu + server-provided Achievements.
  // These are display-only strings. Progress, rewards, codes and API data stay unchanged.
  ["СТАТИСТИКА", "STATISTICS", "СТАТИСТИКА", "STATISTICHE", "STATISTIQUES", "ESTADÍSTICAS", "आँकड़े", "STATYSTYKI", "STATISTIK", "İSTATİSTİK"],
  ["ПОПОЛНЕНИЯ / ВЫВОДЫ", "DEPOSITS / WITHDRAWALS", "ПОПОВНЕННЯ / ВИВЕДЕННЯ", "DEPOSITI / PRELIEVI", "DÉPÔTS / RETRAITS", "DEPÓSITOS / RETIROS", "जमा / निकासी", "WPŁATY / WYPŁATY", "EINZAHLUNGEN / AUSZAHLUNGEN", "YATIRMA / ÇEKME"],
  ["МОЯ ФЕРМА", "MY FARM", "МОЯ ФЕРМА", "LA MIA FATTORIA", "MA FERME", "MI GRANJA", "मेरा फार्म", "MOJA FARMA", "MEINE FARM", "ÇİFTLİĞİM"],
  ["ОТКРЫТЬ", "OPEN", "ВІДКРИТИ", "APRI", "OUVRIR", "ABRIR", "खोलें", "OTWÓRZ", "ÖFFNEN", "AÇ"],

  ["Большой урожай", "Big Harvest", "Великий урожай", "Grande raccolto", "Grande récolte", "Gran cosecha", "बड़ी फसल", "Wielkie zbiory", "Große Ernte", "Büyük hasat"],
  ["Миллион яиц", "Million Eggs", "Мільйон яєць", "Un milione di uova", "Un million d'œufs", "Un millón de huevos", "दस लाख अंडे", "Milion jaj", "Eine Million Eier", "Bir milyon yumurta"],
  ["Исполнитель", "Achiever", "Виконавець", "Esecutore", "Accomplisseur", "Cumplidor", "लक्ष्य साधक", "Wykonawca", "Erfüller", "Tamamlayıcı"],
  ["Все задачи выполнены", "All Tasks Completed", "Усі завдання виконано", "Tutte le missioni completate", "Toutes les tâches terminées", "Todas las tareas completadas", "सभी कार्य पूरे", "Wszystkie zadania ukończone", "Alle Aufgaben abgeschlossen", "Tüm görevler tamamlandı"],
  ["Постоянный игрок", "Regular Player", "Постійний гравець", "Giocatore abituale", "Joueur régulier", "Jugador habitual", "नियमित खिलाड़ी", "Stały gracz", "Stammspieler", "Düzenli oyuncu"],
  ["Команда фермеров", "Farmers Team", "Команда фермерів", "Squadra di fattori", "Équipe de fermiers", "Equipo de granjeros", "किसानों की टीम", "Drużyna farmerów", "Farmer-Team", "Çiftçi takımı"],
  ["Амбассадор фермы", "Farm Ambassador", "Амбасадор ферми", "Ambasciatore della fattoria", "Ambassadeur de la ferme", "Embajador de la granja", "फार्म एम्बेसडर", "Ambasador farmy", "Farm-Botschafter", "Çiftlik elçisi"],

  ["Соберите суммарно 100 000 яиц.", "Collect a total of 100 000 eggs.", "Зберіть загалом 100 000 яєць.", "Raccogli in totale 100.000 uova.", "Collectez au total 100 000 œufs.", "Recoge un total de 100 000 huevos.", "कुल 100,000 अंडे इकट्ठा करें।", "Zbierz łącznie 100 000 jaj.", "Sammle insgesamt 100.000 Eier.", "Toplam 100.000 yumurta topla."],
  ["Соберите суммарно 1 000 000 яиц.", "Collect a total of 1 000 000 eggs.", "Зберіть загалом 1 000 000 яєць.", "Raccogli in totale 1.000.000 di uova.", "Collectez au total 1 000 000 d'œufs.", "Recoge un total de 1 000 000 de huevos.", "कुल 1,000,000 अंडे इकट्ठा करें।", "Zbierz łącznie 1 000 000 jaj.", "Sammle insgesamt 1.000.000 Eier.", "Toplam 1.000.000 yumurta topla."],
  ["Получите награды за 3 задания.", "You receive rewards for 3 tasks.", "Отримайте нагороди за 3 завдання.", "Ricevi ricompense per 3 missioni.", "Recevez des récompenses pour 3 tâches.", "Recibe recompensas por 3 tareas.", "3 कार्यों के लिए पुरस्कार प्राप्त करें।", "Odbierz nagrody za 3 zadania.", "Erhalte Belohnungen für 3 Aufgaben.", "3 görev için ödül al."],
  ["Получите награды за все 6 текущих заданий.", "You receive rewards for all 6 current tasks.", "Отримайте нагороди за всі 6 поточних завдань.", "Ricevi ricompense per tutte le 6 missioni attuali.", "Recevez des récompenses pour les 6 tâches actuelles.", "Recibe recompensas por las 6 tareas actuales.", "मौजूदा सभी 6 कार्यों के लिए पुरस्कार प्राप्त करें।", "Odbierz nagrody za wszystkie 6 bieżących zadań.", "Erhalte Belohnungen für alle 6 aktuellen Aufgaben.", "Mevcut 6 görevin tümü için ödül al."],
  ["Получите ежедневный бонус 7 раз.", "You receive the daily reward 7 times.", "Отримайте щоденний бонус 7 разів.", "Ricevi il bonus giornaliero 7 volte.", "Recevez le bonus quotidien 7 fois.", "Recibe el bono diario 7 veces.", "दैनिक बोनस 7 बार प्राप्त करें।", "Odbierz bonus dzienny 7 razy.", "Erhalte den Tagesbonus 7-mal.", "Günlük bonusu 7 kez al."],
  ["Пригласите 5 игроков по своей реферальной ссылке.", "Invite 5 players using your referral link.", "Запросіть 5 гравців за своїм реферальним посиланням.", "Invita 5 giocatori usando il tuo link referral.", "Invitez 5 joueurs avec votre lien de parrainage.", "Invita a 5 jugadores con tu enlace de referido.", "अपने रेफरल लिंक से 5 खिलाड़ियों को आमंत्रित करें।", "Zaproś 5 graczy przez swój link polecający.", "Lade 5 Spieler über deinen Referral-Link ein.", "Referans bağlantınla 5 oyuncu davet et."],
  ["Пригласите 10 игроков по своей реферальной ссылке.", "Invite 10 players using your referral link.", "Запросіть 10 гравців за своїм реферальним посиланням.", "Invita 10 giocatori usando il tuo link referral.", "Invitez 10 joueurs avec votre lien de parrainage.", "Invita a 10 jugadores con tu enlace de referido.", "अपने रेफरल लिंक से 10 खिलाड़ियों को आमंत्रित करें।", "Zaproś 10 graczy przez swój link polecający.", "Lade 10 Spieler über deinen Referral-Link ein.", "Referans bağlantınla 10 oyuncu davet et."],

  // Mixed-language fragments that may arrive from the server.
  ["Вы получите", "You receive", "Ви отримаєте", "Riceverai", "Vous recevrez", "Recibirás", "आप प्राप्त करेंगे", "Otrzymasz", "Du erhältst", "Alacaksınız"],
  ["награды", "rewards", "нагороди", "ricompense", "récompenses", "recompensas", "पुरस्कार", "nagrody", "Belohnungen", "ödüller"],
  ["за 3 задания", "for 3 tasks", "за 3 завдання", "per 3 missioni", "pour 3 tâches", "por 3 tareas", "3 कार्यों के लिए", "za 3 zadania", "für 3 Aufgaben", "3 görev için"],
  ["за все 6 текущих заданий", "for all 6 current tasks", "за всі 6 поточних завдань", "per tutte le 6 missioni attuali", "pour les 6 tâches actuelles", "por las 6 tareas actuales", "मौजूदा सभी 6 कार्यों के लिए", "za wszystkie 6 bieżących zadań", "für alle 6 aktuellen Aufgaben", "mevcut 6 görevin tümü için"],
  ["ежедневный бонус 7 раз", "the daily reward 7 times", "щоденний бонус 7 разів", "il bonus giornaliero 7 volte", "le bonus quotidien 7 fois", "el bono diario 7 veces", "दैनिक बोनस 7 बार", "bonus dzienny 7 razy", "den Tagesbonus 7-mal", "günlük bonusu 7 kez"],
  ["максимального динозавра", "the maximum-level dinosaur", "максимального динозавра", "il dinosauro di livello massimo", "le dinosaure de niveau maximal", "el dinosaurio de nivel máximo", "अधिकतम स्तर का डायनासोर", "dinozaura na maksymalnym poziomie", "den Dinosaurier auf Maximallevel", "maksimum seviyedeki dinozoru"],
  ["динозавра", "a dinosaur", "динозавра", "un dinosauro", "un dinosaure", "un dinosaurio", "एक डायनासोर", "dinozaura", "einen Dinosaurier", "bir dinozor"],

  // Generic fragments used by server-provided task/achievement descriptions.
  ["Соберите суммарно", "Collect a total of", "Збери загалом", "Raccogli in totale", "Collecte au total", "Recoge un total de", "कुल इकट्ठा करें", "Zbierz łącznie", "Sammle insgesamt", "Toplam topla"],
  ["Собери", "Collect", "Збери", "Raccogli", "Collecte", "Recoge", "इकट्ठा करें", "Zbierz", "Sammle", "Topla"],
  ["из гнезда", "from the nest", "із гнізда", "dal nido", "dans le nid", "del nido", "घोंसले से", "z gniazda", "aus dem Nest", "yuvadan"],
  ["динозавров", "dinosaurs", "динозаврів", "dinosauri", "dinosaures", "dinosaurios", "डायनासोर", "dinozaurów", "Dinosaurier", "dinozor"],
  ["максимального динозавра", "maximum-level dinosaur", "максимального динозавра", "dinosauro di livello massimo", "dinosaure de niveau maximal", "dinosaurio de nivel máximo", "अधिकतम स्तर का डायनासोर", "dinozaura na maksymalnym poziomie", "Dinosaurier auf Maximallevel", "maksimum seviyedeki dinozor"],
] as const;

const UI_TRANSLATION_CANDIDATES = UI_TRANSLATION_ROWS.flatMap(
  (row, rowIndex) =>
    [...new Set(row as readonly string[])].map((variant) => ({
      row,
      rowIndex,
      variant,
    })),
).sort((a, b) => b.variant.length - a.variant.length);

function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGE_OPTIONS.some((item) => item.code === value);
}

function translateUiString(value: string, language: LanguageCode) {
  if (!value.trim()) return value;

  const column = LANGUAGE_COLUMN[language];
  let translated = value;
  const matchedRows = new Set<number>();

  for (const candidate of UI_TRANSLATION_CANDIDATES) {
    if (matchedRows.has(candidate.rowIndex)) continue;

    const replacement = candidate.row[column] as string;
    if (!candidate.variant || candidate.variant === replacement) continue;
    if (!translated.includes(candidate.variant)) continue;

    translated = translated.split(candidate.variant).join(replacement);
    matchedRows.add(candidate.rowIndex);
  }

  return translated;
}

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined;

  return (window as unknown as {
    Telegram?: { WebApp?: TelegramWebApp };
  }).Telegram?.WebApp;
}

export default function GameApp() {
  const [tab, setTab] = useState<Tab>("nest");
  const [state, setState] = useState<SaveState>(INITIAL_STATE);
  const [selected, setSelected] = useState<number | null>(null);
  const [toast, setToast] = useState("Загрузка данных фермы...");
  const [playerName, setPlayerName] = useState("Dino Farmer");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showEggCollectFx, setShowEggCollectFx] = useState(false);
  const eggCollectFxTimerRef = useRef<number | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{
    source: "quick" | "shop" | "catalog";
    title: string;
    priceCoins: number;
    level?: number;
    item?: ShopItem;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeFx, setMergeFx] = useState<{
    slot: number;
    level: number;
    key: number;
  } | null>(null);
  const mergeFxTimerRef = useRef<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{
    fromSlot: number;
    toSlot: number;
    level: number;
    resultLevel: number;
    mergeFee: number;
  } | null>(null);
  const [authMode, setAuthMode] = useState<"telegram" | "demo" | "unknown">("unknown");
  const [referralInfo, setReferralInfo] = useState<ReferralResponse | null>(null);
  const [referralStatus, setReferralStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopStatus, setShopStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shopSection, setShopSection] = useState<"dinos" | "deposit">("dinos");
  const [depositStatus, setDepositStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [depositConfig, setDepositConfig] = useState<DepositConfig | null>(null);
  const [depositMethods, setDepositMethods] = useState<DepositMethodItem[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositItem[]>([]);
  const [firstDepositEligible, setFirstDepositEligible] = useState(false);
  const [depositProviderConfigured, setDepositProviderConfigured] = useState(false);
  const [depositTelegramRequired, setDepositTelegramRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState("3");
  const [depositMethodCode, setDepositMethodCode] = useState("");
  const [selectedMethodMinimumUsd, setSelectedMethodMinimumUsd] = useState<number | null>(null);
  const [minimumLoading, setMinimumLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<DepositItem | null>(null);
  const [depositConfirmationOpen, setDepositConfirmationOpen] = useState(false);
  const [depositMethodPickerOpen, setDepositMethodPickerOpen] = useState(false);
  const autoOpenDepositMethodRef = useRef<string | null>(null);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  const [dinoCatalog, setDinoCatalog] = useState<DinoCatalogItem[]>([]);
  const [dinoUnlockedLevel, setDinoUnlockedLevel] = useState(1);
  const [buyingItemCode, setBuyingItemCode] = useState<string | null>(null);
  const [nestUpgradeOpen, setNestUpgradeOpen] = useState(false);
  const [nestUpgradeStatus, setNestUpgradeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [nestUpgradeInfo, setNestUpgradeInfo] = useState<NestUpgradeInfo | null>(null);
  const [isUpgradingNest, setIsUpgradingNest] = useState(false);
  const [nestRewardsMenuOpen, setNestRewardsMenuOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dailyInfo, setDailyInfo] = useState<DailyRewardInfo | null>(null);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasksStatus, setTasksStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [claimingTaskCode, setClaimingTaskCode] = useState<string | null>(null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [achievementsStatus, setAchievementsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [claimingAchievementCode, setClaimingAchievementCode] = useState<string | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [profitPlanOpen, setProfitPlanOpen] = useState(false);
  const [farmToolsMenuOpen, setFarmToolsMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);
  const [walletHistoryStatus, setWalletHistoryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [walletHistory, setWalletHistory] = useState<WalletHistoryItem[]>([]);
  const [walletHistorySummary, setWalletHistorySummary] = useState<WalletHistorySummary | null>(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfigResponse | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawDna, setWithdrawDna] = useState("1");
  const [withdrawNetwork, setWithdrawNetwork] = useState("");
  const [withdrawWallet, setWithdrawWallet] = useState("");
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [cancelingWithdrawalId, setCancelingWithdrawalId] = useState<string | null>(null);
  const withdrawalStatusRef = useRef<Record<string, string>>({});

  const closeMenuPopups = () => {
    setProfileOpen(false);
    setWalletHistoryOpen(false);
    setWithdrawalOpen(false);
    setLevelsOpen(false);
    setProfitPlanOpen(false);
    setFarmToolsMenuOpen(false);
  };

  const closeNestRewardPopups = () => {
    setDailyOpen(false);
    setTasksOpen(false);
    setAchievementsOpen(false);
  };
  const [language, setLanguage] = useState<LanguageCode>("ru");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(0);
  const tutorialInitializedRef = useRef(false);
  const appRootRef = useRef<HTMLElement | null>(null);
  const originalUiTextRef = useRef(new WeakMap<Text, string>());
  const translatedUiTextRef = useRef(new WeakMap<Text, string>());
  const originalUiAttributeRef = useRef(new WeakMap<Element, Map<string, string>>());
  const translatedUiAttributeRef = useRef(new WeakMap<Element, Map<string, string>>());

  const tutorialCopy = TUTORIAL_COPY[language];

  const closeAllTutorialRelatedPopups = () => {
    closeMenuPopups();
    closeNestRewardPopups();
    setNestRewardsMenuOpen(false);
    setNestUpgradeOpen(false);
    setDepositMethodPickerOpen(false);
    setDepositConfirmationOpen(false);
    setLanguageMenuOpen(false);
  };

  const startTutorial = () => {
    closeAllTutorialRelatedPopups();
    setTab("nest");
    setTutorialStep(0);
    setTutorialOpen(true);
  };

  const completeTutorial = (keepRewardsOpen = false) => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    setTutorialOpen(false);
    setTutorialStep(0);
    if (!keepRewardsOpen) {
      setNestRewardsMenuOpen(false);
    }
  };

  const advanceTutorial = () => {
    if (tutorialStep === 0) {
      setTab("game");
      setTutorialStep(1);
      return;
    }

    if (tutorialStep === 1) {
      setTab("nest");
      setTutorialStep(2);
      return;
    }

    if (tutorialStep === 2) {
      setTab("nest");
      setTutorialStep(3);
      return;
    }

    setTab("nest");
    setNestRewardsMenuOpen(true);
    completeTutorial(true);
  };

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && isLanguageCode(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    if (tutorialInitializedRef.current || isLoading || loadError) return;

    tutorialInitializedRef.current = true;
    const completed = window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
    if (completed) return;

    const maxLevel = state.board.reduce<number>(
      (highest, level) =>
        typeof level === "number" ? Math.max(highest, level) : highest,
      0,
    );

    // Auto-show only for a fresh farm. Existing progressed players are not interrupted.
    if (maxLevel <= 1) {
      setTutorialStep(0);
      setTutorialOpen(true);
      setTab("nest");
    }
  }, [isLoading, loadError, state.board]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;

    const root = appRootRef.current;
    if (!root) return;

    const originalText = originalUiTextRef.current;
    const translatedText = translatedUiTextRef.current;
    const originalAttributes = originalUiAttributeRef.current;
    const translatedAttributes = translatedUiAttributeRef.current;
    const translatedAttributeNames = ["aria-label", "placeholder", "title"] as const;

    const isIgnored = (node: Node) => {
      const element = node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
      return Boolean(element?.closest('[data-i18n-ignore="true"]'));
    };

    const translateTextNode = (node: Text) => {
      if (isIgnored(node)) return;

      const currentValue = node.nodeValue ?? "";
      if (!originalText.has(node)) {
        originalText.set(node, currentValue);
      }

      const sourceValue = originalText.get(node) ?? currentValue;
      const nextValue = translateUiString(sourceValue, language);
      translatedText.set(node, nextValue);

      if (currentValue !== nextValue) {
        node.nodeValue = nextValue;
      }
    };

    const translateElementAttributes = (element: Element) => {
      if (isIgnored(element)) return;

      let sourceMap = originalAttributes.get(element);
      if (!sourceMap) {
        sourceMap = new Map<string, string>();
        originalAttributes.set(element, sourceMap);
      }

      let translatedMap = translatedAttributes.get(element);
      if (!translatedMap) {
        translatedMap = new Map<string, string>();
        translatedAttributes.set(element, translatedMap);
      }

      for (const attributeName of translatedAttributeNames) {
        const currentValue = element.getAttribute(attributeName);
        if (currentValue === null) continue;

        if (!sourceMap.has(attributeName)) {
          sourceMap.set(attributeName, currentValue);
        }

        const sourceValue = sourceMap.get(attributeName) ?? currentValue;
        const nextValue = translateUiString(sourceValue, language);
        translatedMap.set(attributeName, nextValue);

        if (currentValue !== nextValue) {
          element.setAttribute(attributeName, nextValue);
        }
      }
    };

    const translateTree = (node: Node) => {
      if (isIgnored(node)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node as Text);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const element = node as Element;
      translateElementAttributes(element);
      element.childNodes.forEach(translateTree);
    };

    translateTree(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const node = mutation.target as Text;
          if (isIgnored(node)) continue;

          const currentValue = node.nodeValue ?? "";
          const lastTranslatedValue = translatedText.get(node);
          if (currentValue !== lastTranslatedValue) {
            originalText.set(node, currentValue);
          }
          translateTextNode(node);
          continue;
        }

        if (mutation.type === "attributes") {
          const element = mutation.target as Element;
          if (isIgnored(element) || !mutation.attributeName) continue;

          const attributeName = mutation.attributeName;
          const currentValue = element.getAttribute(attributeName);
          if (currentValue === null) continue;

          let sourceMap = originalAttributes.get(element);
          if (!sourceMap) {
            sourceMap = new Map<string, string>();
            originalAttributes.set(element, sourceMap);
          }

          const translatedMap = translatedAttributes.get(element);
          const lastTranslatedValue = translatedMap?.get(attributeName);
          if (currentValue !== lastTranslatedValue) {
            sourceMap.set(attributeName, currentValue);
          }

          translateElementAttributes(element);
          continue;
        }

        mutation.addedNodes.forEach(translateTree);
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "placeholder", "title"],
    });

    return () => observer.disconnect();
  }, [language]);

  const depositPreview = useMemo(() => {
    const normalized = Number(
      depositAmount
        .trim()
        .replace(",", "."),
    );

    const amountUsd =
      Number.isFinite(normalized)
        ? normalized
        : 0;

    const coinsPerUsd =
      depositConfig?.coinsPerUsd ??
      10_000;

    const baseCoins =
      amountUsd > 0
        ? Math.round(
            amountUsd * coinsPerUsd,
          )
        : 0;

    const bonusPercent =
      firstDepositEligible
        ? depositConfig
            ?.firstDepositBonusPercent ??
          20
        : 0;

    const bonusCoins =
      Math.round(
        baseCoins *
          (bonusPercent / 100),
      );

    const networkMinimumUsd =
      typeof selectedMethodMinimumUsd === "number" &&
      Number.isFinite(selectedMethodMinimumUsd) &&
      selectedMethodMinimumUsd > 0
        ? selectedMethodMinimumUsd
        : null;

    const shortfallToMinimumUsd =
      networkMinimumUsd !== null
        ? Math.max(
            0,
            Math.ceil(
              (networkMinimumUsd - amountUsd) * 100,
            ) / 100,
          )
        : 0;

    const minimumTopUpUsd =
      networkMinimumUsd !== null
        ? Math.max(amountUsd, networkMinimumUsd)
        : amountUsd;

    return {
      amountUsd,
      baseCoins,
      bonusPercent,
      bonusCoins,
      networkMinimumUsd,
      shortfallToMinimumUsd,
      minimumTopUpUsd,
      totalCoins:
        baseCoins + bonusCoins,
      valid:
        Boolean(depositConfig) &&
        amountUsd >=
          Math.max(
            depositConfig?.minUsd ?? 3,
            selectedMethodMinimumUsd ?? 0,
          ) &&
        amountUsd <=
          (depositConfig?.maxUsd ??
            20_000),
    };
  }, [
    depositAmount,
    depositConfig,
    firstDepositEligible,
    selectedMethodMinimumUsd,
  ]);

  const eggsPerHour = useMemo(() => {
    return state.board.reduce((sum: number, level) => {
      if (!level) return sum;
      return sum + dinosaurs[level - 1].eggsPerHour;
    }, 0);
  }, [state.board]);

  const profitPlan = useMemo(() => {
    const levelCounts = Array.from(
      { length: MAX_DINOSAUR_LEVEL },
      () => 0,
    );

    let totalDinosaurs = 0;
    let dailyCoins = 0;
    let dailyDna = 0;
    let equivalentCostCoins = 0;

    for (const level of state.board) {
      if (
        !level ||
        level < 1 ||
        level > MAX_DINOSAUR_LEVEL
      ) {
        continue;
      }

      const config = getDinosaurConfig(level);
      if (!config) continue;

      levelCounts[level - 1] += 1;
      totalDinosaurs += 1;
      dailyCoins += config.dailyCoins;
      dailyDna += config.dailyDna;
      equivalentCostCoins += config.equivalentCostCoins;
    }

    const paybackDays =
      dailyCoins > 0
        ? equivalentCostCoins / dailyCoins
        : 0;

    return {
      levelCounts,
      totalDinosaurs,
      dailyCoins,
      dailyDna,
      equivalentCostCoins,
      paybackDays,
    };
  }, [state.board]);

  useEffect(() => {
    let cancelled = false;

    async function authenticateTelegramIfAvailable() {
      const webApp = getTelegramWebApp();
      const initData = webApp?.initData?.trim() ?? "";

      if (!initData) {
        return false;
      }

      webApp?.ready?.();
      webApp?.expand?.();

      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Telegram auth failed");
      }

      return true;
    }

    async function loadGameState() {
      try {
        const telegramAuthenticated = await authenticateTelegramIfAvailable();

        const response = await fetch("/api/game-state", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as GameStateResponse;

        if (cancelled) return;

        const board = Array.isArray(data.board) && data.board.length === 16
          ? data.board
          : [...EMPTY_BOARD];

        const initialEggsPerHour = board.reduce(
          (sum: number, level) => {
            if (!level) return sum;
            return (
              sum +
              (getDinosaurConfig(level)?.eggsPerHour ?? 0)
            );
          },
          0,
        );

        const lastProductionAtMs =
          data.nest.lastProductionAt
            ? new Date(
                data.nest.lastProductionAt,
              ).getTime()
            : Date.now();

        const elapsedHours =
          Number.isFinite(lastProductionAtMs)
            ? Math.max(
                0,
                Date.now() - lastProductionAtMs,
              ) / 3_600_000
            : 0;

        const accumulatedEggs = Math.min(
          data.nest.capacity,
          data.nest.currentEggs +
            initialEggsPerHour * elapsedHours,
        );

        setState({
          coins: data.balance.coins,
          dna: data.balance.dna,
          eggs: accumulatedEggs,
          capacity: data.nest.capacity,
          board,
          lastTick: Date.now(),
        });

        const name =
          data.user.firstName?.trim() ||
          data.user.username?.trim() ||
          "Dino Farmer";

        setPlayerName(name);
        setAuthMode(
          telegramAuthenticated || data.session?.authenticated
            ? "telegram"
            : "demo",
        );
        setLoadError(null);
        setToast(
          telegramAuthenticated || data.session?.authenticated
            ? "Telegram подтверждён · данные загружены из Neon ✓"
            : "Demo-режим · данные загружены из Neon ✓",
        );
      } catch (error) {
        console.error("Failed to initialize player", error);

        if (cancelled) return;

        setLoadError("Не удалось авторизовать или загрузить игрока");
        setToast(
          error instanceof Error
            ? `Ошибка: ${error.message}`
            : "Ошибка Telegram / Neon",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadGameState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast("");
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (isLoading || loadError) return;

    const timer = window.setInterval(() => {
      setState((previous) => {
        const now = Date.now();
        const elapsedHours = Math.max(0, now - previous.lastTick) / 3_600_000;
        const produced = eggsPerHour * elapsedHours;

        return {
          ...previous,
          eggs: Math.min(previous.capacity, previous.eggs + produced),
          lastTick: now,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [eggsPerHour, isLoading, loadError]);

  useEffect(() => {
    return () => {
      if (eggCollectFxTimerRef.current !== null) {
        window.clearTimeout(eggCollectFxTimerRef.current);
      }
    };
  }, []);

  const collectEggs = async () => {
    if (isCollecting) return;

    setIsCollecting(true);
    setToast("Собираем яйца на сервере...");

    try {
      const response = await fetch("/api/collect-eggs", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      const raw = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(`API вернул не JSON (HTTP ${response.status})`);
      }

      const data = JSON.parse(raw) as {
        ok?: boolean;
        error?: string;
        message?: string;
        collectedEggs?: number;
        coinsReward?: number;
        dnaReward?: number;
        coins?: number;
        dna?: number;
        currentEggs?: number;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Не удалось собрать яйца");
      }

      setState((previous) => ({
        ...previous,
        coins: data.coins ?? previous.coins,
        dna: data.dna ?? previous.dna,
        eggs: data.currentEggs ?? 0,
        lastTick: Date.now(),
      }));

      if (eggCollectFxTimerRef.current !== null) {
        window.clearTimeout(eggCollectFxTimerRef.current);
      }

      setShowEggCollectFx(true);
      eggCollectFxTimerRef.current = window.setTimeout(() => {
        setShowEggCollectFx(false);
        eggCollectFxTimerRef.current = null;
      }, 1250);

      setToast(
        `Собрано ${formatNumber(data.collectedEggs ?? 0, 0)} яиц: +${formatNumber(data.coinsReward ?? 0)} Coins и +${formatNumber(data.dnaReward ?? 0)} DNA ✓`,
      );

      if (tutorialOpen && tutorialStep === 2) {
        setTutorialStep(3);
      }
    } catch (error) {
      console.error("Failed to collect eggs", error);
      setToast(error instanceof Error ? error.message : "Ошибка сбора яиц");
    } finally {
      setIsCollecting(false);
    }
  };

  const executeBuyDino = async (level = 1) => {
    if (isBuying) return;

    setIsBuying(true);
    setToast("Покупаем динозавра на сервере...");

    try {
      const response = await fetch("/api/buy-dino", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ level }),
        cache: "no-store",
        credentials: "include",
      });

      const raw = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(`API вернул не JSON (HTTP ${response.status})`);
      }

      const data = JSON.parse(raw) as {
        ok?: boolean;
        error?: string;
        message?: string;
        coins?: number;
        price?: number;
        dinosaur?: {
          id: string;
          level: number;
          boardSlot: number | null;
        };
        board?: Slot[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Не удалось купить динозавра");
      }

      setState((previous) => ({
        ...previous,
        coins: data.coins ?? previous.coins,
        board:
          Array.isArray(data.board) && data.board.length === 16
            ? data.board
            : previous.board,
      }));

      setSelected(null);
      setToast(
        `Динозавр Lv.${data.dinosaur?.level ?? level} куплен за ${formatNumber(
          data.price ??
            getDinosaurConfig(level)?.buyPrice ??
            0,
          0,
        )} Coins ✓`,
      );
    } catch (error) {
      console.error("Failed to buy dinosaur", error);
      setToast(error instanceof Error ? error.message : "Ошибка покупки динозавра");
    } finally {
      setIsBuying(false);
    }
  };

  const buyDino = () => {
    if (isBuying || buyingItemCode) return;

    const priceCoins = gameConfig.levelOnePriceCoins;

    if (!state.board.some((slot) => slot === null)) {
      setToast("На игровой доске нет свободной клетки.");
      return;
    }

    if (state.coins < priceCoins) {
      setToast(
        `Для покупки Lv.1 нужно ${formatNumber(priceCoins, 0)} Coins`,
      );
      return;
    }

    setPendingPurchase({
      source: "quick",
      title: "Динозавр Lv.1",
      priceCoins,
      level: 1,
    });
  };

  const moveDinosaur = async (
    fromSlot: number,
    toSlot: number,
  ) => {
    if (isMoving || isMerging) return;

    setIsMoving(true);
    setToast("Перемещаем динозавра...");

    try {
      const response = await fetch(
        "/api/move-dino",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromSlot,
            toSlot,
          }),
          cache: "no-store",
          credentials: "include",
        },
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        moved?: {
          id: string;
          level: number;
          boardSlot: number | null;
        };
        board?: Slot[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось переместить динозавра",
        );
      }

      setState((previous) => ({
        ...previous,
        board:
          Array.isArray(data.board) &&
          data.board.length === 16
            ? data.board
            : previous.board,
      }));

      setSelected(null);
      setToast(
        `🦖 Lv.${data.moved?.level ?? "?"} перемещён в клетку ${toSlot + 1} ✓`,
      );
    } catch (error) {
      console.error(
        "Failed to move dinosaur",
        error,
      );
      setSelected(null);
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка перемещения",
      );
    } finally {
      setIsMoving(false);
    }
  };

  const chooseSlot = async (index: number) => {
    if (isMerging || isMoving) return;

    const level = state.board[index];

    if (!level) {
      if (selected !== null) {
        await moveDinosaur(
          selected,
          index,
        );
      } else {
        setSelected(null);
      }
      return;
    }

    if (selected === null) {
      setSelected(index);
      setToast(
        `Выбран динозавр Lv.${level}. Нажмите пустую клетку для перемещения или такого же динозавра для merge.`,
      );
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const firstLevel = state.board[selected];

    if (firstLevel !== level) {
      setSelected(index);
      setToast(
        `Выбран Lv.${level}. Для merge нужен второй Lv.${level}, либо нажмите пустую клетку для перемещения.`,
      );
      return;
    }

    if (level >= MAX_DINOSAUR_LEVEL) {
      setSelected(null);
      setToast("Level 16 — максимальный уровень");
      return;
    }

    const resultConfig = getDinosaurConfig(level + 1);
    const mergeFee = resultConfig?.mergeFeeCoins ?? 0;

    if (state.coins < mergeFee) {
      setSelected(null);
      setToast(
        `Для merge в Lv.${level + 1} нужно ${formatNumber(mergeFee, 0)} Coins`,
      );
      return;
    }

    setPendingMerge({
      fromSlot: selected,
      toSlot: index,
      level,
      resultLevel: level + 1,
      mergeFee,
    });
  };

  const cancelMerge = () => {
    if (isMerging) return;
    setPendingMerge(null);
    setSelected(null);
  };

  const triggerMergeCelebration = (slot: number, level: number) => {
    if (mergeFxTimerRef.current !== null) {
      window.clearTimeout(mergeFxTimerRef.current);
    }

    setMergeFx({
      slot,
      level,
      key: Date.now(),
    });

    const webApp = getTelegramWebApp();
    webApp?.HapticFeedback?.notificationOccurred?.("success");

    mergeFxTimerRef.current = window.setTimeout(() => {
      setMergeFx(null);
      mergeFxTimerRef.current = null;
    }, 1450);
  };

  useEffect(() => {
    return () => {
      if (mergeFxTimerRef.current !== null) {
        window.clearTimeout(mergeFxTimerRef.current);
      }
    };
  }, []);

  const confirmMerge = async () => {
    if (!pendingMerge || isMerging) return;

    const {
      fromSlot,
      toSlot,
      resultLevel,
      mergeFee,
    } = pendingMerge;

    if (state.coins < mergeFee) {
      setPendingMerge(null);
      setSelected(null);
      setToast(
        `Для merge в Lv.${resultLevel} нужно ${formatNumber(mergeFee, 0)} Coins`,
      );
      return;
    }

    setIsMerging(true);
    setToast("Объединяем динозавров на сервере...");

    try {
      const response = await fetch("/api/merge-dino", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromSlot, toSlot }),
        cache: "no-store",
        credentials: "include",
      });

      const raw = await response.text();
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(`API вернул не JSON (HTTP ${response.status})`);
      }

      const data = JSON.parse(raw) as {
        ok?: boolean;
        error?: string;
        message?: string;
        merged?: { id: string; level: number; boardSlot: number | null };
        mergeFee?: number;
        coins?: number;
        board?: Slot[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Не удалось выполнить merge");
      }

      setState((previous) => ({
        ...previous,
        coins: data.coins ?? previous.coins,
        board:
          Array.isArray(data.board) && data.board.length === 16
            ? data.board
            : previous.board,
      }));

      const mergedLevel = data.merged?.level ?? resultLevel;
      const mergedSlot =
        typeof data.merged?.boardSlot === "number"
          ? data.merged.boardSlot
          : toSlot;

      triggerMergeCelebration(mergedSlot, mergedLevel);

      setToast(
        `MERGE ✓ Lv.${mergedLevel} · комиссия ${formatNumber(
          data.mergeFee ?? mergeFee,
          0,
        )} Coins`,
      );

      if (tutorialOpen && tutorialStep === 1) {
        window.setTimeout(() => {
          setTab("nest");
          setTutorialStep(2);
        }, 1150);
      }
    } catch (error) {
      console.error("Failed to merge dinosaur", error);
      setToast(error instanceof Error ? error.message : "Ошибка merge");
    } finally {
      setPendingMerge(null);
      setSelected(null);
      setIsMerging(false);
    }
  };

  useEffect(() => {
    if (tab !== "friends" || authMode !== "telegram") {
      return;
    }

    let cancelled = false;

    async function loadReferrals() {
      setReferralStatus("loading");

      try {
        const response = await fetch("/api/referrals", {
          cache: "no-store",
          credentials: "include",
        });

        const data = (await response.json()) as ReferralResponse & {
          error?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Не удалось загрузить рефералов");
        }

        if (cancelled) return;
        setReferralInfo(data);
        setReferralStatus("ready");
      } catch (error) {
        console.error("Failed to load referrals", error);
        if (cancelled) return;
        setReferralStatus("error");
      }
    }

    void loadReferrals();

    return () => {
      cancelled = true;
    };
  }, [tab, authMode]);

  const inviteFriend = async () => {
    const inviteLink = referralInfo?.inviteLink;

    if (!inviteLink) {
      if (authMode !== "telegram") {
        setToast("Откройте игру через Telegram, чтобы получить реферальную ссылку");
      } else {
        setToast("Реферальная ссылка пока недоступна");
      }
      return;
    }

    const shareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}` +
      `&text=${encodeURIComponent("Присоединяйся к моей ферме динозавров 🦖")}`;

    const webApp = getTelegramWebApp();

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
      setToast("Открыто меню отправки приглашения ✓");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setToast("Реферальная ссылка скопирована ✓");
    } catch {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  const loadDeposits = async (
    silent = false,
  ) => {
    if (!silent) {
      setDepositStatus("loading");
    }

    try {
      const response = await fetch(
        "/api/deposits",
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as
          DepositLoadResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось загрузить пополнения",
        );
      }

      setDepositConfig(
        data.config ?? null,
      );
      setDepositMethods(
        Array.isArray(data.methods)
          ? data.methods
          : [],
      );
      setDepositHistory(
        Array.isArray(data.deposits)
          ? data.deposits
          : [],
      );
      setFirstDepositEligible(
        Boolean(
          data.firstDepositEligible,
        ),
      );
      setDepositProviderConfigured(
        Boolean(
          data.providerConfigured,
        ),
      );
      setDepositTelegramRequired(
        Boolean(
          data.telegramRequired,
        ),
      );

      if (!depositMethodCode) {
        const firstAvailable =
          data.methods?.find(
            (method) =>
              method.available,
          );

        if (firstAvailable) {
          setDepositMethodCode(
            firstAvailable.code,
          );
        }
      }

      setDepositStatus("ready");
    } catch (error) {
      console.error(
        "Failed to load deposits",
        error,
      );

      setDepositStatus("error");

      if (!silent) {
        setToast(
          error instanceof Error
            ? error.message
            : "Ошибка пополнений",
        );
      }
    }
  };

  const loadSelectedMethodMinimum =
    async (methodCode: string) => {
      if (!methodCode) {
        setSelectedMethodMinimumUsd(
          null,
        );
        return;
      }

      setMinimumLoading(true);
      setSelectedMethodMinimumUsd(
        null,
      );

      try {
        const response = await fetch(
          `/api/deposits/minimum?methodCode=${encodeURIComponent(
            methodCode,
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        const data =
          (await response.json()) as {
            ok?: boolean;
            minimumUsd?:
              | number
              | null;
            error?: string;
            message?: string;
          };

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Не удалось получить минимум",
          );
        }

        const resolvedMinimumUsd =
          typeof data.minimumUsd ===
              "number" &&
            Number.isFinite(
              data.minimumUsd,
            ) &&
            data.minimumUsd > 0
            ? data.minimumUsd
            : null;

        setSelectedMethodMinimumUsd(
          resolvedMinimumUsd,
        );

        if (
          autoOpenDepositMethodRef.current ===
          methodCode
        ) {
          autoOpenDepositMethodRef.current =
            null;

          if (
            resolvedMinimumUsd !== null &&
            !isCreatingDeposit &&
            depositConfig &&
            resolvedMinimumUsd >=
              depositConfig.minUsd &&
            resolvedMinimumUsd <=
              depositConfig.maxUsd &&
            !depositTelegramRequired &&
            depositProviderConfigured
          ) {
            setDepositAmount(
              resolvedMinimumUsd.toFixed(2),
            );
            setDepositConfirmationOpen(true);
          }
        }
      } catch (error) {
        console.error(
          "Failed to load selected method minimum",
          error,
        );

        setSelectedMethodMinimumUsd(
          null,
        );
        autoOpenDepositMethodRef.current =
          null;
      } finally {
        setMinimumLoading(false);
      }
    };

  useEffect(() => {
    if (
      tab !== "shop" ||
      shopSection !== "deposit" ||
      !depositMethodCode
    ) {
      return;
    }

    void loadSelectedMethodMinimum(
      depositMethodCode,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    shopSection,
    depositMethodCode,
  ]);

  const confirmCreateDeposit = async () => {
    if (
      isCreatingDeposit ||
      !depositPreview.valid ||
      !depositMethodCode
    ) {
      return;
    }

    setIsCreatingDeposit(true);

    try {
      const response = await fetch(
        "/api/deposits",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amountUsd:
              depositPreview.amountUsd,
            methodCode:
              depositMethodCode,
          }),
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          deposit?: DepositItem;
          error?: string;
          message?: string;
          minimumUsd?: number;
        };

      if (
        !response.ok ||
        !data.ok ||
        !data.deposit
      ) {
        if (
          data.error ===
            "MINIMUM_PAYMENT_AMOUNT" &&
          Number.isFinite(
            data.minimumUsd,
          ) &&
          (data.minimumUsd ?? 0) > 0
        ) {
          const minimum =
            data.minimumUsd as number;

          setSelectedMethodMinimumUsd(
            minimum,
          );

          throw new Error(
            data.message ||
              `Минимальная сумма сейчас $${minimum.toFixed(
                2,
              )}.`,
          );
        }

        throw new Error(
          data.message ||
            data.error ||
            "Не удалось создать платёж",
        );
      }

      setActiveDeposit(
        data.deposit,
      );
      setDepositConfirmationOpen(
        false,
      );
      setToast(
        "Платёж создан. Отправьте точную сумму на указанный адрес.",
      );

      await loadDeposits(true);
    } catch (error) {
      console.error(
        "Failed to create deposit",
        error,
      );

      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка создания платежа",
      );
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  const checkDeposit = async (
    deposit: DepositItem,
    silent = false,
  ) => {
    if (isCheckingDeposit) {
      return;
    }

    if (!silent) {
      setIsCheckingDeposit(true);
    }

    try {
      const response = await fetch(
        `/api/deposits/status?id=${encodeURIComponent(
          deposit.id,
        )}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          credited?: boolean;
          deposit?: DepositItem;
          balance?: {
            coins: number;
          } | null;
          error?: string;
          message?: string;
        };

      if (
        !response.ok ||
        !data.ok ||
        !data.deposit
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось проверить платёж",
        );
      }

      const previousStatus =
        deposit.status;

      setActiveDeposit(
        data.deposit,
      );

      if (
        data.balance &&
        Number.isFinite(
          data.balance.coins,
        )
      ) {
        setState((previous) => ({
          ...previous,
          coins:
            data.balance?.coins ??
            previous.coins,
        }));
      }

      if (
        data.deposit.status ===
        "FINISHED"
      ) {
        if (
          previousStatus !==
            "FINISHED" ||
          data.credited
        ) {
          setToast(
            `✅ Пополнение зачислено: +${formatNumber(
              data.deposit
                .creditedCoins,
              0,
            )} Coins`,
          );
        }
      } else if (!silent) {
        const status =
          depositStatusMeta(
            data.deposit.status,
          );

        setToast(
          `${status.icon} ${status.label}`,
        );
      }

      await loadDeposits(true);
    } catch (error) {
      console.error(
        "Failed to check deposit",
        error,
      );

      if (!silent) {
        setToast(
          error instanceof Error
            ? error.message
            : "Ошибка проверки платежа",
        );
      }
    } finally {
      if (!silent) {
        setIsCheckingDeposit(false);
      }
    }
  };


  const isDepositFinalStatus = (
    status: string,
  ) => {
    const normalized =
      status.toUpperCase();

    return [
      "FINISHED",
      "FAILED",
      "EXPIRED",
      "REFUNDED",
      "CREATE_FAILED",
    ].includes(normalized);
  };

  useEffect(() => {
    if (
      tab !== "shop" ||
      shopSection !== "deposit" ||
      !activeDeposit ||
      isDepositFinalStatus(
        activeDeposit.status,
      )
    ) {
      return;
    }

    let cancelled = false;
    let running = false;

    const poll = async () => {
      if (
        cancelled ||
        running
      ) {
        return;
      }

      running = true;

      try {
        await checkDeposit(
          activeDeposit,
          true,
        );
      } finally {
        running = false;
      }
    };

    const firstTimer =
      window.setTimeout(
        () => {
          void poll();
        },
        5000,
      );

    const interval =
      window.setInterval(
        () => {
          void poll();
        },
        15000,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        firstTimer,
      );
      window.clearInterval(
        interval,
      );
    };
    // activeDeposit.status intentionally restarts polling
    // when the provider advances to the next status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    shopSection,
    activeDeposit?.id,
    activeDeposit?.status,
  ]);

  const copyDepositValue = async (
    value: string,
    label: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        value,
      );
      setToast(`${label} скопирован ✓`);
    } catch {
      setToast(
        `Не удалось скопировать ${label.toLowerCase()}`,
      );
    }
  };

  useEffect(() => {
    if (
      tab !== "shop" ||
      shopSection !== "deposit"
    ) {
      return;
    }

    void loadDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shopSection]);

  useEffect(() => {
    if (tab !== "shop") return;

    let cancelled = false;

    async function loadShop() {
      setShopStatus("loading");

      try {
        const response = await fetch(
          "/api/buy-dino",
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        const data = (await response.json()) as {
          ok?: boolean;
          catalog?: DinoCatalogItem[];
          unlockedLevel?: number;
          error?: string;
          message?: string;
        };

        if (
          !response.ok ||
          !data.ok ||
          !Array.isArray(data.catalog)
        ) {
          throw new Error(
            data.message ||
              data.error ||
              "Не удалось загрузить магазин",
          );
        }

        if (cancelled) return;

        setDinoCatalog(data.catalog);
        setDinoUnlockedLevel(
          data.unlockedLevel ?? 1,
        );
        setShopStatus("ready");
      } catch (error) {
        console.error(
          "Failed to load dinosaur shop",
          error,
        );

        if (cancelled) return;

        setShopStatus("error");
        setToast(
          error instanceof Error
            ? error.message
            : "Ошибка магазина",
        );
      }
    }

    void loadShop();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const loadNestUpgrades = async () => {
    setNestUpgradeStatus("loading");

    try {
      const response = await fetch("/api/nest-upgrade", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        currentCapacity?: number;
        coins?: number;
        maxCapacity?: number;
        nextUpgrade?: NestUpgradeInfo["nextUpgrade"];
        tiers?: NestUpgradeInfo["tiers"];
      };

      if (
        !response.ok ||
        !data.ok ||
        typeof data.currentCapacity !== "number" ||
        typeof data.coins !== "number" ||
        typeof data.maxCapacity !== "number" ||
        !Array.isArray(data.tiers)
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось загрузить улучшения гнезда",
        );
      }

      const info: NestUpgradeInfo = {
        currentCapacity: data.currentCapacity,
        coins: data.coins,
        maxCapacity: data.maxCapacity,
        nextUpgrade: data.nextUpgrade ?? null,
        tiers: data.tiers,
      };

      setNestUpgradeInfo(info);
      setState((previous) => ({
        ...previous,
        coins: info.coins,
        capacity: info.currentCapacity,
      }));
      setNestUpgradeStatus("ready");
    } catch (error) {
      console.error(
        "Failed to load nest upgrades",
        error,
      );
      setNestUpgradeStatus("error");
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки улучшений гнезда",
      );
    }
  };

  const openNestUpgrades = () => {
    setNestRewardsMenuOpen(false);
    closeNestRewardPopups();
    setNestUpgradeOpen(true);
    void loadNestUpgrades();
  };

  const upgradeNest = async () => {
    if (
      isUpgradingNest ||
      !nestUpgradeInfo?.nextUpgrade
    ) {
      return;
    }

    setIsUpgradingNest(true);
    setToast("Улучшаем гнездо...");

    try {
      const response = await fetch("/api/nest-upgrade", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        paidCoins?: number;
        coins?: number;
        capacity?: number;
        nextUpgrade?: NestUpgradeInfo["nextUpgrade"];
      };

      if (
        !response.ok ||
        !data.ok ||
        typeof data.coins !== "number" ||
        typeof data.capacity !== "number"
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось улучшить гнездо",
        );
      }

      setState((previous) => ({
        ...previous,
        coins: data.coins ?? previous.coins,
        capacity:
          data.capacity ?? previous.capacity,
      }));

      setNestUpgradeInfo((previous) =>
        previous
          ? {
              ...previous,
              coins: data.coins ?? previous.coins,
              currentCapacity:
                data.capacity ??
                previous.currentCapacity,
              nextUpgrade:
                data.nextUpgrade ?? null,
              tiers: previous.tiers.map((tier) => ({
                ...tier,
                reached:
                  (data.capacity ??
                    previous.currentCapacity) >=
                  tier.capacity,
              })),
            }
          : previous,
      );

      setToast(
        `🪺 Гнездо: ${formatNumber(
          data.capacity,
          0,
        )} яиц · −${formatNumber(
          data.paidCoins ?? 0,
          0,
        )} Coins`,
      );
    } catch (error) {
      console.error(
        "Failed to upgrade nest",
        error,
      );
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка улучшения гнезда",
      );
    } finally {
      setIsUpgradingNest(false);
    }
  };

  const buyCatalogDino = (
    item: DinoCatalogItem,
  ) => {
    if (isBuying || buyingItemCode) return;

    if (!item.unlocked) {
      setToast(
        item.unlockRequirement ||
          `Сначала получите Lv.${item.level} через merge`,
      );
      return;
    }

    if (
      !state.board.some(
        (slot) => slot === null,
      )
    ) {
      setToast(
        "На игровой доске нет свободной клетки.",
      );
      return;
    }

    if (state.coins < item.priceCoins) {
      setToast(
        `Для покупки Lv.${item.level} нужно ${formatNumber(
          item.priceCoins,
          0,
        )} Coins`,
      );
      return;
    }

    setPendingPurchase({
      source: "catalog",
      title: item.title,
      priceCoins: item.priceCoins,
      level: item.level,
    });
  };

  const executeBuyShopItem = async (item: ShopItem) => {
    if (buyingItemCode) return;

    setBuyingItemCode(item.code);
    setToast(`Покупаем «${item.title}» на сервере...`);

    try {
      const response = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCode: item.code }),
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        item?: {
          code: string;
          title: string;
          kind: string;
          amount: number;
          priceCoins: number;
        };
        balance?: { coins: number; dna: number };
        nest?: { capacity: number };
        board?: Slot[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Не удалось совершить покупку");
      }

      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
        dna: data.balance?.dna ?? previous.dna,
        capacity: data.nest?.capacity ?? previous.capacity,
        board:
          Array.isArray(data.board) && data.board.length === 16
            ? data.board
            : previous.board,
      }));

      setSelected(null);
      setToast(`«${data.item?.title ?? item.title}» куплено за ${formatNumber(data.item?.priceCoins ?? item.priceCoins, 0)} Coins ✓`);
    } catch (error) {
      console.error("Failed to buy shop item", error);
      setToast(error instanceof Error ? error.message : "Ошибка покупки");
    } finally {
      setBuyingItemCode(null);
    }
  };

  const buyShopItem = (item: ShopItem) => {
    if (buyingItemCode || isBuying) return;

    if (item.kind === "DINO" && !state.board.some((slot) => slot === null)) {
      setToast("На игровой доске нет свободной клетки.");
      return;
    }

    if (state.coins < item.priceCoins) {
      setToast(
        `Для покупки нужно ${formatNumber(item.priceCoins, 0)} Coins`,
      );
      return;
    }

    setPendingPurchase({
      source: "shop",
      title: item.title,
      priceCoins: item.priceCoins,
      item,
    });
  };

  const cancelPurchase = () => {
    if (isBuying || buyingItemCode) return;
    setPendingPurchase(null);
  };

  const confirmPurchase = async () => {
    if (!pendingPurchase || isBuying || buyingItemCode) return;

    if (state.coins < pendingPurchase.priceCoins) {
      setPendingPurchase(null);
      setToast(
        `Недостаточно Coins. Нужно ${formatNumber(
          pendingPurchase.priceCoins,
          0,
        )} Coins`,
      );
      return;
    }

    try {
      if (
        pendingPurchase.source === "shop" &&
        pendingPurchase.item
      ) {
        await executeBuyShopItem(
          pendingPurchase.item,
        );
      } else {
        await executeBuyDino(
          pendingPurchase.level ?? 1,
        );
      }
    } finally {
      setPendingPurchase(null);
    }
  };


  const loadWalletHistory = async () => {
    if (authMode !== "telegram") {
      setToast(
        "История баланса доступна только через Telegram.",
      );
      return;
    }

    setWalletHistoryStatus(
      "loading",
    );

    try {
      const response = await fetch(
        "/api/wallet-history",
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          summary?:
            WalletHistorySummary;
          items?:
            WalletHistoryItem[];
          error?: string;
          message?: string;
        };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось загрузить историю баланса",
        );
      }

      setWalletHistory(
        Array.isArray(data.items)
          ? data.items
          : [],
      );

      setWalletHistorySummary(
        data.summary ?? null,
      );

      setWalletHistoryStatus(
        "ready",
      );
    } catch (error) {
      console.error(
        "Failed to load wallet history",
        error,
      );

      setWalletHistoryStatus(
        "error",
      );

      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки истории баланса",
      );
    }
  };

  const openWalletHistory = () => {
    if (authMode !== "telegram") {
      setToast(
        "История баланса доступна только через Telegram.",
      );
      return;
    }

    closeMenuPopups();
    setWalletHistoryOpen(true);
    void loadWalletHistory();
  };

  const loadProfile = async () => {
    if (authMode !== "telegram") {
      setToast("Профиль доступен только через Telegram.");
      return;
    }

    setProfileStatus("loading");

    try {
      const response = await fetch("/api/profile", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } & Partial<PlayerProfile>;

      if (
        !response.ok ||
        !data.ok ||
        !data.player ||
        !data.farm ||
        !data.progress ||
        !data.referrals ||
        !data.withdrawals ||
        !data.balance
      ) {
        throw new Error(
          data.message || data.error || "Не удалось загрузить профиль",
        );
      }

      setProfile(data as PlayerProfile);
      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
        dna: data.balance?.dna ?? previous.dna,
      }));
      setProfileStatus("ready");
    } catch (error) {
      console.error("Failed to load profile", error);
      setProfileStatus("error");
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки профиля",
      );
    }
  };

  const openProfile = () => {
    if (authMode !== "telegram") {
      setToast("Профиль доступен только через Telegram.");
      return;
    }

    closeMenuPopups();
    setProfileOpen(true);
    void loadProfile();
  };

  const loadAchievements = async () => {
    if (authMode !== "telegram") {
      setToast(
        "Достижения доступны только через Telegram.",
      );
      return;
    }

    setAchievementsStatus("loading");

    try {
      const response = await fetch("/api/achievements", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        achievements?: AchievementItem[];
        balance?: {
          coins: number;
        };
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось загрузить достижения",
        );
      }

      setAchievements(
        Array.isArray(data.achievements)
          ? data.achievements
          : [],
      );

      setState((previous) => ({
        ...previous,
        coins:
          data.balance?.coins ?? previous.coins,
      }));

      setAchievementsStatus("ready");
    } catch (error) {
      console.error(
        "Failed to load achievements",
        error,
      );
      setAchievementsStatus("error");
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки достижений",
      );
    }
  };

  const openAchievements = () => {
    if (authMode !== "telegram") {
      setToast(
        "Достижения доступны только через Telegram.",
      );
      return;
    }

    closeMenuPopups();
    closeNestRewardPopups();
    setNestRewardsMenuOpen(false);
    setAchievementsOpen(true);
    void loadAchievements();
  };

  const claimAchievement = async (
    achievement: AchievementItem,
  ) => {
    if (
      claimingAchievementCode ||
      !achievement.claimable
    ) {
      return;
    }

    setClaimingAchievementCode(achievement.code);
    setToast("Получаем награду за достижение...");

    try {
      const response = await fetch(
        "/api/achievements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            achievementCode: achievement.code,
          }),
          cache: "no-store",
          credentials: "include",
        },
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        rewardCoins?: number;
        balance?: {
          coins: number;
        };
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось получить награду",
        );
      }

      setState((previous) => ({
        ...previous,
        coins:
          data.balance?.coins ?? previous.coins,
      }));

      setToast(
        `🏅 Достижение получено: +${formatNumber(
          data.rewardCoins ?? achievement.rewardCoins,
          0,
        )} Coins`,
      );

      await loadAchievements();
    } catch (error) {
      console.error(
        "Failed to claim achievement",
        error,
      );
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка получения достижения",
      );
    } finally {
      setClaimingAchievementCode(null);
    }
  };

  const loadTasks = async () => {
    if (authMode !== "telegram") {
      setToast("Задания доступны только через Telegram.");
      return;
    }

    setTasksStatus("loading");

    try {
      const response = await fetch("/api/tasks", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        tasks?: TaskItem[];
        balance?: { coins: number };
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || "Не удалось загрузить задания",
        );
      }

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
      }));
      setTasksStatus("ready");
    } catch (error) {
      console.error("Failed to load tasks", error);
      setTasksStatus("error");
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки заданий",
      );
    }
  };

  const openTasks = () => {
    if (authMode !== "telegram") {
      setToast("Задания доступны только через Telegram.");
      return;
    }

    closeMenuPopups();
    closeNestRewardPopups();
    setNestRewardsMenuOpen(false);
    setTasksOpen(true);
    void loadTasks();
  };

  const claimTask = async (task: TaskItem) => {
    if (claimingTaskCode || !task.claimable) return;

    setClaimingTaskCode(task.code);
    setToast("Получаем награду за задание...");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskCode: task.code }),
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        rewardCoins?: number;
        balance?: { coins: number };
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || "Не удалось получить награду",
        );
      }

      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
      }));

      setToast(
        `✅ Задание выполнено: +${formatNumber(
          data.rewardCoins ?? task.rewardCoins,
          0,
        )} Coins`,
      );

      await loadTasks();
    } catch (error) {
      console.error("Failed to claim task", error);
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка получения награды",
      );
    } finally {
      setClaimingTaskCode(null);
    }
  };

  const loadDailyReward = async () => {
    if (authMode !== "telegram") {
      setToast("Ежедневный бонус доступен только через Telegram.");
      return;
    }

    setDailyStatus("loading");

    try {
      const response = await fetch("/api/daily-reward", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as DailyRewardInfo & {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || "Не удалось загрузить ежедневный бонус",
        );
      }

      setDailyInfo(data);
      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
      }));
      setDailyStatus("ready");
    } catch (error) {
      console.error("Failed to load daily reward", error);
      setDailyStatus("error");
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки ежедневного бонуса",
      );
    }
  };

  const openDailyReward = () => {
    if (authMode !== "telegram") {
      setToast("Ежедневный бонус доступен только через Telegram.");
      return;
    }

    closeMenuPopups();
    closeNestRewardPopups();
    setNestRewardsMenuOpen(false);
    setDailyOpen(true);
    void loadDailyReward();
  };

  const claimDailyReward = async () => {
    if (isClaimingDaily) return;

    setIsClaimingDaily(true);
    setToast("Получаем ежедневный бонус...");

    try {
      const response = await fetch("/api/daily-reward", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as DailyRewardInfo & {
        ok?: boolean;
        error?: string;
        message?: string;
        claimedCoins?: number;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || "Не удалось получить бонус",
        );
      }

      setDailyInfo(data);
      setState((previous) => ({
        ...previous,
        coins: data.balance?.coins ?? previous.coins,
      }));

      setToast(
        `🎁 Ежедневный бонус: +${formatNumber(data.claimedCoins ?? 0, 0)} Coins`,
      );
    } catch (error) {
      console.error("Failed to claim daily reward", error);
      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка получения ежедневного бонуса",
      );

      void loadDailyReward();
    } finally {
      setIsClaimingDaily(false);
    }
  };

  const loadWithdrawals = async (
    silent = false,
  ) => {
    if (authMode !== "telegram") {
      if (!silent) {
        setToast(
          "Вывод доступен только при входе через Telegram.",
        );
      }
      return;
    }

    if (!silent) {
      setWithdrawalStatus(
        "loading",
      );
    }

    try {
      const response = await fetch(
        "/api/withdrawals",
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          config?:
            WithdrawalConfigResponse;
          balance?: {
            dna: number;
          };
          withdrawals?:
            WithdrawalItem[];
        };

      if (
        !response.ok ||
        !data.ok ||
        !data.config
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось загрузить вывод",
        );
      }

      const nextWithdrawals =
        Array.isArray(
          data.withdrawals,
        )
          ? data.withdrawals
          : [];

      if (silent) {
        for (
          const item of
          nextWithdrawals
        ) {
          const previousStatus =
            withdrawalStatusRef
              .current[item.id];

          if (
            previousStatus &&
            previousStatus !==
              item.status
          ) {
            const meta =
              withdrawalStatusMeta(
                item.status,
                item.note,
              );

            if (
              item.status ===
              "APPROVED"
            ) {
              setToast(
                "🔄 Ваша заявка на вывод DNA одобрена.",
              );
            } else if (
              item.status ===
              "PAID"
            ) {
              setToast(
                `✅ Выплата отправлена: ${item.usdtAmount.toFixed(
                  8,
                )} USDT`,
              );
            } else if (
              item.status ===
              "REJECTED"
            ) {
              setToast(
                item.note ===
                "CANCELED_BY_PLAYER"
                  ? "↩️ Заявка отменена."
                  : "↩️ Заявка отклонена. DNA возвращена на баланс.",
              );
            } else {
              setToast(
                `${meta.icon} Статус вывода: ${meta.label}`,
              );
            }
          }
        }
      }

      withdrawalStatusRef.current =
        nextWithdrawals.reduce<
          Record<string, string>
        >(
          (
            result,
            item,
          ) => {
            result[item.id] =
              item.status;
            return result;
          },
          {},
        );

      setWithdrawalConfig(
        data.config,
      );

      setWithdrawals(
        nextWithdrawals,
      );

      setState(
        (previous) => ({
          ...previous,
          dna:
            data.balance?.dna ??
            previous.dna,
        }),
      );

      setWithdrawalStatus(
        "ready",
      );
    } catch (error) {
      console.error(
        "Failed to load withdrawals",
        error,
      );

      if (!silent) {
        setWithdrawalStatus(
          "error",
        );

        setToast(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки вывода",
        );
      }
    }
  };

  const openDnaWithdrawal = () => {
    if (authMode !== "telegram") {
      setToast("Вывод DNA доступен только при входе через Telegram.");
      return;
    }

    closeMenuPopups();
    setWithdrawalOpen(true);
    void loadWithdrawals();
  };

  const submitWithdrawal = async () => {
    if (isSubmittingWithdrawal || !withdrawalConfig) return;

    const dnaAmount = Number(withdrawDna);

    if (!Number.isFinite(dnaAmount) || dnaAmount < withdrawalConfig.minDna) {
      setToast(
        `Минимальная сумма вывода — ${formatNumber(
          withdrawalConfig.minDna,
          0,
        )} DNA (${withdrawalConfig.minUsdt.toFixed(
          2,
        )} USDT).`,
      );
      return;
    }

    if (dnaAmount > state.dna) {
      setToast("Недостаточно DNA для вывода.");
      return;
    }

    if (!withdrawNetwork.trim()) {
      setToast("Укажите сеть USDT.");
      return;
    }

    if (!withdrawWallet.trim()) {
      setToast("Укажите адрес USDT-кошелька.");
      return;
    }

    setIsSubmittingWithdrawal(true);
    setToast("Создаём заявку на вывод...");

    try {
      const requestKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `withdraw-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dnaAmount,
          network: withdrawNetwork.trim(),
          walletAddress: withdrawWallet.trim(),
          requestKey,
        }),
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        withdrawal?: WithdrawalItem;
        balance?: { dna: number };
      };

      if (!response.ok || !data.ok || !data.withdrawal) {
        throw new Error(data.message || data.error || "Не удалось создать заявку");
      }

      setState((previous) => ({
        ...previous,
        dna: data.balance?.dna ?? previous.dna,
      }));

      setWithdrawals((previous) => [
        data.withdrawal as WithdrawalItem,
        ...previous.filter((item) => item.id !== data.withdrawal?.id),
      ]);

      setWithdrawDna(String(withdrawalConfig.minDna));
      setToast(
        `Заявка создана: ${formatNumber(
          data.withdrawal.dnaAmount,
          0,
        )} DNA → ${data.withdrawal.usdtAmount.toFixed(
          8,
        )} USDT к получению.`,
      );
    } catch (error) {
      console.error("Failed to submit withdrawal", error);
      setToast(error instanceof Error ? error.message : "Ошибка создания заявки");
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const cancelWithdrawal = async (
    item: WithdrawalItem,
  ) => {
    if (
      cancelingWithdrawalId ||
      item.status !== "PENDING"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Отменить заявку на ${formatNumber(
          item.dnaAmount,
          4,
        )} DNA?\n\nЗарезервированная DNA будет возвращена на игровой баланс.`,
      );

    if (!confirmed) {
      return;
    }

    setCancelingWithdrawalId(
      item.id,
    );

    try {
      const response = await fetch(
        "/api/withdrawals/cancel",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            withdrawalId:
              item.id,
          }),
          cache: "no-store",
          credentials: "include",
        },
      );

      const data =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
          balance?: {
            dna: number;
          };
          withdrawal?:
            WithdrawalItem;
        };

      if (
        !response.ok ||
        !data.ok ||
        !data.withdrawal
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Не удалось отменить заявку",
        );
      }

      setWithdrawals(
        (previous) =>
          previous.map(
            (withdrawal) =>
              withdrawal.id ===
              data.withdrawal?.id
                ? (
                    data.withdrawal as
                      WithdrawalItem
                  )
                : withdrawal,
          ),
      );

      withdrawalStatusRef.current[
        data.withdrawal.id
      ] =
        data.withdrawal.status;

      setState((previous) => ({
        ...previous,
        dna:
          data.balance?.dna ??
          previous.dna,
      }));

      setToast(
        `↩️ Заявка отменена. ${formatNumber(
          data.withdrawal.dnaAmount,
          4,
        )} DNA возвращено на баланс.`,
      );
    } catch (error) {
      console.error(
        "Failed to cancel withdrawal",
        error,
      );

      setToast(
        error instanceof Error
          ? error.message
          : "Ошибка отмены заявки",
      );

      void loadWithdrawals();
    } finally {
      setCancelingWithdrawalId(
        null,
      );
    }
  };

  useEffect(() => {
    if (
      !withdrawalOpen ||
      authMode !== "telegram"
    ) {
      return;
    }

    const hasActiveWithdrawal =
      withdrawals.some(
        (item) =>
          item.status ===
            "PENDING" ||
          item.status ===
            "APPROVED",
      );

    if (!hasActiveWithdrawal) {
      return;
    }

    let cancelled = false;
    let running = false;

    const poll = async () => {
      if (
        cancelled ||
        running
      ) {
        return;
      }

      running = true;

      try {
        await loadWithdrawals(
          true,
        );
      } finally {
        running = false;
      }
    };

    const firstTimer =
      window.setTimeout(
        () => {
          void poll();
        },
        5000,
      );

    const interval =
      window.setInterval(
        () => {
          void poll();
        },
        15000,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        firstTimer,
      );
      window.clearInterval(
        interval,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    withdrawalOpen,
    authMode,
    withdrawals
      .map(
        (item) =>
          `${item.id}:${item.status}`,
      )
      .join("|"),
  ]);

  useEffect(() => {
    if (tab !== "menu") {
      setProfileOpen(false);
      setWalletHistoryOpen(false);
      setWithdrawalOpen(false);
    }

    if (tab !== "game") {
      setLevelsOpen(false);
      setProfitPlanOpen(false);
      setFarmToolsMenuOpen(false);
    }

    if (tab !== "nest") {
      setNestRewardsMenuOpen(false);
      setDailyOpen(false);
      setTasksOpen(false);
      setAchievementsOpen(false);
    }
  }, [tab]);

  // Telegram-native Back button closes the topmost in-app popup first.
  // This is UI-only and does not touch any gameplay/API state.
  useEffect(() => {
    const webApp = getTelegramWebApp();
    const backButton = webApp?.BackButton;
    if (!backButton?.show || !backButton?.hide || !backButton?.onClick) return;

    const hasClosableOverlay = Boolean(
      languageMenuOpen ||
        depositMethodPickerOpen ||
        depositConfirmationOpen ||
        pendingPurchase ||
        pendingMerge ||
        nestUpgradeOpen ||
        nestRewardsMenuOpen ||
        dailyOpen ||
        tasksOpen ||
        achievementsOpen ||
        farmToolsMenuOpen ||
        profileOpen ||
        walletHistoryOpen ||
        withdrawalOpen ||
        levelsOpen ||
        profitPlanOpen,
    );

    const closeTopOverlay = () => {
      if (languageMenuOpen) {
        setLanguageMenuOpen(false);
        return;
      }
      if (depositConfirmationOpen) {
        setDepositConfirmationOpen(false);
        return;
      }
      if (depositMethodPickerOpen) {
        setDepositMethodPickerOpen(false);
        return;
      }
      if (pendingPurchase) {
        setPendingPurchase(null);
        return;
      }
      if (pendingMerge) {
        setPendingMerge(null);
        setSelected(null);
        return;
      }
      if (nestUpgradeOpen) {
        setNestUpgradeOpen(false);
        return;
      }
      if (dailyOpen) {
        setDailyOpen(false);
        return;
      }
      if (tasksOpen) {
        setTasksOpen(false);
        return;
      }
      if (achievementsOpen) {
        setAchievementsOpen(false);
        return;
      }
      if (nestRewardsMenuOpen) {
        setNestRewardsMenuOpen(false);
        return;
      }
      if (farmToolsMenuOpen) {
        setFarmToolsMenuOpen(false);
        return;
      }
      if (profileOpen) {
        setProfileOpen(false);
        return;
      }
      if (walletHistoryOpen) {
        setWalletHistoryOpen(false);
        return;
      }
      if (withdrawalOpen) {
        setWithdrawalOpen(false);
        return;
      }
      if (levelsOpen) {
        setLevelsOpen(false);
        return;
      }
      if (profitPlanOpen) {
        setProfitPlanOpen(false);
      }
    };

    if (!hasClosableOverlay || tutorialOpen) {
      backButton.hide();
      return;
    }

    backButton.show();
    backButton.onClick(closeTopOverlay);

    return () => {
      backButton.offClick?.(closeTopOverlay);
      backButton.hide?.();
    };
  }, [
    languageMenuOpen,
    depositMethodPickerOpen,
    depositConfirmationOpen,
    pendingPurchase,
    pendingMerge,
    nestUpgradeOpen,
    nestRewardsMenuOpen,
    dailyOpen,
    tasksOpen,
    achievementsOpen,
    farmToolsMenuOpen,
    profileOpen,
    walletHistoryOpen,
    withdrawalOpen,
    levelsOpen,
    profitPlanOpen,
    tutorialOpen,
  ]);

  const withdrawalPreview = withdrawalConfig
    ? Math.max(0, Number(withdrawDna) || 0) * withdrawalConfig.usdtPerDna
    : 0;


  const progress = Math.min(100, (state.eggs / Math.max(1, state.capacity)) * 100);

  return (
    <main className={`app-shell${tutorialOpen ? " tutorial-running" : ""}`} ref={appRootRef}>
      <style>{`
        /* When a menu popup is open, lift the whole menu stacking context
           above the sticky HUD / language switcher / bottom navigation. */
        .menu-art-screen.menu-popup-active,
        .nest-screen.nest-popup-active {
          position: relative !important;
          z-index: 2000 !important;
          overflow: visible !important;
        }

        .menu-popup-panel,
        .nest-upgrade-popup {
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: min(calc(100vw - 24px), 468px) !important;
          max-height: calc(var(--tg-viewport-stable-height, 100dvh) - 28px) !important;
          margin: 0 !important;
          overflow-y: auto !important;
          overscroll-behavior: contain;
          z-index: 2010 !important;
          padding-bottom: calc(18px + var(--tg-content-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))) !important;
          box-shadow:
            0 0 0 100vmax rgba(2, 12, 8, .76),
            0 24px 70px rgba(0, 0, 0, .52) !important;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 430px) {
          .menu-popup-panel,
          .nest-upgrade-popup {
            width: calc(100vw - 16px) !important;
            max-height: calc(var(--tg-viewport-stable-height, 100dvh) - 16px) !important;
          }
        }
      `}</style>
      <header className="hud glass">
        <div className="avatar">
          <img
            src="/assets/game/dinosaurs/trex.webp"
            alt=""
            className="avatar-dino-art"
            draggable={false}
          />
        </div>
        <div className="profile">
          <strong data-i18n-ignore="true">{playerName}</strong>
          <span>{
            isLoading
              ? "Загрузка..."
              : loadError
                ? "Auth / Database error"
                : authMode === "telegram"
                  ? "Level 1 · Telegram"
                  : "Level 1 · Demo"
          }</span>
        </div>
        <div className="balances">
          <span>🪙 {formatNumber(state.coins, 2)}</span>
          <span>🧬 {formatNumber(state.dna, 2)}</span>
        </div>
        <div className="language-switcher" data-i18n-ignore="true">
          <button
            type="button"
            className="language-switcher-button"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            aria-label="Language"
            aria-expanded={languageMenuOpen}
          >
            {LANGUAGE_OPTIONS.find((item) => item.code === language)?.short ?? "RU"}
          </button>

          {languageMenuOpen ? (
            <div className="language-switcher-menu" role="menu" aria-label="Language">
              {LANGUAGE_OPTIONS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={language === item.code}
                  className={language === item.code ? "active" : ""}
                  onClick={() => {
                    setLanguage(item.code);
                    setLanguageMenuOpen(false);
                  }}
                >
                  <span className="language-switcher-short">{item.short}</span>
                  <span>{item.label}</span>
                  <b aria-hidden="true">{language === item.code ? "✓" : ""}</b>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="content">
        {tab === "nest" && (
          <div
            className={`screen nest-screen${
              nestUpgradeOpen || dailyOpen || tasksOpen || achievementsOpen
                ? " nest-popup-active"
                : ""
            }${
              tutorialOpen && (tutorialStep === 2 || tutorialStep === 3)
                ? " tutorial-screen-focus"
                : ""
            }`}
          >
            <div className="hero-card">
              <div className="sun">☀️</div>
              <div className="jungle">🌿🌴🌿</div>
              <div className="hero-dinosaurs" aria-hidden="true">
              <img
                src="/assets/game/dinosaurs/triceratops.webp"
                alt=""
                className="hero-dino hero-dino-triceratops"
                draggable={false}
              />
              <img
                src="/assets/game/dinosaurs/stegosaurus.webp"
                alt=""
                className="hero-dino hero-dino-stegosaurus"
                draggable={false}
              />
              <img
                src="/assets/game/dinosaurs/trex.webp"
                alt=""
                className="hero-dino hero-dino-trex"
                draggable={false}
              />
            </div>
            {showEggCollectFx ? (
              <div className="egg-flight-layer" aria-hidden="true">
                <img
                  src="/assets/game/nest/egg-rare.webp"
                  alt=""
                  className="egg-flight-art"
                  draggable={false}
                />
                <span className="egg-sparkle egg-sparkle-1" />
                <span className="egg-sparkle egg-sparkle-2" />
                <span className="egg-sparkle egg-sparkle-3" />
                <span className="egg-sparkle egg-sparkle-4" />
              </div>
            ) : null}

            <div className="nest-visual nest-art" aria-hidden="true">
              <img
                src="/assets/game/nest/nest.webp"
                alt=""
                className="nest-art-base"
                draggable={false}
              />
              {state.eggs > 0 ? (
                <img
                  src="/assets/game/nest/egg-cluster.webp"
                  alt=""
                  className={`nest-art-eggs ${
                    progress >= 75
                      ? "nest-eggs-full"
                      : progress >= 35
                        ? "nest-eggs-half"
                        : "nest-eggs-low"
                  }`}
                  draggable={false}
                />
              ) : null}
            </div>
              <div className="nest-info-art">
                <img
                  src="/assets/game/ui/panel.webp"
                  alt=""
                  className="nest-info-panel-art"
                  draggable={false}
                  aria-hidden="true"
                />
                <div className="nest-info-content">
                  <h1>Гнездо</h1>
                  <p>
                    {formatNumber(state.eggs, 2)} /{" "}
                    {formatNumber(state.capacity, 0)} яиц
                  </p>
                  <div className="progress">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                  <div className="rate">
                    ⚡ {formatNumber(eggsPerHour, 0)} яиц / час
                  </div>
                </div>
              </div>
              <button className={`primary${tutorialOpen && tutorialStep === 2 ? " tutorial-target" : ""}`} onClick={collectEggs} disabled={isLoading || isCollecting || Boolean(loadError)}>{isCollecting ? "⏳ СОБИРАЕМ..." : "🥚 СОБРАТЬ ЯЙЦА"}</button>
              <button
                className="coin-button"
                onClick={openNestUpgrades}
                disabled={isLoading || Boolean(loadError)}
                style={{ marginTop: 10, width: "100%" }}
              >
                🪺 УЛУЧШИТЬ ГНЕЗДО
              </button>

              <div
                className={`nest-rewards-launcher${
                  nestRewardsMenuOpen ? " open" : ""
                }`}
              >
                <button
                  type="button"
                  className={`coin-button nest-rewards-toggle${tutorialOpen && tutorialStep === 3 ? " tutorial-target" : ""}`}
                  onClick={() => {
                    if (tutorialOpen && tutorialStep === 3) {
                      setNestRewardsMenuOpen(true);
                      completeTutorial(true);
                      return;
                    }
                    setNestRewardsMenuOpen((open) => !open);
                  }}
                  disabled={isLoading || Boolean(loadError)}
                  aria-expanded={nestRewardsMenuOpen}
                >
                  <span>🎁 Награды</span>
                  <b>{nestRewardsMenuOpen ? "▲" : "▼"}</b>
                </button>

              </div>
            </div>

            {nestRewardsMenuOpen ? (
              <div
                className="nest-rewards-hub-backdrop"
                role="presentation"
                onClick={() => setNestRewardsMenuOpen(false)}
              >
                <div
                  className="nest-rewards-hub-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Награды"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="nest-rewards-hub-head">
                    <div>
                      <small>REWARDS</small>
                      <h2>🎁 Награды</h2>
                    </div>
                    <button
                      type="button"
                      className="nest-rewards-hub-close"
                      onClick={() => setNestRewardsMenuOpen(false)}
                      aria-label="Закрыть"
                    >
                      ×
                    </button>
                  </div>

                  <div className="nest-rewards-options nest-rewards-options-modal">
                    <button
                      type="button"
                      onClick={openDailyReward}
                      className={dailyInfo?.canClaim ? "claimable" : ""}
                    >
                      <span>🎁 Ежедневный бонус</span>
                      <b>{dailyInfo?.canClaim ? "ЗАБРАТЬ" : "ОТКРЫТЬ"}</b>
                    </button>

                    <button
                      type="button"
                      onClick={openTasks}
                      className={
                        tasks.some((task) => task.claimable)
                          ? "claimable"
                          : ""
                      }
                    >
                      <span>✅ Задания</span>
                      <b>
                        {tasks.some((task) => task.claimable)
                          ? "ЗАБРАТЬ"
                          : "ОТКРЫТЬ"}
                      </b>
                    </button>

                    <button
                      type="button"
                      onClick={openAchievements}
                      className={
                        achievements.some(
                          (achievement) => achievement.claimable,
                        )
                          ? "claimable"
                          : ""
                      }
                    >
                      <span>🏅 Достижения</span>
                      <b>
                        {achievements.some(
                          (achievement) => achievement.claimable,
                        )
                          ? "ЗАБРАТЬ"
                          : "ОТКРЫТЬ"}
                      </b>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="stats-grid">
              <article className="stat-card"><span>За день</span><strong>{formatNumber(eggsPerHour * 24, 0)}</strong><small>яиц</small></article>
              <article className="stat-card"><span>Coins / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToCoin, 2)}</strong><small>расчётно</small></article>
              <article className="stat-card"><span>DNA / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToDna, 2)}</strong><small>расчётно</small></article>
            </div>

            {nestUpgradeOpen ? (
              <div
                className="form-card nest-upgrade-popup"
                role="dialog"
                aria-modal="true"
                aria-label="Улучшение гнезда"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span className="eyebrow">NEST UPGRADE</span>
                    <h2>🪺 Улучшение гнезда</h2>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="coin-button"
                      onClick={() => void loadNestUpgrades()}
                    >
                      ↻
                    </button>
                    <button
                      className="coin-button"
                      onClick={() => setNestUpgradeOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {nestUpgradeStatus === "loading" ||
                nestUpgradeStatus === "idle" ? (
                  <p>Загружаем уровни гнезда...</p>
                ) : nestUpgradeStatus === "error" ? (
                  <>
                    <p>Не удалось загрузить улучшения.</p>
                    <button
                      className="primary"
                      onClick={() => void loadNestUpgrades()}
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : nestUpgradeInfo ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: 11,
                          borderRadius: 13,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <small style={{ opacity: .62 }}>
                          Вместимость
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 18,
                          }}
                        >
                          {formatNumber(
                            nestUpgradeInfo.currentCapacity,
                            0,
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: 11,
                          borderRadius: 13,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <small style={{ opacity: .62 }}>
                          Баланс
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 18,
                          }}
                        >
                          {formatNumber(state.coins, 2)}
                        </strong>
                        <small>Coins</small>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: 8,
                        width: "100%",
                        maxWidth: "100%",
                        marginTop: 0,
                        boxSizing: "border-box",
                      }}
                    >
                      {NEST_UPGRADE_TIERS.map((tier, index) => {
                        const reached =
                          nestUpgradeInfo.currentCapacity >=
                          tier.capacity;
                        const isNext =
                          nestUpgradeInfo.nextUpgrade?.capacity ===
                          tier.capacity;

                        return (
                          <article
                            key={tier.capacity}
                            style={{
                              padding: 10,
                              borderRadius: 13,
                              border: isNext
                                ? "1px solid rgba(167,243,72,.40)"
                                : "1px solid rgba(255,255,255,.07)",
                              background: reached
                                ? "rgba(112,214,138,.07)"
                                : isNext
                                  ? "rgba(167,243,72,.07)"
                                  : "rgba(255,255,255,.03)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <strong>Уровень {index + 1}</strong>
                                <small
                                  style={{
                                    display: "block",
                                    marginTop: 3,
                                    opacity: .65,
                                  }}
                                >
                                  {formatNumber(
                                    tier.capacity,
                                    0,
                                  )}{" "}
                                  яиц
                                </small>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                {reached ? (
                                  <strong
                                    style={{ color: "#92e6a5" }}
                                  >
                                    ✓
                                  </strong>
                                ) : (
                                  <>
                                    <strong>
                                      {formatNumber(
                                        tier.priceCoins,
                                        0,
                                      )}
                                    </strong>
                                    <small
                                      style={{
                                        display: "block",
                                        opacity: .62,
                                      }}
                                    >
                                      Coins
                                    </small>
                                  </>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    {nestUpgradeInfo.nextUpgrade ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(167,243,72,.08)",
                          border:
                            "1px solid rgba(167,243,72,.20)",
                        }}
                      >
                        <small style={{ opacity: .66 }}>
                          Следующая ступень
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 18,
                          }}
                        >
                          {formatNumber(
                            nestUpgradeInfo.nextUpgrade.capacity,
                            0,
                          )}{" "}
                          яиц
                        </strong>

                        <button
                          className="primary"
                          onClick={() => void upgradeNest()}
                          disabled={
                            isUpgradingNest ||
                            state.coins <
                              nestUpgradeInfo.nextUpgrade
                                .priceCoins
                          }
                          style={{
                            marginTop: 10,
                            width: "100%",
                          }}
                        >
                          {isUpgradingNest
                            ? "⏳ УЛУЧШАЕМ..."
                            : `УЛУЧШИТЬ ЗА ${formatNumber(
                                nestUpgradeInfo.nextUpgrade
                                  .priceCoins,
                                0,
                              )} COINS`}
                        </button>

                        {state.coins <
                        nestUpgradeInfo.nextUpgrade
                          .priceCoins ? (
                          <small
                            style={{
                              display: "block",
                              marginTop: 7,
                              opacity: .62,
                            }}
                          >
                            Не хватает{" "}
                            {formatNumber(
                              nestUpgradeInfo.nextUpgrade
                                .priceCoins - state.coins,
                              0,
                            )}{" "}
                            Coins
                          </small>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 14,
                          background:
                            "rgba(112,214,138,.08)",
                        }}
                      >
                        <strong>
                          🏆 Гнездо улучшено до максимума
                        </strong>
                      </div>
                    )}

                    <small
                      style={{
                        display: "block",
                        marginTop: 10,
                        opacity: .58,
                        lineHeight: 1.45,
                      }}
                    >
                      Можно купить только следующую ступень.
                      Цена и текущая вместимость проверяются
                      на сервере перед списанием Coins.
                    </small>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {tab === "game" && (
          <div className={`screen game-board-screen${tutorialOpen && tutorialStep === 1 ? " tutorial-screen-focus" : ""}`}>
            <div className="game-board-head">
              <div className="game-board-title">
                <span className="eyebrow">MERGE FARM</span>
                <h2>Игровая доска</h2>
              </div>

              <button
                className="coin-button game-buy-dino"
                onClick={buyDino}
                disabled={isLoading || isBuying || Boolean(loadError)}
              >
                {isBuying ? (
                  "ПОКУПКА..."
                ) : (
                  <>
                    <img
                      src="/assets/game/dinosaurs/trex.webp"
                      alt=""
                      className="game-buy-dino-art"
                      draggable={false}
                      aria-hidden="true"
                    />
                    <span>+ 100</span>
                  </>
                )}
              </button>
            </div>

            <p className="hint game-board-hint">
              Соединяй одинаковых динозавров и открывай новые уровни
            </p>

            <div className={`board game-art-board${tutorialOpen && tutorialStep === 1 ? " tutorial-target tutorial-board-target" : ""}`}>
              {state.board.map((level, index) => (
                <button
                  key={index}
                  className={`slot ${selected === index ? "selected" : ""}${
                    mergeFx?.slot === index ? " merge-fx-slot" : ""
                  }${
                    level ? ` dino-evolution-slot ${getDinoEvolutionClass(level)}` : ""
                  }`}
                  onClick={() => chooseSlot(index)}
                  aria-label={level ? `Динозавр уровня ${level}` : "Пустая клетка"}
                  disabled={isLoading || isMerging || Boolean(loadError)}
                >
                  {level ? (
                    <>
                      <span
                        className={`dino dino-evolution ${getDinoEvolutionClass(level)}`}
                      >
                        <span className="dino-evolution-aura" aria-hidden="true" />
                        <img
                          src={getDinoAsset(level)}
                          alt=""
                          className="board-dino-art"
                          draggable={false}
                        />
                        <span className="dino-evolution-mark" aria-hidden="true">
                          {getDinoEvolutionMark(level)}
                        </span>
                      </span>
                      <b>Lv.{level}</b>
                    </>
                  ) : (
                    <span className="plus">+</span>
                  )}

                  {mergeFx?.slot === index ? (
                    <span
                      key={mergeFx.key}
                      className="merge-celebration"
                      aria-hidden="true"
                    >
                      <span className="merge-celebration-flash" />
                      <span className="merge-celebration-ring" />
                      <span className="merge-particle merge-particle-1" />
                      <span className="merge-particle merge-particle-2" />
                      <span className="merge-particle merge-particle-3" />
                      <span className="merge-particle merge-particle-4" />
                      <span className="merge-particle merge-particle-5" />
                      <span className="merge-particle merge-particle-6" />
                      <span className="merge-particle merge-particle-7" />
                      <span className="merge-particle merge-particle-8" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {mergeFx ? (
              <div
                key={`merge-banner-${mergeFx.key}`}
                className="merge-level-up-banner"
                role="status"
                aria-live="polite"
              >
                <small>MERGE!</small>
                <strong>Lv.{mergeFx.level}</strong>
              </div>
            ) : null}

            <div className="card game-production-card">
              <strong>Общее производство</strong>
              <span>{formatNumber(eggsPerHour, 0)} яиц / час</span>
            </div>

            <button
              type="button"
              className="game-farm-tools-card"
              onClick={() => {
                closeMenuPopups();
                setFarmToolsMenuOpen(true);
              }}
            >
              <span>Ферма</span>
              <b>Lv.1–16 · Profit</b>
            </button>
          </div>
        )}

        {tab === "shop" && (
          <div className="screen shop-art-screen">
            <div className="shop-art-heading">
              <span className="eyebrow">DINO SHOP</span>
              <h2>Магазин</h2>
            </div>

            <div className="shop-art-switch">
              <button
                className={
                  shopSection === "dinos"
                    ? "primary"
                    : "coin-button"
                }
                onClick={() =>
                  setShopSection("dinos")
                }
              >
                <img
                  src="/assets/game/dinosaurs/trex.webp"
                  alt=""
                  className="shop-switch-dino"
                  draggable={false}
                  aria-hidden="true"
                />
                <span>ДИНОЗАВРЫ</span>
              </button>

              <button
                className={
                  shopSection === "deposit"
                    ? "primary"
                    : "coin-button"
                }
                onClick={() =>
                  setShopSection(
                    "deposit",
                  )
                }
              >
                <span className="shop-card-symbol" aria-hidden="true">◆</span>
                <span>ПОПОЛНИТЬ</span>
              </button>
            </div>

            {shopSection === "dinos" ? (
              <>
                <div className="shop-copy-stack">
                  <h2 className="shop-dino-title">Магазин динозавров</h2>

                  <div className="shop-intro-card">
                    <p className="hint shop-intro-text">
                      <span>Lv.1 доступен сразу.</span>
                      <span>Lv.2–Lv.16 открываются для прямой покупки только после того, как вы сами получили этот уровень через merge.</span>
                    </p>
                  </div>

                  <div className="shop-unlock-wrap">
                    <div className="shop-unlock-badge">
                      Открыто до Lv.{dinoUnlockedLevel}
                    </div>

                    <div className="card shop-unlock-card">
                      <p>
                        Прямая покупка не открывает следующий уровень. Чтобы разблокировать новый уровень магазина, нужно сделать merge.
                      </p>
                    </div>
                  </div>
                </div>

                {shopStatus === "loading" ||
                shopStatus === "idle" ? (
                  <div className="card">
                    <strong>
                      Загружаем товары...
                    </strong>
                  </div>
                ) : shopStatus === "error" ? (
                  <div className="card">
                    <strong>
                      Не удалось загрузить магазин
                    </strong>
                    <p>
                      Обновите страницу и попробуйте
                      ещё раз.
                    </p>
                    <button
                      className="primary"
                      onClick={() =>
                        window.location.reload()
                      }
                    >
                      ПОВТОРИТЬ
                    </button>
                  </div>
                ) : (
                  <div className="menu-list shop-dino-list">
                    {dinoCatalog.map(
                      (item) => (
                        <button
                          key={item.level}
                          onClick={() =>
                            buyCatalogDino(
                              item,
                            )
                          }
                          disabled={
                            isBuying ||
                            isLoading ||
                            Boolean(
                              loadError,
                            )
                          }
                          style={
                            item.unlocked
                              ? undefined
                              : {
                                  opacity:
                                    .48,
                                  cursor:
                                    "not-allowed",
                                }
                          }
                        >
                          <span className="shop-dino-card-main">
                            <span
                              className={`shop-dino-portrait dino-evolution ${getDinoEvolutionClass(item.level)}`}
                            >
                              <span className="dino-evolution-aura" aria-hidden="true" />
                              <img
                                src={getDinoAsset(item.level)}
                                alt=""
                                className="shop-dino-card-art"
                                draggable={false}
                                aria-hidden="true"
                              />
                              <span className="dino-evolution-mark" aria-hidden="true">
                                {getDinoEvolutionMark(item.level)}
                              </span>
                              {!item.unlocked ? (
                                <span className="shop-lock" aria-hidden="true">◆</span>
                              ) : null}
                            </span>

                            <span className="shop-dino-card-copy">
                              <strong>{item.title}</strong>
                              <small>
                                {item.unlocked
                                  ? `${formatNumber(
                                      item.dailyCoins,
                                      2,
                                    )} Coins + ${formatNumber(
                                      item.dailyDna,
                                      2,
                                    )} DNA / день`
                                  : item.unlockRequirement}
                              </small>
                            </span>
                          </span>

                          <b>
                            {item.unlocked
                              ? formatNumber(
                                  item.priceCoins,
                                  0,
                                )
                              : "ЗАКРЫТО"}
                          </b>
                        </button>
                      ),
                    )}
                  </div>
                )}

                <div className="card shop-balance-card">
                  <strong>Ваш баланс</strong>
                  <p>
                    {formatNumber(state.coins, 2)} Coins ·{" "}
                    {formatNumber(state.dna, 2)} DNA
                  </p>
                  <p>
                    Вместимость: {formatNumber(state.capacity, 0)} яиц
                  </p>
                </div>
              </>
            ) : (
              <>
                {depositStatus === "loading" ||
                depositStatus === "idle" ? (
                  <div className="card">
                    <strong>
                      Загружаем способы оплаты...
                    </strong>
                  </div>
                ) : null}

                {depositTelegramRequired ? (
                  <div className="card">
                    <strong>
                      🔐 Откройте игру через Telegram
                    </strong>
                    <p>
                      Пополнение реального баланса
                      недоступно в демо-режиме
                      браузера.
                    </p>
                  </div>
                ) : null}

                {!depositProviderConfigured &&
                depositStatus === "ready" ? (
                  <div className="card">
                    <strong>
                      ⚙️ Криптоплатежи ещё не
                      подключены
                    </strong>
                    <p>
                      Администратору нужно добавить
                      ключи платёжного провайдера.
                    </p>
                  </div>
                ) : null}

                {depositConfig ? (
                  <div
                    className="card"
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        width: "100%",
                        marginBottom: 10,
                      }}
                    >
                      Сумма пополнения
                    </strong>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "28px minmax(0, 1fr)",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        maxWidth: "100%",
                        marginTop: 0,
                        boxSizing: "border-box",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        $
                      </span>

                      <input
                        type="number"
                        min={
                          depositConfig.minUsd
                        }
                        max={
                          depositConfig.maxUsd
                        }
                        step="0.01"
                        value={depositAmount}
                        onChange={(event) =>
                          setDepositAmount(
                            event.target.value,
                          )
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          minWidth: 0,
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          padding:
                            "12px 14px",
                          borderRadius: 12,
                          border:
                            "1px solid rgba(255,255,255,.14)",
                          background:
                            "rgba(255,255,255,.06)",
                          color: "inherit",
                          fontSize: 18,
                          fontWeight: 800,
                          lineHeight: 1.2,
                          outline: "none",
                        }}
                      />
                    </div>

                    <small
                      style={{
                        display: "block",
                        marginTop: 7,
                        opacity: .65,
                      }}
                    >
                      От $
                      {depositConfig.minUsd} до $
                      {depositConfig.maxUsd.toLocaleString(
                        "ru-RU",
                      )}
                    </small>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        width: "100%",
                        maxWidth: "100%",
                        marginTop: 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          padding: 10,
                          borderRadius: 13,
                          background:
                            "rgba(255,255,255,.04)",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        <small
                          style={{
                            opacity: .65,
                          }}
                        >
                          Coins
                        </small>
                        <strong
                          style={{
                            display: "block",
                            minWidth: 0,
                            marginTop: 4,
                            fontSize: 16,
                            lineHeight: 1.2,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          {formatNumber(
                            depositPreview.baseCoins,
                            0,
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          padding: 10,
                          borderRadius: 13,
                          background:
                            firstDepositEligible
                              ? "rgba(167,243,72,.08)"
                              : "rgba(255,255,255,.04)",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        <small
                          style={{
                            opacity: .65,
                          }}
                        >
                          Бонус
                        </small>
                        <strong
                          style={{
                            display: "block",
                            minWidth: 0,
                            marginTop: 4,
                            fontSize: 16,
                            lineHeight: 1.2,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          +
                          {formatNumber(
                            depositPreview.bonusCoins,
                            0,
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          gridColumn: "1 / -1",
                          minWidth: 0,
                          padding: 10,
                          borderRadius: 13,
                          background:
                            "rgba(167,243,72,.10)",
                          border:
                            "1px solid rgba(167,243,72,.20)",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        <small
                          style={{
                            opacity: .65,
                          }}
                        >
                          Итого
                        </small>
                        <strong
                          style={{
                            display: "block",
                            minWidth: 0,
                            marginTop: 4,
                            fontSize: 16,
                            lineHeight: 1.2,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          {formatNumber(
                            depositPreview.totalCoins,
                            0,
                          )}
                        </strong>
                      </div>
                    </div>

                    {firstDepositEligible ? (
                      <p
                        style={{
                          marginBottom: 0,
                        }}
                      >
                        🎁 Первое успешно оплаченное
                        пополнение: +
                        {depositPreview.bonusPercent}%
                        Coins.
                      </p>
                    ) : (
                      <p
                        style={{
                          marginBottom: 0,
                          opacity: .68,
                        }}
                      >
                        Бонус за первое пополнение
                        уже использован.
                      </p>
                    )}
                  </div>
                ) : null}

                {depositConfig &&
                depositMethods.length > 0 ? (
                  <div
                    className="card"
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflow: "visible",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        width: "100%",
                        marginBottom: 10,
                      }}
                    >
                      Монета и сеть
                    </strong>

                    <button
                      type="button"
                      className="coin-button"
                      disabled={
                        depositTelegramRequired ||
                        !depositProviderConfigured
                      }
                      onClick={() =>
                        setDepositMethodPickerOpen(true)
                      }
                      style={{
                        width: "100%",
                        minHeight: 62,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          display: "grid",
                          gap: 3,
                          minWidth: 0,
                        }}
                      >
                        <b
                          style={{
                            fontSize: 16,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {depositMethods.find(
                            (method) =>
                              method.code ===
                              depositMethodCode,
                          )?.label ??
                            "Выбрать монету и сеть"}
                        </b>

                        {depositMethodCode ? (
                          <small
                            style={{
                              opacity: .72,
                            }}
                          >
                            {minimumLoading
                              ? "Проверяем минимум сети..."
                              : selectedMethodMinimumUsd !==
                                  null
                                ? `Минимум ≈ $${selectedMethodMinimumUsd.toFixed(
                                    2,
                                  )}`
                                : "Нажмите, чтобы выбрать другую сеть"}
                          </small>
                        ) : (
                          <small
                            style={{
                              opacity: .72,
                            }}
                          >
                            Нажмите, чтобы открыть список
                          </small>
                        )}
                      </span>

                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 auto",
                          fontSize: 22,
                        }}
                      >
                        ›
                      </span>
                    </button>
                  </div>
                ) : null}

                {depositMethodPickerOpen ? (
                  <div
                    className="deposit-method-picker-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Выбор монеты и сети"
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 1800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 16,
                      background: "rgba(0,0,0,.76)",
                      backdropFilter: "blur(7px)",
                    }}
                    onClick={() =>
                      setDepositMethodPickerOpen(false)
                    }
                  >
                    <div
                      className="glass deposit-method-picker-panel"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      style={{
                        width: "min(460px, 100%)",
                        maxHeight:
                          "min(calc(var(--tg-viewport-stable-height, 100dvh) - 36px), 720px)",
                        overflowY: "auto",
                        borderRadius: 26,
                        padding: 16,
                        background:
                          "rgba(8,45,31,.97)",
                        border:
                          "1px solid rgba(165,242,81,.35)",
                        boxShadow:
                          "0 24px 70px rgba(0,0,0,.55)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div
                            className="eyebrow"
                            style={{
                              marginBottom: 4,
                            }}
                          >
                            ПОПОЛНЕНИЕ
                          </div>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 24,
                            }}
                          >
                            Выберите монету и сеть
                          </h2>
                        </div>

                        <button
                          type="button"
                          className="coin-button"
                          onClick={() =>
                            setDepositMethodPickerOpen(
                              false,
                            )
                          }
                          aria-label="Закрыть"
                          style={{
                            flex: "0 0 auto",
                            width: 48,
                            height: 48,
                            padding: 0,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 28,
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        {depositMethods.map(
                          (method) => {
                            const selected =
                              depositMethodCode ===
                              method.code;

                            return (
                              <button
                                key={method.code}
                                type="button"
                                className={
                                  selected
                                    ? "primary"
                                    : "coin-button"
                                }
                                disabled={
                                  !method.available ||
                                  depositTelegramRequired
                                }
                                onClick={() => {
                                  if (
                                    !method.available ||
                                    depositTelegramRequired
                                  ) {
                                    return;
                                  }

                                  setDepositMethodPickerOpen(
                                    false,
                                  );
                                  autoOpenDepositMethodRef.current =
                                    method.code;

                                  if (
                                    depositMethodCode ===
                                      method.code &&
                                    !minimumLoading
                                  ) {
                                    if (
                                      typeof selectedMethodMinimumUsd ===
                                        "number" &&
                                      Number.isFinite(
                                        selectedMethodMinimumUsd,
                                      ) &&
                                      selectedMethodMinimumUsd > 0
                                    ) {
                                      autoOpenDepositMethodRef.current =
                                        null;
                                      setDepositAmount(
                                        selectedMethodMinimumUsd.toFixed(
                                          2,
                                        ),
                                      );
                                      setDepositConfirmationOpen(
                                        true,
                                      );
                                    } else {
                                      void loadSelectedMethodMinimum(
                                        method.code,
                                      );
                                    }

                                    return;
                                  }

                                  setSelectedMethodMinimumUsd(
                                    null,
                                  );
                                  setDepositMethodCode(
                                    method.code,
                                  );
                                }}
                                style={{
                                  width: "100%",
                                  minWidth: 0,
                                  maxWidth: "none",
                                  minHeight: 56,
                                  boxSizing:
                                    "border-box",
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent:
                                    "space-between",
                                  gap: 10,
                                  padding: "12px 14px",
                                  margin: 0,
                                  textAlign: "left",
                                  whiteSpace: "normal",
                                  opacity: method.available
                                    ? 1
                                    : .45,
                                }}
                              >
                                <span>
                                  {method.label}
                                </span>

                                <small>
                                  {method.available
                                    ? selected
                                      ? "✓"
                                      : ""
                                    : "недоступно"}
                                </small>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {depositConfirmationOpen ? (
                  <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 1000,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 16,
                      background:
                        "rgba(0,0,0,.72)",
                      backdropFilter:
                        "blur(6px)",
                    }}
                    onClick={() => {
                      if (
                        !isCreatingDeposit
                      ) {
                        setDepositConfirmationOpen(
                          false,
                        );
                      }
                    }}
                  >
                    <div
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      style={{
                        width: "100%",
                        maxWidth: 420,
                        maxHeight:
                          "calc(100vh - 32px)",
                        overflowY: "auto",
                        padding: 18,
                        borderRadius: 22,
                        background:
                          "#10281e",
                        border:
                          "1px solid rgba(167,243,72,.28)",
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,.45)",
                        boxSizing:
                          "border-box",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 12,
                        }}
                      >
                        <div>
                          <small
                            style={{
                              display:
                                "block",
                              opacity: .62,
                              marginBottom:
                                4,
                            }}
                          >
                            ПОДТВЕРЖДЕНИЕ
                            ОПЛАТЫ
                          </small>

                          <h2
                            style={{
                              margin:
                                "0 0 4px",
                              fontSize: 22,
                            }}
                          >
                            💳 Создать платёж?
                          </h2>
                        </div>

                        <button
                          className="coin-button"
                          disabled={
                            isCreatingDeposit
                          }
                          onClick={() =>
                            setDepositConfirmationOpen(
                              false,
                            )
                          }
                          style={{
                            minWidth: 42,
                            width: 42,
                            padding: 8,
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          padding: 14,
                          borderRadius: 16,
                          background:
                            "rgba(255,255,255,.04)",
                        }}
                      >
                        <small
                          style={{
                            opacity: .62,
                          }}
                        >
                          Выбранный способ
                        </small>

                        <strong
                          style={{
                            display: "block",
                            marginTop: 4,
                            fontSize: 20,
                          }}
                        >
                          {
                            depositMethods.find(
                              (method) =>
                                method.code ===
                                depositMethodCode,
                            )?.label ??
                              depositMethodCode
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          padding: 16,
                          borderRadius: 16,
                          textAlign: "center",
                          background:
                            "rgba(167,243,72,.12)",
                          border:
                            "1px solid rgba(167,243,72,.22)",
                        }}
                      >
                        <small
                          style={{
                            opacity: .7,
                          }}
                        >
                          Минимум сети
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 5,
                            fontSize: 28,
                            color: "#dfff97",
                          }}
                        >
                          {depositPreview.networkMinimumUsd !== null
                            ? `$${depositPreview.networkMinimumUsd.toFixed(2)}`
                            : "—"}
                        </strong>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          padding: 13,
                          borderRadius: 14,
                          background:
                            "rgba(255,193,7,.09)",
                          border:
                            "1px solid rgba(255,193,7,.18)",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        ⚠️ После создания
                        платежа отправляйте{" "}
                        <b>
                          {depositMethods.find(
                            (method) =>
                              method.code ===
                              depositMethodCode,
                          )?.coin ??
                            "только выбранную монету"}
                        </b>{" "}
                        только по сети{" "}
                        <b>
                          {depositMethods.find(
                            (method) =>
                              method.code ===
                              depositMethodCode,
                          )?.network}
                        </b>
                        . Не отправляйте другую
                        монету на выданный адрес.
                      </div>

                      <button
                        className="primary"
                        disabled={
                          isCreatingDeposit ||
                          minimumLoading ||
                          depositPreview.networkMinimumUsd ===
                            null ||
                          !depositPreview.valid
                        }
                        onClick={() =>
                          void confirmCreateDeposit()
                        }
                        style={{
                          width: "100%",
                          maxWidth: "none",
                          marginTop: 14,
                        }}
                      >
                        {isCreatingDeposit
                          ? "⏳ СОЗДАЁМ..."
                          : "ПОДТВЕРДИТЬ И СОЗДАТЬ ПЛАТЁЖ"}
                      </button>

                      <button
                        className="coin-button"
                        disabled={
                          isCreatingDeposit
                        }
                        onClick={() =>
                          setDepositConfirmationOpen(
                            false,
                          )
                        }
                        style={{
                          width: "100%",
                          maxWidth: "none",
                          marginTop: 8,
                        }}
                      >
                        НАЗАД
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeDeposit ? (
                  <div className="card" style={{ display: "block", width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }}>
                    <strong>
                      🧾 Текущий платёж
                    </strong>

                    <p>
                      Статус:{" "}
                      <b
                        style={{
                          color:
                            depositStatusMeta(
                              activeDeposit.status,
                            ).color,
                        }}
                      >
                        {
                          depositStatusMeta(
                            activeDeposit.status,
                          ).icon
                        }{" "}
                        {
                          depositStatusMeta(
                            activeDeposit.status,
                          ).label
                        }
                      </b>
                    </p>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background:
                          "rgba(255,255,255,.04)",
                        marginTop: 10,
                      }}
                    >
                      <small
                        style={{
                          opacity: .65,
                        }}
                      >
                        Отправить точно
                      </small>

                      <strong
                        style={{
                          display: "block",
                          fontSize: 20,
                          marginTop: 4,
                          wordBreak:
                            "break-word",
                        }}
                      >
                        {activeDeposit.payAmount ??
                          "—"}{" "}
                        {activeDeposit.payCurrency.toUpperCase()}
                      </strong>

                      {activeDeposit.payAmount !==
                      null ? (
                        <button
                          className="coin-button"
                          onClick={() =>
                            void copyDepositValue(
                              String(
                                activeDeposit.payAmount,
                              ),
                              "Сумма",
                            )
                          }
                          style={{
                            width: "100%",
                            marginTop: 8,
                          }}
                        >
                          📋 СКОПИРОВАТЬ СУММУ
                        </button>
                      ) : null}
                    </div>

                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background:
                          "rgba(255,255,255,.04)",
                        marginTop: 8,
                      }}
                    >
                      <small
                        style={{
                          opacity: .65,
                        }}
                      >
                        Адрес ·{" "}
                        {activeDeposit.network}
                      </small>

                      <strong
                        style={{
                          display: "block",
                          marginTop: 5,
                          wordBreak:
                            "break-all",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {activeDeposit.payAddress ??
                          "—"}
                      </strong>

                      {activeDeposit.payAddress ? (
                        <button
                          className="coin-button"
                          onClick={() =>
                            void copyDepositValue(
                              activeDeposit.payAddress ??
                                "",
                              "Адрес",
                            )
                          }
                          style={{
                            width: "100%",
                            marginTop: 8,
                          }}
                        >
                          📋 СКОПИРОВАТЬ АДРЕС
                        </button>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 12,
                        background:
                          "rgba(255,193,7,.08)",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      ⚠️ Отправляйте только{" "}
                      <b>
                        {activeDeposit.payCurrency.toUpperCase()}
                      </b>{" "}
                      по сети{" "}
                      <b>
                        {activeDeposit.network}
                      </b>
                      . Другая монета или сеть может
                      привести к потере средств.
                    </div>

                    {!isDepositFinalStatus(
                      activeDeposit.status,
                    ) ? (
                      <p
                        style={{
                          margin:
                            "10px 0 0",
                          fontSize: 12,
                          lineHeight: 1.45,
                          opacity: .72,
                        }}
                      >
                        🔄 Статус проверяется
                        автоматически примерно
                        каждые 15 секунд.
                      </p>
                    ) : null}

                    <button
                      className="primary"
                      onClick={() =>
                        void checkDeposit(
                          activeDeposit,
                        )
                      }
                      disabled={
                        isCheckingDeposit ||
                        activeDeposit.status ===
                          "FINISHED"
                      }
                      style={{
                        width: "100%",
                        marginTop: 12,
                      }}
                    >
                      {activeDeposit.status ===
                      "FINISHED"
                        ? "✅ ЗАЧИСЛЕНО"
                        : isCheckingDeposit
                          ? "⏳ ПРОВЕРЯЕМ..."
                          : "ПРОВЕРИТЬ СЕЙЧАС"}
                    </button>
                  </div>
                ) : null}

                <div className="card">
                  <strong>
                    Ваш баланс
                  </strong>
                  <p>
                    🪙{" "}
                    {formatNumber(
                      state.coins,
                      2,
                    )}{" "}
                    Coins
                  </p>
                </div>

                {depositHistory.length >
                0 ? (
                  <div className="card" style={{ display: "block", width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }}>
                    <strong>
                      История пополнений
                    </strong>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {depositHistory.map(
                        (item) => {
                          const meta =
                            depositStatusMeta(
                              item.status,
                            );

                          return (
                            <button
                              key={item.id}
                              className="coin-button"
                              onClick={() =>
                                setActiveDeposit(
                                  item,
                                )
                              }
                              style={{
                                width: "100%",
                                display: "grid",
                                gridTemplateColumns:
                                  "1fr auto",
                                gap: 8,
                                textAlign:
                                  "left",
                                alignItems:
                                  "center",
                              }}
                            >
                              <span>
                                <strong>
                                  $
                                  {item.usdAmount.toFixed(
                                    2,
                                  )}{" "}
                                  ·{" "}
                                  {item.payCurrency.toUpperCase()}
                                </strong>
                                <small
                                  style={{
                                    display:
                                      "block",
                                    opacity:
                                      .65,
                                    marginTop:
                                      3,
                                  }}
                                >
                                  {formatDepositDate(
                                    item.createdAt,
                                  )}
                                </small>
                              </span>

                              <b
                                style={{
                                  color:
                                    meta.color,
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {meta.icon}{" "}
                                {meta.label}
                              </b>
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                ) : null}

              </>
            )}
          </div>
        )}

        {tab === "friends" && (
          <div className="screen friends-art-screen">
            <div className="friends-art-heading">
              <span className="eyebrow">Рефералы</span>
              <h2>Друзья</h2>
            </div>

            <div className="invite-card friends-invite-card">
              <img
                src="/assets/game/ui/nav/friends.webp"
                alt=""
                className="friends-hero-art"
                draggable={false}
                aria-hidden="true"
              />

              <h3>Стройте ферму вместе</h3>

              <div className="friends-referral-copy">
                {authMode !== "telegram" ? (
                  <p>
                    Откройте игру через Telegram, чтобы получить личную ссылку приглашения.
                  </p>
                ) : referralStatus === "loading" ? (
                  <p>Загружаем вашу реферальную ссылку...</p>
                ) : referralInfo?.enabled ? (
                  <>
                    <p>
                      Друг получает +{formatNumber(referralInfo.inviteeRewardCoins, 0)} Coins,
                      а вы +{formatNumber(referralInfo.inviterRewardCoins, 0)} Coins после его первого входа.
                    </p>
                    <div className="friends-link-box">
                      <code>{referralInfo.inviteLink}</code>
                    </div>
                  </>
                ) : (
                  <p>
                    Реферальная ссылка пока недоступна. Попробуйте открыть игру через Telegram ещё раз.
                  </p>
                )}
              </div>

              <button
                className="primary friends-invite-button"
                onClick={inviteFriend}
                disabled={authMode !== "telegram" || referralStatus === "loading"}
              >
                ПРИГЛАСИТЬ ДРУГА
              </button>
            </div>

            <div className="stats-grid friends-stats-grid">
              <article className="stat-card">
                <span>Приглашено</span>
                <strong>{referralInfo?.invitedCount ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Бонус за друга</span>
                <strong>+{formatNumber(referralInfo?.inviterRewardCoins ?? 500, 0)}</strong>
                <small>Coins</small>
              </article>
              <article className="stat-card">
                <span>Начислено</span>
                <strong>{formatNumber(referralInfo?.totalBonusCoins ?? 0, 0)}</strong>
                <small>Coins</small>
              </article>
            </div>

            {referralInfo?.recent?.length ? (
              <div className="card friends-recent-card">
                <strong>Последние приглашённые</strong>
                <div className="friends-recent-list">
                  {referralInfo.recent.slice(0, 5).map((item) => (
                    <p key={item.id}>
                      <span>{item.friend.firstName || item.friend.username || "Игрок"}</span>
                      <b>+{formatNumber(item.rewardCoins, 0)} Coins</b>
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {(
          tab === "menu" ||
          farmToolsMenuOpen ||
          levelsOpen ||
          profitPlanOpen ||
          dailyOpen ||
          tasksOpen ||
          achievementsOpen
        ) && (
          <div
            className={`screen menu-art-screen${
              tab !== "menu" ? " rewards-popup-host" : ""
            }${
              walletHistoryOpen ||
              profileOpen ||
              withdrawalOpen ||
              levelsOpen ||
              profitPlanOpen ||
              farmToolsMenuOpen ||
              dailyOpen ||
              tasksOpen ||
              achievementsOpen
                ? " menu-popup-active"
                : ""
            }`}
          >
            {tab === "menu" ? (
              <>
                <div className="menu-art-heading">
                  <img
                    src="/assets/game/ui/nav/menu.webp"
                    alt=""
                    className="menu-heading-art"
                    draggable={false}
                    aria-hidden="true"
                  />
                  <div>
                    <span className="eyebrow">TOOLS</span>
                    <h2>Меню</h2>
                  </div>
                </div>

                <div className="menu-list menu-art-grid">
                  <button onClick={openProfile}>
                    <span>Мой профиль</span>
                    <b>СТАТИСТИКА</b>
                  </button>

                  <button onClick={openWalletHistory}>
                    <span>История баланса</span>
                    <b>ПОПОЛНЕНИЯ / ВЫВОДЫ</b>
                  </button>

                  <button onClick={openDnaWithdrawal}>
                    <span>Вывод DNA</span>
                    <b>USDT</b>
                  </button>

                </div>

                <button
                  type="button"
                  className="menu-tutorial-replay"
                  onClick={startTutorial}
                  data-i18n-ignore="true"
                >
                  <span>🎓 {tutorialCopy.menuLabel}</span>
                  <b>{tutorialCopy.replay}</b>
                </button>
              </>
            ) : null}

            {farmToolsMenuOpen ? (
              <div className="form-card menu-popup-panel menu-farm-hub-panel">
                <div className="menu-farm-hub-head">
                  <div>
                    <span className="eyebrow">FARM</span>
                    <h2>Ферма</h2>
                  </div>
                  <button
                    className="coin-button"
                    onClick={() => setFarmToolsMenuOpen(false)}
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                </div>

                <div className="menu-farm-hub-actions">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenuPopups();
                      setLevelsOpen(true);
                    }}
                  >
                    <span>Уровни динозавров</span>
                    <b>Lv.1–16</b>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeMenuPopups();
                      setProfitPlanOpen(true);
                    }}
                  >
                    <span>Profit Plan</span>
                    <b>МОЯ ФЕРМА</b>
                  </button>
                </div>
              </div>
            ) : null}

            {walletHistoryOpen ? (
              <div className="form-card wallet-art-panel menu-popup-panel">
                <div className="wallet-art-head">
                  <div>
                    <span className="eyebrow">WALLET HISTORY</span>
                    <h2>История баланса</h2>
                  </div>
                  <div className="wallet-art-actions">
                    <button className="coin-button" onClick={() => void loadWalletHistory()} aria-label="Обновить историю">↻</button>
                    <button className="coin-button" onClick={() => setWalletHistoryOpen(false)} aria-label="Закрыть историю">×</button>
                  </div>
                </div>

                {walletHistoryStatus === "loading" || walletHistoryStatus === "idle" ? (
                  <div className="wallet-art-message">Загружаем операции...</div>
                ) : walletHistoryStatus === "error" ? (
                  <div className="wallet-art-message wallet-art-error">
                    <strong>Не удалось загрузить историю</strong>
                    <button className="primary" onClick={() => void loadWalletHistory()}>ПОВТОРИТЬ</button>
                  </div>
                ) : (
                  <>
                    {walletHistorySummary ? (
                      <div className="wallet-art-summary">
                        <article>
                          <small>Пополнено</small>
                          <strong>${walletHistorySummary.depositedUsd.toFixed(2)}</strong>
                          <span>+{formatNumber(walletHistorySummary.creditedCoins, 0)} Coins</span>
                        </article>
                        <article>
                          <small>Выплачено</small>
                          <strong>{walletHistorySummary.paidUsdt.toFixed(8)} USDT</strong>
                          <span>{formatNumber(walletHistorySummary.paidDna, 2)} DNA</span>
                        </article>
                      </div>
                    ) : null}

                    {walletHistorySummary && walletHistorySummary.bonusCoins > 0 ? (
                      <div className="wallet-art-bonus">
                        <span>Бонусные Coins</span>
                        <b>+{formatNumber(walletHistorySummary.bonusCoins, 0)}</b>
                      </div>
                    ) : null}

                    {walletHistory.length === 0 ? (
                      <div className="card wallet-art-empty">
                        <strong>Операций пока нет</strong>
                        <p>Здесь появятся пополнения Coins и заявки на вывод DNA.</p>
                      </div>
                    ) : (
                      <div className="wallet-art-list">
                        {walletHistory.map((item) => {
                          const meta = walletOperationStatus(item.type, item.status);
                          return (
                            <article key={`${item.type}-${item.id}`} className="wallet-art-operation">
                              <div className="wallet-art-operation-head">
                                <div>
                                  <strong>{item.type === "DEPOSIT" ? "Пополнение Coins" : "Вывод DNA"}</strong>
                                  <small>{formatDepositDate(item.createdAt)}</small>
                                </div>
                                <b className="wallet-art-status" style={{ color: meta.color }}>{meta.label}</b>
                              </div>

                              {item.type === "DEPOSIT" && item.deposit ? (
                                <div className="wallet-art-operation-grid">
                                  <div><small>Сумма</small><b>${item.deposit.usdAmount.toFixed(2)}</b></div>
                                  <div>
                                    <small>Coins</small>
                                    <b>{item.deposit.creditedCoins > 0 ? `+${formatNumber(item.deposit.creditedCoins, 0)}` : formatNumber(item.deposit.baseCoins, 0)}</b>
                                  </div>
                                  {item.deposit.bonusCoins > 0 ? (
                                    <div className="wallet-art-wide">
                                      <small>Бонус</small>
                                      <b>+{formatNumber(item.deposit.bonusCoins, 0)} Coins ({item.deposit.bonusPercent}%)</b>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {item.type === "WITHDRAWAL" && item.withdrawal ? (
                                <div className="wallet-art-operation-grid">
                                  <div><small>DNA</small><b>{formatNumber(item.withdrawal.dnaAmount, 2)}</b></div>
                                  <div><small>К выплате</small><b>{item.withdrawal.usdtAmount.toFixed(8)} USDT</b></div>
                                  <div className="wallet-art-wide"><small>Сеть</small><b>{item.withdrawal.network}</b></div>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {profileOpen ? (
              <div
                className="form-card profile-art-panel menu-popup-panel"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head profile-art-head"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span className="eyebrow">PLAYER PROFILE</span>
                    <h2>Мой профиль</h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flex: "0 0 auto",
                    }}
                  >
                    <button
                      className="coin-button"
                      onClick={() => void loadProfile()}
                    >
                      ↻
                    </button>
                    <button
                      className="coin-button"
                      onClick={() => setProfileOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {profileStatus === "loading" ||
                profileStatus === "idle" ? (
                  <p>Загружаем профиль...</p>
                ) : profileStatus === "error" ? (
                  <>
                    <p>Не удалось загрузить профиль.</p>
                    <button
                      className="primary"
                      onClick={() => void loadProfile()}
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : profile ? (
                  <>
                    <div
                      className="profile-player-card"
                      style={{
                        padding: 12,
                        marginTop: 8,
                        borderRadius: 14,
                        background: "rgba(167,243,72,.08)",
                        border: "1px solid rgba(167,243,72,.18)",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: 18,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {[
                          profile.player.firstName,
                          profile.player.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                          (profile.player.username
                            ? `@${profile.player.username}`
                            : "Игрок")}
                      </strong>

                      {profile.player.username ? (
                        <small
                          style={{
                            display: "block",
                            marginTop: 3,
                            opacity: .68,
                          }}
                        >
                          @{profile.player.username}
                        </small>
                      ) : null}

                      <small
                        style={{
                          display: "block",
                          marginTop: 5,
                          opacity: .62,
                        }}
                      >
                        В игре с{" "}
                        {new Date(
                          profile.player.createdAt,
                        ).toLocaleDateString("ru-RU")}
                      </small>
                    </div>

                    <div
                      className="profile-stats-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        {
                          label: "Coins",
                          value: formatNumber(
                            profile.balance.coins,
                            2,
                          ),
                        },
                        {
                          label: "DNA",
                          value: formatNumber(
                            profile.balance.dna,
                            4,
                          ),
                        },
                        {
                          label: "Динозавров",
                          value: profile.farm.dinosaurCount,
                        },
                        {
                          label: "Макс. уровень",
                          value: `Lv.${profile.farm.maxLevel}`,
                        },
                        {
                          label: "Coins / день",
                          value: formatNumber(
                            profile.farm.dailyCoins,
                            2,
                          ),
                        },
                        {
                          label: "DNA / день",
                          value: formatNumber(
                            profile.farm.dailyDna,
                            2,
                          ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="profile-stat-card"
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            background: "rgba(255,255,255,.04)",
                            minWidth: 0,
                          }}
                        >
                          <small style={{ opacity: .62 }}>
                            {item.label}
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 3,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.value}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div
                      className="profile-detail-card profile-farm-card"
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>Ферма</strong>

                      <div
                        style={{
                          display: "grid",
                          gap: 7,
                          marginTop: 9,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <small style={{ opacity: .66 }}>
                            Производство
                          </small>
                          <strong>
                            {formatNumber(
                              profile.farm.eggsPerHour,
                              2,
                            )}{" "}
                            яиц/ч
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <small style={{ opacity: .66 }}>
                            Собрано яиц всего
                          </small>
                          <strong>
                            {formatNumber(
                              profile.farm.totalEggsCollected,
                              0,
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <small style={{ opacity: .66 }}>
                            Вместимость гнезда
                          </small>
                          <strong>
                            {formatNumber(
                              profile.farm.nestCapacity,
                              0,
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <small style={{ opacity: .66 }}>
                            Экв. стоимость фермы
                          </small>
                          <strong>
                            {formatNumber(
                              profile.farm
                                .equivalentFarmCostCoins,
                              0,
                            )}{" "}
                            Coins
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      className="profile-detail-card profile-progress-card"
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>Прогресс</strong>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: 7,
                          marginTop: 9,
                        }}
                      >
                        <div>
                          <small style={{ opacity: .62 }}>
                            Заданий выполнено
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 2,
                            }}
                          >
                            {profile.progress.tasksCompleted}
                          </strong>
                        </div>

                        <div>
                          <small style={{ opacity: .62 }}>
                            Daily streak
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 2,
                            }}
                          >
                            {profile.progress.dailyStreak}/7
                          </strong>
                        </div>

                        <div>
                          <small style={{ opacity: .62 }}>
                            Daily получено
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 2,
                            }}
                          >
                            {profile.progress.dailyClaims}
                          </strong>
                        </div>

                        <div>
                          <small style={{ opacity: .62 }}>
                            Coins из Daily
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 2,
                            }}
                          >
                            {formatNumber(
                              profile.progress.dailyCoinsEarned,
                              0,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      className="profile-summary-grid"
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <div
                        className="profile-summary-card"
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <strong>Рефералы</strong>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 20,
                            fontWeight: 900,
                          }}
                        >
                          {profile.referrals.invited}
                        </div>
                        <small style={{ opacity: .64 }}>
                          приглашено ·{" "}
                          {formatNumber(
                            profile.referrals.coinsEarned,
                            0,
                          )}{" "}
                          Coins
                        </small>
                      </div>

                      <div
                        className="profile-summary-card"
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <strong>Выплаты</strong>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 20,
                            fontWeight: 900,
                          }}
                        >
                          {profile.withdrawals.paid}
                        </div>
                        <small style={{ opacity: .64 }}>
                          оплачено ·{" "}
                          {profile.withdrawals.paidUsdt.toFixed(8)}{" "}
                          USDT
                        </small>
                      </div>
                    </div>

                    <div
                      className="profile-detail-card profile-collection-card"
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>Коллекция</strong>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 9,
                        }}
                      >
                        {profile.farm.levelCounts.map(
                          (count, index) =>
                            count > 0 ? (
                              <span
                                key={index}
                                className="profile-level-chip"
                                style={{
                                  padding: "7px 9px",
                                  borderRadius: 999,
                                  border:
                                    "1px solid rgba(167,243,72,.18)",
                                  background:
                                    "rgba(167,243,72,.08)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                Lv.{index + 1} × {count}
                              </span>
                            ) : null,
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {profitPlanOpen ? (
              <div
                className="form-card menu-popup-panel"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span className="eyebrow">PROFIT PLAN</span>
                    <h2>📊 Моя ферма</h2>
                  </div>

                  <button
                    className="coin-button"
                    onClick={() => setProfitPlanOpen(false)}
                    style={{ flex: "0 0 auto" }}
                  >
                    ✕
                  </button>
                </div>

                {profitPlan.totalDinosaurs === 0 ? (
                  <div
                    style={{
                      padding: 14,
                      marginTop: 8,
                      borderRadius: 14,
                      background: "rgba(255,255,255,.04)",
                    }}
                  >
                    <strong>На доске пока нет динозавров</strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        opacity: .68,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      Добавьте динозавров на ферму, и здесь появится
                      персональный расчёт доходности.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        width: "100%",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                          minWidth: 0,
                        }}
                      >
                        <small style={{ opacity: .64 }}>
                          Динозавров
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 22,
                          }}
                        >
                          {profitPlan.totalDinosaurs}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                          minWidth: 0,
                        }}
                      >
                        <small style={{ opacity: .64 }}>
                          Производство
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 17,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {formatNumber(eggsPerHour, 2)} яиц/ч
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                          minWidth: 0,
                        }}
                      >
                        <small style={{ opacity: .64 }}>
                          Coins / день
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 19,
                          }}
                        >
                          {formatNumber(profitPlan.dailyCoins, 2)}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                          minWidth: 0,
                        }}
                      >
                        <small style={{ opacity: .64 }}>
                          DNA / день
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 19,
                          }}
                        >
                          {formatNumber(profitPlan.dailyDna, 2)}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gap: 8,
                        width: "100%",
                      }}
                    >
                      {[
                        { label: "1 день", days: 1 },
                        { label: "30 дней", days: 30 },
                        { label: "180 дней", days: 180 },
                        { label: "1 год", days: 365 },
                      ].map((period) => {
                        const coins =
                          profitPlan.dailyCoins * period.days;
                        const dna =
                          profitPlan.dailyDna * period.days;

                        return (
                          <article
                            key={period.days}
                            style={{
                              width: "100%",
                              minWidth: 0,
                              padding: 11,
                              borderRadius: 14,
                              border:
                                "1px solid rgba(255,255,255,.07)",
                              background:
                                "rgba(255,255,255,.035)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <strong>{period.label}</strong>
                              <small style={{ opacity: .55 }}>
                                без реинвестирования
                              </small>
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(2, minmax(0, 1fr))",
                                gap: 7,
                              }}
                            >
                              <div
                                style={{
                                  padding: "8px 9px",
                                  borderRadius: 10,
                                  background:
                                    "rgba(255,255,255,.04)",
                                  minWidth: 0,
                                }}
                              >
                                <small style={{ opacity: .62 }}>
                                  Coins
                                </small>
                                <strong
                                  style={{
                                    display: "block",
                                    marginTop: 2,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {formatNumber(coins, 2)}
                                </strong>
                              </div>

                              <div
                                style={{
                                  padding: "8px 9px",
                                  borderRadius: 10,
                                  background:
                                    "rgba(255,255,255,.04)",
                                  minWidth: 0,
                                }}
                              >
                                <small style={{ opacity: .62 }}>
                                  DNA
                                </small>
                                <strong
                                  style={{
                                    display: "block",
                                    marginTop: 2,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {formatNumber(dna, 2)}
                                </strong>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "baseline",
                        }}
                      >
                        <span
                          style={{
                            opacity: .68,
                            fontSize: 12,
                          }}
                        >
                          Теоретическая стоимость фермы
                        </span>
                        <strong>
                          {formatNumber(
                            profitPlan.equivalentCostCoins,
                            0,
                          )}{" "}
                          Coins
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "baseline",
                          marginTop: 7,
                        }}
                      >
                        <span
                          style={{
                            opacity: .68,
                            fontSize: 12,
                          }}
                        >
                          Coins-окупаемость
                        </span>
                        <strong>
                          ≈{" "}
                          {formatNumber(
                            profitPlan.paybackDays,
                            0,
                          )}{" "}
                          дней
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          marginBottom: 8,
                        }}
                      >
                        Состав фермы
                      </strong>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {profitPlan.levelCounts.map(
                          (count, index) =>
                            count > 0 ? (
                              <span
                                key={index}
                                className={`profit-dino-chip ${getDinoEvolutionClass(index + 1)}`}
                              >
                                <span className="profit-dino-chip-art-wrap" aria-hidden="true">
                                  <img
                                    src={getDinoAsset(index + 1)}
                                    alt=""
                                    className="profit-dino-chip-art"
                                    draggable={false}
                                  />
                                </span>
                                <span>Lv.{index + 1} × {count}</span>
                              </span>
                            ) : null,
                        )}
                      </div>
                    </div>

                    <small
                      style={{
                        display: "block",
                        marginTop: 10,
                        opacity: .58,
                        lineHeight: 1.45,
                      }}
                    >
                      Это расчёт по текущему составу вашей фермы и
                      установленной игровой экономике. Он не учитывает
                      будущие покупки, merge, задания, ежедневные бонусы
                      и реферальные награды. При заполненном гнезде
                      производство перестаёт накапливаться до сбора.
                    </small>
                  </>
                )}
              </div>
            ) : null}

            {levelsOpen ? (
              <div className="form-card levels-art-panel menu-popup-panel">
                <div className="levels-art-head">
                  <div>
                    <span className="eyebrow">DINO ECONOMY</span>
                    <h2>Lv.1–Lv.{MAX_DINOSAUR_LEVEL}</h2>
                  </div>

                  <button
                    className="coin-button"
                    onClick={() => setLevelsOpen(false)}
                    aria-label="Закрыть уровни"
                  >
                    ×
                  </button>
                </div>

                <div className="levels-art-intro">
                  Два одинаковых динозавра объединяются в один следующего уровня.
                  Merge оплачивается Coins. Доход и окупаемость ниже рассчитаны
                  по текущей игровой экономике.
                </div>

                <div className="levels-art-list">
                  {dinosaurs.map((dino) => {
                    const periods = [
                      { label: "1 день", days: 1 },
                      { label: "30 дней", days: 30 },
                      { label: "180 дней", days: 180 },
                      { label: "1 год", days: 365 },
                    ] as const;

                    const unlocked = dino.level <= dinoUnlockedLevel;

                    return (
                      <article
                        key={dino.level}
                        className={`levels-art-card ${
                          unlocked ? "levels-art-unlocked" : "levels-art-locked"
                        } ${
                          dino.level === MAX_DINOSAUR_LEVEL
                            ? "levels-art-max"
                            : ""
                        }`}
                      >
                        <div className="levels-art-card-head">
                          <div
                            className={`levels-art-dino-wrap dino-evolution ${getDinoEvolutionClass(dino.level)}`}
                          >
                            <span className="dino-evolution-aura" aria-hidden="true" />
                            <img
                              src={getDinoAsset(dino.level)}
                              alt=""
                              className="levels-art-dino"
                              draggable={false}
                              aria-hidden="true"
                            />
                            <span className="dino-evolution-mark" aria-hidden="true">
                              {getDinoEvolutionMark(dino.level)}
                            </span>
                            <b>Lv.{dino.level}</b>
                          </div>

                          <div className="levels-art-income">
                            <strong>
                              {formatNumber(dino.dailyCoins, 2)} Coins
                            </strong>
                            <strong>
                              {formatNumber(dino.dailyDna, 2)} DNA
                            </strong>
                            <small>
                              в сутки · {formatNumber(dino.eggsPerHour, 2)} яиц/ч
                            </small>
                          </div>

                          <span className="levels-art-state">
                            {unlocked ? "ОТКРЫТ" : "НЕ ОТКРЫТ"}
                          </span>
                        </div>

                        <div className="levels-art-periods">
                          {periods.map((period) => {
                            const amount =
                              dino.dailyCoins * period.days;

                            return (
                              <div key={period.days}>
                                <small>{period.label}</small>
                                <strong>{formatNumber(amount, 2)}</strong>
                                <span>Coins + столько же DNA</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="levels-art-economy">
                          <div>
                            <small>
                              {dino.level === 1
                                ? "Цена Lv.1"
                                : "Merge комиссия"}
                            </small>
                            <strong>
                              {formatNumber(
                                dino.level === 1
                                  ? gameConfig.levelOnePriceCoins
                                  : dino.mergeFeeCoins,
                                0,
                              )}{" "}
                              Coins
                            </strong>
                          </div>

                          <div>
                            <small>Окупаемость</small>
                            <strong>
                              ≈ {formatNumber(dino.paybackDays, 0)} дней
                            </strong>
                          </div>
                        </div>

                        <div className="levels-art-equivalent">
                          <span>
                            Полная экв. стоимость{" "}
                            <b>
                              {formatNumber(
                                dino.equivalentCostCoins,
                                0,
                              )} Coins
                            </b>
                          </span>

                          <span>
                            Для merge{" "}
                            <b>
                              {formatNumber(
                                dino.levelOneCopies,
                                0,
                              )} × Lv.1
                            </b>
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="levels-art-note">
                  Расчёты за 30, 180 и 365 дней сделаны без реинвестирования.
                  Окупаемость = полная стоимость получения уровня ÷ его
                  Coins-доход за день. DNA, задания, ежедневные бонусы и
                  рефералы в окупаемость не включены. При заполненном гнезде
                  новые яйца не накапливаются до следующего сбора.
                </div>
              </div>
            ) : null}

            {achievementsOpen ? (
              <div
                className="form-card menu-popup-panel"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span className="eyebrow">
                      ACHIEVEMENTS
                    </span>
                    <h2>🏅 Достижения</h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flex: "0 0 auto",
                    }}
                  >
                    <button
                      className="coin-button"
                      onClick={() =>
                        void loadAchievements()
                      }
                    >
                      ↻
                    </button>

                    <button
                      className="coin-button"
                      onClick={() =>
                        setAchievementsOpen(false)
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {achievementsStatus === "loading" ||
                achievementsStatus === "idle" ? (
                  <p>Загружаем достижения...</p>
                ) : achievementsStatus === "error" ? (
                  <>
                    <p>
                      Не удалось загрузить достижения.
                    </p>
                    <button
                      className="primary"
                      onClick={() =>
                        void loadAchievements()
                      }
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : achievements.length === 0 ? (
                  <p>Достижений пока нет.</p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        width: "100%",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          background:
                            "rgba(255,255,255,.04)",
                        }}
                      >
                        <small style={{ opacity: .62 }}>
                          Получено
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 19,
                          }}
                        >
                          {
                            achievements.filter(
                              (achievement) =>
                                achievement.claimed,
                            ).length
                          }{" "}
                          / {achievements.length}
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          background:
                            "rgba(255,255,255,.04)",
                        }}
                      >
                        <small style={{ opacity: .62 }}>
                          Можно забрать
                        </small>
                        <strong
                          style={{
                            display: "block",
                            marginTop: 3,
                            fontSize: 19,
                          }}
                        >
                          {
                            achievements.filter(
                              (achievement) =>
                                achievement.claimable,
                            ).length
                          }
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        width: "100%",
                        marginTop: 10,
                      }}
                    >
                      {achievements.map(
                        (achievement) => {
                          const percent = Math.max(
                            0,
                            Math.min(
                              100,
                              (achievement.progress /
                                Math.max(
                                  1,
                                  achievement.target,
                                )) *
                                100,
                            ),
                          );

                          return (
                            <article
                              key={achievement.code}
                              style={{
                                width: "100%",
                                minWidth: 0,
                                padding: 12,
                                borderRadius: 16,
                                border:
                                  achievement.claimable
                                    ? "1px solid rgba(244,211,94,.50)"
                                    : "1px solid rgba(255,255,255,.08)",
                                background:
                                  achievement.claimed
                                    ? "rgba(70,150,85,.10)"
                                    : achievement.claimable
                                      ? "rgba(244,211,94,.08)"
                                      : "rgba(255,255,255,.035)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  gap: 10,
                                  alignItems:
                                    "flex-start",
                                }}
                              >
                                <div
                                  style={{
                                    minWidth: 0,
                                  }}
                                >
                                  <strong
                                    style={{
                                      display: "block",
                                      fontSize: 15,
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {achievement.icon}{" "}
                                    {achievement.title}
                                  </strong>

                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 4,
                                      opacity: .68,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {
                                      achievement.description
                                    }
                                  </small>
                                </div>

                                <div
                                  style={{
                                    flex: "0 0 auto",
                                    textAlign: "right",
                                  }}
                                >
                                  <strong
                                    style={{
                                      display: "block",
                                      color: "#f4d35e",
                                    }}
                                  >
                                    +
                                    {formatNumber(
                                      achievement.rewardCoins,
                                      0,
                                    )}
                                  </strong>
                                  <small>Coins</small>
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop: 10,
                                  height: 8,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  background:
                                    "rgba(255,255,255,.08)",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${percent}%`,
                                    borderRadius: 999,
                                    background:
                                      achievement.claimed
                                        ? "#70d68a"
                                        : achievement.claimable
                                          ? "#f4d35e"
                                          : "#a7f348",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  marginTop: 7,
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  gap: 8,
                                  alignItems: "center",
                                }}
                              >
                                <small
                                  style={{ opacity: .72 }}
                                >
                                  {formatNumber(
                                    achievement.progress,
                                    0,
                                  )}{" "}
                                  /{" "}
                                  {formatNumber(
                                    achievement.target,
                                    0,
                                  )}
                                </small>

                                {achievement.claimed ? (
                                  <strong
                                    style={{
                                      color: "#92e6a5",
                                      fontSize: 12,
                                    }}
                                  >
                                    ✓ ПОЛУЧЕНО
                                  </strong>
                                ) : achievement.claimable ? (
                                  <button
                                    className="coin-button"
                                    onClick={() =>
                                      void claimAchievement(
                                        achievement,
                                      )
                                    }
                                    disabled={Boolean(
                                      claimingAchievementCode,
                                    )}
                                  >
                                    {claimingAchievementCode ===
                                    achievement.code
                                      ? "⏳"
                                      : "ЗАБРАТЬ"}
                                  </button>
                                ) : (
                                  <small
                                    style={{
                                      opacity: .55,
                                    }}
                                  >
                                    В процессе
                                  </small>
                                )}
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>

                    <small
                      style={{
                        display: "block",
                        opacity: .60,
                        lineHeight: 1.45,
                        marginTop: 10,
                      }}
                    >
                      Каждая награда выдаётся только
                      один раз. Условия проверяются на
                      сервере. Достижения начисляют только
                      Coins — DNA здесь не выдаётся.
                    </small>
                  </>
                )}
              </div>
            ) : null}

            {tasksOpen ? (
              <div
                className="form-card menu-popup-panel"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head"
                  style={{
                    width: "100%",
                    minWidth: 0,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span className="eyebrow">MISSIONS</span>
                    <h2>✅ Задания</h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flex: "0 0 auto",
                    }}
                  >
                    <button
                      className="coin-button"
                      onClick={() => void loadTasks()}
                    >
                      ↻
                    </button>
                    <button
                      className="coin-button"
                      onClick={() => setTasksOpen(false)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {tasksStatus === "loading" || tasksStatus === "idle" ? (
                  <p>Загружаем задания...</p>
                ) : tasksStatus === "error" ? (
                  <>
                    <p>Не удалось загрузить задания.</p>
                    <button
                      className="primary"
                      onClick={() => void loadTasks()}
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : tasks.length === 0 ? (
                  <p>Заданий пока нет.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      width: "100%",
                      marginTop: 8,
                    }}
                  >
                    {tasks.map((task) => {
                      const percent = Math.max(
                        0,
                        Math.min(
                          100,
                          (task.progress / Math.max(1, task.target)) * 100,
                        ),
                      );

                      return (
                        <article
                          key={task.code}
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: 12,
                            borderRadius: 16,
                            border: task.claimable
                              ? "1px solid rgba(167,243,72,.45)"
                              : "1px solid rgba(255,255,255,.08)",
                            background: task.claimed
                              ? "rgba(70,150,85,.10)"
                              : task.claimable
                                ? "rgba(167,243,72,.08)"
                                : "rgba(255,255,255,.035)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <strong
                                style={{
                                  display: "block",
                                  fontSize: 15,
                                  lineHeight: 1.3,
                                }}
                              >
                                {task.icon} {task.title}
                              </strong>
                              <small
                                style={{
                                  display: "block",
                                  marginTop: 4,
                                  opacity: .68,
                                  lineHeight: 1.4,
                                }}
                              >
                                {task.description}
                              </small>
                            </div>

                            <div
                              style={{
                                flex: "0 0 auto",
                                textAlign: "right",
                              }}
                            >
                              <strong
                                style={{
                                  display: "block",
                                  color: "#f4d35e",
                                }}
                              >
                                +{formatNumber(task.rewardCoins, 0)}
                              </strong>
                              <small>Coins</small>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              height: 8,
                              borderRadius: 999,
                              overflow: "hidden",
                              background: "rgba(255,255,255,.08)",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${percent}%`,
                                borderRadius: 999,
                                background: task.claimed
                                  ? "#70d68a"
                                  : "#a7f348",
                              }}
                            />
                          </div>

                          <div
                            style={{
                              marginTop: 7,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <small style={{ opacity: .72 }}>
                              {formatNumber(task.progress, 0)} /{" "}
                              {formatNumber(task.target, 0)}
                            </small>

                            {task.claimed ? (
                              <strong
                                style={{
                                  color: "#92e6a5",
                                  fontSize: 12,
                                }}
                              >
                                ✓ ПОЛУЧЕНО
                              </strong>
                            ) : task.claimable ? (
                              <button
                                className="coin-button"
                                onClick={() => void claimTask(task)}
                                disabled={Boolean(claimingTaskCode)}
                              >
                                {claimingTaskCode === task.code
                                  ? "⏳"
                                  : "ЗАБРАТЬ"}
                              </button>
                            ) : (
                              <small style={{ opacity: .55 }}>
                                В процессе
                              </small>
                            )}
                          </div>
                        </article>
                      );
                    })}

                    <small
                      style={{
                        display: "block",
                        opacity: .62,
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}
                    >
                      Награды за задания выдаются только в Coins. DNA за
                      задания не начисляется.
                    </small>
                  </div>
                )}
              </div>
            ) : null}

            {dailyOpen ? (
              <div
                className="form-card menu-popup-panel"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border: "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <div
                  className="section-head"
                  style={{ width: "100%", minWidth: 0 }}
                >
                  <div>
                    <span className="eyebrow">DAILY REWARD</span>
                    <h2>🎁 Ежедневный бонус</h2>
                  </div>

                  <button
                    className="coin-button"
                    onClick={() => setDailyOpen(false)}
                    style={{ flex: "0 0 auto" }}
                  >
                    ✕
                  </button>
                </div>

                {dailyStatus === "loading" || dailyStatus === "idle" ? (
                  <p>Загружаем ежедневный бонус...</p>
                ) : dailyStatus === "error" ? (
                  <>
                    <p>Не удалось загрузить бонус.</p>
                    <button
                      className="primary"
                      onClick={() => void loadDailyReward()}
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : dailyInfo ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        width: "100%",
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                        }}
                      >
                        <small style={{ opacity: .68 }}>
                          Следующая награда
                        </small>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 22,
                            fontWeight: 900,
                          }}
                        >
                          +{formatNumber(dailyInfo.nextRewardCoins, 0)}
                        </div>
                        <small>Coins</small>
                      </div>

                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.05)",
                        }}
                      >
                        <small style={{ opacity: .68 }}>
                          Серия
                        </small>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 22,
                            fontWeight: 900,
                          }}
                        >
                          {dailyInfo.streak}/7
                        </div>
                        <small>
                          {dailyInfo.canClaim
                            ? "Можно забрать"
                            : formatDailyRemaining(dailyInfo.nextClaimAt)}
                        </small>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                        gap: 5,
                        marginTop: 12,
                        width: "100%",
                      }}
                    >
                      {dailyInfo.rewards.map((reward, index) => {
                        const day = index + 1;
                        const completed =
                          dailyInfo.streak > 0 &&
                          day <= dailyInfo.streak;
                        const next = day === dailyInfo.nextDay;

                        return (
                          <div
                            key={day}
                            style={{
                              minWidth: 0,
                              padding: "8px 3px",
                              borderRadius: 11,
                              textAlign: "center",
                              border: next
                                ? "1px solid rgba(167,243,72,.70)"
                                : "1px solid rgba(255,255,255,.07)",
                              background: next
                                ? "rgba(167,243,72,.12)"
                                : completed
                                  ? "rgba(85,190,112,.12)"
                                  : "rgba(255,255,255,.035)",
                            }}
                          >
                            <small
                              style={{
                                display: "block",
                                opacity: .64,
                                fontSize: 9,
                              }}
                            >
                              Д{day}
                            </small>
                            <strong
                              style={{
                                display: "block",
                                marginTop: 3,
                                fontSize: 10,
                                overflow: "hidden",
                              }}
                            >
                              {completed ? "✓" : reward}
                            </strong>
                          </div>
                        );
                      })}
                    </div>

                    <p
                      style={{
                        margin: "12px 0 0",
                        opacity: .74,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      Награда выдаётся только в Coins. Новый бонус доступен
                      через 24 часа. Если пропустить более 48 часов, серия
                      начинается с первого дня.
                    </p>

                    <button
                      className="primary"
                      onClick={claimDailyReward}
                      disabled={
                        isClaimingDaily || !dailyInfo.canClaim
                      }
                      style={{ marginTop: 12 }}
                    >
                      {isClaimingDaily
                        ? "⏳ ПОЛУЧАЕМ..."
                        : dailyInfo.canClaim
                          ? `🎁 ЗАБРАТЬ +${formatNumber(
                              dailyInfo.nextRewardCoins,
                              0,
                            )} COINS`
                          : `⏱ ${formatDailyRemaining(
                              dailyInfo.nextClaimAt,
                            )}`}
                    </button>

                    <small
                      style={{
                        display: "block",
                        marginTop: 9,
                        opacity: .65,
                      }}
                    >
                      Всего получено: {dailyInfo.totalClaims} бонусов ·{" "}
                      {formatNumber(dailyInfo.totalCoins, 0)} Coins
                    </small>
                  </>
                ) : null}
              </div>
            ) : null}

            {withdrawalOpen ? (
              <div className="form-card withdraw-art-panel menu-popup-panel">
                <div className="withdraw-art-head">
                  <div>
                    <span className="eyebrow">WITHDRAWAL</span>
                    <h2>DNA → USDT</h2>
                  </div>

                  <button
                    className="coin-button"
                    onClick={() => setWithdrawalOpen(false)}
                    aria-label="Закрыть вывод"
                  >
                    ×
                  </button>
                </div>

                {withdrawalStatus === "loading" ||
                withdrawalStatus === "idle" ? (
                  <div className="withdraw-art-message">
                    Загружаем параметры вывода...
                  </div>
                ) : withdrawalStatus === "error" ? (
                  <div className="withdraw-art-message withdraw-art-error">
                    <strong>Не удалось загрузить заявки</strong>
                    <button
                      className="primary"
                      onClick={() => void loadWithdrawals()}
                    >
                      ПОВТОРИТЬ
                    </button>
                  </div>
                ) : withdrawalConfig ? (
                  <>
                    <div className="withdraw-art-summary">
                      <article>
                        <small>Доступно</small>
                        <strong>{formatNumber(state.dna, 4)} DNA</strong>
                        <span>
                          {(state.dna * withdrawalConfig.usdtPerDna).toFixed(8)} USDT
                        </span>
                      </article>

                      <article>
                        <small>Минимум</small>
                        <strong>
                          {formatNumber(withdrawalConfig.minDna, 0)} DNA
                        </strong>
                        <span>{withdrawalConfig.minUsdt.toFixed(2)} USDT</span>
                      </article>
                    </div>

                    <div className="withdraw-art-rate">
                      <span>Курс</span>
                      <b>
                        1 DNA = {withdrawalConfig.usdtPerDna.toFixed(4)} USDT
                      </b>
                    </div>

                    <div className="withdraw-art-fee-note">
                      <strong>Сетевая комиссия оплачивается проектом</strong>
                      <span>
                        На кошелёк игрок получает полностью указанную сумму USDT.
                      </span>
                    </div>

                    {withdrawals.some(
                      (item) =>
                        item.status === "PENDING" ||
                        item.status === "APPROVED",
                    ) ? (
                      <div className="withdraw-art-auto-status">
                        Статус активной заявки обновляется автоматически примерно каждые 15 секунд.
                      </div>
                    ) : null}

                    <div className="withdraw-art-form">
                      <label>
                        <span>Количество DNA</span>
                        <input
                          type="number"
                          min={withdrawalConfig.minDna}
                          step="0.0001"
                          value={withdrawDna}
                          onChange={(event) => setWithdrawDna(event.target.value)}
                        />
                      </label>

                      <label>
                        <span>Сеть USDT</span>
                        <input
                          type="text"
                          value={withdrawNetwork}
                          onChange={(event) => setWithdrawNetwork(event.target.value)}
                          placeholder="Например: TON / TRC20 / BEP20"
                          maxLength={32}
                        />
                      </label>

                      <label>
                        <span>Адрес USDT-кошелька</span>
                        <input
                          type="text"
                          value={withdrawWallet}
                          onChange={(event) => setWithdrawWallet(event.target.value)}
                          placeholder="Введите адрес кошелька"
                          maxLength={180}
                          autoComplete="off"
                        />
                      </label>
                    </div>

                    <div className="withdraw-art-preview">
                      <small>К получению</small>
                      <strong>{withdrawalPreview.toFixed(8)} USDT</strong>
                      <span>
                        DNA резервируется сразу после создания заявки. Сетевая комиссия оплачивается проектом отдельно.
                      </span>
                    </div>

                    <button
                      className="primary withdraw-art-submit"
                      onClick={submitWithdrawal}
                      disabled={isSubmittingWithdrawal}
                    >
                      {isSubmittingWithdrawal
                        ? "СОЗДАЁМ..."
                        : "ЗАПРОСИТЬ ВЫПЛАТУ"}
                    </button>

                    <div className="withdraw-art-history">
                      <div className="withdraw-art-history-head">
                        <div>
                          <span className="eyebrow">HISTORY</span>
                          <h3>История выплат</h3>
                        </div>

                        <button
                          className="coin-button"
                          onClick={() => void loadWithdrawals()}
                          aria-label="Обновить выплаты"
                        >
                          ↻
                        </button>
                      </div>

                      {withdrawals.length === 0 ? (
                        <div className="card withdraw-art-empty">
                          <strong>Заявок пока нет</strong>
                          <small>
                            После первого вывода заявка появится здесь вместе со статусом и суммой.
                          </small>
                        </div>
                      ) : (
                        <div className="withdraw-art-list">
                          {withdrawals.slice(0, 12).map((item) => {
                            const status = withdrawalStatusMeta(
                              item.status,
                              item.note,
                            );

                            return (
                              <article
                                key={item.id}
                                className="withdraw-art-item"
                              >
                                <div className="withdraw-art-item-top">
                                  <div>
                                    <strong>
                                      {item.usdtAmount.toFixed(8)} USDT
                                    </strong>
                                    <small>
                                      {formatNumber(item.dnaAmount, 4)} DNA
                                    </small>
                                  </div>

                                  <span
                                    className="withdraw-art-status"
                                    style={{
                                      borderColor: status.border,
                                      background: status.background,
                                      color: status.color,
                                    }}
                                  >
                                    {status.label}
                                  </span>
                                </div>

                                <div className="withdraw-art-item-grid">
                                  <div>
                                    <small>Сеть</small>
                                    <b>{item.network}</b>
                                  </div>

                                  <div>
                                    <small>Дата</small>
                                    <b>{formatWithdrawalDate(item.createdAt)}</b>
                                  </div>

                                  <div className="withdraw-art-wallet">
                                    <small>Кошелёк</small>
                                    <b>{shortWallet(item.walletAddress)}</b>
                                  </div>
                                </div>

                                {item.status === "PENDING" ? (
                                  <>
                                    <small className="withdraw-art-note">
                                      Заявка ожидает автоматической проверки и выплаты. DNA уже зарезервирована.
                                    </small>

                                    <button
                                      className="coin-button withdraw-art-cancel"
                                      disabled={cancelingWithdrawalId !== null}
                                      onClick={() =>
                                        void cancelWithdrawal(item)
                                      }
                                    >
                                      {cancelingWithdrawalId === item.id
                                        ? "ОТМЕНЯЕМ..."
                                        : "ОТМЕНИТЬ ЗАЯВКУ"}
                                    </button>
                                  </>
                                ) : null}

                                {item.status === "APPROVED" ? (
                                  <small
                                    className="withdraw-art-note"
                                    style={{ color: status.color }}
                                  >
                                    Заявка одобрена и ожидает отправки USDT.
                                  </small>
                                ) : null}

                                {item.status === "PAID" ? (
                                  <small
                                    className="withdraw-art-note"
                                    style={{ color: status.color }}
                                  >
                                    Выплата отправлена на указанный кошелёк.
                                  </small>
                                ) : null}

                                {item.status === "REJECTED" ? (
                                  <small
                                    className="withdraw-art-note"
                                    style={{ color: status.color }}
                                  >
                                    {item.note === "CANCELED_BY_PLAYER"
                                      ? "Вы отменили эту заявку. Зарезервированная DNA возвращена на игровой баланс."
                                      : "Заявка отклонена. Зарезервированная DNA возвращена на игровой баланс."}
                                  </small>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {pendingPurchase ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Подтверждение покупки"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(3,12,8,.76)",
            backdropFilter: "blur(5px)",
          }}
          onClick={cancelPurchase}
        >
          <div
            style={{
              width: "min(100%, 380px)",
              borderRadius: 22,
              padding: 18,
              background: "#10281e",
              border: "1px solid rgba(255,255,255,.12)",
              boxShadow: "0 18px 60px rgba(0,0,0,.45)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">CONFIRM PURCHASE</span>
            <h2 style={{ marginBottom: 8 }}>🛒 Подтвердить покупку?</h2>

            <div
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 16,
                background: "rgba(167,243,72,.08)",
                border: "1px solid rgba(167,243,72,.22)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 34 }}>🦖</div>
              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  fontSize: 18,
                }}
              >
                {pendingPurchase.title}
              </strong>
              <small
                style={{
                  display: "block",
                  marginTop: 4,
                  opacity: .65,
                }}
              >
                Динозавр будет добавлен на свободную клетку.
                Этот уровень уже разблокирован вашим прогрессом merge.
              </small>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,.04)",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ opacity: .68 }}>Стоимость</span>
              <strong>
                {formatNumber(pendingPurchase.priceCoins, 0)} Coins
              </strong>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,.04)",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ opacity: .68 }}>Баланс после покупки</span>
              <strong>
                {formatNumber(
                  Math.max(0, state.coins - pendingPurchase.priceCoins),
                  2,
                )}{" "}
                Coins
              </strong>
            </div>

            <p
              style={{
                margin: "10px 0 0",
                opacity: .60,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Coins будут списаны только после подтверждения.
            </p>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <button
                className="coin-button"
                onClick={cancelPurchase}
                disabled={isBuying || Boolean(buyingItemCode)}
                style={{ width: "100%" }}
              >
                ОТМЕНА
              </button>

              <button
                className="primary"
                onClick={() => void confirmPurchase()}
                disabled={isBuying || Boolean(buyingItemCode)}
                style={{ width: "100%" }}
              >
                {isBuying || buyingItemCode
                  ? "⏳ ПОКУПКА..."
                  : "ПОДТВЕРДИТЬ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingMerge ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Подтверждение merge"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(3,12,8,.76)",
            backdropFilter: "blur(5px)",
          }}
          onClick={cancelMerge}
        >
          <div
            style={{
              width: "min(100%, 380px)",
              borderRadius: 22,
              padding: 18,
              background: "#10281e",
              border: "1px solid rgba(255,255,255,.12)",
              boxShadow: "0 18px 60px rgba(0,0,0,.45)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">CONFIRM MERGE</span>
            <h2 style={{ marginBottom: 8 }}>🦖 Подтвердить merge?</h2>

            <p
              style={{
                margin: "0 0 14px",
                opacity: .72,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Два динозавра Lv.{pendingMerge.level} будут объединены
              без возможности отмены.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 7,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 13,
                  background: "rgba(255,255,255,.04)",
                }}
              >
                <div style={{ fontSize: 24 }}>🦖</div>
                <strong>Lv.{pendingMerge.level}</strong>
              </div>

              <div style={{ fontSize: 22, opacity: .72 }}>+</div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 13,
                  background: "rgba(255,255,255,.04)",
                }}
              >
                <div style={{ fontSize: 24 }}>🦖</div>
                <strong>Lv.{pendingMerge.level}</strong>
              </div>
            </div>

            <div
              style={{
                margin: "10px 0",
                textAlign: "center",
                fontSize: 22,
              }}
            >
              ↓
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(167,243,72,.08)",
                border: "1px solid rgba(167,243,72,.22)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28 }}>🦖</div>
              <strong style={{ fontSize: 18 }}>
                Получите Lv.{pendingMerge.resultLevel}
              </strong>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,.04)",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <span style={{ opacity: .68 }}>Комиссия</span>
              <strong>
                {formatNumber(pendingMerge.mergeFee, 0)} Coins
              </strong>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <button
                className="coin-button"
                onClick={cancelMerge}
                disabled={isMerging || isMoving}
                style={{ width: "100%" }}
              >
                ОТМЕНА
              </button>

              <button
                className="primary"
                onClick={() => void confirmMerge()}
                disabled={isMerging || isMoving}
                style={{ width: "100%" }}
              >
                {isMerging ? "⏳ MERGE..." : "ПОДТВЕРДИТЬ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tutorialOpen ? (
        <>
          <div className="tutorial-dim" aria-hidden="true" />
          <section
            className={`tutorial-guide tutorial-step-${tutorialStep}`}
            role="dialog"
            aria-modal="false"
            aria-label={tutorialCopy.steps[tutorialStep].title}
            data-i18n-ignore="true"
          >
            <div className="tutorial-guide-topline">
              <span>{tutorialCopy.stepLabel} {tutorialStep + 1}/4</span>
              <button type="button" onClick={() => completeTutorial(false)}>
                {tutorialCopy.skip}
              </button>
            </div>
            <h2>{tutorialCopy.steps[tutorialStep].title}</h2>
            <p>{tutorialCopy.steps[tutorialStep].body}</p>
            <button type="button" className="tutorial-guide-cta" onClick={advanceTutorial}>
              {tutorialStep === 0
                ? tutorialCopy.start
                : tutorialStep === 3
                  ? tutorialCopy.openRewards
                  : tutorialCopy.next}
            </button>
          </section>
        </>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}

      <nav className={`bottom-nav glass${tutorialOpen && tutorialStep === 0 ? " tutorial-nav-focus" : ""}`} aria-label="Главная навигация">
        {([
          ["nest", "/assets/game/ui/nav/nest.webp", "Гнездо"],
          ["game", "/assets/game/ui/nav/game.webp", "Игра"],
          ["shop", "/assets/game/ui/nav/shop.webp", "Магазин"],
          ["friends", "/assets/game/ui/nav/friends.webp", "Друзья"],
          ["menu", "/assets/game/ui/nav/menu.webp", "Меню"],
        ] as const).map(([key, iconSrc, label]) => (
          <button
            key={key}
            className={`${tab === key ? "active" : ""}${tutorialOpen && tutorialStep === 0 && key === "game" ? " tutorial-target" : ""}`}
            onClick={() => {
              setTab(key);
              if (tutorialOpen && tutorialStep === 0 && key === "game") {
                setTutorialStep(1);
              }
            }}
          >
            <img
              src={iconSrc}
              alt=""
              className="bottom-nav-icon"
              draggable={false}
              aria-hidden="true"
            />
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
