import 'package:flutter/material.dart';

import '../../../core/calculator/calculator_state.dart';

class DisplayWidget extends StatelessWidget {
  const DisplayWidget({super.key, required this.state});

  final CalculatorState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final expression = state.pendingOperator != null && state.accumulator != null
        ? '${state.accumulator} ${state.pendingOperator!.symbol}'
        : null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (expression != null)
            Text(
              expression,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          const SizedBox(height: 4),
          if (state.errorMessage != null)
            Text(
              state.errorMessage!,
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.error,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            )
          else
            Text(
              state.display,
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w300,
              ),
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }
}
