"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logoutUserFully } from "../store/features/user/userSlice";
import { hasPageAccess } from "../utils/permissions";
import {
	ChevronDownIcon,
	CloseIcon,
	DatabaseIcon,
	GlobeIcon,
	LogoutIcon,
	GearIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";

type NavItem = {
	name: string;
	icon: React.ReactNode;
	path?: string;
	onClick?: () => void;
	subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
	{
		icon: <DatabaseIcon />,
		name: "Servers",
		subItems: [
			{ name: "Machines", path: "/servers/machines", pro: false },
			{ name: "Services", path: "/servers/services", pro: false },
		],
	},
	{
		icon: <GlobeIcon />,
		name: "DNS",
		subItems: [
			{ name: "Nginx", path: "/dns/nginx", pro: false },
			{ name: "Registrar", path: "/dns/registrar", pro: false },
		],
	},
	{
		icon: <GearIcon />,
		name: "Admin",
		path: "/admin",
	},
	{
		icon: <LogoutIcon />,
		name: "Logout",
		onClick: () => {}, // Placeholder - actual handler assigned in renderMenuItems
	},
];


const AppSidebar: React.FC = () => {
	const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
		useSidebar();
	const pathname = usePathname();
	const router = useRouter();
	const dispatch = useAppDispatch();
	const { username, token, isAdmin, accessPagesArray = [] } = useAppSelector(
		(state) => state.user
	);

	const handleLogout = async () => {
		// Clear the HTTP-only cookie via API route
		await fetch("/api/auth/logout", { method: "POST" });

		// Clear Redux state
		dispatch(logoutUserFully());

		// Redirect to login
		router.push("/login");
	};

	// Filter navigation items based on user permissions
	const filteredNavItems = useMemo(() => {
		return navItems
			.map((item) => {
				// Always show Logout button
				if (item.name === "Logout") {
					return item;
				}

				// If item has subItems, filter them
				if (item.subItems) {
					const filteredSubItems = item.subItems.filter((subItem) =>
						hasPageAccess(subItem.path, isAdmin, accessPagesArray)
					);

					// Only show parent if it has accessible children
					if (filteredSubItems.length > 0) {
						return { ...item, subItems: filteredSubItems };
					}
					return null;
				}

				// For direct path items, check access
				if (item.path) {
					return hasPageAccess(item.path, isAdmin, accessPagesArray)
						? item
						: null;
				}

				return item;
			})
			.filter((item): item is NavItem => item !== null);
	}, [isAdmin, accessPagesArray]);

	const renderMenuItems = (
		navItems: NavItem[],
		menuType: "main" | "others"
	) => (
		<ul className="flex flex-col gap-4">
			{navItems.map((nav, index) => (
				<li key={nav.name}>
					{nav.subItems ? (
						<button
							onClick={() => handleSubmenuToggle(index, menuType)}
							className={`menu-item group  ${
								openSubmenu?.type === menuType && openSubmenu?.index === index
									? "menu-item-active"
									: "menu-item-inactive"
							} cursor-pointer ${!isExpanded ? "lg:justify-center" : "lg:justify-start"}`}
						>
							<span
								className={` ${
									openSubmenu?.type === menuType && openSubmenu?.index === index
										? "menu-item-icon-active"
										: "menu-item-icon-inactive"
								}`}
							>
								{nav.icon}
							</span>
							{(isExpanded || isMobileOpen) && (
								<span className={`menu-item-text`}>{nav.name}</span>
							)}
							{(isExpanded || isMobileOpen) && (
								<ChevronDownIcon
									className={`ml-auto w-5 h-5 transition-transform duration-200  ${
										openSubmenu?.type === menuType &&
										openSubmenu?.index === index
											? "rotate-180 text-brand-500"
											: ""
									}`}
								/>
							)}
						</button>
					) : nav.onClick ? (
						<button
							onClick={nav.name === "Logout" ? handleLogout : nav.onClick}
							className={`menu-item group menu-item-inactive cursor-pointer`}
						>
							<span className="menu-item-icon-inactive">
								{nav.icon}
							</span>
							{(isExpanded || isMobileOpen) && (
								<span className={`menu-item-text`}>{nav.name}</span>
							)}
						</button>
					) : (
						nav.path && (
							<Link
								href={nav.path}
								className={`menu-item group ${
									isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
								}`}
							>
								<span
									className={`${
										isActive(nav.path)
											? "menu-item-icon-active"
											: "menu-item-icon-inactive"
									}`}
								>
									{nav.icon}
								</span>
								{(isExpanded || isMobileOpen) && (
									<span className={`menu-item-text`}>{nav.name}</span>
								)}
							</Link>
						)
					)}
					{nav.subItems && (isExpanded || isMobileOpen) && (
						<div
							ref={(el) => {
								subMenuRefs.current[`${menuType}-${index}`] = el;
							}}
							className="overflow-hidden transition-all duration-300"
							style={{
								height:
									openSubmenu?.type === menuType && openSubmenu?.index === index
										? `${subMenuHeight[`${menuType}-${index}`]}px`
										: "0px",
							}}
						>
							<ul className="mt-2 space-y-1 ml-9">
								{nav.subItems.map((subItem) => (
									<li key={subItem.name}>
										<Link
											href={subItem.path}
											className={`menu-dropdown-item ${
												isActive(subItem.path)
													? "menu-dropdown-item-active"
													: "menu-dropdown-item-inactive"
											}`}
										>
											{subItem.name}
											<span className="flex items-center gap-1 ml-auto">
												{subItem.new && (
													<span
														className={`ml-auto ${
															isActive(subItem.path)
																? "menu-dropdown-badge-active"
																: "menu-dropdown-badge-inactive"
														} menu-dropdown-badge `}
													>
														new
													</span>
												)}
												{subItem.pro && (
													<span
														className={`ml-auto ${
															isActive(subItem.path)
																? "menu-dropdown-badge-active"
																: "menu-dropdown-badge-inactive"
														} menu-dropdown-badge `}
													>
														pro
													</span>
												)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					)}
				</li>
			))}
		</ul>
	);

	const [openSubmenu, setOpenSubmenu] = useState<{
		type: "main" | "others";
		index: number;
	} | null>(null);
	const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
		{}
	);
	const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

	// const isActive = (path: string) => path === pathname;
	const isActive = useCallback((path: string) => path === pathname, [pathname]);

	useEffect(() => {
		// Check if the current path matches any submenu item
		let submenuMatched = false;
		filteredNavItems.forEach((nav, index) => {
			if (nav.subItems) {
				nav.subItems.forEach((subItem) => {
					if (isActive(subItem.path)) {
						setOpenSubmenu({
							type: "main",
							index,
						});
						submenuMatched = true;
					}
				});
			}
		});

		// If no submenu item matches, close the open submenu
		if (!submenuMatched) {
			setOpenSubmenu(null);
		}
	}, [pathname, isActive, filteredNavItems]);

	useEffect(() => {
		// Set the height of the submenu items when the submenu is opened
		if (openSubmenu !== null) {
			const key = `${openSubmenu.type}-${openSubmenu.index}`;
			if (subMenuRefs.current[key]) {
				setSubMenuHeight((prevHeights) => ({
					...prevHeights,
					[key]: subMenuRefs.current[key]?.scrollHeight || 0,
				}));
			}
		}
	}, [openSubmenu]);

	const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
		setOpenSubmenu((prevOpenSubmenu) => {
			if (
				prevOpenSubmenu &&
				prevOpenSubmenu.type === menuType &&
				prevOpenSubmenu.index === index
			) {
				return null;
			}
			return { type: menuType, index };
		});
	};

	const handleCloseSidebar = () => {
		if (window.innerWidth >= 1024) {
			toggleSidebar();
		} else {
			toggleMobileSidebar();
		}
	};

	const handleSidebarClick = () => {
		// Only expand on large screens when sidebar is collapsed
		if (window.innerWidth >= 1024 && !isExpanded) {
			toggleSidebar();
		}
	};

	return (
		<aside
			className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 right-0 bg-white dark:bg-gray-800 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-[100000] border-l border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : "w-[90px] cursor-pointer"}
        ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
        lg:translate-x-0`}
			onClick={handleSidebarClick}
		>
			<div className="absolute top-6 left-5 right-5 z-10 flex items-center justify-between">
				{(isExpanded || isMobileOpen) && (
					<button
						onClick={handleCloseSidebar}
						className="hidden lg:flex items-center justify-center text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
						aria-label="Close Sidebar"
					>
						<CloseIcon className="w-6 h-6" />
					</button>
				)}
				{(!isExpanded && !isMobileOpen) && <div />}
				<ThemeToggleButton />
			</div>
			<div className="pt-20 flex-1 flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
				{/* Username Display */}
				{(isExpanded || isMobileOpen) && (
					<div className="mb-6 px-2 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
						<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Logged in as:</p>
						<p className="text-base font-semibold text-gray-900 dark:text-white truncate">
							{username || "Not logged in"}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
							Token: {token ? "✓ Present" : "✗ Missing"}
						</p>
					</div>
				)}

				<nav className="mb-6">
					{renderMenuItems(filteredNavItems, "main")}
				</nav>
			</div>
			{isExpanded || isMobileOpen ? <SidebarWidget /> : null}
		</aside>
	);
};

export default AppSidebar;
