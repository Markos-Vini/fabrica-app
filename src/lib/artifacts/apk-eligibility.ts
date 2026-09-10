export function supportsNativeApk(mobileStack: string): boolean {
  const stack = mobileStack.toLowerCase();
  return (
    stack.includes("flutter") ||
    stack.includes("react native") ||
    stack.includes("kotlin") ||
    stack.includes("swift") ||
    stack.includes("native")
  );
}

export function initialApkStatus(input: {
  generateTestBuild: boolean;
  mobileStack: string;
}): "idle" | "skipped" {
  if (!input.generateTestBuild) return "skipped";
  if (!supportsNativeApk(input.mobileStack)) return "skipped";
  return "idle";
}
