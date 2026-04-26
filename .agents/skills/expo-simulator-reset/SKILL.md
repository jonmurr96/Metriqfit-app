---
name: expo-simulator-reset
description: >-
  Kills the Metro packager, uninstalls Expo Go from the iOS simulator to clear all local data, and starts a fresh packager. Use when the user asks to hard reset the simulator, kill the packager and reinstall Expo, or start over from the signin screen.
---
# Expo Simulator Reset

This skill resets the Expo local development environment on the iOS Simulator, ensuring all previously cached data (like `AsyncStorage` and `UserDefaults`) is wiped, and starts the packager fully clean. This is usually the fastest way to get back to the sign-in/onboarding screen reliably.

## Required Steps

Execute these steps in order using the run_command tool:

### 1. Kill the Packager
Find any process running on port 8081 and forcefully terminate it to free up the Metro port.

```bash
lsof -t -i:8081 | xargs kill -9 || true
```

### 2. Uninstall Expo Go
Uninstall the Expo Go app from the currently booted simulator in order to wipe all local storage databases.

```bash
xcrun simctl uninstall booted host.exp.Exponent
```

### 3. Restart Expo with `--ios` and `--clear`
Launch the Expo process. The `--clear` flag purges the Metro plugin cache, and the `--ios` flag tells Expo to download a fresh Expo Go binary, install it onto the simulator, and automatically open this project.

_Note: If running as a background command for the agent, this is normally fine. Otherwise notify the user to run this in their own visible terminal tab._

```bash
npx expo start --ios --clear
```

### 4. Verify Sign-In Screen
Once Expo launches the app, since all prior data on the device has been erased, the application will default to its initial state—usually the Sign In or Onboarding screen.

> [!TIP]
> If the user also wants to bypass the sign-in process after resetting the simulator, inform them about the `metriqfit-ios-sign-in` skill which contains auth-automation scripts.
