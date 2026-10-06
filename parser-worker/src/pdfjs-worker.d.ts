// PDFJS 4 ships types for its public API, but not its worker entry point.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: { setup: (...args: unknown[]) => void };
}
