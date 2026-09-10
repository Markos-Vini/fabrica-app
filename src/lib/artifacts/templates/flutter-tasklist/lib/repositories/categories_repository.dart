import '../core/api/api_client.dart';
import '../core/config/app_config.dart';
import '../core/demo/demo_store.dart';
import '../models/task.dart';

class CategoriesRepository {
  CategoriesRepository(this._api);

  final ApiClient _api;

  Future<List<Category>> fetchCategories() async {
    if (AppConfig.demoMode) {
      return DemoStore.categories;
    }
    final data = await _api.get<Map<String, dynamic>>('/categories');
    final items = data!['items'] as List<dynamic>;
    return items
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
