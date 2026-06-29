import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Share, Platform,
} from 'react-native';
import { LinearGradient }  from 'expo-linear-gradient';
import { SafeAreaView }    from 'react-native-safe-area-context';
import * as Clipboard      from 'expo-clipboard';
import { Ionicons }        from '@expo/vector-icons';
import { COLORS, CHANNEL_CONFIG, TASK_TYPE_LABELS } from '../constants';
import {
  CHANNELS, LANGUAGES, TONES,
  TASK_TYPE_AUTO_CHANNEL, DEFAULT_MODELS,
  fetchModels, generateAiMessage,
  AiModel, AiLogEntry,
} from '../services/AiService';
import { SendMessageHelper } from '../utils/SendMessageHelper';

interface Params {
  taskId?:       number;
  taskType?:     string;
  customerName?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  channel?:      string;
}

export default function AiMessageScreen({ route, navigation }: any) {
  const p: Params = route?.params ?? {};

  // ── Form state ────────────────────────────────────────────
  const [taskType,     setTaskType]     = useState(p.taskType      ?? 'welcome');
  const [customerName, setCustomerName] = useState(p.customerName  ?? '');
  const [extraContext, setExtraContext] = useState('');
  const [channel,      setChannel]      = useState(p.channel       ?? 'whatsapp');
  const [language,     setLanguage]     = useState('fr');
  const [tone,         setTone]         = useState('warm');
  const [model,        setModel]        = useState(DEFAULT_MODELS[0].id);

  // ── UI state ──────────────────────────────────────────────
  const [models,       setModels]       = useState<AiModel[]>(DEFAULT_MODELS);
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [loadingModels,setLoadingModels]= useState(true);
  const [copied,       setCopied]       = useState(false);
  const [sent,         setSent]         = useState(false);
  const [savedOdoo,    setSavedOdoo]    = useState(false);
  const [showTT,       setShowTT]       = useState(false);
  const [showModel,    setShowModel]    = useState(false);

  // ── Load available models from Odoo on mount ──────────────
  useEffect(() => {
    fetchModels()
      .then(m => { setModels(m); setModel(m[0]?.id ?? DEFAULT_MODELS[0].id); })
      .finally(() => setLoadingModels(false));
  }, []);

  // ── Auto-select channel when task type changes ────────────
  useEffect(() => {
    if (!p.channel) {
      setChannel(TASK_TYPE_AUTO_CHANNEL[taskType] ?? 'whatsapp');
    }
  }, [taskType]);

  // ── Generate message via Odoo controller ──────────────────
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setGeneratedMsg('');
    setSavedOdoo(false);
    setSent(false);

    try {
      const msg = await generateAiMessage({
        taskType,
        customerName: customerName || 'Chère cliente',
        channel,
        language,
        tone,
        model,
        extraContext,
        taskId: p.taskId,
      });
      setGeneratedMsg(msg);
    } catch (e: any) {
      Alert.alert(
        '❌ Erreur de génération',
        e.message ?? 'Une erreur est survenue. Vérifiez la configuration Odoo.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [taskType, customerName, channel, language, tone, model, extraContext]);

  // ── Copy to clipboard ─────────────────────────────────────
  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Send via channel ──────────────────────────────────────
  const handleSend = async () => {
    const phone = p.partnerPhone ?? '';
    const email = p.partnerEmail ?? '';

    switch (channel) {
      case 'whatsapp': await SendMessageHelper.openWhatsApp(phone, generatedMsg); break;
      case 'sms':      await SendMessageHelper.openSms(phone, generatedMsg);      break;
      case 'email':    await SendMessageHelper.openEmail(email, customerName, generatedMsg); break;
      default:
        await Clipboard.setStringAsync(generatedMsg);
        await Share.share({ message: generatedMsg });
        break;
    }
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  // ── Share to social ───────────────────────────────────────
  const handleShare = async () => {
    await Share.share({ message: generatedMsg });
  };

  const ch = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.whatsapp;
  const canSendDirect = ['whatsapp', 'sms', 'email'].includes(channel);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }} edges={['top']}>

      {/* ── Header ────────────────────────────────────────── */}
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>✨ Générateur IA</Text>
            <Text style={s.headerSub}>
              {loading
                ? '⏳ Odoo → OpenRouter...'
                : generatedMsg
                ? '✅ Message prêt à envoyer'
                : 'Via contrôleur Odoo · Clé sécurisée 🔒'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AiSettings')}
            style={s.settingsBtn}
          >
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#fdf4f9' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 1. Customer & Context ─────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>👤 Cliente & Contexte</Text>

          {/* Customer name */}
          <Text style={s.label}>Prénom de la cliente</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="ex: Aminata, Marie, Solange..."
            style={s.input}
            placeholderTextColor="#bbb"
            returnKeyType="done"
          />

          {/* Task type picker */}
          <Text style={s.label}>Type de tâche</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowTT(!showTT)}>
            <Text style={s.pickerTxt}>
              {TASK_TYPE_LABELS[taskType] ?? '📋 Autre'}
            </Text>
            <Ionicons
              name={showTT ? 'chevron-up' : 'chevron-down'}
              size={18} color="#888"
            />
          </TouchableOpacity>

          {showTT && (
            <ScrollView
              style={s.dropdown}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.dropItem, taskType === k && s.dropItemActive]}
                  onPress={() => { setTaskType(k); setShowTT(false); }}
                >
                  <Text style={[s.dropTxt, taskType === k && s.dropTxtActive]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Extra context */}
          <Text style={s.label}>Détails supplémentaires (optionnel)</Text>
          <TextInput
            value={extraContext}
            onChangeText={setExtraContext}
            placeholder="ex: offrir 15% de réduction, elle a eu un lissage..."
            style={[s.input, { height: 72 }]}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#bbb"
          />
        </View>

        {/* ── 2. Message options ─────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🎛️ Options</Text>

          {/* Channel */}
          <Text style={s.label}>Canal</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', gap: 7, paddingVertical: 4 }}>
              {CHANNELS.map(c => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setChannel(c.key)}
                  style={[
                    s.chip,
                    channel === c.key && { backgroundColor: c.color },
                  ]}
                >
                  <Text style={[s.chipTxt, channel === c.key && { color: '#fff' }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Language */}
          <Text style={s.label}>Langue</Text>
          <View style={s.optRow}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[s.optBtn, language === l.key && s.optBtnActive]}
                onPress={() => setLanguage(l.key)}
              >
                <Text style={[s.optTxt, language === l.key && s.optTxtActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tone */}
          <Text style={s.label}>Ton</Text>
          <View style={s.optRow}>
            {TONES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[
                  s.optBtn,
                  tone === t.key && { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
                ]}
                onPress={() => setTone(t.key)}
              >
                <Text style={[s.optTxt, tone === t.key && s.optTxtActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Model */}
          <Text style={s.label}>Modèle IA</Text>
          {loadingModels ? (
            <View style={[s.picker, { justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <TouchableOpacity style={s.picker} onPress={() => setShowModel(!showModel)}>
              <Text style={[s.pickerTxt, { flex: 1 }]} numberOfLines={1}>
                {models.find(m => m.id === model)?.label ?? model}
              </Text>
              <Ionicons
                name={showModel ? 'chevron-up' : 'chevron-down'}
                size={18} color="#888"
              />
            </TouchableOpacity>
          )}

          {showModel && (
            <View style={s.dropdown}>
              {models.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.dropItem, model === m.id && s.dropItemActive]}
                  onPress={() => { setModel(m.id); setShowModel(false); }}
                >
                  <Text style={[s.dropTxt, model === m.id && s.dropTxtActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.securityNote}>
            🔒 La clé API n'est pas dans l'app · Odoo appelle OpenRouter
          </Text>
        </View>

        {/* ── 3. Generate button ─────────────────────────── */}
        <TouchableOpacity
          style={[s.generateBtn, loading && { opacity: 0.7 }]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.purple]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.generateGrad}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.generateTxt}>Génération via Odoo...</Text>
              </View>
            ) : (
              <Text style={s.generateTxt}>
                {generatedMsg ? '🔄 Regénérer' : '✨ Générer le Message'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── 4. Result card ────────────────────────────── */}
        {generatedMsg !== '' && (
          <View style={s.card}>

            {/* Channel badge + meta */}
            <View style={s.resultHeader}>
              <View style={[s.chBadge, { backgroundColor: ch.bg }]}>
                <Text style={[s.chBadgeTxt, { color: ch.color }]}>
                  {ch.emoji} {ch.label}
                </Text>
              </View>
              <Text style={s.resultMeta}>
                {LANGUAGES.find(l => l.key === language)?.label}
                {'  ·  '}
                {TONES.find(t => t.key === tone)?.label}
              </Text>
              {savedOdoo && (
                <View style={s.savedBadge}>
                  <Text style={s.savedBadgeTxt}>💾 Odoo</Text>
                </View>
              )}
            </View>

            {/* Message text (selectable) */}
            <ScrollView style={s.msgBox} nestedScrollEnabled>
              <Text style={s.msgTxt} selectable>{generatedMsg}</Text>
            </ScrollView>

            {/* Action row: Regenerate · Copy · Save to Odoo */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#f5f0f5' }]}
                onPress={handleGenerate}
              >
                <Ionicons name="refresh" size={15} color={COLORS.primary} />
                <Text style={[s.actionBtnTxt, { color: COLORS.primary }]}>Relancer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: copied ? COLORS.green : '#f5f0f5' }]}
                onPress={handleCopy}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={copied ? '#fff' : '#555'}
                />
                <Text style={[s.actionBtnTxt, { color: copied ? '#fff' : '#555' }]}>
                  {copied ? 'Copié !' : 'Copier'}
                </Text>
              </TouchableOpacity>

              {p.taskId && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: savedOdoo ? COLORS.green : '#1976D2' }]}
                  onPress={() => setSavedOdoo(true)}
                >
                  <Ionicons
                    name={savedOdoo ? 'checkmark-circle' : 'cloud-upload-outline'}
                    size={15} color="#fff"
                  />
                  <Text style={[s.actionBtnTxt, { color: '#fff' }]}>
                    {savedOdoo ? 'Sauvé' : 'Odoo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Main send / share button */}
            {sent ? (
              <View style={s.sentBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                <Text style={s.sentTxt}>Message envoyé avec succès !</Text>
              </View>
            ) : canSendDirect ? (
              <TouchableOpacity
                style={[s.sendBtn, { backgroundColor: ch.color }]}
                onPress={handleSend}
              >
                <Text style={s.sendBtnTxt}>
                  {channel === 'whatsapp' ? '💬 Envoyer via WhatsApp'
                   : channel === 'sms'    ? '📱 Envoyer par SMS'
                                          : '📧 Envoyer par Email'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[s.sendBtn, { flex: 1, backgroundColor: ch.color }]}
                  onPress={handleCopy}
                >
                  <Text style={s.sendBtnTxt}>📋 Copier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sendBtn, { flex: 1, backgroundColor: COLORS.purple }]}
                  onPress={handleShare}
                >
                  <Text style={s.sendBtnTxt}>📤 Partager</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:         { paddingHorizontal: 14, paddingVertical: 12 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:    { color: '#fff', fontWeight: '900', fontSize: 16 },
  headerSub:      { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  backBtn:        { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
                    width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  settingsBtn:    { padding: 6 },
  card:           { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16,
                    padding: 16, borderWidth: 1.5, borderColor: '#f0e0f0',
                    shadowColor: '#E91E8C', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:      { fontWeight: '900', fontSize: 14, color: '#1a1a2e', marginBottom: 14 },
  label:          { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 6, marginTop: 12 },
  input:          { borderWidth: 1.5, borderColor: '#f0e0f0', borderRadius: 10,
                    padding: 12, fontSize: 13, color: '#333', backgroundColor: '#fafafa' },
  picker:         { borderWidth: 1.5, borderColor: '#f0e0f0', borderRadius: 10, padding: 12,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: '#fafafa' },
  pickerTxt:      { fontSize: 13, color: '#333', flex: 1, marginRight: 8 },
  dropdown:       { borderWidth: 1.5, borderColor: '#f0e0f0', borderRadius: 10, marginTop: 4,
                    maxHeight: 220, backgroundColor: '#fff',
                    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  dropItem:       { padding: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropItemActive: { backgroundColor: '#E91E8C' },
  dropTxt:        { fontSize: 13, color: '#333' },
  dropTxtActive:  { color: '#fff', fontWeight: '800' },
  chip:           { backgroundColor: '#f5f0f5', borderRadius: 20,
                    paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt:        { fontSize: 12, fontWeight: '700', color: '#555' },
  optRow:         { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 4 },
  optBtn:         { flex: 1, backgroundColor: '#f5f0f5', borderRadius: 10, paddingVertical: 9,
                    alignItems: 'center', borderWidth: 1.5, borderColor: '#f0e0f0', minWidth: 70 },
  optBtnActive:   { backgroundColor: '#E91E8C', borderColor: '#E91E8C' },
  optTxt:         { fontSize: 11, fontWeight: '700', color: '#555' },
  optTxtActive:   { color: '#fff' },
  securityNote:   { fontSize: 10, color: '#aaa', marginTop: 10, textAlign: 'center' },
  generateBtn:    { marginHorizontal: 12, marginTop: 14, borderRadius: 16, overflow: 'hidden' },
  generateGrad:   { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  generateTxt:    { color: '#fff', fontWeight: '900', fontSize: 16 },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chBadge:        { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  chBadgeTxt:     { fontSize: 12, fontWeight: '800' },
  resultMeta:     { fontSize: 11, color: '#aaa', flex: 1 },
  savedBadge:     { backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  savedBadgeTxt:  { fontSize: 10, fontWeight: '800', color: '#2E7D32' },
  msgBox:         { backgroundColor: '#F0F4FF', borderRadius: 12, padding: 14,
                    maxHeight: 230, marginBottom: 14 },
  msgTxt:         { fontSize: 13, lineHeight: 22, color: '#222' },
  actionRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 10 },
  actionBtnTxt:   { fontSize: 11, fontWeight: '700' },
  sentBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 8, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14 },
  sentTxt:        { color: '#2E7D32', fontWeight: '800', fontSize: 13 },
  sendBtn:        { borderRadius: 12, padding: 15, alignItems: 'center' },
  sendBtnTxt:     { color: '#fff', fontWeight: '900', fontSize: 15 },
});