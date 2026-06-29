import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Linking,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { SafeAreaView }     from 'react-native-safe-area-context';
import AsyncStorage         from '@react-native-async-storage/async-storage';
import { Ionicons }         from '@expo/vector-icons';
import { COLORS }           from '../constants';
import { fetchModels, DEFAULT_MODELS, AiModel } from '../services/AiService';
import { api }              from '../services/OdooService';

const KEY_SALON = 'beauty_salon_name';

export default function AiSettingsScreen({ navigation }: any) {
  const [salonName, setSalonName] = useState('Beauté Royale Yaoundé');
  const [models,    setModels]    = useState<AiModel[]>(DEFAULT_MODELS);
  const [saved,     setSaved]     = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [testStatus,setTestStatus]= useState<'idle'|'ok'|'error'>('idle');
  const [testMsg,   setTestMsg]   = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY_SALON).then(v => { if (v) setSalonName(v); });
    fetchModels().then(setModels);
  }, []);

  const save = async () => {
    await AsyncStorage.setItem(KEY_SALON, salonName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert('✅ Sauvegardé', 'Nom du salon mis à jour.');
  };

  // Test the Odoo AI controller endpoint
  const testConnection = async () => {
    setTesting(true);
    setTestStatus('idle');
    setTestMsg('');
    try {
      const resp = await api.post('/beauty/ai/generate', {
        jsonrpc: '2.0', method: 'call', id: 1,
        params: {
          task_type:     'welcome',
          customer_name: 'Test',
          channel:       'whatsapp',
          language:      'fr',
          tone:          'warm',
          model:         DEFAULT_MODELS[0].id,
          extra_context: '',
          task_id:       null,
        },
      });
      const r = resp.data?.result;
      if (r?.success) {
        setTestStatus('ok');
        setTestMsg('Contrôleur Odoo opérationnel ✅\nMessage généré avec succès.');
      } else {
        setTestStatus('error');
        setTestMsg(r?.error ?? 'Erreur inconnue');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e.message ?? 'Impossible de contacter le serveur Odoo.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={s.hdr}>
        <View style={s.hRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>⚙️ Configuration IA</Text>
            <Text style={s.h2}>Paramètres du générateur de messages</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1, backgroundColor: '#fdf4f9', padding: 14 }}
        showsVerticalScrollIndicator={false}>

        {/* Security architecture */}
        <View style={[s.card, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
          <Text style={[s.cardTitle, { color: '#2E7D32' }]}>🔒 Architecture Sécurisée</Text>
          <Text style={s.greenTxt}>
            La clé API OpenRouter est stockée <Text style={{ fontWeight: '900' }}>uniquement dans Odoo</Text>.{'\n'}
            L'application ne la voit jamais.{'\n\n'}
            Flux : App RN → Odoo /beauty/ai/generate → OpenRouter → Message
          </Text>
          <View style={s.tagRow}>
            {['✅ Clé côté Odoo','✅ Auth session','✅ Logs Odoo','✅ Zéro risque'].map(t => (
              <View key={t} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
            ))}
          </View>
        </View>

        {/* Where to configure the key in Odoo */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📋 Clé API dans Odoo</Text>
          <Text style={s.info}>
            La clé OpenRouter se configure côté serveur Odoo :{'\n'}
            <Text style={{ fontWeight: '700' }}>Paramètres → Beauty Salon Marketing → Clé API OpenRouter</Text>
          </Text>
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => Linking.openURL('https://openrouter.ai/keys')}
          >
            <Ionicons name="open-outline" size={14} color="#fff" />
            <Text style={s.linkTxt}>Obtenir une clé gratuite sur openrouter.ai</Text>
          </TouchableOpacity>
        </View>

        {/* Salon name (stored locally in app) */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🏪 Nom du Salon (affiché dans l'app)</Text>
          <Text style={s.sublabel}>Stocké localement sur l'appareil</Text>
          <TextInput
            value={salonName}
            onChangeText={setSalonName}
            placeholder="ex: Beauté Royale Yaoundé"
            style={s.input}
            placeholderTextColor="#bbb"
          />
        </View>

        {/* Test Odoo controller */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🧪 Tester le Contrôleur Odoo</Text>
          <Text style={s.sublabel}>
            Vérifie que POST /beauty/ai/generate répond correctement
          </Text>

          <TouchableOpacity
            style={[s.testBtn, testing && { opacity: 0.6 }]}
            onPress={testConnection}
            disabled={testing}
          >
            <Ionicons
              name={testing ? 'reload' : 'flash-outline'}
              size={16} color={COLORS.primary}
            />
            <Text style={s.testTxt}>
              {testing ? 'Test en cours...' : 'Tester la connexion Odoo'}
            </Text>
          </TouchableOpacity>

          {testStatus !== 'idle' && (
            <View style={[
              s.testResult,
              testStatus === 'ok' ? s.testOk : s.testErr,
            ]}>
              <Ionicons
                name={testStatus === 'ok' ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={testStatus === 'ok' ? '#2E7D32' : '#C62828'}
              />
              <Text style={[
                s.testResultTxt,
                { color: testStatus === 'ok' ? '#2E7D32' : '#C62828' },
              ]}>
                {testMsg}
              </Text>
            </View>
          )}
        </View>

        {/* Available models (from Odoo) */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🤖 Modèles Disponibles</Text>
          <Text style={s.sublabel}>Chargés depuis /beauty/ai/models · Tous gratuits</Text>
          {models.map(m => (
            <View key={m.id} style={s.modelRow}>
              <View style={s.modelDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.modelLabel}>{m.label}</Text>
                <Text style={s.modelId}>{m.id}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, saved && { backgroundColor: COLORS.green }]}
          onPress={save}
        >
          <Text style={s.saveTxt}>
            {saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hdr:          { paddingHorizontal: 14, paddingVertical: 12 },
  hRow:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1:           { color: '#fff', fontWeight: '900', fontSize: 16 },
  h2:           { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  back:         { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
                  width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16,
                  marginBottom: 12, borderWidth: 1.5, borderColor: '#f0e0f0' },
  cardTitle:    { fontWeight: '900', fontSize: 14, color: '#1a1a2e', marginBottom: 10 },
  greenTxt:     { fontSize: 12, color: '#388E3C', lineHeight: 20 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag:          { backgroundColor: '#4CAF50', borderRadius: 20,
                  paddingHorizontal: 10, paddingVertical: 4 },
  tagTxt:       { color: '#fff', fontSize: 10, fontWeight: '700' },
  info:         { fontSize: 12, color: '#555', lineHeight: 20, marginBottom: 10 },
  linkBtn:      { backgroundColor: COLORS.primary, borderRadius: 10, padding: 12,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkTxt:      { color: '#fff', fontWeight: '800', fontSize: 12 },
  sublabel:     { fontSize: 11, color: '#aaa', marginBottom: 8 },
  input:        { borderWidth: 1.5, borderColor: '#f0e0f0', borderRadius: 10,
                  padding: 12, fontSize: 13, color: '#333', backgroundColor: '#fafafa' },
  testBtn:      { backgroundColor: '#f5f0f5', borderRadius: 12, padding: 13,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, borderWidth: 1.5, borderColor: COLORS.primary },
  testTxt:      { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  testResult:   { borderRadius: 10, padding: 12, marginTop: 10,
                  flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  testOk:       { backgroundColor: '#E8F5E9' },
  testErr:      { backgroundColor: '#FFEBEE' },
  testResultTxt:{ fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },
  modelRow:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  modelDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  modelLabel:   { fontSize: 12, fontWeight: '700', color: '#333' },
  modelId:      { fontSize: 9, color: '#aaa', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 1 },
  saveBtn:      { backgroundColor: COLORS.primary, borderRadius: 14,
                  padding: 16, alignItems: 'center', marginBottom: 12 },
  saveTxt:      { color: '#fff', fontWeight: '900', fontSize: 15 },
});