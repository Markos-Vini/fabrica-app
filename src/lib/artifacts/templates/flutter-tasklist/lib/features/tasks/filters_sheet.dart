import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/date_utils.dart';
import '../../models/task.dart';
import '../../providers/tasks_provider.dart';

class FiltersSheet extends ConsumerStatefulWidget {
  const FiltersSheet({super.key, required this.initial});

  final TaskFilters initial;

  @override
  ConsumerState<FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<FiltersSheet> {
  TaskStatus? _status;
  TaskPriority? _priority;
  int? _categoryId;
  DateTime? _dueFrom;
  DateTime? _dueTo;

  @override
  void initState() {
    super.initState();
    _status = widget.initial.status;
    _priority = widget.initial.priority;
    _categoryId = widget.initial.categoryId;
    _dueFrom = parseDateOnly(widget.initial.dueDateFrom);
    _dueTo = parseDateOnly(widget.initial.dueDateTo);
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: (isFrom ? _dueFrom : _dueTo) ?? todayLocal(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) {
          _dueFrom = picked;
        } else {
          _dueTo = picked;
        }
      });
    }
  }

  void _apply() {
    Navigator.of(context).pop(
      TaskFilters(
        status: _status,
        priority: _priority,
        categoryId: _categoryId,
        dueDateFrom: _dueFrom != null ? formatDateOnly(_dueFrom!) : null,
        dueDateTo: _dueTo != null ? formatDateOnly(_dueTo!) : null,
      ),
    );
  }

  void _clear() {
    Navigator.of(context).pop(const TaskFilters());
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, controller) {
          return Material(
            child: ListView(
              controller: controller,
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'Filtros',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 24),
                DropdownButtonFormField<TaskStatus?>(
                  value: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('Todos')),
                    DropdownMenuItem(
                      value: TaskStatus.pending,
                      child: Text('Pendentes'),
                    ),
                    DropdownMenuItem(
                      value: TaskStatus.completed,
                      child: Text('Concluídas'),
                    ),
                  ],
                  onChanged: (v) => setState(() => _status = v),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<TaskPriority?>(
                  value: _priority,
                  decoration: const InputDecoration(labelText: 'Prioridade'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Todas')),
                    ...TaskPriority.values.map(
                      (p) => DropdownMenuItem(
                        value: p,
                        child: Text(p.label),
                      ),
                    ),
                  ],
                  onChanged: (v) => setState(() => _priority = v),
                ),
                const SizedBox(height: 16),
                categoriesAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (_, __) => const Text('Erro ao carregar categorias'),
                  data: (categories) => DropdownButtonFormField<int?>(
                    value: _categoryId,
                    decoration: const InputDecoration(labelText: 'Categoria'),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Todas')),
                      ...categories.map(
                        (c) => DropdownMenuItem(
                          value: c.id,
                          child: Text(c.name),
                        ),
                      ),
                    ],
                    onChanged: (v) => setState(() => _categoryId = v),
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Vencimento de'),
                  subtitle: Text(
                    _dueFrom != null
                        ? formatDateOnly(_dueFrom!)
                        : 'Não definido',
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.calendar_today),
                    onPressed: () => _pickDate(isFrom: true),
                  ),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Vencimento até'),
                  subtitle: Text(
                    _dueTo != null ? formatDateOnly(_dueTo!) : 'Não definido',
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.calendar_today),
                    onPressed: () => _pickDate(isFrom: false),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _clear,
                        child: const Text('Limpar'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: FilledButton(
                        onPressed: _apply,
                        child: const Text('Aplicar'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
