"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  Settings2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { handleScan } from "@/utils/handleScan";
import { redirect } from "next/navigation";

export type ScanStatus = "idle" | "scanning" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      {/* Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <img
            src="/muse.jpg"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="font-outfit font-bold text-xl tracking-wide text-white drop-shadow-md">
            ARDUINO DAY
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">
            Registration Desk
          </p>
        </div>
      </div>

      {/* Admin Panel Button */}
      <div className="absolute top-8 right-8 z-10">
        <button
          onClick={() => redirect("/admin")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-slate-800 hover:border-white/20 rounded-xl text-slate-300 hover:text-white text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          Admin Panel
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Side: Instructions / Status */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-outfit font-bold leading-tight">
              Welcome to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                Arduino Day
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-md">
              Please present your ticket QR code to the scanner to check in.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass p-6 rounded-2xl flex items-center gap-4 border-white/5"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-slate-300 font-medium">
                  Ready for next scan...
                </p>
              </motion.div>
            )}

            {status === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass border-blue-500/30 bg-blue-500/10 p-6 rounded-2xl flex items-center gap-4"
              >
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <p className="text-blue-100 font-medium text-lg">{message}</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass border-green-500/30 bg-green-500/10 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-green-400" />
                </motion.div>
                <div>
                  <h3 className="text-3xl font-outfit font-bold text-white mb-2">
                    {guestName}
                  </h3>
                  <p className="text-green-200 font-medium">{message}</p>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass border-red-500/30 bg-red-500/10 p-6 rounded-2xl flex items-center gap-4"
              >
                <XCircle className="w-8 h-8 text-red-400" />
                <p className="text-red-100 font-medium text-lg">{message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Scanner Camera */}
        <div className="order-1 lg:order-2">
          <div className="relative aspect-square w-full max-w-[450px] mx-auto rounded-3xl overflow-hidden glass p-2 ring-1 ring-white/20 shadow-2xl shadow-blue-900/20">
            {/* The scanner component container */}
            <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-900 [&_video]:scale-x-[-1]">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleScan(
                      status,
                      result[0].rawValue,
                      setStatus,
                      setMessage,
                      setGuestName,
                    );
                  }
                }}
                components={{
                  onOff: true, // Show torch button
                }}
                styles={{
                  container: {
                    width: "100%",
                    height: "100%",
                  },
                }}
              />

              {/* Scanner decorative overlay for cool vibes */}
              <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none rounded-2xl">
                <div className="absolute top-1/2 left-0 w-full h-px bg-blue-500/50 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite] opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
