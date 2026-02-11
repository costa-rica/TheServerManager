"use client";
import React, { useState } from "react";
import { ChevronDownIcon } from "@/icons";
import { ServiceConfig } from "@/types/machine";
import { Modal } from "@/components/ui/modal";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";

interface ModalMachineAddProps {
  onClose: () => void;
  onSubmit: (machineData: {
    urlApiForTsmNetwork: string;
    nginxStoragePathOptions: string[];
    servicesArray: ServiceConfig[];
  }) => void;
}

export const ModalMachineAdd: React.FC<ModalMachineAddProps> = ({
  onClose,
  onSubmit,
}) => {
  const [urlApiForTsmNetwork, setUrlApiForTsmNetwork] = useState("");
  const [nginxPaths, setNginxPaths] = useState<string[]>([
    "/etc/nginx/sites-available",
    "/home/nick",
  ]);
  const [isNginxPathsExpanded, setIsNginxPathsExpanded] = useState(false);
  const [services, setServices] = useState<ServiceConfig[]>([
    {
      name: "", // Will be auto-populated by backend
      filename: "",
      pathToLogs: "/home/nick/logs/",
      filenameTimer: "",
      port: undefined,
    },
  ]);
  const [expandedServices, setExpandedServices] = useState<boolean[]>([true]); // First service expanded by default
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ title: "", message: "" });

  const handleAddPath = () => {
    setNginxPaths([...nginxPaths, ""]);
  };

  const handleRemovePath = (index: number) => {
    setNginxPaths(nginxPaths.filter((_, i) => i !== index));
  };

  const handlePathChange = (index: number, value: string) => {
    const newPaths = [...nginxPaths];
    newPaths[index] = value;
    setNginxPaths(newPaths);
  };

  const handleAddService = () => {
    setServices([
      ...services,
      {
        name: "", // Will be auto-populated by backend
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
    } else if (field === "name") {
      // Name is not editable - will be auto-populated by backend
      return;
    } else {
      (newServices[index][field] as string | undefined) =
        value === "" ? undefined : (value as string);
    }
    setServices(newServices);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!urlApiForTsmNetwork.trim()) {
      setErrorModal({
        title: "API URL Required",
        message:
          "Please enter an API URL for the machine on the TSM network.",
      });
      setShowErrorModal(true);
      return;
    }

    // Ensure URL has protocol (add https:// if missing)
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
        name: "", // Will be auto-populated by backend
        filename: service.filename.trim(),
        pathToLogs: service.pathToLogs.trim(),
        filenameTimer: service.filenameTimer?.trim() || undefined,
        port: service.port,
      }));

    onSubmit({
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
          Add New Machine
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure a new Ubuntu server to monitor and manage
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
            placeholder="e.g., https://tsm-api.maestro06.dashanddata.com"
            className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
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

                {/* Filename */}
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

                {/* Collapsible section */}
                {expandedServices[index] && (
                  <>
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

        {/* Nginx Storage Path Options - Collapsible */}
        <div>
          <div
            className="flex items-center gap-2 cursor-pointer mb-2"
            onClick={() => setIsNginxPathsExpanded(!isNginxPathsExpanded)}
          >
            <ChevronDownIcon
              className={`w-5 h-5 transition-transform duration-200 text-gray-700 dark:text-gray-300 ${
                isNginxPathsExpanded ? "rotate-180" : ""
              }`}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Nginx Storage Paths
            </label>
          </div>

          {isNginxPathsExpanded && (
            <div className="space-y-2">
              {nginxPaths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handlePathChange(index, e.target.value)}
                    placeholder="e.g., /etc/nginx/conf.d"
                    className="flex-1 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                  {nginxPaths.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePath(index)}
                      className="px-3 py-2 bg-error-100 hover:bg-error-200 dark:bg-error-900/20 dark:hover:bg-error-900/30 text-error-700 dark:text-error-400 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddPath}
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-500 font-medium transition-colors"
              >
                + Add another path
              </button>
            </div>
          )}
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
            type="submit"
            className="px-6 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
          >
            Add Machine
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
        />
      </Modal>
    </div>
  );
};
