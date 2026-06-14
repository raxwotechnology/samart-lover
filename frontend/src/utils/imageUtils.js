/**
 * Normalize image URLs to absolute paths
 * Handles relative paths from backend by converting them to absolute URLs
 */

export const toAbsoluteUrl = (url) => {
  if (!url) return null;

  // Already an absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Get the API base without the /api path
  const baseURL = import.meta.env.DEV 
    ? 'http://localhost:5000'  // dev server
    : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '').replace(/\/api\/?$/, '');  // remove /api suffix

  // Ensure path starts with /
  const path = url.startsWith('/') ? url : `/${url}`;

  return baseURL + path;
};

export const toAbsoluteLogoUrl = (logo) => toAbsoluteUrl(logo);
export const toAbsoluteBannerUrl = (banner) => toAbsoluteUrl(banner);
