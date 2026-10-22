import 'dart:convert';

import 'package:abg_dispatch/core/api_client.dart';
import 'package:abg_dispatch/core/session.dart';
import 'package:abg_dispatch/data/repository.dart';
import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/models/models.dart';
import 'package:abg_dispatch/modules/tours/tours.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:abg_dispatch/widgets/vocab.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

Widget _wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  theme: buildTheme(),
  locale: locale,
  supportedLocales: L.supportedLocales,
  localizationsDelegates: L.localizationsDelegates,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

/// A screen with the app's providers, talking to a fake API.
Widget _app(
  Widget screen, {
  Map<String, Object> responses = const {},
  Profile? profile,
}) {
  final api = ApiClient(
    client: MockClient((req) async {
      final body = responses[req.url.path.replaceFirst(RegExp(r'^.*/api'), '')];
      return http.Response.bytes(
        utf8.encode(
          jsonEncode(
            body ??
                {
                  'statusCode': 404,
                  'code': 'NOT_FOUND',
                  'message': 'Not found',
                },
          ),
        ),
        body == null ? 404 : 200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }),
  );
  final session = SessionController(api)..profile = profile;
  return MultiProvider(
    providers: [
      Provider.value(value: api),
      Provider.value(value: DispatchRepository(api)),
      ChangeNotifierProvider.value(value: session),
    ],
    child: MaterialApp(
      theme: buildTheme(),
      supportedLocales: L.supportedLocales,
      localizationsDelegates: L.localizationsDelegates,
      home: screen,
    ),
  );
}

String _day(int offset) => isoDay(dhakaToday().add(Duration(days: offset)));

Map<String, Object?> _detail({
  String status = 'PENDING_HOD',
  List<String> actions = const ['APPROVE', 'REJECT', 'ADD_NOTE'],
  bool passportAlert = true,
}) => {
  'id': 't1',
  'referenceNumber': 'ABG-TR-2026-086',
  'type': 'FOREIGN',
  'purpose': 'VENDOR_AUDIT',
  'title': 'Compressor vendor audit',
  'description': 'Supplier audit ahead of the terminal tender.',
  'destination': 'Frankfurt',
  'country': 'Germany',
  'startDate': _day(24),
  'endDate': _day(29),
  'durationDays': 6,
  'transportMode': 'AIR',
  'coTravellers': ['Engr. Monir Hossain'],
  'estimatedBudget': 485000,
  'advanceRequested': 150000,
  'sanctionedBudget': null,
  'passportNumber': '••••••263',
  'passportExpiry': _day(130),
  'passportAlert': passportAlert,
  'status': status,
  'awaiting': status == 'PENDING_HOD' ? 'HOD' : null,
  'statusNote': null,
  'createdAt': DateTime.now().toUtc().toIso8601String(),
  'branch': {'id': 'b1', 'name': 'ABG Head Office', 'code': 'HO'},
  'traveller': {
    'name': 'Mehedi Hasan',
    'designation': 'Procurement Officer',
    'department': 'Procurement',
  },
  'approver': {'name': 'Nusrat Jahan', 'designation': 'Finance Manager'},
  'pipeline': [
    {
      'key': 'SUBMITTED',
      'state': 'done',
      'by': 'Mehedi Hasan',
      'at': DateTime.now().toUtc().toIso8601String(),
    },
    {'key': 'PENDING_HOD', 'state': 'current', 'waitingFor': 'Nusrat Jahan'},
    {'key': 'PENDING_VETTING', 'state': 'upcoming'},
    {'key': 'PENDING_SANCTION', 'state': 'upcoming'},
    {'key': 'APPROVED', 'state': 'upcoming'},
    {'key': 'ACTIVE', 'state': 'upcoming'},
    {'key': 'COMPLETED', 'state': 'upcoming'},
  ],
  'updates': [
    {
      'id': 'u1',
      'type': 'SUBMITTED',
      'toStatus': 'PENDING_HOD',
      'actor': 'Mehedi Hasan',
      'metadata': {},
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    },
  ],
  'viewer': {
    'isTraveller': false,
    'isApprover': true,
    'canDecide': true,
    'blockedReason': null,
    'startableFrom': null,
    'actions': actions,
  },
};

void main() {
  group('models', () {
    test('a tour detail parses its pipeline, actions and passport flag', () {
      final t = TourDetail.fromJson(_detail());
      expect(t.isForeign, isTrue);
      expect(t.place, 'Frankfurt, Germany');
      expect(t.pipeline.map((s) => s.key), contains('PENDING_SANCTION'));
      expect(t.pipeline[1].waitingFor, 'Nusrat Jahan');
      expect(t.can('APPROVE'), isTrue);
      expect(t.can('START'), isFalse);
      expect(t.passportAlert, isTrue);
      expect(t.startDate.isUtc, isTrue);
      expect(isoDay(t.startDate), _day(24));
    });

    test('an approvals row keeps the agreed shape', () {
      final a = TourApproval.fromJson({
        'id': 'a1',
        'referenceNumber': 'ABG-TR-2026-087',
        'title': 'Stock reconciliation',
        'type': 'LOCAL',
        'destination': 'Mongla terminal depot',
        'startDate': '2026-10-30',
        'endDate': '2026-11-02',
        'estimatedBudget': 36500,
        'status': 'PENDING_VETTING',
        'awaiting': 'VETTING',
        'traveller': {
          'name': 'Selim Reza',
          'designation': 'Warehouse Supervisor',
          'department': 'Stores',
        },
        'createdAt': '2026-10-19T08:00:00.000Z',
      });
      expect(a.awaiting, 'VETTING');
      expect(a.traveller.subtitle, 'Warehouse Supervisor · Stores');
      expect(tourDays(a.startDate, a.endDate), 4);
    });

    test('a passport must stay valid six months after the return date', () {
      final end = DateTime.utc(2026, 11, 20);
      expect(passportNeedsRenewal(DateTime.utc(2027, 3, 1), end), isTrue);
      expect(passportNeedsRenewal(DateTime.utc(2027, 5, 21), end), isFalse);
      expect(passportNeedsRenewal(null, end), isFalse);
    });

    test('Taka uses lakh grouping, with Bangla digits in Bangla', () {
      expect(formatTaka(485000, 'en'), '৳ 4,85,000');
      expect(formatTaka(6500000, 'en'), '৳ 65,00,000');
      expect(formatTaka(null, 'en'), '—');
      expect(formatTaka(485000, 'bn'), '৳ ৪,৮৫,০০০');
    });

    test('every tour status has a tone, an icon and a label', () {
      for (final s in tourStatuses) {
        expect(tourStatusIcon(s), isNot(Icons.circle_outlined), reason: s);
      }
      expect(tourStatusTone('APPROVED'), Tone.success);
      expect(tourStatusTone('PENDING_SANCTION'), Tone.pending);
      expect(tourStatusTone('REJECTED'), Tone.danger);
    });
  });

  group('widgets', () {
    testWidgets('status chip shows text and icon, in English and Bangla', (
      tester,
    ) async {
      await tester.pumpWidget(_wrap(const TourStatusChip('PENDING_SANCTION')));
      expect(find.text('MD / Chairman sanction'), findsOneWidget);
      expect(find.byIcon(Icons.approval_outlined), findsOneWidget);
      await tester.pumpWidget(
        _wrap(const TourStatusChip('APPROVED'), locale: const Locale('bn')),
      );
      await tester.pumpAndSettle();
      expect(find.text('অনুমোদিত ও অর্থ মঞ্জুর'), findsOneWidget);
    });

    testWidgets(
      'tour card shows reference, title, destination, status and passport flag',
      (tester) async {
        final row = TourRow.fromJson({
          'id': 't1',
          'referenceNumber': 'ABG-TR-2026-086',
          'title': 'Compressor vendor audit',
          'type': 'FOREIGN',
          'purpose': 'VENDOR_AUDIT',
          'destination': 'Frankfurt',
          'country': 'Germany',
          'startDate': _day(24),
          'endDate': _day(29),
          'estimatedBudget': 485000,
          'sanctionedBudget': 460000,
          'status': 'PENDING_SANCTION',
          'passportAlert': true,
          'statusNote': 'Vetted at economy fares.',
          'createdAt': DateTime.now().toUtc().toIso8601String(),
        });
        await tester.pumpWidget(_wrap(TourCard(tour: row, onTap: () {})));
        expect(find.text('ABG-TR-2026-086'), findsOneWidget);
        expect(find.text('Compressor vendor audit'), findsOneWidget);
        expect(find.text('Frankfurt, Germany'), findsOneWidget);
        expect(find.text('MD / Chairman sanction'), findsOneWidget);
        expect(find.text('FOREIGN'), findsOneWidget);
        expect(find.text('Passport'), findsOneWidget);
        expect(find.text('৳ 4,60,000'), findsOneWidget);
        expect(find.text('“Vetted at economy fares.”'), findsOneWidget);
      },
    );

    testWidgets('pipeline names who the request is waiting for', (
      tester,
    ) async {
      final t = TourDetail.fromJson(_detail());
      await tester.pumpWidget(_wrap(TourPipeline(stages: t.pipeline)));
      expect(find.text('HOD approval'), findsOneWidget);
      expect(find.text('Waiting for Nusrat Jahan'), findsOneWidget);
      expect(find.text('MD / Chairman sanction'), findsOneWidget);
      expect(find.text('On tour'), findsOneWidget);
    });

    testWidgets(
      'the form starts with the line manager as approver and asks for a passport on foreign tours',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 5000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        final profile = Profile.fromJson({
          'id': 'u1',
          'displayName': 'Md. Rahim',
          'roles': ['EMPLOYEE'],
          'capabilities': ['tour.request'],
          'employee': {
            'id': 'e1',
            'fullName': 'Md. Rahim',
            'manager': {
              'employeeId': 'e2',
              'userId': 'u2',
              'fullName': 'Farid Uddin',
              'designation': 'Executive Director',
            },
          },
        });
        await tester.pumpWidget(_app(const TourFormScreen(), profile: profile));
        await tester.pumpAndSettle();
        expect(find.text('Farid Uddin'), findsOneWidget);
        expect(find.byKey(const ValueKey('tour-passport')), findsNothing);
        expect(find.text('Pool car'), findsOneWidget);

        await tester.tap(find.text('Foreign'));
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('tour-country')), findsOneWidget);
        expect(find.byKey(const ValueKey('tour-passport')), findsOneWidget);
        // A pool car cannot go abroad.
        expect(find.text('Pool car'), findsNothing);

        // Submitting an empty form explains what is missing instead of calling the API.
        await tester.tap(find.text('Submit request'));
        await tester.pump();
        expect(find.text('Give the tour a short title.'), findsOneWidget);
      },
    );

    testWidgets(
      'an approver sees Approve and Reject, and rejecting asks for a reason',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 3000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(
          _app(
            const TourDetailScreen(id: 't1'),
            responses: {'/tours/t1': _detail()},
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('ABG-TR-2026-086'), findsOneWidget);
        expect(find.text('Passport needs renewal'), findsOneWidget);
        expect(find.widgetWithText(FilledButton, 'Approve'), findsOneWidget);
        expect(find.widgetWithText(OutlinedButton, 'Reject'), findsOneWidget);
        expect(find.byTooltip('Add note'), findsOneWidget);

        await tester.tap(find.widgetWithText(OutlinedButton, 'Reject'));
        await tester.pumpAndSettle();
        expect(
          find.text('A reason is required — the traveller sees it.'),
          findsOneWidget,
        );
        await tester.tap(find.widgetWithText(FilledButton, 'Reject'));
        await tester.pump();
        expect(find.text('Write a short reason.'), findsOneWidget);
      },
    );

    testWidgets('the traveller of a finished tour gets no action buttons', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1200, 3000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        _app(
          const TourDetailScreen(id: 't1'),
          responses: {
            '/tours/t1': _detail(
              status: 'COMPLETED',
              actions: const [],
              passportAlert: false,
            ),
          },
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Completed'), findsWidgets);
      expect(find.byType(FilledButton), findsNothing);
      expect(find.byTooltip('Add note'), findsNothing);
    });
  });
}
