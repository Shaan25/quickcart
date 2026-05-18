import { blinkitAdapter } from "./blinkitAdapter";
import { jiomartAdapter } from "./jiomartAdapter";
import { zeptoAdapter } from "./zeptoAdapter";
import type { PlatformAdapter } from "../lib/types";

export const adapters: PlatformAdapter[] = [
  blinkitAdapter,
  jiomartAdapter,
  zeptoAdapter,
];

export { blinkitAdapter, jiomartAdapter, zeptoAdapter };
