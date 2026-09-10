import '../../shared/constants.dart';
import '../format/decimal_formatter.dart';
import 'calculator_state.dart';

class CalculatorEngine {
  CalculatorState _state = const CalculatorState();

  CalculatorState get state => _state;

  double _parseDisplay() {
    final parsed = double.tryParse(_state.display);
    return parsed ?? 0;
  }

  double _apply(Operator op, double a, double b) {
    switch (op) {
      case Operator.add:
        return a + b;
      case Operator.subtract:
        return a - b;
      case Operator.multiply:
        return a * b;
      case Operator.divide:
        return a / b;
    }
  }

  CalculatorState pressDigit(String digit) {
    if (_state.errorMessage != null) return _state;

    if (_state.isFreshResult) {
      _state = CalculatorState(display: digit);
      return _state;
    }

    if (_state.waitingForOperand) {
      _state = _state.copyWith(display: digit, waitingForOperand: false);
      return _state;
    }

    if (_state.display == '0' && digit != '.') {
      _state = _state.copyWith(display: digit);
      return _state;
    }

    if (!DecimalFormatter.canAppendDigit(_state.display, digit)) {
      return _state;
    }

    _state = _state.copyWith(display: _state.display + digit);
    return _state;
  }

  CalculatorState pressDecimal() {
    if (_state.errorMessage != null) return _state;

    if (_state.isFreshResult) {
      _state = const CalculatorState(display: '0.');
      return _state;
    }

    if (_state.waitingForOperand) {
      _state = _state.copyWith(display: '0.', waitingForOperand: false);
      return _state;
    }

    if (!_state.display.contains('.')) {
      _state = _state.copyWith(display: '${_state.display}.');
    }
    return _state;
  }

  CalculatorState pressOperator(Operator op) {
    if (_state.errorMessage != null) return _state;

    final current = _parseDisplay();

    if (_state.pendingOperator != null && !_state.waitingForOperand) {
      if (_state.pendingOperator == Operator.divide && current == 0) {
        _state = _state.copyWith(
          errorMessage: AppConstants.divisionByZeroMessage,
        );
        return _state;
      }
      final result = _apply(
        _state.pendingOperator!,
        _state.accumulator ?? 0,
        current,
      );
      _state = _state.copyWith(
        display: DecimalFormatter.formatResult(result),
        accumulator: result,
      );
    } else if (_state.accumulator == null) {
      _state = _state.copyWith(accumulator: current);
    }

    _state = _state.copyWith(
      pendingOperator: op,
      waitingForOperand: true,
      isFreshResult: false,
    );
    return _state;
  }

  ({CalculatorState state, CompletedOperation? completed}) pressEquals() {
    if (_state.errorMessage != null) {
      return (state: _state, completed: null);
    }

    if (_state.pendingOperator == null || _state.accumulator == null) {
      return (state: _state, completed: null);
    }

    final operandB = _parseDisplay();

    if (_state.pendingOperator == Operator.divide && operandB == 0) {
      _state = _state.copyWith(
        errorMessage: AppConstants.divisionByZeroMessage,
      );
      return (state: _state, completed: null);
    }

    final result = _apply(_state.pendingOperator!, _state.accumulator!, operandB);
    final formatted = DecimalFormatter.formatResult(result);
    final expression =
        '${DecimalFormatter.formatResult(_state.accumulator!)} ${_state.pendingOperator!.symbol} ${DecimalFormatter.formatResult(operandB)}';

    _state = _state.copyWith(
      display: formatted,
      accumulator: result,
      clearPendingOperator: true,
      waitingForOperand: true,
      isFreshResult: true,
    );

    return (
      state: _state,
      completed: CompletedOperation(
        expression: expression,
        result: formatted,
        timestamp: DateTime.now().toUtc().toIso8601String(),
      ),
    );
  }

  CalculatorState pressClear() {
    if (_state.errorMessage != null) return _state;

    if (_state.waitingForOperand) {
      _state = _state.copyWith(display: '0');
      return _state;
    }

    _state = _state.copyWith(display: '0');
    return _state;
  }

  CalculatorState pressAllClear() {
    _state = const CalculatorState();
    return _state;
  }

  CalculatorState pressBackspace() {
    if (_state.errorMessage != null || _state.waitingForOperand) {
      return _state;
    }

    if (_state.isFreshResult) {
      _state = const CalculatorState();
      return _state;
    }

    if (_state.display.length <= 1 || _state.display == '0') {
      _state = _state.copyWith(display: '0');
    } else {
      var next = _state.display.substring(0, _state.display.length - 1);
      if (next.isEmpty || next == '-') next = '0';
      _state = _state.copyWith(display: next);
    }
    return _state;
  }
}
