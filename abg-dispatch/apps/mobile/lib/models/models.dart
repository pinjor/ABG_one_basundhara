/// Plain data classes for API payloads. Parsing is defensive: a missing field
/// becomes null or empty rather than crashing a custody screen.
library;

typedef Json = Map<String, dynamic>;

DateTime? _date(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;
String? _str(dynamic v) => v?.toString();
Json _map(dynamic v) => v is Map<String, dynamic> ? v : <String, dynamic>{};
List<Json> _list(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : <Json>[];

class Person {
  Person({
    required this.id,
    required this.name,
    this.code,
    this.designation,
    this.phone,
    this.department,
    this.branch,
    this.branchCode,
    this.branchId,
  });

  final String? id;
  final String name;
  final String? code;
  final String? designation;
  final String? phone;
  final String? department;
  final String? branch;
  final String? branchCode;
  final String? branchId;

  static Person? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    return Person(
      id: _str(raw['id']),
      name: _str(raw['fullName']) ?? _str(raw['name']) ?? '—',
      code: _str(raw['employeeCode']),
      designation: _str(raw['designation']),
      phone: _str(raw['phone']),
      department: _str(_map(raw['department'])['name']),
      branch: _str(_map(raw['branch'])['name']),
      branchCode: _str(_map(raw['branch'])['code']),
      branchId: _str(_map(raw['branch'])['id']),
    );
  }

  String get initials {
    final parts = name
        .replaceAll(RegExp(r'^(Md\.|Mohammad|Mohammed)\s+'), '')
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    return parts.length == 1
        ? parts.first.substring(0, 1).toUpperCase()
        : '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

class Profile {
  Profile({
    required this.id,
    required this.displayName,
    required this.roles,
    required this.capabilities,
    this.email,
    this.locale = 'en',
    this.employee,
    this.defaultLocation,
    this.mfaEnabled = false,
    this.manager,
  });

  final String id;
  final String displayName;
  final String? email;
  final String locale;
  final List<String> roles;
  final Set<String> capabilities;
  final Person? employee;
  final String? defaultLocation;
  final bool mfaEnabled;

  /// Head of department / line manager: the default approver for tours and pool cars.
  final ManagerRef? manager;

  bool get isCourier =>
      roles.contains('COURIER_RUNNER') || roles.contains('DISPATCH_OFFICER');
  bool can(String capability) => capabilities.contains(capability);
  String get firstName {
    final n = displayName.replaceAll(RegExp(r'^Md\.\s*'), '');
    return n.split(' ').first;
  }

  factory Profile.fromJson(Json j) {
    final e = j['employee'];
    return Profile(
      id: _str(j['id'])!,
      displayName: _str(j['displayName']) ?? '',
      email: _str(j['email']),
      locale: _str(j['locale']) ?? 'en',
      roles: (j['roles'] as List? ?? const [])
          .map((e) => e.toString())
          .toList(),
      capabilities: (j['capabilities'] as List? ?? const [])
          .map((e) => e.toString())
          .toSet(),
      employee: Person.fromJson(e),
      defaultLocation: _str(_map(_map(e)['defaultLocation'])['path']),
      mfaEnabled: j['mfaEnabled'] == true,
      manager: ManagerRef.fromJson(_map(e)['manager']),
    );
  }
}

class ManagerRef {
  const ManagerRef({
    required this.employeeId,
    required this.fullName,
    this.designation,
    this.hasAccount = false,
  });

  final String employeeId;
  final String fullName;
  final String? designation;

  /// Only someone who can sign in can approve.
  final bool hasAccount;

  static ManagerRef? fromJson(Object? raw) {
    final j = _map(raw);
    final id = _str(j['employeeId']);
    if (id == null) return null;
    return ManagerRef(
      employeeId: id,
      fullName: _str(j['fullName']) ?? '',
      designation: _str(j['designation']),
      hasAccount: _str(j['userId']) != null,
    );
  }
}

class GuestProfile {
  GuestProfile({
    required this.id,
    required this.fullName,
    required this.phone,
    this.company,
    this.vehicleNumber,
  });

  final String id;
  final String fullName;
  final String phone;
  final String? company;
  final String? vehicleNumber;

  factory GuestProfile.fromJson(Json j) => GuestProfile(
    id: _str(j['id'])!,
    fullName: _str(j['fullName']) ?? '',
    phone: _str(j['phone']) ?? '',
    company: _str(j['company']),
    vehicleNumber: _str(j['vehicleNumber']),
  );

  Json toJson() => {
    'id': id,
    'fullName': fullName,
    'phone': phone,
    'company': company,
    'vehicleNumber': vehicleNumber,
  };
}

class ParcelRow {
  ParcelRow({
    required this.id,
    required this.trackingNumber,
    required this.title,
    required this.status,
    required this.priority,
    required this.classification,
    required this.category,
    required this.senderName,
    required this.receiverName,
    required this.origin,
    required this.destination,
    required this.direction,
    required this.createdAt,
    this.statusChangedAt,
    this.carrierName,
    this.receivedBy,
    this.isOverdue = false,
    this.hasOpenException = false,
  });

  final String id;
  final String trackingNumber;
  final String title;
  final String status;
  final String priority;
  final String classification;
  final String category;
  final String senderName;
  final String receiverName;
  final String origin;
  final String destination;
  final String direction;
  final DateTime createdAt;
  final DateTime? statusChangedAt;
  final String? carrierName;
  final String? receivedBy;
  final bool isOverdue;
  final bool hasOpenException;

  factory ParcelRow.fromJson(Json j) => ParcelRow(
    id: _str(j['id'])!,
    trackingNumber: _str(j['trackingNumber']) ?? '',
    title: _str(j['title']) ?? '',
    status: _str(j['status']) ?? 'BOOKED',
    priority: _str(j['priority']) ?? 'NORMAL',
    classification: _str(j['classification']) ?? 'NORMAL',
    category: _str(j['category']) ?? '',
    senderName: _str(_map(j['sender'])['name']) ?? '',
    receiverName: _str(_map(j['receiver'])['name']) ?? '',
    origin: _str(j['origin']) ?? '',
    destination: _str(j['destination']) ?? '',
    direction: _str(j['direction']) ?? 'OTHER',
    createdAt: _date(j['createdAt']) ?? DateTime.now(),
    statusChangedAt: _date(j['statusChangedAt']),
    carrierName: _str(_map(j['carrier'])['name']),
    receivedBy: _str(j['receivedBy']),
    isOverdue: j['isOverdue'] == true,
    hasOpenException: j['hasOpenException'] == true,
  );
}

class CarrierInfo {
  CarrierInfo({
    required this.type,
    required this.name,
    this.code,
    this.phone,
    this.status,
    this.provider,
    this.externalTrackingNumber,
    this.vehicleNumber,
    this.handoverRequestedAt,
    this.trackingUrl,
    this.externalStatus,
  });

  final String type;
  final String name;
  final String? code;
  final String? phone;
  final String? status;
  final String? provider;
  final String? externalTrackingNumber;
  final String? vehicleNumber;
  final DateTime? handoverRequestedAt;
  final String? trackingUrl;
  final String? externalStatus;

  static CarrierInfo? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    return CarrierInfo(
      type: _str(raw['type']) ?? 'INTERNAL_EMPLOYEE',
      name: _str(raw['name']) ?? '',
      code: _str(raw['code']),
      phone: _str(raw['phone']),
      status: _str(raw['status']),
      provider: _str(_map(raw['provider'])['name']),
      externalTrackingNumber: _str(raw['externalTrackingNumber']),
      vehicleNumber: _str(_map(raw['guest'])['vehicleNumber']),
      handoverRequestedAt: _date(raw['handoverRequestedAt']),
      trackingUrl: _str(raw['trackingUrl']),
      externalStatus: _str(raw['externalStatus']),
    );
  }
}

class ReceiptInfo {
  ReceiptInfo({
    required this.receivedAt,
    required this.name,
    this.code,
    this.onBehalf = false,
    this.reason,
    this.relationship,
    this.verification,
  });

  final DateTime receivedAt;
  final String name;
  final String? code;
  final bool onBehalf;
  final String? reason;
  final String? relationship;
  final String? verification;

  static ReceiptInfo? fromJson(dynamic raw) {
    if (raw is! Map<String, dynamic>) return null;
    final by = _map(raw['receivedBy']);
    return ReceiptInfo(
      receivedAt: _date(raw['receivedAt']) ?? DateTime.now(),
      name: _str(by['name']) ?? '',
      code: _str(by['employeeCode']),
      onBehalf: raw['onBehalf'] == true,
      reason: _str(raw['onBehalfReason']),
      relationship: _str(raw['onBehalfRelationship']),
      verification: _str(raw['verification']),
    );
  }
}

class ParcelDetail {
  ParcelDetail(this.raw);

  final Json raw;

  String get id => _str(raw['id'])!;
  String get trackingNumber => _str(raw['trackingNumber']) ?? '';
  String? get qrPayload => _str(raw['qrPayload']);
  String get title => _str(raw['title']) ?? '';
  String get description => _str(raw['description']) ?? '';
  String get contentAccess => _str(raw['contentAccess']) ?? 'FULL';
  String get status => _str(raw['status']) ?? 'BOOKED';
  String get priority => _str(raw['priority']) ?? 'NORMAL';
  String get classification => _str(raw['classification']) ?? 'NORMAL';
  String get category => _str(_map(raw['category'])['name']) ?? '';
  String get deliveryMethod =>
      _str(raw['deliveryMethod']) ?? 'INTERNAL_EMPLOYEE';
  bool get sentOnBehalf => raw['sentOnBehalf'] == true;
  String get createdByName => _str(_map(raw['createdBy'])['name']) ?? '';
  Person? get sender => Person.fromJson(raw['sender']);
  String get originBranch =>
      _str(_map(_map(raw['origin'])['branch'])['name']) ?? '';
  String? get originLocation =>
      _str(_map(_map(raw['origin'])['location'])['path']);
  Person? get receiverEmployee =>
      Person.fromJson(_map(raw['receiver'])['employee']);
  String? get receiverDepartment =>
      _str(_map(_map(raw['receiver'])['department'])['name']);
  Json? get externalReceiver => _map(raw['receiver'])['external'] as Json?;
  String get receiverName =>
      receiverEmployee?.name ??
      receiverDepartment ??
      _str(externalReceiver?['name']) ??
      destinationBranch;
  String get destinationBranch =>
      _str(_map(_map(raw['destination'])['branch'])['name']) ??
      _str(_map(raw['destination'])['address']) ??
      '';
  String? get destinationLocation =>
      _str(_map(_map(raw['destination'])['location'])['path']) ??
      _str(_map(raw['destination'])['address']);
  CarrierInfo? get carrier => CarrierInfo.fromJson(raw['carrier']);
  ReceiptInfo? get receipt => ReceiptInfo.fromJson(raw['receipt']);
  DateTime? milestone(String key) => _date(_map(raw['milestones'])[key]);
  DateTime? get expectedDeliveryAt => _date(raw['expectedDeliveryAt']);
  DateTime get createdAt => _date(raw['createdAt']) ?? DateTime.now();
  bool get isOverdue => raw['isOverdue'] == true;
  bool get hasOpenException => raw['hasOpenException'] == true;
  String? get relation => _str(_map(raw['viewer'])['relation']);
  bool get isSender => _map(raw['viewer'])['isSender'] == true;
  bool get isReceiver => _map(raw['viewer'])['isReceiver'] == true;
  bool get isCurrentCarrier => _map(raw['viewer'])['isCurrentCarrier'] == true;
  List<String> get actions =>
      (_map(raw['viewer'])['actions'] as List? ?? const [])
          .map((e) => e.toString())
          .toList();
  bool can(String action) => actions.contains(action);
}

class TimelineEvent {
  TimelineEvent({
    required this.id,
    required this.type,
    required this.label,
    required this.at,
    required this.actorName,
    this.actorCode,
    this.location,
    this.toStatus,
    this.verification,
    this.notes,
    this.hasProof = false,
    this.metadata = const {},
    this.corrected = false,
  });

  final String id;
  final String type;
  final String label;
  final DateTime at;
  final String actorName;
  final String? actorCode;
  final String? location;
  final String? toStatus;
  final String? verification;
  final String? notes;
  final bool hasProof;
  final Json metadata;
  final bool corrected;

  factory TimelineEvent.fromJson(Json j) => TimelineEvent(
    id: _str(j['id'])!,
    type: _str(j['eventType']) ?? '',
    label: _str(j['label']) ?? '',
    at: _date(j['at']) ?? DateTime.now(),
    actorName: _str(_map(j['actor'])['name']) ?? '',
    actorCode: _str(_map(j['actor'])['code']),
    location: _str(j['location']),
    toStatus: _str(j['toStatus']),
    verification: _str(_map(j['verification'])['label']),
    notes: _str(j['notes']),
    hasProof: j['proof'] != null,
    metadata: _map(j['metadata']),
    corrected: (j['correctedBy'] as List? ?? const []).isNotEmpty,
  );
}

class Timeline {
  Timeline({
    required this.events,
    required this.attachments,
    required this.comments,
    required this.exceptions,
  });

  final List<TimelineEvent> events;
  final List<Json> attachments;
  final List<Json> comments;
  final List<Json> exceptions;

  factory Timeline.fromJson(Json j) => Timeline(
    events: _list(j['events']).map(TimelineEvent.fromJson).toList(),
    attachments: _list(j['attachments']),
    comments: _list(j['comments']),
    exceptions: _list(j['exceptions']),
  );
}

class AppNotification {
  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.createdAt,
    required this.read,
    this.parcelId,
    this.incidentId,
    this.incidentStatus,
    this.route,
    this.eventType,
  });

  final String id;
  final String title;
  final String body;
  final String category;
  final DateTime createdAt;
  bool read;
  final String? parcelId;
  final String? incidentId;

  /// The report's status when this alert was sent (incident alerts only).
  final String? incidentStatus;

  /// App path that opens the item (ABG ONE modules), e.g. `/pool-car/{id}`.
  final String? route;
  final String? eventType;

  factory AppNotification.fromJson(Json j) => AppNotification(
    id: _str(j['id'])!,
    title: _str(j['title']) ?? '',
    body: _str(j['body']) ?? '',
    category: _str(j['category']) ?? 'PARCEL_UPDATE',
    createdAt: _date(j['createdAt']) ?? DateTime.now(),
    read: j['read'] == true,
    parcelId: _str(j['parcelId']),
    incidentId: _str(_map(j['data'])['incidentId']),
    incidentStatus: _str(_map(j['data'])['status']),
    route: _str(_map(j['data'])['route']),
    eventType: _str(j['eventType']),
  );
}

