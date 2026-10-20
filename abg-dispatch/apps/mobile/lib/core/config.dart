import 'package:flutter/foundation.dart';

/// Build-time configuration, passed with --dart-define:
///
///   flutter run --dart-define=API_BASE_URL=https://dispatch-api.abg.com.bd/api
///
/// Without it the app talks to a local development API: the same origin on web,
/// the host machine from the Android emulator, localhost on the iOS simulator.
abstract final class AppConfig {
  static const _apiBase = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_apiBase.isNotEmpty) return _apiBase;
    if (kIsWeb) return '${Uri.base.origin}/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:18491/api';
    }
    return 'http://localhost:18491/api';
  }

  static const appVersion = '1.0.0';

  // Firebase Cloud Messaging. Push stays off until these are provided.
  static const fcmApiKey = String.fromEnvironment('FCM_API_KEY');
  static const fcmAppId = String.fromEnvironment('FCM_APP_ID');
  static const fcmSenderId = String.fromEnvironment('FCM_SENDER_ID');
  static const fcmProjectId = String.fromEnvironment('FCM_PROJECT_ID');
  static bool get pushConfigured =>
      !kIsWeb &&
      fcmApiKey.isNotEmpty &&
      fcmAppId.isNotEmpty &&
      fcmSenderId.isNotEmpty &&
      fcmProjectId.isNotEmpty;
}
