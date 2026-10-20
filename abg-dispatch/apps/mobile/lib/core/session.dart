import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/models.dart';
import 'api_client.dart';
import 'config.dart';

enum SessionState { restoring, signedOut, employee, guest }

class MfaRequired implements Exception {}

/// Who is signed in. Tokens live in the platform keystore (Keychain on iOS,
/// Keystore-backed encrypted prefs on Android), never in plain preferences.
class SessionController extends ChangeNotifier {
  SessionController(this.api, {FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage() {
    api.tokenProvider = () async => _accessToken;
    api.refresher = _refresh;
    api.onSessionEnded = () => unawaited(_clear());
  }

  final ApiClient api;
  final FlutterSecureStorage _storage;

  static const _kAccess = 'abg.access';
  static const _kRefresh = 'abg.refresh';
  static const _kGuest = 'abg.guest';
  static const _kKind = 'abg.kind';
  static const _kProfile = 'abg.profile';

  SessionState state = SessionState.restoring;
  Profile? profile;
  GuestProfile? guest;
  String? _accessToken;
  String? _refreshToken;
  Completer<bool>? _refreshing;

  bool get signedIn =>
      state == SessionState.employee || state == SessionState.guest;

  Future<void> restore() async {
    try {
      _accessToken = await _storage.read(key: _kAccess);
      _refreshToken = await _storage.read(key: _kRefresh);
      final kind = await _storage.read(key: _kKind);
      if (_accessToken == null) {
        state = SessionState.signedOut;
      } else if (kind == 'guest') {
        final raw = await _storage.read(key: _kGuest);
        guest = raw == null
            ? null
            : GuestProfile.fromJson(jsonDecode(raw) as Map<String, dynamic>);
        await api.get('/auth/me');
        state = SessionState.guest;
      } else {
        final me = await api.get('/auth/me') as Map<String, dynamic>;
        profile = Profile.fromJson(me);
        await _storage.write(key: _kProfile, value: jsonEncode(me));
        api.locale = profile!.locale;
        state = SessionState.employee;
      }
    } on ApiException catch (e) {
      // Offline at launch: keep the stored session and work from the cached profile.
      final kind = await _storage.read(key: _kKind);
      final cached = await _storage.read(key: _kProfile);
      if (e.isNetwork && kind == 'guest') {
        state = SessionState.guest;
      } else if (e.isNetwork && cached != null) {
        profile = Profile.fromJson(jsonDecode(cached) as Map<String, dynamic>);
        state = SessionState.employee;
      } else {
        await _clear(notify: false);
      }
    } catch (_) {
      await _clear(notify: false);
    }
    notifyListeners();
  }

  Future<void> login(String identifier, String password, {String? totp}) async {
    try {
      final res =
          await api.post(
                '/auth/login',
                body: {
                  'identifier': identifier.trim(),
                  'password': password,
                  if (totp != null && totp.isNotEmpty) 'totp': totp,
                  'platform': kIsWeb
                      ? 'web'
                      : (defaultTargetPlatform == TargetPlatform.iOS
                            ? 'ios'
                            : 'android'),
                  'deviceName': 'ABG Dispatch ${AppConfig.appVersion}',
                },
              )
              as Map<String, dynamic>;
      _accessToken = res['accessToken'] as String;
      _refreshToken = res['refreshToken'] as String;
      profile = Profile.fromJson(res['user'] as Map<String, dynamic>);
      api.locale = profile!.locale;
      await _storage.write(key: _kProfile, value: jsonEncode(res['user']));
      await _storage.write(key: _kAccess, value: _accessToken);
      await _storage.write(key: _kRefresh, value: _refreshToken);
      await _storage.write(key: _kKind, value: 'employee');
      state = SessionState.employee;
      notifyListeners();
    } on ApiException catch (e) {
      if (e.code == 'MFA_REQUIRED') throw MfaRequired();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> requestGuestCode(String phone) async =>
      await api.post('/auth/guest/request-code', body: {'phone': phone})
          as Map<String, dynamic>;

  Future<void> verifyGuest(String phone, String code) async {
    final res =
        await api.post(
              '/auth/guest/verify',
              body: {'phone': phone, 'code': code},
            )
            as Map<String, dynamic>;
    _accessToken = res['accessToken'] as String;
    _refreshToken = null;
    guest = GuestProfile.fromJson(res['guest'] as Map<String, dynamic>);
    await _storage.write(key: _kAccess, value: _accessToken);
    await _storage.write(key: _kGuest, value: jsonEncode(guest!.toJson()));
    await _storage.write(key: _kKind, value: 'guest');
    state = SessionState.guest;
    notifyListeners();
  }

  Future<void> reloadProfile() async {
    if (state != SessionState.employee) return;
    profile = Profile.fromJson(
      await api.get('/auth/me') as Map<String, dynamic>,
    );
    notifyListeners();
  }

  Future<void> setLocale(String locale) async {
    api.locale = locale;
    if (state == SessionState.employee) {
      profile = Profile.fromJson(
        await api.patch('/auth/me', body: {'locale': locale})
            as Map<String, dynamic>,
      );
    }
    notifyListeners();
  }

  Future<bool> _refresh() async {
    if (_refreshToken == null) return false;
    if (_refreshing != null) return _refreshing!.future;
    final done = _refreshing = Completer<bool>();
    try {
      final res =
          await api.post('/auth/refresh', body: {'refreshToken': _refreshToken})
              as Map<String, dynamic>;
      _accessToken = res['accessToken'] as String;
      _refreshToken = res['refreshToken'] as String;
      await _storage.write(key: _kAccess, value: _accessToken);
      await _storage.write(key: _kRefresh, value: _refreshToken);
      done.complete(true);
    } catch (_) {
      done.complete(false);
    } finally {
      _refreshing = null;
    }
    return done.future;
  }

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Signing out locally must always work, even offline.
    }
    await _clear();
  }

  Future<void> _clear({bool notify = true}) async {
    _accessToken = null;
    _refreshToken = null;
    profile = null;
    guest = null;
    for (final k in [_kAccess, _kRefresh, _kGuest, _kKind, _kProfile]) {
      await _storage.delete(key: k);
    }
    state = SessionState.signedOut;
    if (notify) notifyListeners();
  }
}
