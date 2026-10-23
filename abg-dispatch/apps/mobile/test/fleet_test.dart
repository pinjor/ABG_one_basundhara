import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/modules/fleet/fleet.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:abg_dispatch/widgets/vocab.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  theme: buildTheme(),
  locale: locale,
  supportedLocales: L.supportedLocales,
  localizationsDelegates: L.localizationsDelegates,
  home: Scaffold(
    body: SingleChildScrollView(
      child: Padding(padding: const EdgeInsets.all(16), child: child),
    ),
  ),
);

const _statuses = [
  'PENDING_HOD',
  'PENDING_FLEET',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

Map<String, dynamic> _requisitionJson({
  String status = 'ASSIGNED',
  List<String> actions = const ['CANCEL'],
}) => {
  'id': 'a1b2',
  'referenceNumber': 'PC-261021-HO-004',
  'status': status,
  'statusNote': 'Wait at the arrival hall Gate 2.',
  'tripType': 'AIRPORT',
  'purpose': 'Receive the external audit team',
  'pickupLocation': 'ABG Head Office, Bashundhara R/A',
  'dropLocation': 'Hazrat Shahjalal International Airport, Terminal 2',
  'pickupAt': '2026-10-21T09:30:00.000Z',
  'returnAt': null,
  'passengers': [
    {'name': 'Md. Rahim', 'phone': '01712204100'},
    {'name': 'Daniel Tan', 'phone': null},
  ],
  'passengerCount': 3,
  'urgent': true,
  'vehiclePreference': 'MICROBUS',
  'branch': {'id': 'b1', 'name': 'ABG Head Office', 'code': 'HO'},
  'requester': {
    'name': 'Md. Rahim',
    'department': 'Legal',
    'phone': '01712204100',
  },
  'approver': {'name': 'Farid Uddin'},
  'vehicle': {
    'id': 'v1',
    'registrationNumber': 'Dhaka Metro-CHA 15-2234',
    'name': 'Toyota Noah',
    'type': 'MICROBUS',
    'seats': 7,
    'colour': 'Silver',
  },
  'driver': {
    'id': 'd1',
    'fullName': 'Abul Kalam',
    'phone': '01739362000',
    'hasAccount': true,
  },
  'odometer': {
    'startKm': null,
    'endKm': null,
    'distanceKm': null,
    'vehicleKm': 35580,
  },
  'createdAt': '2026-10-20T03:00:00.000Z',
  'pipeline': {
    'steps': [
      {
        'status': 'PENDING_HOD',
        'state': 'DONE',
        'at': '2026-10-20T03:00:00.000Z',
      },
      {
        'status': 'PENDING_FLEET',
        'state': 'DONE',
        'at': '2026-10-20T05:00:00.000Z',
      },
      {
        'status': 'ASSIGNED',
        'state': 'CURRENT',
        'at': '2026-10-21T04:00:00.000Z',
      },
      {'status': 'IN_PROGRESS', 'state': 'UPCOMING', 'at': null},
      {'status': 'COMPLETED', 'state': 'UPCOMING', 'at': null},
    ],
    'outcome': null,
  },
  'gatePass': {
    'payload':
        'https://dispatch.abg.com.bd/g/c/AbCdEfGhIjKlMnOpQrStUvWxYz012345',
    'validFrom': '2026-10-20T12:00:00.000Z',
    'validUntil': '2026-10-22T00:00:00.000Z',
  },
  'updates': [
    {
      'id': 'u1',
      'type': 'SUBMITTED',
      'toStatus': 'PENDING_HOD',
      'actor': 'Md. Rahim',
      'metadata': {},
      'createdAt': '2026-10-20T03:00:00.000Z',
    },
    {
      'id': 'u2',
      'type': 'ASSIGNED',
      'fromStatus': 'PENDING_FLEET',
      'toStatus': 'ASSIGNED',
      'actor': 'Jahangir Alam',
      'metadata': {
        'vehicle': 'Toyota Noah · Dhaka Metro-CHA 15-2234',
        'driver': 'Abul Kalam',
      },
      'createdAt': '2026-10-21T04:00:00.000Z',
    },
  ],
  'viewer': {'isRequester': true, 'isDriver': false, 'actions': actions},
};

void main() {
  test('every requisition status has a label, a tone and an icon', () {
    final l = lookupL(const Locale('en'));
    for (final s in _statuses) {
      expect(carStatusLabel(l, s), isNot(s), reason: s);
      expect(carStatusIcon(s), isNot(Icons.circle_outlined), reason: s);
    }
    expect(carStatusTone('PENDING_HOD'), Tone.pending);
    expect(carStatusTone('IN_PROGRESS'), Tone.active);
    expect(carStatusTone('COMPLETED'), Tone.success);
    expect(carStatusTone('REJECTED'), Tone.danger);
    for (final t in carTripTypes) {
      expect(tripTypeLabel(l, t), isNot(t));
    }
  });

  test(
    'round trips and full days need a return time; one way and airport do not',
    () {
      expect(carTripNeedsReturn('ROUND_TRIP'), isTrue);
      expect(carTripNeedsReturn('FULL_DAY'), isTrue);
      expect(carTripNeedsReturn('ONE_WAY'), isFalse);
      expect(carTripNeedsReturn('AIRPORT'), isFalse);
    },
  );

  test(
    'a requisition parses the car, driver, gate pass, pipeline and actions',
    () {
      final r = CarRequisition(_requisitionJson(actions: ['CANCEL', 'START']));
      expect(r.referenceNumber, 'PC-261021-HO-004');
      expect(r.vehicle!.registrationNumber, 'Dhaka Metro-CHA 15-2234');
      expect(r.vehicle!.seats, 7);
      expect(r.driver!.fullName, 'Abul Kalam');
      expect(r.driver!.phone, '01739362000');
      expect(r.gatePassPayload, contains('/g/c/'));
      expect(r.passengers.map((p) => p.name), ['Md. Rahim', 'Daniel Tan']);
      expect(r.passengers.last.phone, isNull);
      expect(r.pipeline.map((s) => s.state), [
        'DONE',
        'DONE',
        'CURRENT',
        'UPCOMING',
        'UPCOMING',
      ]);
      expect(r.actions, {'CANCEL', 'START'});
      expect(r.vehicleKm, 35580);
      expect(r.updates.last.vehicle, contains('Noah'));

      // Missing fields never crash a screen.
      final sparse = CarRequisition({'id': 'x'});
      expect(sparse.vehicle, isNull);
      expect(sparse.gatePassPayload, isNull);
      expect(sparse.actions, isEmpty);
      expect(sparse.pipeline, isEmpty);
    },
  );

  testWidgets(
    'status chip shows the label with an icon, in English and Bangla',
    (tester) async {
      await tester.pumpWidget(_wrap(const CarStatusChip('PENDING_FLEET')));
      expect(find.text('Pending fleet manager'), findsOneWidget);
      expect(find.byIcon(Icons.hourglass_top_rounded), findsOneWidget);

      await tester.pumpWidget(
        _wrap(const CarStatusChip('ASSIGNED'), locale: const Locale('bn')),
      );
      await tester.pumpAndSettle();
      expect(find.text('বরাদ্দকৃত'), findsOneWidget);
    },
  );

  testWidgets('the pipeline stepper names every step and marks a rejection', (
    tester,
  ) async {
    final r = CarRequisition(_requisitionJson());
    await tester.pumpWidget(_wrap(CarPipelineStepper(steps: r.pipeline)));
    for (final label in ['HOD', 'Fleet', 'Assigned', 'On trip', 'Done']) {
      expect(find.text(label), findsOneWidget, reason: label);
    }

    await tester.pumpWidget(
      _wrap(
        const CarPipelineStepper(
          outcomeStatus: 'REJECTED',
          steps: [
            CarPipelineStep('PENDING_HOD', 'DONE', null),
            CarPipelineStep('PENDING_FLEET', 'HALTED', null),
            CarPipelineStep('ASSIGNED', 'UPCOMING', null),
            CarPipelineStep('IN_PROGRESS', 'UPCOMING', null),
            CarPipelineStep('COMPLETED', 'UPCOMING', null),
          ],
        ),
      ),
    );
    expect(find.text('Rejected'), findsOneWidget);
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);
  });

  testWidgets(
    'a request card shows purpose, reference, status, urgency and the car',
    (tester) async {
      final row = CarRow({
        'id': 'r1',
        'referenceNumber': 'PC-261021-HO-003',
        'status': 'PENDING_HOD',
        'tripType': 'ROUND_TRIP',
        'purpose': 'Interview panel at Factory A',
        'dropLocation': 'Factory A, Kanchpur',
        'pickupAt': DateTime.now()
            .add(const Duration(hours: 3))
            .toIso8601String(),
        'passengerCount': 3,
        'urgent': true,
        'requester': {'name': 'Sadia Rahman'},
        'createdAt': DateTime.now().toIso8601String(),
      });
      var tapped = false;
      await tester.pumpWidget(
        _wrap(
          CarRequestCard(
            row: row,
            onTap: () => tapped = true,
            subtitle: 'Sadia Rahman · HR Manager',
          ),
        ),
      );
      expect(find.text('Interview panel at Factory A'), findsOneWidget);
      expect(find.textContaining('PC-261021-HO-003'), findsOneWidget);
      expect(find.text('Pending HOD'), findsOneWidget);
      expect(find.text('Urgent'), findsOneWidget);
      expect(find.text('3 people'), findsOneWidget);
      await tester.tap(find.text('Interview panel at Factory A'));
      expect(tapped, isTrue);
    },
  );

  testWidgets('the driver card shows the plate, the driver and a call button', (
    tester,
  ) async {
    final r = CarRequisition(_requisitionJson());
    await tester.pumpWidget(
      _wrap(DriverVehicleCard(vehicle: r.vehicle!, driver: r.driver!)),
    );
    expect(find.text('Dhaka Metro-CHA 15-2234'), findsOneWidget);
    expect(find.text('Abul Kalam'), findsOneWidget);
    expect(find.text('01739362000'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Call'), findsOneWidget);
  });

  testWidgets(
    'security sees a clear verdict: valid with the plate, or not valid at all',
    (tester) async {
      final pass = GatePassView({
        'state': 'VALID',
        'valid': true,
        'message':
            'Valid. Check the vehicle number and driver, then record the exit.',
        'allowed': ['EXIT'],
        'requisition': {
          'referenceNumber': 'PC-261021-FCA-001',
          'status': 'ASSIGNED',
          'passengerCount': 1,
        },
        'vehicle': {
          'id': 'v',
          'registrationNumber': 'Narayanganj-GA 11-2087',
          'name': 'Toyota Axio',
          'type': 'SEDAN',
          'seats': 4,
        },
        'driver': {
          'id': 'd',
          'fullName': 'Sohel Rana',
          'phone': '01741762000',
          'licenseNumber': 'NG0918264L00007',
        },
        'passengers': [],
        'scans': [],
      });
      expect(pass.allowed, {'EXIT'});
      await tester.pumpWidget(_wrap(PassVerdict(pass: pass)));
      expect(find.text('Valid gate pass'), findsOneWidget);
      expect(find.text('Narayanganj-GA 11-2087'), findsOneWidget);
      expect(find.text('Sohel Rana'), findsOneWidget);

      await tester.pumpWidget(_wrap(const PassVerdict(pass: null)));
      expect(find.text('Not a valid gate pass'), findsOneWidget);
      expect(
        find.textContaining('Do not let the vehicle through'),
        findsOneWidget,
      );

      await tester.pumpWidget(
        _wrap(const PassVerdict(pass: null), locale: const Locale('bn')),
      );
      await tester.pumpAndSettle();
      expect(find.text('বৈধ গেট পাস নয়'), findsOneWidget);
    },
  );
}
