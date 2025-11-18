'use client';

import { sanitizeText } from '@/lib/utils/sanitize';
import { ReactNode } from 'react';

interface SafeTextProps {
  children: string | null | undefined;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

/**
 * Component that safely renders text by sanitizing it
 * Use this for displaying user-generated content to prevent XSS
 */
export function SafeText({ children, className, as: Component = 'span' }: SafeTextProps) {
  if (!children) return null;
  
  const sanitized = sanitizeText(children);
  
  return <Component className={className}>{sanitized}</Component>;
}

/**
 * Component that safely renders HTML (with limited tags)
 * Use only when you need basic formatting (bold, italic, etc.)
 */
interface SafeHTMLProps {
  html: string | null | undefined;
  className?: string;
  as?: 'div' | 'span' | 'p';
}

export function SafeHTML({ html, className, as: Component = 'div' }: SafeHTMLProps) {
  if (!html) return null;
  
  // Use dynamic import to avoid ESM issues
  const { sanitizeHTML } = require('@/lib/utils/sanitize');
  const sanitized = sanitizeHTML(html);
  
  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

