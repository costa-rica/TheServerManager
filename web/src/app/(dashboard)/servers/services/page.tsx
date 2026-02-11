"use client";
import React, { useState, useEffect, useCallback } from "react";
import TableMachineServices from "@/components/tables/TableMachineServices";
import TableMachineServices02 from "@/components/tables/TableMachineServices02";
import { Service, ServicesResponse } from "@/types/service";
import { useAppSelector } from "@/store/hooks";
import { Modal } from "@/components/ui/modal";
import { ModalServiceLog } from "@/components/ui/modal/ModalServiceLog";
import { ModalServiceGitManager } from "@/components/ui/modal/ModalServiceGitManager";
import { ModalNodeJsManager } from "@/components/ui/modal/ModalNodeJsManager";
import { ModalServicesManager } from "@/components/ui/modal/ModalServicesManager";
import { ModalServicesManagerEditor } from "@/components/ui/modal/ModalServicesManagerEditor";
import { ModalErrorResponse } from "@/components/ui/modal/ModalErrorResponse";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { ModalSyslog } from "@/components/ui/modal/ModalSyslog";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isNodeJsModalOpen, setIsNodeJsModalOpen] = useState(false);
  const [isServicesManagerModalOpen, setIsServicesManagerModalOpen] =
    useState(false);
  const [isServiceEditorModalOpen, setIsServiceEditorModalOpen] =
    useState(false);
  const [isSyslogModalOpen, setIsSyslogModalOpen] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(
    null
  );
  const [selectedServiceFilename, setSelectedServiceFilename] = useState<
    string | null
  >(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorModalOpen, setApiErrorModalOpen] = useState(false);
  const [apiErrorData, setApiErrorData] = useState<{
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  } | null>(null);
  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );

  const fetchServices = useCallback(async () => {
    if (!connectedMachine) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (!response.ok) {
        // Check if we have a standardized API error response
        if (
          resJson?.error &&
          resJson.error.code &&
          resJson.error.message &&
          resJson.error.status
        ) {
          // Use the new ModalErrorResponse for standardized API errors
          setApiErrorData({
            code: resJson.error.code,
            message: resJson.error.message,
            details: resJson.error.details,
            status: resJson.error.status,
          });
          setApiErrorModalOpen(true);
        } else {
          // For non-standardized errors, create a generic error object for the modal
          setApiErrorData({
            code: "FETCH_ERROR",
            message:
              resJson?.error?.message ||
              resJson?.error ||
              `Failed to fetch services: ${response.status} ${response.statusText}`,
            status: response.status,
          });
          setApiErrorModalOpen(true);
        }
        setLoading(false);
        return;
      }

      if (
        resJson &&
        resJson.servicesStatusArray &&
        Array.isArray(resJson.servicesStatusArray)
      ) {
        setServices(resJson.servicesStatusArray);
      } else {
        // Invalid response format - show error modal
        setApiErrorData({
          code: "INVALID_RESPONSE",
          message: "Invalid response format from API",
          details: "Expected servicesStatusArray field in response",
          status: response.status,
        });
        setApiErrorModalOpen(true);
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (err) {
      // Network or parsing errors
      setApiErrorData({
        code: "NETWORK_ERROR",
        message:
          err instanceof Error ? err.message : "Failed to fetch services",
        details: "Unable to connect to the server or parse the response",
        status: 0,
      });
      setApiErrorModalOpen(true);
      setLoading(false);
    }
  }, [connectedMachine, token]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleViewLogs = (serviceName: string) => {
    setSelectedServiceName(serviceName);
    setIsLogModalOpen(true);
  };

  const handleViewGit = (serviceName: string) => {
    setSelectedServiceName(serviceName);
    setIsGitModalOpen(true);
  };

  const handleViewNodeJs = (serviceName: string) => {
    setSelectedServiceName(serviceName);
    setIsNodeJsModalOpen(true);
  };

  const handleEditServiceFile = (
    serviceName: string,
    serviceFilename: string
  ) => {
    setSelectedServiceName(serviceName);
    setSelectedServiceFilename(serviceFilename);
    setIsServiceEditorModalOpen(true);
  };

  const handleToggleStatus = async (
    serviceFilename: string,
    toggleStatus: string,
    serviceName: string
  ) => {
    if (!connectedMachine) {
      setApiErrorData({
        code: "NO_MACHINE",
        message: "No machine connected",
        details: "Please connect to a machine first",
        status: 400,
      });
      setApiErrorModalOpen(true);
      return;
    }

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/services/control/${serviceFilename}/${toggleStatus}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (!response.ok) {
        // Check if we have a standardized API error response
        if (
          resJson?.error &&
          resJson.error.code &&
          resJson.error.message &&
          resJson.error.status
        ) {
          // Use the new ModalErrorResponse for standardized API errors
          setApiErrorData({
            code: resJson.error.code,
            message: resJson.error.message,
            details: resJson.error.details,
            status: resJson.error.status,
          });
          setApiErrorModalOpen(true);
        } else {
          // For non-standardized errors, create a generic error object for the modal
          setApiErrorData({
            code: "TOGGLE_ERROR",
            message:
              resJson?.error?.message ||
              resJson?.error ||
              `Failed to ${toggleStatus} service: ${response.status} ${response.statusText}`,
            details: `Service: ${serviceName}`,
            status: response.status,
          });
          setApiErrorModalOpen(true);
        }
        return;
      }

      // Refresh services list after successful toggle
      await fetchServices();
    } catch (err) {
      console.error("Error toggling service:", err);
      // Network or parsing errors
      setApiErrorData({
        code: "NETWORK_ERROR",
        message:
          err instanceof Error
            ? err.message
            : `Failed to ${toggleStatus} service ${serviceName}`,
        details: "Unable to connect to the server",
        status: 0,
      });
      setApiErrorModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Services
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor and manage systemd services on your server
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsSyslogModalOpen(true)}
            className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors text-sm"
          >
            syslog
          </button>
          <button
            type="button"
            onClick={() => setIsServicesManagerModalOpen(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Create Service File
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Loading services...
          </p>
        </div>
      )}

      {/* No Machine Connected State */}
      {!loading && !connectedMachine && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Please connect to a machine to view services
          </p>
        </div>
      )}

      {/* Services Table */}
      {!loading && connectedMachine && (
        <TableMachineServices02
          data={services}
          handleViewLogs={handleViewLogs}
          handleViewGit={handleViewGit}
          handleViewNodeJs={handleViewNodeJs}
          handleEditServiceFile={handleEditServiceFile}
          handleToggleStatus={handleToggleStatus}
        />
      )}

      {/* Service Log Modal */}
      {selectedServiceName && (
        <Modal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setSelectedServiceName(null);
          }}
          isFullscreen={true}
          showCloseButton={true}
        >
          <ModalServiceLog
            serviceName={selectedServiceName}
            onClose={() => {
              setIsLogModalOpen(false);
              setSelectedServiceName(null);
            }}
            onError={(errorData) => {
              setApiErrorData(errorData);
              setApiErrorModalOpen(true);
            }}
          />
        </Modal>
      )}

      {/* Git Manager Modal */}
      {selectedServiceName && (
        <Modal
          isOpen={isGitModalOpen}
          onClose={() => {
            setIsGitModalOpen(false);
            setSelectedServiceName(null);
          }}
          showCloseButton={true}
        >
          <ModalServiceGitManager
            serviceName={selectedServiceName}
            onClose={() => {
              setIsGitModalOpen(false);
              setSelectedServiceName(null);
            }}
            onError={(errorData) => {
              setIsGitModalOpen(false);
              setApiErrorData(errorData);
              setApiErrorModalOpen(true);
            }}
            onSuccess={() => {
              // Optionally refresh services after git actions
              fetchServices();
            }}
          />
        </Modal>
      )}

      {/* Node.js Manager Modal */}
      {selectedServiceName && (
        <Modal
          isOpen={isNodeJsModalOpen}
          onClose={() => {
            setIsNodeJsModalOpen(false);
            setSelectedServiceName(null);
          }}
          showCloseButton={true}
        >
          <ModalNodeJsManager
            serviceName={selectedServiceName}
            onClose={() => {
              setIsNodeJsModalOpen(false);
              setSelectedServiceName(null);
            }}
            onError={(errorData) => {
              setIsNodeJsModalOpen(false);
              setApiErrorData(errorData);
              setApiErrorModalOpen(true);
            }}
          />
        </Modal>
      )}

      {/* Services Manager Modal */}
      <Modal
        isOpen={isServicesManagerModalOpen}
        onClose={() => setIsServicesManagerModalOpen(false)}
        showCloseButton={true}
      >
        <ModalServicesManager
          onClose={() => setIsServicesManagerModalOpen(false)}
          onError={(errorData) => {
            setIsServicesManagerModalOpen(false);
            setApiErrorData(errorData);
            setApiErrorModalOpen(true);
          }}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setSuccessModalOpen(true);
            // Optionally refresh services after creating service file
            fetchServices();
          }}
        />
      </Modal>

      {/* Service Editor Modal */}
      {selectedServiceName && selectedServiceFilename && (
        <Modal
          isOpen={isServiceEditorModalOpen}
          onClose={() => {
            setIsServiceEditorModalOpen(false);
            setSelectedServiceName(null);
            setSelectedServiceFilename(null);
          }}
          showCloseButton={true}
          className="max-w-6xl"
        >
          <ModalServicesManagerEditor
            serviceName={selectedServiceName}
            serviceFilename={selectedServiceFilename}
            onClose={() => {
              setIsServiceEditorModalOpen(false);
              setSelectedServiceName(null);
              setSelectedServiceFilename(null);
            }}
            onError={(errorData) => {
              setIsServiceEditorModalOpen(false);
              setApiErrorData(errorData);
              setApiErrorModalOpen(true);
            }}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setSuccessModalOpen(true);
            }}
          />
        </Modal>
      )}

      {/* API Error Modal */}
      {apiErrorData && (
        <Modal
          isOpen={apiErrorModalOpen}
          onClose={() => {
            setApiErrorModalOpen(false);
            setApiErrorData(null);
          }}
        >
          <ModalErrorResponse
            error={apiErrorData}
            onClose={() => {
              setApiErrorModalOpen(false);
              setApiErrorData(null);
            }}
          />
        </Modal>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          setSuccessMessage("");
        }}
      >
        <ModalInformationOk
          title="Success"
          message={successMessage}
          variant="success"
          onClose={() => {
            setSuccessModalOpen(false);
            setSuccessMessage("");
          }}
        />
      </Modal>

      {/* Syslog Modal */}
      <Modal
        isOpen={isSyslogModalOpen}
        onClose={() => setIsSyslogModalOpen(false)}
        isFullscreen={true}
        showCloseButton={true}
      >
        <ModalSyslog
          onClose={() => setIsSyslogModalOpen(false)}
          onError={(errorData) => {
            setIsSyslogModalOpen(false);
            setApiErrorData(errorData);
            setApiErrorModalOpen(true);
          }}
        />
      </Modal>
    </div>
  );
}
