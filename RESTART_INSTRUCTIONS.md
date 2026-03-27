# Fix Network Request Error

## Steps to Fix:

1. **Stop the current Expo development server** (if running)
   - Press `Ctrl+C` in the terminal

2. **Clear Metro cache and restart:**
   ```bash
   npm start -- --clear
   ```

   Or alternatively:
   ```bash
   expo start --clear
   ```

3. **Reload the app in the simulator:**
   - In the iOS Simulator, press `Cmd+D` to open the developer menu
   - Tap "Reload" or press `Cmd+R`

## Why This Happens:

The app needs to pick up the environment variables from `.env` file. When you first start the development server, it loads these variables and passes them through `app.config.js` to make them available via `Constants.expoConfig.extra`.

If the server was already running when the `.env` file was created/modified, it won't have the updated values until you restart.

## Verify It Worked:

After reloading, the home screen should load data successfully without the "TypeError: Network request failed" error.
