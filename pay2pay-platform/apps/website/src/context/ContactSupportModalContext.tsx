"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ContactSupportModal } from "@/components/common/ContactSupportModal";

interface ContactSupportModalContextType {
  openContactSupportModal: (identifier?: string) => void;
  closeContactSupportModal: () => void;
}

const ContactSupportModalContext = createContext<ContactSupportModalContextType | undefined>(undefined);

export const ContactSupportModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdentifier, setActiveIdentifier] = useState<string | undefined>(undefined);

  const openContactSupportModal = (identifier?: string) => {
    setActiveIdentifier(identifier);
    setIsOpen(true);
  };

  const closeContactSupportModal = () => {
    setIsOpen(false);
  };

  return (
    <ContactSupportModalContext.Provider value={{ openContactSupportModal, closeContactSupportModal }}>
      {children}
      <ContactSupportModal
        open={isOpen}
        onClose={closeContactSupportModal}
        identifier={activeIdentifier}
      />
    </ContactSupportModalContext.Provider>
  );
};

export const useContactSupportModal = () => {
  const context = useContext(ContactSupportModalContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      openContactSupportModal: () => {},
      closeContactSupportModal: () => {}
    };
  }
  return context;
};
