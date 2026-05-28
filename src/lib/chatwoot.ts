// Cliente REST do Chatwoot — server-only.
// Usado pra disparar alertas via WhatsApp quando um cliente vira vermelho.

import "server-only";
import type { Client } from "./types";

const URL_BASE = process.env.CHATWOOT_URL ?? "https://app.chatwoot.com";
const TOKEN = process.env.CHATWOOT_API_TOKEN;
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const INBOX_ID = process.env.CHATWOOT_INBOX_ID;
/** Contact ID do gestor que recebe os alertas (preferido). */
const TARGET_CONTACT_ID = process.env.CHATWOOT_TARGET_CONTACT_ID;
/** Alternativa: telefone E.164 do gestor (ex: +5511999999999). */
const TARGET_PHONE = process.env.CHATWOOT_TARGET_PHONE;
/** Nome do gestor (usado pra criar contato se ainda não existe). */
const TARGET_NAME = process.env.CHATWOOT_TARGET_NAME ?? "Gestor";

export const CHATWOOT_CONFIGURED = !!(TOKEN && ACCOUNT_ID && INBOX_ID);

const FETCH_TIMEOUT_MS = 8000;

class ChatwootError extends Error {
  constructor(path: string, status: number, body: string) {
    super(`Chatwoot ${path} -> ${status}: ${body.slice(0, 200)}`);
  }
}

async function cw<T>(path: string, init?: RequestInit): Promise<T> {
  if (!TOKEN || !ACCOUNT_ID) throw new Error("Chatwoot não configurado");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${URL_BASE}/api/v1/accounts/${ACCOUNT_ID}${path}`, {
      ...init,
      headers: {
        api_access_token: TOKEN,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ChatwootError(path, res.status, body);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ChatwootError(path, 0, `timeout ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

interface ContactSearchResult {
  payload: Array<{ id: number; name: string; phone_number?: string }>;
}

async function findContactByPhone(phone: string): Promise<number | null> {
  const result = await cw<ContactSearchResult>(
    `/contacts/search?q=${encodeURIComponent(phone)}`
  ).catch(() => null);
  if (!result?.payload?.length) return null;
  return result.payload[0].id;
}

interface ConversationCreateResponse {
  id: number;
}

async function createConversation(
  contactId: number,
  message: string
): Promise<number> {
  const result = await cw<ConversationCreateResponse>("/conversations", {
    method: "POST",
    body: JSON.stringify({
      source_id: contactId.toString(),
      inbox_id: Number(INBOX_ID),
      contact_id: contactId,
      message: { content: message },
    }),
  });
  return result.id;
}

async function sendMessage(conversationId: number, message: string): Promise<void> {
  await cw(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: message,
      message_type: "outgoing",
    }),
  });
}

/**
 * Envia alerta de cliente crítico via WhatsApp pro gestor configurado.
 * Não bloqueia o fluxo principal — captura erros e loga.
 */
export async function notifyCriticalClient(client: Client): Promise<void> {
  if (!CHATWOOT_CONFIGURED) {
    console.warn("[Chatwoot] não configurado, pulando notificação");
    return;
  }

  const message = buildAlertMessage(client);

  try {
    // 1) Descobre/cria o contato alvo
    let contactId: number | null = null;
    if (TARGET_CONTACT_ID) {
      contactId = Number(TARGET_CONTACT_ID);
    } else if (TARGET_PHONE) {
      contactId = await findContactByPhone(TARGET_PHONE);
      if (!contactId) {
        // Cria contato se não existe
        const created = await cw<{ payload: { contact: { id: number } } }>(
          "/contacts",
          {
            method: "POST",
            body: JSON.stringify({
              name: TARGET_NAME,
              phone_number: TARGET_PHONE,
              inbox_id: Number(INBOX_ID),
            }),
          }
        );
        contactId = created.payload.contact.id;
      }
    } else {
      console.warn("[Chatwoot] sem CONTACT_ID nem PHONE configurado");
      return;
    }

    if (!contactId) {
      console.warn("[Chatwoot] não consegui resolver contato alvo");
      return;
    }

    // 2) Cria a conversa e envia mensagem
    const conversationId = await createConversation(contactId, message);
    console.log(
      `[Chatwoot] alerta enviado pro contato ${contactId} (conv ${conversationId})`
    );
    return;
  } catch (err) {
    console.error("[Chatwoot] falha ao notificar:", err);
    // Não relança — falha de notificação não pode quebrar o fluxo de salvar Farol
  }
}

function buildAlertMessage(client: Client): string {
  const lines = [
    `🔴 *${client.name}* entrou em status CRÍTICO no Farol.`,
    "",
    `Responsável: ${client.owner}`,
  ];
  if (client.niche) lines.push(`Nicho: ${client.niche}`);
  if (client.investmentMeta || client.investmentGoogle) {
    const total = (client.investmentMeta ?? 0) + (client.investmentGoogle ?? 0);
    lines.push(
      `Investimento sob gestão: R$ ${total.toLocaleString("pt-BR")}/mês`
    );
  }
  if (client.openTickets > 0) {
    lines.push(`Tasks abertas: ${client.openTickets}`);
  }
  if (client.riskTags?.length) {
    lines.push(`Sinais: ${client.riskTags.join(", ")}`);
  }
  lines.push("");
  lines.push("Recomendação: contato imediato com o cliente.");
  lines.push("");
  lines.push("— Farol de Clientes");
  return lines.join("\n");
}
