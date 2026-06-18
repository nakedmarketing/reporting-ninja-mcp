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
