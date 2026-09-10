import 'package:flutter/material.dart';

import 'display_widget.dart';
import 'keypad_widget.dart';
import '../providers/calculator_provider.dart';
import '../../history/presentation/history_panel.dart';
import '../../theme/theme_controller.dart';
import '../../../shared/constants.dart';

class CalculatorPage extends StatelessWidget {
  const CalculatorPage({
    super.key,
    required this.calculatorProvider,
    required this.themeController,
  });

  final CalculatorProvider calculatorProvider;
  final ThemeController themeController;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([calculatorProvider, themeController]),
      builder: (context, _) {
        return Scaffold(
          appBar: AppBar(
            title: const Text(AppConstants.appName),
            actions: [
              IconButton(
                icon: Icon(
                  themeController.mode == ThemeMode.dark
                      ? Icons.light_mode_outlined
                      : Icons.dark_mode_outlined,
                ),
                tooltip: themeController.mode == ThemeMode.dark
                    ? 'Modo claro'
                    : 'Modo escuro',
                onPressed: themeController.toggle,
              ),
            ],
          ),
          body: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 640;

                if (isWide) {
                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 3,
                          child: _CalculatorSection(
                            provider: calculatorProvider,
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          flex: 2,
                          child: HistoryPanel(
                            entries: calculatorProvider.entries,
                            onClear: calculatorProvider.clearHistory,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      HistoryPanel(
                        entries: calculatorProvider.entries,
                        onClear: calculatorProvider.clearHistory,
                      ),
                      const SizedBox(height: 16),
                      _CalculatorSection(provider: calculatorProvider),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _CalculatorSection extends StatelessWidget {
  const _CalculatorSection({required this.provider});

  final CalculatorProvider provider;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DisplayWidget(state: provider.state),
        const SizedBox(height: 16),
        SizedBox(
          height: 360,
          child: KeypadWidget(provider: provider),
        ),
      ],
    );
  }
}
