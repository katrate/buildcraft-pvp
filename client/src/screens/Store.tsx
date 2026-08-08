import { useEffect, useState } from 'react';
import { usePlayer, buyItem, ownsItem } from '../state/store';
import { getAllPowers } from '../../../shared/src/game-data/powers';
import { getAllGear } from '../../../shared/src/game-data/gear';
import type { PowerKind } from '../../../shared/src/types';
import { ItemCard } from '../components/ItemCard';
import { BackButton } from '../components/BackButton';
import { Chip, ItemGrid, Kicker, Row, Screen, ScreenHead, ScreenTitle, Tab, Tabs, Toast, Tiny } from '../ui/glass';

type StoreTab = 'cores' | 'actives' | 'buffs' | 'ultimates' | 'gear';

const TABS: { id: StoreTab; label: string; icon: string }[] = [
  { id: 'cores', label: 'Cores', icon: '✦' },
  { id: 'actives', label: 'Actives', icon: '⚔' },
  { id: 'buffs', label: 'Buffs', icon: '💚' },
  { id: 'ultimates', label: 'Ultimates', icon: '🌟' },
  { id: 'gear', label: 'Gear', icon: '🎒' },
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

  const kindFor: Record<StoreTab, PowerKind | 'gear'> = {
    cores: 'core',
    actives: 'active',
    buffs: 'passive',
    ultimates: 'ultimate',
    gear: 'gear',
  };

  const allPowers = getAllPowers();
  const allGear = getAllGear();
  const items =
    tab === 'gear'
      ? allGear
      : allPowers.filter((p) => p.powerKind === kindFor[tab]);
  items.sort((a, b) => a.price - b.price);

  function tryBuy(kind: 'powers' | 'gear', id: string, price: number): void {
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
          const owned = ownsItem(item.kind === 'power' ? 'powers' : 'gear', item.id);
          return (
            <ItemCard
              key={item.id}
              item={item}
              badge={owned ? 'Owned' : undefined}
              actionLabel={owned ? 'Owned' : 'Buy'}
              actionDisabled={owned || player.coins < item.price}
              onAction={() => tryBuy(item.kind === 'power' ? 'powers' : 'gear', item.id, item.price)}
            />
          );
        })}
      </ItemGrid>

      {toast && <Toast>{toast}</Toast>}
    </Screen>
  );
}
