import type { BetTicket } from "./types";

export const demoTickets: BetTicket[] = [
  {
    id: "ticket_rays_ml",
    type: "single",
    title: "Tampa Bay moneyline",
    sportsbook: "DemoBook",
    stake: 11,
    odds: -110,
    createdAt: new Date().toISOString(),
    legs: [
      {
        id: "leg_rays_ml",
        sport: "Baseball",
        league: "MLB",
        event: "BAL vs TB",
        market: "moneyline",
        selection: "TB moneyline",
        odds: -110,
        notes: "Straight moneyline with a fair price."
      }
    ]
  },
  {
    id: "ticket_nrfi_parlay",
    type: "parlay",
    title: "3-leg NRFI parlay",
    sportsbook: "DemoBook",
    stake: 5,
    odds: 388,
    createdAt: new Date().toISOString(),
    legs: [
      {
        id: "leg_atl_mia_nrfi",
        sport: "Baseball",
        league: "MLB",
        event: "ATL vs MIA",
        market: "nrfi-yrfi",
        selection: "Under 0.5 first inning total",
        odds: -144,
        notes: "NRFI leg one."
      },
      {
        id: "leg_tor_nyy_nrfi",
        sport: "Baseball",
        league: "MLB",
        event: "TOR vs NYY",
        market: "nrfi-yrfi",
        selection: "Under 0.5 first inning total",
        odds: -128,
        notes: "NRFI leg two."
      },
      {
        id: "leg_mil_chi_nrfi",
        sport: "Baseball",
        league: "MLB",
        event: "MIL vs CHI",
        market: "nrfi-yrfi",
        selection: "Under 0.5 first inning total",
        odds: -162,
        notes: "NRFI leg three."
      }
    ]
  },
  {
    id: "ticket_pitcher_outs",
    type: "single",
    title: "Pitcher outs prop",
    sportsbook: "DemoBook",
    stake: 15,
    odds: -151,
    createdAt: new Date().toISOString(),
    legs: [
      {
        id: "leg_pitcher_outs",
        sport: "Baseball",
        league: "MLB",
        event: "HOU vs MIN",
        market: "player-prop",
        selection: "Joe Ryan over 17.5 outs",
        odds: -151,
        notes: "Over 17.5 outs means he must finish 6 full innings."
      }
    ]
  }
];
