"use client";
import React, { useState } from "react";
import { ChevronDownIcon } from "@/icons";

interface ApiError {
	code: string;
	message: string;
	details?: string | Record<string, unknown> | Array<unknown>;
	status: number;
}

interface ModalErrorResponseProps {
	error: ApiError;
	onClose: () => void;
	okButtonText?: string;
}

export const ModalErrorResponse: React.FC<ModalErrorResponseProps> = ({
	error,
	onClose,
	okButtonText = "OK",
}) => {
	const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

	// Check if details exist and are not empty
	const hasDetails = error.details !== undefined && error.details !== null && error.details !== "";

	// Format details for display
	const formatDetails = () => {
		if (!error.details) return "";

		if (typeof error.details === "string") {
			return error.details;
		}

		// If details is an object or array, stringify it with formatting
		return JSON.stringify(error.details, null, 2);
	};

	return (
		<div className="p-6 sm:p-8">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Error {error.status}: {error.code}
				</h2>
			</div>

			{/* Message */}
			<div className="mb-4">
				<div className="p-4 rounded-lg border border-error-500 bg-error-50 dark:bg-error-900/20">
					<p className="text-base text-error-700 dark:text-error-400">
						{error.message}
					</p>
				</div>
			</div>

			{/* Details Section (Collapsible) */}
			{hasDetails && (
				<div className="mb-8">
					<button
						type="button"
						onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
						className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
					>
						<ChevronDownIcon
							className={`w-4 h-4 transition-transform duration-200 ${
								isDetailsExpanded ? "rotate-180" : ""
							}`}
						/>
						<span>{isDetailsExpanded ? "Hide" : "Show"} Details</span>
					</button>

					{isDetailsExpanded && (
						<div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
							<pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
								{formatDetails()}
							</pre>
						</div>
					)}
				</div>
			)}

			{/* If no details, add margin to OK button */}
			{!hasDetails && <div className="mb-4" />}

			{/* OK Button */}
			<div className="flex justify-end">
				<button
					type="button"
					onClick={onClose}
					className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
				>
					{okButtonText}
				</button>
			</div>
		</div>
	);
};
