'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Save, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchWithCSRF } from '@/lib/utils/fetchWithCSRF';
import {
  DEFAULT_PROFIT_RATES,
  PROFIT_RATE_CONFIRMATION_PHRASE,
  ProfitRates,
  normalizeProfitRates,
  profitRatesEqual,
} from '@/lib/types/profitRates';
import { NormalizedVehicleType } from '@/lib/types/dashboard';

const VEHICLE_TYPES: NormalizedVehicleType[] = ['PICKUP', 'TRUCK', 'TOROUS'];

type ProfitRatesEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (rates: ProfitRates) => void;
  initialRates: ProfitRates;
  updatedAt?: string | null;
  updatedBy?: string | null;
  isCustom?: boolean;
};

export default function ProfitRatesEditor({
  open,
  onOpenChange,
  onSaved,
  initialRates,
  updatedAt,
  updatedBy,
  isCustom,
}: ProfitRatesEditorProps) {
  const [step, setStep] = useState<'warning' | 'edit'>('warning');
  const [draft, setDraft] = useState<ProfitRates>(initialRates);
  const [password, setPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('warning');
      setDraft(normalizeProfitRates(initialRates));
      setPassword('');
      setConfirmationPhrase('');
      setAcknowledgeWarning(false);
      setShowAdvanced(false);
      setSaving(false);
    }
  }, [open, initialRates]);

  const setMapValue = (
    key: 'vehicleAmounts' | 'driverPayments' | 'reworkDriverPayments' | 'additionalBillAmounts',
    type: NormalizedVehicleType,
    raw: string
  ) => {
    const parsed = raw === '' ? 0 : Number(raw);
    setDraft((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: Number.isFinite(parsed) && parsed >= 0 ? parsed : prev[key][type],
      },
    }));
  };

  const handleSave = async (resetToDefaults = false) => {
    if (!acknowledgeWarning) {
      toast.error('Acknowledge the warning before saving');
      return;
    }
    if (confirmationPhrase.trim() !== PROFIT_RATE_CONFIRMATION_PHRASE) {
      toast.error(`Type exactly: ${PROFIT_RATE_CONFIRMATION_PHRASE}`);
      return;
    }
    if (!password) {
      toast.error('Enter the statistics password');
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithCSRF('/api/profit-rates', {
        method: 'PUT',
        body: JSON.stringify({
          password,
          confirmationPhrase: confirmationPhrase.trim(),
          acknowledgeWarning: true,
          rates: draft,
          resetToDefaults,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to save rates');
      }
      toast.success(
        resetToDefaults
          ? 'Profit rates restored to defaults'
          : 'Profit rates updated for statistics'
      );
      onSaved(normalizeProfitRates(data.rates));
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save rates';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const dirty = !profitRatesEqual(draft, initialRates);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Configure Profit Rates
          </DialogTitle>
          <DialogDescription>
            CEO-only. These values drive Statistics profit only — not bills or invoices.
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
              <div className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Stop — read before changing</span>
              </div>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  Changing <strong>Amount to Company</strong> or{' '}
                  <strong>Amount to Transporter</strong> recalculates all profit figures on the
                  Statistics Card.
                </li>
                <li>
                  Wrong values will make profit look higher or lower than reality.
                </li>
                <li>
                  Generated Excel bills and invoice amounts are <strong>not</strong> changed by
                  this screen.
                </li>
                <li>
                  Only change rates when actual commercial rates have changed. Prefer leaving
                  defaults alone.
                </li>
              </ul>
            </div>

            {(isCustom || updatedAt) && (
              <p className="text-xs text-slate-600">
                {isCustom ? 'Custom rates are active.' : 'Using built-in defaults.'}
                {updatedAt
                  ? ` Last updated ${new Date(updatedAt).toLocaleString()}${
                      updatedBy ? ` by ${updatedBy}` : ''
                    }.`
                  : ''}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setStep('edit')}
              >
                I understand — continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              Saving requires the statistics password and typing{' '}
              <code className="font-mono bg-red-100 px-1 rounded">
                {PROFIT_RATE_CONFIRMATION_PHRASE}
              </code>
              .
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Amount to Company (Revenue per trip)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VEHICLE_TYPES.map((type) => (
                  <div key={`rev-${type}`} className="space-y-1">
                    <Label htmlFor={`company-${type}`}>{type}</Label>
                    <Input
                      id={`company-${type}`}
                      type="number"
                      min={0}
                      step={1}
                      value={draft.vehicleAmounts[type]}
                      onChange={(e) => setMapValue('vehicleAmounts', type, e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500">
                      Default ₹{DEFAULT_PROFIT_RATES.vehicleAmounts[type].toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Amount to Transporter (Expense per trip)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VEHICLE_TYPES.map((type) => (
                  <div key={`drv-${type}`} className="space-y-1">
                    <Label htmlFor={`transporter-${type}`}>{type}</Label>
                    <Input
                      id={`transporter-${type}`}
                      type="number"
                      min={0}
                      step={1}
                      value={draft.driverPayments[type]}
                      onChange={(e) => setMapValue('driverPayments', type, e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500">
                      Default ₹{DEFAULT_PROFIT_RATES.driverPayments[type].toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 px-0"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? 'Hide' : 'Show'} rework / additional rates
              </Button>
              {showAdvanced && (
                <div className="mt-3 space-y-4 border rounded-lg p-3 bg-slate-50">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Rework transporter payments</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {VEHICLE_TYPES.map((type) => (
                        <div key={`rw-${type}`} className="space-y-1">
                          <Label htmlFor={`rework-${type}`}>{type}</Label>
                          <Input
                            id={`rework-${type}`}
                            type="number"
                            min={0}
                            step={1}
                            value={draft.reworkDriverPayments[type]}
                            onChange={(e) =>
                              setMapValue('reworkDriverPayments', type, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Additional delivery amounts</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {VEHICLE_TYPES.map((type) => (
                        <div key={`add-${type}`} className="space-y-1">
                          <Label htmlFor={`additional-${type}`}>{type}</Label>
                          <Input
                            id={`additional-${type}`}
                            type="number"
                            min={0}
                            step={1}
                            value={draft.additionalBillAmounts[type]}
                            onChange={(e) =>
                              setMapValue('additionalBillAmounts', type, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <Label htmlFor="rework-multiplier">Rework revenue multiplier</Label>
                    <Input
                      id="rework-multiplier"
                      type="number"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={draft.reworkRevenueMultiplier}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        if (Number.isFinite(parsed)) {
                          setDraft((prev) => ({
                            ...prev,
                            reworkRevenueMultiplier: parsed,
                          }));
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-500">
                      Default {DEFAULT_PROFIT_RATES.reworkRevenueMultiplier} (80%)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acknowledgeWarning}
                  onChange={(e) => setAcknowledgeWarning(e.target.checked)}
                />
                <span>
                  I understand these rates change all Statistics profit figures and do not affect
                  generated bills.
                </span>
              </label>

              <div className="space-y-1">
                <Label htmlFor="confirm-phrase">
                  Type <span className="font-mono">{PROFIT_RATE_CONFIRMATION_PHRASE}</span> to
                  confirm
                </Label>
                <Input
                  id="confirm-phrase"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder={PROFIT_RATE_CONFIRMATION_PHRASE}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="stats-pw-rates">Statistics password</Label>
                <Input
                  id="stats-pw-rates"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Required to save"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto text-slate-700"
                disabled={saving}
                onClick={() => {
                  setDraft(DEFAULT_PROFIT_RATES);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Fill defaults
              </Button>
              <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={
                  saving ||
                  !acknowledgeWarning ||
                  confirmationPhrase.trim() !== PROFIT_RATE_CONFIRMATION_PHRASE ||
                  !password
                }
                className="border-amber-400 text-amber-900"
                onClick={() => handleSave(true)}
              >
                Reset & save defaults
              </Button>
              <Button
                disabled={
                  saving ||
                  !acknowledgeWarning ||
                  !dirty ||
                  confirmationPhrase.trim() !== PROFIT_RATE_CONFIRMATION_PHRASE ||
                  !password
                }
                className="bg-teal-700 hover:bg-teal-800 text-white"
                onClick={() => handleSave(false)}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving…' : 'Save rates'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
