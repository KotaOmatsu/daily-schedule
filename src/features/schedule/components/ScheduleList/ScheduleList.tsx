import React, { useState } from "react";
import { List, Trash2 } from "lucide-react";
import type {
  ScheduleItemWithPos,
  ScheduleItem as ScheduleItemType,
} from "../../types";
import { ScheduleItem } from "./ScheduleItem";

interface ScheduleListProps {
  items: ScheduleItemWithPos[];
  selectedItemId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<ScheduleItemType>) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
  onChangeStartTime: (id: string, minutes: number) => void;
  onChangeEndTime: (id: string, minutes: number) => void;
  onClearAll: () => void;
  onReorder: (sourceId: string, targetId: string) => void;
  className?: string;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  items,
  selectedItemId,
  onSelect,
  onUpdate,
  onDelete,
  onInsertAfter,
  onChangeStartTime,
  onChangeEndTime,
  onClearAll,
  onReorder,
  className,
}) => {
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

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
    onReorder(sourceId, targetId);
  };

  return (
    <div className={`w-full lg:w-96 bg-gray-50/50 flex flex-col border-l border-gray-200 shadow-xl z-20 h-full ${className || ""}`}>
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex justify-between items-center flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <List className="w-4 h-4 text-gray-500" />
            予定リスト
          </h2>
        </div>

        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
          title="全削除"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item) => (
          <ScheduleItem
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            dragOverItemId={dragOverItemId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onInsertAfter={onInsertAfter}
            onChangeStartTime={onChangeStartTime}
            onChangeEndTime={onChangeEndTime}
            onDragStart={handleListDragStart}
            onDragOver={handleListDragOver}
            onDrop={handleListDrop}
          />
        ))}
      </div>
    </div>
  );
};