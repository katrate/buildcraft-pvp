import { usePlayer } from '../state/store';
import type { GearDefinition, PotionDefinition, PowerDefinition, SlotId } from '../../../shared/src/types';
import { getGear } from '../../../shared/src/game-data/gear';
import { getPotion } from '../../../shared/src/game-data/potions';
import { getPower } from '../../../shared/src/game-data/powers';
import { ItemCard } from './ItemCard';
import { Button, Divider, EmptyState, ItemGrid, Modal, ModalBackdrop, Row, Tiny } from '../ui/glass';

export function ItemPicker(props: {
  slotId: SlotId;
  title: string;
  accepts: 'power' | 'gear' | 'potion';
  currentId: string | null;
  onPick: (itemId: string | null) => void;
  onClose: () => void;
}) {
  const { slotId, title, accepts, currentId, onPick, onClose } = props;
  const player = usePlayer();

  const ownedIds = accepts === 'power' ? player.inventory.powers : accepts === 'gear' ? player.inventory.gear : player.inventory.potions;
  const items: (PowerDefinition | GearDefinition | PotionDefinition)[] = ownedIds
    .map((id) => (accepts === 'power' ? getPower(id) : accepts === 'gear' ? getGear(id) : getPotion(id)))
    .filter((i): i is PowerDefinition | GearDefinition | PotionDefinition => i !== null)
    // Only items that fit this slot group
    .filter((i) => {
      if (i.kind !== accepts) return false;
      // Gear is slot-specific: weapons only in the weapon slot, armor only in
      // the armor slot. Potions fit any potion slot (potion1-3).
      if (i.kind === 'gear') return i.slot === slotId;
      if (i.kind === 'potion') return slotId.startsWith('potion');
      const power = i as PowerDefinition;
      if (slotId === 'core') return power.powerKind === 'core';
      if (slotId === 'active1' || slotId === 'active2') return power.powerKind === 'active';
      if (slotId === 'passive1' || slotId === 'passive2') return power.powerKind === 'passive';
      if (slotId === 'ultimate') return power.powerKind === 'ultimate';
      return false;
    });

  return (
    <ModalBackdrop onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Row between>
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </Row>
        {currentId && (
          <Button
            variant="danger"
            onClick={() => {
              onPick(null);
              onClose();
            }}
          >
            Remove current item
          </Button>
        )}
        <Divider />
        {items.length === 0 ? (
          <EmptyState>
            No owned items fit here.
            <br />
            <Tiny>Buy powers, gear and potions in the Store.</Tiny>
          </EmptyState>
        ) : (
          <ItemGrid>
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                badge={item.id === currentId ? 'Equipped' : 'Owned'}
                onClick={() => {
                  onPick(item.id);
                  onClose();
                }}
              />
            ))}
          </ItemGrid>
        )}
      </Modal>
    </ModalBackdrop>
  );
}
