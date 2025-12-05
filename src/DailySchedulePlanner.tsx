import React, { useState, useEffect } from "react";
import { PieChart as PieChartIcon, List } from "lucide-react";
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

  // Mobile View Toggle: 'chart' or 'list'
  const [mobileView, setMobileView] = useState<"chart" | "list">("chart");

  // Auto-switch to list view on mobile when an item is selected
  useEffect(() => {
    if (selectedItemId) {
      setMobileView("list");
    }
  }, [selectedItemId]);

  const showNotification = (
    message: string,
    type: "save" | "success" | "error" = "success"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectWrapper = (id: string | null) => {
    // Validate current item before changing selection (unless selecting the same item)
    if (selectedItemId && selectedItemId !== id) {
      const currentSelectedItem = items.find((item) => item.id === selectedItemId);
      if (
        currentSelectedItem &&
        currentSelectedItem.type === "activity" &&
        !currentSelectedItem.title.trim()
      ) {
        showNotification("予定名を記入してください。", "error");
        return;
      }
    }
    setSelectedItemId(id);
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
        handleSelectWrapper(newId);
      }
    } else {
      handleSelectWrapper(item.id);
    }
  };

  const handleInsertAfterWrapper = (id: string) => {
    const newId = handleInsertScheduleAfter(id);
    if (newId) handleSelectWrapper(newId);
  };

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

      {/* --- Mobile View Toggle Button --- */}
      <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex bg-white rounded-full shadow-xl p-1 border border-gray-200">
        <button
          onClick={() => setMobileView("chart")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            mobileView === "chart"
              ? "bg-gray-900 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <PieChartIcon size={16} />
          Chart
        </button>
        <button
          onClick={() => setMobileView("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            mobileView === "list"
              ? "bg-gray-900 text-white shadow-md"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <List size={16} />
          List
        </button>
      </div>

      {/* --- Left Panel: Pie Chart & Summary --- */}
      <div className={`${mobileView === 'chart' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col items-center p-6 bg-white shadow-sm lg:border-r border-gray-200 relative overflow-y-auto custom-scrollbar w-full h-full lg:h-auto`}>
        <PieChart
          itemsWithPos={itemsWithPos}
          setItems={setItems}
          selectedItemId={selectedItemId}
          onItemClick={handleItemClick}
          onInsertAfter={handleInsertAfterWrapper}
          showNotification={showNotification}
        />

        <Summary items={items} />
      </div>

      {/* --- Right Panel: Editor List --- */}
      <ScheduleList
        className={`${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 h-full lg:h-auto`}
        items={itemsWithPos}
        selectedItemId={selectedItemId}
        onSelect={handleSelectWrapper}
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
