import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/modules/visitors/visit_models.dart';
import 'package:abg_dispatch/modules/visitors/visitor_widgets.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:abg_dispatch/widgets/vocab.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';

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

final _now = DateTime.now();

Map<String, dynamic> _row({
  String status = 'EXPECTED',
  List<String> actions = const [],
  bool walkIn = false,
}) => {
  'id': 'v1',
  'passNumber': 'VP-261021-FCA-012',
  'status': status,
  'walkIn': walkIn,
  'visitorName': 'Rakibul Hasan',
  'visitorPhone': '01713665021',
  'company': 'Akij Packaging Ltd',
  'purpose': 'VENDOR_SUPPLIER',
  'partySize': 2,
  'branch': {'id': 'b1', 'name': 'Factory A', 'code': 'FCA'},
  'location': 'Factory A › Administration Block',
  'hostName': 'Farhana Islam',
  'isHost': true,
  'expectedAt': _now.add(const Duration(minutes: 30)).toIso8601String(),
  'expectedUntil': _now.add(const Duration(hours: 2)).toIso8601String(),
  'checkedInAt': status == 'CHECKED_IN'
      ? _now.subtract(const Duration(minutes: 70)).toIso8601String()
      : null,
  'onSiteMinutes': status == 'CHECKED_IN' ? 70 : null,
  'overstay': false,
  'actions': actions,
};

Map<String, dynamic> _visit({String status = 'EXPECTED'}) => {
  ..._row(status: status),
  'idLast4': '4417',
  'carrying': 'Carton samples',
  'vehicleNumber': 'Dhaka Metro-Ga 25-7781',
  'branch': {
    'id': 'b1',
    'name': 'Factory A',
    'code': 'FCA',
    'address': 'Kanchpur Industrial Area, Sonargaon',
  },
  'location': {
    'id': 'l1',
    'name': 'Administration Block',
    'path': 'Factory A › Administration Block',
  },
  'host': {
    'userId': 'u1',
    'name': 'Farhana Islam',
    'designation': 'Administration Manager',
  },
  'pass': {
    'token': 'tok_abcdefghijklmnopqrstuvwxyz123456',
    'payload':
        'https://dispatch.abg.com.bd/g/v/tok_abcdefghijklmnopqrstuvwxyz123456',
  },
  'viewer': {
    'isHost': true,
    'isStaff': false,
    'canManage': false,
    'actions': ['CANCEL'],
  },
};

