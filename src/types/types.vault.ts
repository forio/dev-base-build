import { GenericScope, Permit } from 'epicenter-libs';

export type VaultCreateInView = {
  scope: { userKey?: string } & GenericScope;
  permit: Permit;
  items?: Items;
};

export type Items = {
  set?: Record<string, unknown>;
  push?: Record<string, unknown>;
  pop?: Record<string, unknown>;
};

export type VaultReadOutView = {
  created: string;
  lastUpdated: string;
  mutationKey: string;
  address: unknown;
  scope: { userKey?: string } & GenericScope;
  name: string;
  permit: Permit;
  vaultKey: string;
  expiration: string;
  items?: Record<string, unknown>;
  changed?: boolean;
};
