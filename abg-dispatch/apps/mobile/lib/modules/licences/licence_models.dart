import '../../core/api_client.dart';
import '../../models/models.dart';

/// Renewal stages in order; the bar and the stepper show the five after
/// "Not started". Mirrors RENEWAL_STAGES in packages/shared/src/licences.ts.
const licenceRenewalStages = [
  'NOT_STARTED',
  'DOCUMENTS_PREPARED',
  'APPLICATION_SUBMITTED',
  'INSPECTION_SCHEDULED',
  'FEE_PAID',
  'RENEWED',
];

/// A calendar date sent as YYYY-MM-DD (no time zone: it is the same day everywhere).
DateTime? parseDay(Object? value) {
  if (value is! String || value.length < 10) return null;
  final p = value.substring(0, 10).split('-').map(int.tryParse).toList();
  if (p.length != 3 || p.any((x) => x == null)) return null;
  return DateTime.utc(p[0]!, p[1]!, p[2]!);
}

class LicenceRow {
  LicenceRow({
    required this.id,
    required this.name,
    required this.licenceNumber,
    required this.category,
    required this.issuingAuthority,
    required this.branchName,
    required this.branchCode,
    required this.expiresAt,
    required this.daysLeft,
    required this.state,
    required this.renewalStage,
    required this.renewalProgress,
    required this.hasDocument,
    this.active = true,
    this.ownerName,
  });

  final String id;
  final String name;
  final String licenceNumber;
  final String category;
  final String issuingAuthority;
  final String branchName;
  final String branchCode;
  final String? ownerName;
  final DateTime expiresAt;
  final int daysLeft;
  final String state;
  final String renewalStage;
  final int renewalProgress;
  final bool hasDocument;
  final bool active;

  factory LicenceRow.fromJson(Json j) {
    final branch = (j['branch'] as Map?)?.cast<String, dynamic>() ?? const {};
    final owner = (j['owner'] as Map?)?.cast<String, dynamic>();
    return LicenceRow(
      id: j['id'] as String,
      name: j['name'] as String? ?? '',
      licenceNumber: j['licenceNumber'] as String? ?? '',
      category: j['category'] as String? ?? 'OTHER',
      issuingAuthority: j['issuingAuthority'] as String? ?? '',
      branchName: branch['name'] as String? ?? '',
      branchCode: branch['code'] as String? ?? '',
      ownerName: owner?['name'] as String?,
      expiresAt: parseDay(j['expiresAt']) ?? DateTime.now().toUtc(),
      daysLeft: (j['daysLeft'] as num?)?.toInt() ?? 0,
      state: j['state'] as String? ?? 'VALID',
      renewalStage: j['renewalStage'] as String? ?? 'NOT_STARTED',
      renewalProgress: (j['renewalProgress'] as num?)?.toInt() ?? 0,
      hasDocument: j['hasDocument'] as bool? ?? false,
      active: j['active'] as bool? ?? true,
    );
  }
}

class LicenceEventItem {
  LicenceEventItem({
    required this.id,
    required this.type,
    required this.actor,
    required this.at,
    this.note,
    this.metadata = const {},
  });

  final String id;
  final String type;
  final String actor;
  final DateTime at;
  final String? note;
  final Json metadata;

  factory LicenceEventItem.fromJson(Json j) => LicenceEventItem(
    id: j['id'] as String,
    type: j['type'] as String? ?? '',
    actor: j['actor'] as String? ?? '',
    note: j['note'] as String?,
    metadata: (j['metadata'] as Map?)?.cast<String, dynamic>() ?? const {},
    at: DateTime.parse(j['createdAt'] as String),
  );
}

class LicenceDetail {
  LicenceDetail({
    required this.row,
    required this.renewalLeadDays,
    required this.renewalWindowOpensOn,
    required this.history,
    this.issuedAt,
    this.renewalFee,
    this.renewalStartedAt,
    this.notes,
    this.ownerDesignation,
    this.ownerPhone,
    this.documentUrl,
    this.documentName,
    this.documentSize,
    this.documentIsPdf = false,
    this.nextAlertOn,
    this.nextAlertDays,
  });

