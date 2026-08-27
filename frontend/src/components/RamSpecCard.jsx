import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export const RamSpecCard = ({
  ddrVersion = "DDR4",
  capacity = "16 GB",
  busSpeed = "3200 MHz",
  description,
  preview = false,
  onEdit,
  onDelete
}) => {
  return (
    <div className="w-full space-y-1.5">

      {/* Modern RAM Visual */}
      <div className="relative w-full rounded-xl overflow-hidden select-none" style={{ height: 160 }}>

        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

        {/* Glowing accent line top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-80" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}
        />

        {/* Left heat spreader edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-600 via-violet-500 to-violet-700" />
        {/* Right heat spreader edge */}
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-600 via-violet-500 to-violet-700" />

        {/* Main content */}
        <div className="absolute inset-0 flex flex-col justify-between px-4 py-3">

          {/* Top row: label + badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.6)]" />
              <span className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase">Memory Module</span>
            </div>
            <span className="text-[9px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30 rounded px-1.5 py-0.5 tracking-wider">
              SO-DIMM
            </span>
          </div>

          {/* Center: DDR + capacity + speed */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-0.5 uppercase tracking-wider">Type</div>
              <div className="text-xl font-black text-white tracking-tight leading-none">{ddrVersion}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-slate-500 font-medium mb-0.5 uppercase tracking-wider">Capacity</div>
              <div className="text-xl font-black text-violet-300 tracking-tight leading-none">{capacity}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-500 font-medium mb-0.5 uppercase tracking-wider">Speed</div>
              <div className="text-xl font-black text-amber-300 tracking-tight leading-none">{busSpeed || "—"}</div>
            </div>
          </div>

          {/* Bottom: bar indicators */}
          <div className="flex items-center justify-between">
            <div className="flex gap-[3px] items-end">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-[3px] h-3 rounded-[1px]"
                  style={{ background: i < 5 ? "rgba(167,139,250,0.9)" : "rgba(100,116,139,0.3)" }} />
              ))}
            </div>
            <div className="flex gap-[2px] items-end">
              {[6,9,7,11,8,10,7,9,6].map((h, i) => (
                <div key={i} className="w-[2px] rounded-t-[1px] bg-violet-500/40" style={{ height: h }} />
              ))}
            </div>
          </div>

        </div>

        {/* Gold pin connector strip */}
        <div className="absolute bottom-0 left-1.5 right-1.5 h-[6px] flex items-end gap-[1.5px]">
          {[...Array(40)].map((_, i) => (
            <div key={i} className="flex-1 h-full rounded-t-[1px]"
              style={{ background: "linear-gradient(to top, #b8860b, #ffd700)" }} />
          ))}
        </div>

      </div>

      {/* Specs & Actions — dark theme compatible */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{ddrVersion}</span>
            <span className="text-violet-600 dark:text-violet-400 font-semibold text-xs">{capacity}</span>
            {busSpeed && <span className="text-slate-400 dark:text-slate-500 text-[11px]">@ {busSpeed}</span>}
          </div>
          {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">{description}</p>}
        </div>
        {!preview && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-6 w-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" title="Edit">
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300" title="Delete">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

    </div>
  );
};

export default RamSpecCard;
