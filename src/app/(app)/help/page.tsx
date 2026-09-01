import { Card, PageHeader } from "@/components/ui";
import { GUIDE_SECTIONS } from "@/lib/user-guide";

export default function HelpPage() {
  const using = GUIDE_SECTIONS.filter((s) => s.group === "using");
  const rules = GUIDE_SECTIONS.filter((s) => s.group === "rules");

  return (
    <div>
      <PageHeader
        title="Help and user guide"
        hint="How to use every tab, plus the New Jersey transportation rules this office follows."
      />
      <div className="grid gap-8 xl:grid-cols-[16rem_1fr]">
        <nav className="xl:sticky xl:top-24 xl:self-start">
          <Card className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Using the app</p>
            <ul className="space-y-1 text-sm">
              {using.map((s) => (
                <li key={s.id}>
                  <a className="text-teal hover:underline" href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ul>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">Rules and guidelines</p>
            <ul className="space-y-1 text-sm">
              {rules.map((s) => (
                <li key={s.id}>
                  <a className="text-teal hover:underline" href={`#${s.id}`}>{s.title.replace("Rules: ", "")}</a>
                </li>
              ))}
            </ul>
          </Card>
        </nav>
        <div className="space-y-6">
          {GUIDE_SECTIONS.map((section) => (
            <Card key={section.id} className="scroll-mt-24">
              <section id={section.id}>
                <h2 className="serif text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, i) => (
                    <div key={i}>
                      {block.heading ? <h3 className="mb-1 font-medium">{block.heading}</h3> : null}
                      {block.body ? <p className="text-muted">{block.body}</p> : null}
                      {block.steps ? (
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                          {block.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      ) : null}
                      {block.bullets ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                          {block.bullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      {block.note ? (
                        <p className="mt-2 rounded-xl bg-teal-soft px-3 py-2 text-sm">{block.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
