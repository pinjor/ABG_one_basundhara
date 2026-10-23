/// Data classes for the leave API (apps/api/src/leave/leave.service.ts) and
/// the rules from packages/shared/src/leave.ts the form needs to count days.
library;

import '../../widgets/module_kit.dart';
import '../tours/tour_models.dart' show calendarDate, isoDay, dhakaToday;

export '../tours/tour_models.dart' show calendarDate, isoDay, dhakaToday;

const leaveTypes = [
  'CASUAL',
  'SICK',
  'EARNED',
  'MATERNITY',
  'PATERNITY',
  'UNPAID',
];
const openLeaveStatuses = ['PENDING_HOD', 'PENDING_HR'];

/// Mirrors LEAVE_TYPE_RULES.
class LeaveRule {
  const LeaveRule({
    required this.annualDays,
    this.calendarDays = false,
    this.halfDayAllowed = false,
    this.backdateDays = 0,
    this.noticeDays = 0,
    this.maxPerRequest,
  });

  /// Null: no yearly allowance (unpaid).
  final int? annualDays;

  /// Counted in calendar days, weekends and holidays included.
  final bool calendarDays;
  final bool halfDayAllowed;
  final int backdateDays;
  final int noticeDays;
  final int? maxPerRequest;
}

const leaveRules = <String, LeaveRule>{
  'CASUAL': LeaveRule(
    annualDays: 10,
    halfDayAllowed: true,
    backdateDays: 7,
    maxPerRequest: 3,
  ),
  'SICK': LeaveRule(annualDays: 14, halfDayAllowed: true, backdateDays: 7),
  'EARNED': LeaveRule(annualDays: 18, noticeDays: 3),
  'MATERNITY': LeaveRule(
    annualDays: 112,
    calendarDays: true,
    maxPerRequest: 112,
  ),
  'PATERNITY': LeaveRule(annualDays: 5, backdateDays: 3, maxPerRequest: 5),
  'UNPAID': LeaveRule(annualDays: null, noticeDays: 3, maxPerRequest: 30),
};

/// Mirrors LEAVE_LIMITS.
abstract final class LeaveLimits {
  static const reasonMin = 3;
  static const reasonMax = 500;
  static const noteMax = 1000;
  static const addressMax = 200;
  static const maxLeadDays = 180;
}

/// The first day this type of leave may start, counted from today.
DateTime earliestLeaveStart(String type, [DateTime? today]) {
  final rule = leaveRules[type]!;
  final t = today ?? dhakaToday();
  return rule.backdateDays > 0
      ? t.subtract(Duration(days: rule.backdateDays))
      : t.add(Duration(days: rule.noticeDays));
}

/// Working days between two dates as the API counts them: the weekly
/// holiday and public holidays are free, maternity counts every day, and a
/// half day is ½.
double countLeaveDays(
  DateTime start,
  DateTime end, {
  required String type,
  required LeaveCalendar calendar,
  String? halfDay,
}) {
  if (end.isBefore(start)) return 0;
  final rule = leaveRules[type];
  final span = end.difference(start).inDays + 1;
  if (rule?.calendarDays ?? false) return span.toDouble();
  final holidays = calendar.holidays.map((h) => h.date).toSet();
  var days = 0;
  for (var i = 0; i < span; i++) {
    final d = start.add(Duration(days: i));
    // Dart counts Monday as 1 … Sunday as 7; the API counts Sunday as 0.
    if (calendar.weekendDays.contains(d.weekday % 7)) continue;
    if (holidays.contains(isoDay(d))) continue;
    days++;
  }
  if (halfDay != null && days == 1 && span == 1) return 0.5;
  return days.toDouble();
}

class PublicHoliday {
  const PublicHoliday(this.date, this.name);
  final String date;
  final String name;
}

/// GET /leave/calendar-settings
class LeaveCalendar {
  const LeaveCalendar({required this.weekendDays, required this.holidays});

  /// 0 = Sunday … 6 = Saturday. Friday (5) by default.
  final List<int> weekendDays;
  final List<PublicHoliday> holidays;

  static const fallback = LeaveCalendar(weekendDays: [5], holidays: []);

  factory LeaveCalendar.fromJson(Map<String, dynamic> j) => LeaveCalendar(
    weekendDays: (j['weekendDays'] as List? ?? const [5])
        .whereType<num>()
        .map((n) => n.toInt())
        .toList(),
    holidays: [
      for (final h in jList(j['holidays']))
        PublicHoliday(jStr(h['date']) ?? '', jStr(h['name']) ?? ''),
    ],
  );

