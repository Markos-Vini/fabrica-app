import '../core/api/api_client.dart';
import '../core/config/app_config.dart';
import '../core/demo/demo_store.dart';
import '../models/task.dart';

class TasksRepository {
  TasksRepository(this._api);

  final ApiClient _api;

  Future<List<Task>> fetchTasks({
    TaskFilters filters = const TaskFilters(),
    String? updatedSince,
  }) async {
    if (AppConfig.demoMode) {
      return DemoStore.listTasks(filters: filters);
    }
    final params = filters.toQueryParams(updatedSince: updatedSince);
    final data = await _api.get<Map<String, dynamic>>(
      '/tasks',
      queryParameters: params,
    );
    final items = data!['items'] as List<dynamic>;
    return items.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Task> fetchTask(String id) async {
    if (AppConfig.demoMode) {
      final task = DemoStore.findTask(id);
      if (task == null) throw StateError('Tarefa não encontrada');
      return task;
    }
    final data = await _api.get<Map<String, dynamic>>('/tasks/$id');
    return Task.fromJson(data!);
  }

  Future<Task> createTask(Task task) async {
    if (AppConfig.demoMode) {
      final now = DateTime.now().toUtc();
      final created = task.copyWith(
        id: DemoStore.nextId(),
        createdAt: now,
        updatedAt: now,
      );
      return DemoStore.upsertTask(created);
    }
    final data = await _api.post<Map<String, dynamic>>(
      '/tasks',
      data: task.toCreateJson(),
    );
    return Task.fromJson(data!);
  }

  Future<Task> updateTask(Task task) async {
    if (AppConfig.demoMode) {
      final updated = task.copyWith(updatedAt: DateTime.now().toUtc());
      return DemoStore.upsertTask(updated);
    }
    final data = await _api.patch<Map<String, dynamic>>(
      '/tasks/${task.id}',
      data: task.toUpdateJson(),
    );
    return Task.fromJson(data!);
  }

  Future<Task> completeTask(String id) async {
    if (AppConfig.demoMode) {
      return DemoStore.completeTask(id);
    }
    final data = await _api.patch<Map<String, dynamic>>('/tasks/$id/complete');
    return Task.fromJson(data!);
  }

  Future<void> deleteTask(String id) async {
    if (AppConfig.demoMode) {
      DemoStore.deleteTask(id);
      return;
    }
    await _api.delete('/tasks/$id');
  }
}
