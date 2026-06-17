import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CalendarParticipantRow = {
  status: 'confirmed' | 'waitlisted' | string | null;
};

type CalendarEventRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: string;
  category: string;
  location_region: string | null;
  location_detail: string;
  capacity: number;
  external_guest_count: number;
  description: string | null;
  is_all_day: boolean;
  calendar_event_participants?: CalendarParticipantRow[];
};

function getEventUrl(eventId: string) {
  const siteUrl = Deno.env.get('BANGCHELIN_SITE_URL') ?? 'https://bangchelin.com';
  const url = new URL('/calendar', siteUrl);
  url.searchParams.set('event', eventId);
  return url.toString();
}

Deno.serve(async (req) => {
  // Basic CORS (adjust as needed)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = req.headers.get('x-api-key');
  const expected = Deno.env.get('EXTERNAL_API_KEY');

  if (!expected) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: EXTERNAL_API_KEY not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey || apiKey !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      'id, title, start_date, end_date, start_time, end_time, status, category, location_region, location_detail, capacity, external_guest_count, description, is_all_day, calendar_event_participants(status)'
    )
    .eq('status', 'recruiting')
    .order('start_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const events = ((data ?? []) as CalendarEventRow[]).map(({ calendar_event_participants, ...event }) => {
    const confirmedParticipantCount = (calendar_event_participants ?? []).filter(
      (participant) => (participant.status ?? 'confirmed') === 'confirmed',
    ).length;
    const waitlistedParticipantCount = (calendar_event_participants ?? []).filter(
      (participant) => participant.status === 'waitlisted',
    ).length;
    const participantCount = confirmedParticipantCount + event.external_guest_count;

    return {
      ...event,
      participant_count: participantCount,
      confirmed_participant_count: confirmedParticipantCount,
      waitlisted_participant_count: waitlistedParticipantCount,
      remaining_capacity: Math.max(event.capacity - participantCount, 0),
      event_url: getEventUrl(event.id),
    };
  });

  return new Response(JSON.stringify({ data: events }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
