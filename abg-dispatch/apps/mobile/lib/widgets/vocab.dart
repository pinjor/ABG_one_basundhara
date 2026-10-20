import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../theme/tokens.dart';

/// One vocabulary for statuses everywhere: label, tone and icon together, so
/// meaning never rests on colour alone. Mirrors packages/shared/src/labels.ts.
enum Tone { active, pending, success, danger, neutral }

class ToneColors {
  const ToneColors(this.fg, this.bg);
  final Color fg;
  final Color bg;
}

ToneColors toneColors(Tone t) => switch (t) {
  Tone.active => const ToneColors(AbgColors.active, AbgColors.activeSoft),
  Tone.pending => const ToneColors(AbgColors.pending, AbgColors.pendingSoft),
  Tone.success => const ToneColors(AbgColors.success, AbgColors.successSoft),
  Tone.danger => const ToneColors(AbgColors.danger, AbgColors.dangerSoft),
  Tone.neutral => const ToneColors(AbgColors.neutral, AbgColors.neutralSoft),
};

Tone statusTone(String s) => switch (s) {
  'PICKED_UP' || 'IN_TRANSIT' || 'RETURN_IN_TRANSIT' => Tone.active,
  'BOOKED' ||
  'AWAITING_PICKUP' ||
  'ARRIVED_AT_DESTINATION' ||
  'PENDING_RECEIPT' => Tone.pending,
  'RECEIVED' => Tone.success,
  'ON_HOLD' ||
  'DELIVERY_EXCEPTION' ||
  'DELIVERY_FAILED' ||
  'RETURN_REQUESTED' => Tone.danger,
  _ => Tone.neutral,
};

IconData statusIcon(String s) => switch (s) {
  'DRAFT' => Icons.edit_note_rounded,
  'BOOKED' => Icons.bookmark_added_outlined,
  'AWAITING_PICKUP' => Icons.schedule_rounded,
  'PICKED_UP' => Icons.inventory_2_outlined,
  'IN_TRANSIT' => Icons.local_shipping_outlined,
  'ARRIVED_AT_DESTINATION' => Icons.where_to_vote_outlined,
  'PENDING_RECEIPT' => Icons.pending_actions_rounded,
  'RECEIVED' => Icons.verified_outlined,
  'ON_HOLD' => Icons.pause_circle_outline_rounded,
  'DELIVERY_EXCEPTION' => Icons.report_problem_outlined,
  'DELIVERY_FAILED' => Icons.error_outline_rounded,
  'RETURN_REQUESTED' => Icons.undo_rounded,
  'RETURN_IN_TRANSIT' => Icons.u_turn_left_rounded,
  'RETURNED' => Icons.assignment_return_outlined,
  'CANCELLED' => Icons.cancel_outlined,
  _ => Icons.circle_outlined,
};

String statusLabel(L l, String s) => switch (s) {
  'DRAFT' => l.statusDRAFT,
  'BOOKED' => l.statusBOOKED,
  'AWAITING_PICKUP' => l.statusAWAITING_PICKUP,
  'PICKED_UP' => l.statusPICKED_UP,
  'IN_TRANSIT' => l.statusIN_TRANSIT,
  'ARRIVED_AT_DESTINATION' => l.statusARRIVED_AT_DESTINATION,
  'PENDING_RECEIPT' => l.statusPENDING_RECEIPT,
  'RECEIVED' => l.statusRECEIVED,
  'ON_HOLD' => l.statusON_HOLD,
  'DELIVERY_EXCEPTION' => l.statusDELIVERY_EXCEPTION,
  'DELIVERY_FAILED' => l.statusDELIVERY_FAILED,
  'RETURN_REQUESTED' => l.statusRETURN_REQUESTED,
  'RETURN_IN_TRANSIT' => l.statusRETURN_IN_TRANSIT,
  'RETURNED' => l.statusRETURNED,
  'CANCELLED' => l.statusCANCELLED,
  _ => s,
};

String priorityLabel(L l, String p) => switch (p) {
  'PRIORITY' => l.priorityPRIORITY,
  'URGENT' => l.priorityURGENT,
  'CRITICAL' => l.priorityCRITICAL,
  _ => l.priorityNORMAL,
};

