import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { ParseResponse, ParserAdapter } from "../types.js";

function runCommand(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Parser command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Parser command exited with ${code}: ${stderr}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function parseCommandOutput(output: string, fileName: string): ParseResponse {
  const parsed: unknown = JSON.parse(output);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parser command returned non-object JSON.");
  }

  const candidate = parsed as Partial<ParseResponse>;

  if (
    typeof candidate.text !== "string" ||
    !Array.isArray(candidate.tables) ||
    !candidate.tables.every(
      (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
    )
  ) {
    throw new Error("Parser command returned invalid parse JSON.");
  }

  return {
    text: candidate.text,
    tables: candidate.tables,
    metadata: {
      parser: "command-worker",
      fileName,
      ...candidate.metadata,
    },
  };
}

export class CommandParserAdapter implements ParserAdapter {
  async parse(input: Parameters<ParserAdapter["parse"]>[0]) {
    const command = process.env.PARSER_COMMAND;

    if (!command) {
      throw new Error("PARSER_COMMAND is required when PARSER_ADAPTER=command.");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "curriculum-parser-"));
    const uploadPath = join(tempDir, `${randomUUID()}-${input.fileName}`);
    const metadataPath = join(tempDir, "metadata.json");

    try {
      await writeFile(uploadPath, input.buffer);
      await writeFile(
        metadataPath,
        JSON.stringify({
          fileName: input.fileName,
          mimeType: input.mimeType,
        }),
      );

      const timeoutMs = Number(process.env.PARSER_COMMAND_TIMEOUT_MS ?? 120000);
      const result = await runCommand(command, [uploadPath, metadataPath], timeoutMs);

      if (!result.stdout.trim()) {
        const outputPath = process.env.PARSER_OUTPUT_PATH
          ? process.env.PARSER_OUTPUT_PATH
          : join(tempDir, "output.json");

        return parseCommandOutput(await readFile(outputPath, "utf8"), input.fileName);
      }

      return parseCommandOutput(result.stdout, input.fileName);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
