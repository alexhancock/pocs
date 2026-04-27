import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, "../public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "frontend" });
});

app.listen(PORT, () => {
  console.log(`🎨 Frontend server running on http://localhost:${PORT}`);
});
