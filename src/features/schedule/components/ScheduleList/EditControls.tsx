import React from "react";
import { Check, Trash2 } from "lucide-react";
import { COLORS } from "../../constants";
import type { ScheduleItem } from "../../types";

interface EditControlsProps {
  item: ScheduleItem;
  onUpdate: (id: string, updates: Partial<ScheduleItem>) => void;
  onDelete: (id: string) => void;
  onComplete: () => void;
}

export const EditControls: React.FC<EditControlsProps> = ({
  item,
  onUpdate,
  onDelete,
  onComplete,
}) => {
  return (
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
              onClick={() => onUpdate(item.id, { color: c })}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onComplete}
          className="flex items-center gap-1 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors mr-auto"
        >
          <Check size={12} /> 完了
        </button>

        <button
          onClick={() => onDelete(item.id)}
          className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 hover:border-red-200 flex items-center gap-1.5 transition-colors"
        >
          <Trash2 size={12} /> 削除
        </button>
      </div>
    </div>
  );
};