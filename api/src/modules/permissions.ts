interface UserPermissions {
  isAdmin: boolean;
  accessServersArray?: string[];
}

interface MachineLike {
  publicId: string;
  machineName: string;
  urlApiForTsmNetwork: string;
  localIpAddress: string;
  userHomeDir?: string;
  nginxStoragePathOptions?: string[];
  servicesArray?: unknown[];
  createdAt?: Date;
  updatedAt?: Date;
}

export function filterMachinesForUser<T extends { publicId: string }>(
  machines: T[],
  user: UserPermissions
): T[] {
  if (user.isAdmin) {
    return machines;
  }

  const allowedMachineIds = new Set(user.accessServersArray || []);
  return machines.filter((machine) => allowedMachineIds.has(machine.publicId));
}

export function getInvalidMachinePublicIds(
  requestedIds: string[],
  existingMachines: Array<{ publicId: string }>
): string[] {
  const existingIds = new Set(existingMachines.map((machine) => machine.publicId));
  return requestedIds.filter((publicId) => !existingIds.has(publicId));
}

export function formatMachineForResponse(machine: MachineLike) {
  return {
    publicId: machine.publicId,
    machineName: machine.machineName,
    urlApiForTsmNetwork: machine.urlApiForTsmNetwork,
    localIpAddress: machine.localIpAddress,
    userHomeDir: machine.userHomeDir,
    nginxStoragePathOptions: machine.nginxStoragePathOptions,
    servicesArray: machine.servicesArray,
    createdAt: machine.createdAt,
    updatedAt: machine.updatedAt,
  };
}
