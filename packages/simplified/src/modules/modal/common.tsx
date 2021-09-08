import React from 'react';

import Styles from './modal.styles.less';
import { Icons, useAppStatusStore } from '@augurproject/comps';

export const Header = ({ title, subtitle = null, actionButton = null }) => {
  const {
    actions: { closeModal },
  } = useAppStatusStore();

  return (
    <div className={Styles.Header}>
      <span>{title}</span>
      {subtitle && (
        <div>
          <span>{subtitle.label}</span>
          <span>{subtitle.value}</span>
        </div>
      )}
      {actionButton}
      <button onClick={() => closeModal()}>{Icons.CloseIcon}</button>
    </div>
  );
};
