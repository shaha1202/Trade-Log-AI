import { Feather } from "@expo/vector-icons";
import { useCreateTrade } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useSettings } from "@/hooks/useSettings";

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const SESSIONS = ["Asian", "London", "New York", "London+NY"];
const MOODS = [
  "Confident",
  "Patient",
  "Calm",
  "Rushed",
  "FOMO",
  "Fearful",
  "Stressed",
  "Excited",
];

type FormState = {
  asset: string;
  timeframe: string;
  session: string;
  direction: "long" | "short";
  entry: string;
  stopLoss: string;
  takeProfit: string;
  lotSize: string;
  riskPct: string;
  pnl: string;
  holdDuration: string;
  result: "win" | "loss" | "breakeven" | "";
  htfTrend: string;
  confluences: string[];
  aiNarrative: string;
  checklistDirectionAligned: boolean;
  checklistMinConfluences: boolean;
  checklistRr: boolean;
  checklistRisk: boolean;
  checklistSlStructure: boolean;
  checklistCalendar: boolean;
  moodTags: string[];
  planAdherence: number;
  didWell: string;
  toImprove: string;
  screenshotUrl: string;
  aiAnalyzed: boolean;
};

const defaultForm: FormState = {
  asset: "",
  timeframe: "H1",
  session: "",
  direction: "long",
  entry: "",
  stopLoss: "",
  takeProfit: "",
  lotSize: "",
  riskPct: "",
  pnl: "",
  holdDuration: "",
  result: "",
  htfTrend: "",
  confluences: [],
  aiNarrative: "",
  checklistDirectionAligned: false,
  checklistMinConfluences: false,
  checklistRr: false,
  checklistRisk: false,
  checklistSlStructure: false,
  checklistCalendar: false,
  moodTags: [],
  planAdherence: 0,
  didWell: "",
  toImprove: "",
  screenshotUrl: "",
  aiAnalyzed: false,
};

function calcRR(entry: string, sl: string, tp: string): string {
  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const t = parseFloat(tp);
  if (isNaN(e) || isNaN(s) || isNaN(t) || e === s) return "";
  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  return (reward / risk).toFixed(2);
}

function ScanAnimation() {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={scan.container}>
      <Animated.View style={[scan.line, animStyle]} />
      <Text style={scan.text}>Analyzing chart...</Text>
    </View>
  );
}

