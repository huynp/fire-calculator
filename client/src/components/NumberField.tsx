import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type MoneyField = { symbol: string; locale: string };

export function NumberField({
  id,
  label,
  value,
  onChange,
  money,
  suffix,
  step,
  srOnlyLabel,
  describedBy,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  /** Whole-number money amount: shows the currency symbol and the locale's thousands separators */
  money?: MoneyField;
  suffix?: string;
  step?: string;
  /** Keep the label for screen readers only, when a visible heading already names the field */
  srOnlyLabel?: boolean;
  /** Id of a hint that explains the field */
  describedBy?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={srOnlyLabel ? "sr-only" : "text-sm font-normal text-muted-foreground"}>
        {label}
      </Label>
      <div className="relative">
        {money && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {money.symbol}
          </span>
        )}
        <Input
          id={id}
          type={money ? "text" : "number"}
          inputMode={money ? "numeric" : "decimal"}
          step={step}
          aria-describedby={describedBy}
          value={money ? value.toLocaleString(money.locale) : value}
          // Money is whole units, so keep digits only: "." and "," are thousands separators in some locales.
          onChange={(e) => onChange(money ? e.target.value.replace(/\D/g, "") : e.target.value)}
          className={cn("h-10 bg-card tabular-nums shadow-none", suffix && "pr-9")}
          style={money ? { paddingLeft: `${1.1 + money.symbol.length * 0.55}rem` } : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
