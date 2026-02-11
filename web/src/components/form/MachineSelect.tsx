"use client";

import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { Machine } from "@/types/machine";

interface MachineSelectProps {
  placeholder?: string;
  onChange: (machine: Machine | null) => void;
  className?: string;
  defaultValue?: string; // Machine _id
  label?: string;
}

const MachineSelect: React.FC<MachineSelectProps> = ({
  placeholder = "Select a machine",
  onChange,
  className = "",
  defaultValue = "",
  label,
}) => {
  // Fetch machines from Redux store
  const machinesArray = useAppSelector((state) => state.machine.machinesArray);

  // Manage the selected machine ID
  const [selectedMachineId, setSelectedMachineId] =
    useState<string>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const machineId = e.target.value;
    setSelectedMachineId(machineId);

    // Find the selected machine object and return it
    const selectedMachine =
      machinesArray.find((machine) => machine.publicId === machineId) || null;
    onChange(selectedMachine);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
          selectedMachineId
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400"
        } ${className}`}
        value={selectedMachineId}
        onChange={handleChange}
      >
        {/* Placeholder option */}
        <option
          value=""
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {placeholder}
        </option>

        {/* Map over machines */}
        {machinesArray.map((machine) => (
          <option
            key={machine.publicId}
            value={machine.publicId}
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {machine.machineName} - {machine.urlApiForTsmNetwork}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MachineSelect;
