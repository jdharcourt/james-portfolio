"use client";

import { useEffect, useState } from "react";

export function Contributions() {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<{ year: number; total: number; days: { date: string; count: number; level: number }[] } | null>(null);
  const [selected, setSelected] = useState<{ date: string; count: number } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false); setSelected(null);
    fetch(`/api/contributions?year=${year}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unavailable");
      const result = await response.json();
      setData(result);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [year, retry]);

  return <section className="contributions" aria-labelledby="contributions-title">
    <div className="contributions-heading"><h2 id="contributions-title">On GitHub</h2><div className="contributions-year"><label htmlFor="contribution-year">Year</label><select id="contribution-year" value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: currentYear - 2022 }, (_, index) => currentYear - index).map(value => <option key={value}>{value}</option>)}</select></div></div>
    <p className="contributions-count" role="status">{data ? <><strong>{data.total.toLocaleString()}</strong> contributions in {year}</> : error ? "Couldn't load the calendar." : "Loading contributions…"}</p>
    <div className="calendar-scroll">
      {data && <div className="calendar" role="img" aria-label={`${data.total.toLocaleString()} GitHub contributions in ${year}. Choose an activity date below for daily counts.`}>
        <div className="calendar-months">{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(month => <span key={month}>{month}</span>)}</div>
        <div className="calendar-grid" aria-hidden="true">{Array.from({ length: new Date(`${year}-01-01T12:00:00Z`).getUTCDay() }, (_, index) => <span key={`blank-${index}`} />)}{data.days.map(day => <span key={day.date} className={`contribution-day level-${day.level}${selected?.date === day.date ? " contribution-selected" : ""}`} title={`${day.date}: ${day.count} contributions`} />)}</div>
      </div>}
      {error && <div className="calendar-empty"><p>The calendar will return when GitHub is available.</p><button className="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {!data && !error && <div className="calendar-empty" aria-hidden="true">Fetching the real calendar from GitHub.</div>}
    </div>
    {data && <div className="calendar-date"><label htmlFor="activity-date">Activity date</label><input id="activity-date" type="date" min={data.days[0]?.date} max={data.days.at(-1)?.date} onInput={event => setSelected(data.days.find(day => day.date === event.currentTarget.value) || null)} /></div>}
    <div className="calendar-detail" role="status">{selected ? `${selected.count} contribution${selected.count === 1 ? "" : "s"} on ${new Date(`${selected.date}T12:00:00Z`).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}` : data ? "Choose a date to view daily activity." : ""}</div>
    <div className="calendar-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`level-${level}`} />)}<span>More</span></div>
    <a className="contributions-link" href={selected ? `https://github.com/jdharcourt?tab=overview&from=${selected.date}&to=${selected.date}` : "https://github.com/jdharcourt"} target="_blank" rel="noopener noreferrer">{selected ? "View activity for this day" : "View @jdharcourt"}</a>
  </section>;
}
