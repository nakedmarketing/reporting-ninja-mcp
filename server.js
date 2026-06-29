import http from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.REPORTING_NINJA_BASE_URL || "https://api.reportingninja.com/v1";

const ALLOWED_INTEGRATIONS = [
  "ga4",
  "google_ads",
  "google_search_console",
  "google_business_profile",
  "facebook_ads",
  "facebook_insights",
  "linkedin_pages",
  "instagram_insights"
];

const CLIENT_ALIASES = {
  "Auckland Curling Club": [
    "Auckland Curling",
    "Auckland Curling Club",
    "Website"
  ],

  "Cowperthwaite Roofing": [
    "Cowperthwaite Roofing",
    "Cowperthwaite Roofing - Roofing Company (35N Maurice Road - Auckland)",
    "Auckland Roofing"
  ],

  "Immigration Insurance": [
    "Immigration Insurance",
    "BRC Advice",
    "BRC Advice - Personal & Business Risk Insurance Advisers"
  ],

  "Collab Interiors": [
    "Collab Interiors",
    "Collab Industries",
    "Hayley O'Connor | Interior Design Studio + Home Staging",
    "Hayley O’Connor | Interior Design Studio + Home Staging"
  ],

  "Doric": [
    "Doric",
    "Doric (26/C Triton Drive - North Harbour)",
    "Doric New Zealand",
    "doric.co.nz"
  ],

  "Tarpaulin Makers": [
    "GA4 - Tarpaulin Makers",
    "Tarpaulin Makers",
    "Tarpaulin Makers (B.O.P) Limited (CURRENT)",
    "Tarpaulin Makers BOP",
    "TarpMakers"
  ],

  "Garden Lights": [
    "Garden Lighting Ads",
    "Garden Lights - GA4 (Active)",
    "gardenlights.co.nz",
    "NM-Garden-Lights-NZ",
    "The Garden Lighting Company",
    "The Garden Lighting Company (764 South Titirangi Road - Auckland)"
  ],

  "Halogen Avenue": [
    "Halogen Avenue",
    "Halogen Avenue Commercial AV and Lighting Solutions (12/40 Arrenway Drive - Auckland)"
  ],

  "IVECO": [
    "IVECO",
    "Iveco New Zealand",
    "IVECO Retail",
    "Iveco NZ",
    "IVECO NZ",
    "IVECO1",
    "IVECO New Zealand Vans, Trucks & Buses / Sales, Service & Parts (1 Jerry Green Street - Auckland)"
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

  "The Defib Store": [
    "The Defib Store",
    "The Defib Store NZ",
    "thedefibstore.co.nz - GA4"
  ],

  "RUSA Construction": [
    "Rusa",
    "Rusa Construction",
    "RUSA Construction"
  ],

  "Sunshine Joinery": [
    "Sunshine Joinery"
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
const EXCLUDED_CLIENT_NAMES = [
  "Tarpaulin Makers - GA4 (don't use)",

  "AB Hair",
  "AB Hair & Makeup",
  "AB HAIR AND MAKEUP/ Hairsalon / Brownsbay / NZ",
  "AB Hair Salon Browns Bay (Shop No.9, 92 Clyde Rd - Auckland)",
  "abhairandmakeup.co.nz - GA4",

  "Allied Flooring Retail",
  "Allied Flooring Retail - GA4",
  "Absolute Kitchens",
  "Aperol Spritz",
  "Balanced Spine",
  "Balanced Spine - GA4",
  "balancedspine.co.nz",
  "Better Building",
  "Better Building - Certified Builders Auckland (241D Rosedale Road - Auckland)",
  "Better Building - GA4",
  "Boardman Removals",
  "Boardman_removals",
  "Boardmans Transport - GA4",
  "Change Hypnosis",
  "Craftsmen Grinding",
  "Craftsmen Grinding (45 Croft Lane, Riverhead - Auckland)",
  "Creative Displays",
  "Dream Catchers",
  "Dream Catchers Albany",
  "Dream Catchers Education",
  "Dream Catchers Henderson",
  "Dream Catchers Preschool",
  "DreamCatchers Preschool",
  "DreamCatchers Early Learning Centre",
  "ENS (Explore North Shore)",
  "Explore North Shore - GA4",
  "Explore North Shore NZ",
  "First Rescue",
  "First Rescue NZ Ltd",
  "First Rescue NZ Ltd Roadside Rescue (Level 4, ANZ Raranga Building - Auckland)",
  "firstrescue.co.nz",
  "NM-First-Rescue-NZ",
  "Flying Studio",
  "Flying Studio - GA4",
  "Flying Studio (129 Hurstmere Road - Auckland)",
  "NM-Flying-Studio-NZ",
  "FunctionEight Ltd.",
  "Gear Junkie",
  "Gear Junkie UA - GA4",
  "Glass Case by Plumbob",
  "Half Moon Bay Marina",
  "Half Moon Bay Marina - GA4",
  "Half Moon Bay Marina Auckland",
  "IQ Built",
  "IQBuilt",
  "IQBuilt Ad's",
  "Lulu Hoonhout",
  "Living Chiropractic",
  "NM-Living-Chiropractic-NZ",
  "Luminate Finance",
  "Luminate Finance - GA4",
  "Luminate Home Loans",
  "Luminate Home Loans - GA4",
  "Mello Technologies",
  "www.mello.co.nz - GA4",
  "www.mellodigital.com.au - GA4",
  "Michelle Gill",
  "Mike Ansari",
  "Mike Ansari Life Transformer",
  "Mobile Planet",
  "Mobile Planet (Shore City) (SG23 Mobile Planet - Auckland)",
  "Moving House",
  "Moving House - GA4",
  "NM-Moving-House-NZ",
  "Muriwai Estate",
  "Muriwai Estate New Zealand",
  "Network Migration NZ",
  "Network Migration Services",
  "Network Migration Services (Pty) Ltd (Johannesburg)",
  "NM-Albany-Yoga-Room-NZ",
  "NM-Explore-North-Shore",
  "NM-Total-Roofing-NZ",
  "NM-Windsor-Wealth-NZ",
  "NZ Construction Placements",
  "NZC - New Zealand Car Ltd. (Greenlane, Auckland)",
  "NZC Cars - GA4",
  "Offers.thecrate.co.nz - GA4",
  "www.thecrate.co.nz - GA4",
  "Omni Tech",
  "Omni Tech (Silverdale) (Shop 15 Omni Tech - Auckland)",
  "OMNI TECH SILVERDALE LIMITED",
  "Paper Plus",
  "Paper Plus Whangaparaoa",
  "Paslode ANZ",
  "Peerless Records",
  "People Associates",
  "People Associates (145 Khyber Pass Road - Auckland)",
  "People Associates (OLD)",
  "Peter Mortlock",
  "PSYCH 317 Semester One 2021",
  "Reach Potential",
  "RosterLab",
  "Sïmplé",
  "Sticky Business",
  "Sticky Business - GA4",
  "Stockade",
  "STOCKade",
  "STOCKade Ads",
  "Stockade Fencing Staplers",
  "Stockade Utility Stapler",
  "www.stockade.com - GA4",
  "Stropwinda",
  "Tangos Shoes",
  "Ten Feet Tall",
  "Tenderwins GA4",
  "The-Display-Store",
  "Vespa Auckland",
  "Wikus Erasmus",
  "www.windsorwealth.co.nz",
  "Zoe and Me Dog Walking North Shore"
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
    fields: ["campaign_name", "impressions", "clicks", "spend"],
    settings: {
      attribution_window:
        "ATTRIBUTION_MODEL_VIEW_CLICK###VIEW_ATTRIBUTION_WINDOW_1D###CLICK_ATTRIBUTION_WINDOW_7D"
    }
  },
  ga4: {
    fields: ["sessions", "totalUsers", "conversions", "screenPageViews"]
  },
  google_search_console: {
    fields: ["clicks", "impressions", "ctr", "position"]
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

function cleanClientName(accountName = "") {
  return accountName
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\s*-\s*GA4\s*\(\d+\)\s*$/gi, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();
}

function resolveClientAlias(clientName) {
  for (const [canonicalName, aliases] of Object.entries(CLIENT_ALIASES)) {
    if (aliases.some(alias => alias.toLowerCase() === clientName.toLowerCase())) {
      return canonicalName;
    }
  }

  return clientName;
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
function sumRows(rows = [], field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildReportSummary(performance) {
  const summary = {};

  const ga4Rows = performance.ga4?.response?.data?.rows || [];
  if (ga4Rows.length) {
    summary.ga4 = {
      sessions: sumRows(ga4Rows, "sessions"),
      users: sumRows(ga4Rows, "totalUsers"),
      conversions: sumRows(ga4Rows, "conversions"),
      page_views: sumRows(ga4Rows, "screenPageViews")
    };
  }

  const googleRows = performance.google_ads?.response?.data?.rows || [];
  if (googleRows.length) {
    const impressions = sumRows(googleRows, "metrics.impressions");
    const clicks = sumRows(googleRows, "metrics.clicks");
    const spend = roundNumber(sumRows(googleRows, "metrics.cost_micros"));
    const conversions = sumRows(googleRows, "metrics.conversions");

    summary.google_ads = {
      impressions,
      clicks,
      spend,
      conversions,
      ctr: impressions ? roundNumber((clicks / impressions) * 100) : 0,
      cost_per_conversion: conversions ? roundNumber(spend / conversions) : 0
    };
  }

  const metaRows = performance.facebook_ads?.response?.data?.rows || [];
  if (metaRows.length) {
    const impressions = sumRows(metaRows, "impressions");
    const clicks = sumRows(metaRows, "clicks");
    const spend = roundNumber(sumRows(metaRows, "spend"));

    summary.facebook_ads = {
      impressions,
      clicks,
      spend,
      ctr: impressions ? roundNumber((clicks / impressions) * 100) : 0
    };
  }

  const fbRows = performance.facebook_insights?.response?.data?.rows || [];
  if (fbRows.length) {
    summary.facebook_organic = {
      views: sumRows(fbRows, "page_media_view"),
      page_views: sumRows(fbRows, "page_views_total"),
      engagements: sumRows(fbRows, "page_post_engagements"),
      total_actions: sumRows(fbRows, "page_total_actions"),
      followers: sumRows(fbRows, "page_follows"),
      new_follows: sumRows(fbRows, "page_daily_follows")
    };
  }

  const igRows = performance.instagram_insights?.response?.data?.rows || [];
  if (igRows.length) {
    summary.instagram_organic = {
      views: sumRows(igRows, "views"),
      reach: sumRows(igRows, "reach"),
      accounts_engaged: sumRows(igRows, "accounts_engaged"),
      engagement: sumRows(igRows, "engagement"),
      profile_link_taps: sumRows(igRows, "profile_links_taps")
    };
  }

  return summary;
}

function compareValues(current, previous) {
  const c = roundNumber(current);
  const p = roundNumber(previous);
  const change = roundNumber(c - p);

  return {
    current: c,
    previous: p,
    change,
    change_percent: p ? roundNumber((change / p) * 100) : null
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

async function buildClientDirectory() {
  const allConnections = await getAllConnections();
  const clients = {};

  for (const integration_id of ALLOWED_INTEGRATIONS) {
    const connections = allConnections[integration_id]?.data?.connections || [];

    for (const connection of connections) {
      for (const account of connection.accounts || []) {
        const rawClientName = cleanClientName(account.account_name);

        if (
          EXCLUDED_CLIENT_NAMES.some(
            name => name.toLowerCase() === rawClientName.toLowerCase()
          )
        ) {
          continue;
        }

        const clientName = resolveClientAlias(rawClientName);

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
  const normalised = searchName.toLowerCase();

  return (
    clients.find(client => client.name.toLowerCase() === normalised) ||
    clients.find(client => client.name.toLowerCase().includes(normalised))
  );
}

async function getClientPerformance(client, start, end) {
  const results = {};

  for (const [integration_id, account] of Object.entries(client.integrations)) {
    const config = DEFAULT_FIELDS[integration_id];
    if (!config) continue;

    const queryBody = {
      integration_id,
      connection_key: account.connection_key,
      account_id: account.account_id,
      fields: config.fields,
      date_range: { preset: "custom", start, end },
      limit: 100
    };

    if (config.data_view) queryBody.data_view = config.data_view;
    if (config.settings) queryBody.settings = config.settings;

    const data = await rnPost("/query", queryBody);

    results[integration_id] = {
      account_name: account.account_name,
      account_id: account.account_id,
      connection_key: account.connection_key,
      response: data
    };
  }

  return results;
}

async function getClientReport(clientName, start, end) {
  const clients = await buildClientDirectory();
  const client = findClient(clients, clientName);

  if (!client) {
    throw new Error(`Client not found: ${clientName}`);
  }

  const performance = await getClientPerformance(client, start, end);
  const summary = buildReportSummary(performance);

  return {
    status: "ok",
    client: client.name,
    date_range: { start, end },
    summary
  };
}

async function compareClientPeriods(clientName, current_start, current_end, previous_start, previous_end) {
  const clients = await buildClientDirectory();
  const client = findClient(clients, clientName);

  if (!client) {
    throw new Error(`Client not found: ${clientName}`);
  }

  const currentPerformance = await getClientPerformance(client, current_start, current_end);
  const previousPerformance = await getClientPerformance(client, previous_start, previous_end);

  const currentSummary = buildReportSummary(currentPerformance);
  const previousSummary = buildReportSummary(previousPerformance);

  return {
    status: "ok",
    client: client.name,
    current_period: { start: current_start, end: current_end },
    previous_period: { start: previous_start, end: previous_end },
    current_summary: currentSummary,
    previous_summary: previousSummary,
    comparison: buildComparison(currentSummary, previousSummary)
  };
}

function asText(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

/* MCP SERVER */

function createMcpServer() {
  const mcpServer = new McpServer({
    name: "reporting-ninja",
    version: "1.0.0"
  });

  mcpServer.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description: "List all clients available from Reporting Ninja.",
      inputSchema: {}
    },
    async () => {
      const clients = await buildClientDirectory();
      return asText({
        status: "ok",
        count: clients.length,
        clients: clients.map(client => ({
          name: client.name,
          integrations: Object.keys(client.integrations)
        }))
      });
    }
  );

  mcpServer.registerTool(
    "get_client_report",
    {
      title: "Get Client Report",
      description: "Get a summarised marketing performance report for a client and date range.",
      inputSchema: {
        client_name: z.string(),
        start: z.string(),
        end: z.string()
      }
    },
    async ({ client_name, start, end }) => {
      return asText(await getClientReport(client_name, start, end));
    }
  );

  mcpServer.registerTool(
    "compare_client_periods",
    {
      title: "Compare Client Periods",
      description: "Compare a client's marketing performance across two date ranges.",
      inputSchema: {
        client_name: z.string(),
        current_start: z.string(),
        current_end: z.string(),
        previous_start: z.string(),
        previous_end: z.string()
      }
    },
    async ({ client_name, current_start, current_end, previous_start, previous_end }) => {
      return asText(
        await compareClientPeriods(
          client_name,
          current_start,
          current_end,
          previous_start,
          previous_end
        )
      );
    }
  );

  return mcpServer;
}

/* HTTP SERVER */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/mcp") {
  const mcpServer = createMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
  return;
    }

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        message: "Reporting Ninja MCP server is running",
        mcp_endpoint: "/mcp",
        tools: [
          "list_clients",
          "get_client_report",
          "compare_client_periods"
        ]
      }, null, 2));
      return;
    }

    if (url.pathname === "/clients") {
      const clients = await buildClientDirectory();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", count: clients.length, clients }, null, 2));
      return;
    }

    if (url.pathname.startsWith("/client/") && url.pathname.endsWith("/report")) {
      const clientName = decodeURIComponent(
        url.pathname.replace("/client/", "").replace("/report", "")
      );
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");

      const report = await getClientReport(clientName, start, end);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report, null, 2));
      return;
    }

    if (url.pathname.startsWith("/client/") && url.pathname.endsWith("/compare")) {
      const clientName = decodeURIComponent(
        url.pathname.replace("/client/", "").replace("/compare", "")
      );

      const result = await compareClientPeriods(
        clientName,
        url.searchParams.get("current_start"),
        url.searchParams.get("current_end"),
        url.searchParams.get("previous_start"),
        url.searchParams.get("previous_end")
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result, null, 2));
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
  console.log(`Reporting Ninja MCP server running on port ${PORT}`);
});
