import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardDrive, Zap, Cpu, Pencil, Trash2, AlignLeft, ShieldCheck } from "lucide-react";

/**
 * Universal Storage Specification Card Component
 * Supports: '2.5-hdd' | '2.5-ssd' | 'msata' | 'm2-sata' | 'm2-nvme'
 */
export const StorageSpecCard = ({
  type = "m2-nvme", // '2.5-hdd' | '2.5-ssd' | 'msata' | 'm2-sata' | 'm2-nvme'
  capacity = "512 GB",
  interfaceType,
  formFactor,
  description = "High-performance storage module designed for embedded OPS slots and system expansion.",
  preview = false,
  onEdit,
  onDelete
}) => {
  // Preset defaults based on selected drive type
  const driveConfigs = {
    '2.5-hdd': {
      label: "2.5\" SATA HDD",
      badge: "HDD",
      badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
      accentColor: "bg-blue-600",
      defaultInterface: "SATA III (6Gb/s)",
      defaultFormFactor: '2.5" (7mm)',
      icon: HardDrive,
    },
    '2.5-ssd': {
      label: "2.5\" SATA SSD",
      badge: "SATA SSD",
      badgeClass: "bg-cyan-100 text-cyan-700 border-cyan-200",
      accentColor: "bg-cyan-600",
      defaultInterface: "SATA III (6Gb/s)",
      defaultFormFactor: '2.5" (7mm)',
      icon: Zap,
    },
    'msata': {
      label: "mSATA SSD",
      badge: "mSATA",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
      accentColor: "bg-amber-600",
      defaultInterface: "mSATA (6Gb/s)",
      defaultFormFactor: "Full-Size mSATA",
      icon: Cpu,
    },
    'm2-sata': {
      label: "M.2 SATA SSD",
      badge: "M.2 SATA",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      accentColor: "bg-emerald-600",
      defaultInterface: "SATA III (6Gb/s)",
      defaultFormFactor: "M.2 2280 (B+M Key)",
      icon: Zap,
    },
    'm2-nvme': {
      label: "M.2 NVMe SSD",
      badge: "NVMe PCIe",
      badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
      accentColor: "bg-violet-600",
      defaultInterface: "PCIe Gen4 x4",
      defaultFormFactor: "M.2 2280 (M Key)",
      icon: Zap,
    }
  };

  const config = driveConfigs[type] || driveConfigs['m2-nvme'];
  const IconComponent = config.icon;
  const activeInterface = interfaceType || config.defaultInterface;
  const activeFormFactor = formFactor || config.defaultFormFactor;

  return (
    <Card className="w-full max-w-md bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden group">
      
      {/* --- HEADER SECTION --- */}
      <CardHeader className="p-5 pb-4 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-3">
        
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${config.accentColor} text-white rounded-lg shadow-xs flex items-center justify-center`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                  {capacity} {config.badge}
                </h3>
                <Badge variant="secondary" className={`font-semibold text-xs ${config.badgeClass}`}>
                  {config.badge}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">{config.label}</p>
            </div>
          </div>

          {/* Action Buttons */}
          {!preview && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" onClick={onEdit}
                className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md"
                title="Edit Spec"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost" size="icon" onClick={onDelete}
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                title="Delete Spec"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Spec Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white rounded-lg border border-slate-200/60 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Interface</span>
            <span className="font-bold text-slate-800 truncate">{activeInterface}</span>
          </div>
          <div className="flex flex-col border-l border-slate-100 pl-2">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Form Factor</span>
            <span className="font-bold text-slate-800 truncate">{activeFormFactor}</span>
          </div>
          <div className="flex flex-col border-l border-slate-100 pl-2">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Capacity</span>
            <span className="font-bold text-slate-900">{capacity}</span>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="flex items-start gap-2 text-xs text-slate-600 pt-1">
            <AlignLeft className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <p className="line-clamp-2 leading-relaxed">{description}</p>
          </div>
        )}

      </CardHeader>

      {/* --- GRAPHIC PREVIEW SECTION --- */}
      <CardContent className="p-4 bg-slate-100/40 flex items-center justify-center min-h-[160px]">
        
        {/* 1. 2.5" SATA HDD GRAPHIC */}
        {type === '2.5-hdd' && (
          <div className="relative w-64 h-32 bg-slate-300 rounded-lg border border-slate-400 p-1.5 shadow-md flex flex-col justify-between select-none">
            <div className="w-full h-full bg-slate-100 rounded border border-slate-300 p-2 flex flex-col justify-between shadow-inner">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-slate-800">SATA HARD DRIVE</span>
                <span className="text-[8px] font-mono text-slate-500">{capacity}</span>
              </div>
              <div className="flex items-center gap-3 my-1">
                <div className="w-8 h-8 rounded-full border border-slate-400 bg-slate-200 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                </div>
                <div className="flex flex-col text-[7px] font-mono text-slate-400">
                  <span>5400 RPM</span>
                  <span>S/N: HDD-2026</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[7px] font-mono border-t border-slate-200 pt-1 text-slate-400">
                <span>2.5" FORM FACTOR</span>
                <div className="h-1.5 w-10 bg-zinc-800 rounded-xs" />
              </div>
            </div>
          </div>
        )}

        {/* 2. 2.5" SATA SSD GRAPHIC */}
        {type === '2.5-ssd' && (
          <div className="relative w-64 h-32 bg-zinc-900 rounded-lg border border-zinc-950 p-1.5 shadow-md flex flex-col justify-between select-none">
            <div className="w-full h-full bg-zinc-800 rounded border border-zinc-700 p-2 flex flex-col justify-between shadow-inner">
              <div className="flex justify-between items-start border-b border-zinc-700 pb-1">
                <span className="text-[9px] font-black text-white tracking-widest">SOLID STATE DRIVE</span>
                <span className="text-[8px] font-mono text-cyan-400">3D NAND</span>
              </div>
              <div className="my-1">
                <span className="text-base font-black text-white">{capacity}</span>
                <p className="text-[7px] font-mono text-zinc-400">2.5-INCH SATA III 6Gb/s</p>
              </div>
              <div className="flex justify-between items-center text-[7px] font-mono border-t border-zinc-700 pt-1 text-zinc-500">
                <span>REV 3.0</span>
                <div className="h-1.5 w-10 bg-amber-400 rounded-xs" />
              </div>
            </div>
          </div>
        )}

        {/* 3. mSATA GRAPHIC */}
        {type === 'msata' && (
          <div className="relative w-44 h-28 bg-emerald-950 rounded border border-emerald-900 p-2 shadow-md flex flex-col justify-between select-none">
            {/* Top PCB Screw Mount Cutouts */}
            <div className="flex justify-between -mt-1">
              <div className="w-3 h-3 rounded-full border border-emerald-700 bg-slate-200" />
              <div className="w-3 h-3 rounded-full border border-emerald-700 bg-slate-200" />
            </div>
            {/* Controller & Flash IC */}
            <div className="grid grid-cols-2 gap-2 my-auto">
              <div className="h-7 bg-zinc-900 border border-zinc-700 rounded-xs flex items-center justify-center">
                <span className="text-[6px] text-zinc-400 font-mono">NAND</span>
              </div>
              <div className="h-7 bg-zinc-900 border border-zinc-700 rounded-xs flex items-center justify-center">
                <span className="text-[6px] text-zinc-400 font-mono">CTRL</span>
              </div>
            </div>
            {/* mSATA Pins */}
            <div className="w-full h-3 border-t border-emerald-800 pt-0.5 flex justify-around">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="w-1 h-full bg-amber-400 rounded-xs" />
              ))}
            </div>
          </div>
        )}

        {/* 4. M.2 SATA SSD GRAPHIC (B+M Key Notch) */}
        {type === 'm2-sata' && (
          <div className="relative w-72 h-16 bg-emerald-950 rounded border border-emerald-900 p-1.5 shadow-md flex items-center justify-between select-none">
            {/* Mounting Hole Left */}
            <div className="w-3 h-3 rounded-full border border-emerald-700 bg-slate-200 shrink-0 ml-1" />
            
            {/* Board Components & Sticker */}
            <div className="flex-1 mx-2 flex items-center justify-between bg-zinc-900/90 rounded border border-zinc-800 p-1.5">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-emerald-400">M.2 SATA SSD</span>
                <span className="text-[8px] text-zinc-300 font-extrabold">{capacity}</span>
              </div>
              <span className="text-[7px] font-mono text-zinc-500">2280 B+M KEY</span>
            </div>

            {/* B+M Dual Notch Gold Edge Pin */}
            <div className="w-6 h-full flex flex-col justify-between py-1 shrink-0">
              <div className="h-2 w-full bg-amber-400 rounded-xs" />
              <div className="h-1 w-full bg-emerald-950" />
              <div className="h-4 w-full bg-amber-400 rounded-xs" />
              <div className="h-1 w-full bg-emerald-950" />
              <div className="h-2 w-full bg-amber-400 rounded-xs" />
            </div>
          </div>
        )}

        {/* 5. M.2 NVMe SSD GRAPHIC (M-Key Single Notch) */}
        {type === 'm2-nvme' && (
          <div className="relative w-72 h-16 bg-zinc-900 rounded border border-zinc-950 p-1.5 shadow-md flex items-center justify-between select-none">
            {/* Mounting Hole Left */}
            <div className="w-3 h-3 rounded-full border border-zinc-700 bg-slate-200 shrink-0 ml-1" />
            
            {/* Thermal Label Sticker */}
            <div className="flex-1 mx-2 flex items-center justify-between bg-gradient-to-r from-zinc-800 to-violet-950 rounded border border-violet-900/50 p-1.5">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-violet-300 tracking-wider">NVMe M.2 PCIe</span>
                <span className="text-[8px] text-white font-extrabold">{capacity}</span>
              </div>
              <Badge variant="outline" className="text-[6px] px-1 py-0 text-violet-300 border-violet-500/40">Gen4 x4</Badge>
            </div>

            {/* M-Key Single Notch Gold Edge Pin */}
            <div className="w-6 h-full flex flex-col justify-between py-1 shrink-0">
              <div className="h-3 w-full bg-amber-400 rounded-xs" />
              <div className="h-1.5 w-full bg-zinc-950" />
              <div className="h-8 w-full bg-amber-400 rounded-xs" />
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default StorageSpecCard;