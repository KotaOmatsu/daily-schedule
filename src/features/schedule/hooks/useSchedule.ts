import { useState, useEffect, useMemo } from "react";
import type { ScheduleItem, ScheduleItemWithPos } from "../types";
import {
  INITIAL_ITEMS,
  STORAGE_KEY,
  TOTAL_MINUTES,
  COLORS,
  GAP_COLOR,
} from "../constants";
import { mergeAdjacentGaps, generateId } from "../utils";

export const useSchedule = () => {
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

  const itemsWithPos = useMemo<ScheduleItemWithPos[]>(() => {
    let currentStart = 0;
    return (items || []).map((item) => {
      const start = currentStart;
      currentStart += item.duration;
      return { ...item, start };
    });
  }, [items]);

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
  };

  const executeClearAll = () => {
    const newGap: ScheduleItem = {
      id: generateId(),
      type: "gap",
      title: "空き",
      color: GAP_COLOR,
      duration: TOTAL_MINUTES,
    };
    setItems([newGap]);
  };

  const handleAddScheduleInGap = (
    gapId: string,
    gapStart: number,
    gapDuration: number,
    clickMinutes: number
  ): string | null => {
    const index = items.findIndex((i) => i.id === gapId);
    if (index === -1) return null;
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
      return newItem.id;
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
    return newActivity.id;
  };

  const handleInsertScheduleAfter = (prevItemId: string): string | null => {
    const newItemId = generateId();

    const index = items.findIndex((i) => i.id === prevItemId);
    if (index === -1) return null;

    const durationToInsert = 15;
    const insertionIndex = index + 1;

    const newItems = [...items];
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
      return null;
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
    const merged = mergeAdjacentGaps(cleaned);

    setItems(merged);
    return newItemId;
  };

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

  const reorderItems = (sourceId: string, targetId: string) => {
     setItems((prev) => {
      const sourceIndex = prev.findIndex((i) => i.id === sourceId);
      const targetIndex = prev.findIndex((i) => i.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const newItems = [...prev];
      const [movedItem] = newItems.splice(sourceIndex, 1);
      newItems.splice(targetIndex, 0, movedItem);

      return mergeAdjacentGaps(newItems);
    });
  }

  return {
    items,
    itemsWithPos,
    setItems,
    handleUpdateItem,
    handleDeleteItem,
    executeClearAll,
    handleAddScheduleInGap,
    handleInsertScheduleAfter,
    handleChangeStartTime,
    handleChangeEndTime,
    reorderItems
  };
};