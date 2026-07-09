/**
 * app.js — application bootstrap.
 *
 * Validates the stored token against the server on load before rendering
 * anything, preventing stale/expired sessions from reaching protected pages.
 */
auth.init();

if (auth.isLoggedIn()) {
  // Validate token server-side before entering the app
  auth.validate().then(valid => {
    if (valid) {
      router.navigate('dashboard');
    } else {
      // validate() already called logout() — go to login
      router.navigate('login');
    }
  });
} else {
  router.navigate('login');
}
