import { Feather } from "@expo/vector-icons";
import { useCreateTrade } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";

const SCREEN_W = Dimensions.get("window").width;
const ONBOARDING_KEY = "tradelog_onboarding_done";

type AnalysisResult = {
  asset?: string;
  timeframe?: string;
  direction?: string;
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  htfTrend?: string;
  narrative?: string;
};

type Step = "welcome" | "upload" | "analyzing" | "preview" | "manual";

function ScanAnimation() {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(80, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
  }, [translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.scanWrap}>
      <View style={styles.scanBox}>
        <Animated.View style={[styles.scanLine, animStyle]} />
        <View style={styles.scanCornerTL} />
        <View style={styles.scanCornerTR} />
        <View style={styles.scanCornerBL} />
        <View style={styles.scanCornerBR} />
      </View>
      <Text style={styles.scanLabel}>Analyzing chart with AI...</Text>
      <Text style={styles.scanSub}>Claude Vision is reading your trade setup</Text>
    </View>
  );
}

function DataRow({ label, value, isAI }: { label: string; value: string; isAI?: boolean }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <View style={styles.dataRight}>
        {isAI && (
          <View style={styles.aiChip}>
            <Feather name="cpu" size={8} color={Colors.teal} />
            <Text style={styles.aiChipText}>AI</Text>
          </View>
        )}
        <Text style={[styles.dataValue, value === "—" && { color: Colors.textMuted }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("welcome");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [asset, setAsset] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [result, setResult] = useState<"win" | "loss" | "breakeven" | "">("");
  const [pnl, setPnl] = useState("");
  const { mutateAsync: createTrade, isPending } = useCreateTrade();

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
    const r = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!r.canceled && r.assets[0]) {
      const asset = r.assets[0];
      setImageUri(asset.uri);
      await analyzeImage(asset.base64!, asset.mimeType ?? "image/jpeg");
    }
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    setStep("analyzing");
    try {
      const mediaType =
        mimeType === "image/png" ? "image/png"
        : mimeType === "image/gif" ? "image/gif"
        : mimeType === "image/webp" ? "image/webp"
        : "image/jpeg";

      const resp = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/trades/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setAnalysis(data);
        setAsset(data.asset ?? "");
        setDirection((data.direction as "long" | "short") ?? "long");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep("preview");
      } else {
        setAnalysis(null);
        setStep("manual");
      }
    } catch {
      setAnalysis(null);
      setStep("manual");
    }
  };

  const handleSave = async () => {
    const assetVal = (analysis?.asset ?? asset).trim().toUpperCase();
    if (!assetVal) {
      Alert.alert("Required", "Please enter the asset/pair.");
      return;
    }
    try {
      await createTrade({
        data: {
          asset: assetVal,
          timeframe: analysis?.timeframe ?? "H1",
          session: null,
          direction: (analysis?.direction as "long" | "short") ?? direction,
          entry: analysis?.entry ?? null,
          stopLoss: analysis?.stopLoss ?? null,
          takeProfit: analysis?.takeProfit ?? null,
          rr: null,
          lotSize: null,
          riskPct: null,
          pnl: pnl ? parseFloat(pnl) : null,
          holdDuration: null,
          result: result || null,
          htfTrend: analysis?.htfTrend ?? null,
          confluences: [],
          aiNarrative: analysis?.narrative ?? null,
          checklistDirectionAligned: false,
          checklistMinConfluences: false,
          checklistRr: false,
          checklistRisk: false,
          checklistSlStructure: false,
          checklistCalendar: false,
          moodTags: [],
          planAdherence: null,
          didWell: null,
          toImprove: null,
          screenshotUrl: null,
          aiAnalyzed: analysis != null,
        },
      });
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)/");
  };

  const topPad = insets.top + 16;

  if (step === "welcome") {
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <View style={styles.welcomeContent}>
          <View style={styles.welcomeIconWrap}>
            <Text style={styles.welcomeIcon}>📈</Text>
          </View>
          <Text style={styles.welcomeTitle}>Welcome to TradeLog</Text>
          <Text style={styles.welcomeSub}>
            The AI-powered trading journal that learns from your charts.
          </Text>
          <View style={styles.featureList}>
            {[
              { icon: "cpu", text: "AI reads your chart screenshots instantly" },
              { icon: "bar-chart-2", text: "Track every trade with detailed analytics" },
              { icon: "trending-up", text: "Spot patterns and improve your edge" },
            ].map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Feather name={f.icon as never} size={16} color={Colors.teal} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setStep("upload")}
          >
            <Feather name="camera" size={18} color={Colors.bg} />
            <Text style={styles.primaryBtnText}>Log Your First Trade</Text>
          </Pressable>
          <Pressable onPress={handleSkip} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>I'll set it up later</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "upload") {
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("welcome")} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.stepTitle}>Upload a Chart</Text>
          <Pressable onPress={handleSkip} style={styles.skipBtn2}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.uploadContent}>
          <View style={styles.uploadIllustration}>
            <Feather name="image" size={64} color={Colors.tealDim} />
            <Text style={styles.uploadTitle}>AI Chart Analysis</Text>
            <Text style={styles.uploadDesc}>
              Upload a screenshot of any trade chart and Claude AI will auto-fill the asset, direction, entries, and setup details.
            </Text>
          </View>
          <View style={styles.uploadBtns}>
            <Pressable
              style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handlePickImage}
            >
              <Feather name="image" size={28} color={Colors.teal} />
              <Text style={styles.uploadBtnLabel}>Photo Library</Text>
              <Text style={styles.uploadBtnSub}>Upload from gallery</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleCamera}
            >
              <Feather name="camera" size={28} color={Colors.teal} />
              <Text style={styles.uploadBtnLabel}>Camera</Text>
              <Text style={styles.uploadBtnSub}>Take a photo</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setStep("manual")} style={styles.manualLink}>
            <Text style={styles.manualLinkText}>Enter details manually instead →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "analyzing") {
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <Text style={styles.stepTitle2}>Reading Your Chart</Text>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.analyzeImage}
            resizeMode="cover"
          />
        )}
        <ScanAnimation />
        <Text style={styles.analyzeSub}>
          Claude Vision is identifying the asset, direction, entries, and market structure...
        </Text>
      </View>
    );
  }

  if (step === "preview") {
    const dir = (analysis?.direction ?? direction) as "long" | "short";
    const dirColor = dir === "long" ? Colors.green : Colors.red;
    const dirBg = dir === "long" ? Colors.greenMuted : Colors.redMuted;

    return (
      <ScrollView
        style={[styles.screen, { paddingTop: topPad }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("upload")} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.stepTitle}>AI Found This</Text>
          <View style={{ width: 56 }} />
        </View>
        <View style={styles.successBanner}>
          <Feather name="check-circle" size={18} color={Colors.green} />
          <Text style={styles.successText}>Chart analyzed successfully!</Text>
        </View>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Extracted Data</Text>
          <DataRow label="Asset" value={analysis?.asset ?? "—"} isAI />
          <DataRow label="Timeframe" value={analysis?.timeframe ?? "—"} isAI />
          <DataRow
            label="Direction"
            value={dir.toUpperCase()}
            isAI
          />
          <DataRow
            label="Entry"
            value={analysis?.entry != null ? String(analysis.entry) : "—"}
            isAI
          />
          <DataRow
            label="Stop Loss"
            value={analysis?.stopLoss != null ? String(analysis.stopLoss) : "—"}
            isAI
          />
          <DataRow
            label="Take Profit"
            value={analysis?.takeProfit != null ? String(analysis.takeProfit) : "—"}
            isAI
          />
          {analysis?.htfTrend ? (
            <DataRow label="HTF Trend" value={analysis.htfTrend} isAI />
          ) : null}
        </View>
        {analysis?.narrative ? (
          <View style={styles.narrativeCard}>
            <View style={styles.narrativeHeader}>
              <Feather name="cpu" size={12} color={Colors.teal} />
              <Text style={styles.narrativeTitle}>AI Narrative</Text>
            </View>
            <Text style={styles.narrativeText}>{analysis.narrative}</Text>
          </View>
        ) : null}
        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Add Trade Outcome</Text>
          <Text style={styles.completionSub}>Optional — you can update this later</Text>
          <View style={styles.resultRow}>
            {(["win", "loss", "breakeven"] as const).map((r) => {
              const color = r === "win" ? Colors.green : r === "loss" ? Colors.red : Colors.amber;
              const bg = r === "win" ? Colors.greenMuted : r === "loss" ? Colors.redMuted : Colors.amberMuted;
              return (
                <Pressable
                  key={r}
                  style={[
                    styles.resultChip,
                    result === r && { backgroundColor: bg, borderColor: color },
                  ]}
                  onPress={() => { setResult(result === r ? "" : r); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.resultChipText, result === r && { color }]}>
                    {r.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.pnlRow}>
            <Text style={styles.pnlLabel}>P&L</Text>
            <View style={styles.pnlInputWrap}>
              <Text style={styles.pnlCurrency}>$</Text>
              <TextInput
                value={pnl}
                onChangeText={setPnl}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                style={styles.pnlInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, styles.saveBtn2, { opacity: isPending || pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color={Colors.bg} />
              <Text style={styles.primaryBtnText}>Save & Open Journal</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  if (step === "manual") {
    return (
      <ScrollView
        style={[styles.screen, { paddingTop: topPad }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep("upload")} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.stepTitle}>Quick Log</Text>
          <Pressable onPress={handleSkip} style={styles.skipBtn2}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.manualCard}>
          <Text style={styles.manualCardTitle}>Log your first trade</Text>
          <Text style={styles.manualCardSub}>Start with the basics — add more detail later</Text>
          <View style={styles.manualField}>
            <Text style={styles.manualLabel}>Asset / Pair</Text>
            <TextInput
              value={asset}
              onChangeText={setAsset}
              placeholder="e.g. EUR/USD, BTC/USD..."
              placeholderTextColor={Colors.textMuted}
              style={styles.manualInput}
              autoCapitalize="characters"
              returnKeyType="done"
            />
          </View>
          <View style={styles.manualField}>
            <Text style={styles.manualLabel}>Direction</Text>
            <View style={styles.dirRow}>
              {(["long", "short"] as const).map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.dirChip,
                    direction === d && {
                      backgroundColor: d === "long" ? Colors.greenMuted : Colors.redMuted,
                      borderColor: d === "long" ? Colors.green : Colors.red,
                    },
                  ]}
                  onPress={() => { setDirection(d); Haptics.selectionAsync(); }}
                >
                  <Text style={[
                    styles.dirChipText,
                    direction === d && { color: d === "long" ? Colors.green : Colors.red },
                  ]}>
                    {d.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.manualField}>
            <Text style={styles.manualLabel}>Result</Text>
            <View style={styles.resultRow}>
              {(["win", "loss", "breakeven"] as const).map((r) => {
                const color = r === "win" ? Colors.green : r === "loss" ? Colors.red : Colors.amber;
                const bg = r === "win" ? Colors.greenMuted : r === "loss" ? Colors.redMuted : Colors.amberMuted;
                return (
                  <Pressable
                    key={r}
                    style={[
                      styles.resultChip,
                      result === r && { backgroundColor: bg, borderColor: color },
                    ]}
                    onPress={() => { setResult(result === r ? "" : r); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.resultChipText, result === r && { color }]}>
                      {r.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.pnlRow}>
            <Text style={styles.pnlLabel}>P&L</Text>
            <View style={styles.pnlInputWrap}>
              <Text style={styles.pnlCurrency}>$</Text>
              <TextInput
                value={pnl}
                onChangeText={setPnl}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                style={styles.pnlInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, styles.saveBtn2, { opacity: isPending || pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color={Colors.bg} />
              <Text style={styles.primaryBtnText}>Save & Open Journal</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  skipBtn: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  welcomeIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.tealDim,
    borderWidth: 1,
    borderColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  welcomeIcon: {
    fontSize: 44,
  },
  welcomeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  featureList: {
    width: "100%",
    gap: 14,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.tealDim,
    borderWidth: 1,
    borderColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.bg,
  },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  ghostBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  stepTitle2: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  skipBtn2: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  uploadContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  uploadIllustration: {
    alignItems: "center",
    marginBottom: 32,
  },
  uploadTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  uploadDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  uploadBtns: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    marginBottom: 24,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.teal,
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  uploadBtnLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.teal,
  },
  uploadBtnSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
  },
  manualLink: {
    paddingVertical: 12,
  },
  manualLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  scanWrap: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 16,
    gap: 16,
  },
  scanBox: {
    width: SCREEN_W - 64,
    height: 100,
    borderWidth: 1.5,
    borderColor: Colors.teal,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.teal,
    shadowColor: Colors.teal,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  scanCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.teal,
    borderRadius: 2,
  },
  scanCornerTR: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 16,
    height: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.teal,
    borderRadius: 2,
  },
  scanCornerBL: {
    position: "absolute",
    bottom: -1,
    left: -1,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.teal,
    borderRadius: 2,
  },
  scanCornerBR: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.teal,
    borderRadius: 2,
  },
  scanLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.teal,
    textAlign: "center",
  },
  scanSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  analyzeImage: {
    width: SCREEN_W - 48,
    height: 180,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analyzeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: 16,
    lineHeight: 20,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.greenMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  successText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.green,
  },
  previewImage: {
    width: SCREEN_W - 32,
    height: 160,
    borderRadius: 16,
    alignSelf: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    gap: 4,
  },
  resultsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  dataLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dataRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.tealMuted,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.teal,
  },
  aiChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: Colors.teal,
    letterSpacing: 0.5,
  },
  narrativeCard: {
    backgroundColor: Colors.tealDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.teal,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    gap: 8,
  },
  narrativeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  narrativeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.teal,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  narrativeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  completionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    gap: 12,
  },
  completionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  completionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -8,
  },
  resultRow: {
    flexDirection: "row",
    gap: 8,
  },
  resultChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  resultChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  pnlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pnlLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  pnlInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 120,
  },
  pnlCurrency: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.teal,
    marginRight: 4,
  },
  pnlInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    minWidth: 80,
    fontVariant: ["tabular-nums"],
  },
  saveBtn2: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  manualCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    gap: 16,
  },
  manualCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  manualCardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -10,
  },
  manualField: {
    gap: 8,
  },
  manualLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  manualInput: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  dirRow: {
    flexDirection: "row",
    gap: 10,
  },
  dirChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  dirChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
});
