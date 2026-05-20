"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "./Badge";
import StatCard from "./StatCard";
import { analyzeSlip } from "@/lib/grading";
import { demoTickets } from "@/lib/demo-data";
import type { BetMarket, BetTicket, TicketType } from "@/lib/types";
import { formatMoney, newId } from "@/lib/utils";

const STORAGE_KEY = "slipsense-tickets-v1";
const BANKROLL_KEY = "slipsense-bankroll-v1";

const markets: { label: string; value: BetMarket }[] = [
  { label: "Moneyline", value: "moneyline" },
  { label: "Spread", value: "spread" },
  { label: "Game total", value: "total" },
  { label: "Player prop", value: "player-prop" },
  { label: "NRFI / YRFI", value: "nrfi-yrfi" },
  { label: "Futures", value: "futures" },
  { label: "Other", value: "other" }
];

const inputClass = "w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400";
const buttonClass = "rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50";
const ghostButtonClass = "rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900";

function emptyTicket(type: TicketType = "single"): BetTicket {
  const id = newId("ticket");
  return {
    id,
    type,
    title: type === "single" ? "New single bet" : "New parlay",
    sportsbook: "Manual entry",
    stake: 10,
    odds: -110,
    createdAt: new Date().toISOString(),
    legs: [
      {
        id: newId("leg"),
        sport: "Baseball",
        league: "MLB",
        event: "",
        market: "moneyline",
        selection: "",
        odds: -110,
        notes: ""
      }
    ]
  };
}

