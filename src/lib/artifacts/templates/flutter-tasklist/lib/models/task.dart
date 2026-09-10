enum TaskPriority { low, medium, high }

enum TaskStatus { pending, completed }

extension TaskPriorityApi on TaskPriority {
  String get apiValue {
    switch (this) {
      case TaskPriority.low:
        return 'LOW';
      case TaskPriority.medium:
        return 'MEDIUM';
      case TaskPriority.high:
        return 'HIGH';
    }
  }

  String get label {
    switch (this) {
      case TaskPriority.low:
        return 'Baixa';
      case TaskPriority.medium:
        return 'Média';
      case TaskPriority.high:
        return 'Alta';
    }
  }

  static TaskPriority fromApi(String value) {
    switch (value) {
      case 'LOW':
        return TaskPriority.low;
      case 'HIGH':
        return TaskPriority.high;
      default:
        return TaskPriority.medium;
    }
  }
}

extension TaskStatusApi on TaskStatus {
  String get apiValue =>
      this == TaskStatus.completed ? 'COMPLETED' : 'PENDING';

  static TaskStatus fromApi(String value) =>
      value == 'COMPLETED' ? TaskStatus.completed : TaskStatus.pending;
}

class User {
  const User({
    required this.id,
    required this.email,
    required this.name,
    this.createdAt,
  });

  final String id;
  final String email;
  final String name;
  final DateTime? createdAt;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }
}

class Category {
  const Category({
    required this.id,
    required this.name,
    this.isDefault = false,
  });

  final int id;
  final String name;
  final bool isDefault;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as int,
      name: json['name'] as String,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

class Task {
  const Task({
    required this.id,
    required this.title,
    this.description,
    required this.dueDate,
    required this.priority,
    required this.status,
    required this.categoryId,
    this.categoryName,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  final String id;
  final String title;
  final String? description;
  final String dueDate;
  final TaskPriority priority;
  final TaskStatus status;
  final int categoryId;
  final String? categoryName;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  bool get isCompleted => status == TaskStatus.completed;

  Task copyWith({
    String? id,
    String? title,
    String? description,
    String? dueDate,
    TaskPriority? priority,
    TaskStatus? status,
    int? categoryId,
    String? categoryName,
    DateTime? completedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      dueDate: dueDate ?? this.dueDate,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      completedAt: completedAt ?? this.completedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
    );
  }

  factory Task.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>?;
    return Task(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      dueDate: json['dueDate'] as String,
      priority: TaskPriorityApi.fromApi(json['priority'] as String),
      status: TaskStatusApi.fromApi(json['status'] as String),
      categoryId: json['categoryId'] as int,
      categoryName: category?['name'] as String?,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      deletedAt: json['deletedAt'] != null
          ? DateTime.tryParse(json['deletedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'title': title,
        if (description != null && description!.isNotEmpty)
          'description': description,
        'dueDate': dueDate,
        'priority': priority.apiValue,
        'categoryId': categoryId,
      };

  Map<String, dynamic> toUpdateJson() => {
        'title': title,
        'description': description,
        'dueDate': dueDate,
        'priority': priority.apiValue,
        'categoryId': categoryId,
      };
}

class TaskFilters {
  const TaskFilters({
    this.status,
    this.priority,
    this.categoryId,
    this.dueDateFrom,
    this.dueDateTo,
  });

  final TaskStatus? status;
  final TaskPriority? priority;
  final int? categoryId;
  final String? dueDateFrom;
  final String? dueDateTo;

  TaskFilters copyWith({
    TaskStatus? status,
    TaskPriority? priority,
    int? categoryId,
    String? dueDateFrom,
    String? dueDateTo,
    bool clearStatus = false,
    bool clearPriority = false,
    bool clearCategory = false,
    bool clearDueFrom = false,
    bool clearDueTo = false,
  }) {
    return TaskFilters(
      status: clearStatus ? null : (status ?? this.status),
      priority: clearPriority ? null : (priority ?? this.priority),
      categoryId: clearCategory ? null : (categoryId ?? this.categoryId),
      dueDateFrom: clearDueFrom ? null : (dueDateFrom ?? this.dueDateFrom),
      dueDateTo: clearDueTo ? null : (dueDateTo ?? this.dueDateTo),
    );
  }

  bool get hasActiveFilters =>
      status != null ||
      priority != null ||
      categoryId != null ||
      dueDateFrom != null ||
      dueDateTo != null;

  Map<String, dynamic> toQueryParams({String? updatedSince}) {
    final params = <String, dynamic>{};
    if (status != null) params['status'] = status!.apiValue;
    if (priority != null) params['priority'] = priority!.apiValue;
    if (categoryId != null) params['categoryId'] = categoryId;
    if (dueDateFrom != null) params['dueDateFrom'] = dueDateFrom;
    if (dueDateTo != null) params['dueDateTo'] = dueDateTo;
    if (updatedSince != null) params['updatedSince'] = updatedSince;
    params['limit'] = 100;
    return params;
  }
}
