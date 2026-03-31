import { Feather } from "@expo/vector-icons";
import { useGetTradeStats } from "@workspace/api-client-react";
import type { AssetBreakdown, DailyPnl, MonthlyPnl, TradeHighlight } from "@workspace/api-client-react";
import React from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HORIZONTAL_PAD = 16;
const CHART_WIDTH = SCREEN_WIDTH - CHART_HORIZONTAL_PAD * 2;

type ChartMode = "daily" | "monthly";

type ChartItem = { label: string; pnl: number; trades: number };

function BarChart({ data }: { data: ChartItem[] }) {
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
        {data.map((d, i) => {
          const isPositive = d.pnl >= 0;
          const barH = (Math.abs(d.pnl) / maxAbs) * (chartHeight / 2);
          return (
            <View key={i} style={chart.barCol}>
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
              <Text style={chart.label}>{d.label}</Text>
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

function WinRateCard({
  winRate,
  winCount,
  lossCount,
  breakevenCount,
}: {
  winRate: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
}) {
  const total = winCount + lossCount + breakevenCount;
  const winPct = total > 0 ? winCount / total : 0;
  const lossPct = total > 0 ? lossCount / total : 0;
  const bePct = total > 0 ? breakevenCount / total : 0;

  return (
    <View>
      <View style={wincard.header}>
        <Text style={wincard.pct}>{(winRate * 100).toFixed(1)}%</Text>
        <Text style={wincard.label}>Win Rate</Text>
      </View>
      <View style={wincard.bar}>
        <View style={[wincard.segment, { flex: winPct, backgroundColor: Colors.green }]} />
        <View style={[wincard.segment, { flex: bePct, backgroundColor: Colors.amber }]} />
        <View style={[wincard.segment, { flex: lossPct, backgroundColor: Colors.red }]} />
      </View>
      <View style={wincard.counts}>
        <View style={wincard.countItem}>
          <View style={[wincard.dot, { backgroundColor: Colors.green }]} />
          <Text style={wincard.countLabel}>W</Text>
          <Text style={[wincard.countValue, { color: Colors.green }]}>{winCount}</Text>
        </View>
        <View style={wincard.countItem}>
          <View style={[wincard.dot, { backgroundColor: Colors.amber }]} />
          <Text style={wincard.countLabel}>BE</Text>
          <Text style={[wincard.countValue, { color: Colors.amber }]}>{breakevenCount}</Text>
        </View>
        <View style={wincard.countItem}>
          <View style={[wincard.dot, { backgroundColor: Colors.red }]} />
          <Text style={wincard.countLabel}>L</Text>
          <Text style={[wincard.countValue, { color: Colors.red }]}>{lossCount}</Text>
        </View>
      </View>
    </View>
  );
}

const wincard = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 12,
  },
  pct: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  bar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: Colors.border,
    marginBottom: 10,
    gap: 2,
  },
  segment: {
    height: "100%",
    borderRadius: 4,
    minWidth: 2,
  },
  counts: {
    flexDirection: "row",
    gap: 20,
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  countLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
  countValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});

function TradeHighlightCard({
  title,
  detail,
  isPositive,
}: {
  title: string;
  detail: TradeHighlight | null | undefined;
  isPositive: boolean;
}) {
  const color = isPositive ? Colors.green : Colors.red;
  const bgColor = isPositive ? Colors.greenMuted : Colors.redMuted;
  const icon: React.ComponentProps<typeof Feather>["name"] = isPositive ? "trending-up" : "trending-down";

  return (
    <View style={[highlight.card, { backgroundColor: bgColor, borderColor: color + "33" }]}>
      <View style={highlight.top}>
        <Feather name={icon} size={14} color={color} />
        <Text style={[highlight.title, { color }]}>{title}</Text>
      </View>
      {detail ? (
        <>
          <Text style={highlight.pnl}>
            {detail.pnl >= 0 ? "+" : ""}
            {detail.pnl.toFixed(2)}
          </Text>
          <Text style={highlight.meta}>
            {detail.asset} · {detail.direction === "long" ? "Long" : "Short"}
          </Text>
        </>
      ) : (
        <Text style={highlight.empty}>—</Text>
      )}
    </View>
  );
}

const highlight = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  pnl: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
    marginBottom: 2,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  empty: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textMuted,
  },
});

