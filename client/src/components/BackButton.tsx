import { BackButton as GlassBack } from '../ui/glass';

export function BackButton(props: { onBack: () => void }) {
  return (
    <GlassBack onClick={props.onBack} title="Return to the main menu">
      ← Main Menu
    </GlassBack>
  );
}
