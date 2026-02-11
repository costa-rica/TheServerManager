"use client";
import React, { useState, useEffect } from "react";
import { User } from "@/types/user";
import { PERMISSION_CONTROLLED_PAGES } from "@/utils/permissions";

interface ModalAdminEditPagesProps {
	user: User;
	onSave: (userId: string, selectedPages: string[]) => Promise<void>;
	onClose: () => void;
}

export const ModalAdminEditPages: React.FC<ModalAdminEditPagesProps> = ({
	user,
	onSave,
	onClose,
}) => {
	const [selectedPages, setSelectedPages] = useState<Set<string>>(
		new Set(user.accessPagesArray)
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Update selected pages when user changes
	useEffect(() => {
		setSelectedPages(new Set(user.accessPagesArray));
	}, [user]);

	const handleTogglePage = (pagePath: string) => {
		setSelectedPages((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(pagePath)) {
				newSet.delete(pagePath);
			} else {
				newSet.add(pagePath);
			}
			return newSet;
		});
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			await onSave(user.publicId, Array.from(selectedPages));
			onClose();
		} catch (error) {
			console.error("Error updating page access:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Helper to format page names for display
	const formatPageName = (path: string): string => {
		// Remove leading slash and split by slash
		const parts = path.substring(1).split("/");
		// Capitalize each part
		return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" › ");
	};

	return (
		<div className="p-6 sm:p-8 max-w-2xl">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Edit Page Access
				</h2>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Managing access for: {user.email}
				</p>
			</div>

			{/* Current Access Section */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Current Page Access
				</h3>
				<div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					{user.accessPagesArray.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{user.accessPagesArray.map((page) => (
								<span
									key={page}
									className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-400"
								>
									{formatPageName(page)}
								</span>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-500 dark:text-gray-400 italic">
							No pages assigned (default pages only)
						</p>
					)}
				</div>
			</div>

			{/* Available Pages Section */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
					Available Pages
				</h3>
				<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
					Note: /home and /servers/machines are accessible to all users by default
				</p>
				<div className="max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{PERMISSION_CONTROLLED_PAGES.map((pagePath) => (
							<label
								key={pagePath}
								className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
							>
								<input
									type="checkbox"
									checked={selectedPages.has(pagePath)}
									onChange={() => handleTogglePage(pagePath)}
									className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
								/>
								<div className="ml-3 flex-1">
									<div className="text-sm font-medium text-gray-900 dark:text-white">
										{formatPageName(pagePath)}
									</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
										{pagePath}
									</div>
								</div>
							</label>
						))}
					</div>
				</div>
				<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
					Selected: {selectedPages.size} of {PERMISSION_CONTROLLED_PAGES.length} pages
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
