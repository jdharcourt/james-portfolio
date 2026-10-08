"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { profile, projects, socials, toolbox } from "@/lib/data";

const commands = ["/help", "/commands", "/about", "/projects", "/skills", "/resume", "/github", "/contact", "/ask", "/clear"];

export function Terminal() {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<{ command?: string; output: ReactNode }[]>([{ output: "Welcome. Explore my work from here. Type /help to get started." }]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const conversation = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/chat", { signal: controller.signal }).then(r => r.json()).then(data => setEnabled(data.enabled === true)).catch(() => {});
    return () => { controller.abort(); abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines, busy]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value || busy) return;
    const [command, ...args] = value.split(/\s+/);
    setInput("");
    setHistory(previous => [...previous.slice(-49), value]);
    setHistoryIndex(-1);
    if (command === "/clear") {
      setLines([]);
      conversation.current = [];
      return;
    }
    let output: ReactNode;
    switch (command.toLowerCase()) {
      case "/help":
      case "/commands":
        output = <div className="terminal-help">{commands.map(cmd => <div key={cmd}><button onClick={() => { setInput(cmd === "/ask" ? "/ask " : cmd); inputRef.current?.focus(); }}>{cmd}</button><span>{({ "/help": "Show commands", "/commands": "Show commands", "/about": "Meet James", "/projects": "Browse projects", "/skills": "View the toolbox", "/resume": "Open the résumé", "/github": "Code & contributions", "/contact": "Get in touch", "/ask": "Ask about my work", "/clear": "Clear this window" })[cmd]}</span></div>)}</div>;
        break;
      case "/about": output = profile.about; break;
      case "/projects": output = <div className="terminal-projects">{projects.map(project => <a key={project.name} href={project.href} target="_blank" rel="noopener noreferrer">{project.name} ↗</a>)}</div>; break;
      case "/skills": output = toolbox.join(" · "); break;
      case "/resume": output = <Link href="/resume">Open James&apos;s résumé, with a print / PDF option ↗</Link>; break;
      case "/github": output = <a href={socials.github} target="_blank" rel="noopener noreferrer">github.com/jdharcourt ↗</a>; break;
      case "/contact": output = <div><a href={`mailto:${profile.email}`}>{profile.email} ↗</a><br /><a href={socials.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div>; break;
      case "/ask": {
        const question = args.join(" ");
        if (!question) { output = "Usage: /ask What did you build for GlucoBit?"; break; }
        if (question.length > 800) { output = "Please keep your question to 800 characters."; break; }
        setLines(previous => [...previous.slice(-49), { command: value, output: "" }]);
        setBusy(true);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const sessionResponse = await fetch("/api/chat", { signal: controller.signal });
          if (!sessionResponse.ok) throw new Error("The assistant is busy. Try again shortly.");
          const session = await sessionResponse.json();
          setEnabled(session.enabled === true);
          if (!session.enabled) throw new Error("AI answers aren't connected yet. Try /projects, /about or /resume to explore my work.");
          const messages = [...conversation.current.slice(-8), { role: "user" as const, content: question }];
          while (messages.length > 1 && new TextEncoder().encode(JSON.stringify({ messages })).byteLength > 11000) messages.splice(0, 2);
          const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": session.token }, body: JSON.stringify({ messages }), signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Couldn't get an answer. Please try again.");
          if (typeof data.reply !== "string") throw new Error("Couldn't read the answer. Please try again.");
          conversation.current = [...messages, { role: "assistant", content: data.reply }];
          setLines(previous => [...previous.slice(0, -1), { command: value, output: data.reply.replace(/\u2014/g, ", ") }]);
        } catch (error) {
          if (!controller.signal.aborted) setLines(previous => [...previous.slice(0, -1), { command: value, output: error instanceof Error ? error.message : "Couldn't connect. Please try again." }]);
        } finally { setBusy(false); inputRef.current?.focus(); }
        return;
      }
      default: output = `Command not found: ${command}. Type /help for the command list.`;
    }
    setLines(previous => [...previous.slice(-49), { command: value, output }]);
  }

  return <section className="terminal" id="terminal" aria-label="Portfolio terminal">
    <div className="window-bar"><div className="window-dots" aria-hidden="true"><i /><i /><i /></div><h2>james@portfolio: ~</h2><span>terminal</span></div>
    <div className="terminal-output" ref={outputRef} role="log" aria-live="polite" aria-relevant="additions text">
      <p className="terminal-welcome">James Harcourt <span>/ portfolio</span></p>
      {lines.map((line, index) => <div className="terminal-entry" key={index}>{line.command && <p className="terminal-command"><span>❯</span> {line.command}</p>}<div className="terminal-answer">{line.output}</div></div>)}
      {busy && <p className="terminal-thinking">Thinking…</p>}
    </div>
    <form className="terminal-input" onSubmit={submit}>
      <span aria-hidden="true">❯</span><label className="sr-only" htmlFor="command">Terminal command</label><input id="command" ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Type /help or /ask a question" maxLength={900} autoComplete="off" spellCheck={false} disabled={busy} onKeyDown={event => {
        if (event.key === "Tab" && input.startsWith("/")) {
          const matches = commands.filter(command => command.startsWith(input));
          if (matches.length === 1) { event.preventDefault(); setInput(matches[0] + (matches[0] === "/ask" ? " " : "")); }
        }
        if (event.key === "ArrowUp") { event.preventDefault(); const index = Math.min(historyIndex + 1, history.length - 1); setHistoryIndex(index); setInput(history[history.length - 1 - index] || ""); }
        if (event.key === "ArrowDown") { event.preventDefault(); const index = Math.max(historyIndex - 1, -1); setHistoryIndex(index); setInput(index < 0 ? "" : history[history.length - 1 - index]); }
      }} /><button type="submit" disabled={busy || !input.trim()} aria-label="Run command">↵</button>
    </form>
    <div className="terminal-footer"><button onClick={() => { setInput("/help"); inputRef.current?.focus(); }}>/help</button><span>{enabled ? "/ask uses AI. Questions go to OpenRouter." : "Local commands ready · AI optional"}</span></div>
  </section>;
}
