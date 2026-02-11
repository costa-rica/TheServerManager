// src/store/features/machines/machineSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Machine } from "@/types/machine";

export interface MachineState {
  machinesArray: Machine[];
  connectedMachine: Machine | null;
  defaultMachine: Machine | null;
}

const initialState: MachineState = {
  machinesArray: [],
  connectedMachine: null,
  defaultMachine: null,
};

export const machineSlice = createSlice({
  name: "machine",
  initialState,
  reducers: {
    setMachinesArray: (state, action: PayloadAction<Machine[]>) => {
      state.machinesArray = action.payload;
    },

    connectMachine: (state, action: PayloadAction<Machine>) => {
      state.connectedMachine = action.payload;
    },

    disconnectMachine: (state) => {
      state.connectedMachine = null;
    },

    setDefaultMachine: (state, action: PayloadAction<Machine | null>) => {
      state.defaultMachine = action.payload;
    },

    clearDefaultMachine: (state) => {
      state.defaultMachine = null;
    },

    clearMachines: (state) => {
      state.machinesArray = [];
      state.connectedMachine = null;
    },
  },
});

export const {
  setMachinesArray,
  connectMachine,
  disconnectMachine,
  setDefaultMachine,
  clearDefaultMachine,
  clearMachines,
} = machineSlice.actions;

export default machineSlice.reducer;
