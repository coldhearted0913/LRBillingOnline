import { prisma } from './prisma';

export interface LRData {
  "FROM": string;
  "TO": string;
  "Material Supply To": string;
  "LR Date": string;
  "Vehicle Type": string;
  "Vehicle Number": string;
  "LR No": string;
  "Koel Gate Entry No": string;
  "Koel Gate Entry Date": string;
  "Weightslip No": string;
  "Loaded Weight": string;
  "Empty Weight": string;
  "Total No of Invoices": string;
  "Invoice No": string;
  "GRR No": string;
  "GRR Date": string;
  "Description of Goods": string;
  "Quantity": string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Bill-specific fields
  "Bill Submission Date"?: string;
  "Bill Number"?: string;
  "Delivery Locations"?: string[];
  "Amount"?: number;
}

// Convert Prisma LR to LRData format
const toPrismaFormat = (lrData: LRData) => {
  return {
    lrNo: lrData["LR No"],
    lrDate: lrData["LR Date"],
    vehicleType: lrData["Vehicle Type"],
    vehicleNumber: lrData["Vehicle Number"] || null,
    fromLocation: lrData["FROM"] || null,
    toLocation: lrData["TO"] || null,
    materialSupplyTo: lrData["Material Supply To"] || null,
    loadedWeight: lrData["Loaded Weight"] || null,
    emptyWeight: lrData["Empty Weight"] || null,
    descriptionOfGoods: lrData["Description of Goods"] || null,
    quantity: lrData["Quantity"] || null,
    koelGateEntryNo: lrData["Koel Gate Entry No"] || null,
    koelGateEntryDate: lrData["Koel Gate Entry Date"] || null,
    weightslipNo: lrData["Weightslip No"] || null,
    totalNoOfInvoices: lrData["Total No of Invoices"] || null,
    invoiceNo: lrData["Invoice No"] || null,
    grrNo: lrData["GRR No"] || null,
    grrDate: lrData["GRR Date"] || null,
    status: lrData["status"] || "LR Done",
    // Bill-specific fields
    billSubmissionDate: lrData["Bill Submission Date"] || null,
    billNumber: lrData["Bill Number"] || null,
    deliveryLocations: lrData["Delivery Locations"] ? JSON.stringify(lrData["Delivery Locations"]) : null,
    amount: lrData["Amount"] || null,
  };
};

// Convert Prisma LR to LRData format
const fromPrismaFormat = (prismaLr: any): LRData => {
  return {
    "LR No": prismaLr.lrNo,
    "LR Date": prismaLr.lrDate,
    "Vehicle Type": prismaLr.vehicleType,
    "Vehicle Number": prismaLr.vehicleNumber || "",
    "FROM": prismaLr.fromLocation || "",
    "TO": prismaLr.toLocation || "",
    "Material Supply To": prismaLr.materialSupplyTo || "",
    "Loaded Weight": prismaLr.loadedWeight || "",
    "Empty Weight": prismaLr.emptyWeight || "",
    "Description of Goods": prismaLr.descriptionOfGoods || "",
    "Quantity": prismaLr.quantity || "",
    "Koel Gate Entry No": prismaLr.koelGateEntryNo || "",
    "Koel Gate Entry Date": prismaLr.koelGateEntryDate || "",
    "Weightslip No": prismaLr.weightslipNo || "",
    "Total No of Invoices": prismaLr.totalNoOfInvoices || "",
    "Invoice No": prismaLr.invoiceNo || "",
    "GRR No": prismaLr.grrNo || "",
    "GRR Date": prismaLr.grrDate || "",
    "status": prismaLr.status || "LR Done",
    created_at: prismaLr.createdAt?.toISOString(),
    updated_at: prismaLr.updatedAt?.toISOString(),
    // Bill-specific fields
    "Bill Submission Date": prismaLr.billSubmissionDate || "",
    "Bill Number": prismaLr.billNumber || "",
    "Delivery Locations": prismaLr.deliveryLocations ? JSON.parse(prismaLr.deliveryLocations) : [],
    "Amount": prismaLr.amount || 0,
  };
};

