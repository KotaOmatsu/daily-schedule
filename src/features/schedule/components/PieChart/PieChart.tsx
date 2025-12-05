import React, { useRef, useState, useEffect } from "react";
import { Copy, Download, Plus } from "lucide-react";
import type { ScheduleItem, ScheduleItemWithPos } from "../../types";
import {
  CENTER,
  RADIUS,
  TOTAL_MINUTES,
} from "../../constants";
import {
  minutesToAngle,
  getCoordinatesForAngle,
  mergeAdjacentGaps,
} from "../../utils";
import { Slice } from "./Slice";
import { CenterInfo } from "./CenterInfo";

interface PieChartProps {
  itemsWithPos: ScheduleItemWithPos[];
  setItems: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  selectedItemId: string | null;
  onItemClick: (e: React.MouseEvent, item: ScheduleItemWithPos, clickMinutes: number) => void;
  onInsertAfter: (id: string) => void;
  showNotification: (message: string, type?: "save" | "success" | "error") => void;
}

export const PieChart: React.FC<PieChartProps> = ({
  itemsWithPos,
  setItems,
  selectedItemId,
  onItemClick,
  onInsertAfter,
  showNotification,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

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

   // --- Export Functions ---
  const handleExportImage = async (action: "download" | "copy") => {
    if (!svgRef.current) return;

    try {
      const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const elementsToRemove = svgClone.querySelectorAll(
        '[data-export-ignore="true"], [data-export-hide="true"], .export-ignore, .export-hide'
      );
      elementsToRemove.forEach((el) => el.remove());

      // Apply font size and position adjustments for export image
      const styleElement = svgClone.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElement.textContent = `
        .text-label-title {
          font-size: 5px !important;
          transform: translateY(-2px); /* Adjust vertical position */
        }
        .fill-gray-400.font-medium {
          font-size: 5px !important;
          transform: translateY(-2px); /* Adjust vertical position */
        }
        .fill-gray-400.select-none.tracking-widest {
            font-size: 7px !important;
            transform: translateY(-1px); /* Adjust vertical position */
        }
        .text-xl.font-bold.fill-gray-800.select-none {
            font-size: 10px !important;
            transform: translateY(-2px); /* Adjust vertical position */
        }
      `;
      svgClone.prepend(styleElement);

      // Adjust title Y position after duration is removed
      svgClone.querySelectorAll('.text-label-title').forEach((el) => {
          const currentY = parseFloat(el.getAttribute('y') || '0');
          el.setAttribute('y', (currentY + 6).toString()); // Shift down by half of removed duration text offset
      });

      // Recalculate time marker positions to be closer to the circle for export
      svgClone.querySelectorAll('.fill-gray-400.font-medium').forEach((el, i) => {
          const angle = (i / 24) * 360;
          // Calculate new position with smaller offset (15 instead of 25)
          // Duplicate logic from getCoordinatesForAngle locally since we can't import it easily inside this scope if it wasn't bundled, 
          // but we can just reproduce the math.
          const rad = (angle - 90) * (Math.PI / 180);
          const r = RADIUS + 15; // Closer offset
          const x = CENTER + r * Math.cos(rad);
          const y = CENTER + r * Math.sin(rad);
          
          el.setAttribute('x', x.toString());
          el.setAttribute('y', y.toString());
      });

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

  // Calculate button position for selected item
  const selectedItem = selectedItemId ? itemsWithPos.find(i => i.id === selectedItemId) : null;
  let addButtonPos = null;
  if (selectedItem && activeDragIndex === null) {
    const endAngle = minutesToAngle(selectedItem.start + selectedItem.duration);
    addButtonPos = getCoordinatesForAngle(endAngle, -RADIUS / 3); // Position 4px more central
  }

  return (
    <div className="relative w-full max-w-[400px] aspect-square select-none mb-8 mt-4 flex-shrink-0 group/chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
        className="w-full h-full drop-shadow-2xl overflow-visible"
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="white" />
        {React.useMemo(() => {
          return itemsWithPos
            .map((item) => ({
              ...item,
              isSelected: selectedItemId === item.id,
            }))
            .sort((a, b) => (a.isSelected ? 1 : 0) - (b.isSelected ? 1 : 0));
        }, [itemsWithPos, selectedItemId]).map((item) => (
          <Slice
            key={item.id}
            item={item}
            isSingleItem={itemsWithPos.length === 1}
            isSelected={item.isSelected}
            onClick={(e, item) => {
              const clickMinutes = getMinutesFromEvent(e);
              onItemClick(e, item, clickMinutes);
            }}
          />
        ))}
        
        {/* Markers */}
        {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360;
            const pos = getCoordinatesForAngle(angle, 25); // Revert to original offset
            return (
            <text
                key={i}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-gray-400 font-medium select-none pointer-events-none" // Revert to original font size
            >
                {i}
            </text>
            );
        })}

        {/* Drag Handles */}
        {itemsWithPos.length > 1 &&
          itemsWithPos.map((item, index) => {
            const endMinutes = item.start + item.duration;
            const angle = minutesToAngle(endMinutes);
            const pos = getCoordinatesForAngle(angle);

            return (
              <g
                key={`handle-${index}`}
                className="cursor-pointer group export-ignore"
                onMouseDown={(e) => handleDragStart(index, e)}
                onTouchStart={(e) => handleDragStart(index, e)}
                style={{ cursor: "grab" }}
                data-export-ignore="true"
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

        <CenterInfo />

        {/* Add Button for Selected Item */}
        {addButtonPos && selectedItem && (
          <g
            className="cursor-pointer export-ignore"
            onClick={(e) => {
              e.stopPropagation();
              onInsertAfter(selectedItem.id);
            }}
            data-export-ignore="true"
          >
            <circle
              cx={addButtonPos.x}
              cy={addButtonPos.y}
              r={8}
              className="fill-blue-500 stroke-white stroke-2 shadow-lg"
            />
            <g transform={`translate(${addButtonPos.x - 6}, ${addButtonPos.y - 6})`}>
              <Plus size={12} strokeWidth={3} color="white" />
            </g>
          </g>
        )}
      </svg>
      
      <div
            className="absolute bottom-0 right-0 flex flex-col gap-2 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300"
            data-html2canvas-ignore="true" 
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
  );
};