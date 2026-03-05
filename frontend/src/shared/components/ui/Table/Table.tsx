/**
 * Table Component
 *
 * Reusable table component with sorting, selection, and responsive design.
 */

import React from "react";
import "./Table.css";

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (key: string) => void;
  onSelectAll?: () => void;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
}

export function Table<T = any>({
  columns,
  data,
  keyExtractor,
  onSort,
  sortKey,
  sortDirection,
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  emptyMessage = "No data available",
  loading = false,
  striped = false,
  hoverable = true,
}: TableProps<T>) {
  const allSelected = data.length > 0 && data.every((row) => selectedRows.has(keyExtractor(row)));
  const someSelected = data.some((row) => selectedRows.has(keyExtractor(row)));

  const handleSort = (key: string) => {
    if (!onSort) return;

    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  const tableClassNames = [
    "table",
    striped && "table--striped",
    hoverable && "table--hoverable",
    loading && "table--loading",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="table-container">
      <table className={tableClassNames}>
        <thead>
          <tr>
            {selectable && (
              <th className="table__cell table__cell--checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={onSelectAll}
                />
              </th>
            )}

            {columns.map((column) => (
              <th
                key={column.key}
                className={`table__cell table__cell--header table__cell--align-${column.align || "left"}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="table__header-content">
                  {column.label}
                  {column.sortable && (
                    <span className="table__sort-icon">
                      {sortKey === column.key ? (
                        sortDirection === "asc" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="table__cell table__cell--loading"
              >
                <div className="table__loading-spinner">Loading...</div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="table__cell table__cell--empty"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowKey = keyExtractor(row);
              const isSelected = selectedRows.has(rowKey);

              return (
                <tr key={rowKey} className={isSelected ? "table__row--selected" : ""}>
                  {selectable && (
                    <td className="table__cell table__cell--checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow?.(rowKey)}
                      />
                    </td>
                  )}

                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`table__cell table__cell--align-${column.align || "left"}`}
                    >
                      {column.render
                        ? column.render((row as Record<string, unknown>)[column.key], row)
                        : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
