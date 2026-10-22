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

// ── Incident & facility issues ──

/// Inbox items sent before the four-stage model carry the old stage names.
String _stage(String s) => switch (s) {
  'PENDING' => 'REPORTED',
  'PROCESSING' => 'UNDER_INVESTIGATION',
  'DONE' || 'DECLINED' => 'CLOSED',
  _ => s,
};

String incidentStatusLabel(L l, String s) => switch (_stage(s)) {
  'REPORTED' => l.incStatusREPORTED,
  'ACKNOWLEDGED' => l.incStatusACKNOWLEDGED,
  'UNDER_INVESTIGATION' => l.incStatusUNDER_INVESTIGATION,
  'CLOSED' => l.incStatusCLOSED,
  _ => s,
};

Tone incidentStatusTone(String s) => switch (_stage(s)) {
  'REPORTED' => Tone.pending,
  'ACKNOWLEDGED' || 'UNDER_INVESTIGATION' => Tone.active,
  'CLOSED' => Tone.success,
  _ => Tone.neutral,
};

IconData incidentStatusIcon(String s) => switch (_stage(s)) {
  'REPORTED' => Icons.campaign_outlined,
  'ACKNOWLEDGED' => Icons.visibility_outlined,
  'UNDER_INVESTIGATION' => Icons.manage_search_rounded,
  'CLOSED' => Icons.task_alt_rounded,
  _ => Icons.circle_outlined,
};

String incidentGroupLabel(L l, String g) => switch (g) {
  'SAFETY_INDUSTRIAL' => l.incGrpSAFETY_INDUSTRIAL,
  'SECURITY' => l.incGrpSECURITY,
  'IT_TECHNICAL' => l.incGrpIT_TECHNICAL,
  _ => l.incGrpADMIN_FACILITY,
};

String incidentGroupHint(L l, String g) => switch (g) {
  'SAFETY_INDUSTRIAL' => l.incGrpHintSAFETY_INDUSTRIAL,
  'SECURITY' => l.incGrpHintSECURITY,
  'IT_TECHNICAL' => l.incGrpHintIT_TECHNICAL,
  _ => l.incGrpHintADMIN_FACILITY,
};

IconData incidentGroupIcon(String g) => switch (g) {
  'SAFETY_INDUSTRIAL' => Icons.engineering_outlined,
  'SECURITY' => Icons.shield_outlined,
  'IT_TECHNICAL' => Icons.computer_rounded,
  _ => Icons.apartment_rounded,
};

String incidentCategoryLabel(L l, String c) => switch (c) {
  'FIRE_HAZARD' => l.incCatFIRE_HAZARD,
  'GAS_LEAK' => l.incCatGAS_LEAK,
  'CHEMICAL_SPILL' => l.incCatCHEMICAL_SPILL,
  'INJURY_NEAR_MISS' => l.incCatINJURY_NEAR_MISS,
  'ELECTRICAL_HAZARD' => l.incCatELECTRICAL_HAZARD,
  'MACHINERY_FAULT' => l.incCatMACHINERY_FAULT,
  'PPE_VIOLATION' => l.incCatPPE_VIOLATION,
  'SAFETY_HAZARD' => l.incCatSAFETY_HAZARD,
  'BUILDING_DAMAGE' => l.incCatBUILDING_DAMAGE,
  'CLEANLINESS' => l.incCatCLEANLINESS,
  'CAFETERIA_HYGIENE' => l.incCatCAFETERIA_HYGIENE,
  'WASHROOM' => l.incCatWASHROOM,
  'WATER_SUPPLY' => l.incCatWATER_SUPPLY,
  'AC_VENTILATION' => l.incCatAC_VENTILATION,
  'FURNITURE_FIXTURES' => l.incCatFURNITURE_FIXTURES,
  'PEST_CONTROL' => l.incCatPEST_CONTROL,
  'UNAUTHORISED_ACCESS' => l.incCatUNAUTHORISED_ACCESS,
  'THEFT_LOSS' => l.incCatTHEFT_LOSS,
  'CCTV_FAULT' => l.incCatCCTV_FAULT,
  'GATE_LOCK' => l.incCatGATE_LOCK,
  'MISCONDUCT' => l.incCatMISCONDUCT,
  'NETWORK_DOWN' => l.incCatNETWORK_DOWN,
  'COMPUTER_PRINTER' => l.incCatCOMPUTER_PRINTER,
  'SOFTWARE_ACCESS' => l.incCatSOFTWARE_ACCESS,
  'TELEPHONE' => l.incCatTELEPHONE,
  'POWER_UPS' => l.incCatPOWER_UPS,
  _ => l.incCatOTHER,
};

