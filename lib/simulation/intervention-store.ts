/**
 * In-memory wait for Chief mid-simulation intervention (after round 5).
 * Same deployment constraints as hitl-store (single-server).
 */

export type ChiefInterventionUserResponse = {
  answer: string | null;
  skipped: boolean;
  timedOut?: boolean;
};

export const chiefInterventionStore = new Map<
  string,
  {
    resolve: (r: ChiefInterventionUserResponse) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

export function waitForChiefInterventionResponse(
  simulationId: string,
  timeoutMs: number,
): Promise<ChiefInterventionUserResponse> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chiefInterventionStore.delete(simulationId);
      resolve({ answer: null, skipped: true, timedOut: true });
    }, timeoutMs);

    chiefInterventionStore.set(simulationId, {
      resolve: (r) => {
        clearTimeout(timeout);
        chiefInterventionStore.delete(simulationId);
        resolve(r);
      },
      timeout,
    });
  });
}

/** Called from POST /api/simulate/respond when the user answers or skips. */
export function resolveChiefInterventionResponse(
  simulationId: string,
  response: ChiefInterventionUserResponse,
): boolean {
  const pending = chiefInterventionStore.get(simulationId);
  if (!pending) return false;
  pending.resolve(response);
  return true;
}
