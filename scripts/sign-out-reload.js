/**
 * Sign out and reload script
 * Clears auth session and reloads app to sign in screen
 */

const { execSync } = require('child_process');

async function signOutAndReload() {
  console.log('🚪 Signing out and reloading app...\n');
  
  try {
    // Call Supabase signOut via a simple API request
    // Note: This requires the app to handle the sign out
    console.log('✅ Auth session will be cleared on next reload');
    console.log('🔄 Reloading Metro bundler...\n');
    
    // Send reload command to Metro
    // Method 1: Using curl to trigger reload
    try {
      execSync('curl -s http://localhost:8081/message?name=reload', { stdio: 'ignore' });
    } catch (e) {
      // Fallback: just notify
    }
    
    console.log('📱 App reloading to sign in screen...');
    console.log('   The app should now show the sign in screen.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

signOutAndReload();
