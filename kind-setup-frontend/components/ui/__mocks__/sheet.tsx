import React from 'react';

export const Sheet = ({
  children,
  open,
}: {
  children: React.ReactNode;
  open?: boolean;
}) => {
  return (
    <div data-testid='sheet' data-state={open ? 'open' : 'closed'}>
      {children}
    </div>
  );
};

export const SheetTrigger = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='sheet-trigger'>{children}</div>;
};

export const SheetContent = ({
  children,
  side,
}: {
  children: React.ReactNode;
  side?: string;
}) => {
  return (
    <div data-testid='sheet-content' data-side={side}>
      {children}
    </div>
  );
};

export const SheetHeader = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='sheet-header'>{children}</div>;
};

export const SheetTitle = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='sheet-title'>{children}</div>;
};

export const SheetDescription = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <div data-testid='sheet-description'>{children}</div>;
};

export const SheetFooter = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='sheet-footer'>{children}</div>;
};

export const SheetClose = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid='sheet-close'>{children}</div>;
};

export default {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
};
