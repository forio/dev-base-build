import * as z from 'zod';

const CountdownReadOutSchema = z.looseObject({
  last: z.string(),
  count: z.number().int(),
});

const MFADetailReadOutSchema = z.looseObject({
  mfaMethodology: z.string(),
});

const GraftReadOutSchema = z.looseObject({
  reference: z.string(),
  realm: z.looseObject({
    type: z.string(),
    authority: z.string(),
  }),
});

const BaseUserReadOutSchema = z.looseObject({
  handle: z.string(),
  lastLogin: z.string(),
  modality: z.string(),
  created: z.string(),
  givenName: z.string(),
  countdown: CountdownReadOutSchema,
  active: z.boolean(),
  lastUpdated: z.string(),
  uploadOrder: z.number().int().optional(),
  familyName: z.string(),
  email: z.string().optional(),
  mfaDetail: MFADetailReadOutSchema,
  loginCount: z.number().int(),
});

const NativeUserReadOutSchema = BaseUserReadOutSchema.extend({
  objectType: z.literal('native'),
});

const ExternalUserReadOutSchema = BaseUserReadOutSchema.extend({
  objectType: z.literal('external'),
  graft: GraftReadOutSchema,
});

const GroupRelationshipReadOutSchema = z.looseObject({
  groupName: z.string(),
  role: z.enum(['FACILITATOR', 'REVIEWER', 'LEADER', 'PARTICIPANT']),
  available: z.boolean(),
});

export const PseudonymReadOutSchema = z.looseObject({
  lastUpdated: z.string(),
  created: z.string(),
  displayName: z.string(),
  detail: z.union([NativeUserReadOutSchema, ExternalUserReadOutSchema]).optional(),
  relationship: GroupRelationshipReadOutSchema.optional(),
  userId: z.number().int(),
  userKey: z.string(),
});

export const ROLES = ['Sales', 'Operations', 'Finance'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

const AssignmentReadOutSchema = z.looseObject({
  role: RoleSchema,
  user: PseudonymReadOutSchema,
});

export const PersonaReadOutSchema = z.looseObject({
  role: z.string(),
  marginal: z.number().int(),
  maximum: z.number().int(),
  insertionOrder: z.number().int(),
  minimum: z.number().int(),
});

export const BaseWorldReadOutSchema = z.looseObject({
  lastUpdated: z.string(),
  assignments: z.array(AssignmentReadOutSchema),
  orbitKey: z.string(),
  worldKey: z.string(),
  created: z.string(),
  displayName: z.string().optional(),
  runKey: z.string().optional(),
  allowChannel: z.boolean(),
  orbitType: z.string(),
  name: z.string(),
  room: z.string().optional(),
});

export const WorldReadOutSchema = BaseWorldReadOutSchema.extend({
  personae: z.array(PersonaReadOutSchema),
});

export const WorldReadOutArraySchema = z.array(WorldReadOutSchema);
