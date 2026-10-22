import '../../core/api_client.dart';
import 'tour_models.dart';

/// Every tours call the app makes. Screens never build URLs themselves.
class ToursApi {
  ToursApi(this.api);

  final ApiClient api;

  Future<TourPage<TourRow>> mine({String state = 'all', String? cursor}) async {
    final res =
        await api.get(
              '/tours/mine',
              query: {'state': state, 'cursor': cursor, 'limit': '25'},
            )
            as Map<String, dynamic>;
    return TourPage(
      (res['items'] as List)
          .cast<Map<String, dynamic>>()
          .map(TourRow.fromJson)
          .toList(),
      res['nextCursor'] as String?,
    );
  }

  Future<List<TourApproval>> approvals() async {
    final res =
        await api.get('/tours/approvals', query: {'limit': '100'})
            as Map<String, dynamic>;
    return (res['items'] as List)
        .cast<Map<String, dynamic>>()
        .map(TourApproval.fromJson)
        .toList();
  }

  Future<TourDetail> tour(String id) async =>
      TourDetail.fromJson(await api.get('/tours/$id') as Map<String, dynamic>);

  Future<TourDetail> create(
    Map<String, dynamic> body,
    String idempotencyKey,
  ) async => TourDetail.fromJson(
    await api.post('/tours', body: body, idempotencyKey: idempotencyKey)
        as Map<String, dynamic>,
  );

  Future<TourDetail> decide(
    String id, {
    required bool approve,
    String? note,
    int? sanctionedBudget,
    String? idempotencyKey,
  }) async => TourDetail.fromJson(
    await api.post(
          '/tours/$id/decision',
          body: {
            'decision': approve ? 'APPROVE' : 'REJECT',
            if (note != null && note.isNotEmpty) 'note': note,
            'sanctionedBudget': ?sanctionedBudget,
          },
          idempotencyKey: idempotencyKey,
        )
        as Map<String, dynamic>,
  );

  /// start · complete · cancel · notes
  Future<TourDetail> step(
    String id,
    String step, {
    String? note,
    String? idempotencyKey,
  }) async => TourDetail.fromJson(
    await api.post(
          '/tours/$id/$step',
          body: {if (note != null && note.isNotEmpty) 'note': note},
          idempotencyKey: idempotencyKey,
        )
        as Map<String, dynamic>,
  );
}
