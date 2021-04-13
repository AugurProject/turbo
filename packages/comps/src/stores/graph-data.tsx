// import React, { useEffect } from "react";
import React from 'react';
import { DEFAULT_GRAPH_DATA_STATE, STUBBED_GRAPH_DATA_ACTIONS } from "./constants";
import { ApolloProvider } from "react-apollo";
import * as GraphClient from "../apollo/client";
import { useGraphData } from "./graph-data-hooks";

export const GraphDataContext = React.createContext({
  ...DEFAULT_GRAPH_DATA_STATE,
  actions: STUBBED_GRAPH_DATA_ACTIONS,
});

export const GraphDataStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_GRAPH_DATA_STATE }),
  actions: STUBBED_GRAPH_DATA_ACTIONS,
};
// default to GraphClient.client if no client is passed...
export const GraphDataProvider = ({ children, client = GraphClient.client }) => {
  const state = useGraphData();

  if (!GraphDataStore.actionsSet) {
    GraphDataStore.actions = state.actions;
    GraphDataStore.actionsSet = true;
  }
  const readableState = { ...state };
  delete readableState.actions;
  GraphDataStore.get = () => readableState;

  return (
    <ApolloProvider client={client}>
      <GraphDataContext.Provider value={state}>{children}</GraphDataContext.Provider>
    </ApolloProvider>
  );
};

export const useGraphDataStore = () => React.useContext(GraphDataContext);

const output = {
  GraphDataProvider,
  useGraphDataStore,
  GraphDataStore,
};

export default output;
