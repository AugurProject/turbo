import { DateTime } from "luxon";

export function getUpcomingFriday4pmET(): number {
  const nowEastern = DateTime.now().setZone("America/New_York");
  const thisWeek = nowEastern.set({ weekday: 5, hour: 16, minute: 0, second: 0, millisecond: 0 });
  const past = thisWeek.diff(nowEastern).milliseconds < 0;
  const when = past ? thisWeek.plus({ week: 1 }) : thisWeek;
  return when.toSeconds();
}
