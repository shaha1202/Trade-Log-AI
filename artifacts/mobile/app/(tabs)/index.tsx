import { Feather } from "@expo/vector-icons";
import { useGetAiInsight, useListTrades } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { G, Line, Polyline, Svg, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { FREE_TRADE_LIMIT } from "@/constants/storage";
import { useSettings } from "@/hooks/useSettings";

const SCREEN_W = Dimensions.get("window").width;

type Trade = {
  id: number;
  asset: string;
  timeframe: string;
  direction: "long" | "short";
  result?: "win" | "loss" | "breakeven" | null;
  pnl?: number | null;
  rr?: number | null;
  planAdherence?: number | null;
  aiAnalyzed: boolean;
  createdAt: string;
};

function TradeCard({ trade }: { trade: Trade }) {
  const isLong = trade.direction === "long";
  const isWin = trade.result === "win";
  const isLoss = trade.result === "loss";
  const isBE = trade.result === "breakeven";

  const resultColor = isWin ? Colors.green : isLoss ? Colors.red : Colors.amber;
  const resultBg = isWin ? Colors.greenMuted : isLoss ? Colors.redMuted : isBE ? Colors.amberMuted : Colors.surface3;
  const dirColor = isLong ? Colors.green : Colors.red;
  const dirBg = isLong ? Colors.greenMuted : Colors.redMuted;

  const date = new Date(trade.createdAt);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push({ pathname: "/trade/[id]", params: { id: String(trade.id) } })}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardHeader}>
          <Text style={styles.asset}>{trade.asset}</Text>
          {trade.aiAnalyzed && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          )}
        </View>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: dirBg }]}>
            <Text style={[styles.pillText, { color: dirColor }]}>
              {isLong ? "LONG" : "SHORT"}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.surface3 }]}>
            <Text style={[styles.pillText, { color: Colors.textSecondary }]}>
              {trade.timeframe}
            </Text>
          </View>
          {trade.result && (
            <View style={[styles.pill, { backgroundColor: resultBg }]}>
              <Text style={[styles.pillText, { color: resultColor }]}>
                {trade.result.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.time}>
          {dateStr} · {timeStr}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {trade.pnl != null && (
          <Text
            style={[
              styles.pnl,
              {
                color: trade.pnl > 0 ? Colors.green : trade.pnl < 0 ? Colors.red : Colors.textSecondary,
              },
            ]}
          >
            {trade.pnl > 0 ? "+" : ""}
            {trade.pnl.toFixed(2)}
          </Text>
        )}
        {trade.rr != null && (
          <Text style={styles.rr}>{trade.rr.toFixed(2)}R</Text>
        )}
        <Feather name="chevron-right" size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
      </View>
    </Pressable>
  );
}

function AIInsightCard({ tradeCount, refreshing }: { tradeCount: number; refreshing: boolean }) {
  const { data, isLoading, refetch } = useGetAiInsight({
    query: { enabled: tradeCount >= 3, staleTime: 5 * 60 * 1000 },
  });

  React.useEffect(() => {
    if (refreshing && tradeCount >= 3) {
      refetch();
    }
  }, [refreshing, tradeCount, refetch]);

  if (tradeCount < 3) {
    return (
      <View style={[styles.insightCard, styles.insightCardLocked]}>
        <View style={styles.insightHeader}>
          <View style={styles.insightChip}>
            <Feather name="cpu" size={10} color={Colors.blue} />
            <Text style={styles.insightChipText}>AI Insight</Text>
          </View>
        </View>
        <Text style={styles.insightLockedText}>
          Log {3 - tradeCount} more {3 - tradeCount === 1 ? "trade" : "trades"} to unlock your first AI insight
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.insightChip}>
          <Feather name="cpu" size={10} color={Colors.blue} />
          <Text style={styles.insightChipText}>AI Insight</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.insightLoading}>
          <ActivityIndicator size="small" color={Colors.blue} />
          <Text style={styles.insightLoadingText}>Analyzing your trades...</Text>
        </View>
      ) : (
        <Text style={styles.insightText}>{data?.insight ?? "Keep logging trades to unlock personalized AI insights."}</Text>
      )}
    </View>
  );
}

type ContextLabel = { label: string; color: string } | null;

