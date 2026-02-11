"use client";
import React, { useState, useEffect } from "react";
import { User } from "@/types/user";
import { Machine } from "@/types/machine";

interface ModalAdminEditServersProps {
	user: User;
	machines: Machine[];
	onSave: (userId: string, selectedServerIds: string[]) => Promise<void>;
	onClose: () => void;
}

export const ModalAdminEditServers: React.FC<ModalAdminEditServersProps> = ({
	user,
	machines,
	onSave,
	onClose,
}) => {
	const [selectedServers, setSelectedServers] = useState<Set<string>>(
		new Set(user.accessServersArray)
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Update selected servers when user changes
	useEffect(() => {
		setSelectedServers(new Set(user.accessServersArray));
	}, [user]);

	const handleToggleServer = (publicId: string) => {
		setSelectedServers((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(publicId)) {
				newSet.delete(publicId);
			} else {
				newSet.add(publicId);
			}
			return newSet;
		});
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			await onSave(user.publicId, Array.from(selectedServers));
			onClose();
		} catch (error) {
			console.error("Error updating server access:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Get machine names for current access
	const currentMachineNames = user.accessServersArray
		.map((id) => {
			const machine = machines.find((m) => m.publicId === id);
			return machine?.machineName || id;
		})
		.filter(Boolean);

	return (
		<div className="p-6 sm:p-8 max-w-2xl">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Edit Server Access
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Managing access for: {user.email}
				</p>
			</div>

			{/* Current Access Section */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Current Server Access
				</h3>
				<div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					{currentMachineNames.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{currentMachineNames.map((name) => (
								<span
									key={name}
									className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-400"
								>
									{name}
								</span>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-500 dark:text-gray-400 italic">
							No servers assigned
						</p>
					)}
				</div>
			</div>

			{/* Available Servers Section */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
					Available Servers
				</h3>
				<div className="max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
					{machines.length === 0 ? (
						<div className="p-4 text-center text-gray-500 dark:text-gray-400">
							No servers available
						</div>
					) : (
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{machines.map((machine) => (
								<label
									key={machine.publicId}
									className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
								>
									<input
										type="checkbox"
										checked={selectedServers.has(machine.publicId)}
										onChange={() => handleToggleServer(machine.publicId)}
										className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
									/>
									<div className="ml-3 flex-1">
										<div className="text-sm font-medium text-gray-900 dark:text-white">
											{machine.machineName}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{machine.localIpAddress}
										</div>
									</div>
								</label>
							))}
						</div>
					)}
				</div>
				<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
					Selected: {selectedServers.size} of {machines.length} servers
				</p>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={onClose}
					disabled={isSubmitting}
					className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</button>
			</div>
		</div>
	);
};
