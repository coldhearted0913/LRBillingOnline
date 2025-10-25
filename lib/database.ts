import { prisma } from './prisma';

export interface LRData {
  "FROM": string;
  "TO": string;
  "Material Supply To": string;
  "Consignor": string;
  "Consignee": string;
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
  remark?: string;
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
    consignor: lrData["Consignor"] || null,
    consignee: lrData["Consignee"] || null,
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
    remark: lrData["remark"] || null,
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
    "Consignor": prismaLr.consignor || "",
    "Consignee": prismaLr.consignee || "",
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
    remark: prismaLr.remark || "",
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
    // Only update fields that are actually provided (not undefined)
    const updateData: any = {};
    
    // Map only the provided fields
    if (lrData["LR No"] !== undefined) updateData.lrNo = lrData["LR No"];
    if (lrData["LR Date"] !== undefined) updateData.lrDate = lrData["LR Date"];
    if (lrData["Vehicle Type"] !== undefined) updateData.vehicleType = lrData["Vehicle Type"];
    if (lrData["Vehicle Number"] !== undefined) updateData.vehicleNumber = lrData["Vehicle Number"] || null;
    if (lrData["FROM"] !== undefined) updateData.fromLocation = lrData["FROM"] || null;
    if (lrData["TO"] !== undefined) updateData.toLocation = lrData["TO"] || null;
    if (lrData["Material Supply To"] !== undefined) updateData.materialSupplyTo = lrData["Material Supply To"] || null;
    if (lrData["Consignor"] !== undefined) updateData.consignor = lrData["Consignor"] || null;
    if (lrData["Consignee"] !== undefined) updateData.consignee = lrData["Consignee"] || null;
    if (lrData["Loaded Weight"] !== undefined) updateData.loadedWeight = lrData["Loaded Weight"] || null;
    if (lrData["Empty Weight"] !== undefined) updateData.emptyWeight = lrData["Empty Weight"] || null;
    if (lrData["Description of Goods"] !== undefined) updateData.descriptionOfGoods = lrData["Description of Goods"] || null;
    if (lrData["Quantity"] !== undefined) updateData.quantity = lrData["Quantity"] || null;
    if (lrData["Koel Gate Entry No"] !== undefined) updateData.koelGateEntryNo = lrData["Koel Gate Entry No"] || null;
    if (lrData["Koel Gate Entry Date"] !== undefined) updateData.koelGateEntryDate = lrData["Koel Gate Entry Date"] || null;
    if (lrData["Weightslip No"] !== undefined) updateData.weightslipNo = lrData["Weightslip No"] || null;
    if (lrData["Total No of Invoices"] !== undefined) updateData.totalNoOfInvoices = lrData["Total No of Invoices"] || null;
    if (lrData["Invoice No"] !== undefined) updateData.invoiceNo = lrData["Invoice No"] || null;
    if (lrData["GRR No"] !== undefined) updateData.grrNo = lrData["GRR No"] || null;
    if (lrData["GRR Date"] !== undefined) updateData.grrDate = lrData["GRR Date"] || null;
    if (lrData["status"] !== undefined) updateData.status = lrData["status"] || "LR Done";
    if (lrData["remark"] !== undefined) updateData.remark = lrData["remark"] || null;
    if (lrData["Bill Submission Date"] !== undefined) updateData.billSubmissionDate = lrData["Bill Submission Date"] || null;
    if (lrData["Bill Number"] !== undefined) updateData.billNumber = lrData["Bill Number"] || null;
    if (lrData["Delivery Locations"] !== undefined) updateData.deliveryLocations = lrData["Delivery Locations"] ? JSON.stringify(lrData["Delivery Locations"]) : null;
    if (lrData["Amount"] !== undefined) updateData.amount = lrData["Amount"] || null;
    
    await prisma.lR.update({
      where: { lrNo },
      data: updateData,
    });
    console.log('LR updated successfully:', lrNo);
    return true;
  } catch (error) {
    console.error('Error updating LR:', error);
    return false;
  }
};

// Delete LR (with archive backup)
export const deleteLR = async (lrNo: string, deletedBy?: string): Promise<boolean> => {
  try {
    // 1. Get the LR to archive
    const lr = await prisma.lR.findUnique({
      where: { lrNo },
    });
    
    if (!lr) {
      console.error('LR not found:', lrNo);
      return false;
    }
    
    // 2. Create archive copy
    await prisma.archiveLR.create({
      data: {
        lrNo: lr.lrNo,
        lrDate: lr.lrDate,
        vehicleType: lr.vehicleType,
        vehicleNumber: lr.vehicleNumber,
        fromLocation: lr.fromLocation,
        toLocation: lr.toLocation,
        consignor: lr.consignor,
        consignee: lr.consignee,
        loadedWeight: lr.loadedWeight,
        emptyWeight: lr.emptyWeight,
        descriptionOfGoods: lr.descriptionOfGoods,
        quantity: lr.quantity,
        koelGateEntryNo: lr.koelGateEntryNo,
        koelGateEntryDate: lr.koelGateEntryDate,
        weightslipNo: lr.weightslipNo,
        totalNoOfInvoices: lr.totalNoOfInvoices,
        invoiceNo: lr.invoiceNo,
        grrNo: lr.grrNo,
        grrDate: lr.grrDate,
        status: lr.status,
        remark: lr.remark,
        billSubmissionDate: lr.billSubmissionDate,
        billNumber: lr.billNumber,
        deliveryLocations: lr.deliveryLocations,
        amount: lr.amount,
        originalCreatedAt: lr.createdAt,
        originalUpdatedAt: lr.updatedAt,
        deletedBy,
      },
    });
    
    // 3. Delete from main table
    await prisma.lR.delete({
      where: { lrNo },
    });
    
    console.log('LR archived and deleted:', lrNo);
    return true;
  } catch (error) {
    console.error('Error deleting LR:', error);
    return false;
  }
};

