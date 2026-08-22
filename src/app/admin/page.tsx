"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Withdrawal = {
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
  processedAt: string | null;
  note: string | null;
  user: {
    id: string;
    telegramId: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

type Summary = {
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
};

type LeaderboardPlayer = {
  rank: number;
  userId: string;
  telegramId: string | null;
  name: string;
  username: string | null;
  dinoCount: number;
  maxLevel: number;
  dailyCoins: number;
  dailyDna: number;
  eggsPerHour: number;
  createdAt: string;
};

type GameActionItem = {
  id: string;
  actionType: "PURCHASE_DINO" | "MERGE_DINO";
  sourceLevel: number | null;
  resultLevel: number;
  coinsSpent: number;
  createdAt: string;
  user: {
    id: string;
    telegramId: string | null;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

type GameHistorySummary = {
  total: number;
  purchases: number;
  merges: number;
};

type AdminPlayerItem = {
  id: string;
  telegramId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  coins: number;
  dna: number;
  dinosaurCount: number;
  maxLevel: number;
  nestCapacity: number;
  currentEggs: number;
  totalEggsCollected: number;
  tasksCompleted: number;
  achievements: number;
  dailyStreak: number;
  dailyClaims: number;
  referrals: number;
  withdrawals: number;
  paidWithdrawals: number;
  paidUsdt: number;
};

const EMPTY_SUMMARY: Summary = {
  pending: 0,
  approved: 0,
  paid: 0,
  rejected: 0,
};

function playerName(item: Withdrawal) {
  const name = [item.user.firstName, item.user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) return name;
  if (item.user.username) return `@${item.user.username}`;
  if (item.user.telegramId) return `Telegram ${item.user.telegramId}`;
  return item.user.id;
}

function statusLabel(status: string) {
  if (status === "PENDING") return "Ожидает";
  if (status === "APPROVED") return "Одобрено";
  if (status === "PAID") return "Оплачено";
  if (status === "REJECTED") return "Отклонено";
  return status;
}

function gameActionPlayerName(item: GameActionItem) {
  const name = [
    item.user.firstName,
    item.user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) return name;
  if (item.user.username) {
    return `@${item.user.username}`;
  }
  if (item.user.telegramId) {
    return `Telegram ${item.user.telegramId}`;
  }

  return item.user.id;
}

function gameActionLabel(actionType: string) {
  if (actionType === "PURCHASE_DINO") {
    return "Покупка";
  }
  if (actionType === "MERGE_DINO") {
    return "Merge";
  }
  return actionType;
}

function adminPlayerName(player: AdminPlayerItem) {
  const fullName = [
    player.firstName,
    player.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) return fullName;
  if (player.username) {
    return `@${player.username}`;
  }
  return "Игрок";
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [filter, setFilter] = useState("ACTIVE");
  const [section, setSection] = useState<"withdrawals" | "leaderboard" | "history" | "players">("withdrawals");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardTotalPlayers, setLeaderboardTotalPlayers] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameActionItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "PURCHASE_DINO" | "MERGE_DINO">("ALL");
  const [historySummary, setHistorySummary] = useState<GameHistorySummary>({
    total: 0,
    purchases: 0,
    merges: 0,
  });
  const [playersLoading, setPlayersLoading] = useState(false);
  const [players, setPlayers] = useState<AdminPlayerItem[]>([]);
  const [playersTotal, setPlayersTotal] = useState(0);
  const [playerSearch, setPlayerSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/withdrawals", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        setAuthenticated(false);
        setWithdrawals([]);
        setSummary(EMPTY_SUMMARY);
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Ошибка загрузки");
      }

      setAuthenticated(true);
      setWithdrawals(
        Array.isArray(data.withdrawals) ? data.withdrawals : [],
      );
      setSummary(data.summary || EMPTY_SUMMARY);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ошибка загрузки",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/leaderboard", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        setAuthenticated(false);
        setLeaderboard([]);
        setLeaderboardTotalPlayers(0);
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || "Ошибка загрузки рейтинга",
        );
      }

      setLeaderboard(
        Array.isArray(data.top) ? data.top : [],
      );
      setLeaderboardTotalPlayers(data.totalPlayers ?? 0);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки рейтинга",
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (
      filter: "ALL" | "PURCHASE_DINO" | "MERGE_DINO" =
        historyFilter,
    ) => {
      setHistoryLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/admin/game-history?type=${encodeURIComponent(
            filter,
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (response.status === 401) {
          setAuthenticated(false);
          setGameHistory([]);
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Ошибка загрузки истории",
          );
        }

        setGameHistory(
          Array.isArray(data.actions)
            ? data.actions
            : [],
        );
        setHistorySummary(
          data.summary || {
            total: 0,
            purchases: 0,
            merges: 0,
          },
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки истории",
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyFilter],
  );

  const loadPlayers = useCallback(
    async (search = playerSearch) => {
      setPlayersLoading(true);
      setMessage("");

      try {
        const normalized = search.trim();

        const response = await fetch(
          `/api/admin/players?q=${encodeURIComponent(
            normalized,
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

        if (response.status === 401) {
          setAuthenticated(false);
          setPlayers([]);
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Ошибка загрузки игроков",
          );
        }

        setPlayers(
          Array.isArray(data.players)
            ? data.players
            : [],
        );
        setPlayersTotal(
          data.totalPlayers ?? 0,
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Ошибка загрузки игроков",
        );
      } finally {
        setPlayersLoading(false);
      }
    },
    [playerSearch],
  );

  const login = async () => {
    if (!key.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Неверный ключ администратора.",
        );
      }

      setKey("");
      await load();
    } catch (error) {
      setAuthenticated(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка входа",
      );
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });

    setAuthenticated(false);
    setWithdrawals([]);
    setSummary(EMPTY_SUMMARY);
  };

  const act = async (
    id: string,
    action: "APPROVE" | "REJECT" | "PAID",
  ) => {
    const label =
      action === "APPROVE"
        ? "одобрить"
        : action === "REJECT"
          ? "отклонить"
          : "отметить оплаченной";

    if (
      action === "REJECT" &&
      !window.confirm(
        "Отклонить заявку? Зарезервированная DNA автоматически вернётся игроку.",
      )
    ) {
      return;
    }

    if (
      action === "PAID" &&
      !window.confirm(
        "Подтвердить, что USDT уже действительно отправлены игроку?",
      )
    ) {
      return;
    }

    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/withdrawals/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || data.error || `Не удалось ${label} заявку`,
        );
      }

      setMessage(`Готово: заявку удалось ${label}.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка изменения статуса",
      );
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    if (filter === "ALL") return withdrawals;
    if (filter === "ACTIVE") {
      return withdrawals.filter(
        (item) =>
          item.status === "PENDING" ||
          item.status === "APPROVED",
      );
    }

    return withdrawals.filter((item) => item.status === filter);
  }, [withdrawals, filter]);

  if (authenticated === false) {
    return (
      <main style={styles.page}>
        <section style={styles.loginCard}>
          <div style={styles.logo}>🦕</div>
          <h1 style={styles.title}>Dino Farm Admin</h1>
          <p style={styles.muted}>
            Введите ключ администратора.
          </p>

          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void login();
            }}
            placeholder="Admin key"
            autoComplete="current-password"
            style={styles.input}
          />

          <button
            onClick={() => void login()}
            disabled={loading || !key.trim()}
            style={styles.primaryButton}
          >
            {loading ? "Входим..." : "ВОЙТИ"}
          </button>

          {message ? <p style={styles.error}>{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>DINO FARM</div>
            <h1 style={styles.title}>
              {section === "leaderboard"
                ? "Таблица лидеров"
                : section === "history"
                  ? "История игры"
                  : section === "players"
                    ? "Игроки"
                    : "Заявки на вывод"}
            </h1>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={() =>
                section === "leaderboard"
                  ? void loadLeaderboard()
                  : section === "history"
                    ? void loadHistory()
                    : section === "players"
                      ? void loadPlayers()
                      : void load()
              }
              style={styles.secondaryButton}
            >
              ↻ Обновить
            </button>
            <button
              onClick={() => void logout()}
              style={styles.secondaryButton}
            >
              Выйти
            </button>
          </div>
        </header>

        <section
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => setSection("withdrawals")}
            style={{
              ...styles.filterButton,
              ...(section === "withdrawals"
                ? styles.filterButtonActive
                : {}),
            }}
          >
            💸 Выплаты
          </button>

          <button
            onClick={() => {
              setSection("leaderboard");
              void loadLeaderboard();
            }}
            style={{
              ...styles.filterButton,
              ...(section === "leaderboard"
                ? styles.filterButtonActive
                : {}),
            }}
          >
            🏆 Лидеры
          </button>


          <button
            onClick={() => {
              setSection("history");
              void loadHistory();
            }}
            style={{
              ...styles.filterButton,
              ...(section === "history"
                ? styles.filterButtonActive
                : {}),
            }}
          >
            📜 История
          </button>


          <button
            onClick={() => {
              setSection("players");
              setPlayerSearch("");
              void loadPlayers("");
            }}
            style={{
              ...styles.filterButton,
              ...(section === "players"
                ? styles.filterButtonActive
                : {}),
            }}
          >
            👥 Игроки
          </button>
        </section>

        {section === "withdrawals" ? (
          <>
        <section style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.muted}>Ожидают</span>
            <b style={styles.summaryNumber}>{summary.pending}</b>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.muted}>Одобрено</span>
            <b style={styles.summaryNumber}>{summary.approved}</b>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.muted}>Оплачено</span>
            <b style={styles.summaryNumber}>{summary.paid}</b>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.muted}>Отклонено</span>
            <b style={styles.summaryNumber}>{summary.rejected}</b>
          </div>
        </section>

        <section style={styles.filters}>
          {["ACTIVE", "PENDING", "APPROVED", "PAID", "REJECTED", "ALL"].map(
            (value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  ...styles.filterButton,
                  ...(filter === value
                    ? styles.filterButtonActive
                    : {}),
                }}
              >
                {value === "ACTIVE"
                  ? "Активные"
                  : value === "ALL"
                    ? "Все"
                    : statusLabel(value)}
              </button>
            ),
          )}
        </section>

        {message ? <div style={styles.notice}>{message}</div> : null}

        {loading && authenticated !== true ? (
          <div style={styles.empty}>Загрузка...</div>
        ) : visible.length === 0 ? (
          <div style={styles.empty}>Заявок в этом разделе нет.</div>
        ) : (
          <section style={styles.list}>
            {visible.map((item) => {
              const busy = busyId === item.id;

              return (
                <article key={item.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <div>
                      <div style={styles.playerName}>
                        {playerName(item)}
                      </div>
                      <div style={styles.muted}>
                        {item.user.username
                          ? `@${item.user.username} · `
                          : ""}
                        Telegram ID: {item.user.telegramId || "—"}
                      </div>
                    </div>

                    <span
                      style={{
                        ...styles.status,
                        ...(item.status === "PENDING"
                          ? styles.pending
                          : item.status === "APPROVED"
                            ? styles.approved
                            : item.status === "PAID"
                              ? styles.paid
                              : styles.rejected),
                      }}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div style={styles.amountRow}>
                    <div>
                      <span style={styles.muted}>Списано</span>
                      <div style={styles.amount}>
                        {item.dnaAmount} DNA
                      </div>
                    </div>
                    <div>
                      <span style={styles.muted}>К выплате</span>
                      <div style={styles.amount}>
                        {item.usdtAmount.toFixed(8)} USDT
                      </div>
                    </div>
                  </div>

                  <div style={styles.detailGrid}>
                    <div>
                      <span style={styles.muted}>Сеть</span>
                      <div style={styles.detailValue}>{item.network}</div>
                    </div>

                    <div>
                      <span style={styles.muted}>Создана</span>
                      <div style={styles.detailValue}>
                        {new Date(item.createdAt).toLocaleString("ru-RU")}
                      </div>
                    </div>
                  </div>

                  <div style={styles.walletBox}>
                    <span style={styles.muted}>USDT-адрес</span>
                    <code style={styles.wallet}>{item.walletAddress}</code>
                    <button
                      style={styles.copyButton}
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          item.walletAddress,
                        );
                        setMessage("Адрес скопирован.");
                      }}
                    >
                      Копировать адрес
                    </button>
                  </div>

                  <div style={styles.actions}>
                    {item.status === "PENDING" ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act(item.id, "APPROVE")
                          }
                          style={styles.approveButton}
                        >
                          ✓ Одобрить
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act(item.id, "REJECT")
                          }
                          style={styles.rejectButton}
                        >
                          ✕ Отклонить
                        </button>
                      </>
                    ) : null}

                    {item.status === "APPROVED" ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act(item.id, "PAID")
                          }
                          style={styles.paidButton}
                        >
                          💸 Оплачено
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            void act(item.id, "REJECT")
                          }
                          style={styles.rejectButton}
                        >
                          ✕ Отклонить
                        </button>
                      </>
                    ) : null}

                    {busy ? (
                      <span style={styles.muted}>Обрабатываем...</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
          </>
        ) : null}

        {section === "leaderboard" ? (
          <>
            <section style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <span style={styles.muted}>Игроков</span>
                <b style={styles.summaryNumber}>
                  {leaderboardTotalPlayers}
                </b>
              </div>

              <div style={styles.summaryCard}>
                <span style={styles.muted}>Показано</span>
                <b style={styles.summaryNumber}>
                  {leaderboard.length}
                </b>
              </div>
            </section>

            {message ? (
              <div style={styles.notice}>{message}</div>
            ) : null}

            {leaderboardLoading ? (
              <div style={styles.empty}>Загружаем рейтинг...</div>
            ) : leaderboard.length === 0 ? (
              <div style={styles.empty}>Рейтинг пока пуст.</div>
            ) : (
              <section style={styles.list}>
                {leaderboard.map((player) => (
                  <article
                    key={player.userId}
                    style={styles.card}
                  >
                    <div style={styles.cardTop}>
                      <div>
                        <div style={styles.playerName}>
                          #{player.rank} {player.name}
                        </div>
                        <div style={styles.muted}>
                          {player.username
                            ? `@${player.username} · `
                            : ""}
                          Telegram ID: {player.telegramId || "—"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.status,
                          ...styles.paid,
                        }}
                      >
                        TOP {player.rank}
                      </span>
                    </div>

                    <div style={styles.amountRow}>
                      <div>
                        <span style={styles.muted}>
                          Coins / день
                        </span>
                        <div style={styles.amount}>
                          {player.dailyCoins.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          DNA / день
                        </span>
                        <div style={styles.amount}>
                          {player.dailyDna.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.detailGrid}>
                      <div>
                        <span style={styles.muted}>
                          Динозавров
                        </span>
                        <div style={styles.detailValue}>
                          {player.dinoCount}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Максимальный уровень
                        </span>
                        <div style={styles.detailValue}>
                          Lv.{player.maxLevel}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Производство
                        </span>
                        <div style={styles.detailValue}>
                          {player.eggsPerHour.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 2,
                            },
                          )}{" "}
                          яиц/ч
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          В игре с
                        </span>
                        <div style={styles.detailValue}>
                          {new Date(
                            player.createdAt,
                          ).toLocaleDateString("ru-RU")}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : null}

        {section === "history" ? (
          <>
            <section style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <span style={styles.muted}>Всего действий</span>
                <b style={styles.summaryNumber}>
                  {historySummary.total}
                </b>
              </div>

              <div style={styles.summaryCard}>
                <span style={styles.muted}>Покупок</span>
                <b style={styles.summaryNumber}>
                  {historySummary.purchases}
                </b>
              </div>

              <div style={styles.summaryCard}>
                <span style={styles.muted}>Merge</span>
                <b style={styles.summaryNumber}>
                  {historySummary.merges}
                </b>
              </div>
            </section>

            <section style={styles.filters}>
              {[
                ["ALL", "Все"],
                ["PURCHASE_DINO", "🛒 Покупки"],
                ["MERGE_DINO", "🦖 Merge"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    const nextFilter = value as
                      | "ALL"
                      | "PURCHASE_DINO"
                      | "MERGE_DINO";

                    setHistoryFilter(nextFilter);
                    void loadHistory(nextFilter);
                  }}
                  style={{
                    ...styles.filterButton,
                    ...(historyFilter === value
                      ? styles.filterButtonActive
                      : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </section>

            {message ? (
              <div style={styles.notice}>{message}</div>
            ) : null}

            {historyLoading ? (
              <div style={styles.empty}>
                Загружаем историю...
              </div>
            ) : gameHistory.length === 0 ? (
              <div style={styles.empty}>
                История пока пустая. Новые покупки и merge
                появятся здесь после установки обновления.
              </div>
            ) : (
              <section style={styles.list}>
                {gameHistory.map((item) => (
                  <article
                    key={item.id}
                    style={styles.card}
                  >
                    <div style={styles.cardTop}>
                      <div>
                        <div style={styles.playerName}>
                          {gameActionPlayerName(item)}
                        </div>
                        <div style={styles.muted}>
                          {item.user.username
                            ? `@${item.user.username} · `
                            : ""}
                          Telegram ID:{" "}
                          {item.user.telegramId || "—"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.status,
                          ...(item.actionType ===
                          "PURCHASE_DINO"
                            ? styles.approved
                            : styles.paid),
                        }}
                      >
                        {gameActionLabel(
                          item.actionType,
                        )}
                      </span>
                    </div>

                    <div style={styles.amountRow}>
                      <div>
                        <span style={styles.muted}>
                          Действие
                        </span>
                        <div style={styles.amount}>
                          {item.actionType ===
                          "PURCHASE_DINO"
                            ? `Куплен Lv.${item.resultLevel}`
                            : `Lv.${item.sourceLevel ?? "?"} + Lv.${item.sourceLevel ?? "?"} → Lv.${item.resultLevel}`}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Потрачено
                        </span>
                        <div style={styles.amount}>
                          {item.coinsSpent.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 2,
                            },
                          )}{" "}
                          Coins
                        </div>
                      </div>
                    </div>

                    <div style={styles.detailGrid}>
                      <div>
                        <span style={styles.muted}>
                          Результат
                        </span>
                        <div style={styles.detailValue}>
                          🦖 Lv.{item.resultLevel}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Дата и время
                        </span>
                        <div style={styles.detailValue}>
                          {new Date(
                            item.createdAt,
                          ).toLocaleString("ru-RU")}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <div style={styles.notice}>
              История записывается только с момента установки
              этого обновления. Старые покупки и merge до установки
              здесь не появятся.
            </div>
          </>
        ) : null}


        {section === "players" ? (
          <>
            <section style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <span style={styles.muted}>
                  Всего Telegram-игроков
                </span>
                <b style={styles.summaryNumber}>
                  {playersTotal}
                </b>
              </div>

              <div style={styles.summaryCard}>
                <span style={styles.muted}>
                  Показано
                </span>
                <b style={styles.summaryNumber}>
                  {players.length}
                </b>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.playerName}>
                🔎 Найти игрока
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <input
                  value={playerSearch}
                  onChange={(event) =>
                    setPlayerSearch(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void loadPlayers(
                        playerSearch,
                      );
                    }
                  }}
                  placeholder="Имя, username или Telegram ID"
                  style={{
                    ...styles.input,
                    flex: "1 1 240px",
                    marginTop: 0,
                  }}
                />

                <button
                  onClick={() =>
                    void loadPlayers(
                      playerSearch,
                    )
                  }
                  style={styles.primaryButton}
                >
                  НАЙТИ
                </button>

                {playerSearch ? (
                  <button
                    onClick={() => {
                      setPlayerSearch("");
                      void loadPlayers("");
                    }}
                    style={styles.secondaryButton}
                  >
                    СБРОСИТЬ
                  </button>
                ) : null}
              </div>
            </section>

            {message ? (
              <div style={styles.notice}>
                {message}
              </div>
            ) : null}

            {playersLoading ? (
              <div style={styles.empty}>
                Загружаем игроков...
              </div>
            ) : players.length === 0 ? (
              <div style={styles.empty}>
                Игроки не найдены.
              </div>
            ) : (
              <section style={styles.list}>
                {players.map((player) => (
                  <article
                    key={player.id}
                    style={styles.card}
                  >
                    <div style={styles.cardTop}>
                      <div>
                        <div
                          style={
                            styles.playerName
                          }
                        >
                          👤{" "}
                          {adminPlayerName(
                            player,
                          )}
                        </div>

                        <div
                          style={styles.muted}
                        >
                          {player.username
                            ? `@${player.username} · `
                            : ""}
                          Telegram ID:{" "}
                          {player.telegramId ||
                            "—"}
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.status,
                          ...styles.approved,
                        }}
                      >
                        Lv.{player.maxLevel}
                      </span>
                    </div>

                    <div
                      style={styles.amountRow}
                    >
                      <div>
                        <span
                          style={styles.muted}
                        >
                          Coins
                        </span>
                        <div
                          style={styles.amount}
                        >
                          {player.coins.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </div>

                      <div>
                        <span
                          style={styles.muted}
                        >
                          DNA
                        </span>
                        <div
                          style={styles.amount}
                        >
                          {player.dna.toLocaleString(
                            "ru-RU",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={styles.detailGrid}
                    >
                      <div>
                        <span style={styles.muted}>
                          Динозавров
                        </span>
                        <div style={styles.detailValue}>
                          {player.dinosaurCount}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Макс. уровень
                        </span>
                        <div style={styles.detailValue}>
                          Lv.{player.maxLevel}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Гнездо
                        </span>
                        <div style={styles.detailValue}>
                          {player.nestCapacity.toLocaleString(
                            "ru-RU",
                          )}{" "}
                          яиц
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Яиц собрано
                        </span>
                        <div style={styles.detailValue}>
                          {player.totalEggsCollected.toLocaleString(
                            "ru-RU",
                            {
                              maximumFractionDigits: 0,
                            },
                          )}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Задания
                        </span>
                        <div style={styles.detailValue}>
                          {player.tasksCompleted}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Достижения
                        </span>
                        <div style={styles.detailValue}>
                          {player.achievements}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Daily
                        </span>
                        <div style={styles.detailValue}>
                          streak {player.dailyStreak} ·{" "}
                          {player.dailyClaims} всего
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Рефералы
                        </span>
                        <div style={styles.detailValue}>
                          {player.referrals}
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Выплаты
                        </span>
                        <div style={styles.detailValue}>
                          {player.paidWithdrawals} оплачено ·{" "}
                          {player.paidUsdt.toFixed(8)} USDT
                        </div>
                      </div>

                      <div>
                        <span style={styles.muted}>
                          Регистрация
                        </span>
                        <div style={styles.detailValue}>
                          {new Date(
                            player.createdAt,
                          ).toLocaleString(
                            "ru-RU",
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <div style={styles.notice}>
              Раздел только для просмотра. Балансы и данные
              игроков здесь не изменяются.
            </div>
          </>
        ) : null}

      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07130f",
    color: "#f5fff8",
    padding: "24px 14px 60px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    width: "min(980px, 100%)",
    margin: "0 auto",
  },
  loginCard: {
    width: "min(420px, 100%)",
    margin: "10vh auto 0",
    padding: 24,
    borderRadius: 24,
    background: "#10281e",
    border: "1px solid rgba(255,255,255,.09)",
  },
  logo: {
    fontSize: 46,
  },
  title: {
    margin: "6px 0 8px",
    fontSize: 30,
  },
  eyebrow: {
    color: "#9ef15a",
    fontWeight: 900,
    letterSpacing: 2,
    fontSize: 12,
  },
  muted: {
    color: "#a7b8ae",
    fontSize: 13,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.14)",
    background: "#071a13",
    color: "white",
    fontSize: 16,
    outline: "none",
  },
  primaryButton: {
    width: "100%",
    marginTop: 12,
    padding: 14,
    border: 0,
    borderRadius: 14,
    background: "#a7f348",
    color: "#0b210f",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
  },
  error: {
    color: "#ff8f8f",
  },
  header: {
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  secondaryButton: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.13)",
    background: "#10281e",
    color: "white",
    cursor: "pointer",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    background: "#10281e",
    border: "1px solid rgba(255,255,255,.07)",
    display: "grid",
    gap: 4,
  },
  summaryNumber: {
    fontSize: 28,
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#0d2119",
    color: "#b7c7bd",
    cursor: "pointer",
  },
  filterButtonActive: {
    background: "#a7f348",
    color: "#0b210f",
    borderColor: "#a7f348",
    fontWeight: 800,
  },
  notice: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    background: "#193927",
    border: "1px solid rgba(167,243,72,.25)",
  },
  empty: {
    padding: 30,
    borderRadius: 18,
    textAlign: "center",
    background: "#10281e",
    color: "#a7b8ae",
  },
  list: {
    display: "grid",
    gap: 12,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    background: "#10281e",
    border: "1px solid rgba(255,255,255,.08)",
    overflow: "hidden",
  },
  cardTop: {
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  playerName: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 4,
  },
  status: {
    flex: "0 0 auto",
    padding: "7px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  pending: {
    background: "#513c10",
    color: "#ffd875",
  },
  approved: {
    background: "#183b5a",
    color: "#9ad8ff",
  },
  paid: {
    background: "#173e27",
    color: "#a7f348",
  },
  rejected: {
    background: "#4a1d20",
    color: "#ff9da4",
  },
  amountRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 18,
  },
  amount: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: 900,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  detailValue: {
    marginTop: 4,
    wordBreak: "break-word",
  },
  walletBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "#091b14",
    display: "grid",
    gap: 8,
  },
  wallet: {
    color: "#e9fff0",
    overflowWrap: "anywhere",
    fontSize: 13,
  },
  copyButton: {
    justifySelf: "start",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#163629",
    color: "white",
    cursor: "pointer",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 16,
  },
  approveButton: {
    padding: "11px 14px",
    borderRadius: 12,
    border: 0,
    background: "#a7f348",
    color: "#09210f",
    fontWeight: 900,
    cursor: "pointer",
  },
  rejectButton: {
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid #7a3438",
    background: "#3b171a",
    color: "#ffb5ba",
    fontWeight: 800,
    cursor: "pointer",
  },
  paidButton: {
    padding: "11px 14px",
    borderRadius: 12,
    border: 0,
    background: "#77d9ff",
    color: "#062033",
    fontWeight: 900,
    cursor: "pointer",
  },
};
