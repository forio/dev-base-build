import * as z from 'zod';
import { PseudonymReadOutSchema, RoleSchema } from './world';

/**
 * A user's arrival at a barrier, indicating they've submitted their actions.
 */
export const BarrierArrivalReadOutSchema = z.looseObject({
  arrived: z.string(), // ISO date string
  message: z.string().optional(),
  user: PseudonymReadOutSchema,
});

export const BaseBarrierReadOutSchema = z.looseObject({
  paused: z.boolean(),
  triggered: z.boolean(),
  worldKey: z.string(),
  transparent: z.boolean(),
  instantiated: z.boolean(),
  stage: z.string(),
  allowChannel: z.boolean(),
  name: z.string(),
  closed: z.boolean(),
  secondsLeft: z.number(),
  ttlSeconds: z.number(),
  result: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Full barrier readout including role-based arrival tracking.
 *
 * - expectedRoles: Record<Role, count> — how many arrivals expected per role
 * - impendingRoles: Record<Role, Pseudonym[]> — users who haven't arrived yet
 * - arrivedRoles: Record<Role, BarrierArrival[]> — users who have arrived
 */
export const BarrierReadOutSchema = BaseBarrierReadOutSchema.extend({
  expectedRoles: z.record(RoleSchema, z.number()),
  impendingRoles: z.record(RoleSchema, z.array(PseudonymReadOutSchema).default([])),
  arrivedRoles: z.record(RoleSchema, z.array(BarrierArrivalReadOutSchema).default([])),
});

export type BarrierReadOutView = z.infer<typeof BarrierReadOutSchema>;
export type BarrierArrivalReadOutView = z.infer<typeof BarrierArrivalReadOutSchema>;
