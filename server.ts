import express from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { Mod, DiscordConfig, AdsConfig, SiteSettings } from "./src/types.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies up to 10MB (to allow some screenshot transfers or metadata size)
app.use(express.json({ limit: "10mb" }));

// Custom simple cookie parser middleware
app.use((req, res, next) => {
  const cookiesHeader = req.headers.cookie || "";
  const cookies: { [key: string]: string } = {};
  cookiesHeader.split(";").forEach((cookieStr) => {
    const parts = cookieStr.split("=");
    if (parts.length === 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });
  // Attach parsed cookies to request
  (req as any).cookies = cookies;
  next();
});

// Configure Database directory and path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  mods: Mod[];
  discord: DiscordConfig;
  ads: AdsConfig;
  settings: SiteSettings;
}

// Default completely empty / initial structures as requested
const DEFAULT_DB: DatabaseSchema = {
  mods: [],
  discord: {
    url: "https://discord.gg/example",
    label: "Join our Discord",
    isEnabled: false,
  },
  ads: {
    header: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" },
    content: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" },
    footer: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" },
  },
  settings: {
    heroTitle: "AscendX",
    heroSubtitle: "Get curated and verified mods from my videos in one click",
    whyTitle: "Why AscendX?",
    whyDescription: "All mods have been personally verified, filtered for safety, and categorized without annoying popups or shady links.",
    whyPoints: [
      "100% Curated and Safe Links",
      "Zero adware or shady redirects",
      "Tested and Verified Minecraft Compatibility",
      "Featured directly in YouTube tutorials",
    ],
    logoText: "AscendX",
  },
};

let dbCache: DatabaseSchema = { ...DEFAULT_DB };

// Load or Initialize database on startup
async function initDatabase() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DB_PATH, "utf-8");
      dbCache = JSON.parse(content);
    } catch {
      // Create if it doesn't exist
      await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
      dbCache = { ...DEFAULT_DB };
    }
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

async function saveDatabase() {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(dbCache, null, 2), "utf-8");
  } catch (err) {
    console.error("Database saving failed:", err);
  }
}

// Admin configuration derived from environment variables
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "noirripper03@gmail.com").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ascendx123";

// Generate password pbkdf2 hash salt and verification on server startup
const PASSWORD_SALT = crypto.randomBytes(32).toString("hex");
const HASHED_ADMIN_PASSWORD = crypto
  .pbkdf2Sync(ADMIN_PASSWORD, PASSWORD_SALT, 10000, 64, "sha512")
  .toString("hex");

// Sessions in memory
const activeSessions = new Map<string, { email: string; expires: number }>();

// Rate limiting for repeated login attempts
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

// Helper function to check auth
function isSessionValid(req: express.Request): boolean {
  let token = "";
  
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers["x-session-token"]) {
    token = String(req.headers["x-session-token"]).trim();
  } else {
    // Fallback to cookie parser
    token = (req as any).cookies?.session_token || "";
  }

  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// Middleware to secure administrator API endpoints
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (isSessionValid(req)) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized access — Admin privileges required" });
  }
};

// --- AUTHENTICATION API ---

// Public Status Check
app.get("/api/auth/status", (req, res) => {
  const isOk = isSessionValid(req);
  res.json({ loggedIn: isOk, email: isOk ? ADMIN_EMAIL : null });
});

