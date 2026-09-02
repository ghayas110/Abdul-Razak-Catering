import type { Permission } from './types';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  perm: Permission;
  mobile?: boolean; // show in bottom bar
}

/**
 * The staff portal's sidebar.
 *
 * `mobile: true` also puts the row in the bottom bar on a phone, which is what
 * most of this office actually uses. Keep that list short: the bar takes the
 * first few and the rest live behind the menu.
 */
export const CATERING_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/catering', icon: 'LayoutDashboard', perm: 'catering.view', mobile: true },
  { label: 'Quotations', href: '/catering/quotations', icon: 'FileText', perm: 'catering.view', mobile: true },
  { label: 'Invoices', href: '/catering/invoices', icon: 'ReceiptText', perm: 'catering.view', mobile: true },
  { label: 'Templates', href: '/catering/templates', icon: 'LayoutTemplate', perm: 'catering.view', mobile: true },
  { label: 'Event Ledger', href: '/catering/ledger', icon: 'Scale', perm: 'catering.reports', mobile: true },
  { label: 'Customers', href: '/catering/customers', icon: 'Users', perm: 'catering.view' },
  { label: 'Vendors', href: '/catering/vendors', icon: 'Truck', perm: 'catering.view' },
  { label: 'Vendor Bills', href: '/catering/bills', icon: 'Receipt', perm: 'catering.reports' },
  { label: 'Menu & Rates', href: '/catering/menu', icon: 'UtensilsCrossed', perm: 'catering.view', mobile: true },
  { label: 'Categories', href: '/catering/categories', icon: 'Tags', perm: 'catering.view' },
  { label: 'Rules', href: '/catering/rules', icon: 'ScrollText', perm: 'catering.view' },
  { label: 'Reports', href: '/catering/reports', icon: 'TrendingUp', perm: 'catering.reports', mobile: true },
  { label: 'Enquiries', href: '/catering/leads', icon: 'Sparkles', perm: 'leads.view' },
  { label: 'Users', href: '/catering/users', icon: 'UserCog', perm: 'users.manage' },
  { label: 'Settings', href: '/catering/settings', icon: 'Settings', perm: 'catering.manage' },
];
