import { MockStructurerProvider } from "./mock-structurer";
import type { StructurerProvider } from "./types";

export type { StructurerProvider, StructuringResult } from "./types";

export function getStructurerProvider(): StructurerProvider {
  const provider = process.env.CURRICULUM_STRUCTURER_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockStructurerProvider();
  }

  throw new Error(`Unsupported curriculum structurer provider: ${provider}`);
}
