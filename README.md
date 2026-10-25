# AeroStride

> **The Privacy-First, Environment-Aware GPS Run Tracker & Adaptive Training Companion.**  
> *Zero subscriptions. Zero data harvesting. Zero lost runs.*

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo_SDK-57-000020?logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## 🏃 Overview

**AeroStride** is an offline-native, privacy-preserving running and endurance training platform built for athletes who care about their physical health, training consistency, and data sovereignty.

Unlike traditional commercial running apps that treat users as data sources to monetize, AeroStride runs entirely on your device. Every route point, heartbeat of pace data, and workout split is persisted in a local, encrypted-ready SQLite database. It pairs rock-solid background GPS tracking with **hyperlocal Air Quality Index (AQI)** insights, **dynamic algorithmic training plans**, and **interactive volume analytics**—all without requiring an account, login, or monthly subscription.

```
       [ 📍 High-Precision GPS Engine ]
                     │
                     ▼
          [ Pure State Tracker ] ──(Every 5s)──► [ Local SQLite Storage ]
                     │                                (Runs + Snapshots)
      ┌──────────────┴──────────────┐
      ▼                             ▼
[ Live Interactive Map ]    [ Adaptive AI Coach ]
(Polyline + Speed Cues)     (AQI + Personalized Plans)
```

---

## ⚡ What Makes AeroStride More Valuable than Strava?

