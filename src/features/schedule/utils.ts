import { CENTER, RADIUS, TOTAL_MINUTES } from "./constants";
import type { ScheduleItem } from "./types";

export const minutesToAngle = (minutes: number) => (minutes / TOTAL_MINUTES) * 360;

export const getCoordinatesForAngle = (angle: number, offset: number = 0) => {
  const rad = (angle - 90) * (Math.PI / 180);
  const r = RADIUS + offset;
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
};

export const createSlicePath = (startMinutes: number, duration: number) => {
  const startAngle = minutesToAngle(startMinutes);
  const endAngle = minutesToAngle(startMinutes + duration);
  const start = getCoordinatesForAngle(startAngle);
  const end = getCoordinatesForAngle(endAngle);
  const largeArcFlag = duration > TOTAL_MINUTES / 2 ? 1 : 0;

  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    `Z`,
  ].join(" ");
};

export const formatTime = (minutes: number) => {
  let m = Math.round(minutes) % TOTAL_MINUTES;
  if (m < 0) m += TOTAL_MINUTES;

  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Merge adjacent gaps
export const mergeAdjacentGaps = (items: ScheduleItem[]): ScheduleItem[] => {
  if (!items || items.length === 0) return [];

  const merged: ScheduleItem[] = [];
  let current = items[0];

  for (let i = 1; i < items.length; i++) {
    const next = items[i];
    const isSameGap = current.type === "gap" && next.type === "gap";
    const isSameActivity =
      current.type === "activity" &&
      next.type === "activity" &&
      current.title === next.title &&
      current.color === next.color;

    if (isSameGap || isSameActivity) {
      current = { ...current, duration: current.duration + next.duration };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};