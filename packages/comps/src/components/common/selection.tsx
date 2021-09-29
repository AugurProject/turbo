import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import Styles from "./selection.styles.less";
import {
  CheckedRadioButton,
  EmptyCheckbox,
  EthIcon,
  FilledCheckbox,
  RadioButton,
  SimpleChevron,
  UsdIcon,
  SimpleCheck,
} from "./icons";
import { USDC, ETH, COMING_SOON, THEME_OPTIONS } from "../../utils/constants";
import { TinyThemeButton } from "./buttons";
import { generateTooltip } from "./labels";
import { useUserStore } from "../../stores/user";

export interface NameValuePair {
  label: string;
  value: string | number;
  icon?: any;
  disabled?: boolean;
}

export interface DropdownProps {
  id?: string;
  onChange: any;
  className?: string;
  defaultValue?: string | number;
  options?: NameValuePair[];
  staticLabel?: string;
  staticMenuLabel?: string;
  sortByStyles?: object;
  openTop?: boolean;
  activeClassName?: string;
  showColor?: boolean;
  disabled?: boolean;
  sort?: boolean;
  preLabel?: string;
  preLabelClean?: boolean;
  dontCheckInvalid?: boolean;
}

function findSelected(options, defaultVal) {
  const foundOption = options.find((o) => o.value === defaultVal);
  const defaultValue = defaultVal
    ? {
        label: defaultVal.toString(),
        value: defaultVal,
      }
    : null;

  return foundOption ? foundOption : defaultValue;
}

