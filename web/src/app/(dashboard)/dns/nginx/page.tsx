"use client";
import React, { useState, useEffect, useCallback } from "react";
import MachineSelect from "@/components/form/MachineSelect";
import { Machine } from "@/types/machine";
import { Modal } from "@/components/ui/modal";
import { ModalInformationYesOrNo } from "@/components/ui/modal/ModalInformationYesOrNo";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { useAppSelector } from "@/store/hooks";
import TableNginxFiles from "@/components/tables/TableNginxFiles";

interface NginxFile {
  publicId: string;
  serverName: string;
  portNumber: number;
  serverNameArrayOfAdditionalServerNames: string[];
  appHostServerMachinePublicId: string | null;
  machineNameAppHost: string | null;
  localIpAddressAppHost: string | null;
  nginxHostServerMachinePublicId: string | null;
  machineNameNginxHost: string | null;
  localIpAddressNginxHost: string | null;
  framework: string;
  storeDirectory: string;
  createdAt: string;
  updatedAt: string;
}

interface NginxFormState {
  appHostMachine: Machine | null;
  serverNames: string[];
  port: string;
  framework: string;
  storeDirectory: string;
}

export default function NginxPage() {
  const [formState, setFormState] = useState<NginxFormState>({
    appHostMachine: null,
    serverNames: [""],
    port: "",
    framework: "",
    storeDirectory: "",
  });

  const [serverNameErrors, setServerNameErrors] = useState<string[]>([""]);
  const [portError, setPortError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [nginxFiles, setNginxFiles] = useState<NginxFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [deleteConfigModalOpen, setDeleteConfigModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<{
    publicId: string;
    serverName: string;
  } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
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
  const [isScanning, setIsScanning] = useState(false);
  const [nullMachineIdsModalOpen, setNullMachineIdsModalOpen] = useState(false);
  const [nullMachineIdsData, setNullMachineIdsData] = useState<
    Array<{ serverName: string; portNumber: number; nullFields: string[] }>
  >([]);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine,
  );

  // Fetch nginx files on mount and when connected machine changes
  const fetchNginxFiles = useCallback(async () => {
    if (!connectedMachine) {
      setNginxFiles([]);
      setLoadingFiles(false);
      return;
    }

    setLoadingFiles(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setNginxFiles(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch nginx files");
        setNginxFiles([]);
      }
    } catch (error) {
      console.error("Error fetching nginx files:", error);
      setNginxFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [connectedMachine, token]);

  useEffect(() => {
    fetchNginxFiles();
  }, [fetchNginxFiles]);

  const handleAppHostChange = (machine: Machine | null) => {
    setFormState((prev) => ({ ...prev, appHostMachine: machine }));
  };

  // Validate domain/subdomain format
  const validateServerName = (value: string): string => {
    if (!value.trim()) {
      return "";
    }
    // Basic domain/subdomain validation
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(value)) {
      return "Invalid domain/subdomain format";
    }
    return "";
  };

  const handleServerNameChange = (index: number, value: string) => {
    const newServerNames = [...formState.serverNames];
    newServerNames[index] = value;
    setFormState((prev) => ({ ...prev, serverNames: newServerNames }));

    // Validate
    const newErrors = [...serverNameErrors];
    newErrors[index] = validateServerName(value);
    setServerNameErrors(newErrors);
  };

  const addServerName = () => {
    setFormState((prev) => ({
      ...prev,
      serverNames: [...prev.serverNames, ""],
    }));
    setServerNameErrors([...serverNameErrors, ""]);
  };

  const removeServerName = (index: number) => {
    if (formState.serverNames.length > 1) {
      const newServerNames = formState.serverNames.filter(
        (_, i) => i !== index,
      );
      const newErrors = serverNameErrors.filter((_, i) => i !== index);
      setFormState((prev) => ({ ...prev, serverNames: newServerNames }));
      setServerNameErrors(newErrors);
    }
  };

  // Validate port number (1-65535)
  const validatePort = (value: string): string => {
    if (!value.trim()) {
      return "Port number is required";
    }
    const portNum = parseInt(value, 10);
    if (isNaN(portNum)) {
      return "Port must be a number";
    }
    if (portNum < 1 || portNum > 65535) {
      return "Port must be between 1 and 65535";
    }
    return "";
  };

  const handlePortChange = (value: string) => {
    setFormState((prev) => ({ ...prev, port: value }));
    setPortError(validatePort(value));
  };

  const handleFrameworkChange = (value: string) => {
    setFormState((prev) => ({ ...prev, framework: value }));
  };

  const handleStoreDirectoryChange = (value: string) => {
    setFormState((prev) => ({ ...prev, storeDirectory: value }));
  };

  const validateForm = (): boolean => {
    // Validate Connected Machine
    if (!connectedMachine) {
      showInfoModal(
        "Validation Error",
        "Please connect to a machine first",
        "error",
      );
      return false;
    }

    // Validate App Host Machine
    if (!formState.appHostMachine) {
      showInfoModal(
        "Validation Error",
        "Please select an App Host Machine",
        "error",
      );
      return false;
    }

    // Validate Server Names
    const validServerNames = formState.serverNames.filter(
      (name) => name.trim() !== "",
    );
    if (validServerNames.length === 0) {
      showInfoModal(
        "Validation Error",
        "Please enter at least one server name",
        "error",
      );
      return false;
    }

    // Check for server name errors
    const hasServerNameErrors = serverNameErrors.some((error) => error !== "");
    if (hasServerNameErrors) {
      showInfoModal(
        "Validation Error",
        "Please fix server name errors before submitting",
        "error",
      );
      return false;
    }

    // Validate Port
    if (!formState.port || portError) {
      showInfoModal(
        "Validation Error",
        "Please enter a valid port number (1-65535)",
        "error",
      );
      return false;
    }

    // Validate Framework
    if (!formState.framework) {
      showInfoModal(
        "Validation Error",
        "Please select an app technology",
        "error",
      );
      return false;
    }

    // Validate Store Directory
    if (!formState.storeDirectory) {
      showInfoModal(
        "Validation Error",
        "Please select a config store directory",
        "error",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        templateFileName: formState.framework,
        serverNamesArray: formState.serverNames.filter(
          (name) => name.trim() !== "",
        ),
        // appHostServerMachineId: formState.appHostMachine!.publicId,
        appHostServerMachinePublicId: formState.appHostMachine!.publicId,
        portNumber: parseInt(formState.port, 10),
        saveDestination: formState.storeDirectory,
      };

      const response = await fetch(
        `${connectedMachine!.urlApiForTsmNetwork}/nginx/create-config-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        setIsSubmitting(false);

        // Clear form
        setFormState({
          appHostMachine: null,
          serverNames: [""],
          port: "",
          framework: "",
          storeDirectory: "",
        });
        setServerNameErrors([""]);
        setPortError("");
        setFormResetKey((prev) => prev + 1); // Force MachineSelect to reset

        // Refresh nginx files list
        fetchNginxFiles();

        showInfoModal(
          "Configuration Created",
          `Successfully created nginx configuration file at ${
            resJson?.filePath || "the specified location"
          }`,
          "success",
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        setIsSubmitting(false);
        showInfoModal("Error", errorMessage, "error");
      }
    } catch (error) {
      setIsSubmitting(false);
      showInfoModal(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create nginx config file",
        "error",
      );
    }
  };

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info",
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  const handleDeleteConfigClick = (configId: string, serverName: string) => {
    setConfigToDelete({ publicId: configId, serverName });
    setDeleteConfigModalOpen(true);
  };

  const handleDeleteConfigConfirm = async () => {
    if (!configToDelete || !connectedMachine) return;

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx/${configToDelete.publicId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        setDeleteConfigModalOpen(false);
        setConfigToDelete(null);

        // Refresh nginx files list
        fetchNginxFiles();

        showInfoModal(
          "Configuration Deleted",
          `Successfully deleted configuration for ${configToDelete.serverName}`,
          "success",
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        setDeleteConfigModalOpen(false);
        setConfigToDelete(null);
        showInfoModal("Error", errorMessage, "error");
      }
    } catch (error) {
      setDeleteConfigModalOpen(false);
      setConfigToDelete(null);
      showInfoModal(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to delete configuration",
        "error",
      );
    }
  };

  const handleDeleteTableClick = () => {
    if (!connectedMachine) {
      showInfoModal(
        "No Machine Connected",
        "Please connect to a machine before clearing the table.",
        "warning",
      );
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleDeleteTableConfirm = async () => {
    if (!connectedMachine) return;

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx/clear`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        setDeleteModalOpen(false);

        // Refresh nginx files list
        fetchNginxFiles();

        showInfoModal(
          "Table Cleared",
          `Successfully cleared ${
            resJson?.deletedCount || 0
          } nginx configuration records from the database on ${
            connectedMachine.machineName
          }.`,
          "success",
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        setDeleteModalOpen(false);
        showInfoModal("Error", errorMessage, "error");
      }
    } catch (error) {
      setDeleteModalOpen(false);
      showInfoModal(
        "Error",
        error instanceof Error ? error.message : "Failed to clear nginx files",
        "error",
      );
    }
  };

  const handleNullMachineIdsDetected = (
    configs: Array<{
      serverName: string;
      portNumber: number;
      nullFields: string[];
    }>,
  ) => {
    setNullMachineIdsData(configs);
    setNullMachineIdsModalOpen(true);
  };

  const handleScanNginxConfig = async () => {
    if (!connectedMachine) {
      showInfoModal(
        "No Machine Connected",
        "Please connect to a machine before scanning nginx configurations.",
        "warning",
      );
      return;
    }

    setIsScanning(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/nginx/scan-nginx-dir`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        setIsScanning(false);
        const { scanned, new: newCount, duplicates, errors } = resJson;

        let message = `Scan completed on ${connectedMachine.machineName}:\n\n`;
        message += `• Files scanned: ${scanned}\n`;
        message += `• New entries created: ${newCount}\n`;
        message += `• Duplicates skipped: ${duplicates}\n`;
        message += `• Errors encountered: ${errors}`;

        showInfoModal(
          "Nginx Directory Scan Complete",
          message,
          newCount > 0 ? "success" : "info",
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        setIsScanning(false);
        showInfoModal("Scan Failed", errorMessage, "error");
      }
    } catch (error) {
      setIsScanning(false);
      showInfoModal(
        "Scan Failed",
        error instanceof Error
          ? error.message
          : "Failed to scan nginx directory",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Nginx Configuration
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create and manage Nginx server configuration files
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleScanNginxConfig}
            disabled={isScanning}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center"
          >
            <span className="text-lg font-semibold leading-tight">
              {isScanning ? "Scanning..." : "Scan"}
            </span>
            <span className="text-xs font-normal leading-tight">
              (for nginx config)
            </span>
          </button>
          <button
            onClick={handleDeleteTableClick}
            className="px-4 py-2 bg-error-500 hover:bg-error-600 dark:bg-error-600 dark:hover:bg-error-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete Table
          </button>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Create New Configuration
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nginx Host Machine (Fixed to Connected Machine) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nginx Host Machine
            </label>
            {connectedMachine ? (
              <div className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                <span className="font-mono">
                  {connectedMachine.machineName} -{" "}
                  {connectedMachine.urlApiForTsmNetwork}
                </span>
              </div>
            ) : (
              <p className="text-sm text-warning-600 dark:text-warning-400">
                No machine connected. Please connect to a machine first.
              </p>
            )}
          </div>

          {/* App Host Machine */}
          <div>
            <MachineSelect
              key={formResetKey}
              label="App Host Machine"
              placeholder="Select the machine hosting the application"
              onChange={handleAppHostChange}
            />
          </div>

          {/* Server Names */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Server Names
            </label>
            <div className="space-y-3">
              {formState.serverNames.map((serverName, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) =>
                        handleServerNameChange(index, e.target.value)
                      }
                      placeholder={
                        index === 0
                          ? "Primary server name (e.g., example.com)"
                          : "Additional server name"
                      }
                      className={`h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${
                        serverNameErrors[index]
                          ? "border-error-300 focus:border-error-300 focus:ring-error-500/10 dark:border-error-700 dark:focus:border-error-800"
                          : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
                      } dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30`}
                    />
                    {serverNameErrors[index] && (
                      <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                        {serverNameErrors[index]}
                      </p>
                    )}
                  </div>
                  {formState.serverNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServerName(index)}
                      className="mt-1.5 h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-error-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-error-400"
                      title="Remove server name"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addServerName}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="text-lg leading-none">+</span>
              Add Additional Server Name
            </button>
          </div>

          {/* Port Number */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Port Number
            </label>
            <input
              type="number"
              value={formState.port}
              onChange={(e) => handlePortChange(e.target.value)}
              placeholder="Enter port number (e.g., 3000)"
              min="1"
              max="65535"
              className={`h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 ${
                portError
                  ? "border-error-300 focus:border-error-300 focus:ring-error-500/10 dark:border-error-700 dark:focus:border-error-800"
                  : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
              } dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30`}
            />
            {portError && (
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                {portError}
              </p>
            )}
          </div>

          {/* App Technology */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              App Technology
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              {[
                { label: "ExpressJS", value: "expressJs" },
                { label: "Next.js / Python", value: "nextJsPython" },
              ].map((framework) => (
                <label
                  key={framework.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="framework"
                    value={framework.value}
                    checked={formState.framework === framework.value}
                    onChange={(e) => handleFrameworkChange(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                    {framework.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Config Store Directory */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Config Store Directory
            </label>
            {!connectedMachine ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Please connect to a machine to see available storage directories
              </p>
            ) : connectedMachine.nginxStoragePathOptions.length === 0 ? (
              <p className="text-sm text-warning-600 dark:text-warning-400">
                No storage path options available for this machine
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                {connectedMachine.nginxStoragePathOptions.map((path) => (
                  <label
                    key={path}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="storeDirectory"
                      value={path}
                      checked={formState.storeDirectory === path}
                      onChange={(e) =>
                        handleStoreDirectoryChange(e.target.value)
                      }
                      className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors font-mono">
                      {path}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Creating Configuration..."
                : "Create Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Existing Configurations
        </h2>
        {loadingFiles ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Loading configurations...
            </p>
          </div>
        ) : !connectedMachine ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Please connect to a machine to view configurations
            </p>
          </div>
        ) : (
          <TableNginxFiles
            data={nginxFiles}
            handleDeleteConfig={handleDeleteConfigClick}
            onNullMachineIdsDetected={handleNullMachineIdsDetected}
          />
        )}
      </div>

      {/* Delete Configuration Modal */}
      <Modal
        isOpen={deleteConfigModalOpen}
        onClose={() => {
          setDeleteConfigModalOpen(false);
          setConfigToDelete(null);
        }}
      >
        <ModalInformationYesOrNo
          title="Delete Nginx Configuration"
          message={`Are you sure you want to delete the configuration for "${configToDelete?.serverName}"? This will remove the database entry but will NOT delete the actual nginx configuration file from the filesystem. This action cannot be undone.`}
          onYes={handleDeleteConfigConfirm}
          onClose={() => {
            setDeleteConfigModalOpen(false);
            setConfigToDelete(null);
          }}
          yesButtonText="Delete"
          noButtonText="Cancel"
          yesButtonStyle="danger"
        />
      </Modal>

      {/* Delete Table Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalInformationYesOrNo
          title="Clear Nginx Configuration Table"
          message="Are you sure you want to clear all nginx configuration records from the database? This will remove all entries from the NginxFiles collection but will NOT delete the actual nginx configuration files from the filesystem. This action cannot be undone."
          onYes={handleDeleteTableConfirm}
          onClose={() => setDeleteModalOpen(false)}
          yesButtonText="Clear Table"
          noButtonText="Cancel"
          yesButtonStyle="danger"
        />
      </Modal>

      {/* Information Modal */}
      <Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <ModalInformationOk
          title={infoModalData.title}
          message={infoModalData.message}
          variant={infoModalData.variant}
          onClose={() => setInfoModalOpen(false)}
        />
      </Modal>

      {/* Null Machine IDs Detection Modal */}
      <Modal
        isOpen={nullMachineIdsModalOpen}
        onClose={() => setNullMachineIdsModalOpen(false)}
      >
        <ModalInformationOk
          title="Null Machine IDs Detected"
          message={
            `The following nginx configurations have null machine ID references:\n\n` +
            nullMachineIdsData
              .map(
                (config, idx) =>
                  `${idx + 1}. Server: "${config.serverName}", Port: ${
                    config.portNumber
                  }\n   Null fields: ${config.nullFields.join(", ")}`,
              )
              .join("\n\n")
          }
          variant="error"
          scrollable={true}
          onClose={() => setNullMachineIdsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
