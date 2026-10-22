import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/modules/notices/notices.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child, {Locale locale = const Locale('en')}) => MaterialApp(
  theme: buildTheme(),
  locale: locale,
  supportedLocales: L.supportedLocales,
  localizationsDelegates: L.localizationsDelegates,
  home: Scaffold(body: child),
);

Map<String, dynamic> _row({
  bool urgent = false,
  bool pinned = false,
  bool read = false,
  bool acknowledged = false,
  bool awaiting = false,
}) => {
  'id': 'n1',
  'referenceNumber': 'ABG-NB-2026-004',
  'title': 'Safety circular: LPG cylinder handling at Factory A and Factory B',
  'excerpt': 'Following a gas leak at the Factory B canteen store last week…',
  'channel': 'ADMINISTRATION',
  'category': 'SAFETY',
  'urgent': urgent,
  'pinned': pinned,
  'signedBy': 'Arif Chowdhury, Head of Administration',
  'publishedAt': DateTime.now()
      .subtract(const Duration(hours: 3))
      .toIso8601String(),
  'hasAttachment': true,
  'requiresAcknowledgement': true,
  'read': read,
  'acknowledged': acknowledged,
  'awaitingAcknowledgement': awaiting,
};

Map<String, dynamic> _detail({
  List<String> actions = const ['ACKNOWLEDGE'],
  bool acknowledged = false,
  bool requiresAcknowledgement = true,
  bool isAuthor = false,
}) => {
  'id': 'n2',
  'referenceNumber': 'ABG-NB-2026-002',
  'title': 'Foreign travel requires MD / Chairman sanction',
  'body':
      'With immediate effect, all official travel outside Bangladesh must be sanctioned.\n\nApply through an Official Tour Request in ABG ONE.',
  'channel': 'MANAGING_DIRECTOR',
  'category': 'POLICY',
  'status': 'PUBLISHED',
  'urgent': true,
  'pinned': false,
  'audience': 'ALL',
  'branches': <Map<String, dynamic>>[],
  'requiresAcknowledgement': requiresAcknowledgement,
  'signedBy': 'Kazi Ashraful Haque, Managing Director',
  'author': {'id': 'u1', 'name': 'Kazi Ashraful Haque'},
  'publishedAt': '2026-10-15T04:00:00.000Z',
  'expiresAt': null,
  'expired': false,
  'attachment': {
    'name': 'ABG-Foreign-Travel-Circular.pdf',
    'mimeType': 'application/pdf',
    'sizeBytes': 5120,
    'url': '/api/notice-attachments/n2/content?exp=1&sig=x',
  },
  'acknowledged': acknowledged,
  'receipt': acknowledged
      ? {
          'readAt': '2026-10-15T05:00:00.000Z',
          'acknowledgedAt': '2026-10-15T05:02:00.000Z',
        }
      : null,
  'viewer': {'isAuthor': isAuthor, 'actions': actions},
};

void main() {
  test('rows and details parse what the API sends', () {
    final row = NoticeRow.fromJson(_row(urgent: true, awaiting: true));
    expect(row.urgent, isTrue);
    expect(row.awaitingAcknowledgement, isTrue);
    expect(row.publishedAt, isNotNull);

    final n = NoticeDetail(_detail());
    expect(n.can('ACKNOWLEDGE'), isTrue);
    expect(n.can('ARCHIVE'), isFalse);
    expect(n.attachment!.name, 'ABG-Foreign-Travel-Circular.pdf');
    expect(n.toEveryone, isTrue);
    expect(NoticeDetail(_detail(acknowledged: true)).acknowledgedAt, isNotNull);

    final counts = NoticeCounts.fromJson({
      'unread': 3,
      'toAcknowledge': 2,
      'urgentUnread': 1,
    });
    expect(counts.unread, 3);
    expect(counts.toAcknowledge, 2);
  });

  test('paragraphs split on blank lines', () {
    expect(noticeParagraphs('One\nstill one.\r\n\r\nTwo.\n\n\n'), [
      'One\nstill one.',
      'Two.',
    ]);
  });

  testWidgets('an urgent unread notice shows the urgent badge, a dot and New', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        NoticeCard(
          row: NoticeRow.fromJson(
            _row(urgent: true, pinned: true, awaiting: true),
          ),
          onTap: () {},
        ),
      ),
    );
    expect(find.text('URGENT'), findsOneWidget);
    expect(find.text('New'), findsOneWidget);
    expect(find.text('Administration'), findsOneWidget);
    expect(find.text('Safety'), findsOneWidget);
    expect(find.text('Please acknowledge'), findsOneWidget);
    expect(find.byIcon(Icons.push_pin_rounded), findsOneWidget);
    expect(find.byIcon(Icons.picture_as_pdf_outlined), findsOneWidget);
  });

  testWidgets('a read, acknowledged notice shows no dot and says so', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        NoticeCard(
          row: NoticeRow.fromJson(_row(read: true, acknowledged: true)),
          onTap: () {},
        ),
      ),
    );
    expect(find.text('New'), findsNothing);
    expect(find.text('URGENT'), findsNothing);
    expect(find.text('Acknowledged'), findsOneWidget);
  });

  testWidgets('channel and category labels are translated to Bangla', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        NoticeCard(row: NoticeRow.fromJson(_row(urgent: true)), onTap: () {}),
        locale: const Locale('bn'),
      ),
    );
    expect(find.text('প্রশাসন'), findsOneWidget);
    expect(find.text('নিরাপত্তা'), findsOneWidget);
    expect(find.text('জরুরি'.toUpperCase()), findsOneWidget);
  });

  testWidgets('the detail asks for acknowledgement and offers the PDF', (
    tester,
  ) async {
    var acknowledged = 0;
    var opened = 0;
    await tester.pumpWidget(
      _wrap(
        NoticeDetailView(
          notice: NoticeDetail(_detail()),
          onAcknowledge: () => acknowledged++,
          onOpenPdf: () => opened++,
        ),
      ),
    );
    expect(
      find.text('Foreign travel requires MD / Chairman sanction'),
      findsOneWidget,
    );
    expect(find.text('Urgent notice — please read it now'), findsOneWidget);
    expect(find.text('Kazi Ashraful Haque'), findsOneWidget);
    expect(
      find.text('Apply through an Official Tour Request in ABG ONE.'),
      findsOneWidget,
    );

    await tester.scrollUntilVisible(
      find.text('ABG-Foreign-Travel-Circular.pdf'),
      200,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('ABG-Foreign-Travel-Circular.pdf'));
    expect(opened, 1);

    await tester.scrollUntilVisible(
      find.text('I have read and understood'),
      200,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('I have read and understood'));
    expect(acknowledged, 1);
  });

  testWidgets('once acknowledged, the detail shows the confirmation instead', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        NoticeDetailView(
          notice: NoticeDetail(_detail(actions: const [], acknowledged: true)),
          onAcknowledge: () {},
          onOpenPdf: () {},
        ),
      ),
    );
    await tester.scrollUntilVisible(
      find.textContaining('You acknowledged this notice'),
      200,
    );
    expect(find.text('I have read and understood'), findsNothing);
  });

  testWidgets('a notice for information only needs no acknowledgement', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        NoticeDetailView(
          notice: NoticeDetail(
            _detail(actions: const [], requiresAcknowledgement: false),
          ),
          onAcknowledge: () {},
          onOpenPdf: () {},
        ),
      ),
    );
    await tester.scrollUntilVisible(
      find.text('For your information — no acknowledgement needed.'),
      200,
    );
    expect(find.text('I have read and understood'), findsNothing);
  });
}
