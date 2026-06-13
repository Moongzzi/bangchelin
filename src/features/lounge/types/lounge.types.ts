export type LoungeContentType = 'game' | 'quiz' | 'event' | 'tool';
export type LoungeAccessLevel = 'public' | 'member' | 'admin' | 'hidden';
export type LoungeDisplayMode = 'map' | 'store' | 'both';

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