class ParcelSummary {
  ParcelSummary({
    this.inTransit = 0,
    this.waitingForMe = 0,
    this.pendingPickup = 0,
    this.assignedToMe = 0,
    this.outgoingActive = 0,
  });

  final int inTransit;
  final int waitingForMe;
  final int pendingPickup;
  final int assignedToMe;
  final int outgoingActive;

  factory ParcelSummary.fromJson(Json j) => ParcelSummary(
    inTransit: (j['inTransit'] as num?)?.toInt() ?? 0,
    waitingForMe: (j['waitingForMe'] as num?)?.toInt() ?? 0,
    pendingPickup: (j['pendingPickup'] as num?)?.toInt() ?? 0,
    assignedToMe: (j['assignedToMe'] as num?)?.toInt() ?? 0,
    outgoingActive: (j['outgoingActive'] as num?)?.toInt() ?? 0,
  );
}

class DirectoryEmployee {
  DirectoryEmployee(this.raw);

  final Json raw;
  String get id => _str(raw['id'])!;
  String get name => _str(raw['fullName']) ?? '';
  String get code => _str(raw['employeeCode']) ?? '';
  String? get designation => _str(raw['designation']);
  String? get phone => _str(raw['phone']);
  String? get department => _str(_map(raw['department'])['name']);
  String get branch => _str(_map(raw['branch'])['name']) ?? '';
  String? get branchId => _str(_map(raw['branch'])['id']);
  String? get location => _str(_map(raw['defaultLocation'])['path']);
  bool get isMe => raw['isMe'] == true;
  Person get person => Person(
    id: id,
    name: name,
    code: code,
    designation: designation,
    phone: phone,
    department: department,
    branch: branch,
  );
}

