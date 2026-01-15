// chrome-extension-example.js
// This shows how to integrate the backend with your Chrome extension

const BACKEND_URL = 'https://your-backend-url.com'; // Change after deployment

// ============================================
// UPGRADE TO PREMIUM FLOW
// ============================================

async function initiatePremiumUpgrade(product = 'tivity') {
  try {
    // Get user email (you might have this from user input or stored)
    const userEmail = await getUserEmail(); // Your function to get/prompt for email
    
    const response = await fetch(`${BACKEND_URL}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: product,
        email: userEmail,
        deviceId: chrome.runtime.id // Unique extension ID
      })
    });
    
    const data = await response.json();
    
    if (data.url) {
      // Open Stripe checkout in new tab
      chrome.tabs.create({ url: data.url });
      
      // Store the session ID to verify later
      await chrome.storage.local.set({ 
        pendingCheckoutSession: data.sessionId,
        checkoutEmail: userEmail 
      });
      
      // Listen for when user completes checkout
      listenForCheckoutCompletion();
    }
  } catch (error) {
    console.error('Error initiating upgrade:', error);
    showUpgradeError();
  }
}

// ============================================
// VERIFY PREMIUM STATUS
// ============================================

async function checkPremiumStatus() {
  try {
    // Try to get stored customer info
    const stored = await chrome.storage.sync.get(['userEmail', 'customerId', 'isPremium']);
    
    if (!stored.userEmail && !stored.customerId) {
      // No premium setup yet
      return { isPremium: false };
    }
    
    const response = await fetch(`${BACKEND_URL}/verify-premium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: stored.userEmail,
        customerId: stored.customerId
      })
    });
    
    const data = await response.json();
    
    // Store the result
    await chrome.storage.sync.set({
      isPremium: data.isPremium,
      customerId: data.customerId,
      userEmail: data.email,
      lastChecked: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error checking premium status:', error);
    // Return cached status if API fails
    return { isPremium: stored.isPremium || false };
  }
}

// ============================================
// PERIODIC STATUS CHECKS
// ============================================

// Check premium status on extension startup
chrome.runtime.onStartup.addListener(async () => {
  await checkPremiumStatus();
});

// Check premium status daily
chrome.alarms.create('checkPremium', { periodInMinutes: 1440 }); // 24 hours

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkPremium') {
    await checkPremiumStatus();
  }
});

// ============================================
// SUCCESS PAGE HANDLER (after Stripe checkout)
// ============================================

// Create a success.html page that loads after successful payment
// In success.html's JavaScript:

async function handleCheckoutSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (sessionId) {
    // Verify the payment completed
    const status = await checkPremiumStatus();
    
    if (status.isPremium) {
      // Success! Update UI
      document.getElementById('status').textContent = 'Payment successful! Premium features unlocked.';
      
      // Close this tab after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }
}

// ============================================
// FEATURE GATING EXAMPLE
// ============================================

async function usePremiumFeature(featureName) {
  const status = await checkPremiumStatus();
  
  if (!status.isPremium) {
    // Show upgrade prompt
    showUpgradePrompt(featureName);
    return false;
  }
  
  // User is premium, allow feature
  return true;
}

// Example usage in your extension
async function enableAdvancedBlocking() {
  const canUse = await usePremiumFeature('Advanced Blocking');
  
  if (canUse) {
    // Enable the feature
    enableFeature();
  }
}

// ============================================
// SYNC ACROSS DEVICES (Chrome Sync API)
// ============================================

// When premium status is verified, it automatically syncs across devices
// because we use chrome.storage.sync

// Listen for changes from other devices
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.isPremium) {
    const newStatus = changes.isPremium.newValue;
    console.log('Premium status synced from another device:', newStatus);
    
    // Update UI across all tabs
    updatePremiumUI(newStatus);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserEmail() {
  // Check if we already have it
  const stored = await chrome.storage.sync.get('userEmail');
  if (stored.userEmail) return stored.userEmail;
  
  // Otherwise, prompt user (implement your own UI)
  // For now, return a placeholder
  return prompt('Enter your email for premium upgrade:');
}

function showUpgradePrompt(featureName) {
  // Implement your upgrade UI
  console.log(`${featureName} requires premium. Showing upgrade prompt.`);
}

function showUpgradeError() {
  // Implement error handling UI
  console.error('Failed to initiate upgrade');
}

function listenForCheckoutCompletion() {
  // Poll for completion or use Chrome message passing
  // This is a simple polling example
  const checkInterval = setInterval(async () => {
    const status = await checkPremiumStatus();
    if (status.isPremium) {
      clearInterval(checkInterval);
      console.log('Premium upgrade completed!');
      // Update UI
    }
  }, 5000); // Check every 5 seconds
  
  // Stop checking after 10 minutes
  setTimeout(() => clearInterval(checkInterval), 600000);
}

function updatePremiumUI(isPremium) {
  // Update all UI elements to reflect premium status
  console.log('Updating UI, premium status:', isPremium);
}

// ============================================
// EXPORTS (if using modules)
// ============================================

// If you're using ES modules in your extension:
// export { checkPremiumStatus, initiatePremiumUpgrade, usePremiumFeature };
