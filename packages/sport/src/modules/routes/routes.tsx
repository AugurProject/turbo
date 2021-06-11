import React from 'react';
import { Route, Switch, Redirect, withRouter } from 'react-router-dom';

import { Utils } from '@augurproject/comps';
import MarketsView from '../markets/markets-view';
import MarketView from '../market/market-view';
import { TestPage } from '../testPage/testPage';
import {
  MARKETS,
  MARKET,
  PORTFOLIO,
} from '../constants';
import PortfolioView from '../portfolio/portfolio-view';
const { PathUtils: { makePath } } = Utils;

const Routes = p => {
  return (
    <Switch>
      <Route path={makePath(PORTFOLIO)} component={PortfolioView} />
      <Route path={makePath(MARKETS)} component={MarketsView} />
      <Route path={makePath(MARKET)} component={MarketView} />
      <Route path={makePath('TEST')} component={TestPage} />
      <Redirect to={makePath(MARKETS)} />
    </Switch>
  );
};

export default withRouter(Routes);
