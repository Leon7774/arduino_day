"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { CheckCircle2, XCircle, Loader2, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { handleScan } from "@/utils/handleScan";
import { redirect } from "next/navigation";
import Image from "next/image";

export type ScanStatus = "idle" | "scanning" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-teal-50/40 to-orange-50/30 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-teal-100/60 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-100/60 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Admin Panel Button */}
      <div className="absolute top-8 right-8 z-10">
        <button
          onClick={() => redirect("/admin")}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 hover:bg-white hover:border-teal-300 rounded-xl text-slate-600 hover:text-teal-700 text-sm font-semibold transition-all shadow-sm cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          Admin Panel
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center mt-16 lg:mt-0 relative z-10">
        {/* Left Side */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          {/* Large logo — desktop only */}
          <div className="hidden lg:block">
            <Image
              src="/arduino_day.png"
              alt="Arduino Day Mindanao 2026"
              width={460}
              height={130}
              className="object-contain -ml-2"
              priority
            />
          </div>

          {/* Divider + tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-teal-400/70 to-transparent" />
              <span className="text-xs font-bold tracking-[0.35em] uppercase text-teal-600">
                Official Check-in
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-orange-400/70 to-transparent" />
            </div>
            <p className="text-slate-500 text-base sm:text-lg max-w-md font-medium leading-relaxed">
              Welcome! Scan your ticket QR code to check in and start your
              Arduino Day experience.
            </p>
          </div>

          {/* Status Card */}
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/70 backdrop-blur-sm border border-slate-200 shadow-sm p-5 rounded-2xl flex items-center gap-4"
              >
                <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
                <p className="text-slate-600 font-medium">
                  Ready — point camera at QR code
                </p>
              </motion.div>
            )}

            {status === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-blue-50 border border-blue-200 shadow-sm p-5 rounded-2xl flex items-center gap-4"
              >
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-blue-700 font-medium text-lg">{message}</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-teal-50 border border-teal-200 shadow-md shadow-teal-100/80 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center border-2 border-teal-300"
                >
                  <CheckCircle2 className="w-12 h-12 text-teal-500" />
                </motion.div>
                <div>
                  <h3 className="text-3xl font-outfit font-black text-slate-800 mb-1 tracking-tight">
                    {guestName}
                  </h3>
                  <p className="text-teal-600 font-bold tracking-widest uppercase text-sm">
                    {message}
                  </p>
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-orange-50 border border-orange-200 shadow-sm p-6 rounded-2xl flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200 flex-shrink-0">
                  <XCircle className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-orange-700 font-bold text-lg tracking-tight">
                  {message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Scanner */}
        <div className="order-1 lg:order-2">
          <div className="relative flex items-center justify-center">
            {/* <div className="absolute inset-0 rounded-full bg-teal-200/40 blur-3xl scale-90 pointer-events-none" /> */}
            <div className="relative aspect-square w-full max-w-[440px] mx-auto rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm border border-slate-200/80 shadow-xl shadow-teal-100/60 p-2">
              {/* Scanner pill label */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                  Scan Ticket
                </span>
              </div>

              <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-100 [&_video]:scale-x-[-1]">
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
                  components={{ onOff: true }}
                  styles={{ container: { width: "100%", height: "100%" } }}
                />
                {/* Scan line overlay */}
                {/* <div className="absolute inset-0 border-2 border-teal-400/30 pointer-events-none rounded-2xl">
                  <div className="absolute top-1/2 left-0 w-full h-px bg-teal-500/60 shadow-[0_0_8px_3px_rgba(20,184,166,0.4)] animate-[scan_2s_ease-in-out_infinite]" />
                </div> */}
                {/* Corner markers
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-500 rounded-br-lg" />
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
        <p className="text-slate-400 text-xs tracking-widest uppercase font-medium whitespace-nowrap">
          Arduino Day Mindanao 2026 · Official Check-in System
        </p>
      </div>
    </main>
  );
}
