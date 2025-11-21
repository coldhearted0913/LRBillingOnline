import { z } from 'zod';

// LR Form Validation Schema
export const LRSchema = z.object({
  lrNo: z.string()
    .min(3, 'LR Number must be at least 3 characters')
    .max(50, 'LR Number must be less than 50 characters')
    .regex(/^[A-Z0-9/_-]+$/, 'LR Number can only contain letters, numbers, slashes, hyphens, and underscores'),
  
  lrDate: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format'),
  
  vehicleNumber: z.string().optional().or(z.literal('')),
  
  vehicleType: z.enum(['PICKUP', 'TRUCK', 'TOROUS']),
  
  driverName: z.string()
    .min(2, 'Driver name must be at least 2 characters')
    .max(100, 'Driver name must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  driverNumber: z.string()
    .min(10, 'Driver phone number must be at least 10 digits')
    .max(15, 'Driver phone number must be less than 15 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Driver phone number can only contain digits, spaces, hyphens, plus sign, and parentheses')
    .optional()
    .or(z.literal('')),
  
  fromLocation: z.string()
    .min(2, 'Origin must be at least 2 characters')
    .max(100, 'Origin must be less than 100 characters'),
  
  toLocation: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(100, 'Destination must be less than 100 characters'),
  
    consignor: z.string().optional().or(z.literal('')),

  consignee: z.string().optional().or(z.literal('')),
  
    loadedWeight: z.string().optional().or(z.literal('')),

  emptyWeight: z.string().optional().or(z.literal('')),

  descriptionOfGoods: z.string().optional().or(z.literal('')),

  quantity: z.string().optional().or(z.literal('')),
  
  // Optional fields
  koelGateEntryNo: z.string().optional().or(z.literal('')),
  koelGateEntryDate: z.string().optional().or(z.literal('')),
  weightslipNo: z.string().optional().or(z.literal('')),
  totalNoOfInvoices: z.string().optional().or(z.literal('')),
  invoiceNo: z.union([
    z.literal(''),
    z.string().regex(/^[A-Za-z0-9\/\-\s_]+$/, 'Invoice No can only contain letters, numbers, slashes, hyphens, spaces, and underscores'),
  ]).optional(),
  grrNo: z.string().optional().or(z.literal('')),
  grrDate: z.string().optional().or(z.literal('')),
  remark: z.string().optional().or(z.literal('')),
}).refine(data => {
  // Custom validation: Consignor and Consignee cannot be exactly the same
  if (data.consignor && data.consignee) {
    const consignorNormalized = data.consignor.toLowerCase().trim();
    const consigneeNormalized = data.consignee.toLowerCase().trim();
    
    // Split consignee by '/' to handle multiple consignees
    const consigneeList = consigneeNormalized.split('/').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    
    // Check if consignor exactly matches any consignee (exact match, not substring)
    const isSame = consigneeList.some((ce: string) => ce === consignorNormalized);
    
    return !isSame;
  }
  return true;
}, {
  message: 'Consignor and Consignee cannot be the same',
  path: ['consignee'], // Error will appear on consignee field
});

// Login Validation Schema
export const LoginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// Create User Validation Schema
export const CreateUserSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .min(1, 'Email is required'),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  role: z.enum(['CEO', 'MANAGER', 'WORKER']),
  
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional(),
});

// Change Password Validation Schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Update User Role Schema
export const UpdateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['CEO', 'MANAGER', 'WORKER']),
});

// Filter Validation Schema
export const FilterSchema = z.object({
  searchQuery: z.string()
    .max(200, 'Search query is too long')
    .optional(),
  
  selectedMonth: z.string(),
  selectedYear: z.string()
    .regex(/^(All Years|\d{4})$/, 'Year must be "All Years" or 4 digits')
    .optional(),
  
  selectedStatuses: z.array(z.string()).optional(),
});

// Bill Generation Validation Schema
export const BillGenerationSchema = z.object({
  submissionDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Submission date must be in YYYY-MM-DD format'),
  
  reworkBillNo: z.string()
    .max(50, 'Bill number must be less than 50 characters')
    .optional(),
  
  additionalBillNo: z.string()
    .max(50, 'Bill number must be less than 50 characters')
    .optional(),
  
  lrNumbers: z.array(z.string())
    .min(1, 'Please select at least one LR'),
});

