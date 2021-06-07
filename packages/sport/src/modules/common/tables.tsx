import React from "react";

export const EventBetsTable = ({ EventPositionData = {} }) => {
  if (!Object.keys(EventPositionData).length) return null;

  console.log(EventPositionData);
};