class Option {
  Option(this.id, this.label, {this.subtitle, this.code});

  final String id;
  final String label;
  final String? subtitle;
  final String? code;
}

// ── Incident & facility issues ──
// Mirrors packages/shared/src/incidents.ts.

/// The four categories, in the order the report form shows them.
const incidentGroups = [
  'SAFETY_INDUSTRIAL',
  'ADMIN_FACILITY',
  'SECURITY',
  'IT_TECHNICAL',
];

/// Sub-categories of each group.
const incidentGroupCategories = <String, List<String>>{
  'SAFETY_INDUSTRIAL': [
    'FIRE_HAZARD',
    'GAS_LEAK',
    'CHEMICAL_SPILL',
    'INJURY_NEAR_MISS',
    'ELECTRICAL_HAZARD',
    'MACHINERY_FAULT',
    'PPE_VIOLATION',
    'SAFETY_HAZARD',
  ],
  'ADMIN_FACILITY': [
    'BUILDING_DAMAGE',
    'CLEANLINESS',
    'CAFETERIA_HYGIENE',
    'WASHROOM',
    'WATER_SUPPLY',
    'AC_VENTILATION',
    'FURNITURE_FIXTURES',
    'PEST_CONTROL',
    'OTHER',
  ],
  'SECURITY': [
    'UNAUTHORISED_ACCESS',
    'THEFT_LOSS',
    'CCTV_FAULT',
    'GATE_LOCK',
    'MISCONDUCT',
  ],
  'IT_TECHNICAL': [
    'NETWORK_DOWN',
    'COMPUTER_PRINTER',
    'SOFTWARE_ACCESS',
    'TELEPHONE',
    'POWER_UPS',
  ],
};

