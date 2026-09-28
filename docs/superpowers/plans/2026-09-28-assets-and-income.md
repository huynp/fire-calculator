# Assets and Other Income Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people add savings deposits, property and extra investment rows ("What you have") plus rent, pension and side income ("Other income"), and fold them into the projection without making the plain case harder.

**Architecture:** The projection in `client/src/lib/fire-calc.ts` gains two optional inputs and tracks an investment pool, per-deposit balances and property separately; "need" (expenses minus active other income) replaces raw expenses in the FI tests. The URL model (`plan-url.ts`) carries both lists as repeated params. The UI adds two small list editors in a new component file, reusing a `NumberField` moved out of `Home.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind 4, shadcn/ui (dropdown-menu, select), lucide-react icons, Recharts, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-assets-and-income-design.md`

## Global Constraints

- The plain case (no extra assets, no other income) must produce exactly today's projection; existing links without `asset`/`income` params open unchanged.
- No double counting: deposit interest is growth, not income; property value never counts toward FI.
- At most 10 rows per list; `invested` stays the first Investments row.
- Every new visible string exists in English and Vietnamese in `client/src/lib/i18n.ts` (Vietnamese is typed as `Messages`).
- Money inputs keep digits only (`/\D/g`); rate inputs use `type="number"`.
- Chart colours: balance `--chart-1`, returns `--chart-2`, expenses `--chart-3`, other income `#1baf7a` (validated with blue/orange; contrast WARN relieved by the legend and tooltip labels).
- Run `pnpm check` and `pnpm exec vitest run client` before every commit.

## Review Focus

- Other income larger than expenses: need clamps to 0, FIRE number shows 0, FI is year 0 ("already there"), no negative numbers.
- "From age" typed below the current age (income already running): it counts from year 0.
- Nothing investable (pool and deposits both 0) after retirement: the proportional withdrawal must not divide by zero or produce NaN.
- Old links and bookmarks without the new params: `assets` and `otherIncome` come back empty and the result is unchanged.
- A savings row in a link without a rate (`asset=savings:20000`): defaults to 4%, not NaN or 0.

---

### Task 1: Projection with extra assets and other income

**Files:**
- Modify: `client/src/lib/fire-calc.ts`
- Test: `client/src/lib/fire-calc.test.ts`

