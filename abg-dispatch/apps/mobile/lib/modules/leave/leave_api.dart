import '../../core/api_client.dart';
import '../../widgets/module_kit.dart';
import 'leave_models.dart';

/// Every leave call the app makes. Screens never build URLs themselves.
class LeaveApi {
  LeaveApi(this.api);

  final ApiClient api;

  Future<LeavePage> mine({String state = 'all', String? cursor}) async {
    final res =
        await api.get(
              '/leave/mine',
              query: {'state': state, 'cursor': cursor, 'limit': '25'},
            )
            as Map<String, dynamic>;
    return LeavePage(
      jList(res['items']).map(LeaveRow.fromJson).toList(),
      jStr(res['nextCursor']),
    );
  }

  Future<({int year, List<LeaveBalance> balances})> balance({int? year}) async {
    final res =
        await api.get('/leave/balance', query: {'year': year?.toString()})
            as Map<String, dynamic>;
    return (
      year: jInt(res['year']),
      balances: jList(res['balances']).map(LeaveBalance.fromJson).toList(),
    );
  }

  Future<LeaveCalendar> calendar() async => LeaveCalendar.fromJson(
    await api.get('/leave/calendar-settings') as Map<String, dynamic>,
  );

  Future<List<LeaveApproval>> approvals() async {
    final res =
        await api.get('/leave/approvals', query: {'limit': '100'})
            as Map<String, dynamic>;
    return jList(res['items']).map(LeaveApproval.fromJson).toList();
  }

  /// My direct reports who are away between two dates.
  Future<List<TeamAbsence>> team(DateTime from, DateTime to) async {
    final res =
        await api.get(
              '/leave/team',
              query: {'from': isoDay(from), 'to': isoDay(to)},
            )
            as Map<String, dynamic>;
    return [
      for (final p in jList(res['people']))
        TeamAbsence(
          name: jStr(p['name']) ?? '—',
          designation: jStr(p['designation']),
          leaves: [
            for (final l in jList(p['leaves']))
              LeaveRow.fromJson({...l, 'applicant': p}),
          ],
        ),
    ];
  }

  Future<LeaveDetail> get(String id) async =>
      LeaveDetail.fromJson(await api.get('/leave/$id') as Map<String, dynamic>);

  Future<LeaveDetail> apply(Map<String, dynamic> body, String key) async =>
      LeaveDetail.fromJson(
        await api.post('/leave', body: body, idempotencyKey: key)
            as Map<String, dynamic>,
      );

  Future<LeaveDetail> decide(
    String id, {
    required bool approve,
    String? note,
    String? idempotencyKey,
  }) async => LeaveDetail.fromJson(
    await api.post(
          '/leave/$id/decision',
          body: {
            'decision': approve ? 'APPROVE' : 'REJECT',
            if (note != null && note.isNotEmpty) 'note': note,
          },
          idempotencyKey: idempotencyKey,
        )
        as Map<String, dynamic>,
  );

  /// cancel · notes
  Future<LeaveDetail> step(
    String id,
    String step, {
    String? note,
    String? idempotencyKey,
  }) async => LeaveDetail.fromJson(
    await api.post(
          '/leave/$id/$step',
          body: {if (note != null && note.isNotEmpty) 'note': note},
          idempotencyKey: idempotencyKey,
        )
        as Map<String, dynamic>,
  );
}
