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
import Image from "next/image";

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
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    getSyncStatus().then((status) => setSyncAvailable(status.available));
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
    if (res.success) await fetchGuests();
    else alert("Failed to update status");
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
    } else alert("Failed to update guest");
  };

  const attendancePct =
    total > 0 ? Math.round((totalCheckedIn / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-orange-50/20 font-inter relative">
      {/* Background blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4 pointer-events-none" />

      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Image
            src="/arduino_day.png"
            alt="Arduino Day Mindanao 2026"
            width={170}
            height={60}
            className="object-contain"
            priority
          />
          <button
            onClick={() => redirect("/")}
            className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 rounded-xl text-slate-600 hover:text-teal-700 text-sm font-semibold transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Scanner
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 relative z-10">
        {/* Page heading + stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-outfit font-black tracking-tight text-slate-800 uppercase">
              Admin{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">
                Dashboard
              </span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">
              Arduino Day Mindanao 2026 · Guest Check-in Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-sm shadow-sm">
              <span className="text-slate-500">Checked In </span>
              <strong className="text-teal-600 text-base font-black">
                {totalCheckedIn}
              </strong>
              <span className="text-slate-300 mx-1">/</span>
              <strong className="text-slate-700">{total}</strong>
            </div>
            {total > 0 && (
              <div className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-sm shadow-sm">
                <strong className="text-orange-500 font-black">
                  {attendancePct}%
                </strong>
                <span className="text-slate-400 ml-1">attended</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${attendancePct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        )}

        {/* Cloud Sync Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-2xl p-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${syncEnabled && syncAvailable ? "bg-teal-50 border-teal-200" : "bg-slate-100 border-slate-200"}`}
              >
                {syncEnabled && syncAvailable ? (
                  <Cloud className="w-4 h-4 text-teal-500" />
                ) : (
                  <CloudOff className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Cloud Sync
                </p>
                <p className="text-xs text-slate-400">
                  {!syncAvailable
                    ? "Not configured — add DATABASE_URL to .env.local"
                    : syncEnabled
                      ? "Connected to Supabase"
                      : "Disabled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSync}
                disabled={!syncAvailable}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${syncEnabled ? "bg-teal-400" : "bg-slate-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${syncEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              {syncEnabled && syncAvailable && (
                <>
                  <button
                    onClick={handlePull}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
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
              className={`mt-2 text-xs font-medium ${syncMessage.includes("fail") || syncMessage.includes("not configured") ? "text-red-500" : "text-teal-600"}`}
            >
              {syncMessage}
            </p>
          )}
        </motion.div>

        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Name
                  </th>
                  <th className="p-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    Email
                  </th>
                  <th className="p-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                    In Time
                  </th>
                  <th className="p-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {guests.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-16 text-center text-slate-400"
                      >
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Searching...
                          </div>
                        ) : (
                          "No guests found."
                        )}
                      </td>
                    </tr>
                  )}
                  {guests.map((guest) => {
                    const isEditing = editingId === guest.id;
                    return (
                      <motion.tr
                        key={guest.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="p-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCheckIn(guest)}
                            className={`flex hover:cursor-pointer items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              guest.is_checked_in
                                ? "bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                            }`}
                          >
                            {guest.is_checked_in ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Checked
                                In
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Pending
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
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 w-full min-w-[150px] text-sm text-slate-800"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">
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
                              className="bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40 w-full min-w-[200px] text-sm text-slate-800"
                            />
                          ) : (
                            <span className="text-slate-500 text-sm">
                              {guest.email}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-slate-600 text-sm tabular-nums">
                            {guest.checked_in_at?.toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(guest.id)}
                                  className="p-2 bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEdit(guest)}
                                className="p-2 opacity-0 group-hover:opacity-100 hover:cursor-pointer bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
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

          {/* Table footer */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <span>
              Showing{" "}
              <strong className="text-slate-700">{guests.length}</strong> of{" "}
              <strong className="text-slate-700">{total}</strong> guests
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-600 font-medium px-1">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span>
              <strong className="text-teal-600">{totalCheckedIn}</strong>{" "}
              checked in ·{" "}
              <strong className="text-orange-500">
                {total - totalCheckedIn}
              </strong>{" "}
              pending
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 relative z-10">
        <p className="text-slate-400 text-xs tracking-widest uppercase font-medium">
          Arduino Day Mindanao 2026 · Admin Panel
        </p>
      </div>
    </main>
  );
}
