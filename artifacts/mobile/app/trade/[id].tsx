import { Feather } from "@expo/vector-icons";
import { useDeleteTrade, useGetTrade } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
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
  session?: string | null;
  direction: "long" | "short";
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  rr?: number | null;
  lotSize?: number | null;
  riskPct?: number | null;
  pnl?: number | null;
  holdDuration?: string | null;
  result?: "win" | "loss" | "breakeven" | null;
  htfTrend?: string | null;
  confluences: string[];
  aiNarrative?: string | null;
  checklistDirectionAligned?: boolean | null;
  checklistMinConfluences?: boolean | null;
  checklistRr?: boolean | null;
  checklistRisk?: boolean | null;
  checklistSlStructure?: boolean | null;
  checklistCalendar?: boolean | null;
  moodTags: string[];
  planAdherence?: number | null;
  didWell?: string | null;
  toImprove?: string | null;
  aiAnalyzed: boolean;
  createdAt: string;
};

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function CheckItem({ label, checked }: { label: string; checked?: boolean | null }) {
  if (checked == null) return null;
  return (
    <View style={[styles.checkRow, checked && styles.checkRowActive]}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <Feather name="check" size={12} color={Colors.bg} />}
      </View>
      <Text style={[styles.checkLabel, checked && { color: Colors.text }]}>{label}</Text>
    </View>
  );
}