  final LicenceRow row;
  final DateTime? issuedAt;
  final int renewalLeadDays;
  final DateTime? renewalWindowOpensOn;
  final int? renewalFee;
  final DateTime? renewalStartedAt;
  final String? notes;
  final String? ownerDesignation;
  final String? ownerPhone;
  final String? documentUrl;
  final String? documentName;
  final int? documentSize;
  final bool documentIsPdf;
  final DateTime? nextAlertOn;
  final int? nextAlertDays;
  final List<LicenceEventItem> history;

  factory LicenceDetail.fromJson(Json j) {
    final owner = (j['owner'] as Map?)?.cast<String, dynamic>();
    final doc = (j['document'] as Map?)?.cast<String, dynamic>();
    final alerts = (j['alerts'] as Map?)?.cast<String, dynamic>() ?? const {};
    return LicenceDetail(
      row: LicenceRow.fromJson(j),
      issuedAt: parseDay(j['issuedAt']),
      renewalLeadDays: (j['renewalLeadDays'] as num?)?.toInt() ?? 90,
      renewalWindowOpensOn: parseDay(j['renewalWindowOpensOn']),
      renewalFee: (j['renewalFee'] as num?)?.toInt(),
      renewalStartedAt: j['renewalStartedAt'] == null
          ? null
          : DateTime.parse(j['renewalStartedAt'] as String),
      notes: j['notes'] as String?,
      ownerDesignation: owner?['designation'] as String?,
      ownerPhone: owner?['phone'] as String?,
      documentUrl: j['documentUrl'] as String?,
      documentName: doc?['name'] as String?,
      documentSize: (doc?['size'] as num?)?.toInt(),
      documentIsPdf: doc?['isPdf'] as bool? ?? false,
      nextAlertOn: parseDay(alerts['nextOn']),
      nextAlertDays: (alerts['nextDays'] as num?)?.toInt(),
      history: [
        for (final e in (j['history'] as List? ?? const []))
          LicenceEventItem.fromJson((e as Map).cast<String, dynamic>()),
      ],
    );
  }
}

class LicenceSummary {
  LicenceSummary({
    required this.total,
    required this.valid,
    required this.dueSoon,
    required this.expiring,
    required this.expired,
    required this.renewalsInProgress,
    this.nextId,
    this.nextName,
    this.nextBranch,
    this.nextDaysLeft,
  });

  final int total;
  final int valid;
  final int dueSoon;
  final int expiring;
  final int expired;
  final int renewalsInProgress;
  final String? nextId;
  final String? nextName;
  final String? nextBranch;
  final int? nextDaysLeft;

  factory LicenceSummary.fromJson(Json j) {
    int n(String k) => (j[k] as num?)?.toInt() ?? 0;
    final next = (j['nextExpiry'] as Map?)?.cast<String, dynamic>();
    return LicenceSummary(
      total: n('total'),
      valid: n('valid'),
      dueSoon: n('dueSoon'),
      expiring: n('expiring'),
      expired: n('expired'),
      renewalsInProgress: n('renewalsInProgress'),
      nextId: next?['id'] as String?,
      nextName: next?['name'] as String?,
      nextBranch: ((next?['branch'] as Map?)?['name']) as String?,
      nextDaysLeft: (next?['daysLeft'] as num?)?.toInt(),
    );
  }
}

class LicencePage {
  LicencePage(this.items, this.nextCursor);
  final List<LicenceRow> items;
  final String? nextCursor;
}

/// Read-only calls to the licence register.
class LicenceApi {
  LicenceApi(this.api);
  final ApiClient api;

  Future<LicencePage> list({String? state, String? cursor}) async {
    final res =
        await api.get(
              '/licences',
              query: {'state': state, 'cursor': cursor, 'limit': '25'},
            )
            as Json;
    return LicencePage([
      for (final i in (res['items'] as List? ?? const []))
        LicenceRow.fromJson((i as Map).cast<String, dynamic>()),
    ], res['nextCursor'] as String?);
  }

  Future<LicenceSummary> summary() async =>
      LicenceSummary.fromJson(await api.get('/admin/licences/summary') as Json);

  Future<LicenceDetail> get(String id) async =>
      LicenceDetail.fromJson(await api.get('/licences/$id') as Json);
}
