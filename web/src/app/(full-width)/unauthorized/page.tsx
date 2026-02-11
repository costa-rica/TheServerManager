"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { getFirstAccessiblePage } from "@/utils/permissions";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

export default function UnauthorizedPage() {
	const router = useRouter();
	const { isAdmin, accessPagesArray, username } = useAppSelector(
		(state) => state.user
	);
	const { theme } = useTheme();

	const handleGoToAccessiblePage = () => {
		const firstPage = getFirstAccessiblePage(isAdmin, accessPagesArray);
		router.push(firstPage);
	};

	return (
		<div className="flex flex-col items-center justify-center w-full min-h-screen px-6 py-8">
			{/* Logo */}
			<div className="mb-8">
				<Image
					src={
						theme === "dark"
							? "/images/logo06-NR-darkTheme.png"
							: "/images/logo06-NR.png"
					}
					alt="The Server Manager"
					width={400}
					height={80}
					className="h-12 sm:h-16 md:h-20 w-auto"
					priority
				/>
			</div>

			{/* Error Message */}
			<div className="w-full max-w-2xl text-center space-y-6">
				<h1 className="text-4xl font-bold text-error-500 dark:text-error-400">
					Access Denied
				</h1>

				<p className="text-xl text-gray-700 dark:text-gray-300">
					You don't have permission to access this page.
				</p>

				{username && (
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Logged in as: {username}
					</p>
				)}

				<div className="mt-8 space-y-4">
					<button
						onClick={handleGoToAccessiblePage}
						className="w-full px-6 py-5 text-2xl font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
					>
						Go to Home
					</button>

					<p className="text-sm text-gray-500 dark:text-gray-400">
						If you believe you should have access to this page, please
						contact your administrator.
					</p>
				</div>
			</div>
		</div>
	);
}
