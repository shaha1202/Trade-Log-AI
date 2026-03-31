import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useSettings } from "@/hooks/useSettings";

function avatarLetters(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profileName,
    checklistItems,
    confluenceTags,
    dailyReminderEnabled,
    weeklySummaryEnabled,
    dailyGoalPnl,
    updateProfileName,
    updateChecklistItems,
    updateConfluenceTags,
    updateDailyReminder,
    updateWeeklySummary,
    updateDailyGoalPnl,
  } = useSettings();

  const [nameInput, setNameInput] = useState(profileName);
  const [goalInput, setGoalInput] = useState(dailyGoalPnl > 0 ? String(dailyGoalPnl) : "");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newTag, setNewTag] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [goalFocused, setGoalFocused] = useState(false);
  const [checklistFocused, setChecklistFocused] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);

  React.useEffect(() => {
    setNameInput(profileName);
  }, [profileName]);

  React.useEffect(() => {
    setGoalInput(dailyGoalPnl > 0 ? String(dailyGoalPnl) : "");
  }, [dailyGoalPnl]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 100;

  const handleSaveName = () => {
    updateProfileName(nameInput);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveGoal = () => {
    const parsed = parseFloat(goalInput.replace(",", "."));
    const goal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    updateDailyGoalPnl(goal);
    if (!isNaN(parsed) && parsed > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    if (checklistItems.includes(trimmed)) {
      Alert.alert("Duplicate", "This checklist item already exists.");
      return;
    }
    updateChecklistItems([...checklistItems, trimmed]);
    setNewChecklistItem("");
    Haptics.selectionAsync();
  };

  const handleRemoveChecklistItem = (item: string) => {
    updateChecklistItems(checklistItems.filter((i) => i !== item));
    Haptics.selectionAsync();
  };

  const handleMoveChecklistItem = (index: number, direction: "up" | "down") => {
    const next = [...checklistItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    updateChecklistItems(next);
    Haptics.selectionAsync();
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (confluenceTags.includes(trimmed)) {
      Alert.alert("Duplicate", "This tag already exists.");
      return;
    }
    updateConfluenceTags([...confluenceTags, trimmed]);
    setNewTag("");
    Haptics.selectionAsync();
  };

  const handleRemoveTag = (tag: string) => {
    updateConfluenceTags(confluenceTags.filter((t) => t !== tag));
    Haptics.selectionAsync();
  };

  const initials = avatarLetters(profileName || nameInput || "Trader");

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Profile">
          <SectionCard>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInputWrap}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Enter your name..."
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.textInput, nameFocused && styles.inputFocused]}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => { setNameFocused(false); handleSaveName(); }}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
              </View>
            </View>
            <View style={[styles.goalRow, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={styles.goalLabelWrap}>
                <Text style={styles.inputLabel}>Daily P&L Goal</Text>
                <Text style={styles.goalDesc}>Show a progress bar on the Journal</Text>
              </View>
              <View style={styles.goalInputWrap}>
                <Text style={styles.goalCurrency}>$</Text>
                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.goalInput, goalFocused && { color: Colors.blue }]}
                  keyboardType="decimal-pad"
                  onFocus={() => setGoalFocused(true)}
                  onBlur={() => { setGoalFocused(false); handleSaveGoal(); }}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveGoal}
                />
              </View>
            </View>
          </SectionCard>
        </Section>

        <Section title="Subscription">
          <SectionCard>
            <View style={styles.subRow}>
              <View>
                <Text style={styles.planLabel}>Free Plan</Text>
                <Text style={styles.planDesc}>Limited to 50 trades / month</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/paywall")}
              >
                <Feather name="zap" size={14} color={Colors.bg} />
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </Pressable>
            </View>
          </SectionCard>
        </Section>

        <Section title="Custom Checklist">
          <SectionCard>
            {checklistItems.map((item, index) => (
              <View key={item} style={styles.listRow}>
                <View style={styles.listRowReorder}>
                  <Pressable
                    onPress={() => handleMoveChecklistItem(index, "up")}
                    disabled={index === 0}
                    style={[styles.reorderBtn, index === 0 && { opacity: 0.3 }]}
                  >
                    <Feather name="chevron-up" size={16} color={Colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleMoveChecklistItem(index, "down")}
                    disabled={index === checklistItems.length - 1}
                    style={[styles.reorderBtn, index === checklistItems.length - 1 && { opacity: 0.3 }]}
                  >
                    <Feather name="chevron-down" size={16} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                <Text style={styles.listRowText} numberOfLines={2}>{item}</Text>
                <Pressable onPress={() => handleRemoveChecklistItem(item)} style={styles.removeBtn}>
                  <Feather name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholder="Add checklist item..."
                placeholderTextColor={Colors.textMuted}
                style={[styles.addInput, checklistFocused && styles.inputFocused]}
                onFocus={() => setChecklistFocused(true)}
                onBlur={() => setChecklistFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleAddChecklistItem}
              />
              <Pressable
                onPress={handleAddChecklistItem}
                style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="plus" size={18} color={Colors.blue} />
              </Pressable>
            </View>
          </SectionCard>
        </Section>

        <Section title="Custom Confluence Tags">
          <SectionCard>
            <View style={styles.tagsWrap}>
              {confluenceTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <Pressable onPress={() => handleRemoveTag(tag)} style={styles.tagRemoveBtn}>
                    <Feather name="x" size={12} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add confluence tag..."
                placeholderTextColor={Colors.textMuted}
                style={[styles.addInput, tagFocused && styles.inputFocused]}
                onFocus={() => setTagFocused(true)}
                onBlur={() => setTagFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleAddTag}
              />
              <Pressable
                onPress={handleAddTag}
                style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="plus" size={18} color={Colors.blue} />
              </Pressable>
            </View>
          </SectionCard>
        </Section>

        <Section title="Notifications">
          <SectionCard>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Daily reminder</Text>
                <Text style={styles.toggleDesc}>Remind me to log today's trades</Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={(v) => {
                  updateDailyReminder(v);
                  Haptics.selectionAsync();
                }}
                trackColor={{ false: Colors.surface3, true: Colors.blue }}
                thumbColor={Colors.text}
              />
            </View>
            <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View>
                <Text style={styles.toggleLabel}>Weekly summary</Text>
                <Text style={styles.toggleDesc}>Get a recap of weekly performance</Text>
              </View>
              <Switch
                value={weeklySummaryEnabled}
                onValueChange={(v) => {
                  updateWeeklySummary(v);
                  Haptics.selectionAsync();
                }}
                trackColor={{ false: Colors.surface3, true: Colors.blue }}
                thumbColor={Colors.text}
              />
            </View>
          </SectionCard>
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
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.bg,
  },
  profileInputWrap: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: Colors.borderBlue,
    backgroundColor: Colors.blueDim,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  goalLabelWrap: {
    flex: 1,
  },
  goalDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  goalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 90,
  },
  goalCurrency: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.blue,
    marginRight: 4,
  },
  goalInput: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    minWidth: 60,
    fontVariant: ["tabular-nums"],
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  planLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  planDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.blue,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  upgradeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.bg,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  listRowReorder: {
    flexDirection: "column",
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  listRowText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  removeBtn: {
    padding: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.blueDim,
    borderWidth: 1,
    borderColor: Colors.borderBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    paddingBottom: 4,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
  },
  tagChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
  },
  tagRemoveBtn: {
    padding: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  toggleDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
