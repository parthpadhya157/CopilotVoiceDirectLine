import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Copilot Studio Direct Line Token URL (from .env in Render dashboard)
const COPILOT_TOKEN_URL = process.env.COPILOT_TOKEN_URL;

// Helper for resolving __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== API route: proxy for Direct Line token =====
app.get("/api/directline/token", async (req, res) => {
  try {
    const response = await fetch(COPILOT_TOKEN_URL);
    if (!response.ok) {
      throw new Error(`Copilot token fetch failed: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Token proxy error:", err);
    res.status(500).json({ error: "Failed to fetch token" });
  }
});

// ===== Serve React frontend =====
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Fallback: let React handle client-side routes (works in Express 5)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
