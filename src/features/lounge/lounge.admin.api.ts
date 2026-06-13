import { getSession, restRequest, uploadStorageObject } from '../../shared/api/supabaseRest';
import type {
  LoungeAccessLevel,
  LoungeContentDescriptionBlock,
  LoungeContentType,
  LoungeDisplayMode,
  LoungeEventConfig,
  LoungeEventRankConditionType,
  LoungeEventRankingMetric,
  LoungeEventRankingSource,
  LoungeNode,
  LoungeSettings,
} from './types/lounge.types';

const loungeAssetBucket = 'lounge-assets';

type LoungeContentRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  content_type: LoungeContentType;
  access_level: LoungeAccessLevel;
  route_path: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  lounge_event_configs?: LoungeEventConfigRow | LoungeEventConfigRow[] | null;
};

type LoungeEventConfigRow = {
  id: string;
  content_id: string;
  opens_at: string | null;
  closes_at: string | null;
  target_route_path: string | null;
  ranking_source: LoungeEventRankingSource;
  ranking_metric: LoungeEventRankingMetric;
  ranking_target_id: string | null;
  reward_rank_limit: number;
  rank_condition_type: LoungeEventRankConditionType;
};

type AdminLoungeNodeRow = {
  id: string;
  content_id: string;
  is_enabled: boolean;
  display_mode: LoungeDisplayMode;
  zone: string | null;
  map_x: number;
  map_y: number;
  node_label: string | null;
  node_icon_url: string | null;
  node_variant: string | null;
  node_theme_color: string | null;
  sort_order: number;
  lounge_contents: LoungeContentRow | LoungeContentRow[] | null;
};

type LoungeSettingsRow = {
  id: string;
  map_background_url: string | null;
  map_background_mode: 'css' | 'image';
};

export type AdminLoungeNodeUpdateInput = {
  id: string;
  contentId: string;
  isEnabled: boolean;
  accessLevel: LoungeAccessLevel;
  nodeLabel: string;
  nodeIconUrl: string;
  nodeThemeColor: string;
  nodeVariant: string;
  thumbnailUrl: string;
  mapX: number;
  mapY: number;
  sortOrder: number;
};

export type AdminLoungeEventConfigInput = {
  contentId: string;
  title: string;
  subtitle: string;
  summary: string;
  opensAt: string;
  closesAt: string;
  targetRoutePath: string;
  rankingSource: LoungeEventRankingSource;
  rankingMetric: LoungeEventRankingMetric;
  rankingTargetId: string;
  rewardRankLimit: number;
  rankConditionType: LoungeEventRankConditionType;
  metadata: Record<string, unknown>;
  descriptionBlocks: LoungeContentDescriptionBlock[];
};

export type LoungeAssetKind = 'pin' | 'card';

function toDescriptionBlocks(metadata: Record<string, unknown> | null): LoungeContentDescriptionBlock[] {
  const blocks = metadata?.descriptionBlocks;

  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks.reduce<LoungeContentDescriptionBlock[]>((items, block, index) => {
    if (!block || typeof block !== 'object') {
      return items;
    }

    const record = block as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id.trim() ? record.id : `block-${index}`;

    if (record.type === 'text' && typeof record.text === 'string' && record.text.trim()) {
      items.push({
        id,
        type: 'text',
        text: record.text,
      });
    }

    if (record.type === 'image' && typeof record.imageUrl === 'string' && record.imageUrl.trim()) {
      items.push({
        id,
        type: 'image',
        imageUrl: record.imageUrl,
        alt: typeof record.alt === 'string' ? record.alt : '',
        caption: typeof record.caption === 'string' ? record.caption : undefined,
      });
    }

    return items;
  }, []);
}

