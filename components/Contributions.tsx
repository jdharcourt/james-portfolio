"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/button/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select/components/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip/components/tooltip";
import type { ContributionCalendar, ContributionDay } from "@/lib/github";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const formatDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

export function Contributions() {
  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, index) => currentYear - index);
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ContributionCalendar | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(false); setActive(null);
    fetch(`/api/contributions?year=${year}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unavailable");
      setData(await response.json());
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [year, retry]);

  // GitHub-style layout: Sunday-first columns, one per week.
  const layout = useMemo(() => {
    if (!data) return null;
    const offset = new Date(`${data.days[0].date}T12:00:00Z`).getUTCDay();
    const weeks = Math.ceil((offset + data.days.length) / 7);
    const months = MONTHS.map((label, month) => {
      const index = data.days.findIndex(day => Number(day.date.slice(5, 7)) === month + 1);
      return index < 0 ? null : { label, column: Math.floor((offset + index) / 7) + 1 };
    }).filter((month): month is { label: string; column: number } => month !== null && month.column <= weeks - 1);
    return { offset, weeks, months };
  }, [data]);

  // On narrow screens the calendar scrolls; start at the most recent weeks.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (data && scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [data]);

  const activeDay: ContributionDay | null = data && active !== null ? data.days[active] : null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!data) return;
    const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const last = data.days.length - 1;
    setActive(current => {
      if (current === null) return step > 0 ? 0 : last;
      return Math.max(0, Math.min(last, current + (Number.isFinite(step) ? step : step > 0 ? last : -last)));
    });
  };

  const publicCount = data?.privateCount != null ? Math.max(0, data.total - data.privateCount) : null;

  return <TooltipProvider delay={0}>
    <div className="card-shell">
      <div className="card-head">
        <span className="label">Contribution calendar</span>
        <Select value={year} onValueChange={value => { if (typeof value === "number") setYear(value); }}>
          <SelectTrigger size="sm" aria-label="Year" className="font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{years.map(value => <SelectItem key={value} value={value} className="font-mono">{value}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="card-body">
        <div className="stats" role="status">
          <div className="stat stat-total"><span className="stat-value">{data ? data.total.toLocaleString() : error ? "—" : "…"}</span><span className="label">Contributions in {year}</span></div>
          {data?.privateCount != null ? <>
            <div className="stat"><span className="stat-value">{data.privateCount.toLocaleString()}</span>
              <Tooltip>
                <TooltipTrigger render={<button type="button" className="stat-trigger label" />}>Private repos <Info aria-hidden="true" /></TooltipTrigger>
                <TooltipContent side="top">Commits to private repositories. Only the counts are shown.</TooltipContent>
              </Tooltip>
            </div>
            <div className="stat"><span className="stat-value">{publicCount!.toLocaleString()}</span><span className="label">Public &amp; other</span></div>
          </> : <div className="stat"><span className="stat-value">{data ? data.activeDays : "…"}</span><span className="label">Active days</span></div>}
          <div className="stat"><span className="stat-value">{data ? plural(data.longestStreak, "day") : "…"}</span><span className="label">Longest streak</span></div>
          {data?.privateCount == null && <div className="stat"><span className="stat-value">{data?.bestDay ? data.bestDay.count : "…"}</span><span className="label">Best day</span></div>}
        </div>

        <div className="cal-scroll" ref={scrollRef}>
          {data && layout && <div className="cal" style={{ ["--weeks" as string]: layout.weeks }}>
            <div className="cal-months" aria-hidden="true">{layout.months.map(month => <span key={month.label} style={{ gridColumn: month.column }}>{month.label}</span>)}</div>
            <div className="cal-days" aria-hidden="true">{WEEKDAYS.map((day, index) => <span key={index}>{day}</span>)}</div>
            <div
              className="cal-grid"
              role="img"
              tabIndex={0}
              aria-label={`${plural(data.total, "contribution")} in ${year}. Use the arrow keys to read daily counts.`}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
            >
              {Array.from({ length: layout.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
              {data.days.map((day, index) => <Tooltip key={day.date}>
                <TooltipTrigger render={<span className="cell" data-level={day.level} data-active={active === index} onPointerEnter={() => setActive(index)} />} />
                <TooltipContent side="top"><strong>{plural(day.count, "contribution")}</strong> · {formatDate(day.date)}</TooltipContent>
              </Tooltip>)}
            </div>
          </div>}
          {error && <div className="cal-empty"><p>Couldn’t reach GitHub. The calendar will return shortly.</p><Button variant="outline" className="h-11 px-5" onClick={() => setRetry(value => value + 1)}>Retry</Button></div>}
          {!data && !error && <div className="cal-empty" aria-hidden="true">Fetching the calendar from GitHub…</div>}
        </div>

        <div className="cal-foot">
          <p aria-live="polite">{activeDay ? <><strong>{formatDate(activeDay.date)}</strong> — {plural(activeDay.count, "contribution")}</> : data?.bestDay ? <>Best day: <strong>{formatDate(data.bestDay.date)}</strong> — {plural(data.bestDay.count, "contribution")}</> : "Hover a day, or focus the grid and use the arrow keys."}</p>
          <div className="legend" aria-hidden="true"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className="cell" data-level={level} />)}<span>More</span></div>
        </div>
      </div>
    </div>
  </TooltipProvider>;
}
