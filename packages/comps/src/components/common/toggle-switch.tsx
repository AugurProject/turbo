import React from 'react';
import Styles from './toggle-switch.styles.less';
import classNames from 'classnames';

export interface ToggleSwitchProps {
  toggle?: boolean;
  setToggle: Function;
  button1Text?: string;
  button2Text?: string;
  buySell?: boolean;
  id?: string;
  clean?: boolean;
}

export const ToggleSwitch = ({
  toggle,
  setToggle,
  button1Text = 'On',
  button2Text = 'Off',
  buySell,
  id,
  clean = false,
}: ToggleSwitchProps) => (
  <button
    className={classNames(Styles.ToggleSwitch, {
      [Styles.On]: toggle,
      [Styles.buySell]: buySell,
      [Styles.clean]: clean,
    })}
    onClick={() => setToggle()}
    id={id}
  >
    <span>{!clean && button1Text}</span>
    <span>{!clean && button2Text}</span>
    <div />
  </button>
);

export const BuySellToggleSwitch = ({ toggle, setToggle }) => (
  <ToggleSwitch
    button1Text="Buy"
    toggle={toggle}
    setToggle={setToggle}
    button2Text="Sell"
    buySell
  />
);
