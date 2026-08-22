"use client";

import { useEffect, useMemo, useState } from "react";
import { dinosaurs, formatNumber, gameConfig, getDinosaurConfig, MAX_DINOSAUR_LEVEL } from "@/lib/game-config";

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
};

function withdrawalStatusMeta(status: string) {
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
    return {
      label: "Отклонено · DNA возвращена",
      icon: "↩️",
      background: "rgba(255, 92, 108, .14)",
      border: "rgba(255, 92, 108, .30)",
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
  const [isMerging, setIsMerging] = useState(false);
  const [authMode, setAuthMode] = useState<"telegram" | "demo" | "unknown">("unknown");
  const [referralInfo, setReferralInfo] = useState<ReferralResponse | null>(null);
  const [referralStatus, setReferralStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopStatus, setShopStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [buyingItemCode, setBuyingItemCode] = useState<string | null>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyStatus, setDailyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dailyInfo, setDailyInfo] = useState<DailyRewardInfo | null>(null);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [tasksStatus, setTasksStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [claimingTaskCode, setClaimingTaskCode] = useState<string | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [withdrawalConfig, setWithdrawalConfig] = useState<WithdrawalConfigResponse | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawDna, setWithdrawDna] = useState("1");
  const [withdrawNetwork, setWithdrawNetwork] = useState("");
  const [withdrawWallet, setWithdrawWallet] = useState("");
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const eggsPerHour = useMemo(() => {
    return state.board.reduce((sum: number, level) => {
      if (!level) return sum;
      return sum + dinosaurs[level - 1].eggsPerHour;
    }, 0);
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

        setState({
          coins: data.balance.coins,
          dna: data.balance.dna,
          eggs: data.nest.currentEggs,
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

  const buyDino = async () => {
    if (isBuying) return;

    setIsBuying(true);
    setToast("Покупаем динозавра на сервере...");

    try {
      const response = await fetch("/api/buy-dino", {
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
        `Динозавр Level ${data.dinosaur?.level ?? 1} куплен за ${formatNumber(data.price ?? 100, 0)} Coins ✓`,
      );
    } catch (error) {
      console.error("Failed to buy dinosaur", error);
      setToast(error instanceof Error ? error.message : "Ошибка покупки динозавра");
    } finally {
      setIsBuying(false);
    }
  };

  const chooseSlot = async (index: number) => {
    if (isMerging) return;

    const level = state.board[index];

    if (!level) {
      setSelected(null);
      return;
    }

    if (selected === null) {
      setSelected(index);
      setToast(`Выбран динозавр Level ${level}. Выберите второго такого же уровня.`);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const firstLevel = state.board[selected];

    if (firstLevel !== level) {
      setSelected(index);
      setToast("Для merge выберите двух динозавров одинакового уровня");
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

    const fromSlot = selected;
    const toSlot = index;

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

      setSelected(null);
      setToast(
        `MERGE ✓ Lv.${data.merged?.level ?? level + 1} · комиссия ${formatNumber(
          data.mergeFee ?? mergeFee,
          0,
        )} Coins`,
      );
    } catch (error) {
      console.error("Failed to merge dinosaur", error);
      setSelected(null);
      setToast(error instanceof Error ? error.message : "Ошибка merge");
    } finally {
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

  useEffect(() => {
    if (tab !== "shop") return;

    let cancelled = false;

    async function loadShop() {
      setShopStatus("loading");

      try {
        const response = await fetch("/api/shop", {
          cache: "no-store",
          credentials: "include",
        });

        const data = (await response.json()) as {
          ok?: boolean;
          items?: ShopItem[];
          error?: string;
        };

        if (!response.ok || !data.ok || !Array.isArray(data.items)) {
          throw new Error(data.error || "Не удалось загрузить магазин");
        }

        if (cancelled) return;
        setShopItems(data.items);
        setShopStatus("ready");
      } catch (error) {
        console.error("Failed to load shop", error);
        if (cancelled) return;
        setShopStatus("error");
        setToast(error instanceof Error ? error.message : "Ошибка магазина");
      }
    }

    void loadShop();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const buyShopItem = async (item: ShopItem) => {
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

  const loadWithdrawals = async () => {
    if (authMode !== "telegram") {
      setToast("Вывод доступен только при входе через Telegram.");
      return;
    }

    setWithdrawalStatus("loading");

    try {
      const response = await fetch("/api/withdrawals", {
        cache: "no-store",
        credentials: "include",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        config?: WithdrawalConfigResponse;
        balance?: { dna: number };
        withdrawals?: WithdrawalItem[];
      };

      if (!response.ok || !data.ok || !data.config) {
        throw new Error(data.message || data.error || "Не удалось загрузить вывод");
      }

      setWithdrawalConfig(data.config);
      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
      setState((previous) => ({
        ...previous,
        dna: data.balance?.dna ?? previous.dna,
      }));
      setWithdrawalStatus("ready");
    } catch (error) {
      console.error("Failed to load withdrawals", error);
      setWithdrawalStatus("error");
      setToast(error instanceof Error ? error.message : "Ошибка загрузки вывода");
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
          <span>🪙 {formatNumber(state.coins, 0)}</span>
          <span>🧬 {formatNumber(state.dna, 1)}</span>
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
              <p>{formatNumber(state.eggs, 0)} / {formatNumber(state.capacity, 0)} яиц</p>
              <div className="progress"><div style={{ width: `${progress}%` }} /></div>
              <div className="rate">⚡ {formatNumber(eggsPerHour, 0)} яиц / час</div>
              <button className="primary" onClick={collectEggs} disabled={isLoading || isCollecting || Boolean(loadError)}>{isCollecting ? "⏳ СОБИРАЕМ..." : "🥚 СОБРАТЬ ЯЙЦА"}</button>
            </div>

            <div className="stats-grid">
              <article className="stat-card"><span>За день</span><strong>{formatNumber(eggsPerHour * 24, 0)}</strong><small>яиц</small></article>
              <article className="stat-card"><span>Coins / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToCoin, 2)}</strong><small>расчётно</small></article>
              <article className="stat-card"><span>DNA / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToDna, 2)}</strong><small>расчётно</small></article>
            </div>
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
            <span className="eyebrow">SHOP</span><h2>Магазин</h2>
            <p className="hint">Цены загружаются из Neon. Клиент отправляет только код товара — стоимость и эффект проверяются на сервере.</p>
            <div className="card">
              <strong>🧬 DNA не продаётся</strong>
              <p>DNA — ценная игровая валюта, которая зарабатывается в игре и предназначена для последующего вывода/конвертации в деньги. Купить DNA за Coins нельзя.</p>
            </div>

            {shopStatus === "loading" || shopStatus === "idle" ? (
              <div className="card"><strong>Загружаем товары...</strong></div>
            ) : shopStatus === "error" ? (
              <div className="card">
                <strong>Не удалось загрузить магазин</strong>
                <p>Обновите страницу и попробуйте ещё раз.</p>
                <button className="primary" onClick={() => window.location.reload()}>ПОВТОРИТЬ</button>
              </div>
            ) : (
              <div className="menu-list">
                {shopItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => buyShopItem(item)}
                    disabled={Boolean(buyingItemCode) || isLoading || Boolean(loadError)}
                  >
                    <span>
                      <strong>{item.kind === "DINO" ? "🦕 " : "🪺 "}{item.title}</strong>
                      <small>{item.description || "Игровой товар"}</small>
                    </span>
                    <b>
                      {buyingItemCode === item.code
                        ? "⏳"
                        : `🪙 ${formatNumber(item.priceCoins, 0)}`}
                    </b>
                  </button>
                ))}
              </div>
            )}

            <div className="card">
              <strong>Ваш баланс</strong>
              <p>🪙 {formatNumber(state.coins, 0)} Coins · 🧬 {formatNumber(state.dna, 0)} DNA</p>
              <p>🪺 Вместимость: {formatNumber(state.capacity, 0)} яиц</p>
            </div>
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
              <button onClick={openDnaWithdrawal}><span>🧬 Вывод DNA</span><b>→ USDT</b></button>
              <button onClick={() => setLevelsOpen((value) => !value)}><span>📈 Уровни динозавров</span><b>Lv.1–16</b></button>
              <button onClick={openDailyReward}><span>🎁 Ежедневный бонус</span><b>{dailyInfo?.canClaim ? "ЗАБРАТЬ" : "›"}</b></button>
              <button onClick={openTasks}><span>✅ Задания</span><b>{tasks.some((task) => task.claimable) ? "ЗАБРАТЬ" : "›"}</b></button>
              <button onClick={() => setToast("Рулетка отключена до server-side реализации")}><span>🎰 Рулетка</span><b>OFF</b></button>
              <button onClick={() => window.location.reload()}><span>🔄 Перезагрузить из Neon</span><b>›</b></button>
            </div>

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
                            const status = withdrawalStatusMeta(item.status);

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
                                    Заявка отклонена. Зарезервированная DNA возвращена на игровой баланс.
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

      <div className="toast" role="status">{toast}</div>

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
