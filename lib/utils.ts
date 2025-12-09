import { format } from "date-fns";

export function todayKey(d = new Date()) {
  return format(d, "yyyy-MM-dd");
}
