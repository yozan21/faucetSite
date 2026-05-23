import axios from "axios";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

export interface IpInfo {
  success: boolean;
  ip: string;
  country: string;
  countryCode: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  fraudScore: number;
}

export const getIpInfo = async (ip: string): Promise<IpInfo> => {
  try {
    if (!env.IPQUALITYSCORE_KEY) {
      // fallback if no key — allow but log
      logger.warn("IPQUALITYSCORE_KEY not set, skipping IP intelligence");
      return {
        success: false,
        ip,
        country: "Unknown",
        countryCode: "XX",
        isVpn: false,
        isProxy: false,
        isTor: false,
        isDatacenter: false,
        fraudScore: 0,
      };
    }

    const { data } = await axios.get(
      `https://ipqualityscore.com/api/json/ip/${env.IPQUALITYSCORE_KEY}/${ip}`,
      {
        params: {
          strictness: 1,
          allow_public_access_points: false,
          fast: false,
        },
        timeout: 5000,
      },
    );

    return {
      success: true,
      ip,
      country: data.country || "Unknown",
      countryCode: data.country_code || "XX",
      isVpn: data.vpn ?? false,
      isProxy: data.proxy ?? false,
      isTor: data.tor ?? false,
      isDatacenter: data.active_vpn ?? false,
      fraudScore: data.fraud_score ?? 0,
    };
  } catch (err) {
    // never block user if IP check fails — log and continue
    logger.error({ err, ip }, "IP intelligence check failed");
    return {
      success: false,
      ip,
      country: "Unknown",
      countryCode: "XX",
      isVpn: false,
      isProxy: false,
      isTor: false,
      isDatacenter: false,
      fraudScore: 0,
    };
  }
};

export const isSuspiciousIp = (ipInfo: IpInfo): boolean => {
  return (
    ipInfo.isVpn ||
    ipInfo.isProxy ||
    ipInfo.isTor ||
    ipInfo.isDatacenter ||
    ipInfo.fraudScore >= 75
  );
};
