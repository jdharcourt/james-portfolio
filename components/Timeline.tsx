import type { Entry } from "@/lib/data";

export function Timeline({ entries, label, variant = "log" }: { entries: Entry[]; label: string; variant?: "log" | "resume" }) {
  const Heading = variant === "log" ? "h4" : "h3";
  return <ol className={variant === "log" ? "log-list" : "resume-list"} aria-label={label}>
    {entries.map(item => <li key={`${item.org}-${item.title}`}>
      <p className={variant === "log" ? "log-period" : "period"}>{item.period}</p>
      <div><Heading>{item.title} <span>· {item.org}</span></Heading>{item.description && <p>{item.description}</p>}</div>
    </li>)}
  </ol>;
}
