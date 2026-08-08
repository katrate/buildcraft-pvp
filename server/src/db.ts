import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

// ------------------------------------------------------------
// Server-side Supabase (service role — never exposed to the client).
// Required: with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set, the WebSocket
// handshake verifies the client's access token and finished matches are
// recorded to the matches ledger. Without them every connection is rejected
// (accounts are mandatory — see server/src/index.ts).
// ------------------------------------------------------------

loadEnv();

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function serviceClient(): SupabaseClient | null {
  if (client) return client;
  if (!supabaseConfigured()) return null;
  client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Verify a client's access token. Returns the authenticated user id, or null. */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  const sb = serviceClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Match ledger — finished matches + per-player results.
// ------------------------------------------------------------

export interface MatchRecordParticipant {
  playerId: string;
  team: number;
  result: 'victory' | 'defeat' | 'draw';
  kills: number;
  coins: number;
  xp: number;
  rankDelta: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Write a finished match into the ledger (no-op when Supabase is unconfigured). */
export async function recordMatchResult(
  mode: string,
  teamSize: number,
  winnerTeam: number,
  participants: MatchRecordParticipant[],
): Promise<void> {
  const sb = serviceClient();
  // Only real account users have FK-valid ids — dev-mode/local ids are skipped.
  const valid = participants.filter((p) => UUID_RE.test(p.playerId));
  if (!sb || valid.length === 0) return;
  try {
    const { data: m, error: mErr } = await sb
      .from('matches')
      .insert({ mode, team_size: teamSize, winner_team: winnerTeam })
      .select('id')
      .single();
    if (mErr || !m) {
      console.warn('[db] match insert failed:', mErr?.message);
      return;
    }
    const { error: pErr } = await sb.from('match_participants').insert(
      valid.map((p) => ({
        match_id: m.id,
        user_id: p.playerId,
        team: p.team,
        result: p.result,
        kills: p.kills,
        coins: p.coins,
        xp: p.xp,
        rank_delta: p.rankDelta,
      })),
    );
    if (pErr) console.warn('[db] participants insert failed:', pErr.message);
  } catch (e) {
    console.warn('[db] recordMatchResult failed:', e instanceof Error ? e.message : e);
  }
}
