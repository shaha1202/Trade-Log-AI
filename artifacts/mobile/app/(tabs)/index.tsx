import { Feather } from "@expo/vector-icons";
import { useGetAiInsight, useListTrades } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

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
  const { data, isLoading, refetch } = useGetAiInsight();

  React.useEffect(() => {
    if (refreshing) {
      refetch();
    }
  }, [refreshing, refetch]);

  if (tradeCount < 3) return null;

  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.insightChip}>
          <Feather name="cpu" size={10} color={Colors.teal} />
          <Text style={styles.insightChipText}>AI Insight</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.insightLoading}>
          <ActivityIndicator size="small" color={Colors.teal} />
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
  if (todayVal == null || histAvg == null || histAvg === 0) return { label: "—", color: Colors.textMuted };
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
  const countContext = getContext(todayCount > 0 ? todayCount : null, histAvgTradesPerDay, true);

  return (
    <View style={styles.statsBar}>
      <StatItem
        value={String(todayCount)}
        label="Today"
        context={countContext}
      />
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
        valueColor={Colors.teal}
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
  const maxScore = Math.min(last10.length, 10);

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

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { data, refetch, isLoading } = useListTrades({});

  const trades = (data?.trades ?? []) as Trade[];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 80;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.push("/(tabs)/add")}
        >
          <Feather name="plus" size={22} color={Colors.teal} />
        </Pressable>
      </View>

      <AIInsightCard tradeCount={trades.length} refreshing={refreshing} />

      {trades.length > 0 && <StatsBar trades={trades} />}

      {trades.length > 0 && <StreakRow trades={trades} />}

      <FlatList
        data={trades}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TradeCard trade={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad },
        ]}
        scrollEnabled={!!trades.length}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.teal}
          />
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
                  Tap "Add Trade" to log your first trade
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
    backgroundColor: Colors.tealDim,
    alignItems: "center",
    justifyContent: "center",
  },
  insightCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.tealDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.teal,
    padding: 14,
    gap: 8,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.tealMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.teal,
  },
  insightChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.teal,
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
  statsBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
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
  streakRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
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
    borderColor: Colors.border,
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
    backgroundColor: Colors.tealMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.teal,
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
    color: Colors.teal,
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
