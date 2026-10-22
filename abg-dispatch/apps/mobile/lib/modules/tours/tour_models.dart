/// Data classes for the tours API (apps/api/src/tours/tours.service.ts).
/// Parsing is defensive: a missing field becomes null or empty.
library;

import 'package:intl/intl.dart';

typedef TourJson = Map<String, dynamic>;

String? _str(dynamic v) => v?.toString();
TourJson _map(dynamic v) => v is Map<String, dynamic> ? v : <String, dynamic>{};
List<TourJson> _list(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : <TourJson>[];
int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
int? _intOrNull(dynamic v) => v is num ? v.toInt() : null;
DateTime? _instant(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;

/// A calendar date from the API ("2026-11-14"), kept as UTC midnight.
DateTime? calendarDate(dynamic v) {
  if (v is! String || v.length < 10) return null;
  final p = v.substring(0, 10).split('-').map(int.tryParse).toList();
  if (p.length != 3 || p.any((x) => x == null)) return null;
  return DateTime.utc(p[0]!, p[1]!, p[2]!);
}

/// "2026-11-14" for a calendar date.
String isoDay(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Today in Asia/Dhaka, as a calendar date.
DateTime dhakaToday([DateTime? now]) {
  final d = (now ?? DateTime.now()).toUtc().add(const Duration(hours: 6));
  return DateTime.utc(d.year, d.month, d.day);
}

const tourTypes = ['LOCAL', 'FOREIGN'];
const tourPurposes = [
  'CONFERENCE',
  'TECHNICAL_INSPECTION',
  'VENDOR_AUDIT',
  'TRAINING',
  'CLIENT_MEETING',
  'PLANT_VISIT',
  'OTHER',
];
const tourTransportModes = ['AIR', 'ROAD', 'RAIL', 'WATER', 'POOL_CAR'];
const tourStatuses = [
  'PENDING_HOD',
  'PENDING_VETTING',
  'PENDING_SANCTION',
  'APPROVED',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];
const closedTourStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED'];

/// Mirrors TOUR_LIMITS in packages/shared/src/tours.ts.
abstract final class TourLimits {
  static const titleMin = 3;
  static const titleMax = 140;
  static const descriptionMax = 2000;
  static const destinationMax = 120;
  static const countryMax = 60;
  static const noteMax = 1000;
  static const reasonMin = 3;
  static const maxCoTravellers = 10;
  static const coTravellerNameMax = 80;
  static const maxBudget = 100000000;
  static const maxDurationDays = 90;
  static const maxLeadDays = 365;
  static const passportValidityMonths = 6;
}

final passportNumberPattern = RegExp(r'^[A-Z0-9]{6,12}$');

/// True when the passport expires less than six months after the tour ends.
bool passportNeedsRenewal(DateTime? expiry, DateTime tourEnd) {
  if (expiry == null) return false;
  final limit = DateTime.utc(
    tourEnd.year,
    tourEnd.month + TourLimits.passportValidityMonths,
    tourEnd.day,
  );
  return expiry.isBefore(limit);
}

/// Days away, counting the first and the last day.
int tourDays(DateTime start, DateTime end) {
  final days = end.difference(start).inDays + 1;
  return days < 1 ? 1 : days;
}

/// Taka with lakh / crore grouping: ৳ 4,85,000 (Bangla digits in Bangla).
String formatTaka(int? amount, String locale) {
  if (amount == null) return '—';
  final f = NumberFormat.decimalPattern(locale == 'bn' ? 'bn' : 'en_IN');
  return '৳ ${f.format(amount)}';
}

class TourPersonRef {
  const TourPersonRef({
    required this.name,
    this.employeeCode,
    this.designation,
    this.department,
    this.phone,
  });

  final String name;
  final String? employeeCode;
  final String? designation;
  final String? department;
  final String? phone;

  String get subtitle => [
    designation,
    department,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  factory TourPersonRef.fromJson(dynamic raw) {
    final j = _map(raw);
    return TourPersonRef(
      name: _str(j['name']) ?? '—',
      employeeCode: _str(j['employeeCode']),
      designation: _str(j['designation']),
      department: _str(j['department']),
      phone: _str(j['phone']),
    );
  }
}

/// A row of GET /tours/mine (and /admin/tours).
class TourRow {
  TourRow({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.type,
    required this.purpose,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.estimatedBudget,
    required this.status,
    required this.createdAt,
    this.country,
    this.sanctionedBudget,
    this.awaiting,
    this.statusNote,
    this.passportAlert = false,
    this.approverName,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String type;
  final String purpose;
  final String destination;
  final String? country;
  final DateTime startDate;
  final DateTime endDate;
  final int estimatedBudget;
  final int? sanctionedBudget;
  final String status;
  final String? awaiting;
  final String? statusNote;
  final bool passportAlert;
  final String? approverName;
  final DateTime createdAt;

  bool get isForeign => type == 'FOREIGN';
  String get place => country != null ? '$destination, $country' : destination;

  factory TourRow.fromJson(TourJson j) => TourRow(
    id: _str(j['id'])!,
    referenceNumber: _str(j['referenceNumber']) ?? '',
    title: _str(j['title']) ?? '',
    type: _str(j['type']) ?? 'LOCAL',
    purpose: _str(j['purpose']) ?? 'OTHER',
    destination: _str(j['destination']) ?? '',
    country: _str(j['country']),
    startDate: calendarDate(j['startDate']) ?? dhakaToday(),
    endDate: calendarDate(j['endDate']) ?? dhakaToday(),
    estimatedBudget: _int(j['estimatedBudget']),
    sanctionedBudget: _intOrNull(j['sanctionedBudget']),
    status: _str(j['status']) ?? 'PENDING_HOD',
    awaiting: _str(j['awaiting']),
    statusNote: _str(j['statusNote']),
    passportAlert: j['passportAlert'] == true,
    approverName: _str(_map(j['approver'])['name']),
    createdAt: _instant(j['createdAt']) ?? DateTime.now(),
  );
}

/// A row of GET /tours/approvals — what is waiting for my decision.
class TourApproval {
  TourApproval({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.type,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.estimatedBudget,
    required this.status,
    required this.awaiting,
    required this.traveller,
    required this.createdAt,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String type;

  /// Destination with the country for overseas tours.
  final String destination;
  final DateTime startDate;
  final DateTime endDate;
  final int estimatedBudget;
  final String status;
  final String awaiting;
  final TourPersonRef traveller;
  final DateTime createdAt;

  factory TourApproval.fromJson(TourJson j) => TourApproval(
    id: _str(j['id'])!,
    referenceNumber: _str(j['referenceNumber']) ?? '',
    title: _str(j['title']) ?? '',
    type: _str(j['type']) ?? 'LOCAL',
    destination: _str(j['destination']) ?? '',
    startDate: calendarDate(j['startDate']) ?? dhakaToday(),
    endDate: calendarDate(j['endDate']) ?? dhakaToday(),
    estimatedBudget: _int(j['estimatedBudget']),
    status: _str(j['status']) ?? 'PENDING_HOD',
    awaiting: _str(j['awaiting']) ?? 'HOD',
    traveller: TourPersonRef.fromJson(j['traveller']),
    createdAt: _instant(j['createdAt']) ?? DateTime.now(),
  );
}

/// One step of the approval pipeline.
class TourStage {
  TourStage({
    required this.key,
    required this.state,
    this.at,
    this.by,
    this.note,
    this.waitingFor,
  });

  /// SUBMITTED or a tour status.
  final String key;

  /// done · current · upcoming · rejected · cancelled · skipped
  final String state;
  final DateTime? at;
  final String? by;
  final String? note;
  final String? waitingFor;

  bool get isDone => state == 'done';

  factory TourStage.fromJson(TourJson j) => TourStage(
    key: _str(j['key']) ?? '',
    state: _str(j['state']) ?? 'upcoming',
    at: _instant(j['at']),
    by: _str(j['by']),
    note: _str(j['note']),
    waitingFor: _str(j['waitingFor']),
  );
}

class TourEvent {
  TourEvent({
    required this.id,
    required this.type,
    required this.actor,
    required this.at,
    this.fromStatus,
    this.toStatus,
    this.note,
    this.metadata = const {},
  });

  final String id;

  /// SUBMITTED · STATUS_CHANGED · NOTE_ADDED · BUDGET_CHANGED
  final String type;
  final String? fromStatus;
  final String? toStatus;
  final String? note;
  final String actor;
  final Map<String, dynamic> metadata;
  final DateTime at;

  factory TourEvent.fromJson(TourJson j) => TourEvent(
    id: _str(j['id']) ?? '',
    type: _str(j['type']) ?? '',
    fromStatus: _str(j['fromStatus']),
    toStatus: _str(j['toStatus']),
    note: _str(j['note']),
    actor: _str(j['actor']) ?? '',
    metadata: _map(j['metadata']),
    at: _instant(j['createdAt']) ?? DateTime.now(),
  );
}

/// GET /tours/:id.
class TourDetail {
  TourDetail({
    required this.id,
    required this.referenceNumber,
    required this.type,
    required this.purpose,
    required this.title,
    required this.description,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.durationDays,
    required this.transportMode,
    required this.coTravellers,
    required this.estimatedBudget,
    required this.advanceRequested,
    required this.status,
    required this.createdAt,
    required this.traveller,
    required this.approver,
    required this.branchName,
    required this.pipeline,
    required this.updates,
    required this.actions,
    this.country,
    this.sanctionedBudget,
    this.passportNumber,
    this.passportExpiry,
    this.passportAlert = false,
    this.awaiting,
    this.statusNote,
    this.isTraveller = false,
    this.isApprover = false,
    this.canDecide = false,
    this.blockedReason,
    this.startableFrom,
  });

  final String id;
  final String referenceNumber;
  final String type;
  final String purpose;
  final String title;
  final String description;
  final String destination;
  final String? country;
  final DateTime startDate;
  final DateTime endDate;
  final int durationDays;
  final String transportMode;
  final List<String> coTravellers;
  final int estimatedBudget;
  final int advanceRequested;
  final int? sanctionedBudget;
  final String? passportNumber;
  final DateTime? passportExpiry;
  final bool passportAlert;
  final String status;
  final String? awaiting;
  final String? statusNote;
  final DateTime createdAt;
  final TourPersonRef traveller;
  final TourPersonRef approver;
  final String branchName;
  final List<TourStage> pipeline;
  final List<TourEvent> updates;
  final Set<String> actions;
  final bool isTraveller;
  final bool isApprover;
  final bool canDecide;
  final String? blockedReason;
  final DateTime? startableFrom;

  bool get isForeign => type == 'FOREIGN';
  String get place => country != null ? '$destination, $country' : destination;
  bool can(String action) => actions.contains(action);

  factory TourDetail.fromJson(TourJson j) {
    final viewer = _map(j['viewer']);
    return TourDetail(
      id: _str(j['id'])!,
      referenceNumber: _str(j['referenceNumber']) ?? '',
      type: _str(j['type']) ?? 'LOCAL',
      purpose: _str(j['purpose']) ?? 'OTHER',
      title: _str(j['title']) ?? '',
      description: _str(j['description']) ?? '',
      destination: _str(j['destination']) ?? '',
      country: _str(j['country']),
      startDate: calendarDate(j['startDate']) ?? dhakaToday(),
      endDate: calendarDate(j['endDate']) ?? dhakaToday(),
      durationDays: _int(j['durationDays']),
      transportMode: _str(j['transportMode']) ?? 'AIR',
      coTravellers: (j['coTravellers'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(),
      estimatedBudget: _int(j['estimatedBudget']),
      advanceRequested: _int(j['advanceRequested']),
      sanctionedBudget: _intOrNull(j['sanctionedBudget']),
      passportNumber: _str(j['passportNumber']),
      passportExpiry: calendarDate(j['passportExpiry']),
      passportAlert: j['passportAlert'] == true,
      status: _str(j['status']) ?? 'PENDING_HOD',
      awaiting: _str(j['awaiting']),
      statusNote: _str(j['statusNote']),
      createdAt: _instant(j['createdAt']) ?? DateTime.now(),
      traveller: TourPersonRef.fromJson(j['traveller']),
      approver: TourPersonRef.fromJson(j['approver']),
      branchName: _str(_map(j['branch'])['name']) ?? '',
      pipeline: _list(j['pipeline']).map(TourStage.fromJson).toList(),
      updates: _list(j['updates']).map(TourEvent.fromJson).toList(),
      actions: (viewer['actions'] as List? ?? const [])
          .map((e) => e.toString())
          .toSet(),
      isTraveller: viewer['isTraveller'] == true,
      isApprover: viewer['isApprover'] == true,
      canDecide: viewer['canDecide'] == true,
      blockedReason: _str(viewer['blockedReason']),
      startableFrom: calendarDate(viewer['startableFrom']),
    );
  }
}

class TourPage<T> {
  TourPage(this.items, this.nextCursor);
  final List<T> items;
  final String? nextCursor;
}
