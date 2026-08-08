import { useState } from 'react';
import { usePlayer, getActivePreset } from '../state/store';
import { getPower } from '../../../shared/src/game-data/powers';
import { getGear } from '../../../shared/src/game-data/gear';
import { getPotion } from '../../../shared/src/game-data/potions';
import { ItemCard } from '../components/ItemCard';
import { BackButton } from '../components/BackButton';
import { Button, EmptyState, Input, ItemGrid, Kicker, Row, Screen, ScreenHead, ScreenTitle, Tab, Tabs, Tiny } from '../ui/glass';

export function Inventory(props: { onEditBuild: () => void; onBack: () => void }) {
  const player = usePlayer();
  const active = getActivePreset();
  const [tab, setTab] = useState<'powers' | 'gear' | 'potions'>('powers');
  const [query, setQuery] = useState('');

  const owned = tab === 'powers' ? player.inventory.powers : tab === 'gear' ? player.inventory.gear : player.inventory.potions;
  const items = owned
    .map((id) => (tab === 'powers' ? getPower(id) : tab === 'gear' ? getGear(id) : getPotion(id)))
    .filter((i) => i !== null);

  // Search filters the current tab by name, id or description.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      )
    : items;

  const equippedIn = (id: string): string | null => {
    for (const [slot, itemId] of Object.entries(active.slots)) {
      if (itemId === id) return slot;
    }
    return null;
  };

  return (
    <Screen>
      <ScreenHead>
        <div>
          <Kicker>Your collection</Kicker>
          <ScreenTitle>Inventory</ScreenTitle>
        </div>
        <BackButton onBack={props.onBack} />
      </ScreenHead>
      <Tabs>
        <Tab active={tab === 'powers'} onClick={() => setTab('powers')}>
          Powers ({player.inventory.powers.length})
        </Tab>
        <Tab active={tab === 'gear'} onClick={() => setTab('gear')}>
          Gear ({player.inventory.gear.length})
        </Tab>
        <Tab active={tab === 'potions'} onClick={() => setTab('potions')}>
          Potions ({player.inventory.potions.length})
        </Tab>
        <Button variant="ghost" onClick={props.onEditBuild} style={{ marginLeft: 'auto' }}>
          🛠 Edit build
        </Button>
      </Tabs>

      <Row gap={8} style={{ margin: '12px 0 4px' }}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search your collection…"
          style={{ maxWidth: 340 }}
        />
        {q && <Tiny>{filtered.length} of {items.length} match</Tiny>}
      </Row>

      {items.length === 0 ? (
        <EmptyState>
          Nothing here yet.
          <br />
          <Tiny>Head to the Store to grow your collection.</Tiny>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>
          No matches for “{query.trim()}” in your {tab}.
          <br />
          <Tiny>Try a shorter name, or a different tab.</Tiny>
        </EmptyState>
      ) : (
        <ItemGrid>
          {filtered.map((item) => {
            const equipped = equippedIn(item.id);
            return (
              <ItemCard
                key={item.id}
                item={item}
                badge={equipped ? `Equipped — ${equipped}` : 'Owned'}
                onClick={props.onEditBuild}
              />
            );
          })}
        </ItemGrid>
      )}
    </Screen>
  );
}