// Get all LRs
export const getAllLRs = async (): Promise<LRData[]> => {
  try {
    const lrs = await prisma.lR.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return lrs.map(fromPrismaFormat);
  } catch (error) {
    console.error('Error getting all LRs:', error);
    return [];
  }
};

// Get LR by number
export const getLRByNumber = async (lrNo: string): Promise<LRData | null> => {
  try {
    const lr = await prisma.lR.findUnique({
      where: { lrNo },
    });
    return lr ? fromPrismaFormat(lr) : null;
  } catch (error) {
    console.error('Error getting LR:', error);
    return null;
  }
};

// Add new LR (or update if exists)
export const addLR = async (lrData: LRData): Promise<boolean> => {
  try {
    // Use upsert to update if exists, create if not
    await prisma.lR.upsert({
      where: { lrNo: lrData['LR No'] },
      update: toPrismaFormat(lrData),
      create: toPrismaFormat(lrData),
    });
    console.log('LR saved successfully:', lrData['LR No']);
    return true;
  } catch (error) {
    console.error('Error adding LR:', error);
    return false;
  }
};

// Update LR
export const updateLR = async (lrNo: string, lrData: Partial<LRData>): Promise<boolean> => {
  try {
    // Only update the status field if provided
    const updateData: any = {};
    if (lrData.status !== undefined) {
      updateData.status = lrData.status;
    }
    
    await prisma.lR.update({
      where: { lrNo },
      data: updateData,
    });
    return true;
  } catch (error) {
    console.error('Error updating LR:', error);
    return false;
  }
};

// Delete LR
export const deleteLR = async (lrNo: string): Promise<boolean> => {
  try {
    await prisma.lR.delete({
      where: { lrNo },
    });
    return true;
  } catch (error) {
    console.error('Error deleting LR:', error);
    return false;
  }
};

// Delete multiple LRs
export const deleteMultipleLRs = async (lrNumbers: string[]): Promise<boolean> => {
  try {
    await prisma.lR.deleteMany({
      where: {
        lrNo: {
          in: lrNumbers,
        },
      },
    });
    return true;
  } catch (error) {
    console.error('Error deleting multiple LRs:', error);
    return false;
  }
};

// Check if LR exists
export const lrExists = async (lrNo: string): Promise<boolean> => {
  try {
    const count = await prisma.lR.count({
      where: { lrNo },
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking LR existence:', error);
    return false;
  }
};

// Get LRs by month and year
export const getLRsByMonth = async (year: number, month: number): Promise<LRData[]> => {
  try {
    const lrs = await prisma.lR.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Filter by month/year
    return lrs
      .filter(lr => {
        const lrDate = lr.lrDate;
        if (!lrDate) return false;
        
        try {
          const parts = lrDate.split('-');
          if (parts.length === 3) {
            const lrMonth = parseInt(parts[1]);
            const lrYear = parseInt(parts[2]);
            return lrYear === year && lrMonth === month;
          }
        } catch {
          return false;
        }
        return false;
      })
      .map(fromPrismaFormat);
  } catch (error) {
    console.error('Error getting LRs by month:', error);
    return [];
  }
};

// Get unique months
export const getUniqueMonths = async (): Promise<Array<{year: number, month: number}>> => {
  try {
    const lrs = await prisma.lR.findMany({
      select: { lrDate: true },
    });
    
    const months = new Set<string>();
    
    lrs.forEach(lr => {
      const lrDate = lr.lrDate;
      if (!lrDate) return;
      
      try {
        const parts = lrDate.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[2]);
          const month = parseInt(parts[1]);
          months.add(`${year}-${month}`);
        }
      } catch {
        return;
      }
    });
    
    return Array.from(months)
      .map(m => {
        const [year, month] = m.split('-');
        return { year: parseInt(year), month: parseInt(month) };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  } catch (error) {
    console.error('Error getting unique months:', error);
    return [];
  }
};
