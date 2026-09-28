import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HelpDialog } from "@/components/HelpDialog";
import { NumberField } from "@/components/NumberField";
import { AssetRows, IncomeRows } from "@/components/AssetsIncome";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  calculateFireProjection,
  type FireInputs,
  type RetirementStrategy,
  type YearlyData,
} from "@/lib/fire-calc";
import { LOCALES, MESSAGES, type Lang, type Messages } from "@/lib/i18n";
import {
  CURRENCIES,
  DEFAULT_PLAN,
  amountsFor,
  defaultsFor,
  planFromSearch,
  planToSearch,
  type Currency,
} from "@/lib/plan-url";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import {
  ComposedChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Loader2, Save, Download, Trash2, TrendingUp, Link2 } from "lucide-react";
import { toast } from "sonner";

interface BudgetInputs {
  monthlyIncome: number;
  monthlyExpense: number;
}

// Rounded long-run US nominal averages (Vanguard asset-allocation models, 1926 onward).
const RETURN_PRESETS = [
  { id: "bonds", annualReturn: 6 },
  { id: "balanced", annualReturn: 9 },
  { id: "stocks", annualReturn: 10 },
] as const;

const exportToCSV = (
  projection: YearlyData[],
  inputs: FireInputs,
  budget: BudgetInputs,
  currency: Currency,
  t: Messages
) => {
  const c = t.csv;
  const rows: (string | number)[][] = [
    [c.title],
    [],
    [c.budget],
    [c.monthlyIncome, budget.monthlyIncome],
    [c.monthlyExpenses, budget.monthlyExpense],
    [c.monthlyInvested, inputs.monthlyContribution],
    [],
    [c.assumptions],
    [c.currency, currency],
    [c.currentInvestments, inputs.currentBalance],
    [c.annualReturn, inputs.annualReturn],
    [c.currentAge, inputs.currentAge],
    [c.retirementAge, inputs.retirementAge],
    [c.inflation, inputs.inflationRate],
    [c.withdrawalRate, inputs.safeWithdrawalRate],
    [c.stopInvesting, inputs.retirementStrategy === "safe_fire" ? c.stopSafe : c.stopCrossover],
    [],
    c.columns,
    ...projection.map((p) => [
      p.year,
      p.age,
      p.balance,
      p.annualContribution,
      p.annualExpense,
      p.investmentIncome,
      p.safeWithdrawalAmount,
      p.fireNumber,
      p.isIncomeCrossover ? c.yes : c.no,
      p.isFireAchieved ? c.yes : c.no,
      p.otherIncome,
      p.netWorth,
    ]),
  ];
  // The byte-order mark lets Excel read Vietnamese text as UTF-8.
  const csvContent = "﻿" + rows.map((row) => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fire-calculator-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Third categorical slot after blue and orange (validated; the legend labels it, since it is light on white).
const OTHER_INCOME_COLOR = "#1baf7a";

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="xl:border-l xl:pl-5 xl:first:border-l-0 xl:first:pl-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block w-4 border-t-2"
        style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
        aria-hidden
      />
      {label}
    </span>
  );
}

