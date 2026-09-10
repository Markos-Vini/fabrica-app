import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import '../utils/timezone.dart';
import 'api_exception.dart';

typedef OnUnauthorized = void Function();

class ApiClient {
  ApiClient({
    required TokenStorage tokenStorage,
    this.onUnauthorized,
  })  : _tokenStorage = tokenStorage,
        _dio = Dio(
          BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            connectTimeout: Duration(milliseconds: AppConfig.apiTimeoutMs),
            receiveTimeout: Duration(milliseconds: AppConfig.apiTimeoutMs),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (options.method == 'POST' || options.method == 'PATCH') {
            if (options.path.contains('/tasks')) {
              options.headers['X-Timezone'] = deviceTimezone();
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await _tokenStorage.clearToken();
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  final TokenStorage _tokenStorage;
  final Dio _dio;
  final OnUnauthorized? onUnauthorized;

  Dio get dio => _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _wrap(() => _dio.get<T>(path, queryParameters: queryParameters));
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
  }) async {
    return _wrap(() => _dio.post<T>(path, data: data));
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
  }) async {
    return _wrap(() => _dio.patch<T>(path, data: data));
  }

  Future<void> delete(String path) async {
    await _wrap(() => _dio.delete<void>(path));
  }

  Future<T> _wrap<T>(Future<Response<T>> Function() call) async {
    try {
      final response = await call();
      return response.data as T;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        throw ApiException(
          message: 'Falha de conexão. Verifique sua rede.',
          isNetworkError: true,
        );
      }
      final status = e.response?.statusCode;
      final data = e.response?.data;
      throw ApiException(
        message: extractErrorMessage(data),
        statusCode: status,
        code: data is Map ? data['code'] as String? : null,
        isNetworkError: false,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      debugPrint('ApiClient error: $e');
      throw ApiException(message: 'Erro inesperado');
    }
  }
}
