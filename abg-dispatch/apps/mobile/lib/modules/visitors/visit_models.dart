/// Visitor shapes returned by the API (apps/api/src/visitors) and the domain
/// rules the app checks before sending (mirrors packages/shared/src/visitors.ts).
library;

import '../../models/models.dart' show Json;

String? _s(dynamic v) => v is String && v.isNotEmpty ? v : null;
Json _m(dynamic v) => v is Map<String, dynamic> ? v : const {};
DateTime? _d(dynamic v) => v is String ? DateTime.tryParse(v) : null;
int _i(dynamic v, [int fallback = 0]) => v is num ? v.toInt() : fallback;
List<String> _list(dynamic v) =>
    v is List ? v.map((e) => e.toString()).toList() : const [];

/// The order purposes appear in pickers: the factory's most common reasons first.
const visitPurposes = [
  'VENDOR_SUPPLIER',
  'CONTRACTOR',
  'DELIVERY',
  'AUDIT_INSPECTION',
  'MEETING',
  'INTERVIEW',
  'GOVERNMENT_OFFICIAL',
  'PERSONAL',
  'OTHER',
];

const visitStatuses = [
  'EXPECTED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'EXPIRED',
];

const maxPartySize = 20;

/// "+880 1711-223344" → "01711223344".
String normalizeBdMobile(String raw) {
  var digits = raw.replaceAll(RegExp(r'[^\d]'), '');
  if (digits.startsWith('880')) digits = digits.substring(2);
  if (digits.length == 10 && digits.startsWith('1')) digits = '0$digits';
  return digits;
}

final _bdMobile = RegExp(r'^01[3-9]\d{8}$');

/// Grameenphone, Robi, Banglalink, Teletalk and Airtel numbers.
bool isBdMobile(String raw) => _bdMobile.hasMatch(normalizeBdMobile(raw));

/// Only the last four characters of an ID document are ever recorded.
bool isIdLast4(String raw) => RegExp(r'^[0-9A-Za-z]{4}$').hasMatch(raw);

/// One row on a list: the host's own visitors or the gate board.
class VisitRow {
  VisitRow(this.raw);
  final Json raw;

  String get id => raw['id'] as String;
  String get passNumber => _s(raw['passNumber']) ?? '';
  String get status => _s(raw['status']) ?? 'EXPECTED';
  bool get walkIn => raw['walkIn'] == true;
  String get visitorName => _s(raw['visitorName']) ?? '';
  String? get visitorPhone => _s(raw['visitorPhone']);
  String? get company => _s(raw['company']);
  String get purpose => _s(raw['purpose']) ?? 'OTHER';
  String? get purposeDetail => _s(raw['purposeDetail']);
  int get partySize => _i(raw['partySize'], 1);
  String? get vehicleNumber => _s(raw['vehicleNumber']);
  String? get badgeNumber => _s(raw['badgeNumber']);
  String get branchName => _s(_m(raw['branch'])['name']) ?? '';
  String get branchCode => _s(_m(raw['branch'])['code']) ?? '';
  String? get location => _s(raw['location']);
  String get hostName => _s(raw['hostName']) ?? '';
  bool get isHost => raw['isHost'] == true;
  DateTime get expectedAt => _d(raw['expectedAt']) ?? DateTime.now();
  DateTime? get expectedUntil => _d(raw['expectedUntil']);
  DateTime? get checkedInAt => _d(raw['checkedInAt']);
  DateTime? get checkedOutAt => _d(raw['checkedOutAt']);
  int? get onSiteMinutes => raw['onSiteMinutes'] is num
      ? (raw['onSiteMinutes'] as num).toInt()
      : null;
  bool get overstay => raw['overstay'] == true;
  List<String> get actions => _list(raw['actions']);
}

class VisitPage {
  VisitPage(this.items, this.nextCursor);
  final List<VisitRow> items;
  final String? nextCursor;

  factory VisitPage.fromJson(Json j) => VisitPage(
    (j['items'] as List? ?? const []).cast<Json>().map(VisitRow.new).toList(),
    _s(j['nextCursor']),
  );
}

/// One visit in full, with the gate pass for the host and gate staff.
class Visit {
  Visit(this.raw);
  final Json raw;

