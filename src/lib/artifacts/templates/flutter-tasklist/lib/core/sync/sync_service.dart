import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../../models/task.dart';

enum SyncConnectionState { disconnected, connecting, connected, reconnecting }

class SyncEvent {
  SyncEvent({
    required this.type,
    required this.payload,
    required this.timestamp,
  });

  final String type;
  final Map<String, dynamic> payload;
  final DateTime timestamp;

  factory SyncEvent.fromJson(Map<String, dynamic> json) {
    return SyncEvent(
      type: json['type'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map? ?? {}),
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}

class SyncService {
  SyncService();

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  String? _token;
  Timer? _reconnectTimer;
  int _backoffSeconds = 1;
  bool _manualDisconnect = false;

  final _eventsController = StreamController<SyncEvent>.broadcast();
  final _stateController =
      StreamController<SyncConnectionState>.broadcast();

  Stream<SyncEvent> get events => _eventsController.stream;
  Stream<SyncConnectionState> get connectionState =>
      _stateController.stream;

  SyncConnectionState _state = SyncConnectionState.disconnected;
  SyncConnectionState get state => _state;

  void connect(String token) {
    _token = token;
    _manualDisconnect = false;
    _connectInternal();
  }

  void disconnect() {
    _manualDisconnect = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _setState(SyncConnectionState.disconnected);
  }

  void _connectInternal() {
    if (_token == null || _manualDisconnect) return;

    _setState(_state == SyncConnectionState.disconnected
        ? SyncConnectionState.connecting
        : SyncConnectionState.reconnecting);

    final uri = Uri.parse('${AppConfig.wsBaseUrl}?token=$_token');
    try {
      _channel = WebSocketChannel.connect(uri);
      _subscription = _channel!.stream.listen(
        _onMessage,
        onError: (_) => _scheduleReconnect(),
        onDone: () => _scheduleReconnect(),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _onMessage(dynamic raw) {
    try {
      final json = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = SyncEvent.fromJson(json);

      if (event.type == 'connected') {
        _backoffSeconds = 1;
        _setState(SyncConnectionState.connected);
        return;
      }

      if (event.type == 'pong') return;

      _eventsController.add(event);
    } catch (_) {
      /* ignore malformed */
    }
  }

  void _scheduleReconnect() {
    if (_manualDisconnect) return;
    _subscription?.cancel();
    _channel = null;
    _setState(SyncConnectionState.reconnecting);

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: _backoffSeconds), () {
      _backoffSeconds = (_backoffSeconds * 2).clamp(1, 30);
      _connectInternal();
    });
  }

  void _setState(SyncConnectionState newState) {
    _state = newState;
    if (!_stateController.isClosed) {
      _stateController.add(newState);
    }
  }

  void sendPing() {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({'type': 'ping'}));
    }
  }

  void dispose() {
    disconnect();
    _eventsController.close();
    _stateController.close();
  }
}

/// Merge de tarefa recebida via sync (last-write-wins por updatedAt).
Task? mergeTaskFromEvent(SyncEvent event, List<Task> current) {
  switch (event.type) {
    case 'task_created':
    case 'task_updated':
    case 'task_completed':
      final taskJson = event.payload['task'] as Map<String, dynamic>?;
      if (taskJson == null) return null;
      final incoming = Task.fromJson(taskJson);
      if (incoming.deletedAt != null) {
        current.removeWhere((t) => t.id == incoming.id);
        return null;
      }
      final index = current.indexWhere((t) => t.id == incoming.id);
      if (index >= 0) {
        final existing = current[index];
        if (incoming.updatedAt.isAfter(existing.updatedAt)) {
          current[index] = incoming;
        }
      } else {
        current.add(incoming);
      }
      return incoming;
    case 'task_deleted':
      final taskId = event.payload['taskId'] as String?;
      if (taskId != null) {
        current.removeWhere((t) => t.id == taskId);
      }
      return null;
    default:
      return null;
  }
}
