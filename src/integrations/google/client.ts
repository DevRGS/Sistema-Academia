// Google API Client Configuration
const GOOGLE_CLIENT_ID = '473564668132-54l6d876q74heoro10dnm5nnr58fdv6p.apps.googleusercontent.com';

// Declare global types for Google APIs
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export const initializeGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.gapi.client && window.gapi.client.sheets) {
      resolve();
      return;
    }

    // Load gapi client (only for Sheets/Drive API, not for auth)
    window.gapi.load('client', async () => {
      try {
        // Initialize gapi client without auth (we'll use GIS token)
        await window.gapi.client.init({
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        resolve();
      } catch (error) {
        console.error('Error initializing Google API:', error);
        reject(error);
      }
    });
  });
};

export const signInWithGoogle = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid profile email https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          console.log('Token received in callback, storing...');
          // Store token in localStorage
          setAccessToken(response.access_token);
          
          // Initialize gapi client first if needed
          if (window.gapi && window.gapi.client) {
            if (!window.gapi.client.sheets) {
              try {
                await window.gapi.client.init({
                  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                console.log('GAPI client initialized in callback');
              } catch (err) {
                console.error('Error initializing gapi after token:', err);
              }
            }
            // Set token in gapi client for API calls - use the correct format
            window.gapi.client.setToken({ access_token: response.access_token });
            console.log('Token set in gapi client in callback, token length:', response.access_token?.length);
            // Verify it was set
            const verifyToken = window.gapi.client.getToken();
            if (verifyToken && verifyToken.access_token) {
              console.log('Token verified in gapi client');
            } else {
              console.error('Token NOT set in gapi client!');
            }
          }
          resolve(response);
        }
      },
    });
    tokenClient.requestAccessToken();
  });
};

// Store token in localStorage for persistence
const TOKEN_STORAGE_KEY = 'google_access_token';

export const getAccessToken = (): string | null => {
  // Try to get from gapi first (if set)
  if (window.gapi?.client?.getToken()?.access_token) {
    const token = window.gapi.client.getToken().access_token;
    // Sync with localStorage
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    return token;
  }
  // Fallback to localStorage
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAccessToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  
  // Also set in gapi client if available
  if (window.gapi && window.gapi.client) {
    if (token) {
      window.gapi.client.setToken({ access_token: token });
    } else {
      window.gapi.client.setToken('');
    }
  }
};

export const signOutGoogle = (): void => {
  const token = getAccessToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token);
  }
  setAccessToken(null);
  if (window.gapi?.client) {
    window.gapi.client.setToken('');
  }
};

export { GOOGLE_CLIENT_ID };

