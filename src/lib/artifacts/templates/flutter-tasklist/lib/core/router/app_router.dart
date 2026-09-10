import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/tasks/home_screen.dart';
import '../../features/tasks/task_detail_screen.dart';
import '../../features/tasks/task_form_screen.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final isAuth = auth.status == AuthStatus.authenticated;
      final isLoading = auth.status == AuthStatus.unknown || auth.isLoading;
      final loc = state.matchedLocation;

      final publicRoutes = ['/', '/login', '/register'];
      final isPublic = publicRoutes.contains(loc);

      if (isLoading && loc != '/') return '/';

      if (!isAuth && !isPublic) return '/login';
      if (isAuth && (loc == '/login' || loc == '/register')) return '/home';

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(
        path: '/task/new',
        builder: (_, __) => const TaskFormScreen(),
      ),
      GoRoute(
        path: '/task/:id',
        builder: (_, state) => TaskDetailScreen(
          taskId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/task/:id/edit',
        builder: (_, state) => TaskFormScreen(
          taskId: state.pathParameters['id'],
        ),
      ),
    ],
  );
});

/// Notifica GoRouter quando auth muda.
class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this._ref) {
    _ref.listen(authProvider, (_, __) => notifyListeners());
    _ref.listen(unauthorizedProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}