// Tooltip rows keep text in ink; a line swatch carries the series identity.
function ChartTooltip({
  active,
  payload,
  label,
  labelFor,
  format,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; strokeDasharray?: string }[];
  label?: number;
  labelFor: (year: number) => string;
  format: (value: number) => string;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium">{labelFor(label)}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span
            className="inline-block w-3 border-t-2"
            style={{ borderColor: item.color, borderStyle: item.strokeDasharray ? "dashed" : "solid" }}
            aria-hidden
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">{format(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  // Start from the plan in the URL (shared link or bookmark), else defaults for the browser's language.
  const [initialPlan] = useState(() => {
    const base = navigator.language?.toLowerCase().startsWith("vi") ? defaultsFor("VND", "vi") : DEFAULT_PLAN;
    return planFromSearch(window.location.search, base);
  });
  const [futureDollars, setFutureDollars] = useState(initialPlan.futureDollars);
  const [lang, setLang] = useState<Lang>(initialPlan.lang);
  const [currency, setCurrency] = useState<Currency>(initialPlan.currency);
  const [assets, setAssets] = useState(initialPlan.assets);
  const [otherIncome, setOtherIncome] = useState(initialPlan.otherIncome);
  const t = MESSAGES[lang];
  const locale = LOCALES[lang];

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency]
  );
  const compactMoney = useMemo(
    () =>
      new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }),
    [locale, currency]
  );
  const formatMoney = (value: number) => money.format(value);
  const moneyField = {
    symbol: money.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency,
    locale,
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.appName;
  }, [lang, t]);

  const [budget, setBudget] = useState<BudgetInputs>({
    monthlyIncome: initialPlan.monthlyIncome,
    monthlyExpense: initialPlan.monthlyExpense,
  });

  // Auto-calculate monthly contribution from budget
  const calculatedContribution = Math.max(0, budget.monthlyIncome - budget.monthlyExpense);

  const [inputs, setInputs] = useState<FireInputs>({
    currentBalance: initialPlan.currentBalance,
    annualReturn: initialPlan.annualReturn,
    monthlyContribution: calculatedContribution,
    monthlyExpense: initialPlan.monthlyExpense,
    currentAge: initialPlan.currentAge,
    retirementAge: initialPlan.retirementAge,
    inflationRate: initialPlan.inflationRate,
    safeWithdrawalRate: initialPlan.safeWithdrawalRate,
    retirementStrategy: initialPlan.retirementStrategy,
  });

  // Keep the URL in step with the plan so the address bar is always a shareable link.
  useEffect(() => {
    const search = planToSearch({
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      currentBalance: inputs.currentBalance,
      monthlyIncome: budget.monthlyIncome,
      monthlyExpense: budget.monthlyExpense,
      annualReturn: inputs.annualReturn,
      inflationRate: inputs.inflationRate,
      safeWithdrawalRate: inputs.safeWithdrawalRate,
      retirementStrategy: inputs.retirementStrategy,
      futureDollars,
      lang,
      currency,
      assets,
      otherIncome,
    });
    window.history.replaceState(null, "", window.location.pathname + search);
  }, [inputs, budget, futureDollars, lang, currency, assets, otherIncome]);

  // Sync monthly contribution and expense from budget
  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      monthlyContribution: calculatedContribution,
      monthlyExpense: budget.monthlyExpense,
    }));
  }, [calculatedContribution, budget.monthlyExpense]);

  // Amounts are never converted. If they are still the starting amounts, swap in ones sized for the new currency.
  const changeCurrency = (next: Currency) => {
    const current = amountsFor(currency);
    if (
      inputs.currentBalance === current.currentBalance &&
      budget.monthlyIncome === current.monthlyIncome &&
      budget.monthlyExpense === current.monthlyExpense
    ) {
      const nextAmounts = amountsFor(next);
      setBudget({ monthlyIncome: nextAmounts.monthlyIncome, monthlyExpense: nextAmounts.monthlyExpense });
      setInputs((prev) => ({ ...prev, currentBalance: nextAmounts.currentBalance }));
    }
    setCurrency(next);
  };

  const [scenarioName, setScenarioName] = useState(t.defaultScenarioName);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  const [chartView, setChartView] = useState<"portfolio" | "cashflow">("portfolio");

  // Fetch saved scenarios
  const { data: savedScenarios = [] } = trpc.fireScenarios.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get scenario details when selected
  const { data: selectedScenario } = trpc.fireScenarios.get.useQuery(
    { id: parseInt(selectedScenarioId) },
    { enabled: !!selectedScenarioId && isAuthenticated }
  );

  // Load scenario when selected
  useEffect(() => {
    if (selectedScenario) {
      setInputs({
        currentBalance: parseFloat(selectedScenario.currentBalance),
        annualReturn: parseFloat(selectedScenario.annualReturn),
        monthlyContribution: parseFloat(selectedScenario.monthlyContribution),
        monthlyExpense: parseFloat(selectedScenario.monthlyExpense),
        currentAge: selectedScenario.currentAge,
        retirementAge: selectedScenario.retirementAge,
        inflationRate: parseFloat(selectedScenario.inflationRate),
        safeWithdrawalRate: parseFloat(selectedScenario.safeWithdrawalRate),
        retirementStrategy: selectedScenario.retirementStrategy,
      });
      setScenarioName(selectedScenario.name);
      toast.success(t.loadedScenario(selectedScenario.name));
    }
    // Only when a different scenario arrives, not when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario]);

  const projection = useMemo(
    () => calculateFireProjection({ ...inputs, assets, otherIncome }),
    [inputs, assets, otherIncome]
  );

  // Income Crossover: when investment returns > expenses (aggressive milestone)
  const incomeCrossoverPoint = useMemo(() => {
    return projection.find((p) => p.isIncomeCrossover);
  }, [projection]);

  // Safe FIRE: when 4% withdrawal > expenses (conservative milestone)
  const safeFIREPoint = useMemo(() => {
    return projection.find((p) => p.isFireAchieved);
  }, [projection]);

  // Today's money removes inflation: year N amounts are divided by (1 + inflation)^N.
  const toDisplay = (value: number, yearIndex: number) =>
    futureDollars ? value : value / Math.pow(1 + inputs.inflationRate / 100, yearIndex);

  const chartData = projection.map((p, i) => ({
    year: p.year,
    balance: Math.round(toDisplay(p.balance, i)),
    // With other income, plot what the portfolio must cover, so the crossover marker matches the lines.
    expenses: Math.round(toDisplay(otherIncome.length > 0 ? p.need : p.annualExpense, i)),
    returns: Math.round(toDisplay(p.investmentIncome, i)),
    fireNumber: Math.round(toDisplay(p.fireNumber, i)),
    otherIncome: Math.round(toDisplay(p.otherIncome, i)),
  }));

  const createScenarioMutation = trpc.fireScenarios.create.useMutation({
    onSuccess: () => {
      toast.success(t.savedScenarioOk);
      setScenarioName(t.defaultScenarioName);
    },
    onError: (error) => {
      toast.error(t.saveFailed(error.message));
    },
  });

  const deleteScenarioMutation = trpc.fireScenarios.delete.useMutation({
    onSuccess: () => {
      toast.success(t.deletedScenarioOk);
      setSelectedScenarioId("");
    },
    onError: (error) => {
      toast.error(t.deleteFailed(error.message));
    },
  });

  const handleSaveScenario = () => {
    if (!isAuthenticated) {
      toast.error(t.loginToSave);
      return;
    }

    createScenarioMutation.mutate({
      name: scenarioName,
      currentBalance: inputs.currentBalance.toString(),
      annualReturn: inputs.annualReturn.toString(),
      monthlyContribution: inputs.monthlyContribution.toString(),
      monthlyExpense: inputs.monthlyExpense.toString(),
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      inflationRate: inputs.inflationRate.toString(),
      safeWithdrawalRate: inputs.safeWithdrawalRate.toString(),
      retirementStrategy: inputs.retirementStrategy,
    });
  };

  const handleDeleteScenario = () => {
    if (!selectedScenarioId) return;
    if (confirm(t.confirmDelete)) {
      deleteScenarioMutation.mutate({ id: parseInt(selectedScenarioId) });
    }
  };

  const updateInput = (key: keyof FireInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [key]: numValue }));
  };

  const applyPreset = (annualReturn: number) => {
    setInputs((prev) => ({ ...prev, annualReturn }));
    setSelectedScenarioId("");
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t.linkCopied);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const handleExportCSV = () => {
    exportToCSV(projection, inputs, budget, currency, t);
    toast.success(t.csvExported);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const monthlyInvested = inputs.monthlyContribution;
  const savingsRate = budget.monthlyIncome > 0 ? monthlyInvested / budget.monthlyIncome : 0;
  // The headline follows the chosen "stop investing" rule; the other milestone is shown alongside.
  const isCrossover = inputs.retirementStrategy === "income_crossover";
  const fiPoint = isCrossover ? incomeCrossoverPoint : safeFIREPoint;
  const otherPoint = isCrossover ? safeFIREPoint : incomeCrossoverPoint;
  const yearsToFire = fiPoint ? fiPoint.year - projection[0].year : null;
  const fiReason = isCrossover ? t.reasonCrossover(inputs.annualReturn) : t.reasonSafe(inputs.safeWithdrawalRate);
  const activePreset = RETURN_PRESETS.find((p) => p.annualReturn === inputs.annualReturn)?.id;
  const tickEvery = isMobile ? 10 : 5;
  const xTicks = chartData.filter((_, i) => i % tickEvery === 0).map((d) => d.year);
  const tooltipLabel = (year: number) => {
    const point = projection.find((p) => p.year === year);
    return point ? t.yearAge(year, point.age) : String(year);
  };
  const xAxis = (
    <XAxis
      dataKey="year"
      ticks={xTicks}
      tick={axisTick}
      tickLine={false}
      tickMargin={8}
      padding={{ left: 8 }}
      axisLine={{ stroke: "var(--border)" }}
    />
  );
  // Size the axis to its longest label: compact money differs a lot by language and currency ("380 N US$").
  const chartMax = Math.max(
    ...chartData.map((d) =>
      chartView === "portfolio" ? Math.max(d.balance, d.fireNumber) : Math.max(d.returns, d.expenses, d.otherIncome)
    )
  );
  const yAxisWidth = Math.max(48, compactMoney.format(chartMax).length * 7 + 12);
  const yAxis = (
    <YAxis
      tickFormatter={(v) => compactMoney.format(v)}
      tick={axisTick}
      tickLine={false}
      tickMargin={8}
      axisLine={false}
      width={yAxisWidth}
    />
  );
  const tooltip = (
    <RechartsTooltip
      cursor={{ stroke: "var(--input)" }}
      content={<ChartTooltip labelFor={tooltipLabel} format={formatMoney} />}
    />
  );
  const sectionTitle = "text-sm font-semibold";
  const fieldLabel = "text-sm font-normal text-muted-foreground";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden>
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight">{t.appName}</span>
          </div>
          <div className="flex items-center gap-1">
            {!isAuthenticated && import.meta.env.VITE_OAUTH_PORTAL_URL && (
              <Button asChild variant="ghost" size="sm">
                <a href={getLoginUrl()}>{t.logIn}</a>
              </Button>
            )}
            <div className="mr-1 flex rounded-md bg-muted p-0.5" role="group" aria-label={t.language}>
              {(["en", "vi"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "cursor-pointer rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                    lang === l && "bg-card text-foreground shadow-sm"
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare} aria-label={t.share}>
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.share}</span>
            </Button>
            <HelpDialog t={t} />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl py-6 lg:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Inputs */}
          <Card className="order-2 gap-0 p-0 shadow-none lg:order-1">
            <section className="space-y-4 p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.you}</h2>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="currentAge"
                  label={t.currentAge}
                  value={inputs.currentAge}
                  onChange={(v) => updateInput("currentAge", v)}
                />
                <NumberField
                  id="retirementAge"
                  label={t.retirementAge}
                  value={inputs.retirementAge}
                  onChange={(v) => updateInput("retirementAge", v)}
                />
              </div>
            </section>

            <section className="space-y-3 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.whatYouHave}</h2>
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
                <NumberField
                  id="currentBalance"
                  label={t.assetKinds.investments}
                  money={moneyField}
                  value={inputs.currentBalance}
                  onChange={(v) => updateInput("currentBalance", v)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className={fieldLabel}>
                    {t.currency}
                  </Label>
                  <Select value={currency} onValueChange={(v) => changeCurrency(v as Currency)}>
                    <SelectTrigger id="currency" className="h-10 w-full bg-card shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <AssetRows t={t} money={moneyField} assets={assets} onChange={setAssets} />
            </section>

            <section className="space-y-4 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.monthlyBudget}</h2>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="monthlyIncome"
                  label={t.takeHomePay}
                  money={moneyField}
                  value={budget.monthlyIncome}
                  onChange={(v) => setBudget((prev) => ({ ...prev, monthlyIncome: parseFloat(v) || 0 }))}
                />
                <NumberField
                  id="budgetExpense"
                  label={t.expenses}
                  money={moneyField}
                  value={budget.monthlyExpense}
                  onChange={(v) => setBudget((prev) => ({ ...prev, monthlyExpense: parseFloat(v) || 0 }))}
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 rounded-md bg-muted px-3 py-2.5">
                <span className="text-sm text-muted-foreground">{t.investedMonthly}</span>
                <span className="font-semibold tabular-nums">{formatMoney(monthlyInvested)}</span>
              </div>
            </section>

            <section className="space-y-3 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.otherIncomeTitle}</h2>
              <IncomeRows
                t={t}
                money={moneyField}
                incomes={otherIncome}
                currentAge={inputs.currentAge}
                onChange={setOtherIncome}
              />
            </section>

            <section className="space-y-4 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>{t.assumptions}</h2>

              {isAuthenticated && savedScenarios.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="scenario-select" className={fieldLabel}>
                    {t.savedScenario}
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                      <SelectTrigger id="scenario-select" className="h-10 flex-1 bg-card shadow-none">
                        <SelectValue placeholder={t.selectScenario} />
                      </SelectTrigger>
                      <SelectContent>
                        {savedScenarios.map((scenario) => (
                          <SelectItem key={scenario.id} value={scenario.id.toString()}>
                            {scenario.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedScenarioId && (
                      <Button
                        onClick={handleDeleteScenario}
                        disabled={deleteScenarioMutation.isPending}
                        variant="outline"
                        size="icon"
                        aria-label={t.deleteScenario}
                        className="size-10 shadow-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <NumberField
                  id="annualReturn"
                  label={t.expectedReturn}
                  suffix="%"
                  step="0.1"
                  value={inputs.annualReturn}
                  onChange={(v) => updateInput("annualReturn", v)}
                />
                <Slider
                  aria-label={t.expectedReturn}
                  min={1}
                  max={15}
                  step={0.1}
                  value={[inputs.annualReturn]}
                  onValueChange={([v]) => setInputs((prev) => ({ ...prev, annualReturn: v }))}
                />
                <div className="grid grid-cols-3 rounded-md bg-muted p-1" role="group" aria-label={t.returnPresets}>
                  {RETURN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.annualReturn)}
                      aria-pressed={activePreset === preset.id}
                      className={cn(
                        "cursor-pointer rounded-sm px-2 py-1.5 text-xs leading-4 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                        activePreset === preset.id && "bg-card text-foreground shadow-sm"
                      )}
                    >
                      <span className="block">{t.presetNames[preset.id]}</span>
                      <span className="block font-normal text-muted-foreground tabular-nums">≈{preset.annualReturn}%</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t.presetsSource}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="inflationRate"
                  label={t.inflation}
                  suffix="%"
                  step="0.1"
                  value={inputs.inflationRate}
                  onChange={(v) => updateInput("inflationRate", v)}
                />
                <NumberField
                  id="safeWithdrawalRate"
                  label={t.withdrawalRate}
                  suffix="%"
                  step="0.1"
                  value={inputs.safeWithdrawalRate}
                  onChange={(v) => updateInput("safeWithdrawalRate", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retirementStrategy" className={fieldLabel}>
                  {t.stopInvestingWhen}
                </Label>
                <Select
                  value={inputs.retirementStrategy}
                  onValueChange={(value: RetirementStrategy) =>
                    setInputs((prev) => ({ ...prev, retirementStrategy: value }))
                  }
                >
                  <SelectTrigger id="retirementStrategy" className="h-10 w-full bg-card shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe_fire">{t.stopSafe(inputs.safeWithdrawalRate)}</SelectItem>
                    <SelectItem value="income_crossover">{t.stopCrossover(inputs.annualReturn)}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isCrossover ? t.stopCrossoverHint : t.stopSafeHint}
                </p>
              </div>
            </section>

            {isAuthenticated && (
              <section className="space-y-3 border-t p-4 sm:p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="scenarioName" className={fieldLabel}>
                    {t.scenarioName}
                  </Label>
                  <Input
                    id="scenarioName"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="h-10 bg-card shadow-none"
                  />
                </div>
                <Button
                  onClick={handleSaveScenario}
                  disabled={createScenarioMutation.isPending}
                  className="w-full shadow-none"
                >
                  {createScenarioMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t.saveScenario}
                </Button>
              </section>
            )}
          </Card>

          {/* Results */}
          <div className="order-1 space-y-6 lg:sticky lg:top-6 lg:order-2">
            <Card className="gap-0 p-4 shadow-none sm:p-6">
              <h1 className="text-sm text-muted-foreground">{t.financialIndependence}</h1>
              {fiPoint ? (
                <>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                    <span className="text-5xl font-semibold tracking-tight tabular-nums">{fiPoint.year}</span>
                    <span className="text-xl text-muted-foreground">{t.atAge(fiPoint.age)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {yearsToFire === 0 ? t.alreadyThere(fiReason) : t.inYears(yearsToFire ?? 0, fiReason)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{t.notWithin50}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t.notWithin50Hint}</p>
                </>
              )}
              {assets.some((a) => a.kind === "property") && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.netWorthLine(formatMoney(projection[0].netWorth))}
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5 xl:grid-cols-4">
                <Stat
                  label={t.fireNumberToday}
                  value={formatMoney(projection[0].fireNumber)}
                  detail={
                    inputs.safeWithdrawalRate > 0
                      ? (projection[0].otherIncome > 0 ? t.timesNeed : t.timesExpenses)(+(100 / inputs.safeWithdrawalRate).toFixed(1))
                      : undefined
                  }
                />
                <Stat
                  label={t.portfolioAtFi}
                  value={fiPoint ? formatMoney(toDisplay(fiPoint.balance, fiPoint.year - projection[0].year)) : "—"}
                  detail={fiPoint ? t.inYear(fiPoint.year, !futureDollars) : undefined}
                />
                <Stat
                  label={t.savingsRate}
                  value={`${Math.round(savingsRate * 100)}%`}
                  detail={t.perMonth(formatMoney(monthlyInvested))}
                />
                <Stat
                  label={isCrossover ? t.ruleReached(inputs.safeWithdrawalRate) : t.incomeCrossover}
                  value={otherPoint ? String(otherPoint.year) : "—"}
                  detail={otherPoint ? t.ageOnly(otherPoint.age) : isCrossover ? t.notAfterStopping : undefined}
                />
              </div>
            </Card>

            <Card className="gap-0 p-4 shadow-none sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{t.projection}</h2>
                  <p className="text-sm text-muted-foreground">
                    {chartView === "portfolio" ? t.portfolioSubtitle : t.cashflowSubtitle}{" "}
                    {futureDollars ? t.inFutureValues : t.inTodaysMoney}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={chartView} onValueChange={(v) => setChartView(v as typeof chartView)}>
                    <TabsList>
                      <TabsTrigger value="portfolio">{t.portfolio}</TabsTrigger>
                      <TabsTrigger value="cashflow">{t.cashFlow}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button onClick={handleExportCSV} variant="ghost" size="sm" aria-label={t.exportCsv}>
                    <Download className="w-4 h-4" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {chartView === "portfolio" ? (
                  <>
                    <LegendItem color="var(--chart-1)" label={t.portfolioBalance} />
                    <LegendItem color="var(--chart-4)" label={t.fireNumber} dashed />
                  </>
                ) : (
                  <>
                    <LegendItem color="var(--chart-2)" label={t.investmentReturns} />
                    <LegendItem color="var(--chart-3)" label={otherIncome.length > 0 ? t.expensesAfterIncome : t.expenses} />
                    {otherIncome.length > 0 && <LegendItem color={OTHER_INCOME_COLOR} label={t.otherIncomeSeries} />}
                  </>
                )}
                <label className="ml-auto flex cursor-pointer items-center gap-2">
                  <Switch checked={futureDollars} onCheckedChange={setFutureDollars} />
                  {t.futureValues}
                </label>
              </div>

              <div className="mt-2 h-[280px] w-full sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "portfolio" ? (
                    <ComposedChart data={chartData} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      {xAxis}
                      {yAxis}
                      {tooltip}
                      {fiPoint && (
                        <ReferenceLine
                          x={fiPoint.year}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="2 3"
                          label={{ value: t.fiMarker(fiPoint.year), position: "top", fill: "var(--foreground)", fontSize: 12 }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="balance"
                        name={t.portfolioBalance}
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="var(--chart-1)"
                        fillOpacity={0.08}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fireNumber"
                        name={t.fireNumber}
                        stroke="var(--chart-4)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                    </ComposedChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      {xAxis}
                      {yAxis}
                      {tooltip}
                      {incomeCrossoverPoint && (
                        <ReferenceLine
                          x={incomeCrossoverPoint.year}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="2 3"
                          label={{
                            value: t.crossoverMarker(incomeCrossoverPoint.year),
                            position: "top",
                            fill: "var(--foreground)",
                            fontSize: 12,
                          }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="returns"
                        name={t.investmentReturns}
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                      {otherIncome.length > 0 && (
                        <Line
                          type="monotone"
                          dataKey="otherIncome"
                          name={t.otherIncomeSeries}
                          stroke={OTHER_INCOME_COLOR}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        name={otherIncome.length > 0 ? t.expensesAfterIncome : t.expenses}
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">{t.footnote}</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
