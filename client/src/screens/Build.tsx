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
import type { RankedUpgrades, SlotId, StatId } from '../../../shared/src/types';
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
  Panel,
  PanelTitle,
  P,
  PresetTab,
  Row,
  Screen,
  SlotCard,
  SlotEmpty,
  SlotLabel,
  SlotList,
  SlotItem,
  StatBlock,
  Tiny,
  UpgradeRow,
} from '../ui/glass';

const DISPLAY_MAX: Record<string, number> = {
  maxHp: 300,
  attack: 35,
  defense: 20,
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

  const build = computeStats(preset);
  const normalized = normalizeUnranked(build.stats);
  const rankedUnlocked = isRankedUnlocked(player.level);
  const rank = rankForRating(player.rank.rating);
  const ceiling = rankedUpgradeCeiling(tierForRating(player.rank.rating));

  // Unranked = normalized base + (non-normalized) initiative upgrade.
  const unrankedStats = { ...normalized, initiative: normalized.initiative + player.initiativeUpgrade };
  // Ranked = full build + ranked upgrades + initiative upgrade.
  const rankedStats = {
    maxHp: build.stats.maxHp + Math.round((player.rankedUpgrades.maxHp ?? 0) * (RANKED_UPGRADE.gains.maxHp ?? 0)),
    attack: build.stats.attack + (player.rankedUpgrades.attack ?? 0) * (RANKED_UPGRADE.gains.attack ?? 0),
    defense: build.stats.defense + (player.rankedUpgrades.defense ?? 0) * (RANKED_UPGRADE.gains.defense ?? 0),
    initiative: build.stats.initiative + player.initiativeUpgrade,
  };

  const rankedRows: { stat: keyof RankedUpgrades; label: string; icon: string }[] = [
    { stat: 'maxHp', label: RANKED_UPGRADE.labels.maxHp, icon: '❤️' },
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
      <Row between>
        <h1 style={{ margin: 0 }}>Build Editor</h1>
        <BackButton onBack={props.onBack} />
      </Row>

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

        {/* Slots */}
        <Panel>
          <PanelTitle>{preset.name} — click a slot to equip</PanelTitle>
          <SlotList>
            {SLOTS.map((slot) => {
              const itemId = preset.slots[slot.id] ?? null;
              const item = slot.accepts === 'power' ? getPower(itemId) : getGear(itemId);
              return (
                <SlotCard key={slot.id} onClick={() => setPickingSlot(slot.id)}>
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
                  <Tiny>{item ? item.rarity : '—'}</Tiny>
                </SlotCard>
              );
            })}
          </SlotList>
          <Tiny style={{ display: 'block', marginTop: 12 }}>
            Basic Attack is always available. Each ability has a fixed number of uses per match. Ultimates
            charge +1 every round and +1 per kill (5 to fire).
          </Tiny>
        </Panel>

        {/* Stats */}
        <Panel>
          <PanelTitle>Resulting stats</PanelTitle>
          <StatBlock>
            {STAT_IDS.map((s) => (
              <StatBar
                key={s}
                label={STAT_LABELS[s]}
                value={build.stats[s]}
                max={DISPLAY_MAX[s]}
                color={STAT_COLORS[s]}
              />
            ))}
          </StatBlock>
          <Divider />
          <PanelTitle>Unranked (normalized)</PanelTitle>
          <P style={{ margin: 0 }}>
            Re-based toward the reference level — except your coin-bought Initiative, which is never
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
          <PanelTitle>Ranked (full stats)</PanelTitle>
          {rankedUnlocked ? (
            <>
              <P style={{ margin: 0 }}>
                Your real build + ranked upgrades ({rank.name} ceiling: {ceiling} levels per stat).
              </P>
              <Row wrap gap={6} style={{ marginTop: 8 }}>
                {STAT_IDS.map((s) => (
                  <Chip key={s}>
                    {STAT_LABELS[s]} {Math.round(rankedStats[s as keyof typeof rankedStats])}
                  </Chip>
                ))}
              </Row>
            </>
          ) : (
            <P style={{ margin: 0 }}>
              🔒 Reach Level {RANKED_UNLOCK_LEVEL} to unlock ranked play and ranked stat upgrades.
            </P>
          )}
          <Divider />
          <Row wrap>
            {build.actives.map((p) => (
              <Chip key={p.id}>
                {p.name} ({p.uses ?? 0} use{p.uses === 1 ? '' : 's'})
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
      <Row wrap style={{ alignItems: 'stretch', marginTop: 16 }}>
        {/* Initiative upgrade */}
        <Panel style={{ flex: 1 }}>
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
        <Panel style={{ flex: 1 }}>
          <Row between>
            <PanelTitle style={{ margin: 0 }}>🏆 Ranked Upgrades</PanelTitle>
            <Chip style={{ color: rank.color }}>
              {rankedUnlocked ? rankStatusText(player.rank) : `🔒 Level ${RANKED_UNLOCK_LEVEL} required`}
            </Chip>
          </Row>
          <P style={{ margin: '8px 0 0' }}>
            Coin-bought stats that apply <b>only in ranked matches</b>. Your rank caps how far each stat
            can go ({rank.name}: {ceiling} per stat).
          </P>
          {rankedUnlocked ? (
            <div>
              {rankedRows.map((row) => {
                const lvl = player.rankedUpgrades[row.stat] ?? 0;
                const gain = RANKED_UPGRADE.gains[row.stat as StatId];
                const cost = rankedUpgradeCostNext(row.stat);
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
                        {row.stat === 'maxHp' ? 'HP' : row.stat}
                      </Tiny>
                    </div>
                    <Button
                      disabled={maxed || player.coins < cost}
                      title={maxed ? `Capped by ${rank.name} rank — rank up to upgrade more` : `Costs ${cost} coins`}
                      onClick={() => upgradeRanked(row.stat)}
                    >
                      {maxed ? 'Maxed' : `+1 (${cost}🪙)`}
                    </Button>
                  </UpgradeRow>
                );
              })}
              <Tiny style={{ display: 'block', marginTop: 6 }}>
                Rank up by winning ranked matches — {maxRankedUpgradeFor(tierForRating(player.rank.rating) + 1)} levels per
                stat at the next tier.
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
      </Row>

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
