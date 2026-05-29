// Ponte server-only entre o StrategicView e o checklist-progress (Supabase).
// Separado de strategy.ts porque strategy.ts é importado tanto no
// server quanto no client (ACTION_CHECKLISTS), e o cliente Supabase
// não pode vazar no bundle do navegador.

import "server-only";
import {
  loadAllProgress,
  syncActiveScopes,
  type ProgressMap,
} from "./checklist-progress";
import type { StrategicView, SystemicSignal } from "./strategy";

/**
 * Carrega o progresso salvo dos checklists e sincroniza:
 * - apaga progresso de clientes que saíram da priorização
 * - apaga progresso de signals (niche/csm) que sumiram
 * Higiene de dados (scope=global) NUNCA é auto-resetada — só botão manual.
 */
export async function loadAndSyncProgress(
  view: StrategicView
): Promise<ProgressMap> {
  const activeCriticalAccount = view.priorities.map((p) => p.client.id);
  const activeContractExpiring = view.signals
    .filter((s): s is Extract<SystemicSignal, { kind: "contract-expiring" }> =>
      s.kind === "contract-expiring"
    )
    .map((s) => s.client.id);
  const activeNicheConcentration = view.signals
    .filter((s): s is Extract<SystemicSignal, { kind: "niche-concentration" }> =>
      s.kind === "niche-concentration"
    )
    .map((s) => `niche:${s.niche}`);
  const activeCsmLoad = view.signals
    .filter((s): s is Extract<SystemicSignal, { kind: "csm-load" }> =>
      s.kind === "csm-load"
    )
    .map((s) => `csm:${s.csm}`);

  try {
    await syncActiveScopes({
      "critical-account": activeCriticalAccount,
      "contract-expiring": activeContractExpiring,
      "niche-concentration": activeNicheConcentration,
      "csm-load": activeCsmLoad,
    });
  } catch (err) {
    // Sync falhar não deve quebrar a página
    console.error("[Strategy] sync error:", err);
  }

  return loadAllProgress();
}
