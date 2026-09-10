enum Operator { add, subtract, multiply, divide }

extension OperatorSymbol on Operator {
  String get symbol {
    switch (this) {
      case Operator.add:
        return '+';
      case Operator.subtract:
        return '−';
      case Operator.multiply:
        return '×';
      case Operator.divide:
        return '÷';
    }
  }
}

class CalculatorState {
  const CalculatorState({
    this.display = '0',
    this.errorMessage,
    this.pendingOperator,
    this.accumulator,
    this.isFreshResult = false,
    this.waitingForOperand = false,
  });

  final String display;
  final String? errorMessage;
  final Operator? pendingOperator;
  final double? accumulator;
  final bool isFreshResult;
  final bool waitingForOperand;

  CalculatorState copyWith({
    String? display,
    String? errorMessage,
    bool clearError = false,
    Operator? pendingOperator,
    bool clearPendingOperator = false,
    double? accumulator,
    bool clearAccumulator = false,
    bool? isFreshResult,
    bool? waitingForOperand,
  }) {
    return CalculatorState(
      display: display ?? this.display,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      pendingOperator: clearPendingOperator
          ? null
          : (pendingOperator ?? this.pendingOperator),
      accumulator:
          clearAccumulator ? null : (accumulator ?? this.accumulator),
      isFreshResult: isFreshResult ?? this.isFreshResult,
      waitingForOperand: waitingForOperand ?? this.waitingForOperand,
    );
  }
}

class CompletedOperation {
  const CompletedOperation({
    required this.expression,
    required this.result,
    required this.timestamp,
  });

  final String expression;
  final String result;
  final String timestamp;
}
