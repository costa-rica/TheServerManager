"use client";
import React, { useMemo, useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	ColumnDef,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	SortingState,
	PaginationState,
	Row,
} from "@tanstack/react-table";

export interface Subdomain {
	_id: string;
	name: string;
	type: string;
	content: string;
	ttl: number;
	prio?: number;
	notes?: string;
	createdAt?: string;
	updatedAt?: string;
}

interface TableSubdomainsProps {
	data: Subdomain[];
	handleDeleteSubdomain?: (subdomainId: string, subdomainName: string) => void;
}

export default function TableSubdomains({
	data,
	handleDeleteSubdomain,
}: TableSubdomainsProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	// Custom sorting function for IP addresses
	const ipAddressSort = (
		rowA: Row<Subdomain>,
		rowB: Row<Subdomain>,
		columnId: string
	) => {
		const aValue = rowA.getValue(columnId) as string;
		const bValue = rowB.getValue(columnId) as string;

		// Check if both values are valid IP addresses
		const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
		const aIsIp = ipRegex.test(aValue);
		const bIsIp = ipRegex.test(bValue);

		// If both are IPs, compare numerically
		if (aIsIp && bIsIp) {
			const aOctets = aValue.split(".").map(Number);
			const bOctets = bValue.split(".").map(Number);

			// Compare each octet from left to right
			for (let i = 0; i < 4; i++) {
				if (aOctets[i] !== bOctets[i]) {
					return aOctets[i] - bOctets[i];
				}
			}
			return 0;
		}

		// If only one is an IP, non-IP sorts first
		if (aIsIp && !bIsIp) return 1;
		if (!aIsIp && bIsIp) return -1;

		// If neither are IPs, fall back to string comparison
		return aValue.localeCompare(bValue);
	};

	const columns = useMemo<ColumnDef<Subdomain>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Name",
				enableSorting: true,
				cell: (info) => (
					<div className="font-medium text-gray-900 dark:text-white">
						{info.getValue() as string}
					</div>
				),
			},
			{
				accessorKey: "type",
				header: "Type",
				enableSorting: true,
				cell: (info) => (
					<div className="text-gray-700 dark:text-gray-300">
						{info.getValue() as string}
					</div>
				),
			},
			{
				accessorKey: "content",
				header: "Content",
				enableSorting: true,
				sortingFn: ipAddressSort,
				cell: (info) => (
					<div className="text-gray-700 dark:text-gray-300 font-mono text-sm">
						{info.getValue() as string}
					</div>
				),
			},
			{
				accessorKey: "ttl",
				header: "TTL",
				enableSorting: true,
				cell: (info) => (
					<div className="text-gray-700 dark:text-gray-300">
						{info.getValue() as number}
					</div>
				),
			},
			...(handleDeleteSubdomain
				? [
						{
							id: "delete",
							header: "Delete",
							enableSorting: false,
							enableColumnFilter: false,
							cell: (info) => {
								const isNSRecord = info.row.original.type === "NS";
								return (
									<button
										onClick={() => {
											if (!isNSRecord) {
												handleDeleteSubdomain(
													info.row.original._id,
													info.row.original.name
												);
											}
										}}
										disabled={isNSRecord}
										className={`px-4 py-2 rounded-lg font-medium transition-colors ${
											isNSRecord
												? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
												: "bg-error-100 hover:bg-error-200 dark:bg-error-900/20 dark:hover:bg-error-900/30 text-error-700 dark:text-error-400 cursor-pointer"
										}`}
										title={
											isNSRecord
												? "NS records cannot be deleted"
												: "Delete this record"
										}
									>
										Delete
									</button>
								);
							},
						} as ColumnDef<Subdomain>,
				  ]
				: []),
		],
		[handleDeleteSubdomain]
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	if (data.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500 dark:text-gray-400">
					No subdomains available
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Controls Bar */}
			<div className="flex items-center justify-between gap-4">
				{/* Left: Page Size Selector */}
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-700 dark:text-gray-300">
						Show:
					</label>
					<select
						value={
							pagination.pageSize >= data.length && data.length > 10
								? "all"
								: pagination.pageSize
						}
						onChange={(e) => {
							const value = e.target.value;
							table.setPageSize(value === "all" ? data.length : Number(value));
						}}
						className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white"
					>
						<option value={10}>10</option>
						<option value="all">All</option>
					</select>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						entries
					</span>
				</div>

				{/* Right: Pagination Controls */}
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
					>
						Previous
					</button>
					<span className="text-sm text-gray-700 dark:text-gray-300">
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()}
					</span>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
					>
						Next
					</button>
				</div>
			</div>

			{/* Search Input */}
			<div className="flex items-center gap-4">
				<input
					type="text"
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search subdomains..."
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
										className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
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
									No subdomains found
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="px-6 py-3">
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

			{/* Record Count Info */}
			<div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
				<div>
					Showing{" "}
					{table.getRowModel().rows.length === 0
						? 0
						: table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
						  1}{" "}
					to{" "}
					{Math.min(
						(table.getState().pagination.pageIndex + 1) *
							table.getState().pagination.pageSize,
						table.getFilteredRowModel().rows.length
					)}{" "}
					of {table.getFilteredRowModel().rows.length} entries
					{globalFilter && (
						<span className="text-gray-500 dark:text-gray-500">
							{" "}
							(filtered from {data.length} total)
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
