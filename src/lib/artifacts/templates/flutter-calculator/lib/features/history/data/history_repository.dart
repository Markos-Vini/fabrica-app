import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../shared/constants.dart';

class HistoryEntry {
  const HistoryEntry({
    required this.id,
    required this.expression,
    required this.result,
    required this.timestamp,
  });

  final String id;
  final String expression;
  final String result;
  final String timestamp;

  Map<String, dynamic> toJson() => {
        'id': id,
        'expression': expression,
        'result': result,
        'timestamp': timestamp,
      };

  factory HistoryEntry.fromJson(Map<String, dynamic> json) {
    return HistoryEntry(
      id: json['id'] as String,
      expression: json['expression'] as String,
      result: json['result'] as String,
      timestamp: json['timestamp'] as String,
    );
  }
}

class HistoryRepository {
  HistoryRepository(this._prefs);

  final SharedPreferences _prefs;
  static const _uuid = Uuid();

  List<HistoryEntry> load() {
    final raw = _prefs.getString(AppConstants.historyKey);
    if (raw == null) return [];

    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final entries = (decoded['entries'] as List<dynamic>? ?? [])
          .map((e) => HistoryEntry.fromJson(e as Map<String, dynamic>))
          .toList();
      return entries.take(AppConstants.maxHistoryEntries).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<HistoryEntry>> append({
    required String expression,
    required String result,
    required String timestamp,
  }) async {
    final current = load();
    final entry = HistoryEntry(
      id: _uuid.v4(),
      expression: expression,
      result: result,
      timestamp: timestamp,
    );
    final next = [entry, ...current].take(AppConstants.maxHistoryEntries).toList();
    await _save(next);
    return next;
  }

  Future<List<HistoryEntry>> clear() async {
    await _prefs.remove(AppConstants.historyKey);
    return [];
  }

  Future<void> _save(List<HistoryEntry> entries) async {
    final payload = jsonEncode({
      'entries': entries.map((e) => e.toJson()).toList(),
      'maxEntries': AppConstants.maxHistoryEntries,
    });
    await _prefs.setString(AppConstants.historyKey, payload);
  }
}
