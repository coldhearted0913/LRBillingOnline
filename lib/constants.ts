export const LR_PREFIX = 'MT/25-26/';

export const VEHICLE_AMOUNTS = {
  'PICKUP': 5500,
  'TRUCK': 12484,
  'TOROUS': 26933,
} as const;

export const ADDITIONAL_BILL_AMOUNTS = {
  'PICKUP': 1200,
  'TRUCK': 1800,
  'TOROUS': 2400,
} as const;

export const MATERIAL_SUPPLY_LOCATIONS = [
  'KASTURI',
  'VP',
  'KOEL',
  'SUPREME',
  'SHRIRAM',
  'KFIL',
];

export const FROM_LOCATIONS = [
  'Solapur',
  'Kolhapur',
];

export const TO_LOCATIONS = [
  'SOLAPUR',
  'KOLHAPUR',
  'PUNE',
  'NASHIK',
];

// Additional Bill specific dropdowns
export const ADDITIONAL_BILL_FROM_LOCATIONS = [
  'KFIL',
  'KOEL',
];

export const ADDITIONAL_BILL_TO_LOCATIONS = [
  'KASTURI',
  'VP',
  'KOEL',
  'SUPREME',
  'SHRIRAM',
  'KFIL',
];

export const LR_STATUS_OPTIONS = [
  'LR Done',
  'LR Collected',
  'Bill Done',
  'Bill Submitted',
];

export const STATUS_COLORS = {
  'LR Done': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'LR Collected': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  'Bill Done': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  'Bill Submitted': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
} as const;

export const FORM_FIELDS = [
  'FROM',
  'TO',
  'Material Supply To',
  'LR Date',
  'Vehicle Type',
  'Vehicle Number',
  'LR No',
  'Koel Gate Entry No',
  'Koel Gate Entry Date',
  'Weightslip No',
  'Loaded Weight',
  'Empty Weight',
  'Total No of Invoices',
  'Invoice No',
  'GRR No',
  'GRR Date',
  'Description of Goods',
  'Quantity',
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
