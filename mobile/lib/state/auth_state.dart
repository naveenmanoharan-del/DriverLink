import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_client.dart';

class AuthState extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  static const _storageKey = 'manpower_session';

  AuthState() {
    // Let every ApiClient renew this session when its access token expires.
    ApiClient.onUnauthorized = _refreshAccessToken;
  }

  String? accessToken;
  String? refreshToken;
  AppUser? user;
  Map<String, dynamic>? profileJson;
  bool loading = true;

  WorkerProfile? get workerProfile =>
      user?.role == 'worker' && profileJson != null
          ? WorkerProfile.fromJson(profileJson!)
          : null;

  ClientProfile? get clientProfile =>
      user?.role == 'client' && profileJson != null
          ? ClientProfile.fromJson(profileJson!)
          : null;

  bool get isAuthenticated => accessToken != null && user != null;

  Future<void> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw != null) {
      try {
        final data = jsonDecode(raw) as Map<String, dynamic>;
        accessToken = data['accessToken'] as String?;
        refreshToken = data['refreshToken'] as String?;
        user =
            data['user'] != null
                ? AppUser.fromJson(data['user'] as Map<String, dynamic>)
                : null;
        profileJson = data['profile'] as Map<String, dynamic>?;
      } catch (_) {
        await prefs.remove(_storageKey);
      }
    }
    loading = false;
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode({
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'user': user?.toJson(),
        'profile': profileJson,
      }),
    );
  }

  void _applySession(Map<String, dynamic> result) {
    accessToken = result['accessToken'] as String;
    refreshToken = result['refreshToken'] as String;
    user = AppUser.fromJson(result['user'] as Map<String, dynamic>);
    profileJson = result['profile'] as Map<String, dynamic>?;
    notifyListeners();
    _persist();
  }

  Future<void> login(String phone, String password) async {
    final result = await _api.post(
      '/v1/auth/login',
      body: {'phone': phone, 'password': password},
    );
    _applySession(result as Map<String, dynamic>);
  }

  Future<void> registerWorker(Map<String, dynamic> dto) async {
    final result = await _api.post('/v1/auth/register/worker', body: dto);
    _applySession(result as Map<String, dynamic>);
  }

  Future<void> registerClient(Map<String, dynamic> dto) async {
    final result = await _api.post('/v1/auth/register/client', body: dto);
    _applySession(result as Map<String, dynamic>);
  }

  /// Re-fetches the signed-in user's profile.
  ///
  /// The session caches the profile from login time, so worker rating and
  /// completed-job counts (and any edit made on the website) would otherwise
  /// never change on screen. Failures are swallowed: the cached profile stays
  /// on display rather than blanking the dashboard.
  Future<void> refreshProfile() async {
    if (accessToken == null) return;
    try {
      final result =
          await _api.get('/v1/auth/me', token: accessToken)
              as Map<String, dynamic>;
      user = AppUser.fromJson(result['user'] as Map<String, dynamic>);
      profileJson = result['profile'] as Map<String, dynamic>?;
      await _persist();
      notifyListeners();
    } on ApiException {
      // Keep the cached profile.
    }
  }

  /// Exchanges the refresh token for a fresh access token. Returns null (and
  /// clears the session) when the refresh token itself is no longer valid, so
  /// the user is routed back to login instead of looping on failed requests.
  Future<String?> _refreshAccessToken() async {
    final currentRefresh = refreshToken;
    if (currentRefresh == null) return null;
    try {
      final result =
          await _api.post(
                '/v1/auth/refresh',
                body: {'refreshToken': currentRefresh},
              )
              as Map<String, dynamic>;
      accessToken = result['accessToken'] as String;
      refreshToken = result['refreshToken'] as String;
      await _persist();
      notifyListeners();
      return accessToken;
    } on ApiException {
      await logout();
      return null;
    }
  }

  Future<void> logout() async {
    final token = refreshToken;

    // Clear locally first so signing out never appears to hang on the network.
    accessToken = null;
    refreshToken = null;
    user = null;
    profileJson = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
    notifyListeners();

    // Then revoke server-side so the refresh token can't be reused for the
    // rest of its 7-day life. A failure here must not block signing out.
    if (token != null) {
      try {
        await _api.post('/v1/auth/logout', body: {'refreshToken': token});
      } on ApiException {
        // Already revoked, or offline — the local session is gone either way.
      }
    }
  }
}
