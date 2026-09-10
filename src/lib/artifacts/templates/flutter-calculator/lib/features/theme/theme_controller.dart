import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../shared/constants.dart';

class ThemeController extends ChangeNotifier {
  ThemeController(this._prefs) {
    _mode = _loadMode();
  }

  final SharedPreferences _prefs;
  ThemeMode _mode = ThemeMode.system;

  ThemeMode get mode => _mode;

  ThemeMode _loadMode() {
    final stored = _prefs.getString(AppConstants.themeKey);
    switch (stored) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  Future<void> toggle() async {
    final isDark = _mode == ThemeMode.dark;
    _mode = isDark ? ThemeMode.light : ThemeMode.dark;
    await _prefs.setString(
      AppConstants.themeKey,
      isDark ? 'light' : 'dark',
    );
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    final value = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    if (mode == ThemeMode.system) {
      await _prefs.remove(AppConstants.themeKey);
    } else {
      await _prefs.setString(AppConstants.themeKey, value);
    }
    notifyListeners();
  }
}