String incidentCategoryHint(L l, String c) => switch (c) {
  'FIRE_HAZARD' => l.incCatHintFIRE_HAZARD,
  'GAS_LEAK' => l.incCatHintGAS_LEAK,
  'CHEMICAL_SPILL' => l.incCatHintCHEMICAL_SPILL,
  'INJURY_NEAR_MISS' => l.incCatHintINJURY_NEAR_MISS,
  'ELECTRICAL_HAZARD' => l.incCatHintELECTRICAL_HAZARD,
  'MACHINERY_FAULT' => l.incCatHintMACHINERY_FAULT,
  'PPE_VIOLATION' => l.incCatHintPPE_VIOLATION,
  'SAFETY_HAZARD' => l.incCatHintSAFETY_HAZARD,
  'BUILDING_DAMAGE' => l.incCatHintBUILDING_DAMAGE,
  'CLEANLINESS' => l.incCatHintCLEANLINESS,
  'CAFETERIA_HYGIENE' => l.incCatHintCAFETERIA_HYGIENE,
  'WASHROOM' => l.incCatHintWASHROOM,
  'WATER_SUPPLY' => l.incCatHintWATER_SUPPLY,
  'AC_VENTILATION' => l.incCatHintAC_VENTILATION,
  'FURNITURE_FIXTURES' => l.incCatHintFURNITURE_FIXTURES,
  'PEST_CONTROL' => l.incCatHintPEST_CONTROL,
  'UNAUTHORISED_ACCESS' => l.incCatHintUNAUTHORISED_ACCESS,
  'THEFT_LOSS' => l.incCatHintTHEFT_LOSS,
  'CCTV_FAULT' => l.incCatHintCCTV_FAULT,
  'GATE_LOCK' => l.incCatHintGATE_LOCK,
  'MISCONDUCT' => l.incCatHintMISCONDUCT,
  'NETWORK_DOWN' => l.incCatHintNETWORK_DOWN,
  'COMPUTER_PRINTER' => l.incCatHintCOMPUTER_PRINTER,
  'SOFTWARE_ACCESS' => l.incCatHintSOFTWARE_ACCESS,
  'TELEPHONE' => l.incCatHintTELEPHONE,
  'POWER_UPS' => l.incCatHintPOWER_UPS,
  _ => l.incCatHintOTHER,
};

IconData incidentCategoryIcon(String c) => switch (c) {
  'FIRE_HAZARD' => Icons.local_fire_department_outlined,
  'GAS_LEAK' => Icons.gas_meter_outlined,
  'CHEMICAL_SPILL' => Icons.science_outlined,
  'INJURY_NEAR_MISS' => Icons.personal_injury_outlined,
  'ELECTRICAL_HAZARD' => Icons.electrical_services_rounded,
  'MACHINERY_FAULT' => Icons.precision_manufacturing_outlined,
  'PPE_VIOLATION' => Icons.masks_outlined,
  'SAFETY_HAZARD' => Icons.warning_amber_rounded,
  'BUILDING_DAMAGE' => Icons.domain_disabled_outlined,
  'CLEANLINESS' => Icons.cleaning_services_outlined,
  'CAFETERIA_HYGIENE' => Icons.restaurant_outlined,
  'WASHROOM' => Icons.wash_outlined,
  'WATER_SUPPLY' => Icons.water_drop_outlined,
  'AC_VENTILATION' => Icons.ac_unit_rounded,
  'FURNITURE_FIXTURES' => Icons.chair_outlined,
  'PEST_CONTROL' => Icons.pest_control_outlined,
  'OTHER' => Icons.handyman_outlined,
  'UNAUTHORISED_ACCESS' => Icons.person_off_outlined,
  'THEFT_LOSS' => Icons.local_police_outlined,
  'CCTV_FAULT' => Icons.videocam_off_outlined,
  'GATE_LOCK' => Icons.lock_open_rounded,
  'MISCONDUCT' => Icons.gavel_rounded,
  'NETWORK_DOWN' => Icons.wifi_off_rounded,
  'COMPUTER_PRINTER' => Icons.print_outlined,
  'SOFTWARE_ACCESS' => Icons.app_blocking_outlined,
  'TELEPHONE' => Icons.phone_disabled_outlined,
  'POWER_UPS' => Icons.power_off_outlined,
  _ => Icons.more_horiz_rounded,
};

String incidentSeverityLabel(L l, String s) => switch (s) {
  'CRITICAL' || 'URGENT' => l.incSevCRITICAL,
  'HIGH' => l.incSevHIGH,
  'LOW' => l.incSevLOW,
  _ => l.incSevMEDIUM,
};

String incidentSeverityHint(L l, String s) => switch (s) {
  'CRITICAL' || 'URGENT' => l.incSevHintCRITICAL,
  'HIGH' => l.incSevHintHIGH,
  'LOW' => l.incSevHintLOW,
  _ => l.incSevHintMEDIUM,
};

/// Critical red, High amber, Medium blue, Low grey — always with the icon and label.
Tone incidentSeverityTone(String s) => switch (s) {
  'CRITICAL' || 'URGENT' => Tone.danger,
  'HIGH' => Tone.pending,
  'LOW' => Tone.neutral,
  _ => Tone.active,
};

IconData incidentSeverityIcon(String s) => switch (s) {
  'CRITICAL' || 'URGENT' => Icons.report_rounded,
  'HIGH' => Icons.warning_amber_rounded,
  'LOW' => Icons.arrow_downward_rounded,
  _ => Icons.error_outline_rounded,
};

String incidentResolutionLabel(L l, String r) => switch (r) {
  'NO_ACTION_NEEDED' => l.incResNO_ACTION_NEEDED,
  'DUPLICATE' => l.incResDUPLICATE,
  'REFERRED' => l.incResREFERRED,
  _ => l.incResRESOLVED,
};

String incidentResolutionHint(L l, String r) => switch (r) {
  'NO_ACTION_NEEDED' => l.incResHintNO_ACTION_NEEDED,
  'DUPLICATE' => l.incResHintDUPLICATE,
  'REFERRED' => l.incResHintREFERRED,
  _ => l.incResHintRESOLVED,
};

Tone incidentResolutionTone(String r) => switch (r) {
  'RESOLVED' => Tone.success,
  'REFERRED' => Tone.active,
  _ => Tone.neutral,
};

IconData incidentResolutionIcon(String r) => switch (r) {
  'NO_ACTION_NEEDED' => Icons.do_not_disturb_on_outlined,
  'DUPLICATE' => Icons.content_copy_rounded,
  'REFERRED' => Icons.forward_rounded,
  _ => Icons.task_alt_rounded,
};
