/**
 * TableConfigBuilder Component
 *
 * Visual table configuration builder for line item extraction.
 * Allows users to define tables with columns for extracting structured data.
 *
 * Features:
 * - Add/edit/delete tables
 * - Add/edit/delete columns within tables
 * - Column type selection
 * - Required field marking
 * - Drag and drop reordering (future enhancement)
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, TableIcon, Columns, GripVertical } from "lucide-react";
import type { TableDefinition, ColumnDefinition, FieldType } from "../types";
import { FIELD_TYPE_LABELS } from "../types";

interface TableConfigBuilderProps {
  tables: TableDefinition[];
  onChange: (tables: TableDefinition[]) => void;
}

const COLUMN_TYPES: Array<{ value: Exclude<FieldType, "array" | "object">; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
];

export const TableConfigBuilder: React.FC<TableConfigBuilderProps> = ({ tables, onChange }) => {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableDefinition | null>(null);
  const [editingTableIndex, setEditingTableIndex] = useState<number | null>(null);
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | null>(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [activeTableIndex, setActiveTableIndex] = useState<number | null>(null);

  // Table dialog form state
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");

  // Column dialog form state
  const [columnName, setColumnName] = useState("");
  const [columnDescription, setColumnDescription] = useState("");
  const [columnType, setColumnType] = useState<Exclude<FieldType, "array" | "object">>("text");
  const [columnRequired, setColumnRequired] = useState(false);
  const [columnDefaultValue, setColumnDefaultValue] = useState("");

  // Reset table form
  const resetTableForm = useCallback(() => {
    setTableName("");
    setTableDescription("");
    setEditingTable(null);
    setEditingTableIndex(null);
  }, []);

  // Reset column form
  const resetColumnForm = useCallback(() => {
    setColumnName("");
    setColumnDescription("");
    setColumnType("text");
    setColumnRequired(false);
    setColumnDefaultValue("");
    setEditingColumn(null);
    setEditingColumnIndex(null);
  }, []);

  // Open table dialog for adding
  const handleAddTable = useCallback(() => {
    resetTableForm();
    setIsTableDialogOpen(true);
  }, [resetTableForm]);

  // Open table dialog for editing
  const handleEditTable = useCallback((table: TableDefinition, index: number) => {
    setEditingTable(table);
    setEditingTableIndex(index);
    setTableName(table.name);
    setTableDescription(table.description || "");
    setIsTableDialogOpen(true);
  }, []);

  // Save table
  const handleSaveTable = useCallback(() => {
    if (!tableName.trim()) return;

    const newTable: TableDefinition = {
      name: tableName.trim(),
      description: tableDescription.trim() || undefined,
      columns: editingTable?.columns || [],
    };

    if (editingTableIndex !== null) {
      // Update existing table
      const updatedTables = [...tables];
      updatedTables[editingTableIndex] = newTable;
      onChange(updatedTables);
    } else {
      // Add new table
      onChange([...tables, newTable]);
    }

    setIsTableDialogOpen(false);
    resetTableForm();
  }, [
    tableName,
    tableDescription,
    editingTable,
    editingTableIndex,
    tables,
    onChange,
    resetTableForm,
  ]);

  // Delete table
  const handleDeleteTable = useCallback(
    (index: number) => {
      const updatedTables = tables.filter((_, i) => i !== index);
      onChange(updatedTables);
      if (activeTableIndex === index) {
        setActiveTableIndex(null);
      } else if (activeTableIndex !== null && activeTableIndex > index) {
        setActiveTableIndex(activeTableIndex - 1);
      }
    },
    [tables, activeTableIndex, onChange]
  );

  // Open column dialog for adding
  const handleAddColumn = useCallback(
    (tableIndex: number) => {
      setActiveTableIndex(tableIndex);
      resetColumnForm();
      setIsColumnDialogOpen(true);
    },
    [resetColumnForm]
  );

  // Open column dialog for editing
  const handleEditColumn = useCallback(
    (tableIndex: number, column: ColumnDefinition, columnIndex: number) => {
      setActiveTableIndex(tableIndex);
      setEditingColumn(column);
      setEditingColumnIndex(columnIndex);
      setColumnName(column.name);
      setColumnDescription(column.description || "");
      setColumnType(column.type);
      setColumnRequired(column.required);
      setColumnDefaultValue(column.default_value || "");
      setIsColumnDialogOpen(true);
    },
    []
  );

  // Save column
  const handleSaveColumn = useCallback(() => {
    if (!columnName.trim() || activeTableIndex === null) return;

    const newColumn: ColumnDefinition = {
      name: columnName.trim(),
      description: columnDescription.trim() || undefined,
      type: columnType,
      required: columnRequired,
      default_value: columnDefaultValue.trim() || undefined,
    };

    const updatedTables = [...tables];
    const table = { ...updatedTables[activeTableIndex] };
    const columns = [...table.columns];

    if (editingColumnIndex !== null) {
      // Update existing column
      columns[editingColumnIndex] = newColumn;
    } else {
      // Add new column
      columns.push(newColumn);
    }

    table.columns = columns;
    updatedTables[activeTableIndex] = table;
    onChange(updatedTables);

    setIsColumnDialogOpen(false);
    resetColumnForm();
  }, [
    columnName,
    columnDescription,
    columnType,
    columnRequired,
    columnDefaultValue,
    activeTableIndex,
    editingColumnIndex,
    tables,
    onChange,
    resetColumnForm,
  ]);

  // Delete column
  const handleDeleteColumn = useCallback(
    (tableIndex: number, columnIndex: number) => {
      const updatedTables = [...tables];
      const table = { ...updatedTables[tableIndex] };
      table.columns = table.columns.filter((_, i) => i !== columnIndex);
      updatedTables[tableIndex] = table;
      onChange(updatedTables);
    },
    [tables, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Table Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Define tables for extracting line items and structured data.
          </p>
        </div>
        <Button onClick={handleAddTable}>
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      </div>

      {/* Tables List */}
      {tables.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <TableIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No tables defined. Add a table to extract line items.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tables.map((table, tableIndex) => (
            <Card key={tableIndex}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        {table.name}
                      </CardTitle>
                      {table.description && (
                        <CardDescription className="mt-1">{table.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditTable(table, tableIndex)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTable(tableIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Columns Table */}
                {table.columns.length === 0 ? (
                  <div className="text-center py-4 border border-dashed rounded">
                    <Columns className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No columns defined</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleAddColumn(tableIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Column
                    </Button>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map((column, columnIndex) => (
                          <TableRow key={columnIndex}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{column.name}</span>
                                {column.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {column.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {FIELD_TYPE_LABELS[column.type]}
                              </span>
                            </TableCell>
                            <TableCell>
                              {column.required ? (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Required
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Optional</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditColumn(tableIndex, column, columnIndex)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteColumn(tableIndex, columnIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleAddColumn(tableIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Column
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "Edit Table" : "Add Table"}</DialogTitle>
            <DialogDescription>
              Define a table for extracting structured data like line items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name *</Label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g., line_items"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableDescription">Description</Label>
              <Textarea
                id="tableDescription"
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="e.g., Invoice line items with quantities and prices"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTable} disabled={!tableName.trim()}>
              {editingTable ? "Save Changes" : "Add Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Edit Column" : "Add Column"}</DialogTitle>
            <DialogDescription>Define a column for the table.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name *</Label>
              <Input
                id="columnName"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="e.g., item_description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnDescription">Description</Label>
              <Input
                id="columnDescription"
                value={columnDescription}
                onChange={(e) => setColumnDescription(e.target.value)}
                placeholder="e.g., Description of the line item"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnType">Type</Label>
              <Select
                value={columnType}
                onValueChange={(v) => setColumnType(v as Exclude<FieldType, "array" | "object">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="columnRequired">Required</Label>
              <Switch
                id="columnRequired"
                checked={columnRequired}
                onCheckedChange={setColumnRequired}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnDefaultValue">Default Value</Label>
              <Input
                id="columnDefaultValue"
                value={columnDefaultValue}
                onChange={(e) => setColumnDefaultValue(e.target.value)}
                placeholder="Optional default value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColumn} disabled={!columnName.trim()}>
              {editingColumn ? "Save Changes" : "Add Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableConfigBuilder;
