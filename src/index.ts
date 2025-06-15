import { Hono } from "hono";
import { handleHealthCheck } from "./health-handler";
import { handlePrepare } from "./prepare-handler";
import type { CloudflareBindings } from "./types";
import { handleWebhook } from "./webhook-handler";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Health check endpoint
app.get("/", handleHealthCheck);

// Enhanced Prepare endpoint - for processing LINE chat history
app.post("/prepare", handlePrepare);

// LINE webhook endpoint
app.post("/webhook", handleWebhook);

export default app;
