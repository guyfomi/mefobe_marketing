// ⚠️  MODIFIER CES VALEURS AVEC VOS INFORMATIONS ODOO
export const ODOO_CONFIG = {
  BASE_URL: 'https://beauty.mefobe.net/',
  DATABASE: 'beauty',
  USERNAME: 'manager',
  PASSWORD: 'manager',
};

export const FCM_TOPIC = 'mefobe_marketing_team';

export const COLORS = {
  primary:   '#E91E8C',
  purple:    '#9C27B0',
  green:     '#4CAF50',
  whatsapp:  '#25D366',
  sms:       '#607D8B',
  email:     '#1976D2',
  facebook:  '#1877F2',
  instagram: '#E91E8C',
  tiktok:    '#111111',
  linkedin:  '#0A66C2',
  bgPage:    '#FDF4F9',
  border:    '#F0E0F0',
};

export const CHANNEL_CONFIG = {
  whatsapp:  { emoji:'💬', label:'WhatsApp',   color:'#25D366', bg:'#E8F5E9' },
  sms:       { emoji:'📱', label:'SMS',         color:'#607D8B', bg:'#ECEFF1' },
  email:     { emoji:'📧', label:'Email',       color:'#1976D2', bg:'#E3F2FD' },
  call:      { emoji:'📞', label:'Appel',       color:'#388E3C', bg:'#E8F5E9' },
  inperson:  { emoji:'🏪', label:'En Personne', color:'#FF6F00', bg:'#FFF3E0' },
  facebook:  { emoji:'📘', label:'Facebook',    color:'#1877F2', bg:'#E8F0FE' },
  instagram: { emoji:'📸', label:'Instagram',   color:'#E91E8C', bg:'#FCE4EC' },
  tiktok:    { emoji:'🎵', label:'TikTok',      color:'#111',    bg:'#F3E5F5' },
  linkedin:  { emoji:'💼', label:'LinkedIn',    color:'#0A66C2', bg:'#E3F2FD' },
};

export const TASK_TYPE_LABELS = {
  welcome:'🟢 Accueil',           appt_confirm:'📅 Confirmation RDV',
  post_service:'⭐ Suivi',         inactive:'💤 Relance',
  birthday:'🎂 Anniversaire',      vip:'👑 VIP',
  noshow:'📵 Absence RDV',         review:'⭐ Demande Avis',
  loyalty:'🎁 Fidélité',           referral:'📣 Parrainage',
  upsell:'🧴 Vente +',             seasonal:'🌦️ Saisonnier',
  fete_nat:'🇨🇲 Fête Nationale',   tabaski:'🌙 Korité/Tabaski',
  christmas:'🎄 Noël & Nouvel An', source:'📊 Source',
  stock:'📦 Stock',                other:'📋 Autre',
};