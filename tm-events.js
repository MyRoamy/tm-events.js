// Minimal Ticketmaster proxy (future-only via startDateTime). No post-filter.
module.exports = async (req, res) => {
  // CORS (open while testing; lock down later if you want)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const base = process.env.TICKETMASTER_BASE_URL || "https://app.ticketmaster.com/discovery/v2";
    const apiKey = process.env.TICKETMASTER_API_KEY;            // set in Vercel
    const affiliateId = process.env.TICKETMASTER_AFFILIATE_ID;  // set in Vercel (5640500)
    if (!apiKey) return res.status(500).json({ error: "Missing TICKETMASTER_API_KEY" });

    // Today at 00:00 UTC — this alone guarantees no past events
    const today = new Date().toISOString().split("T")[0];
    const startDateTime = `${today}T00:00:00Z`;

    // Build upstream request
    const url = new URL(`${base}/events.json`);
    url.searchParams.set("apikey", apiKey);
    if (affiliateId) url.searchParams.set("aid", affiliateId);
    url.searchParams.set("startDateTime", startDateTime);
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("size", "20");
    // Be explicit so TBA/TBD dates don’t sneak in:
    url.searchParams.set("includeTBA", "no");
    url.searchParams.set("includeTBD", "no");

    // Allow safe passthrough filters
    const allow = [
      "city","stateCode","countryCode","postalCode",
      "keyword","geoPoint","radius","unit",
      "size","page","sort","endDateTime"
    ];
    for (const k of allow) if (req.query[k]) url.searchParams.set(k, String(req.query[k]));

    const upstream = await fetch(url.toString());
    const data = await upstream.json();

    // ❌ Removed the extra “drop past events” filter.
    // Ticketmaster already enforced startDateTime >= today.

    res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
