# Assets and other income

Date: 2026-09-28. Status: approved in conversation, pending review of this write-up.

## Goal

Let anyone describe a real situation (more than one kind of asset, income besides a salary) and get an honest FI date, without making the form harder for someone who only has one investment balance and a salary. Works for any country, both languages, every currency.

**Rules the design keeps:**
- The plain case (one investment balance, no other income) looks and calculates exactly as today.
- No double counting. Interest on a deposit is that deposit's return, not "income". Rent is income; the property's value is not spendable.
- Extra inputs appear only when someone adds them.

**Out of scope for v1:** accounts locked until an age (super, 401k) and the "bridge" before they open; selling or downsizing property; expenses that change at an age (mortgage ending); income that stops at an age; saving assets and income into the database scenarios.

## Inputs

**"What you have"** replaces "Current investments". It starts with one row, Investments, holding the current balance. "+ Add" offers three kinds, each with an icon:

| Kind | Asks for | Grows at | Counts toward FI |
|---|---|---|---|
| Investments | amount | the expected annual return | yes |
| Savings / deposits | amount, interest rate (default 4%) | its interest rate | yes |
| Property | amount (estimated value) | inflation (value keeps pace) | no, net worth only; hint: "Add its rent under Other income" |

- All Investments rows share one pool.
- Monthly savings (income minus expenses) go into that pool.
- A row can be removed, except the first Investments row.

**"Other income"** is a new section, empty by default. "+ Add" offers Rent, Pension, Side income and Other, each with an icon. A row asks for an amount per month (in today's money, rising with inflation) and "from age" (default: current age).

- Budget "Income" is relabelled "Take-home pay" so salary isn't entered twice.
- At most 10 rows per list.

## Calculation (lib/fire-calc.ts)

`FireInputs` gains two optional fields: `assets` (extra rows, kinds savings/property/investments) and `otherIncome` (kind, monthly, fromAge). When both are absent the projection is identical to today's; this is tested.

Each year:
- **Other income active** = the sum of rows whose fromAge ≤ age, inflation-adjusted.
- **Need** = max(0, expenses − other income active).
- **Before retirement:** the investment pool gets monthly contributions × 12, plus the other income active for the year. Deposits grow at their own rates.
- **FI test:** withdrawal rate × (investment pool + deposits) ≥ need. Property is excluded.
- **Income crossover:** the investment pool × return, plus each deposit × its rate, ≥ need.
- **After retirement:** the year's need is withdrawn from the investment pool and deposits in proportion to their balances.
- **The FIRE number** each year = need ÷ withdrawal rate. It drops when, for example, a pension starts.
- **New per-year output:** `otherIncome`, `netWorth` (investment pool + deposits + property).

Retirement stays permanent, as today.

## Results and chart

- The headline and stat row are unchanged. "FIRE number today" uses today's need, so rent shows up directly.
- A line under the headline, "Net worth X, including property", appears only when property was added.
- **Portfolio tab:** the balance is the investment pool plus deposits; the FIRE-number line follows need ÷ withdrawal rate.
- **Cash flow tab:** gains an "Other income" line only when there is other income. The third series colour is validated with the dataviz palette script before use.
- The CSV export gains "Other income" and "Net worth" columns.

## Link, languages, help

- **Link:** repeated params `asset=kind:amount[:rate]` and `income=kind:monthly:fromAge`, for example `asset=savings:20000:4&income=rent:1200:36`. `invested` stays the first Investments row, so existing links still work. Unknown kinds, bad numbers and rows beyond 10 are dropped on read.
- **Languages:** every new label is in English and Vietnamese (lib/i18n.ts, type-checked).
- **Help dialog:** a short paragraph on "What you have" vs "Other income", and why interest isn't income.

## Testing

- **Calculation:** no extras gives the same projection as before; rent lowers the FIRE number and brings the FI year forward; income from a later age counts only from that age; property is excluded from FI but included in net worth; a deposit grows at its own rate.
- **Link:** round-trip with lists; invalid rows dropped; 10-row cap.
- **Browser check:** add and remove rows, in both languages, at desktop and phone widths.
