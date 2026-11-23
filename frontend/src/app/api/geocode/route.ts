import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ found: false, error: "Query is required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q.trim()
    )}&countrycodes=pe&limit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "NextLeadCRM/1.0 (contactos@nextlead.pe)",
        "Accept-Language": "es",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return NextResponse.json({
          found: true,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
        });
      }
    }

    return NextResponse.json({ found: false });
  } catch (err: any) {
    console.error("Geocoding API error:", err);
    return NextResponse.json({ found: false, error: err.message }, { status: 500 });
  }
}
