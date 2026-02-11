"use client";
import { useSidebar } from "@/context/SidebarContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { connectMachine } from "@/store/features/machines/machineSlice";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const connectedMachine = useAppSelector((s) => s.machine.connectedMachine);
  const machinesArray = useAppSelector((s) => s.machine.machinesArray);

  const machineName = connectedMachine?.machineName || null;
  const urlApiForTsmNetwork = connectedMachine?.urlApiForTsmNetwork || null;
  const localIpAddress = connectedMachine?.localIpAddress || null;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    toggleMobileSidebar();
  };

  const handleMachineClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelectMachine = (machine: typeof connectedMachine) => {
    if (machine) {
      dispatch(connectMachine(machine));
    }
    setIsDropdownOpen(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-800 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:border-b-0 lg:px-0 lg:py-4">
          {/* Logo - Hidden on mobile when machine is connected */}
          <Link href="/" className={machineName ? "hidden lg:block" : "block"}>
            <Image
              src={
                theme === "dark"
                  ? "/images/logo06-NR-darkTheme.png"
                  : "/images/logo06-NR.png"
              }
              alt="The Server Manager"
              width={200}
              height={40}
              className="h-8 sm:h-10 w-auto"
            />
          </Link>

          {/* Connected Machine Info - Center with Dropdown */}
          {machineName && (
            <div
              className="flex-1 flex justify-center lg:justify-center relative"
              ref={dropdownRef}
            >
              <button
                onClick={handleMachineClick}
                className="text-center hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {machineName}
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {urlApiForTsmNetwork}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {localIpAddress}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && machinesArray.length > 0 && (
                <div className="absolute top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Switch Machine
                    </div>
                    {machinesArray.map((machine) => (
                      <button
                        key={machine.publicId}
                        onClick={() => handleSelectMachine(machine)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          machine.publicId === connectedMachine?.publicId
                            ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                        }`}
                      >
                        <div className="font-medium">{machine.machineName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {machine.urlApiForTsmNetwork}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {machine.localIpAddress}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="flex lg:hidden items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-99999 dark:border-gray-800 dark:text-gray-400"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
