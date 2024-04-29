import { Balance } from "@proto-kit/library";
import { Balances } from "./balances";
import { SpyMaster, SpyMasterPrivate } from "./spy_master";
import { ModulesConfig } from "@proto-kit/common";

export const modules = {
  Balances,
  SpyMaster,
  SpyMasterPrivate,
};

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
  },
  SpyMaster: {},
  SpyMasterPrivate: {},
};

export default {
  modules,
  config,
};
