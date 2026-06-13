export type LoungeContentType = 'game' | 'quiz' | 'event' | 'tool';
export type LoungeAccessLevel = 'public' | 'member' | 'admin' | 'hidden';
export type LoungeDisplayMode = 'map' | 'store' | 'both';
export type LoungeEventRankingMetric = 'clear_order' | 'elapsed_time';
export type LoungeEventRankingSource = 'maze';
export type LoungeEventRankConditionType = 'top' | 'exact';
export type LoungeContentDescriptionBlock =
  | {
      id: string;
      type: 'text';
      text: string;
    }
  | {
      id: string;
      type: 'image';
      imageUrl: string;
      alt: string;
      caption?: string;
    };

export type LoungeEventConfig = {
  id: string;
  contentId: string;
  opensAt: string | null;
  closesAt: string | null;
  targetRoutePath: string | null;
  rankingSource: LoungeEventRankingSource;
  rankingMetric: LoungeEventRankingMetric;
  rankingTargetId: string | null;
  rewardRankLimit: number;
  rankConditionType: LoungeEventRankConditionType;
};

export type LoungeContent = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  contentType: LoungeContentType;
  accessLevel: LoungeAccessLevel;
  routePath: string;
  thumbnailUrl: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  descriptionBlocks: LoungeContentDescriptionBlock[];
  eventConfig: LoungeEventConfig | null;
};

export type LoungeNode = {
  id: string;
  isEnabled: boolean;
  displayMode: LoungeDisplayMode;
  zone: string | null;
  mapX: number;
  mapY: number;
  nodeLabel: string | null;
  nodeIconUrl: string | null;
  nodeVariant: string;
  nodeThemeColor: string | null;
  sortOrder: number;
  content: LoungeContent;
};

export type LoungeViewMode = 'map' | 'store';

export type LoungeSettings = {
  id: string;
  mapBackgroundUrl: string | null;
  mapBackgroundMode: 'css' | 'image';
};
