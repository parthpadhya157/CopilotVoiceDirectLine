import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copilot Studio Direct Line Token URL
// Put your actual token URL into .env file as COPILOT_TOKEN_URL
const COPILOT_TOKEN_URL = process.env.COPILOT_TOKEN_URL;

// Serve the static files from the Vite build
app.use(express.static(path.join(__dirname, "dist")));

// API endpoint for the Direct Line token
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

// For any other requests, serve the main index.html file
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});