import React, { useEffect, useRef } from "react";
import { AdSlot } from "../types.js";

interface AdContainerProps {
  slot?: AdSlot;
  placement: "header" | "content" | "footer";
}

export default function AdContainer({ slot, placement }: AdContainerProps) {
  const scriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If the ad slot contains scripts (like AdSense code), force scripts to parse and run when DOM updates
    if (slot?.isEnabled && slot.type === "code" && slot.code && scriptRef.current) {
      scriptRef.current.innerHTML = "";
      const range = document.createRange();
      const documentFragment = range.createContextualFragment(slot.code);
      scriptRef.current.appendChild(documentFragment);
    }
  }, [slot?.isEnabled, slot?.type, slot?.code]);

  if (!slot?.isEnabled) {
    return null;
  }

  // Consistent layouts based on placement
  const placementStyles = {
    header: "w-full max-w-4xl mx-auto my-4 min-h-[90px] flex items-center justify-center bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-2 text-center text-xs text-zinc-500",
    content: "w-full max-w-4xl mx-auto my-12 min-h-[120px] flex items-center justify-center bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 text-center text-xs text-zinc-500",
    footer: "w-full max-w-4xl mx-auto my-6 min-h-[90px] flex items-center justify-center bg-zinc-900/30 border border-zinc-800/55 rounded-lg p-2 text-center text-xs text-zinc-500",
  };

  return (
    <div 
      id={`ad-container-${placement}`}
      className={placementStyles[placement]}
      aria-label="Advertisement"
    >
      <div className="w-full">
        {/* Subtle Ad label for legal compliance */}
        <div className="text-[10px] tracking-wider text-zinc-600 uppercase mb-1 font-mono">
          Advertisement
        </div>

        {slot.type === "code" ? (
          <div ref={scriptRef} className="flex justify-center items-center w-full min-h-[50px]" />
        ) : slot.imageUrl ? (
          <a
            href={slot.linkUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-90 active:scale-[0.99] transition"
            id={`ad-${placement}-link`}
          >
            <img
              src={slot.imageUrl}
              alt="Sponsored Content"
              className="max-h-[150px] mx-auto rounded object-contain"
              referrerPolicy="no-referrer"
            />
          </a>
        ) : (
          <div className="py-4 text-zinc-600 italic">
            Sponsored Spot — Configured but missing banner image or code
          </div>
        )}
      </div>
    </div>
  );
}
