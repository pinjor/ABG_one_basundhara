import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/models/models.dart';
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
}
