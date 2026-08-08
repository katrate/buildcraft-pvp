// ============================================================
// Shared types for BuildCraft PvP
// Used by: client UI, server authority, combat engine, game data
// ============================================================

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export type StatId = 'maxHp' | 'attack' | 'defense' | 'initiative';

export type SlotId =
  | 'core'
  | 'active1'
  | 'active2'
  | 'passive1'
  | 'passive2'
  | 'weapon'
  | 'armor'
  | 'utility'
  | 'ultimate'
  | 'potion1'
  | 'potion2'
  | 'potion3';

export interface SlotDef {
  id: SlotId;
  label: string;
  accepts: 'power' | 'gear' | 'potion';
  description: string;
}

// ------------------------------------------------------------
// Items (data-driven content)
// ------------------------------------------------------------

export type PowerKind = 'core' | 'active' | 'passive' | 'ultimate';

export type TargetRule =
  | 'enemy'
  | 'ally'
  | 'self'
  | 'all-enemies'
  | 'all-allies'
  | 'none';

export type DamageType = 'physical' | 'fire' | 'poison' | 'lightning' | 'holy';

export interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'power';
  powerKind: PowerKind;
  slot: SlotId;
  price: number;
  rarity: Rarity;
  uses?: number; // how many times the ability can be used per match; undefined = unlimited
  attack?: number; // base damage — added to the caster's Attack stat when used
  healAmount?: number; // flat heal to target
  targetRule: TargetRule;
  effects?: EffectSpec[]; // applied to target(s)
  selfEffects?: EffectSpec[]; // applied to caster
  statBonus?: Partial<Record<StatId, number>>; // passive stat contribution (cores/passives)
  lifesteal?: number; // fraction of damage dealt returned as heal (0..1)
  resetUses?: boolean; // e.g. Overclock: restore all ability uses
  damageType?: DamageType;
  aiPriority?: number; // bots prefer higher-priority usable actives
}

export interface GearDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'gear';
  slot: SlotId;
  price: number;
  rarity: Rarity;
  stats: Partial<Record<StatId, number>>;
  effects?: EffectSpec[]; // applied to owner at match start (e.g. Reactive Shield)
  bonusAbilityUses?: number; // extra uses for every equipped active power
}

// ------------------------------------------------------------
// Potions — consumables carried in the build's potion bag.
// Used during YOUR turn as a FREE action (max one potion per turn,
// and only before you take your real action). They never end the turn.
// ------------------------------------------------------------
export interface PotionDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'potion';
  price: number;
  rarity: Rarity;
  uses: number; // how many times this potion can be drunk per match
  healAmount?: number; // flat self-heal
  effects?: EffectSpec[]; // applied to self when drunk (shield / buffs / regen)
  ultimateCharge?: number; // ultimate charge granted when drunk
}

export type ItemDefinition = PowerDefinition | GearDefinition | PotionDefinition;

// ------------------------------------------------------------
// Effects / status framework (generic, data-driven)
// ------------------------------------------------------------

export type EffectKind =
  | 'shield' // absorbs damage
  | 'poison' // DoT per turn
  | 'burn' // DoT per turn (fire)
  | 'regen' // heal per turn
  | 'attack_up'
  | 'attack_down'
  | 'defense_up'
  | 'defense_down'
  | 'slow' // -initiative% (negative amount = debuff)
  | 'haste' // +initiative%
  | 'stun' // skip next turn
  | 'counter' // retaliate when attacked
  | 'thorns'; // attacker takes damage

export interface EffectSpec {
  kind: EffectKind;
  amount: number; // magnitude: DoT/regen per round, shield absorb, % for buffs/debuffs (0.4 = 40%)
  duration: number; // rounds; 0 = permanent (buffs/DoTs still tick rounds)
}

export interface StatusInstance extends EffectSpec {
  uid: string;
  sourceId: string; // combatant id that applied it
  displayName: string;
  icon: string;
}

// ------------------------------------------------------------
// Presets (player builds)
// ------------------------------------------------------------

export interface Preset {
  id: string;
  name: string;
  slots: Partial<Record<SlotId, string | null>>; // slot id -> power/gear id (null = empty)
  createdAt: number;
}

// ------------------------------------------------------------
// Stats & combatants
// ------------------------------------------------------------

export interface BuildStats {
  maxHp: number;
  attack: number;
  defense: number;
  initiative: number;
}

