"use client";
import React from "react";

interface ModalInformationYesOrNoProps {
	title: string;
	message: string;
	onYes?: () => void;
	onNo?: () => void;
	onClose: () => void;
	yesButtonText?: string;
	noButtonText?: string;
	yesButtonStyle?: "danger" | "primary";
}

export const ModalInformationYesOrNo: React.FC<
	ModalInformationYesOrNoProps
> = ({
	title,
	message,
	onYes,
	onNo,
	onClose,
	yesButtonText = "Yes",
	noButtonText = "No",
	yesButtonStyle = "danger",
}) => {
	const handleYes = () => {
		if (onYes) {
			onYes();
		}
		onClose();
	};

	const handleNo = () => {
		if (onNo) {
			onNo();
		}
		onClose();
	};

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
				<p className="text-base text-gray-600 dark:text-gray-400">{message}</p>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={handleNo}
					className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
				>
					{noButtonText}
				</button>
				<button
					type="button"
					onClick={handleYes}
					className={`px-6 py-2 rounded-lg font-medium transition-colors ${
						yesButtonStyle === "danger"
							? "bg-error-500 hover:bg-error-600 dark:bg-error-600 dark:hover:bg-error-700 text-white"
							: "bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white"
					}`}
				>
					{yesButtonText}
				</button>
			</div>
		</div>
	);
};
