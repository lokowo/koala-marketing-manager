import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const ALLOWED_FIELDS = [
  'is_discoverable', 'city', 'looking_for', 'interests', 'about_me',
  'pets', 'weekend_activities', 'relationship_status', 'age_range',
];

// GET — current user's social profile
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('ola_social_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[social-profile GET]', error);
      return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return Response.json({ profile: data ?? null });
  } catch (error) {
    console.error('[social-profile GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — update (or create) social profile
export async function PUT(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Only allow whitelisted fields
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    // Check if profile exists
    const { data: existing } = await db
      .from('ola_social_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      const { error } = await db
        .from('ola_social_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('[social-profile PUT update]', error);
        return Response.json({ error: 'Failed to update profile' }, { status: 500 });
      }
    } else {
      // Create new profile
      const isDiscoverable = updates.is_discoverable ?? false;
      const { error } = await db
        .from('ola_social_profiles')
        .insert({
          user_id: user.id,
          ...updates,
          is_discoverable: isDiscoverable,
          opt_in_at: isDiscoverable ? new Date().toISOString() : null,
        });

      if (error) {
        console.error('[social-profile PUT insert]', error);
        return Response.json({ error: 'Failed to create profile' }, { status: 500 });
      }
    }

    // Fetch updated profile
    const { data: updated } = await db
      .from('ola_social_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return Response.json({ profile: updated });
  } catch (error) {
    console.error('[social-profile PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
