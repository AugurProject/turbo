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

export const getTeam = (teamId: string): TeamType => Teams[teamId];
export const getTeamName = (teamId: string): string => getTeam(teamId)?.name;
export const getTeamMascot = (teamId: string): string => getTeam(teamId)?.mascot;
export const getFullTeamName = (teamId: string): string => `${getTeamName(teamId)} ${getTeamMascot(teamId)}`;
export const getTeamAbbrevation = (teamId: string): string => getTeam(teamId)?.abbrevation;
export const getSportId = (teamId: string): string => getTeam(teamId)?.sport_id;
export const getSportName = (teamId: string): SportType => Sports[getSportId(teamId)]?.name;
export const getSportCategories = (teamId: string): SportType => Sports[getSportId(teamId)]?.categories;