  /// Public holidays inside a range, for the form's explanation.
  List<PublicHoliday> holidaysBetween(DateTime start, DateTime end) {
    final a = isoDay(start);
    final b = isoDay(end);
    return holidays
        .where((h) => h.date.compareTo(a) >= 0 && h.date.compareTo(b) <= 0)
        .toList();
  }
}

/// One type's row of GET /leave/balance.
class LeaveBalance {
  const LeaveBalance({
    required this.type,
    required this.entitled,
    required this.used,
    required this.pending,
    required this.available,
    this.adjusted = false,
    this.note,
  });

  final String type;

  /// Null for unpaid leave.
  final double? entitled;
  final double used;
  final double pending;
  final double? available;
  final bool adjusted;
  final String? note;

  factory LeaveBalance.fromJson(Map<String, dynamic> j) => LeaveBalance(
    type: jStr(j['type']) ?? '',
    entitled: j['entitled'] == null ? null : jNum(j['entitled']),
    used: jNum(j['used']),
    pending: jNum(j['pending']),
    available: j['available'] == null ? null : jNum(j['available']),
    adjusted: j['adjusted'] == true,
    note: jStr(j['note']),
  );
}

class LeavePerson {
  const LeavePerson({
    required this.name,
    this.employeeCode,
    this.designation,
    this.department,
  });

  final String name;
  final String? employeeCode;
  final String? designation;
  final String? department;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  factory LeavePerson.fromJson(dynamic raw) {
    final j = jMap(raw);
    return LeavePerson(
      name: jStr(j['name']) ?? '—',
      employeeCode: jStr(j['employeeCode']),
      designation: jStr(j['designation']),
      department: jStr(j['department']),
    );
  }
}

/// A row of GET /leave/mine.
class LeaveRow {
  LeaveRow({
    required this.id,
    required this.referenceNumber,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.status,
    required this.createdAt,
    required this.applicant,
    required this.approverName,
    this.halfDay,
    this.reason,
    this.awaiting,
    this.onLeaveNow = false,
    this.statusNote,
    this.relieverName,
  });

  final String id;
  final String referenceNumber;
  final String type;
  final DateTime startDate;
  final DateTime endDate;
  final String? halfDay;
  final double days;
  final String? reason;
  final String status;

  /// HOD or HR while open.
  final String? awaiting;
  final bool onLeaveNow;
  final String? statusNote;
  final DateTime createdAt;
  final LeavePerson applicant;
  final String approverName;
  final String? relieverName;

  bool get isOpen => openLeaveStatuses.contains(status);

  factory LeaveRow.fromJson(Map<String, dynamic> j) => LeaveRow(
    id: jStr(j['id'])!,
    referenceNumber: jStr(j['referenceNumber']) ?? '',
    type: jStr(j['type']) ?? 'CASUAL',
    startDate: calendarDate(j['startDate']) ?? dhakaToday(),
    endDate: calendarDate(j['endDate']) ?? dhakaToday(),
    halfDay: jStr(j['halfDay']),
    days: jNum(j['days']),
    reason: jStr(j['reason']),
    status: jStr(j['status']) ?? 'PENDING_HOD',
    awaiting: jStr(j['awaiting']),
    onLeaveNow: j['onLeaveNow'] == true,
    statusNote: jStr(j['statusNote']),
    createdAt: jInstant(j['createdAt']) ?? DateTime.now(),
    applicant: LeavePerson.fromJson(j['applicant']),
    approverName: jStr(jMap(j['approver'])['name']) ?? '—',
    relieverName: jStr(jMap(j['reliever'])['name']),
  );
}

class LeavePage {
  const LeavePage(this.items, this.nextCursor);
  final List<LeaveRow> items;
  final String? nextCursor;
}

/// A step of the pipeline: Applied → HOD → HR → Approved.
class LeaveStage {
  const LeaveStage({
    required this.key,
    required this.state,
    this.at,
    this.by,
    this.note,
    this.waitingFor,
  });

  final String key;
  final String state;
  final DateTime? at;
  final String? by;
  final String? note;
  final String? waitingFor;

  factory LeaveStage.fromJson(Map<String, dynamic> j) => LeaveStage(
    key: jStr(j['key']) ?? '',
    state: jStr(j['state']) ?? 'upcoming',
    at: jInstant(j['at']),
    by: jStr(j['by']),
    note: jStr(j['note']),
    waitingFor: jStr(j['waitingFor']),
  );
}

