"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import TableSubdomains, {
  Subdomain,
} from "@/components/tables/TableSubdomains";
import { Modal } from "@/components/ui/modal";
import { ModalInformationYesOrNo } from "@/components/ui/modal/ModalInformationYesOrNo";
import { ModalInformationOk } from "@/components/ui/modal/ModalInformationOk";
import Select from "@/components/form/Select";

interface Domain {
  domain: string;
  status: string;
}

export default function RegistrarPage() {
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loadingSubdomains, setLoadingSubdomains] = useState(true);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [deleteSubdomainModalOpen, setDeleteSubdomainModalOpen] =
    useState(false);
  const [subdomainToDelete, setSubdomainToDelete] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
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

  // Form state
  const [serverName, setServerName] = useState("");
  const [publicIpAddress, setPublicIpAddress] = useState("69.207.163.8");
  const [type, setType] = useState("A");
  const [submitting, setSubmitting] = useState(false);

  const token = useAppSelector((state) => state.user.token);
  const connectedMachine = useAppSelector(
    (state) => state.machine.connectedMachine
  );

  // Fetch domains on mount and when connected machine changes
  const fetchDomains = useCallback(async () => {
    if (!connectedMachine) {
      setDomains([]);
      setLoadingDomains(false);
      return;
    }

    setLoadingDomains(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/registrar/get-all-porkbun-domains`,
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

      if (response.ok) {
        const domainsArray = resJson?.domainsArray || [];
        setDomains(domainsArray);

        // Auto-select first domain if available
        if (domainsArray.length > 0 && !selectedDomain) {
          setSelectedDomain(domainsArray[0].domain);
        }
      } else {
        console.error("Failed to fetch domains");
        setDomains([]);

        // Display error to user
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        const errorFrom = resJson?.errorFrom
          ? ` (from ${resJson.errorFrom})`
          : "";
        showInfoModal(
          "Failed to Load Domains",
          `${errorMessage}${errorFrom}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      setDomains([]);
      showInfoModal(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch domains",
        "error"
      );
    } finally {
      setLoadingDomains(false);
    }
  }, [connectedMachine, token, selectedDomain]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Fetch subdomains when domain is selected
  const fetchSubdomains = useCallback(async () => {
    if (!connectedMachine || !selectedDomain) {
      setSubdomains([]);
      setLoadingSubdomains(false);
      return;
    }

    setLoadingSubdomains(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/registrar/get-all-porkbun-subdomains/${selectedDomain}`,
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

      if (response.ok) {
        const subdomainsArray = resJson?.subdomainsArray || [];

        // Transform API response to match Subdomain interface
        const transformedSubdomains = subdomainsArray.map(
          (subdomain: Subdomain, index: number) => ({
            _id: `${subdomain.name}-${subdomain.type}-${index}`, // Generate unique ID
            name: subdomain.name,
            type: subdomain.type,
            content: subdomain.content,
            ttl: subdomain.ttl || 600, // Default TTL if not provided
            prio: subdomain.prio,
            notes: subdomain.notes,
          })
        );

        setSubdomains(transformedSubdomains);
      } else {
        console.error("Failed to fetch subdomains");
        setSubdomains([]);

        // Display error to user
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        const errorFrom = resJson?.errorFrom
          ? ` (from ${resJson.errorFrom})`
          : "";
        showInfoModal(
          "Failed to Load DNS Records",
          `${errorMessage}${errorFrom}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching subdomains:", error);
      setSubdomains([]);
      showInfoModal(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch DNS records",
        "error"
      );
    } finally {
      setLoadingSubdomains(false);
    }
  }, [connectedMachine, token, selectedDomain]);

  useEffect(() => {
    fetchSubdomains();
  }, [fetchSubdomains]);

  const showInfoModal = (
    title: string,
    message: string,
    variant: "info" | "success" | "error" | "warning" = "info"
  ) => {
    setInfoModalData({ title, message, variant });
    setInfoModalOpen(true);
  };

  const handleDeleteSubdomainClick = (
    subdomainId: string,
    subdomainName: string
  ) => {
    // Find the subdomain in the array to get its type
    const subdomain = subdomains.find((s) => s._id === subdomainId);
    if (subdomain) {
      setSubdomainToDelete({
        id: subdomainId,
        name: subdomainName,
        type: subdomain.type,
      });
      setDeleteSubdomainModalOpen(true);
    }
  };

  const handleDeleteSubdomainConfirm = async () => {
    if (!subdomainToDelete || !connectedMachine || !selectedDomain) return;

    // Extract subdomain from full name
    // For "api.tu-rincon.com" with domain "tu-rincon.com", subdomain is "api"
    // For "tu-rincon.com" with domain "tu-rincon.com", subdomain is "" (root)
    let subdomain = "";
    if (subdomainToDelete.name === selectedDomain) {
      // Root domain
      subdomain = "";
    } else if (subdomainToDelete.name.endsWith(`.${selectedDomain}`)) {
      // Remove domain suffix
      subdomain = subdomainToDelete.name.slice(0, -(selectedDomain.length + 1));
    } else {
      // Unexpected format
      showInfoModal("Error", "Invalid subdomain format", "error");
      return;
    }

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/registrar/porkbun-subdomain`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            domain: selectedDomain,
            type: subdomainToDelete.type,
            subdomain: subdomain,
          }),
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        setDeleteSubdomainModalOpen(false);
        setSubdomainToDelete(null);

        // Refresh subdomains list
        fetchSubdomains();

        showInfoModal(
          "Subdomain Deleted",
          `Successfully deleted subdomain ${subdomainToDelete.name}`,
          "success"
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        const errorFrom = resJson?.errorFrom
          ? ` (from ${resJson.errorFrom})`
          : "";
        setDeleteSubdomainModalOpen(false);
        setSubdomainToDelete(null);
        showInfoModal("Error", `${errorMessage}${errorFrom}`, "error");
      }
    } catch (error) {
      setDeleteSubdomainModalOpen(false);
      setSubdomainToDelete(null);
      showInfoModal(
        "Error",
        error instanceof Error ? error.message : "Failed to delete subdomain",
        "error"
      );
    }
  };

  const handleCreateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connectedMachine) {
      showInfoModal("Error", "Please connect to a machine first", "error");
      return;
    }

    if (!selectedDomain) {
      showInfoModal("Error", "Please select a domain first", "error");
      return;
    }

    if (!serverName.trim()) {
      showInfoModal("Error", "Please enter a server name", "error");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${connectedMachine.urlApiForTsmNetwork}/registrar/create-subdomain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            domain: selectedDomain,
            subdomain: serverName.trim(),
            publicIpAddress,
            type,
          }),
        }
      );

      let resJson = null;
      const contentType = response.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        resJson = await response.json();
      }

      if (response.ok) {
        // Clear form
        setServerName("");
        setPublicIpAddress("69.207.163.8");
        setType("A");

        // Refresh subdomains list
        fetchSubdomains();

        showInfoModal(
          "Subdomain Created",
          `Successfully created subdomain ${serverName}.${selectedDomain}`,
          "success"
        );
      } else {
        const errorMessage =
          resJson?.error || `Server error: ${response.status}`;
        const errorFrom = resJson?.errorFrom
          ? ` (from ${resJson.errorFrom})`
          : "";
        showInfoModal("Error", `${errorMessage}${errorFrom}`, "error");
      }
    } catch (error) {
      showInfoModal(
        "Error",
        error instanceof Error ? error.message : "Failed to create subdomain",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Domain Selection */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Porkbun Registrar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage DNS records through Porkbun API
          </p>
        </div>

        {/* Domain Selection Dropdown */}
        <div className="flex-shrink-0 w-80 ml-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Domain
          </label>
          {loadingDomains ? (
            <div className="h-11 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </p>
            </div>
          ) : !connectedMachine ? (
            <div className="h-11 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-2 text-center">
                Connect to a machine
              </p>
            </div>
          ) : domains.length === 0 ? (
            <div className="h-11 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No domains
              </p>
            </div>
          ) : (
            <Select
              options={domains.map((domain) => ({
                value: domain.domain,
                label: `${domain.domain} (${domain.status})`,
              }))}
              placeholder="Select a domain"
              onChange={(value) => setSelectedDomain(value)}
              defaultValue={selectedDomain}
            />
          )}
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Create New DNS Record
        </h2>
        <form onSubmit={handleCreateSubdomain} className="space-y-6">
          {/* Server Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Server Name
              {selectedDomain && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  (will create: {serverName || "[name]"}.{selectedDomain})
                </span>
              )}
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name (e.g., dev, api, www)"
              disabled={!selectedDomain || !connectedMachine}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Public IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Public IP Address
            </label>
            <input
              type="text"
              value={publicIpAddress}
              onChange={(e) => setPublicIpAddress(e.target.value)}
              placeholder="Enter IP address"
              disabled={!selectedDomain || !connectedMachine}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Record Type
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Enter record type"
              disabled={!selectedDomain || !connectedMachine}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedDomain || !connectedMachine || submitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create DNS Record"}
            </button>
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Existing DNS Records
          {selectedDomain && (
            <span className="text-gray-500 dark:text-gray-400 text-base font-normal ml-2">
              for {selectedDomain}
            </span>
          )}
        </h2>
        {loadingSubdomains ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Loading DNS records...
            </p>
          </div>
        ) : !connectedMachine ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Please connect to a machine to view DNS records
            </p>
          </div>
        ) : !selectedDomain ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Please select a domain to view DNS records
            </p>
          </div>
        ) : (
          <TableSubdomains
            data={subdomains}
            handleDeleteSubdomain={handleDeleteSubdomainClick}
          />
        )}
      </div>

      {/* Delete Subdomain Modal */}
      <Modal
        isOpen={deleteSubdomainModalOpen}
        onClose={() => {
          setDeleteSubdomainModalOpen(false);
          setSubdomainToDelete(null);
        }}
      >
        <ModalInformationYesOrNo
          title="Delete DNS Record"
          message={`Are you sure you want to delete the DNS record "${subdomainToDelete?.name}"? This action cannot be undone.`}
          onYes={handleDeleteSubdomainConfirm}
          onClose={() => {
            setDeleteSubdomainModalOpen(false);
            setSubdomainToDelete(null);
          }}
          yesButtonText="Delete"
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
    </div>
  );
}
