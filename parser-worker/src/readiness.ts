import { getParserAdapter } from "./adapters/index.js";

const readinessTimeoutMs = 5000;

export async function checkParserReadiness() {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const readiness = await Promise.race([
      getParserAdapter().then((adapter) => adapter.checkReadiness()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Readiness timed out.")), readinessTimeoutMs);
      }),
    ]);
    const build = [process.env.RENDER_GIT_COMMIT, process.env.GIT_COMMIT_SHA]
      .find((value) => value !== undefined && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value));

    return {
      status: 200,
      body: { ok: true, ready: true, ...readiness, ...(build ? { build } : {}) },
    };
  } catch {
    // Keep module errors, command configuration, and environment values private.
    return { status: 503, body: { ok: false, ready: false, error: "parser-not-ready" } };
  } finally {
    clearTimeout(timer);
  }
}
