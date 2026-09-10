import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/calculator/calculator_engine.dart';
import '../../../core/calculator/calculator_state.dart';
import '../../history/data/history_repository.dart';
import '../../theme/theme_controller.dart';

class CalculatorProvider extends ChangeNotifier {
  CalculatorProvider(this._historyRepo) {
    _entries = _historyRepo.load();
  }

  final HistoryRepository _historyRepo;
  final CalculatorEngine _engine = CalculatorEngine();

  List<HistoryEntry> _entries = [];

  CalculatorState get state => _engine.state;
  List<HistoryEntry> get entries => List.unmodifiable(_entries);

  void pressDigit(String digit) {
    _engine.pressDigit(digit);
    notifyListeners();
  }

  void pressDecimal() {
    _engine.pressDecimal();
    notifyListeners();
  }

  void pressOperator(Operator op) {
    _engine.pressOperator(op);
    notifyListeners();
  }

  Future<void> pressEquals() async {
    final result = _engine.pressEquals();
    if (result.completed != null) {
      final op = result.completed!;
      _entries = await _historyRepo.append(
        expression: op.expression,
        result: op.result,
        timestamp: op.timestamp,
      );
    }
    notifyListeners();
  }

  void pressClear() {
    _engine.pressClear();
    notifyListeners();
  }

  void pressAllClear() {
    _engine.pressAllClear();
    notifyListeners();
  }

  void pressBackspace() {
    _engine.pressBackspace();
    notifyListeners();
  }

  Future<void> clearHistory() async {
    _entries = await _historyRepo.clear();
    notifyListeners();
  }
}

class AppState {
  AppState({
    required this.calculator,
    required this.themeController,
  });

  final CalculatorProvider calculator;
  final ThemeController themeController;
}

Future<AppState> createAppState() async {
  final prefs = await SharedPreferences.getInstance();
  return AppState(
    calculator: CalculatorProvider(HistoryRepository(prefs)),
    themeController: ThemeController(prefs),
  );
}
