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

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  openTelegramLink?: (url: string) => void;
};

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
  const [isBuying, setIsBuying] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{
    source: "quick" | "shop" | "catalog";
    title: string;
    priceCoins: number;
    level?: number;
    item?: ShopItem;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
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
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  const [dinoCatalog, setDinoCatalog] = useState<DinoCatalogItem[]>([]);
  const [dinoUnlockedLevel, setDinoUnlockedLevel] = useState(1);
  const [buyingItemCode, setBuyingItemCode] = useState<string | null>(null);
  const [nestUpgradeOpen, setNestUpgradeOpen] = useState(false);
  const [nestUpgradeStatus, setNestUpgradeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [nestUpgradeInfo, setNestUpgradeInfo] = useState<NestUpgradeInfo | null>(null);
  const [isUpgradingNest, setIsUpgradingNest] = useState(false);
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

    return {
      amountUsd,
      baseCoins,
      bonusPercent,
      bonusCoins,
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

      setToast(
        `Собрано ${formatNumber(data.collectedEggs ?? 0, 0)} яиц: +${formatNumber(data.coinsReward ?? 0)} Coins и +${formatNumber(data.dnaReward ?? 0)} DNA ✓`,
      );
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

      setToast(
        `MERGE ✓ Lv.${data.merged?.level ?? resultLevel} · комиссия ${formatNumber(
          data.mergeFee ?? mergeFee,
          0,
        )} Coins`,
      );
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

        setSelectedMethodMinimumUsd(
          typeof data.minimumUsd ===
              "number" &&
            Number.isFinite(
              data.minimumUsd,
            )
            ? data.minimumUsd
            : null,
        );
      } catch (error) {
        console.error(
          "Failed to load selected method minimum",
          error,
        );

        setSelectedMethodMinimumUsd(
          null,
        );
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

  const openDepositConfirmation = () => {
    if (
      isCreatingDeposit ||
      !depositPreview.valid ||
      !depositMethodCode ||
      depositTelegramRequired ||
      !depositProviderConfigured
    ) {
      return;
    }

    setDepositConfirmationOpen(
      true,
    );
  };

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

    setWithdrawalOpen(true);
    void loadWithdrawals();
  };

  const submitWithdrawal = async () => {
    if (isSubmittingWithdrawal || !withdrawalConfig) return;

    const dnaAmount = Number(withdrawDna);

    if (!Number.isFinite(dnaAmount) || dnaAmount < withdrawalConfig.minDna) {
      setToast(`Минимальная сумма вывода — ${withdrawalConfig.minDna} DNA.`);
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
        `Заявка создана: ${formatNumber(data.withdrawal.dnaAmount, 4)} DNA → ${data.withdrawal.usdtAmount.toFixed(8)} USDT. Статус PENDING.`,
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

  const withdrawalPreview = withdrawalConfig
    ? Math.max(0, Number(withdrawDna) || 0) * withdrawalConfig.usdtPerDna
    : 0;


  const progress = Math.min(100, (state.eggs / Math.max(1, state.capacity)) * 100);

  return (
    <main className="app-shell">
      <header className="hud glass">
        <div className="avatar">🦖</div>
        <div className="profile">
          <strong>{playerName}</strong>
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
      </header>

      <section className="content">
        {tab === "nest" && (
          <div className="screen nest-screen">
            <div className="hero-card">
              <div className="sun">☀️</div>
              <div className="jungle">🌿🌴🌿</div>
              <div className="nest-visual">🪺<span className="egg">🥚</span></div>
              <h1>Гнездо</h1>
              <p>
                {formatNumber(state.eggs, 2)} /{" "}
                {formatNumber(state.capacity, 0)} яиц
              </p>
              <div className="progress"><div style={{ width: `${progress}%` }} /></div>
              <div className="rate">⚡ {formatNumber(eggsPerHour, 0)} яиц / час</div>
              <button className="primary" onClick={collectEggs} disabled={isLoading || isCollecting || Boolean(loadError)}>{isCollecting ? "⏳ СОБИРАЕМ..." : "🥚 СОБРАТЬ ЯЙЦА"}</button>
              <button
                className="coin-button"
                onClick={openNestUpgrades}
                disabled={isLoading || Boolean(loadError)}
                style={{ marginTop: 10, width: "100%" }}
              >
                🪺 УЛУЧШИТЬ ГНЕЗДО
              </button>
            </div>

            <div className="stats-grid">
              <article className="stat-card"><span>За день</span><strong>{formatNumber(eggsPerHour * 24, 0)}</strong><small>яиц</small></article>
              <article className="stat-card"><span>Coins / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToCoin, 2)}</strong><small>расчётно</small></article>
              <article className="stat-card"><span>DNA / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToDna, 2)}</strong><small>расчётно</small></article>
            </div>

            {nestUpgradeOpen ? (
              <div
                className="form-card"
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
          <div className="screen">
            <div className="section-head">
              <div><span className="eyebrow">MERGE FARM</span><h2>Игровая доска</h2></div>
              <button className="coin-button" onClick={buyDino} disabled={isLoading || isBuying || Boolean(loadError)}>{isBuying ? "⏳ ПОКУПКА..." : "+ 🦕 100"}</button>
            </div>
            <p className="hint">Данные загружены из Neon. Сбор, покупка и merge сохраняются в Neon через сервер.</p>
            <div className="board">
              {state.board.map((level, index) => (
                <button
                  key={index}
                  className={`slot ${selected === index ? "selected" : ""}`}
                  onClick={() => chooseSlot(index)}
                  aria-label={level ? `Динозавр уровня ${level}` : "Пустая клетка"}
                  disabled={isLoading || isMerging || Boolean(loadError)}
                >
                  {level ? <><span className="dino">🦖</span><b>Lv.{level}</b></> : <span className="plus">+</span>}
                </button>
              ))}
            </div>
            <div className="card"><strong>Общее производство</strong><span>{formatNumber(eggsPerHour, 0)} яиц / час</span></div>
          </div>
        )}

        {tab === "shop" && (
          <div className="screen">
            <span className="eyebrow">DINO SHOP</span>
            <h2>Магазин</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 8,
                marginBottom: 14,
              }}
            >
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
                🦖 ДИНОЗАВРЫ
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
                💳 ПОПОЛНИТЬ
              </button>
            </div>

            {shopSection === "dinos" ? (
              <>
                <h2
                  style={{
                    fontSize: 20,
                    marginTop: 0,
                  }}
                >
                  Магазин динозавров
                </h2>

                <p className="hint">
                  Lv.1 доступен сразу. Lv.2–Lv.16
                  открываются для прямой покупки
                  только после того, как вы сами
                  получили этот уровень через
                  merge.
                </p>

                <div className="card">
                  <strong>
                    🔓 Открыто до Lv.
                    {dinoUnlockedLevel}
                  </strong>
                  <p>
                    Прямая покупка не открывает
                    следующий уровень. Чтобы
                    разблокировать новый уровень
                    магазина, нужно сделать merge.
                  </p>
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
                  <div className="menu-list">
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
                          <span>
                            <strong>
                              {item.unlocked
                                ? "🦖"
                                : "🔒"}{" "}
                              {item.title}
                            </strong>
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

                          <b>
                            {item.unlocked
                              ? `🪙 ${formatNumber(
                                  item.priceCoins,
                                  0,
                                )}`
                              : "ЗАКРЫТО"}
                          </b>
                        </button>
                      ),
                    )}
                  </div>
                )}

                <div className="card" style={{ display: "block", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                  <strong>
                    Ваш баланс
                  </strong>
                  <p>
                    🪙{" "}
                    {formatNumber(
                      state.coins,
                      2,
                    )}{" "}
                    Coins · 🧬{" "}
                    {formatNumber(
                      state.dna,
                      2,
                    )}{" "}
                    DNA
                  </p>
                  <p>
                    🪺 Вместимость:{" "}
                    {formatNumber(
                      state.capacity,
                      0,
                    )}{" "}
                    яиц
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2
                  style={{
                    fontSize: 20,
                    marginTop: 0,
                  }}
                >
                  💳 Пополнение баланса
                </h2>

                <p className="hint">
                  Курс:{" "}
                  <strong>
                    $1 ={" "}
                    {formatNumber(
                      depositConfig
                        ?.coinsPerUsd ??
                        10_000,
                      0,
                    )}{" "}
                    Coins
                  </strong>
                  . Coins начисляются только после
                  подтверждения криптоплатежа.
                </p>

                <p
                  className="hint"
                  style={{
                    marginTop: -4,
                    opacity: .72,
                  }}
                >
                  ⚠️ Минимум рассчитывается отдельно
                  для выбранной монеты и сети и
                  может меняться из-за комиссий и
                  курса.
                </p>

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
                      Выберите криптовалюту
                    </strong>

                    {depositMethodCode ? (
                      <div
                        style={{
                          marginBottom: 10,
                          padding: "9px 11px",
                          borderRadius: 12,
                          background:
                            "rgba(255,255,255,.04)",
                          fontSize: 12,
                          lineHeight: 1.45,
                        }}
                      >
                        {minimumLoading ? (
                          <span>
                            ⏳ Проверяем минимум
                            выбранной сети...
                          </span>
                        ) : selectedMethodMinimumUsd !==
                          null ? (
                          <span>
                            Минимум для{" "}
                            <b>
                              {depositMethods.find(
                                (method) =>
                                  method.code ===
                                  depositMethodCode,
                              )?.label ??
                                depositMethodCode}
                            </b>
                            : примерно{" "}
                            <b>
                              $
                              {selectedMethodMinimumUsd.toFixed(
                                2,
                              )}
                            </b>
                          </span>
                        ) : (
                          <span
                            style={{
                              opacity: .7,
                            }}
                          >
                            Минимум будет окончательно
                            проверен сервером при
                            создании платежа.
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gap: 7,
                        marginTop: 10,
                      }}
                    >
                      {depositMethods.map(
                        (method) => {
                          const selected =
                            depositMethodCode ===
                            method.code;

                          return (
                            <button
                              key={
                                method.code
                              }
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
                                minHeight: 52,
                                boxSizing: "border-box",
                                display: "flex",
                                flexDirection: "row",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "space-between",
                                gap: 10,
                                padding: "12px 14px",
                                margin: 0,
                                textAlign: "left",
                                whiteSpace: "normal",
                                opacity:
                                  method.available
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

                    <button
                      className="primary"
                      disabled={
                        !depositPreview.valid ||
                        !depositMethodCode ||
                        isCreatingDeposit ||
                        depositTelegramRequired ||
                        !depositProviderConfigured
                      }
                      onClick={
                        openDepositConfirmation
                      }
                      style={{
                        width: "100%",
                        minWidth: 0,
                        maxWidth: "none",
                        boxSizing: "border-box",
                        marginTop: 12,
                      }}
                    >
                      {isCreatingDeposit
                        ? "⏳ СОЗДАЁМ ПЛАТЁЖ..."
                        : "ПРОДОЛЖИТЬ К ОПЛАТЕ"}
                    </button>
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
                            )?.label
                          }
                        </strong>
                      </div>

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
                            minWidth: 0,
                            padding: 12,
                            borderRadius:
                              14,
                            background:
                              "rgba(255,255,255,.04)",
                          }}
                        >
                          <small
                            style={{
                              opacity:
                                .62,
                            }}
                          >
                            Сумма
                          </small>
                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                4,
                            }}
                          >
                            $
                            {depositPreview.amountUsd.toFixed(
                              2,
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            padding: 12,
                            borderRadius:
                              14,
                            background:
                              "rgba(167,243,72,.08)",
                          }}
                        >
                          <small
                            style={{
                              opacity:
                                .62,
                            }}
                          >
                            Получите
                          </small>
                          <strong
                            style={{
                              display:
                                "block",
                              marginTop:
                                4,
                            }}
                          >
                            {formatNumber(
                              depositPreview.totalCoins,
                              0,
                            )}{" "}
                            Coins
                          </strong>
                        </div>
                      </div>

                      {depositPreview.bonusCoins >
                      0 ? (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            borderRadius:
                              12,
                            background:
                              "rgba(255,215,106,.08)",
                            fontSize: 13,
                          }}
                        >
                          🎁 Включён бонус
                          первого пополнения:
                          +
                          {formatNumber(
                            depositPreview.bonusCoins,
                            0,
                          )}{" "}
                          Coins
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 12,
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
                          isCreatingDeposit
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

                <div className="card">
                  <strong>
                    🔒 Как начисляются Coins
                  </strong>
                  <p>
                    Нажатие «Оплатить» Coins не
                    начисляет. Баланс меняется только
                    после подтверждения платежа
                    сервером.
                  </p>
                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    Один и тот же платёж не может
                    быть зачислен дважды.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "friends" && (
          <div className="screen">
            <span className="eyebrow">REFERRALS</span><h2>Друзья</h2>
            <div className="invite-card">
              <div className="invite-art">👥🦕</div>
              <h3>Стройте ферму вместе</h3>
              {authMode !== "telegram" ? (
                <p>Откройте игру через Telegram, чтобы получить личную ссылку приглашения.</p>
              ) : referralStatus === "loading" ? (
                <p>Загружаем вашу реферальную ссылку...</p>
              ) : referralInfo?.enabled ? (
                <>
                  <p>Друг получает +{formatNumber(referralInfo.inviteeRewardCoins, 0)} Coins, а вы +{formatNumber(referralInfo.inviterRewardCoins, 0)} Coins после его первого входа.</p>
                  <p><code>{referralInfo.inviteLink}</code></p>
                </>
              ) : (
                <p>Реферальная ссылка пока недоступна. Попробуйте открыть игру через Telegram ещё раз.</p>
              )}
              <button
                className="primary"
                onClick={inviteFriend}
                disabled={authMode !== "telegram" || referralStatus === "loading"}
              >
                ПРИГЛАСИТЬ ДРУГА
              </button>
            </div>
            <div className="stats-grid">
              <article className="stat-card"><span>Приглашено</span><strong>{referralInfo?.invitedCount ?? 0}</strong></article>
              <article className="stat-card"><span>Бонус за друга</span><strong>+{formatNumber(referralInfo?.inviterRewardCoins ?? 500, 0)}</strong><small>Coins</small></article>
              <article className="stat-card"><span>Начислено</span><strong>{formatNumber(referralInfo?.totalBonusCoins ?? 0, 0)}</strong><small>Coins</small></article>
            </div>
            {referralInfo?.recent?.length ? (
              <div className="card">
                <strong>Последние приглашённые</strong>
                {referralInfo.recent.slice(0, 5).map((item) => (
                  <p key={item.id}>
                    👤 {item.friend.firstName || item.friend.username || "Игрок"} · +{formatNumber(item.rewardCoins, 0)} Coins
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {tab === "menu" && (
          <div className="screen">
            <span className="eyebrow">TOOLS</span><h2>Меню</h2>

            <div className="menu-list">
              <button onClick={openProfile}><span>👤 Мой профиль</span><b>СТАТИСТИКА</b></button>
              <button onClick={openWalletHistory}><span>💰 История баланса</span><b>ПОПОЛНЕНИЯ / ВЫВОДЫ</b></button>
              <button onClick={openDnaWithdrawal}><span>🧬 Вывод DNA</span><b>→ USDT</b></button>
              <button onClick={() => setLevelsOpen((value) => !value)}><span>📈 Уровни динозавров</span><b>Lv.1–16</b></button>
              <button onClick={() => setProfitPlanOpen((value) => !value)}><span>📊 Profit Plan</span><b>МОЯ ФЕРМА</b></button>
              <button onClick={openDailyReward}><span>🎁 Ежедневный бонус</span><b>{dailyInfo?.canClaim ? "ЗАБРАТЬ" : "›"}</b></button>
              <button onClick={openTasks}><span>✅ Задания</span><b>{tasks.some((task) => task.claimable) ? "ЗАБРАТЬ" : "›"}</b></button>
              <button onClick={openAchievements}><span>🏅 Достижения</span><b>{achievements.some((achievement) => achievement.claimable) ? "ЗАБРАТЬ" : "›"}</b></button>
              <button onClick={() => setToast("Рулетка отключена до server-side реализации")}><span>🎰 Рулетка</span><b>OFF</b></button>
              <button onClick={() => window.location.reload()}><span>🔄 Перезагрузить из Neon</span><b>›</b></button>
            </div>

            {walletHistoryOpen ? (
              <div
                className="form-card"
                style={{
                  marginTop: 16,
                  borderRadius: 20,
                  background: "#10281e",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  padding: 14,
                  width: "100%",
                  minWidth: 0,
                  boxSizing:
                    "border-box",
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
                      WALLET HISTORY
                    </span>
                    <h2>
                      💰 История баланса
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flex:
                        "0 0 auto",
                    }}
                  >
                    <button
                      className="coin-button"
                      onClick={() =>
                        void loadWalletHistory()
                      }
                    >
                      ↻
                    </button>

                    <button
                      className="coin-button"
                      onClick={() =>
                        setWalletHistoryOpen(
                          false,
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {walletHistoryStatus ===
                  "loading" ||
                walletHistoryStatus ===
                  "idle" ? (
                  <p>
                    Загружаем операции...
                  </p>
                ) : walletHistoryStatus ===
                  "error" ? (
                  <>
                    <p>
                      Не удалось загрузить
                      историю.
                    </p>
                    <button
                      className="primary"
                      onClick={() =>
                        void loadWalletHistory()
                      }
                    >
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : (
                  <>
                    {walletHistorySummary ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            padding: 11,
                            borderRadius: 14,
                            background:
                              "rgba(167,243,72,.08)",
                          }}
                        >
                          <small
                            style={{
                              opacity: .65,
                            }}
                          >
                            Пополнено
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop: 4,
                              fontSize: 16,
                            }}
                          >
                            $
                            {walletHistorySummary.depositedUsd.toFixed(
                              2,
                            )}
                          </strong>

                          <small>
                            +
                            {formatNumber(
                              walletHistorySummary.creditedCoins,
                              0,
                            )}{" "}
                            Coins
                          </small>
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            padding: 11,
                            borderRadius: 14,
                            background:
                              "rgba(255,255,255,.04)",
                          }}
                        >
                          <small
                            style={{
                              opacity: .65,
                            }}
                          >
                            Выплачено
                          </small>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop: 4,
                              fontSize: 16,
                            }}
                          >
                            {walletHistorySummary.paidUsdt.toFixed(
                              8,
                            )}{" "}
                            USDT
                          </strong>

                          <small>
                            {formatNumber(
                              walletHistorySummary.paidDna,
                              2,
                            )}{" "}
                            DNA
                          </small>
                        </div>
                      </div>
                    ) : null}

                    {walletHistorySummary &&
                    walletHistorySummary.bonusCoins >
                      0 ? (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 10,
                          borderRadius: 12,
                          background:
                            "rgba(255,215,106,.08)",
                          fontSize: 13,
                        }}
                      >
                        🎁 Получено бонусных
                        Coins:{" "}
                        <b>
                          {formatNumber(
                            walletHistorySummary.bonusCoins,
                            0,
                          )}
                        </b>
                      </div>
                    ) : null}

                    {walletHistory.length ===
                    0 ? (
                      <div
                        className="card"
                        style={{
                          display:
                            "block",
                          marginTop: 12,
                        }}
                      >
                        <strong>
                          Операций пока нет
                        </strong>
                        <p>
                          Здесь появятся
                          пополнения Coins и
                          заявки на вывод DNA.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        {walletHistory.map(
                          (item) => {
                            const meta =
                              walletOperationStatus(
                                item.type,
                                item.status,
                              );

                            return (
                              <div
                                key={`${item.type}-${item.id}`}
                                style={{
                                  minWidth:
                                    0,
                                  padding:
                                    12,
                                  borderRadius:
                                    14,
                                  background:
                                    "rgba(255,255,255,.04)",
                                  border:
                                    "1px solid rgba(255,255,255,.07)",
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    alignItems:
                                      "flex-start",
                                    justifyContent:
                                      "space-between",
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      minWidth:
                                        0,
                                    }}
                                  >
                                    <strong
                                      style={{
                                        display:
                                          "block",
                                      }}
                                    >
                                      {item.type ===
                                      "DEPOSIT"
                                        ? "💳 Пополнение Coins"
                                        : "🧬 Вывод DNA"}
                                    </strong>

                                    <small
                                      style={{
                                        display:
                                          "block",
                                        marginTop:
                                          3,
                                        opacity:
                                          .62,
                                      }}
                                    >
                                      {formatDepositDate(
                                        item.createdAt,
                                      )}
                                    </small>
                                  </div>

                                  <b
                                    style={{
                                      color:
                                        meta.color,
                                      fontSize:
                                        12,
                                      textAlign:
                                        "right",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {meta.icon}{" "}
                                    {meta.label}
                                  </b>
                                </div>

                                {item.type ===
                                  "DEPOSIT" &&
                                item.deposit ? (
                                  <div
                                    style={{
                                      marginTop:
                                        10,
                                      display:
                                        "grid",
                                      gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                      gap: 7,
                                    }}
                                  >
                                    <div>
                                      <small
                                        style={{
                                          opacity:
                                            .6,
                                        }}
                                      >
                                        Сумма
                                      </small>
                                      <div>
                                        <b>
                                          $
                                          {item.deposit.usdAmount.toFixed(
                                            2,
                                          )}
                                        </b>
                                      </div>
                                    </div>

                                    <div>
                                      <small
                                        style={{
                                          opacity:
                                            .6,
                                        }}
                                      >
                                        Coins
                                      </small>
                                      <div>
                                        <b>
                                          {item.deposit.creditedCoins >
                                          0
                                            ? `+${formatNumber(
                                                item.deposit.creditedCoins,
                                                0,
                                              )}`
                                            : formatNumber(
                                                item.deposit.baseCoins,
                                                0,
                                              )}
                                        </b>
                                      </div>
                                    </div>

                                    {item.deposit.bonusCoins >
                                    0 ? (
                                      <div
                                        style={{
                                          gridColumn:
                                            "1 / -1",
                                        }}
                                      >
                                        <small
                                          style={{
                                            opacity:
                                              .6,
                                          }}
                                        >
                                          Бонус
                                        </small>
                                        <div>
                                          🎁 +
                                          {formatNumber(
                                            item.deposit.bonusCoins,
                                            0,
                                          )}{" "}
                                          Coins (
                                          {
                                            item
                                              .deposit
                                              .bonusPercent
                                          }
                                          %)
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                {item.type ===
                                  "WITHDRAWAL" &&
                                item.withdrawal ? (
                                  <div
                                    style={{
                                      marginTop:
                                        10,
                                      display:
                                        "grid",
                                      gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                      gap: 7,
                                    }}
                                  >
                                    <div>
                                      <small
                                        style={{
                                          opacity:
                                            .6,
                                        }}
                                      >
                                        DNA
                                      </small>
                                      <div>
                                        <b>
                                          {formatNumber(
                                            item.withdrawal.dnaAmount,
                                            2,
                                          )}
                                        </b>
                                      </div>
                                    </div>

                                    <div>
                                      <small
                                        style={{
                                          opacity:
                                            .6,
                                        }}
                                      >
                                        К выплате
                                      </small>
                                      <div>
                                        <b>
                                          {item.withdrawal.usdtAmount.toFixed(
                                            8,
                                          )}{" "}
                                          USDT
                                        </b>
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        gridColumn:
                                          "1 / -1",
                                      }}
                                    >
                                      <small
                                        style={{
                                          opacity:
                                            .6,
                                        }}
                                      >
                                        Сеть
                                      </small>
                                      <div>
                                        {
                                          item
                                            .withdrawal
                                            .network
                                        }
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {profileOpen ? (
              <div
                className="form-card"
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
                    <span className="eyebrow">PLAYER PROFILE</span>
                    <h2>👤 Мой профиль</h2>
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
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>🌱 Ферма</strong>

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
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>🏅 Прогресс</strong>

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
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <strong>👥 Рефералы</strong>
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
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(255,255,255,.04)",
                        }}
                      >
                        <strong>💸 Выплаты</strong>
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
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <strong>🦖 Коллекция</strong>

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
                className="form-card"
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
                                style={{
                                  padding: "7px 9px",
                                  borderRadius: 999,
                                  background:
                                    "rgba(167,243,72,.10)",
                                  border:
                                    "1px solid rgba(167,243,72,.20)",
                                  fontSize: 12,
                                  fontWeight: 800,
                                }}
                              >
                                🦖 Lv.{index + 1} × {count}
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
              <div
                className="form-card"
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
                    <span className="eyebrow">DINO ECONOMY</span>
                    <h2>📈 Lv.1–Lv.{MAX_DINOSAUR_LEVEL}</h2>
                  </div>

                  <button
                    className="coin-button"
                    onClick={() => setLevelsOpen(false)}
                    style={{ flex: "0 0 auto" }}
                  >
                    ✕
                  </button>
                </div>

                <p
                  style={{
                    margin: "4px 0 12px",
                    opacity: .72,
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Два одинаковых динозавра объединяются в один следующего
                  уровня. Merge оплачивается Coins. Комиссия подобрана так,
                  чтобы окупаемость уровней оставалась контролируемой.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 7,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  {dinosaurs.map((dino) => {
                    const periods = [
                      { label: "1 день", days: 1 },
                      { label: "30 дней", days: 30 },
                      { label: "180 дней", days: 180 },
                      { label: "1 год", days: 365 },
                    ] as const;

                    return (
                      <article
                        key={dino.level}
                        style={{
                          width: "100%",
                          minWidth: 0,
                          padding: 11,
                          borderRadius: 14,
                          border:
                            dino.level === MAX_DINOSAUR_LEVEL
                              ? "1px solid rgba(167,243,72,.45)"
                              : "1px solid rgba(255,255,255,.07)",
                          background:
                            dino.level === MAX_DINOSAUR_LEVEL
                              ? "rgba(167,243,72,.08)"
                              : "rgba(255,255,255,.035)",
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                width: 46,
                                height: 46,
                                flex: "0 0 auto",
                                borderRadius: 13,
                                display: "grid",
                                placeItems: "center",
                                background: "rgba(255,255,255,.05)",
                              }}
                            >
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 17 }}>🦖</div>
                                <strong style={{ fontSize: 10 }}>
                                  Lv.{dino.level}
                                </strong>
                              </div>
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <strong
                                style={{
                                  display: "block",
                                  fontSize: 15,
                                }}
                              >
                                {formatNumber(dino.dailyCoins, 2)} Coins +{" "}
                                {formatNumber(dino.dailyDna, 2)} DNA
                              </strong>
                              <small style={{ opacity: .62 }}>
                                в сутки · {formatNumber(dino.eggsPerHour, 2)} яиц/ч
                              </small>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 9,
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(2, minmax(0, 1fr))",
                            gap: 6,
                          }}
                        >
                          {periods.map((period) => {
                            const amount =
                              dino.dailyCoins * period.days;

                            return (
                              <div
                                key={period.days}
                                style={{
                                  padding: "8px 9px",
                                  borderRadius: 10,
                                  background: "rgba(255,255,255,.04)",
                                  minWidth: 0,
                                }}
                              >
                                <small
                                  style={{
                                    display: "block",
                                    opacity: .60,
                                  }}
                                >
                                  {period.label}
                                </small>
                                <strong
                                  style={{
                                    display: "block",
                                    marginTop: 2,
                                    fontSize: 13,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {formatNumber(amount, 2)}
                                </strong>
                                <small style={{ opacity: .72 }}>
                                  Coins + столько же DNA
                                </small>
                              </div>
                            );
                          })}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(2, minmax(0, 1fr))",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              padding: "8px 9px",
                              borderRadius: 10,
                              background: "rgba(255,255,255,.04)",
                              minWidth: 0,
                            }}
                          >
                            <small
                              style={{
                                display: "block",
                                opacity: .60,
                              }}
                            >
                              {dino.level === 1
                                ? "Цена Lv.1"
                                : "Merge комиссия"}
                            </small>
                            <strong
                              style={{
                                display: "block",
                                marginTop: 2,
                                fontSize: 13,
                              }}
                            >
                              {formatNumber(
                                dino.level === 1
                                  ? gameConfig.levelOnePriceCoins
                                  : dino.mergeFeeCoins,
                                0,
                              )}{" "}
                              Coins
                            </strong>
                          </div>

                          <div
                            style={{
                              padding: "8px 9px",
                              borderRadius: 10,
                              background: "rgba(255,255,255,.04)",
                              minWidth: 0,
                            }}
                          >
                            <small
                              style={{
                                display: "block",
                                opacity: .60,
                              }}
                            >
                              Окупаемость
                            </small>
                            <strong
                              style={{
                                display: "block",
                                marginTop: 2,
                                fontSize: 13,
                              }}
                            >
                              ≈ {formatNumber(dino.paybackDays, 0)} дней
                            </strong>
                          </div>
                        </div>

                        <small
                          style={{
                            display: "block",
                            marginTop: 7,
                            opacity: .56,
                            lineHeight: 1.4,
                          }}
                        >
                          Полная экв. стоимость:{" "}
                          {formatNumber(
                            dino.equivalentCostCoins,
                            0,
                          )} Coins · для merge:{" "}
                          {formatNumber(
                            dino.levelOneCopies,
                            0,
                          )} × Lv.1
                        </small>
                      </article>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(255,255,255,.04)",
                  }}
                >
                  <small style={{ lineHeight: 1.45, opacity: .68 }}>
                    Расчёты за 30, 180 и 365 дней сделаны без реинвестирования.
                    «Окупаемость» = полная стоимость получения уровня ÷ его
                    Coins-доход за день. DNA, задания, ежедневные бонусы и
                    рефералы в окупаемость не включены. При переполненном
                    гнезде новые яйца не накапливаются до следующего сбора.
                  </small>
                </div>
              </div>
            ) : null}

            {achievementsOpen ? (
              <div
                className="form-card"
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
                className="form-card"
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
                className="form-card"
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
              <div
                className="form-card"
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
                <div className="section-head" style={{ width: "100%", minWidth: 0 }}>
                  <div>
                    <span className="eyebrow">WITHDRAWAL</span>
                    <h2>DNA → USDT</h2>
                  </div>
                  <button
                    className="coin-button"
                    onClick={() => setWithdrawalOpen(false)}
                    style={{ flex: "0 0 auto" }}
                  >
                    ✕
                  </button>
                </div>

                {withdrawalStatus === "loading" || withdrawalStatus === "idle" ? (
                  <p>Загружаем параметры вывода...</p>
                ) : withdrawalStatus === "error" ? (
                  <>
                    <p>Не удалось загрузить заявки.</p>
                    <button className="primary" onClick={() => void loadWithdrawals()}>
                      ПОВТОРИТЬ
                    </button>
                  </>
                ) : withdrawalConfig ? (
                  <>
                    <p>
                      Курс: <strong>1 DNA = {withdrawalConfig.usdtPerDna.toFixed(4)} USDT</strong>
                    </p>
                    <p>
                      Минимальный вывод: <strong>{withdrawalConfig.minDna} DNA</strong>
                    </p>
                    <p>
                      Доступно: <strong>{formatNumber(state.dna, 4)} DNA</strong>
                    </p>

                    {withdrawals.some(
                      (item) =>
                        item.status ===
                          "PENDING" ||
                        item.status ===
                          "APPROVED",
                    ) ? (
                      <p
                        className="hint"
                        style={{
                          marginTop: 6,
                        }}
                      >
                        🔄 Статус активной
                        заявки обновляется
                        автоматически примерно
                        каждые 15 секунд.
                      </p>
                    ) : null}

                    <label style={{ display: "grid", gap: 6, marginTop: 12, width: "100%", minWidth: 0 }}>
                      <span>Количество DNA</span>
                      <input
                        type="number"
                        min={withdrawalConfig.minDna}
                        step="0.0001"
                        value={withdrawDna}
                        onChange={(event) => setWithdrawDna(event.target.value)}
                        style={{ width: "100%", minWidth: 0, padding: 12, borderRadius: 12 }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, marginTop: 12, width: "100%", minWidth: 0 }}>
                      <span>Сеть USDT</span>
                      <input
                        type="text"
                        value={withdrawNetwork}
                        onChange={(event) => setWithdrawNetwork(event.target.value)}
                        placeholder="Например: TON / TRC20 / BEP20"
                        maxLength={32}
                        style={{ width: "100%", minWidth: 0, padding: 12, borderRadius: 12 }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, marginTop: 12, width: "100%", minWidth: 0 }}>
                      <span>Адрес USDT-кошелька</span>
                      <input
                        type="text"
                        value={withdrawWallet}
                        onChange={(event) => setWithdrawWallet(event.target.value)}
                        placeholder="Введите адрес кошелька"
                        maxLength={180}
                        autoComplete="off"
                        style={{ width: "100%", minWidth: 0, padding: 12, borderRadius: 12 }}
                      />
                    </label>

                    <div
                      className="card"
                      style={{
                        marginTop: 12,
                        width: "100%",
                        minWidth: 0,
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <strong>К получению</strong>
                      <p style={{ margin: "4px 0", fontSize: 22, fontWeight: 900 }}>
                        {withdrawalPreview.toFixed(8)} USDT
                      </p>
                      <small style={{ lineHeight: 1.4 }}>
                        Заявка проходит ручную проверку. DNA резервируется сразу после создания заявки.
                      </small>
                    </div>

                    <button
                      className="primary"
                      onClick={submitWithdrawal}
                      disabled={isSubmittingWithdrawal}
                    >
                      {isSubmittingWithdrawal ? "⏳ СОЗДАЁМ..." : "💸 СОЗДАТЬ ЗАЯВКУ"}
                    </button>

                    <div
                      style={{
                        marginTop: 18,
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
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <span className="eyebrow">HISTORY</span>
                          <h3 style={{ margin: "2px 0 0" }}>История выплат</h3>
                        </div>

                        <button
                          className="coin-button"
                          onClick={() => void loadWithdrawals()}
                          disabled={false}
                          style={{ flex: "0 0 auto" }}
                        >
                          ↻
                        </button>
                      </div>

                      {withdrawals.length === 0 ? (
                        <div
                          className="card"
                          style={{
                            width: "100%",
                            minWidth: 0,
                            flexDirection: "column",
                            alignItems: "flex-start",
                          }}
                        >
                          <strong>Заявок пока нет</strong>
                          <small style={{ lineHeight: 1.45 }}>
                            После первого вывода заявка появится здесь вместе со статусом и суммой.
                          </small>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            width: "100%",
                            minWidth: 0,
                          }}
                        >
                          {withdrawals.slice(0, 12).map((item) => {
                            const status = withdrawalStatusMeta(
                              item.status,
                              item.note,
                            );

                            return (
                              <article
                                key={item.id}
                                style={{
                                  width: "100%",
                                  minWidth: 0,
                                  borderRadius: 16,
                                  border: "1px solid rgba(255,255,255,.08)",
                                  background: "rgba(5, 22, 15, .55)",
                                  padding: 12,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 10,
                                    width: "100%",
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: 18,
                                        fontWeight: 900,
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {item.usdtAmount.toFixed(8)} USDT
                                    </div>
                                    <small style={{ opacity: .72 }}>
                                      {formatNumber(item.dnaAmount, 4)} DNA
                                    </small>
                                  </div>

                                  <span
                                    style={{
                                      flex: "0 0 auto",
                                      maxWidth: "58%",
                                      padding: "6px 8px",
                                      borderRadius: 999,
                                      border: `1px solid ${status.border}`,
                                      background: status.background,
                                      color: status.color,
                                      fontSize: 11,
                                      fontWeight: 900,
                                      lineHeight: 1.2,
                                      textAlign: "center",
                                    }}
                                  >
                                    {status.icon} {status.label}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 8,
                                    width: "100%",
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: 9,
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,.04)",
                                      minWidth: 0,
                                    }}
                                  >
                                    <small style={{ opacity: .65 }}>Сеть</small>
                                    <div
                                      style={{
                                        marginTop: 3,
                                        fontWeight: 800,
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {item.network}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      padding: 9,
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,.04)",
                                      minWidth: 0,
                                    }}
                                  >
                                    <small style={{ opacity: .65 }}>Дата</small>
                                    <div
                                      style={{
                                        marginTop: 3,
                                        fontWeight: 700,
                                        fontSize: 12,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {formatWithdrawalDate(item.createdAt)}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: 9,
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,.04)",
                                    minWidth: 0,
                                  }}
                                >
                                  <small style={{ opacity: .65 }}>Кошелёк</small>
                                  <div
                                    style={{
                                      marginTop: 3,
                                      fontFamily: "monospace",
                                      fontSize: 12,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {shortWallet(item.walletAddress)}
                                  </div>
                                </div>

                                {item.status === "PENDING" ? (
                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 9,
                                      opacity: .72,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Заявка ожидает проверки администратором. DNA уже зарезервирована.
                                  </small>
                                ) : null}

                                {item.status === "PENDING" ? (
                                  <button
                                    className="coin-button"
                                    disabled={
                                      cancelingWithdrawalId !==
                                      null
                                    }
                                    onClick={() =>
                                      void cancelWithdrawal(
                                        item,
                                      )
                                    }
                                    style={{
                                      width: "100%",
                                      maxWidth: "none",
                                      marginTop: 9,
                                      borderColor:
                                        "rgba(255,92,108,.34)",
                                    }}
                                  >
                                    {cancelingWithdrawalId ===
                                    item.id
                                      ? "⏳ ОТМЕНЯЕМ..."
                                      : "↩️ ОТМЕНИТЬ ЗАЯВКУ"}
                                  </button>
                                ) : null}

                                {item.status === "APPROVED" ? (
                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 9,
                                      color: status.color,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Заявка одобрена и ожидает отправки USDT.
                                  </small>
                                ) : null}

                                {item.status === "PAID" ? (
                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 9,
                                      color: status.color,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    Выплата отмечена администратором как отправленная.
                                  </small>
                                ) : null}

                                {item.status === "REJECTED" ? (
                                  <small
                                    style={{
                                      display: "block",
                                      marginTop: 9,
                                      color: status.color,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {item.note ===
                                    "CANCELED_BY_PLAYER"
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

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}

      <nav className="bottom-nav glass" aria-label="Главная навигация">
        {([
          ["nest", "🪺", "Гнездо"],
          ["game", "🎮", "Игра"],
          ["shop", "🛒", "Магазин"],
          ["friends", "👥", "Друзья"],
          ["menu", "☰", "Меню"],
        ] as const).map(([key, icon, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            <span>{icon}</span><small>{label}</small>
          </button>
        ))}
      </nav>
    </main>
  );
}
