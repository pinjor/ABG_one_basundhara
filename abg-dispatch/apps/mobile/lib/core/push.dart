import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'config.dart';

/// Firebase Cloud Messaging (Android, and iOS via APNs). Stays dormant until
/// the FCM_* dart-defines are supplied for the organisation's Firebase project,
/// so the app builds and runs without Google service files.
class PushService {
  PushService(this.api);

  final ApiClient api;
  bool _ready = false;
  String? _token;
  final _opened = StreamController<String>.broadcast();

  /// In-app routes for notifications the user tapped (a parcel or a report).
  Stream<String> get openedRoute => _opened.stream;

  Future<void> initialiseAfterSignIn() async {
    if (!AppConfig.pushConfigured) return;
    try {
      if (!_ready) {
        await Firebase.initializeApp(
          options: const FirebaseOptions(
            apiKey: AppConfig.fcmApiKey,
            appId: AppConfig.fcmAppId,
            messagingSenderId: AppConfig.fcmSenderId,
            projectId: AppConfig.fcmProjectId,
          ),
        );
        _ready = true;
        FirebaseMessaging.onMessageOpenedApp.listen(_open);
        final initial = await FirebaseMessaging.instance.getInitialMessage();
        if (initial != null) _open(initial);
        // FCM hands back an installation id once registration completes, and again if it changes.
        FirebaseMessaging.instance.onRegistered.listen(
          (id) => unawaited(_register(id)),
        );
      }
      final settings = await FirebaseMessaging.instance.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      await FirebaseMessaging.instance.register();
    } catch (e) {
      debugPrint('Push unavailable: $e');
    }
  }

  void _open(RemoteMessage m) {
    final parcel = m.data['parcelId'];
    final incident = m.data['incidentId'];
    if (incident is String && incident.isNotEmpty) {
      _opened.add('/incidents/$incident');
    } else if (parcel is String && parcel.isNotEmpty) {
      _opened.add('/parcels/$parcel');
    }
  }

  Future<void> _register(String token) async {
    _token = token;
    await api.post(
      '/auth/devices',
      body: {
        'token': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS
            ? 'ios'
            : 'android',
        'appVersion': AppConfig.appVersion,
      },
    );
  }

  Future<void> unregister() async {
    final t = _token;
    if (t == null) return;
    try {
      await api.delete('/auth/devices/${Uri.encodeComponent(t)}');
      await FirebaseMessaging.instance.unregister();
    } catch (_) {}
    _token = null;
  }
}
