/**
 * GoHighLevel OAuth Scopes
 * Complete list of available OAuth scopes for GHL API
 * Reference: https://highlevel.stoplight.io/docs/integrations/9c9078ec5d34a-authorization
 */

export interface GHLScope {
  value: string;
  label: string;
  description: string;
  category: string;
  requiresApproval?: boolean; // Requires special GHL approval (SaaS mode, etc.)
  approvalType?: string; // Type of approval needed
}

export const GHL_SCOPES: GHLScope[] = [
  // Contacts
  {
    value: 'contacts.readonly',
    label: 'Contacts (Read)',
    description: 'Read contact information, tags, and custom fields',
    category: 'Contacts',
  },
  {
    value: 'contacts.write',
    label: 'Contacts (Write)',
    description: 'Create, update, and delete contacts',
    category: 'Contacts',
  },
  {
    value: 'contacts/bulkActions.write',
    label: 'Contact Bulk Actions (Write)',
    description: 'Perform bulk operations on contacts',
    category: 'Contacts',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },

  // Conversations
  {
    value: 'conversations.readonly',
    label: 'Conversations (Read)',
    description: 'Read conversations and messages',
    category: 'Conversations',
  },
  {
    value: 'conversations.write',
    label: 'Conversations (Write)',
    description: 'Create and update conversations and messages',
    category: 'Conversations',
  },
  {
    value: 'conversations/message.readonly',
    label: 'Messages (Read)',
    description: 'Read individual messages within conversations',
    category: 'Conversations',
  },
  {
    value: 'conversations/message.write',
    label: 'Messages (Write)',
    description: 'Send and update messages',
    category: 'Conversations',
  },
  {
    value: 'conversations/reports.readonly',
    label: 'Conversation Reports (Read)',
    description: 'Access conversation analytics and reports',
    category: 'Conversations',
  },

  // Opportunities (Pipelines)
  {
    value: 'opportunities.readonly',
    label: 'Opportunities (Read)',
    description: 'Read opportunities and pipeline data',
    category: 'Opportunities',
  },
  {
    value: 'opportunities.write',
    label: 'Opportunities (Write)',
    description: 'Create, update, and move opportunities',
    category: 'Opportunities',
  },

  // Calendars
  {
    value: 'calendars.readonly',
    label: 'Calendars (Read)',
    description: 'Read calendar configurations',
    category: 'Calendars',
  },
  {
    value: 'calendars.write',
    label: 'Calendars (Write)',
    description: 'Create and update calendars',
    category: 'Calendars',
  },
  {
    value: 'calendars/events.readonly',
    label: 'Calendar Events (Read)',
    description: 'Read calendar appointments and events',
    category: 'Calendars',
  },
  {
    value: 'calendars/events.write',
    label: 'Calendar Events (Write)',
    description: 'Create, update, and delete appointments',
    category: 'Calendars',
  },

  // Campaigns
  {
    value: 'campaigns.readonly',
    label: 'Campaigns (Read)',
    description: 'Read campaigns and automation workflows',
    category: 'Campaigns',
  },

  // Forms
  {
    value: 'forms.readonly',
    label: 'Forms (Read)',
    description: 'Read form configurations',
    category: 'Forms',
  },
  {
    value: 'forms.write',
    label: 'Forms (Write)',
    description: 'Create and update forms',
    category: 'Forms',
  },
  {
    value: 'forms/submissions.readonly',
    label: 'Form Submissions (Read)',
    description: 'Read form submission data',
    category: 'Forms',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },
  {
    value: 'forms/submissions.write',
    label: 'Form Submissions (Write)',
    description: 'Create form submissions',
    category: 'Forms',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },

  // Surveys
  {
    value: 'surveys.readonly',
    label: 'Surveys (Read)',
    description: 'Read survey configurations',
    category: 'Surveys',
  },
  {
    value: 'surveys/submissions.readonly',
    label: 'Survey Submissions (Read)',
    description: 'Read survey submission data',
    category: 'Surveys',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },

  // Links
  {
    value: 'links.readonly',
    label: 'Links (Read)',
    description: 'Read link tracking data',
    category: 'Links',
  },
  {
    value: 'links.write',
    label: 'Links (Write)',
    description: 'Create and update tracked links',
    category: 'Links',
  },

  // Locations (Sub-accounts)
  {
    value: 'locations.readonly',
    label: 'Locations (Read)',
    description: 'Read location/sub-account information',
    category: 'Locations',
  },
  {
    value: 'locations.write',
    label: 'Locations (Write)',
    description: 'Create and update locations/sub-accounts',
    category: 'Locations',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },
  {
    value: 'locations/customValues.readonly',
    label: 'Location Custom Values (Read)',
    description: 'Read location custom field values',
    category: 'Locations',
  },
  {
    value: 'locations/customValues.write',
    label: 'Location Custom Values (Write)',
    description: 'Update location custom field values',
    category: 'Locations',
  },
  {
    value: 'locations/customFields.readonly',
    label: 'Location Custom Fields (Read)',
    description: 'Read location custom field definitions',
    category: 'Locations',
  },
  {
    value: 'locations/customFields.write',
    label: 'Location Custom Fields (Write)',
    description: 'Create and update location custom fields',
    category: 'Locations',
  },
  {
    value: 'locations/tags.readonly',
    label: 'Location Tags (Read)',
    description: 'Read location tags',
    category: 'Locations',
  },
  {
    value: 'locations/tags.write',
    label: 'Location Tags (Write)',
    description: 'Create and update location tags',
    category: 'Locations',
  },
  {
    value: 'locations/tasks.readonly',
    label: 'Location Tasks (Read)',
    description: 'Read location tasks',
    category: 'Locations',
  },
  {
    value: 'locations/tasks.write',
    label: 'Location Tasks (Write)',
    description: 'Create and update location tasks',
    category: 'Locations',
  },

  // Users
  {
    value: 'users.readonly',
    label: 'Users (Read)',
    description: 'Read user information and permissions',
    category: 'Users',
  },
  {
    value: 'users.write',
    label: 'Users (Write)',
    description: 'Create and update users',
    category: 'Users',
  },

  // Businesses
  {
    value: 'businesses.readonly',
    label: 'Businesses (Read)',
    description: 'Read business information',
    category: 'Businesses',
  },
  {
    value: 'businesses.write',
    label: 'Businesses (Write)',
    description: 'Create and update business data',
    category: 'Businesses',
  },

  // OAuth
  {
    value: 'oauth.readonly',
    label: 'OAuth (Read)',
    description: 'Read OAuth connection information',
    category: 'OAuth',
  },
  {
    value: 'oauth.write',
    label: 'OAuth (Write)',
    description: 'Manage OAuth connections',
    category: 'OAuth',
  },

  // Snapshots
  {
    value: 'snapshots.readonly',
    label: 'Snapshots (Read)',
    description: 'Read snapshot/funnel information',
    category: 'Snapshots',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },

  // Social Media Posting
  {
    value: 'social.readonly',
    label: 'Social Media (Read)',
    description: 'Read social media post data',
    category: 'Social Media',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },
  {
    value: 'social.write',
    label: 'Social Media (Write)',
    description: 'Create and schedule social media posts',
    category: 'Social Media',
    requiresApproval: true,
    approvalType: 'Advanced Features',
  },

  // Payments
  {
    value: 'payments.readonly',
    label: 'Payments (Read)',
    description: 'Read payment transactions',
    category: 'Payments',
    requiresApproval: true,
    approvalType: 'Payment Processing',
  },
  {
    value: 'payments.write',
    label: 'Payments (Write)',
    description: 'Process payments and refunds',
    category: 'Payments',
    requiresApproval: true,
    approvalType: 'Payment Processing',
  },

  // Products
  {
    value: 'products.readonly',
    label: 'Products (Read)',
    description: 'Read product catalog',
    category: 'Products',
  },
  {
    value: 'products.write',
    label: 'Products (Write)',
    description: 'Create and update products',
    category: 'Products',
  },

  // Workflows
  {
    value: 'workflows.readonly',
    label: 'Workflows (Read)',
    description: 'Read workflow configurations',
    category: 'Workflows',
  },

  // Invoices
  {
    value: 'invoices.readonly',
    label: 'Invoices (Read)',
    description: 'Read invoice data',
    category: 'Invoices',
  },
  {
    value: 'invoices.write',
    label: 'Invoices (Write)',
    description: 'Create and update invoices',
    category: 'Invoices',
  },

  // Saas
  {
    value: 'saas/company.readonly',
    label: 'SaaS Company (Read)',
    description: 'Read SaaS company information',
    category: 'SaaS',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },
  {
    value: 'saas/company.write',
    label: 'SaaS Company (Write)',
    description: 'Update SaaS company settings - Required for creating companies',
    category: 'SaaS',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },
  {
    value: 'saas/location.readonly',
    label: 'SaaS Location (Read)',
    description: 'Read SaaS location data',
    category: 'SaaS',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },
  {
    value: 'saas/location.write',
    label: 'SaaS Location (Write)',
    description: 'Update SaaS location settings',
    category: 'SaaS',
    requiresApproval: true,
    approvalType: 'SaaS Mode',
  },
];

