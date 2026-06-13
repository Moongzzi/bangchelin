import { getSession, restRequest, uploadStorageObject } from '../../shared/api/supabaseRest';
import type {
  LoungeAccessLevel,
  LoungeContentType,
  LoungeDisplayMode,
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

export type LoungeAssetKind = 'pin' | 'card';

function getRequiredSession() {
  const session = getSession();

  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }

  return session;
}

function normalizeContent(row: LoungeContentRow) {
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
    '/lounge_content_nodes?select=id,content_id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags)&order=sort_order.asc',
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
    `/lounge_content_nodes?id=eq.${nodeId}&select=id,content_id,is_enabled,display_mode,zone,map_x,map_y,node_label,node_icon_url,node_variant,node_theme_color,sort_order,lounge_contents(id,slug,title,subtitle,summary,content_type,access_level,route_path,thumbnail_url,tags)`,
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
