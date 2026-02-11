// src/app/(dashboard)/layout.tsx
"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAppSelector } from "@/store/hooks";
import { hasPageAccess } from "@/utils/permissions";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isExpanded, isMobileOpen } = useSidebar();
	const pathname = usePathname();
	const router = useRouter();
	const { token, isAdmin, accessPagesArray = [] } = useAppSelector(
		(state) => state.user
	);

	useEffect(() => {
		// Redirect to login if not authenticated
		if (!token) {
			router.push("/login");
			return;
		}

		// Check if user has access to current page
		if (!hasPageAccess(pathname, isAdmin, accessPagesArray)) {
			router.push("/unauthorized");
		}
	}, [pathname, token, isAdmin, accessPagesArray, router]);

	const mainContentMargin = isMobileOpen
		? "mr-0"
		: isExpanded
		? "lg:mr-[290px]"
		: "lg:mr-[90px]";

	return (
		<div className="min-h-screen xl:flex">
			<div
				className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
			>
				<AppHeader />
				<div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 dark:bg-gray-950">
					{children}
				</div>
			</div>
			<Backdrop />
			<AppSidebar />
		</div>
	);
}
