String formatDateOnly(DateTime date) {
  final y = date.year.toString().padLeft(4, '0');
  final m = date.month.toString().padLeft(2, '0');
  final d = date.day.toString().padLeft(2, '0');
  return '$y-$m-$d';
}

DateTime todayLocal() {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day);
}

bool isDueDateValid(DateTime dueDate) {
  final today = todayLocal();
  final normalized = DateTime(dueDate.year, dueDate.month, dueDate.day);
  return !normalized.isBefore(today);
}

DateTime? parseDateOnly(String? value) {
  if (value == null || value.isEmpty) return null;
  final parts = value.split('-');
  if (parts.length != 3) return null;
  return DateTime(
    int.parse(parts[0]),
    int.parse(parts[1]),
    int.parse(parts[2]),
  );
}