export interface CombatBuild {
  stats: BuildStats;
  actives: PowerDefinition[];
  passives: PowerDefinition[];
  core: PowerDefinition | null;
  ultimate: PowerDefinition | null;
  startingEffects: EffectSpec[];
  bonusAbilityUses: number; // gear bonus applied to every active power's per-match uses
  potions: PotionDefinition[]; // the build's potion bag (consumed during turns)
}

export interface Combatant {
  id: string;
  playerId: string | null; // null for bots
  name: string;
  teamId: number;
  isBot: boolean;
  isPlayerControlled: boolean;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  initiative: number;
  alive: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  potionsUsed: number;
  ultimatesUsed: number;
  /** damage each combatant dealt to each target id — feeds kill assists */
  damageByTarget: Record<string, number>;
  usesLeft: Record<string, number>; // powerId -> uses remaining this match
  potionsLeft: Record<string, number>; // potionId -> uses remaining this match
  potionUsedThisTurn: boolean; // max 1 free potion per turn, before acting
  effects: StatusInstance[];
  ultimate: { id: string; charge: number } | null;
  build: CombatBuild | null; // snapshot for UI (powers list)
}

// ------------------------------------------------------------
// Post-match combat summary
// ------------------------------------------------------------

// One row of the post-match stats screen. Sent with `match_end` so BOTH
// teams can see every combatant's final performance — KDA, damage dealt /
// taken, healing, potions & ultimates used, and the MVP ranking score.
export interface CombatStats {
  combatantId: string;
  playerId: string | null; // null for bots
  name: string;
  teamId: number;
  isBot: boolean;
  alive: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  potionsUsed: number;
  ultimatesUsed: number;
  score: number; // MVP ranking score (see engine/combat.ts combatScore)
}

export interface LogEntry {
  round: number;
  text: string;
  seq: number;
}

export type MatchMode = 'practice' | 'unranked' | 'ranked' | 'custom';

export type MatchPhase =
  | 'WAITING'
  | 'MATCH_START'
  | 'ROUND_START'
  | 'TURN_START'
  | 'PLAYER_ACTION'
  | 'RESOLVE_ACTION'
  | 'CHECK_DEATH'
  | 'CHECK_WIN'
  | 'NEXT_TURN'
  | 'ROUND_END'
  | 'MATCH_END';

export interface MatchState {
  id: string;
  mode: MatchMode;
  phase: MatchPhase;
  round: number;
  turnOrder: string[]; // combatant ids in acting order
  turnIndex: number; // index into turnOrder
  combatants: Record<string, Combatant>;
  teamCount: number;
  log: LogEntry[];
  logSeq: number;
  winnerTeam: number | null;
  currentCombatantId: string | null;
  lastEvent?: MatchEvent;
}

export type MatchEvent =
  | { type: 'turn'; text: string }
  | { type: 'action'; text: string }
  | { type: 'damage'; text: string }
  | { type: 'effect'; text: string }
  | { type: 'death'; text: string }
  | { type: 'win'; text: string }
  | { type: 'round'; text: string };

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

export type PlayerAction =
  | { type: 'USE_ABILITY'; powerId: string; targetId?: string }
  | { type: 'BASIC_ATTACK'; targetId: string }
  | { type: 'USE_POTION'; potionId: string } // free action — does not end the turn (max 1 per turn)
  | { type: 'END_TURN' };

// ------------------------------------------------------------
// Match result & rewards
// ------------------------------------------------------------

export type PlayerResult = 'victory' | 'defeat' | 'draw';

export interface RewardBreakdown {
  baseXp: number;
  baseCoins: number;
  killXp: number;
  killCoins: number;
  roundXp: number;
  roundCoins: number;
  kills: number;
}

export interface MatchRewards {
  result: PlayerResult;
  xp: number;
  coins: number;
  roundsSurvived: number;
  breakdown?: RewardBreakdown; // how the totals were computed (display only)
}

// ------------------------------------------------------------
// Networking (client <-> server)
// ------------------------------------------------------------

// Ranked stat upgrades — apply ONLY in ranked matches. HP deliberately has
// NO ranked modifier: it starts at the 200 base and only rises from gear/powers.
export type RankedUpgrades = {
  attack: number;
  defense: number;
};

// Ranked formats each run their OWN ladder — a separate rating, rank band,
// games counter, and their own coin-bought stat-upgrade pool (each capped by
// that format's rank). 1v1 rank and 5v5 rank never mix.
export type RankedFormat = '1v1' | '5v5';