/// Every sub-category, group by group.
final incidentCategories = [
  for (final g in incidentGroups) ...incidentGroupCategories[g]!,
];

/// The group a sub-category belongs to (Admin & Facility if unknown).
String incidentGroupOf(String category) => incidentGroups.firstWhere(
  (g) => incidentGroupCategories[g]!.contains(category),
  orElse: () => 'ADMIN_FACILITY',
);

/// Misconduct is always confidential: Head Office only, reporter hidden.
bool incidentForcesConfidential(String category) => category == 'MISCONDUCT';

/// Most severe first, as the picker shows them.
const incidentSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/// Reported → Acknowledged → Under Investigation → Closed.
const incidentStages = [
  'REPORTED',
  'ACKNOWLEDGED',
  'UNDER_INVESTIGATION',
  'CLOSED',
];
const openIncidentStatuses = [
  'REPORTED',
  'ACKNOWLEDGED',
  'UNDER_INVESTIGATION',
];
const incidentResolutions = [
  'RESOLVED',
  'NO_ACTION_NEEDED',
  'DUPLICATE',
  'REFERRED',
];
const maxIncidentPhotos = 3;

class IncidentRow {
  IncidentRow({
    required this.id,
    required this.referenceNumber,
    required this.title,
    required this.group,
    required this.category,
    required this.severity,
    required this.status,
    required this.createdAt,
    required this.statusChangedAt,
    required this.branchName,
    this.resolution,
    this.statusNote,
    this.place,
    this.anonymous = false,
    this.confidential = false,
    this.photoCount = 0,
    this.thumbnailUrl,
  });

