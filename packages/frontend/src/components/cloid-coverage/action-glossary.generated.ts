// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: ANTHROPIC_API_KEY=... npx tsx scripts/enrich-action-glossary.ts
//                  (or: npx tsx scripts/enrich-all.ts)
//
// Until the script is run, lookups return undefined and the UI falls back to the raw string.

import type { ActionGlossaryEntry, AbbreviationEntry } from './data';

export const ACTION_GLOSSARY: ActionGlossaryEntry[] = [];
export const ABBREVIATIONS: AbbreviationEntry[] = [];

export const ACTION_INDEX: Record<string, ActionGlossaryEntry> = Object.fromEntries(
  ACTION_GLOSSARY.map((e) => [e.code, e]),
);

export const ABBR_INDEX: Record<string, AbbreviationEntry> = Object.fromEntries(
  ABBREVIATIONS.map((e) => [e.term, e]),
);

export function lookupAction(code: string): ActionGlossaryEntry | undefined {
  return ACTION_INDEX[code];
}

export function lookupAbbreviation(term: string): AbbreviationEntry | undefined {
  return ABBR_INDEX[term];
}

export const GLOSSARY_GENERATED_META: { generatedAt: string | null; model: string | null; actionCount: number; abbrCount: number } = {
  generatedAt: null,
  model: null,
  actionCount: ACTION_GLOSSARY.length,
  abbrCount: ABBREVIATIONS.length,
};

// Parses an action string like "MAN-02 정형 Bin 픽" into its leading code + remainder.
export function parseActionCode(text: string): { code: string | null; rest: string } {
  const m = text.match(/^(LOC|MAN|PER|COG|NAV|SAF)-\d+\s*/);
  if (!m) return { code: null, rest: text };
  return { code: m[0].trim(), rest: text.slice(m[0].length).trim() };
}

// Finds abbreviations that occur within a free-form text (returns matched entries).
export function findAbbreviationsInText(text: string): AbbreviationEntry[] {
  if (ABBREVIATIONS.length === 0) return [];
  const out = new Set<AbbreviationEntry>();
  for (const a of ABBREVIATIONS) {
    if (text.includes(a.term)) out.add(a);
  }
  return [...out];
}
