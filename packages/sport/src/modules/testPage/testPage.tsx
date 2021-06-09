import React from 'react';
import Styles from './textPage.styles.less';
import { BaseButton, BUTTON_TYPES } from '../common/new-buttons';

export const TestPage = () => {
  return (
    <div className={Styles.TestPage}>
      <BaseButton buttonType={BUTTON_TYPES.PRIMARY} />
    </div>
  )
}