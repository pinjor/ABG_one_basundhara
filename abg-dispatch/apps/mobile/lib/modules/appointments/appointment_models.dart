/// Data classes for the appointments API
/// (apps/api/src/appointments/appointments.service.ts) and the meeting-time
/// rules from packages/shared/src/appointments.ts.
library;

import '../../widgets/module_kit.dart';

const appointmentPurposes = [
  'BUSINESS_REVIEW',
  'APPROVAL',
  'PROJECT_UPDATE',
  'PROPOSAL',
  'PERSONAL',
  'COURTESY',
  'OTHER',
];
const meetingModes = ['IN_PERSON', 'VIDEO', 'PHONE'];
const appointmentDurations = [15, 30, 45, 60, 90, 120];
const openAppointmentStatuses = ['PENDING', 'PROPOSED', 'CONFIRMED'];

/// Mirrors APPOINTMENT_LIMITS.
abstract final class AppointmentLimits {
  static const subjectMin = 3;
  static const subjectMax = 140;
  static const agendaMax = 2000;
  static const locationMax = 140;
  static const noteMax = 1000;
  static const reasonMin = 3;
  static const maxAttendees = 8;
  static const attendeeNameMax = 80;
  static const minLeadMinutes = 15;
  static const maxLeadDays = 90;
  static const dayStartHour = 8;
  static const dayEndHour = 20;
}

/// A Dhaka wall-clock day and time as an instant.
DateTime dhakaInstant(int y, int m, int d, int hour, int minute) =>
    DateTime.utc(y, m, d, hour, minute).subtract(const Duration(hours: 6));

/// Why a meeting time would be refused, or null when it is fine.
/// past · hours · far
String? meetingTimeProblem(DateTime at, int durationMinutes, [DateTime? now]) {
  final n = now ?? DateTime.now();
  if (at.isBefore(
    n.add(const Duration(minutes: AppointmentLimits.minLeadMinutes)),
  )) {
    return 'past';
  }
  if (at.isAfter(n.add(const Duration(days: AppointmentLimits.maxLeadDays)))) {
    return 'far';
  }
  final d = at.toUtc().add(const Duration(hours: 6));
  final start = d.hour * 60 + d.minute;
  if (start < AppointmentLimits.dayStartHour * 60 ||
      start + durationMinutes > AppointmentLimits.dayEndHour * 60) {
    return 'hours';
  }
  return null;
}

/// Someone who takes appointments (GET /appointments/hosts).
class AppointmentHost {
  const AppointmentHost({
    required this.userId,
    required this.name,
    this.designation,
    this.department,
    this.office,
    this.executive = false,
    this.headOfDepartment = false,
  });

  final String userId;
  final String name;
  final String? designation;
  final String? department;
  final String? office;
  final bool executive;
  final bool headOfDepartment;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  factory AppointmentHost.fromJson(Map<String, dynamic> j) => AppointmentHost(
    userId: jStr(j['userId'] ?? j['id'])!,
    name: jStr(j['name']) ?? '—',
    designation: jStr(j['designation']),
    department: jStr(j['department']),
    office: jStr(j['office']),
    executive: j['executive'] == true,
    headOfDepartment: j['headOfDepartment'] == true,
  );
}

class AppointmentPerson {
  const AppointmentPerson({
    required this.name,
    this.designation,
    this.department,
    this.phone,
    this.executive = false,
  });

  final String name;
  final String? designation;
  final String? department;
  final String? phone;
  final bool executive;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  factory AppointmentPerson.fromJson(dynamic raw) {
    final j = jMap(raw);
    return AppointmentPerson(
      name: jStr(j['name']) ?? '—',
      designation: jStr(j['designation']),
      department: jStr(j['department']),
      phone: jStr(j['phone']),
      executive: j['executive'] == true,
    );
  }
}

/// A row of /appointments/mine, /inbox and /desk.
class AppointmentRow {
  AppointmentRow({
    required this.id,
    required this.referenceNumber,
    required this.subject,
    required this.purpose,
    required this.mode,
    required this.durationMinutes,
    required this.preferredAt,
    required this.status,
    required this.createdAt,
    required this.requester,
    required this.host,
    this.alternativeAt,
    this.scheduledAt,
    this.location,
    this.urgent = false,
    this.statusNote,
  });

  final String id;
  final String referenceNumber;
  final String subject;
  final String purpose;
  final String mode;
  final int durationMinutes;
  final DateTime preferredAt;
  final DateTime? alternativeAt;

  /// The confirmed or proposed time.
  final DateTime? scheduledAt;
  final String? location;
  final bool urgent;
  final String status;
  final String? statusNote;
  final DateTime createdAt;
  final AppointmentPerson requester;
  final AppointmentPerson host;

