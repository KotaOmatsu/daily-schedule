import React, { useState } from "react";
import { useSchedule } from "./features/schedule/hooks/useSchedule";
import type { ScheduleItemWithPos } from "./features/schedule/types";
import { PieChart } from "./features/schedule/components/PieChart/PieChart";
import { Summary } from "./features/schedule/components/Summary";
import { ScheduleList } from "./features/schedule/components/ScheduleList/ScheduleList";
import { Notification } from "./features/schedule/components/Notification";
import { ConfirmationModal } from "./features/schedule/components/ConfirmationModal";

export default function DailySchedulePlanner() {
  const {
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
    reorderItems,
  } = useSchedule();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "save" | "success" | "error";
  } | null>(null);

  const showNotification = (
    message: string,
    type: "save" | "success" | "error" = "success"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleItemClick = (
    _e: React.MouseEvent,
    item: ScheduleItemWithPos,
    clickMinutes?: number
  ) => {
    // If clickMinutes is provided (from PieChart), use it for gap logic
    if (item.type === "gap" && clickMinutes !== undefined) {
      const newId = handleAddScheduleInGap(
        item.id,
        item.start,
        item.duration,
        clickMinutes
      );
      if (newId) {
        setSelectedItemId(newId);
      }
    } else {
      setSelectedItemId(item.id);
    }
  };

  const handleInsertAfterWrapper = (id: string) => {
      const newId = handleInsertScheduleAfter(id);
      if (newId) setSelectedItemId(newId);
  }

  // Ensure items is never null before render (hook handles initialization but safe check)
  if (!items) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col lg:flex-row h-screen overflow-hidden relative">
      <ConfirmationModal
        show={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          executeClearAll();
          setSelectedItemId(null);
          setShowResetConfirm(false);
        }}
      />

      <Notification notification={notification} />

      {/* --- Left Panel: Pie Chart & Summary --- */}
      <div className="flex-1 flex flex-col items-center p-6 bg-white shadow-sm lg:border-r border-gray-200 relative overflow-y-auto custom-scrollbar">
        <PieChart
          itemsWithPos={itemsWithPos}
          setItems={setItems}
          selectedItemId={selectedItemId}
          onItemClick={handleItemClick}
          showNotification={showNotification}
        />

        <Summary items={items} />
      </div>

      {/* --- Right Panel: Editor List --- */}
      <ScheduleList
        items={itemsWithPos}
        selectedItemId={selectedItemId}
        onSelect={setSelectedItemId}
        onUpdate={handleUpdateItem}
        onDelete={(id) => {
            handleDeleteItem(id);
            if (selectedItemId === id) setSelectedItemId(null);
        }}
        onInsertAfter={handleInsertAfterWrapper}
        onChangeStartTime={handleChangeStartTime}
        onChangeEndTime={handleChangeEndTime}
        onClearAll={() => setShowResetConfirm(true)}
        onReorder={reorderItems}
      />
    </div>
  );
}
