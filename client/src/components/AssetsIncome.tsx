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

// Row names for screen readers and the header: repeated kinds get a number ("Savings / deposits 2").
const rowLabels = <K extends string>(kinds: K[], names: Record<K, string>) =>
  kinds.map((k, i) => {
    const total = kinds.filter((x) => x === k).length;
    const nth = kinds.slice(0, i + 1).filter((x) => x === k).length;
    return total > 1 ? `${names[k]} ${nth}` : names[k];
  });

function RowHeader({ id, icon: Icon, label, onRemove, removeLabel }: { id: string; icon: LucideIcon; label: string; onRemove?: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <span id={id} className="flex items-center gap-2 text-sm font-medium">
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
          const Icon: LucideIcon = icons[k];
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
  const labels = rowLabels(assets.map((a) => a.kind), t.assetKinds);
  return (
    <>
      {assets.map((a, i) => (
        <div key={i} role="group" aria-labelledby={`asset-h-${i}`} className="space-y-2 border-t pt-3">
          <RowHeader id={`asset-h-${i}`} icon={ASSET_ICONS[a.kind]} label={labels[i]} removeLabel={t.remove} onRemove={() => onChange(assets.filter((_, j) => j !== i))} />
          <div className={a.kind === "savings" ? "grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3" : undefined}>
            <NumberField id={`asset-${i}`} label={labels[i]} srOnlyLabel money={money} value={a.amount} onChange={(v) => update(i, { amount: num(v) })} describedBy={a.kind === "property" ? `asset-hint-${i}` : undefined} />
            {a.kind === "savings" && (
              <NumberField id={`asset-rate-${i}`} label={t.interest} srOnlyLabel suffix="%" step="0.1" value={a.rate ?? 4} onChange={(v) => update(i, { rate: num(v) })} />
            )}
          </div>
          {a.kind === "property" && <p id={`asset-hint-${i}`} className="text-xs text-muted-foreground">{t.propertyHint}</p>}
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
  const labels = rowLabels(incomes.map((o) => o.kind), t.incomeKinds);
  let body: ReactNode = <p className="text-xs text-muted-foreground">{t.otherIncomeEmpty}</p>;
  if (incomes.length) {
    body = incomes.map((o, i) => (
      <div key={i} role="group" aria-labelledby={`income-h-${i}`} className={i > 0 ? "space-y-2 border-t pt-3" : "space-y-2"}>
        <RowHeader id={`income-h-${i}`} icon={INCOME_ICONS[o.kind]} label={labels[i]} removeLabel={t.remove} onRemove={() => onChange(incomes.filter((_, j) => j !== i))} />
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
