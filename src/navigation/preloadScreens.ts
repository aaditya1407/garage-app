/**
 * Screen Module Pre-loader
 * 
 * iOS Safari has a very small call stack limit (~1 000 frames on mobile).
 * React's render pipeline consumes ~200 frames before reaching our
 * components.  Any synchronous require() during render adds module-
 * loading frames on top, which overflows Safari's stack.
 *
 * Fix: pre-load ALL screen modules inside setTimeout(0) which runs in
 * a fresh, shallow call stack.  Once loaded, Metro's require() returns
 * the cached module instantly (zero additional frames).
 */

let _ready = false;
const _callbacks: (() => void)[] = [];

export function onScreensReady(cb: () => void) {
  if (_ready) { cb(); return; }
  _callbacks.push(cb);
}

export function areScreensReady() {
  return _ready;
}

function preload() {
  try {
    // ── Auth screens ──
    require('../screens/LandingScreen');
    require('../screens/LoginScreen');
    require('../screens/SignupChoiceScreen');
    require('../screens/GarageOnboardingScreen');
    require('../screens/RegistrationThankYouScreen');
    require('../screens/StaffSignupScreen');
    require('../screens/StaffLoginScreen');
    require('../screens/StaffHomeScreen');
    require('../screens/VerificationSuccessScreen');
    require('../screens/HomeScreen');
  } catch (e) {
    console.warn('Screen preload batch 1 failed:', e);
  }

  // Second batch in another fresh stack frame
  setTimeout(() => {
    try {
      // ── App screens ──
      require('../screens/customers/CustomerListScreen');
      require('../screens/customers/CustomerFormScreen');
      require('../screens/customers/CustomerHistoryScreen');
      require('../screens/vehicles/VehicleListScreen');
      require('../screens/vehicles/VehicleFormScreen');
      require('../screens/jobcards/JobCardScreen');
      require('../screens/jobcards/JobCardListScreen');
      require('../screens/jobcards/JobCardDetailsScreen');
      require('../screens/inventory/InventoryScreen');
      require('../screens/inventory/InventoryFormScreen');
    } catch (e) {
      console.warn('Screen preload batch 2 failed:', e);
    }

    // Third batch
    setTimeout(() => {
      try {
        require('../screens/billing/BillingQueueScreen');
        require('../screens/billing/BillingScreen');
        require('../screens/billing/InvoiceListScreen');
        require('../screens/billing/CreateInvoiceScreen');
        require('../screens/staff/StaffListScreen');
        require('../screens/staff/StaffFormScreen');
        require('../screens/BranchManagerScreen');
        require('../screens/BranchFormScreen');
        require('../screens/OwnerDashboardScreen');
        require('../screens/BranchDashboardScreen');
      } catch (e) {
        console.warn('Screen preload batch 3 failed:', e);
      }

      _ready = true;
      _callbacks.forEach((cb) => { try { cb(); } catch {} });
      _callbacks.length = 0;
    }, 0);
  }, 0);
}

// Kick off preloading immediately (runs in a fresh call stack via setTimeout)
setTimeout(preload, 0);
