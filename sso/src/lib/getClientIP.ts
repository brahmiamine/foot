/**
 * Extrait l'IP réelle du client depuis les headers de la requête, en gérant
 * les proxies (Cloudflare, nginx...). Copié depuis arbinote/superadmin
 * (src/lib/utils.ts) qui l'utilisaient pour le même usage (rate-limit login).
 */

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

export function getClientIP(request: Request): string {
  try {
    const cfIP = request.headers.get("cf-connecting-ip");
    if (cfIP && isValidIP(cfIP)) {
      return cfIP;
    }

    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean);
      for (let i = ips.length - 1; i >= 0; i--) {
        if (isValidIP(ips[i])) {
          return ips[i];
        }
      }
    }

    const realIP = request.headers.get("x-real-ip");
    if (realIP && isValidIP(realIP)) {
      return realIP;
    }

    const clientIP = request.headers.get("x-client-ip");
    if (clientIP && isValidIP(clientIP)) {
      return clientIP;
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}
