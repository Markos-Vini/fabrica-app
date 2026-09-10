import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/task.dart';
import '../core/config/app_config.dart';
import '../core/demo/demo_store.dart';
import '../repositories/auth_repository.dart';
import 'providers.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.error,
    this.isLoading = false,
  });

  final AuthStatus status;
  final User? user;
  final String? error;
  final bool isLoading;

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    bool? isLoading,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      error: clearError ? null : (error ?? this.error),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._ref) : super(const AuthState()) {
    _init();
    _ref.listen<int>(unauthorizedProvider, (_, __) {
      logout();
    });
  }

  final Ref _ref;
  AuthRepository get _auth => _ref.read(authRepositoryProvider);

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    try {
      if (AppConfig.demoMode) {
        await _auth.login(
          email: DemoStore.demoUser.email,
          password: 'demo',
        );
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: DemoStore.demoUser,
          isLoading: false,
        );
        return;
      }
      final loggedIn = await _auth.isLoggedIn();
      if (!loggedIn) {
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          isLoading: false,
        );
        return;
      }
      final user = await _auth.getProfile();
      if (user == null) {
        await _auth.logout();
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          isLoading: false,
        );
        return;
      }
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
      await _startSync();
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _auth.login(email: email, password: password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
      await _startSync();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  Future<void> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _auth.register(
        name: name,
        email: email,
        password: password,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
      await _startSync();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  Future<void> logout() async {
    _ref.read(syncServiceProvider).disconnect();
    await _auth.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> refreshProfile() async {
    final user = await _auth.getProfile();
    if (user != null) {
      state = state.copyWith(user: user);
    }
  }

  Future<void> _startSync() async {
    final token = await _ref.read(tokenStorageProvider).readToken();
    if (token != null) {
      _ref.read(syncServiceProvider).connect(token);
    }
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
