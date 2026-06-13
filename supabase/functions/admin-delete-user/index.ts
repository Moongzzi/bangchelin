type DeleteUserRequest = {
  userId?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function readJson<T>(request: Request) {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ message: 'Supabase function environment is not configured.' }, 500);
  }

  if (!authorization) {
    return jsonResponse({ message: 'Authentication is required.' }, 401);
  }

  const callerResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: authorization,
    },
  });

  if (!callerResponse.ok) {
    return jsonResponse({ message: 'Invalid admin session.' }, 401);
  }

  const caller = await callerResponse.json() as { id?: string };
  const callerId = caller.id;

  if (!callerId) {
    return jsonResponse({ message: 'Invalid admin session.' }, 401);
  }

  const payload = await readJson<DeleteUserRequest>(request);
  const targetUserId = payload.userId?.trim();

  if (!targetUserId) {
    return jsonResponse({ message: 'userId is required.' }, 400);
  }

  if (targetUserId === callerId) {
    return jsonResponse({ message: 'You cannot delete your own admin account.' }, 400);
  }

  const adminProfileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(callerId)}&select=id,role&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!adminProfileResponse.ok) {
    return jsonResponse({ message: 'Failed to verify admin permission.' }, 500);
  }

  const adminProfiles = await adminProfileResponse.json() as Array<{ role?: string }>;
  if (adminProfiles[0]?.role !== 'admin') {
    return jsonResponse({ message: 'Admin permission is required.' }, 403);
  }

  const targetProfileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}&select=id,username,nickname,role&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!targetProfileResponse.ok) {
    return jsonResponse({ message: 'Failed to verify target user.' }, 500);
  }

  const targetProfiles = await targetProfileResponse.json() as Array<{
    username?: string;
    nickname?: string;
    role?: string;
  }>;
  const targetProfile = targetProfiles[0];

  if (!targetProfile) {
    return jsonResponse({ message: 'Target user was not found.' }, 404);
  }

  const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    return jsonResponse({ message: errorText || 'Failed to delete user.' }, 500);
  }

  const logResponse = await fetch(`${supabaseUrl}/rest/v1/user_activity_logs`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: callerId,
      action_type: 'admin.users.delete',
      source: 'edge_function',
      method: 'DELETE',
      endpoint: `auth.users/${targetUserId}`,
      success: true,
      entity_type: 'auth.users',
      entity_id: targetUserId,
      metadata: {
        target_username: targetProfile.username ?? null,
        target_nickname: targetProfile.nickname ?? null,
        target_role: targetProfile.role ?? null,
      },
    }),
  });

  if (!logResponse.ok) {
    return jsonResponse({ ok: true, auditLogged: false });
  }

  return jsonResponse({ ok: true, auditLogged: true });
});
