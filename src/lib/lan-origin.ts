import os from "node:os";

export type NetAddress = {
  address: string;
  family: string | number;
  internal: boolean;
};

function isPrivateIpv4(address: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(address);
}

function isIpv4Address(iface: NetAddress): boolean {
  if (iface.internal) return false;
  const family = iface.family;
  return family === "IPv4" || family === 4;
}

/** Prefere Wi‑Fi (192.168.x) sobre VPN (10.x) quando ambos existem. */
export function pickLanAddress(addresses: NetAddress[]): string | null {
  const candidates = addresses.filter(
    (iface) => isIpv4Address(iface) && isPrivateIpv4(iface.address),
  );
  const wifi = candidates.find((iface) => iface.address.startsWith("192.168."));
  if (wifi) return wifi.address;
  const cgn = candidates.find((iface) =>
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(iface.address),
  );
  if (cgn) return cgn.address;
  return candidates.find((iface) => iface.address.startsWith("10."))?.address ?? null;
}

export function lanOrigin(port: number, addresses: NetAddress[]): string | null {
  const ip = pickLanAddress(addresses);
  if (!ip) return null;
  return `http://${ip}:${port}`;
}

export function detectLanOrigin(
  port = Number(process.env.PORT) || 3000,
): string | null {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((iface): iface is os.NetworkInterfaceInfo => Boolean(iface));
  return lanOrigin(port, addresses);
}