function AssetBreakdownRow({ item }: { item: AssetBreakdown }) {
  const pnlColor = item.totalPnl >= 0 ? Colors.green : Colors.red;
  const winPct = item.tradeCount > 0 ? item.winCount / item.tradeCount : 0;

  return (
    <View style={assetRow.container}>
      <View style={assetRow.left}>
        <Text style={assetRow.asset}>{item.asset}</Text>
        <Text style={assetRow.sub}>{item.tradeCount} trades</Text>
      </View>
      <View style={assetRow.center}>
        <Text style={assetRow.winRate}>{(winPct * 100).toFixed(0)}% W</Text>
        <Text style={assetRow.wl}>
          {item.winCount}W · {item.lossCount}L
        </Text>
      </View>
      <Text style={[assetRow.pnl, { color: pnlColor }]}>
        {item.totalPnl >= 0 ? "+" : ""}
        {item.totalPnl.toFixed(2)}
      </Text>
    </View>
  );
}

const assetRow = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  left: {
    flex: 1,
  },
  center: {
    alignItems: "flex-end",
    marginRight: 16,
  },
  asset: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  winRate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  wl: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pnl: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    minWidth: 70,
    textAlign: "right",
  },
});

function Toggle({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: ChartMode) => void;
  options: { label: string; value: ChartMode }[];
}) {
  return (
    <View style={toggle.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[toggle.btn, active && toggle.btnActive]}
            activeOpacity={0.7}
          >
            <Text style={[toggle.label, active && toggle.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const toggle = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 3,
    alignSelf: "flex-start",
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnActive: {
    backgroundColor: Colors.blueMuted,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.blue,
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
  const [chartMode, setChartMode] = React.useState<ChartMode>("monthly");

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const stats = data;

  const chartData: ChartItem[] = React.useMemo(() => {
    if (!stats) return [];
    if (chartMode === "monthly") {
      return (stats.monthlyPnl ?? []).map((m: MonthlyPnl) => ({
        label: m.month.substring(5),
        pnl: m.pnl,
        trades: m.trades,
      }));
    }
    const daily = stats.dailyPnl ?? [];
    const recent = daily.slice(-30);
    return recent.map((d: DailyPnl) => ({
      label: d.date.substring(8),
      pnl: d.pnl,
      trades: d.trades,
    }));
  }, [stats, chartMode]);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>P&L</Text>
                <Toggle
                  value={chartMode}
                  onChange={setChartMode}
                  options={[
                    { label: "Monthly", value: "monthly" },
                    { label: "Daily", value: "daily" },
                  ]}
                />
              </View>
              <View style={styles.card}>
                <BarChart data={chartData} />
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
                  label="Total Trades"
                  value={String(stats.totalTrades)}
                  icon="activity"
                />
                <StatCard
                  label="Avg R:R"
                  value={`${stats.avgRr.toFixed(2)}R`}
                  color={Colors.blue}
                  icon="trending-up"
                />
                <StatCard
                  label="Profit Factor"
                  value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"}
                  color={
                    stats.profitFactor != null && stats.profitFactor >= 1 ? Colors.green : Colors.red
                  }
                  icon="zap"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Win Rate</Text>
              <View style={styles.card}>
                <WinRateCard
                  winRate={stats.winRate}
                  winCount={stats.winCount}
                  lossCount={stats.lossCount}
                  breakevenCount={stats.breakevenCount}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Best & Worst Trade</Text>
              <View style={styles.row}>
                <TradeHighlightCard
                  title="Best Trade"
                  detail={stats.bestTradeDetail}
                  isPositive={true}
                />
                <TradeHighlightCard
                  title="Worst Trade"
                  detail={stats.worstTradeDetail}
                  isPositive={false}
                />
              </View>
            </View>

            {(stats.assetBreakdown ?? []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By Asset</Text>
                <View style={styles.card}>
                  {(stats.assetBreakdown ?? []).map((item: AssetBreakdown, idx: number) => (
                    <View key={item.asset}>
                      {idx > 0 && <View style={styles.divider} />}
                      <AssetBreakdownRow item={item} />
                    </View>
                  ))}
                </View>
              </View>
            )}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingLeft: 4,
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
    gap: 10,
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
