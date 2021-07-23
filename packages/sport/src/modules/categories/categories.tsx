import React, { useMemo } from "react";
import Styles from "./categories.styles.less";
import classNames from "classnames";
import { Icons, Constants, Formatter } from "@augurproject/comps";
import { MarketInfo } from "@augurproject/comps/build/types";
import { useSportsStore } from "modules/stores/sport";

const { SPORTS, POLITICS } = Constants;
const { CATEGORIES_ICON_MAP, SimpleChevron } = Icons;
const { formatNumber } = Formatter;

const CATEGORIES_TO_CARE_ABOUT = [SPORTS, POLITICS];
const DEFAULT_SELECTED_CATEGORY_HEADING = "Popular Markets";
const DEFAULT_NAVIGATION_LABEL = "Explore Categories";
const DEFAULT_BACK_OPTION = "All Categories";
const DEFAULT_CLEAR_ACTION = { subCategories: [], primaryCategory: "" };

const handleCategoryMap = (categoriesToPull = [], pullFrom = {}) =>
  categoriesToPull.reduce((acc, category) => {
    const categoryInfo = pullFrom[category.toLowerCase()];
    acc[category] = categoryInfo;
    return acc;
  }, {});

const determineCount = (category, markets) =>
  Object.entries(markets).filter(([marketId, marketInfo]: [string, MarketInfo]) =>
    marketInfo?.categories.some((c) => c.toLowerCase() === category.toLowerCase())
  ).length;

const formatCategoryCount = (numCats) =>
  formatNumber(numCats, {
    decimals: 0,
    decimalsRounded: 0,
    zeroStyled: true,
    blankZero: false,
    bigUnitPostfix: true,
  }).full;

export const CategoriesArea = ({ filteredMarkets, inverted = false }) => {
  const { marketsViewSettings } = useSportsStore();
  const { primaryCategory, subCategories } = marketsViewSettings;
  const selectedCategories = [primaryCategory].concat(subCategories);
  return (
    <article className={classNames(Styles.CategoriesArea, { [Styles.Inverted]: inverted })}>
      <CategoriesAreaTitle text={selectedCategories[selectedCategories.length - 1]} />
      <NavigationArea selectedCategories={selectedCategories} markets={filteredMarkets} />
    </article>
  );
};

export const CategoriesAreaTitle = ({ text }) => <h2>{text || DEFAULT_SELECTED_CATEGORY_HEADING}</h2>;

export const NavigationArea = ({ selectedCategories = [], markets = [] }) => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSportsStore();
  const { primaryCategory, subCategories } = marketsViewSettings;
  const topLevel = handleCategoryMap(CATEGORIES_TO_CARE_ABOUT, CATEGORIES_ICON_MAP);
  const categoryGroups = !primaryCategory ? (
    <>
      {Object.entries(topLevel).map((categoryInfo, i) => (
        <CategoryGroup {...{ categoryInfo, markets, key: `category-group-${i}` }} />
      ))}
    </>
  ) : (
    <>
      {Object.entries(topLevel)
        .filter(([label, info]) => primaryCategory === label)
        .map((categoryInfo, i) => (
          <CategoryGroup {...{ categoryInfo, markets, key: `category-group-${i}` }} />
        ))}
    </>
  );
  const content = !primaryCategory ? (
    <>
      <h3>{DEFAULT_NAVIGATION_LABEL}</h3>
      {categoryGroups}
    </>
  ) : (
    <>
      <RemoveCategoryOption
        category={DEFAULT_BACK_OPTION}
        action={() => updateMarketsViewSettings(DEFAULT_CLEAR_ACTION)}
      />
      {subCategories.map((label, index) => {
        const category = index ? subCategories[0] : primaryCategory;
        const updatedSubCategories = index ? subCategories.filter((v) => v !== label) : [];
        const action = () => updateMarketsViewSettings({ primaryCategory, subCategories: updatedSubCategories });
        return <RemoveCategoryOption {...{ category, action, key: `${label}-remove` }} />;
      })}
      {categoryGroups}
    </>
  );
  return <>{content}</>;
};

