import React, { useEffect } from "react";
import { DEFAULT_SPORT_STATE, STUBBED_SPORT_ACTIONS, SPORT_STATE_KEYS, LOCAL_STORAGE_SETTINGS_THEME } from "./constants";
import { useSport } from "./sport-hooks";
import { useUserStore, Stores } from "@augurproject/comps";

const {
 Utils: { getSavedUserInfo },
} = Stores;

const { SETTINGS } = SPORT_STATE_KEYS;

export const SportContext = React.createContext({
  ...DEFAULT_SPORT_STATE,
  actions: STUBBED_SPORT_ACTIONS,
});

export const SportStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_SPORT_STATE }),
  actions: STUBBED_SPORT_ACTIONS,
};

const useLoadUserSettings = () => {
  const { account } = useUserStore();
  useEffect(() => {
    if (account) {
      const savedUserSettings = getSavedUserInfo(account)[LOCAL_STORAGE_SETTINGS_THEME];
      if (savedUserSettings) {
        SportStore.actions.updateSettings(savedUserSettings);
      }
    } else {
      SportStore.actions.updateSettings(DEFAULT_SPORT_STATE[SETTINGS]);
    }
  }, [account]);
};

export const SportProvider = ({ children }: any) => {
  const state = useSport();

  useLoadUserSettings();

  if (!SportStore.actionsSet) {
    SportStore.actions = state.actions;
    SportStore.actionsSet = true;
  }
  const readableState = { ...state };
  delete readableState.actions;
  SportStore.get = () => readableState;

  return <SportContext.Provider value={state}>{children}</SportContext.Provider>;
};

export const useSportsStore = () => React.useContext(SportContext);
