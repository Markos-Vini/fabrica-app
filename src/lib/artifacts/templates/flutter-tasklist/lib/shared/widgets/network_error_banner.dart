import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/tasks_provider.dart';

class NetworkErrorBanner extends ConsumerWidget {
  const NetworkErrorBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksState = ref.watch(tasksProvider);
    if (!tasksState.networkError || tasksState.error == null) {
      return const SizedBox.shrink();
    }

    return MaterialBanner(
      backgroundColor: Theme.of(context).colorScheme.errorContainer,
      content: Text(
        tasksState.error!,
        style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      actions: [
        TextButton(
          onPressed: () => ref.read(tasksProvider.notifier).retryPending(),
          child: const Text('Tentar novamente'),
        ),
        IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(tasksProvider.notifier).clearError();
          },
        ),
      ],
    );
  }
}
