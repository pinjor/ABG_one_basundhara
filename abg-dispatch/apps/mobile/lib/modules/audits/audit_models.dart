/// Data classes for the audits API (apps/api/src/audits/audits.service.ts).
library;

import '../../widgets/module_kit.dart';
import '../tours/tour_models.dart' show calendarDate;

export '../tours/tour_models.dart' show calendarDate, isoDay, dhakaToday;

const auditTypes = [
  'INTERNAL',
  'COMPLIANCE',
  'SAFETY',
  'BUYER',
  'ISO',
  'FINANCIAL',
  'ENVIRONMENT',
];
const auditRatings = ['SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY'];
const findingSeverities = ['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'];
const openFindingStatuses = ['OPEN', 'SUBMITTED'];

/// Days a corrective action has by default (FINDING_DUE_DAYS).
const findingDueDays = {'CRITICAL': 7, 'MAJOR': 30, 'MINOR': 60};

/// Mirrors AUDIT_LIMITS.
abstract final class AuditLimits {
  static const findingTitleMin = 3;
  static const findingTitleMax = 160;
  static const findingDetailMax = 2000;
  static const clauseMax = 80;
  static const noteMax = 1000;
  static const reasonMin = 3;
  static const maxDueDays = 365;
}

class FindingCounts {
  const FindingCounts({
    this.total = 0,
    this.open = 0,
    this.submitted = 0,
    this.verified = 0,
    this.noted = 0,
    this.overdue = 0,
    this.criticalOpen = 0,
  });

  final int total;
  final int open;
  final int submitted;
  final int verified;
  final int noted;
  final int overdue;
  final int criticalOpen;

  int get stillOpen => open + submitted;

  factory FindingCounts.fromJson(dynamic raw) {
    final j = jMap(raw);
    return FindingCounts(
      total: jInt(j['total']),
      open: jInt(j['open']),
      submitted: jInt(j['submitted']),
      verified: jInt(j['verified']),
      noted: jInt(j['noted']),
      overdue: jInt(j['overdue']),
      criticalOpen: jInt(j['criticalOpen']),
    );
  }
}

class AuditOwner {
  const AuditOwner({
    required this.userId,
    required this.name,
    this.designation,
    this.department,
  });

  final String userId;
  final String name;
  final String? designation;
  final String? department;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  static AuditOwner? fromJson(dynamic raw) {
    final j = jMap(raw);
    if (j['name'] == null) return null;
    return AuditOwner(
      userId: jStr(j['userId']) ?? '',
      name: jStr(j['name'])!,
      designation: jStr(j['designation']),
      department: jStr(j['department']),
    );
  }
}

