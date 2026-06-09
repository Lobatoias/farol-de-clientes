import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;

export const ANTHROPIC_CONFIGURED = !!KEY;

let _client: Anthropic | null = null;

/**
 * Cliente Anthropic server-side. Retorna null se ANTHROPIC_API_KEY não
 * está setada (modo degradado: rotas de IA retornam erro explicativo).
 */
export function getAnthropic(): Anthropic | null {
  if (!ANTHROPIC_CONFIGURED) return null;
  if (_client) return _client;
  _client = new Anthropic({ apiKey: KEY! });
  return _client;
}

/** Modelo padrão usado nas análises. */
export const DEFAULT_MODEL = "claude-sonnet-4-5";