  final String id;
  final String referenceNumber;
  final String title;
  final String group;
  final String category;
  final String severity;
  final String status;
  final String? resolution;
  final DateTime createdAt;
  final DateTime statusChangedAt;
  final String branchName;
  final String? statusNote;
  final String? place;
  final bool anonymous;
  final bool confidential;
  final int photoCount;
  final String? thumbnailUrl;

  bool get isOpen => openIncidentStatuses.contains(status);

  factory IncidentRow.fromJson(Json j) {
    final category = _str(j['category']) ?? 'OTHER';
    return IncidentRow(
      id: _str(j['id'])!,
      referenceNumber: _str(j['referenceNumber']) ?? '',
      title: _str(j['title']) ?? '',
      group: _str(j['group']) ?? incidentGroupOf(category),
      category: category,
      severity: _str(j['severity']) ?? 'MEDIUM',
      status: _str(j['status']) ?? 'REPORTED',
      resolution: _str(j['resolution']),
      createdAt: _date(j['createdAt']) ?? DateTime.now(),
      statusChangedAt: _date(j['statusChangedAt']) ?? DateTime.now(),
      branchName: _str(_map(j['branch'])['name']) ?? '',
      statusNote: _str(j['statusNote']),
      place: _str(j['place']),
      anonymous: j['anonymous'] == true,
      confidential: j['confidential'] == true,
      photoCount: (j['photoCount'] as num?)?.toInt() ?? 0,
      thumbnailUrl: _str(j['thumbnailUrl']),
    );
  }
}

class IncidentPhoto {
  IncidentPhoto(this.id, this.kind, this.url);
  final String id;
  final String kind;
  final String url;
  bool get isFix => kind == 'RESOLUTION';
}

