import React from "react";
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
}

export const Slice: React.FC<SliceProps> = ({
  item,
  isSingleItem,
  isSelected,
  onClick,
}) => {
  const commonClasses = `transition-all duration-300 cursor-pointer ${
    item.type === "gap" ? "hover:fill-gray-100" : "hover:opacity-90"
  } ${isSelected ? "stroke-blue-500 stroke-[2px] z-10 relative" : ""}`;

  return (
    <g>
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
        className="text-[9px] font-bold fill-gray-800 drop-shadow-sm"
      >
        {item.title}
      </text>
      <text
        x={pos.x}
        y={pos.y + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[7px] fill-gray-500"
        data-export-hide="true"
      >
        {formatDuration(item.duration)}
      </text>
    </g>
  );
};
