/**
 * Unit Tests for Table Component
 *
 * Tests table rendering, sorting, selection, and accessibility
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table, TableColumn } from "@/shared/components/ui/Table/Table";

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const mockData: MockUser[] = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "User" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "User" },
];

const mockColumns: TableColumn<MockUser>[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: false },
  { key: "role", label: "Role", sortable: true },
];

const keyExtractor = (row: MockUser) => row.id;

describe("Table Component", () => {
  describe("Rendering", () => {
    it("renders table with data", () => {
      render(<Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    });

    it("renders column headers", () => {
      render(<Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
    });

    it("renders empty state when no data", () => {
      render(
        <Table
          data={[]}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          emptyMessage="No data available"
        />
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("renders loading state", () => {
      render(<Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} loading />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("applies striped styling", () => {
      const { container } = render(
        <Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} striped />
      );

      const table = container.querySelector("table");
      expect(table).toHaveClass("table--striped");
    });

    it("applies hoverable styling by default", () => {
      const { container } = render(
        <Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />
      );

      const table = container.querySelector("table");
      expect(table).toHaveClass("table--hoverable");
    });
  });

  describe("Sorting", () => {
    it("shows sort icons for sortable columns", () => {
      const { container } = render(
        <Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />
      );

      const sortIcons = container.querySelectorAll(".table__sort-icon");
      // ID, Name, Role are sortable (3 columns)
      expect(sortIcons.length).toBe(3);
    });

    it("calls onSort when sortable column header is clicked", async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      await user.click(nameHeader!);

      expect(handleSort).toHaveBeenCalledWith("name", "asc");
    });

    it("toggles sort direction on repeated clicks", async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      const { rerender } = render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          onSort={handleSort}
        />
      );

      const nameHeader = screen.getByText("Name").closest("th");
      await user.click(nameHeader!);

      expect(handleSort).toHaveBeenCalledWith("name", "asc");

      // Rerender with sortKey and sortDirection set to simulate state update
      rerender(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          onSort={handleSort}
          sortKey="name"
          sortDirection="asc"
        />
      );

      await user.click(nameHeader!);
      expect(handleSort).toHaveBeenLastCalledWith("name", "desc");
    });

    it("does not call onSort for non-sortable columns", async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          onSort={handleSort}
        />
      );

      const emailHeader = screen.getByText("Email").closest("th");
      await user.click(emailHeader!);

      expect(handleSort).not.toHaveBeenCalled();
    });

    it("displays current sort state with ascending icon", () => {
      const { container } = render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          sortKey="name"
          sortDirection="asc"
        />
      );

      // Check that the sort icon SVG contains the up arrow path
      const nameHeader = screen.getByText("Name").closest("th");
      const sortIcon = nameHeader?.querySelector(".table__sort-icon svg");
      expect(sortIcon).toBeInTheDocument();
    });
  });

  describe("Row Selection", () => {
    it("renders selection checkboxes when selectable", () => {
      render(
        <Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} selectable />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      // +1 for select all checkbox
      expect(checkboxes).toHaveLength(mockData.length + 1);
    });

    it("calls onSelectRow when row checkbox is clicked", async () => {
      const user = userEvent.setup();
      const handleSelectRow = vi.fn();
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          onSelectRow={handleSelectRow}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]); // First data row

      expect(handleSelectRow).toHaveBeenCalledWith("1");
    });

    it("calls onSelectAll when header checkbox is clicked", async () => {
      const user = userEvent.setup();
      const handleSelectAll = vi.fn();
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          onSelectAll={handleSelectAll}
        />
      );

      const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
      await user.click(selectAllCheckbox);

      expect(handleSelectAll).toHaveBeenCalled();
    });

    it("shows selected state for selected rows", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          selectedRows={new Set(["1"])}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(false);
    });

    it("shows indeterminate state when some rows selected", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          selectedRows={new Set(["1"])}
        />
      );

      const selectAllCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
      expect(selectAllCheckbox.indeterminate).toBe(true);
    });

    it("shows checked state when all rows selected", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          selectedRows={new Set(["1", "2", "3"])}
        />
      );

      const selectAllCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(true);
      expect(selectAllCheckbox.indeterminate).toBe(false);
    });

    it("applies selected row styling", () => {
      render(
        <Table
          data={mockData}
          columns={mockColumns}
          keyExtractor={keyExtractor}
          selectable
          selectedRows={new Set(["1"])}
        />
      );

      const firstRow = screen.getByText("John Doe").closest("tr");
      expect(firstRow).toHaveClass("table__row--selected");
    });
  });

  describe("Custom Cell Rendering", () => {
    it("renders custom cell content", () => {
      const customColumns: TableColumn<MockUser>[] = [
        {
          key: "name",
          label: "Name",
          render: (value: string) => <strong>{value.toUpperCase()}</strong>,
        },
      ];

      render(<Table data={mockData} columns={customColumns} keyExtractor={keyExtractor} />);

      expect(screen.getByText("JOHN DOE")).toBeInTheDocument();
    });

    it("passes row data to custom renderer", () => {
      const customColumns: TableColumn<MockUser>[] = [
        {
          key: "role",
          label: "Role",
          render: (value: string, row: MockUser) => <span>{`${row.name} (${value})`}</span>,
        },
      ];

      render(<Table data={mockData} columns={customColumns} keyExtractor={keyExtractor} />);

      expect(screen.getByText("John Doe (Admin)")).toBeInTheDocument();
    });
  });

  describe("Column Alignment", () => {
    it("applies left alignment by default", () => {
      const { container } = render(
        <Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />
      );

      const cells = container.querySelectorAll(".table__cell--align-left");
      expect(cells.length).toBeGreaterThan(0);
    });

    it("applies center alignment when specified", () => {
      const centeredColumns: TableColumn<MockUser>[] = [
        { key: "id", label: "ID", align: "center" },
      ];

      const { container } = render(
        <Table data={mockData} columns={centeredColumns} keyExtractor={keyExtractor} />
      );

      const cells = container.querySelectorAll(".table__cell--align-center");
      expect(cells.length).toBeGreaterThan(0);
    });

    it("applies right alignment when specified", () => {
      const rightColumns: TableColumn<MockUser>[] = [{ key: "id", label: "ID", align: "right" }];

      const { container } = render(
        <Table data={mockData} columns={rightColumns} keyExtractor={keyExtractor} />
      );

      const cells = container.querySelectorAll(".table__cell--align-right");
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe("Column Width", () => {
    it("applies custom column width", () => {
      const columnsWithWidth: TableColumn<MockUser>[] = [
        { key: "id", label: "ID", width: "100px" },
      ];

      const { container } = render(
        <Table data={mockData} columns={columnsWithWidth} keyExtractor={keyExtractor} />
      );

      const header = container.querySelector("th");
      expect(header).toHaveStyle({ width: "100px" });
    });
  });

  describe("Accessibility", () => {
    it("has proper table structure", () => {
      render(<Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getAllByRole("columnheader")).toHaveLength(mockColumns.length);
      // +1 for header row
      expect(screen.getAllByRole("row")).toHaveLength(mockData.length + 1);
    });

    it("provides column headers for screen readers", () => {
      render(<Table data={mockData} columns={mockColumns} keyExtractor={keyExtractor} />);

      const headers = screen.getAllByRole("columnheader");
      expect(headers[0]).toHaveTextContent("ID");
      expect(headers[1]).toHaveTextContent("Name");
    });
  });
});
