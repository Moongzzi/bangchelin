import { getSession, restRequest } from '../../shared/api/supabaseRest';
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

type LoungeNodeRow = {
  id: string;
  is_enabled: boolean;
  display_mode: LoungeDisplayMode;
  zone: string | null;
  map_x: number;
  map_y: number;
  node_label: string | null;
  node_icon_url: string | null;
  node_variant: string | null;
  node_theme_color?: string | null;
  sort_order: number;
  lounge_contents: LoungeContentRow | LoungeContentRow[] | null;
};

type LoungeActivityInput = {
  contentId?: string | null;
  anonymousId: string;
  eventType: 'view_mode_change' | 'node_click' | 'locked_node_click' | 'coming_soon_click' | 'event_locked_click';
  eventPayload?: Record<string, unknown>;
};

type LoungeSettingsRow = {
  id: string;
  map_background_url: string | null;
  map_background_mode: 'css' | 'image';
};

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

function toContent(row: LoungeContentRow) {
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
    eventConfig: eventConfigRow ? toEventConfig(eventConfigRow) : null,
  };
}

function toEventConfig(row: LoungeEventConfigRow): LoungeEventConfig {
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

function toLoungeNode(row: LoungeNodeRow): LoungeNode | null {
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
    nodeThemeColor: row.node_theme_color ?? null,
    sortOrder: row.sort_order,
    content: toContent(contentRow),
  };
}

export async function getLoungeNodes() {
  const session = getSession();

  try {
    const rows = await restRequest<LoungeNodeRow[]>(
      '/lounge_content_nodes?is_enabled=eq.true&select=id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags,metadata,lounge_event_configs(id,content_id,opens_at,closes_at,target_route_path,ranking_source,ranking_metric,ranking_target_id,reward_rank_limit,rank_condition_type))&order=sort_order.asc',
      {
        token: session?.access_token,
      },
    );

    const nodes = rows
      .map(toLoungeNode)
      .filter((node): node is LoungeNode => Boolean(node));

    return nodes;
  } catch {
    return [];
  }
}

function toLoungeSettings(row: LoungeSettingsRow): LoungeSettings {
  return {
    id: row.id,
    mapBackgroundUrl: row.map_background_url,
    mapBackgroundMode: row.map_background_mode,
  };
}

export async function getLoungeSettings() {
  const session = getSession();

  try {
    const [row] = await restRequest<LoungeSettingsRow[]>(
      '/lounge_settings?id=eq.main&select=id,map_background_url,map_background_mode',
      {
        token: session?.access_token,
      },
    );

    return row ? toLoungeSettings(row) : null;
  } catch {
    return null;
  }
}

export async function getLoungeEventContent(slug: string) {
  const session = getSession();

  const [row] = await restRequest<LoungeContentRow[]>(
    `/lounge_contents?slug=eq.${encodeURIComponent(slug)}&status=eq.published&content_type=eq.event&select=id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags,metadata,lounge_event_configs(id,content_id,opens_at,closes_at,target_route_path,ranking_source,ranking_metric,ranking_target_id,reward_rank_limit,rank_condition_type)`,
    {
      token: session?.access_token,
    },
  );

  return row ? toContent(row) : null;
}

export async function recordLoungeActivity(input: LoungeActivityInput) {
  const session = getSession();

  try {
    await restRequest('/lounge_activity_logs', {
      method: 'POST',
      token: session?.access_token,
      body: {
        content_id: input.contentId ?? null,
        user_id: session?.user.id ?? null,
        anonymous_id: input.anonymousId,
        event_type: input.eventType,
        event_payload: input.eventPayload ?? {},
      },
      headers: {
        Prefer: 'return=minimal',
      },
    });
  } catch {
    // Activity logging must never block lounge navigation.
  }
}
