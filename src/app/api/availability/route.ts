import { NextResponse, type NextRequest } from "next/server";
import { getAvailabilityEntries } from "@/lib/data/public";

/** Live occupied ranges for the calendar (no customer data). Never cached. */
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  try {
    const entries = await getAvailabilityEntries(from, to);
    return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 503 });
  }
}
