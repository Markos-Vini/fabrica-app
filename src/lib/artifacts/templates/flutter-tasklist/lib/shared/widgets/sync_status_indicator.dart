import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/sync/sync_service.dart';
import '../../providers/tasks_provider.dart';

class SyncStatusIndicator extends ConsumerWidget {
  const SyncStatusIndicator({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncAsync = ref.watch(syncConnectionProvider);
    final state = syncAsync.valueOrNull ?? SyncConnectionState.disconnected;

    if (state == SyncConnectionState.connected) {
      return const Tooltip(
        message: 'Sincronizado',
        child: Icon(Icons.cloud_done_outlined, size: 20),
      );
    }

    final label = switch (state) {
      SyncConnectionState.connecting => 'Conectando…',
      SyncConnectionState.reconnecting => 'Reconectando…',
      _ => 'Desconectado',
    };

    return Tooltip(
      message: label,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (state == SyncConnectionState.reconnecting ||
              state == SyncConnectionState.connecting)
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Icon(
              Icons.cloud_off_outlined,
              size: 20,
              color: Theme.of(context).colorScheme.error,
            ),
        ],
      ),
    );
  }
}
