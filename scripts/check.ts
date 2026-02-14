import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: entries } = await supabase
    .from('entries')
    .select('id, title, day_number, mood, created_at, ideas(id)')
    .order('created_at', { ascending: false });

  if (!entries || entries.length === 0) {
    console.log('No entries yet — still processing...');
  } else {
    entries.forEach((e) => {
      const ideaCount = (e.ideas as unknown[])?.length ?? 0;
      console.log(`Day ${e.day_number}: "${e.title}"`);
      console.log(`  Mood: ${e.mood} | Ideas: ${ideaCount}`);
      console.log(`  Created: ${e.created_at}`);
    });
  }
}

check();