const RemoveCategoryOption = ({ category = DEFAULT_BACK_OPTION, action = () => {} }) => (
  <button className={Styles.RemoveCategoryButton} onClick={action}>
    {category && <span>{SimpleChevron}</span>}
    {category || DEFAULT_NAVIGATION_LABEL}
  </button>
);

const CategoryGroup = ({ categoryInfo, markets }) => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSportsStore();
  const { primaryCategory, subCategories } = marketsViewSettings;
  const [label, info] = categoryInfo;
  const subOptionList = Object.entries(info?.subOptions);
  const subCategoryList = subCategories.length
    ? subOptionList.filter(([optLabel, optInfo]) => subCategories[0] === optLabel)
    : subOptionList;
  const categoryCount = determineCount(label, markets);
  const secondaryCategory = subCategories[0];
  const filteredLeaves = useMemo(
    () =>
      Object.entries(markets).reduce((acc, [marketId, marketInfo]: [string, MarketInfo]) => {
        const { categories } = marketInfo;
        if (
          secondaryCategory &&
          categories &&
          (categories[1] || "").toLowerCase() === secondaryCategory.toLowerCase() &&
          !acc.includes(categories[2].toLowerCase())
        ) {
          acc.push(categories[2].toLowerCase());
        }
        return acc;
      }, []),
    [subCategories]
  );

  return (
    <article className={Styles.CategoryGroup}>
      {!subCategories.length && (
        <h4
          className={classNames({ [Styles.SelectedCategory]: primaryCategory === label })}
          onClick={() => updateMarketsViewSettings({ primaryCategory: label, subCategories: [] })}
        >
          {label}
          <span>{formatCategoryCount(categoryCount)}</span>
        </h4>
      )}
      {subCategories.length < 2 &&
        subCategoryList.map(([subLabel, subInfo], i) => (
          <button
            key={i}
            className={classNames({
              [Styles.SelectedCategory]: subCategories.length > 0 && subCategories[0] === subLabel,
            })}
            onClick={() => updateMarketsViewSettings({ primaryCategory: label, subCategories: [subLabel] })}
          >
            {(subInfo as any)?.icon} {subLabel} <span>{formatCategoryCount(determineCount(subLabel, markets))}</span>
          </button>
        ))}
      {!!subCategories.length && (
        <>
          {filteredLeaves.map((tertiaryLabel, i) => (
            <button
              key={i}
              className={classNames({
                [Styles.SelectedCategory]: subCategories.length > 1 && subCategories[1] === tertiaryLabel,
              })}
              onClick={() =>
                updateMarketsViewSettings({ primaryCategory: label, subCategories: [subCategories[0], tertiaryLabel] })
              }
            >
              {tertiaryLabel}
              <span>{formatCategoryCount(determineCount(tertiaryLabel, markets))}</span>
            </button>
          ))}
        </>
      )}
    </article>
  );
};

export const CategoriesTrail = ({ categories }) => (
  <span className={Styles.CategoriesTrail}>
    {categories.map((category, index) => {
      return (
        <span key={index}>
          {category}
          {`${index !== categories.length - 1 ? " / " : ""}`}
        </span>
      );
    })}
  </span>
);

const EVENT_TYPE_OPTIONS = [
  {
    id: 0,
    label: "Daily",
  },
  {
    id: 1,
    label: "Futures",
  },
];

export const DailyFutureSwitch = ({ selection, setSelection }) => {
  return (
    <article className={Styles.DailyFutureSwitch}>
      {EVENT_TYPE_OPTIONS.map(({ id, label }) => (
        <button
          key={`${label}-${id}`}
          onClick={() => setSelection(id)}
          className={classNames({ [Styles.Selected]: id === selection })}
          disabled={id === 1}
          title={id === 1 ? "Coming Soon" : label}
        >
          {label}
        </button>
      ))}
    </article>
  );
};
