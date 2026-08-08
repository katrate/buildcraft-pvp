import { BackButton as GlassBack } from '../ui/glass';
import { I } from '../ui/icons';

export function BackButton(props: { onBack: () => void }) {
  return (
    <GlassBack onClick={props.onBack} title="Return to the main menu">
      <I n="arrowLeft" /> Main Menu
    </GlassBack>
  );
}
