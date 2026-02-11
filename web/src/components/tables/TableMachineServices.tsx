"use client";
import React, { useMemo, useState } from "react";
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
import { Service } from "@/types/service";

interface TableMachineServicesProps {
	data: Service[];
	handleViewLogs: (serviceName: string) => void;
	handleToggleStatus: (
		serviceFilename: string,
		toggleStatus: string,
		serviceName: string
	) => void;
}

// Custom filter function for searching services by name
const serviceFilterFn: FilterFn<Service> = (row, columnId, filterValue) => {
	const searchValue = filterValue.toLowerCase();
	const service = row.original;

	return (
		service.name?.toLowerCase().includes(searchValue) ||
		service.filename?.toLowerCase().includes(searchValue)
	);
};

// Helper function to extract status (active/inactive) from status string
const extractStatus = (statusString: string): "active" | "inactive" => {
	const lowerStatus = statusString.toLowerCase();
	if (lowerStatus.includes("active") && !lowerStatus.includes("inactive")) {
		return "active";
	}
	return "inactive";
};

// Helper function to extract time left from timerTrigger string
const extractTimeLeft = (timerTrigger: string | undefined): string => {
	if (!timerTrigger) return "No Timer";

	// timerTrigger format: "Thu 2025-12-25 23:00:00 UTC; 3h 36min left"
	// Extract the portion after the semicolon
	const parts = timerTrigger.split(";");
	if (parts.length > 1) {
		return parts[1].trim();
	}

	return "No Timer";
};

export default function TableMachineServices({
	data,
	handleViewLogs,
	handleToggleStatus,
}: TableMachineServicesProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const handleStatusClick = (service: Service) => {
		// Determine serviceFilename based on whether there's a timerStatus
		let serviceFilename = service.filename;
		if (service.timerStatus) {
			// Replace .service with .timer
			serviceFilename = service.filename.replace(".service", ".timer");
		}

		// Determine toggleStatus based on the rules
		let toggleStatus: string;
		if (service.filename === "tsm-api.service") {
			// Special case: always restart for tsm-api.service
			toggleStatus = "restart";
		} else {
			// Check if status starts with "active" or "inactive"
			const statusToCheck = service.timerStatus || service.status;
			if (statusToCheck.toLowerCase().startsWith("active")) {
				toggleStatus = "stop";
			} else {
				toggleStatus = "start";
			}
		}

		handleToggleStatus(serviceFilename, toggleStatus, service.name);
	};

	const columns = useMemo<ColumnDef<Service>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Service Name",
				enableSorting: true,
				enableColumnFilter: false,
				cell: (info) => (
					<div>
						<button
							onClick={() => handleViewLogs(info.getValue() as string)}
							className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 transition-colors cursor-pointer text-left"
						>
							{info.getValue() as string}
						</button>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{info.row.original.filename}
						</div>
					</div>
				),
			},
			{
				id: "status",
				header: "Status",
				enableSorting: true,
				enableColumnFilter: false,
				// Accessor function returns 1 for active, 0 for inactive (for sorting)
				accessorFn: (row) => (extractStatus(row.status) === "active" ? 1 : 0),
				cell: (info) => {
					const service = info.row.original;
					const status = extractStatus(service.status);
					const isActive = status === "active";

					return (
						<button
							onClick={() => handleStatusClick(service)}
							className={`px-4 py-2 rounded-lg font-medium transition-colors ${
								isActive
									? "bg-success-500 hover:bg-success-600 text-white"
									: "bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
							}`}
						>
							{isActive ? "Active" : "Inactive"}
						</button>
					);
				},
			},
			{
				accessorKey: "timerTrigger",
				header: "Next Timer",
				enableSorting: false,
				enableColumnFilter: false,
				cell: (info) => {
					const timeLeft = extractTimeLeft(
						info.row.original.timerTrigger
					);
					const hasTimer = timeLeft !== "No Timer";

					return (
						<div
							className={
								hasTimer
									? "text-gray-900 dark:text-white"
									: "text-gray-500 dark:text-gray-400"
							}
						>
							{timeLeft}
						</div>
					);
				},
			},
		],
		[handleViewLogs, handleToggleStatus]
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
		globalFilterFn: serviceFilterFn,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	if (data.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500 dark:text-gray-400">
					No services available
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
					placeholder="Search services..."
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
									No services found
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
