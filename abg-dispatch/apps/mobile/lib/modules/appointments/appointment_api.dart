import '../../core/api_client.dart';
import '../../widgets/module_kit.dart';
import '../tours/tour_models.dart' show isoDay;
import 'appointment_models.dart';

/// Every appointments call the app makes. Screens never build URLs themselves.
class AppointmentsApi {
  AppointmentsApi(this.api);

  final ApiClient api;

  AppointmentPage _page(dynamic raw) {
    final res = raw as Map<String, dynamic>;
    return AppointmentPage(
      jList(res['items']).map(AppointmentRow.fromJson).toList(),
      jStr(res['nextCursor']),
    );
  }

  Future<AppointmentPage> mine({String state = 'all', String? cursor}) async =>
      _page(
        await api.get(
          '/appointments/mine',
          query: {'state': state, 'cursor': cursor, 'limit': '25'},
        ),
      );

  /// Requests waiting for my side to answer.
  Future<List<AppointmentRow>> inbox() async =>
      _page(await api.get('/appointments/inbox')).items;

  /// My side's meetings (confirmed, proposed, held and still-pending) between two days.
  Future<List<AppointmentRow>> diary(DateTime from, DateTime to) async {
    final res =
        await api.get(
              '/appointments/diary',
              query: {'from': isoDay(from), 'to': isoDay(to)},
            )
            as Map<String, dynamic>;
    return jList(res['items']).map(AppointmentRow.fromJson).toList();
  }

  Future<List<AppointmentHost>> hosts([String? q]) async {
    final res =
        await api.get('/appointments/hosts', query: {'q': q})
            as Map<String, dynamic>;
    return jList(res['items']).map(AppointmentHost.fromJson).toList();
  }

  Future<AppointmentDetail> get(String id) async => AppointmentDetail.fromJson(
    await api.get('/appointments/$id') as Map<String, dynamic>,
  );

  Future<AppointmentDetail> create(
    Map<String, dynamic> body,
    String key,
  ) async => AppointmentDetail.fromJson(
    await api.post('/appointments', body: body, idempotencyKey: key)
        as Map<String, dynamic>,
  );

  /// confirm · propose · accept · decline · cancel · complete · notes
  Future<AppointmentDetail> step(
    String id,
    String step, {
    DateTime? at,
    String? location,
    String? note,
    String? idempotencyKey,
  }) async => AppointmentDetail.fromJson(
    await api.post(
          '/appointments/$id/$step',
          body: {
            if (at != null) 'at': at.toUtc().toIso8601String(),
            if (location != null && location.isNotEmpty) 'location': location,
            if (note != null && note.isNotEmpty) 'note': note,
          },
          idempotencyKey: idempotencyKey,
        )
        as Map<String, dynamic>,
  );
}
