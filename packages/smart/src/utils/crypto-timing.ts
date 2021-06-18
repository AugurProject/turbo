// TODO Calculate ET not EST. That means daylight savings time must be accounted for.
// 4pm EST is 8PM UTC, same day
export function getUpcomingFriday4pmEst(): Date {
  const FRIDAY = 5;
  const FOUR_PM_EST = 20; // UTC

  const d = new Date();

  // set date
  const today = d.getUTCDay();
  let dateAdjustment = FRIDAY - today;
  if (dateAdjustment < 0) dateAdjustment += 7;
  d.setUTCDate(d.getUTCDate() + dateAdjustment); // Date.setDate rolls over to the next month if needed

  // set hour
  const thisHour = d.getUTCHours();
  let hoursAdjustment = FOUR_PM_EST - thisHour;
  if (hoursAdjustment < 0) hoursAdjustment += 24;
  d.setUTCHours(thisHour + hoursAdjustment);

  // set minutes etc
  d.setUTCMinutes(0);
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);

  return d;
}
