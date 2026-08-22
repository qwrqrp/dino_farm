"use client";

import { useEffect, useMemo, useState } from "react";
import { dinosaurs, formatNumber, gameConfig } from "@/lib/game-config";

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

    if (level >= 16) {
      setSelected(null);
      setToast("Level 16 — максимальный уровень");
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
        board?: Slot[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Не удалось выполнить merge");
      }

      setState((previous) => ({
        ...previous,
        board:
          Array.isArray(data.board) && data.board.length === 16
            ? data.board
            : previous.board,
      }));

      setSelected(null);
      setToast(`MERGE ✓ Получен динозавр Level ${data.merged?.level ?? level + 1}`);
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
              <article className="stat-card"><span>Coins / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToCoin)}</strong><small>расчётно</small></article>
              <article className="stat-card"><span>DNA / день</span><strong>{formatNumber(eggsPerHour * 24 * gameConfig.eggToDna)}</strong><small>расчётно</small></article>
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
              <button onClick={() => setToast("Profit Plan будет вынесен в отдельный калькулятор")}><span>📊 Profit Plan</span><b>›</b></button>
              <button onClick={() => setToast("Задания появятся после server-side игровых операций")}><span>✅ Задания</span><b>›</b></button>
              <button onClick={() => setToast("Рулетка отключена до server-side реализации")}><span>🎰 Рулетка</span><b>OFF</b></button>
              <button onClick={() => window.location.reload()}><span>🔄 Перезагрузить из Neon</span><b>›</b></button>
            </div>

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
                          disabled={withdrawalStatus === "loading"}
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
