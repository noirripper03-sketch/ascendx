import React, { useState, useEffect } from "react";
import {
  Download,
  Youtube,
  Settings as SettingsIcon,
  Shield,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare,
  LogOut,
  Sliders,
  Tv,
  CheckCircle,
  Tag,
  Search,
  Filter,
  X,
  Lock,
  Loader,
  AlertCircle,
  Image,
  Layers,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import { Mod, DiscordConfig, AdsConfig, SiteSettings } from "./types.js";
import AdContainer from "./components/AdContainer.js";
import ModDetailModal from "./components/ModDetailModal.js";

export default function App() {
  // Navigation / Routing state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [queryView, setQueryView] = useState("");

  // Public state
  const [mods, setMods] = useState<Mod[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    heroTitle: "AscendX",
    heroSubtitle: "Get curated and verified mods from my videos in one click",
    whyTitle: "Why AscendX?",
    whyDescription: "All mods have been personally verified, filtered for safety, and categorized without annoying popups or shady links.",
    whyPoints: [
      "100% Curated and Safe Links",
      "Zero adware or shady redirects",
      "Tested and Verified Minecraft Compatibility",
      "Featured directly in YouTube tutorials"
    ],
    logoText: "AscendX"
  });
  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({
    url: "https://discord.gg/example",
    label: "Join our Discord",
    isEnabled: false
  });
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    header: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" },
    content: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" },
    footer: { isEnabled: false, type: "custom", code: "", imageUrl: "", linkUrl: "" }
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Mod" | "Modpack">("All");

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("ascendx_session_token");
  });

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = sessionToken || localStorage.getItem("ascendx_session_token");
    if (token) {
      options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`
      };
    }
    return fetch(url, options);
  };

  // Admin dashboard state
  const [adminTab, setAdminTab] = useState<"mods" | "discord" | "ads" | "settings">("mods");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Mod Creation/Edit Form State
  const [isModFormOpen, setIsModFormOpen] = useState(false);
  const [editingModId, setEditingModId] = useState<string | null>(null);
  const [modForm, setModForm] = useState({
    name: "",
    description: "",
    version: "",
    mcVersion: "",
    thumbnail: "",
    screenshot: "",
    downloadLink: "",
    youtubeLink: "",
    category: "Modpack" as "Mod" | "Modpack" | "Both",
    tagsInput: ""
  });

  // Load and check address bar variables
  useEffect(() => {
    // Standard URL query fallback to override path since iframe can block manual pathname changes
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view) {
      setQueryView(view);
    }

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      const updatedParams = new URLSearchParams(window.location.search);
      setQueryView(updatedParams.get("view") || "");
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Fetch initial public configs and mods
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resMods, resSettings] = await Promise.all([
        authenticatedFetch("/api/mods"),
        authenticatedFetch("/api/settings")
      ]);

      if (resMods.ok) {
        const data = await resMods.json();
        setMods(data);
      }
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.settings) setSettings(data.settings);
        if (data.discord) setDiscordConfig(data.discord);
        if (data.ads) setAdsConfig(data.ads);
      }
    } catch (err) {
      console.error("Error loading data from AscendX server", err);
    } finally {
      setLoading(false);
    }
  };

  // Check admin state on mount
  const checkAdminStatus = async () => {
    try {
      const response = await authenticatedFetch("/api/auth/status");
      if (response.ok) {
        const data = await response.json();
        setIsAdminLoggedIn(data.loggedIn);
        if (data.loggedIn && data.email) {
          setAdminEmail(data.email);
        }
      }
    } catch (err) {
      console.error("Auth status query failed", err);
    }
  };

  useEffect(() => {
    fetchData();
    checkAdminStatus();
  }, []);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Admin Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        setAdminEmail(data.email);
        if (data.token) {
          localStorage.setItem("ascendx_session_token", data.token);
          setSessionToken(data.token);
        }
        setLoginPassword("");
        setLoginEmail("");
        triggerToast("Administrator session created. Welcome back!", "success");
      } else {
        setLoginError(data.error || "Authentication failed. Incorrect email or password.");
      }
    } catch (err) {
      setLoginError("Could not reach verification server. Please retry in a few moments.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch("/api/auth/logout", { method: "POST" });
      setIsAdminLoggedIn(false);
      setAdminEmail("");
      setSessionToken(null);
      localStorage.removeItem("ascendx_session_token");
      triggerToast("Logged out successfully.", "success");
    } catch (err) {
      triggerToast("Error ending sessions.", "error");
    }
  };

  // MOD CRUD ACTION SUBMISSION
  const handleModSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!modForm.name || !modForm.description || !modForm.version || !modForm.mcVersion || !modForm.downloadLink) {
      triggerToast("Please populate all required fields", "error");
      return;
    }

    const parsedTags = modForm.tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      name: modForm.name,
      description: modForm.description,
      version: modForm.version,
      mcVersion: modForm.mcVersion,
      thumbnail: modForm.thumbnail,
      screenshot: modForm.screenshot,
      downloadLink: modForm.downloadLink,
      youtubeLink: modForm.youtubeLink || undefined,
      category: modForm.category,
      tags: parsedTags
    };

    try {
      const url = editingModId ? `/api/mods/${editingModId}` : "/api/mods";
      const method = editingModId ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        triggerToast(
          editingModId ? "Mod/Modpack updated successfully" : "New entry listed successfully",
          "success"
        );
        setIsModFormOpen(false);
        setEditingModId(null);
        setModForm({
          name: "",
          description: "",
          version: "",
          mcVersion: "",
          thumbnail: "",
          screenshot: "",
          downloadLink: "",
          youtubeLink: "",
          category: "Modpack",
          tagsInput: ""
        });
        fetchData();
      } else {
        const errData = await res.json();
        triggerToast(errData.error || "Failed to commit changes", "error");
      }
    } catch (err) {
      triggerToast("Network communication failed", "error");
    }
  };

  const startEditMod = (mod: Mod) => {
    setEditingModId(mod.id);
    setModForm({
      name: mod.name,
      description: mod.description,
      version: mod.version,
      mcVersion: mod.mcVersion,
      thumbnail: mod.thumbnail || "",
      screenshot: mod.screenshot || "",
      downloadLink: mod.downloadLink,
      youtubeLink: mod.youtubeLink || "",
      category: mod.category,
      tagsInput: mod.tags ? mod.tags.join(", ") : ""
    });
    setIsModFormOpen(true);
  };

  const deleteMod = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this listing permanently from AscendX?")) return;

    try {
      const res = await authenticatedFetch(`/api/mods/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Listing deleted successfully", "success");
        fetchData();
      } else {
        triggerToast("Failed to delete the chosen listing", "error");
      }
    } catch (err) {
      triggerToast("Network communication error", "error");
    }
  };

  // DISCORD BUTTON MUTATION
  const [discordForm, setDiscordForm] = useState({ ...discordConfig });
  useEffect(() => {
    setDiscordForm({ ...discordConfig });
  }, [discordConfig]);

  const saveDiscordConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authenticatedFetch("/api/discord", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordForm)
      });
      if (res.ok) {
        triggerToast("Discord settings customized successfully");
        setDiscordConfig(discordForm);
      } else {
        triggerToast("Failed to update Discord configurations", "error");
      }
    } catch (err) {
      triggerToast("Connection failed", "error");
    }
  };

  // ADS CONFIGURATION MUTATION
  const [adsForm, setAdsForm] = useState({ ...adsConfig });
  useEffect(() => {
    setAdsForm({ ...adsConfig });
  }, [adsConfig]);

  const saveAdsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authenticatedFetch("/api/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsForm)
      });
      if (res.ok) {
        triggerToast("Ad slot configuration updated successfully");
        setAdsConfig({ ...adsForm });
      } else {
        triggerToast("Failed to adjust Ad settings", "error");
      }
    } catch (err) {
      triggerToast("Could not contact server", "error");
    }
  };

  // SITE SETTINGS CONFIGURATION MUTATION
  const [settingsForm, setSettingsForm] = useState({
    ...settings,
    whyPointsText: settings.whyPoints.join("\n")
  });
  useEffect(() => {
    setSettingsForm({
      ...settings,
      whyPointsText: settings.whyPoints.join("\n")
    });
  }, [settings]);

  const saveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPoints = settingsForm.whyPointsText
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean);

    try {
      const res = await authenticatedFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroTitle: settingsForm.heroTitle,
          heroSubtitle: settingsForm.heroSubtitle,
          whyTitle: settingsForm.whyTitle,
          whyDescription: settingsForm.whyDescription,
          whyPoints: parsedPoints,
          logoText: settingsForm.logoText
        })
      });

      if (res.ok) {
        triggerToast("General Site branding and settings successfully updated");
        setSettings({
          heroTitle: settingsForm.heroTitle,
          heroSubtitle: settingsForm.heroSubtitle,
          whyTitle: settingsForm.whyTitle,
          whyDescription: settingsForm.whyDescription,
          whyPoints: parsedPoints,
          logoText: settingsForm.logoText
        });
      } else {
        triggerToast("Failed to update site configurations", "error");
      }
    } catch (err) {
      triggerToast("Connection interrupted", "error");
    }
  };

  // Helper filters for public browse mods
  const filteredMods = mods.filter(mod => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      mod.name.toLowerCase().includes(query) ||
      mod.description.toLowerCase().includes(query) ||
      (mod.tags && mod.tags.some(t => t.toLowerCase().includes(query)));

    if (selectedCategory === "All") return matchesSearch;
    return mod.category === selectedCategory && matchesSearch;
  });

  // Determines whether we show public hub or admin page
  const isViewingAdmin = currentPath === "/admin" || queryView === "admin";

  const renderPublicView = () => {
    return (
      <div className="w-full flex-1 flex flex-col gap-6" id="public-main-content">
        {/* Ad Placement: Header Banner */}
        <AdContainer slot={adsConfig.header} placement="header" />

        {/* Bento Grid layout */}
        <div className="grid grid-cols-12 gap-5" id="bento-grid-root">
          
          {/* Bento Cell 1: HERO CONTAINER (Col-span 12 on mobile, 7 on md/lg) */}
          <div className="col-span-12 md:col-span-7 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/80 rounded-3xl p-6 md:p-8 flex flex-col justify-center relative overflow-hidden group min-h-[340px]" id="bento-hero">
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500 opacity-[0.03] blur-[110px] pointer-events-none group-hover:scale-110 transition duration-1000" />
            <div className="flex items-center space-x-2 text-xs font-mono tracking-widest text-emerald-400 uppercase mb-4">
              <span className="inline-block w-2-h-2 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
              Verified Modpacks Hub
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-4 uppercase text-white font-display">
              {settings.heroTitle}
            </h1>
            <p className="text-zinc-400 max-w-md text-sm md:text-base leading-relaxed mb-6">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href="#mods-section"
                className="bg-emerald-500 text-black px-6 py-3 rounded-full font-bold text-sm tracking-wide shadow-[0_4px_22px_rgba(16,185,129,0.22)] hover:bg-emerald-400 active:scale-95 transition-all"
                id="btn-browse-hero"
              >
                Browse Mods
              </a>
              <div className="px-5 py-3 rounded-full border border-zinc-800 bg-zinc-900/30 text-xs md:text-sm font-semibold text-zinc-300">
                ⭐ Checked and clean
              </div>
            </div>
          </div>

          {/* Bento Cell 2: WHY ASCENDX (Col-span 12 on mobile, 5 on md/lg) */}
          <div className="col-span-12 md:col-span-5 bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 md:p-8 flex flex-col justify-between" id="bento-why-us">
            <div>
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 font-mono">
                {settings.whyTitle}
              </h2>
              <p className="text-xs text-zinc-400 mb-5 leading-normal">
                {settings.whyDescription}
              </p>
            </div>
            
            <div className="space-y-2.5">
              {settings.whyPoints.map((point, index) => {
                const colors = ["text-emerald-400 bg-emerald-500/10", "text-blue-400 bg-blue-500/10", "text-amber-400 bg-amber-500/10", "text-purple-400 bg-purple-500/10"];
                const icons = ["✓", "⚡", "✦", "✔"];
                const colorIdx = index % colors.length;
                return (
                  <div key={index} className="flex gap-3 p-2.5 bg-zinc-950/45 rounded-2xl border border-zinc-905/30 hover:border-zinc-800 transition">
                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs ${colors[colorIdx]}`}>
                      {icons[colorIdx]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200 leading-normal">{point}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bento Cell 3: ON-CLICK CRITICAL BANNER STATEMENT */}
          <div className="col-span-12 bg-gradient-to-r from-zinc-900 via-emerald-950/20 to-zinc-900 border border-zinc-800/90 rounded-2xl p-5 md:p-6 text-center relative overflow-hidden" id="bento-critical-banner">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-bold block mb-1">
              Guaranteed One-Click Experience
            </span>
            <p className="text-base sm:text-lg md:text-xl font-bold text-white uppercase tracking-tight">
              "Download a full modpack from any of my videos in just one click."
            </p>
          </div>

          {/* MODS LISTING MAIN BAR SECTION */}
          <div className="col-span-12 space-y-4" id="mods-section">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-zinc-800/60">
              <div>
                <h2 className="text-2xl font-black uppercase text-white font-display">
                  Curation Listings
                </h2>
                <p className="text-xs text-zinc-400">
                  Select a card box to reveal installation guides, game compatibility info, and YouTube content reference walkovers.
                </p>
              </div>

              {/* SEARCH ENGINE & CATEGORIES */}
              <div className="flex flex-wrap items-center gap-2 md:self-end">
                {/* Text Filter input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search featured packs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-60 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    id="mods-search-input"
                  />
                </div>

                {/* Category filters */}
                <div className="flex border border-zinc-800 bg-zinc-950 p-1 rounded-lg">
                  {(["All", "Mod", "Modpack"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                        selectedCategory === cat
                          ? "bg-emerald-500 text-black font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                      id={`filter-cat-${cat}`}
                    >
                      {cat === "All" ? "All types" : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Empty States / Placed Grid */}
            {filteredMods.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="empty-slots-bento-grid">
                {/* Require: Nothing pre-listed, empty default. Render design slot placeholders */}
                {[1, 2, 3, 4].map((slotIdx) => (
                  <div
                    key={slotIdx}
                    className="bg-zinc-950/40 border border-dashed border-zinc-800/60 rounded-3xl p-10 flex flex-col items-center justify-center text-zinc-700 min-h-[220px]"
                    id={`empty-mod-slot-${slotIdx}`}
                  >
                    <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800/50 mb-3 opacity-60">
                      <Layers className="w-5 h-5 text-zinc-600" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                      Mod Slot Available
                    </span>
                    <p className="text-[10px] text-zinc-600 text-center mt-1 max-w-xs">
                      No mods uploaded. Customize in administrative mode
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="populated-mods-grid">
                {filteredMods.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => setSelectedMod(mod)}
                    className="group bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all duration-300 flex flex-col"
                    id={`mod-card-${mod.id}`}
                  >
                    {/* Thumbnail banner section */}
                    <div className="relative w-full h-36 bg-zinc-950 overflow-hidden">
                      {mod.thumbnail ? (
                        <img
                          src={mod.thumbnail}
                          alt={mod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                          <Layers className="w-8 h-8" />
                        </div>
                      )}
                      
                      {/* Meta pills on upper thumbnail */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                        <span className="text-[9px] font-mono font-bold bg-zinc-950/80 backdrop-blur border border-zinc-800 text-emerald-400 px-2 py-0.5 rounded-full">
                          MC {mod.mcVersion}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-zinc-950/80 backdrop-blur border border-zinc-805 text-zinc-300 px-2 py-0.5 rounded-full">
                          v{mod.version}
                        </span>
                      </div>

                      {/* Video Link badge */}
                      {mod.youtubeLink && (
                        <div className="absolute top-2.5 right-2.5 bg-red-600 p-1 rounded">
                          <Youtube className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Information Context */}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {mod.name}
                        </h3>
                        <span className="text-[8px] font-mono shrink-0 uppercase border border-zinc-800 rounded bg-zinc-950 px-1 py-0.5 text-zinc-500 font-bold">
                          {mod.category === "Both" ? "Mod &pack" : mod.category}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 flex-1 leading-normal">
                        {mod.description}
                      </p>

                      {/* Display Tag clips */}
                      {mod.tags && mod.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 mb-1">
                          {mod.tags.slice(0, 3).map((tg, keyIdx) => (
                            <span key={keyIdx} className="text-[9px] font-mono text-zinc-500 bg-zinc-950/50 px-1.5 py-0.5 rounded border border-zinc-850">
                              #{tg}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Simple download trigger */}
                      <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs text-emerald-400 font-semibold group-hover:text-emerald-300">
                        <span>Get Download Link</span>
                        <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-[1px] transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad Placement: In-Content (Between sections) */}
          <div className="col-span-12">
            <AdContainer slot={adsConfig.content} placement="content" />
          </div>

          {/* Bento Cell 4: DISCORD INVITATION / CREATORS HUB */}
          {discordConfig.isEnabled && (
            <div className="col-span-12 bg-zinc-900/60 border border-purple-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6" id="bento-discord-invite">
              <div className="space-y-1 text-center md:text-left">
                <div className="text-[10px] tracking-wider uppercase text-purple-400 font-mono flex items-center justify-center md:justify-start">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping mr-1"></span>
                  Creators & developers Welcome
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase font-display tracking-tight">
                  Join our Discord Server
                </h3>
                <p className="text-xs text-zinc-400 max-w-lg leading-normal">
                  Want your minecraft customized client features, mods, or premium curated packs evaluated and featured on AscendX? Drop your files and chat with the team.
                </p>
              </div>
              <a
                href={discordConfig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl tracking-wide transition shadow-lg shadow-indigo-950/35 self-stretch md:self-center justify-center"
                id="link-discord-join"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{discordConfig.label}</span>
              </a>
            </div>
          )}

        </div>

        {/* Ad Placement: Footer */}
        <AdContainer slot={adsConfig.footer} placement="footer" />
      </div>
    );
  };

  const renderAdminView = () => {
    if (!isAdminLoggedIn) {
      return (
        <div className="max-w-md w-full mx-auto my-12" id="admin-login-panel">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 select-none bg-emerald-500" />
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Administrator Portal</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Please enter your credentials below to authenticate.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@ascendx.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  id="admin-login-email"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500">
                    Password
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono select-none">
                    PBKDF2 Secured
                  </span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  id="admin-login-password"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition text-black font-bold text-xs uppercase tracking-widest py-3 rounded-lg focus:outline-none flex justify-center items-center"
                id="admin-login-submit"
              >
                {loginSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Access Terminal</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-center">
              <span className="text-[10px] text-zinc-600 font-mono block">
                HTTPS Encryption Required
              </span>
              <button
                onClick={() => {
                  // Direct bypass back to public layout
                  const params = new URLSearchParams(window.location.search);
                  params.delete("view");
                  window.history.pushState({}, "", "/");
                  setCurrentPath("/");
                  setQueryView("");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 mt-2 hover:underline focus:outline-none"
              >
                Return to Public Hub
              </button>
            </div>
          </div>
        </div>
      );
    }

    // AUTHENTICATED ADMIN LAYOUT
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6" id="authenticated-admin-panel">
        
        {/* Terminal Header Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 mb-6 border-b border-zinc-900">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">
                Terminal: authenticated_admin
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              Session user: <span className="text-slate-300 font-semibold">{adminEmail}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                // Return to main page view
                const params = new URLSearchParams(window.location.search);
                params.delete("view");
                window.history.pushState({}, "", "/");
                setCurrentPath("/");
                setQueryView("");
              }}
              className="px-4 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
            >
              Public Preview
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition flex items-center space-x-1"
              id="admin-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 bg-zinc-900/60 p-1 rounded-xl mb-6 max-w-xl">
          <button
            onClick={() => setAdminTab("mods")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              adminTab === "mods" ? "bg-emerald-500 text-black font-bold shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Manage Listings
          </button>
          <button
            onClick={() => setAdminTab("discord")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              adminTab === "discord" ? "bg-emerald-500 text-black font-bold shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Discord Button
          </button>
          <button
            onClick={() => setAdminTab("ads")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              adminTab === "ads" ? "bg-emerald-500 text-black font-bold shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Manage Ads
          </button>
          <button
            onClick={() => setAdminTab("settings")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              adminTab === "settings" ? "bg-emerald-500 text-black font-bold shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            Site Settings
          </button>
        </div>

        {/* Tab 1: Mods / Modpacks CRUD */}
        {adminTab === "mods" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-zinc-900/30 p-4 border border-zinc-900 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">Mods database</h3>
                <p className="text-xs text-zinc-500">Currently hosting {mods.length} listings</p>
              </div>
              <button
                onClick={() => {
                  setEditingModId(null);
                  setModForm({
                    name: "",
                    description: "",
                    version: "",
                    mcVersion: "",
                    thumbnail: "",
                    screenshot: "",
                    downloadLink: "",
                    youtubeLink: "",
                    category: "Modpack",
                    tagsInput: ""
                  });
                  setIsModFormOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 transition text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5"
                id="create-new-mod-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Create Listing</span>
              </button>
            </div>

            {/* List Table of existing mods */}
            {mods.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-zinc-805 rounded-2xl">
                <p className="text-sm text-zinc-500">No records exist in database. Register a Minecraft mod or pack to start.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-zinc-900/30 border border-zinc-900 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] uppercase font-mono tracking-wider text-zinc-550 bg-zinc-900/60">
                      <th className="p-4">Name & Category</th>
                      <th className="p-4">Minecraft Compatibility</th>
                      <th className="p-4">Version Info</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-xs">
                    {mods.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-900/20">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-zinc-800 rounded border border-zinc-700 overflow-hidden shrink-0">
                              {m.thumbnail ? (
                                <img
                                  src={m.thumbnail}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-650">
                                  <Layers className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white">{m.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-tight">{m.category === "Both" ? "Mod & Modpack" : m.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-emerald-400 font-bold">
                          {m.mcVersion}
                        </td>
                        <td className="p-4 font-mono text-zinc-300">
                          v{m.version}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEditMod(m)}
                            className="p-1 px-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded mr-1"
                            title="Edit Listing"
                            id={`edit-mod-btn-${m.id}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteMod(m.id)}
                            className="p-1 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                            title="Remove Permanently"
                            id={`delete-mod-btn-${m.id}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Dialog for Mod Form creation/edit */}
            {isModFormOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                  className="fixed inset-0 bg-black/85 backdrop-blur-sm" 
                  onClick={() => setIsModFormOpen(false)} 
                />
                <div 
                  className="relative w-full max-w-xl bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  <div className="p-4 border-b border-zinc-900 bg-zinc-900/50 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white font-mono">
                      {editingModId ? "Terminal: edit_curation_listing" : "Terminal: register_curated_mod"}
                    </h4>
                    <button
                      onClick={() => setIsModFormOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleModSubmit} className="p-5 overflow-y-auto space-y-4 max-h-[75vh] royal-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Mod / Pack Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={modForm.name}
                          onChange={(e) => setModForm({ ...modForm, name: e.target.value })}
                          className="w-full bg-zinc-905 bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="e.g. Ultra Realistic Shader Bundle"
                          id="form-mod-name"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Category *
                        </label>
                        <select
                          value={modForm.category}
                          onChange={(e) => setModForm({ ...modForm, category: e.target.value as any })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                        >
                          <option value="Modpack">Modpack</option>
                          <option value="Mod">Mod</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Minecraft Version *
                        </label>
                        <input
                          type="text"
                          required
                          value={modForm.mcVersion}
                          onChange={(e) => setModForm({ ...modForm, mcVersion: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="e.g. 1.20.4 or 1.12.2"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Mod Version *
                        </label>
                        <input
                          type="text"
                          required
                          value={modForm.version}
                          onChange={(e) => setModForm({ ...modForm, version: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="e.g. 1.0.4-release"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Comma-Separated Tags
                        </label>
                        <input
                          type="text"
                          value={modForm.tagsInput}
                          onChange={(e) => setModForm({ ...modForm, tagsInput: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="e.g. shaders, forge, performance"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Direct Download Link * (No shady redirects!)
                      </label>
                      <input
                        type="url"
                        required
                        value={modForm.downloadLink}
                        onChange={(e) => setModForm({ ...modForm, downloadLink: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                        placeholder="e.g. https://github.com/.../release.zip or curseforge link"
                        id="form-mod-download-link"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        YouTube Featured Video URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={modForm.youtubeLink}
                        onChange={(e) => setModForm({ ...modForm, youtubeLink: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Thumbnail Image Link (External Address URL)
                        </label>
                        <input
                          type="text"
                          value={modForm.thumbnail}
                          onChange={(e) => setModForm({ ...modForm, thumbnail: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="https://placehold.co/300x150/png"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                          Large Screenshot Link (Optional Modal Banner)
                        </label>
                        <input
                          type="text"
                          value={modForm.screenshot}
                          onChange={(e) => setModForm({ ...modForm, screenshot: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                          placeholder="https://placehold.co/800x400/png"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Installation Guide / Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={modForm.description}
                        onChange={(e) => setModForm({ ...modForm, description: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none placeholder-zinc-650"
                        placeholder="Highlight details, installation steps, configuration files needed to work correctly..."
                        id="form-mod-description"
                      />
                    </div>

                    <div className="pt-2 border-t border-zinc-900 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsModFormOpen(false)}
                        className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded text-xs"
                        id="form-mod-submit-btn"
                      >
                        {editingModId ? "Apply Modifications" : "Publish to Curation Board"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Discord Button Manager */}
        {adminTab === "discord" && (
          <form onSubmit={saveDiscordConfig} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-white mb-2">Configure Creators Discord callout button</h3>
            
            <div className="flex items-center space-x-3 bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 mb-4">
              <input
                type="checkbox"
                id="discord-toggle"
                checked={discordForm.isEnabled}
                onChange={(e) => setDiscordForm({ ...discordForm, isEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-zinc-950"
              />
              <label htmlFor="discord-toggle" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                Enable Discord banner section on Homepage
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                Button Label text
              </label>
              <input
                type="text"
                required
                disabled={!discordForm.isEnabled}
                value={discordForm.label}
                onChange={(e) => setDiscordForm({ ...discordForm, label: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none disabled:opacity-40"
                placeholder="e.g. Join our Discord Channel"
                id="discord-label-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                Discord Invitation URL link
              </label>
              <input
                type="url"
                required
                disabled={!discordForm.isEnabled}
                value={discordForm.url}
                onChange={(e) => setDiscordForm({ ...discordForm, url: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none disabled:opacity-40"
                placeholder="e.g. https://discord.gg/yourcode"
                id="discord-url-input"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 transition text-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
              id="discord-settings-save-btn"
            >
              Commit Discord Customization
            </button>
          </form>
        )}

        {/* Tab 3: Ads slot configuration */}
        {adminTab === "ads" && (
          <form onSubmit={saveAdsConfig} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Ad Slot Controllers</h3>
              <p className="text-xs text-zinc-500">Provide either dynamic HTML/Script codes (e.g. AdSense) or link custom client image banners</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(["header", "content", "footer"] as const).map((placement) => {
                const titleMap = {
                  header: "Header banner (Below Nav)",
                  content: "In-Content Slot (Between grid columns)",
                  footer: "Footer row"
                };

                return (
                  <div key={placement} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                      <span className="text-xs font-bold font-mono uppercase text-zinc-300">
                        {placement} placement
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="checkbox"
                          id={`ad-${placement}-enable`}
                          checked={adsForm[placement].isEnabled}
                          onChange={(e) => {
                            const updated = { ...adsForm };
                            updated[placement].isEnabled = e.target.checked;
                            setAdsForm(updated);
                          }}
                          className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-850"
                        />
                        <label htmlFor={`ad-${placement}-enable`} className="text-[10px] text-zinc-400 select-none cursor-pointer">
                          Active
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-1">
                          Ad Format Mode
                        </label>
                        <select
                          disabled={!adsForm[placement].isEnabled}
                          value={adsForm[placement].type}
                          onChange={(e) => {
                            const updated = { ...adsForm };
                            updated[placement].type = e.target.value as any;
                            setAdsForm(updated);
                          }}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                        >
                          <option value="custom">Custom Banner Image + Link</option>
                          <option value="code">HTML / JavaScript Script Code</option>
                        </select>
                      </div>

                      {adsForm[placement].type === "code" ? (
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-1">
                            Ad Server script script
                          </label>
                          <textarea
                            disabled={!adsForm[placement].isEnabled}
                            rows={3}
                            value={adsForm[placement].code || ""}
                            onChange={(e) => {
                              const updated = { ...adsForm };
                              updated[placement].code = e.target.value;
                              setAdsForm(updated);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-[11px] font-mono text-slate-350 focus:outline-none disabled:opacity-40"
                            placeholder="<script async src='https://pagead2.googlesyndication.com...'></script>"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-1">
                              Banner image location URL
                            </label>
                            <input
                              type="text"
                              disabled={!adsForm[placement].isEnabled}
                              value={adsForm[placement].imageUrl || ""}
                              onChange={(e) => {
                                const updated = { ...adsForm };
                                updated[placement].imageUrl = e.target.value;
                                setAdsForm(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none disabled:opacity-40"
                              placeholder="https://placehold.co/728x90/png"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-1">
                              Image click redirections URL
                            </label>
                            <input
                              type="text"
                              disabled={!adsForm[placement].isEnabled}
                              value={adsForm[placement].linkUrl || ""}
                              onChange={(e) => {
                                const updated = { ...adsForm };
                                updated[placement].linkUrl = e.target.value;
                                setAdsForm(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none disabled:opacity-40"
                              placeholder="https://sponsor-url.com"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 transition text-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
              id="ads-settings-save-btn"
            >
              Commit Advertisement Configurations
            </button>
          </form>
        )}

        {/* Tab 4: Site Settings branding */}
        {adminTab === "settings" && (
          <form onSubmit={saveSiteSettings} className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-zinc-250">General Branding configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono color text-zinc-400 mb-1">
                  Logo Navbar Label
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.logoText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoText: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-305 text-zinc-300 focus:outline-none"
                  placeholder="AscendX"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono color text-zinc-400 mb-1">
                  Homepage Title Hero
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.heroTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  placeholder="AscendX"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono color text-zinc-400 mb-1">
                Homepage Hero Subtitle / tagline
              </label>
              <input
                type="text"
                required
                value={settingsForm.heroSubtitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                placeholder="Tagline describing why gamers trust you"
              />
            </div>

            <div className="pt-2 border-t border-zinc-900 space-y-4">
              <h4 className="text-xs font-bold text-zinc-300 font-mono">"Why Us" Pitch Box config</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">
                    Section heading Title
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whyTitle}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whyTitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">
                    Section Brief Synopsis
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whyDescription}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whyDescription: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">
                  Point checkmarks (One note per line)
                </label>
                <textarea
                  rows={4}
                  value={settingsForm.whyPointsText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whyPointsText: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 p-2.5 rounded text-xs text-zinc-300 focus:outline-none"
                  placeholder="e.g. Safe setup&#10;No redirects&#10;Tested files only"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 transition text-black font-bold text-xs uppercase px-5 py-2.5 rounded-lg"
              id="site-settings-save-btn"
            >
              Commit Site Branding changes
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans transition-all selection:bg-emerald-500 selection:text-black royal-scrollbar" id="ascendx-app-wrapper">
      
      {/* Toast Alert Feedback Overlay */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[9999] p-4 rounded-xl shadow-xl flex items-center space-x-3 max-w-sm transition border ${
            notification.type === "success"
              ? "bg-[#0a2f1d]/90 text-emerald-300 border-emerald-500/30"
              : "bg-red-950/90 text-red-300 border-red-500/30"
          }`}
          id="custom-toast-notification"
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Primary Header Navbar */}
      <header className="w-full px-4 pt-4 sm:px-6" id="navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl px-5 sm:px-6 py-3.5 shadow-md shadow-black/30">
          
          {/* Logo element representation */}
          <div
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.delete("view");
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
              setQueryView("");
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 select-none group"
            id="brand-logo"
          >
            <div className="w-8.5 h-8.5 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.36)] group-hover:scale-105 transition-transform duration-300">
              AX
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">
              {settings.logoText || "Ascend"}<span className="text-emerald-400">X</span>
            </span>
          </div>

          {/* Navigation link triggers */}
          <div className="hidden sm:flex gap-6 text-xs font-bold text-zinc-400 tracking-wider uppercase font-mono">
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.delete("view");
                window.history.pushState({}, "", "/");
                setCurrentPath("/");
                setQueryView("");
              }}
              className={`hover:text-emerald-400 transition-colors ${!isViewingAdmin ? "text-emerald-400" : ""}`}
            >
              Curation Hub
            </button>
            {discordConfig.isEnabled && (
              <a
                href={discordConfig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition"
              >
                Discord
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Tiny indicator for admin status for sandbox testing ease */}
            {!isViewingAdmin && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("view", "admin");
                  window.history.pushState({}, "", `/admin?${params.toString()}`);
                  setCurrentPath("/admin");
                  setQueryView("admin");
                }}
                className="p-1.5 sm:p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-mono transition border border-zinc-800"
                title="Enter Management Board"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded border border-zinc-850/60 font-mono hidden md:inline">
              PROD
            </div>
          </div>
        </div>
      </header>

      {/* Main Body container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 select-none">
            <Loader className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
            <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase">Connecting to AscendX database...</p>
          </div>
        ) : isViewingAdmin ? (
          renderAdminView()
        ) : (
          renderPublicView()
        )}
      </main>

      {/* Subtle details Modal */}
      <ModDetailModal mod={selectedMod} onClose={() => setSelectedMod(null)} />

      {/* Footer bar */}
      <footer className="w-full bg-zinc-950/30 border-t border-zinc-900 mt-12 py-6 px-4" id="footer-section">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-500/80 font-mono">
          <p>© 2026 AscendX Gaming. Minecraft is a trademark of Mojang Synergies AB. This curators portal is not affiliated with Mojang.</p>
          <div className="flex items-center space-x-4">
            <p className="text-zinc-655 font-bold uppercase text-emerald-500">Curator Version 1.2.0-stable</p>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("view", "admin");
                window.history.pushState({}, "", `/admin?${params.toString()}`);
                setCurrentPath("/admin");
                setQueryView("admin");
              }}
              className="text-zinc-500 hover:text-zinc-300 hover:underline hover:scale-105 transition"
            >
              Console Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
