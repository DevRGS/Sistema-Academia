import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, signOutGoogle, initializeGoogleAPI, getAccessToken } from '@/integrations/google/client';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'student' | 'personal';
  email?: string;
  height_cm?: number | string;
  weight_kg?: number | string;
  sex?: string;
  age?: number | string;
  routine?: string;
  locomotion_type?: string;
  locomotion_distance_km?: number | string;
  locomotion_time_minutes?: number | string;
  locomotion_days?: string[] | string; // Can be array or JSON string
};

type GoogleUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

type SessionContextType = {
  user: GoogleUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
const { select, insert, delete: deleteRow, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();

  useEffect(() => {
    const init = async () => {
      try {
        // Wait for Google APIs to load (only GIS is needed for auth)
        if (!window.google || !window.google.accounts) {
          await new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds max
            const checkInterval = setInterval(() => {
              attempts++;
              if ((window.google && window.google.accounts) || attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(undefined);
              }
            }, 100);
          });
        }

        // Check if user is already authenticated (from localStorage)
        const token = getAccessToken();

        if (token) {
          console.log('Found stored token, initializing...');
          // Initialize gapi for API calls (not for auth)
          try {
            await initializeGoogleAPI();
            // Ensure token is set in gapi client
            if (window.gapi && window.gapi.client) {
              window.gapi.client.setToken({ access_token: token });
              console.log('Stored token set in gapi client');
            }
          } catch (err) {
            console.warn('GAPI initialization warning (non-critical):', err);
          }
          await loadUserProfile();
        } else {
          console.log('No stored token found');
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Track retry attempts to prevent infinite loops
  const [profileLoadRetries, setProfileLoadRetries] = useState(0);
  const MAX_PROFILE_LOAD_RETRIES = 3;

  // Load user profile from database
  const loadUserProfile = async (forceRetry: boolean = false) => {
    // Don't require initialized for basic user info - we can get that from Google API
    try {
      const token = getAccessToken();
      if (!token) {
        console.log('No token available for loadUserProfile');
        return;
      }

      // Check retry limit
      if (!forceRetry && profileLoadRetries >= MAX_PROFILE_LOAD_RETRIES) {
        console.warn('Max profile load retries reached. Stopping to prevent infinite loop.');
        return;
      }

      if (!forceRetry) {
        setProfileLoadRetries(prev => prev + 1);
      }

      console.log('Fetching user info from Google...');
      // Get user info from Google
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userInfo.ok) {
        const userData = await userInfo.json();
        console.log('User data received:', userData.email);
        const googleUser: GoogleUser = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        };
        setUser(googleUser);

        // Load or create profile (only if database is initialized)
        if (initialized) {
          try {
            console.log('Database initialized, loading profile...');
            console.log('Searching for profile with ID:', userData.id, 'and email:', userData.email);
            // First, try to find by Google ID
            let profiles = await select<Profile & { email?: string }>('profiles', { eq: { column: 'id', value: userData.id } });
            console.log('Profiles found by ID:', profiles.length, profiles);
            
            // If not found by ID, try by email
            if (profiles.length === 0 && userData.email) {
              console.log('Trying to find profile by email:', userData.email);
              profiles = await select<Profile & { email?: string }>('profiles', { eq: { column: 'email', value: userData.email } });
              console.log('Profiles found by email:', profiles.length, profiles);
            }
            
            // Reset retry counter on success
            setProfileLoadRetries(0);
            
            if (profiles.length > 0) {
              // If multiple profiles found, get the most recent one (last in array, as Google Sheets returns in order)
              // But since we're filtering by ID, there should only be one. However, if there are duplicates,
              // we'll take the last one (most recently added)
              const profileData = profiles[profiles.length - 1];
              console.log('Profile found (using last if multiple):', profileData);
              
              // Parse locomotion_days if it's a string
              if (profileData.locomotion_days && typeof profileData.locomotion_days === 'string') {
                try {
                  profileData.locomotion_days = JSON.parse(profileData.locomotion_days);
                } catch {
                  profileData.locomotion_days = [];
                }
              }
              // Ensure all fields are properly set
              const completeProfile: Profile = {
                id: profileData.id || userData.id,
                first_name: profileData.first_name || userData.given_name || '',
                last_name: profileData.last_name || userData.family_name || '',
                role: profileData.role || 'student',
                email: profileData.email || userData.email,
                height_cm: profileData.height_cm,
                weight_kg: profileData.weight_kg,
                sex: profileData.sex,
                age: profileData.age,
                routine: profileData.routine,
                locomotion_type: profileData.locomotion_type,
                locomotion_distance_km: profileData.locomotion_distance_km,
                locomotion_time_minutes: profileData.locomotion_time_minutes,
                locomotion_days: profileData.locomotion_days,
              };
              console.log('Complete profile to set:', completeProfile);
              setProfile(completeProfile);
            } else {
              // Try to find temporary profile by email
              const allProfiles = await select<Profile & { email?: string }>('profiles');
              const tempProfile = allProfiles.find(p => p.email === userData.email && String(p.id || '').startsWith('temp_'));
              
              if (tempProfile) {
                console.log('Temp profile found, updating...');
                // Update temporary profile with Google ID
                const nameParts = userData.name ? userData.name.split(' ') : [];
                const updatedProfile: Profile = {
                  id: userData.id,
                  first_name: userData.given_name || tempProfile.first_name || nameParts[0] || '',
                  last_name: userData.family_name || tempProfile.last_name || nameParts.slice(1).join(' ') || '',
                  role: tempProfile.role || 'student',
                };
                
                // Delete temp profile and create new one with Google ID
                try {
                  await deleteRow('profiles', { column: 'id', value: tempProfile.id });
                } catch (e) {
                  console.error('Error deleting temp profile:', e);
                }
                
                await insert('profiles', updatedProfile);
                setProfile(updatedProfile);
              } else {
                console.log('No profile found. Profile will be created when user saves their data.');
                // Don't create profile automatically - wait for user to save data
                // Just set basic user info
                const nameParts = userData.name ? userData.name.split(' ') : [];
                const basicProfile: Profile = {
                  id: userData.id,
                  first_name: userData.given_name || nameParts[0] || '',
                  last_name: userData.family_name || nameParts.slice(1).join(' ') || '',
                  role: 'student',
                };
                setProfile(basicProfile);
              }
            }
          } catch (dbError: any) {
            console.error('Error accessing database:', dbError);
            // If rate limited, don't throw - just log and continue
            if (dbError.status === 429 || dbError.result?.error?.code === 429) {
              console.warn('Rate limited while loading profile. Will retry later.');
              // Don't increment retry counter here - it's already incremented above
            }
            // Even if DB fails, we have the user info, so we can continue
          }
        } else {
          console.log('Database not initialized yet, will load profile when ready');
        }
      } else {
        console.error('Failed to fetch user info:', userInfo.status);
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      // If rate limited, don't throw - just log
      if (err.status === 429 || err.result?.error?.code === 429) {
        console.warn('Rate limited. Profile load will be retried later.');
        return;
      }
      throw err;
    }
  };

  // Track if we've already attempted to load profile to prevent loops
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);
  const [lastSpreadsheetId, setLastSpreadsheetId] = useState<string | null>(null);

  // Watch for initialized state to load profile (only once)
  useEffect(() => {
    if (initialized && getAccessToken() && !profileLoadAttempted && !user) {
      // Só carregar automaticamente se não tiver usuário ainda (inicialização normal)
      setProfileLoadAttempted(true);
      loadUserProfile();
    } else if (initialized && getAccessToken() && user && !profileLoadAttempted) {
      // Se já tem usuário mas banco acabou de inicializar, recarregar perfil
      setProfileLoadAttempted(true);
      loadUserProfile(true);
    }
  }, [initialized, profileLoadAttempted, user]);

  // Listen for user login event to reload profile when database initializes
  useEffect(() => {
    const handleUserLoggedIn = async () => {
      console.log('User logged in event received');
      // O perfil já foi carregado em loadUserProfileWithToken
      // Este listener é para recarregar quando o banco inicializar
    };
    
    const handleDatabaseInitialized = async () => {
      if (getAccessToken() && user) {
        console.log('Database initialized event received, loading profile...');
        // Aguardar um pouco para garantir que o banco está totalmente inicializado
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Forçar recarregamento do perfil diretamente
        try {
          console.log('Loading profile after database initialization...');
          const userData = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${getAccessToken()}`,
            },
          }).then(res => res.json());

          // Buscar perfil do banco
          let profiles = await select<Profile & { email?: string }>('profiles', { 
            eq: { column: 'id', value: userData.id } 
          });
          
          if (profiles.length === 0 && userData.email) {
            profiles = await select<Profile & { email?: string }>('profiles', { 
              eq: { column: 'email', value: userData.email } 
            });
          }

          if (profiles.length > 0) {
            const profileData = profiles[profiles.length - 1];
            
            // Parse locomotion_days if it's a string
            if (profileData.locomotion_days && typeof profileData.locomotion_days === 'string') {
              try {
                profileData.locomotion_days = JSON.parse(profileData.locomotion_days);
              } catch {
                profileData.locomotion_days = [];
              }
            }

            const completeProfile: Profile = {
              id: profileData.id || userData.id,
              first_name: profileData.first_name || userData.given_name || '',
              last_name: profileData.last_name || userData.family_name || '',
              role: profileData.role || 'student',
              email: profileData.email || userData.email,
              height_cm: profileData.height_cm,
              weight_kg: profileData.weight_kg,
              sex: profileData.sex,
              age: profileData.age,
              routine: profileData.routine,
              locomotion_type: profileData.locomotion_type,
              locomotion_distance_km: profileData.locomotion_distance_km,
              locomotion_time_minutes: profileData.locomotion_time_minutes,
              locomotion_days: profileData.locomotion_days,
            };
            
            console.log('Profile loaded after database initialization:', completeProfile);
            setProfile(completeProfile);
            
            // Disparar evento para atualizar componentes
            window.dispatchEvent(new CustomEvent('profileUpdated'));
          }
        } catch (error) {
          console.error('Error loading profile after database initialization:', error);
        }
      }
    };
    
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('databaseInitialized', handleDatabaseInitialized);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('databaseInitialized', handleDatabaseInitialized);
    };
  }, [initialized, user, profileLoadAttempted]);

  // Watch for spreadsheet changes to load student profile when viewing shared spreadsheet
  // Only trigger when spreadsheetId actually changes (not on every render)
  // NOTE: This is disabled in favor of the spreadsheetSwitched event handler
  // to avoid conflicts when switching between spreadsheets
  // useEffect(() => {
  //   if (!initialized || !getAccessToken() || !user || !spreadsheetId) return;
  //   
  //   // Only proceed if spreadsheetId actually changed
  //   if (spreadsheetId === lastSpreadsheetId) return;
  //   
  //   setLastSpreadsheetId(spreadsheetId);
  //   
  //   // Check if we're viewing a shared spreadsheet (not our own)
  //   const isViewingSharedSpreadsheet = originalSpreadsheetId 
  //     ? spreadsheetId !== originalSpreadsheetId 
  //     : false;
  //   
  //   console.log('SessionContext: Spreadsheet check - spreadsheetId:', spreadsheetId, 'originalSpreadsheetId:', originalSpreadsheetId, 'isViewingShared:', isViewingSharedSpreadsheet);
  //   
  //   if (isViewingSharedSpreadsheet) {
  //     // Viewing shared spreadsheet - load student profile
  //     console.log('Viewing shared spreadsheet, loading student profile...');
  //     // Get the first profile from the shared spreadsheet (should be the owner's)
  //     loadStudentProfile();
  //   } else if (originalSpreadsheetId && spreadsheetId === originalSpreadsheetId) {
  //     // Back to own spreadsheet, load own profile
  //     console.log('Back to own spreadsheet, loading own profile...');
  //     loadUserProfile();
  //   }
  // }, [spreadsheetId, initialized, originalSpreadsheetId, user, lastSpreadsheetId]);

  // Listen for profile updates (when user saves data)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (initialized && getAccessToken() && user) {
        console.log('Profile updated event received, reloading profile...');
        loadUserProfile();
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [initialized, user]);

  // Load student profile when viewing a shared spreadsheet
  const loadStudentProfile = async (studentEmail?: string, targetSpreadsheetId?: string) => {
    // Use targetSpreadsheetId if provided, otherwise use the current spreadsheetId from hook
    const spreadsheetIdToUse = targetSpreadsheetId || spreadsheetId;
    
    if (!initialized || !spreadsheetIdToUse) {
      console.log('loadStudentProfile: Skipping - initialized:', initialized, 'spreadsheetIdToUse:', spreadsheetIdToUse);
      return;
    }
    
    try {
      console.log('loadStudentProfile: Loading student profile from spreadsheet:', spreadsheetIdToUse, 'for email:', studentEmail);
      
      // Ensure token is set
      const token = getAccessToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken({ access_token: token });
      }
      
      // Get all profiles directly from the target spreadsheet using Google Sheets API
      console.log('loadStudentProfile: Getting all profiles from spreadsheet...');
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetIdToUse,
        range: 'profiles!A:ZZ',
      });
      
      const rows = response.result.values || [];
      if (rows.length === 0) {
        console.log('loadStudentProfile: No rows found in profiles sheet');
        return;
      }
      
      const headers = rows[0] as string[];
      const data = rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          let value = row[index];
          if (value === undefined || value === '') {
            value = null;
          } else {
            // Handle user_id and id columns as strings
            if (header === 'user_id' || header === 'id') {
              const strValue = String(value);
              value = strValue.startsWith("'") ? strValue.substring(1) : strValue;
            } else {
              // Try to parse numbers and booleans
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              else if (!isNaN(Number(value)) && value !== '') {
                const num = Number(value);
                if (Number.isInteger(num)) value = num;
                else value = parseFloat(value);
              }
            }
          }
          obj[header] = value;
        });
        return obj;
      });
      
      console.log('loadStudentProfile: All profiles found:', data.length, data);
      
      if (data.length === 0) {
        console.log('loadStudentProfile: No profiles found in spreadsheet');
        return;
      }
      
      // If we have the student email, try to find by email first
      let profileData: (Profile & { email?: string }) | null = null;
      
      if (studentEmail) {
        console.log('loadStudentProfile: Searching by email:', studentEmail);
        // Try exact match first
        profileData = data.find((p: any) => p.email && p.email.toLowerCase() === studentEmail.toLowerCase()) || null;
        
        if (!profileData) {
          console.log('loadStudentProfile: Exact email match not found, trying partial match...');
          // Try partial match (in case of email variations)
          profileData = data.find((p: any) => p.email && p.email.toLowerCase().includes(studentEmail.toLowerCase())) || null;
        }
        
        if (profileData) {
          console.log('loadStudentProfile: Found profile by email:', profileData);
        } else {
          console.log('loadStudentProfile: No profile found by email, will use first profile');
        }
      }
      
      // If no email match found, use the first profile (should be the owner's)
      if (!profileData) {
        profileData = data[0];
        console.log('loadStudentProfile: Using first profile (owner):', profileData);
      }
      
      // Parse locomotion_days if it's a string
      if (profileData.locomotion_days && typeof profileData.locomotion_days === 'string') {
        try {
          profileData.locomotion_days = JSON.parse(profileData.locomotion_days);
        } catch {
          profileData.locomotion_days = [];
        }
      }
      
      const studentProfile: Profile = {
        id: profileData.id,
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        role: profileData.role || 'student',
        email: profileData.email,
        height_cm: profileData.height_cm,
        weight_kg: profileData.weight_kg,
        sex: profileData.sex,
        age: profileData.age,
        routine: profileData.routine,
        locomotion_type: profileData.locomotion_type,
        locomotion_distance_km: profileData.locomotion_distance_km,
        locomotion_time_minutes: profileData.locomotion_time_minutes,
        locomotion_days: profileData.locomotion_days,
      };
      
      console.log('loadStudentProfile: Setting student profile:', studentProfile);
      setProfile(studentProfile);
      console.log('loadStudentProfile: Profile set successfully');
    } catch (error) {
      console.error('Error loading student profile:', error);
    }
  };

  // Listen for spreadsheet switch events (for any user viewing shared spreadsheets)
  useEffect(() => {
    if (!initialized || !getAccessToken() || !user) return;
    
    const handleSpreadsheetSwitch = async (event: CustomEvent) => {
      const studentEmail = event.detail?.studentEmail;
      const studentName = event.detail?.studentName;
      const targetSpreadsheetId = event.detail?.spreadsheetId;
      
      console.log('Spreadsheet switch event received:', { 
        studentEmail, 
        studentName, 
        targetSpreadsheetId,
        currentSpreadsheetId: spreadsheetId,
        originalSpreadsheetId 
      });
      
      // Wait a bit for spreadsheetId to update in useGoogleSheetsDB (for other parts of the app)
      // But we'll use targetSpreadsheetId directly for loading the profile
      if (targetSpreadsheetId) {
        // Wait a short time to ensure the hook state is updated
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('Using targetSpreadsheetId directly:', targetSpreadsheetId);
      }
      
      if (studentEmail && targetSpreadsheetId) {
        console.log('Loading student profile for:', studentEmail, 'from spreadsheet:', targetSpreadsheetId);
        // Load student profile with email and target spreadsheet ID
        await loadStudentProfile(studentEmail, targetSpreadsheetId);
      } else {
        // Switched back to own spreadsheet
        console.log('Switched back to own spreadsheet, loading own profile...');
        // Reset retry counter when switching back
        setProfileLoadRetries(0);
        await loadUserProfile(true); // Force retry to reset retry counter
      }
    };
    
    window.addEventListener('spreadsheetSwitched', handleSpreadsheetSwitch as EventListener);
    return () => {
      window.removeEventListener('spreadsheetSwitched', handleSpreadsheetSwitch as EventListener);
    };
  }, [initialized, user, spreadsheetId, originalSpreadsheetId]);

  const signIn = async () => {
    try {
      setLoading(true);
      console.log('Starting sign in...');
      const tokenResponse = await signInWithGoogle();
      console.log('Token received:', !!tokenResponse?.access_token);
      
      if (tokenResponse && tokenResponse.access_token) {
        // Token is already stored by setAccessToken in signInWithGoogle
        const token = tokenResponse.access_token;
        console.log('Token stored, length:', token.length);
        
        // Initialize gapi client for API calls (not for auth)
        // This should already be done in signInWithGoogle, but ensure it's set
        try {
          await initializeGoogleAPI();
          // Make sure token is set
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: token });
            console.log('Token confirmed in gapi client');
          }
          console.log('GAPI initialized');
        } catch (err) {
          console.warn('GAPI initialization warning (non-critical):', err);
        }
        
        // Load user profile with the token we just received
        console.log('Loading user profile...');
        await loadUserProfileWithToken(token);
        console.log('User profile loaded');
        
        // Aguardar um pouco para garantir que o token está sincronizado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Disparar evento para forçar recarregamento do perfil quando banco inicializar
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { token } }));
        
        // Aguardar um pouco mais para o banco começar a inicializar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Navigating to dashboard...');
        // Usar navigate do React Router para manter o estado
        navigate('/dashboard');
        
        // Forçar recarregamento do perfil quando banco estiver pronto
        // Isso será feito pelo listener de 'userLoggedIn'
        
        // Garantir que loading seja false após navegação
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      setLoading(false);
      throw err;
    }
  };
  
  // Load user profile with a specific token (used during sign in)
  const loadUserProfileWithToken = async (token: string) => {
    try {
      console.log('Fetching user info from Google with provided token...');
      // Get user info from Google
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userInfo.ok) {
        const userData = await userInfo.json();
        console.log('User data received:', userData.email);
        const googleUser: GoogleUser = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        };
        setUser(googleUser);

        // Load or create profile (only if database is initialized)
        if (initialized) {
          try {
            console.log('Database initialized, loading profile...');
            console.log('Searching for profile with ID:', userData.id, 'and email:', userData.email);
            // First, try to find by Google ID
            let profiles = await select<Profile & { email?: string }>('profiles', { eq: { column: 'id', value: userData.id } });
            console.log('Profiles found by ID:', profiles.length, profiles);
            
            // If not found by ID, try by email
            if (profiles.length === 0 && userData.email) {
              console.log('Trying to find profile by email:', userData.email);
              profiles = await select<Profile & { email?: string }>('profiles', { eq: { column: 'email', value: userData.email } });
              console.log('Profiles found by email:', profiles.length, profiles);
            }
            
            if (profiles.length > 0) {
              // If multiple profiles found, get the most recent one (last in array, as Google Sheets returns in order)
              // But since we're filtering by ID, there should only be one. However, if there are duplicates,
              // we'll take the last one (most recently added)
              const profileData = profiles[profiles.length - 1];
              console.log('Profile found (using last if multiple):', profileData);
              
              // Parse locomotion_days if it's a string
              if (profileData.locomotion_days && typeof profileData.locomotion_days === 'string') {
                try {
                  profileData.locomotion_days = JSON.parse(profileData.locomotion_days);
                } catch {
                  profileData.locomotion_days = [];
                }
              }
              // Ensure all fields are properly set
              const completeProfile: Profile = {
                id: profileData.id || userData.id,
                first_name: profileData.first_name || userData.given_name || '',
                last_name: profileData.last_name || userData.family_name || '',
                role: profileData.role || 'student',
                email: profileData.email || userData.email,
                height_cm: profileData.height_cm,
                weight_kg: profileData.weight_kg,
                sex: profileData.sex,
                age: profileData.age,
                routine: profileData.routine,
                locomotion_type: profileData.locomotion_type,
                locomotion_distance_km: profileData.locomotion_distance_km,
                locomotion_time_minutes: profileData.locomotion_time_minutes,
                locomotion_days: profileData.locomotion_days,
              };
              console.log('Complete profile to set:', completeProfile);
              setProfile(completeProfile);
            } else {
              // Try to find temporary profile by email
              const allProfiles = await select<Profile & { email?: string }>('profiles');
              const tempProfile = allProfiles.find(p => p.email === userData.email && String(p.id || '').startsWith('temp_'));
              
              if (tempProfile) {
                console.log('Temp profile found, updating...');
                // Update temporary profile with Google ID
                const nameParts = userData.name ? userData.name.split(' ') : [];
                const updatedProfile: Profile = {
                  id: userData.id,
                  first_name: userData.given_name || tempProfile.first_name || nameParts[0] || '',
                  last_name: userData.family_name || tempProfile.last_name || nameParts.slice(1).join(' ') || '',
                  role: tempProfile.role || 'student',
                };
                
                // Delete temp profile and create new one with Google ID
                try {
                  await deleteRow('profiles', { column: 'id', value: tempProfile.id });
                } catch (e) {
                  console.error('Error deleting temp profile:', e);
                }
                
                await insert('profiles', updatedProfile);
                setProfile(updatedProfile);
              } else {
                console.log('No profile found. Profile will be created when user saves their data.');
                // Don't create profile automatically - wait for user to save data
                // Just set basic user info
                const nameParts = userData.name ? userData.name.split(' ') : [];
                const basicProfile: Profile = {
                  id: userData.id,
                  first_name: userData.given_name || nameParts[0] || '',
                  last_name: userData.family_name || nameParts.slice(1).join(' ') || '',
                  role: 'student',
                };
                setProfile(basicProfile);
              }
            }
          } catch (dbError) {
            console.error('Error accessing database:', dbError);
            // Even if DB fails, we have the user info, so we can continue
          }
        } else {
          console.log('Database not initialized yet, will load profile when ready');
        }
      } else {
        const errorText = await userInfo.text();
        console.error('Failed to fetch user info:', userInfo.status, errorText);
        throw new Error(`Failed to fetch user info: ${userInfo.status}`);
      }
    } catch (err) {
      console.error('Error loading user profile with token:', err);
      throw err;
    }
  };

  const signOut = () => {
    signOutGoogle();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const value: SessionContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!getAccessToken(),
  };

  // Garantir que loading seja false após um tempo máximo
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout, setting loading to false');
        setLoading(false);
      }
    }, 15000); // 15 segundos máximo

    return () => clearTimeout(timeout);
  }, [loading]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};
