import '../../shared/constants.dart';

class DecimalFormatter {
  static String formatResult(double value) {
    final rounded = _roundHalfUp(value, AppConstants.maxDecimalPlaces);
    var formatted = rounded.toStringAsFixed(AppConstants.maxDecimalPlaces);
    formatted = formatted.replaceAll(RegExp(r'\.?0+$'), '');
    if (formatted.isEmpty || formatted == '-') return '0';
    return formatted;
  }

  static double _roundHalfUp(double value, int decimals) {
    final factor = _pow10(decimals);
    return (value * factor).roundToDouble() / factor;
  }

  static double _pow10(int exp) {
    var result = 1.0;
    for (var i = 0; i < exp; i++) {
      result *= 10;
    }
    return result;
  }

  static int countSignificantDigits(String input) {
    final normalized = input.replaceAll('-', '').replaceAll('.', '');
    final trimmed = normalized.replaceFirst(RegExp(r'^0+'), '');
    return trimmed.isEmpty ? 1 : trimmed.length;
  }

  static bool canAppendDigit(String currentDisplay, String digit) {
    final next = currentDisplay == '0' && !currentDisplay.contains('.')
        ? digit
        : currentDisplay + digit;
    return countSignificantDigits(next) <= AppConstants.maxSignificantDigits;
  }
}
