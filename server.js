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

const DEFAULT_FIELDS = {
  google_ads: {
    data_view: "campaign",
    fields: [
      "campaign.name",
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions"
    ]
  },

  facebook_ads: {
    fields: [
      "campaign_name",
      "impressions",
      "clicks",
      "spend"
    ],
    settings: {
      attribution_window:
        "ATTRIBUTION_MODEL_VIEW_CLICK###VIEW_ATTRIBUTION_WINDOW_1D###CLICK_ATTRIBUTION_WINDOW_7D"
    }
  },

  ga4: {
    fields: [
      "sessions",
      "totalUsers",
      "conversions",
      "screenPageViews"
    ]
  },

  google_search_console: {
    fields: [
      "clicks",
      "impressions",
      "ctr",
      "position"
    ]
  },

  google_business_profile: {
    data_view: "performance",
    fields: [
      "business_impressions",
      "call_clicks",
      "website_clicks",
      "business_direction_requests"
    ]
  },

  facebook_insights: {
    data_view: "page",
    fields: [
      "page_media_view",
      "page_views_total",
      "page_post_engagements",
      "page_total_actions",
      "page_follows",
      "page_daily_follows"
    ]
  },

  instagram_insights: {
    data_view: "account",
    fields: [
      "views",
      "reach",
      "accounts_engaged",
      "engagement",
      "profile_links_taps"
    ]
  }
};

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
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function cleanClientName(accountName = "") {
  return accountName
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\s*-\s*GA4\s*\(\d+\)\s*$/gi, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();
}

async function getAllConnections() {
  const results = {};

  for (const integration_id of ALLOWED_INTEGRATIONS) {
    results[integration_id] = await rnPost("/connections", { integration_id });
  }

  return results;
}

async function buildClientDirectory() {
  const allConnections = await getAllConnections();
  const clients = {};

  for (const integration_id of ALLOWED_INTEGRATIONS) {
    const integrationResponse = allConnections[integration_id];
    const connections = integrationResponse?.data?.connections || [];

    for (const connection of connections) {
      const accounts = connection.accounts || [];

      for (const account of accounts) {
        const clientName = cleanClientName(account.account_name);

        if (!clientName) continue;

        if (!clients[clientName]) {
          clients[clientName] = {
            name: clientName,
            integrations: {}
          };
        }

        clients[clientName].integrations[integration_id] = {
          integration_id,
          connection_key: connection.connection_key,
          connection_name: connection.connection_name,
          account_id: account.account_id,
          account_name: account.account_name,
          currency: account.currency || null,
          status: connection.status
        };
      }
    }
  }

  return Object.values(clients).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function findClient(clients, searchName) {
  const normalizedSearch = searchName.toLowerCase();

  return (
    clients.find(client => client.name.toLowerCase() === normalizedSearch) ||
    clients.find(client => client.name.toLowerCase().includes(normalizedSearch))
  );
}

async function getClientPerformance(client, start, end) {
  const results = {};

  for (const [integration_id, account] of Object.entries(client.integrations)) {
    const config = DEFAULT_FIELDS[integration_id];

    if (!config) {
      results[integration_id] = {
        status: "skipped",
        message: "No default fields configured yet for this integration"
      };
      continue;
    }

    const queryBody = {
      integration_id,
      connection_key: account.connection_key,
      account_id: account.account_id,
      fields: config.fields,
      date_range: {
        preset: "custom",
        start,
        end
      },
      limit: 100
    };

    if (config.data_view) queryBody.data_view = config.data_view;
    if (config.settings) queryBody.settings = config.settings;

    const data = await rnPost("/query", queryBody);

    results[integration_id] = {
      account_name: account.account_name,
      account_id: account.account_id,
      connection_key: account.connection_key,
      query: queryBody,
      response: data
    };
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
          clients: "/clients",
          single_client: "/client/Sunshine%20Joinery",
          performance: "/client/Sunshine%20Joinery/performance?start=2026-05-01&end=2026-05-31",
          all_connections: "/connections",
          fields: "/fields/google_ads?data_view=campaign",
          query: "/query"
        }
      }, null, 2));
      return;
    }

    if (url.pathname === "/clients") {
      const clients = await buildClientDirectory();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        count: clients.length,
        clients
      }, null, 2));
      return;
    }

    if (url.pathname.startsWith("/client/") && url.pathname.endsWith("/performance")) {
      const clientName = decodeURIComponent(
        url.pathname.replace("/client/", "").replace("/performance", "")
      );

      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");

      if (!start || !end) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "Please provide start and end dates"
        }, null, 2));
        return;
      }

      const clients = await buildClientDirectory();
      const client = findClient(clients, clientName);

      if (!client) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: `Client not found: ${clientName}`
        }, null, 2));
        return;
      }

      const performance = await getClientPerformance(client, start, end);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        client: client.name,
        date_range: { start, end },
        performance
      }, null, 2));
      return;
    }

    if (url.pathname.startsWith("/client/")) {
      const clientName = decodeURIComponent(url.pathname.replace("/client/", ""));
      const clients = await buildClientDirectory();
      const client = findClient(clients, clientName);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", client }, null, 2));
      return;
    }

    if (url.pathname === "/connections") {
      const data = await getAllConnections();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (url.pathname.startsWith("/fields/")) {
      const integration_id = url.pathname.split("/")[2];
      const data_view = url.searchParams.get("data_view");

      const body = { integration_id };
      if (data_view) body.data_view = data_view;

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

      const queryBody = {
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
      };

      if (requestBody.settings) queryBody.settings = requestBody.settings;

      const data = await rnPost("/query", queryBody);

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
