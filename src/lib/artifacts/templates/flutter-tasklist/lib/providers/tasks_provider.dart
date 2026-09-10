import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api/api_exception.dart';
import '../core/sync/sync_service.dart';
import '../models/task.dart';
import '../repositories/tasks_repository.dart';
import 'providers.dart';

class TasksState {
  const TasksState({
    this.tasks = const [],
    this.isLoading = false,
    this.isRefreshing = false,
    this.error,
    this.networkError = false,
    this.filters = const TaskFilters(),
    this.lastUpdatedAt,
    this.pendingRetry,
  });

  final List<Task> tasks;
  final bool isLoading;
  final bool isRefreshing;
  final String? error;
  final bool networkError;
  final TaskFilters filters;
  final DateTime? lastUpdatedAt;
  final Future<void> Function()? pendingRetry;

  List<Task> get sortedTasks {
    final copy = List<Task>.from(tasks);
    copy.sort((a, b) {
      if (a.isCompleted != b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      final dueCompare = a.dueDate.compareTo(b.dueDate);
      if (dueCompare != 0) return dueCompare;
      return b.priority.index.compareTo(a.priority.index);
    });
    return copy;
  }

  TasksState copyWith({
    List<Task>? tasks,
    bool? isLoading,
    bool? isRefreshing,
    String? error,
    bool? networkError,
    TaskFilters? filters,
    DateTime? lastUpdatedAt,
    Future<void> Function()? pendingRetry,
    bool clearError = false,
    bool clearRetry = false,
  }) {
    return TasksState(
      tasks: tasks ?? this.tasks,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      error: clearError ? null : (error ?? this.error),
      networkError: networkError ?? this.networkError,
      filters: filters ?? this.filters,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      pendingRetry:
          clearRetry ? null : (pendingRetry ?? this.pendingRetry),
    );
  }
}

class TasksNotifier extends StateNotifier<TasksState> {
  TasksNotifier(this._ref) : super(const TasksState()) {
    _syncSub = _ref.read(syncServiceProvider).events.listen(_onSyncEvent);
  }

  final Ref _ref;
  StreamSubscription<SyncEvent>? _syncSub;

  TasksRepository get _repo => _ref.read(tasksRepositoryProvider);

  Future<void> load({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(isRefreshing: true, clearError: true);
    } else {
      state = state.copyWith(isLoading: true, clearError: true);
    }
    try {
      final tasks = await _repo.fetchTasks(filters: state.filters);
      final lastUpdated = tasks.isEmpty
          ? state.lastUpdatedAt
          : tasks
              .map((t) => t.updatedAt)
              .reduce((a, b) => a.isAfter(b) ? a : b);
      state = state.copyWith(
        tasks: tasks,
        isLoading: false,
        isRefreshing: false,
        networkError: false,
        lastUpdatedAt: lastUpdated,
        clearRetry: true,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        error: e.message,
        networkError: e.isNetworkError,
        pendingRetry: e.isNetworkError ? () => load(refresh: refresh) : null,
      );
    }
  }

  Future<void> applyFilters(TaskFilters filters) async {
    state = state.copyWith(filters: filters);
    await load(refresh: true);
  }

  Future<void> deltaSync() async {
    if (state.lastUpdatedAt == null) {
      await load(refresh: true);
      return;
    }
    try {
      final delta = await _repo.fetchTasks(
        filters: state.filters,
        updatedSince: state.lastUpdatedAt!.toUtc().toIso8601String(),
      );
      if (delta.isEmpty) return;
      final merged = List<Task>.from(state.tasks);
      for (final task in delta) {
        if (task.deletedAt != null) {
          merged.removeWhere((t) => t.id == task.id);
        } else {
          final idx = merged.indexWhere((t) => t.id == task.id);
          if (idx >= 0) {
            if (task.updatedAt.isAfter(merged[idx].updatedAt)) {
              merged[idx] = task;
            }
          } else {
            merged.add(task);
          }
        }
      }
      final lastUpdated = merged.isEmpty
          ? state.lastUpdatedAt
          : merged
              .map((t) => t.updatedAt)
              .reduce((a, b) => a.isAfter(b) ? a : b);
      state = state.copyWith(tasks: merged, lastUpdatedAt: lastUpdated);
    } catch (_) {
      await load(refresh: true);
    }
  }

  Future<Task> createTask(Task task) async {
    try {
      final created = await _repo.createTask(task);
      final tasks = [...state.tasks, created];
      state = state.copyWith(
        tasks: tasks,
        lastUpdatedAt: created.updatedAt,
        clearError: true,
        networkError: false,
        clearRetry: true,
      );
      return created;
    } on ApiException catch (e) {
      state = state.copyWith(
        error: e.message,
        networkError: e.isNetworkError,
        pendingRetry: e.isNetworkError ? () => createTask(task) : null,
      );
      rethrow;
    }
  }

  Future<Task> updateTask(Task task) async {
    try {
      final updated = await _repo.updateTask(task);
      final tasks = state.tasks.map((t) {
        return t.id == updated.id ? updated : t;
      }).toList();
      state = state.copyWith(
        tasks: tasks,
        lastUpdatedAt: updated.updatedAt,
        clearError: true,
        networkError: false,
        clearRetry: true,
      );
      return updated;
    } on ApiException catch (e) {
      state = state.copyWith(
        error: e.message,
        networkError: e.isNetworkError,
        pendingRetry: e.isNetworkError ? () => updateTask(task) : null,
      );
      rethrow;
    }
  }

  Future<Task> completeTask(String id) async {
    try {
      final updated = await _repo.completeTask(id);
      final tasks = state.tasks.map((t) {
        return t.id == updated.id ? updated : t;
      }).toList();
      state = state.copyWith(
        tasks: tasks,
        lastUpdatedAt: updated.updatedAt,
        clearError: true,
        networkError: false,
        clearRetry: true,
      );
      return updated;
    } on ApiException catch (e) {
      state = state.copyWith(
        error: e.message,
        networkError: e.isNetworkError,
        pendingRetry: e.isNetworkError ? () => completeTask(id) : null,
      );
      rethrow;
    }
  }

  Future<void> deleteTask(String id) async {
    try {
      await _repo.deleteTask(id);
      final tasks = state.tasks.where((t) => t.id != id).toList();
      state = state.copyWith(
        tasks: tasks,
        clearError: true,
        networkError: false,
        clearRetry: true,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        error: e.message,
        networkError: e.isNetworkError,
        pendingRetry: e.isNetworkError ? () => deleteTask(id) : null,
      );
      rethrow;
    }
  }

  Future<void> retryPending() async {
    final retry = state.pendingRetry;
    if (retry != null) await retry();
  }

  void clearError() {
    state = state.copyWith(clearError: true, networkError: false);
  }

  void _onSyncEvent(SyncEvent event) {
    if (event.type == 'connected') {
      deltaSync();
      return;
    }
    final tasks = List<Task>.from(state.tasks);
    mergeTaskFromEvent(event, tasks);
    final lastUpdated = tasks.isEmpty
        ? state.lastUpdatedAt
        : tasks.map((t) => t.updatedAt).reduce((a, b) => a.isAfter(b) ? a : b);
    state = state.copyWith(tasks: tasks, lastUpdatedAt: lastUpdated);
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    super.dispose();
  }
}

final tasksProvider =
    StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  return TasksNotifier(ref);
});

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  return ref.read(categoriesRepositoryProvider).fetchCategories();
});

final syncConnectionProvider = StreamProvider<SyncConnectionState>((ref) {
  return ref.watch(syncServiceProvider).connectionState;
});
