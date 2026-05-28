import { MockStructurerProvider } from "./mock-structurer";
import { OpenAIStructurerProvider } from "./openai-structurer";
import type { StructurerProvider } from "./types";

export { MockStructurerProvider } from "./mock-structurer";
export { OpenAIStructurerProvider } from "./openai-structurer";
export type { StructurerProvider, StructuringResult } from "./types";

export function getStructurerProvider(): StructurerProvider {
  const provider = process.env.CURRICULUM_STRUCTURER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockStructurerProvider();
  }

  if (provider === "openai") {
    return new OpenAIStructurerProvider();
  }

  throw new Error(`Unsupported curriculum structurer provider: ${provider}`);
}
