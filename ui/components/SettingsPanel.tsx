"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsProps {
  onClose?: () => void;
}

export default function SettingsPanel({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveTab] = useState("lookupGeneral");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await invoke<string>("settings_load", { filename: "settings.json" });
      setSettings(JSON.parse(data));
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      await invoke("settings_save", { 
        filename: "settings.json", 
        content: JSON.stringify(newSettings, null, 2) 
      });
      setSettings(newSettings);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const handleUpdate = (path: string, value: any) => {
    const keys = path.split('.');
    const updated = { ...settings };
    let current = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    saveSettings(updated);
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading configurations...</div>;
  if (!settings) return <div className="p-8 text-center text-red-500">Error loading settings.</div>;

  const categories = Object.keys(settings).filter(k => typeof settings[k] === 'object' && !Array.isArray(settings[k]));

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">Local Config</div>
      </div>

      <div className="flex gap-8 h-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "text-left px-3 py-2 rounded-lg text-sm font-medium transition-all",
                activeCategory === cat ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              )}
            >
              {cat.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {Object.entries(settings[activeCategory]).map(([key, value]) => {
              const path = `${activeCategory}.${key}`;
              if (typeof value === 'object' && !Array.isArray(value)) return null; // Skip deep nested for now

              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => handleUpdate(path, !value)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative",
                          value ? "bg-blue-600" : "bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          value ? "left-6" : "left-1"
                        )} />
                      </button>
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value as any}
                        onChange={(e) => handleUpdate(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 w-48"
                      />
                    )}
                  </div>
                  <div className="h-px bg-zinc-800/50 w-full" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
