import { Classification } from "./enums";

export interface NotificationCopyInput {
  classification: Classification;
  trackingNumber: string;
  title: string;
}

/**
 * Push notifications land on lock screens. For HIGHLY_CONFIDENTIAL parcels the
 * text must not reveal what is being moved, so the subject collapses to a
 * generic phrase and only the tracking number identifies it.
 */
export function notificationSubject(input: NotificationCopyInput): string {
  if (input.classification === Classification.HIGHLY_CONFIDENTIAL) return "an ABG Dispatch";
  return `"${input.title}"`;
}

export function isSensitive(classification: Classification): boolean {
  return classification === Classification.HIGHLY_CONFIDENTIAL;
}
