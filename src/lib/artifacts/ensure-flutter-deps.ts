/** Render HTML sem deps de áudio/vídeo — evita audio_session que quebra no Gradle. */
const FWFH_CORE_PIN = "^0.16.0";

/** Versão validada localmente com APK debug (chewie + fwfh_core). */
export const FLUTTER_APK_CI_VERSION = "3.35.1";

function stripLegacyCsslibOverride(pubspec: string): string {
  if (!pubspec.includes("dependency_overrides:")) return pubspec;

  const lines = pubspec.split("\n");
  const out: string[] = [];
  let inOverrides = false;
  const overrideBody: string[] = [];

  for (const line of lines) {
    if (line.trim() === "dependency_overrides:") {
      inOverrides = true;
      overrideBody.length = 0;
      continue;
    }

    if (inOverrides) {
      const isTopLevel = /^\S/.test(line) && !line.startsWith(" ");
      if (isTopLevel) {
        if (overrideBody.length > 0) {
          out.push("dependency_overrides:");
          out.push(...overrideBody);
        }
        inOverrides = false;
        out.push(line);
        continue;
      }
      if (/^\s*csslib:\s*0\.17\.3\s*$/.test(line)) continue;
      if (line.trim()) overrideBody.push(line);
      continue;
    }

    out.push(line);
  }

  if (inOverrides && overrideBody.length > 0) {
    out.push("dependency_overrides:");
    out.push(...overrideBody);
  }

  return out.join("\n");
}

function projectUsesLegacyHtml(files: Record<string, string>): boolean {
  const pubspec = files["mobile/pubspec.yaml"] ?? "";
  if (/flutter_html:/.test(pubspec)) return true;
  return Object.entries(files).some(
    ([path, content]) =>
      path.startsWith("mobile/") && path.endsWith(".dart") && content.includes("flutter_html"),
  );
}

function patchFlutterHtmlDartSource(content: string): string {
  if (!content.includes("flutter_html")) return content;

  let patched = content.replace(
    /import 'package:flutter_html\/flutter_html\.dart';?\r?\n?/g,
    "import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';\n",
  );

  patched = patched.replace(
    /Html\(\s*data:\s*([^,]+?),\s*style:\s*\{[\s\S]*?\},\s*\)/g,
    (_match, dataExpr: string) =>
      `HtmlWidget(${dataExpr.trim()}, textStyle: const TextStyle(fontSize: 16, height: 1.5, color: AppColors.textPrimary))`,
  );

  patched = patched.replace(
    /Html\(\s*data:\s*([^,)]+?)\s*\)/g,
    (_match, dataExpr: string) => `HtmlWidget(${dataExpr.trim()})`,
  );

  return patched;
}

function patchFwfhImport(content: string): string {
  return content.replace(
    /import 'package:flutter_widget_from_html\/flutter_widget_from_html\.dart';?\r?\n?/g,
    "import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';\n",
  );
}

function normalizeHtmlPackageInPubspec(pubspec: string): string {
  let next = pubspec;

  if (/flutter_html:/.test(next)) {
    next = next.replace(
      /^\s*flutter_html:\s*[^\n]+\n/gm,
      `  flutter_widget_from_html_core: ${FWFH_CORE_PIN}\n`,
    );
  }

  if (/flutter_widget_from_html:/.test(next)) {
    next = next.replace(
      /^\s*flutter_widget_from_html:\s*[^\n]+\n/gm,
      `  flutter_widget_from_html_core: ${FWFH_CORE_PIN}\n`,
    );
  }

  return next;
}

/**
 * Corrige pubspec.yaml e fontes Dart para builds APK no GitHub Actions.
 * - flutter_html e flutter_widget_from_html quebram ou puxam audio_session
 * - fwfh_core renderiza artigos sem deps nativas extras
 */
export function repairFlutterPubspec(files: Record<string, string>): void {
  const pubPath = "mobile/pubspec.yaml";
  let pubspec = files[pubPath];
  if (!pubspec?.trim()) return;

  const usesLegacyHtml = projectUsesLegacyHtml(files);
  pubspec = normalizeHtmlPackageInPubspec(pubspec);
  pubspec = stripLegacyCsslibOverride(pubspec);
  files[pubPath] = pubspec;

  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.startsWith("mobile/") || !filePath.endsWith(".dart")) continue;
    let patched = patchFwfhImport(content);
    if (usesLegacyHtml) patched = patchFlutterHtmlDartSource(patched);
    if (patched !== content) files[filePath] = patched;
  }
}

export { patchFlutterHtmlDartSource, FWFH_CORE_PIN };