**Interfaces:**
- Produces:
  - `type AssetKind = "investments" | "savings" | "property"`
  - `interface ExtraAsset { kind: AssetKind; amount: number; rate?: number }` (`rate` in %, used for savings only)
  - `type IncomeKind = "rent" | "pension" | "side" | "other"`
  - `interface OtherIncome { kind: IncomeKind; monthly: number; fromAge: number }` (monthly in today's money)
  - `FireInputs` gains `assets?: ExtraAsset[]; otherIncome?: OtherIncome[]`
  - `YearlyData` gains `otherIncome: number; netWorth: number` (yearly, rounded). `balance` becomes investable money (pool plus deposits); `fireNumber` becomes need divided by the withdrawal rate.

- [ ] **Step 1: Write the failing tests** (append to `fire-calc.test.ts`)

```ts
describe("Assets and other income", () => {
  const base: FireInputs = {
    currentBalance: 500000,
    annualReturn: 7,
    monthlyContribution: 1000,
    monthlyExpense: 3000,
    currentAge: 36,
    retirementAge: 65,
    inflationRate: 3,
    safeWithdrawalRate: 4,
    retirementStrategy: "safe_fire",
  };
  const fiYear = (p: ReturnType<typeof calculateFireProjection>) => p.findIndex((y) => y.isFireAchieved);

  it("gives the same projection with empty lists as without them", () => {
    expect(calculateFireProjection({ ...base, assets: [], otherIncome: [] })).toEqual(calculateFireProjection(base));
  });

  it("extra investment rows join the main pool", () => {
    expect(calculateFireProjection({ ...base, currentBalance: 300000, assets: [{ kind: "investments", amount: 200000 }] }))
      .toEqual(calculateFireProjection(base));
  });

  it("rent lowers the FIRE number and brings FI forward", () => {
    const withRent = calculateFireProjection({ ...base, otherIncome: [{ kind: "rent", monthly: 1200, fromAge: 36 }] });
    expect(withRent[0].fireNumber).toBe(540000); // (36,000 - 14,400) / 4%
    expect(fiYear(withRent)).toBeLessThan(fiYear(calculateFireProjection(base)));
  });

  it("income from a later age counts only from that age", () => {
    const p = calculateFireProjection({ ...base, otherIncome: [{ kind: "pension", monthly: 1500, fromAge: 67 }] });
    expect(p.find((y) => y.age === 66)!.otherIncome).toBe(0);
    expect(p.find((y) => y.age === 67)!.otherIncome).toBeGreaterThan(18000);
  });

  it("income that already started (from age below today) counts from year 0", () => {
    const p = calculateFireProjection({ ...base, otherIncome: [{ kind: "rent", monthly: 1000, fromAge: 20 }] });
    expect(p[0].otherIncome).toBe(12000);
  });

  it("other income above expenses means FI now with a zero FIRE number", () => {
    const p = calculateFireProjection({ ...base, currentBalance: 0, otherIncome: [{ kind: "pension", monthly: 5000, fromAge: 36 }] });
    expect(p[0].fireNumber).toBe(0);
    expect(p[0].isFireAchieved).toBe(true);
    p.forEach((y) => expect(Number.isNaN(y.balance)).toBe(false));
  });

  it("property counts in net worth but not toward FI", () => {
    const p = calculateFireProjection({ ...base, assets: [{ kind: "property", amount: 800000 }] });
    const plain = calculateFireProjection(base);
    expect(fiYear(p)).toBe(fiYear(plain));
    expect(p[0].netWorth).toBe(plain[0].balance + 800000);
  });

  it("a deposit grows at its own rate", () => {
    const p = calculateFireProjection({
      ...base,
      currentBalance: 0,
      monthlyContribution: 0,
      monthlyExpense: 100000, // never retires
      assets: [{ kind: "savings", amount: 10000, rate: 4 }],
    });
    expect(p[1].balance).toBe(10400);
  });

  it("never produces NaN when nothing is investable after retiring", () => {
    const p = calculateFireProjection({ ...base, currentBalance: 0, monthlyContribution: 0, monthlyExpense: 0 });
    p.forEach((y) => expect(Number.isNaN(y.balance)).toBe(false));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run client/src/lib/fire-calc.test.ts`
Expected: FAIL (`fireNumber` 900000 instead of 540000, `otherIncome`/`netWorth` undefined).

- [ ] **Step 3: Implement.** In `fire-calc.ts`, add the types above, extend `FireInputs` and `YearlyData`, and replace the body of `calculateFireProjection` with:

```ts
export const calculateFireProjection = (inputs: FireInputs): YearlyData[] => {
  const {
    currentBalance,
    annualReturn,
    monthlyContribution,
    monthlyExpense,
    currentAge,
    retirementAge,
    inflationRate,
    safeWithdrawalRate,
    retirementStrategy,
    assets = [],
    otherIncome = [],
  } = inputs;

  const projection: YearlyData[] = [];
  const annualExpense = monthlyExpense * 12;
  const currentYear = new Date().getFullYear();
  const yearsToProject = 50;

  // All investment rows share one pool, which also receives the monthly savings.
  let pool = currentBalance + assets.filter((a) => a.kind === "investments").reduce((s, a) => s + a.amount, 0);
  // Each deposit grows at its own interest rate; interest is growth, not income.
  const deposits = assets
    .filter((a) => a.kind === "savings")
    .map((a) => ({ balance: a.amount, rate: (a.rate ?? 4) / 100 }));
  // Property keeps pace with inflation and only counts in net worth.
  const property = assets.filter((a) => a.kind === "property").reduce((s, a) => s + a.amount, 0);

  // Once the trigger is hit you stop working for good, even if a later year dips below it.
  let isRetired = false;

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;
    const inflation = Math.pow(1 + inflationRate / 100, i);

    const adjustedAnnualExpense = annualExpense * inflation;
    const income = otherIncome.filter((o) => o.fromAge <= age).reduce((s, o) => s + o.monthly * 12, 0) * inflation;
    // What the portfolio has to cover once other income is counted.
    const need = Math.max(0, adjustedAnnualExpense - income);

    const depositTotal = deposits.reduce((s, d) => s + d.balance, 0);
    const investable = pool + depositTotal;
    const fireNumber = need / (safeWithdrawalRate / 100);
    const investmentIncome = pool * (annualReturn / 100) + deposits.reduce((s, d) => s + d.balance * d.rate, 0);
    const safeWithdrawalAmount = investable * (safeWithdrawalRate / 100);

    const isIncomeCrossover = investmentIncome >= need;
    const isFireAchieved = safeWithdrawalAmount >= need;

    isRetired ||= retirementStrategy === "income_crossover" ? isIncomeCrossover : isFireAchieved;

    const annualContribution = age < retirementAge && !isRetired ? monthlyContribution * 12 : 0;

    projection.push({
      age,
      year,
      balance: Math.round(investable),
      annualContribution,
      annualExpense: Math.round(adjustedAnnualExpense),
      investmentIncome: Math.round(investmentIncome),
      safeWithdrawalAmount: Math.round(safeWithdrawalAmount),
      fireNumber: Math.round(fireNumber),
      isFireAchieved,
      isIncomeCrossover,
      otherIncome: Math.round(income),
      netWorth: Math.round(investable + property * inflation),
    });

    // Next year: growth, then savings in or spending out.
    pool += pool * (annualReturn / 100);
    deposits.forEach((d) => (d.balance += d.balance * d.rate));

    if (isRetired) {
      // Spending comes out of the pool and deposits in proportion to their size.
      const total = pool + deposits.reduce((s, d) => s + d.balance, 0);
      if (total > 0) {
        const share = need / total;
        pool -= pool * share;
        deposits.forEach((d) => (d.balance -= d.balance * share));
      } else {
        pool -= need;
      }
    } else {
      pool += annualContribution + income;
    }
  }

  return projection;
};
```

Note on the "same as before" requirement: with no extras, `need` equals expenses and all spending leaves the pool, which is today's arithmetic. Before retirement the pool receives `annualContribution + income`, and `income` is 0.

- [ ] **Step 4: Run all client tests**

Run: `pnpm exec vitest run client`
Expected: PASS, including the 14 existing projection tests (the plain case is unchanged).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm check
git add client/src/lib/fire-calc.ts client/src/lib/fire-calc.test.ts
git commit -m "Projection: extra assets (deposits, property, investment rows) and other income"
```

### Task 2: Assets and income in the shareable link

**Files:**
- Modify: `client/src/lib/plan-url.ts`
- Test: `client/src/lib/plan-url.test.ts`

**Interfaces:**
- Consumes: `ExtraAsset`, `OtherIncome`, `AssetKind`, `IncomeKind` from Task 1.
- Produces: `Plan` gains `assets: ExtraAsset[]; otherIncome: OtherIncome[]` (default `[]`); `MAX_ROWS = 10`.

- [ ] **Step 1: Write the failing tests** (append inside the existing `describe`)

```ts
  it("round-trips assets and other income", () => {
    const plan = {
      ...DEFAULT_PLAN,
      assets: [
        { kind: "savings" as const, amount: 20000, rate: 4.5 },
        { kind: "property" as const, amount: 800000 },
      ],
      otherIncome: [{ kind: "rent" as const, monthly: 1200, fromAge: 36 }],
    };
    expect(planToSearch(plan)).toBe("?asset=savings%3A20000%3A4.5&asset=property%3A800000&income=rent%3A1200%3A36");
    expect(planFromSearch(planToSearch(plan))).toEqual(plan);
  });

  it("drops unknown or broken rows, defaults a missing deposit rate, and caps at 10", () => {
    const plan = planFromSearch("?asset=boat:5000&asset=savings:abc&asset=savings:20000&income=rent:-5:40&income=pension:1500");
    expect(plan.assets).toEqual([{ kind: "savings", amount: 20000, rate: 4 }]);
    expect(plan.otherIncome).toEqual([]);
    const many = "?" + Array.from({ length: 12 }, () => "asset=property:1").join("&");
    expect(planFromSearch(many).assets).toHaveLength(10);
  });

  it("old links without lists open with empty lists", () => {
    const plan = planFromSearch("?invested=100");
    expect(plan.assets).toEqual([]);
    expect(plan.otherIncome).toEqual([]);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm exec vitest run client/src/lib/plan-url.test.ts`
Expected: FAIL (`assets` undefined).

- [ ] **Step 3: Implement.** In `plan-url.ts`:

```ts
import type { AssetKind, ExtraAsset, IncomeKind, OtherIncome, RetirementStrategy } from "./fire-calc";

export const MAX_ROWS = 10;
const ASSET_KINDS: AssetKind[] = ["investments", "savings", "property"];
const INCOME_KINDS: IncomeKind[] = ["rent", "pension", "side", "other"];

const inRange = (raw: string | undefined, min: number, max: number) => {
  const value = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : undefined;
};

function parseAsset(raw: string): ExtraAsset | undefined {
  const [kind, amountRaw, rateRaw] = raw.split(":");
  const found = ASSET_KINDS.find((k) => k === kind);
  const amount = inRange(amountRaw, 0, 1e13);
  if (!found || amount === undefined) return undefined;
  return found === "savings" ? { kind: found, amount, rate: inRange(rateRaw, -5, 30) ?? 4 } : { kind: found, amount };
}

function parseIncome(raw: string): OtherIncome | undefined {
  const [kind, monthlyRaw, fromAgeRaw] = raw.split(":");
  const found = INCOME_KINDS.find((k) => k === kind);
  const monthly = inRange(monthlyRaw, 0, 1e11);
  const fromAge = inRange(fromAgeRaw, 0, 120);
  if (!found || monthly === undefined || fromAge === undefined) return undefined;
  return { kind: found, monthly, fromAge };
}
```

- Add `assets: ExtraAsset[]; otherIncome: OtherIncome[];` to `Plan`, and `assets: [], otherIncome: []` to `DEFAULT_PLAN`.
- In `planFromSearch`, before `return plan`:

```ts
  const assets = params.getAll("asset").map(parseAsset).filter((a): a is ExtraAsset => !!a);
  const incomes = params.getAll("income").map(parseIncome).filter((o): o is OtherIncome => !!o);
  plan.assets = assets.length || params.has("asset") ? assets.slice(0, MAX_ROWS) : base.assets;
  plan.otherIncome = incomes.length || params.has("income") ? incomes.slice(0, MAX_ROWS) : base.otherIncome;
```

- In `planToSearch`, after the numbers loop:

```ts
  plan.assets.forEach((a) =>
    params.append("asset", [a.kind, a.amount, ...(a.kind === "savings" ? [a.rate ?? 4] : [])].join(":"))
  );
  plan.otherIncome.forEach((o) => params.append("income", [o.kind, o.monthly, o.fromAge].join(":")));
```

- Update the `NumberKey` exclusion to also exclude `"assets" | "otherIncome"`.

- [ ] **Step 4: Run tests**

Run: `pnpm exec vitest run client`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm check
git add client/src/lib/plan-url.ts client/src/lib/plan-url.test.ts
git commit -m "Link: carry assets and other income as repeated params"
```

### Task 3: Strings in English and Vietnamese

**Files:**
- Modify: `client/src/lib/i18n.ts`

**Interfaces:**
- Produces, on `Messages`:
  - `whatYouHave`, `add`, `remove`, `interest`, `propertyHint`
  - `assetKinds: Record<AssetKind, string>`
  - `otherIncomeTitle`, `otherIncomeEmpty`
  - `incomeKinds: Record<IncomeKind, string>`
  - `perMonthLabel`, `fromAge`, `takeHomePay`, `netWorthLine(amount: string)`, `otherIncomeSeries`
  - `csv.columns` gains two trailing entries
  - help section 1 gets two new paragraphs

- [ ] **Step 1: Add to `en`** (next to the related keys):

```ts
  whatYouHave: "What you have",
  add: "Add",
  remove: "Remove",
  interest: "Interest",
  propertyHint: "Counts in net worth only. Add its rent under Other income.",
  assetKinds: { investments: "Investments", savings: "Savings / deposits", property: "Property" },
  otherIncomeTitle: "Other income",
  otherIncomeEmpty: "Rent, pension or side income. Leave empty if you have none.",
  incomeKinds: { rent: "Rent", pension: "Pension", side: "Side income", other: "Other" },
  perMonthLabel: "Per month",
  fromAge: "From age",
  takeHomePay: "Take-home pay",
  netWorthLine: (amount: string) => `Net worth ${amount}, including property.`,
  otherIncomeSeries: "Other income",
```

Append `"Other income", "Net worth"` to `csv.columns`. In `enHelp` section 1, change the "You:" paragraph to `" your age and the age you'd retire anyway."` and add after it:

```ts
        ["What you have:", " investments, savings deposits and property, in your currency. Deposits grow at their own interest rate; property counts in net worth only."],
        ["Other income:", " rent, pension or side income, from the age it starts. Deposit interest isn't income here: it's already the deposit's growth."],
```

Change "Monthly budget:" to `" take-home pay and spending. The difference is what gets invested each month."`

- [ ] **Step 2: Add the same keys to `vi`**:

```ts
  whatYouHave: "Tài sản của bạn",
  add: "Thêm",
  remove: "Xóa",
  interest: "Lãi suất",
  propertyHint: "Chỉ tính vào tài sản ròng. Hãy thêm tiền thuê ở mục Thu nhập khác.",
  assetKinds: { investments: "Đầu tư", savings: "Tiết kiệm / tiền gửi", property: "Bất động sản" },
  otherIncomeTitle: "Thu nhập khác",
  otherIncomeEmpty: "Tiền cho thuê, lương hưu hoặc thu nhập phụ. Để trống nếu không có.",
  incomeKinds: { rent: "Tiền cho thuê", pension: "Lương hưu", side: "Thu nhập phụ", other: "Khác" },
  perMonthLabel: "Mỗi tháng",
  fromAge: "Từ tuổi",
  takeHomePay: "Lương thực nhận",
  netWorthLine: (amount) => `Tài sản ròng ${amount}, gồm cả bất động sản.`,
  otherIncomeSeries: "Thu nhập khác",
```

Append `"Thu nhập khác", "Tài sản ròng"` to `csv.columns`. In `viHelp` section 1, change "Bạn:" to `" tuổi hiện tại và tuổi bạn dự định nghỉ hưu."` and add:

```ts
        ["Tài sản của bạn:", " khoản đầu tư, tiền gửi tiết kiệm và bất động sản, theo loại tiền tệ bạn chọn. Tiền gửi tăng theo lãi suất riêng; bất động sản chỉ tính vào tài sản ròng."],
        ["Thu nhập khác:", " tiền cho thuê, lương hưu hoặc thu nhập phụ, tính từ tuổi bắt đầu. Lãi tiền gửi không tính là thu nhập ở đây, vì đó đã là phần tăng của khoản tiền gửi."],
```

Change "Ngân sách hằng tháng:" to `" lương thực nhận và chi tiêu. Phần chênh lệch là số tiền đầu tư mỗi tháng."`

- [ ] **Step 3: Typecheck.** Run `pnpm check`. Expected: no errors. The `vi: Messages` typing fails if a key is missing.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/i18n.ts
git commit -m "Strings for assets and other income (EN/VI)"
```

### Task 4: List editors and page wiring

**Files:**
- Create: `client/src/components/NumberField.tsx` (moved from `Home.tsx`, unchanged)
- Create: `client/src/components/AssetsIncome.tsx`
- Modify: `client/src/pages/Home.tsx`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces:
  - `NumberField` (same props as today) and `type MoneyField = { symbol: string; locale: string }`
  - `AssetRows({ t, money, assets, onChange })`
  - `IncomeRows({ t, money, incomes, currentAge, onChange })`

- [ ] **Step 1: Move `NumberField`.** Cut the `NumberField` function from `Home.tsx` into `client/src/components/NumberField.tsx`, exporting it with its imports (`Input`, `Label`, `cn`) and `export type MoneyField = { symbol: string; locale: string };`. Its `money` prop type becomes `MoneyField`. Import it in `Home.tsx`. Run `pnpm check`; expect no errors.

- [ ] **Step 2: Create `AssetsIncome.tsx`:**

```tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NumberField, type MoneyField } from "@/components/NumberField";
import type { AssetKind, ExtraAsset, IncomeKind, OtherIncome } from "@/lib/fire-calc";
import type { Messages } from "@/lib/i18n";
import { MAX_ROWS } from "@/lib/plan-url";
import { Briefcase, ChartLine, Coins, House, KeyRound, Landmark, PiggyBank, Plus, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const ASSET_ICONS: Record<AssetKind, LucideIcon> = { investments: ChartLine, savings: PiggyBank, property: House };
const INCOME_ICONS: Record<IncomeKind, LucideIcon> = { rent: KeyRound, pension: Landmark, side: Briefcase, other: Coins };

const num = (v: string) => parseFloat(v) || 0;

function RowHeader({ icon: Icon, label, onRemove, removeLabel }: { icon: LucideIcon; label: string; onRemove?: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {label}
      </span>
      {onRemove && (
        <Button variant="ghost" size="icon" className="size-7" onClick={onRemove} aria-label={`${removeLabel} ${label}`}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}

function AddMenu<K extends string>({ label, kinds, names, icons, onAdd, disabled }: {
  label: string; kinds: readonly K[]; names: Record<K, string>; icons: Record<K, LucideIcon>; onAdd: (kind: K) => void; disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 text-primary hover:text-primary" disabled={disabled}>
          <Plus className="size-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {kinds.map((k) => {
          const Icon = icons[k];
          return (
            <DropdownMenuItem key={k} onSelect={() => onAdd(k)}>
              <Icon className="size-4" />
              {names[k]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Extra rows under the main Investments field. */
export function AssetRows({ t, money, assets, onChange }: { t: Messages; money: MoneyField; assets: ExtraAsset[]; onChange: (next: ExtraAsset[]) => void }) {
  const update = (i: number, patch: Partial<ExtraAsset>) => onChange(assets.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const add = (kind: AssetKind) => onChange([...assets, kind === "savings" ? { kind, amount: 0, rate: 4 } : { kind, amount: 0 }]);
  return (
    <>
      {assets.map((a, i) => (
        <div key={i} className="space-y-2 border-t pt-3">
          <RowHeader icon={ASSET_ICONS[a.kind]} label={t.assetKinds[a.kind]} removeLabel={t.remove} onRemove={() => onChange(assets.filter((_, j) => j !== i))} />
          <div className={a.kind === "savings" ? "grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3" : undefined}>
            <NumberField id={`asset-${i}`} label={t.assetKinds[a.kind]} srOnlyLabel money={money} value={a.amount} onChange={(v) => update(i, { amount: num(v) })} />
            {a.kind === "savings" && (
              <NumberField id={`asset-rate-${i}`} label={t.interest} srOnlyLabel suffix="%" step="0.1" value={a.rate ?? 4} onChange={(v) => update(i, { rate: num(v) })} />
            )}
          </div>
          {a.kind === "property" && <p className="text-xs text-muted-foreground">{t.propertyHint}</p>}
        </div>
      ))}
      <AddMenu label={t.add} kinds={["investments", "savings", "property"] as const} names={t.assetKinds} icons={ASSET_ICONS} onAdd={add} disabled={assets.length >= MAX_ROWS} />
    </>
  );
}

/** The whole "Other income" list, empty by default. */
export function IncomeRows({ t, money, incomes, currentAge, onChange }: {
  t: Messages; money: MoneyField; incomes: OtherIncome[]; currentAge: number; onChange: (next: OtherIncome[]) => void;
}) {
  const update = (i: number, patch: Partial<OtherIncome>) => onChange(incomes.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const add = (kind: IncomeKind) => onChange([...incomes, { kind, monthly: 0, fromAge: currentAge }]);
  let body: ReactNode = <p className="text-xs text-muted-foreground">{t.otherIncomeEmpty}</p>;
  if (incomes.length) {
    body = incomes.map((o, i) => (
      <div key={i} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
        <RowHeader icon={INCOME_ICONS[o.kind]} label={t.incomeKinds[o.kind]} removeLabel={t.remove} onRemove={() => onChange(incomes.filter((_, j) => j !== i))} />
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <NumberField id={`income-${i}`} label={t.perMonthLabel} money={money} value={o.monthly} onChange={(v) => update(i, { monthly: num(v) })} />
          <NumberField id={`income-age-${i}`} label={t.fromAge} value={o.fromAge} onChange={(v) => update(i, { fromAge: num(v) })} />
        </div>
      </div>
    ));
  }
  return (
    <>
      {body}
      <AddMenu label={t.add} kinds={["rent", "pension", "side", "other"] as const} names={t.incomeKinds} icons={INCOME_ICONS} onAdd={add} disabled={incomes.length >= MAX_ROWS} />
    </>
  );
}
```

Add an optional `srOnlyLabel?: boolean` prop to `NumberField` that renders the label with `className="sr-only"` (the row header already shows the kind visibly).

- [ ] **Step 3: Wire into `Home.tsx`:**
  - State: `const [assets, setAssets] = useState(initialPlan.assets); const [otherIncome, setOtherIncome] = useState(initialPlan.otherIncome);`
  - Pass them into the projection: `useMemo(() => calculateFireProjection({ ...inputs, assets, otherIncome }), [inputs, assets, otherIncome])`.
  - Add both to the `planToSearch({...})` call and to the effect's dependency list.
  - Rename the "You" section's content: keep only the two ages. Add a new section after it:

```tsx
            <section className="space-y-3 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.whatYouHave}</h2>
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
                <NumberField id="currentBalance" label={t.assetKinds.investments} money={moneyField} value={inputs.currentBalance} onChange={(v) => updateInput("currentBalance", v)} />
                {/* existing currency Select block, unchanged */}
              </div>
              <AssetRows t={t} money={moneyField} assets={assets} onChange={setAssets} />
            </section>
```

  - In "Monthly budget", the first field's label becomes `t.takeHomePay`.
  - After the budget section add:

```tsx
            <section className="space-y-3 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.otherIncomeTitle}</h2>
              <IncomeRows t={t} money={moneyField} incomes={otherIncome} currentAge={inputs.currentAge} onChange={setOtherIncome} />
            </section>
```

  - Hero: after the "In N years…" paragraph add `{assets.some((a) => a.kind === "property") && <p className="mt-1 text-sm text-muted-foreground">{t.netWorthLine(formatMoney(projection[0].netWorth))}</p>}`.
  - `chartData` gains `otherIncome: Math.round(toDisplay(p.otherIncome, i))`.
  - Cash flow chart: when `otherIncome.length > 0`, add a `LegendItem color="#1baf7a" label={t.otherIncomeSeries}` and a `<Line dataKey="otherIncome" name={t.otherIncomeSeries} stroke="#1baf7a" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />`.
  - CSV rows gain `p.otherIncome, p.netWorth` at the end.
  - `changeCurrency` is unchanged: the lists are not rescaled.

- [ ] **Step 4: Verify.**
  - `pnpm check` and `pnpm exec vitest run client`: both pass.
  - In the browser (`http://localhost:3000`):
    - The plain page still shows the same headline as before.
    - Add a deposit and rent of $1,200 from age 36: the FIRE number drops to $540,000 and the Cash flow tab shows the Other income line.
    - Add property: the net-worth line appears. Remove each row.
    - Switch to VI.
    - At 390px width: no sideways scroll.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/NumberField.tsx client/src/components/AssetsIncome.tsx client/src/pages/Home.tsx
git commit -m "What you have / Other income lists on the page"
```
