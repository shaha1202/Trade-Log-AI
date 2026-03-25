import { Feather } from "@expo/vector-icons";
import { useListTrades } from "@workspace/api-client-react";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
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

function StatsBar({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTrades = trades.filter((t) => new Date(t.createdAt) >= todayStart);

  const wins = todayTrades.filter((t) => t.result === "win").length;
  const winRate = todayTrades.length > 0 ? (wins / todayTrades.length) * 100 : 0;
  const dailyPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const rrs = todayTrades.filter((t) => t.rr != null).map((t) => t.rr!);
  const avgRr = rrs.length > 0 ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0;

  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{todayTrades.length}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: winRate >= 50 ? Colors.green : todayTrades.length > 0 ? Colors.red : Colors.textSecondary }]}>
          {todayTrades.length > 0 ? `${winRate.toFixed(0)}%` : "—"}
        </Text>
        <Text style={styles.statLabel}>Win Rate</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text
          style={[
            styles.statValue,
            { color: dailyPnl > 0 ? Colors.green : dailyPnl < 0 ? Colors.red : Colors.textSecondary },
          ]}
        >
          {dailyPnl > 0 ? "+" : ""}
          {todayTrades.length > 0 ? dailyPnl.toFixed(2) : "—"}
        </Text>
        <Text style={styles.statLabel}>Daily P&L</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: Colors.teal }]}>
          {avgRr > 0 ? `${avgRr.toFixed(2)}R` : "—"}
        </Text>
        <Text style={styles.statLabel}>Avg R:R</Text>
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

      {trades.length > 0 && <StatsBar trades={trades} />}

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
  statsBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
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
