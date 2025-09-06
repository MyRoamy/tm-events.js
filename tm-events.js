// api/tm-events.js  (CommonJS; no package.json needed)
module.exports = async (req, res) => {
  // CORS (keep simple for now)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const base = process.env.TICKETMASTER_BASE_URL || "https://app.ticketmaster.com/discovery/v2";
    const apiKey = process.env.TICKETMASTER_API_KEY;          // set in Vercel
    const affiliateId = process.env.TICKETMASTER_AFFILIATE_ID; // set in Vercel
    if (!apiKey) return res.status(500).json({ error: "Missing TICKETMASTER_API_KEY" });

    const today = new Date().toISOString().split("T")[0];
    const startDateTime = `${today}T00:00:00Z`;

    const url = new URL(`${base}/events.json`);
    url.searchParams.set("apikey", apiKey);
    if (affiliateId) url.searchParams.set("aid", affiliateId);
    url.searchParams.set("startDateTime", startDateTime);
    url.searchParams.set("sort", "date,asc");
    url.searchParams.set("size", "20");

    const allow = ["city","stateCode","countryCode","postalCode","keyword","geoPoint","radius","unit","size","page","sort","endDateTime"];
    for (const k of allow) if (req.query[k]) url.searchParams.set(k, String(req.query[k]));

    const r = await fetch(url.toString());
    const data = await r.json();

    const nowISO = new Date().toISOString();
    const events = (data?._embedded?.events || []).filter(e => {
      const dt = e?.dates?.start?.dateTime;
      return dt && dt >= nowISO;
    });

    res.status(200).json({ ...data, _embedded: { events } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
