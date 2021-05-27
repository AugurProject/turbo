import React from "react";
import Styles from "./categories.styles.less";
import { Icons, Constants } from "@augurproject/comps";
import { useSportsStore } from "modules/stores/sport";

const { SPORTS, POLITICS } = Constants;
const { CATEGORIES_ICON_MAP, SimpleChevron } = Icons;

const CATEGORIES_TO_CARE_ABOUT = [SPORTS, POLITICS];
const DEFAULT_SELECTED_CATEGORY_HEADING = "Popular Markets";
const DEFAULT_NAVIGATION_LABEL = "Explore Categories";
const DEFAULT_BACK_OPTION = "All Categories";
const DEFAULT_CLEAR_ACTION = { subCategories: [], primaryCategory: "" };

const handleCategoryMap = (categoriesToPull = [], pullFrom = {}) =>
  categoriesToPull.reduce((acc, category) => {
    const categoryInfo = pullFrom[category.toLowerCase()];
    acc[category] = categoryInfo;
    // acc[category].subCategories = Object.entries(categoryInfo?.subOptions);
    return acc;
  }, {});

export const CategoriesArea = () => {
  const {
    marketsViewSettings,
    // actions: { updateMarketsViewSettings },
  } = useSportsStore();
  const { primaryCategory, subCategories } = marketsViewSettings;
  const selectedCategories = [primaryCategory].concat(subCategories);
  return (
    <article className={Styles.CategoriesArea}>
      <CategoriesAreaTitle text={primaryCategory} />
      <NavigationArea selectedCategories={selectedCategories} />
    </article>
  );
};

export const CategoriesAreaTitle = ({ text }) => <h2>{text || DEFAULT_SELECTED_CATEGORY_HEADING}</h2>;

export const NavigationArea = ({ selectedCategories = [] }) => {
  const {
    marketsViewSettings,
    actions: { updateMarketsViewSettings },
  } = useSportsStore();
  const { primaryCategory, subCategories } = marketsViewSettings;
  const topLevel = handleCategoryMap(CATEGORIES_TO_CARE_ABOUT, CATEGORIES_ICON_MAP);
  // console.log(topLevel, selectedCategories);
  const categoryGroups = !primaryCategory ? (
    <>
      {Object.entries(topLevel).map((categoryInfo) => (
        <CategoryGroup {...{ categoryInfo }} />
      ))}
    </>
  ) : (
    <>
      {Object.entries(topLevel)
        .filter(([label, info]) => primaryCategory === label)
        .map((categoryInfo) => (
          <CategoryGroup {...{ categoryInfo }} />
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
      {subCategories.map((category) => {
        const action = () =>
          updateMarketsViewSettings({ primaryCategory, subCategories: subCategories.filter((v) => v !== category) });
        return <RemoveCategoryOption {...{ category, action }} />;
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

const CategoryGroup = ({ categoryInfo }) => {
  const [label, info] = categoryInfo;
  const subCategories = Object.entries(info?.subOptions);
  console.log("catinfo", subCategories);
  return (
    <article className={Styles.CategoryGroup}>
      <h4>{label}<span>0</span></h4>
      {subCategories.map(([label, info]) => (
        <button onClick={() => console.log(label, info)}>{info?.icon} {label} <span>0</span></button>
      ))}
    </article>
  );
};