// Delete multiple LRs (with archive backup)
export const deleteMultipleLRs = async (lrNumbers: string[], deletedBy?: string): Promise<boolean> => {
  try {
    // 1. Get all LRs to archive
    const lrsToDelete = await prisma.lR.findMany({
      where: {
        lrNo: {
          in: lrNumbers,
        },
      },
    });
    
    // 2. Create archive copies
    for (const lr of lrsToDelete) {
      await prisma.archiveLR.create({
        data: {
          lrNo: lr.lrNo,
          lrDate: lr.lrDate,
          vehicleType: lr.vehicleType,
          vehicleNumber: lr.vehicleNumber,
          fromLocation: lr.fromLocation,
          toLocation: lr.toLocation,
          consignor: lr.consignor,
          consignee: lr.consignee,
          loadedWeight: lr.loadedWeight,
          emptyWeight: lr.emptyWeight,
          descriptionOfGoods: lr.descriptionOfGoods,
          quantity: lr.quantity,
          koelGateEntryNo: lr.koelGateEntryNo,
          koelGateEntryDate: lr.koelGateEntryDate,
          weightslipNo: lr.weightslipNo,
          totalNoOfInvoices: lr.totalNoOfInvoices,
          invoiceNo: lr.invoiceNo,
          grrNo: lr.grrNo,
          grrDate: lr.grrDate,
          status: lr.status,
          remark: lr.remark,
          billSubmissionDate: lr.billSubmissionDate,
          billNumber: lr.billNumber,
          deliveryLocations: lr.deliveryLocations,
          amount: lr.amount,
          originalCreatedAt: lr.createdAt,
          originalUpdatedAt: lr.updatedAt,
          deletedBy,
        },
      });
    }
    
    // 3. Delete from main table
    await prisma.lR.deleteMany({
      where: {
        lrNo: {
          in: lrNumbers,
        },
      },
    });
    
    console.log('LRs archived and deleted:', lrNumbers.length);
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

// Get all archived LRs
export const getAllArchivedLRs = async () => {
  try {
    const archivedLRs = await prisma.archiveLR.findMany({
      orderBy: { deletedAt: 'desc' },
    });
    return archivedLRs.map(archived => ({
      ...fromPrismaFormat(archived),
      archiveId: archived.id,
      deletedAt: archived.deletedAt?.toISOString(),
      deletedBy: archived.deletedBy,
    }));
  } catch (error) {
    console.error('Error getting archived LRs:', error);
    return [];
  }
};

// Get archived LR by LR number
export const getArchivedLR = async (lrNo: string) => {
  try {
    const archivedLR = await prisma.archiveLR.findFirst({
      where: { lrNo },
      orderBy: { deletedAt: 'desc' },
    });
    return archivedLR ? fromPrismaFormat(archivedLR) : null;
  } catch (error) {
    console.error('Error getting archived LR:', error);
    return null;
  }
};

// Restore archived LR (move back to main table)
export const restoreArchivedLR = async (archiveId: string) => {
  try {
    // Get the archived LR
    const archivedLR = await prisma.archiveLR.findUnique({
      where: { id: archiveId },
    });
    
    if (!archivedLR) {
      console.error('Archived LR not found:', archiveId);
      return false;
    }
    
    // Check if LR already exists in main table
    const existingLR = await prisma.lR.findUnique({
      where: { lrNo: archivedLR.lrNo },
    });
    
    if (existingLR) {
      console.error('LR already exists:', archivedLR.lrNo);
      return false;
    }
    
    // Create LR in main table
    await prisma.lR.create({
      data: {
        lrNo: archivedLR.lrNo,
        lrDate: archivedLR.lrDate,
        vehicleType: archivedLR.vehicleType,
        vehicleNumber: archivedLR.vehicleNumber,
        fromLocation: archivedLR.fromLocation,
        toLocation: archivedLR.toLocation,
        consignor: archivedLR.consignor,
        consignee: archivedLR.consignee,
        loadedWeight: archivedLR.loadedWeight,
        emptyWeight: archivedLR.emptyWeight,
        descriptionOfGoods: archivedLR.descriptionOfGoods,
        quantity: archivedLR.quantity,
        koelGateEntryNo: archivedLR.koelGateEntryNo,
        koelGateEntryDate: archivedLR.koelGateEntryDate,
        weightslipNo: archivedLR.weightslipNo,
        totalNoOfInvoices: archivedLR.totalNoOfInvoices,
        invoiceNo: archivedLR.invoiceNo,
        grrNo: archivedLR.grrNo,
        grrDate: archivedLR.grrDate,
        status: archivedLR.status,
        remark: archivedLR.remark,
        billSubmissionDate: archivedLR.billSubmissionDate,
        billNumber: archivedLR.billNumber,
        deliveryLocations: archivedLR.deliveryLocations,
        amount: archivedLR.amount,
        createdAt: archivedLR.originalCreatedAt,
        updatedAt: archivedLR.originalUpdatedAt,
      },
    });
    
    // Delete from archive (optional - you may want to keep it)
    // await prisma.archiveLR.delete({ where: { id: archiveId } });
    
    console.log('LR restored:', archivedLR.lrNo);
    return true;
  } catch (error) {
    console.error('Error restoring archived LR:', error);
    return false;
  }
};