Tone priorityTone(String p) => switch (p) {
  'URGENT' || 'CRITICAL' => Tone.danger,
  'PRIORITY' => Tone.pending,
  _ => Tone.neutral,
};

String classificationLabel(L l, String c) => switch (c) {
  'INTERNAL' => l.classINTERNAL,
  'CONFIDENTIAL' => l.classCONFIDENTIAL,
  'HIGHLY_CONFIDENTIAL' => l.classHIGHLY_CONFIDENTIAL,
  _ => l.classNORMAL,
};

IconData classificationIcon(String c) => switch (c) {
  'CONFIDENTIAL' => Icons.lock_outline_rounded,
  'HIGHLY_CONFIDENTIAL' => Icons.shield_outlined,
  'INTERNAL' => Icons.apartment_rounded,
  _ => Icons.public_rounded,
};

String carrierTypeLabel(L l, String t) => switch (t) {
  'EXTERNAL_COURIER' => l.carrierTypeEXTERNAL_COURIER,
  'GUEST_PERSON' => l.carrierTypeGUEST_PERSON,
  _ => l.carrierTypeINTERNAL_EMPLOYEE,
};

IconData carrierTypeIcon(String t) => switch (t) {
  'EXTERNAL_COURIER' => Icons.local_shipping_outlined,
  'GUEST_PERSON' => Icons.badge_outlined,
  _ => Icons.directions_walk_rounded,
};

const exceptionCodes = [
  'RECEIVER_UNAVAILABLE',
  'WRONG_DESTINATION',
  'ADDRESS_CLARIFICATION',
  'OFFICE_CLOSED',
  'PACKAGE_DAMAGED',
  'SEAL_BROKEN',
  'AWAITING_AUTHORIZATION',
  'OTHER',
];

String exceptionLabel(L l, String c) => switch (c) {
  'RECEIVER_UNAVAILABLE' => l.excRECEIVER_UNAVAILABLE,
  'WRONG_DESTINATION' => l.excWRONG_DESTINATION,
  'ADDRESS_CLARIFICATION' => l.excADDRESS_CLARIFICATION,
  'PACKAGE_DAMAGED' => l.excPACKAGE_DAMAGED,
  'OFFICE_CLOSED' => l.excOFFICE_CLOSED,
  'SEAL_BROKEN' => l.excSEAL_BROKEN,
  'AWAITING_AUTHORIZATION' => l.excAWAITING_AUTHORIZATION,
  _ => l.excOTHER,
};

IconData eventIcon(String type) => switch (type) {
  'PARCEL_CREATED' || 'PARCEL_BOOKED' => Icons.add_box_outlined,
  'CARRIER_ASSIGNED' || 'CARRIER_REASSIGNED' => Icons.person_add_alt_outlined,
  'CARRIER_ACCEPTED' => Icons.thumb_up_alt_outlined,
  'HANDOVER_REQUESTED' => Icons.qr_code_scanner_rounded,
  'HANDOVER_CONFIRMED' => Icons.handshake_outlined,
  'PICKED_UP' => Icons.inventory_2_outlined,
  'IN_TRANSIT' => Icons.local_shipping_outlined,
  'CHECKPOINT' => Icons.flag_outlined,
  'ARRIVED_AT_DESTINATION' => Icons.where_to_vote_outlined,
  'PENDING_RECEIPT' => Icons.pending_actions_rounded,
  'RECEIPT_OTP_SENT' => Icons.sms_outlined,
  'RECEIVED' => Icons.verified_rounded,
  'EXCEPTION_RECORDED' || 'DELIVERY_FAILED' => Icons.report_problem_outlined,
  'EXCEPTION_RESOLVED' || 'RELEASED_FROM_HOLD' => Icons.task_alt_rounded,
  'PUT_ON_HOLD' => Icons.pause_circle_outline_rounded,
  'RETURN_REQUESTED' ||
  'RETURN_IN_TRANSIT' ||
  'RETURNED' => Icons.assignment_return_outlined,
  'CANCELLED' => Icons.cancel_outlined,
  'NOTE_ADDED' => Icons.sticky_note_2_outlined,
  'ATTACHMENT_ADDED' => Icons.attach_file_rounded,
  'CORRECTION_ADDED' => Icons.edit_note_rounded,
  'SLA_REMINDER' => Icons.notifications_active_outlined,
  'SLA_ESCALATED' => Icons.priority_high_rounded,
  'EXTERNAL_STATUS_UPDATE' => Icons.sync_alt_rounded,
  _ => Icons.circle_outlined,
};