  /// The time that matters now: confirmed or proposed, else what was asked.
  DateTime get when => scheduledAt ?? preferredAt;
  bool get isOpen => openAppointmentStatuses.contains(status);

  factory AppointmentRow.fromJson(Map<String, dynamic> j) => AppointmentRow(
    id: jStr(j['id'])!,
    referenceNumber: jStr(j['referenceNumber']) ?? '',
    subject: jStr(j['subject']) ?? '',
    purpose: jStr(j['purpose']) ?? 'OTHER',
    mode: jStr(j['mode']) ?? 'IN_PERSON',
    durationMinutes: jInt(j['durationMinutes']),
    preferredAt: jInstant(j['preferredAt']) ?? DateTime.now(),
    alternativeAt: jInstant(j['alternativeAt']),
    scheduledAt: jInstant(j['scheduledAt']),
    location: jStr(j['location']),
    urgent: j['urgent'] == true,
    status: jStr(j['status']) ?? 'PENDING',
    statusNote: jStr(j['statusNote']),
    createdAt: jInstant(j['createdAt']) ?? DateTime.now(),
    requester: AppointmentPerson.fromJson(j['requester']),
    host: AppointmentPerson.fromJson(j['host']),
  );
}

class AppointmentPage {
  const AppointmentPage(this.items, this.nextCursor);
  final List<AppointmentRow> items;
  final String? nextCursor;
}

/// A confirmed meeting in the host's diary that overlaps this one.
class AppointmentClash {
  const AppointmentClash({
    required this.referenceNumber,
    required this.subject,
    required this.withName,
    this.at,
  });

  final String referenceNumber;
  final String subject;
  final String withName;
  final DateTime? at;

  factory AppointmentClash.fromJson(Map<String, dynamic> j) => AppointmentClash(
    referenceNumber: jStr(j['referenceNumber']) ?? '',
    subject: jStr(j['subject']) ?? '',
    withName: jStr(j['with']) ?? '',
    at: jInstant(j['scheduledAt']),
  );
}

class AppointmentEvent {
  const AppointmentEvent({
    required this.type,
    required this.actor,
    required this.at,
    this.fromStatus,
    this.toStatus,
    this.note,
    this.scheduledAt,
  });

  final String type;
  final String? fromStatus;
  final String? toStatus;
  final String? note;
  final String actor;
  final DateTime at;
  final DateTime? scheduledAt;

  factory AppointmentEvent.fromJson(Map<String, dynamic> j) => AppointmentEvent(
    type: jStr(j['type']) ?? '',
    fromStatus: jStr(j['fromStatus']),
    toStatus: jStr(j['toStatus']),
    note: jStr(j['note']),
    actor: jStr(j['actor']) ?? '—',
    at: jInstant(j['createdAt']) ?? DateTime.now(),
    scheduledAt: jInstant(jMap(j['metadata'])['scheduledAt']),
  );
}

/// GET /appointments/:id
class AppointmentDetail {
  AppointmentDetail({
    required this.row,
    required this.agenda,
    required this.attendees,
    required this.clashes,
    required this.updates,
    required this.actions,
    this.endsAt,
    this.respondedByName,
    this.isRequester = false,
    this.isHost = false,
    this.isOffice = false,
  });

  final AppointmentRow row;
  final String agenda;
  final List<String> attendees;
  final DateTime? endsAt;
  final String? respondedByName;
  final List<AppointmentClash> clashes;
  final List<AppointmentEvent> updates;
  final Set<String> actions;
  final bool isRequester;
  final bool isHost;
  final bool isOffice;

  String get id => row.id;
  String get status => row.status;
  bool get hostSide => isHost || isOffice;
  bool can(String action) => actions.contains(action);

  factory AppointmentDetail.fromJson(Map<String, dynamic> j) {
    final viewer = jMap(j['viewer']);
    return AppointmentDetail(
      row: AppointmentRow.fromJson(j),
      agenda: jStr(j['agenda']) ?? '',
      attendees: jStrings(j['attendees']),
      endsAt: jInstant(j['endsAt']),
      respondedByName: jStr(j['respondedByName']),
      clashes: jList(j['clashes']).map(AppointmentClash.fromJson).toList(),
      updates: jList(j['updates']).map(AppointmentEvent.fromJson).toList(),
      actions: jStrings(viewer['actions']).toSet(),
      isRequester: viewer['isRequester'] == true,
      isHost: viewer['isHost'] == true,
      isOffice: viewer['isOffice'] == true,
    );
  }
}
