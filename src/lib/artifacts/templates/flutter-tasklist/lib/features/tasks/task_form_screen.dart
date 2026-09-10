import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/utils/date_utils.dart';
import '../../models/task.dart';
import '../../providers/tasks_provider.dart';

class TaskFormScreen extends ConsumerStatefulWidget {
  const TaskFormScreen({super.key, this.taskId});

  final String? taskId;

  bool get isEditing => taskId != null;

  @override
  ConsumerState<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends ConsumerState<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  TaskPriority _priority = TaskPriority.medium;
  int? _categoryId;
  DateTime _dueDate = todayLocal();
  bool _isSubmitting = false;
  String? _dueDateError;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) {
      Future.microtask(_loadExisting);
    }
  }

  void _loadExisting() {
    final tasks = ref.read(tasksProvider).tasks;
    final task = tasks.cast<Task?>().firstWhere(
          (t) => t?.id == widget.taskId,
          orElse: () => null,
        );
    if (task == null) return;
    _titleController.text = task.title;
    _descriptionController.text = task.description ?? '';
    _priority = task.priority;
    _categoryId = task.categoryId;
    final parsed = parseDateOnly(task.dueDate);
    if (parsed != null) _dueDate = parsed;
    setState(() {});
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate,
      firstDate: todayLocal(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) {
      setState(() {
        _dueDate = picked;
        _dueDateError = null;
      });
    }
  }

  Future<void> _submit() async {
    setState(() => _dueDateError = null);
    if (!isDueDateValid(_dueDate)) {
      setState(() => _dueDateError = 'Vencimento não pode ser anterior a hoje');
      return;
    }
    if (!_formKey.currentState!.validate() || _categoryId == null) {
      if (_categoryId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecione uma categoria')),
        );
      }
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      if (widget.isEditing) {
        final existing = ref.read(tasksProvider).tasks.firstWhere(
              (t) => t.id == widget.taskId,
            );
        final updated = existing.copyWith(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          dueDate: formatDateOnly(_dueDate),
          priority: _priority,
          categoryId: _categoryId,
        );
        await ref.read(tasksProvider.notifier).updateTask(updated);
      } else {
        final task = Task(
          id: '',
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          dueDate: formatDateOnly(_dueDate),
          priority: _priority,
          status: TaskStatus.pending,
          categoryId: _categoryId!,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
        await ref.read(tasksProvider.notifier).createTask(task);
      }
      if (mounted) context.pop();
    } on ApiException catch (e) {
      if (mounted) {
        if (e.code == 'DUE_DATE_IN_PAST') {
          setState(() => _dueDateError = e.message);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.message)),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEditing ? 'Editar tarefa' : 'Nova tarefa'),
      ),
      body: categoriesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro ao carregar categorias: $e')),
        data: (categories) {
          if (_categoryId == null && categories.isNotEmpty) {
            final pessoal = categories.cast<Category?>().firstWhere(
                  (c) => c?.name == 'Pessoal',
                  orElse: () => null,
                );
            _categoryId = pessoal?.id ?? categories.first.id;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Título *',
                    ),
                    maxLength: 200,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Título obrigatório';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Descrição (opcional)',
                    ),
                    maxLength: 2000,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Vencimento *',
                      errorText: _dueDateError,
                    ),
                    child: InkWell(
                      onTap: _pickDate,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today, size: 20),
                            const SizedBox(width: 12),
                            Text(
                              '${_dueDate.day.toString().padLeft(2, '0')}/'
                              '${_dueDate.month.toString().padLeft(2, '0')}/'
                              '${_dueDate.year}',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<TaskPriority>(
                    value: _priority,
                    decoration: const InputDecoration(labelText: 'Prioridade *'),
                    items: TaskPriority.values
                        .map(
                          (p) => DropdownMenuItem(
                            value: p,
                            child: Text(p.label),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _priority = v);
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    value: _categoryId,
                    decoration: const InputDecoration(labelText: 'Categoria *'),
                    items: categories
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(c.name),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _categoryId = v),
                  ),
                  const SizedBox(height: 32),
                  FilledButton(
                    onPressed: _isSubmitting ? null : _submit,
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(widget.isEditing ? 'Salvar' : 'Criar tarefa'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
