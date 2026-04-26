import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';
  if (provider === 'openai') return openai(process.env.OPENAI_MODEL ?? 'gpt-4o');
  return anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
}
