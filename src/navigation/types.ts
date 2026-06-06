export type RootStackParamList = {
  // ── Auth screens (unauthenticated) ──
  Landing: undefined;
  Login: undefined;
  StaffLogin: undefined;
  ForgotPassword: undefined;
  GarageOnboarding: undefined;
  RegistrationThankYou: undefined;

  // ── App screens (authenticated) ──
  Home: undefined;
  StaffHome: undefined;
  VerificationSuccess: undefined;
  CustomerList: { garageId: string };
  CustomerForm: { garageId: string };
  CustomerHistory: { customerId: string, garageId: string };
  VehicleList: { garageId: string };
  VehicleForm: { garageId: string };
  JobCardForm: { garageId: string };
  JobCardList: { garageId: string };
  JobCardDetails: { jobId: string; garageId: string };
  InventoryList: { garageId: string };
  InventoryForm: { garageId: string; item?: any };
  BillingQueue: { garageId: string };
  BillingForm: { garageId: string; jobId: string };
  CreateInvoice: { garageId: string; editBillId?: string };
  InvoiceList: { garageId: string };
  StaffList: { garageId: string };
  StaffForm: { garageId: string; staff?: any };
  BranchManager: { phone: string, currentGarageId: string, fullName: string };
  BranchForm: { phone: string, fullName: string };
  OwnerDashboard: { phone: string; fullName: string; userId: string };
  BranchDashboard: { garageId: string; phone: string; fullName: string; userId: string };
};

// Re-export for backward compatibility with screens that import AuthStackParamList
export type AuthStackParamList = RootStackParamList;
