import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-81535eb2/health", (c) => {
  return c.json({ status: "ok" });
});

// GET route to fetch testimonials from KV store
app.get("/make-server-81535eb2/testimonials", async (c) => {
  try {
    const data = await kv.get("testimonials");
    // If the key doesn't exist, return an empty array
    if (!data) {
      return c.json([]);
    }
    // Handle both stringified JSON and raw objects (since KV uses JSONB)
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    return c.json(parsedData);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return c.json({ error: "Failed to fetch testimonials" }, 500);
  }
});

// Optional POST route to make it easy to bulk-insert your JSON later
app.post("/make-server-81535eb2/testimonials", async (c) => {
  try {
    const body = await c.req.json();
    if (!Array.isArray(body)) {
      return c.json({ error: "Expected a JSON array of testimonials" }, 400);
    }
    // Store the array directly (JSONB column handles objects)
    await kv.set("testimonials", body);
    return c.json({ success: true, count: body.length });
  } catch (error) {
    console.error("Error saving testimonials:", error);
    return c.json({ error: "Failed to save testimonials" }, 500);
  }
});

Deno.serve(app.fetch);