export type PvpMode = 'unranked' | 'ranked';

export interface QueueRequest {
  type: 'join_queue';
  playerId: string;
  name: string;
  teamSize: 1 | 2 | 5;
  mode: PvpMode;
  preset: Preset;
  initiativeUpgrade?: number; // coin-bought initiative levels (not normalized in unranked)
  rankedUpgrades?: RankedUpgrades; // ranked-only stat upgrades
  rating?: number; // ELO rating used by the server to compute rank deltas
  partyId?: string; // queue the WHOLE party together (see PartyManager)
}

// ------------------------------------------------------------
// Parties & friends
// ------------------------------------------------------------

// What a client submits for itself when creating/joining a party, so the
// server can queue the whole party without asking each member again.
export interface PartySetup {
  preset: Preset;
  initiativeUpgrade?: number;
  rankedUpgrades?: RankedUpgrades;
  rating?: number;
}

export interface PartyMemberInfo {
  playerId: string;
  name: string;
  isLeader: boolean;
  /** Ready-check state — everyone must be ready before the leader can queue (default true). */
  ready: boolean;
}

export interface PartyInfo {
  partyId: string;
  leaderId: string;
  members: PartyMemberInfo[];
}

export interface Friend {
  playerId: string;
  name: string;
}

export type ClientMessage =
  | QueueRequest
  | { type: 'leave_queue'; playerId: string; partyId?: string }
  | { type: 'player_action'; matchId: string; playerId: string; action: PlayerAction }
  | { type: 'rejoin'; playerId: string }
  // Surrender: ends the match. In team matches every REAL player on the team
  // must vote before the surrender goes through (bots never count).
  | { type: 'surrender'; playerId: string }
  // The muted player clicked back in — their turns stop being skipped.
  | { type: 'afk_return'; playerId: string }
  // Which of these friend ids are currently online (drives the friend list's
  // online/offline dots). Server answers with presence_result.
  | { type: 'presence_query'; playerId: string; ids: string[] }
  // presence & party flow. With Supabase accounts, `hello` carries the
  // access token so the server can bind the socket to the verified user id
  // (it overrides playerId when valid).
  | { type: 'hello'; playerId: string; name: string; accessToken?: string }
  | ({ type: 'create_party'; playerId: string } & PartySetup)
  | ({ type: 'party_invite'; playerId: string; targetName?: string; targetPlayerId?: string })
  | ({ type: 'party_accept'; playerId: string; partyId: string } & PartySetup)
  | { type: 'party_decline'; playerId: string; partyId: string }
  | { type: 'party_leave'; playerId: string; partyId: string }
  | { type: 'party_kick'; playerId: string; partyId: string; targetId: string }
  | ({ type: 'party_setup'; playerId: string; partyId: string } & PartySetup)
  | { type: 'party_set_ready'; playerId: string; partyId: string; ready: boolean }
  | { type: 'player_lookup'; name: string }
  // custom match lobbies
  | ({ type: 'custom_create'; playerId: string } & PartySetup)
  | { type: 'custom_invite'; playerId: string; targetName?: string; targetPlayerId?: string }
  | ({ type: 'custom_accept'; playerId: string; lobbyId: string } & PartySetup)
  | { type: 'custom_decline'; playerId: string; lobbyId: string }
  | { type: 'custom_leave'; playerId: string; lobbyId: string }
  | { type: 'custom_kick'; playerId: string; lobbyId: string; targetId: string }
  | { type: 'custom_team'; playerId: string; lobbyId: string; targetId: string; team: 0 | 1 }
  | { type: 'custom_norm'; playerId: string; lobbyId: string; norm: CustomNorm }
  | { type: 'custom_start'; playerId: string; lobbyId: string }
  | ({ type: 'custom_setup'; playerId: string; lobbyId: string } & PartySetup);

