import { Feather } from "@expo/vector-icons";
import { useGetTradeStats } from "@workspace/api-client-react";
import React from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HORIZONTAL_PAD = 16;
const CHART_WIDTH = SCREEN_WIDTH - CHART_HORIZONTAL_PAD * 2;

function BarChart({ data }: { data: { month: string; pnl: number; trades: number }[] }) {
  if (data.length === 0) {
    return (
      <View style={chart.empty}>
        <Text style={chart.emptyText}>No data yet</Text>
      </View>
    );
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const chartHeight = 160;
  const barWidth = Math.min(32, (CHART_WIDTH - 40) / data.length - 6);

  return (
    <View style={chart.container}>
      <View style={[chart.bars, { height: chartHeight }]}>
        {data.map((d) => {
          const isPositive = d.pnl >= 0;
          const barH = (Math.abs(d.pnl) / maxAbs) * (chartHeight / 2);
          const label = d.month.substring(5);
          return (
            <View key={d.month} style={chart.barCol}>
              <View style={[chart.barWrapper, { height: chartHeight / 2 }]}>
                {isPositive && (
                  <View
                    style={[
                      chart.bar,
                      {
                        height: Math.max(barH, 2),
                        width: barWidth,
                        backgroundColor: Colors.green,
                        alignSelf: "flex-end",
                        borderRadius: 4,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={chart.baseline} />
              <View style={[chart.barWrapper, { height: chartHeight / 2 }]}>
                {!isPositive && (
                  <View
                    style={[
                      chart.bar,
                      {
                        height: Math.max(barH, 2),
                        width: barWidth,
                        backgroundColor: Colors.red,
                        alignSelf: "flex-start",
                        borderRadius: 4,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={chart.label}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chart = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: "center",
    gap: 2,
  },
  barWrapper: {
    justifyContent: "flex-end",
  },
  bar: {},
  baseline: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.border,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  empty: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: FeatherIconName;
}) {
  return (
    <View style={styles.statCard}>
      {icon && (
        <Feather name={icon} size={18} color={color ?? Colors.textSecondary} style={{ marginBottom: 8 }} />
      )}
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { data, refetch, isLoading } = useGetTradeStats();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const stats = data;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.teal} />
        }
      >
        {isLoading || !stats ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        ) : stats.totalTrades === 0 ? (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>Log trades to see your statistics</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly P&L</Text>
              <View style={styles.card}>
                <BarChart data={stats.monthlyPnl ?? []} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statGrid}>
                <StatCard
                  label="Total P&L"
                  value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`}
                  color={stats.totalPnl >= 0 ? Colors.green : Colors.red}
                  icon="dollar-sign"
                />
                <StatCard
                  label="Win Rate"
                  value={`${(stats.winRate * 100).toFixed(1)}%`}
                  color={stats.winRate >= 0.5 ? Colors.green : Colors.red}
                  icon="percent"
                />
                <StatCard
                  label="Total Trades"
                  value={String(stats.totalTrades)}
                  icon="activity"
                />
                <StatCard
                  label="Avg R:R"
                  value={`${stats.avgRr.toFixed(2)}R`}
                  color={Colors.teal}
                  icon="trending-up"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Wins</Text>
                    <Text style={[styles.rowValue, { color: Colors.green }]}>{stats.winCount}</Text>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Losses</Text>
                    <Text style={[styles.rowValue, { color: Colors.red }]}>{stats.lossCount}</Text>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Breakeven</Text>
                    <Text style={[styles.rowValue, { color: Colors.amber }]}>{stats.breakevenCount}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Best Trade</Text>
                    <Text style={[styles.rowValue, { color: Colors.green }]}>
                      {stats.bestTrade != null ? `+${stats.bestTrade.toFixed(2)}` : "—"}
                    </Text>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Worst Trade</Text>
                    <Text style={[styles.rowValue, { color: Colors.red }]}>
                      {stats.worstTrade != null ? stats.worstTrade.toFixed(2) : "—"}
                    </Text>
                  </View>
                  <View style={styles.rowItem}>
                    <Text style={styles.rowLabel}>Profit Factor</Text>
                    <Text
                      style={[
                        styles.rowValue,
                        {
                          color:
                            stats.profitFactor != null && stats.profitFactor >= 1
                              ? Colors.green
                              : Colors.red,
                        },
                      ]}
                    >
                      {stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  rowValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  loading: {
    flex: 1,
    paddingTop: 80,
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  empty: {
    paddingTop: 80,
    alignItems: "center",
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
  },
});
