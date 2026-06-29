import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, CHANNEL_CONFIG, TASK_TYPE_LABELS } from '../constants';
import { fetchTasks } from '../services/OdooService';

const FILTERS = [
  {key:'all',l:'Toutes'}, {key:'urgent',l:'🔴 Urgentes'},
  {key:'overdue',l:'⏰ Retard'}, {key:'open',l:'📥 Ouvertes'}, {key:'done',l:'✅ Terminées'},
];

export default function TaskListScreen({ navigation }) {
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [error,      setError]      = useState(null);

  const load = async () => {
    try {
      setError(null);
      setTasks(await fetchTasks());
    } catch (e) {
      setError(e.message ?? 'Erreur connexion Serveur');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = tasks.filter(t => {
    if (filter === 'urgent')  return t.priority === '1';
    if (filter === 'overdue') return !!t.is_overdue;
    if (filter === 'open')    return !t.is_overdue;
    if (filter === 'done')    return String(t.stage_id?.[1]).includes('done');
    return true;
  });

  const urgent  = tasks.filter(t => t.priority === '1').length;
  const overdue = tasks.filter(t => t.is_overdue).length;

  const renderItem = ({ item }) => {
    const ch   = CHANNEL_CONFIG[item.channel] ?? CHANNEL_CONFIG.whatsapp;
    const stg  = item.stage_id?.[1] ?? '';
    const name = item.partner_id?.[1] ?? null;
    return (
      <TouchableOpacity
        style={[s.card,
          item.is_overdue ? s.overdue : item.priority==='1' ? s.urgent : {}]}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        activeOpacity={0.85}
      >
        <View style={s.row}>
          <View style={{ flex:1 }}>
            <View style={s.titleRow}>
              {item.is_overdue && <Text>🔴 </Text>}
              {item.priority==='1' && !item.is_overdue && <Text>⚡ </Text>}
              <Text style={s.title} numberOfLines={2}>
                {TASK_TYPE_LABELS[item.task_type] ?? '📋'}
                {name ? ` — ${name.split(' ')[0]}` : ''}
              </Text>
            </View>
            <Text style={s.subtitle} numberOfLines={1}>{item.name}</Text>
            <View style={s.badges}>
              <View style={[s.badge, { backgroundColor: ch.bg }]}>
                <Text style={[s.badgeTxt, { color: ch.color }]}>{ch.emoji} {ch.label}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: '#f5f5f5' }]}>
                <Text style={[s.badgeTxt, { color: '#666' }]}>{stg}</Text>
              </View>
              {item.deadline && (
                <Text style={[s.dl, item.is_overdue && { color:'#E53935', fontWeight:'700' }]}>
                  📅 {item.deadline}
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems:'flex-end', gap:4 }}>
            {(item.ai_log_count ?? 0) > 0 && (
              <View style={s.aiBadge}>
                <Text style={s.aiTxt}>✨ {item.ai_log_count}</Text>
              </View>
            )}
            <Text style={{ color:'#ddd', fontSize:22 }}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex:0, backgroundColor:COLORS.primary }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={s.header}>
        <Text style={s.h1}>💅 Mefobe Marketing</Text>
        <Text style={s.h2}>Assisté par IA</Text>
        <View style={s.statsRow}>
          <View style={s.chip}><Text style={s.chipTxt}>{tasks.length} tâches</Text></View>
          <View style={[s.chip, { backgroundColor:'rgba(255,100,0,0.4)' }]}>
            <Text style={s.chipTxt}>🔴 {urgent}</Text>
          </View>
          <View style={[s.chip, { backgroundColor:'rgba(200,30,30,0.4)' }]}>
            <Text style={s.chipTxt}>⏰ {overdue}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
        style={{ backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#f0e0f0' }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={[s.fChip, filter===f.key && s.fChipOn]}>
            <Text style={[s.fTxt, filter===f.key && { color:'#fff' }]}>{f.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ color:'#E53935', textAlign:'center', marginBottom:16 }}>❌ {error}</Text>
          <TouchableOpacity style={s.retry} onPress={load}>
            <Text style={{ color:'#fff', fontWeight:'800' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding:12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize:36 }}>🎉</Text>
              <Text style={{ color:'#888', marginTop:8 }}>Aucune tâche</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { padding:16, paddingTop:4 },
  h1:        { color:'#fff', fontWeight:'900', fontSize:20 },
  h2:        { color:'rgba(255,255,255,0.75)', fontSize:11, marginTop:2 },
  statsRow:  { flexDirection:'row', gap:7, marginTop:10 },
  chip:      { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:12,
               paddingHorizontal:10, paddingVertical:3 },
  chipTxt:   { color:'#fff', fontSize:10, fontWeight:'700' },
  filters:   { flexDirection:'row', gap:7, paddingHorizontal:12, paddingVertical:8 },
  fChip:     { backgroundColor:'#f5f0f5', borderRadius:20,
               paddingHorizontal:14, paddingVertical:6 },
  fChipOn:   { backgroundColor:'#E91E8C' },
  fTxt:      { color:'#666', fontSize:11, fontWeight:'700' },
  card:      { backgroundColor:'#fff', borderRadius:16, padding:13, marginBottom:10,
               borderWidth:1.5, borderColor:'#f0e0f0', elevation:2 },
  overdue:   { borderColor:'#E53935', borderWidth:2 },
  urgent:    { borderColor:'#FF6F00', borderWidth:2 },
  row:       { flexDirection:'row', alignItems:'flex-start', gap:8 },
  titleRow:  { flexDirection:'row', alignItems:'center', marginBottom:3 },
  title:     { fontWeight:'800', fontSize:13, color:'#1a1a2e', flex:1 },
  subtitle:  { fontSize:11, color:'#999', marginBottom:7 },
  badges:    { flexDirection:'row', flexWrap:'wrap', gap:5, alignItems:'center' },
  badge:     { borderRadius:10, paddingHorizontal:9, paddingVertical:2 },
  badgeTxt:  { fontSize:10, fontWeight:'700' },
  dl:        { fontSize:10, color:'#bbb' },
  aiBadge:   { backgroundColor:'#E8F5E9', borderRadius:10,
               paddingHorizontal:8, paddingVertical:2 },
  aiTxt:     { fontSize:10, fontWeight:'800', color:'#2E7D32' },
  center:    { flex:1, alignItems:'center', justifyContent:'center', padding:20 },  
  retry:     { backgroundColor:'#E91E8C', borderRadius:10,
               paddingHorizontal:24, paddingVertical:10 },
});