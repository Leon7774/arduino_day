# Arduino Day — Event Check-In App

A real-time QR code check-in system built for Arduino Day events. Staff scan guest QR codes using a phone or laptop camera, and the app verifies and records attendance against a PostgreSQL database.

## Features

- 📸 **Live QR Code Scanner** — Camera-based scanning powered by `@yudiel/react-qr-scanner`
- ✅ **Instant Check-In** — Validates QR codes against a guest list and marks attendance in real time
- 🚫 **Duplicate Prevention** — Prevents guests from checking in more than once
- 🎨 **Polished UI** — Animated status feedback with Framer Motion and a glassmorphism design
- 🛠️ **QR Code Generator** — CLI utility to generate QR code images for guest tickets

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Drizzle ORM
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Environment Variables

Create a `.env.local` file in the project root with the following:

```env
DATABASE_URL=postgresql://user:password@host:5432/database_name
```

This is the **only** env file needed. It is used by both the Next.js app and Drizzle Kit for migrations.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up the Database

Create a `.env.local` file (see above), then push the schema to your database:

```bash
npx drizzle-kit push
```

Optionally, seed a test guest:

```bash
npx tsx seed.ts
```

### 3. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the scanner interface ready to check in guests.

## Generating QR Codes

Use the built-in CLI tool to generate QR code PNG images:

```bash
npm run generate-qr
```

This will prompt you to enter text (e.g. a guest's `qr_code_id`) and save the resulting PNG to the `qr-codes/` directory.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx            # Scanner UI (main page)
│   │   └── api/check-in/       # POST endpoint for check-in logic
│   └── db/
│       ├── schema.ts           # Drizzle schema (guests table)
│       └── index.ts            # Database connection
├── scripts/
│   └── generate-qr.ts         # QR code generator CLI
├── seed.ts                     # Database seed script
├── drizzle.config.ts           # Drizzle Kit configuration
└── qr-codes/                   # Generated QR code images
```
