import '../../core/api_client.dart';
import '../../widgets/module_kit.dart';
import 'audit_models.dart';

/// Every audit call the app makes. Screens never build URLs themselves.
class AuditsApi {
  AuditsApi(this.api);

  final ApiClient api;

  /// The corrective actions I own, overdue first.
  Future<MyAuditActions> myActions({String state = 'open'}) async {
    final res =
        await api.get('/audits/actions/mine', query: {'state': state})
            as Map<String, dynamic>;
    final counts = jMap(res['counts']);
    return MyAuditActions(
      items: jList(res['items']).map(AuditFinding.fromJson).toList(),
      open: jInt(counts['open']),
      submitted: jInt(counts['submitted']),
      overdue: jInt(counts['overdue']),
    );
  }

  /// Audits of my offices (audit team, compliance, office admins).
  Future<({List<AuditRow> items, String? nextCursor})> list({
    String status = 'OPEN',
    String? cursor,
  }) async {
    final res =
        await api.get(
              '/admin/audits',
              query: {'status': status, 'cursor': cursor, 'limit': '25'},
            )
            as Map<String, dynamic>;
    return (
      items: jList(res['items']).map(AuditRow.fromJson).toList(),
      nextCursor: jStr(res['nextCursor']),
    );
  }

  Future<AuditDetail> get(String id) async => AuditDetail.fromJson(
    await api.get('/audits/$id') as Map<String, dynamic>,
  );

  Future<AuditDetail> _post(
    String path,
    Map<String, dynamic> body,
    String? key,
  ) async => AuditDetail.fromJson(
    await api.post(path, body: body, idempotencyKey: key)
        as Map<String, dynamic>,
  );

  /// start · close · cancel · notes
  Future<AuditDetail> step(
    String id,
    String step, {
    String? note,
    String? idempotencyKey,
  }) => _post('/audits/$id/$step', {
    if (note != null && note.isNotEmpty) 'note': note,
  }, idempotencyKey);

  Future<AuditDetail> completeFieldwork(
    String id, {
    required String rating,
    required String conclusion,
    int? score,
    String? idempotencyKey,
  }) => _post('/audits/$id/complete-fieldwork', {
    'rating': rating,
    'conclusion': conclusion,
    'score': ?score,
  }, idempotencyKey);

  Future<AuditDetail> addFinding(
    String id,
    Map<String, dynamic> body,
    String key,
  ) => _post('/audits/$id/findings', body, key);

  /// submit (response) · verify (note) · reopen (note) · reassign (ownerUserId, dueDate)
  Future<AuditDetail> finding(
    String findingId,
    String step,
    Map<String, dynamic> body, {
    String? idempotencyKey,
  }) => _post('/audits/findings/$findingId/$step', body, idempotencyKey);
}