function getContext(todayVal: number | null, histAvg: number | null, higherIsBetter: boolean): ContextLabel {
  if (todayVal == null || histAvg == null) return { label: "—", color: Colors.textMuted };
  if (histAvg === 0 && todayVal === 0) return { label: "On track", color: Colors.amber };
  if (histAvg === 0) return higherIsBetter ? { label: "Above avg", color: Colors.green } : { label: "Below avg", color: Colors.red };
  const ratio = todayVal / histAvg;
  if (higherIsBetter) {
    if (ratio >= 1.1) return { label: "Above avg", color: Colors.green };
    if (ratio >= 0.85) return { label: "On track", color: Colors.amber };
    return { label: "Below avg", color: Colors.red };
  } else {
    if (ratio <= 0.9) return { label: "Above avg", color: Colors.green };
    if (ratio <= 1.15) return { label: "On track", color: Colors.amber };
    return { label: "Below avg", color: Colors.red };
  }
}

function StatItem({
  value,
  label,
  context,
  valueColor,
}: {
  value: string;
  label: string;
  context: ContextLabel;
  valueColor?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {context ? (
        <Text style={[styles.statContext, { color: context.color }]}>{context.label}</Text>
      ) : (
        <Text style={[styles.statContext, { color: Colors.textMuted }]}>—</Text>
      )}
    </View>
  );
}

function StatsBar({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTrades = trades.filter((t) => new Date(t.createdAt) >= todayStart);

  const todayWins = todayTrades.filter((t) => t.result === "win").length;
  const todayWinRate = todayTrades.length > 0 ? (todayWins / todayTrades.length) * 100 : null;
  const todayPnl = todayTrades.length > 0 ? todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0) : null;
  const todayRrs = todayTrades.filter((t) => t.rr != null).map((t) => t.rr!);
  const todayAvgRr = todayRrs.length > 0 ? todayRrs.reduce((a, b) => a + b, 0) / todayRrs.length : null;

  const pastTrades = trades.filter((t) => new Date(t.createdAt) < todayStart);
  const pastDaysMap = new Map<string, { pnl: number }>();
  for (const t of pastTrades) {
    const key = t.createdAt.substring(0, 10);
    const d = pastDaysMap.get(key) ?? { pnl: 0 };
    d.pnl += t.pnl ?? 0;
    pastDaysMap.set(key, d);
  }
  const pastDayPnls = Array.from(pastDaysMap.values()).map((d) => d.pnl);
  const histAvgDailyPnl = pastDayPnls.length > 0 ? pastDayPnls.reduce((a, b) => a + b, 0) / pastDayPnls.length : null;

  const pastWins = pastTrades.filter((t) => t.result === "win").length;
  const histWinRate = pastTrades.length > 0 ? (pastWins / pastTrades.length) * 100 : null;

  const pastRrs = pastTrades.filter((t) => t.rr != null).map((t) => t.rr!);
  const histAvgRr = pastRrs.length > 0 ? pastRrs.reduce((a, b) => a + b, 0) / pastRrs.length : null;

  const winRateContext = getContext(todayWinRate, histWinRate, true);
  const pnlContext = getContext(todayPnl, histAvgDailyPnl, true);
  const rrContext = getContext(todayAvgRr, histAvgRr, true);

  const todayCount = todayTrades.length;
  const histAvgTradesPerDay = pastDaysMap.size > 0
    ? pastTrades.length / pastDaysMap.size
    : null;
  const countContext = getContext(todayCount, histAvgTradesPerDay, true);

  return (
    <View style={styles.statsBar}>
      <StatItem value={String(todayCount)} label="Today" context={countContext} />
      <View style={styles.statDivider} />
      <StatItem
        value={todayWinRate != null ? `${todayWinRate.toFixed(0)}%` : "—"}
        label="Win Rate"
        context={winRateContext}
        valueColor={todayWinRate != null ? (todayWinRate >= 50 ? Colors.green : Colors.red) : undefined}
      />
      <View style={styles.statDivider} />
      <StatItem
        value={todayPnl != null ? `${todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}` : "—"}
        label="Daily P&L"
        context={pnlContext}
        valueColor={todayPnl != null ? (todayPnl > 0 ? Colors.green : todayPnl < 0 ? Colors.red : Colors.textSecondary) : undefined}
      />
      <View style={styles.statDivider} />
      <StatItem
        value={todayAvgRr != null ? `${todayAvgRr.toFixed(2)}R` : "—"}
        label="Avg R:R"
        context={rrContext}
        valueColor={Colors.blue}
      />
    </View>
  );
}

