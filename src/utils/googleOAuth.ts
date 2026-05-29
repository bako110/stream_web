/**
 * Google OAuth2 popup — retourne un access_token compatible avec
 * l'endpoint backend POST /auth/oauth/google { access_token }.
 *
 * Utilise window.google.accounts.oauth2 (Google Identity Services)
 * qui retourne un vrai access_token OAuth2, contrairement à
 * google.accounts.id (One Tap) qui retourne un ID token JWT.
 */
export function googleOAuthPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
    if (!clientId) { reject(new Error('VITE_GOOGLE_CLIENT_ID manquant')); return; }

    // Vérifier que le SDK est chargé
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google SDK non chargé'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
}
