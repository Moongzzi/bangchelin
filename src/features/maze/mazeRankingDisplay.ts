import type { MazeRankingEntry, MazeRankingMetric } from './types/maze.types';

export type MazeRankingDisplayEntry = {
  entry: MazeRankingEntry;
  placement: 'my_record' | 'ranking';
};

function getDisplayRank(entry: MazeRankingEntry, metric: MazeRankingMetric) {
  return metric === 'elapsed_time' ? entry.elapsedRank : entry.clearRank;
}

export function getMazeRankingDisplayEntries(
  entries: MazeRankingEntry[],
  metric: MazeRankingMetric,
  pinnedEntries = entries,
): MazeRankingDisplayEntry[] {
  const myEntry = pinnedEntries.find((entry) => entry.isMe) ?? null;
  const rankedEntries = [...entries].sort((first, second) => {
    const firstRank = getDisplayRank(first, metric);
    const secondRank = getDisplayRank(second, metric);

    return firstRank - secondRank || first.clearRank - second.clearRank;
  });

  return [
    ...(myEntry ? [{ entry: myEntry, placement: 'my_record' as const }] : []),
    ...rankedEntries.map((entry) => ({ entry, placement: 'ranking' as const })),
  ];
}
