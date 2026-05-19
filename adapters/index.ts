import { blinkitAdapter } from "./blinkitAdapter";
import { bigbasketAdapter } from "./bigbasketAdapter";
import { zeptoAdapter } from "./zeptoAdapter";
import type { PlatformAdapter } from "../lib/types";

export const adapters: PlatformAdapter[] = [
  zeptoAdapter,
  bigbasketAdapter,
  blinkitAdapter,
];

export { blinkitAdapter, bigbasketAdapter, zeptoAdapter };
