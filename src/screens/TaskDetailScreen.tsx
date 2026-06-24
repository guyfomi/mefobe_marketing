import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { COLORS, CHANNEL_CONFIG, TASK_TYPE_LABELS } from '../constants';
import { fetchTasks, fetchAiLogs, markTaskDone, getOdooTaskUrl } from '../services/OdooService';
import { SendMessageHelper } from '../utils/SendMessageHelper';

export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task,    setTask]    = useState(null);
  const [aiLogs,  setAiLogs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tasks = await fetchTasks([['id', '=', taskId]]);
        if (tasks[0]) setTask(tasks[0]);
        setAiLogs(await fetchAiLogs(taskId));
      } finally { setLoading(false); }
    })();
  }, [taskId]);

  const handleDone = async () => {
    const ok = await markTaskDone(task.id);
    if (ok) {
      setTask(p => ({ ...p, stage_id: [0, '✅ Terminé'] }));
      Alert.alert('✅ Succès', 'Tâche mise à jour dans Odoo !');
    } else Alert.alert('Erreur', 'Impossible de mettre à jour.');
  };

  const handleOdoo = () =>
    Linking.openURL(getOdooTaskUrl(task.id))
      .catch(() => Alert.alert('Erreur', "Impossible d'ouvrir Odoo."));

  if (loading) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  if (!task) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:'#E53935' }}>Tâche introuvable</Text>
    </View>
  );

  const ch    = CHANNEL_CONFIG[task.channel] ?? CHANNEL_CONFIG.whatsapp;
  const stg   = task.stage_id?.[1] ?? '—';
  const pName = task.partner_id?.[1] ?? null;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.primary }} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={s.header}>
        <View style={s.hRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <Text style={{ color:'#fff', fontSize:22, fontWeight:'700' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex:1 }}>
            <Text style={s.h1} numberOfLines={1}>Tâche #{task.id}</Text>
            <Text style={s.h2}>{TASK_TYPE_LABELS[task.task_type] ?? '📋'}</Text>
          </View>
          {(task.ai_log_count ?? 0) > 0 && (
            <View style={s.aiBadge}>
              <Text style={{ color:'#fff', fontSize:11, fontWeight:'800' }}>
                ✨ {task.ai_log_count} IA
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex:1, backgroundColor:'#fdf4f9' }} showsVerticalScrollIndicator={false}>

        {/* Task info card */}
        <View style={s.card}>
          <Text style={s.taskName}>{task.name}</Text>
          {[
            ['Canal',     `${ch.emoji} ${ch.label}`],
            ['Étape',     stg],
            ['Cliente',   pName ?? '—'],
            ['Téléphone', task.partnerPhone ?? '—'],
            ['Email',     task.partnerEmail ?? '—'],
            ['Deadline',  task.deadline ? String(task.deadline) : '—'],
          ].map(([l, v]) => (
            <View key={l} style={s.infoRow}>
              <Text style={s.infoLbl}>{l} :</Text>
              <Text style={s.infoVal} numberOfLines={1}>{v}</Text>
            </View>
          ))}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
              <Text style={s.doneTxt}>✅ Marquer Terminé</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.odooBtn} onPress={handleOdoo}>
              <Text style={s.odooTxt}>🌐 Ouvrir Odoo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick contact */}
        {(task.partnerPhone || task.partnerEmail) && (
          <View style={s.card}>
            <Text style={s.secTitle}>📇 Contact Rapide</Text>
            {task.partnerPhone && (
              <View style={s.contactRow}>
                <Text style={s.contactTxt}>📞 {task.partnerPhone}</Text>
                <View style={{ flexDirection:'row', gap:6 }}>
                  <TouchableOpacity style={[s.cBtn, { backgroundColor:COLORS.whatsapp }]}
                    onPress={() => SendMessageHelper.openWhatsApp(task.partnerPhone, '')}>
                    <Text>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cBtn, { backgroundColor:COLORS.sms }]}
                    onPress={() => SendMessageHelper.openSms(task.partnerPhone, '')}>
                    <Text>📱</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cBtn, { backgroundColor:'#388E3C' }]}
                    onPress={() => Linking.openURL(`tel:${task.partnerPhone}`)}>
                    <Text>📞</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {task.partnerEmail && (
              <View style={s.contactRow}>
                <Text style={[s.contactTxt, { fontSize:11 }]} numberOfLines={1}>
                  ✉️ {task.partnerEmail}
                </Text>
                <TouchableOpacity style={[s.cBtn, { backgroundColor:COLORS.email }]}
                  onPress={() => SendMessageHelper.openEmail(task.partnerEmail, task.name, '')}>
                  <Text>📧</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* AI Messages */}
        <View style={{ marginHorizontal:12, marginBottom:30 }}>
          {aiLogs.length > 0 ? (
            <>
              <Text style={[s.secTitle, { marginTop:12 }]}>
                ✨ Messages IA ({aiLogs.length})
              </Text>
              {aiLogs.map(log => (
                <AiLogCard key={log.id} log={log} task={task} />
              ))}
            </>
          ) : (
            <View style={[s.card, { alignItems:'center', paddingVertical:24 }]}>
              <Text style={{ fontSize:36, marginBottom:8 }}>✨</Text>
              <Text style={{ fontWeight:'700', color:'#888' }}>Aucun message IA</Text>
              <Text style={{ color:'#bbb', fontSize:11, marginTop:4, textAlign:'center' }}>
                Ouvrez Odoo → ✨ Générer un Message
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// AiLogCard — displays one AI-generated message with send buttons
function AiLogCard({ log, task }) {
  const [open,   setOpen]   = useState(true);
  const [sent,   setSent]   = useState(false);
  const [copied, setCopied] = useState(false);
  const ch  = CHANNEL_CONFIG[log.channel] ?? CHANNEL_CONFIG.whatsapp;
  const msg = log.generated_message ?? '';

  const LABELS = {
    whatsapp:'💬 Envoyer WhatsApp', sms:'📱 Envoyer SMS',
    email:'📧 Envoyer Email', facebook:'📘 Copier Facebook',
    instagram:'📸 Copier Instagram', tiktok:'🎵 Copier TikTok',
    linkedin:'💼 Copier LinkedIn',
  };

  const doSend = async () => {
    const ph = task.partnerPhone ?? '', em = task.partnerEmail ?? '';
    switch (log.channel) {
      case 'whatsapp': await SendMessageHelper.openWhatsApp(ph, msg); break;
      case 'sms':      await SendMessageHelper.openSms(ph, msg); break;
      case 'email':    await SendMessageHelper.openEmail(em, task.name, msg); break;
      default:
        await Clipboard.setStringAsync(msg);
        await SendMessageHelper.shareToApp(msg, log.channel);
        break;
    }
    setSent(true); setTimeout(() => setSent(false), 2500);
  };

  const doCopy = async () => {
    await Clipboard.setStringAsync(msg);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const langFlag = { fr:'🇫🇷', en:'🇬🇧', both:'🇨🇲' }[log.language] ?? '🌐';
  const toneIcon = { warm:'😊', promo:'🔥', luxury:'✨', urgent:'⚡' }[log.tone] ?? '💬';

  return (
    <View style={a.card}>
      <TouchableOpacity onPress={() => setOpen(o => !o)}
        style={[a.head, open && { backgroundColor:'#FFF0F7' }]}>
        <View style={[a.chBadge, { backgroundColor:ch.bg }]}>
          <Text style={[a.chTxt, { color:ch.color }]}>{ch.emoji} {ch.label}</Text>
        </View>
        <Text style={a.meta} numberOfLines={1}>
          {langFlag} {toneIcon} · {log.model_used} · {log.create_date?.slice(0, 16)}
        </Text>
        <Text style={{ color:'#ccc', fontSize:14 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ padding:13 }}>
          <ScrollView style={a.msgBox} nestedScrollEnabled>
            <Text style={a.msgTxt}>{msg}</Text>
          </ScrollView>
          {sent ? (
            <View style={a.sentBanner}>
              <Text style={a.sentTxt}>✅ Envoyé avec succès !</Text>
            </View>
          ) : (
            <View style={{ flexDirection:'row', gap:7, marginTop:10 }}>
              <TouchableOpacity
                style={[a.sendBtn, { flex:2, backgroundColor:ch.color }]}
                onPress={doSend}>
                <Text style={a.sendTxt}>{LABELS[log.channel] ?? '📤 Envoyer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[a.sendBtn, { flex:1, backgroundColor:copied?COLORS.green:'#f5f0f5' }]}
                onPress={doCopy}>
                <Text style={[a.sendTxt, { color:copied?'#fff':'#555' }]}>
                  {copied ? '✓ Copié' : '📋'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header:     { paddingHorizontal:14, paddingVertical:12 },
  hRow:       { flexDirection:'row', alignItems:'center', gap:10 },
  h1:         { color:'#fff', fontWeight:'800', fontSize:15 },
  h2:         { color:'rgba(255,255,255,0.7)', fontSize:10 },
  back:       { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:10,
                width:34, height:34, alignItems:'center', justifyContent:'center' },
  aiBadge:    { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:12,
                paddingHorizontal:10, paddingVertical:3 },
  card:       { backgroundColor:'#fff', margin:12, marginBottom:0, borderRadius:16,
                padding:14, borderWidth:1.5, borderColor:'#f0e0f0' },
  taskName:   { fontWeight:'900', fontSize:14, color:'#1a1a2e', marginBottom:10 },
  infoRow:    { flexDirection:'row', gap:8, marginBottom:5 },
  infoLbl:    { color:'#bbb', fontSize:12, width:80 },
  infoVal:    { fontWeight:'700', color:'#333', fontSize:12, flex:1 },
  actionRow:  { flexDirection:'row', gap:8, marginTop:14 },
  doneBtn:    { flex:1, backgroundColor:'#4CAF50', borderRadius:12,
                paddingVertical:11, alignItems:'center' },
  doneTxt:    { color:'#fff', fontWeight:'800', fontSize:13 },
  odooBtn:    { flex:1, backgroundColor:'#fff', borderRadius:12, paddingVertical:11,
                alignItems:'center', borderWidth:2, borderColor:'#E91E8C' },
  odooTxt:    { color:'#E91E8C', fontWeight:'800', fontSize:13 },
  secTitle:   { fontWeight:'800', fontSize:13, color:'#E91E8C', marginBottom:8 },
  contactRow: { flexDirection:'row', justifyContent:'space-between',
                alignItems:'center', marginBottom:8 },
  contactTxt: { fontSize:12, color:'#555', flex:1, marginRight:8 },
  cBtn:       { borderRadius:8, paddingHorizontal:10, paddingVertical:5 },
});
const a = StyleSheet.create({
  card:       { backgroundColor:'#fff', borderRadius:14, marginBottom:10,
                borderWidth:1.5, borderColor:'#f0e0f0', overflow:'hidden' },
  head:       { flexDirection:'row', alignItems:'center', gap:8, padding:10 },
  chBadge:    { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  chTxt:      { fontSize:11, fontWeight:'800' },
  meta:       { flex:1, fontSize:10, color:'#aaa' },
  msgBox:     { backgroundColor:'#F0F4FF', borderRadius:10, padding:12, maxHeight:170 },
  msgTxt:     { fontSize:12, lineHeight:20, color:'#222' },
  sentBanner: { backgroundColor:'#E8F5E9', borderRadius:10, padding:10,
                alignItems:'center', marginTop:10 },
  sentTxt:    { color:'#2E7D32', fontWeight:'800', fontSize:12 },
  sendBtn:    { borderRadius:10, paddingVertical:10, alignItems:'center' },
  sendTxt:    { color:'#fff', fontWeight:'800', fontSize:11 },
});