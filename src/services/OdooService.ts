import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ODOO_CONFIG } from '../constants';
import { BeautyTask, AiLog } from '../types';

const api = axios.create({
  baseURL: ODOO_CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

// Persist Odoo session cookie across requests
api.interceptors.request.use(async (config) => {
  const cookie = await AsyncStorage.getItem('odoo_session');
  if (cookie) config.headers['Cookie'] = cookie;
  return config;
});

api.interceptors.response.use((response) => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) {
    const session = setCookie[0]?.split(';')[0];
    if (session) AsyncStorage.setItem('odoo_session', session);
  }
  return response;
});

export async function authenticate(): Promise<boolean> {
  try {
    const resp = await api.post('/web/session/authenticate', {
      jsonrpc: '2.0', method: 'call', id: 1,
      params: {
        db:       ODOO_CONFIG.DATABASE,
        login:    ODOO_CONFIG.USERNAME,
        password: ODOO_CONFIG.PASSWORD,
      },
    });
    const uid = resp.data?.result?.uid;
    if (uid && uid !== false) {
      await AsyncStorage.setItem('odoo_uid', String(uid));
      return true;
    }
    return false;
  } catch (e) { console.error('Odoo auth error:', e); return false; }
}

function buildBody(model, domain, fields, limit = 80,
  order = 'priority desc, deadline asc, id desc') {
  return {
    jsonrpc: '2.0', method: 'call', id: 1,
    params: { model, method: 'search_read',
              args: [domain], kwargs: { fields, limit, order } },
  };
}

export async function fetchTasks(
  domain = [['stage_id.is_closed', '=', false]]
): Promise<BeautyTask[]> {
  await authenticate();
  const resp = await api.post('/web/dataset/call_kw', buildBody(
    'beauty.task', domain,
    ['id','name','task_type','stage_id','partner_id',
     'channel','priority','deadline','outcome','ai_log_count','is_overdue'],
  ));
  return resp.data?.result ?? [];
}

export async function fetchAiLogs(taskId: number): Promise<AiLog[]> {
  const resp = await api.post('/web/dataset/call_kw', buildBody(
    'beauty.ai.log', [['task_id','=',taskId]],
    ['id','channel','language','tone','model_used','generated_message','create_date'],
    50, 'create_date desc',
  ));
  return resp.data?.result ?? [];
}

export async function markTaskDone(taskId: number): Promise<boolean> {
  const sr = await api.post('/web/dataset/call_kw',
    buildBody('beauty.task.stage',[['code','=','done']],['id'],1));
  const stageId = sr.data?.result?.[0]?.id;
  if (!stageId) return false;
  const resp = await api.post('/web/dataset/call_kw', {
    jsonrpc:'2.0', method:'call', id:1,
    params:{ model:'beauty.task', method:'write',
             args:[[taskId],{stage_id:stageId,outcome:'success'}], kwargs:{} },
  });
  return resp.data?.result === true;
}

export const getOdooTaskUrl = (id: number) =>
  `${ODOO_CONFIG.BASE_URL}/web#model=beauty.task&id=${id}&view_type=form`;