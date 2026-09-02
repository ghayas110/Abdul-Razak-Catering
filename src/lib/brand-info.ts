/**
 * Business profile.
 *
 * These values appear on the public website, on every printed quotation and
 * report, and behind the WhatsApp links — so they are editable from
 * Settings → Business Profile rather than being baked into the build.
 *
 * The object below is only the FALLBACK, used before anything has been saved
 * and whenever the database cannot be reached. Server code should call
 * `getBrand()` (src/lib/data.ts); client components receive the resolved
 * values as props from their server parent.
 */

export interface BrandInfo {
  /** Browser tab / SEO title for the public site. */
  siteName: string;
  /** Business name, printed on slips and shown in the app. */
  name: string;
  tagline: string;
  phone: string;
  /** Digits only, for tel: links. Derived from `phone` when left blank. */
  phoneIntl: string;
  email: string;
  /** wa.me format: country code, no + or spaces. */
  whatsapp: string;
  whatsappDisplay: string;
  facebook: string;
  instagram: string;
  address: string;
  /** Contact line in the footer band of every slip and report. */
  footerPhone: string;
  city: string;
  country: string;
}

export const BRAND_DEFAULTS: BrandInfo = {
  siteName: 'Abdul Razak Catering Service — Wedding & Event Caterers in Karachi',
  name: 'Abdul Razak Catering Service',
  // Must be the tail of `name`: the print letterhead drops the tagline from
  // the big wordmark line when it is (see `wordmark` in print-docs.tsx), so
  // the slip reads "Abdul Razak" large with this underneath.
  tagline: 'Catering Service',
  // Contact details are DELIBERATELY blank.
  //
  // Every one of them is a real, dialable number or a real address the moment
  // it is filled in, and inventing one puts a stranger's phone on a printed
  // quotation and on a public website. The site and the slips are written to
  // degrade cleanly while these are empty; Settings -> Business Profile is the
  // first thing to fill in after the first sign-in.
  phone: '',
  phoneIntl: '',
  email: '',
  // WhatsApp is usually a DIFFERENT line from the one above — keep them separate.
  whatsapp: '',
  whatsappDisplay: '',
  facebook: '',
  instagram: '',
  address: '',
  footerPhone: '',
  city: 'Karachi',
  country: 'Pakistan',
};

/**
 * Kept so existing imports keep compiling and anything not yet threaded
 * through `getBrand()` still renders. New code should not read this.
 *
 * @deprecated Use `getBrand()` on the server, or take `brand` as a prop.
 */
export const BRAND = BRAND_DEFAULTS;

/** `settings` key for a profile field — namespaced to avoid collisions. */
export const brandKey = (field: keyof BrandInfo) => `brand.${field}`;

/** Drives the Settings form: order, labels and help text. */
export const BRAND_FIELDS: {
  key: keyof BrandInfo;
  label: string;
  hint?: string;
  placeholder?: string;
}[] = [
  { key: 'siteName', label: 'Website title', hint: 'Shown in the browser tab and by Google' },
  { key: 'name', label: 'Business name', hint: 'Shown on the website and in the footer' },
  { key: 'tagline', label: 'Tagline', hint: 'The small word under the logo' },
  { key: 'phone', label: 'Phone', hint: 'Main line — the website’s call button dials this' },
  { key: 'footerPhone', label: 'Slip phone', hint: 'Printed in the footer band of every quotation and report' },
  { key: 'email', label: 'Email' },
  { key: 'whatsappDisplay', label: 'WhatsApp number', hint: 'As you want it shown, e.g. +92 3xx xxxxxxx' },
  { key: 'facebook', label: 'Facebook handle', hint: 'Just the name, no facebook.com/', placeholder: 'AbdulRazakCatering' },
  { key: 'instagram', label: 'Instagram handle', hint: 'Just the name, no @ and no instagram.com/', placeholder: 'abdulrazakcatering' },
  { key: 'address', label: 'Address', hint: 'Shown on the website and printed on every slip' },
  { key: 'city', label: 'City' },
];

/** Strip everything but digits — what wa.me and tel: want. */
export function digitsOnly(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

/** Default dialling code. Pakistan — every number in this system is local. */
export const DEFAULT_CC = '92';

/**
 * Turn a phone number as somebody typed it into the digits-only international
 * form wa.me and tel: want. Returns null when there is nothing dialable.
 *
 * Staff type local numbers and always will, so the country code is added here
 * rather than being asked for:
 *   0300-2110011     -> 923002110011
 *   +92 300 2110011  -> 923002110011
 *   300 2110011      -> 923002110011
 */
export function toWaNumber(phone: string | null | undefined, cc = DEFAULT_CC): string | null {
  const digits = digitsOnly(phone ?? '');
  if (digits.length < 7) return null;
  if (digits.startsWith(cc) && digits.length > cc.length + 6) return digits;
  if (digits.startsWith('0')) return cc + digits.slice(1);
  return cc + digits;
}

/**
 * Fills in the fields that are derived rather than typed, so the form only has
 * to ask for the ones a person actually knows.
 */
export function normaliseBrand(b: BrandInfo): BrandInfo {
  const whatsapp = toWaNumber(b.whatsappDisplay) || b.whatsapp;
  return {
    ...b,
    phoneIntl: toWaNumber(b.phone) || b.phoneIntl,
    whatsapp,
    facebook: b.facebook.replace(/^.*facebook\.com\//i, '').replace(/^@/, '').trim(),
    instagram: b.instagram.replace(/^.*instagram\.com\//i, '').replace(/^@/, '').trim(),
  };
}

export const facebookUrl = (b: BrandInfo) => `https://facebook.com/${b.facebook}`;
export const instagramUrl = (b: BrandInfo) => `https://instagram.com/${b.instagram}`;
