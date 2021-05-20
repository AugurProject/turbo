import React from 'react';
import { Route, Switch, Redirect, withRouter } from 'react-router-dom';

import { Utils } from '@augurproject/comps';
import MarketsView from '../markets/markets-view';
// import MarketView from '../market/market-view';
import {
  MARKETS,
  MARKET,
  PORTFOLIO,
} from '../constants';
// import PortfolioView from '../portfolio/portfolio-view';
const { PathUtils: { makePath } } = Utils;

const fakemarketView = () => (<div>Market Page</div>);
const fakemyBets = () => (<div>My Bets</div>);
const Routes = p => {
  return (
    <Switch>
      <Route path={makePath(PORTFOLIO)} component={fakemyBets} />
      <Route path={makePath(MARKETS)} component={MarketsView} />
      <Route path={makePath(MARKET)} component={fakemarketView} />
      <Redirect to={makePath(MARKETS)} />
    </Switch>
  );
};

export default withRouter(Routes);
