import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

class ApiClient {
  /// Supplied by [AuthState]. Exchanges the stored refresh token for a new
  /// access token, returning null when the session can no longer be renewed.
  ///
  /// Static because every screen constructs its own [ApiClient]; the hook needs
  /// to be shared across all of them.
  static Future<String?> Function()? onUnauthorized;

  static Future<String?>? _inFlightRefresh;

  /// Collapses concurrent refreshes onto one request, so a screen firing
  /// several calls at once doesn't trip the auth rate limit.
  static Future<String?> _refreshToken() {
    final handler = onUnauthorized;
    if (handler == null) return Future<String?>.value(null);
    return _inFlightRefresh ??= handler().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<dynamic> get(String path, {String? token}) =>
      _request('GET', path, token: token);

  Future<dynamic> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) => _request('POST', path, body: body, token: token);

  Future<dynamic> put(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) => _request('PUT', path, body: body, token: token);

  Future<dynamic> patch(
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) => _request('PATCH', path, body: body, token: token);

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    var response = await _send(method, path, body: body, token: token);

    // The access token only lasts ~15 minutes. On a 401 for an authenticated
    // call, renew it once and replay the request; without this every screen
    // starts failing as soon as the token expires.
    if (response.statusCode == 401 && token != null) {
      final renewed = await _refreshToken();
      if (renewed != null) {
        response = await _send(method, path, body: body, token: renewed);
      }
    }

    final decoded = response.body.isNotEmpty ? jsonDecode(response.body) : null;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message =
          decoded is Map<String, dynamic> ? decoded['message'] : null;
      if (message is List) {
        throw ApiException(message.join(', '));
      }
      throw ApiException(
        message?.toString() ?? 'Request failed (${response.statusCode})',
      );
    }

    return decoded;
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final encodedBody = body != null ? jsonEncode(body) : null;

    switch (method) {
      case 'GET':
        return http.get(uri, headers: headers);
      case 'POST':
        return http.post(uri, headers: headers, body: encodedBody);
      case 'PUT':
        return http.put(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        return http.patch(uri, headers: headers, body: encodedBody);
      default:
        throw ApiException('Unsupported method $method');
    }
  }
}