export default function SlipSenseApp() {
  const [tickets, setTickets] = useState<BetTicket[]>(demoTickets);
  const [bankroll, setBankroll] = useState<number>(500);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    try {
      const savedTickets = window.localStorage.getItem(STORAGE_KEY);
      const savedBankroll = window.localStorage.getItem(BANKROLL_KEY);

      if (savedTickets) setTickets(JSON.parse(savedTickets) as BetTicket[]);
      if (savedBankroll) setBankroll(Number(savedBankroll));
    } catch {
      setStorageMessage("Local storage could not be read. The app still works, but this browser may not remember saved slips.");
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
      window.localStorage.setItem(BANKROLL_KEY, String(bankroll));
    } catch {
      setStorageMessage("Local storage could not save this slip. Export the report if you want a backup.");
    }
  }, [tickets, bankroll]);

  const analysis = useMemo(() => analyzeSlip(tickets, bankroll), [tickets, bankroll]);
  const bestTicket = tickets.find((ticket) => ticket.id === analysis.bestTicketId);
  const worstTicket = tickets.find((ticket) => ticket.id === analysis.worstTicketId);

  function loadDemo() {
    setTickets(demoTickets);
    setBankroll(500);
    setImageMessage(null);
  }

  function clearSlip() {
    setTickets([emptyTicket()]);
    setImageMessage(null);
  }

  function addTicket(type: TicketType) {
    setTickets((current) => [...current, emptyTicket(type)]);
  }

  function removeTicket(ticketId: string) {
    setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
  }

  function updateTicket(ticketId: string, patch: Partial<BetTicket>) {
    setTickets((current) => current.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch } : ticket)));
  }

  function addLeg(ticketId: string) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              type: "parlay",
              legs: [
                ...ticket.legs,
                {
                  id: newId("leg"),
                  sport: "Baseball",
                  league: "MLB",
                  event: "",
                  market: "moneyline",
                  selection: "",
                  odds: -110,
                  notes: ""
                }
              ]
            }
          : ticket
      )
    );
  }

  function removeLeg(ticketId: string, legId: string) {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;
        const legs = ticket.legs.filter((leg) => leg.id !== legId);
        return { ...ticket, legs, type: legs.length > 1 ? "parlay" : "single" };
      })
    );
  }

  function updateLeg(ticketId: string, legId: string, field: string, value: string) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              legs: ticket.legs.map((leg) =>
                leg.id === legId
                  ? {
                      ...leg,
                      [field]: field === "odds" ? Number(value) : value
                    }
                  : leg
              )
            }
          : ticket
      )
    );
  }

  async function analyzeImage(file: File | null) {
    if (!file) return;

    setImageLoading(true);
    setImageMessage("Reading screenshot...");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { tickets?: BetTicket[]; message?: string; code?: string };

      if (!response.ok || !payload.tickets) {
        setImageMessage(payload.message ?? "Screenshot extraction failed. Use manual entry for now.");
        return;
      }

      setTickets(payload.tickets);
      setImageMessage("Screenshot extracted. Check every leg before trusting the grade.");
    } catch {
      setImageMessage("Screenshot upload failed. Use manual entry for now.");
    } finally {
      setImageLoading(false);
    }
  }

  function exportReport() {
    const blob = new Blob([JSON.stringify({ tickets, bankroll, analysis }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "slipsense-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35rem)] px-4 py-8 text-slate-100 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 border-b border-slate-800 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge tone="success">Pre-bet risk review</Badge>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">SlipSense</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Upload or build a betting slip and get a sharp-style grade for price, parlay risk, bankroll exposure, and hidden weak legs before you place it.
            </p>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Educational only. This does not place bets, guarantee winners, or replace fresh injury, lineup, weather, and odds research.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className={ghostButtonClass} onClick={loadDemo}>Load demo slip</button>
            <button className={ghostButtonClass} onClick={clearSlip}>Clear</button>
            <button className={buttonClass} onClick={exportReport}>Export report</button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Slip grade" value={analysis.grade} detail={`${analysis.score}/100 score`} />
          <StatCard label="Total risk" value={formatMoney(analysis.totalRisk)} detail="Total amount staked" />
          <StatCard label="Potential profit" value={formatMoney(analysis.potentialProfit)} detail="If every ticket hits" />
          <StatCard label="Total return" value={formatMoney(analysis.totalReturn)} detail="Stake plus profit" />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.4fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-glow">
              <h2 className="text-xl font-black text-white">Slip command center</h2>
              <p className="mt-2 text-sm text-slate-400">{analysis.summary}</p>

              <label className="mt-6 block text-sm font-bold text-slate-300">Bankroll for risk check</label>
              <input
                className={`${inputClass} mt-2`}
                type="number"
                min="0"
                value={bankroll}
                onChange={(event) => setBankroll(Number(event.target.value))}
              />

              <div className="mt-6 grid gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="font-bold text-emerald-200">Best ticket</p>
                  <p className="mt-1 text-slate-300">{bestTicket?.title ?? "Add a valid ticket"}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="font-bold text-rose-200">Weakest ticket</p>
                  <p className="mt-1 text-slate-300">{worstTicket?.title ?? "Add a valid ticket"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {analysis.flags.map((flag) => (
                  <div key={`${flag.label}-${flag.detail}`} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <Badge tone={flag.severity}>{flag.label}</Badge>
                    <p className="mt-3 text-sm text-slate-300">{flag.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
              <h2 className="text-xl font-black text-white">Screenshot upload</h2>
              <p className="mt-2 text-sm text-slate-400">Works only if an OpenAI API key is configured. Manual entry and demo mode always work.</p>
              <input
                className="mt-5 block w-full rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-300"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={imageLoading}
                onChange={(event) => void analyzeImage(event.target.files?.[0] ?? null)}
              />
              {imageMessage ? <p className="mt-3 text-sm text-slate-400">{imageMessage}</p> : null}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <button className={buttonClass} onClick={() => addTicket("single")}>Add single</button>
              <button className={buttonClass} onClick={() => addTicket("parlay")}>Add parlay</button>
            </div>

            {storageMessage ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">{storageMessage}</div>
            ) : null}

            {tickets.map((ticket) => {
              const ticketAnalysis = analysis.ticketAnalyses.find((item) => item.ticketId === ticket.id);
              return (
                <article key={ticket.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-glow">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge tone={ticket.type === "parlay" ? "warning" : "success"}>{ticket.type}</Badge>
                        {ticketAnalysis ? <Badge tone="info">Grade {ticketAnalysis.grade}</Badge> : null}
                        {ticketAnalysis ? <Badge tone="info">{ticketAnalysis.breakEvenLabel}</Badge> : null}
                      </div>
                      <input
                        className="mt-4 w-full bg-transparent text-2xl font-black text-white outline-none"
                        value={ticket.title}
                        onChange={(event) => updateTicket(ticket.id, { title: event.target.value })}
                      />
                    </div>
                    <button className={ghostButtonClass} onClick={() => removeTicket(ticket.id)}>Remove</button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <label className="text-sm font-bold text-slate-300">
                      Type
                      <select
                        className={`${inputClass} mt-2`}
                        value={ticket.type}
                        onChange={(event) => updateTicket(ticket.id, { type: event.target.value as TicketType })}
                      >
                        <option value="single">Single</option>
                        <option value="parlay">Parlay</option>
                      </select>
                    </label>
                    <label className="text-sm font-bold text-slate-300">
                      Sportsbook
                      <input className={`${inputClass} mt-2`} value={ticket.sportsbook ?? ""} onChange={(event) => updateTicket(ticket.id, { sportsbook: event.target.value })} />
                    </label>
                    <label className="text-sm font-bold text-slate-300">
                      Stake
                      <input className={`${inputClass} mt-2`} type="number" value={ticket.stake} onChange={(event) => updateTicket(ticket.id, { stake: Number(event.target.value) })} />
                    </label>
                    <label className="text-sm font-bold text-slate-300">
                      Ticket odds
                      <input className={`${inputClass} mt-2`} type="number" value={ticket.odds} onChange={(event) => updateTicket(ticket.id, { odds: Number(event.target.value) })} />
                    </label>
                  </div>

                  {ticketAnalysis ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <StatCard label="Ticket score" value={`${ticketAnalysis.score}/100`} detail={`Grade ${ticketAnalysis.grade}`} />
                      <StatCard label="Profit" value={formatMoney(ticketAnalysis.potentialProfit)} detail="Potential ticket profit" />
                      <StatCard label="Return" value={formatMoney(ticketAnalysis.totalReturn)} detail="Stake plus profit" />
                    </div>
                  ) : null}

                  <div className="mt-6 space-y-4">
                    {ticket.legs.map((leg, index) => {
                      const legAnalysis = ticketAnalysis?.legAnalyses.find((item) => item.legId === leg.id);
                      return (
                        <div key={leg.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="info">Leg {index + 1}</Badge>
                              {legAnalysis ? <Badge tone="success">{legAnalysis.grade}</Badge> : null}
                            </div>
                            <button className="text-sm font-bold text-slate-400 hover:text-white" onClick={() => removeLeg(ticket.id, leg.id)}>Remove leg</button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <input className={inputClass} placeholder="Event, ex: BAL vs TB" value={leg.event} onChange={(event) => updateLeg(ticket.id, leg.id, "event", event.target.value)} />
                            <input className={inputClass} placeholder="Selection, ex: TB moneyline" value={leg.selection} onChange={(event) => updateLeg(ticket.id, leg.id, "selection", event.target.value)} />
                            <select className={inputClass} value={leg.market} onChange={(event) => updateLeg(ticket.id, leg.id, "market", event.target.value)}>
                              {markets.map((market) => <option key={market.value} value={market.value}>{market.label}</option>)}
                            </select>
                            <input className={inputClass} type="number" placeholder="Leg odds" value={leg.odds ?? ""} onChange={(event) => updateLeg(ticket.id, leg.id, "odds", event.target.value)} />
                            <input className={inputClass} placeholder="League" value={leg.league} onChange={(event) => updateLeg(ticket.id, leg.id, "league", event.target.value)} />
                            <input className={inputClass} placeholder="Notes" value={leg.notes ?? ""} onChange={(event) => updateLeg(ticket.id, leg.id, "notes", event.target.value)} />
                          </div>

                          {legAnalysis ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                                <p className="font-black text-emerald-200">What I like</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                                  {legAnalysis.likes.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                              </div>
                              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4">
                                <p className="font-black text-rose-200">What I do not like</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                                  {legAnalysis.dislikes.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <button className={`${ghostButtonClass} mt-5`} onClick={() => addLeg(ticket.id)}>Add leg</button>

                  {ticketAnalysis?.flags.length ? (
                    <div className="mt-5 space-y-3">
                      {ticketAnalysis.flags.map((flag) => (
                        <div key={`${flag.label}-${flag.detail}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                          <Badge tone={flag.severity}>{flag.label}</Badge>
                          <p className="mt-3 text-sm text-slate-300">{flag.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        </section>
      </section>
    </main>
  );
}