Tone eventTone(String type) => switch (type) {
  'RECEIVED' || 'RETURNED' || 'EXCEPTION_RESOLVED' => Tone.success,
  'EXCEPTION_RECORDED' ||
  'DELIVERY_FAILED' ||
  'SLA_ESCALATED' ||
  'PUT_ON_HOLD' ||
  'CANCELLED' => Tone.danger,
  'PICKED_UP' ||
  'IN_TRANSIT' ||
  'HANDOVER_CONFIRMED' ||
  'CHECKPOINT' ||
  'EXTERNAL_STATUS_UPDATE' => Tone.active,
  'PENDING_RECEIPT' ||
  'ARRIVED_AT_DESTINATION' ||
  'SLA_REMINDER' ||
  'HANDOVER_REQUESTED' => Tone.pending,
  _ => Tone.neutral,
};

// ── Incident reports ──

String incidentStatusLabel(L l, String s) => switch (s) {
  'PENDING' => l.incStatusPENDING,
  'PROCESSING' => l.incStatusPROCESSING,
  'DONE' => l.incStatusDONE,
  'DECLINED' => l.incStatusDECLINED,
  _ => s,
};

Tone incidentStatusTone(String s) => switch (s) {
  'PENDING' => Tone.pending,
  'PROCESSING' => Tone.active,
  'DONE' => Tone.success,
  _ => Tone.neutral,
};

IconData incidentStatusIcon(String s) => switch (s) {
  'PENDING' => Icons.hourglass_top_rounded,
  'PROCESSING' => Icons.construction_rounded,
  'DONE' => Icons.task_alt_rounded,
  _ => Icons.do_not_disturb_on_outlined,
};

String incidentCategoryLabel(L l, String c) => switch (c) {
  'BUILDING_DAMAGE' => l.incCatBUILDING_DAMAGE,
  'CLEANLINESS' => l.incCatCLEANLINESS,
  'CAFETERIA_HYGIENE' => l.incCatCAFETERIA_HYGIENE,
  'WASHROOM' => l.incCatWASHROOM,
  'SAFETY_HAZARD' => l.incCatSAFETY_HAZARD,
  'ELECTRICAL' => l.incCatELECTRICAL,
  'SECURITY' => l.incCatSECURITY,
  'MISCONDUCT' => l.incCatMISCONDUCT,
  _ => l.incCatOTHER,
};

IconData incidentCategoryIcon(String c) => switch (c) {
  'BUILDING_DAMAGE' => Icons.domain_disabled_outlined,
  'CLEANLINESS' => Icons.cleaning_services_outlined,
  'CAFETERIA_HYGIENE' => Icons.restaurant_outlined,
  'WASHROOM' => Icons.wash_outlined,
  'SAFETY_HAZARD' => Icons.warning_amber_rounded,
  'ELECTRICAL' => Icons.electrical_services_rounded,
  'SECURITY' => Icons.shield_outlined,
  'MISCONDUCT' => Icons.gavel_rounded,
  _ => Icons.more_horiz_rounded,
};

String incidentSeverityLabel(L l, String s) => switch (s) {
  'LOW' => l.incSevLOW,
  'HIGH' => l.incSevHIGH,
  'URGENT' => l.incSevURGENT,
  _ => l.incSevMEDIUM,
};

Tone incidentSeverityTone(String s) => switch (s) {
  'LOW' => Tone.neutral,
  'HIGH' => Tone.pending,
  'URGENT' => Tone.danger,
  _ => Tone.active,
};