class LeaveEvent {
  const LeaveEvent({
    required this.type,
    required this.actor,
    required this.at,
    this.fromStatus,
    this.toStatus,
    this.note,
  });

  final String type;
  final String? fromStatus;
  final String? toStatus;
  final String? note;
  final String actor;
  final DateTime at;

  factory LeaveEvent.fromJson(Map<String, dynamic> j) => LeaveEvent(
    type: jStr(j['type']) ?? '',
    fromStatus: jStr(j['fromStatus']),
    toStatus: jStr(j['toStatus']),
    note: jStr(j['note']),
    actor: jStr(j['actor']) ?? '—',
    at: jInstant(j['createdAt']) ?? DateTime.now(),
  );
}

/// GET /leave/:id
class LeaveDetail {
  LeaveDetail({
    required this.row,
    required this.applicant,
    required this.approver,
    required this.pipeline,
    required this.updates,
    required this.actions,
    required this.branchName,
    this.reliever,
    this.addressDuringLeave,
    this.contactPhone,
    this.balance,
    this.isApplicant = false,
    this.isApprover = false,
    this.isHr = false,
    this.isReliever = false,
    this.blockedReason,
  });

  final LeaveRow row;
  final LeavePerson applicant;
  final LeavePerson approver;
  final LeavePerson? reliever;
  final String? addressDuringLeave;
  final String? contactPhone;
  final LeaveBalance? balance;
  final List<LeaveStage> pipeline;
  final List<LeaveEvent> updates;
  final Set<String> actions;
  final String branchName;
  final bool isApplicant;
  final bool isApprover;
  final bool isHr;
  final bool isReliever;
  final String? blockedReason;

  String get id => row.id;
  String get status => row.status;
  bool can(String action) => actions.contains(action);

  factory LeaveDetail.fromJson(Map<String, dynamic> j) {
    final viewer = jMap(j['viewer']);
    final balance = j['balance'];
    final reliever = j['reliever'];
    return LeaveDetail(
      row: LeaveRow.fromJson(j),
      applicant: LeavePerson.fromJson(j['applicant']),
      approver: LeavePerson.fromJson(j['approver']),
      reliever: reliever == null ? null : LeavePerson.fromJson(reliever),
      addressDuringLeave: jStr(j['addressDuringLeave']),
      contactPhone: jStr(j['contactPhone']),
      balance: balance is Map<String, dynamic>
          ? LeaveBalance.fromJson(balance)
          : null,
      pipeline: jList(j['pipeline']).map(LeaveStage.fromJson).toList(),
      updates: jList(j['updates']).map(LeaveEvent.fromJson).toList(),
      actions: jStrings(viewer['actions']).toSet(),
      branchName: jStr(jMap(j['branch'])['name']) ?? '',
      isApplicant: viewer['isApplicant'] == true,
      isApprover: viewer['isApprover'] == true,
      isHr: viewer['isHr'] == true,
      isReliever: viewer['isReliever'] == true,
      blockedReason: jStr(viewer['blockedReason']),
    );
  }
}

/// A row of GET /leave/approvals.
class LeaveApproval {
  const LeaveApproval({
    required this.id,
    required this.referenceNumber,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.awaiting,
    required this.applicant,
    required this.createdAt,
    this.halfDay,
    this.reason,
  });

  final String id;
  final String referenceNumber;
  final String type;
  final DateTime startDate;
  final DateTime endDate;
  final String? halfDay;
  final double days;
  final String? reason;
  final String awaiting;
  final LeavePerson applicant;
  final DateTime createdAt;

  factory LeaveApproval.fromJson(Map<String, dynamic> j) => LeaveApproval(
    id: jStr(j['id'])!,
    referenceNumber: jStr(j['referenceNumber']) ?? '',
    type: jStr(j['type']) ?? 'CASUAL',
    startDate: calendarDate(j['startDate']) ?? dhakaToday(),
    endDate: calendarDate(j['endDate']) ?? dhakaToday(),
    halfDay: jStr(j['halfDay']),
    days: jNum(j['days']),
    reason: jStr(j['reason']),
    awaiting: jStr(j['awaiting']) ?? 'HOD',
    applicant: LeavePerson.fromJson(j['applicant']),
    createdAt: jInstant(j['createdAt']) ?? DateTime.now(),
  );
}

/// One colleague of GET /leave/team.
class TeamAbsence {
  const TeamAbsence({
    required this.name,
    required this.leaves,
    this.designation,
  });

  final String name;
  final String? designation;
  final List<LeaveRow> leaves;
}
