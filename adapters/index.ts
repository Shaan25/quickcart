import { blinkitAdapter } from "./blinkitAdapter";
import { instamartAdapter } from "./instamartAdapter";
import { zeptoAdapter } from "./zeptoAdapter";
import type { PlatformAdapter } from "../lib/types";

export const adapters: PlatformAdapter[] = [
  blinkitAdapter,
  instamartAdapter,
  zeptoAdapter,
];

export { blinkitAdapter, instamartAdapter, zeptoAdapter };
