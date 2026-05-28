import type { StructurerProvider, StructuringResult } from "./types";

export class OpenAIStructurerProvider implements StructurerProvider {
  async structure(): Promise<StructuringResult> {
    throw new Error(
      "OpenAIStructurerProvider is not wired yet. Add the OpenAI Responses API call with structured output before setting CURRICULUM_STRUCTURER_PROVIDER=openai.",
    );
  }
}