/// The audit a corrective action belongs to (in /audits/actions/mine).
class AuditHeader {
  const AuditHeader({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.type,
    required this.status,
    required this.branchName,
    this.lead,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String type;
  final String status;
  final String branchName;
  final String? lead;

  factory AuditHeader.fromJson(dynamic raw) {
    final j = jMap(raw);
    return AuditHeader(
      id: jStr(j['id']) ?? '',
      referenceNumber: jStr(j['referenceNumber']) ?? '',
      title: jStr(j['title']) ?? '',
      type: jStr(j['type']) ?? 'INTERNAL',
      status: jStr(j['status']) ?? 'IN_PROGRESS',
      branchName: jStr(jMap(j['branch'])['name']) ?? '',
      lead: jStr(j['lead']),
    );
  }
}

class AuditFinding {
  AuditFinding({
    required this.id,
    required this.number,
    required this.title,
    required this.severity,
    required this.status,
    required this.createdAt,
    required this.actions,
    this.detail,
    this.clause,
    this.area,
    this.recommendation,
    this.owner,
    this.dueDate,
    this.overdue = false,
    this.response,
    this.submittedAt,
    this.verifiedAt,
    this.verifiedByName,
    this.audit,
  });

  final String id;
  final String number;
  final String title;
  final String? detail;
  final String? clause;
  final String? area;
  final String severity;
  final String status;
  final String? recommendation;
  final AuditOwner? owner;
  final DateTime? dueDate;
  final bool overdue;
  final String? response;
  final DateTime? submittedAt;
  final DateTime? verifiedAt;
  final String? verifiedByName;
  final DateTime createdAt;
  final Set<String> actions;

  /// Only in "my actions".
  final AuditHeader? audit;

  bool get isOpen => openFindingStatuses.contains(status);
  bool can(String action) => actions.contains(action);

  factory AuditFinding.fromJson(Map<String, dynamic> j) => AuditFinding(
    id: jStr(j['id'])!,
    number: jStr(j['number']) ?? '',
    title: jStr(j['title']) ?? '',
    detail: jStr(j['detail']),
    clause: jStr(j['clause']),
    area: jStr(j['area']),
    severity: jStr(j['severity']) ?? 'MINOR',
    status: jStr(j['status']) ?? 'OPEN',
    recommendation: jStr(j['recommendation']),
    owner: AuditOwner.fromJson(j['owner']),
    dueDate: calendarDate(j['dueDate']),
    overdue: j['overdue'] == true,
    response: jStr(j['response']),
    submittedAt: jInstant(j['submittedAt']),
    verifiedAt: jInstant(j['verifiedAt']),
    verifiedByName: jStr(j['verifiedByName']),
    createdAt: jInstant(j['createdAt']) ?? DateTime.now(),
    actions: jStrings(j['actions']).toSet(),
    audit: j['audit'] == null ? null : AuditHeader.fromJson(j['audit']),
  );
}

/// A row of GET /admin/audits.
class AuditRow {
  AuditRow({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.type,
    required this.status,
    required this.branchName,
    required this.leadName,
    required this.plannedStart,
    required this.plannedEnd,
    required this.counts,
    this.externalBody,
    this.rating,
    this.score,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String type;
  final String status;
  final String branchName;
  final String leadName;
  final String? externalBody;
  final DateTime plannedStart;
  final DateTime plannedEnd;
  final String? rating;
  final int? score;
  final FindingCounts counts;

  factory AuditRow.fromJson(Map<String, dynamic> j) => AuditRow(
    id: jStr(j['id'])!,
    referenceNumber: jStr(j['referenceNumber']) ?? '',
    title: jStr(j['title']) ?? '',
    type: jStr(j['type']) ?? 'INTERNAL',
    status: jStr(j['status']) ?? 'PLANNED',
    branchName: jStr(jMap(j['branch'])['name']) ?? '',
    leadName: jStr(jMap(j['lead'])['name']) ?? '—',
    externalBody: jStr(j['externalBody']),
    plannedStart: calendarDate(j['plannedStart']) ?? DateTime.now(),
    plannedEnd: calendarDate(j['plannedEnd']) ?? DateTime.now(),
    rating: jStr(j['rating']),
    score: j['score'] is num ? (j['score'] as num).toInt() : null,
    counts: FindingCounts.fromJson(j['counts']),
  );
}

class AuditEvent {
  const AuditEvent({
    required this.type,
    required this.actor,
    required this.at,
    this.findingId,
    this.fromStatus,
    this.toStatus,
    this.note,
  });

  final String type;
  final String? findingId;
  final String? fromStatus;
  final String? toStatus;
  final String? note;
  final String actor;
  final DateTime at;

  factory AuditEvent.fromJson(Map<String, dynamic> j) => AuditEvent(
    type: jStr(j['type']) ?? '',
    findingId: jStr(j['findingId']),
    fromStatus: jStr(j['fromStatus']),
    toStatus: jStr(j['toStatus']),
    note: jStr(j['note']),
    actor: jStr(j['actor']) ?? '—',
    at: jInstant(j['createdAt']) ?? DateTime.now(),
  );
}

/// GET /audits/:id
class AuditDetail {
  AuditDetail({
    required this.row,
    required this.team,
    required this.findings,
    required this.updates,
    required this.actions,
    this.scope,
    this.conclusion,
    this.statusNote,
    this.startedAt,
    this.fieldworkCompletedAt,
    this.closedAt,
    this.createdAt,
    this.createdByName,
    this.leadDesignation,
    this.isLead = false,
    this.canManage = false,
    this.partial = false,
  });

  final AuditRow row;
  final String? scope;
  final List<String> team;
  final String? conclusion;
  final String? statusNote;
  final DateTime? startedAt;
  final DateTime? fieldworkCompletedAt;
  final DateTime? closedAt;
  final DateTime? createdAt;
  final String? createdByName;
  final String? leadDesignation;
  final List<AuditFinding> findings;
  final List<AuditEvent> updates;
  final Set<String> actions;
  final bool isLead;
  final bool canManage;
  final bool partial;

  String get id => row.id;
  String get status => row.status;
  bool can(String action) => actions.contains(action);

  factory AuditDetail.fromJson(Map<String, dynamic> j) {
    final viewer = jMap(j['viewer']);
    return AuditDetail(
      row: AuditRow.fromJson(j),
      scope: jStr(j['scope']),
      team: jStrings(j['team']),
      conclusion: jStr(j['conclusion']),
      statusNote: jStr(j['statusNote']),
      startedAt: jInstant(j['startedAt']),
      fieldworkCompletedAt: jInstant(j['fieldworkCompletedAt']),
      closedAt: jInstant(j['closedAt']),
      createdAt: jInstant(j['createdAt']),
      createdByName: jStr(j['createdByName']),
      leadDesignation: jStr(jMap(j['lead'])['designation']),
      findings: jList(j['findings']).map(AuditFinding.fromJson).toList(),
      updates: jList(j['updates']).map(AuditEvent.fromJson).toList(),
      actions: jStrings(viewer['actions']).toSet(),
      isLead: viewer['isLead'] == true,
      canManage: viewer['canManage'] == true,
      partial: viewer['partial'] == true,
    );
  }
}

/// GET /audits/actions/mine
class MyAuditActions {
  const MyAuditActions({
    required this.items,
    this.open = 0,
    this.submitted = 0,
    this.overdue = 0,
  });

  final List<AuditFinding> items;
  final int open;
  final int submitted;
  final int overdue;
}
