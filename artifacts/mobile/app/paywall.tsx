import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

type Plan = "monthly" | "quarterly" | "yearly";

const PLANS: {
  id: Plan;
  label: string;
  price: string;
  period: string;
  perMonth: string;
  badge?: string;
}[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$9.99",
    period: "per month",
    perMonth: "$9.99 / mo",
  },
  {
    id: "quarterly",
    label: "Quarterly",
    price: "$24.99",
    period: "every 3 months",
    perMonth: "$8.33 / mo",
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$69",
    period: "per year",
    perMonth: "$5.75 / mo",
    badge: "Best Value",
  },
];

const BENEFITS: { icon: string; title: string; desc: string }[] = [
  {
    icon: "cpu",
    title: "Advanced AI feedback on every trade",
    desc: "Claude Vision analyzes every chart you upload with deep pattern recognition.",
  },
  {
    icon: "bar-chart-2",
    title: "Performance analytics",
    desc: "Discover your best setups, sessions, and timeframes automatically.",
  },
  {
    icon: "trending-up",
    title: "Pattern detection",
    desc: "See exactly what works and what doesn't across all your trades.",
  },
  {
    icon: "book-open",
    title: "Unlimited trade journaling",
    desc: "Log as many trades as you want with no restrictions.",
  },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");

  const topPad = insets.top + 8;
  const bottomPad = insets.bottom + 16;

  const handleUpgrade = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Coming Soon",
      "Premium subscriptions are launching soon. We'll notify you the moment it's available!",
      [{ text: "Got it", style: "default" }]
    );
  };

  const handleMaybeLater = () => {
    router.replace("/(tabs)/");
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: topPad }]}
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Pressable onPress={handleMaybeLater} style={styles.backBtn}>
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.crownWrap}>
          <View style={styles.crownCircle}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Unlock Advanced{"\n"}Trading Insights</Text>
        <Text style={styles.heroSubtitle}>
          You've reached your free limit. Upgrade to continue improving your trading.
        </Text>
      </View>

      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>Everything in Premium</Text>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={styles.benefitRow}>
            <View style={styles.benefitIconWrap}>
              <Feather name={b.icon as never} size={16} color={Colors.teal} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitDesc}>{b.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.plansLabel}>Choose your plan</Text>

      <View style={styles.plansGroup}>
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isYearly = plan.id === "yearly";
          return (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                isYearly && styles.planCardYearly,
              ]}
              onPress={() => {
                setSelectedPlan(plan.id);
                Haptics.selectionAsync();
              }}
            >
              {plan.badge && (
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planLeft}>
                <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                  {isSelected && <View style={styles.planRadioDot} />}
                </View>
                <View>
                  <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                    {plan.label}
                  </Text>
                  <Text style={styles.planPeriodText}>{plan.period}</Text>
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                  {plan.price}
                </Text>
                <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.upgradeBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handleUpgrade}
      >
        <Feather name="zap" size={18} color={Colors.bg} />
        <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
      </Pressable>

      <Pressable onPress={handleMaybeLater} style={styles.maybeLaterBtn}>
        <Text style={styles.maybeLaterText}>Maybe later</Text>
      </Pressable>

      <Text style={styles.legalText}>
        Cancel anytime. No commitment required.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  crownWrap: {
    marginBottom: 4,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.amberMuted,
    borderWidth: 1.5,
    borderColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  crownEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 34,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  benefitsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.teal,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.tealDim,
    borderWidth: 1,
    borderColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  benefitDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  plansLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  plansGroup: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  planCardSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealDim,
  },
  planCardYearly: {
    borderColor: Colors.amber,
    backgroundColor: Colors.amberMuted,
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: Colors.amber,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: {
    borderColor: Colors.teal,
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.teal,
  },
  planLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  planLabelSelected: {
    color: Colors.teal,
  },
  planPeriodText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  planRight: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  planPriceSelected: {
    color: Colors.teal,
  },
  planPerMonth: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.teal,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Colors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  upgradeBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.bg,
  },
  maybeLaterBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  maybeLaterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  legalText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    paddingBottom: 8,
  },
});