function StreakRow({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null;

  const dayMap = new Map<string, number>();
  for (const t of trades) {
    const key = t.createdAt.substring(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + (t.pnl ?? 0));
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().substring(0, 10);
    const dayPnl = dayMap.get(key);
    if (dayPnl != null && dayPnl > 0) {
      streak++;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const last10 = trades.slice(0, 10);
  const disciplineCount = last10.filter((t) => (t.planAdherence ?? 0) >= 3).length;
  const maxScore = 10;

  const streakColor = streak >= 3 ? Colors.green : streak >= 1 ? Colors.amber : Colors.textMuted;
  const streakEmoji = streak >= 3 ? "🔥" : streak >= 1 ? "✅" : "📉";
  const disciplineColor = disciplineCount >= 7 ? Colors.green : disciplineCount >= 4 ? Colors.amber : Colors.red;

  return (
    <View style={styles.streakRow}>
      <View style={styles.streakItem}>
        <Text style={styles.streakIcon}>{streakEmoji}</Text>
        <View>
          <Text style={[styles.streakValue, { color: streakColor }]}>
            {streak > 0 ? `${streak}-day streak` : "0"}
          </Text>
          <Text style={styles.streakLabel}>Winning days</Text>
        </View>
      </View>
      <View style={styles.streakDivider} />
      <View style={styles.streakItem}>
        <Text style={styles.streakIcon}>📋</Text>
        <View>
          {maxScore > 0 ? (
            <Text style={[styles.streakValue, { color: disciplineColor }]}>
              {disciplineCount}/{maxScore}
            </Text>
          ) : (
            <Text style={[styles.streakValue, { color: Colors.textMuted }]}>—</Text>
          )}
          <Text style={styles.streakLabel}>Discipline score</Text>
        </View>
      </View>
    </View>
  );
}

function SparklineCard({ trades }: { trades: Trade[] }) {
  const now = new Date();
  const dailyPnls: { label: string; dailyPnl: number; hasData: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().substring(0, 10);
    const dayTrades = trades.filter((t) => t.createdAt.substring(0, 10) === key);
    const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const dayLabel = i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" });
    dailyPnls.push({ label: dayLabel, dailyPnl: pnl, hasData: dayTrades.length > 0 });
  }

  const cumulativePnls: number[] = [];
  let running = 0;
  for (const d of dailyPnls) {
    running += d.dailyPnl;
    cumulativePnls.push(running);
  }

  const W = SCREEN_W - 32;
  const H = 64;
  const PAD_X = 28;
  const PAD_Y = 10;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const minCum = Math.min(...cumulativePnls);
  const maxCum = Math.max(...cumulativePnls);
  const range = maxCum - minCum;
  const flatLine = range === 0;

  const points = dailyPnls.map((d, i) => {
    const x = PAD_X + (i / 6) * innerW;
    const cumVal = cumulativePnls[i];
    const y = flatLine
      ? PAD_Y + innerH / 2
      : PAD_Y + innerH - ((cumVal - minCum) / range) * innerH;
    return { x, y, cumVal, label: d.label, hasData: d.hasData };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const netTrend = cumulativePnls[cumulativePnls.length - 1];
  const lineColor = Colors.blue;

  return (
    <View style={styles.sparkCard}>
      <View style={styles.sparkHeader}>
        <Text style={styles.sparkTitle}>7-Day P&L</Text>
        <Text style={[styles.sparkNet, { color: lineColor }]}>
          {netTrend >= 0 ? "+" : ""}{netTrend.toFixed(2)}
        </Text>
      </View>
      <Svg width={W} height={H + 20}>
        <G>
          <Line x1={PAD_X} y1={PAD_Y + innerH} x2={W - PAD_X} y2={PAD_Y + innerH} stroke={Colors.border} strokeWidth={1} />
          <Polyline
            points={polylineStr}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <G key={i}>
              {p.hasData && (
                <G>
                  <G cx={p.x} cy={p.y} r={3} />
                  <Line x1={p.x} y1={p.y - 3} x2={p.x} y2={p.y + 3} stroke={lineColor} strokeWidth={4} strokeLinecap="round" />
                </G>
              )}
              <SvgText
                x={p.x}
                y={H + 16}
                textAnchor="middle"
                fontSize={9}
                fill={Colors.textMuted}
                fontFamily="Inter_400Regular"
              >
                {p.label}
              </SvgText>
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}

function CalendarHeatmap({ trades }: { trades: Trade[] }) {
  const dayPnlMap = new Map<string, number>();
  for (const t of trades) {
    const key = t.createdAt.substring(0, 10);
    dayPnlMap.set(key, (dayPnlMap.get(key) ?? 0) + (t.pnl ?? 0));
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayKey = today.toISOString().substring(0, 10);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;

  const monthName = firstDay.toLocaleDateString([], { month: "long", year: "numeric" });
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const flatCells: { day: number | null; key: string | null }[] = [];
  for (let i = 0; i < startDow; i++) flatCells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = date.toISOString().substring(0, 10);
    flatCells.push({ day: d, key });
  }
  while (flatCells.length % 7 !== 0) flatCells.push({ day: null, key: null });

  const rows: { day: number | null; key: string | null }[][] = [];
  for (let i = 0; i < flatCells.length; i += 7) rows.push(flatCells.slice(i, i + 7));

  function getCellStyle(key: string | null, day: number | null) {
    if (!key || !day) return { backgroundColor: "transparent" };
    const d = new Date(year, month, day);
    const isToday = key === todayKey;
    const isFuture = d > today;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    if (isFuture) {
      return { backgroundColor: isWeekend ? Colors.bg : Colors.surface };
    }
    const pnl = dayPnlMap.get(key);
    if (pnl == null) return { backgroundColor: isWeekend ? Colors.surface : Colors.surface2, borderWidth: isToday ? 1.5 : 0, borderColor: Colors.blue };
    if (pnl > 0) return { backgroundColor: Colors.greenMuted, borderWidth: isToday ? 1.5 : 0, borderColor: isToday ? Colors.blue : Colors.green };
    if (pnl < 0) return { backgroundColor: Colors.redMuted, borderWidth: isToday ? 1.5 : 0, borderColor: isToday ? Colors.blue : Colors.red };
    return { backgroundColor: Colors.amberMuted, borderWidth: isToday ? 1.5 : 0, borderColor: isToday ? Colors.blue : Colors.amber };
  }

  function getCellTextColor(key: string | null, day: number | null) {
    if (!key || !day) return "transparent";
    const d = new Date(year, month, day);
    const isFuture = d > today;
    if (isFuture) return Colors.textMuted;
    const pnl = dayPnlMap.get(key);
    if (pnl == null) return Colors.textMuted;
    if (pnl > 0) return Colors.green;
    if (pnl < 0) return Colors.red;
    return Colors.amber;
  }

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeader}>
        <Text style={styles.calTitle}>{monthName}</Text>
        <View style={styles.calLegend}>
          <View style={[styles.calDot, { backgroundColor: Colors.greenMuted }]} />
          <Text style={styles.calLegendText}>Profit</Text>
          <View style={[styles.calDot, { backgroundColor: Colors.redMuted }]} />
          <Text style={styles.calLegendText}>Loss</Text>
        </View>
      </View>
      <View style={styles.calGrid}>
        <View style={styles.calRow}>
          {weekdays.map((wd, i) => (
            <View key={i} style={styles.calCell}>
              <Text style={styles.calWeekday}>{wd}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((cell, ci) => (
              <View
                key={ci}
                style={[
                  styles.calCell,
                  styles.calDateCell,
                  getCellStyle(cell.key, cell.day),
                  { borderRadius: 6 },
                ]}
              >
                {cell.day != null && (
                  <Text style={[styles.calDay, { color: getCellTextColor(cell.key, cell.day) }]}>
                    {cell.day}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function DailyGoalCard({ trades, goal }: { trades: Trade[]; goal: number }) {
  if (goal <= 0) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayPnl = trades.filter((t) => new Date(t.createdAt) >= todayStart)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);

  const progress = Math.min(Math.max(todayPnl / goal, 0), 1);
  const pct = Math.round(progress * 100);
  const met = todayPnl >= goal;

  const barColor = met ? Colors.green : progress >= 0.5 ? Colors.blue : Colors.amber;
  const bgColor = met ? Colors.greenMuted : Colors.blueDim;
  const borderColor = met ? Colors.green : Colors.blue;

  return (
    <View style={[styles.goalCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.goalCardHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.goalCardEmoji}>{met ? "✓" : "🎯"}</Text>
          <Text style={[styles.goalCardTitle, { color: met ? Colors.green : Colors.blue }]}>
            {met ? "Daily goal reached!" : "Daily Goal"}
          </Text>
        </View>
        <Text style={[styles.goalCardPct, { color: met ? Colors.green : Colors.blue }]}>{pct}%</Text>
      </View>
      <View style={styles.goalBarBg}>
        <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.goalCardFooter}>
        <Text style={styles.goalCardSub}>
          {todayPnl >= 0 ? "+" : ""}{todayPnl.toFixed(2)} / ${goal.toFixed(0)}
        </Text>
        {!met && (
          <Text style={styles.goalCardRemaining}>
            ${(goal - todayPnl).toFixed(2)} to go
          </Text>
        )}
      </View>
    </View>
  );
}

type BadgeDef = {
  emoji: string;
  label: string;
  check: (trades: Trade[]) => boolean;
};

const BADGES: BadgeDef[] = [
  {
    emoji: "🎯",
    label: "10 Wins",
    check: (t) => t.filter((x) => x.result === "win").length >= 10,
  },
  {
    emoji: "📈",
    label: "Profitable Week",
    check: (trades) => {
      const weekMap = new Map<string, number>();
      for (const t of trades) {
        const d = new Date(t.createdAt);
        const year = d.getFullYear();
        const week = Math.floor((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86400000));
        const key = `${year}-${week}`;
        weekMap.set(key, (weekMap.get(key) ?? 0) + (t.pnl ?? 0));
      }
      return Array.from(weekMap.values()).some((p) => p > 0);
    },
  },
  {
    emoji: "⚡",
    label: "5R Day",
    check: (t) => t.some((x) => (x.rr ?? 0) >= 5),
  },
];

function BadgeRow({ trades }: { trades: Trade[] }) {
  const badges = BADGES.map((b) => ({ ...b, unlocked: b.check(trades) }));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.badgeScroll}
    >
      {badges.map((badge) => (
        <View
          key={badge.label}
          style={[
            styles.badgeChip,
            badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
          ]}
        >
          <Text style={[styles.badgeEmoji, !badge.unlocked && styles.badgeEmojiLocked]}>
            {badge.emoji}
          </Text>
          <Text style={[styles.badgeLabel, !badge.unlocked && styles.badgeLabelLocked]}>
            {badge.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data, refetch, isLoading } = useListTrades({});
  const { dailyGoalPnl } = useSettings();

  const trades = (data?.trades ?? []) as Trade[];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 96 : insets.bottom + 80;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            if (trades.length >= FREE_TRADE_LIMIT) {
              router.push("/paywall");
            } else {
              router.push("/(tabs)/add");
            }
          }}
        >
          <Feather name="plus" size={22} color={Colors.blue} />
        </Pressable>
      </View>

      <FlatList
        data={trades}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TradeCard trade={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.blue}
          />
        }
        ListHeaderComponent={
          <>
            <AIInsightCard tradeCount={trades.length} refreshing={refreshing} />
            <DailyGoalCard trades={trades} goal={dailyGoalPnl} />
            {trades.length > 0 && <StatsBar trades={trades} />}
            <SparklineCard trades={trades} />
            {trades.length > 0 && <StreakRow trades={trades} />}
            <BadgeRow trades={trades} />
            <CalendarHeatmap trades={trades} />
            {trades.length > 0 && (
              <Text style={styles.sectionHeader}>Recent Trades</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? (
              <Text style={styles.emptyText}>Loading trades...</Text>
            ) : (
              <>
                <Feather name="book-open" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No trades yet</Text>
                <Text style={styles.emptyText}>
                  Tap "+" to log your first trade
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blueDim,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 6,
  },
  insightCard: {
    marginBottom: 10,
    backgroundColor: Colors.blueDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
    padding: 14,
    gap: 8,
  },
  insightCardLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.blueMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
  },
  insightChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.blue,
    letterSpacing: 0.5,
  },
  insightLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightLoadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  insightText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  insightLockedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  goalCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  goalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCardEmoji: {
    fontSize: 16,
  },
  goalCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  goalCardPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  goalBarBg: {
    height: 6,
    backgroundColor: Colors.surface3,
    borderRadius: 3,
    overflow: "hidden",
  },
  goalBarFill: {
    height: 6,
    borderRadius: 3,
  },
  goalCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalCardSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  goalCardRemaining: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginBottom: 10,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  statContext: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: Colors.border,
    alignSelf: "center",
  },
  sparkCard: {
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    paddingBottom: 4,
  },
  sparkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sparkTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sparkNet: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  streakRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  streakIcon: {
    fontSize: 22,
  },
  streakValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  streakLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  streakDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  badgeScroll: {
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  badgeChip: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 76,
  },
  badgeUnlocked: {
    backgroundColor: Colors.blueDim,
    borderColor: Colors.borderBlue,
  },
  badgeLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.blue,
    textAlign: "center",
  },
  badgeLabelLocked: {
    color: Colors.textMuted,
  },
  calCard: {
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  calLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calLegendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  calGrid: {
    gap: 6,
  },
  calRow: {
    flexDirection: "row",
    gap: 6,
  },
  calCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 18,
  },
  calDateCell: {
    aspectRatio: 1,
    height: undefined,
  },
  calWeekday: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
  calDay: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.borderBlue,
  },
  cardLeft: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  asset: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  aiBadge: {
    backgroundColor: Colors.blueMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.blue,
    letterSpacing: 0.5,
  },
  pills: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: 12,
  },
  pnl: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  rr: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.blue,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
