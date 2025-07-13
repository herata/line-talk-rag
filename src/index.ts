import { Hono } from "hono";
import { handleClear } from "./clear-handler";
import { handleHealthCheck } from "./health-handler";
import { handlePrepare } from "./prepare-handler";
import type { CloudflareBindings } from "./types";
import { handleWebhook } from "./webhook-handler";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Health check endpoint
app.get("/", handleHealthCheck);

// Enhanced Prepare endpoint - for processing LINE chat history
app.post("/prepare", handlePrepare);

// Clear endpoint - for emptying the Vectorize database
app.delete("/clear", handleClear);

// LINE webhook endpoint
app.post("/webhook", handleWebhook);

export default app;
