// api/tm-events.js
module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const base = process.env.TICKETMASTER_BASE_URL || "https://app.ticketmaster.com/discovery/v2";
    const apiKey =
      process.env.TICKETMASTER_API_KEY ||
      process.env.TM_API_KEY; // support both names
    const affiliateId =
      process.env.TICKETMASTER_AFFILIATE_ID ||
      process.env.TM_AFFILIATE_ID ||
      process.env.AFFILIATE_ID ||
      "";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing Ticketmaster API key (set TICKETMASTER_API_KEY or TM_API_KEY)" });
    }

    // Build upstream URL
    const url = new URL(`${base}/events.json`);
    url.searchParams.set("apikey", apiKey);
    if (affiliateId) url.searchParams.set("aid", affiliateId);

    // Defaults only if client didn't provide them
    const today = new Date().toISOString().split("T")[0];
    const defaultStart = `${today}T00:00:00Z`;
    const defaults = { startDateTime: defaultStart, sort: "date,asc", size: "20" };

    // Allowlist of pass-through params (now includes startDateTime)
    const allow = [
      "city","stateCode","countryCode","postalCode","keyword",
      "geoPoint","radius","unit","size","page","sort",
      "startDateTime","endDateTime"
    ];

    for (const [k, v] of Object.entries(defaults)) {
      if (!req.query[k]) url.searchParams.set(k, v);
    }
    for (const k of allow) {
      if (req.query[k] != null) url.searchParams.set(k, String(req.query[k]));
    }

    const upstream = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const txt = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).setHeader("Content-Type", "application/json").send(txt);
    }
    res.status(200).setHeader("Content-Type", "application/json").send(txt);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
};
