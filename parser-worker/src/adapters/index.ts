import { CommandParserAdapter } from "./command.js";
import { MockParserAdapter } from "./mock.js";
import type { ParserAdapter } from "../types.js";

export function getParserAdapter(): ParserAdapter {
  const adapter = process.env.PARSER_ADAPTER ?? "mock";

  if (adapter === "mock") {
    return new MockParserAdapter();
  }

  if (adapter === "command") {
    return new CommandParserAdapter();
  }

  throw new Error(`Unsupported parser adapter: ${adapter}`);
}
