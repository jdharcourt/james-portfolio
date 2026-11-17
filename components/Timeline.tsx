import type { Entry } from "@/lib/data";

export type ResumeEntry = Entry & { meta?: string };

export function Timeline({ entries, label }: { entries: ResumeEntry[]; label: string }) {
  return <ul className="resume-list" aria-label={label}>
    {entries.map(item => <li key={`${item.org}-${item.title}`}>
      <div className="resume-row">
        <h3>{item.href ? <a href={item.href}>{item.title}</a> : item.title}<span>, {item.org}</span></h3>
        <span className="resume-date">{item.period}</span>
      </div>
      {item.meta && <p className="resume-meta">{item.meta}</p>}
      {item.description && <p>{item.description}</p>}
    </li>)}
  </ul>;
}
