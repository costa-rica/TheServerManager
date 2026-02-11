"use client";
import React, { useState } from "react";
import { Machine, ServiceConfig } from "@/types/machine";
import { ChevronDownIcon } from "@/icons";
import { useAppSelector } from "@/store/hooks";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";

interface ModalMachineEditProps {
  machine: Machine;
  onClose: () => void;
  onSubmit: (
    publicId: string,
    updateData: {
      urlApiForTsmNetwork: string;
      nginxStoragePathOptions: string[];
      servicesArray: ServiceConfig[];
    }
  ) => void;
}

export const ModalMachineEdit: React.FC<ModalMachineEditProps> = ({
  machine,
  onClose,
  onSubmit,
}) => {
  const [urlApiForTsmNetwork, setUrlApiForTsmNetwork] = useState(
    machine.urlApiForTsmNetwork || ""
  );
  const [nginxPaths, setNginxPaths] = useState<string[]>(
    machine.nginxStoragePathOptions || []
  );
  const [services, setServices] = useState<ServiceConfig[]>(
    machine.servicesArray && machine.servicesArray.length > 0
      ? machine.servicesArray
      : [
          {
            name: "",
            filename: "",
            pathToLogs: "/home/nick/logs/",
            filenameTimer: "",
            port: undefined,
          },
        ]
  );
  const [expandedServices, setExpandedServices] = useState<boolean[]>(
    machine.servicesArray && machine.servicesArray.length > 0
      ? machine.servicesArray.map(() => false) // Existing services collapsed by default
      : [true] // New empty service expanded by default
  );
  const [isCheckingServices, setIsCheckingServices] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ title: "", message: "" });

  // Get connected machine and token from Redux
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const token = useAppSelector((state) => state.user.token);

  const handleAddNginxPath = () => {
    setNginxPaths([...nginxPaths, ""]);
  };

  const handleRemoveNginxPath = (index: number) => {
    setNginxPaths(nginxPaths.filter((_, i) => i !== index));
  };

  const handleNginxPathChange = (index: number, value: string) => {
    const newPaths = [...nginxPaths];
    newPaths[index] = value;
    setNginxPaths(newPaths);
  };

  const handleAddService = () => {
    setServices([
      ...services,
      {
        name: "",
        filename: "",
        pathToLogs: "/home/nick/logs/",
        filenameTimer: "",
        port: undefined,
      },
    ]);
    setExpandedServices([...expandedServices, true]); // New service expanded by default
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    setExpandedServices(expandedServices.filter((_, i) => i !== index));
  };

  const toggleServiceExpanded = (index: number) => {
    const newExpanded = [...expandedServices];
    newExpanded[index] = !newExpanded[index];
    setExpandedServices(newExpanded);
  };

  const handleServiceChange = (
    index: number,
    field: keyof ServiceConfig,
    value: string | number | undefined
  ) => {
    const newServices = [...services];
    if (field === "port") {
      newServices[index][field] = value ? Number(value) : undefined;
    } else {
      (newServices[index][field] as string | undefined) =
        value === "" ? undefined : (value as string);
    }
    setServices(newServices);
  };

  const checkServiceFiles = async () => {
    if (!connectedMachine || !token) {
      setErrorModal({
        title: "Error",
        message:
          "No machine connected or authentication token missing. Please connect to a machine first.",
      });
      setShowErrorModal(true);
      return;
    }

    setIsCheckingServices(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/machines/check-nick-systemctl`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        let errorTitle = "Error";
        let errorMessage = "An error occurred while checking service files.";

        if (data.error) {
          if (typeof data.error === "string") {
            errorMessage = data.error;
          } else if (data.error.code && data.error.message) {
            errorTitle = data.error.code.replace(/_/g, " ");
            errorMessage = data.error.message;
            if (data.error.details) {
              errorMessage += `\n\n${data.error.details}`;
            }
          }
        }

        setErrorModal({ title: errorTitle, message: errorMessage });
        setShowErrorModal(true);
        return;
      }

      // Success - replace all existing services with the returned ones
      if (data.servicesArray && Array.isArray(data.servicesArray)) {
        const newServices: ServiceConfig[] = data.servicesArray.map(
          (service: {
            filename: string;
            port?: number;
            filenameTimer?: string;
          }) => ({
            name: "", // Will be auto-populated by backend
            filename: service.filename,
            pathToLogs: "/home/nick/logs/",
            filenameTimer: service.filenameTimer || "",
            port: service.port || undefined,
          })
        );

        setServices(newServices);
        // First service expanded, rest collapsed
        setExpandedServices(newServices.map((_, index) => index === 0));
      }
    } catch (error) {
      setErrorModal({
        title: "Network Error",
        message: `Failed to connect to the server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      setShowErrorModal(true);
    } finally {
      setIsCheckingServices(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!urlApiForTsmNetwork.trim()) {
      return;
    }

    // Ensure URL has protocol
    let apiUrl = urlApiForTsmNetwork.trim();
    if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
      apiUrl = `https://${apiUrl}`;
    }

    // Remove trailing slash(es)
    apiUrl = apiUrl.replace(/\/+$/, "");

    // Filter out empty nginx paths
    const filteredPaths = nginxPaths.filter((path) => path.trim() !== "");

    // Filter and validate services
    const filteredServices = services
      .filter(
        (service) =>
          service.filename.trim() !== "" && service.pathToLogs.trim() !== ""
      )
      .map((service) => ({
        name: service.name || "", // Preserve existing name or use empty string
        filename: service.filename.trim(),
        pathToLogs: service.pathToLogs.trim(),
        filenameTimer: service.filenameTimer?.trim() || undefined,
        port: service.port,
      }));

    // Use publicId or _id as fallback
    const machineId = machine.publicId || machine.publicId;

    onSubmit(machineId, {
      urlApiForTsmNetwork: apiUrl,
      nginxStoragePathOptions: filteredPaths,
      servicesArray: filteredServices,
    });
  };

  return (
    <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Edit Machine
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Update configuration for {machine.machineName}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* API URL */}
        <div>
          <label
            htmlFor="urlApiForTsmNetwork"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            API URL <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            id="urlApiForTsmNetwork"
            value={urlApiForTsmNetwork}
            onChange={(e) => setUrlApiForTsmNetwork(e.target.value)}
            placeholder="e.g., https://maestro03.the404api.dashanddata.com"
            className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
        </div>

        {/* Nginx Storage Path Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nginx Storage Paths
          </label>
          <div className="space-y-2">
            {nginxPaths.map((path, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={path}
                  onChange={(e) => handleNginxPathChange(index, e.target.value)}
                  placeholder="e.g., /etc/nginx/conf.d"
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                />
                {nginxPaths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNginxPath(index)}
                    className="px-3 py-2 bg-error-100 hover:bg-error-200 dark:bg-error-900/20 dark:hover:bg-error-900/30 text-error-700 dark:text-error-400 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddNginxPath}
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 font-medium transition-colors"
            >
              + Add another path
            </button>
          </div>
        </div>

        {/* Services Array */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Services
          </label>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3"
              >
                <div
                  className="flex justify-between items-center mb-2 cursor-pointer"
                  onClick={() => toggleServiceExpanded(index)}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform duration-200 text-gray-700 dark:text-gray-300 ${
                        expandedServices[index] ? "rotate-180" : ""
                      }`}
                    />
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Service {index + 1}
                      {service.name && service.name.trim() !== "" && (
                        <span>: {service.name}</span>
                      )}
                    </h4>
                  </div>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveService(index);
                      }}
                      className="text-xs px-2 py-1 bg-error-100 hover:bg-error-200 dark:bg-error-900/20 dark:hover:bg-error-900/30 text-error-700 dark:text-error-400 rounded transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Collapsible section */}
                {expandedServices[index] && (
                  <>
                    {/* Service Filename */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Filename <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={service.filename}
                        onChange={(e) =>
                          handleServiceChange(index, "filename", e.target.value)
                        }
                        placeholder="e.g., personalweb03-api.service"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      />
                    </div>

                    {/* Path to Logs */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Path to Logs <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={service.pathToLogs}
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "pathToLogs",
                            e.target.value
                          )
                        }
                        placeholder="/home/nick/logs/"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      />
                    </div>

                    {/* Filename Timer (optional) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Timer Filename (optional)
                      </label>
                      <input
                        type="text"
                        value={service.filenameTimer || ""}
                        onChange={(e) =>
                          handleServiceChange(
                            index,
                            "filenameTimer",
                            e.target.value
                          )
                        }
                        placeholder="e.g., personalweb03-api.timer"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      />
                    </div>

                    {/* Port (optional) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Port (optional)
                      </label>
                      <input
                        type="number"
                        value={service.port || ""}
                        onChange={(e) =>
                          handleServiceChange(index, "port", e.target.value)
                        }
                        placeholder="e.g., 3001"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddService}
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 font-medium transition-colors"
            >
              + Add another service
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={checkServiceFiles}
            disabled={isCheckingServices}
            className="px-6 py-2 bg-success-500 hover:bg-success-600 dark:bg-success-400 dark:hover:bg-success-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingServices ? "checking..." : "check .service files"}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
          >
            Update Machine
          </button>
        </div>
      </form>

      {/* Error Modal */}
      <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)}>
        <ModalInformationOk
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setShowErrorModal(false)}
          variant="error"
          scrollable={true}
        />
      </Modal>
    </div>
  );
};
