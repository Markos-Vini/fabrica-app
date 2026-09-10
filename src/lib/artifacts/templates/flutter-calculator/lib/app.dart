import 'package:flutter/material.dart';

import 'features/calculator/presentation/calculator_page.dart';
import 'features/calculator/providers/calculator_provider.dart';
import 'features/theme/theme_controller.dart';
import 'shared/constants.dart';

class CalcfacilApp extends StatelessWidget {
  const CalcfacilApp({super.key, required this.appState});

  final AppState appState;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: appState.themeController,
      builder: (context, _) {
        return MaterialApp(
          title: AppConstants.appName,
          debugShowCheckedModeBanner: false,
          themeMode: appState.themeController.mode,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF0071E3),
              brightness: Brightness.light,
            ),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF0A84FF),
              brightness: Brightness.dark,
            ),
          ),
          home: CalculatorPage(
            calculatorProvider: appState.calculator,
            themeController: appState.themeController,
          ),
        );
      },
    );
  }
}
