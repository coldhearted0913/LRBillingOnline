import { useState } from 'react';
import { LRData } from '@/lib/database';
import { CategorizedLRs, GenerationResult } from '@/lib/types/dashboard';
import { computeLrFinancials } from '@/lib/utils/lrFinancials';
import { VEHICLE_AMOUNTS, ADDITIONAL_BILL_AMOUNTS } from '@/lib/constants';
import toast from 'react-hot-toast';

export function useBillGeneration() {
  const [reworkBillNo, setReworkBillNo] = useState('');
  const [additionalBillNo, setAdditionalBillNo] = useState('');
  const [categorizedLrs, setCategorizedLrs] = useState<CategorizedLRs | null>(null);
  const [generationResults, setGenerationResults] = useState<GenerationResult[] | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBillTypes, setSelectedBillTypes] = useState<Set<string>>(new Set(['rework', 'additional', 'regular']));
  const [includeFinalSheet, setIncludeFinalSheet] = useState(true);
  const [zipDownloading, setZipDownloading] = useState(false);

  const categorizeLRs = (lrs: LRData[], selectedLrNos: string[]): CategorizedLRs => {
    const rework: string[] = [];
    const additional: string[] = [];
    const regular: string[] = [];

    const lrsToProcess = selectedLrNos.length > 0
      ? lrs.filter((lr) => selectedLrNos.includes(lr['LR No']))
      : lrs;

    lrsToProcess.forEach((lr) => {
      const financials = computeLrFinancials(lr);
      if (financials.isAdditionalRecord) {
        additional.push(lr['LR No']);
      } else if (financials.isRework) {
        rework.push(lr['LR No']);
      } else {
        regular.push(lr['LR No']);
      }
    });

    return { rework, additional, regular };
  };

  const validateSelectedLrs = (lrs: LRData[], selectedLrNos: string[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const lrsToCheck = selectedLrNos.length > 0
      ? lrs.filter((lr) => selectedLrNos.includes(lr['LR No']))
      : lrs;

    if (lrsToCheck.length === 0) {
      errors.push('No LRs selected for bill generation');
      return { valid: false, errors };
    }

    // Check for missing required fields
    lrsToCheck.forEach((lr) => {
      if (!lr['LR Date']) errors.push(`LR ${lr['LR No']}: Missing LR Date`);
      if (!lr['Vehicle Type']) errors.push(`LR ${lr['LR No']}: Missing Vehicle Type`);
      if (!lr['FROM']) errors.push(`LR ${lr['LR No']}: Missing FROM location`);
      if (!lr['TO']) errors.push(`LR ${lr['LR No']}: Missing TO location`);
    });

    return { valid: errors.length === 0, errors };
  };

  return {
    // State
    reworkBillNo,
    setReworkBillNo,
    additionalBillNo,
    setAdditionalBillNo,
    categorizedLrs,
    setCategorizedLrs,
    generationResults,
    setGenerationResults,
    showResultsModal,
    setShowResultsModal,
    selectedBillTypes,
    setSelectedBillTypes,
    includeFinalSheet,
    setIncludeFinalSheet,
    zipDownloading,
    setZipDownloading,
    // Functions
    categorizeLRs,
    validateSelectedLrs,
  };
}

