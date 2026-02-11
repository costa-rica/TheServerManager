"use client";
import React, { useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  FilterFn,
} from "@tanstack/react-table";
import { Machine } from "@/types/machine";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { connectMachine } from "@/store/features/machines/machineSlice";

interface TableMachinesProps {
  data: Machine[];
  handleDeleteMachine: (machineId: string, machineName: string) => void;
  handleEditMachine: (machine: Machine) => void;
}

// Custom filter function for searching Machine column (machineName, url, ip)
const machineFilterFn: FilterFn<Machine> = (row, columnId, filterValue) => {
  const searchValue = filterValue.toLowerCase();
  const machine = row.original;

  return (
    machine.machineName?.toLowerCase().includes(searchValue) ||
    machine.urlApiForTsmNetwork?.toLowerCase().includes(searchValue) ||
    machine.localIpAddress?.toLowerCase().includes(searchValue)
  );
};

export default function TableMachines({
  data,
  handleDeleteMachine,
  handleEditMachine,
}: TableMachinesProps) {
  const dispatch = useAppDispatch();
  const connectedMachineName = useAppSelector(
    (s) => s.machine.connectedMachine?.machineName || null
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const handleConnect = useCallback(
    (machine: Machine) => {
      dispatch(connectMachine(machine));
    },
    [dispatch]
  );

  const columns = useMemo<ColumnDef<Machine>[]>(
    () => [
      {
        accessorKey: "machineName",
        header: "Machine",
        enableSorting: true,
        enableColumnFilter: false,
        cell: (info) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {info.getValue() as string}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {info.row.original.urlApiForTsmNetwork}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {info.row.original.localIpAddress}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {info.row.original.publicId}
            </div>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: true,
        enableColumnFilter: false,
        // Accessor function returns 1 for connected, 0 for not connected
        accessorFn: (row) => (row.machineName === connectedMachineName ? 1 : 0),
        cell: (info) => {
          const isConnected =
            info.row.original.machineName === connectedMachineName;
          return (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleConnect(info.row.original)}
                disabled={isConnected}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isConnected
                    ? "bg-success-500 text-white cursor-default"
                    : "bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white"
                }`}
              >
                {isConnected ? "Connected" : "Connect Machine"}
              </button>
              <button
                onClick={() => handleEditMachine(info.row.original)}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Edit Machine
              </button>
            </div>
          );
        },
      },
      {
        // Delete button
        id: "delete",
        header: "Delete",
        enableSorting: false,
        enableColumnFilter: false,
        cell: (info) => {
          return (
            <button
              onClick={() =>
                handleDeleteMachine(
                  info.row.original.publicId,
                  info.row.original.machineName
                )
              }
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-error-100 hover:bg-error-200 dark:bg-error-900/20 dark:hover:bg-error-900/30 text-error-700 dark:text-error-400"
            >
              Delete
            </button>
          );
        },
      },
    ],
    [
      connectedMachineName,
      handleDeleteMachine,
      handleConnect,
      handleEditMachine,
    ]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: machineFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No machines available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search machines..."
          className="flex-1 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-2 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400 dark:text-gray-500">
                            {{
                              asc: "↑",
                              desc: "↓",
                            }[header.column.getIsSorted() as string] ?? "↕"}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No machines found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
