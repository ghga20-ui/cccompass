import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("kordoc package selection", () => {
  it("uses the maintained kordoc package for the worker adapter", async () => {
    const packageJson = await readFile(join(process.cwd(), "package.json"), "utf8");
    const adapterSource = await readFile(join(process.cwd(), "src", "adapters", "kordoc.ts"), "utf8");

    expect(packageJson).toContain('"kordoc": "^3.1.1"');
    expect(packageJson).not.toContain('"@clazic/kordoc"');
    expect(adapterSource).toContain('from "kordoc"');
  });
});
