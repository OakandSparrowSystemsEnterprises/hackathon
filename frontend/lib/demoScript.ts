import type { ChatMessage, InboxItem, AuditRecord } from './types'

export interface DemoState {
  chat: ChatMessage[]
  inbox: InboxItem[]
  audit: AuditRecord[]
  typing: boolean
  /** Brief highlight cue for the approve action on the doctor pane. */
  approving?: boolean
}

export interface DemoStep {
  id: string
  caption: string
  focus: 'patient' | 'doctor' | 'audit'
  durationMs: number
  apply: (s: DemoState) => DemoState
}

// Deterministic fake sha256-style hex so the audit pane looks authentic without
// touching the real chain.
function hex(seed: string): string {
  const chars = '0123456789abcdef'
  let out = ''
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = 0; i < 64; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    out += chars[(h >> (i % 24)) & 15]
  }
  return out
}

const T0 = '2026-06-07T14:02:11Z'
const T1 = '2026-06-07T14:02:19Z'
const T2 = '2026-06-07T14:02:31Z'
const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000'

function auditRecord(
  prev: string,
  verdict: string,
  reason: string,
  msg: string,
  ts: string
): AuditRecord {
  const message_hash = hex('msg:' + msg)
  const current_hash = hex('rec:' + prev + verdict + reason + ts)
  return {
    timestamp: ts,
    gate_verdict: verdict,
    trigger_reason: reason,
    message_hash,
    parent_hash: prev,
    current_hash,
    valid: true,
  }
}

const ALLOW_REC = auditRecord(GENESIS, 'ALLOW', 'routine_information', 'What is a normal blood pressure?', T0)
const HOLD_REC = auditRecord(ALLOW_REC.current_hash, 'HOLD', 'acute_symptom', 'I have chest pain, should I take aspirin?', T1)
const APPROVE_REC = auditRecord(HOLD_REC.current_hash, 'HOLD', 'clinician_approved', 'I have chest pain, should I take aspirin?', T2)

const HOLD_ITEM: InboxItem = {
  id: 1,
  patient_message: 'I have chest pain, should I take aspirin?',
  draft_response:
    'Chest pain can have serious causes. While aspirin is sometimes used during a suspected heart attack, this needs clinical judgment — please confirm the patient has no contraindications and advise calling emergency services if pain is severe or radiating.',
  trigger_reason: 'acute_symptom',
  category: 'Acute symptom',
  created_at: T1,
  status: 'pending',
}

const APPROVED_ANSWER =
  'Chest pain should always be taken seriously. If it is severe, persistent, or spreading to your arm or jaw, call 911 now. Do not start aspirin on your own — your clinician has reviewed your question and will follow up about whether it is appropriate for you.'

export const INITIAL_STATE: DemoState = { chat: [], inbox: [], audit: [], typing: false }

export const demoScript: DemoStep[] = [
  {
    id: 'ask-routine',
    caption: 'A patient asks a routine, low-risk question.',
    focus: 'patient',
    durationMs: 2600,
    apply: (s) => ({ ...s, chat: [...s.chat, { id: 'p1', role: 'patient', text: 'What is a normal blood pressure?' }] }),
  },
  {
    id: 'thinking-allow',
    caption: 'The safety gate scores it instantly…',
    focus: 'patient',
    durationMs: 1100,
    apply: (s) => ({ ...s, typing: true }),
  },
  {
    id: 'allow',
    caption: 'Low risk → ALLOW. Answered right away, and logged.',
    focus: 'patient',
    durationMs: 2800,
    apply: (s) => ({
      ...s,
      typing: false,
      chat: [
        ...s.chat,
        {
          id: 'b1',
          role: 'bot',
          text: 'A typical normal blood pressure is around 120/80 mmHg. Readings vary by person and time of day — check with your clinician about your personal target.',
          verdict: 'ALLOW',
        },
      ],
      audit: [ALLOW_REC],
    }),
  },
  {
    id: 'ask-risky',
    caption: 'Now a higher-risk question involving clinical judgment.',
    focus: 'patient',
    durationMs: 2800,
    apply: (s) => ({
      ...s,
      chat: [...s.chat, { id: 'p2', role: 'patient', text: 'I have chest pain, should I take aspirin?' }],
    }),
  },
  {
    id: 'hold',
    caption: 'The gate HOLDS it — no AI answer reaches the patient unreviewed.',
    focus: 'patient',
    durationMs: 3000,
    apply: (s) => ({
      ...s,
      typing: false,
      chat: [
        ...s.chat,
        { id: 'b2', role: 'bot', text: 'Your question is being reviewed by a clinician. You’ll receive a response shortly.', verdict: 'HOLD' },
      ],
      audit: [ALLOW_REC, HOLD_REC],
    }),
  },
  {
    id: 'inbox',
    caption: 'It lands in the clinician’s inbox as an editable AI draft.',
    focus: 'doctor',
    durationMs: 3200,
    apply: (s) => ({ ...s, inbox: [HOLD_ITEM] }),
  },
  {
    id: 'approve',
    caption: 'The clinician reviews and approves the response.',
    focus: 'doctor',
    durationMs: 2600,
    apply: (s) => ({ ...s, approving: true }),
  },
  {
    id: 'released',
    caption: 'The verified answer is released to the patient.',
    focus: 'patient',
    durationMs: 3000,
    apply: (s) => ({
      ...s,
      approving: false,
      inbox: [],
      chat: [
        ...s.chat.filter((m) => m.id !== 'b2'),
        { id: 'b2r', role: 'bot', text: APPROVED_ANSWER, verdict: 'ALLOW' },
      ],
    }),
  },
  {
    id: 'sealed',
    caption: 'Every step — including the clinician’s decision — is sealed in a tamper-evident hash chain.',
    focus: 'audit',
    durationMs: 3600,
    apply: (s) => ({ ...s, audit: [ALLOW_REC, HOLD_REC, APPROVE_REC] }),
  },
]
