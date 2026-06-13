import { getSession, restRequest } from '../../shared/api/supabaseRest';
import { loungePreviewNodes } from './mock/loungeNodes.mock';
import type {
  LoungeAccessLevel,
  LoungeContentType,
  LoungeDisplayMode,
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
  eventType: 'view_mode_change' | 'node_click' | 'locked_node_click' | 'coming_soon_click';
  eventPayload?: Record<string, unknown>;
};

type LoungeSettingsRow = {
  id: string;
  map_background_url: string | null;
  map_background_mode: 'css' | 'image';
};

function toContent(row: LoungeContentRow) {
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
      '/lounge_content_nodes?is_enabled=eq.true&select=id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags)&order=sort_order.asc',
      {
        token: session?.access_token,
      },
    );

    const nodes = rows
      .map(toLoungeNode)
      .filter((node): node is LoungeNode => Boolean(node));

    return nodes.length ? nodes : loungePreviewNodes;
  } catch {
    return loungePreviewNodes;
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
