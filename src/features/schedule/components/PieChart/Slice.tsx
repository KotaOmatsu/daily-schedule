import React from "react";
import { Plus } from "lucide-react";
import type { ScheduleItemWithPos } from "../../types";
import {
  createSlicePath,
  minutesToAngle,
  getCoordinatesForAngle,
  formatDuration,
} from "../../utils";
import { CENTER, RADIUS } from "../../constants";

interface SliceProps {
  item: ScheduleItemWithPos;
  isSingleItem: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent, item: ScheduleItemWithPos) => void;
  onInsertAfter: (id: string) => void;
}

export const Slice: React.FC<SliceProps> = ({
  item,
  isSingleItem,
  isSelected,
  onClick,
  onInsertAfter,
}) => {
  const commonClasses = `transition-all duration-300 cursor-pointer ${
    item.type === "gap" ? "hover:fill-gray-100" : "hover:opacity-90"
  } ${isSelected ? "stroke-blue-500 stroke-[2px] z-10 relative" : ""}`;

  // Calculate position for the "+" button (end of the slice)
  const endAngle = minutesToAngle(item.start + item.duration);
  // Position slightly outside the radius to be distinct
  const buttonPos = getCoordinatesForAngle(endAngle, RADIUS + 14);

  return (
    <g className="group/slice">
      {isSingleItem ? (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill={item.color}
          stroke="white"
          strokeWidth={item.type === "gap" ? 1 : 2}
          className={commonClasses}
          onClick={(e) => onClick(e, item)}
        />
      ) : (
        <path
          d={createSlicePath(item.start, item.duration)}
          fill={item.color}
          stroke="white"
          strokeWidth={item.type === "gap" ? 1 : 2}
          className={commonClasses}
          onClick={(e) => onClick(e, item)}
        />
      )}

      {/* Label */}
      {item.type !== "gap" && item.duration >= 30 && <Label item={item} />}

      {/* Add Button */}
      <g
        className="opacity-0 group-hover/slice:opacity-100 transition-opacity duration-200 cursor-pointer z-50"
        onClick={(e) => {
          e.stopPropagation();
          onInsertAfter(item.id);
        }}
        // Ensure the button is rendered on top of other elements visually
        style={{ pointerEvents: "all" }}
      >
        <circle
          cx={buttonPos.x}
          cy={buttonPos.y}
          r={10}
          className="fill-white stroke-blue-500 stroke-1 shadow-sm hover:fill-blue-50"
        />
        <foreignObject
          x={buttonPos.x - 7}
          y={buttonPos.y - 7}
          width={14}
          height={14}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center w-full h-full text-blue-500">
            <Plus size={14} strokeWidth={3} />
          </div>
        </foreignObject>
      </g>
    </g>
  );
};

const Label = ({ item }: { item: ScheduleItemWithPos }) => {
  const midAngle = minutesToAngle(item.start + item.duration / 2);
  const pos = getCoordinatesForAngle(midAngle, -RADIUS * 0.35);
  return (
    <g className="pointer-events-none">
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
};