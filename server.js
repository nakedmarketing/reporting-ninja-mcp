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

const CLIENT_ALIASES = {
  "IVECO": [
    "IVECO",
    "Iveco New Zealand",
    "IVECO Retail",
    "Iveco NZ",
    "IVECO NZ",
    "IVECO1",
    "IVECO New Zealand Vans, Trucks & Buses / Sales, Service & Parts (1 Jerry Green Street - Auckland)"
  ],

  "AB Hair & Makeup": [
    "AB Hair & Makeup",
    "AB HAIR AND MAKEUP/ Hairsalon / Brownsbay / NZ",
    "AB Hair Salon Browns Bay (Shop No.9, 92 Clyde Rd - Auckland)",
    "abhairandmakeup.co.nz - GA4"
  ],

  "Better Building": [
    "Better Building",
    "Better Building - GA4",
    "Better Building - Certified Builders Auckland (241D Rosedale Road - Auckland)"
  ],

  "BRC Advice": [
  "BRC Advice",
  "BRC Advice - Personal & Business Risk Insurance Advisers"
  ],

  "First Rescue": [
    "First Rescue",
    "First Rescue NZ Ltd",
    "First Rescue NZ Ltd Roadside Rescue (Level 4, ANZ Raranga Building - Auckland)",
    "firstrescue.co.nz",
    "NM-First-Rescue-NZ"
  ],

  "Flying Studio": [
    "Flying Studio",
    "Flying Studio - GA4",
    "Flying Studio (129 Hurstmere Road - Auckland)",
    "NM-Flying-Studio-NZ"
  ],

  "Garden Lighting Company": [
    "Garden Lighting Ads",
    "Garden Lights - GA4 (Active)",
    "gardenlights.co.nz",
    "NM-Garden-Lights-NZ",
    "The Garden Lighting Company",
    "The Garden Lighting Company - Outdoor Lighting Installation Specialists (764 South Titirangi Road - Auckland)"
  ],

  "Milford Shops": [
    "Milford Shops",
    "Milford Shops - GA4",
    "NM-Milford-Shops-NZ"
  ],

  "Naked Marketing": [
    "Naked Marketing",
    "Naked Marketing - GA4",
    "Naked Marketing Agency",
    "Naked Marketing Digital Agency",
    "Naked Marketing Digital Marketing Agency Auckland (12/40 Arrenway Drive - Auckland)",
    "NM-Naked Marketing-NZ",
    "NM AD Account"
  ],

  "Oceania Medical": [
    "Oceania / Defib Store (NM)",
    "Oceania Medical - GA4",
    "Oceania Medical Ltd",
    "Oceania Medical New Zealand"
  ],

  "Dream Catchers": [
    "Dream Catchers Albany",
    "Dream Catchers Education",
    "Dream Catchers Henderson",
    "Dream Catchers Preschool",
    "DreamCatchers Preschool",
    "DreamCatchers Early Learning Centre",
    "NM-Dream-Catchers"
  ],

  "Doric": [
    "Doric (26/C Triton Drive - North Harbour)",
    "Doric New Zealand",
    "doric.co.nz"
  ],

  "IQ Built": [
    "IQ Built",
    "IQBuilt",
    "IQBuilt Ad's"
  ],

  "Stockade": [
    "Stockade",
    "STOCKade",
    "STOCKade Ads",
    "Stockade Fencing Staplers",
    "Stockade Utility Stapler",
    "www.stockade.com - GA4"
  ],

  "The Defib Store": [
    "The Defib Store",
    "The Defib Store NZ",
    "thedefibstore.co.nz - GA4"
  ],

  "Top Sparx": [
    "Top Sparx (NM)",
    "Top Sparx Electrical",
    "Top Sparx landing pages (go.topsparx.co.nz)",
    "www.topsparx.co.nz - GA4"
  ],

  "Trade Products": [
    "Trade Products",
    "Trade Products NZ",
    "www.tradeproducts.co.nz - GA4"
  ]
};

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

