export type Messages = {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    print: string;
    download: string;
    upload: string;
    close: string;
    open: string;
    view: string;
    add: string;
    remove: string;
    update: string;
    create: string;
    yes: string;
    no: string;
  };
  navigation: {
    dashboard: string;
    customers: string;
    contacts: string;
    projects: string;
    pipeline: string;
    calendar: string;
    tasks: string;
    estimates: string;
    invoices: string;
    reports: string;
    settings: string;
    profile: string;
    logout: string;
  };
  auth: {
    login: string;
    logout: string;
    signUp: string;
    forgotPassword: string;
    resetPassword: string;
    email: string;
    password: string;
    rememberMe: string;
  };
  dashboard: {
    welcome: string;
    todaysTasks: string;
    recentActivity: string;
    upcomingEvents: string;
    quickActions: string;
  };
  customers: {
    title: string;
    addCustomer: string;
    editCustomer: string;
    deleteCustomer: string;
    customerDetails: string;
    contactInfo: string;
    address: string;
    phone: string;
    email: string;
    notes: string;
  };
  projects: {
    title: string;
    addProject: string;
    editProject: string;
    deleteProject: string;
    projectDetails: string;
    status: string;
    progress: string;
    startDate: string;
    endDate: string;
    budget: string;
    description: string;
  };
  settings: {
    title: string;
    general: string;
    profile: string;
    notifications: string;
    language: string;
    preferences: string;
    account: string;
    security: string;
  };
  language: {
    title: string;
    description: string;
    selectLanguage: string;
    currentLanguage: string;
    availableLanguages: string;
    changeLanguage: string;
  };
  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    phoneNumber: string;
    invalidFormat: string;
  };
  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    timeout: string;
  };
};

// Type for translation keys (dot notation)
export type TranslationKey = 
  | `common.${keyof Messages['common']}`
  | `navigation.${keyof Messages['navigation']}`
  | `auth.${keyof Messages['auth']}`
  | `dashboard.${keyof Messages['dashboard']}`
  | `customers.${keyof Messages['customers']}`
  | `projects.${keyof Messages['projects']}`
  | `settings.${keyof Messages['settings']}`
  | `language.${keyof Messages['language']}`
  | `validation.${keyof Messages['validation']}`
  | `errors.${keyof Messages['errors']}`;

// Type for components that accept translation props
export interface TranslationProps {
  locale?: string;
  messages?: Partial<Messages>;
}
