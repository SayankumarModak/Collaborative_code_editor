import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const ALLOWED_DOMAINS = [
  "dummyjson.com",
  "jsonplaceholder.typicode.com",
  "api.github.com",];

// Max 1MB response (prevents memory crashes)
const MAX_RESPONSE_SIZE = 1 * 1024 * 1024;

router.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  console.log("Proxy request received for:", targetUrl);

  try {
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url query param" });
    }

    const parsedUrl = new URL(targetUrl);
    const { hostname, protocol } = parsedUrl;

    if (
      !ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))
    ) {
      console.error("Blocked proxy request to:", hostname);
      return res.status(403).json({ error: "Domain not allowed" });
    }

    // Timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let agent;
    try {
      if (protocol === "https:") {
        const https = await import("https");
        agent = new https.Agent({ keepAlive: true });
      } else {
        const http = await import("http");
        agent = new http.Agent({ keepAlive: true });
      }
    } catch {
      agent = undefined;
    }

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      agent,
    });

    console.log(response, "response");

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Upstream error:", response.status);
      return res.status(response.status).send("Upstream error");
    }

    // STREAM response safely with size limit
    let data = "";
    let size = 0;

    for await (const chunk of response.body) {
      size += chunk.length;

      if (size > MAX_RESPONSE_SIZE) {
        console.error("Proxy response exceeded size limit");
        return res.status(413).send("Response too large");
      }

      data += chunk.toString();
    }

    console.log("Proxy fetch succeeded", { status: response.status, size });
    res.status(200).send(data);
  } catch (err) {
    console.error("Proxy error fetching:", targetUrl, err.message);

    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Proxy timeout" });
    }

    res.status(502).json({ error: "Proxy fetch failed", details: err.message });
  }
});

export default router;
