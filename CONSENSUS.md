# Consensus Bike Shop Guide

This example shows how Epicenter Consensus can coordinate a role-based, round-based
simulation when the model itself is simple. The app is a bike shop run by three roles:
Sales, Operations, and Finance. Each role changes its own inputs, then checks in at the
same barrier. When all expected roles have arrived, the simulation advances exactly once.

The goal is not to demonstrate voting or negotiation. Consensus is a readiness gate: it
answers "who is done with this round?" and, when the gate resolves, triggers a shared
model action.

## Product Story

The bike shop model is intentionally spreadsheet-shaped. It has inputs for price, demand,
capacity, variable cost, and fixed costs. It calculates units sold, revenue, total costs,
and profit. Players can see how each role's local decision affects the shared business
outcome.

Consensus adds the multiplayer cadence around that model:

1. Each player edits only the inputs owned by their role.
2. The app writes those inputs to the current model step.
3. The player submits to the round barrier.
4. The UI shows which roles are still waiting.
5. When the last required role arrives, Epicenter runs the shared `step` action once.
6. The next year appears with the updated report.

That is the core teaching point: a simple model can still support coordinated multiplayer
play when the platform owns role readiness, timeboxing, and exactly-once advancement.

## How The App Uses Consensus

The app uses an opaque barrier for each round. Opaque is the right mode here because the
thing being coordinated is one shared action: advance the run.

The flow in code is:

1. Create or load a barrier for the current `Step`.
2. Expect one `Sales`, one `Operations`, and one `Finance` arrival.
3. Store a default action of `{ null: [step] }`.
4. Set `ttlSeconds` so every round has a decision window.
5. On submit, write the player's variables through the Run API.
6. Submit the same `[step]` action to Consensus.

For the first two arrivals, an opaque barrier records readiness and discards the submitted
`step` action. On the final arrival, the barrier closes and executes that final submitted
`step`. Because every player submits the same action, it does not matter which player is
last.

## Timed Rounds

Every round has a timeout. The app displays the final part of the countdown and exposes a
Continue On action when the timer has expired and another role is still missing.

Backend behavior matters here:

- Reading a barrier does not close it, even if the timer has expired.
- A write path must resolve an expired barrier.
- This app uses the submit path for Continue On. When Epicenter receives that publish
  after the timeout, it closes the barrier and runs default actions for missing roles.
- The backend also exposes facilitator close and participant complete endpoints for
  timed-out barriers.

The default action is a shared `step`, so timeout resolution advances the model once even
if one or more players never arrive.

## Why Not Transparent

Transparent barriers execute each arriving player's submitted actions immediately. That is
useful when each arrival has a meaningful independent effect.

It is not the right default for this example. If every player submitted `step` to a
transparent barrier, the run could step once per arrival. If players submitted only
variable writes, there would be no server-side completion action to step the run after
everyone arrived.

For this product experience, opaque Consensus gives the intended behavior: players make
their decisions independently, and the model advances once when the group is ready.

## When This Pattern Fits

Use this pattern when:

- The simulation is organized around rounds or steps.
- Each player has role-specific work to complete before the round advances.
- The model can accept direct variable writes before the step.
- A single shared action should run after all required roles arrive.
- Timeouts and facilitator override are part of the session design.

Skip this pattern when:

- Each participant's action should affect the model immediately.
- The model already tracks role submissions and advances itself.
- The workflow needs voting, aggregation, or a queue of different submitted actions.
- The session is continuous rather than organized around discrete checkpoints.

## Backend Contract Notes

These notes are based on the local Epicenter implementation in
`grid/consensus/src/main/java/com/forio/epicenter/grid/consensus/v4`.

- Barriers are scoped by `worldKey`, `name`, and `stage`.
- Create is idempotent only when the existing barrier has the same behavior and expected
  roles. A conflicting create is rejected.
- Expected roles default to persona minimums if the client omits them.
- `actions` on create are default actions for missing roles, not a general completion
  hook.
- `publish` records the caller's arrival and executes the submitted command only when the
  barrier reports `triggered: true`.
- In opaque mode, `triggered: true` happens on the final required arrival.
- In transparent mode, each new arrival can trigger its own submitted command.
- On timeout or close, default actions run for missing roles. Opaque barriers run one
  default action and stop; transparent barriers run defaults for all missing roles.
- `secondsLeft` is calculated in the read view. It can reach zero before the barrier is
  closed.
- `allowChannel` opts this resource into Consensus push events for projects that require
  explicit channel enablement.

## Files To Read

- `src/query/consensus.ts` creates the barrier for each round.
- `src/routes/play/index/index.tsx` writes role variables and submits the shared `step`.
- `src/routes/play/index/sidebar.tsx` displays readiness and timeout state.
- `model/README.md` documents the spreadsheet role model and time alignment.
