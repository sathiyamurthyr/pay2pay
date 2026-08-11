"use client";

import React from "react";
import { ContactSupportModal } from "./ContactSupportModal";

interface ContactAdminSupportModalProps {
  open: boolean;
  onClose: () => void;
  identifier?: string;
}

export const ContactAdminSupportModal: React.FC<ContactAdminSupportModalProps> = ({
  open,
  onClose,
  identifier,
}) => {
  return <ContactSupportModal open={open} onClose={onClose} identifier={identifier} />;
};

export default ContactAdminSupportModal;
