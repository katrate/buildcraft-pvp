import { useState } from 'react';
import {
  usePlayer,
  getActivePreset,
  newPreset,
  deletePreset,
  setActivePreset,
  savePreset,
  equipSlot,
  upgradeInitiative,
  initiativeUpgradeCostNext,
  upgradeRanked,
  rankedUpgradeCostNext,
} from '../state/store';
import { SLOTS, STAT_LABELS, STAT_IDS, INITIATIVE_UPGRADE, RANKED_UPGRADE, RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { computeStats, rankedUpgradeCeiling } from '../../../shared/src/engine/stats';
import { normalizeUnranked } from '../../../shared/src/engine/normalize';
import { isRankedUnlocked, maxRankedUpgradeFor, rankForRating, rankStatusText } from '../../../shared/src/progression';
import { tierForRating } from '../../../shared/src/rating';
import { getPower } from '../../../shared/src/game-data/powers';
import { getGear } from '../../../shared/src/game-data/gear';
import { ItemPicker } from '../components/ItemPicker';
import { StatBar } from '../components/StatBar';
import { itemIcon } from '../components/ItemCard';
import { BackButton } from '../components/BackButton';
import type { RankedFormat, RankedUpgrades, SlotId, StatId } from '../../../shared/src/types';
import {
  BuildLayout,
  Button,
  Chip,
  Col,
  Divider,
  EmptyState,
  Grow,
  Input,
  ItemIcon,
  Kicker,
  Panel,
  PanelTitle,
  P,
  PresetTab,
  Row,
  Screen,
  ScreenHead,
  ScreenTitle,
  SlotCard,
  SlotEmpty,
  SlotGrid,
  SlotLabel,
  SlotItem,
  StatBlock,
  Tiny,
  TwoCol,
  UpgradeRow,
} from '../ui/glass';

const DISPLAY_MAX: Record<string, number> = {
  maxHp: 320,
  attack: 45,
  defense: 25,
  initiative: 30,
};

const STAT_COLORS: Record<string, string> = {
  maxHp: 'var(--good)',
  attack: 'var(--bad)',
  defense: 'var(--rare)',
  initiative: 'var(--accent-2)',
};

export function Build(props: { onBack: () => void }) {
  const player = usePlayer();
  const preset = getActivePreset();
  const [pickingSlot, setPickingSlot] = useState<SlotId | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(preset.name);
  // The 1v1 and 5v5 ranked ladders are independent — this toggle picks which
  // ladder's upgrades + rank ceiling the ranked preview and upgrade panel show.
  const [rankedFormat, setRankedFormat] = useState<RankedFormat>('5v5');

  const build = computeStats(preset);
  const normalized = normalizeUnranked(build.stats);
  const rankedUnlocked = isRankedUnlocked(player.level);
  const rank = rankForRating(player.ranks[rankedFormat].rating);
  const ceiling = rankedUpgradeCeiling(tierForRating(player.ranks[rankedFormat].rating));

  // Unranked = normalized base + (non-normalized) initiative upgrade.
  const unrankedStats = { ...normalized, initiative: normalized.initiative + player.initiativeUpgrade };
  // Ranked = full build + the selected ladder's ranked upgrades + initiative
  // upgrade. HP has no ranked modifier — it stays at 200 base + build bonuses.
  const rankedStats = {
    maxHp: build.stats.maxHp,
    attack: build.stats.attack + (player.rankedUpgrades[rankedFormat].attack ?? 0) * (RANKED_UPGRADE.gains.attack ?? 0),
    defense: build.stats.defense + (player.rankedUpgrades[rankedFormat].defense ?? 0) * (RANKED_UPGRADE.gains.defense ?? 0),
    initiative: build.stats.initiative + player.initiativeUpgrade,
  };

  const rankedRows: { stat: keyof RankedUpgrades; label: string; icon: string }[] = [
    { stat: 'attack', label: RANKED_UPGRADE.labels.attack, icon: '⚔' },
    { stat: 'defense', label: RANKED_UPGRADE.labels.defense, icon: '🛡' },
  ];

  function rename(): void {
    if (!nameDraft.trim()) return;
    savePreset({ ...preset, name: nameDraft.trim().slice(0, 24) });
    setRenaming(false);
  }

  return (
    <Screen>
      <ScreenHead>
        <div>
          <Kicker>Loadout · {preset.name}</Kicker>
          <ScreenTitle>Build Editor</ScreenTitle>
        </div>
        <BackButton onBack={props.onBack} />
      </ScreenHead>

      <BuildLayout>
        {/* Presets */}
        <Panel>
          <PanelTitle>Power Presets</PanelTitle>
          <Col>
            {player.presets.map((p) => (
              <Row key={p.id} gap={6}>
                <PresetTab active={p.id === preset.id} onClick={() => setActivePreset(p.id)}>
                  {p.name}
                  <Tiny style={{ display: 'block' }}>
                    {Object.values(p.slots).filter(Boolean).length} items
                  </Tiny>
                </PresetTab>
              </Row>
            ))}
            <Button
              onClick={() => {
                const p = newPreset(`Build ${player.presets.length + 1}`);
                setNameDraft(p.name);
              }}
            >
              + New preset
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRenaming((r) => !r);
                setNameDraft(preset.name);
              }}
            >
              ✏ Rename
            </Button>
            {renaming && (
              <Row gap={6}>
                <Input
                  value={nameDraft}
                  maxLength={24}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && rename()}
                />
                <Button variant="primary" onClick={rename}>Save</Button>
              </Row>
            )}
            <Button
              variant="danger"
              disabled={player.presets.length <= 1}
              onClick={() => deletePreset(preset.id)}
            >
              Delete preset
            </Button>
          </Col>
        </Panel>

        {/* Slots — loadout grid */}
        <Panel>
          <PanelTitle>{preset.name} — click a slot to equip</PanelTitle>
          <SlotGrid>
            {SLOTS.map((slot, i) => {
              // Group label on transitions: powers -> gear -> ultimate
              const prev = i > 0 ? SLOTS[i - 1].accepts : null;
              const group =
                i === 0
                  ? 'Abilities'
                  : slot.accepts !== prev
                    ? slot.id === 'ultimate'
                      ? 'Ultimate'
                      : 'Gear'
                    : null;
              const itemId = preset.slots[slot.id] ?? null;
              const item = slot.accepts === 'power' ? getPower(itemId) : getGear(itemId);
              return (
                <div key={slot.id} style={{ display: 'contents' }}>
                  {group && (
                    <Kicker style={{ gridColumn: '1 / -1', marginTop: i === 0 ? 0 : 10 }}>
                      {group}
                    </Kicker>
                  )}
                  <SlotCard onClick={() => setPickingSlot(slot.id)}>
                    <ItemIcon size={36}>
                      {item ? itemIcon(item) : slot.accepts === 'gear' ? '🎒' : '✦'}
                    </ItemIcon>
                    <Grow>
                      <SlotLabel>{slot.label}</SlotLabel>
                      {item ? (
                        <SlotItem>{item.name}</SlotItem>
                      ) : (
                        <SlotEmpty>Empty — {slot.description}</SlotEmpty>
                      )}
                    </Grow>
                    <Tiny
                      style={
                        item && item.kind === 'gear' && item.slot !== slot.id
                          ? { color: 'var(--warn)' }
                          : undefined
                      }
                    >
                      {item && item.kind === 'gear' && item.slot !== slot.id
                        ? '⚠ wrong slot'
                        : item
                          ? item.rarity
                          : '—'}
                    </Tiny>
                  </SlotCard>
                </div>
              );
            })}
          </SlotGrid>
          <Tiny style={{ display: 'block', marginTop: 12 }}>
            Basic Attack is always available. Each ability has a fixed number of uses per match. Ultimates
            charge +1 every round and +1 per kill (5 to fire).
          </Tiny>
        </Panel>

        {/* Stats — ranked calculation on top, unranked recalculation below */}
        <Panel>
          <Row between style={{ flexWrap: 'wrap', gap: 8 }}>
            <PanelTitle style={{ margin: 0 }}>Combat Stats (Ranked · {rankedFormat})</PanelTitle>
            <Row gap={6}>
              {(['1v1', '5v5'] as const).map((f) => (
                <Button key={f} size="sm" variant={rankedFormat === f ? 'primary' : 'ghost'} onClick={() => setRankedFormat(f)}>
                  {f} ladder
                </Button>
              ))}
            </Row>
          </Row>
          <StatBlock>
            <StatBar
              label="HP · 200 base + build"
              value={rankedStats.maxHp}
              max={DISPLAY_MAX.maxHp}
              color={STAT_COLORS.maxHp}
            />
            <StatBar
              label="Attack · added to every hit"
              value={rankedStats.attack}
              max={DISPLAY_MAX.attack}
              color={STAT_COLORS.attack}
            />
            <StatBar
              label="Defense · armour + modifier"
              value={rankedStats.defense}
              max={DISPLAY_MAX.defense}
              color={STAT_COLORS.defense}
            />
            <StatBar
              label="Initiative"
              value={rankedStats.initiative}
              max={DISPLAY_MAX.initiative}
              color={STAT_COLORS.initiative}
            />
          </StatBlock>
          <P style={{ margin: '10px 0 0' }}>
            Damage dealt = <b>power attack + your Attack − enemy Defense</b>. HP has no ranked modifier —
            it starts at 200 and only rises from gear &amp; powers. This {rankedFormat} ladder's upgrades are
            already included here ({rank.name} ceiling: {ceiling} per stat
            {rankedUnlocked ? '' : ' — ranked locked until level 20'}).
          </P>
          <Divider />
          <PanelTitle>Unranked (recalculated)</PanelTitle>
          <P style={{ margin: 0 }}>
            Your stats re-calculated by the unranked modifier — except coin-bought Initiative, which is never
            normalized.
          </P>
          <Row wrap gap={6} style={{ marginTop: 8 }}>
            {STAT_IDS.map((s) => (
              <Chip key={s}>
                {STAT_LABELS[s]} {unrankedStats[s]}
              </Chip>
            ))}
          </Row>
          <Divider />
          <Row wrap>
            {build.actives.map((p) => (
              <Chip key={p.id}>
                {p.name} ({p.attack ?? 0} dmg · {p.uses ?? 0} use{p.uses === 1 ? '' : 's'})
              </Chip>
            ))}
            {build.ultimate && <Chip tone="warn">ULT: {build.ultimate.name} ✦/5</Chip>}
          </Row>
          <Tiny style={{ display: 'block', marginTop: 10 }}>
            Changes save automatically.
          </Tiny>
        </Panel>
      </BuildLayout>

      {/* Coin upgrades — initiative (everywhere) + ranked (ranked only) */}
      <TwoCol>
        {/* Initiative upgrade */}
        <Panel>
          <Row between>
            <PanelTitle style={{ margin: 0 }}>⚡ Initiative Upgrade</PanelTitle>
            <Chip>Lv {player.initiativeUpgrade}</Chip>
          </Row>
          <P style={{ margin: '8px 0 0' }}>
            Decides who acts first — every point matters. Applies in <b>all</b> modes and is{' '}
            <b>not normalized</b> in unranked. The price creeps up after each level.
          </P>
          <UpgradeRow>
            <div>
              <div style={{ fontWeight: 600 }}>
                +{player.initiativeUpgrade} Initiative total
              </div>
              <Tiny>
                Next level: +1 Initiative for {initiativeUpgradeCostNext()} coins
              </Tiny>
            </div>
            <Button
              variant="primary"
              disabled={
                player.initiativeUpgrade >= INITIATIVE_UPGRADE.maxLevel ||
                player.coins < initiativeUpgradeCostNext()
              }
              onClick={upgradeInitiative}
            >
              +1 Initiative
            </Button>
          </UpgradeRow>
        </Panel>

        {/* Ranked upgrades */}
        <Panel>
          <Row between style={{ flexWrap: 'wrap', gap: 8 }}>
            <PanelTitle style={{ margin: 0 }}>🏆 Ranked Upgrades · {rankedFormat}</PanelTitle>
            <Row gap={6}>
              {(['1v1', '5v5'] as const).map((f) => (
                <Button key={f} size="sm" variant={rankedFormat === f ? 'primary' : 'ghost'} onClick={() => setRankedFormat(f)}>
                  {f}
                </Button>
              ))}
            </Row>
          </Row>
          <P style={{ margin: '8px 0 0' }}>
            Coin-bought stats that apply <b>only in {rankedFormat} ranked matches</b> — this ladder has its
            own pool, separate from the other. The {rankedFormat} rank caps how far each stat can go ({rank.name}:
            {ceiling} per stat).
          </P>
          {rankedUnlocked ? (
            <div>
              <Chip style={{ color: rank.color, marginBottom: 8 }}>{rankStatusText(player.ranks[rankedFormat])}</Chip>
              {rankedRows.map((row) => {
                const lvl = player.rankedUpgrades[rankedFormat][row.stat] ?? 0;
                const gain = RANKED_UPGRADE.gains[row.stat as StatId];
                const cost = rankedUpgradeCostNext(row.stat, rankedFormat);
                const maxed = lvl >= ceiling;
                return (
                  <UpgradeRow key={row.stat}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {row.icon} {row.label} <Tiny>Lv {lvl}/{ceiling}</Tiny>
                      </div>
                      <Tiny>
                        +{Math.round(lvl * (gain ?? 0) * 10) / 10} →{' '}
                        +{Math.round((lvl + 1) * (gain ?? 0) * 10) / 10}{' '}
                        {row.stat === 'attack' ? 'Power' : 'Armor'}
                      </Tiny>
                    </div>
                    <Button
                      disabled={maxed || player.coins < cost}
                      title={maxed ? `Capped by ${rank.name} (${rankedFormat}) — win ${rankedFormat} ranked matches to raise it` : `Costs ${cost} coins`}
                      onClick={() => upgradeRanked(row.stat, rankedFormat)}
                    >
                      {maxed ? 'Maxed' : `+1 (${cost}🪙)`}
                    </Button>
                  </UpgradeRow>
                );
              })}
              <Tiny style={{ display: 'block', marginTop: 6 }}>
                Rank up by winning {rankedFormat} ranked matches —{' '}
                {maxRankedUpgradeFor(tierForRating(player.ranks[rankedFormat].rating) + 1)} levels per stat at the
                next tier.
              </Tiny>
            </div>
          ) : (
            <EmptyState>
              🔒 Ranked upgrades unlock at Level {RANKED_UNLOCK_LEVEL}.
              <br />
              <Tiny>Practice against the NPC and win unranked matches to level up.</Tiny>
            </EmptyState>
          )}
        </Panel>
      </TwoCol>

      {pickingSlot && (
        <ItemPicker
          slotId={pickingSlot}
          title={SLOTS.find((s) => s.id === pickingSlot)?.label ?? 'Pick item'}
          accepts={SLOTS.find((s) => s.id === pickingSlot)?.accepts ?? 'power'}
          currentId={preset.slots[pickingSlot] ?? null}
          onPick={(itemId) => equipSlot(preset.id, pickingSlot, itemId)}
          onClose={() => setPickingSlot(null)}
        />
      )}
    </Screen>
  );
}
