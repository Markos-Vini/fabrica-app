class ApiException implements Exception {
  ApiException({
    required this.message,
    this.statusCode,
    this.code,
    this.isNetworkError = false,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final bool isNetworkError;

  @override
  String toString() => message;
}

String extractErrorMessage(dynamic data, {String fallback = 'Erro inesperado'}) {
  if (data == null) return fallback;
  if (data is String) return data;
  if (data is Map) {
    if (data['message'] is String) return data['message'] as String;
    if (data['message'] is List && (data['message'] as List).isNotEmpty) {
      return (data['message'] as List).first.toString();
    }
    if (data['error'] is String) return data['error'] as String;
  }
  return fallback;
}
