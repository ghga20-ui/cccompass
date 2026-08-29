import type { ParserAdapter } from "../types.js";

export async function getParserAdapter(): Promise<ParserAdapter> {
  const adapter = process.env.PARSER_ADAPTER ?? "mock";

  if (adapter === "mock") {
    const { MockParserAdapter } = await import("./mock.js");
    return new MockParserAdapter();
  }

  if (adapter === "command") {
    const { CommandParserAdapter } = await import("./command.js");
    return new CommandParserAdapter();
  }

  if (adapter === "kordoc") {
    const { KordocParserAdapter } = await import("./kordoc.js");
    return new KordocParserAdapter();
  }

  throw new Error(`Unsupported parser adapter: ${adapter}`);
}
