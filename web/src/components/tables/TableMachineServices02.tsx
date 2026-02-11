"use client";
import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Service } from "@/types/service";
import {
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoltIcon,
  TimeIcon,
  CheckCircleIcon,
  CloseIcon,
} from "@/icons";

interface TableMachineServices02Props {
  data: Service[];
  handleViewLogs: (serviceName: string) => void;
  handleViewGit: (serviceName: string) => void;
  handleViewNodeJs: (serviceName: string) => void;
  handleEditServiceFile: (serviceName: string, serviceFilename: string) => void;
  handleToggleStatus: (
    serviceFilename: string,
    toggleStatus: string,
    serviceName: string
  ) => Promise<void>;
}

export const TableMachineServices02: React.FC<TableMachineServices02Props> = ({
  data,
  handleViewLogs,
  handleViewGit,
  handleViewNodeJs,
  handleEditServiceFile,
  handleToggleStatus,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>(
    {}
  );

  const toggleRow = (serviceName: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [serviceName]: !prev[serviceName],
    }));
  };

  const handleToggle = async (
    serviceFilename: string,
    toggleStatus: string,
    serviceName: string
  ) => {
    const toggleKey = `${serviceName}-${toggleStatus}`;
    setLoadingToggles((prev) => ({ ...prev, [toggleKey]: true }));
    try {
      await handleToggleStatus(serviceFilename, toggleStatus, serviceName);
    } finally {
      setLoadingToggles((prev) => ({ ...prev, [toggleKey]: false }));
    }
  };

  const isToggleLoading = (serviceName: string, toggleStatus: string) => {
    return loadingToggles[`${serviceName}-${toggleStatus}`] || false;
  };

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: "name",
      header: "Service",
      cell: ({ row }) => {
        const service = row.original;
        const isExpanded = expandedRows[service.name];
        const hasTimer = !!service.timerStatus;

        return (
          <div className="flex items-center gap-3">
            {/* Mobile expand button - visible only on small screens */}
            <button
              type="button"
              onClick={() => toggleRow(service.name)}
              className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Service name and info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">
                  {service.name}
                </span>
                {hasTimer && (
                  <TimeIcon
                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-info-500 flex-shrink-0"
                    title="Has timer"
                  />
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {service.filename}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const service = row.original;
        const isRunning = service.status === "active";
        const isFailed = service.status === "failed";

        return (
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isRunning
                  ? "bg-success-500"
                  : isFailed
                  ? "bg-error-500"
                  : "bg-gray-400 dark:bg-gray-600"
              }`}
            />
            <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300 capitalize">
              {service.status}
            </span>
          </div>
        );
      },
    },
    {
      id: "service-controls",
      header: "Service Controls",
      cell: ({ row }) => {
        const service = row.original;
        const isRunning = service.status === "active";
        const isEnabled = service.onStartStatus === "enabled";

        return (
          <div className="hidden md:flex items-center gap-2">
            {/* Start/Stop Toggle */}
            <button
              type="button"
              onClick={() =>
                handleToggle(
                  service.filename,
                  isRunning ? "stop" : "start",
                  service.name
                )
              }
              disabled={isToggleLoading(
                service.name,
                isRunning ? "stop" : "start"
              )}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRunning
                  ? "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 hover:bg-error-200 dark:hover:bg-error-900/50"
                  : "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50"
              }`}
              title={isRunning ? "Stop service" : "Start service"}
            >
              <BoltIcon className="w-3.5 h-3.5" />
              {isRunning ? "Stop" : "Start"}
            </button>

            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={() =>
                handleToggle(
                  service.filename,
                  isEnabled ? "disable" : "enable",
                  service.name
                )
              }
              disabled={isToggleLoading(
                service.name,
                isEnabled ? "disable" : "enable"
              )}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isEnabled
                  ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={isEnabled ? "Enabled on boot" : "Disabled on boot"}
            >
              {isEnabled ? (
                <CheckCircleIcon className="w-3.5 h-3.5" />
              ) : (
                <CloseIcon className="w-3.5 h-3.5" />
              )}
              {isEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        );
      },
    },
    {
      id: "timer-info",
      header: "Timer",
      cell: ({ row }) => {
        const service = row.original;
        if (!service.timerStatus) {
          return (
            <span className="hidden md:block text-xs text-gray-400 dark:text-gray-600">
              -
            </span>
          );
        }

        const timerRunning = service.timerStatus === "active";
        const hasValidTrigger =
          service.timerTrigger && service.timerTrigger !== "n/a";

        // Extract the human-readable part after the semicolon (e.g., "3h 24min left")
        const getReadableTrigger = () => {
          if (!hasValidTrigger) return null;
          const parts = service.timerTrigger!.split(";");
          return parts.length > 1 ? parts[1].trim() : parts[0];
        };

        return (
          <div className="hidden lg:block">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  timerRunning ? "bg-info-500" : "bg-gray-400 dark:bg-gray-600"
                }`}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {timerRunning ? "Active" : "Inactive"}
              </span>
            </div>
            {hasValidTrigger && (
              <div
                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                title={service.timerTrigger}
              >
                {getReadableTrigger()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "timer-controls",
      header: "Timer Controls",
      cell: ({ row }) => {
        const service = row.original;
        if (!service.timerStatus) {
          return (
            <span className="hidden lg:block text-xs text-gray-400 dark:text-gray-600">
              -
            </span>
          );
        }

        const timerFilename = service.filename.replace(".service", ".timer");
        const timerRunning = service.timerStatus === "active";
        const timerEnabled = service.timerOnStartStatus === "enabled";

        return (
          <div className="hidden lg:flex items-center gap-2">
            {/* Start/Stop Timer Toggle */}
            <button
              type="button"
              onClick={() =>
                handleToggle(
                  timerFilename,
                  timerRunning ? "stop" : "start",
                  service.name
                )
              }
              disabled={isToggleLoading(
                service.name,
                `timer-${timerRunning ? "stop" : "start"}`
              )}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                timerRunning
                  ? "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 hover:bg-error-200 dark:hover:bg-error-900/50"
                  : "bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400 hover:bg-info-200 dark:hover:bg-info-900/50"
              }`}
              title={timerRunning ? "Stop timer" : "Start timer"}
            >
              <TimeIcon className="w-3.5 h-3.5" />
              {timerRunning ? "Stop" : "Start"}
            </button>

            {/* Enable/Disable Timer Toggle */}
            <button
              type="button"
              onClick={() =>
                handleToggle(
                  timerFilename,
                  timerEnabled ? "disable" : "enable",
                  service.name
                )
              }
              disabled={isToggleLoading(
                service.name,
                `timer-${timerEnabled ? "disable" : "enable"}`
              )}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                timerEnabled
                  ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={timerEnabled ? "Enabled on boot" : "Disabled on boot"}
            >
              {timerEnabled ? (
                <CheckCircleIcon className="w-3.5 h-3.5" />
              ) : (
                <CloseIcon className="w-3.5 h-3.5" />
              )}
              {timerEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const service = row.original;

        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                handleEditServiceFile(service.name, service.filename)
              }
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Edit service file"
            >
              <img
                src="/assets/images/UbuntuOrangeTransparent.png"
                alt="Ubuntu"
                className="w-4 h-4 object-contain block"
              />
            </button>
            <button
              type="button"
              onClick={() => handleViewNodeJs(service.name)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Node.js manager"
            >
              <img
                src="/assets/images/logoJs.png"
                alt="Node.js"
                className="w-4 h-4 object-contain block"
              />
            </button>
            <button
              type="button"
              onClick={() => handleViewGit(service.name)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Git manager"
            >
              <img
                src="/assets/images/Git-Icon-1788C.png"
                alt="Git"
                className="w-4 h-4 object-contain block"
              />
            </button>
            <button
              type="button"
              onClick={() => handleViewLogs(service.name)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="View logs"
            >
              <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No services found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full bg-white dark:bg-gray-900">
          <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {table.getRowModel().rows.map((row) => {
              const service = row.original;
              const isExpanded = expandedRows[service.name];
              const hasTimer = !!service.timerStatus;

              return (
                <React.Fragment key={row.id}>
                  {/* Main Row */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-950/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-4 text-sm text-gray-900 dark:text-white"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Expanded Mobile Row */}
                  {isExpanded && (
                    <tr className="md:hidden bg-gray-50 dark:bg-gray-950">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* Service Controls */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                              Service Controls
                            </h4>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggle(
                                    service.filename,
                                    service.status === "active"
                                      ? "stop"
                                      : "start",
                                    service.name
                                  )
                                }
                                disabled={isToggleLoading(
                                  service.name,
                                  service.status === "active" ? "stop" : "start"
                                )}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                                  service.status === "active"
                                    ? "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400"
                                    : "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                                }`}
                              >
                                <BoltIcon className="w-3.5 h-3.5" />
                                {service.status === "active" ? "Stop" : "Start"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleToggle(
                                    service.filename,
                                    service.onStartStatus === "enabled"
                                      ? "disable"
                                      : "enable",
                                    service.name
                                  )
                                }
                                disabled={isToggleLoading(
                                  service.name,
                                  service.onStartStatus === "enabled"
                                    ? "disable"
                                    : "enable"
                                )}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                                  service.onStartStatus === "enabled"
                                    ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                                }`}
                              >
                                {service.onStartStatus === "enabled" ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5" />
                                ) : (
                                  <CloseIcon className="w-3.5 h-3.5" />
                                )}
                                {service.onStartStatus === "enabled"
                                  ? "Enabled"
                                  : "Disabled"}
                              </button>
                            </div>
                          </div>

                          {/* Timer Info and Controls */}
                          {hasTimer && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                                Timer
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      service.timerStatus === "active"
                                        ? "bg-info-500"
                                        : "bg-gray-400"
                                    }`}
                                  />
                                  <span>
                                    {service.timerStatus === "active"
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </div>
                                {service.timerTrigger &&
                                  service.timerTrigger !== "n/a" && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {service.timerTrigger.split(";").length >
                                      1
                                        ? service.timerTrigger
                                            .split(";")[1]
                                            .trim()
                                        : service.timerTrigger}
                                    </div>
                                  )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const timerFilename =
                                        service.filename.replace(
                                          ".service",
                                          ".timer"
                                        );
                                      handleToggle(
                                        timerFilename,
                                        service.timerStatus === "active"
                                          ? "stop"
                                          : "start",
                                        service.name
                                      );
                                    }}
                                    disabled={isToggleLoading(
                                      service.name,
                                      `timer-${
                                        service.timerStatus === "active"
                                          ? "stop"
                                          : "start"
                                      }`
                                    )}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                                      service.timerStatus === "active"
                                        ? "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400"
                                        : "bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400"
                                    }`}
                                  >
                                    <TimeIcon className="w-3.5 h-3.5" />
                                    {service.timerStatus === "active"
                                      ? "Stop"
                                      : "Start"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const timerFilename =
                                        service.filename.replace(
                                          ".service",
                                          ".timer"
                                        );
                                      handleToggle(
                                        timerFilename,
                                        service.timerOnStartStatus === "enabled"
                                          ? "disable"
                                          : "enable",
                                        service.name
                                      );
                                    }}
                                    disabled={isToggleLoading(
                                      service.name,
                                      `timer-${
                                        service.timerOnStartStatus === "enabled"
                                          ? "disable"
                                          : "enable"
                                      }`
                                    )}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                                      service.timerOnStartStatus === "enabled"
                                        ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                                    }`}
                                  >
                                    {service.timerOnStartStatus ===
                                    "enabled" ? (
                                      <CheckCircleIcon className="w-3.5 h-3.5" />
                                    ) : (
                                      <CloseIcon className="w-3.5 h-3.5" />
                                    )}
                                    {service.timerOnStartStatus === "enabled"
                                      ? "Enabled"
                                      : "Disabled"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableMachineServices02;
