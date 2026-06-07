import type { Verdict } from './verdict'

export interface ChatMessage {
  id: string
  role: 'patient' | 'bot'
  text: string
  verdict?: Verdict
}

export interface InboxItem {
  id: number
  patient_message: string
  draft_response: string
  trigger_reason: string
  category: string
  created_at: string
  status: string
}

export interface AuditRecord {
  timestamp: string
  gate_verdict: string
  trigger_reason: string
  message_hash: string
  parent_hash: string
  current_hash: string
  valid: boolean
}

export interface AuditResponse {
  chain_valid: boolean
  length: number
  records: AuditRecord[]
}

export interface ChatApiResponse {
  interaction_id: number
  verdict: Verdict
  status: string
  reply: string
  category: string
  trigger_reason: string
  is_crisis: boolean
}
