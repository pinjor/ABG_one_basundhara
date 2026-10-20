import 'dart:async';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/models.dart';

class PageOf<T> {
  PageOf(this.items, this.nextCursor);
  final List<T> items;
  final String? nextCursor;
}

/// Every call the app makes. Screens never build URLs themselves.
class DispatchRepository {
  DispatchRepository(this.api);

  final ApiClient api;

  Future<ParcelSummary> summary() async =>
      ParcelSummary.fromJson(await api.get('/parcels/summary') as Json);

  Future<PageOf<ParcelRow>> parcels({
    String box = 'ALL',
    String? q,
    String? cursor,
    int limit = 25,
    String? view,
  }) async {
    final res =
        await api.get(
              '/parcels',
              query: {
                'box': box,
                'q': q,
                'cursor': cursor,
                'limit': '$limit',
                'view': view,
              },
            )
            as Json;
    return PageOf(
      (res['items'] as List).cast<Json>().map(ParcelRow.fromJson).toList(),
      res['nextCursor'] as String?,
    );
  }

  Future<ParcelDetail> parcel(String id) async =>
      ParcelDetail(await api.get('/parcels/$id') as Json);

  Future<Timeline> timeline(String id) async =>
      Timeline.fromJson(await api.get('/parcels/$id/timeline') as Json);

  Future<({ParcelDetail parcel, String? suggestedAction, bool scannedLabel})>
  scan(String payload) async {
    final res =
        await api.post('/parcels/scan', body: {'payload': payload}) as Json;
    return (
      parcel: ParcelDetail(res['parcel'] as Json),
      suggestedAction: res['suggestedAction'] as String?,
      scannedLabel: res['scannedLabel'] == true,
    );
  }

  Future<Json> create(Json body, String idempotencyKey) async =>
      await api.post('/parcels', body: body, idempotencyKey: idempotencyKey)
          as Json;

  Future<Json> post(String path, [Json body = const {}]) async =>
      await api.post(path, body: body) as Json;

  Future<List<DirectoryEmployee>> employees(String q) async =>
      ((await api.get('/directory/employees', query: {'q': q})) as List)
          .cast<Json>()
          .map(DirectoryEmployee.new)
          .toList();

  Future<List<Option>> branches() async =>
      ((await api.get('/directory/branches')) as List)
          .cast<Json>()
          .map(
            (b) => Option(
              b['id'] as String,
              b['name'] as String,
              subtitle: b['city'] as String?,
              code: b['code'] as String?,
            ),
          )
          .toList();

  Future<List<Option>> departments() async =>
      ((await api.get('/directory/departments')) as List)
          .cast<Json>()
          .map(
            (d) => Option(
              d['id'] as String,
              d['name'] as String,
              subtitle: (d['branch'] as Json?)?['name'] as String?,
              code: d['code'] as String?,
            ),
          )
          .toList();

  Future<List<Option>> categories() async =>
      ((await api.get('/directory/categories')) as List)
          .cast<Json>()
          .map(
            (c) => Option(
              c['id'] as String,
              c['name'] as String,
              code: c['code'] as String?,
            ),
          )
          .toList();

  Future<List<Option>> providers() async =>
      ((await api.get('/directory/courier-providers')) as List)
          .cast<Json>()
          .map(
            (p) => Option(
              p['id'] as String,
              p['name'] as String,
              code: p['code'] as String?,
            ),
          )
          .toList();

  Future<List<Option>> locations(String branchId) async =>
      ((await api.get('/directory/locations', query: {'branchId': branchId}))
              as List)
          .cast<Json>()
          .map(
            (l) => Option(
              l['id'] as String,
              l['name'] as String,
              subtitle: l['path'] as String?,
            ),
          )
          .toList();

  Future<PageOf<AppNotification>> notifications({
    String? category,
    String? cursor,
  }) async {
    final res =
        await api.get(
              '/notifications',
              query: {'category': category, 'cursor': cursor, 'limit': '40'},
            )
            as Json;
    return PageOf(
      (res['items'] as List)
          .cast<Json>()
          .map(AppNotification.fromJson)
          .toList(),
      res['nextCursor'] as String?,
    );
  }

  Future<Json> unreadCount() async =>
      await api.get('/notifications/unread-count') as Json;
  Future<void> markRead(String id) async => api.post('/notifications/$id/read');
  Future<void> markAllRead() async => api.post('/notifications/read-all');
  Future<List<Json>> preferences() async =>
      ((await api.get('/notifications/preferences')) as List).cast<Json>();
  Future<void> setPreference(String channel, bool enabled) async => api.put(
    '/notifications/preferences',
    body: {'channel': channel, 'enabled': enabled},
  );
  Future<List<Json>> sessions() async =>
      ((await api.get('/auth/sessions')) as List).cast<Json>();
  Future<void> revokeSession(String id) async =>
      api.delete('/auth/sessions/$id');

  Future<Json> uploadEvidence(
    String parcelId, {
    required List<int> bytes,
    required String filename,
    required String kind,
  }) async =>
      await api.upload(
            '/parcels/$parcelId/attachments',
            bytes: bytes,
            filename: filename,
            fields: {'kind': kind},
          )
          as Json;
}

/// Unread badge for the Alerts tab. Polls gently while the app is open.
class NotificationBadge extends ChangeNotifier {
  NotificationBadge(this.repo);

  final DispatchRepository repo;
  int total = 0;
  int actionRequired = 0;
  Timer? _timer;

  void start() {
    _timer?.cancel();
    unawaited(refresh());
    _timer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => unawaited(refresh()),
    );
  }

  void stop() {
    _timer?.cancel();
    total = 0;
    actionRequired = 0;
    notifyListeners();
  }

  Future<void> refresh() async {
    try {
      final res = await repo.unreadCount();
      total = (res['total'] as num?)?.toInt() ?? 0;
      actionRequired =
          ((res['byCategory'] as Json?)?['ACTION_REQUIRED'] as num?)?.toInt() ??
          0;
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
