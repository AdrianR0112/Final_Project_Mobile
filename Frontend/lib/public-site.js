import { buildApiUrl } from '../services/api';

const fallbackSite = {
  appName: 'App',
  contact: {
    email: 'soporte@techrescue.app',
    phone: '+57 300 000 0000',
    instagram: {
      label: '@techrescue.app',
      url: 'https://instagram.com/techrescue.app',
    },
    linkedin: {
      label: 'App',
      url: 'https://linkedin.com/company/techrescue',
    },
  },
};

export async function getPublicSiteConfig() {
  try {
    const response = await fetch(buildApiUrl('/public-config/contact'), { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.contact) {
      return fallbackSite;
    }

    return {
      appName: data.appName || fallbackSite.appName,
      contact: {
        email: data.contact.email || fallbackSite.contact.email,
        phone: data.contact.phone || fallbackSite.contact.phone,
        instagram: {
          label: data.contact.instagram?.label || fallbackSite.contact.instagram.label,
          url: data.contact.instagram?.url || fallbackSite.contact.instagram.url,
        },
        linkedin: {
          label: data.contact.linkedin?.label || fallbackSite.contact.linkedin.label,
          url: data.contact.linkedin?.url || fallbackSite.contact.linkedin.url,
        },
      },
    };
  } catch {
    return fallbackSite;
  }
}

export async function getPublicCoverageZones() {
  try {
    const response = await fetch(buildApiUrl('/public-config/coverage-zones'), { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(data.zones)) {
      return [];
    }

    return data.zones;
  } catch {
    return [];
  }
}

export function getFallbackAppName() {
  return fallbackSite.appName;
}
