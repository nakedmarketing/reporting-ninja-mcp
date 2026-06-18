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

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
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
        message: "Reporting Ninja API bridge is running",
        routes: {
          all_connections: "/connections",
          single_connection: "/connections/google_ads",
          fields: "/fields/google_ads?data_view=campaign",
          query: "/query"
        }
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
          message: "Integration not allowed"
        }, null, 2));
        return;
      }

      const data = await rnPost("/connections", { integration_id });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (url.pathname.startsWith("/fields/")) {
      const integration_id = url.pathname.split("/")[2];
      const data_view = url.searchParams.get("data_view");

      if (!ALLOWED_INTEGRATIONS.includes(integration_id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Integration not allowed"
        }, null, 2));
        return;
      }

      const body = {
        integration_id
      };

      if (data_view) {
        body.data_view = data_view;
      }

      const data = await rnPost("/fields", body);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (url.pathname === "/query") {
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Use POST for /query"
        }, null, 2));
        return;
      }

      const requestBody = await readJsonBody(req);

      if (!ALLOWED_INTEGRATIONS.includes(requestBody.integration_id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Integration not allowed"
        }, null, 2));
        return;
      }

      const data = await rnPost("/query", {
        integration_id: requestBody.integration_id,
        connection_key: requestBody.connection_key,
        account_id: requestBody.account_id,
        data_view: requestBody.data_view,
        fields: requestBody.fields,
        date_range: {
          preset: "custom",
          start: requestBody.start,
          end: requestBody.end
        },
        limit: requestBody.limit || 100
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "error",
      message: "Route not found"
    }, null, 2));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "error",
      message: error.message
    }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
