"use client";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";

interface ResetPasswordFormProps {
	token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [infoModalOpen, setInfoModalOpen] = useState(false);
	const [infoModalData, setInfoModalData] = useState<{
		title: string;
		message: string;
		variant: "info" | "success" | "error" | "warning";
	}>({
		title: "",
		message: "",
		variant: "info",
	});

	const showInfoModal = (
		title: string,
		message: string,
		variant: "info" | "success" | "error" | "warning" = "info"
	) => {
		setInfoModalData({ title, message, variant });
		setInfoModalOpen(true);
	};

	const handleSubmit = async () => {
		console.log("Password reset requested with token:", token);

		// Validation
		if (!password) {
			showInfoModal(
				"Password Required",
				"Please enter a new password",
				"warning"
			);
			return;
		}

		if (password.length < 2) {
			showInfoModal(
				"Password Too Short",
				"Password must be at least 2 characters long",
				"warning"
			);
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/users/reset-password-with-new-password`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token, newPassword: password }),
				}
			);

			console.log("Received response:", response.status);

			let resJson = null;
			const contentType = response.headers.get("Content-Type");

			if (contentType?.includes("application/json")) {
				resJson = await response.json();
			}

			if (response.ok) {
				// Show success message
				setIsSubmitted(true);
			} else {
				const errorMessage =
					resJson?.error || `There was a server error: ${response.status}`;
				showInfoModal("Error", errorMessage, "error");
			}
		} catch (error) {
			console.error("Error resetting password:", error);
			showInfoModal(
				"Connection Error",
				"Error connecting to server. Please try again.",
				"error"
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center w-full min-h-screen px-6 py-8">
				{/* Terminal Logo */}
				<div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
					<h1 className="text-5xl sm:text-6xl md:text-7xl font-mono tracking-wide">
						<span className="text-gray-900 dark:text-white">$ the-</span>
						<span className="text-brand-500">404</span>
						<span className="text-gray-900 dark:text-white">&gt; _</span>
					</h1>
				</div>

				{/* Success Message */}
				<div className="w-full max-w-2xl">
					<div className="text-center space-y-6">
						<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
							Password reset successful
						</h2>
						<p className="text-lg text-gray-700 dark:text-gray-400">
							Your password has been updated. You can now sign in with your new
							password.
						</p>
						<div className="mt-8">
							<Link
								href="/login"
								className="inline-block px-6 py-3 text-lg font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
							>
								Go to login
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-start w-full min-h-screen px-6 py-8">
			{/* Terminal Logo */}
			<div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
				<h1 className="text-5xl sm:text-6xl md:text-7xl font-mono tracking-wide">
					<span className="text-gray-900 dark:text-white">$ the-</span>
					<span className="text-brand-500">404</span>
					<span className="text-gray-900 dark:text-white">&gt; _</span>
				</h1>
			</div>

			{/* Reset Password Form */}
			<div className="w-full max-w-2xl">
				<div className="mb-8 text-center">
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Reset your password
					</h2>
					<p className="mt-2 text-gray-700 dark:text-gray-400">
						Enter your new password below
					</p>
				</div>

				<form className="space-y-8">
					{/* New Password Input */}
					<div className="relative">
						<input
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="New password"
							className="w-full px-6 py-5 text-3xl bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
						/>
						<span
							onClick={() => setShowPassword(!showPassword)}
							className="absolute z-30 -translate-y-1/2 cursor-pointer right-6 top-1/2"
						>
							{showPassword ? (
								<EyeIcon className="w-8 h-8 fill-gray-500 dark:fill-gray-400" />
							) : (
								<EyeCloseIcon className="w-8 h-8 fill-gray-500 dark:fill-gray-400" />
							)}
						</span>
					</div>

					{/* Submit Button */}
					<div>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isLoading}
							className="w-full px-6 py-5 text-3xl font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Resetting..." : "Reset password"}
						</button>
					</div>

					{/* Back to Login Link */}
					<div className="mt-6 flex justify-end">
						<Link
							href="/login"
							className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
						>
							back to login
						</Link>
					</div>
				</form>
			</div>

			{/* Information Modal */}
			<Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
				<ModalInformationOk
					title={infoModalData.title}
					message={infoModalData.message}
					variant={infoModalData.variant}
					onClose={() => setInfoModalOpen(false)}
				/>
			</Modal>
		</div>
	);
}
