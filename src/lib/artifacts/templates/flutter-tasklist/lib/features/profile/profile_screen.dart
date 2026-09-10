import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CircleAvatar(
                    radius: 40,
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 32),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ListTile(
                    leading: const Icon(Icons.person),
                    title: const Text('Nome'),
                    subtitle: Text(user.name),
                  ),
                  ListTile(
                    leading: const Icon(Icons.email),
                    title: const Text('E-mail'),
                    subtitle: Text(user.email),
                  ),
                  if (user.createdAt != null)
                    ListTile(
                      leading: const Icon(Icons.calendar_today),
                      title: const Text('Membro desde'),
                      subtitle: Text(
                        '${user.createdAt!.day.toString().padLeft(2, '0')}/'
                        '${user.createdAt!.month.toString().padLeft(2, '0')}/'
                        '${user.createdAt!.year}',
                      ),
                    ),
                  const Spacer(),
                  FilledButton.tonalIcon(
                    onPressed: () async {
                      await ref.read(authProvider.notifier).logout();
                      if (context.mounted) context.go('/login');
                    },
                    icon: const Icon(Icons.logout),
                    label: const Text('Sair'),
                  ),
                ],
              ),
            ),
    );
  }
}
