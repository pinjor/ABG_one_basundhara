import 'dart:convert';

import 'package:abg_dispatch/core/api_client.dart';
import 'package:abg_dispatch/core/services.dart';
import 'package:abg_dispatch/core/session.dart';
import 'package:abg_dispatch/data/repository.dart';
import 'package:abg_dispatch/l10n/app_localizations.dart';
import 'package:abg_dispatch/l10n/app_localizations_en.dart';
import 'package:abg_dispatch/models/models.dart';
import 'package:abg_dispatch/modules/appointments/appointments.dart';
import 'package:abg_dispatch/modules/audits/audits.dart';
import 'package:abg_dispatch/modules/leave/leave.dart';
import 'package:abg_dispatch/theme/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

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

void _tall(WidgetTester tester) {
  tester.view.physicalSize = const Size(1200, 4000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

String _now([Duration offset = Duration.zero]) =>
    DateTime.now().toUtc().add(offset).toIso8601String();

String _day(int offset) => isoDay(dhakaToday().add(Duration(days: offset)));

Profile _profile(List<String> caps, {bool manager = true}) => Profile.fromJson({
  'id': 'u1',
  'displayName': 'Md. Rahim Uddin',
  'roles': ['EMPLOYEE'],
  'capabilities': caps,
  'employee': {
    'id': 'e1',
    'fullName': 'Md. Rahim Uddin',
    if (manager)
      'manager': {
        'employeeId': 'e2',
        'userId': 'u2',
        'fullName': 'Farid Uddin',
        'designation': 'Executive Director',
      },
  },
});

Map<String, Object?> _leave({
  String status = 'PENDING_HOD',
  List<String> actions = const ['APPROVE', 'REJECT', 'ADD_NOTE'],
}) => {
  'id': 'l1',
  'referenceNumber': 'ABG-LV-2026-017',
  'type': 'CASUAL',
  'startDate': _day(5),
  'endDate': _day(7),
  'halfDay': null,
  'days': 2,
  'year': dhakaToday().year,
  'reason': 'Family wedding in Sylhet',
  'addressDuringLeave': 'Zindabazar, Sylhet',
  'contactPhone': '01711000000',
  'status': status,
  'awaiting': status == 'PENDING_HOD'
      ? 'HOD'
      : status == 'PENDING_HR'
      ? 'HR'
      : null,
  'onLeaveNow': false,
  'statusNote': null,
  'createdAt': _now(),
  'branch': {'id': 'b1', 'name': 'ABG Head Office', 'code': 'HO'},
  'applicant': {
    'name': 'Md. Rahim Uddin',
    'employeeCode': 'ABG-1004',
    'designation': 'Senior Officer',
    'department': 'Administration',
  },
  'approver': {'name': 'Farid Uddin', 'designation': 'Executive Director'},
  'reliever': {'name': 'Tanvir Ahmed', 'designation': 'Officer'},
  'balance': {
    'type': 'CASUAL',
    'entitled': 10,
    'used': 3,
    'pending': 2,
    'available': 5,
    'adjusted': false,
    'note': null,
  },
  'pipeline': [
    {
      'key': 'SUBMITTED',
      'state': 'done',
      'by': 'Md. Rahim Uddin',
      'at': _now(),
    },
    {'key': 'PENDING_HOD', 'state': 'current', 'waitingFor': 'Farid Uddin'},
    {'key': 'PENDING_HR', 'state': 'upcoming', 'waitingFor': null},
    {'key': 'APPROVED', 'state': 'upcoming'},
  ],
  'updates': [
    {
      'id': 'u1',
      'type': 'SUBMITTED',
      'toStatus': 'PENDING_HOD',
      'actor': 'Md. Rahim Uddin',
      'createdAt': _now(),
    },
  ],
  'viewer': {
    'isApplicant': false,
    'isApprover': true,
    'isHr': false,
    'isReliever': false,
    'canDecide': true,
    'blockedReason': null,
    'actions': actions,
  },
};

/// 11:00 Dhaka time, [days] from today.
String _meetingAt(int days, {int hour = 11}) {
  final d = dhakaToday().add(Duration(days: days));
  return DateTime.utc(
    d.year,
    d.month,
    d.day,
    hour,
  ).subtract(const Duration(hours: 6)).toIso8601String();
}

Map<String, Object?> _appointment() => {
  'id': 'a1',
  'referenceNumber': 'ABG-AP-2026-013',
  'subject': 'Lease renewal for the Chattogram depot',
  'purpose': 'APPROVAL',
  'purposeLabel': 'Approval or signature',
  'agenda': 'Sign-off on the five-year lease.',
  'mode': 'IN_PERSON',
  'durationMinutes': 30,
  'preferredAt': _meetingAt(3),
  'alternativeAt': _meetingAt(4, hour: 15),
  'scheduledAt': null,
  'endsAt': null,
  'location': null,
  'attendees': ['Selim Reza'],
  'urgent': true,
  'status': 'PENDING',
  'statusNote': null,
  'createdAt': _now(),
  'branch': {'id': 'b1', 'name': 'ABG Head Office', 'code': 'HO'},
  'requester': {
    'userId': 'u1',
    'name': 'Md. Rahim Uddin',
    'designation': 'Senior Officer',
    'department': 'Administration',
    'phone': '01711000000',
    'executive': false,
  },
  'host': {
    'userId': 'u9',
    'name': 'Sayem Sobhan Anvir',
    'designation': 'Managing Director',
    'department': 'Board',
    'executive': true,
  },
  'clashes': [
    {
      'id': 'a0',
      'referenceNumber': 'ABG-AP-2026-009',
      'subject': 'Board pack review',
      'scheduledAt': _meetingAt(3),
      'with': 'Nusrat Jahan',
    },
  ],
  'updates': [
    {
      'id': 'u1',
      'type': 'SUBMITTED',
      'toStatus': 'PENDING',
      'actor': 'Md. Rahim Uddin',
      'metadata': {},
      'createdAt': _now(),
    },
  ],
  'viewer': {
    'isRequester': false,
    'isHost': false,
    'isOffice': true,
    'actions': ['CONFIRM', 'PROPOSE', 'DECLINE', 'ADD_NOTE'],
  },
};

Map<String, Object?> _audit() => {
  'id': 'au1',
  'referenceNumber': 'ABG-AU-2026-004',
  'title': 'Buyer social-compliance audit',
  'type': 'BUYER',
  'scope': 'Social compliance, fire safety',
  'branch': {'id': 'b2', 'name': 'Factory B', 'code': 'FCB'},
  'externalBody': 'Bureau Veritas',
  'team': ['A. Karim'],
  'lead': {'userId': 'u7', 'name': 'Shirin Akter', 'designation': 'Compliance'},
  'plannedStart': _day(-20),
  'plannedEnd': _day(-18),
  'status': 'FOLLOW_UP',
  'rating': 'NEEDS_IMPROVEMENT',
  'score': 72,
  'conclusion': 'Fire exits and first-aid stock need attention.',
  'statusNote': null,
  'createdByName': 'Shirin Akter',
  'createdAt': _now(const Duration(days: -30)),
  'counts': {
    'total': 1,
    'open': 1,
    'submitted': 0,
    'verified': 0,
    'noted': 0,
    'overdue': 1,
    'criticalOpen': 0,
  },
  'findings': [
    {
      'id': 'f1',
      'number': 'F-03',
      'title': 'Fire exit on Level 3 blocked by cartons',
      'detail': null,
      'clause': 'BNBC 4.3',
      'area': 'Finishing floor',
      'severity': 'MAJOR',
      'status': 'OPEN',
      'recommendation': 'Clear and mark the exit.',
      'owner': {
        'userId': 'u1',
        'name': 'Md. Rahim Uddin',
        'designation': 'Senior Officer',
      },
      'dueDate': _day(-2),
      'overdue': true,
      'response': null,
      'createdAt': _now(const Duration(days: -19)),
      'actions': ['SUBMIT'],
    },
  ],
  'updates': [],
  'viewer': {
    'isLead': false,
    'isStaff': false,
    'canManage': false,
    'ownsFindings': true,
    'partial': true,
    'actions': ['ADD_NOTE'],
  },
};

void main() {
  group('the menu', () {
    test('runs in the agreed order on the phone', () {
      final every = _profile([
        'notice.read',
        'appointment.request',
        'incident.report',
        'licence.view',
        'parcel.view.own',
        'parcel.create',
        'visitor.invite',
        'leave.apply',
        'fleet.request',
        'tour.request',
      ]);
      final ids = servicesFor(every, LEn()).map((s) => s.id).toList();
      expect(ids.take(9), [
        'notices',
        'appointments',
        'incidents',
        'licences',
        'audits',
        'parcels',
        'visitors',
        'leave',
        'pool-car',
      ]);
      expect(ids.skip(9), ['tours', 'approvals', 'scan']);
      final labels = servicesFor(every, LEn()).map((s) => s.label).take(9);
      expect(labels, [
        'Notice board',
        'Request for Appointment',
        'Incident record',
        'Regulatory Affairs',
        'Audit',
        'Office parcel',
        'Visitor Management',
        'Leave apply',
        'Pool car request',
      ]);
    });

    test('keeps the order when someone lacks a service', () {
      final ids = servicesFor(
        _profile(['notice.read', 'leave.apply', 'fleet.request']),
        LEn(),
      ).map((s) => s.id);
      expect(ids.take(4), ['notices', 'audits', 'leave', 'pool-car']);
    });
  });

  group('leave rules', () {
    const calendar = LeaveCalendar(
      weekendDays: [5],
      holidays: [PublicHoliday('2026-12-16', 'Victory Day')],
    );

    test('the weekly holiday and public holidays are not counted', () {
      // Mon 14 Dec – Fri 18 Dec 2026: Wed 16th is Victory Day, Fri is the weekly holiday.
      final days = countLeaveDays(
        DateTime.utc(2026, 12, 14),
        DateTime.utc(2026, 12, 18),
        type: 'CASUAL',
        calendar: calendar,
      );
      expect(days, 3);
    });

    test('maternity counts calendar days and a half day is ½', () {
      expect(
        countLeaveDays(
          DateTime.utc(2026, 12, 14),
          DateTime.utc(2026, 12, 18),
          type: 'MATERNITY',
          calendar: calendar,
        ),
        5,
      );
      expect(
        countLeaveDays(
          DateTime.utc(2026, 12, 14),
          DateTime.utc(2026, 12, 14),
          type: 'CASUAL',
          calendar: calendar,
          halfDay: 'FIRST_HALF',
        ),
        0.5,
      );
    });

    test('earned leave needs notice; casual leave may be back-dated', () {
      final today = DateTime.utc(2026, 10, 23);
      expect(earliestLeaveStart('EARNED', today), DateTime.utc(2026, 10, 26));
      expect(earliestLeaveStart('CASUAL', today), DateTime.utc(2026, 10, 16));
    });

    test('day counts read naturally', () {
      final l = LEn();
      expect(leaveDays(l, 0.5), '½ day');
      expect(leaveDays(l, 1), '1 day');
      expect(leaveDays(l, 2.5), '2.5 days');
    });
  });

  group('meeting times', () {
    test('must be ahead, within 90 days and between 8:00 and 20:00 Dhaka', () {
      final now = DateTime.utc(2026, 10, 23, 4); // 10:00 in Dhaka
      DateTime dhaka(int day, int hour, [int minute = 0]) => DateTime.utc(
        2026,
        10,
        day,
        hour,
        minute,
      ).subtract(const Duration(hours: 6));
      expect(meetingTimeProblem(dhaka(23, 10, 5), 30, now), 'past');
      expect(meetingTimeProblem(dhaka(24, 11), 30, now), isNull);
      expect(meetingTimeProblem(dhaka(24, 7, 30), 30, now), 'hours');
      expect(meetingTimeProblem(dhaka(24, 19, 45), 30, now), 'hours');
      expect(
        meetingTimeProblem(now.add(const Duration(days: 91)), 30, now),
        'far',
      );
    });
  });

  group('screens', () {
    testWidgets(
      'a head of department approves leave on to HR, or rejects with a reason',
      (tester) async {
        _tall(tester);
        await tester.pumpWidget(
          _app(
            const LeaveDetailScreen(id: 'l1'),
            responses: {'/leave/l1': _leave()},
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('ABG-LV-2026-017'), findsOneWidget);
        expect(find.text('Casual leave · 2 days'), findsOneWidget);
        expect(find.text('Waiting for Farid Uddin'), findsOneWidget);
        expect(find.widgetWithText(FilledButton, 'Send to HR'), findsOneWidget);
        await tester.tap(find.widgetWithText(OutlinedButton, 'Reject'));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(FilledButton, 'Reject'));
        await tester.pump();
        expect(find.text('Please give a short reason.'), findsOneWidget);
      },
    );

    testWidgets(
      'the leave form shows what is left and explains what is missing',
      (tester) async {
        _tall(tester);
        await tester.pumpWidget(
          _app(
            const LeaveFormScreen(),
            profile: _profile(['leave.apply']),
            responses: {
              '/leave/calendar-settings': {
                'weekendDays': [5],
                'holidays': [],
              },
              '/leave/balance': {
                'year': 2026,
                'balances': [
                  {
                    'type': 'CASUAL',
                    'entitled': 10,
                    'used': 3,
                    'pending': 0,
                    'available': 7,
                  },
                  {
                    'type': 'UNPAID',
                    'entitled': null,
                    'used': 0,
                    'pending': 0,
                    'available': null,
                  },
                ],
              },
            },
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('7 left'), findsOneWidget);
        expect(find.text('Farid Uddin'), findsOneWidget);
        expect(find.text('Only half a day'), findsOneWidget);
        // Earned leave is taken in whole days.
        await tester.tap(find.text('Earned leave'));
        await tester.pumpAndSettle();
        expect(find.text('Only half a day'), findsNothing);
        await tester.tap(find.text('Submit application'));
        await tester.pump();
        expect(find.text('Choose the days of leave.'), findsOneWidget);
      },
    );

    testWidgets(
      'the executive office sees a clash and can confirm, propose or decline',
      (tester) async {
        _tall(tester);
        await tester.pumpWidget(
          _app(
            const AppointmentDetailScreen(id: 'a1'),
            responses: {'/appointments/a1': _appointment()},
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Lease renewal for the Chattogram depot'),
          findsWidgets,
        );
        expect(find.text('Clashes with the diary'), findsOneWidget);
        expect(find.text('Urgent'), findsOneWidget);
        expect(find.widgetWithText(FilledButton, 'Confirm'), findsOneWidget);
        expect(
          find.widgetWithText(OutlinedButton, 'Propose a time'),
          findsOneWidget,
        );
        expect(find.widgetWithText(OutlinedButton, 'Decline'), findsOneWidget);

        await tester.tap(find.widgetWithText(FilledButton, 'Confirm'));
        await tester.pumpAndSettle();
        expect(find.text('Confirm the meeting'), findsOneWidget);
        expect(find.text('Preferred'), findsWidgets);
        expect(find.text('Alternative'), findsWidgets);
      },
    );

    testWidgets(
      'a finding owner sees only their action and can submit the fix',
      (tester) async {
        _tall(tester);
        await tester.pumpWidget(
          _app(
            const AuditDetailScreen(id: 'au1', findingId: 'f1'),
            responses: {'/audits/au1': _audit()},
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('ABG-AU-2026-004'), findsOneWidget);
        expect(
          find.text(
            'You see the findings you own. The audit team sees the full report.',
          ),
          findsOneWidget,
        );
        expect(
          find.text('Fire exit on Level 3 blocked by cartons'),
          findsOneWidget,
        );
        expect(find.textContaining('Overdue since'), findsOneWidget);
        expect(find.text('Needs improvement'), findsOneWidget);
        await tester.tap(find.widgetWithText(FilledButton, 'Submit my fix'));
        await tester.pumpAndSettle();
        expect(find.text('Submit your fix'), findsOneWidget);
        await tester.tap(
          find.widgetWithText(FilledButton, 'Submit my fix').last,
        );
        await tester.pump();
        expect(find.text('Please give a short reason.'), findsOneWidget);
      },
    );
  });
}
