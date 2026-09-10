import { supportsNativeApk } from "@/lib/artifacts/apk-eligibility";
import type { DemoAccount } from "./demo-accounts";
import type { OrderRecord } from "@/lib/store";

export type StakeholderDemoState = {
  showSection: boolean;
  web: {
    available: boolean;
    url: string | null;
    pending: boolean;
    hint: string | null;
  };
  mobile: {
    available: boolean;
    skipped: boolean;
    status: string;
    hint: string | null;
    canTrigger: boolean;
  };
  accounts: DemoAccount[];
};

export function buildStakeholderDemoState(input: {
  order: OrderRecord;
  vercelConfigured: boolean;
  demoAccounts: DemoAccount[];
  publishing: boolean;
  apkBusy: boolean;
}): StakeholderDemoState {
  const { order, vercelConfigured, demoAccounts, publishing, apkBusy } = input;

  const wantsWeb = order.includeFrontend;
  const wantsMobile =
    order.includeMobile &&
    order.generateTestBuild &&
    supportsNativeApk(order.mobileStack);

  const showSection = wantsWeb || wantsMobile;

  let webHint: string | null = null;
  if (wantsWeb && !vercelConfigured) {
    webHint = "Cadastre o token da Vercel em Configurações para publicar a demo web.";
  } else if (wantsWeb && !order.vercelUrl && order.vercelError) {
    webHint = order.vercelError;
  } else if (wantsWeb && !order.vercelUrl && publishing) {
    webHint = "Publicando front-end na Vercel…";
  } else if (wantsWeb && !order.vercelUrl) {
    webHint = "Republica o pedido após configurar GitHub/Vercel.";
  }

  let mobileHint: string | null = null;
  if (wantsMobile && order.apkStatus === "skipped") {
    mobileHint = "APK não solicitado neste pedido.";
  } else if (wantsMobile && !order.githubUrl) {
    mobileHint = "Cadastre o token do GitHub e republica para gerar o APK.";
  } else if (wantsMobile && order.apkStatus === "failed" && order.apkError) {
    mobileHint = order.apkError;
  } else if (wantsMobile && apkBusy) {
    mobileHint = "Compilando APK no GitHub Actions…";
  } else if (wantsMobile && order.apkStatus === "idle" && order.githubUrl) {
    mobileHint = "Clique em Gerar APK na seção abaixo ou aguarde o build automático.";
  }

  return {
    showSection,
    web: {
      available: Boolean(order.vercelUrl) && !order.vercelError,
      url: order.vercelUrl,
      pending: publishing && wantsWeb && !order.vercelUrl,
      hint: webHint,
    },
    mobile: {
      available: order.apkStatus === "ready",
      skipped: !wantsMobile,
      status: order.apkStatus,
      hint: mobileHint,
      canTrigger:
        wantsMobile &&
        order.apkStatus !== "ready" &&
        order.apkStatus !== "building" &&
        Boolean(order.githubUrl),
    },
    accounts: demoAccounts,
  };
}
