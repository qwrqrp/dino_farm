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
    username: string | null;
    firstName: string | null;
    lastName: string | null;
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

const EMPTY_BOARD: Slot[] = Array(16).fill(null);

const INITIAL_STATE: SaveState = {
  coins: 0,
  dna: 0,
  eggs: 0,
  capacity: gameConfig.initialNestCapacity,
  board: EMPTY_BOARD,
  lastTick: Date.now(),
};

export default function GameApp() {
  const [tab, setTab] = useState<Tab>("nest");
  const [state, setState] = useState<SaveState>(INITIAL_STATE);
  const [selected, setSelected] = useState<number | null>(null);
  const [depositUsd, setDepositUsd] = useState(10);
  const [toast, setToast] = useState("Загрузка данных фермы...");
  const [playerName, setPlayerName] = useState("Dino Farmer");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const eggsPerHour = useMemo(() => {
    return state.board.reduce((sum: number, level) => {
      if (!level) return sum;
      return sum + dinosaurs[level - 1].eggsPerHour;
    }, 0);
  }, [state.board]);

  useEffect(() => {
    let cancelled = false;

    async function loadGameState() {
      try {
        const response = await fetch("/api/game-state", {
          cache: "no-store",
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
        setLoadError(null);
        setToast("Данные загружены из Neon ✓");
      } catch (error) {
        console.error("Failed to load /api/game-state", error);

        if (cancelled) return;

        setLoadError("Не удалось загрузить данные из базы");
        setToast("Ошибка загрузки Neon");
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

  const buyDino = () => {
    const emptyIndex = state.board.findIndex((x) => x === null);
    if (emptyIndex === -1) return setToast("Игровая доска заполнена");
    if (state.coins < 100) return setToast("Недостаточно Coins");

    setState((s) => {
      const board = [...s.board];
      board[emptyIndex] = 1;
      return { ...s, board, coins: s.coins - 100 };
    });

    setToast("Динозавр Level 1 куплен локально");
  };

  const chooseSlot = (index: number) => {
    const level = state.board[index];

    if (!level) {
      setSelected(null);
      return;
    }

    if (selected === null) {
      setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    const firstLevel = state.board[selected];

    if (firstLevel === level && level < 16) {
      setState((s) => {
        const board = [...s.board];
        board[selected] = null;
        board[index] = level + 1;
        return { ...s, board };
      });

      setSelected(null);
      setToast(`MERGE локально! Получен динозавр Level ${level + 1}`);
    } else {
      setSelected(index);
      setToast("Для merge выберите двух динозавров одинакового уровня");
    }
  };

  const exchangeDna = () => {
    if (state.dna < 1) return setToast("Недостаточно DNA");

    const amount = Math.min(10, state.dna);

    setState((s) => ({
      ...s,
      dna: s.dna - amount,
      coins: s.coins + amount * gameConfig.dnaToCoins,
    }));

    setToast(`${formatNumber(amount)} DNA обменено локально на ${formatNumber(amount * gameConfig.dnaToCoins)} Coins`);
  };

  const progress = Math.min(100, (state.eggs / Math.max(1, state.capacity)) * 100);
  const depositCoins = depositUsd * gameConfig.usdToCoins;
  const depositBonus = depositCoins * gameConfig.firstDepositBonus;

  return (
    <main className="app-shell">
      <header className="hud glass">
        <div className="avatar">🦖</div>
        <div className="profile">
          <strong>{playerName}</strong>
          <span>{isLoading ? "Загрузка..." : loadError ? "Database error" : "Level 1 · Neon"}</span>
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
              <button className="coin-button" onClick={buyDino} disabled={isLoading || Boolean(loadError)}>+ 🦕 100</button>
            </div>
            <p className="hint">Данные загружены из Neon. Сбор яиц уже сохраняется на сервере; покупка и merge пока локальные.</p>
            <div className="board">
              {state.board.map((level, index) => (
                <button
                  key={index}
                  className={`slot ${selected === index ? "selected" : ""}`}
                  onClick={() => chooseSlot(index)}
                  aria-label={level ? `Динозавр уровня ${level}` : "Пустая клетка"}
                  disabled={isLoading || Boolean(loadError)}
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
            <span className="eyebrow">SHOP</span><h2>Пополнение</h2>
            <div className="card form-card">
              <label htmlFor="deposit">Сумма USD</label>
              <input id="deposit" type="number" min={3} max={20000} value={depositUsd} onChange={(e) => setDepositUsd(Math.max(3, Math.min(20000, Number(e.target.value) || 3)))} />
              <div className="quote"><span>Coins</span><strong>{formatNumber(depositCoins, 0)}</strong></div>
              <div className="quote bonus"><span>Первый бонус +20%</span><strong>+{formatNumber(depositBonus, 0)}</strong></div>
              <div className="quote total"><span>Итого</span><strong>{formatNumber(depositCoins + depositBonus, 0)}</strong></div>
              <button className="primary" onClick={() => setToast("Платежи будут подключены после server-side игровых операций")}>ПРОДОЛЖИТЬ</button>
              <small>Demo: реальные платежи отключены.</small>
            </div>
          </div>
        )}

        {tab === "friends" && (
          <div className="screen">
            <span className="eyebrow">REFERRALS</span><h2>Друзья</h2>
            <div className="invite-card">
              <div className="invite-art">👥🦕</div>
              <h3>Стройте ферму вместе</h3>
              <p>В production здесь будет Telegram deep-link <code>startapp=ref_USERID</code>.</p>
              <button className="primary" onClick={() => setToast("Referral link появится после Telegram integration")}>ПРИГЛАСИТЬ ДРУГА</button>
            </div>
            <div className="stats-grid">
              <article className="stat-card"><span>Приглашено</span><strong>0</strong></article>
              <article className="stat-card"><span>Активные</span><strong>0</strong></article>
              <article className="stat-card"><span>Бонусы</span><strong>0</strong></article>
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div className="screen">
            <span className="eyebrow">TOOLS</span><h2>Меню</h2>
            <div className="menu-list">
              <button onClick={exchangeDna}><span>🧬 DNA → Coins</span><b>1 : 1.1</b></button>
              <button onClick={() => setToast("Profit Plan будет вынесен в отдельный калькулятор")}><span>📊 Profit Plan</span><b>›</b></button>
              <button onClick={() => setToast("Задания появятся после server-side игровых операций")}><span>✅ Задания</span><b>›</b></button>
              <button onClick={() => setToast("Рулетка отключена до server-side реализации")}><span>🎰 Рулетка</span><b>OFF</b></button>
              <button onClick={() => window.location.reload()}><span>🔄 Перезагрузить из Neon</span><b>›</b></button>
            </div>
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
