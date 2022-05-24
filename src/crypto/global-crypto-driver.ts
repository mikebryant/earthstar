import { CryptoDriverNoble } from "./crypto-driver-noble.ts";
import { ICryptoDriver } from "./crypto-types.ts";
import { isDeno, isNode } from "https://deno.land/x/which_runtime@0.2.0/mod.ts";

//--------------------------------------------------

import { Logger } from "../util/log.ts";
let logger = new Logger("crypto", "cyan");

//================================================================================

export let GlobalCryptoDriver: ICryptoDriver = CryptoDriverNoble;

/** Set the crypto driver used for all cryptographic operations. */
export function setGlobalCryptoDriver(driver: ICryptoDriver): void {
  logger.debug(`set global crypto driver: ${(driver as any).name}`);
  GlobalCryptoDriver = driver;
}