void main() {
  test('every visit status has a label tone and an icon', () {
    for (final s in visitStatuses) {
      expect(visitStatusIcon(s), isNot(Icons.circle_outlined), reason: s);
    }
    expect(visitStatusTone('CHECKED_IN'), Tone.active);
    expect(visitStatusTone('EXPECTED'), Tone.pending);
    expect(visitStatusTone('CHECKED_OUT'), Tone.success);
    expect(visitStatusTone('EXPIRED'), Tone.neutral);
    // Every purpose but "Other" has its own icon.
    for (final p in visitPurposes.where((p) => p != 'OTHER')) {
      expect(visitPurposeIcon(p), isNot(Icons.help_outline_rounded), reason: p);
    }
  });

  test('Bangladeshi mobile numbers are normalised and checked', () {
    expect(normalizeBdMobile('+880 1711-223344'), '01711223344');
    expect(normalizeBdMobile('8801911000777'), '01911000777');
    expect(normalizeBdMobile('1711223344'), '01711223344');
    expect(isBdMobile('01711 223344'), isTrue);
    expect(isBdMobile('01211223344'), isFalse);
    expect(isBdMobile('12345'), isFalse);
    expect(isIdLast4('4417'), isTrue);
    expect(isIdLast4('5A7Z'), isTrue);
    expect(isIdLast4('1990123456789'), isFalse);
  });

  test('a scanned pass knows its blocking warning', () {
    final pass = GatePassView({
      'passNumber': 'VP-261021-HO-003',
      'status': 'EXPECTED',
      'valid': false,
      'allowed': <String>[],
      'warnings': [
        {
          'code': 'WRONG_OFFICE',
          'message': 'This pass is for ABG Head Office.',
          'blocking': true,
        },
        {'code': 'EARLY', 'message': 'Expected at 3:00 PM.', 'blocking': false},
      ],
      'visitor': {'name': 'Sharmin Chowdhury', 'partySize': 1},
      'host': {'name': 'Md. Rahim'},
      'branch': {'name': 'ABG Head Office', 'code': 'HO'},
      'expectedAt': _now.toIso8601String(),
    });
    expect(pass.blocking?.code, 'WRONG_OFFICE');
    expect(pass.warnings, hasLength(2));
    expect(pass.allowed, isEmpty);
    expect(pass.token, isNull);
  });

  testWidgets('visit card shows the visitor, pass, host and status', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(VisitCard(visit: VisitRow(_row()), onTap: () {})),
    );
    expect(find.text('Rakibul Hasan'), findsOneWidget);
    expect(find.textContaining('VP-261021-FCA-012'), findsOneWidget);
    expect(find.textContaining('Farhana Islam'), findsOneWidget);
    expect(find.text('Expected'), findsOneWidget);
    expect(find.text('+1'), findsOneWidget); // party of two
    // No gate actions for a host.
    expect(find.text('Check in'), findsNothing);
  });

  testWidgets('the gate gets a one-tap check-in and check-out toggle', (
    tester,
  ) async {
    String? tapped;
    await tester.pumpWidget(
      _wrap(
        Column(
          children: [
            VisitCard(
              visit: VisitRow(_row(actions: ['CHECK_IN', 'CANCEL'])),
              onTap: () {},
              onAction: (a) => tapped = a,
            ),
            VisitCard(
              visit: VisitRow(
                _row(
                  status: 'CHECKED_IN',
                  actions: ['CHECK_OUT'],
                  walkIn: true,
                ),
              ),
              onTap: () {},
              onAction: (a) => tapped = a,
            ),
          ],
        ),
      ),
    );
    await tester.tap(find.text('Check in'));
    expect(tapped, 'CHECK_IN');
    await tester.tap(find.text('Check out'));
    expect(tapped, 'CHECK_OUT');
    expect(find.text('On site'), findsOneWidget);
    expect(find.text('Walk-in'), findsOneWidget);
    // Touch targets are at least 48 px tall.
    expect(tester.getSize(find.text('Check in')).height, lessThan(48));
    expect(
      tester
          .getSize(
            find.ancestor(
              of: find.text('Check in'),
              matching: find.byType(FilledButton),
            ),
          )
          .height,
      greaterThanOrEqualTo(48),
    );
  });

  testWidgets('the gate pass shows a QR code, the pass number and the host', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(GatePassCard(visit: Visit(_visit()))));
    expect(find.byType(QrImageView), findsOneWidget);
    expect(find.text('VP-261021-FCA-012'), findsOneWidget);
    expect(find.text('Farhana Islam'), findsOneWidget);
    expect(find.text('Administration Block'), findsOneWidget);
    expect(find.text('2 people'), findsOneWidget);
    expect(find.text('VISITOR GATE PASS'), findsOneWidget);
    expect(find.textContaining('Valid today only'), findsOneWidget);
  });

  testWidgets('a used or cancelled pass is stamped over its QR code', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(GatePassCard(visit: Visit(_visit(status: 'CANCELLED')))),
    );
    expect(find.text('CANCELLED'), findsOneWidget);
  });

  testWidgets('visitor statuses and passes are translated to Bangla', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const Column(
          children: [VisitStatusChip('CHECKED_IN'), VisitStatusChip('EXPIRED')],
        ),
        locale: const Locale('bn'),
      ),
    );
    expect(find.text('সাইটে আছেন'), findsOneWidget);
    expect(find.text('আসেননি'), findsOneWidget);

    await tester.pumpWidget(
      _wrap(GatePassCard(visit: Visit(_visit())), locale: const Locale('bn')),
    );
    await tester.pumpAndSettle();
    expect(find.text('হোস্ট'.toUpperCase()), findsOneWidget);
    expect(find.text('ভেন্ডর / সরবরাহকারী'), findsOneWidget);
  });
}
