import 'dart:convert';

import 'package:abg_dispatch/core/api_client.dart';
import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/modules/licences/licences.dart';
import 'package:abg_dispatch/theme/theme.dart';
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

Map<String, dynamic> _row({
  String id = 'lic-1',
  String name = 'Factory licence',
  String number = 'DIFE/NARAYAN/FL/2016/4471',
  String category = 'FACTORY',
  int daysLeft = 12,
  String state = 'EXPIRING',
  String stage = 'APPLICATION_SUBMITTED',
  int progress = 40,
  String branch = 'Factory A',
}) => {
  'id': id,
  'name': name,
  'licenceNumber': number,
  'category': category,
  'issuingAuthority':
      'Department of Inspection for Factories and Establishments (DIFE)',
  'branch': {'id': 'b1', 'name': branch, 'code': 'FCA'},
  'owner': {'id': 'u1', 'name': 'Sabina Yasmin'},
  'expiresAt': '2026-11-03',
  'daysLeft': daysLeft,
  'state': state,
  'renewalLeadDays': 90,
  'renewalStage': stage,
  'renewalProgress': progress,
  'hasDocument': true,
  'active': true,
};

const _summary = {
  'total': 16,
  'valid': 8,
  'dueSoon': 3,
  'expiring': 3,
  'expired': 2,
  'renewalsInProgress': 3,
  'retired': 0,
  'nextExpiry': {
    'id': 'lic-9',
    'name': 'Trade licence',
    'branch': {'id': 'b5', 'name': 'Dhaka Branch', 'code': 'DHK'},
    'expiresAt': '2026-10-27',
    'daysLeft': 5,
  },
  'byCategory': {'TRADE': 5},
};

Map<String, dynamic> _detail() => {
  ..._row(
    id: 'lic-2',
    name: 'Fire licence',
    daysLeft: 3,
    stage: 'FEE_PAID',
    progress: 80,
  ),
  'categoryLabel': 'Fire safety',
  'category': 'FIRE_SAFETY',
  'owner': {
    'id': 'u1',
    'name': 'Sabina Yasmin',
    'designation': 'Factory Admin Lead',
    'phone': '01720512000',
  },
  'issuedAt': '2025-10-26',
  'renewalWindowOpensOn': '2026-07-27',
  'renewalFee': 250000,
  'renewalStartedAt': '2026-09-01T04:30:00.000Z',
  'notes': 'Covers the production hall and the LPG cylinder yard.',
  'documentUrl': '/api/licence-documents/lic-2/content?exp=1&sig=x',
  'document': {
    'name': 'fire-licence-scan.png',
    'mimeType': 'image/png',
    'size': 183922,
    'isPdf': false,
  },
  'alerts': {'lastDays': 7, 'nextDays': 0, 'nextOn': '2026-10-25'},
  'history': [
    {
      'id': 'e1',
      'type': 'CREATED',
      'actor': 'Shirin Akhter',
      'note': null,
      'metadata': <String, dynamic>{},
      'createdAt': '2026-03-01T04:30:00.000Z',
    },
    {
      'id': 'e2',
      'type': 'RENEWAL_STAGE_CHANGED',
      'actor': 'Sabina Yasmin',
      'note': 'Paid by pay order.',
      'metadata': {
        'from': 'INSPECTION_SCHEDULED',
        'to': 'FEE_PAID',
        'direction': 'FORWARD',
      },
      'createdAt': '2026-10-10T04:30:00.000Z',
    },
    {
      'id': 'e3',
      'type': 'ESCALATED',
      'actor': 'ABG ONE alerts',
      'note': null,
      'metadata': {
        'thresholdDays': 7,
        'daysLeft': 7,
        'level': 'LEADERSHIP',
        'notified': ['Sabina Yasmin', 'Shirin Akhter', 'Arif Chowdhury'],
      },
      'createdAt': '2026-10-18T18:01:00.000Z',
    },
  ],
  'viewer': {'canManage': false, 'actions': <String>[]},
};

