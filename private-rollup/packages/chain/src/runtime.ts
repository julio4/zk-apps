import { Balance } from "@proto-kit/library";
import { Balances } from "./balances";
import { SpyMaster } from "./spy_master";
import { ModulesConfig } from "@proto-kit/common";

export const modules = {
  Balances,
  SpyMaster,
};

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
  },
  SpyMaster: {},
};

export default {
  modules,
  config,
};
