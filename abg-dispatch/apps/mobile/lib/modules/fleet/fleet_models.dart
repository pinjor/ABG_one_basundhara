/// Pool car payloads from `/api/pool-car/*`. Parsing is defensive: a missing
/// field becomes null or empty rather than breaking a screen at the gate.
library;

import '../../core/api_client.dart';

typedef _Json = Map<String, dynamic>;

DateTime? _date(dynamic v) =>
    v is String ? DateTime.tryParse(v)?.toLocal() : null;
String? _str(dynamic v) => v?.toString();
_Json _map(dynamic v) => v is Map<String, dynamic> ? v : <String, dynamic>{};
List<_Json> _list(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : <_Json>[];
int _int(dynamic v, [int fallback = 0]) =>
    v is num ? v.toInt() : int.tryParse('$v') ?? fallback;
int? _intOrNull(dynamic v) => v is num ? v.toInt() : null;

const carTripTypes = ['ONE_WAY', 'ROUND_TRIP', 'FULL_DAY', 'AIRPORT'];
const carVehiclePreferences = [
  'ANY',
  'SEDAN',
  'SUV',
  'MICROBUS',
  'PICKUP',
  'COASTER',
];
const carPipeline = [
  'PENDING_HOD',
  'PENDING_FLEET',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
];
const carOpenStatuses = [
  'PENDING_HOD',
  'PENDING_FLEET',
  'ASSIGNED',
  'IN_PROGRESS',
];
const maxCarPassengers = 14;

/// Round trips and full days must say when the car comes back.
bool carTripNeedsReturn(String tripType) =>
    tripType == 'ROUND_TRIP' || tripType == 'FULL_DAY';

class CarPassenger {
  const CarPassenger(this.name, [this.phone]);
  final String name;
  final String? phone;

  static List<CarPassenger> listFrom(dynamic raw) => [
    for (final p in _list(raw))
      if ((_str(p['name']) ?? '').isNotEmpty)
        CarPassenger(_str(p['name'])!, _str(p['phone'])),
  ];
}

class CarVehicle {
  const CarVehicle({
    required this.id,
    required this.registrationNumber,
    required this.name,
    required this.type,
    required this.seats,
    this.colour,
    this.branchCode,
    this.status = 'AVAILABLE',
    this.available = true,
    this.reason,
    this.matchesPreference = false,
  });

  final String id;
  final String registrationNumber;
  final String name;
  final String type;
  final int seats;
  final String? colour;
  final String? branchCode;
  final String status;

  /// For the assign sheet: whether it can take the trip being assigned.
  final bool available;
  final String? reason;
  final bool matchesPreference;

  static CarVehicle? fromJson(dynamic raw) {
    final j = _map(raw);
    final id = _str(j['id']);
    if (id == null) return null;
    final a = _map(j['availability']);
    return CarVehicle(
      id: id,
      registrationNumber: _str(j['registrationNumber']) ?? '',
      name:
          _str(j['name']) ??
          '${_str(j['make']) ?? ''} ${_str(j['model']) ?? ''}'.trim(),
      type: _str(j['type']) ?? 'SEDAN',
      seats: _int(j['seats'], 1),
      colour: _str(j['colour']),
      branchCode: _str(_map(j['branch'])['code']),
      status: _str(j['status']) ?? 'AVAILABLE',
      available: a.isEmpty ? true : a['available'] == true,
      reason: _str(a['reason']),
      matchesPreference: a['matchesPreference'] == true,
    );
  }
}

class CarDriver {
  const CarDriver({
    required this.id,
    required this.fullName,
    required this.phone,
    this.hasAccount = false,
    this.branchCode,
    this.status = 'AVAILABLE',
    this.available = true,
    this.reason,
    this.licenseNumber,
  });

  final String id;
  final String fullName;
  final String phone;
  final bool hasAccount;
  final String? branchCode;
  final String status;
  final bool available;
  final String? reason;
  final String? licenseNumber;

  static CarDriver? fromJson(dynamic raw) {
    final j = _map(raw);
    final id = _str(j['id']);
    if (id == null) return null;
    final a = _map(j['availability']);
    return CarDriver(
      id: id,
      fullName: _str(j['fullName']) ?? '',
      phone: _str(j['phone']) ?? '',
      hasAccount: j['hasAccount'] == true,
      branchCode: _str(_map(j['branch'])['code']),
      status: _str(j['status']) ?? 'AVAILABLE',
      available: a.isEmpty ? true : a['available'] == true,
      reason: _str(a['reason']),
      licenseNumber: _str(j['licenseNumber']),
    );
  }
}

class CarPipelineStep {
  const CarPipelineStep(this.status, this.state, this.at);
  final String status;

  /// DONE, CURRENT, UPCOMING or HALTED (where a rejection or cancellation stopped it).
  final String state;
  final DateTime? at;
}

class CarUpdate {
  const CarUpdate({
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
  final String type;
  final String actor;
  final DateTime at;
  final String? fromStatus;
  final String? toStatus;
  final String? note;
  final Map<String, dynamic> metadata;

  String? get direction => _str(metadata['direction']);
  String? get vehicle => _str(metadata['vehicle']);
  String? get driver => _str(metadata['driver']);
}

/// One requisition as `GET /pool-car/requisitions/:id` returns it.
class CarRequisition {
  CarRequisition(this.raw);
  final Map<String, dynamic> raw;

  String get id => _str(raw['id'])!;
  String get referenceNumber => _str(raw['referenceNumber']) ?? '';
  String get status => _str(raw['status']) ?? 'PENDING_HOD';
  String? get statusNote => _str(raw['statusNote']);
  String get tripType => _str(raw['tripType']) ?? 'ONE_WAY';
  String get purpose => _str(raw['purpose']) ?? '';
  String get pickupLocation => _str(raw['pickupLocation']) ?? '';
  String get dropLocation => _str(raw['dropLocation']) ?? '';
  DateTime get pickupAt => _date(raw['pickupAt']) ?? DateTime.now();
  DateTime? get returnAt => _date(raw['returnAt']);
  DateTime get createdAt => _date(raw['createdAt']) ?? DateTime.now();
  DateTime? get hodApprovedAt => _date(raw['hodApprovedAt']);
  int get passengerCount => _int(raw['passengerCount'], 1);
  bool get urgent => raw['urgent'] == true;
  String get vehiclePreference => _str(raw['vehiclePreference']) ?? 'ANY';
  String get branchName => _str(_map(raw['branch'])['name']) ?? '';
  String get branchId => _str(_map(raw['branch'])['id']) ?? '';
  List<CarPassenger> get passengers => CarPassenger.listFrom(raw['passengers']);

  String get requesterName => _str(_map(raw['requester'])['name']) ?? '';
  String? get requesterDesignation =>
      _str(_map(raw['requester'])['designation']);
  String? get requesterDepartment => _str(_map(raw['requester'])['department']);
  String? get requesterPhone => _str(_map(raw['requester'])['phone']);
  String get approverName => _str(_map(raw['approver'])['name']) ?? '';

  CarVehicle? get vehicle => CarVehicle.fromJson(raw['vehicle']);
  CarDriver? get driver => CarDriver.fromJson(raw['driver']);

  int? get startKm => _intOrNull(_map(raw['odometer'])['startKm']);
  int? get endKm => _intOrNull(_map(raw['odometer'])['endKm']);
  int? get distanceKm => _intOrNull(_map(raw['odometer'])['distanceKm']);
  int? get vehicleKm => _intOrNull(_map(raw['odometer'])['vehicleKm']);

  /// Present only for the requester, the driver and the fleet manager, while the pass is live.
  String? get gatePassPayload => _str(_map(raw['gatePass'])['payload']);
  DateTime? get passValidFrom => _date(_map(raw['gatePass'])['validFrom']);
  DateTime? get passValidUntil => _date(_map(raw['gatePass'])['validUntil']);

  List<CarPipelineStep> get pipeline => [
    for (final s in _list(_map(raw['pipeline'])['steps']))
      CarPipelineStep(
        _str(s['status']) ?? '',
        _str(s['state']) ?? 'UPCOMING',
        _date(s['at']),
      ),
  ];
  String? get outcomeStatus =>
      _str(_map(_map(raw['pipeline'])['outcome'])['status']);
  String? get outcomeNote =>
      _str(_map(_map(raw['pipeline'])['outcome'])['note']);

  List<CarUpdate> get updates => [
    for (final u in _list(raw['updates']))
      CarUpdate(
        id: _str(u['id']) ?? '',
        type: _str(u['type']) ?? '',
        actor: _str(u['actor']) ?? '',
        at: _date(u['createdAt']) ?? DateTime.now(),
        fromStatus: _str(u['fromStatus']),
        toStatus: _str(u['toStatus']),
        note: _str(u['note']),
        metadata: _map(u['metadata']),
      ),
  ];

  Set<String> get actions => {
    for (final a in (_map(raw['viewer'])['actions'] as List? ?? const []))
      a.toString(),
  };
  bool get isRequester => _map(raw['viewer'])['isRequester'] == true;
  bool get isDriver => _map(raw['viewer'])['isDriver'] == true;
}

/// A list row: my requests, a driver's trips, or the HOD inbox.
class CarRow {
  CarRow(this.raw);
  final Map<String, dynamic> raw;

  String get id => _str(raw['id'])!;
  String get referenceNumber => _str(raw['referenceNumber']) ?? '';
  String get status => _str(raw['status']) ?? 'PENDING_HOD';
  String get tripType => _str(raw['tripType']) ?? 'ONE_WAY';

  /// `purpose` in lists, `title` in the approvals inbox.
  String get purpose => _str(raw['purpose']) ?? _str(raw['title']) ?? '';
  String get dropLocation => _str(raw['dropLocation']) ?? '';
  String get pickupLocation => _str(raw['pickupLocation']) ?? '';
  DateTime get pickupAt => _date(raw['pickupAt']) ?? DateTime.now();
  DateTime? get statusChangedAt => _date(raw['statusChangedAt']);
  DateTime get createdAt => _date(raw['createdAt']) ?? DateTime.now();
  int get passengerCount => _int(raw['passengerCount'], 1);
  bool get urgent => raw['urgent'] == true;
  String get requesterName => _str(_map(raw['requester'])['name']) ?? '';
  String? get requesterDesignation =>
      _str(_map(raw['requester'])['designation']);
  String? get vehicleName => _str(_map(raw['vehicle'])['name']);
  String? get registrationNumber =>
      _str(_map(raw['vehicle'])['registrationNumber']);
  String? get driverName => _str(_map(raw['driver'])['fullName']);
  String? get driverPhone => _str(_map(raw['driver'])['phone']);
}

class CarPage {
  const CarPage(this.items, this.nextCursor);
  final List<CarRow> items;
  final String? nextCursor;

  factory CarPage.fromJson(dynamic raw) {
    final j = _map(raw);
    return CarPage([
      for (final r in _list(j['items'])) CarRow(r),
    ], _str(j['nextCursor']));
  }
}

/// `GET /pool-car/passes/:token` — what security sees after scanning.
class GatePassView {
  GatePassView(this.raw);
  final Map<String, dynamic> raw;

  /// VALID, OUT, USED, CANCELLED, EXPIRED or NOT_YET_VALID.
  String get state => _str(raw['state']) ?? 'CANCELLED';
  bool get valid => raw['valid'] == true;
  String get message => _str(raw['message']) ?? '';
  Set<String> get allowed => {
    for (final a in (raw['allowed'] as List? ?? const [])) a.toString(),
  };
  String? get scanNote => _str(raw['scanNote']);
  DateTime? get validFrom => _date(raw['validFrom']);
  DateTime? get validUntil => _date(raw['validUntil']);
  _Json get _r => _map(raw['requisition']);
  String get requisitionId => _str(_r['id']) ?? '';
  String get referenceNumber => _str(_r['referenceNumber']) ?? '';
  String get status => _str(_r['status']) ?? '';
  String get tripType => _str(_r['tripType']) ?? 'ONE_WAY';
  String get purpose => _str(_r['purpose']) ?? '';
  String get pickupLocation => _str(_r['pickupLocation']) ?? '';
  String get dropLocation => _str(_r['dropLocation']) ?? '';
  DateTime? get pickupAt => _date(_r['pickupAt']);
  DateTime? get returnAt => _date(_r['returnAt']);
  bool get urgent => _r['urgent'] == true;
  int get passengerCount => _int(_r['passengerCount'], 1);
  String get branchName => _str(_map(_r['branch'])['name']) ?? '';
  String get requesterName => _str(_map(_r['requester'])['name']) ?? '';
  String? get requesterPhone => _str(_map(_r['requester'])['phone']);
  CarVehicle? get vehicle => CarVehicle.fromJson(raw['vehicle']);
  CarDriver? get driver => CarDriver.fromJson(raw['driver']);
  List<CarPassenger> get passengers => CarPassenger.listFrom(raw['passengers']);
  List<({String direction, DateTime at, String by})> get scans => [
    for (final s in _list(raw['scans']))
      (
        direction: _str(s['direction']) ?? 'EXIT',
        at: _date(s['at']) ?? DateTime.now(),
        by: _str(s['by']) ?? '',
      ),
  ];
}

/// A directory person for the approver picker.
class CarApproverOption {
  const CarApproverOption({
    required this.employeeId,
    required this.name,
    this.designation,
    this.detail,
    this.hasAccount = true,
  });

  final String employeeId;
  final String name;
  final String? designation;
  final String? detail;
  final bool hasAccount;
}

/// Thin wrapper over [ApiClient] for the pool car endpoints.
class FleetApi {
  FleetApi(this.api);
  final ApiClient api;

  Future<CarPage> mine({String state = 'all', String? cursor}) async =>
      CarPage.fromJson(
        await api.get(
          '/pool-car/requisitions/mine',
          query: {'state': state, 'cursor': cursor},
        ),
      );

  Future<CarPage> approvals() async =>
      CarPage.fromJson(await api.get('/pool-car/approvals'));

  Future<CarPage> trips({String state = 'active', String? cursor}) async =>
      CarPage.fromJson(
        await api.get(
          '/pool-car/trips/mine',
          query: {'state': state, 'cursor': cursor},
        ),
      );

  Future<CarRequisition> get(String id) async =>
      CarRequisition(await api.get('/pool-car/requisitions/$id') as _Json);

  Future<CarRequisition> create(
    Map<String, dynamic> body,
    String idempotencyKey,
  ) async => CarRequisition(
    await api.post(
          '/pool-car/requisitions',
          body: body,
          idempotencyKey: idempotencyKey,
        )
        as _Json,
  );

  Future<CarRequisition> act(
    String id,
    String action,
    Map<String, dynamic> body,
    String idempotencyKey,
  ) async => CarRequisition(
    await api.post(
          '/pool-car/requisitions/$id/$action',
          body: body,
          idempotencyKey: idempotencyKey,
        )
        as _Json,
  );

  Future<List<CarVehicle>> vehiclesFor(String requisitionId) async => [
    for (final v
        in (await api.get(
              '/pool-car/vehicles',
              query: {'requisitionId': requisitionId},
            )
            as List))
      ?CarVehicle.fromJson(v),
  ];

  Future<List<CarDriver>> driversFor(String requisitionId) async => [
    for (final d
        in (await api.get(
              '/pool-car/drivers',
              query: {'requisitionId': requisitionId},
            )
            as List))
      ?CarDriver.fromJson(d),
  ];

  Future<GatePassView> pass(String token) async => GatePassView(
    await api.get('/pool-car/passes/${Uri.encodeComponent(token)}') as _Json,
  );

  Future<GatePassView> scan(
    String token,
    String direction,
    int? odometerKm,
    String idempotencyKey,
  ) async => GatePassView(
    await api.post(
          '/pool-car/passes/${Uri.encodeComponent(token)}/scan',
          body: {'direction': direction, 'odometerKm': ?odometerKm},
          idempotencyKey: idempotencyKey,
        )
        as _Json,
  );

  Future<List<CarApproverOption>> searchPeople(String q) async => [
    for (final e in _list(
      await api.get('/directory/employees', query: {'q': q}),
    ))
      if (e['isMe'] != true)
        CarApproverOption(
          employeeId: _str(e['id'])!,
          name: _str(e['fullName']) ?? '',
          designation: _str(e['designation']),
          detail: [
            _str(e['designation']),
            _str(_map(e['department'])['name']),
            _str(_map(e['branch'])['name']),
          ].whereType<String>().join(' · '),
          hasAccount: e['hasAccount'] == true,
        ),
  ];
}
