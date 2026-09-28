import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  formatCurrency,
  type FireInputs,
  type RetirementStrategy,
  type YearlyData,
} from "@/lib/fire-calc";
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
import { Loader2, Save, Download, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface BudgetInputs {
  monthlyIncome: number;
  monthlyExpense: number;
}

interface ScenarioPreset {
  name: string;
  annualReturn: number;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  { name: "Conservative", annualReturn: 5 },
  { name: "Moderate", annualReturn: 7 },
  { name: "Aggressive", annualReturn: 10 },
];

const exportToCSV = (projection: YearlyData[], inputs: FireInputs, budget: BudgetInputs) => {
  const headers = ["Year", "Age", "Investment Balance", "Annual Contribution", "Annual Expenses", "Investment Income", "Safe Withdrawal", "FIRE Number", "Income Crossover", "Safe FIRE"];
  const rows = projection.map((p) => [
    p.year,
    p.age,
    p.balance,
    p.annualContribution,
    p.annualExpense,
    p.investmentIncome,
    p.safeWithdrawalAmount,
    p.fireNumber,
    p.isIncomeCrossover ? "Yes" : "No",
    p.isFireAchieved ? "Yes" : "No",
  ]);

  const csvContent = [
    ["FIRE Calculator Export"],
    [""],
    ["Budget:"],
    ["Monthly Income", budget.monthlyIncome],
    ["Monthly Expenses", budget.monthlyExpense],
    ["Monthly Contribution (calculated)", inputs.monthlyContribution],
    [""],
    ["Configuration:"],
    ["Current Balance", inputs.currentBalance],
    ["Annual Return (%)", inputs.annualReturn],
    ["Current Age", inputs.currentAge],
    ["Retirement Age", inputs.retirementAge],
    ["Inflation Rate (%)", inputs.inflationRate],
    ["Safe Withdrawal Rate (%)", inputs.safeWithdrawalRate],
    ["Retirement Strategy", inputs.retirementStrategy === "safe_fire" ? "Safe FIRE (4% rule)" : "Income Crossover"],
    [""],
    [headers.join(",")],
    ...rows.map((row) => row.join(",")),
  ]
    .map((row) => (Array.isArray(row) ? row.join(",") : row))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fire-calculator-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

function NumberField({
  id,
  label,
  value,
  onChange,
  money,
  suffix,
  step,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  /** Dollar amount: shows "$" and thousands separators */
  money?: boolean;
  suffix?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        {money && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
        )}
        <Input
          id={id}
          type={money ? "text" : "number"}
          inputMode={money ? "numeric" : "decimal"}
          step={step}
          value={money ? value.toLocaleString("en-US") : value}
          onChange={(e) => onChange(money ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
          className={cn("h-10 bg-card tabular-nums shadow-none", money && "pl-7", suffix && "pr-9")}
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
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; strokeDasharray?: string }[];
  label?: number;
  labelFor: (year: number) => string;
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
          <span className="ml-auto pl-4 font-medium tabular-nums">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  // Budget inputs (for calculating monthly contribution)
  const [budget, setBudget] = useState<BudgetInputs>({
    monthlyIncome: 4000,
    monthlyExpense: 3000,
  });

  // Auto-calculate monthly contribution from budget
  const calculatedContribution = Math.max(0, budget.monthlyIncome - budget.monthlyExpense);

  const [inputs, setInputs] = useState<FireInputs>({
    currentBalance: 500000,
    annualReturn: 7,
    monthlyContribution: 1000,
    monthlyExpense: 3000,
    currentAge: 36,
    retirementAge: 65,
    inflationRate: 3,
    safeWithdrawalRate: 4,
    retirementStrategy: "safe_fire",
  });

  // Sync monthly contribution and expense from budget
  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      monthlyContribution: calculatedContribution,
      monthlyExpense: budget.monthlyExpense,
    }));
  }, [calculatedContribution, budget.monthlyExpense]);

  const [scenarioName, setScenarioName] = useState("My FIRE Plan");
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
      // Saved scenarios have no retirement-trigger column, so keep the current choice.
      setInputs((prev) => ({
        ...prev,
        currentBalance: parseFloat(selectedScenario.currentBalance),
        annualReturn: parseFloat(selectedScenario.annualReturn),
        monthlyContribution: parseFloat(selectedScenario.monthlyContribution),
        monthlyExpense: parseFloat(selectedScenario.monthlyExpense),
        currentAge: selectedScenario.currentAge,
        retirementAge: selectedScenario.retirementAge,
        inflationRate: parseFloat(selectedScenario.inflationRate),
        safeWithdrawalRate: parseFloat(selectedScenario.safeWithdrawalRate),
      }));
      setScenarioName(selectedScenario.name);
      toast.success(`Loaded scenario: ${selectedScenario.name}`);
    }
  }, [selectedScenario]);

  const projection = useMemo(() => calculateFireProjection(inputs), [inputs]);

  // Income Crossover: when investment returns > expenses (aggressive milestone)
  const incomeCrossoverPoint = useMemo(() => {
    return projection.find((p) => p.isIncomeCrossover);
  }, [projection]);

  // Safe FIRE: when 4% withdrawal > expenses (conservative milestone)
  const safeFIREPoint = useMemo(() => {
    return projection.find((p) => p.isFireAchieved);
  }, [projection]);

  const chartData = useMemo(() => {
    return projection.map((p) => ({
      year: p.year,
      "Investment Balance": p.balance,
      "Annual Expenses": p.annualExpense,
      "Investment Income": p.investmentIncome,
      "FIRE Number": p.fireNumber,
    }));
  }, [projection]);

  const createScenarioMutation = trpc.fireScenarios.create.useMutation({
    onSuccess: () => {
      toast.success("Scenario saved successfully!");
      setScenarioName("My FIRE Plan");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const deleteScenarioMutation = trpc.fireScenarios.delete.useMutation({
    onSuccess: () => {
      toast.success("Scenario deleted successfully!");
      setSelectedScenarioId("");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleSaveScenario = () => {
    if (!isAuthenticated) {
      toast.error("Please login to save scenarios");
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
    });
  };

  const handleDeleteScenario = () => {
    if (!selectedScenarioId) return;
    if (confirm("Are you sure you want to delete this scenario?")) {
      deleteScenarioMutation.mutate({ id: parseInt(selectedScenarioId) });
    }
  };

  const updateInput = (key: keyof FireInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [key]: numValue }));
  };

  const applyPreset = (preset: ScenarioPreset) => {
    setInputs((prev) => ({
      ...prev,
      annualReturn: preset.annualReturn,
    }));
    setSelectedScenarioId("");
  };

  const handleExportCSV = () => {
    exportToCSV(projection, inputs, budget);
    toast.success("Projection exported to CSV");
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
  const yearsToFire = safeFIREPoint ? safeFIREPoint.year - projection[0].year : null;
  const activePreset = SCENARIO_PRESETS.find((p) => p.annualReturn === inputs.annualReturn)?.name;
  const tickEvery = isMobile ? 10 : 5;
  const xTicks = chartData.filter((_, i) => i % tickEvery === 0).map((d) => d.year);
  const tooltipLabel = (year: number) => {
    const point = projection.find((p) => p.year === year);
    return point ? `${year} · age ${point.age}` : String(year);
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
  const yAxis = (
    <YAxis
      tickFormatter={(v) => compactCurrency.format(v)}
      tick={axisTick}
      tickLine={false}
      tickMargin={8}
      axisLine={false}
      width={isMobile ? 48 : 60}
    />
  );
  const tooltip = (
    <RechartsTooltip cursor={{ stroke: "var(--input)" }} content={<ChartTooltip labelFor={tooltipLabel} />} />
  );
  const sectionTitle = "text-sm font-semibold";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden>
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
            </span>
            <span className="font-semibold tracking-tight">FIRE Calculator</span>
          </div>
          {!isAuthenticated && import.meta.env.VITE_OAUTH_PORTAL_URL && (
            <Button asChild variant="ghost" size="sm">
              <a href={getLoginUrl()}>Log in</a>
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-6xl py-6 lg:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Inputs */}
          <Card className="order-2 gap-0 p-0 shadow-none lg:order-1">
            <section className="space-y-4 p-4 sm:p-5">
              <h2 className={sectionTitle}>You</h2>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="currentAge"
                  label="Current age"
                  value={inputs.currentAge}
                  onChange={(v) => updateInput("currentAge", v)}
                />
                <NumberField
                  id="retirementAge"
                  label="Retirement age"
                  value={inputs.retirementAge}
                  onChange={(v) => updateInput("retirementAge", v)}
                />
              </div>
              <NumberField
                id="currentBalance"
                label="Current investments"
                money
                value={inputs.currentBalance}
                onChange={(v) => updateInput("currentBalance", v)}
              />
            </section>

            <section className="space-y-4 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>Monthly budget</h2>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="monthlyIncome"
                  label="Income"
                  money
                  value={budget.monthlyIncome}
                  onChange={(v) => setBudget((prev) => ({ ...prev, monthlyIncome: parseFloat(v) || 0 }))}
                />
                <NumberField
                  id="budgetExpense"
                  label="Expenses"
                  money
                  value={budget.monthlyExpense}
                  onChange={(v) => setBudget((prev) => ({ ...prev, monthlyExpense: parseFloat(v) || 0 }))}
                />
              </div>
              <div className="flex items-baseline justify-between rounded-md bg-muted px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Invested each month</span>
                <span className="font-semibold tabular-nums">{formatCurrency(monthlyInvested)}</span>
              </div>
            </section>

            <section className="space-y-4 border-t p-4 sm:p-5">
              <h2 className={sectionTitle}>Assumptions</h2>

              {isAuthenticated && savedScenarios.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="scenario-select" className="text-sm font-normal text-muted-foreground">
                    Saved scenario
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                      <SelectTrigger id="scenario-select" className="h-10 flex-1 bg-card shadow-none">
                        <SelectValue placeholder="Select a scenario" />
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
                        aria-label="Delete scenario"
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
                  label="Expected annual return"
                  suffix="%"
                  step="0.1"
                  value={inputs.annualReturn}
                  onChange={(v) => updateInput("annualReturn", v)}
                />
                <Slider
                  aria-label="Expected annual return"
                  min={1}
                  max={15}
                  step={0.1}
                  value={[inputs.annualReturn]}
                  onValueChange={([v]) => setInputs((prev) => ({ ...prev, annualReturn: v }))}
                />
                <div className="grid grid-cols-3 rounded-md bg-muted p-1" role="group" aria-label="Return presets">
                  {SCENARIO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      aria-pressed={activePreset === preset.name}
                      className={cn(
                        "cursor-pointer rounded-sm px-2 py-1.5 text-xs leading-4 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                        activePreset === preset.name && "bg-card text-foreground shadow-sm"
                      )}
                    >
                      <span className="block">{preset.name}</span>
                      <span className="block font-normal text-muted-foreground tabular-nums">{preset.annualReturn}%</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="inflationRate"
                  label="Inflation"
                  suffix="%"
                  step="0.1"
                  value={inputs.inflationRate}
                  onChange={(v) => updateInput("inflationRate", v)}
                />
                <NumberField
                  id="safeWithdrawalRate"
                  label="Withdrawal rate"
                  suffix="%"
                  step="0.1"
                  value={inputs.safeWithdrawalRate}
                  onChange={(v) => updateInput("safeWithdrawalRate", v)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retirementStrategy" className="text-sm font-normal text-muted-foreground">
                  Stop investing when
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
                    <SelectItem value="safe_fire">
                      A {inputs.safeWithdrawalRate}% withdrawal covers expenses
                    </SelectItem>
                    <SelectItem value="income_crossover">
                      Returns ({inputs.annualReturn}%) cover expenses
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inputs.retirementStrategy === "safe_fire"
                    ? "Conservative: the safe-withdrawal rule."
                    : "Aggressive: less margin for bad markets."}
                </p>
              </div>
            </section>

            {isAuthenticated && (
              <section className="space-y-3 border-t p-4 sm:p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="scenarioName" className="text-sm font-normal text-muted-foreground">
                    Scenario name
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
                  Save scenario
                </Button>
              </section>
            )}
          </Card>

          {/* Results */}
          <div className="order-1 space-y-6 lg:sticky lg:top-6 lg:order-2">
            <Card className="gap-0 p-4 shadow-none sm:p-6">
              <h1 className="text-sm text-muted-foreground">Financial independence</h1>
              {safeFIREPoint ? (
                <>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                    <span className="text-5xl font-semibold tracking-tight tabular-nums">{safeFIREPoint.year}</span>
                    <span className="text-xl text-muted-foreground">at age {safeFIREPoint.age}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {yearsToFire === 0
                      ? `Already there: a ${inputs.safeWithdrawalRate}% withdrawal covers your expenses today.`
                      : `In ${yearsToFire} ${yearsToFire === 1 ? "year" : "years"}, when a ${inputs.safeWithdrawalRate}% withdrawal covers your inflation-adjusted expenses.`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xl font-semibold tracking-tight">Not within 50 years</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Invest more each month, lower expenses, or revisit the return assumption.
                  </p>
                </>
              )}

              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5 xl:grid-cols-4">
                <Stat
                  label="FIRE number today"
                  value={formatCurrency(projection[0].fireNumber)}
                  detail={
                    inputs.safeWithdrawalRate > 0
                      ? `${+(100 / inputs.safeWithdrawalRate).toFixed(1)}× annual expenses`
                      : undefined
                  }
                />
                <Stat
                  label="Portfolio at FI"
                  value={safeFIREPoint ? formatCurrency(safeFIREPoint.balance) : "—"}
                  detail={safeFIREPoint ? `in ${safeFIREPoint.year}` : undefined}
                />
                <Stat
                  label="Savings rate"
                  value={`${Math.round(savingsRate * 100)}%`}
                  detail={`${formatCurrency(monthlyInvested)} a month`}
                />
                <Stat
                  label="Income crossover"
                  value={incomeCrossoverPoint ? String(incomeCrossoverPoint.year) : "—"}
                  detail={incomeCrossoverPoint ? `age ${incomeCrossoverPoint.age}` : undefined}
                />
              </div>
            </Card>

            <Card className="gap-0 p-4 shadow-none sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Projection</h2>
                  <p className="text-sm text-muted-foreground">
                    {chartView === "portfolio"
                      ? "Portfolio balance against the amount you need."
                      : "Investment returns against yearly expenses, inflation-adjusted."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={chartView} onValueChange={(v) => setChartView(v as typeof chartView)}>
                    <TabsList>
                      <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                      <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button onClick={handleExportCSV} variant="ghost" size="sm" aria-label="Export projection as CSV">
                    <Download className="w-4 h-4" />
                    CSV
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {chartView === "portfolio" ? (
                  <>
                    <LegendItem color="var(--chart-1)" label="Portfolio balance" />
                    <LegendItem color="var(--chart-4)" label="FIRE number" dashed />
                  </>
                ) : (
                  <>
                    <LegendItem color="var(--chart-2)" label="Investment returns" />
                    <LegendItem color="var(--chart-3)" label="Expenses" />
                  </>
                )}
              </div>

              <div className="mt-2 h-[280px] w-full sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "portfolio" ? (
                    <ComposedChart data={chartData} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      {xAxis}
                      {yAxis}
                      {tooltip}
                      {safeFIREPoint && (
                        <ReferenceLine
                          x={safeFIREPoint.year}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="2 3"
                          label={{ value: `FI ${safeFIREPoint.year}`, position: "top", fill: "var(--foreground)", fontSize: 12 }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="Investment Balance"
                        name="Portfolio balance"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="var(--chart-1)"
                        fillOpacity={0.08}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="FIRE Number"
                        name="FIRE number"
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
                          label={{ value: `Crossover ${incomeCrossoverPoint.year}`, position: "top", fill: "var(--foreground)", fontSize: 12 }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="Investment Income"
                        name="Investment returns"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Annual Expenses"
                        name="Expenses"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                After you reach FI, contributions stop and yearly expenses come out of the portfolio.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
