import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  List,
  PieChart as PieChartIcon,
  AlertTriangle,
  Calculator,
  Clock,
  Check,
  Save,
  Download,
  Copy,
  GripVertical as DragHandleIcon,
} from "lucide-react";

// --- Types ---
type ItemType = "activity" | "gap";

type ScheduleItem = {
  id: string;
  type: ItemType;
  title: string;
  color: string;
  duration: number; // in minutes
};

// --- Constants ---
const TOTAL_MINUTES = 24 * 60;
const RADIUS = 120;
const CENTER = 150; // SVG viewBox center
const GAP_COLOR = "#f3f4f6";
const STORAGE_KEY = "daily-schedule-data-v4";

// Initial Data
const INITIAL_ITEMS: ScheduleItem[] = [
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
const COLORS = [
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

// --- Helper Functions ---

const minutesToAngle = (minutes: number) => (minutes / TOTAL_MINUTES) * 360;

const getCoordinatesForAngle = (angle: number, offset: number = 0) => {
  const rad = (angle - 90) * (Math.PI / 180);
  const r = RADIUS + offset;
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
};

const createSlicePath = (startMinutes: number, duration: number) => {
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

const formatTime = (minutes: number) => {
  let m = Math.round(minutes) % TOTAL_MINUTES;
  if (m < 0) m += TOTAL_MINUTES;

  const h = Math.floor(m / 60);
  const min = Math.floor(m % 60);
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Merge adjacent gaps
const mergeAdjacentGaps = (items: ScheduleItem[]): ScheduleItem[] => {
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
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// --- Main Component ---

export default function DailySchedulePlanner() {
  // Initialize state safely
  const [items, setItems] = useState<ScheduleItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to load schedule", e);
        }
      }
    }
    return INITIAL_ITEMS;
  });

  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "save" | "success" | "error";
  } | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const showNotification = (
    message: string,
    type: "save" | "success" | "error" = "success"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Total Duration Guard ---
  useEffect(() => {
    if (!items) return;
    const total = items.reduce((acc, item) => acc + item.duration, 0);
    if (Math.abs(total - TOTAL_MINUTES) > 0.1) {
      setItems((prev) => {
        const newItems = [...prev];
        if (newItems.length === 0) return prev;

        const lastIndex = newItems.length - 1;
        const lastItem = newItems[lastIndex];
        const diff = TOTAL_MINUTES - total;

        const newDuration = lastItem.duration + diff;

        if (newDuration > 0) {
          newItems[lastIndex] = { ...lastItem, duration: newDuration };
          return newItems;
        } else {
          return newItems.slice(0, lastIndex);
        }
      });
    }
  }, [items]);

  useEffect(() => {
    if (items) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const itemsWithPos = useMemo(() => {
    let currentStart = 0;
    return (items || []).map((item) => {
      const start = currentStart;
      currentStart += item.duration;
      return { ...item, start };
    });
  }, [items]);

  const summary = useMemo(() => {
    const stats: Record<
      string,
      { duration: number; color: string; count: number; type: ItemType }
    > = {};

    (items || []).forEach((item) => {
      const key = item.type === "gap" ? "空き時間" : item.title.trim();
      const displayKey = key || "新しい予定";

      if (!stats[displayKey]) {
        stats[displayKey] = {
          duration: 0,
          color: item.type === "gap" ? GAP_COLOR : item.color,
          count: 0,
          type: item.type,
        };
      }
      stats[displayKey].duration += item.duration;
      stats[displayKey].count += 1;
    });

    return Object.entries(stats)
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.duration - a.duration);
  }, [items]);

  const getMinutesFromEvent = (
    e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
  ) => {
    if (!svgRef.current) return 0;
    const svgRect = svgRef.current.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : "clientX" in e ? e.clientX : 0;
    const clientY =
      "touches" in e ? e.touches[0].clientY : "clientY" in e ? e.clientY : 0;

    const dx = clientX - (svgRect.left + svgRect.width / 2);
    const dy = clientY - (svgRect.top + svgRect.height / 2);

    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    return (angleDeg / 360) * TOTAL_MINUTES;
  };

  // --- Export Functions ---
  const handleExportImage = async (action: "download" | "copy") => {
    if (!svgRef.current) return;

    try {
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const elementsToRemove = svgClone.querySelectorAll(
        '[data-export-ignore="true"]'
      );
      elementsToRemove.forEach((el) => el.remove());

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        const width = svgRef.current!.clientWidth;
        const height = svgRef.current!.clientHeight;

        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(scale, scale);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          if (action === "download") {
            const a = document.createElement("a");
            a.download = "my-schedule.png";
            a.href = URL.createObjectURL(blob);
            a.click();
            showNotification("画像を保存しました");
          } else {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              showNotification("クリップボードにコピーしました");
            } catch (err) {
              console.error(err);
              showNotification(
                "コピーできませんでした（ブラウザ制限の可能性があります）",
                "error"
              );
            }
          }
          URL.revokeObjectURL(url);
        });
      };
      img.src = url;
    } catch (e) {
      console.error(e);
      showNotification("エラーが発生しました", "error");
    }
  };

  // --- List Drag & Drop ---
  const handleListDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleListDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverItemId !== id) {
      setDragOverItemId(id);
    }
  };

  const handleListDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverItemId(null);
    const sourceId = e.dataTransfer.getData("text/plain");

    if (sourceId === targetId) return;

    setItems((prev) => {
      const sourceIndex = prev.findIndex((i) => i.id === sourceId);
      const targetIndex = prev.findIndex((i) => i.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const newItems = [...prev];
      const [movedItem] = newItems.splice(sourceIndex, 1);
      newItems.splice(targetIndex, 0, movedItem);

      return mergeAdjacentGaps(newItems);
    });
  };

  // --- Circle Drag Operations (Resize Only) ---

  const handleDragStart = (
    index: number,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragIndex(index);
  };

  const handleDragEnd = () => {
    setActiveDragIndex(null);
    setItems((prev) => {
      const cleaned = prev.filter((item) => item.duration > 0);
      return mergeAdjacentGaps(cleaned);
    });
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (activeDragIndex === null) return;

    const minutes = getMinutesFromEvent(e);
    const snappedMinutes = Math.round(minutes / 15) * 15;

    setItems((prev) => {
      const newItems = [...prev];
      const prevItemIndex = activeDragIndex;
      const nextItemIndex = (activeDragIndex + 1) % prev.length;

      const prevItem = newItems[prevItemIndex];
      const nextItem = newItems[nextItemIndex];

      const minPrevDuration = prevItem.type === "gap" ? 0 : 15;
      const minNextDuration = nextItem.type === "gap" ? 0 : 15;

      let prevItemStartTime = 0;
      for (let i = 0; i < prevItemIndex; i++)
        prevItemStartTime += newItems[i].duration;

      let newPrevDuration = snappedMinutes - prevItemStartTime;
      if (newPrevDuration < 0) newPrevDuration += TOTAL_MINUTES;
      if (newPrevDuration > TOTAL_MINUTES) newPrevDuration -= TOTAL_MINUTES;

      // Calculate next duration based on conservation of total time
      const combinedDuration = prevItem.duration + nextItem.duration;
      let newNextDuration = combinedDuration - newPrevDuration;

      if (
        newPrevDuration < minPrevDuration ||
        newNextDuration < minNextDuration
      )
        return prev;

      newItems[prevItemIndex] = { ...prevItem, duration: newPrevDuration };
      newItems[nextItemIndex] = { ...nextItem, duration: newNextDuration };

      return newItems;
    });
  };

  useEffect(() => {
    if (activeDragIndex !== null) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [activeDragIndex]);

  // --- CRUD & Interaction ---

  const handleItemClick = (
    e: React.MouseEvent,
    item: (typeof itemsWithPos)[0]
  ) => {
    const clickMinutes = getMinutesFromEvent(e);

    if (item.type === "gap") {
      handleAddScheduleInGap(item.id, item.start, item.duration, clickMinutes);
    } else {
      setSelectedItemId(item.id);
    }
  };

  const handleAddScheduleInGap = (
    gapId: string,
    gapStart: number,
    gapDuration: number,
    clickMinutes: number
  ) => {
    const index = items.findIndex((i) => i.id === gapId);
    if (index === -1) return;
    const gap = items[index];

    if (gap.duration <= 30) {
      const newItem: ScheduleItem = {
        ...gap,
        type: "activity",
        title: "",
        color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
      };
      const newItems = [...items];
      newItems[index] = newItem;
      setItems(newItems);
      setSelectedItemId(newItem.id);
      return;
    }

    const newActivityDuration = Math.min(60, gap.duration);
    let relativeClickTime = clickMinutes - gapStart;
    if (relativeClickTime < 0) relativeClickTime += TOTAL_MINUTES;
    let targetRelativeStart = relativeClickTime - newActivityDuration / 2;

    if (targetRelativeStart < 0) targetRelativeStart = 0;
    if (targetRelativeStart + newActivityDuration > gapDuration) {
      targetRelativeStart = gapDuration - newActivityDuration;
    }

    const snappedStart = Math.round(targetRelativeStart / 15) * 15;
    const part1Duration = snappedStart;

    const newItems = [...items];
    const newActivity: ScheduleItem = {
      id: generateId(),
      type: "activity",
      title: "",
      color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
      duration: newActivityDuration,
    };

    const replacements: ScheduleItem[] = [];
    if (part1Duration > 0) {
      replacements.push({ ...gap, id: gap.id + "_1", duration: part1Duration });
    }
    replacements.push(newActivity);

    const remainingAfter = gapDuration - part1Duration - newActivityDuration;
    if (remainingAfter > 0) {
      replacements.push({
        ...gap,
        id: gap.id + "_2",
        duration: remainingAfter,
      });
    }

    newItems.splice(index, 1, ...replacements);
    setItems(newItems);
    setSelectedItemId(newActivity.id);
  };

  // --- Insertion with Shift Logic ---
  const handleInsertScheduleAfter = (prevItemId: string) => {
    const newItemId = generateId();

    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === prevItemId);
      if (index === -1) return prev;

      const durationToInsert = 15;
      const insertionIndex = index + 1;

      const newItems = [...prev];
      let remainingToReduce = durationToInsert;

      const reductions = new Map<number, number>();

      for (let offset = 0; offset < newItems.length; offset++) {
        if (remainingToReduce <= 0) break;

        const targetIndex = (insertionIndex + offset) % newItems.length;
        const targetItem = newItems[targetIndex];

        if (targetItem.type === "gap") {
          const available = targetItem.duration;
          const take = Math.min(available, remainingToReduce);

          if (take > 0) {
            reductions.set(
              targetIndex,
              (reductions.get(targetIndex) || 0) + take
            );
            remainingToReduce -= take;
          }
        }
      }

      if (remainingToReduce > 0) {
        for (let offset = 0; offset < newItems.length; offset++) {
          if (remainingToReduce <= 0) break;

          const targetIndex = (insertionIndex + offset) % newItems.length;
          const targetItem = newItems[targetIndex];

          if (targetItem.type === "activity") {
            const minDuration = 15;
            const currentReduction = reductions.get(targetIndex) || 0;
            const available = Math.max(
              0,
              targetItem.duration - currentReduction - minDuration
            );

            const take = Math.min(available, remainingToReduce);

            if (take > 0) {
              reductions.set(targetIndex, currentReduction + take);
              remainingToReduce -= take;
            }
          }
        }
      }

      if (remainingToReduce > 0) {
        alert("予定を挿入する十分なスペース（空き時間）がありません。");
        return prev;
      }

      reductions.forEach((reduceAmount, idx) => {
        newItems[idx] = {
          ...newItems[idx],
          duration: newItems[idx].duration - reduceAmount,
        };
      });

      const newItem: ScheduleItem = {
        id: newItemId,
        type: "activity",
        title: "",
        color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
        duration: durationToInsert,
      };

      newItems.splice(insertionIndex, 0, newItem);

      const cleaned = newItems.filter((i) => i.duration > 0);
      return mergeAdjacentGaps(cleaned);
    });

    setSelectedItemId(newItemId);
  };

  const handleUpdateItem = (id: string, updates: Partial<ScheduleItem>) => {
    setItems((prevItems) => {
      const targetItem = prevItems.find((i) => i.id === id);
      if (!targetItem) return prevItems;

      if (updates.color && targetItem.type !== "gap" && targetItem.title) {
        return prevItems.map((item) => {
          if (item.id === id) return { ...item, ...updates };
          if (item.title === targetItem.title && item.type !== "gap") {
            return { ...item, color: updates.color! };
          }
          return item;
        });
      }
      return prevItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
    });
  };

  // --- Start/End Time Editing ---

  const handleChangeStartTime = (id: string, newStartMinutes: number) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;

      const item = prev[index];

      let currentStart = 0;
      for (let i = 0; i < index; i++) currentStart += prev[i].duration;

      let diff = newStartMinutes - currentStart;

      if (diff > TOTAL_MINUTES / 2) diff -= TOTAL_MINUTES;
      if (diff < -TOTAL_MINUTES / 2) diff += TOTAL_MINUTES;

      if (diff === 0) return prev;

      const newItems = [...prev];

      if (diff > 0) {
        // Start time delayed: Expand Previous
        const prevIndex = (index - 1 + prev.length) % prev.length;
        const prevItem = newItems[prevIndex];

        if (prevItem.type === "gap") {
          newItems[prevIndex] = {
            ...prevItem,
            duration: prevItem.duration + diff,
          };
          newItems[index] = { ...item, duration: item.duration - diff };
        } else {
          if (item.duration - diff < 15) return prev;

          newItems[index] = { ...item, duration: item.duration - diff };
          const newGap: ScheduleItem = {
            id: generateId(),
            type: "gap",
            title: "空き",
            color: GAP_COLOR,
            duration: diff,
          };
          newItems.splice(index, 0, newGap);
        }
      } else {
        // Start time earlier: Shrink Previous
        let remainingConsume = -diff;
        let currentIndexToConsume = (index - 1 + prev.length) % prev.length;

        while (remainingConsume > 0) {
          const target = newItems[currentIndexToConsume];
          if (target.duration > remainingConsume) {
            newItems[currentIndexToConsume] = {
              ...target,
              duration: target.duration - remainingConsume,
            };
            newItems[index] = { ...item, duration: item.duration + -diff };
            remainingConsume = 0;
          } else {
            const consumedAmount = target.duration;
            remainingConsume -= consumedAmount;
            newItems.splice(currentIndexToConsume, 1);
            if (currentIndexToConsume < index) {
              return prev;
            }
          }
        }
      }

      const cleaned = newItems.filter((i) => i.duration > 0);
      return mergeAdjacentGaps(cleaned);
    });
  };

  const handleChangeEndTime = (id: string, newEndMinutes: number) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;

      const item = prev[index];

      let currentStart = 0;
      for (let i = 0; i < index; i++) currentStart += prev[i].duration;
      const currentEnd = (currentStart + item.duration) % TOTAL_MINUTES;

      let diff = newEndMinutes - currentEnd;
      if (diff > TOTAL_MINUTES / 2) diff -= TOTAL_MINUTES;
      if (diff < -TOTAL_MINUTES / 2) diff += TOTAL_MINUTES;

      if (diff === 0) return prev;

      const newItems = [...prev];

      if (diff < 0) {
        // End time earlier
        const shrinkAmount = -diff;
        if (item.duration - shrinkAmount < 15) return prev;

        const nextIndex = (index + 1) % prev.length;
        const nextItem = newItems[nextIndex];

        newItems[index] = { ...item, duration: item.duration - shrinkAmount };

        if (nextItem.type === "gap") {
          newItems[nextIndex] = {
            ...nextItem,
            duration: nextItem.duration + shrinkAmount,
          };
        } else {
          const newGap: ScheduleItem = {
            id: generateId(),
            type: "gap",
            title: "空き",
            color: GAP_COLOR,
            duration: shrinkAmount,
          };
          newItems.splice(nextIndex, 0, newGap);
        }
      } else {
        // End time later
        const expandAmount = diff;
        const nextIndex = (index + 1) % prev.length;
        const nextItem = newItems[nextIndex];

        if (nextItem.duration > expandAmount) {
          newItems[nextIndex] = {
            ...nextItem,
            duration: nextItem.duration - expandAmount,
          };
          newItems[index] = { ...item, duration: item.duration + expandAmount };
        } else {
          newItems.splice(nextIndex, 1);
          newItems[index] = {
            ...item,
            duration: item.duration + nextItem.duration,
          };
        }
      }

      const cleaned = newItems.filter((i) => i.duration > 0);
      return mergeAdjacentGaps(cleaned);
    });
  };

  const handleDeleteItem = (id: string) => {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      type: "gap",
      title: "空き",
      color: GAP_COLOR,
    };

    setItems(mergeAdjacentGaps(newItems));
    setSelectedItemId(null);
  };

  const handleClearAllRequest = () => setShowResetConfirm(true);

  const executeClearAll = () => {
    const newGap: ScheduleItem = {
      id: generateId(),
      type: "gap",
      title: "空き",
      color: GAP_COLOR,
      duration: TOTAL_MINUTES,
    };
    setItems([newGap]);
    setSelectedItemId(null);
    setShowResetConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      setSelectedItemId(null);
    }
  };

  // Ensure items is never null before render
  if (!items) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col lg:flex-row h-screen overflow-hidden relative">
      {/* --- Confirmation Modal --- */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  スケジュールを全て削除
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  全ての予定を削除し、全体を空白（空き時間）に戻します。
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={executeClearAll}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Notification Indicator --- */}
      <div
        className={`absolute bottom-6 right-6 lg:left-6 lg:right-auto lg:bottom-6 z-50 
          ${notification?.type === "error" ? "bg-red-600" : "bg-gray-800"}
          text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 transform
          ${
            notification
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
      >
        {notification?.type === "save" && (
          <Save size={14} className="text-green-400" />
        )}
        {notification?.type === "success" && (
          <Check size={14} className="text-green-400" />
        )}
        {notification?.type === "error" && (
          <AlertTriangle size={14} className="text-white" />
        )}
        {notification?.message}
      </div>

      {/* --- Left Panel: Pie Chart & Summary --- */}
      <div className="flex-1 flex flex-col items-center p-6 bg-white shadow-sm lg:border-r border-gray-200 relative overflow-y-auto custom-scrollbar">
        {/* Chart Container */}
        <div className="relative w-full max-w-[400px] aspect-square select-none mb-8 mt-4 flex-shrink-0 group/chart">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
            className="w-full h-full drop-shadow-2xl"
          >
            {/* Background Circle */}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="white" />

            {/* Slices */}
            {itemsWithPos.map((item) => {
              const isSingleItem = itemsWithPos.length === 1;

              return (
                <g key={item.id}>
                  {isSingleItem ? (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill={item.color}
                      stroke="white"
                      strokeWidth={item.type === "gap" ? 1 : 2}
                      className={`transition-all duration-300 cursor-pointer 
                        ${
                          item.type === "gap"
                            ? "hover:fill-gray-100"
                            : "hover:opacity-90"
                        }
                        ${
                          selectedItemId === item.id
                            ? "stroke-blue-500 stroke-[4px] z-10 relative"
                            : ""
                        }
                      `}
                      onClick={(e) => handleItemClick(e, item)}
                    />
                  ) : (
                    <path
                      d={createSlicePath(item.start, item.duration)}
                      fill={item.color}
                      stroke="white"
                      strokeWidth={item.type === "gap" ? 1 : 2}
                      className={`transition-all duration-300 cursor-pointer 
                        ${
                          item.type === "gap"
                            ? "hover:fill-gray-100"
                            : "hover:opacity-90"
                        }
                        ${
                          selectedItemId === item.id
                            ? "stroke-blue-500 stroke-[4px] z-10 relative"
                            : ""
                        }
                      `}
                      onClick={(e) => handleItemClick(e, item)}
                    />
                  )}
                </g>
              );
            })}

            {/* Labels inside slices */}
            {itemsWithPos.map((item) => {
              if (item.type === "gap") return null;
              if (item.duration < 30) return null;

              const midAngle = minutesToAngle(item.start + item.duration / 2);
              const pos = getCoordinatesForAngle(midAngle, -RADIUS * 0.35);
              return (
                <g key={`label-${item.id}`} className="pointer-events-none">
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[11px] font-bold fill-gray-800 drop-shadow-sm"
                  >
                    {item.title}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] fill-gray-500"
                  >
                    {formatDuration(item.duration)}
                  </text>
                </g>
              );
            })}

            {/* Hour Markers */}
            {(() => {
              const markers = [];
              for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * 360;
                const pos = getCoordinatesForAngle(angle, 25);
                markers.push(
                  <text
                    key={i}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] fill-gray-400 font-medium select-none pointer-events-none"
                  >
                    {i}
                  </text>
                );
              }
              return markers;
            })()}

            {/* Drag Handles */}
            {itemsWithPos.length > 1 &&
              itemsWithPos.map((item, index) => {
                const endMinutes = item.start + item.duration;
                const angle = minutesToAngle(endMinutes);
                const pos = getCoordinatesForAngle(angle);

                return (
                  <g
                    key={`handle-${index}`}
                    className="cursor-pointer group"
                    onMouseDown={(e) => handleDragStart(index, e)}
                    onTouchStart={(e) => handleDragStart(index, e)}
                    style={{ cursor: "grab" }}
                    data-export-ignore="true" // Ignore during export
                  >
                    <circle cx={pos.x} cy={pos.y} r={18} fill="transparent" />
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={6}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }}
                      className={`fill-white stroke-[2.5px] stroke-gray-300 shadow-md transition-all duration-200 group-hover:scale-125 group-hover:stroke-blue-500 ${
                        activeDragIndex === index
                          ? "scale-125 stroke-blue-600 fill-blue-50"
                          : ""
                      }`}
                    />
                  </g>
                );
              })}

            {/* Center Info */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={40}
              fill="white"
              className="shadow-lg"
            />
            <text
              x={CENTER}
              y={CENTER - 8}
              textAnchor="middle"
              className="text-[10px] font-bold fill-gray-400 select-none tracking-widest"
            >
              TOTAL
            </text>
            <text
              x={CENTER}
              y={CENTER + 12}
              textAnchor="middle"
              className="text-xl font-bold fill-gray-800 select-none"
            >
              24H
            </text>
          </svg>

          {/* Export Actions (Absolute position relative to chart container) */}
          <div
            className="absolute bottom-0 right-0 flex flex-col gap-2 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300"
            data-html2canvas-ignore="true" // Just in case, though we handle it manually
          >
            <button
              onClick={() => handleExportImage("copy")}
              className="p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="クリップボードにコピー"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => handleExportImage("download")}
              className="p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="画像を保存"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Summary Section */}
        <div className="w-full max-w-2xl bg-gray-50/50 rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center gap-1.5">
            <Calculator size={14} /> 内訳・合計
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {summary.map((stat) => (
              <div key={stat.title} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        stat.type === "gap" ? "border border-gray-300" : ""
                      }`}
                      style={{ backgroundColor: stat.color }}
                    />
                    <span
                      className={`truncate font-medium ${
                        stat.type === "gap" ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {stat.title}
                    </span>
                    {stat.count > 1 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded-full">
                        x{stat.count}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-gray-600 text-xs">
                    {formatDuration(stat.duration)}
                  </span>
                </div>
                {/* Simple Bar Chart */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(stat.duration / TOTAL_MINUTES) * 100}%`,
                      backgroundColor:
                        stat.color === GAP_COLOR ? "#d1d5db" : stat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Right Panel: Editor List --- */}
      <div className="w-full lg:w-96 bg-gray-50/50 flex flex-col border-l border-gray-200 shadow-xl z-20 h-full">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-gray-100 flex justify-between items-center flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <List className="w-4 h-4 text-gray-500" />
              予定リスト
            </h2>
          </div>

          <button
            onClick={handleClearAllRequest}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
            title="全削除"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {" "}
          {/* Reduced gap for connector line */}
          {itemsWithPos.map((item, index) => {
            const isSelected = selectedItemId === item.id;
            const startTimeStr = formatTime(item.start);
            const endTimeStr = formatTime(item.start + item.duration);
            const isGap = item.type === "gap";

            // Calculate Start/End hours and minutes for input
            const startH = Math.floor(item.start / 60);
            const startM = Math.floor(item.start % 60);
            const endH = Math.floor(
              ((item.start + item.duration) % TOTAL_MINUTES) / 60
            );
            const endM = Math.floor(
              ((item.start + item.duration) % TOTAL_MINUTES) % 60
            );

            // Hide gap items in the list
            if (isGap) return null;

            return (
              <div
                key={item.id}
                className="relative group/item"
                draggable
                onDragStart={(e) => handleListDragStart(e, item.id)}
                onDragOver={(e) => handleListDragOver(e, item.id)}
                onDrop={(e) => handleListDrop(e, item.id)}
              >
                {/* Drag Indicator Bar */}
                {dragOverItemId === item.id && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 rounded-full z-30 pointer-events-none transform -translate-y-1/2" />
                )}

                <div
                  className={`
                    relative rounded-xl p-3.5 border transition-all duration-200 z-10 pr-8 pl-9 /* Added padding for handle and delete button */
                    ${
                      isSelected
                        ? "border-blue-400 bg-white shadow-md scale-[1.02] ring-4 ring-blue-50/50"
                        : "border-transparent bg-white shadow-sm hover:shadow-md hover:border-gray-200"
                    }
                    ${dragOverItemId === item.id ? "opacity-50" : ""}
                  `}
                  onClick={(e) => handleItemClick(e, item)}
                >
                  {/* Drag Handle */}
                  <div className="absolute top-1/2 left-2 -translate-y-1/2 p-1 text-gray-300 cursor-grab hover:text-gray-500 active:cursor-grabbing">
                    <DragHandleIcon size={14} />
                  </div>

                  {/* Delete Button (Visible on Hover or Selected) - Absolute positioned to avoid layout shift */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className={`
                      absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-20
                      ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover/item:opacity-100"
                      }
                    `}
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Content */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mt-1">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm ${
                          isGap ? "border border-gray-300" : ""
                        }`}
                        style={{ backgroundColor: item.color }}
                      />

                      {isSelected ? (
                        <input
                          type="text"
                          value={item.title}
                          placeholder="新しい予定"
                          onChange={(e) =>
                            handleUpdateItem(item.id, { title: e.target.value })
                          }
                          onKeyDown={handleKeyDown}
                          className="font-bold text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-blue-300 w-full focus:outline-none focus:ring-2 focus:ring-blue-100"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={`text-sm font-bold truncate ${
                            isGap
                              ? "text-gray-400 text-xs italic"
                              : "text-gray-700"
                          }`}
                        >
                          {item.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected ? (
                    <div
                      className="pl-6.5 mt-2 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-blue-200 shadow-sm">
                        {/* Start Time */}
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={startH}
                          onChange={(e) =>
                            handleChangeStartTime(
                              item.id,
                              parseInt(e.target.value || "0") * 60 + startM
                            )
                          }
                          onKeyDown={handleKeyDown}
                          className="w-12 text-center bg-white border border-gray-200 rounded text-xs font-mono focus:border-blue-500 focus:outline-none p-1"
                        />
                        <span className="text-xs text-gray-400">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="15"
                          value={startM}
                          onChange={(e) =>
                            handleChangeStartTime(
                              item.id,
                              startH * 60 + parseInt(e.target.value || "0")
                            )
                          }
                          onKeyDown={handleKeyDown}
                          className="w-12 text-center bg-white border border-gray-200 rounded text-xs font-mono focus:border-blue-500 focus:outline-none p-1"
                        />
                        <span className="text-gray-400 mx-1">~</span>
                        {/* End Time */}
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={endH}
                          onChange={(e) =>
                            handleChangeEndTime(
                              item.id,
                              parseInt(e.target.value || "0") * 60 + endM
                            )
                          }
                          onKeyDown={handleKeyDown}
                          className="w-12 text-center bg-white border border-gray-200 rounded text-xs font-mono focus:border-blue-500 focus:outline-none p-1"
                        />
                        <span className="text-xs text-gray-400">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="15"
                          value={endM}
                          onChange={(e) =>
                            handleChangeEndTime(
                              item.id,
                              endH * 60 + parseInt(e.target.value || "0")
                            )
                          }
                          onKeyDown={handleKeyDown}
                          className="w-12 text-center bg-white border border-gray-200 rounded text-xs font-mono focus:border-blue-500 focus:outline-none p-1"
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono ml-1">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pl-6.5 mt-0.5 font-mono">
                      <span>
                        {startTimeStr} - {endTimeStr}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                  )}

                  {/* Edit Controls */}
                  {isSelected && (
                    <div
                      className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 animation-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Colors */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Color Theme
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {COLORS.filter((c) => c !== "#f3f4f6").map((c) => (
                            <button
                              key={c}
                              className={`w-6 h-6 rounded-full border border-gray-200 transition-transform ${
                                item.color === c
                                  ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                                  : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: c }}
                              onClick={() =>
                                handleUpdateItem(item.id, { color: c })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelectedItemId(null)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors mr-auto"
                        >
                          <Check size={12} /> 完了
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 hover:border-red-200 flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 size={12} /> 削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Insertion Zone */}
                <div className="h-6 -my-3 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-20 relative hover:opacity-100 pointer-events-none hover:pointer-events-auto">
                  <div className="w-full h-px bg-blue-200 absolute"></div>
                  <button
                    onClick={() => handleInsertScheduleAfter(item.id)}
                    className="relative bg-white border border-blue-200 text-blue-500 rounded-full p-1 shadow-sm hover:scale-110 hover:bg-blue-50 transition-all pointer-events-auto"
                    title="終了時刻から15mの予定を追加"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
