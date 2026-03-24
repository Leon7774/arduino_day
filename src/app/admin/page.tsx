"use client";

import { useState, useEffect } from "react";
import { toggleCheckIn, updateGuest } from "./actions";
import {
  pullFromSupabase,
  pushToSupabase,
  getSyncStatus,
} from "./sync-actions";
import { useGuests, type Guest } from "./useGuests";
import {
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { redirect } from "next/navigation";

export default function AdminPage() {
  const {
    guests,
    total,
    totalCheckedIn,
    totalPages,
    page,
    setPage,
    search,
    handleSearch,
    isPending,
    fetchGuests,
  } = useGuests();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Sync state
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    // Check if Supabase is configured
    getSyncStatus().then((status) => setSyncAvailable(status.available));
    // Restore toggle from localStorage
    const saved = localStorage.getItem("syncEnabled");
    if (saved === "true") setSyncEnabled(true);
  }, []);

  const toggleSync = () => {
    const next = !syncEnabled;
    setSyncEnabled(next);
    localStorage.setItem("syncEnabled", String(next));
  };

  const handlePull = async () => {
    setSyncing(true);
    setSyncMessage("");
    const res = await pullFromSupabase();
    setSyncMessage(
      res.success
        ? res.message || "Pull complete!"
        : res.error || "Pull failed.",
    );
    setSyncing(false);
    if (res.success) await fetchGuests();
  };

  const handlePush = async () => {
    setSyncing(true);
    setSyncMessage("");
    const res = await pushToSupabase();
    setSyncMessage(
      res.success
        ? res.message || "Push complete!"
        : res.error || "Push failed.",
    );
    setSyncing(false);
  };

  const handleToggleCheckIn = async (guest: Guest) => {
    const res = await toggleCheckIn(guest.id, guest.is_checked_in);
    if (res.success) {
      await fetchGuests();
    } else {
      alert("Failed to update status");
    }
  };

  const startEdit = (guest: Guest) => {
    setEditingId(guest.id);
    setEditName(guest.name);
    setEditEmail(guest.email);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
  };

  const saveEdit = async (guestId: number) => {
    if (!editName.trim() || !editEmail.trim())
      return alert("Fields cannot be empty.");

    const res = await updateGuest(guestId, editName, editEmail);
    if (res.success) {
      setEditingId(null);
      await fetchGuests();
    } else {
      alert("Failed to update guest");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 sm:p-12 font-inter relative">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => redirect("/")}
            className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-slate-800 hover:border-white/20 rounded-xl text-slate-300 hover:text-white text-sm font-semibold transition-all shadow-lg w-fit hover:shadow-blue-500/10"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Scanner
          </button>
        </div>

        {/* Cloud Sync Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-white/5 p-4 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {syncEnabled && syncAvailable ? (
                <Cloud className="w-5 h-5 text-blue-400" />
              ) : (
                <CloudOff className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Cloud Sync
                </p>
                <p className="text-xs text-slate-500">
                  {!syncAvailable
                    ? "Not configured — add DATABASE_URL to .env.local"
                    : syncEnabled
                      ? "Connected to Supabase"
                      : "Disabled"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={toggleSync}
                disabled={!syncAvailable}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
                  syncEnabled ? "bg-blue-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    syncEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

              {syncEnabled && syncAvailable && (
                <>
                  <button
                    onClick={handlePull}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {syncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    Pull
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {syncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    Push
                  </button>
                </>
              )}
            </div>
          </div>
          {syncMessage && (
            <p
              className={`mt-2 text-xs ${syncMessage.includes("fail") || syncMessage.includes("not configured") ? "text-red-400" : "text-green-400"}`}
            >
              {syncMessage}
            </p>
          )}
        </motion.div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-outfit font-bold ">Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">Manual participant management</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={handleSearch}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm placeholder:text-slate-600 shadow-inner"
            />
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden shadow-2xl shadow-blue-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-white/10">
                  <th className="p-4 font-semibold text-slate-300 text-sm uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4 font-semibold text-slate-300 text-sm uppercase tracking-wider">
                    Name
                  </th>
                  <th className="p-4 font-semibold text-slate-300 text-sm uppercase tracking-wider">
                    Email
                  </th>
                  <th className="p-4 font-semibold text-slate-300 text-sm uppercase tracking-wider">
                    In Time
                  </th>
                  <th className="p-4 font-semibold text-slate-300 text-sm uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {guests.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-slate-500"
                      >
                        {isPending ? "Searching..." : "No guests found."}
                      </td>
                    </tr>
                  )}
                  {guests.map((guest) => {
                    const isEditing = editingId === guest.id;
                    return (
                      <motion.tr
                        key={guest.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="p-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCheckIn(guest)}
                            className={`flex hover:cursor-pointer items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                              guest.is_checked_in
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                            }`}
                          >
                            {guest.is_checked_in ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Checked In
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                Pending
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full min-w-[150px]"
                            />
                          ) : (
                            <span className="font-semibold text-slate-100">
                              {guest.name}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full min-w-[200px]"
                            />
                          ) : (
                            <span className="text-slate-400 text-sm">
                              {guest.email}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-100">
                            {guest.checked_in_at?.toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(guest.id)}
                                  className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-colors shadow-sm"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700 hover:text-white rounded-xl transition-colors shadow-sm"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEdit(guest)}
                                className="p-2 hover:cursor-pointer bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-sm"
                                title="Edit Guest"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer stats and pagination */}
          <div className="bg-slate-900/50 p-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <div>
              Total showing: <strong className="text-white">{total}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-300 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              Checked In:{" "}
              <strong className="text-green-400">{totalCheckedIn}</strong> /{" "}
              {total} total
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