/**
 * Get only scopes that don't require approval
 */
export function getStandardScopes(): GHLScope[] {
  return GHL_SCOPES.filter((scope) => !scope.requiresApproval);
}

/**
 * Get all scope values as space-separated string
 * @param includeRestricted - Include scopes requiring approval (default: true)
 */
export function getAllScopesString(includeRestricted: boolean = true): string {
  const scopes = includeRestricted
    ? GHL_SCOPES
    : GHL_SCOPES.filter((scope) => !scope.requiresApproval);
  return scopes.map((scope) => scope.value).join(' ');
}

/**
 * Get scopes grouped by category
 */
export function getScopesByCategory(): Record<string, GHLScope[]> {
  return GHL_SCOPES.reduce((acc, scope) => {
    if (!acc[scope.category]) {
      acc[scope.category] = [];
    }
    acc[scope.category].push(scope);
    return acc;
  }, {} as Record<string, GHLScope[]>);
}

/**
 * Get commonly used scope combinations
 */
export const COMMON_SCOPE_SETS = {
  basic: {
    name: 'Basic (Read Only)',
    scopes: 'contacts.readonly locations.readonly users.readonly',
  },
  standard: {
    name: 'Standard (Read/Write Contacts)',
    scopes: 'contacts.readonly contacts.write locations.readonly opportunities.readonly users.readonly calendars.readonly calendars/events.readonly',
  },
  advanced: {
    name: 'Advanced (Full CRM Access)',
    scopes: 'contacts.readonly contacts.write opportunities.readonly opportunities.write locations.readonly calendars.readonly calendars/events.readonly calendars/events.write users.readonly conversations.readonly conversations.write conversations/message.readonly conversations/message.write campaigns.readonly',
  },
  agency: {
    name: 'Agency (Exchange Agencies)',
    scopes: 'contacts.readonly contacts.write conversations.readonly conversations.write conversations/message.readonly conversations/message.write opportunities.readonly opportunities.write locations.readonly users.readonly',
  },
  full: {
    name: 'Full Access (All Scopes)',
    scopes: getAllScopesString(),
  },
};
