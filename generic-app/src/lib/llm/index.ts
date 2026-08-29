import { GeminiStructurerProvider } from "./gemini-structurer";
import { MockStructurerProvider } from "./mock-structurer";
import { OpenAIStructurerProvider } from "./openai-structurer";
import type { StructurerProvider } from "./types";

export { GeminiStructurerProvider } from "./gemini-structurer";
export { MockStructurerProvider } from "./mock-structurer";
export { OpenAIStructurerProvider } from "./openai-structurer";
export type {
  CohortMode,
  StructurerProvider,
  StructuringFile,
  StructuringHints,
  StructuringResult,
} from "./types";

export function getStructurerProvider(): StructurerProvider {
  const provider = process.env.CURRICULUM_STRUCTURER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockStructurerProvider();
  }

  if (provider === "openai") {
    return new OpenAIStructurerProvider();
  }

  if (provider === "gemini") {
    return new GeminiStructurerProvider();
  }

  throw new Error(`Unsupported curriculum structurer provider: ${provider}`);
}
