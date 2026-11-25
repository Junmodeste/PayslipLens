// Cloud models can briefly refuse requests under load (429 / 500 / 503).
// Retry those with backoff; any other error fails at once.
const TRANSIENT = /\[(429|500|503)\b/;

export async function withRetry<T>(call: () => Promise<T>, delaysMs = [1_000, 3_000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      const delay = delaysMs[attempt];
      if (delay === undefined || !TRANSIENT.test((err as Error).message)) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
