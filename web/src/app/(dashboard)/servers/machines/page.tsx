"use client";
import React, { useState, useEffect, useCallback } from "react";
import TableMachines from "@/components/tables/TableMachines";
import { mockMachinesData } from "@/data/mockMachines";
import { Modal } from "@/components/ui/modal";
import { ModalMachineAdd } from "@/components/ui/modal/ModalMachineAdd";
import { ModalMachineEdit } from "@/components/ui/modal/ModalMachineEdit";
import { ModalInformationYesOrNo } from "@/components/ui/modal/ModalInformationYesOrNo";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { ModalErrorResponse } from "@/components/ui/modal/ModalErrorResponse";
import { Machine, ServiceConfig } from "@/types/machine";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMachinesArray } from "@/store/features/machines/machineSlice";

export default function MachinesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [apiErrorModalOpen, setApiErrorModalOpen] = useState(false);
  const [machineToEdit, setMachineToEdit] = useState<Machine | null>(null);
  const [infoModalData, setInfoModalData] = useState<{
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "warning";
  }>({
    title: "",
    message: "",
    variant: "info",
  });
  const [apiErrorData, setApiErrorData] = useState<{
    code: string;
    message: string;
    details?: string | Record<string, unknown> | Array<unknown>;
    status: number;
  } | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info"
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  // Helper function to get the API base URL
  // Uses connected machine's URL if available, otherwise falls back to external API URL
  const getApiBaseUrl = (): string => {
    return (
      connectedMachine?.urlApiForTsmNetwork ||
      process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ||
      ""
    );
  };

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if we're in mock data mode
      if (process.env.NEXT_PUBLIC_MODE === "mock_data") {
        // Use mock data
        setMachines(mockMachinesData.existingMachines);
        dispatch(setMachinesArray(mockMachinesData.existingMachines));
        setLoading(false);
      } else {
        // Fetch from API
        const response = await fetch(`${getApiBaseUrl()}/machines`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch machines: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.result && Array.isArray(data.existingMachines)) {
          setMachines(data.existingMachines);
          dispatch(setMachinesArray(data.existingMachines));
        } else {
          throw new Error("Invalid response format from API");
        }

        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch machines");
      setLoading(false);
    }
  }, [token, dispatch, connectedMachine]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleAddMachine = async (machineData: {
    urlApiForTsmNetwork: string;
    nginxStoragePathOptions: string[];
    servicesArray: ServiceConfig[];
  }) => {
    console.log("Adding machine:", machineData);

    // POST to the new machine's API endpoint to register itself
    const response = await fetch(`${machineData.urlApiForTsmNetwork}/machines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(machineData),
    });

    console.log("Received response:", response.status);

    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
    }

    if (response.ok) {
      console.log("Machine added successfully:", resJson);
      setIsModalOpen(false);

      try {
        // Refetch machines to get complete server-populated data
        await fetchMachines();
        showInfoModal("Machine Added", `Successfully added machine`, "success");
      } catch (error) {
        console.error("Error refetching machines:", error);
        showInfoModal(
          "Warning",
          "Machine added but failed to refresh list. Please refresh the page.",
          "warning"
        );
      }
    } else {
      let errorMessage =
        resJson?.error?.message ||
        resJson?.error ||
        `There was a server error: ${response.status}`;

      // Append details if available
      if (resJson?.error?.details) {
        errorMessage += `\n\n${resJson.error.details}`;
      }

      setIsModalOpen(false);
      showInfoModal("Error", errorMessage, "error");
    }
    // alert("Machine added successfully! (Mock)");
  };

  const handleDeleteMachineClick = (machineId: string, machineName: string) => {
    setMachineToDelete({ id: machineId, name: machineName });
    setDeleteModalOpen(true);
  };

  const handleDeleteMachineConfirm = async () => {
    if (!machineToDelete) return;

    console.log("Deleting machine:", machineToDelete.id);

    const response = await fetch(
      `${getApiBaseUrl()}/machines/${machineToDelete.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Received response:", response.status);

    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
    }

    if (response.ok) {
      console.log(resJson);
      try {
        setMachines((prevMachines) =>
          prevMachines.filter((machine) => machine.publicId !== machineToDelete.id)
        );
        const deletedMachineName = machineToDelete.name;
        setDeleteModalOpen(false);
        setMachineToDelete(null);
        showInfoModal(
          "Machine Deleted",
          `Successfully deleted machine: ${deletedMachineName}`,
          "success"
        );
      } catch (error) {
        console.error("Error deleting machine:", error);
        setDeleteModalOpen(false);
        setMachineToDelete(null);
        showInfoModal("Error", "Error deleting machine", "error");
      }
    } else {
      let errorMessage =
        resJson?.error?.message ||
        resJson?.error ||
        `There was a server error: ${response.status}`;

      // Append details if available
      if (resJson?.error?.details) {
        errorMessage += `\n\n${resJson.error.details}`;
      }

      setDeleteModalOpen(false);
      setMachineToDelete(null);
      showInfoModal("Error", errorMessage, "error");
    }
  };

  const handleEditMachineClick = (machine: Machine) => {
    setMachineToEdit(machine);
    setEditModalOpen(true);
  };

  const handleEditMachineSubmit = async (
    publicId: string,
    updateData: {
      urlApiForTsmNetwork: string;
      nginxStoragePathOptions: string[];
      servicesArray: ServiceConfig[];
    }
  ) => {
    const requestUrl = `${getApiBaseUrl()}/machines/${publicId}`;
    const requestBody = JSON.stringify(updateData);

    // Log the full request (only in non-production)
    if (process.env.NEXT_PUBLIC_MODE !== "production") {
      console.log("=== EDIT MACHINE REQUEST ===");
      console.log("URL:", requestUrl);
      console.log("Method: PATCH");
      console.log("Headers:", {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token?.substring(0, 20)}...`,
      });
      console.log("Body:", requestBody);
      console.log("Body (parsed):", updateData);
    }

    const response = await fetch(requestUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: requestBody,
    });

    // Log the response (only in non-production)
    if (process.env.NEXT_PUBLIC_MODE !== "production") {
      console.log("=== EDIT MACHINE RESPONSE ===");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
    }

    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
      if (process.env.NEXT_PUBLIC_MODE !== "production") {
        console.log("Response JSON:", resJson);
        console.log("Response error object:", resJson?.error);
      }
    } else {
      if (process.env.NEXT_PUBLIC_MODE !== "production") {
        console.log("Response is not JSON. Content-Type:", contentType);
      }
    }

    if (response.ok) {
      if (process.env.NEXT_PUBLIC_MODE !== "production") {
        console.log("Machine updated successfully:", resJson);
      }
      setEditModalOpen(false);
      setMachineToEdit(null);

      try {
        // Refetch machines to get updated data
        await fetchMachines();
        showInfoModal(
          "Machine Updated",
          `Successfully updated machine configuration`,
          "success"
        );
      } catch (error) {
        console.error("Error refetching machines:", error);
        showInfoModal(
          "Warning",
          "Machine updated but failed to refresh list. Please refresh the page.",
          "warning"
        );
      }
    } else {
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
        setEditModalOpen(false);
        setMachineToEdit(null);
        setApiErrorModalOpen(true);
      } else {
        // Fallback to the old info modal for non-standardized errors
        const errorMessage =
          resJson?.error?.message ||
          resJson?.error ||
          `There was a server error: ${response.status}`;
        setEditModalOpen(false);
        setMachineToEdit(null);
        showInfoModal("Error", errorMessage, "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Machines
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and connect to your Ubuntu servers
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
        >
          Add machine
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Loading machines...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 rounded-lg p-4">
          <p className="text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Machines Table */}
      {!loading && !error && (
        <TableMachines
          data={machines}
          handleDeleteMachine={handleDeleteMachineClick}
          handleEditMachine={handleEditMachineClick}
        />
      )}

      {/* Add Machine Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalMachineAdd
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddMachine}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setMachineToDelete(null);
        }}
      >
        <ModalInformationYesOrNo
          title="Delete Machine"
          message={`Are you sure you want to delete "${machineToDelete?.name}"? This action cannot be undone.`}
          onYes={handleDeleteMachineConfirm}
          onClose={() => {
            setDeleteModalOpen(false);
            setMachineToDelete(null);
          }}
          yesButtonText="Delete"
          noButtonText="Cancel"
          yesButtonStyle="danger"
        />
      </Modal>

      {/* Edit Machine Modal */}
      {machineToEdit && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setMachineToEdit(null);
          }}
        >
          <ModalMachineEdit
            machine={machineToEdit}
            onClose={() => {
              setEditModalOpen(false);
              setMachineToEdit(null);
            }}
            onSubmit={handleEditMachineSubmit}
          />
        </Modal>
      )}

      {/* Information Modal */}
      <Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <ModalInformationOk
          title={infoModalData.title}
          message={infoModalData.message}
          variant={infoModalData.variant}
          onClose={() => setInfoModalOpen(false)}
        />
      </Modal>

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
    </div>
  );
}
