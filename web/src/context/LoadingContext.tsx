"use client";

import type React from "react";
import { createContext, useState, useContext, useCallback } from "react";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

type LoadingSize = "fullscreen" | "section";
type LoadingVariant = "default" | "info" | "success" | "warning" | "error";

interface LoadingOptions {
	message?: string;
	opacity?: number;
	size?: LoadingSize;
	variant?: LoadingVariant;
}

type LoadingContextType = {
	isLoading: boolean;
	showLoading: (options?: LoadingOptions) => void;
	hideLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [loadingOptions, setLoadingOptions] = useState<LoadingOptions>({});

	const showLoading = useCallback((options: LoadingOptions = {}) => {
		setLoadingOptions(options);
		setIsLoading(true);
	}, []);

	const hideLoading = useCallback(() => {
		setIsLoading(false);
		// Clear options after a brief delay to allow fade-out animation
		setTimeout(() => setLoadingOptions({}), 300);
	}, []);

	return (
		<LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
			{children}
			{isLoading && <LoadingOverlay {...loadingOptions} />}
		</LoadingContext.Provider>
	);
};

export const useLoading = () => {
	const context = useContext(LoadingContext);
	if (context === undefined) {
		throw new Error("useLoading must be used within a LoadingProvider");
	}
	return context;
};
