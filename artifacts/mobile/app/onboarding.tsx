import { Feather } from "@expo/vector-icons";
import { useCreateTrade } from "@workspace/api-client-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { ONBOARDING_KEY } from "@/constants/storage";

const SCREEN_W = Dimensions.get("window").width;

type AnalysisResult = {
  asset?: string;
  timeframe?: string;
  session?: string;
  direction?: string;
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  htfTrend?: string;
  narrative?: string;
};

type Step = "upload" | "analyzing" | "result" | "error";

function PulsingRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  React.useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.35, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.15, { duration: 1000, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRingOuter, ringStyle]} />
      <View style={styles.pulseRingInner}>
        <Feather name="cpu" size={32} color={Colors.blue} />
      </View>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, isEmpty && { color: Colors.textMuted }]}>
        {value}
      </Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("upload");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { mutateAsync: createTrade, isPending } = useCreateTrade();

  const topPad = insets.top + 8;
  const bottomPad = insets.bottom + 24;

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)/");
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to upload charts."
      );
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

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow camera access to take chart photos."
      );
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
    setStep("analyzing");
    try {
      const mediaType =
        mimeType === "image/png"
          ? "image/png"
          : mimeType === "image/gif"
          ? "image/gif"
          : mimeType === "image/webp"
          ? "image/webp"
          : "image/jpeg";

      const resp = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/trades/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        setAnalysis(data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep("result");
      } else {
        setStep("error");
      }
    } catch {
      setStep("error");
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    try {
      await createTrade({
        data: {
          asset: (analysis.asset ?? "UNKNOWN").trim().toUpperCase(),
          timeframe: analysis.timeframe ?? "H1",
          session: analysis.session ?? null,
          direction: (analysis.direction as "long" | "short") ?? "long",
          entry: analysis.entry ?? null,
          stopLoss: analysis.stopLoss ?? null,
          takeProfit: analysis.takeProfit ?? null,
          rr: null,
          lotSize: null,
          riskPct: null,
          pnl: null,
          holdDuration: null,
          result: null,
          htfTrend: analysis.htfTrend ?? null,
          confluences: [],
          aiNarrative: analysis.narrative ?? null,
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
          aiAnalyzed: true,
        },
      });
      await AsyncStorage.setItem(ONBOARDING_KEY, "1");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch {
      Alert.alert("Error", "Failed to save trade. Please try again.");
    }
  };

  if (step === "upload") {
    return (
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <View style={styles.topBar}>
          <View style={{ width: 48 }} />
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.uploadBody}>
          <View style={styles.uploadIconWrap}>
            <Text style={styles.uploadEmoji}>📈</Text>
          </View>
          <Text style={styles.uploadTitle}>Upload your first trade</Text>
          <Text style={styles.uploadHint}>
            We'll analyze your chart automatically
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.bigUploadBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={pickFromLibrary}
          >
            <View style={styles.bigUploadCircle}>
              <Feather name="camera" size={36} color={Colors.bg} />
            </View>
            <Text style={styles.bigUploadLabel}>Upload Chart</Text>
            <Text style={styles.bigUploadSub}>
              Photo library or camera
            </Text>
          </Pressable>

          <Pressable
            onPress={pickFromCamera}
            style={({ pressed }) => [
              styles.cameraAltBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="aperture" size={16} color={Colors.blue} />
            <Text style={styles.cameraAltText}>Use camera instead</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "analyzing") {
    return (
      <View style={[styles.screen, styles.analyzeScreen, { paddingTop: topPad }]}>
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.analyzeThumb}
            resizeMode="cover"
          />
        )}
        <PulsingRing />
        <Text style={styles.analyzeTitle}>Analyzing your trade...</Text>
        <Text style={styles.analyzeSub}>Extracting setup and insights</Text>
      </View>
    );
  }

  if (step === "result" && analysis) {
    const directionDisplay = analysis.direction
      ? analysis.direction.toUpperCase()
      : "—";

    return (
      <ScrollView
        style={[styles.screen, { paddingTop: topPad }]}
        contentContainerStyle={[styles.resultScroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => setStep("upload")} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.successBadge}>
          <Feather name="check-circle" size={16} color={Colors.green} />
          <Text style={styles.successBadgeText}>AI analysis complete</Text>
        </View>

        <Text style={styles.resultHeadline}>
          You just created your first{"\n"}AI-powered journal entry.
        </Text>

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.resultImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.resultCard}>
          <View style={styles.resultCardHeader}>
            <View style={styles.aiChipLarge}>
              <Feather name="cpu" size={11} color={Colors.blue} />
              <Text style={styles.aiChipLargeText}>AI Extracted</Text>
            </View>
          </View>

          <DataRow label="Asset" value={analysis.asset ?? "—"} />
          <DataRow label="Direction" value={directionDisplay} />
          <DataRow label="Timeframe" value={analysis.timeframe ?? "—"} />
          <DataRow label="Session" value={analysis.session ?? "—"} />
          <DataRow
            label="Entry"
            value={analysis.entry != null ? String(analysis.entry) : "—"}
          />
          <DataRow
            label="Stop Loss"
            value={analysis.stopLoss != null ? String(analysis.stopLoss) : "—"}
          />
          <DataRow
            label="Take Profit"
            value={
              analysis.takeProfit != null ? String(analysis.takeProfit) : "—"
            }
          />
          {analysis.htfTrend ? (
            <DataRow label="HTF Trend" value={analysis.htfTrend} />
          ) : null}
        </View>

        {analysis.narrative ? (
          <View style={styles.narrativeCard}>
            <View style={styles.narrativeHeader}>
              <Feather name="cpu" size={11} color={Colors.blue} />
              <Text style={styles.narrativeTitle}>AI Narrative</Text>
            </View>
            <Text style={styles.narrativeText}>{analysis.narrative}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: isPending || pressed ? 0.85 : 1 },
          ]}
          onPress={handleSave}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color={Colors.bg} />
              <Text style={styles.saveBtnText}>Save Trade</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipTradeBtn}>
          <Text style={styles.skipTradeBtnText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (step === "error") {
    return (
      <View style={[styles.screen, styles.analyzeScreen, { paddingTop: topPad }]}>
        <View style={styles.errorIconWrap}>
          <Feather name="alert-circle" size={48} color={Colors.red} />
        </View>
        <Text style={styles.errorTitle}>Analysis failed</Text>
        <Text style={styles.errorSub}>
          We couldn't read the chart. Make sure it's a clear trading chart screenshot.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => setStep("upload")}
        >
          <Feather name="refresh-cw" size={16} color={Colors.blue} />
          <Text style={styles.retryBtnText}>Try another chart</Text>
        </Pressable>
        <Pressable onPress={handleSkip} style={styles.skipTradeBtn}>
          <Text style={styles.skipTradeBtnText}>Skip for now</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 48,
    gap: 0,
  },
  uploadIconWrap: {
    marginBottom: 20,
  },
  uploadEmoji: {
    fontSize: 52,
  },
  uploadTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  uploadHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 44,
  },
  bigUploadBtn: {
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  bigUploadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.blue,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bigUploadLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  bigUploadSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  cameraAltBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  cameraAltText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.blue,
  },
  analyzeScreen: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  analyzeThumb: {
    width: SCREEN_W - 64,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 40,
  },
  pulseWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  pulseRingOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.blue,
  },
  pulseRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.blueDim,
    borderWidth: 2,
    borderColor: Colors.borderBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  analyzeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  resultScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.greenMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  successBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.green,
  },
  resultHeadline: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    lineHeight: 30,
    marginBottom: 4,
  },
  resultImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderBlue,
    overflow: "hidden",
  },
  resultCardHeader: {
    backgroundColor: Colors.blueDim,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderBlue,
  },
  aiChipLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  aiChipLargeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.blue,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dataLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dataValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  narrativeCard: {
    backgroundColor: Colors.blueDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
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
    fontSize: 11,
    color: Colors.blue,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  narrativeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.blue,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.bg,
  },
  skipTradeBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipTradeBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  errorIconWrap: {
    marginBottom: 20,
  },
  errorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  errorSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 22,
    marginBottom: 32,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 8,
  },
  retryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.blue,
  },
});
