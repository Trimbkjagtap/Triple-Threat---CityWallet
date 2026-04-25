// TODO(slot B): provider-agnostic getModel() reading LLM_PROVIDER from env.
// See docs/role-B-genui.md H2–H3 for the real impl.

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'openai') return openai(process.env.OPENAI_MODEL ?? 'gpt-4o');
  return anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
}
