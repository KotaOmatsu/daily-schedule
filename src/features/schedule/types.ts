export type ItemType = "activity" | "gap";

export type ScheduleItem = {
  id: string;
  type: ItemType;
  title: string;
  color: string;
  duration: number; // in minutes
};

export type ScheduleItemWithPos = ScheduleItem & {
  start: number;
};
