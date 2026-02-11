"use client";
import React from "react";

interface ModalInformationOkProps {
	title: string;
	message: string;
	onOk?: () => void;
	onClose: () => void;
	okButtonText?: string;
	variant?: "info" | "success" | "error" | "warning";
	scrollable?: boolean;
}

export const ModalInformationOk: React.FC<ModalInformationOkProps> = ({
	title,
	message,
	onOk,
	onClose,
	okButtonText = "OK",
	variant = "info",
	scrollable = false,
}) => {
	const handleOk = () => {
		if (onOk) {
			onOk();
		}
		onClose();
	};

	// Determine variant styling
	const variantStyles = {
		info: {
			border: "border-blue-light-500",
			bg: "bg-blue-light-50 dark:bg-blue-light-900/20",
			text: "text-blue-light-700 dark:text-blue-light-400",
		},
		success: {
			border: "border-success-500",
			bg: "bg-success-50 dark:bg-success-900/20",
			text: "text-success-700 dark:text-success-400",
		},
		error: {
			border: "border-error-500",
			bg: "bg-error-50 dark:bg-error-900/20",
			text: "text-error-700 dark:text-error-400",
		},
		warning: {
			border: "border-warning-500",
			bg: "bg-warning-50 dark:bg-warning-900/20",
			text: "text-warning-700 dark:text-warning-400",
		},
	};

	const styles = variantStyles[variant];

	return (
		<div className="p-6 sm:p-8">
			{/* Title */}
			<div className="mb-6">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
					{title}
				</h2>
			</div>

			{/* Message */}
			<div className="mb-8">
				<div
					className={`p-4 rounded-lg border ${styles.border} ${styles.bg} ${
						scrollable ? "max-h-[50vh] overflow-y-auto" : ""
					}`}
				>
					<p className={`text-base whitespace-pre-line ${styles.text}`}>{message}</p>
				</div>
			</div>

			{/* OK Button */}
			<div className="flex justify-end">
				<button
					type="button"
					onClick={handleOk}
					className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
				>
					{okButtonText}
				</button>
			</div>
		</div>
	);
};
