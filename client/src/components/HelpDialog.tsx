import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="How to use this calculator">
          <CircleHelp className="size-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How to use the FIRE Calculator</DialogTitle>
          <DialogDescription>
            Estimate when your investments could cover your living costs, so work becomes optional.
          </DialogDescription>
        </DialogHeader>

        <Section title="1. Enter your numbers">
          <p>
            <span className="text-foreground">You:</span> your age, the age you'd retire anyway, and what you
            have invested today.
          </p>
          <p>
            <span className="text-foreground">Monthly budget:</span> take-home income and spending. The
            difference is what gets invested each month.
          </p>
          <p>
            <span className="text-foreground">Assumptions:</span> expected yearly return (or pick a preset),
            inflation, and the withdrawal rate you'd live on. 4% is the common rule of thumb.
          </p>
        </Section>

        <Section title="2. Read the result">
          <p>
            <span className="text-foreground">Financial independence</span> is the first year a withdrawal at
            your chosen rate covers your expenses, adjusted for inflation.
          </p>
          <p>
            <span className="text-foreground">FIRE number</span> is the portfolio you'd need today: yearly
            expenses ÷ withdrawal rate (25× at 4%).
          </p>
          <p>
            <span className="text-foreground">Income crossover</span> is the earlier point where returns alone
            match expenses. It leaves less margin for bad markets.
          </p>
        </Section>

        <Section title="3. Explore the projection">
          <p>
            <span className="text-foreground">Portfolio</span> shows your balance against the FIRE number;
            where they cross is your FI year. <span className="text-foreground">Cash flow</span> compares
            yearly returns with yearly expenses.
          </p>
          <p>Hover the chart for any year's figures, or download every year with CSV.</p>
        </Section>

        <Section title="How the projection works">
          <ul className="list-disc space-y-1 pl-4">
            <li>Returns are steady every year; real markets go up and down.</li>
            <li>Expenses grow with inflation. Taxes and fees aren't included.</li>
            <li>
              Once you reach your "stop investing" point you stop contributing for good and live off the
              portfolio.
            </li>
          </ul>
          <p>This is a planning estimate, not financial advice.</p>
        </Section>
      </DialogContent>
    </Dialog>
  );
}