function normalizeDescriptionBlocks(blocks: LoungeContentDescriptionBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === 'text') {
        return {
          id: block.id,
          type: block.type,
          text: block.text.trim(),
        };
      }

      return {
        id: block.id,
        type: block.type,
        imageUrl: block.imageUrl.trim(),
        alt: block.alt.trim(),
        caption: block.caption?.trim() || undefined,
      };
    })
    .filter((block) => block.type === 'text' ? Boolean(block.text) : Boolean(block.imageUrl));
}

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  return session;
}

function normalizeContent(row: LoungeContentRow) {
  const eventConfigRow = Array.isArray(row.lounge_event_configs)
    ? row.lounge_event_configs[0]
    : row.lounge_event_configs;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    contentType: row.content_type,
    accessLevel: row.access_level,
    routePath: row.route_path,
    thumbnailUrl: row.thumbnail_url,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    descriptionBlocks: toDescriptionBlocks(row.metadata),
    eventConfig: eventConfigRow ? toLoungeEventConfig(eventConfigRow) : null,
  };
}

function toLoungeEventConfig(row: LoungeEventConfigRow): LoungeEventConfig {
  return {
    id: row.id,
    contentId: row.content_id,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    targetRoutePath: row.target_route_path,
    rankingSource: row.ranking_source,
    rankingMetric: row.ranking_metric,
    rankingTargetId: row.ranking_target_id,
    rewardRankLimit: row.reward_rank_limit,
    rankConditionType: row.rank_condition_type ?? 'top',
  };
}

function toAdminLoungeNode(row: AdminLoungeNodeRow): LoungeNode | null {
  const contentRow = Array.isArray(row.lounge_contents)
    ? row.lounge_contents[0]
    : row.lounge_contents;

  if (!contentRow) {
    return null;
  }

  return {
    id: row.id,
    isEnabled: row.is_enabled,
    displayMode: row.display_mode,
    zone: row.zone,
    mapX: Number(row.map_x),
    mapY: Number(row.map_y),
    nodeLabel: row.node_label,
    nodeIconUrl: row.node_icon_url,
    nodeVariant: row.node_variant ?? 'default',
    nodeThemeColor: row.node_theme_color,
    sortOrder: row.sort_order,
    content: normalizeContent(contentRow),
  };
}

function toLoungeSettings(row: LoungeSettingsRow): LoungeSettings {
  return {
    id: row.id,
    mapBackgroundUrl: row.map_background_url,
    mapBackgroundMode: row.map_background_mode,
  };
}

export async function getAdminLoungeNodes() {
  const session = getRequiredSession();
  const rows = await restRequest<AdminLoungeNodeRow[]>(
    '/lounge_content_nodes?select=id,content_id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags,metadata,lounge_event_configs(id,content_id,opens_at,closes_at,target_route_path,ranking_source,ranking_metric,ranking_target_id,reward_rank_limit,rank_condition_type))&order=sort_order.asc',
    {
      token: session.access_token,
    },
  );

  return rows
    .map(toAdminLoungeNode)
    .filter((node): node is LoungeNode => Boolean(node));
}

export async function getAdminLoungeNode(nodeId: string) {
  const session = getRequiredSession();
  const [row] = await restRequest<AdminLoungeNodeRow[]>(
    `/lounge_content_nodes?id=eq.${nodeId}&select=id,content_id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags,metadata,lounge_event_configs(id,content_id,opens_at,closes_at,target_route_path,ranking_source,ranking_metric,ranking_target_id,reward_rank_limit,rank_condition_type))`,
    {
      token: session.access_token,
    },
  );

  return row ? toAdminLoungeNode(row) : null;
}

export async function getAdminLoungeSettings() {
  const session = getRequiredSession();
  const [row] = await restRequest<LoungeSettingsRow[]>(
    '/lounge_settings?id=eq.main&select=id,map_background_url,map_background_mode',
    {
      token: session.access_token,
    },
  );

  return row ? toLoungeSettings(row) : null;
}

