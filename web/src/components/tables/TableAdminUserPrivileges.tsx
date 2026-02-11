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
import { User } from "@/types/user";
import { Machine } from "@/types/machine";
import { GearIcon } from "@/icons";

interface TableAdminUserPrivilegesProps {
	data: User[];
	machines: Machine[];
	onEditServers: (user: User) => void;
	onEditPages: (user: User) => void;
}

// Custom filter function for searching users
const userFilterFn: FilterFn<User> = (row, columnId, filterValue) => {
	const searchValue = filterValue.toLowerCase();
	const user = row.original;

	return (
		user.email?.toLowerCase().includes(searchValue) ||
		user.username?.toLowerCase().includes(searchValue)
	);
};

export default function TableAdminUserPrivileges({
	data,
	machines,
	onEditServers,
	onEditPages,
}: TableAdminUserPrivilegesProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	// Helper function to get machine names from publicIds
	const getMachineNames = (publicIds: string[]): string[] => {
		return publicIds
			.map((id) => {
				const machine = machines.find((m) => m.publicId === id);
				return machine?.machineName || id;
			})
			.filter(Boolean);
	};

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				accessorKey: "email",
				header: "Email",
				enableSorting: true,
				enableColumnFilter: false,
				cell: (info) => (
					<div>
						<div className="font-medium text-gray-900 dark:text-white">
							{info.getValue() as string}
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{info.row.original.username}
						</div>
					</div>
				),
			},
			{
				accessorKey: "isAdmin",
				header: "Admin",
				enableSorting: true,
				enableColumnFilter: false,
				cell: (info) => {
					const isAdmin = info.getValue() as boolean;
					return (
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
								isAdmin
									? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
									: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
							}`}
						>
							{isAdmin ? "Yes" : "No"}
						</span>
					);
				},
			},
			{
				id: "servers",
				header: "Servers",
				enableSorting: false,
				enableColumnFilter: false,
				cell: (info) => {
					const user = info.row.original;
					const machineNames = getMachineNames(user.accessServersArray);

					return (
						<div className="flex items-center gap-2">
							<div className="flex-1">
								{user.isAdmin ? (
									<span className="text-sm text-gray-500 dark:text-gray-400 italic">
										All servers
									</span>
								) : machineNames.length > 0 ? (
									<div className="text-sm text-gray-700 dark:text-gray-300">
										{machineNames.join(", ")}
									</div>
								) : (
									<span className="text-sm text-gray-400 dark:text-gray-500 italic">
										No servers
									</span>
								)}
							</div>
							<button
								onClick={() => onEditServers(user)}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								aria-label="Edit server access"
							>
								<GearIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
							</button>
						</div>
					);
				},
			},
			{
				id: "pages",
				header: "Pages",
				enableSorting: false,
				enableColumnFilter: false,
				cell: (info) => {
					const user = info.row.original;
					const pages = user.accessPagesArray;

					return (
						<div className="flex items-center gap-2">
							<div className="flex-1">
								{user.isAdmin ? (
									<span className="text-sm text-gray-500 dark:text-gray-400 italic">
										All pages
									</span>
								) : pages.length > 0 ? (
									<div className="text-sm text-gray-700 dark:text-gray-300">
										{pages.join(", ")}
									</div>
								) : (
									<span className="text-sm text-gray-400 dark:text-gray-500 italic">
										No pages
									</span>
								)}
							</div>
							<button
								onClick={() => onEditPages(user)}
								className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
								aria-label="Edit page access"
							>
								<GearIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
							</button>
						</div>
					);
				},
			},
		],
		[machines, onEditServers, onEditPages]
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
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: userFilterFn,
	});

	return (
		<div className="space-y-4">
			{/* Search Input */}
			<div className="flex items-center justify-between">
				<input
					type="text"
					value={globalFilter ?? ""}
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search users..."
					className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
				/>
				<div className="text-sm text-gray-500 dark:text-gray-400">
					Total Users: {data.length}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead className="bg-gray-50 dark:bg-gray-800">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
										onClick={header.column.getToggleSortingHandler()}
									>
										<div className="flex items-center gap-2">
											{flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
											{header.column.getIsSorted() === "asc" && (
												<span>↑</span>
											)}
											{header.column.getIsSorted() === "desc" && (
												<span>↓</span>
											)}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
						{table.getRowModel().rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
								>
									No users found
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className="px-6 py-4 whitespace-nowrap text-sm"
										>
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