  String get id => raw['id'] as String;
  String get passNumber => _s(raw['passNumber']) ?? '';
  String get status => _s(raw['status']) ?? 'EXPECTED';
  bool get walkIn => raw['walkIn'] == true;
  String get visitorName => _s(raw['visitorName']) ?? '';
  String? get visitorPhone => _s(raw['visitorPhone']);
  String? get company => _s(raw['company']);
  String? get idLast4 => _s(raw['idLast4']);
  String get purpose => _s(raw['purpose']) ?? 'OTHER';
  String? get purposeDetail => _s(raw['purposeDetail']);
  int get partySize => _i(raw['partySize'], 1);
  String? get vehicleNumber => _s(raw['vehicleNumber']);
  String? get carrying => _s(raw['carrying']);
  String? get notes => _s(raw['notes']);
  String get branchName => _s(_m(raw['branch'])['name']) ?? '';
  String get branchCode => _s(_m(raw['branch'])['code']) ?? '';
  String? get branchAddress => _s(_m(raw['branch'])['address']);
  String? get locationName => _s(_m(raw['location'])['name']);
  String? get locationPath => _s(_m(raw['location'])['path']);
  String get hostName => _s(_m(raw['host'])['name']) ?? '';
  bool get hostHasAccount => _s(_m(raw['host'])['userId']) != null;
  String? get hostDesignation => _s(_m(raw['host'])['designation']);
  String? get hostDepartment => _s(_m(raw['host'])['department']);
  String? get hostPhone => _s(_m(raw['host'])['phone']);
  DateTime get expectedAt => _d(raw['expectedAt']) ?? DateTime.now();
  DateTime? get expectedUntil => _d(raw['expectedUntil']);
  String? get badgeNumber => _s(raw['badgeNumber']);
  DateTime? get checkedInAt => _d(raw['checkedInAt']);
  String? get checkedInBy => _s(raw['checkedInBy']);
  String? get checkInPoint => _s(raw['checkInPoint']);
  DateTime? get checkedOutAt => _d(raw['checkedOutAt']);
  String? get checkedOutBy => _s(raw['checkedOutBy']);
  DateTime? get cancelledAt => _d(raw['cancelledAt']);
  String? get cancelledBy => _s(raw['cancelledBy']);
  String? get cancelReason => _s(raw['cancelReason']);
  DateTime? get expiredAt => _d(raw['expiredAt']);
  DateTime get createdAt => _d(raw['createdAt']) ?? DateTime.now();
  int? get onSiteMinutes => raw['onSiteMinutes'] is num
      ? (raw['onSiteMinutes'] as num).toInt()
      : null;
  bool get overstay => raw['overstay'] == true;

  /// The QR payload (`…/g/v/<token>`), only for the host and gate staff.
  String? get passPayload => _s(_m(raw['pass'])['payload']);
  String? get passToken => _s(_m(raw['pass'])['token']);

  bool get isHost => _m(raw['viewer'])['isHost'] == true;
  bool get canManage => _m(raw['viewer'])['canManage'] == true;
  List<String> get actions => _list(_m(raw['viewer'])['actions']);
}

class VisitSummary {
  VisitSummary(this.raw);
  final Json raw;

  int get onSiteNow => _i(raw['onSiteNow']);
  int get peopleOnSite => _i(raw['peopleOnSite']);
  int get overstaying => _i(raw['overstaying']);
  int get expectedToday => _i(raw['expectedToday']);
  int get checkedOutToday => _i(raw['checkedOutToday']);
  int get walkInsToday => _i(raw['walkInsToday']);
  int get visitsToday => _i(raw['visitsToday']);
  String? get longestName => _s(_m(raw['longestOnSite'])['visitorName']);
  String? get longestId => _s(_m(raw['longestOnSite'])['id']);
  DateTime? get longestSince => _d(_m(raw['longestOnSite'])['since']);
}

class PassWarning {
  PassWarning(this.code, this.message, this.blocking);
  final String code;
  final String message;
  final bool blocking;
}

/// What the gate sees after scanning a pass.
class GatePassView {
  GatePassView(this.raw);
  final Json raw;

  String? get token => _s(raw['token']);
  String? get visitId => _s(raw['visitId']);
  String get passNumber => _s(raw['passNumber']) ?? '';
  String get status => _s(raw['status']) ?? 'EXPECTED';
  bool get walkIn => raw['walkIn'] == true;
  bool get valid => raw['valid'] == true;
  List<String> get allowed => _list(raw['allowed']);
  List<PassWarning> get warnings => (raw['warnings'] as List? ?? const [])
      .cast<Json>()
      .map(
        (w) => PassWarning(
          _s(w['code']) ?? '',
          _s(w['message']) ?? '',
          w['blocking'] == true,
        ),
      )
      .toList();
  PassWarning? get blocking {
    for (final w in warnings) {
      if (w.blocking) return w;
    }
    return null;
  }

  String get visitorName => _s(_m(raw['visitor'])['name']) ?? '';
  String? get company => _s(_m(raw['visitor'])['company']);
  String? get phone => _s(_m(raw['visitor'])['phone']);
  String? get idLast4 => _s(_m(raw['visitor'])['idLast4']);
  int get partySize => _i(_m(raw['visitor'])['partySize'], 1);
  String? get vehicleNumber => _s(_m(raw['visitor'])['vehicleNumber']);
  String? get carrying => _s(_m(raw['visitor'])['carrying']);
  String get purpose => _s(raw['purpose']) ?? 'OTHER';
  String? get purposeDetail => _s(raw['purposeDetail']);
  String get hostName => _s(_m(raw['host'])['name']) ?? '';
  String get branchName => _s(_m(raw['branch'])['name']) ?? '';
  String get branchCode => _s(_m(raw['branch'])['code']) ?? '';
  String? get location => _s(raw['location']);
  DateTime get expectedAt => _d(raw['expectedAt']) ?? DateTime.now();
  DateTime? get expectedUntil => _d(raw['expectedUntil']);
  DateTime? get checkedInAt => _d(raw['checkedInAt']);
  DateTime? get checkedOutAt => _d(raw['checkedOutAt']);
  String? get badgeNumber => _s(raw['badgeNumber']);
}
