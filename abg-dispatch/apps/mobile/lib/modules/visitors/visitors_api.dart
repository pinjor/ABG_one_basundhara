import '../../core/api_client.dart';
import '../../models/models.dart' show Json;
import 'visit_models.dart';

/// The visitor endpoints. Every create and gate action can carry an
/// idempotency key, so a retry after a dropped connection never acts twice.
class VisitorsApi {
  VisitorsApi(this.api);
  final ApiClient api;

  Future<VisitPage> mine({required String scope, String? cursor}) async =>
      VisitPage.fromJson(
        await api.get(
              '/visitors/mine',
              query: {'scope': scope, 'cursor': cursor, 'limit': '50'},
            )
            as Json,
      );

  /// The gate board for today: `status` is CHECKED_IN, EXPECTED, CHECKED_OUT or ALL.
  Future<VisitPage> board({required String status, String? cursor}) async =>
      VisitPage.fromJson(
        await api.get(
              '/admin/visitors',
              query: {'status': status, 'cursor': cursor, 'limit': '100'},
            )
            as Json,
      );

  Future<VisitSummary> summary() async =>
      VisitSummary(await api.get('/admin/visitors/summary') as Json);

  Future<Visit> get(String id) async =>
      Visit(await api.get('/visitors/$id') as Json);

  Future<Visit> invite(Json body, {required String idempotencyKey}) async =>
      Visit(
        await api.post('/visitors', body: body, idempotencyKey: idempotencyKey)
            as Json,
      );

  Future<Visit> walkIn(Json body, {required String idempotencyKey}) async =>
      Visit(
        await api.post(
              '/visitors/walk-in',
              body: body,
              idempotencyKey: idempotencyKey,
            )
            as Json,
      );

  Future<Visit> checkIn(String id, {String? badge, String? key}) async => Visit(
    await api.post(
          '/visitors/$id/check-in',
          body: {if (badge != null && badge.isNotEmpty) 'badgeNumber': badge},
          idempotencyKey: key,
        )
        as Json,
  );

  Future<Visit> checkOut(String id, {String? key}) async => Visit(
    await api.post('/visitors/$id/check-out', idempotencyKey: key) as Json,
  );

  Future<Visit> cancel(String id, {String? reason, String? key}) async => Visit(
    await api.post(
          '/visitors/$id/cancel',
          body: {if (reason != null && reason.isNotEmpty) 'reason': reason},
          idempotencyKey: key,
        )
        as Json,
  );

  Future<GatePassView> pass(String token) async =>
      GatePassView(await api.get('/visitors/passes/$token') as Json);

  Future<GatePassView> passByNumber(String number) async => GatePassView(
    await api.get('/visitors/passes/by-number/${Uri.encodeComponent(number)}')
        as Json,
  );

  Future<GatePassView> passCheckIn(String token, {String? badge}) async =>
      GatePassView(
        await api.post(
              '/visitors/passes/$token/check-in',
              body: {
                if (badge != null && badge.isNotEmpty) 'badgeNumber': badge,
              },
            )
            as Json,
      );

  Future<GatePassView> passCheckOut(String token) async =>
      GatePassView(await api.post('/visitors/passes/$token/check-out') as Json);
}