// Admin Login Route
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();

  // Check rate limiting / lockout
  const attempt = loginAttempts.get(normalizedEmail);
  if (attempt && attempt.lockUntil > now) {
    const minsLeft = Math.ceil((attempt.lockUntil - now) / 60000);
    res.status(429).json({
      error: `Too many failed login attempts. Authentication locked for ${minsLeft} minutes.`,
    });
    return;
  }

  // Check credentials
  const inputHash = crypto
    .pbkdf2Sync(password, PASSWORD_SALT, 10000, 64, "sha512")
    .toString("hex");

  if (normalizedEmail === ADMIN_EMAIL && inputHash === HASHED_ADMIN_PASSWORD) {
    // Reset rate-limiting attempt counter
    loginAttempts.delete(normalizedEmail);

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = now + 24 * 60 * 60 * 1000; // 24 hours
    activeSessions.set(token, { email: normalizedEmail, expires });

    // Set cookie
    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, email: normalizedEmail, token });
  } else {
    // Increment rate limiter
    const currentCount = attempt ? attempt.count + 1 : 1;
    let lockUntil = 0;
    
    if (currentCount >= 5) {
      lockUntil = now + 15 * 60 * 1000; // 15 minutes lockout
    }

    loginAttempts.set(normalizedEmail, {
      count: currentCount,
      lockUntil,
    });

    if (currentCount >= 5) {
      res.status(429).json({
        error: "Too many failed login attempts. Authentication has been locked for 15 minutes.",
      });
    } else {
      res.status(401).json({
        error: `Invalid email or password. Attempt ${currentCount} of 5 before standard security lock.`,
      });
    }
  }
});

// Admin Logout Route
app.post("/api/auth/logout", (req, res) => {
  let token = (req as any).cookies?.session_token || "";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers["x-session-token"]) {
    token = String(req.headers["x-session-token"]).trim();
  }
  
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie("session_token");
  res.json({ success: true, message: "Logged out successfully" });
});


// --- PUBLIC DATA APIs ---

// Fetch mods list
app.get("/api/mods", (req, res) => {
  res.json(dbCache.mods);
});

// Fetch modern public configurations
app.get("/api/settings", (req, res) => {
  // Return configuration cache data (exclude any password details)
  res.json({
    settings: dbCache.settings,
    discord: dbCache.discord,
    ads: dbCache.ads,
  });
});


// --- SECURE ADMINISTRATIVE APIs ---

// Mods CRUD endpoints
app.post("/api/mods", requireAdmin, async (req, res) => {
  const { name, description, version, mcVersion, thumbnail, screenshot, downloadLink, youtubeLink, category, tags } = req.body;

  if (!name || !description || !version || !mcVersion || !downloadLink || !category) {
    res.status(400).json({ error: "Missing required mod attributes" });
    return;
  }

  const newMod: Mod = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    description: String(description).trim(),
    version: String(version).trim(),
    mcVersion: String(mcVersion).trim(),
    thumbnail: String(thumbnail || "").trim(),
    screenshot: String(screenshot || "").trim(),
    downloadLink: String(downloadLink).trim(),
    youtubeLink: youtubeLink ? String(youtubeLink).trim() : undefined,
    category: category,
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()) : [],
    createdAt: new Date().toISOString(),
  };

  dbCache.mods.push(newMod);
  await saveDatabase();

  res.status(201).json(newMod);
});

app.put("/api/mods/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const modIndex = dbCache.mods.findIndex((m) => m.id === id);

  if (modIndex === -1) {
    res.status(404).json({ error: "Mod/Modpack not found" });
    return;
  }

  const { name, description, version, mcVersion, thumbnail, screenshot, downloadLink, youtubeLink, category, tags } = req.body;

  const existingMod = dbCache.mods[modIndex];
  const updatedMod: Mod = {
    ...existingMod,
    name: name !== undefined ? String(name).trim() : existingMod.name,
    description: description !== undefined ? String(description).trim() : existingMod.description,
    version: version !== undefined ? String(version).trim() : existingMod.version,
    mcVersion: mcVersion !== undefined ? String(mcVersion).trim() : existingMod.mcVersion,
    thumbnail: thumbnail !== undefined ? String(thumbnail).trim() : existingMod.thumbnail,
    screenshot: screenshot !== undefined ? String(screenshot).trim() : existingMod.screenshot,
    downloadLink: downloadLink !== undefined ? String(downloadLink).trim() : existingMod.downloadLink,
    youtubeLink: youtubeLink !== undefined ? (youtubeLink ? String(youtubeLink).trim() : undefined) : existingMod.youtubeLink,
    category: category !== undefined ? category : existingMod.category,
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()) : existingMod.tags,
  };

  dbCache.mods[modIndex] = updatedMod;
  await saveDatabase();

  res.json(updatedMod);
});

