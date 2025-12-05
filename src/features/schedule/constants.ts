import type { ScheduleItem } from "./types";

export const TOTAL_MINUTES = 24 * 60;
export const RADIUS = 120;
export const CENTER = 150; // SVG viewBox center
export const GAP_COLOR = "#f3f4f6";
export const STORAGE_KEY = "daily-schedule-data-v4";

// Initial Data
export const INITIAL_ITEMS: ScheduleItem[] = [
  { id: "1", type: "activity", title: "睡眠", color: "#d1fae5", duration: 420 }, // 7h
  { id: "2", type: "gap", title: "空き", color: GAP_COLOR, duration: 30 }, // 0.5h
  {
    id: "3",
    type: "activity",
    title: "朝準備",
    color: "#e0f2fe",
    duration: 60,
  }, // 1h
  { id: "4", type: "activity", title: "仕事", color: "#e0e7ff", duration: 240 }, // 4h
  { id: "5", type: "activity", title: "昼食", color: "#fef3c7", duration: 60 }, // 1h
  { id: "6", type: "activity", title: "仕事", color: "#e0e7ff", duration: 240 }, // 4h
  { id: "7", type: "gap", title: "空き", color: GAP_COLOR, duration: 60 }, // 1h gap
  {
    id: "8",
    type: "activity",
    title: "自由時間",
    color: "#fce7f3",
    duration: 120,
  }, // 2h
  { id: "9", type: "gap", title: "空き", color: GAP_COLOR, duration: 30 }, // 0.5h gap
  {
    id: "10",
    type: "activity",
    title: "睡眠",
    color: "#d1fae5",
    duration: 180,
  }, // 3h
];

// Tailwind Colors for Picker
export const COLORS = [
  "#fee2e2",
  "#ffedd5",
  "#fef3c7",
  "#dcfce7",
  "#d1fae5",
  "#ccfbf1",
  "#e0f2fe",
  "#e0e7ff",
  "#fae8ff",
  "#fce7f3",
  "#ffe4e6",
  "#f3f4f6",
];