# VisioBall

A React Native mobile application for connecting to and controlling a BLE-enabled smart training ball. Built as a student prototype using Expo, Three.js, and `react-native-ble-plx`.

---

## Features

- **Bluetooth scanning & connection** - scans for nearby BLE devices, connects to the VisioBall, and maintains a persistent session across screens
- **3D ball visualization** - interactive Three.js model that responds to touch (pan to rotate) and reflects device state
- **Device control** - send BLE commands (`ON`, `OFF`, `FREQ:<hz>`, `SLEEP`, `WAKE`, custom) directly from the app
- **Radar screen** - animated BLE search visualization with pulse rings while scanning
- **Sound & music player** - track list with volume control, frequency slider, and playback UI
- **Light & dark theme** - full theme system with a deep navy dark mode and a periwinkle-blue light mode, applies to every screen
- **5 languages** - English, Dutch, French, German, Bulgarian (switch in Settings)
- **Settings** - theme toggle, language picker, links to Privacy Policy, Terms of Service, and Firmware History

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | [Expo Router](https://expo.github.io/router) v6 (file-based) |
| 3D Rendering | [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org) via `expo-gl` |
| Bluetooth | [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx) |
| Animations | React Native `Animated` API + `react-native-reanimated` |
| Styling | `StyleSheet.create` with a typed theme system |
| Gradients | `expo-linear-gradient` |
| i18n | Custom `I18nContext` with 5-locale translation map |

---

## Project Structure

```
visiobal/
├── app/                        # Screens (Expo Router file-based routing)
│   ├── _layout.tsx             # Root layout — providers + Stack navigator
│   ├── index.tsx               # Splash / loading screen
│   ├── landing.tsx             # Home screen — 3D ball, music player, scan button
│   ├── scan.tsx                # BLE device list + connect / disconnect
│   ├── control.tsx             # Main control screen — commands, sheet menu, tiles
│   ├── radar.tsx               # Animated radar while searching for a device
│   ├── sound.tsx               # Music player — track list, volume, frequency
│   ├── settings.tsx            # Theme toggle, language picker, links
│   ├── privacy.tsx             # Privacy policy
│   ├── terms.tsx               # Terms of service
│   └── firmware-history.tsx    # ESP32 firmware changelog
│
├── src/
│   ├── components/
│   │   ├── VisioballModel.tsx  # Three.js textured ball + background dust
│   │   ├── FrequencySlider.tsx # Custom PanResponder slider with step snapping
│   │   └── deviceListItem.tsx  # BLE scan result row
│   ├── context/
│   │   ├── ThemeContext.tsx    # isDark, theme, toggleTheme
│   │   └── I18nContext.tsx     # locale, setLocale, t(key)
│   ├── hooks/
│   │   └── useBluetoothSession.ts  # BLE session state (connect, disconnect, send)
│   ├── services/
│   │   └── bluetoothService.ts     # Low-level BLE scan + write logic
│   ├── i18n/
│   │   └── translations.ts    # All strings for en / nl / fr / de / bg
│   ├── types/
│   │   └── bluetooth.ts       # Shared BLE TypeScript types
│   └── utils/
│       ├── configureThreeNativeRenderer.ts
│       └── filterKnownThreeLogs.js
│
├── assets/                     # App icons, splash screen, ball texture
├── docs/                       # Architecture diagram, user flow, research docs
└── app.json                    # Expo project config (package name, plugins, EAS)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) — `npm install -g expo-cli`
- Android device or emulator (Bluetooth BLE requires a real device for actual connectivity)

### Install

```bash
git clone <repo-url>
cd visiobal
npm install
```

### Run

```bash
# Start the dev server
npm start

# Run directly on Android
npm run android

# Run on iOS
npm run ios

# Run in browser (BLE features unavailable)
npm run web
```

> **Note:** Expo Go does **not** support `react-native-ble-plx`. Use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) or `expo run:android` for Bluetooth features.

---

## Bluetooth Setup

The app communicates with an ESP32 over BLE using a UART-style service:

- **Device name:** `VisioBal`
- **Characteristics:** separate RX (write) and TX (notify)

### Android permissions

The following are already configured in `app.json`:

```json
"android.permissions": [
  "BLUETOOTH_SCAN",
  "BLUETOOTH_CONNECT",
  "ACCESS_FINE_LOCATION"
]
```

### Supported commands

| Command | Effect |
|---|---|
| `ON` | Start LED behavior |
| `OFF` | Stop LED behavior |
| `FREQ:<hz>` | Set blink frequency (1–10 Hz) |
| `SLEEP` | Enter low-power mode |
| `WAKE` | Exit low-power mode |
| `STATUS?` | Request current state (power, blink, frequency) |

---

## Internationalisation

Switch language in **Settings → Language**. Supported locales:

| Code | Language |
|---|---|
| `en` | English |
| `nl` | Dutch |
| `fr` | French |
| `de` | German |
| `bg` | Bulgarian |

All UI strings are defined in [`src/i18n/translations.ts`](src/i18n/translations.ts). The `t(key)` helper falls back to English if a key is missing in the active locale.

---

## Theme System

Every screen uses a `makeStyles(theme: ThemeColors)` pattern — styles are recomputed via `useMemo` whenever the theme changes. Toggle between dark and light in **Settings → Appearance**.

```ts
const { isDark, theme, toggleTheme } = useTheme();
```

`ThemeColors` covers 18 tokens: backgrounds, text levels, borders, gradient stops, tick marks, and status bar style.

---

## Linting

```bash
npm run lint
```

Uses the [Expo ESLint config](https://docs.expo.dev/guides/using-eslint/).

---

## Documentation

Additional project documentation is in the [`docs/`](docs/) folder:

- `Architecture-application.png` — system architecture diagram
- `Userflow Diagram - App.png` — screen-by-screen user flow
- `Visioball_App_Tech_Stack_Decisions.docx` — rationale for technology choices
- `MoSCoW Prioritisation – Visioball.docx` — feature priority list

---

## Disclaimer

VisioBall is a **student prototype** built for learning, testing, and demonstration purposes. It is not a production product. Features may be incomplete, and the app is provided as-is without any warranty.
