"use client";
import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { useTheme } from "@/context/ThemeContext";

export default function ForgotPasswordForm() {
	const { theme } = useTheme();
	const [email, setEmail] = useState("");
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
		console.log("Forgot password requested for:", email);

		if (!email) {
			showInfoModal(
				"Email Required",
				"Please enter your email address",
				"warning"
			);
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/users/request-reset-password-email`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email }),
				}
			);

			console.log("Received response:", response.status);

			let resJson = null;
			const contentType = response.headers.get("Content-Type");

			if (contentType?.includes("application/json")) {
				resJson = await response.json();
			}

			if (response.ok) {
				// Show success message regardless of whether email exists
				setIsSubmitted(true);
			} else {
				const errorMessage =
					resJson?.error || `There was a server error: ${response.status}`;
				showInfoModal("Error", errorMessage, "error");
			}
		} catch (error) {
			console.error("Error requesting password reset:", error);
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
				{/* Logo */}
				<div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
					<Image
						src={theme === "dark" ? "/images/logo06-NR-darkTheme.png" : "/images/logo06-NR.png"}
						alt="The Server Manager"
						width={400}
						height={80}
						className="h-12 sm:h-16 md:h-20 w-auto"
						priority
					/>
				</div>

				{/* Success Message */}
				<div className="w-full max-w-2xl">
					<div className="text-center space-y-6">
						<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
							Check your email
						</h2>
						<p className="text-lg text-gray-700 dark:text-gray-400">
							If an account exists for {email}, you will receive password reset
							instructions.
						</p>
						<div className="mt-8">
							<Link
								href="/login"
								className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
							>
								Back to login
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-start w-full min-h-screen px-6 py-8">
			{/* Logo */}
			<div className="flex items-center justify-center w-full h-1/3 min-h-[200px] mb-8">
				<Image
					src={theme === "dark" ? "/images/logo06-NR-darkTheme.png" : "/images/logo06-NR.png"}
					alt="The Server Manager"
					width={400}
					height={80}
					className="h-12 sm:h-16 md:h-20 w-auto"
					priority
				/>
			</div>

			{/* Forgot Password Form */}
			<div className="w-full max-w-2xl">
				<form className="space-y-8">
					{/* Email Input */}
					<div>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Email"
							className="w-full px-6 py-5 text-3xl bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
						/>
					</div>

					{/* Submit Button */}
					<div>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isLoading}
							className="w-full px-6 py-5 text-3xl font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Sending..." : "Reset password"}
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