class IncidentUpdate {
  IncidentUpdate({
    required this.id,
    required this.type,
    required this.actor,
    required this.at,
    this.fromStatus,
    this.toStatus,
    this.note,
    this.resolution,
  });

  final String id;
  final String type;
  final String actor;
  final DateTime at;
  final String? fromStatus;
  final String? toStatus;
  final String? note;

  /// How it was closed, on a move to Closed.
  final String? resolution;

  /// A move out of Closed is a reopening.
  bool get reopened => type == 'STATUS_CHANGED' && fromStatus == 'CLOSED';
}

/// One stage of the tracker, as the API computes it.
class IncidentStage {
  IncidentStage({
    required this.status,
    required this.state,
    this.at,
    this.by,
    this.resolution,
  });

  final String status;

  /// done · current · upcoming · skipped
  final String state;
  final DateTime? at;
  final String? by;
  final String? resolution;

  bool get reached => state == 'done' || state == 'current';
}

class Incident {
  Incident(this.raw);

  final Json raw;

  String get id => raw['id'] as String;
  String get referenceNumber => _str(raw['referenceNumber']) ?? '';
  String get title => _str(raw['title']) ?? '';
  String get description => _str(raw['description']) ?? '';
  String get category => _str(raw['category']) ?? 'OTHER';
  String get group => _str(raw['group']) ?? incidentGroupOf(category);
  String get severity => _str(raw['severity']) ?? 'MEDIUM';
  String get status => _str(raw['status']) ?? 'REPORTED';
  String? get resolution => _str(raw['resolution']);
  String? get statusNote => _str(raw['statusNote']);
  DateTime get createdAt => _date(raw['createdAt']) ?? DateTime.now();
  DateTime? get acknowledgedAt => _date(raw['acknowledgedAt']);
  DateTime? get investigationStartedAt => _date(raw['investigationStartedAt']);
  DateTime? get closedAt => _date(raw['closedAt']);
  String get branchName => _str(_map(raw['branch'])['name']) ?? '';
  String? get locationPath => _str(_map(raw['location'])['path']);
  String? get locationDetail => _str(raw['locationDetail']);
  bool get anonymous => raw['anonymous'] == true;
  bool get confidential => raw['confidential'] == true;
  String? get reporterName => _str(_map(raw['reporter'])['name']);
  bool get isReporter => _map(raw['viewer'])['isReporter'] == true;
  List<String> get actions =>
      ((_map(raw['viewer'])['actions'] as List?) ?? const []).cast<String>();
  bool get isOpen => openIncidentStatuses.contains(status);

  /// The four stages, falling back to the timestamps if the server sent none.
  List<IncidentStage> get stages {
    final list = _list(raw['stages']);
    if (list.isNotEmpty) {
      return [
        for (final s in list)
          IncidentStage(
            status: _str(s['status']) ?? '',
            state: _str(s['state']) ?? 'upcoming',
            at: _date(s['at']),
            by: _str(s['by']),
            resolution: _str(s['resolution']),
          ),
      ];
    }
    final current = incidentStages.indexOf(status);
    final times = [createdAt, acknowledgedAt, investigationStartedAt, closedAt];
    return [
      for (var k = 0; k < incidentStages.length; k++)
        IncidentStage(
          status: incidentStages[k],
          state: k == current
              ? (k == incidentStages.length - 1 ? 'done' : 'current')
              : k < current
              ? (times[k] != null ? 'done' : 'skipped')
              : 'upcoming',
          at: k <= current ? times[k] : null,
          resolution: k == incidentStages.length - 1 ? resolution : null,
        ),
    ];
  }

  List<IncidentPhoto> get photos => _list(raw['photos'])
      .map(
        (p) => IncidentPhoto(
          _str(p['id']) ?? '',
          _str(p['kind']) ?? 'REPORT',
          _str(p['url']) ?? '',
        ),
      )
      .toList();

  List<IncidentUpdate> get updates => _list(raw['updates'])
      .map(
        (u) => IncidentUpdate(
          id: _str(u['id']) ?? '',
          type: _str(u['type']) ?? '',
          actor: _str(u['actor']) ?? '',
          at: _date(u['createdAt']) ?? DateTime.now(),
          fromStatus: _str(u['fromStatus']),
          toStatus: _str(u['toStatus']),
          note: _str(u['note']),
          resolution: _str(_map(u['metadata'])['resolution']),
        ),
      )
      .toList();
}