[Strava](https://www.strava.com) is the mainstream incumbent, but over the years it has drifted into an engagement-seeking social network gated by expensive paywalls and compromised by high-profile privacy scandals. 

AeroStride was architected from day one to rethink what a modern athlete's companion should be:

| Feature / Philosophy | 🔴 Strava | 🟢 AeroStride |
| :--- | :--- | :--- |
| **Pricing & Paywalls** | **$11.99/mo or $79.99/yr** for basic analytics, routes, and segment leaderboards | **100% Free & Open-Source Forever**. Every chart, metric, and plan is unlocked. |
| **Data Privacy & Telemetry** | Cloud-mandatory. Has leaked secret military bases and athlete residential addresses via public heatmaps. | **True Zero-Knowledge Offline Architecture**. All GPS and biometric data stays on your device. No cloud leak risk. |
| **Account Requirement** | Mandatory registration, email harvesting, social graph tracking | **Zero sign-in required**. Launch the app and run immediately. |
| **Environmental Health** | **Completely blind to air quality**. Tells you to run even in hazardous wildfire or PM2.5 smog. | **Real-Time Air Quality Index (AQI)** integration. Provides breathing safety recommendations before you step out. |
| **Crash & Battery Resilience** | If your phone dies mid-run or the OS kills the background process, your session is often lost. | **5-Second Atomic SQLite Snapshotting**. Automatic crash recovery brings back your run up to the exact last GPS fix. |
| **Training Plans** | Static, generic routines locked behind premium tiers. | **Dynamic Algorithmic Training Engine** that calibrates distance, pace, and progression to your age, weight, gender, and live velocity. |
| **Weekly Streaks & Motivation** | Buried in social feeds and sponsored challenges. | **Dedicated Weekly Streak & Flame Engine** with scheduled local reminder notifications. |

### 1. Privacy as an Invariant, Not a Setting
Strava requires sending your coordinate history to third-party cloud servers, exposing runner patterns, commute routines, and home locations. AeroStride operates on a **Local-First principle**: your data never leaves your hardware unless you explicitly choose to export it.

### 2. Environmental & Respiratory Intelligence
High-intensity cardio in polluted air causes permanent pulmonary stress. AeroStride integrates live environmental sensing (via IQAir) directly into your training calendar. If the Air Quality Index drops to unhealthy levels, AeroStride dynamically advises whether to scale back intensity or run indoors.

### 3. Fault-Tolerant Engineering
Built on a pure functional state machine (`src/tracking/tracker.ts`), AeroStride continuously serializes tracking state every 5 seconds. If Android's battery manager kills the process or your phone runs out of charge, relaunching the app instantly presents an **"Unsaved run found"** dialog, allowing you to resume or review your run without losing a single meter.

### 4. The Future Horizon
Where Strava focuses on corporate advertising, sponsored challenges, and algorithmic social feeds, AeroStride's roadmap is dedicated to athlete-centric innovation:
- **On-Device Edge ML Coaching**: Real-time cadence and stride efficiency analysis using local device accelerometers without cloud latency.
- **Decentralized Peer-to-Peer Run Clubs**: Share verified routes and challenge friends via local mesh (Bluetooth LE) and encrypted P2P syncing—no centralized corporate servers.
- **Standard Open Data Interoperability**: Direct GPX, TCX, and FIT file export for complete ownership of your fitness records.

---

## 🛠️ Key Features

- **🎯 Navbar Run Launcher**: Dedicated prominent circular run action button docked directly in the bottom navigation bar with real-time state feedback (`RUN`, `LIVE`, `PAUSED`, `REVIEW`).
- **📊 Comprehensive Home Analytics**: Interactive daily, weekly, and monthly mileage bar charts with tap-to-inspect metrics, total time, distance, pace, and estimated calorie expenditure.
- **🔥 Weekly Streak Tracker**: Track consecutive active running weeks with visual weekday bubbles (`[M] [T] [W] [T] [F] [S] [S]`) and personal best streak trophies.
- **📅 Adaptive Training Plans**: Algorithmic periodization for Speed, Distance, Fitness, or Weight Loss tailored to personal bio-metrics (age, weight, height, gender).
- **🌬️ Hyperlocal Air Quality**: Integrated IQAir weather and air quality monitoring with real-time runner safety advisories.
- **🔔 Local Run Reminders**: On-device scheduled notifications reminding you to complete your daily training quest before breaking your weekly streak.
- **🛡️ High-Precision GPS Filtering**: Multi-layer filtering rejecting GPS jitter (< 2 m), satellite drift (> 30 m accuracy tolerance), and impossible speed spikes (> 43 km/h).
- **🌗 Sunlight-Optimized Theme**: High-contrast dark and light modes tailored for maximum legibility in direct sunlight.

---

## 🚀 Getting Started

Follow this tutorial to set up and run AeroStride on your development machine and mobile device.

### Prerequisites

Ensure you have the following installed on your machine:

1. **Node.js** (v18.x or v20.x LTS recommended) — [Download Node.js](https://nodejs.org/)
2. **Git** — [Download Git](https://git-scm.com/)
3. **Android Studio** (for Android development) or **Xcode** (for iOS development, macOS only)
4. **Expo Go** app installed on your physical mobile device (for quick UI testing) or an Android/iOS emulator

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Achmad96/AeroStride.git
cd AeroStride

# Install all dependencies
npm install
```

> [!TIP]
> If you encounter peer dependency warnings, run `npm install --legacy-peer-deps` or `npx expo install --fix`.

---

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# IQAir AirVisual API Key for live air quality recommendations
EXPO_PUBLIC_IQAIR_API_KEY=your_iqair_api_key_here

# CartoCDN / Tile API Key for OpenStreetMap tile rendering
EXPO_PUBLIC_CARTOCDN_API_KEY=your_cartocdn_key_here
```

*(Note: The app runs gracefully even if API keys are omitted; default fallback map styles and placeholder air quality statuses will be displayed.)*

---

### Step 3: Launching the App

AeroStride supports two execution modes:

#### Option A: Fast UI Testing with Expo Go (Foreground Only)
*Ideal for testing user interfaces, calendars, and analytics without compiling native code.*

```bash
# Start local Metro bundler
npx expo start

# Or start over an internet tunnel (works across different networks)
npm run start:tunnel
```
Scan the QR code displayed in your terminal using the **Expo Go** app (Android) or the **Camera** app (iOS).

> [!NOTE]
> Mobile operating systems (Android & iOS) prohibit background location tracking inside the generic Expo Go client. To record runs while your screen is locked or while switching apps, use a **Development Build** (Option B).

#### Option B: Full Native Development Build (Recommended)
*Enables native background location foreground service, notifications, and boot receivers.*

```bash
# For Android (requires Android SDK / Emulator or connected USB device)
npx expo run:android

# For iOS (requires macOS and Xcode)
npx expo run:ios
```

Once compiled, start the development client bundler:
```bash
npm run start:dev-client
# Or over tunnel:
npm run start:dev-client:tunnel
```

---

### Step 4: Building a Standalone APK

To generate an installable `.apk` file that you can install directly on any Android device without connecting to a computer:

```bash
# Install EAS CLI globally if you haven't already
npm install -g eas-cli

# Log into your Expo account
eas login

# Build a standalone preview APK
npx eas build -p android --profile preview
```

---

## 🧪 Verification & Testing

AeroStride includes automated unit tests covering mathematical distance calculations, filtering thresholds, streak computation, and crash recovery.

```bash
# Run all Jest unit tests
npm test

# Run TypeScript type safety verification
npm run typecheck
```

### Testing the Notification Reminder

1. Open the app and navigate to the **Settings** tab.
2. Under the **Reminders** section, ensure **Daily Run Reminder** is enabled.
3. Tap **"Send Test Reminder 🔔"**.
4. A high-priority notification will immediately trigger in your notification shade, validating channel creation and delivery.

---

## 📂 Project Architecture

```
aerostride/
├── app/                           # Expo Router filesystem-based navigation
│   ├── _layout.tsx                # Root stack, location task & notification init
│   ├── (tabs)/                    # Bottom tab navigator
│   │   ├── _layout.tsx            # Floating navbar with centered [RUN] button
│   │   ├── index.tsx              # Home: Weekly Streak, Today's Target, Analytics
│   │   ├── plan.tsx               # Training Plan Calendar & Daily Run Quests
│   │   ├── run.tsx                # Dynamic route handler for active/summary runs
│   │   ├── history.tsx            # Run logs list & long-press deletion
│   │   └── settings.tsx           # Unit toggle, reminder settings, profile & goals
│   ├── active.tsx                 # Fullscreen active tracking HUD with live map
│   ├── summary.tsx                # Post-workout overview, metrics, Save/Discard
│   ├── permission.tsx             # Location & background permission onboarding
│   └── detail/[id].tsx            # Historical run detailed route analysis
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── AnalyticsView.tsx      # Interactive volume charts & pace trends
│   │   ├── RunMap.tsx             # Route polyline map (OpenStreetMap/Google)
│   │   ├── RunNavbarButton.tsx    # Bottom navigation glowing action button
│   │   ├── WeeklyStreakCard.tsx   # Weekday activity bubbles & streak flame
│   │   └── Button.tsx, Stat.tsx   # Design system primitives
│   ├── db/
│   │   └── database.ts            # Local SQLite schema (runs, kv snapshots)
│   ├── store/
│   │   ├── runStore.ts            # Zustand store for active run telemetry
│   │   ├── planStore.ts           # Training plan store & run auto-synchronizer
│   │   └── settingsStore.ts       # Profile & measurement unit persistence
│   ├── theme.ts                   # Daylight-readable color tokens
│   └── tracking/
│       ├── airQuality.ts          # IQAir API integration & health advisories
│       ├── analytics.ts           # Volume aggregations, pace trend math
│       ├── geo.ts                 # Haversine distance, speed, pace algorithms
│       ├── locationService.ts     # Expo Location background foreground service
│       ├── notificationService.ts # Local reminder scheduler & Android channels
│       ├── streak.ts              # Consecutive weekly streak evaluation engine
│       ├── tracker.ts             # Pure tracking state machine & crash recovery
│       ├── trainingPlan.ts        # Algorithmic training generator & calendar
│       └── __tests__/             # Comprehensive test suites
├── app.json                       # Native permissions, plugins & build config
└── package.json                   # Dependencies and scripts
```

---

## 🔒 Permissions & Safety

AeroStride requests only the permissions strictly required to perform tracking on your behalf:
- `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: To read GPS coordinates.
- `ACCESS_BACKGROUND_LOCATION` & `FOREGROUND_SERVICE_LOCATION`: To keep recording your route when your phone is in your pocket or the screen is locked.
- `POST_NOTIFICATIONS`: To display the active tracking status and deliver your scheduled run reminder.
- `RECEIVE_BOOT_COMPLETED` & `WAKE_LOCK`: To guarantee background tracking task reliability on modern Android versions without premature OS termination.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Build upon it, customize it, and run free.

## 📂 Project Architecture

```
aerostride/
├── app/                           # Expo Router filesystem-based navigation
│   ├── _layout.tsx                # Root stack, location task & notification init
│   ├── (tabs)/                    # Bottom tab navigator
│   │   ├── _layout.tsx            # Floating navbar with centered [RUN] button
│   │   ├── index.tsx              # Home: Weekly Streak, Today's Target, Analytics
│   │   ├── plan.tsx               # Training Plan Calendar & Daily Run Quests
│   │   ├── run.tsx                # Dynamic route handler for active/summary runs
│   │   ├── history.tsx            # Run logs list & long-press deletion
│   │   └── settings.tsx           # Unit toggle, reminder settings, profile & goals
│   ├── active.tsx                 # Fullscreen active tracking HUD with live map
│   ├── summary.tsx                # Post-workout overview, metrics, Save/Discard
│   ├── permission.tsx             # Location & background permission onboarding
│   └── detail/[id].tsx            # Historical run detailed route analysis
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── AnalyticsView.tsx      # Interactive volume charts & pace trends
│   │   ├── RunMap.tsx             # Route polyline map (OpenStreetMap/Google)
│   │   ├── RunNavbarButton.tsx    # Bottom navigation glowing action button
│   │   ├── WeeklyStreakCard.tsx   # Weekday activity bubbles & streak flame
│   │   └── Button.tsx, Stat.tsx   # Design system primitives
│   ├── db/
│   │   └── database.ts            # Local SQLite schema (runs, kv snapshots)
│   ├── store/
│   │   ├── runStore.ts            # Zustand store for active run telemetry
│   │   ├── planStore.ts           # Training plan store & run auto-synchronizer
│   │   └── settingsStore.ts       # Profile & measurement unit persistence
│   ├── theme.ts                   # Daylight-readable color tokens
│   └── tracking/
│       ├── airQuality.ts          # IQAir API integration & health advisories
│       ├── analytics.ts           # Volume aggregations, pace trend math
│       ├── geo.ts                 # Haversine distance, speed, pace algorithms
│       ├── locationService.ts     # Expo Location background foreground service
│       ├── notificationService.ts # Local reminder scheduler & Android channels
│       ├── streak.ts              # Consecutive weekly streak evaluation engine
│       ├── tracker.ts             # Pure tracking state machine & crash recovery
│       ├── trainingPlan.ts        # Algorithmic training generator & calendar
│       └── __tests__/             # Comprehensive test suites
├── app.json                       # Native permissions, plugins & build config
└── package.json                   # Dependencies and scripts
```

---

## 🔒 Permissions & Safety

AeroStride requests only the permissions strictly required to perform tracking on your behalf:
- `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: To read GPS coordinates.
- `ACCESS_BACKGROUND_LOCATION` & `FOREGROUND_SERVICE_LOCATION`: To keep recording your route when your phone is in your pocket or the screen is locked.
- `POST_NOTIFICATIONS`: To display the active tracking status and deliver your scheduled run reminder.
- `RECEIVE_BOOT_COMPLETED` & `WAKE_LOCK`: To guarantee background tracking task reliability on modern Android versions without premature OS termination.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Build upon it, customize it, and run free.

