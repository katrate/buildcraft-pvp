import type { PlayerRank, RankedFormat } from '../../../shared/src/types';
import { rankForRating } from '../../../shared/src/progression';
import { progressInBand, ratingToNextBand } from '../../../shared/src/rating';
import { Fill, Tiny, Track } from '../ui/glass';

/**
 * Rank (RR) progress bar — one per ladder, styled like the level bar.
 * Fill = progress within the current band toward the next; color = band color.
 */
export function RankBar({ format, rank }: { format: RankedFormat; rank: PlayerRank }) {
  const band = rankForRating(rank.rating);
  const next = ratingToNextBand(rank.rating);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Tiny style={{ color: band.color }}>
          {format} · {band.name.toUpperCase()}
        </Tiny>
        <Tiny>
          {next === null
            ? 'MAX RANK'
            : `${rank.rating} RP · ${next - rank.rating} to ${rankForRating(next).name.toUpperCase()}`}
        </Tiny>
      </div>
      <Track h={8}>
        <Fill pct={progressInBand(rank.rating) * 100} color={band.color} />
      </Track>
    </div>
  );
}
