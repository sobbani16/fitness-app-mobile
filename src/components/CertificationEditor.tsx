import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Action, Copy, Field, Sheet } from '../design/components';
import { isValidDateInput } from '../util/dateInput';
import { TrainerCertificationInput } from '../api/trainers';

/** Editable shape for the cert sheet — all strings, ids carried through. */
export interface CertificationDraft {
  id?: string;
  name: string;
  issuingOrganization: string;
  credentialId: string;
  issuedAt: string;
  expiresAt: string;
}

const EMPTY: CertificationDraft = {
  name: '',
  issuingOrganization: '',
  credentialId: '',
  issuedAt: '',
  expiresAt: '',
};

export function draftToInput(draft: CertificationDraft): TrainerCertificationInput {
  const input: TrainerCertificationInput = { name: draft.name.trim() };
  if (draft.issuingOrganization.trim()) input.issuingOrganization = draft.issuingOrganization.trim();
  if (draft.credentialId.trim()) input.credentialId = draft.credentialId.trim();
  if (draft.issuedAt.trim()) input.issuedAt = draft.issuedAt.trim();
  if (draft.expiresAt.trim()) input.expiresAt = draft.expiresAt.trim();
  return input;
}

export function validateDraft(draft: CertificationDraft): string | null {
  if (!draft.name.trim()) return 'Certification name is required.';
  if (draft.issuedAt.trim() && !isValidDateInput(draft.issuedAt.trim()))
    return 'Issued date must be a valid YYYY-MM-DD date.';
  if (draft.expiresAt.trim() && !isValidDateInput(draft.expiresAt.trim()))
    return 'Expiry date must be a valid YYYY-MM-DD date.';
  return null;
}

/** Sheet-based certification editor shared by signup and profile editing. */
export default function CertificationEditor({ visible, initial, onSave, onClose }: {
  visible: boolean;
  /** Pass an existing draft to edit, or undefined to add a new cert. */
  initial?: CertificationDraft;
  onSave: (draft: CertificationDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CertificationDraft>(EMPTY);

  useEffect(() => {
    if (visible) setDraft(initial ? { ...initial } : EMPTY);
  }, [visible, initial]);

  const patch = (p: Partial<CertificationDraft>) => setDraft((d) => ({ ...d, ...p }));

  const save = () => {
    const error = validateDraft(draft);
    if (error) return Alert.alert('Check certification', error);
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <Sheet visible={visible} title={initial ? 'Edit certification' : 'Add certification'} onClose={onClose}>
      <Copy size="caption" tone="muted">
        Add a credential clients can trust. Dates are optional; use YYYY-MM-DD.
      </Copy>
      <Field label="Name *" value={draft.name} onChangeText={(v) => patch({ name: v })}
        placeholder="e.g. NASM Certified Personal Trainer" />
      <Field label="Issuing organization" value={draft.issuingOrganization}
        onChangeText={(v) => patch({ issuingOrganization: v })} placeholder="e.g. NASM" />
      <Field label="Credential ID" value={draft.credentialId}
        onChangeText={(v) => patch({ credentialId: v })} placeholder="Optional" autoCapitalize="none" />
      <Field label="Issued on (YYYY-MM-DD)" value={draft.issuedAt}
        onChangeText={(v) => patch({ issuedAt: v })} placeholder="2023-06-15" autoCapitalize="none" />
      <Field label="Expires on (YYYY-MM-DD)" value={draft.expiresAt}
        onChangeText={(v) => patch({ expiresAt: v })} placeholder="Optional" autoCapitalize="none" />
      <Action label="Save certification" onPress={save} />
    </Sheet>
  );
}
