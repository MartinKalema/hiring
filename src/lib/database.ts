import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side operations (bypass RLS)
export const db = createClient(supabaseUrl, supabaseServiceKey)

// Types for database tables
export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface InterviewTemplate {
  id: string
  organization_id: string
  created_by: string
  job_requisition_id: string | null
  name: string
  job_title: string
  job_description: string
  company_name: string
  competencies_to_assess: unknown
  must_ask_questions: unknown
  config: unknown
  status: string
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  resume_url: string | null
  linkedin_url: string | null
  metadata: unknown
  created_at: string
  updated_at: string
}

export interface InterviewSession {
  id: string
  template_id: string
  candidate_id: string | null
  token: string
  status: string
  competency_coverage: unknown
  current_competency_index: number
  conversation_history: unknown
  metrics: unknown
  video_url: string | null
  audio_url: string | null
  full_transcript: string | null
  invited_at: string
  started_at: string | null
  completed_at: string | null
  expires_at: string
}

export interface InterviewSummary {
  id: string
  session_id: string
  summary_text: string | null
  key_strengths: unknown
  areas_of_concern: unknown
  skills_mentioned: unknown
  competency_scores: unknown
  recommendation: string | null
  recommendation_confidence: number | null
  recommendation_reasoning: string | null
  generated_at: string
}
