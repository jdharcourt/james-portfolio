import type { Entry } from "@/lib/data";

export function Timeline({ entries, label }: { entries: Entry[]; label: string }) {
  return <ol className="resume-list" aria-label={label}>
    {entries.map(item => <li key={`${item.org}-${item.title}`}>
      <p className="period">{item.period}</p>
      <div><h3>{item.title} <span>· {item.org}</span></h3>{item.description && <p>{item.description}</p>}</div>
    </li>)}
  </ol>;
}
