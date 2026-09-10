import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/utils/date_utils.dart';
import '../../models/task.dart';
import '../../providers/tasks_provider.dart';
import '../../shared/widgets/category_chip.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/priority_badge.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  const TaskDetailScreen({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  bool _isLoading = false;

  Task? _findTask() {
    final tasks = ref.read(tasksProvider).tasks;
    try {
      return tasks.firstWhere((t) => t.id == widget.taskId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _complete() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(tasksProvider.notifier).completeTask(widget.taskId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tarefa concluída')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Excluir tarefa',
      message: 'Deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    );
    if (!confirmed) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(tasksProvider.notifier).deleteTask(widget.taskId);
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tarefa excluída')),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = _findTask();

    if (task == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detalhe')),
        body: const Center(child: Text('Tarefa não encontrada')),
      );
    }

    final dueDate = parseDateOnly(task.dueDate);
    final dueLabel = dueDate != null
        ? DateFormat('dd/MM/yyyy').format(dueDate)
        : task.dueDate;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhe'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push('/task/${task.id}/edit'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  task.title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    PriorityBadge(priority: task.priority),
                    const SizedBox(width: 8),
                    if (task.categoryName != null)
                      CategoryChip(name: task.categoryName!),
                  ],
                ),
                const SizedBox(height: 16),
                _InfoRow(
                  icon: Icons.event,
                  label: 'Vencimento',
                  value: dueLabel,
                ),
                _InfoRow(
                  icon: Icons.flag,
                  label: 'Status',
                  value: task.isCompleted ? 'Concluída' : 'Pendente',
                ),
                if (task.description != null && task.description!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Descrição',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 8),
                        Text(task.description!),
                      ],
                    ),
                  ),
                if (task.completedAt != null)
                  _InfoRow(
                    icon: Icons.check_circle,
                    label: 'Concluída em',
                    value: DateFormat('dd/MM/yyyy HH:mm')
                        .format(task.completedAt!.toLocal()),
                  ),
                const SizedBox(height: 32),
                if (!task.isCompleted)
                  FilledButton.icon(
                    onPressed: _complete,
                    icon: const Icon(Icons.check),
                    label: const Text('Concluir tarefa'),
                  ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _delete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Excluir tarefa'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Theme.of(context).colorScheme.outline),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              Text(value, style: Theme.of(context).textTheme.bodyLarge),
            ],
          ),
        ],
      ),
    );
  }
}
