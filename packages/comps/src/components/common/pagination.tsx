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

export const createPagesArray = (page: number, totalPages: number) => {
  if (totalPages <= 1) {
    return [
      {
        page: 1,
        active: true,
      },
    ];
  }
  let ArrayToShow: Array<PagesArrayObject> = [];
  const PagesArray: Array<PagesArrayObject> = [];
  const SevenBefore: Array<PagesArrayObject> = [];
  const SevenAfter: Array<PagesArrayObject> = [];
  const maxLength = 7; // actual max is 9, 7 to figure out + first/last
  for (let i = 1; i <= totalPages; i++) {
    PagesArray.push({
      page: i,
      active: page === i,
    });
  }
  for (let b = -8; b < -1; b++) {
    if (PagesArray[page + b] && PagesArray[page + b].page !== 1) {
      SevenBefore.push(PagesArray[page + b]);
    }
  }
  for (let a = 0; a <= 6; a++) {
    if (PagesArray[page + a] && PagesArray[page + a].page !== totalPages) {
      SevenAfter.push(PagesArray[page + a]);
    }
  }
  const beforeLen = SevenBefore.length;
  const afterLen = SevenAfter.length;
  const addPage = page !== 1 && page !== totalPages;
  ArrayToShow.push(PagesArray[0]);
  const beforeSlice = maxLength - afterLen - (addPage ? 1 : 0);
  const newBefore = beforeSlice > 2 ? SevenBefore.splice(-beforeSlice) : SevenBefore.splice(-3);
  ArrayToShow = ArrayToShow.concat(newBefore);
  if (addPage) ArrayToShow.push(PagesArray[page - 1]);
  const afterSlice = maxLength - beforeLen - (addPage ? 1 : 0);
  const newAfter = afterSlice > 2 ? SevenAfter.splice(0, afterSlice) : SevenAfter.splice(0, 3);
  ArrayToShow = ArrayToShow.concat(newAfter);
  ArrayToShow.push(PagesArray[totalPages - 1]);
  const finalLen = ArrayToShow.length;
  // add Nulls as needed:
  if (ArrayToShow[1].page !== 2) ArrayToShow[1] = NullPage;
  if (ArrayToShow[finalLen - 2].page !== totalPages - 1) {
    ArrayToShow[finalLen - 2] = NullPage;
  }
  return ArrayToShow;
};

export const Pagination = ({
  page,
  action,
  itemCount,
  itemsPerPage,
  showPagination = true,
  useFull = false,
}: PaginationProps) => {
  const totalPages = Math.ceil(itemCount / (itemsPerPage || 10)) || 1;
  const pagesArray = createPagesArray(page, totalPages);
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
  let content = null;
  if (useFull) {
    if (pagesArray.length > 7) {
      // TODO: handle greater than 7 choice logic
    } else {
      content = (
        <>
          {pagesArray.map((pageInfo) => (
            <TinyThemeButton
              key={`pagination-detail-button-for-page-${pageInfo.page}`}
              selected={pageInfo.active}
              text={pageInfo.page}
              action={() => action(pageInfo.page)}
            />
          ))}
        </>
      );
    }
  }
  return (
    <>
      <span>
        Page {page} of {totalPages}
      </span>
      {content}
    </>
  );
};
