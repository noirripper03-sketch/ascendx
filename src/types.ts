export interface Mod {
  id: string;
  name: string;
  description: string;
  version: string;
  mcVersion: string;
  thumbnail: string; // Image URL/Path
  screenshot: string; // Screenshot URL/Path
  downloadLink: string;
  youtubeLink?: string;
  category: "Mod" | "Modpack" | "Both";
  tags?: string[];
  createdAt: string;
}

export interface DiscordConfig {
  url: string;
  label: string;
  isEnabled: boolean;
}

export interface AdSlot {
  isEnabled: boolean;
  type: "code" | "custom";
  code?: string; // HTML/JS code for AdSense, etc.
  imageUrl?: string; // Custom banner image
  linkUrl?: string; // Custom banner link
}

export interface AdsConfig {
  header: AdSlot;
  content: AdSlot;
  footer: AdSlot;
}

export interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  whyTitle: string;
  whyDescription: string;
  whyPoints: string[];
  logoText: string;
}

export interface AdminSession {
  email: string;
  loggedIn: boolean;
}
