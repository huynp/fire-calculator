import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Loader2, Save, TrendingUp, Download, Zap, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RetirementStrategy = "income_crossover" | "safe_fire";

interface FireInputs {
  currentBalance: number;
  annualReturn: number;
  monthlyContribution: number;
  monthlyExpense: number;
  currentAge: number;
  retirementAge: number;
  inflationRate: number;
  safeWithdrawalRate: number;
  retirementStrategy: RetirementStrategy;
}

interface YearlyData {
  age: number;
  year: number;
  balance: number;
  annualContribution: number;
  annualExpense: number;
  investmentIncome: number;
  safeWithdrawalAmount: number;
  fireNumber: number;
  isFireAchieved: boolean; // Safe FIRE (4% rule)
  isIncomeCrossover: boolean; // Income > Expenses
}

interface ChartLineVisibility {
  balance: boolean;
  expenses: boolean;
  income: boolean;
}

interface ScenarioPreset {
  name: string;
  annualReturn: number;
  monthlyContribution: number;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  { name: "Conservative", annualReturn: 5, monthlyContribution: 500 },
  { name: "Moderate", annualReturn: 7, monthlyContribution: 1000 },
  { name: "Aggressive", annualReturn: 10, monthlyContribution: 2000 },
];

const calculateFireProjection = (inputs: FireInputs): YearlyData[] => {
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
  } = inputs;

  const projection: YearlyData[] = [];
  let balance = currentBalance;
  let annualExpense = monthlyExpense * 12;
  const currentYear = new Date().getFullYear();
  const yearsToProject = 50;

  for (let i = 0; i <= yearsToProject; i++) {
    const age = currentAge + i;
    const year = currentYear + i;

    const adjustedAnnualExpense = annualExpense * Math.pow(1 + inflationRate / 100, i);
    const fireNumber = adjustedAnnualExpense / (safeWithdrawalRate / 100);

    // Investment Income = actual investment return
    const investmentIncome = balance * (annualReturn / 100);

    // Safe withdrawal amount (4% rule)
    const safeWithdrawalAmount = balance * (safeWithdrawalRate / 100);

    // Two milestones:
    // 1. Income Crossover: when investment returns > expenses (aggressive)
    const isIncomeCrossover = investmentIncome >= adjustedAnnualExpense;
    // 2. Safe FIRE: when safe withdrawal (4%) > expenses (conservative)
    const isFireAchieved = safeWithdrawalAmount >= adjustedAnnualExpense;

    // Determine if retirement is triggered based on chosen strategy
    const isRetired = retirementStrategy === "income_crossover"
      ? isIncomeCrossover
      : isFireAchieved;

    const shouldContribute = age < retirementAge && !isRetired;
    const annualContribution = shouldContribute ? monthlyContribution * 12 : 0;

    projection.push({
      age,
      year,
      balance: Math.round(balance),
      annualContribution,
      annualExpense: Math.round(adjustedAnnualExpense),
      investmentIncome: Math.round(investmentIncome),
      safeWithdrawalAmount: Math.round(safeWithdrawalAmount),
      fireNumber: Math.round(fireNumber),
      isFireAchieved,
      isIncomeCrossover,
    });

    const growth = balance * (annualReturn / 100);

    // Subtract expenses once retired (living off portfolio)
    const withdrawal = isRetired ? adjustedAnnualExpense : 0;

    balance = balance + growth + annualContribution - withdrawal;
  }

  return projection;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const exportToCSV = (projection: YearlyData[], inputs: FireInputs) => {
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
    ["Inputs:"],
    ["Current Balance", inputs.currentBalance],
    ["Annual Return (%)", inputs.annualReturn],
    ["Monthly Contribution", inputs.monthlyContribution],
    ["Monthly Expenses", inputs.monthlyExpense],
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

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [inputs, setInputs] = useState<FireInputs>({
    currentBalance: 500000,
    annualReturn: 6,
    monthlyContribution: 1000,
    monthlyExpense: 3000,
    currentAge: 36,
    retirementAge: 65,
    inflationRate: 3,
    safeWithdrawalRate: 4,
    retirementStrategy: "safe_fire",
  });

  const [scenarioName, setScenarioName] = useState("My FIRE Plan");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  const [chartLineVisibility, setChartLineVisibility] = useState<ChartLineVisibility>({
    balance: false,
    expenses: true,
    income: true,
  });

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
      });
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

  const toggleLineVisibility = (line: keyof ChartLineVisibility) => {
    setChartLineVisibility((prev) => ({
      ...prev,
      [line]: !prev[line],
    }));
  };

  const applyPreset = (preset: ScenarioPreset) => {
    setInputs((prev) => ({
      ...prev,
      annualReturn: preset.annualReturn,
      monthlyContribution: preset.monthlyContribution,
    }));
    setSelectedScenarioId("");
    toast.success(`Applied ${preset.name} scenario`);
  };

  const handleExportCSV = () => {
    exportToCSV(projection, inputs);
    toast.success("Projection exported to CSV");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-heading font-bold mb-4 bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
            FIRE Calculator
          </h1>
          <p className="text-xl text-white/70 font-sans">
            Calculate your path to Financial Independence, Retire Early
          </p>
          
          {!isAuthenticated && (
            <div className="mt-6">
              <a href={getLoginUrl()}>
                <Button className="glass-button">
                  Login to Save Scenarios
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Scenario Presets */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          {SCENARIO_PRESETS.map((preset) => (
            <Button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              variant="outline"
              className="glass-button"
            >
              <Zap className="w-4 h-4 mr-2" />
              {preset.name}
            </Button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <Card className="glass-panel p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  Your Inputs
                </h2>
              </div>

              <div className="space-y-4">
                {isAuthenticated && savedScenarios.length > 0 && (
                  <div>
                    <Label htmlFor="scenario-select" className="text-white/90">
                      Load Saved Scenario
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Select a scenario..." />
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
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="currentBalance" className="text-white/90">
                    Current Investment Balance ($)
                  </Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    value={inputs.currentBalance}
                    onChange={(e) => updateInput("currentBalance", e.target.value)}
                    className="glass-input mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="annualReturn" className="text-white/90">
                    Expected Annual Return (%)
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="annualReturn"
                      type="number"
                      step="0.1"
                      value={inputs.annualReturn}
                      onChange={(e) => updateInput("annualReturn", e.target.value)}
                      className="glass-input mt-1"
                    />
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="0.1"
                      value={inputs.annualReturn}
                      onChange={(e) => updateInput("annualReturn", e.target.value)}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-white/60">Drag to adjust: {inputs.annualReturn.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="monthlyContribution" className="text-white/90">
                    Monthly Contribution ($)
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="monthlyContribution"
                      type="number"
                      value={inputs.monthlyContribution}
                      onChange={(e) => updateInput("monthlyContribution", e.target.value)}
                      className="glass-input mt-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={inputs.monthlyContribution}
                      onChange={(e) => updateInput("monthlyContribution", e.target.value)}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-white/60">Drag to adjust: {formatCurrency(inputs.monthlyContribution)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="monthlyExpense" className="text-white/90">
                    Monthly Expenses ($)
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="monthlyExpense"
                      type="number"
                      value={inputs.monthlyExpense}
                      onChange={(e) => updateInput("monthlyExpense", e.target.value)}
                      className="glass-input mt-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={inputs.monthlyExpense}
                      onChange={(e) => updateInput("monthlyExpense", e.target.value)}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-white/60">Drag to adjust: {formatCurrency(inputs.monthlyExpense)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="currentAge" className="text-white/90">
                    Current Age
                  </Label>
                  <Input
                    id="currentAge"
                    type="number"
                    value={inputs.currentAge}
                    onChange={(e) => updateInput("currentAge", e.target.value)}
                    className="glass-input mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="retirementAge" className="text-white/90">
                    Retirement Age
                  </Label>
                  <Input
                    id="retirementAge"
                    type="number"
                    value={inputs.retirementAge}
                    onChange={(e) => updateInput("retirementAge", e.target.value)}
                    className="glass-input mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="inflationRate" className="text-white/90">
                    Inflation Rate (%)
                  </Label>
                  <Input
                    id="inflationRate"
                    type="number"
                    step="0.1"
                    value={inputs.inflationRate}
                    onChange={(e) => updateInput("inflationRate", e.target.value)}
                    className="glass-input mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="safeWithdrawalRate" className="text-white/90">
                    Safe Withdrawal Rate (%)
                  </Label>
                  <Input
                    id="safeWithdrawalRate"
                    type="number"
                    step="0.1"
                    value={inputs.safeWithdrawalRate}
                    onChange={(e) => updateInput("safeWithdrawalRate", e.target.value)}
                    className="glass-input mt-1"
                  />
                </div>

                {/* Retirement Strategy Selector */}
                <div>
                  <Label htmlFor="retirementStrategy" className="text-white/90 font-medium">
                    Retirement Trigger
                  </Label>
                  <Select
                    value={inputs.retirementStrategy}
                    onValueChange={(value: RetirementStrategy) =>
                      setInputs((prev) => ({ ...prev, retirementStrategy: value }))
                    }
                  >
                    <SelectTrigger className="glass-input mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe_fire">
                        🛡️ Safe FIRE ({inputs.safeWithdrawalRate}% rule)
                      </SelectItem>
                      <SelectItem value="income_crossover">
                        ⚡ Income Crossover ({inputs.annualReturn}% returns)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-white/50 text-xs mt-1">
                    {inputs.retirementStrategy === "safe_fire"
                      ? "Conservative: Stop contributions when 4% withdrawal covers expenses"
                      : "Aggressive: Stop contributions when investment returns exceed expenses"}
                  </p>
                </div>

                <Button
                  onClick={handleExportCSV}
                  className="w-full glass-button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>

                {isAuthenticated && (
                  <>
                    <div>
                      <Label htmlFor="scenarioName" className="text-white/90">
                        Scenario Name
                      </Label>
                      <Input
                        id="scenarioName"
                        type="text"
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className="glass-input mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleSaveScenario}
                      disabled={createScenarioMutation.isPending}
                      className="w-full glass-button"
                    >
                      {createScenarioMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Scenario
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-8">
            {/* Milestones Card */}
            {(incomeCrossoverPoint || safeFIREPoint) && (
              <Card className="glass-panel p-8">
                <h2 className="text-3xl font-heading font-bold text-white mb-6">
                  🎯 Your FIRE Milestones
                </h2>

                {/* Two milestone cards side by side */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Income Crossover - Aggressive */}
                  {incomeCrossoverPoint && (
                    <div className="p-6 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">⚡</span>
                        <h3 className="text-lg font-semibold text-cyan-400">Income Crossover</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Year</p>
                          <p className="text-2xl font-bold text-cyan-400">{incomeCrossoverPoint.year}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Age</p>
                          <p className="text-2xl font-bold text-cyan-400">{incomeCrossoverPoint.age}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Portfolio Value</p>
                        <p className="text-xl font-bold text-cyan-400">{formatCurrency(incomeCrossoverPoint.balance)}</p>
                      </div>
                      <p className="text-white/70 text-sm">
                        Investment returns ({inputs.annualReturn}%) exceed expenses. You <em>could</em> stop working, but with less safety margin.
                      </p>
                    </div>
                  )}

                  {/* Safe FIRE - Conservative */}
                  {safeFIREPoint && (
                    <div className="p-6 bg-green-500/10 rounded-xl border border-green-500/30">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🛡️</span>
                        <h3 className="text-lg font-semibold text-green-400">Safe FIRE</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Year</p>
                          <p className="text-2xl font-bold text-green-400">{safeFIREPoint.year}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-xs uppercase tracking-wide">Age</p>
                          <p className="text-2xl font-bold text-green-400">{safeFIREPoint.age}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-white/60 text-xs uppercase tracking-wide">Portfolio Value</p>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(safeFIREPoint.balance)}</p>
                      </div>
                      <p className="text-white/70 text-sm">
                        Safe withdrawal ({inputs.safeWithdrawalRate}% rule) covers expenses. Sustainable for 30+ years even in bad markets.
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary message */}
                {incomeCrossoverPoint && safeFIREPoint && incomeCrossoverPoint.year !== safeFIREPoint.year && (
                  <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-center">
                      You can potentially retire in <span className="font-bold text-cyan-400">{incomeCrossoverPoint.year}</span> (age {incomeCrossoverPoint.age}),
                      or wait until <span className="font-bold text-green-400">{safeFIREPoint.year}</span> (age {safeFIREPoint.age}) for maximum safety.
                      That's a <span className="font-bold text-primary">{safeFIREPoint.year - incomeCrossoverPoint.year} year</span> window.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Chart Card */}
            <Card className="glass-panel p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-2xl font-heading font-semibold text-white">
                  Projection Over Time
                </h2>
                
                {/* Chart Line Toggles */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="toggle-balance"
                      checked={chartLineVisibility.balance}
                      onCheckedChange={() => toggleLineVisibility("balance")}
                      className="border-white/30"
                    />
                    <label
                      htmlFor="toggle-balance"
                      className="text-sm text-white/90 cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }}></span>
                      Balance
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="toggle-expenses"
                      checked={chartLineVisibility.expenses}
                      onCheckedChange={() => toggleLineVisibility("expenses")}
                      className="border-white/30"
                    />
                    <label
                      htmlFor="toggle-expenses"
                      className="text-sm text-white/90 cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ec4899" }}></span>
                      Expenses
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="toggle-income"
                      checked={chartLineVisibility.income}
                      onCheckedChange={() => toggleLineVisibility("income")}
                      className="border-white/30"
                    />
                    <label
                      htmlFor="toggle-income"
                      className="text-sm text-white/90 cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#06b6d4" }}></span>
                      Income
                    </label>
                  </div>
                </div>
              </div>

              <p className="text-white/70 text-sm mb-4">
                Monthly contributions stop once FIRE is achieved. The chart shows your portfolio growth after contributions cease.
              </p>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="year"
                      stroke="rgba(255,255,255,0.7)"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.7)"
                      style={{ fontSize: "12px" }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend
                      wrapperStyle={{ color: "#fff" }}
                      iconType="line"
                    />
                    {/* Income Crossover line (cyan) */}
                    {incomeCrossoverPoint && (
                      <ReferenceLine
                        x={incomeCrossoverPoint.year}
                        stroke="#22d3ee"
                        strokeDasharray="5 5"
                        label={{
                          value: "Income Crossover",
                          fill: "#22d3ee",
                          fontSize: 11,
                          position: "top",
                        }}
                      />
                    )}
                    {/* Safe FIRE line (green) */}
                    {safeFIREPoint && safeFIREPoint.year !== incomeCrossoverPoint?.year && (
                      <ReferenceLine
                        x={safeFIREPoint.year}
                        stroke="#22c55e"
                        strokeDasharray="5 5"
                        label={{
                          value: "Safe FIRE",
                          fill: "#22c55e",
                          fontSize: 11,
                          position: "insideTopRight",
                        }}
                      />
                    )}
                    {chartLineVisibility.balance && (
                      <Line
                        type="monotone"
                        dataKey="Investment Balance"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {chartLineVisibility.expenses && (
                      <Line
                        type="monotone"
                        dataKey="Annual Expenses"
                        stroke="#ec4899"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {chartLineVisibility.income && (
                      <Line
                        type="monotone"
                        dataKey="Investment Income"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