app.delete("/api/mods/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const initialLength = dbCache.mods.length;
  dbCache.mods = dbCache.mods.filter((m) => m.id !== id);

  if (dbCache.mods.length === initialLength) {
    res.status(404).json({ error: "Mod/Modpack not found" });
    return;
  }

  await saveDatabase();
  res.json({ success: true, id });
});

// Update Site Settings
app.put("/api/settings", requireAdmin, async (req, res) => {
  const { heroTitle, heroSubtitle, whyTitle, whyDescription, whyPoints, logoText } = req.body;

  dbCache.settings = {
    heroTitle: heroTitle !== undefined ? String(heroTitle).trim() : dbCache.settings.heroTitle,
    heroSubtitle: heroSubtitle !== undefined ? String(heroSubtitle).trim() : dbCache.settings.heroSubtitle,
    whyTitle: whyTitle !== undefined ? String(whyTitle).trim() : dbCache.settings.whyTitle,
    whyDescription: whyDescription !== undefined ? String(whyDescription).trim() : dbCache.settings.whyDescription,
    whyPoints: Array.isArray(whyPoints) ? whyPoints.map((p) => String(p).trim()).filter(Boolean) : dbCache.settings.whyPoints,
    logoText: logoText !== undefined ? String(logoText).trim() : dbCache.settings.logoText,
  };

  await saveDatabase();
  res.json(dbCache.settings);
});

// Update Discord config
app.put("/api/discord", requireAdmin, async (req, res) => {
  const { url, label, isEnabled } = req.body;

  dbCache.discord = {
    url: url !== undefined ? String(url).trim() : dbCache.discord.url,
    label: label !== undefined ? String(label).trim() : dbCache.discord.label,
    isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : dbCache.discord.isEnabled,
  };

  await saveDatabase();
  res.json(dbCache.discord);
});

// Update Ads config
app.put("/api/ads", requireAdmin, async (req, res) => {
  const { header, content, footer } = req.body;

  if (header) {
    dbCache.ads.header = {
      isEnabled: header.isEnabled !== undefined ? Boolean(header.isEnabled) : dbCache.ads.header.isEnabled,
      type: header.type || dbCache.ads.header.type,
      code: header.code !== undefined ? String(header.code) : dbCache.ads.header.code,
      imageUrl: header.imageUrl !== undefined ? String(header.imageUrl) : dbCache.ads.header.imageUrl,
      linkUrl: header.linkUrl !== undefined ? String(header.linkUrl) : dbCache.ads.header.linkUrl,
    };
  }

  if (content) {
    dbCache.ads.content = {
      isEnabled: content.isEnabled !== undefined ? Boolean(content.isEnabled) : dbCache.ads.content.isEnabled,
      type: content.type || dbCache.ads.content.type,
      code: content.code !== undefined ? String(content.code) : dbCache.ads.content.code,
      imageUrl: content.imageUrl !== undefined ? String(content.imageUrl) : dbCache.ads.content.imageUrl,
      linkUrl: content.linkUrl !== undefined ? String(content.linkUrl) : dbCache.ads.content.linkUrl,
    };
  }

  if (footer) {
    dbCache.ads.footer = {
      isEnabled: footer.isEnabled !== undefined ? Boolean(footer.isEnabled) : dbCache.ads.footer.isEnabled,
      type: footer.type || dbCache.ads.footer.type,
      code: footer.code !== undefined ? String(footer.code) : dbCache.ads.footer.code,
      imageUrl: footer.imageUrl !== undefined ? String(footer.imageUrl) : dbCache.ads.footer.imageUrl,
      linkUrl: footer.linkUrl !== undefined ? String(footer.linkUrl) : dbCache.ads.footer.linkUrl,
    };
  }

  await saveDatabase();
  res.json(dbCache.ads);
});


// Start server initialization process and link middleware
async function startServer() {
  await initDatabase();

  // Vite development middleware or production static asset configuration
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up development Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    console.log("Serving production build from dist...");
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AscendX server running on port ${PORT}`);
  });
}

startServer();