export type ServerMessage =
  | { type: 'welcome'; serverTime: number; ping: number }
  | { type: 'queue_update'; queued: number; teamSize: 1 | 2 | 5; mode: PvpMode; minPlayers: number; queuedSince?: number } // oldest queued player's join time (ms epoch) — drives the client's wait timer
  | { type: 'queue_left'; reason?: string } // you were pulled out of the queue (e.g. party broken up)
  | { type: 'match_found'; matchId: string; mode: 'unranked' | 'ranked' | 'custom'; teamSize: 1 | 2 | 5; countdownMs: number; teamA?: number; teamB?: number } // match formed — starts after the countdown
  // Server-driven match meta (turn clock, surrender votes, AFK flags and
  // transient notices) — attached to match_start and every match_state.
  | {
      type: 'match_start';
      match: MatchState;
      yourCombatantIds: string[];
      yourTeam: number;
      turnDeadline?: number | null; // ms epoch when the current turn times out (null = no active timer)
      surrenderVotes?: Record<number, number>; // teamId -> votes cast by real players
      afk?: Record<string, boolean>; // combatantId -> muted (AFK, turns skipped until they return)
      notice?: { combatantId: string; text: string } | null; // transient skip/AFK notice
    }
  | {
      type: 'match_state';
      match: MatchState;
      turnDeadline?: number | null;
      surrenderVotes?: Record<number, number>;
      afk?: Record<string, boolean>;
      notice?: { combatantId: string; text: string } | null;
    }
  | { type: 'rejoin_result'; active: boolean } // you asked to rejoin and there was no active match
  | { type: 'presence_result'; online: string[] } // friend ids currently connected (subset of a presence_query)
  | {
      type: 'match_end';
      matchId: string;
      winnerTeam: number;
      rewards: MatchRewards;
      result: PlayerResult;
      mode: MatchMode;
      yourTeam: number; // the receiving player's team — drives the stats screen layout
      teamSize: 1 | 2 | 5; // which format the match was (drives which ladder a ranked delta lands on)
      rankDelta?: number; // ranked only: +1 win / -1 loss / 0 draw
      stats: CombatStats[]; // full post-match leaderboard (both teams)
    }
  | { type: 'error'; message: string }
  // party & presence
  | { type: 'party_update'; party: PartyInfo }
  | { type: 'party_disbanded'; partyId: string }
  | { type: 'party_invite'; partyId: string; fromId: string; fromName: string }
  | { type: 'player_lookup_result'; name: string; playerId: string; online: boolean }
  // custom match lobbies
  | { type: 'custom_update'; lobby: CustomLobbyInfo }
  | { type: 'custom_disbanded'; lobbyId: string }
  | { type: 'custom_invite'; lobbyId: string; fromId: string; fromName: string };

// The per-member setup a custom lobby stores (build/upgrades), so the leader
// can start a match without asking everyone again.
export interface CustomMemberData extends CustomMemberInfo {
  setup: PartySetup;
}

// The party setup a member must have before the leader can queue. Every
// member submits one via create/accept/setup; the server stores them.
export interface PartyMemberData extends PartyMemberInfo {
  setup: PartySetup;
}

// ------------------------------------------------------------
// Custom matches (friend lobbies)
// ------------------------------------------------------------

// How custom-match stats are normalized. `standard` = unranked normalization;
// a rank name normalizes everyone to that rank's stat budget (ranked-upgrade
// ceiling applied to the normalized base) so a Bronze lobby and a Diamond
// lobby play at different power levels, but everyone in the same lobby is equal.
export type CustomNorm =
  | 'standard'
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'divine'
  | 'supreme';

export interface CustomMemberInfo {
  playerId: string;
  name: string;
  isLeader: boolean;
  team: 0 | 1;
}

export interface CustomLobbyInfo {
  lobbyId: string;
  leaderId: string;
  norm: CustomNorm;
  members: CustomMemberInfo[];
}

// ------------------------------------------------------------
// Persistence (browser-local V1)
// ------------------------------------------------------------

export interface PlayerRank {
  rating: number; // ELO-style rating (starts 1000); rank band is derived from it
  games: number; // ranked matches played (for K-factor / new-player weighting later)
}

export interface PlayerRecord {
  wins: number;
  losses: number;
  matches: number;
}

export interface PlayerState {
  playerId: string;
  name: string;
  level: number;
  xp: number; // xp accumulated toward next level
  coins: number;
  inventory: { powers: string[]; gear: string[]; potions: string[] };
  presets: Preset[];
  activePresetId: string;
  record: PlayerRecord;
  initiativeUpgrade: number; // coin-bought initiative levels (applies everywhere, not normalized in unranked)
  // Ranked ladders are per-format: 1v1 and 5v5 each have their own rating,
  // rank band, games, and their own coin-bought stat-upgrade pool (each pool
  // is capped by that format's rank). Upgrades apply ONLY in ranked matches.
  ranks: Record<RankedFormat, PlayerRank>;
  rankedUpgrades: Record<RankedFormat, RankedUpgrades>;
  friends: Friend[]; // friend list (Supabase-driven when accounts are enabled)
}
