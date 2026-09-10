/** Flutter validado com APK debug (chewie 1.11 + fwfh_core). */
export const FLUTTER_CI_VERSION = "3.35.1";

export function androidWorkflow(mobileStack: string): string {
  const stack = mobileStack.toLowerCase();
  const flutter = stack.includes("flutter");
  const reactNative = stack.includes("react native");
  const native =
    !reactNative &&
    (stack.includes("kotlin") ||
      stack.includes("swift") ||
      stack.includes("native"));

  if (flutter) {
    return flutterWorkflow();
  }

  if (reactNative) {
    return reactNativeWorkflow();
  }

  if (native) {
    return nativeGradleWorkflow();
  }

  return pwaNoteWorkflow(mobileStack);
}

function flutterWorkflow(): string {
  return `name: APK debug de teste
on:
  workflow_dispatch:
concurrency:
  group: apk-debug-\${{ github.repository }}
  cancel-in-progress: true
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          channel: stable
          flutter-version: "${FLUTTER_CI_VERSION}"
          cache: true
      - run: flutter pub get
        working-directory: mobile
      - name: Scaffold Android (v2 embedding)
        run: |
          MAIN_BACKUP=""
          if [ -f lib/main.dart ]; then
            MAIN_BACKUP="$(mktemp)"
            cp lib/main.dart "$MAIN_BACKUP"
          fi
          if [ ! -f android/app/src/main/AndroidManifest.xml ] || \
             [ ! -f android/app/build.gradle ] || \
             grep -q "io.flutter.app.FlutterApplication" android/app/src/main/AndroidManifest.xml 2>/dev/null; then
            rm -rf android
            flutter create . --platforms=android --no-pub
          fi
          if [ -n "$MAIN_BACKUP" ] && [ -f "$MAIN_BACKUP" ]; then
            cp "$MAIN_BACKUP" lib/main.dart
          fi
          mkdir -p android/app/src/debug
          cat > android/app/src/debug/AndroidManifest.xml << 'EOF'
          <manifest xmlns:android="http://schemas.android.com/apk/res/android">
              <uses-permission android:name="android.permission.INTERNET"/>
              <application android:usesCleartextTraffic="true"/>
          </manifest>
          EOF
        working-directory: mobile
      - name: Verify mobile entrypoint
        working-directory: mobile
        run: |
          test -f lib/main.dart
          grep -q "runApp" lib/main.dart
          ! grep -q "PreviewApp" lib/main.dart
      - run: flutter analyze --no-fatal-infos
        working-directory: mobile
      - run: flutter build apk --debug --dart-define=DEMO_MODE=true
        working-directory: mobile
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: mobile/build/app/outputs/flutter-apk/app-debug.apk
`;
}

function reactNativeWorkflow(): string {
  return `name: APK debug de teste
on:
  workflow_dispatch:
concurrency:
  group: apk-debug-\${{ github.repository }}
  cancel-in-progress: true
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
        working-directory: mobile
      - run: npx expo prebuild --platform android --non-interactive --no-install
        working-directory: mobile
      - run: chmod +x android/gradlew && ./gradlew assembleDebug
        working-directory: mobile
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: mobile/android/app/build/outputs/apk/debug/app-debug.apk
`;
}

function nativeGradleWorkflow(): string {
  return `name: APK debug de teste
on:
  workflow_dispatch:
concurrency:
  group: apk-debug-\${{ github.repository }}
  cancel-in-progress: true
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - name: Assemble debug
        run: |
          if [ -f mobile/android/gradlew ]; then
            cd mobile/android && chmod +x gradlew && ./gradlew assembleDebug
          elif [ -f android/gradlew ]; then
            cd android && chmod +x gradlew && ./gradlew assembleDebug
          else
            echo "Projeto Android ainda não tem gradlew — clone o repo e rode flutter create ."
            exit 0
          fi
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: "**/*debug*.apk"
          if-no-files-found: ignore
`;
}

function pwaNoteWorkflow(mobileStack: string): string {
  return `name: Preview PWA de teste
on:
  workflow_dispatch:
concurrency:
  group: apk-debug-\${{ github.repository }}
  cancel-in-progress: true
jobs:
  note:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "Stack ${mobileStack} usa PWA/Web Mobile."
          echo "Abra o front-end web gerado no ZIP ou repositório GitHub."
          echo "Não há APK nativo neste pedido."
`;
}
