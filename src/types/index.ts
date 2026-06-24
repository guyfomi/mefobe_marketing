export interface BeautyTask {
  id: number;
  name: string;
  task_type?: string;
  stage_id?: [number, string] | false;
  partner_id?: [number, string] | false;
  channel?: string;
  priority?: string;
  deadline?: string | false;
  outcome?: string;
  ai_log_count?: number;
  is_overdue?: boolean;
  partnerPhone?: string;
  partnerEmail?: string;
}

export interface AiLog {
  id: number;
  channel?: string;
  language?: string;
  tone?: string;
  model_used?: string;
  generated_message?: string;
  create_date?: string;
}