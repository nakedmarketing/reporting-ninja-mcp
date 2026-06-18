import http from "http";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.REPORTING_NINJA_BASE_URL || "https://api.reportingninja.com/v1";

const TEST_CLIENT = {
  client_name: "Sunshine Joinery",
  integration_id: "google_ads",
  connection_key: "hello@nakedmarketing.co",
  account_id: "7250547764"
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        message: "Reporting Ninja test server is running",
        routes: [
          "/sunshine/fields",
          "/sunshine/query"
        ]
      }, null, 2));
      return;
    }

    if (url.pathname === "/sunshine/fields") {
      const data = await rnPost("/fields", {
        integration_id: TEST_CLIENT.integration_id,
        data_view: "campaign"
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    if (url.pathname === "/sunshine/query") {
      const data = await rnPost("/query", {
        integration_id: TEST_CLIENT.integration_id,
        connection_key: TEST_CLIENT.connection_key,
        account_id: TEST_CLIENT.account_id,
        data_view: "campaign",
        fields: [
          "campaign.name",
          "metrics.impressions",
          "metrics.clicks",
          "metrics.cost_micros",
          "metrics.conversions"
        ],
        date_range: {
          preset: "custom",
          start: "2026-05-01",
          end: "2026-05-31"
        },
        limit: 100
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
