const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const API_KEY = process.env.API_SECRET_KEY;

if (!API_KEY) {
  console.error("Missing API_SECRET_KEY environment variable");
  process.exit(1);
}

const transcriptions = [
  {
    day_number: 1,
    date: "2025-01-15",
    transcription: `Good morning, it's day one of this experiment. I've been thinking a lot about how I capture ideas throughout the day and I realize most of them just disappear. Like yesterday I had this great thought about building a tool that converts voice memos into structured notes, and I almost forgot about it by the afternoon.

So here's what I'm thinking. First, I want to build some kind of personal idea tracker. Not like a to-do app, more like a garden where ideas can grow. Each morning I'll do a brain dump like this, and then some AI processes it and pulls out the actual ideas, categorizes them, and gives me suggestions for next steps.

I'm also thinking about content creation. I've been wanting to start a newsletter about the intersection of AI and personal productivity. Something weekly, maybe called "The Morning Process" or something like that. I think there's a real audience for people who want to use AI tools but in a thoughtful, intentional way.

Oh, and one more thing - I had a conversation with Marcus yesterday about potentially doing some freelance consulting for startups that want to integrate AI into their workflows. That could be a nice revenue stream and would force me to stay sharp on the latest tools and techniques.

Feeling pretty energized today. Let's see where this goes.`,
  },
  {
    day_number: 3,
    date: "2025-01-17",
    transcription: `Day three. Woke up early, couldn't sleep because I kept thinking about the idea journal app. I actually sketched out some wireframes on my iPad last night. The key insight is that it shouldn't just be a list of ideas - it should show how ideas connect to each other and evolve over time.

I've been reflecting on the newsletter concept from day one. I think instead of making it about AI and productivity broadly, I should narrow the focus. What if it's specifically about using AI for creative work? Like how writers, designers, and musicians are actually using these tools in their practice. That feels more authentic to what I care about.

Technical thought - I want to explore using Supabase for the backend of the idea journal. It has real-time subscriptions which could be cool for seeing ideas update live. Also thinking about whether to use Next.js or just go with a simple static site. Leaning towards Next.js because I might want API routes later.

I'm also starting to think about the consulting angle differently. Instead of general AI consulting, what if I created a specific workshop format? Like a half-day "AI Integration Sprint" where I help a team identify their top 3 AI opportunities and build prototypes for one of them. That's more productized and easier to sell.

Mood today is more reflective than yesterday. Less raw energy, more focused thinking. I think that's a good sign.`,
  },
];

async function seed() {
  for (const entry of transcriptions) {
    console.log(`Seeding Day ${entry.day_number}...`);
    const res = await fetch(`${BASE_URL}/api/entry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY!,
      },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to seed Day ${entry.day_number}:`, err);
    } else {
      const data = await res.json();
      console.log(
        `Day ${entry.day_number} seeded: "${data.title}" with ${data.ideas?.length ?? 0} ideas`
      );
    }
  }
  console.log("Seeding complete!");
}

seed();
