"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import SettingsPanel from "../components/SettingsPanel";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BulkResult {
  domain: string;
  status: string;
  data?: string;
  error?: string;
  params?: any;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("single");
  
  // Single Whois State
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Bulk Whois State
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unlisten = listen("bulk:status", (event: any) => {
      setBulkProgress(event.payload);
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const handleLookup = async () => {
    if (!domain) return;
    setLoading(true);
    setResult("Loading...");
    try {
      const data = await invoke<string>("whois_lookup", { domain });
      setResult(data);
      fetchHistory();
    } catch (err) {
      setResult("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkLookup = async () => {
    const domains = bulkInput.split("\n").map(d => d.trim()).filter(d => d);
    if (domains.length === 0) return;
    
    setIsBulkRunning(true);
    setBulkResults([]);
    setBulkProgress({ sent: 0, total: domains.length });
    
    try {
      const results = await invoke<BulkResult[]>("bulk_whois_lookup", { 
        domains, 
        concurrency: 5, 
        timeoutMs: 5000 
      });
      setBulkResults(results);
      fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkRunning(false);
    }
  };

  const handleExport = async (type: "csv" | "zip") => {
    if (bulkResults.length === 0) return;
    
    const filePath = await save({
      filters: [{
        name: type === "csv" ? "CSV File" : "ZIP Archive",
        extensions: [type]
      }]
    });

    if (filePath) {
      try {
        await invoke("bulk_whois_export", {
          results: bulkResults,
          options: { filetype: type, whoisreply: "yes" },
          path: filePath
        });
        alert("Export successful: " + filePath);
      } catch (err) {
        alert("Export failed: " + err);
      }
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await invoke<any[]>("db_gui_history_get", { 
        limit: 50 
      });
      setHistory(data);
    } catch (err) {
      console.error("History fetch error:", err);
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
      <header className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-900/20">W</div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Whoisdigger</h1>
        </div>
        
        <nav className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "history") fetchHistory();
              }}
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

      <div className="flex-1 p-8 max-w-6xl mx-auto w-full h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
        {activeTab === "single" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold">Domain Lookup</h2>
              <p className="text-zinc-500 text-sm">Rapidly query domain registration information.</p>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Enter domain name..."
                className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <button
                onClick={handleLookup}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 rounded-xl font-semibold transition-all"
              >
                {loading ? "Searching..." : "Lookup"}
              </button>
            </div>

            {result && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="border-b border-zinc-800 px-6 py-3 bg-zinc-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Whois Response</span>
                </div>
                <div className="p-6 overflow-auto max-h-[50vh] custom-scrollbar">
                  <pre className="font-mono text-zinc-300 text-sm leading-relaxed">{result}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "bulk" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">Bulk Lookup</h2>
                <p className="text-zinc-500 text-sm">Analyze multiple domains simultaneously.</p>
              </div>
              {bulkResults.length > 0 && !isBulkRunning && (
                <div className="flex gap-2">
                  <button onClick={() => handleExport("csv")} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all">Export CSV</button>
                  <button onClick={() => handleExport("zip")} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all">Export ZIP</button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Enter one domain per line..."
                className="w-full h-48 bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500 font-mono">
                  {bulkResults.length > 0 && `Total: ${bulkResults.length} records`}
                  {isBulkRunning && (
                    <span className="text-blue-400 animate-pulse">
                      Processing: {bulkProgress.sent} / {bulkProgress.total} ({(bulkProgress.sent / bulkProgress.total * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
                <button
                  onClick={handleBulkLookup}
                  disabled={isBulkRunning || !bulkInput}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-10 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
                >
                  {isBulkRunning ? "Lookup in progress..." : "Start Bulk Engine"}
                </button>
              </div>
            </div>

            {bulkResults.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex-1 min-h-0">
                <div className="overflow-auto h-full custom-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4">Domain</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {bulkResults.map((res, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium">{res.domain}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                              res.status === "available" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                            )}>
                              {res.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 truncate max-w-xs">{res.error || res.data?.substring(0, 50)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-semibold">Search History</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {history.map((entry, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{entry.domain}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          entry.status === "available" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                        )}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{new Date(entry.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-zinc-600">No history entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsPanel />
        )}
      </div>
    </main>
  );
}