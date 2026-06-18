import http from "http";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.REPORTING_NINJA_BASE_URL || "https://api.reportingninja.com/v1";

const ALLOWED_INTEGRATIONS = [
  "ga4",
  "google_ads",
  "google_search_console",
  "google_business_profile",
  "facebook_ads",
  "facebook_insights",
  "instagram_insights"
];

async function rnPost(path, body = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPORTING_NINJA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return await response.json();
}

async function getAllConnections() {
  const results = {};

  for (const integration_id of ALLOWED_INTEGRATIONS) {
    results[integration_id] = await rnPost("/connections", {
      integration_id
    });
  }

  return results;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        message: "Reporting Ninja connection tester is running",
        available_routes: [
          "/connections",
          "/connections/google_ads",
          "/connections/facebook_ads",
          "/connections/ga4",
          "/connections/google_search_console",
          "/connections/google_business_profile",
          "/connections/facebook_insights",
          "/connections/instagram_insights"
        ]
      }, null, 2));
      return;
    }

    if (url.pathname === "/connections") {
      const data = await getAllConnections();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (url.pathname.startsWith("/connections/")) {
      const integration_id = url.pathname.split("/")[2];

      if (!ALLOWED_INTEGRATIONS.includes(integration_id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Integration not allowed or not configured"
        }, null, 2));
        return;
      }

      const data = await rnPost("/connections", { integration_id });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "Route not found" }, null, 2));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: error.message }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
