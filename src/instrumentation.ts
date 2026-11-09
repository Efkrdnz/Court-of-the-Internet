/** Runs once when the server starts. The checks live in a Node-only module. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
