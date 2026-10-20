import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

/// An API failure with the server's stable `code` and a sentence for people.
class ApiException implements Exception {
  ApiException(this.status, this.code, this.message, {this.details});

  final int status;
  final String code;
  final String message;
  final Map<String, dynamic>? details;

  /// No response at all: the action can be queued and retried later.
  bool get isNetwork => status == 0;
  bool get isConflict => status == 409;

  @override
  String toString() => message;
}

typedef TokenProvider = Future<String?> Function();

class UploadFile {
  const UploadFile(this.bytes, this.filename);
  final List<int> bytes;
  final String filename;
}

/// Absolute URL for a path the API returned (signed photo links start with /api).
String apiUrl(String path) => path.startsWith('http')
    ? path
    : Uri.parse(AppConfig.apiBaseUrl).resolve(path).toString();
typedef TokenRefresher = Future<bool> Function();

/// Thin JSON client. Adds the bearer token, refreshes it once on expiry,
/// and turns every failure into an [ApiException].
class ApiClient {
  ApiClient({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;
  TokenProvider? tokenProvider;
  TokenRefresher? refresher;
  void Function()? onSessionEnded;
  String locale = 'en';

  static const _timeout = Duration(seconds: 20);

  Uri _uri(String path, [Map<String, String?>? query]) {
    final q = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && v.isNotEmpty) q[k] = v;
    });
    return Uri.parse(
      '${AppConfig.apiBaseUrl}$path',
    ).replace(queryParameters: q.isEmpty ? null : q);
  }

  Future<dynamic> get(String path, {Map<String, String?>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, {Object? body, String? idempotencyKey}) =>
      _send(
        'POST',
        path,
        body: body ?? const {},
        idempotencyKey: idempotencyKey,
      );

  Future<dynamic> put(String path, {Object? body}) =>
      _send('PUT', path, body: body ?? const {});

  Future<dynamic> patch(String path, {Object? body}) =>
      _send('PATCH', path, body: body ?? const {});

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> upload(
    String path, {
    required List<int> bytes,
    required String filename,
    required Map<String, String> fields,
    String fileField = 'file',
  }) => uploadMany(
    path,
    files: [UploadFile(bytes, filename)],
    fileField: fileField,
    fields: fields,
  );

  /// Multipart POST with any number of files under one field name.
  Future<dynamic> uploadMany(
    String path, {
    required List<UploadFile> files,
    required String fileField,
    required Map<String, String> fields,
    String? idempotencyKey,
  }) async {
    final req = http.MultipartRequest('POST', _uri(path));
    final token = await tokenProvider?.call();
    if (token != null) req.headers['authorization'] = 'Bearer $token';
    req.headers['accept-language'] = locale;
    if (idempotencyKey != null) req.headers['idempotency-key'] = idempotencyKey;
    req.fields.addAll(fields);
    for (final f in files) {
      req.files.add(
        http.MultipartFile.fromBytes(fileField, f.bytes, filename: f.filename),
      );
    }
    try {
      final streamed = await _http
          .send(req)
          .timeout(const Duration(seconds: 60));
      return _decode(await http.Response.fromStream(streamed));
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(0, 'NETWORK', 'network');
    }
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, String?>? query,
    Object? body,
    String? idempotencyKey,
    bool retried = false,
  }) async {
    final headers = <String, String>{
      'accept': 'application/json',
      'accept-language': locale,
    };
    final token = await tokenProvider?.call();
    if (token != null) headers['authorization'] = 'Bearer $token';
    if (body != null) headers['content-type'] = 'application/json';
    if (idempotencyKey != null) headers['idempotency-key'] = idempotencyKey;
    final req = http.Request(method, _uri(path, query))
      ..headers.addAll(headers);
    if (body != null) req.body = jsonEncode(body);

    http.Response res;
    try {
      res = await http.Response.fromStream(
        await _http.send(req).timeout(_timeout),
      );
    } catch (_) {
      throw ApiException(0, 'NETWORK', 'network');
    }
    if (res.statusCode == 401 && !retried && token != null) {
      final code = _codeOf(res);
      if (code == 'TOKEN_EXPIRED' && refresher != null && await refresher!()) {
        return _send(
          method,
          path,
          query: query,
          body: body,
          idempotencyKey: idempotencyKey,
          retried: true,
        );
      }
      if (code == 'TOKEN_EXPIRED' || code == 'SESSION_REVOKED') {
        onSessionEnded?.call();
      }
    }
    return _decode(res);
  }

  String? _codeOf(http.Response res) {
    try {
      return (jsonDecode(res.body) as Map<String, dynamic>)['code'] as String?;
    } catch (_) {
      return null;
    }
  }

  dynamic _decode(http.Response res) {
    final text = utf8.decode(res.bodyBytes);
    dynamic json;
    if (text.isNotEmpty) {
      try {
        json = jsonDecode(text);
      } catch (_) {
        json = text;
      }
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return json;
    final map = json is Map<String, dynamic> ? json : <String, dynamic>{};
    final message = map['message'];
    throw ApiException(
      res.statusCode,
      (map['code'] as String?) ?? 'HTTP_${res.statusCode}',
      message is List
          ? message.join('\n')
          : (message as String?) ?? 'Request failed (${res.statusCode})',
      details: map['details'] as Map<String, dynamic>?,
    );
  }
}
