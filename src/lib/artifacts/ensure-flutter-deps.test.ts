import { describe, expect, it } from "vitest";
import { patchFlutterHtmlDartSource, repairFlutterPubspec } from "./ensure-flutter-deps";

describe("repairFlutterPubspec", () => {
  it("troca flutter_html por flutter_widget_from_html_core", () => {
    const files = {
      "mobile/pubspec.yaml": `name: educa
dependencies:
  flutter:
    sdk: flutter
  flutter_html: ^3.0.0-beta.2

flutter:
  uses-material-design: true

dependency_overrides:
  csslib: 0.17.3
`,
      "mobile/lib/features/courses/screens/article_reader_screen.dart": `import 'package:flutter_html/flutter_html.dart';

child: Html(
  data: _conteudo!,
  style: {
    'body': Style(fontSize: FontSize(16)),
  },
),`,
    };
    repairFlutterPubspec(files);
    expect(files["mobile/pubspec.yaml"]).toContain(
      "flutter_widget_from_html_core: ^0.16.0",
    );
    expect(files["mobile/pubspec.yaml"]).not.toContain("flutter_html");
    expect(files["mobile/pubspec.yaml"]).not.toContain("csslib");
    expect(files["mobile/lib/features/courses/screens/article_reader_screen.dart"]).toContain(
      "flutter_widget_from_html_core",
    );
    expect(files["mobile/lib/features/courses/screens/article_reader_screen.dart"]).toContain(
      "HtmlWidget(_conteudo!",
    );
  });

  it("rebaixa flutter_widget_from_html para core (evita audio_session)", () => {
    const files = {
      "mobile/pubspec.yaml": `dependencies:
  flutter_widget_from_html: ^0.16.0
`,
      "mobile/lib/a.dart": `import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';`,
    };
    repairFlutterPubspec(files);
    expect(files["mobile/pubspec.yaml"]).toContain("flutter_widget_from_html_core");
    expect(files["mobile/pubspec.yaml"]).not.toContain("flutter_widget_from_html:");
    expect(files["mobile/lib/a.dart"]).toContain("flutter_widget_from_html_core");
  });
});

describe("patchFlutterHtmlDartSource", () => {
  it("converte Html simples para HtmlWidget", () => {
    const source =
      "import 'package:flutter_html/flutter_html.dart';\nHtml(data: htmlContent)";
    expect(patchFlutterHtmlDartSource(source)).toContain("HtmlWidget(htmlContent)");
  });
});
