import http from "http";

const PORT = process.env.PORT || 3000;

async function getConnections() {
  const response = await fetch(
    "https://api.reportingninja.com/v1/connections",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPORTING_NINJA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        integration_id: "google_ads"
      })
    }
  );

  return await response.json();
}

const server = http.createServer(async (req, res) => {
  try {
    const data = await getConnections();

    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(data, null, 2));
  } catch (error) {
    res.writeHead(500, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        error: error.message
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
