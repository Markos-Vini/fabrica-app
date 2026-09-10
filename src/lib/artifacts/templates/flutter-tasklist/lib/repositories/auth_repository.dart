import '../core/api/api_client.dart';
import '../core/api/api_exception.dart';
import '../core/config/app_config.dart';
import '../core/demo/demo_store.dart';
import '../core/storage/token_storage.dart';
import '../models/task.dart';

class AuthRepository {
  AuthRepository(this._api, this._tokenStorage);

  final ApiClient _api;
  final TokenStorage _tokenStorage;

  Future<User> register({
    required String email,
    required String password,
    required String name,
  }) async {
    if (AppConfig.demoMode) {
      await _tokenStorage.saveToken('demo-token');
      return User(
        id: DemoStore.demoUser.id,
        email: email,
        name: name,
      );
    }
    final data = await _api.post<Map<String, dynamic>>(
      '/auth/register',
      data: {'email': email, 'password': password, 'name': name},
    );
    await _persistAuth(data!);
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User> login({
    required String email,
    required String password,
  }) async {
    if (AppConfig.demoMode) {
      await _tokenStorage.saveToken('demo-token');
      return User(
        id: DemoStore.demoUser.id,
        email: email,
        name: DemoStore.demoUser.name,
      );
    }
    final data = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    await _persistAuth(data!);
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User?> getProfile() async {
    if (AppConfig.demoMode && await _tokenStorage.hasToken()) {
      return DemoStore.demoUser;
    }
    if (!await _tokenStorage.hasToken()) return null;
    try {
      final data = await _api.get<Map<String, dynamic>>('/auth/me');
      return User.fromJson(data!);
    } on ApiException catch (e) {
      if (e.statusCode == 401) return null;
      rethrow;
    }
  }

  Future<void> logout() => _tokenStorage.clearToken();

  Future<bool> isLoggedIn() => _tokenStorage.hasToken();

  Future<void> _persistAuth(Map<String, dynamic> data) async {
    final token = data['accessToken'] as String;
    await _tokenStorage.saveToken(token);
  }
}
