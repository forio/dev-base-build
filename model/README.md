# Excel Toy Model: Role Responsibilities

This Excel model is designed to demonstrate how Consensus coordinates multi-role
participation around a spreadsheet-driven simulation. Each role owns specific inputs for
the current period (the column pointed to by `Step`).

## Carry-over inputs

Input rows are seeded in the first column and then **carry forward** by default: each
subsequent column references the prior column. Participants can override the current
period by writing directly to the `Step` column, which replaces the formula for that cell.

## Model protections (.ctx2)

Role-based write guards are defined in `model/model.ctx2` to ensure only the correct world
role can edit each input range. The guards apply to variable writes and match the variable
name plus any optional index (for example, `Price` or `Price[0,3]`).

- `Sales` can write `Price` and `Demand`.
- `Operations` can write `Capacity` and `Variable_Cost`.
- `Finance` can write `Fixed_Costs`.

## Time alignment (decision year vs report year)

- `Step` indexes the **decision year** column in the input rows (`Price`, `Demand`,
  `Capacity`, `Variable_Cost`, `Fixed_Costs`) and the aligned output rows (`Units_Sold`,
  `Revenue`, `Total_Costs`, `Profit`).
- The **report rows** (`Report_Units_Sold`, `Report_Revenue`, `Report_Total_Costs`,
  `Report_Profit`) are shifted one column left, so `INDEX(Report_Profit, 1, Step)` returns
  the **previous year's** results without UI-side `Step - 1` math.
- This keeps UI code simple: always index by `Step`, choosing Input/Output vs Report
  ranges depending on whether you want decision-year values or prior-year reports.

## Roles

**Sales — “What will the market pay?”**

- Sets `Price` and `Demand` for the current period.
- Represents the top-line opportunity and market pressure.
- Overpricing shrinks demand; underpricing leaves revenue on the table.
- Sales provides the market reality check.

**Operations — “What can we actually deliver?”**

- Sets `Capacity` and `Variable_Cost` for the current period.
- Translates physical constraints and unit economics into the model.
- Ops is the supply-side limiter: feasibility and per-unit cost.

**Finance — “What fixed burden must we carry?”**

- Sets `Fixed_Costs` for the current period.
- Anchors the structural overhead that exists regardless of volume.
- Highlights when revenue is insufficient to cover fixed obligations.

**Facilitator — “Keep the round moving.”**

- Uses Consensus to enforce timeboxing, provide defaults if someone is missing, and
  advance `Step`.
- The facilitator is the process owner, not a player: they keep the simulation
  synchronized and fair.

## Pedagogical arc

Market signal (Sales) → Operational feasibility (Ops) → Financial viability (Finance) →
Round cadence (Facilitator).
