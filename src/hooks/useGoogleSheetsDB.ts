import { useState, useEffect, useCallback } from 'react';
import { initializeGoogleAPI, getAccessToken } from '@/integrations/google/client';

// Database schema - todas as tabelas do sistema
const TABLE_SCHEMAS = {
  profiles: ['id', 'first_name', 'last_name', 'role', 'email', 'height_cm', 'weight_kg', 'sex', 'age', 'routine', 'locomotion_type', 'locomotion_distance_km', 'locomotion_time_minutes', 'locomotion_days'],
  profile_history: ['id', 'user_id', 'height_cm', 'weight_kg', 'sex', 'age', 'routine', 'locomotion_type', 'locomotion_distance_km', 'locomotion_time_minutes', 'locomotion_days', 'created_at'],
  weight_history: ['id', 'user_id', 'weight_kg', 'created_at'],
  bioimpedance_records: [
    'id', 'user_id', 'record_date', 'weight_kg', 'body_fat_percentage',
    'muscle_mass_kg', 'water_percentage', 'notes', 'created_at',
    'waist_cm', 'hip_cm', 'glutes_cm', 'thigh_cm', 'calf_cm',
    'biceps_cm', 'forearm_cm', 'chest_cm', 'shoulders_cm', 'bmi',
    'fat_mass_kg', 'lean_mass_kg', 'segmental_muscle_mass_arms_kg',
    'segmental_muscle_mass_legs_kg', 'segmental_muscle_mass_trunk_kg',
    'total_body_water_percentage', 'intracellular_water_percentage',
    'extracellular_water_percentage', 'basal_metabolic_rate_kcal',
    'visceral_fat_level', 'metabolic_age'
  ],
  diet_plans: ['id', 'user_id', 'meal', 'description', 'scheduled_time', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
  diet_logs: ['id', 'user_id', 'diet_plan_id', 'logged_at'],
  workouts: ['id', 'user_id', 'name', 'muscle_group', 'exercises', 'created_at'],
  workout_logs: ['id', 'user_id', 'exercise_name', 'log_date', 'performance'],
  daily_nutrition_logs: ['id', 'user_id', 'log_date', 'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g', 'created_at'],
  personal_records: ['id', 'user_id', 'exercise_name', 'pr_weight', 'achieved_at'],
};

const SPREADSHEET_NAME = 'APP_DB';

type StudentSpreadsheet = {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerName?: string;
};

type SpreadsheetPermission = {
  id: string;
  emailAddress: string;
  role: string;
  displayName?: string;
};

type UseGoogleSheetsDBReturn = {
  spreadsheetId: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  // CRUD operations
  select: <T>(tableName: string, options?: { eq?: { column: string; value: any }, order?: { column: string; ascending?: boolean }, gte?: { column: string; value: string }, lt?: { column: string; value: string } }) => Promise<T[]>;
  insert: (tableName: string, data: any | any[]) => Promise<void>;
  update: (tableName: string, data: any, eq: { column: string; value: any }) => Promise<void>;
  delete: (tableName: string, eq: { column: string; value: any }) => Promise<void>;
  // Collaboration functions
  grantPersonalAccess: (email: string) => Promise<void>;
  listStudents: () => Promise<StudentSpreadsheet[]>;
  switchToSpreadsheet: (spreadsheetId: string | null) => Promise<void>;
  originalSpreadsheetId: string | null;
  listPermissions: () => Promise<SpreadsheetPermission[]>;
  removePermission: (permissionId: string) => Promise<void>;
};

// Cache to prevent multiple simultaneous initializations
let initializationPromise: Promise<string | null> | null = null;
let cachedSpreadsheetId: string | null = null;
let originalSpreadsheetId: string | null = null; // Store original spreadsheet ID for personal trainers

export const useGoogleSheetsDB = (): UseGoogleSheetsDBReturn => {
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(cachedSpreadsheetId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(!!cachedSpreadsheetId);

  // Initialize Google API and find/create database
  useEffect(() => {
    // If already initialized, skip
    if (initialized && spreadsheetId) {
      setLoading(false);
      return;
    }

    const init = async () => {
      // If already initializing, wait for that promise
      if (initializationPromise) {
        try {
          const id = await initializationPromise;
          if (id) {
            setSpreadsheetId(id);
            setInitialized(true);
            cachedSpreadsheetId = id;
          }
        } catch (err) {
          console.error('Error waiting for initialization:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Create new initialization promise
      initializationPromise = (async () => {
        try {
          setLoading(true);
          setError(null);

          // Wait for Google APIs to load
          if (!window.gapi || !window.google) {
            await new Promise((resolve) => {
              let attempts = 0;
              const maxAttempts = 100; // 10 seconds max
              const checkInterval = setInterval(() => {
                attempts++;
                if ((window.gapi && window.google) || attempts >= maxAttempts) {
                  clearInterval(checkInterval);
                  resolve(undefined);
                }
              }, 100);
            });
          }

          if (!window.gapi || !window.google) {
            setError('Google APIs failed to load. Please refresh the page.');
            return null;
          }

          // Check if user is authenticated first
          const token = getAccessToken();
          if (!token) {
            setError('Not authenticated. Please sign in with Google.');
            return null;
          }

          // Initialize gapi client (only for API calls, auth is handled by GIS)
          try {
            await initializeGoogleAPI();
            // Ensure token is set in gapi client BEFORE any API calls
            if (window.gapi && window.gapi.client && token) {
              window.gapi.client.setToken({ access_token: token });
              console.log('Token set in gapi client, verifying...');
              // Verify token is set
              const setToken = window.gapi.client.getToken();
              if (setToken && setToken.access_token) {
                console.log('Token verified in gapi client, length:', setToken.access_token.length);
              } else {
                console.warn('Token not properly set in gapi client!');
              }
            }
          } catch (err: any) {
            // If initialization fails but we have a token, try to continue
            console.warn('GAPI initialization warning:', err);
            // Still try to set the token
            if (window.gapi && window.gapi.client && token) {
              window.gapi.client.setToken({ access_token: token });
              console.log('Token set in gapi client (after error)');
            }
          }

        // Find or create spreadsheet (with retry for rate limiting)
        let id: string | null = null;
        let retries = 3;
        while (retries > 0 && !id) {
          try {
            id = await findOrCreateSpreadsheet();
            break;
          } catch (err: any) {
            if ((err.status === 429 || err.result?.error?.code === 429) && retries > 1) {
              console.log(`Rate limited, retrying in ${(4 - retries) * 2} seconds...`);
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 2000));
              retries--;
            } else {
              throw err;
            }
          }
        }
        
        if (id) {
          cachedSpreadsheetId = id;
          setSpreadsheetId(id);
          setInitialized(true);
          return id;
        }
        return null;
        } catch (err: any) {
          console.error('Error initializing Google Sheets DB:', err);
          // Handle rate limiting gracefully
          if (err.status === 429 || err.result?.error?.code === 429) {
            setError('Muitas requisições. Aguarde alguns segundos e recarregue a página.');
          } else {
            setError(err.message || 'Failed to initialize database');
          }
          return null;
        } finally {
          setLoading(false);
        }
      })();

      try {
        const id = await initializationPromise;
        if (id) {
          setSpreadsheetId(id);
          setInitialized(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    init();
  }, []);

  // Find or create the APP_DB spreadsheet
  const findOrCreateSpreadsheet = async (): Promise<string> => {
    try {
      // Ensure token is set in gapi client before making any calls
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken({ access_token: token });
        console.log('Token set in gapi client before spreadsheet operations');
      }

      // Try to search for existing spreadsheet owned by the user
      let existingId: string | null = null;
      try {
        const response = await window.gapi.client.drive.files.list({
          q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
          fields: 'files(id, name, owners)',
        });

        if (response.result.files && response.result.files.length > 0) {
          // Get current user email to check ownership
          let currentUserEmail: string;
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (userInfoResponse.ok) {
              const userData = await userInfoResponse.json();
              currentUserEmail = userData.email;
            } else {
              throw new Error('Failed to fetch user info');
            }
          } catch (err) {
            console.error('Error fetching user info:', err);
            // Fallback: use first file found
            existingId = response.result.files[0].id;
            console.log('Found existing spreadsheet (ownership check failed):', existingId);
          }
          
          // Find spreadsheet owned by current user
          if (currentUserEmail) {
            const ownedFile = response.result.files.find((file: any) => 
              file.owners?.some((owner: any) => owner.emailAddress === currentUserEmail)
            );
            if (ownedFile) {
              existingId = ownedFile.id;
              console.log('Found existing spreadsheet owned by user:', existingId);
            } else {
              console.log('No spreadsheet owned by user found. User may only have access to shared spreadsheets.');
            }
          }
        }
      } catch (listError: any) {
        // If we can't list files (e.g., using drive.file scope), try to create directly
        console.log('Cannot list files, will try to create new spreadsheet:', listError);
      }

        if (existingId) {
        // Verify it has all required sheets (skip if rate limited to avoid breaking the app)
        try {
          await ensureSheetsExist(existingId);
        } catch (err: any) {
          // If rate limited, just log and continue - sheets validation can happen later
          if (err.status === 429 || err.result?.error?.code === 429) {
            console.warn('Rate limited during sheet validation. Continuing anyway...');
          } else {
            throw err;
          }
        }
        // Store as original spreadsheet ID if not already set (only if owned by user)
        if (!originalSpreadsheetId) {
          originalSpreadsheetId = existingId;
          console.log('Set originalSpreadsheetId to:', existingId);
        }
        return existingId;
      }

      // Create new spreadsheet
      console.log('Creating new spreadsheet...');
      const createResponse = await window.gapi.client.sheets.spreadsheets.create({
        properties: {
          title: SPREADSHEET_NAME,
        },
      });

      const newId = createResponse.result.spreadsheetId;
      if (!newId) {
        throw new Error('Failed to create spreadsheet: no ID returned');
      }
      
      console.log('Spreadsheet created with ID:', newId);
      await createAllSheets(newId);
      // Store as original spreadsheet ID if not already set
      if (!originalSpreadsheetId) {
        originalSpreadsheetId = newId;
      }
      return newId;
    } catch (err: any) {
      console.error('Error finding/creating spreadsheet:', err);
      // If error is about permission, provide helpful message
      if (err.status === 403 || err.result?.error?.status === 'PERMISSION_DENIED') {
        throw new Error('Permissão negada. Certifique-se de que você autorizou o acesso ao Google Drive e Google Sheets.');
      }
      if (err.status === 401 || err.result?.error?.status === 'UNAUTHENTICATED') {
        throw new Error('Token inválido ou expirado. Por favor, faça login novamente.');
      }
      throw err;
    }
  };

  // Ensure all required sheets exist (with validation)
  const ensureSheetsExist = async (spreadsheetId: string): Promise<void> => {
    try {
      const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const existingSheets = spreadsheet.result.sheets?.map((s: any) => s.properties.title) || [];
      const requiredSheets = Object.keys(TABLE_SCHEMAS);
      const missingSheets: string[] = [];

      // Check for missing sheets
      for (const sheetName of requiredSheets) {
        if (!existingSheets.includes(sheetName)) {
          missingSheets.push(sheetName);
        }
      }

      // Recreate missing sheets (with delay to avoid rate limiting)
      if (missingSheets.length > 0) {
        console.warn(`Missing sheets detected: ${missingSheets.join(', ')}. Recreating...`);
        for (let i = 0; i < missingSheets.length; i++) {
          if (i > 0) {
            // Add delay between sheet creations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          await createSheet(spreadsheetId, missingSheets[i]);
        }
      }

      // Ensure headers exist in all sheets (with delay to avoid rate limiting)
      for (let i = 0; i < requiredSheets.length; i++) {
        if (i > 0) {
          // Add delay between header checks to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        await ensureHeaders(spreadsheetId, requiredSheets[i]);
      }

      console.log('All required sheets validated and ready');
    } catch (err: any) {
      console.error('Error ensuring sheets exist:', err);
      // If rate limited, don't throw - just log and continue
      if (err.status === 429 || err.result?.error?.code === 429) {
        console.warn('Rate limited while ensuring sheets. Sheets may need manual validation.');
        // Don't throw - allow app to continue
        return;
      }
      throw err;
    }
  };

  // Create all sheets with headers
  const createAllSheets = async (spreadsheetId: string): Promise<void> => {
    const requests = Object.keys(TABLE_SCHEMAS).map((tableName) => ({
      addSheet: {
        properties: {
          title: tableName,
        },
      },
    }));

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests,
      },
    });

    // Add headers to all sheets
    for (const [tableName, headers] of Object.entries(TABLE_SCHEMAS)) {
      await addHeaders(spreadsheetId, tableName, headers);
    }
  };

  // Create a single sheet
  const createSheet = async (spreadsheetId: string, sheetName: string): Promise<void> => {
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    const headers = TABLE_SCHEMAS[sheetName as keyof typeof TABLE_SCHEMAS];
    await addHeaders(spreadsheetId, sheetName, headers);
  };

  // Ensure headers exist in a sheet and are complete
  const ensureHeaders = async (spreadsheetId: string, sheetName: string): Promise<void> => {
    try {
      const requiredHeaders = TABLE_SCHEMAS[sheetName as keyof typeof TABLE_SCHEMAS];
      if (!requiredHeaders) return;

      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1`,
      });

      const existingHeaders = response.result.values?.[0] || [];
      
      // Check if headers are missing or incomplete
      const missingHeaders: string[] = [];
      requiredHeaders.forEach(header => {
        if (!existingHeaders.includes(header)) {
          missingHeaders.push(header);
        }
      });

      if (existingHeaders.length === 0 || missingHeaders.length > 0) {
        // Update headers - replace entire first row with complete headers
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          resource: {
            values: [requiredHeaders],
          },
        });
        console.log(`Headers updated for ${sheetName}. Added: ${missingHeaders.join(', ')}`);
      }
    } catch (err: any) {
      console.error('Error ensuring headers:', err);
      // If rate limited, don't throw - just log
      if (err.status === 429 || err.result?.error?.code === 429) {
        console.warn('Rate limited while ensuring headers. Headers may need manual update.');
        return;
      }
      throw err;
    }
  };

  // Add headers to a sheet
  const addHeaders = async (spreadsheetId: string, sheetName: string, headers: string[]): Promise<void> => {
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });
  };

  // Helper function to retry API calls with exponential backoff (max 3 attempts)
  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    attempt: number = 1
  ): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      // If rate limited (429), retry with backoff
      if ((err.status === 429 || err.result?.error?.code === 429) && attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.warn(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, maxAttempts, attempt + 1);
      }
      // If not rate limited or max attempts reached, throw
      throw err;
    }
  };

  // SELECT operation
  const select = useCallback(async <T>(
    tableName: string,
    options?: {
      eq?: { column: string; value: any };
      order?: { column: string; ascending?: boolean };
      gte?: { column: string; value: string };
      lt?: { column: string; value: string };
    }
  ): Promise<T[]> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      // Use retry with backoff for rate limiting
      const response = await retryWithBackoff(async () => {
        return await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tableName}!A:ZZ`,
        });
      });

      const rows = response.result.values || [];
      if (rows.length === 0) {
        console.log(`No rows found in ${tableName}`);
        return [];
      }

      const headers = rows[0] as string[];
      console.log(`Headers for ${tableName}:`, headers);
      
      const data = rows.slice(1).map((row: any[], rowIndex: number) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          let value = row[index];
          // Handle empty cells
          if (value === undefined || value === '') {
            value = null;
          } else {
            // Keep user_id and id columns as strings to prevent truncation
            // Remove apostrophe prefix if present (used to force text format)
            if (header === 'user_id' || header === 'id') {
              const strValue = String(value);
              // Remove leading apostrophe if present (Google Sheets text format prefix)
              value = strValue.startsWith("'") ? strValue.substring(1) : strValue;
            } else {
              // Try to parse numbers and booleans for other columns
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

      console.log(`Total rows in ${tableName}:`, data.length);
      if (data.length > 0) {
        console.log(`First row sample:`, data[0]);
      }

      // Apply filters
      let filtered = data;
      if (options?.eq) {
        console.log(`Filtering by ${options.eq.column} = ${options.eq.value} (type: ${typeof options.eq.value})`);
        filtered = filtered.filter((row: any) => {
          const val = row[options.eq!.column];
          // Convert both to strings for comparison to handle number/string mismatches
          const valStr = String(val || '');
          const searchStr = String(options.eq!.value || '');
          const match = val === options.eq!.value || valStr === searchStr;
          if (match) {
            console.log(`Match found:`, row, `(val: ${val}, search: ${options.eq!.value})`);
          }
          return match;
        });
        console.log(`Filtered results:`, filtered.length);
      }
      if (options?.gte) {
        filtered = filtered.filter((row: any) => {
          const val = row[options.gte!.column];
          return val && val >= options.gte!.value;
        });
      }
      if (options?.lt) {
        filtered = filtered.filter((row: any) => {
          const val = row[options.lt!.column];
          return val && val < options.lt!.value;
        });
      }

      // Apply sorting
      if (options?.order) {
        filtered.sort((a: any, b: any) => {
          const aVal = a[options.order!.column];
          const bVal = b[options.order!.column];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return options.order!.ascending !== false ? comparison : -comparison;
        });
      }

      return filtered as T[];
    } catch (err: any) {
      console.error('Error selecting data:', err);
      // If rate limited after all retries, return empty array instead of throwing
      if (err.status === 429 || err.result?.error?.code === 429) {
        console.warn('Rate limited after retries. Returning empty array.');
        return [] as T[];
      }
      throw err;
    }
  }, [spreadsheetId]);

  // INSERT operation
  const insert = useCallback(async (tableName: string, data: any | any[]): Promise<void> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      const headers = TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS];
      if (!headers) throw new Error(`Unknown table: ${tableName}`);

      const dataArray = Array.isArray(data) ? data : [data];
      const rows = dataArray.map((item) => {
        // Generate ID if not provided
        if (!item.id) {
          item.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
        // Explicitly convert user_id to string to prevent truncation in Google Sheets
        if (item.user_id !== undefined && item.user_id !== null) {
          item.user_id = String(item.user_id);
        }
        return headers.map((header) => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          // For user_id and id columns, prefix with apostrophe to force text format in Google Sheets
          if ((header === 'user_id' || header === 'id') && typeof value === 'string' && value !== '') {
            // Prefix with apostrophe to force Google Sheets to treat as text
            return `'${value}`;
          }
          return String(value);
        });
      });

      // Get current data to find next row
      // Use a wider range to ensure we get all columns
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tableName}!A:ZZ`,
      });

      const nextRow = (response.result.values?.length || 1) + 1;

      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tableName}!A${nextRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: rows,
        },
      });
    } catch (err: any) {
      console.error('Error inserting data:', err);
      throw err;
    }
  }, [spreadsheetId]);

  // UPDATE operation
  const update = useCallback(async (tableName: string, data: any, eq: { column: string; value: any }): Promise<void> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      const allData = await select(tableName);
      const headers = TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS];
      if (!headers) throw new Error(`Unknown table: ${tableName}`);

      const rowIndex = allData.findIndex((row: any) => {
        const val = row[eq.column];
        return val === eq.value || String(val) === String(eq.value);
      });

      if (rowIndex === -1) throw new Error('Row not found');

      const updatedRow = { ...allData[rowIndex], ...data };
      const rowValues = headers.map((header) => {
        const value = updatedRow[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });

      // Row number is rowIndex + 2 (1 for header, 1 for 0-based index)
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tableName}!A${rowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: {
          values: [rowValues],
        },
      });
    } catch (err: any) {
      console.error('Error updating data:', err);
      throw err;
    }
  }, [spreadsheetId, select]);

  // DELETE operation
  const deleteRow = useCallback(async (tableName: string, eq: { column: string; value: any }): Promise<void> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      const allData = await select(tableName);
      const rowIndex = allData.findIndex((row: any) => {
        const val = row[eq.column];
        return val === eq.value || String(val) === String(eq.value);
      });

      if (rowIndex === -1) throw new Error('Row not found');

      // Get sheet ID
      const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = spreadsheet.result.sheets?.find((s: any) => s.properties.title === tableName);
      if (!sheet) throw new Error(`Sheet ${tableName} not found`);

      const sheetId = sheet.properties.sheetId;
      const rowNumber = rowIndex + 2; // +2 because: 1 for header, 1 for 0-based index

      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber,
                },
              },
            },
          ],
        },
      });
    } catch (err: any) {
      console.error('Error deleting data:', err);
      throw err;
    }
  }, [spreadsheetId, select]);

  // Grant personal trainer access to current spreadsheet
  const grantPersonalAccess = useCallback(async (email: string): Promise<void> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      await window.gapi.client.drive.permissions.create({
        fileId: spreadsheetId,
        resource: {
          role: 'writer',
          type: 'user',
          emailAddress: email,
        },
        sendNotificationEmail: true,
      });
      console.log(`Access granted to ${email}`);
    } catch (err: any) {
      console.error('Error granting access:', err);
      throw new Error(`Erro ao compartilhar planilha: ${err.message || 'Erro desconhecido'}`);
    }
  }, [spreadsheetId]);

  // List students (spreadsheets shared with current user)
  const listStudents = useCallback(async (): Promise<StudentSpreadsheet[]> => {
    try {
      console.log('listStudents: Starting to list shared spreadsheets...');
      // Ensure token is set
      const token = getAccessToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken({ access_token: token });
      }

      // Get current user email to exclude own spreadsheets
      // Use fetch instead of gapi.client.oauth2 which may not be loaded
      let currentUserEmail: string;
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userInfoResponse.ok) {
          const userData = await userInfoResponse.json();
          currentUserEmail = userData.email;
        } else {
          throw new Error('Failed to fetch user info');
        }
      } catch (err) {
        console.error('listStudents: Error fetching user info via fetch:', err);
        // Try gapi as fallback
        try {
          const userInfoResponse = await window.gapi.client.oauth2.userinfo.get();
          currentUserEmail = userInfoResponse.result.email;
        } catch (gapiErr) {
          console.error('listStudents: Error fetching user info via gapi:', gapiErr);
          throw new Error('Não foi possível obter informações do usuário');
        }
      }
      console.log('listStudents: Current user email:', currentUserEmail);

      // List files shared with me (where I'm a writer but not the owner) with the specific name
      const query = `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in writers`;
      console.log('listStudents: Query:', query);
      
      const response = await window.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, owners)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        corpora: 'allDrives',
      });

      console.log('listStudents: Response:', response.result);
      console.log('listStudents: Files found:', response.result.files?.length || 0);

      if (response.result.files && response.result.files.length > 0) {
        // Filter out spreadsheets owned by the current user (only show shared ones)
        const sharedFiles = response.result.files.filter((file: any) => {
          const ownerEmail = file.owners?.[0]?.emailAddress;
          const isShared = ownerEmail && ownerEmail !== currentUserEmail;
          console.log('listStudents: File:', file.name, 'Owner:', ownerEmail, 'Is shared:', isShared);
          return isShared;
        });

        console.log('listStudents: Shared files after filtering:', sharedFiles.length);
        
        // For each shared file, try to get the owner's profile name from the spreadsheet
        const result = await Promise.all(sharedFiles.map(async (file: any) => {
          const ownerEmail = file.owners?.[0]?.emailAddress || undefined;
          let ownerName = ownerEmail?.split('@')[0] || undefined;
          
          // Try to get the owner's name from their profile in the spreadsheet
          try {
            // Switch temporarily to this spreadsheet to get the profile
            const tempToken = getAccessToken();
            if (tempToken && window.gapi && window.gapi.client) {
              window.gapi.client.setToken({ access_token: tempToken });
            }
            
            const profilesResponse = await window.gapi.client.sheets.spreadsheets.values.get({
              spreadsheetId: file.id,
              range: 'profiles!A:ZZ',
            });
            
            const rows = profilesResponse.result.values || [];
            if (rows.length > 1) {
              const headers = rows[0] as string[];
              const dataRows = rows.slice(1);
              
              // Find profile by email
              const emailIndex = headers.indexOf('email');
              const firstNameIndex = headers.indexOf('first_name');
              const lastNameIndex = headers.indexOf('last_name');
              
              if (emailIndex !== -1 && ownerEmail) {
                const profileRow = dataRows.find((row: any[]) => row[emailIndex] === ownerEmail);
                if (profileRow && firstNameIndex !== -1 && lastNameIndex !== -1) {
                  const firstName = profileRow[firstNameIndex] || '';
                  const lastName = profileRow[lastNameIndex] || '';
                  if (firstName || lastName) {
                    ownerName = `${firstName} ${lastName}`.trim();
                  }
                }
              }
            }
          } catch (err) {
            console.log('listStudents: Could not fetch owner name from spreadsheet:', err);
            // Continue with email-based name
          }
          
          return {
            id: file.id,
            name: file.name,
            ownerEmail: ownerEmail,
            ownerName: ownerName,
          };
        }));
        
        console.log('listStudents: Returning:', result);
        return result;
      }
      console.log('listStudents: No files found, returning empty array');
      return [];
    } catch (err: any) {
      console.error('listStudents: Error listing students:', err);
      console.error('listStudents: Error details:', err.result || err);
      throw new Error(`Erro ao listar alunos: ${err.message || 'Erro desconhecido'}`);
    }
  }, []);

  // Switch to a different spreadsheet (for personal trainers)
  const switchToSpreadsheet = useCallback(async (newSpreadsheetId: string | null): Promise<void> => {
    try {
      // Ensure token is set
      const token = getAccessToken();
      if (!token) {
        throw new Error('Não autenticado');
      }
      
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken({ access_token: token });
      }

      // If newSpreadsheetId is null, switch back to original spreadsheet
      const targetSpreadsheetId = newSpreadsheetId || originalSpreadsheetId;
      if (!targetSpreadsheetId) {
        throw new Error('Nenhuma planilha disponível');
      }

      // Validate the spreadsheet has all required sheets (with retry)
      try {
        await retryWithBackoff(async () => {
          await ensureSheetsExist(targetSpreadsheetId);
        });
      } catch (err: any) {
        // If still rate limited after retries, continue anyway (sheets may already exist)
        if (err.status === 429 || err.result?.error?.code === 429) {
          console.warn('Rate limited while validating sheets. Continuing anyway...');
        } else {
          throw err;
        }
      }
      
      setSpreadsheetId(targetSpreadsheetId);
      cachedSpreadsheetId = targetSpreadsheetId;
      setInitialized(true);
      console.log('Switched to spreadsheet:', targetSpreadsheetId);
    } catch (err: any) {
      console.error('Error switching spreadsheet:', err);
      throw new Error(`Erro ao alternar planilha: ${err.message || 'Erro desconhecido'}`);
    }
  }, []);

  // List permissions for current spreadsheet
  const listPermissions = useCallback(async (): Promise<SpreadsheetPermission[]> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      const response = await window.gapi.client.drive.permissions.list({
        fileId: spreadsheetId,
        fields: 'permissions(id, emailAddress, role, displayName)',
      });

      if (response.result.permissions) {
        return response.result.permissions
          .filter((p: any) => p.role !== 'owner') // Exclude owner
          .map((p: any) => ({
            id: p.id,
            emailAddress: p.emailAddress || '',
            role: p.role,
            displayName: p.displayName,
          }));
      }
      return [];
    } catch (err: any) {
      console.error('Error listing permissions:', err);
      throw new Error(`Erro ao listar permissões: ${err.message || 'Erro desconhecido'}`);
    }
  }, [spreadsheetId]);

  // Remove permission from spreadsheet
  const removePermission = useCallback(async (permissionId: string): Promise<void> => {
    if (!spreadsheetId) throw new Error('Database not initialized');

    try {
      await window.gapi.client.drive.permissions.delete({
        fileId: spreadsheetId,
        permissionId: permissionId,
      });
      console.log(`Permission ${permissionId} removed`);
    } catch (err: any) {
      console.error('Error removing permission:', err);
      throw new Error(`Erro ao remover permissão: ${err.message || 'Erro desconhecido'}`);
    }
  }, [spreadsheetId]);

  return {
    spreadsheetId,
    loading,
    error,
    initialized,
    select,
    insert,
    update,
    delete: deleteRow,
    grantPersonalAccess,
    listStudents,
    switchToSpreadsheet,
    listPermissions,
    removePermission,
    originalSpreadsheetId,
  };
};

