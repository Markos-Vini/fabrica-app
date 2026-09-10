import 'package:flutter/material.dart';

import '../../../core/calculator/calculator_state.dart';
import '../providers/calculator_provider.dart';

enum _KeyType { digit, operator, action, equals }

class KeypadWidget extends StatelessWidget {
  const KeypadWidget({super.key, required this.provider});

  final CalculatorProvider provider;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 10.0;
        const rows = 5;
        const cols = 4;
        final cellWidth =
            (constraints.maxWidth - spacing * (cols - 1)) / cols;
        final cellHeight =
            (constraints.maxHeight - spacing * (rows - 1)) / rows;

        Widget buildKey({
          required String label,
          required _KeyType type,
          required VoidCallback onTap,
          int colSpan = 1,
        }) {
          return SizedBox(
            width: cellWidth * colSpan + spacing * (colSpan - 1),
            height: cellHeight,
            child: _CalcKey(label: label, type: type, onTap: onTap),
          );
        }

        return Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                buildKey(label: '7', type: _KeyType.digit, onTap: () => provider.pressDigit('7')),
                buildKey(label: '8', type: _KeyType.digit, onTap: () => provider.pressDigit('8')),
                buildKey(label: '9', type: _KeyType.digit, onTap: () => provider.pressDigit('9')),
                buildKey(label: '÷', type: _KeyType.operator, onTap: () => provider.pressOperator(Operator.divide)),
              ],
            ),
            const SizedBox(height: spacing),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                buildKey(label: '4', type: _KeyType.digit, onTap: () => provider.pressDigit('4')),
                buildKey(label: '5', type: _KeyType.digit, onTap: () => provider.pressDigit('5')),
                buildKey(label: '6', type: _KeyType.digit, onTap: () => provider.pressDigit('6')),
                buildKey(label: '×', type: _KeyType.operator, onTap: () => provider.pressOperator(Operator.multiply)),
              ],
            ),
            const SizedBox(height: spacing),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                buildKey(label: '1', type: _KeyType.digit, onTap: () => provider.pressDigit('1')),
                buildKey(label: '2', type: _KeyType.digit, onTap: () => provider.pressDigit('2')),
                buildKey(label: '3', type: _KeyType.digit, onTap: () => provider.pressDigit('3')),
                buildKey(label: '−', type: _KeyType.operator, onTap: () => provider.pressOperator(Operator.subtract)),
              ],
            ),
            const SizedBox(height: spacing),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                buildKey(label: 'C', type: _KeyType.action, onTap: provider.pressClear),
                buildKey(label: '0', type: _KeyType.digit, onTap: () => provider.pressDigit('0')),
                buildKey(label: '.', type: _KeyType.digit, onTap: provider.pressDecimal),
                buildKey(label: '+', type: _KeyType.operator, onTap: () => provider.pressOperator(Operator.add)),
              ],
            ),
            const SizedBox(height: spacing),
            Row(
              children: [
                buildKey(label: 'AC', type: _KeyType.action, onTap: provider.pressAllClear),
                const SizedBox(width: spacing),
                buildKey(label: '⌫', type: _KeyType.action, onTap: provider.pressBackspace),
                const SizedBox(width: spacing),
                buildKey(
                  label: '=',
                  type: _KeyType.equals,
                  onTap: () => provider.pressEquals(),
                  colSpan: 2,
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _CalcKey extends StatelessWidget {
  const _CalcKey({
    required this.label,
    required this.type,
    required this.onTap,
  });

  final String label;
  final _KeyType type;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (background, foreground) = switch (type) {
      _KeyType.digit => (
          theme.colorScheme.surface,
          theme.colorScheme.onSurface,
        ),
      _KeyType.operator => (
          theme.colorScheme.primary,
          theme.colorScheme.onPrimary,
        ),
      _KeyType.action => (
          theme.colorScheme.surfaceContainerHigh,
          theme.colorScheme.onSurface,
        ),
      _KeyType.equals => (
          theme.colorScheme.primary,
          theme.colorScheme.onPrimary,
        ),
    };

    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Center(
            child: Text(
              label,
              style: theme.textTheme.titleLarge?.copyWith(
                color: foreground,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
