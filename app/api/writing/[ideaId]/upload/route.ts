import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { ideaId: string } }
) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  // Namespace by user so upload paths aren't guessable across accounts.
  const fileName = `${user.id}/${params.ideaId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("writing-images")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("writing-images")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: urlData.publicUrl });
}
