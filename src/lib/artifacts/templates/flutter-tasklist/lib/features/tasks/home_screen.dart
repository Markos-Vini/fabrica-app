import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../models/task.dart';
import '../../providers/tasks_provider.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/network_error_banner.dart';
import '../../shared/widgets/sync_status_indicator.dart';
import '../../shared/widgets/task_list_item.dart';
import 'filters_sheet.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _completingIds = <String>{};

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(tasksProvider.notifier).load());
  }

  Future<void> _completeTask(String id) async {
    setState(() => _completingIds.add(id));
    try {
      await ref.read(tasksProvider.notifier).completeTask(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _completingIds.remove(id));
    }
  }

  Future<void> _showFilters() async {
    final filters = ref.read(tasksProvider).filters;
    final result = await showModalBottomSheet<TaskFilters>(
      context: context,
      isScrollControlled: true,
      builder: (_) => FiltersSheet(initial: filters),
    );
    if (result != null) {
      await ref.read(tasksProvider.notifier).applyFilters(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(tasksProvider);
    final tasks = state.sortedTasks;
    final pending = tasks.where((t) => !t.isCompleted).toList();
    final completed = tasks.where((t) => t.isCompleted).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Tarefas'),
        actions: [
          const SyncStatusIndicator(),
          const SizedBox(width: 8),
          IconButton(
            icon: Badge(
              isLabelVisible: state.filters.hasActiveFilters,
              child: const Icon(Icons.filter_list),
            ),
            onPressed: _showFilters,
            tooltip: 'Filtros',
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          if (AppConfig.demoMode)
            MaterialBanner(
              content: const Text(
                'Modo demo — tarefas locais. Conecte a API para sincronizar.',
              ),
              leading: const Icon(Icons.info_outline),
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              actions: const [SizedBox.shrink()],
            ),
          const NetworkErrorBanner(),
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : tasks.isEmpty
                    ? EmptyState(
                        title: 'Nenhuma tarefa',
                        subtitle: 'Crie sua primeira tarefa para começar',
                        actionLabel: 'Criar tarefa',
                        onAction: () => context.push('/task/new'),
                      )
                    : RefreshIndicator(
                        onRefresh: () =>
                            ref.read(tasksProvider.notifier).load(refresh: true),
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            if (pending.isNotEmpty) ...[
                              _SectionHeader(title: 'Pendentes (${pending.length})'),
                              ...pending.map(
                                (task) => TaskListItem(
                                  task: task,
                                  isCompleting: _completingIds.contains(task.id),
                                  onTap: () => context.push('/task/${task.id}'),
                                  onComplete: () => _completeTask(task.id),
                                ),
                              ),
                            ],
                            if (completed.isNotEmpty) ...[
                              _SectionHeader(
                                title: 'Concluídas (${completed.length})',
                              ),
                              ...completed.map(
                                (task) => TaskListItem(
                                  task: task,
                                  onTap: () => context.push('/task/${task.id}'),
                                  onComplete: () {},
                                ),
                              ),
                            ],
                            const SizedBox(height: 80),
                          ],
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/task/new'),
        icon: const Icon(Icons.add),
        label: const Text('Nova'),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}
