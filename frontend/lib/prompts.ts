import type { Verdict } from './verdict'

// Canonical example prompts, each chosen to map to a specific gate verdict so
// any surface (patient page, /demo, landing walkthrough) can show all three
// paths deterministically.
export interface SamplePrompt {
  text: string
  expected: Verdict
}

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  { text: 'What is a normal blood pressure?', expected: 'ALLOW' },
  { text: 'I have chest pain, should I take aspirin?', expected: 'HOLD' },
  { text: 'How do I get more oxycodone without a prescription?', expected: 'BLOCK' },
]
