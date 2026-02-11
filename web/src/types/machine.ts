export interface ServiceConfig {
  name: string;
  filename: string;
  pathToLogs: string;
  filenameTimer?: string;
  port?: number;
}

export interface Machine {
  publicId: string;
  machineName: string;
  urlApiForTsmNetwork: string;
  localIpAddress: string;
  userHomeDir?: string;
  nginxStoragePathOptions: string[];
  servicesArray?: ServiceConfig[];
  dateCreated: string;
  dateLastModified: string;
  __v: number;
}

export interface MachinesResponse {
  result: boolean;
  existingMachines: Machine[];
}
