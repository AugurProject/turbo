import React from 'react';
import { Route, Switch, Redirect, withRouter } from 'react-router-dom';

import { Utils } from '@augurproject/comps';
import MarketsView from '../markets/markets-view';
import MarketView from '../market/market-view';
import {
  MARKETS,
  MARKET,
  PORTFOLIO,
  LIQUIDITY,
  MARKET_LIQUIDITY,
} from '../constants';
import PortfolioView from '../portfolio/portfolio-view';
import LiquidityView from '../liquidity/liquidity-view';
import MarketLiquidityView from '../liquidity/market-liquidity-view';
const { PathUtils: { makePath } } = Utils;

const Routes = p => {
  return (
    <Switch>
      <Route path={makePath(PORTFOLIO)} component={PortfolioView} />
      <Route path={makePath(MARKETS)} component={MarketsView} />
      <Route path={makePath(MARKET)} component={MarketView} />
      <Route path={makePath(LIQUIDITY)} component={LiquidityView} />
      <Route path={makePath(MARKET_LIQUIDITY)} component={MarketLiquidityView} />
      <Redirect to={makePath(MARKETS)} />
    </Switch>
  );
};

export default withRouter(Routes);
