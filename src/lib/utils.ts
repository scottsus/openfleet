/**
 * Sleeps for time_ms number of milliseconds
 */
export async function sleep(time_ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, time_ms));
}
