import { api } from './client';

// Trainer copilot — read-only client summaries + rule-based drafts.
// Every suggestion carries label "AI draft — requires trainer confirmation";
// nothing here is ever applied to a client automatically.
export type CopilotClient = {
  relationId: string; clientId: string; clientName: string; since: string;
  checkInThisWeek: 'reviewed' | 'awaiting_review' | 'missing';
  intakeStatus: string; hasOutcomePlan: boolean; pendingFormChecks: number;
};
export type CopilotSuggestion = {
  kind: string; title: string; detail: string; evidence: string[];
  confidence: 'high' | 'partial' | 'low';
  generatedBy: string; label: string; requiresTrainerConfirmation: boolean;
};
export type CopilotSummary = {
  consent: { granted: string[]; notShared: string[] };
  intake: { status: string; version?: number; updatedAt?: string };
  outcomePlan: { id: string; goals: unknown[] } | null;
  checkIns: { thisWeek: string; recent: unknown[] };
  activity: Record<string, number | null>;
  note: string;
};

export async function getCopilotClients(): Promise<{ clients: CopilotClient[] }> {
  return (await api.get('/trainer/copilot/clients')).data;
}
export async function getCopilotSummary(clientId: string): Promise<CopilotSummary> {
  return (await api.get(`/trainer/copilot/clients/${clientId}/summary`)).data;
}
export async function getCopilotSuggestions(clientId: string): Promise<{ suggestions: CopilotSuggestion[] }> {
  return (await api.get(`/trainer/copilot/clients/${clientId}/suggestions`)).data;
}
