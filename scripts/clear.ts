import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  await supabase.from('ideas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error(error);
  else console.log('All entries and ideas cleared');
}

run();
