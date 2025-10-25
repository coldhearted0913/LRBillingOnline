import { z } from 'zod';

// LR Form Validation Schema
export const LRSchema = z.object({
  lrNo: z.string()
    .min(3, 'LR Number must be at least 3 characters')
    .max(50, 'LR Number must be less than 50 characters')
    .regex(/^[A-Z0-9/_-]+$/, 'LR Number can only contain letters, numbers, slashes, hyphens, and underscores'),
  
  lrDate: z.string()
    .regex(/^\d{2}-\d{2}-\d{4}$/, 'Date must be in DD-MM-YYYY format'),
  
  vehicleNumber: z.string()
    .min(5, 'Vehicle number must be at least 5 characters')
    .max(20, 'Vehicle number must be less than 20 characters')
    .regex(/^[A-Z0-9]+$/i, 'Vehicle number can only contain letters and numbers')
    .optional()
    .or(z.literal('')),
  
  vehicleType: z.enum(['PICKUP', 'TRUCK', 'TOUROUS']),
  
  fromLocation: z.string()
    .min(2, 'Origin must be at least 2 characters')
    .max(100, 'Origin must be less than 100 characters'),
  
  toLocation: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(100, 'Destination must be less than 100 characters'),
  
  consignor: z.string()
    .min(2, 'Consignor must be at least 2 characters')
    .max(200, 'Consignor must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  consignee: z.string()
    .min(2, 'Consignee must be at least 2 characters')
    .max(1000, 'Consignee must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  loadedWeight: z.string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), 'Weight must be a number')
    .or(z.literal('')),
  
  emptyWeight: z.string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), 'Weight must be a number')
    .or(z.literal('')),
  
  descriptionOfGoods: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  quantity: z.string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), 'Quantity must be a number')
    .or(z.literal('')),
  
  // Optional fields
  koelGateEntryNo: z.string().optional().or(z.literal('')),
  koelGateEntryDate: z.string().optional().or(z.literal('')),
  weightslipNo: z.string().optional().or(z.literal('')),
  totalNoOfInvoices: z.string().optional().or(z.literal('')),
  invoiceNo: z.string().optional().or(z.literal('')),
  grrNo: z.string().optional().or(z.literal('')),
  grrDate: z.string().optional().or(z.literal('')),
  remark: z.string().max(500, 'Remark must be less than 500 characters').optional().or(z.literal('')),
}).refine(data => {
  // Custom validation: Consignor and Consignee cannot be the same
  if (data.consignor && data.consignee) {
    const consignorWords = data.consignor.toLowerCase().trim().split(/\s+/);
    const consigneeWords = data.consignee.toLowerCase().trim().split('/').map((c: string) => c.trim());
    
    // Check if any consignee matches consignor
    return !consigneeWords.some((ce: string) => 
      consignorWords.some((co: string) => ce.includes(co) || co.includes(ce))
    );
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
    .trim(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  role: z.enum(['CEO', 'MANAGER', 'WORKER']),
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

// Type exports for use in components
export type LRFormData = z.infer<typeof LRSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type UpdateRoleData = z.infer<typeof UpdateRoleSchema>;
export type FilterData = z.infer<typeof FilterSchema>;
export type BillGenerationData = z.infer<typeof BillGenerationSchema>;
