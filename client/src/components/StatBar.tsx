import { Fill, LabelRow, StatBar as GlassStatBar, Track } from '../ui/glass';

export function StatBar(props: {
  label?: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
  height?: number;
}) {
  const { label, value, max, color = 'var(--accent)', suffix = '', height = 10 } = props;
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <GlassStatBar>
      {label && (
        <LabelRow>
          <span>{label}</span>
          <span>
            {Math.round(value)}/{Math.round(max)}
            {suffix}
          </span>
        </LabelRow>
      )}
      <Track h={height}>
        <Fill pct={pct} color={color} />
      </Track>
    </GlassStatBar>
  );
}
