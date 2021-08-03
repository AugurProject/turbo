import React from "react";
import classNames from "classnames";
import Styles from "./pagination.styles.less";
import { SecondaryThemeButton, TinyThemeButton } from "./buttons";
import { SimpleChevron } from "./icons";

export interface PaginationProps {
  page: number;
  itemsPerPage: number;
  itemCount: number;
  action: Function;
  updateLimit?: Function;
  showLimitChanger?: boolean;
  maxLimit?: number;
  showPagination?: boolean;
  useFull?: boolean;
  maxButtons?: number;
}

export interface PagesArrayObject {
  page: number | null;
  active: boolean;
}

const NullPage = { page: null, active: false };

const getOffset = (page, pageLimit) => {
  return (page - 1) * pageLimit;
};

export const sliceByPage = (array, page, pageLimit) => {
  return array.slice(getOffset(page, pageLimit), getOffset(page, pageLimit) + pageLimit);
};

export const createPagesArray = (page: number, totalPages: number, maxButtons: number = 4) => {
  if (totalPages <= 1) {
    return [
      {
        page: 1,
        active: true,
      },
    ];
  }
  const PagesArray: Array<PagesArrayObject> = [];
  for (let i = 1; i <= totalPages; i++) {
    PagesArray.push({
      page: i,
      active: page === i,
    });
  }
  const maxLength = maxButtons >= 4 ? maxButtons : 4;
  if (totalPages <= maxLength) return PagesArray;

  const innerLength = maxLength - 2;
  const addPage = page !== 1 && page !== totalPages;

  const Before: Array<PagesArrayObject> = [];
  const After: Array<PagesArrayObject> = [];

  const range = addPage ? innerLength : maxLength - 1;
  for (let b = -range; b < -1; b++) {
    if (PagesArray[page + b] && PagesArray[page + b].page !== 1) {
      Before.push(PagesArray[page + b]);
    }
  }
  for (let a = 0; a < range - Before.length - 1; a++) {
    if (PagesArray[page + a] && PagesArray[page + a].page !== totalPages) {
      After.push(PagesArray[page + a]);
    }
  }
  // console.log("Before/After:", JSON.stringify(Before), JSON.stringify(After), range);
  let ArrayToShow: Array<PagesArrayObject> = [];
  // add first page
  ArrayToShow.push(PagesArray[0]);

  // const beforeSlice = maxLength - After.length - (addPage ? 1 : 0);
  // const newBefore = beforeSlice > maxLength ? Before.splice(-beforeSlice) : Before.splice(-1);
  ArrayToShow = ArrayToShow.concat(Before);

  if (addPage) ArrayToShow.push(PagesArray[page - 1]);
  // console.log("BeforeSlice:", beforeSlice, JSON.stringify(newBefore));
  // const afterSlice = maxLength - 2 - Before.length - (addPage ? 1 : 0);
  // const newAfter =
  //   afterSlice >= range ? After.splice(0, afterSlice) : After.splice(0, afterSlice - newBefore.length);

  ArrayToShow = ArrayToShow.concat(After);
  // console.log("AfterSlice:", afterSlice, JSON.stringify(newAfter), 'finlen:', ArrayToShow.length);
  // total length without final page
  const finalLen = ArrayToShow.length;
  const midpoint = Math.floor(maxLength / 2) - 2;
  // add nulls as needed
  if (Before.length >= midpoint && Before.length > 1) {
    ArrayToShow[1] = NullPage;
  }

  if (After.length >= midpoint && After.length > 1) {
    ArrayToShow[finalLen - 1] = NullPage;
  }
  // console.log(
    // "Ugh:",
    // JSON.stringify(newBefore),
    // JSON.stringify(newAfter),
    // JSON.stringify(ArrayToShow),
    // page,
    // totalPages,
    // maxButtons,
    // maxLength
  // );

  // add final page:
  ArrayToShow.push(PagesArray[PagesArray.length - 1]);

  return ArrayToShow;
};

export const Pagination = ({
  page,
  action,
  itemCount,
  itemsPerPage = 10,
  showPagination = true,
  useFull = false,
  maxButtons = 7,
}: PaginationProps) => {
  const totalPages = Math.ceil(itemCount / (itemsPerPage || 10)) || 1;
  const pagesArray = createPagesArray(page, totalPages, maxButtons);
  // console.log(pagesArray);
  return (
    <div
      className={classNames(Styles.Pagination, {
        [Styles.Full]: useFull,
      })}
    >
      {showPagination && (
        <section>
          <SecondaryThemeButton action={() => action(page - 1)} disabled={page === 1} icon={SimpleChevron} />
          {handleMiddle({ page, totalPages, pagesArray, action, useFull })}
          <SecondaryThemeButton
            action={() => action(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            icon={SimpleChevron}
          />
        </section>
      )}
    </div>
  );
};

const handleMiddle = ({ page, totalPages, pagesArray, action, useFull = false }) => {
  const content = useFull ? (
    <>
      {pagesArray.map((pageInfo, index) =>
        pageInfo.page ? (
          <TinyThemeButton
            key={`pagination-detail-button-for-page-${pageInfo.page}`}
            selected={pageInfo.active}
            text={pageInfo.page}
            noHighlight
            action={() => action(pageInfo.page)}
          />
        ) : (
          <div key={`ellipsis-for-${index}`}>...</div>
        )
      )}
    </>
  ) : null;

  return (
    <>
      <span>
        Page {page} of {totalPages}
      </span>
      {content}
    </>
  );
};
