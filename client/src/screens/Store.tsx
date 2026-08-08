import { useEffect, useState } from 'react';
import { usePlayer, buyItem, ownsItem } from '../state/store';
import { getAllPowers } from '../../../shared/src/game-data/powers';
import { getAllGear } from '../../../shared/src/game-data/gear';
import { getAllPotions } from '../../../shared/src/game-data/potions';
import type { PowerKind } from '../../../shared/src/types';
import { ItemCard } from '../components/ItemCard';
import { BackButton } from '../components/BackButton';
import { Chip, ItemGrid, Kicker, Row, Screen, ScreenHead, ScreenTitle, Tab, Tabs, Toast, Tiny } from '../ui/glass';

type StoreTab = 'cores' | 'actives' | 'buffs' | 'ultimates' | 'gear' | 'potions';

const TABS: { id: StoreTab; label: string; icon: string }[] = [
  { id: 'cores', label: 'Cores', icon: '✦' },
  { id: 'actives', label: 'Actives', icon: '⚔' },
  { id: 'buffs', label: 'Buffs', icon: '💚' },
  { id: 'ultimates', label: 'Ultimates', icon: '🌟' },
  { id: 'gear', label: 'Gear', icon: '🎒' },
  { id: 'potions', label: 'Potions', icon: '🧪' },
];

export function Store(props: { onBack: () => void }) {
  const player = usePlayer();
  const [tab, setTab] = useState<StoreTab>('actives');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const kindFor: Record<StoreTab, PowerKind | 'gear' | 'potion'> = {
    cores: 'core',
    actives: 'active',
    buffs: 'passive',
    ultimates: 'ultimate',
    gear: 'gear',
    potions: 'potion',
  };

  const allPowers = getAllPowers();
  const allGear = getAllGear();
  const allPotions = getAllPotions();
  const items =
    tab === 'gear'
      ? allGear
      : tab === 'potions'
        ? allPotions
        : allPowers.filter((p) => p.powerKind === kindFor[tab]);
  items.sort((a, b) => a.price - b.price);

  function tryBuy(kind: 'powers' | 'gear' | 'potions', id: string, price: number): void {
    if (ownsItem(kind, id)) {
      setToast('Already owned.');
      return;
    }
    if (player.coins < price) {
      setToast(`Not enough coins — need ${price}.`);
      return;
    }
    const ok = buyItem(kind, id);
    setToast(ok ? `Purchased ${id}!` : 'Purchase failed.');
  }

  return (
    <Screen>
      <ScreenHead>
        <div>
          <Kicker>Earnable content only</Kicker>
          <ScreenTitle>Store</ScreenTitle>
        </div>
        <Row>
          <Chip tone="warn">🪙 {player.coins} coins</Chip>
          <BackButton onBack={props.onBack} />
        </Row>
      </ScreenHead>

      <Tabs>
        {TABS.map((t) => (
          <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </Tab>
        ))}
      </Tabs>

      <ItemGrid>
        {items.map((item) => {
          const kind = item.kind === 'power' ? 'powers' : item.kind === 'gear' ? 'gear' : 'potions';
          const owned = ownsItem(kind, item.id);
          return (
            <ItemCard
              key={item.id}
              item={item}
              badge={owned ? 'Owned' : undefined}
              actionLabel={owned ? 'Owned' : 'Buy'}
              actionDisabled={owned || player.coins < item.price}
              onAction={() => tryBuy(kind, item.id, item.price)}
            />
          );
        })}
      </ItemGrid>

      {toast && <Toast>{toast}</Toast>}
    </Screen>
  );
}
