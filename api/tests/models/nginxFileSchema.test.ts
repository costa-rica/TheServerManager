import { randomUUID } from "crypto";
import { NginxFile } from "../../src/models/nginxFile";

describe("NginxFile schema", () => {
  it("accepts a valid document without connecting to MongoDB", () => {
    const nginxFile = new NginxFile({
      publicId: randomUUID(),
      serverName: "example.com",
      portNumber: 3000,
      serverNameArrayOfAdditionalServerNames: [
        "www.example.com",
        "api.example.com",
      ],
      appHostServerMachinePublicId: randomUUID(),
      nginxHostServerMachinePublicId: randomUUID(),
      framework: "ExpressJS",
      storeDirectory: "/etc/nginx/sites-available",
    });

    expect(nginxFile.validateSync()).toBeUndefined();
    expect(nginxFile.serverNameArrayOfAdditionalServerNames).toHaveLength(2);
  });

  it("enforces required fields through schema validation", () => {
    const nginxFile = new NginxFile({
      serverName: "example.com",
      portNumber: 3000,
    });

    const validationError = nginxFile.validateSync();

    expect(validationError?.errors.publicId).toBeDefined();
    expect(validationError?.errors.appHostServerMachinePublicId).toBeDefined();
    expect(validationError?.errors.nginxHostServerMachinePublicId).toBeDefined();
  });

  it("allows optional fields to be omitted", () => {
    const nginxFile = new NginxFile({
      publicId: randomUUID(),
      serverName: "minimal.com",
      portNumber: 5000,
      appHostServerMachinePublicId: randomUUID(),
      nginxHostServerMachinePublicId: randomUUID(),
    });

    expect(nginxFile.validateSync()).toBeUndefined();
    expect(nginxFile.framework).toBeUndefined();
    expect(nginxFile.storeDirectory).toBeUndefined();
    expect(nginxFile.serverNameArrayOfAdditionalServerNames).toEqual([]);
  });

  it("permits the same machine publicId to be used for app and nginx hosts", () => {
    const machinePublicId = randomUUID();
    const nginxFile = new NginxFile({
      publicId: randomUUID(),
      serverName: "localhost.com",
      portNumber: 3000,
      appHostServerMachinePublicId: machinePublicId,
      nginxHostServerMachinePublicId: machinePublicId,
    });

    expect(nginxFile.validateSync()).toBeUndefined();
    expect(nginxFile.appHostServerMachinePublicId).toBe(
      nginxFile.nginxHostServerMachinePublicId
    );
  });
});
