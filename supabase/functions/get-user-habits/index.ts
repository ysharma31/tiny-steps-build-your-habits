import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPECTED_API_KEY = "iamhabitualiamspiritual2026";

serve(async (req) => {
  const apiKey = req.headers.get("X-Api-Key");
  if (apiKey !== EXPECTED_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId) throw new Error("Missing userId");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: habits, error } = await supabase
    .from("habits")
    .select("id, name, streak")
    .eq("user_id", userId)
    .eq("archived", false);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ habits: habits || [] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
