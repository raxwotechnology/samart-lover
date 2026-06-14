import { create } from 'zustand';
import { getSettings } from '../services/api';

/**
 * Converts a logo path (relative or absolute) to a fully-accessible URL.
 * - If already a full URL → return as-is
 * - If relative like /uploads/logo.png → prefix with backend base URL
 *   Backend base = VITE_API_URL stripped of trailing /api or /api/
 *   e.g. "http://localhost:5000/api" → "http://localhost:5000"
 *        "https://beautycorner.smartlover.lk/api" → "https://beautycorner.smartlover.lk"
 */
const toAbsoluteLogoUrl = (logoPath) => {
  if (!logoPath) return '';
  // Already a full URL
  if (/^https?:\/\//i.test(logoPath)) return logoPath;
  // Build backend base by stripping /api suffix from VITE_API_URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const backendBase = apiUrl.replace(/\/api\/?$/, '');
  return `${backendBase}${logoPath}`;
};

const useSettingsStore = create((set) => ({
  settings: null,
  loading: false,
  loaded: false,

  fetchSettings: async (force = false) => {
    if (!force && useSettingsStore.getState().loaded) return;
    set({ loading: true });
    try {
      const { data } = await getSettings();
      set({
        settings: {
          ...data,
          // Build accessible logoUrl from relative logo path
          logoUrl: toAbsoluteLogoUrl(data.logo || data.logoUrl),
        },
        loaded: true,
      });
    } catch (err) {
      // keep defaults in UI
    } finally {
      set({ loading: false });
    }
  },

  setSettingsLocal: (settings) => {
    set({
      settings: settings
        ? {
            ...settings,
            logoUrl: toAbsoluteLogoUrl(settings.logo || settings.logoUrl),
          }
        : null,
      loaded: true,
    });
  },
}));

export default useSettingsStore;
