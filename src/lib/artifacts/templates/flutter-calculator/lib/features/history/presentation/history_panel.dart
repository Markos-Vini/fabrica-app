import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/history_repository.dart';

class HistoryPanel extends StatelessWidget {
  const HistoryPanel({
    super.key,
    required this.entries,
    required this.onClear,
  });

  final List<HistoryEntry> entries;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final timeFormat = DateFormat.Hm('pt_BR');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Histórico',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (entries.isNotEmpty)
                TextButton(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Limpar histórico'),
                        content: const Text(
                          'Deseja limpar todo o histórico de operações?',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancelar'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Limpar'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) onClear();
                  },
                  child: const Text('Limpar hist.'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (entries.isEmpty)
            Text(
              'Nenhuma operação ainda.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: entries.length,
                separatorBuilder: (_, __) => Divider(
                  color: theme.colorScheme.outlineVariant,
                  height: 1,
                ),
                itemBuilder: (context, index) {
                  final entry = entries[index];
                  DateTime? time;
                  try {
                    time = DateTime.parse(entry.timestamp).toLocal();
                  } catch (_) {}

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${entry.expression} =',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        Text(
                          entry.result,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (time != null)
                          Text(
                            timeFormat.format(time),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
