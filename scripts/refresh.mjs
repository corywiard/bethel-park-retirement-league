// Pulls this season's data from the private ESPN league and writes cur.json.
// Needs ESPN_S2 and ESPN_SWID (login cookies) in the environment.
import { writeFileSync } from "node:fs";

const SEASON = 2026, LEAGUE = 1809852803;
const { ESPN_S2, ESPN_SWID } = process.env;
if (!ESPN_S2 || !ESPN_SWID) throw new Error("Missing ESPN_S2 or ESPN_SWID secret");

const API = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}`;
const B = `${API}/segments/0/leagues/${LEAGUE}`;
const cookie = `espn_s2=${ESPN_S2}; SWID=${ESPN_SWID}`;
async function get(url, extra = {}) {
  const r = await fetch(url, { headers: { Cookie: cookie, Accept: "application/json", ...extra } });
  if (!r.ok) throw new Error(`ESPN returned ${r.status} for ${url.replace(B, "")} — the ESPN cookies may have expired`);
  return r.json();
}
const g = q => get(B + q);

const meta = await g("?view=mTeam&view=mStatus&view=mSettings");
const wk = meta.status.currentMatchupPeriod;
const s = await g(`?view=mMatchupScore&view=mScoreboard&scoringPeriodId=${meta.status.latestScoringPeriod}`);
const r = await g("?view=mRoster");
const SL = { 0: "QB", 2: "RB", 4: "WR", 6: "TE", 16: "D/ST", 17: "K", 20: "BE", 21: "IR", 23: "FLEX" };
const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" };
const mem = Object.fromEntries(meta.members.map(m => [m.id, ((m.firstName || "") + " " + (m.lastName || "")).trim().replace(/\s+/g, " ")]));
const n = (x, d = 2) => x == null ? null : +(+x).toFixed(d);
const teams = meta.teams.map(t => { const o = t.record.overall, d = t.record.division || {}; return [t.id, (t.name || ((t.location || "") + " " + (t.nickname || ""))).trim(), t.abbrev, [...new Set((t.owners || []).map(x => mem[x]))].join(" & "), o.wins, o.losses, n(o.pointsFor), n(o.pointsAgainst), t.playoffSeed, t.divisionId, d.wins || 0, d.losses || 0]; });
const sched = s.schedule.filter(m => m.home && m.away).map(m => [m.matchupPeriodId, m.home.teamId, n(m.home.totalPoints ?? 0), m.away.teamId, n(m.away.totalPoints ?? 0), m.winner, m.playoffTierType, n(m.home.totalPointsLive), n(m.away.totalPointsLive), n(m.home.totalProjectedPointsLive, 1), n(m.away.totalProjectedPointsLive, 1)]);
const rost = Object.fromEntries(r.teams.map(t => [t.id, t.roster.entries.map(e => [SL[e.lineupSlotId] ?? String(e.lineupSlotId), e.playerPoolEntry.player.fullName, POS[e.playerPoolEntry.player.defaultPositionId] ?? "", e.playerPoolEntry.player.proTeamId])]));
const asOf = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET";

const cf = { topics: { filterType: { value: ["ACTIVITY_TRANSACTIONS"] }, limit: 1000, limitPerMessageSet: { value: 25 }, offset: 0, sortMessageDate: { sortPriority: 1, sortAsc: false }, sortFor: { sortPriority: 2, sortAsc: false }, filterIncludeMessageTypeIds: { value: [178, 180, 179, 239, 181, 244] } } };
const topics = (await get(`${B}/communication/?view=kona_league_communication`, { "x-fantasy-filter": JSON.stringify(cf) })).topics || [];
const pl = await get(`${API}/players?view=players_wl`, { "x-fantasy-filter": JSON.stringify({ filterActive: null }), "x-fantasy-platform": "kona-PROD" });
const nm = Object.fromEntries(pl.map(p => [p.id, p.fullName]));
const KT = { 178: "A", 180: "W", 179: "D", 181: "D", 239: "D" };
const tx = topics.map(t => [Math.round(t.date / 60000), t.messages.filter(m => m.messageTypeId in KT || m.messageTypeId === 244).map(m => m.messageTypeId === 244 ? ["T", nm[m.targetId] || "", m.from, m.to] : [KT[m.messageTypeId], nm[m.targetId] || "", m.to]).filter(x => !(x[0] === "D" && !(x[2] > 0)))]).filter(t => t[1].length);

if (teams.length !== 10 || !sched.length) throw new Error(`Unexpected data from ESPN: ${teams.length} teams, ${sched.length} games`);
writeFileSync("cur.json", JSON.stringify({ asOf, week: wk, teams, sched, rost, tx }));
console.log(`Week ${wk}: ${teams.length} teams, ${sched.length} games, ${tx.length} moves. Updated ${asOf}.`);
