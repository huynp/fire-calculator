import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Messages } from "@/lib/i18n";
import { CircleHelp } from "lucide-react";

export function HelpDialog({ t }: { t: Messages }) {
  const { help } = t;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={t.helpButton}>
          <CircleHelp className="size-4.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{help.title}</DialogTitle>
          <DialogDescription>{help.intro}</DialogDescription>
        </DialogHeader>

        {help.sections.map((section) => (
          <section key={section.title} className="space-y-1.5">
            <h3 className="text-sm font-semibold">{section.title}</h3>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {section.paragraphs.map((p, i) =>
                Array.isArray(p) ? (
                  <p key={i}>
                    <span className="text-foreground">{p[0]}</span>
                    {p[1]}
                  </p>
                ) : (
                  <p key={i}>{p}</p>
                )
              )}
              {section.bullets && (
                <ul className="list-disc space-y-1 pl-4">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {section.note && <p>{section.note}</p>}
            </div>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