export const Dropdown = ({
  options,
  defaultValue,
  sortByStyles,
  openTop,
  className,
  activeClassName,
  staticLabel,
  id,
  showColor,
  disabled,
  preLabel,
  preLabelClean,
  onChange,
}: DropdownProps) => {
  const labelRef = useRef(null);
  const refDropdown = useRef(null);
  const [selected, setSelected] = useState(defaultValue !== null ? findSelected(options, defaultValue) : null);

  useEffect(() => {
    setSelected(defaultValue !== null ? findSelected(options, defaultValue) : null);
  }, [defaultValue]);

  const handleWindowOnClick = (event: MouseEvent) => {
    if (refDropdown?.current && !refDropdown?.current.contains(event.target)) {
      setShowList(false);
    }
  };

  useEffect(() => {
    window.addEventListener("click", handleWindowOnClick);
    return () => {
      window.removeEventListener("click", handleWindowOnClick);
    };
  }, []);

  const [showList, setShowList] = useState(false);
  const dropdownSelect = (selectedVal: NameValuePair) => {
    if (selectedVal !== selected) {
      setSelected(selectedVal);

      if (onChange) {
        onChange(selectedVal.value);
      }

      toggleList();
    }
  };

  const toggleList = () => {
    setShowList(!showList);
  };

  return (
    <div
      style={sortByStyles}
      className={classNames(className, {
        [Styles.Normal]: true,
        [Styles.isOpen]: showList,
        [Styles.openTop]: openTop,
        [`${activeClassName}`]: showList,
        [Styles.showColor]: showColor,
        [Styles.Disabled]: disabled,
        [Styles.Labeled]: !!preLabel || preLabelClean,
      })}
      ref={refDropdown}
      role="button"
      tabIndex={0}
      onClick={toggleList}
      data-tip
      data-for={"dropdown-" + id + staticLabel}
      data-iscapture={true}
    >
      {preLabel && <span>{`${preLabel}${preLabelClean ? "" : ":"}`}</span>}
      <button
        className={classNames(Styles.label, {
          [Styles.SelectedLabel]: selected,
        })}
      >
        <span ref={labelRef}>
          {selected?.icon ? selected.icon : null}
          {selected ? selected.label : staticLabel}
        </span>
        {SimpleChevron}
      </button>
      <div>
        <div
          className={classNames(Styles.list, {
            [`${Styles.active}`]: showList,
          })}
        >
          {options.map(({ label, value, disabled }) => (
            <button
              key={`${value}${label}`}
              value={value}
              title={`${label}${disabled ? ` - ${COMING_SOON}` : ""}`}
              disabled={disabled}
              onClick={() => !disabled && dropdownSelect({ label, value, disabled })}
              className={classNames({
                [Styles.Selected]: value === selected?.value,
              })}
            >
              {label}
              {value === selected?.value && SimpleCheck}
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <select
          onChange={(e) => {
            dropdownSelect(e.target.options[e.target.selectedIndex]);
          }}
          value={selected.value}
        >
          {options.map(({ value, label }) => (
            <option key={`${value}${label}`} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export const SquareDropdown = (props: DropdownProps) => <Dropdown {...props} />;

export const SmallDropdown = (props: DropdownProps) => <Dropdown {...props} className={Styles.SmallDropdown} />;

const currencyValues = [
  { label: USDC, value: USDC, icon: UsdIcon },
  { label: ETH, value: ETH, icon: EthIcon },
];

export const CurrencyDropdown = (props: DropdownProps) => (
  <Dropdown {...props} options={currencyValues} className={Styles.CurrencyDropdown} />
);

const Checkbox = ({ key, item, initialSelected, updateSelected }) => {
  const [selected, setSelected] = useState(initialSelected);
  return (
    <div
      key={key}
      onClick={(e) => {
        e.preventDefault();
        setSelected(!selected);
        updateSelected(!selected);
      }}
      className={classNames(Styles.Checkbox, { [Styles.Selected]: selected })}
    >
      {selected ? FilledCheckbox : EmptyCheckbox}

      <span>{item.label}</span>
    </div>
  );
};

export const CheckboxGroup = ({ title, items }) => {
  const [selectedItems, setSelectedItems] = useState(items);

  const updateSelected = (selected, index) => {
    let updatedItems = selectedItems;
    updatedItems[index].selected = !updatedItems[index].selected;
    setSelectedItems(updatedItems);
  };
  return (
    <div className={Styles.SelectionGroup}>
      <span>{title}</span>
      <div>
        {selectedItems.map((item, index) => (
          <Checkbox
            item={item}
            key={item.value}
            initialSelected={selectedItems[index].selected}
            updateSelected={(selected) => updateSelected(selected, index)}
          />
        ))}
      </div>
    </div>
  );
};

const RadioBar = ({ key, item, selected, onClick, disabled = false }) => {
  if (disabled) {
    return (
      <div key={key} className={classNames(Styles.RadioBar, { [Styles.Selected]: selected })}>
        {RadioButton}
        <span>{item.label}</span>
        {generateTooltip(COMING_SOON, key)}
      </div>
    );
  }
  return (
    <div
      key={key}
      onClick={(e) => {
        if (!disabled) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={classNames(Styles.RadioBar, { [Styles.Selected]: selected, [Styles.Disabled]: disabled })}
    >
      {selected ? CheckedRadioButton : RadioButton}
      <span>{item.label}</span>
    </div>
  );
};

export const RadioBarGroup = ({ title, items, selected, update }) => {
  const [selectedItem, setSelectedItem] = useState(selected);
  useEffect(() => {
    setSelectedItem(selected);
  }, [selected]);
  return (
    <div className={Styles.SelectionGroup}>
      <span>{title}</span>
      <div>
        {items.map((item) => (
          <RadioBar
            item={item}
            key={item.value}
            disabled={item.disabled}
            selected={selectedItem === item.value}
            onClick={() => {
              update(item.value);
              setSelectedItem(item.value);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const MultiButtonSelection = ({ options, selection, setSelection }) => (
  <ul className={Styles.MultiButtonSelection}>
    {options.map(({ id, label }) => (
      <li key={`option-${id}`}>
        <TinyThemeButton
          text={label}
          selected={selection === id}
          action={() => selection !== id && setSelection(id)}
          noHighlight
        />
      </li>
    ))}
  </ul>
);

export interface ThemeSettingsLabelProps {
  theme: string | null;
  updateSettings: (any, string) => void;
  wrapperCustomClass?: any;
  buttonCustomClass?: any;
};

export const ThemeSettingsLabel = ({ theme, updateSettings, wrapperCustomClass = null, buttonCustomClass = null }: ThemeSettingsLabelProps) => {
  const { account } = useUserStore();
  return (
    <>
      <label htmlFor="Theme">Theme</label>
      <div className={wrapperCustomClass} id="Theme">
        <TinyThemeButton
          customClass={{ [buttonCustomClass]: theme === THEME_OPTIONS.LIGHT }}
          text={THEME_OPTIONS.LIGHT}
          action={() => updateSettings({ theme: THEME_OPTIONS.LIGHT }, account)}
        />
        <TinyThemeButton
          customClass={{ [buttonCustomClass]: theme === THEME_OPTIONS.DARK }}
          text={THEME_OPTIONS.DARK}
          action={() => updateSettings({ theme: THEME_OPTIONS.DARK }, account)}
        />
        <TinyThemeButton
          customClass={{ [buttonCustomClass]: theme === THEME_OPTIONS.AUTO }}
          text={THEME_OPTIONS.AUTO}
          action={() => updateSettings({ theme: THEME_OPTIONS.AUTO }, account)}
        />
      </div>
    </>
  );
};
