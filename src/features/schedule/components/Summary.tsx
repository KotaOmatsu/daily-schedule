import React, { useMemo } from "react";
import { Calculator } from "lucide-react";
import type { ScheduleItem, ItemType } from "../types";
import { GAP_COLOR, TOTAL_MINUTES } from "../constants";
import { formatDuration } from "../utils";

interface SummaryProps {
  items: ScheduleItem[];
}

export const Summary: React.FC<SummaryProps> = ({ items }) => {
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

  return (
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
  );
};