const scan = StyleSheet.create({
  container: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  line: {
    width: "80%",
    height: 2,
    backgroundColor: Colors.teal,
    borderRadius: 2,
    shadowColor: Colors.teal,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.teal,
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, aiFilled, children }: { label: string; aiFilled?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <Text style={styles.fieldLabelText}>{label}</Text>
        {aiFilled && (
          <View style={styles.aiChip}>
            <Feather name="cpu" size={9} color={Colors.teal} />
            <Text style={styles.aiChipText}>AI</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  numeric,
  aiFilled,
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  numeric?: boolean;
  aiFilled?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? ""}
      placeholderTextColor={Colors.textMuted}
      keyboardType={numeric ? "decimal-pad" : "default"}
      style={[
        styles.input,
        aiFilled && styles.inputAI,
        multiline && { height: 80, textAlignVertical: "top" },
      ]}
      multiline={multiline}
    />
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => { onChange(star); Haptics.selectionAsync(); }}>
          <Feather
            name={star <= value ? "star" : "star"}
            size={28}
            color={star <= value ? Colors.amber : Colors.textMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

function ChecklistRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      style={[styles.checkRow, value && styles.checkRowActive]}
      onPress={() => { onChange(!value); Haptics.selectionAsync(); }}
    >
      <View style={[styles.checkbox, value && styles.checkboxActive]}>
        {value && <Feather name="check" size={12} color={Colors.bg} />}
      </View>
      <Text style={[styles.checkLabel, value && { color: Colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function TagChip({
  label,
  selected,
  onPress,
  color,
  bg,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable
      style={[
        styles.chip,
        selected && {
          backgroundColor: bg ?? Colors.purpleMuted,
          borderColor: color ?? Colors.purple,
        },
      ]}
      onPress={() => { onPress(); Haptics.selectionAsync(); }}
    >
      <Text style={[styles.chipText, selected && { color: color ?? Colors.purple }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function AddTradeScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const { mutateAsync: createTrade, isPending } = useCreateTrade();
  const { confluenceTags: CONFLUENCES } = useSettings();

  const update = (key: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const rr = calcRR(form.entry, form.stopLoss, form.takeProfit);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to upload charts.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      await analyzeImage(asset.base64!, asset.mimeType ?? "image/jpeg");
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take chart photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      await analyzeImage(asset.base64!, asset.mimeType ?? "image/jpeg");
    }
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    setScanning(true);
    try {
      const mediaType =
        mimeType === "image/png"
          ? "image/png"
          : mimeType === "image/gif"
          ? "image/gif"
          : mimeType === "image/webp"
          ? "image/webp"
          : "image/jpeg";

      const resp = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/trades/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      if (!resp.ok) {
        Alert.alert("Analysis failed", "Could not analyze the chart. Please fill in the details manually.");
        return;
      }

      const analysis = await resp.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setForm((prev) => ({
        ...prev,
        asset: analysis.asset ?? prev.asset,
        timeframe: analysis.timeframe ?? prev.timeframe,
        session: analysis.session ?? prev.session,
        direction: (analysis.direction as "long" | "short") ?? prev.direction,
        entry: analysis.entry != null ? String(analysis.entry) : prev.entry,
        stopLoss: analysis.stopLoss != null ? String(analysis.stopLoss) : prev.stopLoss,
        takeProfit: analysis.takeProfit != null ? String(analysis.takeProfit) : prev.takeProfit,
        htfTrend: analysis.htfTrend ?? prev.htfTrend,
        aiNarrative: analysis.narrative ?? prev.aiNarrative,
        aiAnalyzed: true,
      }));
    } catch (err) {
      Alert.alert("Error", "Failed to analyze chart. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!form.asset.trim()) {
      Alert.alert("Required", "Please enter the asset/pair.");
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await createTrade({
        data: {
          asset: form.asset.trim().toUpperCase(),
          timeframe: form.timeframe,
          session: form.session || null,
          direction: form.direction,
          entry: form.entry ? parseFloat(form.entry) : null,
          stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
          takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
          rr: rr ? parseFloat(rr) : null,
          lotSize: form.lotSize ? parseFloat(form.lotSize) : null,
          riskPct: form.riskPct ? parseFloat(form.riskPct) : null,
          pnl: form.pnl ? parseFloat(form.pnl) : null,
          holdDuration: form.holdDuration || null,
          result: form.result || null,
          htfTrend: form.htfTrend || null,
          confluences: form.confluences,
          aiNarrative: form.aiNarrative || null,
          checklistDirectionAligned: form.checklistDirectionAligned,
          checklistMinConfluences: form.checklistMinConfluences,
          checklistRr: form.checklistRr,
          checklistRisk: form.checklistRisk,
          checklistSlStructure: form.checklistSlStructure,
          checklistCalendar: form.checklistCalendar,
          moodTags: form.moodTags,
          planAdherence: form.planAdherence || null,
          didWell: form.didWell || null,
          toImprove: form.toImprove || null,
          screenshotUrl: form.screenshotUrl || null,
          aiAnalyzed: form.aiAnalyzed,
        },
      });
      setForm(defaultForm);
      setImageUri(null);
      router.replace("/(tabs)/");
    } catch (err) {
      Alert.alert("Error", "Failed to save trade. Please try again.");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 100;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>New Trade</Text>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: isPending || pressed ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isPending}
        >
          <Text style={styles.saveBtnText}>{isPending ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="AI Chart Scan">
          <View style={styles.scanButtons}>
            <Pressable
              style={({ pressed }) => [styles.scanBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handlePickImage}
              disabled={scanning}
            >
              <Feather name="image" size={18} color={Colors.teal} />
              <Text style={styles.scanBtnText}>Gallery</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.scanBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleCamera}
              disabled={scanning}
            >
              <Feather name="camera" size={18} color={Colors.teal} />
              <Text style={styles.scanBtnText}>Camera</Text>
            </Pressable>
          </View>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.chartPreview} resizeMode="cover" />
          )}

          {scanning && <ScanAnimation />}
        </Section>

        <Section title="Trade Info">
          <Field label="Asset / Pair" aiFilled={form.aiAnalyzed && !!form.asset}>
            <Input
              value={form.asset}
              onChangeText={(v) => update("asset", v)}
              placeholder="XAUUSD, EURUSD..."
              aiFilled={form.aiAnalyzed && !!form.asset}
            />
          </Field>

          <Field label="Timeframe" aiFilled={form.aiAnalyzed}>
            <View style={styles.chipRow}>
              {TIMEFRAMES.map((tf) => (
                <TagChip
                  key={tf}
                  label={tf}
                  selected={form.timeframe === tf}
                  onPress={() => update("timeframe", tf)}
                  color={Colors.teal}
                  bg={Colors.tealMuted}
                />
              ))}
            </View>
          </Field>

          <Field label="Session" aiFilled={form.aiAnalyzed && !!form.session}>
            <View style={styles.chipRow}>
              {SESSIONS.map((s) => (
                <TagChip
                  key={s}
                  label={s}
                  selected={form.session === s}
                  onPress={() => update("session", form.session === s ? "" : s)}
                  color={Colors.teal}
                  bg={Colors.tealMuted}
                />
              ))}
            </View>
          </Field>

          <Field label="Direction" aiFilled={form.aiAnalyzed}>
            <View style={styles.toggle}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  form.direction === "long" && {
                    backgroundColor: Colors.greenMuted,
                    borderColor: Colors.green,
                  },
                ]}
                onPress={() => { update("direction", "long"); Haptics.selectionAsync(); }}
              >
                <Feather name="arrow-up" size={14} color={form.direction === "long" ? Colors.green : Colors.textMuted} />
                <Text
                  style={[
                    styles.toggleText,
                    form.direction === "long" && { color: Colors.green },
                  ]}
                >
                  LONG
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  form.direction === "short" && {
                    backgroundColor: Colors.redMuted,
                    borderColor: Colors.red,
                  },
                ]}
                onPress={() => { update("direction", "short"); Haptics.selectionAsync(); }}
              >
                <Feather name="arrow-down" size={14} color={form.direction === "short" ? Colors.red : Colors.textMuted} />
                <Text
                  style={[
                    styles.toggleText,
                    form.direction === "short" && { color: Colors.red },
                  ]}
                >
                  SHORT
                </Text>
              </Pressable>
            </View>
          </Field>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Field label="Entry" aiFilled={form.aiAnalyzed && !!form.entry}>
                <Input
                  value={form.entry}
                  onChangeText={(v) => update("entry", v)}
                  placeholder="0.00"
                  numeric
                  aiFilled={form.aiAnalyzed && !!form.entry}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Stop Loss" aiFilled={form.aiAnalyzed && !!form.stopLoss}>
                <Input
                  value={form.stopLoss}
                  onChangeText={(v) => update("stopLoss", v)}
                  placeholder="0.00"
                  numeric
                  aiFilled={form.aiAnalyzed && !!form.stopLoss}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Take Profit" aiFilled={form.aiAnalyzed && !!form.takeProfit}>
                <Input
                  value={form.takeProfit}
                  onChangeText={(v) => update("takeProfit", v)}
                  placeholder="0.00"
                  numeric
                  aiFilled={form.aiAnalyzed && !!form.takeProfit}
                />
              </Field>
            </View>
          </View>

          {rr !== "" && (
            <View style={styles.rrBadge}>
              <Text style={styles.rrLabel}>R:R Ratio</Text>
              <Text style={styles.rrValue}>{rr}R</Text>
            </View>
          )}
        </Section>

        <Section title="Risk & Result">
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Field label="Lot Size">
                <Input
                  value={form.lotSize}
                  onChangeText={(v) => update("lotSize", v)}
                  placeholder="0.01"
                  numeric
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Risk %">
                <Input
                  value={form.riskPct}
                  onChangeText={(v) => update("riskPct", v)}
                  placeholder="1.0"
                  numeric
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="P&L ($)">
                <Input
                  value={form.pnl}
                  onChangeText={(v) => update("pnl", v)}
                  placeholder="±0.00"
                  numeric
                />
              </Field>
            </View>
          </View>

          <Field label="Hold Duration">
            <Input
              value={form.holdDuration}
              onChangeText={(v) => update("holdDuration", v)}
              placeholder="e.g. 2h 30m"
            />
          </Field>

          <Field label="Result">
            <View style={styles.resultRow}>
              {(["win", "loss", "breakeven"] as const).map((r) => {
                const c = r === "win" ? Colors.green : r === "loss" ? Colors.red : Colors.amber;
                const bg = r === "win" ? Colors.greenMuted : r === "loss" ? Colors.redMuted : Colors.amberMuted;
                return (
                  <Pressable
                    key={r}
                    style={[
                      styles.resultBtn,
                      form.result === r && { backgroundColor: bg, borderColor: c },
                    ]}
                    onPress={() => { update("result", form.result === r ? "" : r); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.resultText, form.result === r && { color: c }]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        </Section>

        <Section title="AI Analysis">
          <Field label="HTF Trend" aiFilled={form.aiAnalyzed && !!form.htfTrend}>
            <View style={styles.toggle}>
              {["Bullish", "Bearish", "Neutral"].map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.toggleBtn,
                    form.htfTrend === t && {
                      backgroundColor:
                        t === "Bullish" ? Colors.greenMuted : t === "Bearish" ? Colors.redMuted : Colors.surface3,
                      borderColor: t === "Bullish" ? Colors.green : t === "Bearish" ? Colors.red : Colors.textMuted,
                    },
                  ]}
                  onPress={() => { update("htfTrend", form.htfTrend === t ? "" : t); Haptics.selectionAsync(); }}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      form.htfTrend === t && {
                        color: t === "Bullish" ? Colors.green : t === "Bearish" ? Colors.red : Colors.textSecondary,
                      },
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="Confluences">
            <View style={styles.chipRow}>
              {CONFLUENCES.map((c) => (
                <TagChip
                  key={c}
                  label={c}
                  selected={form.confluences.includes(c)}
                  onPress={() => {
                    const next = form.confluences.includes(c)
                      ? form.confluences.filter((x) => x !== c)
                      : [...form.confluences, c];
                    update("confluences", next);
                  }}
                />
              ))}
            </View>
          </Field>

          {form.aiNarrative ? (
            <Field label="AI Narrative" aiFilled={form.aiAnalyzed}>
              <View style={styles.narrativeBox}>
                <Text style={styles.narrativeText}>{form.aiNarrative}</Text>
              </View>
            </Field>
          ) : null}
        </Section>

        <Section title="Pre-trade Checklist">
          {[
            { key: "checklistDirectionAligned", label: "Direction aligns with HTF trend" },
            { key: "checklistMinConfluences", label: "Minimum 2 confluences present" },
            { key: "checklistRr", label: "R:R is at least 1:2" },
            { key: "checklistRisk", label: "Risk does not exceed 1–2%" },
            { key: "checklistSlStructure", label: "SL placed beyond structure" },
            { key: "checklistCalendar", label: "Economic calendar checked" },
          ].map(({ key, label }) => (
            <ChecklistRow
              key={key}
              label={label}
              value={form[key as keyof FormState] as boolean}
              onChange={(v) => update(key as keyof FormState, v)}
            />
          ))}
        </Section>

        <Section title="Psychology">
          <Field label="Pre-trade Mood">
            <View style={styles.chipRow}>
              {MOODS.map((m) => {
                const isNeg = ["Rushed", "FOMO", "Fearful", "Stressed"].includes(m);
                return (
                  <TagChip
                    key={m}
                    label={m}
                    selected={form.moodTags.includes(m)}
                    onPress={() => {
                      const next = form.moodTags.includes(m)
                        ? form.moodTags.filter((x) => x !== m)
                        : [...form.moodTags, m];
                      update("moodTags", next);
                    }}
                    color={isNeg ? Colors.red : Colors.green}
                    bg={isNeg ? Colors.redMuted : Colors.greenMuted}
                  />
                );
              })}
            </View>
          </Field>

          <Field label="Plan Adherence">
            <StarRating
              value={form.planAdherence}
              onChange={(v) => update("planAdherence", v)}
            />
          </Field>

          <Field label="What I did well">
            <Input
              value={form.didWell}
              onChangeText={(v) => update("didWell", v)}
              placeholder="Waited for confirmation..."
              multiline
            />
          </Field>

          <Field label="What to improve">
            <Input
              value={form.toImprove}
              onChangeText={(v) => update("toImprove", v)}
              placeholder="Enter earlier on next retrace..."
              multiline
            />
          </Field>
        </Section>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingLeft: 4,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  fieldLabelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.tealDim,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  aiChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.teal,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontVariant: ["tabular-nums"],
  },
  inputAI: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealDim,
  },
  priceRow: {
    flexDirection: "row",
    gap: 10,
  },
  rrBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.tealDim,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.teal,
    marginTop: 4,
  },
  rrLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.teal,
  },
  rrValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.teal,
    fontVariant: ["tabular-nums"],
  },
  toggle: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: "row",
    gap: 8,
  },
  resultBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  narrativeBox: {
    backgroundColor: Colors.tealDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.teal,
    padding: 14,
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkRowActive: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  scanButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.tealDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.teal,
    paddingVertical: 16,
  },
  scanBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.teal,
  },
  chartPreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
