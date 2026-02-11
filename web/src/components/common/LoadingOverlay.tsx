"use client";

import React from "react";

type LoadingSize = "fullscreen" | "section";
type LoadingVariant = "default" | "info" | "success" | "warning" | "error";

interface LoadingOverlayProps {
	message?: string;
	opacity?: number;
	size?: LoadingSize;
	variant?: LoadingVariant;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
	message,
	opacity = 0.75,
	size = "fullscreen",
	variant = "default",
}) => {
	// Variant color mapping for spinner
	const variantColors = {
		default: "border-brand-500",
		info: "border-info-500",
		success: "border-success-500",
		warning: "border-warning-500",
		error: "border-error-500",
	};

	// Variant text colors
	const variantTextColors = {
		default: "text-brand-500",
		info: "text-info-500",
		success: "text-success-500",
		warning: "text-warning-500",
		error: "text-error-500",
	};

	const spinnerColor = variantColors[variant];
	const textColor = variantTextColors[variant];

	const containerClasses =
		size === "fullscreen"
			? "fixed inset-0 z-[999999]"
			: "absolute inset-0 z-[999999]";

	return (
		<div
			className={`${containerClasses} flex items-center justify-center`}
			style={{
				backgroundColor: `rgba(0, 0, 0, ${opacity})`,
			}}
		>
			<div className="flex flex-col items-center gap-4">
				{/* Rotating spinner */}
				<div
					className={`w-16 h-16 border-4 border-gray-200 dark:border-gray-700 ${spinnerColor} border-t-transparent rounded-full animate-spin`}
				/>

				{/* Optional message */}
				{message && (
					<p className={`text-lg font-medium ${textColor} animate-pulse`}>
						{message}
					</p>
				)}
			</div>
		</div>
	);
};