function Stars({ value }: { value?: number | null }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={18} color={s <= value ? Colors.amber : Colors.textMuted} />
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useGetTrade(parseInt(id));
  const { mutateAsync: deleteTrade } = useDeleteTrade();

  const trade = data as Trade | undefined;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleDelete = () => {
    Alert.alert("Delete Trade", "Are you sure you want to delete this trade?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteTrade({ id: parseInt(id) });
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete trade.");
          }
        },
      },
    ]);
  };

  if (isLoading || !trade) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingText}>Loading trade...</Text>
        </View>
      </View>
    );
  }

  const isLong = trade.direction === "long";
  const isWin = trade.result === "win";
  const isLoss = trade.result === "loss";
  const isBE = trade.result === "breakeven";
  const dirColor = isLong ? Colors.green : Colors.red;
  const resultColor = isWin ? Colors.green : isLoss ? Colors.red : Colors.amber;

  const date = new Date(trade.createdAt);
  const dateStr = date.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.asset}>{trade.asset}</Text>
          {trade.aiAnalyzed && (
            <View style={styles.aiBadge}>
              <Feather name="cpu" size={9} color={Colors.blue} />
              <Text style={styles.aiText}>AI</Text>
            </View>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={18} color={Colors.red} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 32 },
        ]}
      >
        <View style={styles.heroRow}>
          <View style={[styles.pill, { backgroundColor: isLong ? Colors.greenMuted : Colors.redMuted }]}>
            <Feather name={isLong ? "arrow-up" : "arrow-down"} size={12} color={dirColor} />
            <Text style={[styles.pillText, { color: dirColor }]}>
              {isLong ? "LONG" : "SHORT"}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: Colors.surface2 }]}>
            <Text style={[styles.pillText, { color: Colors.textSecondary }]}>{trade.timeframe}</Text>
          </View>
          {trade.result && (
            <View style={[styles.pill, { backgroundColor: isWin ? Colors.greenMuted : isLoss ? Colors.redMuted : Colors.amberMuted }]}>
              <Text style={[styles.pillText, { color: resultColor }]}>
                {trade.result.toUpperCase()}
              </Text>
            </View>
          )}
          {trade.session && (
            <View style={[styles.pill, { backgroundColor: Colors.surface2 }]}>
              <Text style={[styles.pillText, { color: Colors.textSecondary }]}>{trade.session}</Text>
            </View>
          )}
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{dateStr} · {timeStr}</Text>
        </View>

        {(trade.pnl != null || trade.rr != null) && (
          <View style={styles.pnlCard}>
            {trade.pnl != null && (
              <View style={styles.pnlItem}>
                <Text style={[styles.pnlValue, { color: trade.pnl >= 0 ? Colors.green : Colors.red }]}>
                  {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                </Text>
                <Text style={styles.pnlLabel}>P&L ($)</Text>
              </View>
            )}
            {trade.rr != null && (
              <View style={styles.pnlItem}>
                <Text style={[styles.pnlValue, { color: Colors.blue }]}>{trade.rr.toFixed(2)}R</Text>
                <Text style={styles.pnlLabel}>R:R Ratio</Text>
              </View>
            )}
          </View>
        )}

        <Section title="Trade Info">
          {trade.entry != null && <DetailRow label="Entry" value={String(trade.entry)} />}
          {trade.stopLoss != null && <DetailRow label="Stop Loss" value={String(trade.stopLoss)} color={Colors.red} />}
          {trade.takeProfit != null && <DetailRow label="Take Profit" value={String(trade.takeProfit)} color={Colors.green} />}
          {trade.lotSize != null && <DetailRow label="Lot Size" value={String(trade.lotSize)} />}
          {trade.riskPct != null && <DetailRow label="Risk %" value={`${trade.riskPct}%`} />}
          {trade.holdDuration && <DetailRow label="Hold Duration" value={trade.holdDuration} />}
        </Section>

        {trade.htfTrend || trade.confluences.length > 0 || trade.aiNarrative ? (
          <Section title="AI Analysis">
            {trade.htfTrend && (
              <DetailRow
                label="HTF Trend"
                value={trade.htfTrend}
                color={trade.htfTrend === "Bullish" ? Colors.green : trade.htfTrend === "Bearish" ? Colors.red : Colors.textSecondary}
              />
            )}
            {trade.confluences.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confluences</Text>
                <View style={styles.tagWrap}>
                  {trade.confluences.map((c) => (
                    <View key={c} style={styles.confTag}>
                      <Text style={styles.confTagText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {trade.aiNarrative && (
              <View style={styles.narrativeBox}>
                <Text style={styles.narrativeText}>{trade.aiNarrative}</Text>
              </View>
            )}
          </Section>
        ) : null}

        <Section title="Pre-trade Checklist">
          <CheckItem label="Direction aligns with HTF trend" checked={trade.checklistDirectionAligned} />
          <CheckItem label="Minimum 2 confluences present" checked={trade.checklistMinConfluences} />
          <CheckItem label="R:R is at least 1:2" checked={trade.checklistRr} />
          <CheckItem label="Risk does not exceed 1–2%" checked={trade.checklistRisk} />
          <CheckItem label="SL placed beyond structure" checked={trade.checklistSlStructure} />
          <CheckItem label="Economic calendar checked" checked={trade.checklistCalendar} />
        </Section>

        {(trade.moodTags.length > 0 || trade.planAdherence || trade.didWell || trade.toImprove) ? (
          <Section title="Psychology">
            {trade.moodTags.length > 0 && (
              <View style={[styles.detailRow, { alignItems: "flex-start" }]}>
                <Text style={styles.detailLabel}>Mood</Text>
                <View style={styles.tagWrap}>
                  {trade.moodTags.map((m) => {
                    const isNeg = ["Rushed", "FOMO", "Fearful", "Stressed"].includes(m);
                    return (
                      <View
                        key={m}
                        style={[styles.confTag, { backgroundColor: isNeg ? Colors.redMuted : Colors.greenMuted }]}
                      >
                        <Text style={[styles.confTagText, { color: isNeg ? Colors.red : Colors.green }]}>{m}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            {trade.planAdherence != null && trade.planAdherence > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan Adherence</Text>
                <Stars value={trade.planAdherence} />
              </View>
            )}
            {trade.didWell && (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>What I did well</Text>
                <Text style={styles.noteText}>{trade.didWell}</Text>
              </View>
            )}
            {trade.toImprove && (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>What to improve</Text>
                <Text style={styles.noteText}>{trade.toImprove}</Text>
              </View>
            )}
          </Section>
        ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  asset: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.blueDim,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
  },
  aiText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.blue,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.redMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  heroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dateRow: {
    marginBottom: 16,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  pnlCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 20,
  },
  pnlItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  pnlValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    fontVariant: ["tabular-nums"],
  },
  pnlLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
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
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
  },
  confTag: {
    backgroundColor: Colors.blueMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.blue,
  },
  narrativeBox: {
    backgroundColor: Colors.blueDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
    padding: 14,
    marginTop: 8,
  },
  narrativeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.surface2,
  },
  checkRowActive: {
    backgroundColor: Colors.greenMuted,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  noteBox: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    gap: 6,
  },
  noteLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
});
