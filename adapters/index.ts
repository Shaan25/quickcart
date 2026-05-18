import { blinkitAdapter } from "./blinkitAdapter";
import { bigbasketAdapter } from "./bigbasketAdapter";
import { zeptoAdapter } from "./zeptoAdapter";
import type { PlatformAdapter } from "../lib/types";

export const adapters: PlatformAdapter[] = [
  blinkitAdapter,
  bigbasketAdapter,
  zeptoAdapter,
];

export { blinkitAdapter, bigbasketAdapter, zeptoAdapter };