export async function updateAdminLoungeSettings(input: Pick<LoungeSettings, 'mapBackgroundUrl' | 'mapBackgroundMode'>) {
  const session = getRequiredSession();
  const [row] = await restRequest<LoungeSettingsRow[]>('/lounge_settings?on_conflict=id', {
    method: 'POST',
    token: session.access_token,
    body: {
      id: 'main',
      map_background_url: input.mapBackgroundUrl?.trim() || null,
      map_background_mode: input.mapBackgroundMode,
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  if (!row) {
    throw new Error('라운지 배경 설정 저장 결과를 확인할 수 없습니다.');
  }

  return toLoungeSettings(row);
}

export async function updateAdminLoungeNode(input: AdminLoungeNodeUpdateInput) {
  const session = getRequiredSession();

  const [nodeRow] = await restRequest<AdminLoungeNodeRow[]>(`/lounge_content_nodes?id=eq.${input.id}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      is_enabled: input.isEnabled,
      node_label: input.nodeLabel.trim() || null,
      node_icon_url: input.nodeIconUrl.trim() || null,
      node_theme_color: input.nodeThemeColor.trim() || null,
      node_variant: input.nodeVariant.trim() || 'default',
      map_x: input.mapX,
      map_y: input.mapY,
      sort_order: input.sortOrder,
    },
  });

  await restRequest<LoungeContentRow[]>(`/lounge_contents?id=eq.${input.contentId}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      thumbnail_url: input.thumbnailUrl.trim() || null,
      access_level: input.accessLevel,
    },
    headers: {
      Prefer: 'return=minimal',
    },
  });

  if (!nodeRow) {
    throw new Error('라운지 노드 저장 결과를 확인할 수 없습니다.');
  }

  const nodes = await getAdminLoungeNodes();
  return nodes.find((node) => node.id === input.id) ?? null;
}

export async function updateAdminLoungeEventConfig(input: AdminLoungeEventConfigInput) {
  const session = getRequiredSession();
  const title = input.title.trim();

  if (!title) {
    throw new Error('이벤트 제목을 입력해주세요.');
  }

  await restRequest<LoungeContentRow[]>(`/lounge_contents?id=eq.${input.contentId}`, {
    method: 'PATCH',
    token: session.access_token,
    body: {
      title,
      subtitle: input.subtitle.trim() || null,
      summary: input.summary.trim() || null,
      metadata: {
        ...input.metadata,
        descriptionBlocks: normalizeDescriptionBlocks(input.descriptionBlocks),
      },
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'return=minimal',
    },
  });

  const [row] = await restRequest<LoungeEventConfigRow[]>('/lounge_event_configs?on_conflict=content_id', {
    method: 'POST',
    token: session.access_token,
    body: {
      content_id: input.contentId,
      opens_at: input.opensAt.trim() ? new Date(input.opensAt).toISOString() : null,
      closes_at: input.closesAt.trim() ? new Date(input.closesAt).toISOString() : null,
      target_route_path: input.targetRoutePath.trim() || null,
      ranking_source: input.rankingSource,
      ranking_metric: input.rankingMetric,
      ranking_target_id: input.rankingTargetId.trim() || null,
      reward_rank_limit: input.rewardRankLimit,
      rank_condition_type: input.rankConditionType,
      updated_at: new Date().toISOString(),
    },
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });

  if (!row) {
    throw new Error('이벤트 설정 저장 결과를 확인할 수 없습니다.');
  }

  return toLoungeEventConfig(row);
}

export async function uploadLoungeNodeAsset(nodeId: string, kind: LoungeAssetKind, file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `nodes/${nodeId}/${kind}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(loungeAssetBucket, objectPath, file, session.access_token);
}

export async function uploadLoungeMapBackground(file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `map/background-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(loungeAssetBucket, objectPath, file, session.access_token);
}

export async function uploadLoungeContentAsset(contentId: string, file: File) {
  const session = getRequiredSession();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const objectPath = `contents/${contentId}/body-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  return uploadStorageObject(loungeAssetBucket, objectPath, file, session.access_token);
}
