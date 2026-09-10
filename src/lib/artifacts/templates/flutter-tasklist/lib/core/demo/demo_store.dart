import '../../models/task.dart';

/// Dados locais para APK de demonstração (sem API).
class DemoStore {
  DemoStore._();

  static const demoUser = User(
    id: 'demo-user',
    email: 'demo@tasklist.app',
    name: 'Usuário Demo',
  );

  static const categories = <Category>[
    Category(id: 1, name: 'Pessoal', isDefault: true),
    Category(id: 2, name: 'Trabalho'),
    Category(id: 3, name: 'Estudos'),
  ];

  static final List<Task> _tasks = _seedTasks();

  static List<Task> get tasks => List.unmodifiable(_tasks);

  static List<Task> listTasks({TaskFilters filters = const TaskFilters()}) {
    return _tasks.where((task) {
      if (task.deletedAt != null) return false;
      if (filters.status != null && task.status != filters.status) return false;
      if (filters.priority != null && task.priority != filters.priority) {
        return false;
      }
      if (filters.categoryId != null && task.categoryId != filters.categoryId) {
        return false;
      }
      return true;
    }).toList();
  }

  static Task? findTask(String id) {
    try {
      return _tasks.firstWhere((t) => t.id == id && t.deletedAt == null);
    } catch (_) {
      return null;
    }
  }

  static Task upsertTask(Task task) {
    final idx = _tasks.indexWhere((t) => t.id == task.id);
    if (idx >= 0) {
      _tasks[idx] = task;
    } else {
      _tasks.add(task);
    }
    return task;
  }

  static Task completeTask(String id) {
    final task = findTask(id);
    if (task == null) throw StateError('Tarefa não encontrada');
    final now = DateTime.now().toUtc();
    final updated = task.copyWith(
      status: TaskStatus.completed,
      completedAt: now,
      updatedAt: now,
    );
    upsertTask(updated);
    return updated;
  }

  static void deleteTask(String id) {
    final task = findTask(id);
    if (task == null) return;
    upsertTask(task.copyWith(deletedAt: DateTime.now().toUtc()));
  }

  static String nextId() => 'demo-${DateTime.now().microsecondsSinceEpoch}';

  static List<Task> _seedTasks() {
    final now = DateTime.now().toUtc();
    final today = _isoDate(now);
    final tomorrow = _isoDate(now.add(const Duration(days: 1)));

    return [
      Task(
        id: 'demo-1',
        title: 'Revisar backlog da sprint',
        description: 'Conferir prioridades com o time.',
        dueDate: today,
        priority: TaskPriority.high,
        status: TaskStatus.pending,
        categoryId: 2,
        categoryName: 'Trabalho',
        createdAt: now.subtract(const Duration(hours: 2)),
        updatedAt: now.subtract(const Duration(hours: 2)),
      ),
      Task(
        id: 'demo-2',
        title: 'Comprar mantimentos',
        dueDate: today,
        priority: TaskPriority.medium,
        status: TaskStatus.pending,
        categoryId: 1,
        categoryName: 'Pessoal',
        createdAt: now.subtract(const Duration(hours: 5)),
        updatedAt: now.subtract(const Duration(hours: 5)),
      ),
      Task(
        id: 'demo-3',
        title: 'Estudar Flutter — Riverpod',
        dueDate: tomorrow,
        priority: TaskPriority.low,
        status: TaskStatus.pending,
        categoryId: 3,
        categoryName: 'Estudos',
        createdAt: now.subtract(const Duration(days: 1)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      Task(
        id: 'demo-4',
        title: 'Enviar relatório semanal',
        dueDate: today,
        priority: TaskPriority.medium,
        status: TaskStatus.completed,
        categoryId: 2,
        categoryName: 'Trabalho',
        completedAt: now.subtract(const Duration(hours: 1)),
        createdAt: now.subtract(const Duration(days: 2)),
        updatedAt: now.subtract(const Duration(hours: 1)),
      ),
    ];
  }

  static String _isoDate(DateTime dt) {
    final local = dt.toLocal();
    final y = local.year.toString().padLeft(4, '0');
    final m = local.month.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}
