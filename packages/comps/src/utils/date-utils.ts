import { TWELVE_HOUR_TIME, TWENTY_FOUR_HOUR_TIME } from "./constants";

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

const DURATION_IN_SECONDS = {
  epochs: ["year", "month", "day", "hour", "minute", "second"],
  year: 31536000,
  month: 2592000,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
};

const getDuration = (seconds: number) => {
  let epoch: string = "";
  let interval: number = 0;

  for (let i = 0; i < DURATION_IN_SECONDS.epochs.length; i++) {
    epoch = DURATION_IN_SECONDS.epochs[i];
    interval = Math.floor(seconds / DURATION_IN_SECONDS[epoch]);
    if (interval >= 1) {
      return {
        interval,
        epoch,
      };
    }
  }

  return {
    interval,
    epoch,
  };
};

export const timeSinceTimestamp = (timestamp: number) => timeSince(timestamp * 1000);

export const timeSince = (timestamp: number) => {
  const now = new Date().getTime();
  const ts = new Date(timestamp).getTime();
  const seconds = Math.floor((now - ts) / 1000);
  const { interval, epoch } = getDuration(seconds);
  const suffix = interval >= 0 ? "s" : "";
  return `${interval} ${epoch}${suffix} ago`;
};

export const getDayFormat = (timestamp) => {
  if (!timestamp) return "N/A";
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const language = navigator?.language || "en-us";
  return date.toLocaleDateString(language, {
    month: "short",
    day: "numeric",
  });
  // const day = `0${date.getDate()}`.slice(-2);
  // const mon = shortMonths[Number(date.getMonth())];
  // return `${mon} ${day}`;
};

export const getTimeFormat = (timestamp, format = TWENTY_FOUR_HOUR_TIME) => {
  if (!timestamp) return "N/A";
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const language = navigator?.language || "en-us";
  return date.toLocaleTimeString(language, {
    hour: "numeric",
    minute: "numeric",
    hour12: format === TWELVE_HOUR_TIME,
  });
};

export const getDateFormat = (timestamp) => {
  if (!timestamp) return "N/A";
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const language = navigator?.language || "en-us";
  return date.toLocaleDateString(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getDateTimeFormat = (timestamp, format = TWENTY_FOUR_HOUR_TIME) => {
  if (!timestamp) return "N/A";
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const language = navigator?.language || "en-us";
  return date.toLocaleDateString(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: format === TWELVE_HOUR_TIME,
  });
};

export const getMarketEndtimeDate = (timestamp: string | number) => {
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const year = date.getFullYear();
  const monthDay = getDayFormat(timestamp);
  return `${monthDay}, ${year}`;
};

export const getMarketEndtimeFull = (timestamp: string | number, format = TWENTY_FOUR_HOUR_TIME) => {
  if (!timestamp) return "Missing";
  // use existing to make sure to be consistent
  const monthDayYear = getMarketEndtimeDate(timestamp);
  const timeHour = getTimeFormat(timestamp, format);

  const zone = new Date().toLocaleTimeString('en-us',{timeZoneName:'short'}).split(' ')[2];
  return `${monthDayYear} ${timeHour} (${zone})`;
};

export const getTimestampTimezoneOffSet = (timestamp: string | number) => {
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  // timezone offset comes in minutes
  const timezone = date.getTimezoneOffset() / 60;
  const direction = timezone < 0 ? "+" : "-";
  return `(UTC${direction}${Math.abs(timezone)})`;
};

export const getDayTimestamp = (timestamp: string) => {
  const inMilli = String(timestamp).length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  const date = new Date(inMilli);
  const day = `0${date.getDate()}`.slice(-2);
  const mon = `0${Number(date.getMonth()) + 1}`.slice(-2);
  const year = date.getFullYear();
  return Number(`${year}${mon}${day}`);
};