// Additional Bill Save Validation Schema
export const AdditionalBillSaveSchema = z.object({
  'LR Date': z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format')
    .min(1, 'LR Date is required'),
  
  'LR No': z.string()
    .min(3, 'LR Number must be at least 3 characters')
    .max(50, 'LR Number must be less than 50 characters')
    .regex(/^[A-Z0-9/_-]+$/, 'LR Number can only contain letters, numbers, slashes, hyphens, and underscores'),
  
  'Vehicle No': z.string()
    .min(1, 'Vehicle Number is required')
    .max(50, 'Vehicle Number must be less than 50 characters'),
  
  'Vehicle Type': z.enum(['PICKUP', 'TRUCK', 'TOROUS'], {
    message: 'Vehicle Type must be PICKUP, TRUCK, or TOROUS',
  }),
  
  'FROM': z.string()
    .min(2, 'FROM location must be at least 2 characters')
    .max(100, 'FROM location must be less than 100 characters'),
  
  'TO': z.string()
    .min(2, 'TO location must be at least 2 characters')
    .max(100, 'TO location must be less than 100 characters')
    .optional(),
  
  'Submission Date': z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Submission date must be in DD-MM-YYYY format')
    .min(1, 'Submission Date is required'),
  
  'Bill No': z.string()
    .min(1, 'Bill Number is required')
    .max(100, 'Bill Number must be less than 100 characters'),
  
  'Amount': z.union([
    z.number().positive('Amount must be a positive number'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number').transform(Number),
  ]).refine((val) => val > 0, {
    message: 'Amount must be greater than 0',
  }),
  
  'Delivery Count': z.union([
    z.number().int().positive('Delivery Count must be a positive integer'),
    z.string().regex(/^\d+$/, 'Delivery Count must be a valid integer').transform(Number),
  ]).refine((val) => val > 0, {
    message: 'Delivery Count must be greater than 0',
  }),
  
  'Delivery Locations': z.array(z.string()).optional().default([]),
});

// Rework Bill Save Validation Schema
export const ReworkBillSaveSchema = z.object({
  'LR Date': z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format')
    .min(1, 'LR Date is required'),
  
  'LR No': z.string()
    .min(3, 'LR Number must be at least 3 characters')
    .max(50, 'LR Number must be less than 50 characters')
    .regex(/^[A-Z0-9/_-]+$/, 'LR Number can only contain letters, numbers, slashes, hyphens, and underscores'),
  
  'Vehicle No': z.string()
    .min(1, 'Vehicle Number is required')
    .max(50, 'Vehicle Number must be less than 50 characters'),
  
  'Vehicle Type': z.enum(['PICKUP', 'TRUCK', 'TOROUS'], {
    message: 'Vehicle Type must be PICKUP, TRUCK, or TOROUS',
  }),
  
  'FROM': z.string()
    .min(2, 'FROM location must be at least 2 characters')
    .max(100, 'FROM location must be less than 100 characters'),
  
  'TO': z.string()
    .min(2, 'TO location must be at least 2 characters')
    .max(100, 'TO location must be less than 100 characters'),
  
  'Submission Date': z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Submission date must be in DD-MM-YYYY format')
    .min(1, 'Submission Date is required'),
  
  'Bill No': z.string()
    .min(1, 'Bill Number is required')
    .max(100, 'Bill Number must be less than 100 characters'),
  
  'Amount': z.union([
    z.number().nonnegative('Amount must be a non-negative number'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number').transform(Number),
  ]).optional(),
});

// Type exports for use in components
export type LRFormData = z.infer<typeof LRSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type UpdateRoleData = z.infer<typeof UpdateRoleSchema>;
export type FilterData = z.infer<typeof FilterSchema>;
export type BillGenerationData = z.infer<typeof BillGenerationSchema>;
export type AdditionalBillSaveData = z.infer<typeof AdditionalBillSaveSchema>;
export type ReworkBillSaveData = z.infer<typeof ReworkBillSaveSchema>;
