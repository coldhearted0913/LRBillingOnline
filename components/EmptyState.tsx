'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Search, Filter, Truck, TrendingUp, 
  AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

interface EmptyStateProps {
  type?: 'no-data' | 'no-results' | 'filtered' | 'error';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showIllustration?: boolean;
}

export default function EmptyState({
  type = 'no-data',
  title,
  description,
  actionLabel,
  onAction,
  showIllustration = true,
}: EmptyStateProps) {
  const getConfig = () => {
    switch (type) {
      case 'no-data':
        return {
          icon: FileText,
          defaultTitle: 'No LRs Found',
          defaultDescription: 'Get started by creating your first LR entry. Click the button below to begin.',
          defaultActionLabel: 'Create New LR',
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
        };
      case 'no-results':
        return {
          icon: Search,
          defaultTitle: 'No Results Found',
          defaultDescription: 'Try adjusting your filters or search terms to find what you\'re looking for.',
          defaultActionLabel: 'Clear Filters',
          iconColor: 'text-purple-500',
          bgColor: 'bg-purple-50',
        };
      case 'filtered':
        return {
          icon: Filter,
          defaultTitle: 'No Matching Records',
          defaultDescription: 'Your current filters don\'t match any LRs. Try changing your filter criteria.',
          defaultActionLabel: 'Reset Filters',
          iconColor: 'text-orange-500',
          bgColor: 'bg-orange-50',
        };
      case 'error':
        return {
          icon: XCircle,
          defaultTitle: 'Something Went Wrong',
          defaultDescription: 'We encountered an error. Please try again or contact support if the problem persists.',
          defaultActionLabel: 'Try Again',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          icon: FileText,
          defaultTitle: 'No Data',
          defaultDescription: 'There are no items to display.',
          defaultActionLabel: 'Get Started',
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="pt-12 pb-12">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
          {showIllustration && (
            <div className={`p-6 rounded-full ${config.bgColor} mb-2`}>
              <Icon className={`h-12 w-12 ${config.iconColor}`} />
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {title || config.defaultTitle}
            </h3>
            <p className="text-sm text-gray-600 max-w-sm">
              {description || config.defaultDescription}
            </p>
          </div>

          {onAction && actionLabel && (
            <Button 
              onClick={onAction}
              className="mt-4"
              size="lg"
            >
              {actionLabel || config.defaultActionLabel}
            </Button>
          )}

          {type === 'no-data' && (
            <div className="mt-6 pt-6 border-t border-gray-200 w-full">
              <p className="text-xs text-gray-500 mb-3 font-medium">Quick Tips:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">Track vehicle entries with detailed information</p>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">Monitor status and progress in real-time</p>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">Generate bills and invoices instantly</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
