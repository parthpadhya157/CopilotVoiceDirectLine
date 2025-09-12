import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Copilot Studio Direct Line Token URL
// Put your actual token URL into .env file as COPILOT_TOKEN_URL
const COPILOT_TOKEN_URL = process.env.COPILOT_TOKEN_URL;

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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
