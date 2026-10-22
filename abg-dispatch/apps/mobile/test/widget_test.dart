import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/models/models.dart';
import 'package:abg_dispatch/screens/incident_detail_screen.dart';
import 'package:abg_dispatch/screens/my_reports_screen.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:abg_dispatch/widgets/common.dart';
import 'package:abg_dispatch/widgets/parcel_card.dart';
import 'package:abg_dispatch/widgets/timeline.dart';
import 'package:abg_dispatch/widgets/vocab.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  theme: buildTheme(),
  locale: locale,
  supportedLocales: L.supportedLocales,
  localizationsDelegates: L.localizationsDelegates,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

void main() {
  test('every server status has a tone and an icon', () {
    const statuses = [
      'DRAFT',
      'BOOKED',
      'AWAITING_PICKUP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED_AT_DESTINATION',
      'PENDING_RECEIPT',
      'RECEIVED',
      'ON_HOLD',
      'DELIVERY_EXCEPTION',
      'DELIVERY_FAILED',
      'RETURN_REQUESTED',
      'RETURN_IN_TRANSIT',
      'RETURNED',
      'CANCELLED',
    ];
    for (final s in statuses) {
      expect(statusIcon(s), isNot(Icons.circle_outlined), reason: s);
    }
    expect(statusTone('RECEIVED'), Tone.success);
    expect(statusTone('PENDING_RECEIPT'), Tone.pending);
    expect(statusTone('DELIVERY_EXCEPTION'), Tone.danger);
  });

  testWidgets('status chip shows text, not just colour', (tester) async {
    await tester.pumpWidget(_wrap(const StatusChip('PENDING_RECEIPT')));
    expect(find.text('Pending Receipt'), findsOneWidget);
    expect(find.byIcon(Icons.pending_actions_rounded), findsOneWidget);
  });

  testWidgets('status labels are translated to Bangla', (tester) async {
    await tester.pumpWidget(
      _wrap(const StatusChip('RECEIVED'), locale: const Locale('bn')),
    );
    expect(find.text('গৃহীত'), findsOneWidget);
  });

  testWidgets('parcel card shows tracking id, title, counterpart and status', (
    tester,
  ) async {
    final row = ParcelRow.fromJson({
      'id': '1',
      'trackingNumber': 'ABG-261020-HO-00428',
      'title': 'Quarterly Supplier Agreement',
      'status': 'IN_TRANSIT',
      'priority': 'URGENT',
      'classification': 'CONFIDENTIAL',
      'category': 'Agreement / Contract',
      'sender': {'name': 'Md. Rahim'},
      'receiver': {'name': 'Farhana Islam'},
      'origin': 'ABG Head Office',
      'destination': 'Factory A',
      'direction': 'OUTGOING',
      'createdAt': DateTime.now().toIso8601String(),
    });
    await tester.pumpWidget(_wrap(ParcelCard(parcel: row, onTap: () {})));
    expect(find.text('ABG-261020-HO-00428'), findsOneWidget);
    expect(find.text('Quarterly Supplier Agreement'), findsOneWidget);
    expect(find.textContaining('Farhana Islam'), findsOneWidget);
    expect(find.text('In Transit'), findsOneWidget);
    expect(find.text('Urgent'), findsOneWidget);
  });

  testWidgets('timeline shows recorded events and the remaining steps', (
    tester,
  ) async {
    final now = DateTime.now();
    final events = [
      TimelineEvent(
        id: 'a',
        type: 'PARCEL_CREATED',
        label: 'Parcel Created',
        at: now.subtract(const Duration(minutes: 30)),
        actorName: 'Md. Rahim',
        actorCode: 'ABG-2041',
        toStatus: 'BOOKED',
      ),
      TimelineEvent(
        id: 'b',
        type: 'PICKED_UP',
        label: 'Picked Up',
        at: now,
        actorName: 'Karim Ahmed',
        toStatus: 'PICKED_UP',
        verification: 'Sender approved in app',
      ),
    ];
    await tester.pumpWidget(
      _wrap(CustodyTimeline(events: events, status: 'PICKED_UP')),
    );
    expect(find.text('Parcel Created'), findsOneWidget);
    expect(find.text('Md. Rahim · ABG-2041'), findsOneWidget);
    expect(find.text('Sender approved in app'), findsOneWidget);
    // Not yet happened: shown hollow, in order.
    expect(find.text('Arrived'), findsOneWidget);
    expect(find.text('Pending Receipt'), findsOneWidget);
    expect(find.text('Received'), findsOneWidget);
  });

  test('parcel detail parses viewer actions and receipt', () {
    final p = ParcelDetail({
      'id': 'x',
      'trackingNumber': 'ABG-261020-HO-00428',
      'status': 'RECEIVED',
      'receipt': {
        'receivedAt': '2026-10-20T05:37:00.000Z',
        'receivedBy': {'name': 'Shahin Ahmed', 'employeeCode': 'ABG-7310'},
        'onBehalf': true,
        'onBehalfReason': 'In a meeting',
        'verification': 'QR_CONFIRMATION',
      },
      'viewer': {
        'actions': ['COMMENT'],
        'isSender': true,
      },
    });
    expect(p.receipt!.name, 'Shahin Ahmed');
    expect(p.receipt!.onBehalf, isTrue);
    expect(p.can('COMMENT'), isTrue);
    expect(p.can('RECEIVE'), isFalse);
    expect(p.isSender, isTrue);
  });

  testWidgets(
    'incident stage is shown as words and an icon, in both languages',
    (tester) async {
      await tester.pumpWidget(
        _wrap(const IncidentStatusChip('UNDER_INVESTIGATION')),
      );
      expect(find.text('Under Investigation'), findsOneWidget);
      expect(find.byIcon(Icons.manage_search_rounded), findsOneWidget);
      await tester.pumpWidget(
        _wrap(const IncidentStatusChip('CLOSED'), locale: const Locale('bn')),
      );
      expect(find.text('বন্ধ'), findsOneWidget);
      // Alerts sent before the four-stage model still read correctly.
      expect(incidentStatusIcon('PROCESSING'), Icons.manage_search_rounded);
      expect(incidentStatusTone('DONE'), Tone.success);
    },
  );

  testWidgets('severity tags carry an icon and the label, never colour alone', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const IncidentSeverityTag('CRITICAL')));
    expect(find.text('Critical'), findsOneWidget);
    expect(find.byIcon(Icons.report_rounded), findsOneWidget);
    expect(incidentSeverityTone('CRITICAL'), Tone.danger);
    expect(incidentSeverityTone('HIGH'), Tone.pending);
    expect(incidentSeverityTone('MEDIUM'), Tone.active);
    expect(incidentSeverityTone('LOW'), Tone.neutral);
    await tester.pumpWidget(
      _wrap(const IncidentSeverityTag('HIGH'), locale: const Locale('bn')),
    );
    expect(find.text('উচ্চ'), findsOneWidget);
  });

  test('every sub-category belongs to one of the four groups', () {
    expect(incidentGroups, hasLength(4));
    expect(incidentCategories.toSet(), hasLength(incidentCategories.length));
    expect(incidentCategories, hasLength(27));
    expect(incidentGroupOf('GAS_LEAK'), 'SAFETY_INDUSTRIAL');
    expect(incidentGroupOf('WATER_SUPPLY'), 'ADMIN_FACILITY');
    expect(incidentGroupOf('CCTV_FAULT'), 'SECURITY');
    expect(incidentGroupOf('NETWORK_DOWN'), 'IT_TECHNICAL');
    expect(incidentForcesConfidential('MISCONDUCT'), isTrue);
    expect(incidentForcesConfidential('THEFT_LOSS'), isFalse);
    for (final c in incidentCategories) {
      expect(
        incidentCategoryIcon(c),
        isNot(Icons.more_horiz_rounded),
        reason: c,
      );
    }
  });

  testWidgets('every group and sub-category has an English and a Bangla name', (
    tester,
  ) async {
    late L en;
    late L bn;
    await tester.pumpWidget(
      _wrap(
        Builder(
          builder: (context) {
            en = L.of(context);
            return const SizedBox();
          },
        ),
      ),
    );
    await tester.pumpWidget(
      _wrap(
        Builder(
          builder: (context) {
            bn = L.of(context);
            return const SizedBox();
          },
        ),
        locale: const Locale('bn'),
      ),
    );
    for (final g in incidentGroups) {
      expect(incidentGroupLabel(en, g), isNot(incidentGroupLabel(bn, g)));
    }
    for (final c in incidentCategories) {
      expect(incidentCategoryLabel(en, c), isNotEmpty);
      expect(incidentCategoryHint(bn, c), isNot(incidentCategoryHint(en, c)));
    }
    expect(incidentGroupLabel(en, 'SAFETY_INDUSTRIAL'), 'Safety & Industrial');
    expect(incidentResolutionLabel(en, 'REFERRED'), 'Referred');
  });

  test(
    'an incident report parses its stages, resolution, photos and history',
    () {
      final incident = Incident({
        'id': 'i1',
        'referenceNumber': 'INC-261020-FCA-007',
        'title': 'Dirty floor outside the QA lab',
        'group': 'ADMIN_FACILITY',
        'category': 'CLEANLINESS',
        'severity': 'HIGH',
        'status': 'CLOSED',
        'resolution': 'DUPLICATE',
        'confidential': true,
        'statusNote': 'Already reported this morning.',
        'createdAt': '2026-10-20T04:00:00Z',
        'acknowledgedAt': '2026-10-20T04:20:00Z',
        'closedAt': '2026-10-20T05:00:00Z',
        'branch': {'id': 'b1', 'name': 'Factory A', 'code': 'FCA'},
        'anonymous': false,
        'reporter': {'name': 'Farhana Islam'},
        'photos': [
          {
            'id': 'p1',
            'kind': 'REPORT',
            'url': '/api/incident-photos/p1/content?exp=1&sig=x',
          },
          {
            'id': 'p2',
            'kind': 'RESOLUTION',
            'url': '/api/incident-photos/p2/content?exp=1&sig=y',
          },
        ],
        'updates': [
          {
            'id': 'u1',
            'type': 'SUBMITTED',
            'toStatus': 'REPORTED',
            'actor': 'You',
            'createdAt': '2026-10-20T04:00:00Z',
            'metadata': {},
          },
          {
            'id': 'u2',
            'type': 'STATUS_CHANGED',
            'fromStatus': 'REPORTED',
            'toStatus': 'CLOSED',
            'note': 'Already reported this morning.',
            'actor': 'Sabina Yasmin',
            'createdAt': '2026-10-20T05:00:00Z',
            'metadata': {'reopened': false, 'resolution': 'DUPLICATE'},
          },
        ],
        'stages': [
          {
            'status': 'REPORTED',
            'state': 'done',
            'at': '2026-10-20T04:00:00Z',
            'by': 'You',
          },
          {
            'status': 'ACKNOWLEDGED',
            'state': 'done',
            'at': '2026-10-20T04:20:00Z',
            'by': 'Sabina Yasmin',
          },
          {'status': 'UNDER_INVESTIGATION', 'state': 'skipped', 'at': null},
          {
            'status': 'CLOSED',
            'state': 'done',
            'at': '2026-10-20T05:00:00Z',
            'by': 'Sabina Yasmin',
            'resolution': 'DUPLICATE',
          },
        ],
        'viewer': {'isReporter': true, 'actions': <String>[]},
      });
      expect(incident.isOpen, isFalse);
      expect(incident.group, 'ADMIN_FACILITY');
      expect(incident.confidential, isTrue);
      expect(incident.resolution, 'DUPLICATE');
      expect(incident.photos.where((p) => p.isFix).length, 1);
      expect(incident.stages.map((s) => s.state).toList(), [
        'done',
        'done',
        'skipped',
        'done',
      ]);
      expect(incident.stages[1].by, 'Sabina Yasmin');
      expect(incident.stages.last.resolution, 'DUPLICATE');
      expect(incident.updates.last.resolution, 'DUPLICATE');
      expect(incident.updates.last.reopened, isFalse);
      expect(incident.branchName, 'Factory A');
      expect(incidentStatusTone(incident.status), Tone.success);

      // Without a server-computed tracker, the stages come from the timestamps.
      final bare = Incident({
        'id': 'i2',
        'status': 'UNDER_INVESTIGATION',
        'createdAt': '2026-10-20T04:00:00Z',
        'investigationStartedAt': '2026-10-20T04:30:00Z',
      });
      expect(bare.stages.map((s) => s.state).toList(), [
        'done',
        'skipped',
        'current',
        'upcoming',
      ]);
      expect(bare.group, 'ADMIN_FACILITY');
    },
  );

  testWidgets('the stage tracker shows each stage with who moved it', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        IncidentStageTracker(
          stages: [
            IncidentStage(
              status: 'REPORTED',
              state: 'done',
              at: DateTime(2026, 10, 20, 10),
              by: 'You',
            ),
            IncidentStage(
              status: 'ACKNOWLEDGED',
              state: 'done',
              at: DateTime(2026, 10, 20, 10, 20),
              by: 'Sabina Yasmin',
            ),
            IncidentStage(status: 'UNDER_INVESTIGATION', state: 'skipped'),
            IncidentStage(
              status: 'CLOSED',
              state: 'done',
              at: DateTime(2026, 10, 20, 11),
              by: 'Sabina Yasmin',
              resolution: 'RESOLVED',
            ),
          ],
        ),
      ),
    );
    expect(find.text('Reported'), findsOneWidget);
    expect(find.text('Acknowledged'), findsOneWidget);
    expect(find.text('Under Investigation'), findsOneWidget);
    expect(find.text('Closed'), findsOneWidget);
    expect(find.text('Skipped'), findsOneWidget);
    expect(find.text('Resolved'), findsOneWidget);
    expect(find.textContaining('Sabina Yasmin'), findsNWidgets(2));
  });

  test('history entries read as stages and resolutions', () {
    final l = lookupL(const Locale('en'));
    IncidentUpdate u(String to, {String? from, String? resolution}) =>
        IncidentUpdate(
          id: 'x',
          type: 'STATUS_CHANGED',
          actor: 'Sabina Yasmin',
          at: DateTime(2026),
          fromStatus: from,
          toStatus: to,
          resolution: resolution,
        );
    expect(
      incidentHistoryLabel(l, u('ACKNOWLEDGED', from: 'REPORTED')),
      'Acknowledged',
    );
    expect(
      incidentHistoryLabel(l, u('UNDER_INVESTIGATION', from: 'ACKNOWLEDGED')),
      'Investigation started',
    );
    expect(
      incidentHistoryLabel(
        l,
        u('CLOSED', from: 'UNDER_INVESTIGATION', resolution: 'REFERRED'),
      ),
      'Closed — Referred',
    );
    expect(
      incidentHistoryLabel(l, u('UNDER_INVESTIGATION', from: 'CLOSED')),
      'Reopened',
    );
  });
}
