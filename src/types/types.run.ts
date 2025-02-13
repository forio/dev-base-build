import { PseudonymReadOutView } from './types.user';

export type RunReadOutView = {
  cluster?: string;
  hidden?: boolean;
  modelVersion?: number;
  lastOperated?: string;
  modelLanguage?: string;
  perpetual?: boolean;
  cloud?: string;
  metaData?: Record<string, unknown>;
  grammar?: string;
  trackingKey?: string;
  scope?: JPAScopeReadOutView;
  executionContext?: V1ExecutionContext;
  allowChannel?: boolean;
  marked?: boolean;
  variables?: Record<string, unknown>;
  address?: JPAAddressReadOutView;
  tombstone?: string;
  morphology?: string;
  modelFile?: string;
  created?: string;
  runKey: string;
  permit?: JPAPermitReadOutView;
  closed?: boolean;
  lastModified?: string;
  runState?: string;
  user?: PseudonymReadOutView;
};

type JPAScopeReadOutView = {
  scopeBoundary?: string;
  scopeKey?: string;
  userKey?: string;
};

type V1ExecutionContext = {
  presets?: Record<string, Record<string, unknown>>;
  mappedFiles?: Record<string, string>;
  version: string;
  tool?: StellaModelTool | VensimModelTool;
};

type StellaModelTool = {
  gameMode?: boolean;
  objectType: 'stella';
};

type VensimModelTool = {
  sensitivityMode?: boolean;
  cinFiles?: string[];
  objectType: 'vensim';
};

type JPAAddressReadOutView = {
  projectShortName?: string;
  groupName?: string;
  accountShortName?: string;
  worldKey?: string;
  episodeName?: string;
};

type JPAPermitReadOutView = {
  writeLock?:
    | 'SYSTEM'
    | 'MONITOR'
    | 'AUTHOR'
    | 'SUPPORT'
    | 'FACILITATOR'
    | 'REVIEWER'
    | 'USER'
    | 'LEADER'
    | 'PARTICIPANT'
    | 'ANONYMOUS';
  readLock?:
    | 'SYSTEM'
    | 'MONITOR'
    | 'AUTHOR'
    | 'SUPPORT'
    | 'FACILITATOR'
    | 'REVIEWER'
    | 'USER'
    | 'LEADER'
    | 'PARTICIPANT'
    | 'ANONYMOUS';
};

export type Editor = Record<string, string | null>;

export type Dataset = {
  runKey: string;
  styleId: number;
  label?: string;
  variables?: Record<string, number[]>;
};
