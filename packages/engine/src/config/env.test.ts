import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getEnv } from "./env";

const previous = process.env.WEBETTE_TOOL_CONFIG;
afterEach(() => {
  if (previous === undefined) delete process.env.WEBETTE_TOOL_CONFIG;
  else process.env.WEBETTE_TOOL_CONFIG = previous;
});

async function envFrom(config: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webette-env-"));
  const file = path.join(dir, "webette.tool.ts");
  fs.writeFileSync(file, `export default ${config};`);
  process.env.WEBETTE_TOOL_CONFIG = file;
  return getEnv();
}

describe("tool config folders", () => {
  test("keeps folder names inside the site", async () => {
    const { env, warnings } = await envFrom(
      `{ build: { outputDirName: "out/site" }, logging: { dirName: ".logs" } }`
    );
    expect(env.build.outputDirName).toBe("out/site");
    expect(env.logging.dirName).toBe(".logs");
    expect(warnings).toEqual([]);
  });

  test("refuses folders that could leave the site", async () => {
    for (const name of ["..", "../elsewhere", "/tmp/out", "C:\\\\out", "."]) {
      const { env, warnings } = await envFrom(
        `{ build: { outputDirName: ${JSON.stringify(name)} }, logging: { dirName: ${JSON.stringify(name)} } }`
      );
      expect(env.build.outputDirName).toBe("_public");
      expect(env.logging.dirName).toBe(".webette");
      expect(warnings.map((w) => w.params.field)).toEqual([
        "logging.dirName",
        "build.outputDirName",
      ]);
    }
  });
});
