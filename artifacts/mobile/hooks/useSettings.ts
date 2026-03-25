import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export const DEFAULT_CHECKLIST_ITEMS = [
  "Direction aligns with HTF trend",
  "Minimum 2 confluences present",
  "R:R is at least 1:2",
  "Risk does not exceed 1–2%",
  "SL placed beyond structure",
  "Economic calendar checked",
];

export const DEFAULT_CONFLUENCE_TAGS = [
  "FVG",
  "Order Block",
  "Liquidity Sweep",
  "Break of Structure",
  "EMA 200",
  "Support/Resistance",
  "Session Open",
  "HTF Trend",
  "Fibonacci",
];

type Settings = {
  profileName: string;
  checklistItems: string[];
  confluenceTags: string[];
  dailyReminderEnabled: boolean;
  weeklySummaryEnabled: boolean;
};

const STORAGE_KEY = "tradelog_settings";

const defaultSettings: Settings = {
  profileName: "",
  checklistItems: DEFAULT_CHECKLIST_ITEMS,
  confluenceTags: DEFAULT_CONFLUENCE_TAGS,
  dailyReminderEnabled: false,
  weeklySummaryEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings({ ...defaultSettings, ...parsed });
        } catch {
          // ignore parse errors, use defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: Settings) => {
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateProfileName = useCallback(
    (name: string) => save({ ...settings, profileName: name }),
    [settings, save]
  );

  const updateChecklistItems = useCallback(
    (items: string[]) => save({ ...settings, checklistItems: items }),
    [settings, save]
  );

  const updateConfluenceTags = useCallback(
    (tags: string[]) => save({ ...settings, confluenceTags: tags }),
    [settings, save]
  );

  const updateDailyReminder = useCallback(
    (enabled: boolean) => save({ ...settings, dailyReminderEnabled: enabled }),
    [settings, save]
  );

  const updateWeeklySummary = useCallback(
    (enabled: boolean) => save({ ...settings, weeklySummaryEnabled: enabled }),
    [settings, save]
  );

  return {
    loaded,
    profileName: settings.profileName,
    checklistItems: settings.checklistItems,
    confluenceTags: settings.confluenceTags,
    dailyReminderEnabled: settings.dailyReminderEnabled,
    weeklySummaryEnabled: settings.weeklySummaryEnabled,
    updateProfileName,
    updateChecklistItems,
    updateConfluenceTags,
    updateDailyReminder,
    updateWeeklySummary,
  };
}
