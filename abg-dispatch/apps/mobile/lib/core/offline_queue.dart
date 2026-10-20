import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'api_client.dart';

enum QueuedState { waiting, conflict, failed }

class QueuedAction {
  QueuedAction({
    required this.key,
    required this.parcelId,
    required this.trackingNumber,
    required this.label,
    required this.path,
    required this.body,
    required this.createdAt,
    this.state = QueuedState.waiting,
    this.message,
  });

  /// Doubles as the Idempotency-Key, so a retry can never record the event twice.
  final String key;
  final String parcelId;
  final String trackingNumber;
  final String label;
  final String path;
  final Map<String, dynamic> body;
  final DateTime createdAt;
  QueuedState state;
  String? message;

  Map<String, dynamic> toJson() => {
    'key': key,
    'parcelId': parcelId,
    'trackingNumber': trackingNumber,
    'label': label,
    'path': path,
    'body': body,
    'createdAt': createdAt.toIso8601String(),
    'state': state.name,
    'message': message,
  };

  factory QueuedAction.fromJson(Map<String, dynamic> j) => QueuedAction(
    key: j['key'] as String,
    parcelId: j['parcelId'] as String,
    trackingNumber: j['trackingNumber'] as String? ?? '',
    label: j['label'] as String? ?? '',
    path: j['path'] as String,
    body: (j['body'] as Map).cast<String, dynamic>(),
    createdAt: DateTime.parse(j['createdAt'] as String),
    state: QueuedState.values.firstWhere(
      (s) => s.name == j['state'],
      orElse: () => QueuedState.waiting,
    ),
    message: j['message'] as String?,
  );
}

enum SendOutcome { sent, queued }

/// Custody actions taken without signal (basements, factory floors, lifts).
///
/// [send] tries immediately; on a network failure it stores the action with
/// its device timestamp and idempotency key, shows "waiting to sync", and
/// replays it when connectivity returns. The server stays the authority: a
/// replay that conflicts with what happened meanwhile is kept for the user to
/// see instead of being silently dropped.
class OfflineQueue extends ChangeNotifier {
  OfflineQueue(this.api);

  final ApiClient api;
  static const _prefsKey = 'abg.offline_queue.v1';
  final _uuid = const Uuid();
  final List<QueuedAction> _items = [];
  StreamSubscription<List<ConnectivityResult>>? _sub;
  Timer? _timer;
  bool _flushing = false;
  bool online = true;

  List<QueuedAction> get items => List.unmodifiable(_items);
  int get waiting => _items.where((i) => i.state == QueuedState.waiting).length;
  List<QueuedAction> forParcel(String id) =>
      _items.where((i) => i.parcelId == id).toList();

  Future<void> start() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw != null) {
      _items
        ..clear()
        ..addAll(
          (jsonDecode(raw) as List).map(
            (e) => QueuedAction.fromJson((e as Map).cast<String, dynamic>()),
          ),
        );
    }
    try {
      _sub = Connectivity().onConnectivityChanged.listen((results) {
        final nowOnline = results.any((r) => r != ConnectivityResult.none);
        final changed = nowOnline != online;
        online = nowOnline;
        if (changed) notifyListeners();
        if (nowOnline) unawaited(flush());
      });
    } catch (_) {
      // Connectivity plugin unavailable (tests); the periodic timer still retries.
    }
    _timer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => unawaited(flush()),
    );
    notifyListeners();
    unawaited(flush());
  }

  @override
  void dispose() {
    _sub?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _prefsKey,
      jsonEncode(_items.map((i) => i.toJson()).toList()),
    );
  }

  /// Sends now, or queues on network failure. Other API errors are thrown to the caller.
  Future<(SendOutcome, dynamic)> send({
    required String parcelId,
    required String trackingNumber,
    required String label,
    required String path,
    required Map<String, dynamic> body,
  }) async {
    final key = _uuid.v4();
    final stamped = {
      ...body,
      'deviceTimestamp': DateTime.now().toUtc().toIso8601String(),
    };
    try {
      final res = await api.post(path, body: stamped, idempotencyKey: key);
      if (!online) {
        online = true;
        notifyListeners();
      }
      return (SendOutcome.sent, res);
    } on ApiException catch (e) {
      if (!e.isNetwork) rethrow;
      online = false;
      _items.add(
        QueuedAction(
          key: key,
          parcelId: parcelId,
          trackingNumber: trackingNumber,
          label: label,
          path: path,
          body: stamped,
          createdAt: DateTime.now(),
        ),
      );
      await _persist();
      notifyListeners();
      return (SendOutcome.queued, null);
    }
  }

  Future<void> flush() async {
    if (_flushing || _items.every((i) => i.state != QueuedState.waiting)) {
      return;
    }
    _flushing = true;
    try {
      for (final item
          in _items.where((i) => i.state == QueuedState.waiting).toList()) {
        try {
          await api.post(item.path, body: item.body, idempotencyKey: item.key);
          _items.remove(item);
          online = true;
        } on ApiException catch (e) {
          if (e.isNetwork) {
            online = false;
            break;
          }
          item.state = e.isConflict ? QueuedState.conflict : QueuedState.failed;
          item.message = e.message;
        }
        await _persist();
        notifyListeners();
      }
    } finally {
      _flushing = false;
    }
  }

  Future<void> dismiss(QueuedAction item) async {
    _items.remove(item);
    await _persist();
    notifyListeners();
  }

  Future<void> clear() async {
    _items.clear();
    await _persist();
    notifyListeners();
  }
}
