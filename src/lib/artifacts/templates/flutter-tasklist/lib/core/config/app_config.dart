/// Configuração da API TaskList.
class AppConfig {
  AppConfig._();

  /// APK gerado pela Fábrica usa dados locais até conectar à API real.
  static const bool demoMode = bool.fromEnvironment(
    'DEMO_MODE',
    defaultValue: true,
  );

  /// Base URL REST — use `--dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1` no Android emulator.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api/v1',
  );

  static const int apiTimeoutMs = int.fromEnvironment(
    'API_TIMEOUT_MS',
    defaultValue: 30000,
  );

  static String get wsBaseUrl {
    const override = String.fromEnvironment('WS_BASE_URL');
    if (override.isNotEmpty) return override;
    final uri = Uri.parse(apiBaseUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return '$scheme://${uri.host}:${uri.hasPort ? uri.port : (scheme == 'wss' ? 443 : 80)}${uri.path}/sync';
  }
}
