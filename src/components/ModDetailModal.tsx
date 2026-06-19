import React from "react";
import { Mod } from "../types.js";
import { X, Download, Youtube, Server, ChevronRight, Puzzle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ModDetailModalProps {
  mod: Mod | null;
  onClose: () => void;
}

export default function ModDetailModal({ mod, onClose }: ModDetailModalProps) {
  if (!mod) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        id="mod-detail-modal-root"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="modal-backdrop"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-emerald-500/20 rounded-xl overflow-hidden shadow-2xl shadow-emerald-950/20 z-10 max-h-[90vh] flex flex-col"
          id={`modal-body-${mod.id}`}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center space-x-2">
              <Puzzle className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase">
                {mod.category} Information
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus:ring-1 focus:ring-emerald-500"
              aria-label="Close modal"
              id="close-modal-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6 flex-1 royal-scrollbar">
            {/* Screenshot Header Banner */}
            {mod.screenshot ? (
              <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                <img
                  src={mod.screenshot}
                  alt={mod.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-md">
                    {mod.name}
                  </h1>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {mod.name}
                </h1>
              </div>
            )}

            {/* Compatibility Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-zinc-900/50 p-4 border border-zinc-800/60 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
                  Minecraft Version
                </span>
                <span className="text-sm font-semibold text-emerald-400 flex items-center mt-0.5">
                  <Server className="w-3.5 h-3.5 mr-1" />
                  {mod.mcVersion}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
                  Mod version
                </span>
                <span className="text-sm font-semibold text-zinc-300 mt-0.5">
                  v{mod.version}
                </span>
              </div>
              <div className="flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500">
                  Category
                </span>
                <span className="text-sm font-semibold text-zinc-300 mt-0.5">
                  {mod.category === "Both" ? "Mod & Modpack" : mod.category}
                </span>
              </div>
            </div>

            {/* Tags Description */}
            {mod.tags && mod.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mod.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Detailed Description */}
            <div className="space-y-2">
              <h2 className="text-sm uppercase tracking-widest font-mono text-zinc-400">
                Detailed Guide & Setup
              </h2>
              <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-line bg-zinc-950/20 border-l-2 border-emerald-500/40 pl-3 py-1">
                {mod.description}
              </p>
            </div>

            {/* YouTube Embed Feature Indicator if applicable */}
            {mod.youtubeLink && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded bg-red-500/10 text-red-500 mt-0.5">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">
                      Featured in Tutorial
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Watch how I installed and configured this mod in the walkthrough guide.
                    </p>
                  </div>
                </div>
                <a
                  href={mod.youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center space-x-1 px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition focus:ring-1 focus:ring-red-500 self-start sm:self-center"
                  id={`youtube-mod-link-${mod.id}`}
                >
                  <span>Watch Walkthrough</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-zinc-900/60 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={mod.downloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 px-5 py-3 text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black rounded-lg transition active:scale-[0.98] shadow-lg shadow-emerald-950/20"
              id={`mod-direct-download-btn-${mod.id}`}
            >
              <Download className="w-4 h-4 text-black" />
              <span>Download Modpack / Mod</span>
            </a>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
              id="modal-close-secondary-btn"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
