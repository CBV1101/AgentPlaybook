export async function register() {
  const { assertProductionSupabaseConfig } = await import("./lib/data/mode");
  assertProductionSupabaseConfig();
}