function sumRows(rows = [], field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function buildReportSummary(performance) {
  const summary = {};
  function compareValues(current, previous) {
  const change = current - previous;
  const change_percent = previous
    ? Number(((change / previous) * 100).toFixed(2))
    : null;

  return {
    current,
    previous,
    change,
    change_percent
  };
}

function buildComparison(currentSummary, previousSummary) {
  const comparison = {};

  for (const section of Object.keys(currentSummary)) {
    comparison[section] = {};

    for (const metric of Object.keys(currentSummary[section])) {
      comparison[section][metric] = compareValues(
        Number(currentSummary[section][metric] || 0),
        Number(previousSummary?.[section]?.[metric] || 0)
      );
    }
  }

  return comparison;
}

  const ga4Rows = performance.ga4?.response?.data?.rows || [];
  if (ga4Rows.length) {
    summary.ga4 = {
      sessions: sumRows(ga4Rows, "sessions"),
      users: sumRows(ga4Rows, "totalUsers"),
      conversions: sumRows(ga4Rows, "conversions"),
      page_views: sumRows(ga4Rows, "screenPageViews")
    };
  }

  const googleAdsRows = performance.google_ads?.response?.data?.rows || [];
  if (googleAdsRows.length) {
    const impressions = sumRows(googleAdsRows, "metrics.impressions");
    const clicks = sumRows(googleAdsRows, "metrics.clicks");
    const spend = sumRows(googleAdsRows, "metrics.cost_micros");
    const conversions = sumRows(googleAdsRows, "metrics.conversions");

    summary.google_ads = {
      impressions,
      clicks,
      spend,
      conversions,
      ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      cost_per_conversion: conversions ? Number((spend / conversions).toFixed(2)) : 0
    };
  }

  const facebookAdsRows = performance.facebook_ads?.response?.data?.rows || [];
  if (facebookAdsRows.length) {
    const impressions = sumRows(facebookAdsRows, "impressions");
    const clicks = sumRows(facebookAdsRows, "clicks");
    const spend = sumRows(facebookAdsRows, "spend");

    summary.facebook_ads = {
      impressions,
      clicks,
      spend,
      ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0
    };
  }

  const facebookRows = performance.facebook_insights?.response?.data?.rows || [];
  if (facebookRows.length) {
    summary.facebook_organic = {
      views: sumRows(facebookRows, "page_media_view"),
      page_views: sumRows(facebookRows, "page_views_total"),
      engagements: sumRows(facebookRows, "page_post_engagements"),
      total_actions: sumRows(facebookRows, "page_total_actions"),
      followers: sumRows(facebookRows, "page_follows"),
      new_follows: sumRows(facebookRows, "page_daily_follows")
    };
  }

  const instagramRows = performance.instagram_insights?.response?.data?.rows || [];
  if (instagramRows.length) {
    summary.instagram_organic = {
      views: sumRows(instagramRows, "views"),
      reach: sumRows(instagramRows, "reach"),
      accounts_engaged: sumRows(instagramRows, "accounts_engaged"),
      engagement: sumRows(instagramRows, "engagement"),
      profile_link_taps: sumRows(instagramRows, "profile_links_taps")
    };
  }

  return summary;
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
        const clientName = resolveClientAlias(cleanClientName(account.account_name));

        function resolveClientAlias(clientName) {
  for (const [canonicalName, aliases] of Object.entries(CLIENT_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === clientName.toLowerCase())) {
      return canonicalName;
    }
  }

  return clientName;
}

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

    if (config.data_view) {
      queryBody.data_view = config.data_view;
    }

    if (config.settings) {
      queryBody.settings = config.settings;
    }

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
function compareValues(current, previous) {
  const change = current - previous;
  const change_percent = previous
    ? Number(((change / previous) * 100).toFixed(2))
    : null;

  return {
    current,
    previous,
    change,
    change_percent
  };
}
function roundNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

}
function buildComparison(currentSummary, previousSummary) {
  const comparison = {};

  for (const section of Object.keys(currentSummary)) {
    comparison[section] = {};

    for (const metric of Object.keys(currentSummary[section])) {
      comparison[section][metric] = compareValues(
        Number(currentSummary[section][metric] || 0),
        Number(previousSummary?.[section]?.[metric] || 0)
      );
    }
  }

  return comparison;
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
          report: "/client/Sunshine%20Joinery/report?start=2026-05-01&end=2026-05-31",
          connections: "/connections",
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

    if (url.pathname.startsWith("/client/") && url.pathname.endsWith("/report")) {
      const clientName = decodeURIComponent(
        url.pathname.replace("/client/", "").replace("/report", "")
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
      const summary = buildReportSummary(performance);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        client: client.name,
        date_range: { start, end },
        summary
      }, null, 2));
      return;
    }

    if (url.pathname.startsWith("/client/") && url.pathname.endsWith("/compare")) {
  const clientName = decodeURIComponent(
    url.pathname.replace("/client/", "").replace("/compare", "")
  );

  const current_start = url.searchParams.get("current_start");
  const current_end = url.searchParams.get("current_end");
  const previous_start = url.searchParams.get("previous_start");
  const previous_end = url.searchParams.get("previous_end");

  if (!current_start || !current_end || !previous_start || !previous_end) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "error",
      message: "Please provide current_start, current_end, previous_start and previous_end"
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

  const currentPerformance = await getClientPerformance(client, current_start, current_end);
  const previousPerformance = await getClientPerformance(client, previous_start, previous_end);

  const currentSummary = buildReportSummary(currentPerformance);
  const previousSummary = buildReportSummary(previousPerformance);

  const comparison = buildComparison(currentSummary, previousSummary);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    client: client.name,
    current_period: {
      start: current_start,
      end: current_end
    },
    previous_period: {
      start: previous_start,
      end: previous_end
    },
    current_summary: currentSummary,
    previous_summary: previousSummary,
    comparison
  }, null, 2));
  return;
}
    
    if (url.pathname.startsWith("/client/")) {
      const clientName = decodeURIComponent(url.pathname.replace("/client/", ""));
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

      const body = { integration_id };

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

      if (requestBody.settings) {
        queryBody.settings = requestBody.settings;
      }

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
