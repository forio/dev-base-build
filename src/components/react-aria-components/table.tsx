import {
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  TableBody as AriaTableBody,
  Button,
  Cell as AriaCell,
  Collection,
  ColumnProps,
  RowProps,
  TableHeaderProps,
  TableBodyProps,
  TableProps,
  CellProps,
  useTableOptions,
} from 'react-aria-components';

import './table.scss';

export function Table(props: TableProps) {
  return <AriaTable {...props} />;
}

export function Column(props: ColumnProps) {
  return (
    <AriaColumn {...props}>
      {({ allowsSorting, sortDirection }) => (
        <div>
          {props.children as React.ReactNode}
          {allowsSorting && (
            <span aria-hidden="true" className="sort-indicator">
              {sortDirection === 'ascending' ? (
                <svg
                  width="13"
                  height="11"
                  viewBox="0 0 13 11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.63398 0.499999C6.01888 -0.166667 6.98113 -0.166667 7.36603 0.5L12.1292 8.75C12.5141 9.41667 12.0329 10.25 11.2631 10.25H1.73686C0.967059 10.25 0.485935 9.41667 0.870835 8.75L5.63398 0.499999Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="11"
                  viewBox="0 0 13 11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.36602 10.5C6.98112 11.1667 6.01887 11.1667 5.63397 10.5L0.870833 2.25C0.485933 1.58333 0.967059 0.750001 1.73686 0.750001L11.2631 0.75C12.0329 0.75 12.5141 1.58333 12.1292 2.25L7.36602 10.5Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </span>
          )}
        </div>
      )}
    </AriaColumn>
  );
}

export function TableHeader<T extends object>({
  columns,
  children,
}: TableHeaderProps<T>) {
  const { allowsDragging } = useTableOptions();

  return (
    <AriaTableHeader>
      {/* Add extra columns for drag and drop and selection. */}
      {allowsDragging && <AriaColumn />}
      <Collection items={columns}>{children}</Collection>
    </AriaTableHeader>
  );
}

export function Cell(props: CellProps) {
  return <AriaCell {...props} />;
}

export function Row<T extends object>({
  id,
  columns,
  children,
  ...otherProps
}: RowProps<T>) {
  const { allowsDragging } = useTableOptions();

  return (
    <AriaRow id={id} {...otherProps}>
      {allowsDragging && (
        <Cell>
          <Button slot="drag">≡</Button>
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

export function TableBody<T extends object>(props: TableBodyProps<T>) {
  return <AriaTableBody {...props} />;
}