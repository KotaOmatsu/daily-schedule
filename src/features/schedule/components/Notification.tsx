import React from "react";
import { Save, Check, AlertTriangle } from "lucide-react";

interface NotificationProps {
  notification: {
    message: string;
    type: "save" | "success" | "error";
  } | null;
}

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  return (
    <div
      className={`absolute bottom-6 right-6 lg:left-6 lg:right-auto lg:bottom-6 z-50 
        ${notification?.type === "error" ? "bg-red-600" : "bg-gray-800"}
        text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 transform
        ${
          notification
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
    >
      {notification?.type === "save" && (
        <Save size={14} className="text-green-400" />
      )}
      {notification?.type === "success" && (
        <Check size={14} className="text-green-400" />
      )}
      {notification?.type === "error" && (
        <AlertTriangle size={14} className="text-white" />
      )}
      {notification?.message}
    </div>
  );
};
