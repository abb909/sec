import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  VisuallyHidden 
} from "@/components/ui/dialog";

/**
 * Accessibility-compliant Dialog wrapper that ensures DialogTitle is always present
 * Use this when you need a dialog without a visible title
 */
interface AccessibleDialogContentProps extends React.ComponentProps<typeof DialogContent> {
  title?: string;
  hideTitle?: boolean;
}

export const AccessibleDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  AccessibleDialogContentProps
>(({ title = "Dialog", hideTitle = false, children, ...props }, ref) => (
  <DialogContent ref={ref} {...props}>
    {hideTitle ? (
      <VisuallyHidden>
        <DialogTitle>{title}</DialogTitle>
      </VisuallyHidden>
    ) : null}
    {children}
  </DialogContent>
));

AccessibleDialogContent.displayName = "AccessibleDialogContent";

/**
 * Utility to validate DialogContent has proper DialogTitle
 * This is a development-only check
 */
export const validateDialogAccessibility = (dialogElement: HTMLElement) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const dialogContent = dialogElement.querySelector('[role="dialog"]');
  if (!dialogContent) return;
  
  const dialogTitle = dialogContent.querySelector('[id*="title"]');
  if (!dialogTitle) {
    console.warn(
      '⚠️ Dialog accessibility warning: DialogContent should have a DialogTitle for screen readers.',
      'Consider using VisuallyHidden component if you want to hide the title visually.',
      dialogContent
    );
  }
};
