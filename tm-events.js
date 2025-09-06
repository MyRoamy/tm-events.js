// api/tm-events.js — Discovery proxy with sensible defaults
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const base = process.env.TICKETMASTER_BASE_URL || "https://app.ticketmaster.com/discovery/v2";
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const affiliateId = process.env.TICKETMASTER_AFFILIATE_ID;
    if (!apiKey) return res.status(500).json({ error: "Missing TICKETMASTER_API_KEY" });

    // today (UTC) and forward
    const today = new Date().toISOString().split("T")[0];
    const startDateTime = `${today}T00:00:00Z`;

    const url = new URL(`${base}/events.json`);
    url.searchParams.set("apikey", apiKey);
    if (affiliateId) url.searchParams.set("aid", affiliateId);
    url.searchParams.set("startDateTime", startDateTime);
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("size", "20");
    url.searchParams.set("locale", "*");           // match all locales
    url.searchParams.set("preferredCountry", "us"); // popularity boost

    // allow safe passthrough filters
    const q = req.query || {};
    const allow = ["city","stateCode","countryCode","postalCode","keyword","geoPoint","radius","unit","size","page","sort","endDateTime","segmentName","classificationName"];
    for (const k of allow) if (q[k]) url.searchParams.set(k, String(q[k]));

    // if no location provided at all, default to US
    const hasLocation = q.city || q.stateCode || q.countryCode || q.postalCode || q.geoPoint;
    if (!hasLocation) url.searchParams.set("countryCode", "US");

    const upstream = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const data = await upstream.json();
    res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
