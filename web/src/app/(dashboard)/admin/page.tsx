"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setDefaultMachine,
  clearDefaultMachine,
  connectMachine,
} from "@/store/features/machines/machineSlice";
import MachineSelect from "@/components/form/MachineSelect";
import { Machine } from "@/types/machine";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import { ModalErrorResponse } from "@/components/ui/modal/ModalErrorResponse";
import { Modal } from "@/components/ui/modal";
import TableAdminUserPrivileges from "@/components/tables/TableAdminUserPrivileges";
import { ModalAdminEditServers } from "@/components/ui/modal/ModalAdminEditServers";
import { ModalAdminEditPages } from "@/components/ui/modal/ModalAdminEditPages";
import { User } from "@/types/user";

interface DownloadFile {
  fileName: string;
  size: number;
  sizeKB: string;
  modifiedDate: string;
  isFile: boolean;
}

export default function AdminPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );
  const defaultMachine = useAppSelector(
    (state) => state.machine.defaultMachine
  );
  const machinesArray = useAppSelector((state) => state.machine.machinesArray);

  const [selectedDefaultMachine, setSelectedDefaultMachine] =
    useState<Machine | null>(null);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
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

  // User privileges state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editServersModalOpen, setEditServersModalOpen] = useState(false);
  const [editPagesModalOpen, setEditPagesModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalData, setErrorModalData] = useState<{
    code: string;
    message: string;
    details?: string;
    status: number;
  }>({
    code: "",
    message: "",
    status: 0,
  });

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info"
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  const showErrorModal = (
    code: string,
    message: string,
    status: number,
    details?: string
  ) => {
    setErrorModalData({ code, message, status, details });
    setErrorModalOpen(true);
  };

  // Initialize selected default machine from Redux
  useEffect(() => {
    if (defaultMachine) {
      setSelectedDefaultMachine(defaultMachine);
    }
  }, [defaultMachine]);

  // Fetch download files from connected machine
  const fetchDownloadFiles = useCallback(async () => {
    if (!connectedMachine) {
      setDownloadFiles([]);
      setLoadingFiles(false);
      return;
    }

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/admin/downloads`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDownloadFiles(Array.isArray(data.files) ? data.files : []);
      } else {
        console.error("Failed to fetch download files");
        setDownloadFiles([]);
      }
    } catch (error) {
      console.error("Error fetching download files:", error);
      setDownloadFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [connectedMachine, token]);

  useEffect(() => {
    fetchDownloadFiles();
  }, [fetchDownloadFiles]);

  // Fetch users for admin privileges table
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/admin/users`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Failed to fetch users:", errorData);
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSetDefaultMachine = () => {
    if (!selectedDefaultMachine) {
      showInfoModal(
        "No Machine Selected",
        "Please select a machine to set as default.",
        "warning"
      );
      return;
    }

    dispatch(setDefaultMachine(selectedDefaultMachine));
    dispatch(connectMachine(selectedDefaultMachine));
    showInfoModal(
      "Default Machine Set",
      `${selectedDefaultMachine.machineName} has been set as the default machine and is now connected. It will auto-connect when you load the application.`,
      "success"
    );
  };

  const handleClearDefaultMachine = () => {
    dispatch(clearDefaultMachine());
    setSelectedDefaultMachine(null);
    showInfoModal(
      "Default Machine Cleared",
      "The default machine has been cleared. No machine will auto-connect on load.",
      "info"
    );
  };

  const handleDownloadFile = async (filename: string) => {
    if (!connectedMachine) {
      showInfoModal(
        "No Machine Connected",
        "Please connect to a machine to download files.",
        "warning"
      );
      return;
    }

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/admin/downloads/${filename}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Create blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => null);
        showInfoModal(
          "Download Failed",
          errorData?.error || `Failed to download ${filename}`,
          "error"
        );
      }
    } catch (error) {
      showInfoModal(
        "Download Error",
        error instanceof Error ? error.message : "Failed to download file",
        "error"
      );
    }
  };

  // User privileges handlers
  const handleEditServers = (user: User) => {
    setSelectedUser(user);
    setEditServersModalOpen(true);
  };

  const handleEditPages = (user: User) => {
    setSelectedUser(user);
    setEditPagesModalOpen(true);
  };

  const handleSaveServers = async (
    userId: string,
    selectedServerIds: string[]
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/admin/user/${userId}/access-servers`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accessServersArray: selectedServerIds }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local users array
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.publicId === userId
              ? { ...u, accessServersArray: selectedServerIds }
              : u
          )
        );
        setEditServersModalOpen(false);
        showInfoModal("Success", data.message || "Server access updated successfully", "success");
      } else {
        showErrorModal(
          data.code || "UPDATE_FAILED",
          data.error || data.message || "Failed to update server access",
          response.status,
          data.details || ""
        );
      }
    } catch (error) {
      showErrorModal(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Failed to update server access",
        500,
        "Check your network connection and try again"
      );
    }
  };

  const handleSavePages = async (userId: string, selectedPages: string[]) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/admin/user/${userId}/access-pages`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accessPagesArray: selectedPages }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local users array
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.publicId === userId
              ? { ...u, accessPagesArray: selectedPages }
              : u
          )
        );
        setEditPagesModalOpen(false);
        showInfoModal("Success", data.message || "Page access updated successfully", "success");
      } else {
        showErrorModal(
          data.code || "UPDATE_FAILED",
          data.error || data.message || "Failed to update page access",
          response.status,
          data.details || ""
        );
      }
    } catch (error) {
      showErrorModal(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Failed to update page access",
        500,
        "Check your network connection and try again"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Admin
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure system settings and download summary reports
        </p>
      </div>

      {/* Default Machine Configuration */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Default Machine Configuration
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Set a default machine that will automatically connect when you load
          the application.
        </p>

        <div className="space-y-4">
          {/* Current Default Machine Display */}
          {defaultMachine && (
            <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
              <p className="text-sm font-medium text-success-700 dark:text-success-400">
                Current Default Machine:
              </p>
              <p className="text-base font-semibold text-success-900 dark:text-success-300 mt-1">
                {defaultMachine.machineName}
              </p>
              <p className="text-xs text-success-600 dark:text-success-500 mt-0.5 font-mono">
                {defaultMachine.urlApiForTsmNetwork}
              </p>
            </div>
          )}

          {/* Machine Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Default Machine
            </label>
            <MachineSelect
              defaultValue={selectedDefaultMachine?.publicId || ""}
              onChange={(machine) => setSelectedDefaultMachine(machine)}
              key={selectedDefaultMachine?.publicId || "empty"}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSetDefaultMachine}
              disabled={!selectedDefaultMachine}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set as Default
            </button>
            <button
              onClick={handleClearDefaultMachine}
              disabled={!defaultMachine}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Default
            </button>
          </div>
        </div>
      </div>

      {/* Summary Reports Section */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Summary Reports
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Download summary reports and logs from the connected machine.
        </p>

        {!connectedMachine ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Please connect to a machine to view available downloads.
            </p>
          </div>
        ) : loadingFiles ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Loading files...</p>
          </div>
        ) : downloadFiles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No files available for download.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {downloadFiles.map((file) => (
              <div
                key={file.fileName}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {file.sizeKB} KB •{" "}
                    {new Date(file.modifiedDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadFile(file.fileName)}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Privileges Section */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          User Privileges
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Manage user permissions for server and page access.
        </p>

        {loadingUsers ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No users found.
            </p>
          </div>
        ) : (
          <TableAdminUserPrivileges
            data={users}
            machines={machinesArray}
            onEditServers={handleEditServers}
            onEditPages={handleEditPages}
          />
        )}
      </div>

      {/* Information Modal */}
      <Modal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <ModalInformationOk
          title={infoModalData.title}
          message={infoModalData.message}
          variant={infoModalData.variant}
          onClose={() => setInfoModalOpen(false)}
        />
      </Modal>

      {/* Error Modal */}
      <Modal isOpen={errorModalOpen} onClose={() => setErrorModalOpen(false)}>
        <ModalErrorResponse
          error={errorModalData}
          onClose={() => setErrorModalOpen(false)}
        />
      </Modal>

      {/* Edit Servers Modal */}
      {selectedUser && (
        <Modal
          isOpen={editServersModalOpen}
          onClose={() => setEditServersModalOpen(false)}
        >
          <ModalAdminEditServers
            user={selectedUser}
            machines={machinesArray}
            onSave={handleSaveServers}
            onClose={() => setEditServersModalOpen(false)}
          />
        </Modal>
      )}

      {/* Edit Pages Modal */}
      {selectedUser && (
        <Modal
          isOpen={editPagesModalOpen}
          onClose={() => setEditPagesModalOpen(false)}
        >
          <ModalAdminEditPages
            user={selectedUser}
            onSave={handleSavePages}
            onClose={() => setEditPagesModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
