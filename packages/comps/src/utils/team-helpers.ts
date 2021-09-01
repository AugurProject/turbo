import Teams from "./teams.json";
import Sports from "./sports.json";

export interface SportType {
  sport_id: string;
  name: string;
  categories: string[];
}

export interface TeamType {
  team_id: number;
  name: string;
  mascot: string;
  abbrevation: string;
  record?: string;
  sport_id: string;
}

export const getSportPerType = (sportType: string) => Object.values(Sports).find((s) => s.name === sportType);
export const getTeam = (teamId: string): TeamType => Teams[teamId];
export const getTeamName = (teamId: string): string => getTeam(teamId)?.name;
export const getTeamMascot = (teamId: string): string => getTeam(teamId)?.mascot;
export const getFullTeamName = (teamId: string): string =>
  `${getTeamName(teamId) || "Unknown"} ${getTeamMascot(teamId) || teamId}`;
export const getTeamAbbrevation = (teamId: string): string => getTeam(teamId)?.abbrevation;
export const getSportId = (teamId: string): string => getTeam(teamId)?.sport_id;
export const getSportName = (teamId: string): SportType => Sports[getSportId(teamId)]?.name;
export const getSportCategories = (teamId: string): string[] => Sports[getSportId(teamId)]?.categories;
export const getSportTypeCategories = (sportType: string): string[] => getSportPerType(sportType)?.categories;
export const getSportTypeSportId = (sportType: string): string => getSportPerType(sportType)?.sport_id;
