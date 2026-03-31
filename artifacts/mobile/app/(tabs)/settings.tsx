import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useSettings } from "@/hooks/useSettings";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function avatarLetters(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: FeatherIconName;
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={[
        styles.menuRow,
        !last && styles.menuRowBorder,
        pressed && { backgroundColor: Colors.surface2 },
      ]}
    >
      <View style={styles.menuRowIcon}>
        <Feather name={icon} size={18} color={Colors.blue} />
      </View>
      <Text style={styles.menuRowLabel}>{label}</Text>
      {hint !== undefined && (
        <Text style={styles.menuRowHint}>{hint}</Text>
      )}
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onValueChange,
  last,
}: {
  icon: FeatherIconName;
  label: string;
  desc: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.menuRow, !last && styles.menuRowBorder]}>
      <View style={styles.menuRowIcon}>
        <Feather name={icon} size={18} color={Colors.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuRowLabel}>{label}</Text>
        <Text style={styles.menuRowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          onValueChange(v);
          Haptics.selectionAsync();
        }}
        trackColor={{ false: Colors.surface3, true: Colors.blue }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionGroup}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const SWIPE_CLOSE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.5;

function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_evt, gestureState) => gestureState.dy > 0,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (
          gestureState.dy > SWIPE_CLOSE_THRESHOLD ||
          gestureState.vy > SWIPE_VELOCITY_THRESHOLD
        ) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(600);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={onClose}>
            <Animated.View style={[styles.backdrop, { opacity }]} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.sheetContainer,
              { paddingBottom: insets.bottom + 16 },
              { transform: [{ translateY }] },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.sheetDragArea}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Pressable onPress={onClose} style={styles.sheetClose}>
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
  const [goalFocused, setGoalFocused] = useState(false);
  const [checklistFocused, setChecklistFocused] = useState(false);
  const [tagFocused, setTagFocused] = useState(false);
  const [checklistSheetOpen, setChecklistSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [profileNameFocused, setProfileNameFocused] = useState(false);

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
  const displayName = profileName || nameInput || "Trader";

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
        {/* Profile tappable row */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.selectionAsync();
            setProfileSheetOpen(true);
          }}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileSubtext}>Trader · Tap to edit</Text>
          </View>
          <Feather name="chevron-right" size={18} color={Colors.textMuted} />
        </Pressable>

        {/* Profile settings */}
        <SectionGroup title="Profile">
          <View style={[styles.menuRow, styles.menuRowBorder]}>
            <View style={styles.menuRowIcon}>
              <Feather name="target" size={18} color={Colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowLabel}>Daily P&L Goal</Text>
              <Text style={styles.menuRowDesc}>Shows a progress bar on the Journal</Text>
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
        </SectionGroup>

        {/* Subscription */}
        <SectionGroup title="Subscription">
          <View style={[styles.menuRow]}>
            <View style={styles.menuRowIcon}>
              <Feather name="zap" size={18} color={Colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowLabel}>Free Plan</Text>
              <Text style={styles.menuRowDesc}>Limited to 50 trades / month</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/paywall")}
            >
              <Text style={styles.upgradeBtnText}>Upgrade</Text>
            </Pressable>
          </View>
        </SectionGroup>

        {/* Trading settings (checklist & tags) */}
        <SectionGroup title="Trading">
          <MenuRow
            icon="check-square"
            label="Custom Checklist"
            hint={`${checklistItems.length} items`}
            onPress={() => {
              Haptics.selectionAsync();
              setChecklistSheetOpen(true);
            }}
            last={false}
          />
          <MenuRow
            icon="tag"
            label="Confluence Tags"
            hint={`${confluenceTags.length} tags`}
            onPress={() => {
              Haptics.selectionAsync();
              setTagsSheetOpen(true);
            }}
            last={true}
          />
        </SectionGroup>

        {/* Notifications */}
        <SectionGroup title="Notifications">
          <ToggleRow
            icon="bell"
            label="Daily reminder"
            desc="Remind me to log today's trades"
            value={dailyReminderEnabled}
            onValueChange={updateDailyReminder}
          />
          <ToggleRow
            icon="bar-chart-2"
            label="Weekly summary"
            desc="Get a recap of weekly performance"
            value={weeklySummaryEnabled}
            onValueChange={updateWeeklySummary}
            last
          />
        </SectionGroup>
      </ScrollView>

      {/* Profile Edit Bottom Sheet */}
      <BottomSheet
        visible={profileSheetOpen}
        onClose={() => {
          handleSaveName();
          setProfileSheetOpen(false);
        }}
        title="Edit Profile"
      >
        <View style={styles.sheetPadded}>
          <View style={styles.profileEditAvatar}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <Text style={styles.sheetFieldLabel}>Your Name</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Enter your name..."
            placeholderTextColor={Colors.textMuted}
            style={[styles.sheetTextInput, profileNameFocused && styles.inputFocused]}
            onFocus={() => setProfileNameFocused(true)}
            onBlur={() => setProfileNameFocused(false)}
            returnKeyType="done"
            onSubmitEditing={() => {
              handleSaveName();
              setProfileSheetOpen(false);
            }}
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => {
              handleSaveName();
              setProfileSheetOpen(false);
            }}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* Custom Checklist Bottom Sheet */}
      <BottomSheet
        visible={checklistSheetOpen}
        onClose={() => setChecklistSheetOpen(false)}
        title="Custom Checklist"
      >
        <ScrollView
          style={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {checklistItems.map((item, index) => (
            <View key={item} style={styles.sheetListRow}>
              <View style={styles.reorderBtns}>
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
              <Text style={styles.sheetListRowText} numberOfLines={2}>{item}</Text>
              <Pressable onPress={() => handleRemoveChecklistItem(item)} style={styles.removeBtn}>
                <Feather name="x" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))}

          <View style={styles.sheetAddRow}>
            <TextInput
              value={newChecklistItem}
              onChangeText={setNewChecklistItem}
              placeholder="Add checklist item..."
              placeholderTextColor={Colors.textMuted}
              style={[styles.sheetAddInput, checklistFocused && styles.inputFocused]}
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
        </ScrollView>
      </BottomSheet>

      {/* Confluence Tags Bottom Sheet */}
      <BottomSheet
        visible={tagsSheetOpen}
        onClose={() => setTagsSheetOpen(false)}
        title="Confluence Tags"
      >
        <ScrollView
          style={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.sheetAddRow}>
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add confluence tag..."
              placeholderTextColor={Colors.textMuted}
              style={[styles.sheetAddInput, tagFocused && styles.inputFocused]}
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
        </ScrollView>
      </BottomSheet>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.bg,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  profileSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sectionGroup: {
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
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.blueDim,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRowLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  menuRowHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  menuRowDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
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
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.blue,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  upgradeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.bg,
  },
  inputFocused: {
    borderColor: Colors.borderBlue,
    backgroundColor: Colors.blueDim,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F1929",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
    maxHeight: "85%",
  },
  sheetDragArea: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surface3,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScroll: {
    maxHeight: 500,
  },
  sheetPadded: {
    padding: 20,
    gap: 12,
  },
  profileEditAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetFieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sheetTextInput: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.bg,
  },
  sheetListRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  reorderBtns: {
    flexDirection: "column",
    gap: 2,
  },
  reorderBtn: {
    padding: 2,
  },
  sheetListRowText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
  },
  removeBtn: {
    padding: 6,
  },
  sheetAddRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sheetAddInput: {
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
    padding: 16,
    paddingBottom: 8,
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
});
