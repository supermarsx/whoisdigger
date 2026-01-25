"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("single");
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    if (!domain) return;
    setLoading(true);
    setResult("Loading...");
    try {
      const data = await invoke<string>("whois_lookup", { domain });
      setResult(data);
    } catch (err) {
      setResult("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "single", label: "Single Whois" },
    { id: "bulk", label: "Bulk Whois" },
    { id: "history", label: "History" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/20">W</div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Whoisdigger</h1>
        </div>
        
        <nav className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "single" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold">Domain Lookup</h2>
              <p className="text-zinc-500 text-sm">Rapidly query domain registration information.</p>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="Enter domain name..."
                  className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all group-hover:border-zinc-700"
                />
              </div>
              <button
                onClick={handleLookup}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
              >
                {loading ? "Searching..." : "Lookup"}
              </button>
            </div>

            {result && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="border-b border-zinc-800 px-6 py-3 bg-zinc-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Whois Response</span>
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  </div>
                </div>
                <div className="p-6 overflow-auto max-h-[50vh] custom-scrollbar">
                  <pre className="font-mono text-zinc-300 text-sm leading-relaxed selection:bg-blue-500/30">
                    {result}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "bulk" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-medium">Bulk Whois</h2>
            <p className="text-zinc-500 max-w-sm">Migration in progress. This feature will be available shortly.</p>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in duration-500">
             <h2 className="text-xl font-medium text-zinc-400">No History Found</h2>
             <p className="text-zinc-600">Your recent lookups will appear here.</p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in duration-500">
             <h2 className="text-xl font-medium">Settings</h2>
             <p className="text-zinc-500">Configuration options are coming to the new interface soon.</p>
          </div>
        )}
      </div>
    </main>
  );
}