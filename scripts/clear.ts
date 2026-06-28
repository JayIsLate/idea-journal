import { createClient } from '@supabase/supabase-js';
import { getOwnerUserId } from '../lib/supabase/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // Scope deletes to the owner so this can never wipe another user's data.
  const ownerId = await getOwnerUserId();
  if (!ownerId) {
    console.error('Owner not found — sign in with Google first.');
    process.exit(1);
  }
  await supabase.from('ideas').delete().eq('user_id', ownerId);
  const { error } = await supabase.from('entries').delete().eq('user_id', ownerId);
  if (error) console.error(error);
  else console.log("All of the owner's entries and ideas cleared");
}

run();
