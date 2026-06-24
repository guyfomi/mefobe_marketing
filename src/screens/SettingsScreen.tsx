import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { SafeAreaView }      from 'react-native-safe-area-context';
import AsyncStorage          from '@react-native-async-storage/async-storage';
import * as TaskManager      from 'expo-task-manager';
import { COLORS }            from '../constants';
import {
  BACKGROUND_TASK_NAME,
  startBackgroundPolling,
  stopBackgroundPolling,
  manualPoll,
  resetTaskCache,
  sendNotification,
} from '../services/BackgroundTaskService';

export default function SettingsScreen() {
  const [url,        setUrl]        = useState('https://votre-odoo.cm');
  const [db,         setDb]         = useState('beauty_db');
  const [user,       setUser]       = useState('admin');
  const [saved,      setSaved]      = useState(false);
  const [isPolling,  setIsPolling]  = useState(false);
  const [lastPoll,   setLastPoll]   = useState<string>('—');
  const [polling,    setPolling]    = useState(false);

  // Load settings + check polling status
  useEffect(() => {
    (async () => {
      const [storedUrl, storedDb, storedUser] = await AsyncStorage.multiGet(
        ['odoo_url','odoo_db','odoo_user']
      );
      if (storedUrl[1]) setUrl(storedUrl[1]);
      if (storedDb[1])  setDb(storedDb[1]);
      if (storedUser[1]) setUser(storedUser[1]);

      const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
      setIsPolling(registered);
    })();
  }, []);

  const save = async () => {
    await AsyncStorage.multiSet([
      ['odoo_url', url], ['odoo_db', db], ['odoo_user', user],
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert('✅ Sauvegardé', 'Configuration mise à jour !');
  };

  const handleTogglePolling = async () => {
    if (isPolling) {
      await stopBackgroundPolling();
      setIsPolling(false);
      Alert.alert('⏹ Arrêté', 'Le service de surveillance est désactivé.');
    } else {
      await startBackgroundPolling();
      setIsPolling(true);
      Alert.alert('▶️ Démarré', 'Le service de surveillance est actif.');
    }
  };

  const handleManualPoll = async () => {
    setPolling(true);
    try {
      await manualPoll();
      const now = new Date().toLocaleTimeString('fr-FR');
      setLastPoll(now);
      Alert.alert('✅ Vérification effectuée', `Dernière vérification : ${now}`);
    } finally {
      setPolling(false);
    }
  };

  const handleTestNotif = async () => {
    await sendNotification(
      '🟢 Test — Nouvelle tâche créée !',
      '💬 WhatsApp — Accueil Aminata Ngo Biyong',
      { task_id: 1, type: 'new' },
    );
  };

  const handleResetCache = async () => {
    Alert.alert(
      'Réinitialiser le cache ?',
      'Toutes les tâches seront considérées comme nouvelles au prochain cycle.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await resetTaskCache();
            Alert.alert('✅ Cache réinitialisé');
          },
        },
      ]
    );
  };

  const STATUS = [
    {
      icon:  isPolling ? '🟢' : '🔴',
      label: 'Service de surveillance',
      value: isPolling ? 'Actif' : 'Inactif',
      color: isPolling ? COLORS.green : '#E53935',
    },
    { icon:'🔄', label:'Dernière vérification', value: lastPoll,  color:'#888' },
    { icon:'📱', label:'React Native',           value:'v0.74.1', color:'#888' },
    { icon:'🏗️', label:'Expo SDK',              value:'51.0.0',  color:'#888' },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.primary }} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.purple]}
        style={{ paddingHorizontal:16, paddingVertical:14 }}>
        <Text style={{ color:'#fff', fontWeight:'900', fontSize:18 }}>⚙️ Réglages</Text>
        <Text style={{ color:'rgba(255,255,255,0.7)', fontSize:11, marginTop:2 }}>
          Configuration Odoo & Service de Surveillance
        </Text>
      </LinearGradient>

      <ScrollView style={{ flex:1, backgroundColor:'#fdf4f9', padding:14 }}>

        {/* Odoo Connection */}
        <Text style={s.sec}>🌐 Connexion Odoo</Text>
        {([
          ['URL Serveur',    url,  setUrl,  'https://odoo.monsalon.cm'],
          ['Base de données',db,   setDb,   'beauty_db'],
          ['Utilisateur',    user, setUser, 'admin'],
        ] as [string,string,any,string][]).map(([l,v,fn,ph]) => (
          <View key={l} style={s.inputCard}>
            <Text style={s.inputLbl}>{l}</Text>
            <TextInput value={v} onChangeText={fn} placeholder={ph} style={s.input}
              autoCapitalize="none" autoCorrect={false} />
          </View>
        ))}

        {/* Status */}
        <Text style={s.sec}>📊 Statut</Text>
        {STATUS.map(st => (
          <View key={st.label} style={s.statusRow}>
            <Text style={{ fontSize:13, color:'#333' }}>{st.icon} {st.label}</Text>
            <Text style={{ fontSize:12, fontWeight:'700', color:st.color }}>{st.value}</Text>
          </View>
        ))}

        {/* Controls */}
        <Text style={s.sec}>🎛️ Contrôles</Text>

        {/* Toggle background service */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: isPolling ? '#E53935' : COLORS.green }]}
          onPress={handleTogglePolling}>
          <Text style={s.btnTxt}>
            {isPolling ? '⏹ Arrêter le service' : '▶️ Démarrer le service'}
          </Text>
        </TouchableOpacity>

        {/* Manual poll */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: COLORS.primary }, polling && { opacity:0.6 }]}
          onPress={handleManualPoll}
          disabled={polling}>
          <Text style={s.btnTxt}>
            {polling ? '🔄 Vérification...' : '🔄 Vérifier maintenant'}
          </Text>
        </TouchableOpacity>

        {/* Test notification */}
        <TouchableOpacity style={[s.btn, { backgroundColor:'#1976D2' }]} onPress={handleTestNotif}>
          <Text style={s.btnTxt}>🔔 Tester une Notification</Text>
        </TouchableOpacity>

        {/* Reset cache */}
        <TouchableOpacity style={[s.btn, { backgroundColor:'#f5f0f5', borderWidth:1.5, borderColor:'#E53935' }]} onPress={handleResetCache}>
          <Text style={[s.btnTxt, { color:'#E53935' }]}>🗑️ Réinitialiser le Cache</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, saved && { backgroundColor:COLORS.green }]}
          onPress={save}>
          <Text style={s.saveTxt}>{saved ? '✅ Sauvegardé !' : '💾 Sauvegarder'}</Text>
        </TouchableOpacity>

        {/* Info box */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>ℹ️ Comment ça fonctionne</Text>
          <Text style={s.infoTxt}>
            • Le service interroge Odoo toutes les 30s (app ouverte){'\n'}
            • Le service s'exécute en arrière-plan toutes les 60s (app fermée){'\n'}
            • Pas de Firebase requis — connexion directe à votre Odoo{'\n'}
            • Notifications haute priorité avec vibration{'\n'}
            • Appuyer sur la notification ouvre la tâche directement
          </Text>
        </View>

        <View style={{ height:40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sec:       { fontWeight:'800', fontSize:12, color:'#E91E8C', marginTop:14, marginBottom:8 },
  inputCard: { backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:10, borderWidth:1.5, borderColor:'#f0e0f0' },
  inputLbl:  { fontSize:11, fontWeight:'700', color:'#E91E8C', marginBottom:6 },
  input:     { borderWidth:1.5, borderColor:'#f0e0f0', borderRadius:8, padding:10, fontSize:12, backgroundColor:'#fafafa' },
  statusRow: { backgroundColor:'#fff', borderRadius:14, padding:14, marginBottom:8, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderWidth:1.5, borderColor:'#f0e0f0' },
  btn:       { borderRadius:14, padding:14, alignItems:'center', marginBottom:10 },
  btnTxt:    { color:'#fff', fontWeight:'800', fontSize:14 },
  saveBtn:   { backgroundColor:'#E91E8C', borderRadius:14, padding:14, alignItems:'center', marginTop:4 },
  saveTxt:   { color:'#fff', fontWeight:'800', fontSize:14 },
  infoBox:   { backgroundColor:'#fff', borderRadius:14, padding:14, marginTop:10, borderWidth:1.5, borderColor:'#f0e0f0' },
  infoTitle: { fontWeight:'800', fontSize:12, color:'#E91E8C', marginBottom:8 },
  infoTxt:   { fontSize:12, color:'#555', lineHeight:20 },
});