/// An API client answering from canned JSON, recording what was asked.
ApiClient _api(List<Uri> requests) => ApiClient(
  client: MockClient((req) async {
    requests.add(req.url);
    final path = req.url.path;
    Object body;
    if (path.endsWith('/admin/licences/summary')) {
      body = _summary;
    } else if (path.endsWith('/licences')) {
      final state = req.url.queryParameters['state'];
      body = {
        'items': state == 'EXPIRED'
            ? [
                _row(
                  id: 'lic-3',
                  name: 'Boiler certificate',
                  category: 'BOILER',
                  daysLeft: -4,
                  state: 'EXPIRED',
                  stage: 'NOT_STARTED',
                  progress: 0,
                ),
              ]
            : [
                _row(),
                _row(
                  id: 'lic-4',
                  name: 'Trade licence',
                  category: 'TRADE',
                  daysLeft: 252,
                  state: 'VALID',
                  stage: 'NOT_STARTED',
                  progress: 0,
                ),
              ],
        'nextCursor': null,
      };
    } else if (path.contains('/licences/')) {
      body = _detail();
    } else {
      return http.Response('{"code":"NOT_FOUND","message":"Not found"}', 404);
    }
    return http.Response.bytes(
      utf8.encode(jsonEncode(body)),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  }),
);

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('countdown badges say how long is left, with an icon', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const Column(
          children: [
            LicenceCountdownBadge(daysLeft: 12, state: 'EXPIRING'),
            LicenceCountdownBadge(daysLeft: 0, state: 'EXPIRING'),
            LicenceCountdownBadge(daysLeft: -5, state: 'EXPIRED'),
            LicenceCountdownBadge(daysLeft: 1, state: 'EXPIRING'),
            LicenceCountdownBadge(daysLeft: 200, state: 'VALID', active: false),
          ],
        ),
      ),
    );
    expect(find.text('12 days left'), findsOneWidget);
    expect(find.text('Expires today'), findsOneWidget);
    expect(find.text('Expired 5 days ago'), findsOneWidget);
    expect(find.text('1 day left'), findsOneWidget);
    expect(find.text('Retired'), findsOneWidget);
    expect(find.byIcon(Icons.hourglass_bottom_rounded), findsNWidgets(2));
    expect(find.byIcon(Icons.alarm_rounded), findsOneWidget);
    expect(find.byIcon(Icons.event_busy_rounded), findsOneWidget);
    expect(find.byIcon(Icons.archive_outlined), findsOneWidget);
  });

  testWidgets('countdowns and stages are translated to Bangla', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const Column(
          children: [
            LicenceCountdownBadge(daysLeft: 12, state: 'EXPIRING'),
            LicenceCountdownBadge(daysLeft: -3, state: 'EXPIRED'),
            RenewalProgressBar(stage: 'FEE_PAID', progress: 80),
          ],
        ),
        locale: const Locale('bn'),
      ),
    );
    expect(find.text('12 দিন বাকি'), findsOneWidget);
    expect(find.text('3 দিন আগে মেয়াদ শেষ'), findsOneWidget);
    expect(find.text('ফি পরিশোধিত'), findsOneWidget);
  });

  testWidgets('the renewal bar names the stage and fills its segments', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const RenewalProgressBar(stage: 'APPLICATION_SUBMITTED', progress: 40),
      ),
    );
    expect(find.text('Application submitted'), findsOneWidget);
    expect(find.text('40%'), findsOneWidget);
    expect(
      tester.getSemantics(find.byType(RenewalProgressBar)),
      matchesSemantics(label: 'Renewal: Application submitted', value: '40%'),
    );
  });

  test('licence rows parse calendar dates without shifting the day', () {
    final row = LicenceRow.fromJson(_row());
    expect(row.expiresAt, DateTime.utc(2026, 11, 3));
    expect(row.branchName, 'Factory A');
    expect(row.ownerName, 'Sabina Yasmin');
    expect(row.renewalProgress, 40);
    final detail = LicenceDetail.fromJson(_detail());
    expect(detail.documentIsPdf, isFalse);
    expect(detail.nextAlertDays, 0);
    expect(detail.history.last.type, 'ESCALATED');
  });

  testWidgets(
    'the register lists licences with countdowns and filters by state',
    (tester) async {
      final requests = <Uri>[];
      await tester.pumpWidget(
        Provider<ApiClient>.value(
          value: _api(requests),
          child: MaterialApp(
            theme: buildTheme(),
            supportedLocales: L.supportedLocales,
            localizationsDelegates: L.localizationsDelegates,
            home: const LicencesScreen(),
          ),
        ),
      );
      await _settle(tester);

      expect(find.text('Factory licence'), findsOneWidget);
      expect(find.text('12 days left'), findsOneWidget);
      expect(find.text('252 days left'), findsOneWidget);
      expect(find.text('Application submitted'), findsOneWidget);
      expect(
        find.textContaining('Factory A · Department of Inspection'),
        findsWidgets,
      );
      expect(
        find.textContaining('Next to expire: Trade licence'),
        findsOneWidget,
      );
      expect(find.text('Expired · 2'), findsOneWidget);

      await tester.tap(find.text('Expired · 2'));
      await _settle(tester);
      expect(
        requests.any((u) => u.queryParameters['state'] == 'EXPIRED'),
        isTrue,
      );
      expect(find.text('Boiler certificate'), findsOneWidget);
      expect(find.text('Expired 4 days ago'), findsOneWidget);
      expect(find.text('Factory licence'), findsNothing);
    },
  );

  testWidgets(
    'a licence shows its countdown, renewal steps, scan and history',
    (tester) async {
      final requests = <Uri>[];
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        Provider<ApiClient>.value(
          value: _api(requests),
          child: MaterialApp(
            theme: buildTheme(),
            supportedLocales: L.supportedLocales,
            localizationsDelegates: L.localizationsDelegates,
            home: const LicenceDetailScreen(id: 'lic-2'),
          ),
        ),
      );
      await _settle(tester);

      expect(requests.single.path, endsWith('/licences/lic-2'));
      expect(find.text('Fire licence'), findsWidgets);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('days left'), findsOneWidget);
      expect(find.text('3 days left'), findsOneWidget);
      expect(find.text('Documents prepared'), findsOneWidget);
      expect(find.text('Renewed'), findsOneWidget);
      expect(find.text('Next'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('View scanned copy'), 300);
      expect(find.text('fire-licence-scan.png'), findsOneWidget);

      await tester.scrollUntilVisible(
        find.text('Expiry alert: 7 days before'),
        300,
      );
      expect(
        find.text('Sent to Sabina Yasmin, Shirin Akhter, Arif Chowdhury'),
        findsOneWidget,
      );
      expect(find.text('Renewal moved to Fee paid'), findsOneWidget);
      expect(find.text('Paid by pay order.'), findsOneWidget);
    },
  );
}
