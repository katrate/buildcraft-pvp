import { BackButton as GlassBack } from '../ui/glass';
import { I } from '../ui/icons';

export function BackButton(props: { onBack: () => void }) {
  return (
    <GlassBack onClick={props.onBack}>
      <I n="arrowLeft" /> Main Menu
    </GlassBack>
  );
}
