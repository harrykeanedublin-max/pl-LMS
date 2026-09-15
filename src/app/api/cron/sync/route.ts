import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncFromFootballData } from "@/lib/sync";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncFromFootballData();
    revalidatePath("/fixtures");
    revalidatePath("/standings");
    revalidatePath("/picks");
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
