import { api } from './OdooService'; // shared axios with session cookie

// ── Static data ──────────────────────────────────────────────
export const CHANNELS = [
  { key: 'whatsapp',  emoji: '💬', label: 'WhatsApp',   color: '#25D366', bg: '#E8F5E9' },
  { key: 'sms',       emoji: '📱', label: 'SMS',         color: '#607D8B', bg: '#ECEFF1' },
  { key: 'email',     emoji: '📧', label: 'Email',       color: '#1976D2', bg: '#E3F2FD' },
  { key: 'facebook',  emoji: '📘', label: 'Facebook',    color: '#1877F2', bg: '#E8F0FE' },
  { key: 'instagram', emoji: '📸', label: 'Instagram',   color: '#E91E8C', bg: '#FCE4EC' },
  { key: 'tiktok',    emoji: '🎵', label: 'TikTok',      color: '#111',    bg: '#F3E5F5' },
  { key: 'linkedin',  emoji: '💼', label: 'LinkedIn',    color: '#0A66C2', bg: '#E3F2FD' },
];

export const LANGUAGES = [
  { key: 'fr',   label: '🇫🇷 Français'         },
  { key: 'en',   label: '🇬🇧 English'           },
  { key: 'both', label: '🇨🇲 Français + English' },
];

export const TONES = [
  { key: 'warm',   label: '😊 Chaleureux'     },
  { key: 'promo',  label: '🔥 Promotionnel'   },
  { key: 'luxury', label: '✨ Luxe & Élégant'  },
  { key: 'urgent', label: '⚡ Urgent'          },
];

export const TASK_TYPE_LABELS: Record<string, string> = {
  welcome:      '🟢 Accueil Nouveau Client',
  appt_confirm: '📅 Confirmation RDV',
  post_service: '⭐ Suivi Après Prestation',
  inactive:     '💤 Relance Cliente',
  birthday:     '🎂 Offre Anniversaire',
  vip:          '👑 Passage VIP',
  noshow:       '📵 Absence RDV',
  review:       '⭐ Demande d\'Avis',
  loyalty:      '🎁 Palier Fidélité',
  referral:     '📣 Programme Parrainage',
  upsell:       '🧴 Vente Additionnelle',
  seasonal:     '🌦️ Campagne Saisonnière',
  fete_nat:     '🇨🇲 Fête Nationale',
  tabaski:      '🌙 Korité / Tabaski',
  christmas:    '🎄 Noël & Nouvel An',
  source:       '📊 Source Acquisition',
  stock:        '📦 Alerte Stock',
  other:        '📋 Autre',
};

export const TASK_TYPE_AUTO_CHANNEL: Record<string, string> = {
  welcome: 'whatsapp',      appt_confirm: 'whatsapp',
  post_service: 'whatsapp', inactive: 'whatsapp',
  birthday: 'whatsapp',     vip: 'whatsapp',
  noshow: 'whatsapp',       review: 'whatsapp',
  loyalty: 'whatsapp',      referral: 'whatsapp',
  upsell: 'whatsapp',       seasonal: 'instagram',
  fete_nat: 'facebook',     tabaski: 'facebook',
  christmas: 'instagram',   source: 'whatsapp',
  stock: 'whatsapp',
};

// Default model list — overridden by fetchModels() if Odoo responds
export const DEFAULT_MODELS = [
  { id: 'meta-llama/llama-3.3-8b-instruct:free', label: 'Llama 3.3 8B (Meta) – Rapide'        },
  { id: 'mistralai/mistral-7b-instruct:free',     label: 'Mistral 7B – Équilibré'               },
  { id: 'google/gemma-3-12b-it:free',             label: 'Gemma 3 12B (Google) – Créatif'       },
  { id: 'qwen/qwen3-8b:free',                     label: 'Qwen3 8B – Meilleur Français'         },
  { id: 'deepseek/deepseek-r1-0528:free',         label: 'DeepSeek R1 – Intelligent'            },
];

export interface AiModel  { id: string; label: string }
export interface AiLogEntry {
  id:                 number;
  channel?:           string;
  language?:          string;
  tone?:              string;
  model_used?:        string;
  generated_message?: string;
  create_date?:       string;
  task_type?:         string;
}

// ── Fetch available models from Odoo ─────────────────────────
export async function fetchModels(): Promise<AiModel[]> {
  try {
    const resp = await api.post('/beauty/ai/models', {
      jsonrpc: '2.0', method: 'call', id: 1, params: {},
    });
    if (resp.data?.result?.success) {
      return resp.data.result.models as AiModel[];
    }
  } catch (e) {
    console.warn('[AiService] fetchModels failed, using defaults:', e);
  }
  return DEFAULT_MODELS;
}

// ── Generate AI message via Odoo controller ───────────────────
// POST /beauty/ai/generate
// The controller reads the OpenRouter key from ir.config_parameter
// and calls OpenRouter server-side — the key is never sent to RN.
export async function generateAiMessage(params: {
  taskType:     string;
  customerName: string;
  channel:      string;
  language:     string;
  tone:         string;
  model:        string;
  extraContext: string;
  taskId?:      number;
}): Promise<string> {

  const resp = await api.post('/beauty/ai/generate', {
    jsonrpc: '2.0',
    method:  'call',
    id:      1,
    params: {
      task_type:     params.taskType,
      customer_name: params.customerName,
      channel:       params.channel,
      language:      params.language,
      tone:          params.tone,
      model:         params.model,
      extra_context: params.extraContext,
      task_id:       params.taskId ?? null,
    },
  });

  const result = resp.data?.result;

  if (!result) {
    throw new Error('Aucune réponse du serveur Odoo.');
  }
  if (!result.success) {
    throw new Error(result.error ?? 'Erreur lors de la génération.');
  }

  return result.message as string;
}

// ── Fetch AI logs for a task ──────────────────────────────────
// GET /beauty/ai/logs/<task_id>
export async function fetchAiLogs(taskId: number): Promise<AiLogEntry[]> {
  try {
    const resp = await api.post(`/beauty/ai/logs/${taskId}`, {
      jsonrpc: '2.0', method: 'call', id: 1, params: {},
    });
    return (resp.data?.result?.logs ?? []) as AiLogEntry[];
  } catch {
    return [];
  }
}