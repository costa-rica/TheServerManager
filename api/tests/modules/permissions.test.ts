import {
  filterMachinesForUser,
  formatMachineForResponse,
  getInvalidMachinePublicIds,
} from "../../src/modules/permissions";
import { isValidPagePath } from "../../src/modules/common";

describe("permissions module", () => {
  const machines = [
    {
      publicId: "machine-1",
      machineName: "machine-one",
      urlApiForTsmNetwork: "http://localhost:3001",
      localIpAddress: "192.168.1.10",
      nginxStoragePathOptions: ["/etc/nginx/sites-available"],
      servicesArray: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      _id: "mongo-id-1",
    },
    {
      publicId: "machine-2",
      machineName: "machine-two",
      urlApiForTsmNetwork: "http://localhost:3002",
      localIpAddress: "192.168.1.11",
      nginxStoragePathOptions: ["/etc/nginx/conf.d"],
      servicesArray: [],
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
      updatedAt: new Date("2026-01-04T00:00:00.000Z"),
      _id: "mongo-id-2",
    },
  ];

  it("returns all machines for admin users", () => {
    expect(
      filterMachinesForUser(machines, {
        isAdmin: true,
        accessServersArray: [],
      })
    ).toEqual(machines);
  });

  it("returns only allowed machines for non-admin users", () => {
    expect(
      filterMachinesForUser(machines, {
        isAdmin: false,
        accessServersArray: ["machine-2"],
      })
    ).toEqual([machines[1]]);
  });

  it("returns no machines when a non-admin user has no server access", () => {
    expect(
      filterMachinesForUser(machines, {
        isAdmin: false,
        accessServersArray: [],
      })
    ).toEqual([]);
  });

  it("calculates invalid machine publicIds while preserving request order", () => {
    expect(
      getInvalidMachinePublicIds(["machine-2", "missing-1", "missing-2"], [
        { publicId: "machine-1" },
        { publicId: "machine-2" },
      ])
    ).toEqual(["missing-1", "missing-2"]);
  });

  it("formats machine responses without leaking MongoDB _id", () => {
    const formattedMachine = formatMachineForResponse(machines[0]);

    expect(formattedMachine).toEqual({
      publicId: "machine-1",
      machineName: "machine-one",
      urlApiForTsmNetwork: "http://localhost:3001",
      localIpAddress: "192.168.1.10",
      nginxStoragePathOptions: ["/etc/nginx/sites-available"],
      servicesArray: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    expect(formattedMachine).not.toHaveProperty("_id");
  });

  it("accepts valid page access paths", () => {
    const validPaths = [
      "/dns/nginx",
      "/dns/registrar",
      "/servers/services",
      "/admin/users-management",
      "/some-path.with-dots",
    ];

    validPaths.forEach((pagePath) => {
      expect(isValidPagePath(pagePath)).toBe(true);
    });
  });

  it("rejects invalid page access paths", () => {
    const invalidPaths = ["/invalid path", "/path@with#symbols", "", "/bad path"];

    invalidPaths.forEach((pagePath) => {
      expect(isValidPagePath(pagePath)).toBe(false);
    });
  });
});
