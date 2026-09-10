import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";
import { androidWorkflow } from "@/lib/artifacts/android-workflow";
import type { OrderInput } from "@/lib/types";

export const APK_WORKFLOW_PATH = ".github/workflows/android-debug.yml";

export function ensureApkWorkflowFiles(
  order: OrderInput,
  files: Record<string, string>,
): Record<string, string> {
  if (
    !order.generateTestBuild ||
    !order.includeMobile ||
    !supportsNativeApk(order.mobileStack)
  ) {
    return files;
  }

  return {
    ...files,
    [APK_WORKFLOW_PATH]: androidWorkflow(order.mobileStack),
  };
}
