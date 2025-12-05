import React from "react";
import { GripVertical as DragHandleIcon, Trash2, Plus } from "lucide-react";
import type {
  ScheduleItemWithPos,
  ScheduleItem as ScheduleItemType,
} from "../../types";
import { formatTime, formatDuration } from "../../utils";
import { TOTAL_MINUTES } from "../../constants";
import { EditControls } from "./EditControls";

interface ScheduleItemProps {
  item: ScheduleItemWithPos;
  isSelected: boolean;
  dragOverItemId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<ScheduleItemType>) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
  onChangeStartTime: (id: string, minutes: number) => void;
  onChangeEndTime: (id: string, minutes: number) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

export const ScheduleItem: React.FC<ScheduleItemProps> = ({
  item,
  isSelected,
  dragOverItemId,
  onSelect,
  onUpdate,
  onDelete,
  onInsertAfter,
  onChangeStartTime,
  onChangeEndTime,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const isGap = item.type === "gap";
  if (isGap) return null;

  const startTimeStr = formatTime(item.start);
  const endTimeStr = formatTime(item.start + item.duration);

  const startH = Math.floor(item.start / 60);
  const startM = Math.floor(item.start % 60);
  const endH = Math.floor(((item.start + item.duration) % TOTAL_MINUTES) / 60);
  const endM = Math.floor(((item.start + item.duration) % TOTAL_MINUTES) % 60);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLInputElement).blur();
      onSelect(null);
    }
  };

  return (
    <div
      className="relative group/item"
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDrop={(e) => onDrop(e, item.id)}
    >
      {/* Drag Indicator Bar */}
      {dragOverItemId === item.id && (
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 rounded-full z-30 pointer-events-none transform -translate-y-1/2" />
      )}

      <div
        className={`
        relative rounded-xl p-3.5 border transition-all duration-200 z-10 pr-8 pl-9
        ${
          isSelected
            ? "border-blue-400 bg-white shadow-md scale-[1.02] ring-4 ring-blue-50/50"
            : "border-transparent bg-white shadow-sm hover:shadow-md hover:border-gray-200"
        }
        ${dragOverItemId === item.id ? "opacity-50" : ""}
      `}
        onClick={() => {
            // Prevent selection if clicking inputs
            onSelect(item.id)
        }}
      >
        {/* Drag Handle */}
        <div className="absolute top-1/2 left-2 -translate-y-1/2 p-1 text-gray-300 cursor-grab hover:text-gray-500 active:cursor-grabbing">
          <DragHandleIcon size={14} />
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className={`
          absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-20 opacity-0 ${isSelected ? "" : "group-hover/item:opacity-100"}
        `}
          title="削除"
        >
          <Trash2 size={14} />
        </button>

        {/* Content */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-3 flex-1 min-w-0 mt-1">
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: item.color }}
            />

            {isSelected ? (
              <input
                type="text"
                value={item.title}
                placeholder="新しい予定"
                onChange={(e) => onUpdate(item.id, { title: e.target.value })}
                onKeyDown={handleKeyDown}
                className="font-bold text-sm text-gray-800 bg-gray-50 px-2 py-1 rounded border border-blue-300 w-full focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-bold truncate text-gray-700">
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
                  onChangeStartTime(
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
                  onChangeStartTime(
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
                  onChangeEndTime(
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
                  onChangeEndTime(
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
          <EditControls
            item={item}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onComplete={() => onSelect(null)}
          />
        )}
      </div>

      {/* Insertion Zone */}
      <div className="h-6 -my-3 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-20 relative hover:opacity-100 pointer-events-none hover:pointer-events-auto">
        <div className="w-full h-px bg-blue-200 absolute"></div>
        <button
          onClick={() => onInsertAfter(item.id)}
          className="relative bg-white border border-blue-200 text-blue-500 rounded-full p-1 shadow-sm hover:scale-110 hover:bg-blue-50 transition-all pointer-events-auto"
          title="終了時刻から15mの予定を追加"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};