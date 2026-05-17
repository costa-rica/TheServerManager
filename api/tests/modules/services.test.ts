import fs from "fs/promises";
import os from "os";
import path from "path";
import { readLogFile } from "../../src/modules/services";

async function createTempLogDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "tsm-read-log-file-"));
}

async function writeLogFile(
  dir: string,
  fileName: string,
  content: string,
  mtime: Date = new Date()
): Promise<void> {
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, content, "utf8");
  await fs.utimes(filePath, mtime, mtime);
}

describe("readLogFile", () => {
  let tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true }))
    );
    tempDirs = [];
  });

  async function makeDir(): Promise<string> {
    const dir = await createTempLogDir();
    tempDirs.push(dir);
    return dir;
  }

  it("returns_legacy_when_present", async () => {
    const dir = await makeDir();
    await writeLogFile(dir, "ExampleAPI.log", "legacy content");

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "legacy content" });
  });

  it("returns_base_dated_file", async () => {
    const dir = await makeDir();
    await writeLogFile(dir, "ExampleAPI-2026-05-17.log", "dated content");

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "dated content" });
  });

  it("returns_newest_node_overflow_by_mtime", async () => {
    const dir = await makeDir();
    await writeLogFile(
      dir,
      "ExampleAPI-2026-05-17.log",
      "older base",
      new Date("2026-05-17T10:00:00Z")
    );
    await writeLogFile(
      dir,
      "ExampleAPI-2026-05-17.log.1",
      "newer node overflow",
      new Date("2026-05-17T10:01:00Z")
    );

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "newer node overflow" });
  });

  it("returns_newest_loguru_overflow_by_mtime", async () => {
    const dir = await makeDir();
    await writeLogFile(
      dir,
      "ExampleAPI-2026-05-17.2026-05-17_12-56-30_269989.log",
      "older loguru overflow",
      new Date("2026-05-17T10:00:00Z")
    );
    await writeLogFile(
      dir,
      "ExampleAPI-2026-05-17.log",
      "newer active",
      new Date("2026-05-17T10:01:00Z")
    );

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "newer active" });
  });

  it("matches_loguru_rename_when_only_candidate", async () => {
    const dir = await makeDir();
    await writeLogFile(
      dir,
      "ExampleAPI-2026-05-17.2026-05-17_12-56-30_269989.log",
      "loguru only"
    );

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "loguru only" });
  });

  it("prefers_legacy_when_both_exist", async () => {
    const dir = await makeDir();
    await writeLogFile(dir, "ExampleAPI.log", "legacy wins");
    await writeLogFile(dir, "ExampleAPI-2026-05-17.log", "dated loses");

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result).toEqual({ success: true, content: "legacy wins" });
  });

  it("missing_directory", async () => {
    const dir = path.join(os.tmpdir(), "tsm-read-log-file-missing");

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Log directory does not exist");
    expect(result.error).toContain(dir);
  });

  it("missing_file", async () => {
    const dir = await makeDir();

    const result = await readLogFile(dir, "ExampleAPI");

    expect(result.success).toBe(false);
    expect(result.error).toContain(path.join(dir, "ExampleAPI.log"));
    expect(result.error).toContain("date-suffixed pattern");
    expect(result.error).toContain("ExampleAPI");
  });
});
