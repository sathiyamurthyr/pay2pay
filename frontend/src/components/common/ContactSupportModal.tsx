"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Building2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  HelpCircle,
  Headphones,
  Send
} from "lucide-react";

export interface SupportInfoData {
  company: {
    company_name: string;
    company_logo_url: string;
    support_email: string;
    support_phone: string;
    whatsapp_number: string;
    support_hours: string;
    live_chat_enabled: boolean;
    support_url: string;
  };
  application_details: {
    application_id: string;
    retailer_name: string;
    mobile_number: string;
    verification_status: string;
    submission_date: string;
  };
  admin_remarks: string;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

interface ContactSupportModalProps {
  open: boolean;
  onClose: () => void;
  identifier?: string;
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  open,
  onClose,
  identifier
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SupportInfoData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1");

  useEffect(() => {
    if (open) {
      setLoading(true);
      const regId = typeof window !== "undefined" ? localStorage.getItem("pay2pay_reg_id") : null;
      const mob = typeof window !== "undefined" ? (localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile")) : null;
      const targetQuery = identifier || regId || mob || "7013914767";

      fetch(`/api/v1/onboarding/support-info/${targetQuery}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.status === "SUCCESS" || resData.company) {
            setData(resData);
          }
          setLoading(false);
        })
        .catch(() => {
          // Fallback dynamic structure if server offline
          setData({
            company: {
              company_name: "Sathus Technology Pvt. Ltd.",
              company_logo_url: "/logo.svg",
              support_email: "support@near4you.store",
              support_phone: "+91 1800 292 982",
              whatsapp_number: "+91 70139 14767",
              support_hours: "Monday - Saturday | 09:00 AM - 07:00 PM IST",
              live_chat_enabled: true,
              support_url: "https://near4you.store/support"
            },
            application_details: {
              application_id: "APP-REG-A7110CFE2B",
              retailer_name: "Sathiya Murthy",
              mobile_number: "+91 7013914767",
              verification_status: "UNDER_REVIEW",
              submission_date: "August 09, 2026 07:30 PM IST"
            },
            admin_remarks: "No remarks available.",
            faqs: [
              {
                id: "faq-1",
                question: "Why is my account under review?",
                answer: "All new retailer applications undergo mandatory compliance verification by Near4You risk and operations teams to prevent identity fraud and ensure NPCI/RBI regulatory compliance before granting financial payment access."
              },
              {
                id: "faq-2",
                question: "How long does verification take?",
                answer: "Standard verification is typically completed within 2 to 4 business hours after submitting full KYC, PAN, Aadhaar, and Live Video verification."
              },
              {
                id: "faq-3",
                question: "What documents are required?",
                answer: "You need a valid PAN card, Aadhaar card, Bank Account details (cancelled cheque/passbook), Shop business proof (if registered), and a 15-second live video verification statement."
              },
              {
                id: "faq-4",
                question: "How do I upload missing documents?",
                answer: "If the admin requests additional document re-submission, you will receive an SMS and WhatsApp notification with a direct link to re-upload the missing proof."
              }
            ]
          });
          setLoading(false);
        });
    }
  }, [open, identifier]);

  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard Escape Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const appDetails = data?.application_details;
  const company = data?.company;

  const rawWhatsappMsg = `Hello,\n\nMy retailer account is currently under verification.\n\nApplication ID:\n${appDetails?.application_id || "APP-PENDING"}\n\nRetailer Name:\n${appDetails?.retailer_name || "Retailer"}\n\nRegistered Mobile:\n${appDetails?.mobile_number || "+91 7013914767"}\n\nPlease help me with my verification status.`;

  const cleanWhatsappNum = (company?.whatsapp_number || "+91 7013914767").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanWhatsappNum}?text=${encodeURIComponent(rawWhatsappMsg)}`;

  const cleanPhoneNum = (company?.support_phone || "+91 1800 292 982").replace(/[^\d+]/g, "");
  const mailToUrl = `mailto:${company?.support_email || "support@near4you.store"}?subject=${encodeURIComponent(`Verification Help: ${appDetails?.application_id || "Retailer Account"}`)}&body=${encodeURIComponent(rawWhatsappMsg)}`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop with blur & click outside close */}
        <motion.div
          key="support-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#FFFFFF]/80 backdrop-blur-md z-0"
        />

        {/* Centered Glassmorphism Modal */}
        <motion.div
          key="support-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FFFFFF] text-[#292329] border border-[#E8E2E5] rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2E5] bg-[#FAF8F9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF0F4] border border-[#FFD6E2] text-[#A20A3A] flex items-center justify-center font-black text-sm shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#292329] tracking-tight">
                  Contact Near4You Support
                </h2>
                <p className="text-xs font-medium text-[#625B60]">
                  Need help with your retailer verification? Our onboarding team is ready to assist you.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#FAF8F9] hover:bg-[#FFF0F4] text-[#625B60] hover:text-[#A20A3A] flex items-center justify-center transition-colors border border-[#E8E2E5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#A20A3A] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-[#625B60]">Loading live support channels & application status...</p>
              </div>
            ) : (
              <>
                {/* 1. COMPANY INFORMATION */}
                <div className="p-4 rounded-2xl bg-[#FAF8F9] border border-[#E8E2E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#A20A3A] to-[#85072F] text-white font-black text-base flex items-center justify-center shadow-md">
                      N4U
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#A20A3A]" />
                        <h3 className="text-sm font-extrabold text-[#292329]">
                          {company?.company_name || "Sathus Technology Pvt. Ltd."}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-[#625B60]">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Support Hours: <strong className="text-[#292329]">{company?.support_hours || "Monday - Saturday | 09:00 AM - 07:00 PM IST"}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CONTACT OPTIONS */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#A20A3A] mb-3">
                    Direct Contact Options
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Support Email */}
                    <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#FFF0F4] text-[#A20A3A] flex items-center justify-center border border-[#FFD6E2]">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#625B60]">Support Email</p>
                          <p className="text-xs font-extrabold text-[#292329] font-mono">{company?.support_email || "support@near4you.store"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(company?.support_email || "support@near4you.store", "email")}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#FAF8F9] hover:bg-[#FFF0F4] border border-[#E8E2E5] text-[11px] font-bold text-[#292329] hover:text-[#A20A3A] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === "email" ? "Copied" : "Copy Email"}</span>
                        </button>
                        <a
                          href={mailToUrl}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#FFF0F4] hover:bg-[#FFD6E2] border border-[#FFD6E2] text-[11px] font-bold text-[#A20A3A] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Mail Client</span>
                        </a>
                      </div>
                    </div>

                    {/* Support Phone */}
                    <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#625B60]">Phone Support</p>
                          <p className="text-xs font-extrabold text-[#292329] font-mono">{company?.support_phone || "+91 1800 292 982"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${cleanPhoneNum}`}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Now (Mobile)</span>
                        </a>
                        <button
                          onClick={() => copyToClipboard(company?.support_phone || "+91 1800 292 982", "phone")}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#FAF8F9] hover:bg-[#FFF0F4] border border-[#E8E2E5] text-[11px] font-bold text-[#292329] hover:text-[#A20A3A] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copiedField === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === "phone" ? "Copied" : "Copy Number"}</span>
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Support */}
                    <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] space-y-3 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[#625B60]">WhatsApp Instant Support</p>
                            <p className="text-xs font-extrabold text-[#292329] font-mono">{company?.whatsapp_number || "+91 70139 14767"}</p>
                          </div>
                        </div>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Open WhatsApp</span>
                        </a>
                      </div>
                      {/* Prefilled message preview */}
                      <div className="p-3 rounded-xl bg-[#FAF8F9] border border-[#E8E2E5] text-[11px] text-[#292329] font-mono space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A8288] mb-1">Prefilled Message Preview:</p>
                        <p className="whitespace-pre-line leading-relaxed">{rawWhatsappMsg}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. APPLICATION DETAILS */}
                <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#A20A3A] flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#A20A3A]" />
                    <span>Application Details</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-[#625B60]">Application ID</p>
                      <p className="font-extrabold text-[#292329] font-mono">{appDetails?.application_id || "APP-N4U-REG"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#625B60]">Retailer Name</p>
                      <p className="font-extrabold text-[#292329]">{appDetails?.retailer_name || "Sathiya Murthy"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#625B60]">Mobile Number</p>
                      <p className="font-extrabold text-[#292329] font-mono">{appDetails?.mobile_number || "+91 7013914767"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#625B60]">Verification Status</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-[#FFF8DC] text-[#D4A915] border border-[#FFF3C4] text-[10px] font-extrabold">
                        {appDetails?.verification_status || "UNDER_REVIEW"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-[#625B60]">Submission Date</p>
                      <p className="font-bold text-[#292329]">{appDetails?.submission_date || "August 09, 2026"}</p>
                    </div>
                  </div>
                </div>

                {/* 4. ADMIN REMARKS */}
                <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#A20A3A] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#EDC11E]" />
                    <span>Latest Admin Remarks</span>
                  </h4>
                  <div className="p-3 rounded-xl bg-[#FAF8F9] border border-[#E8E2E5] text-xs text-[#292329] font-medium">
                    {data?.admin_remarks || "No remarks available."}
                  </div>
                </div>

                {/* 5. HELP SECTION (FAQ ACCORDION) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#A20A3A] flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-[#A20A3A]" />
                    <span>Frequently Asked Questions</span>
                  </h4>
                  <div className="space-y-2">
                    {(data?.faqs || []).map((faq) => {
                      const isExpanded = expandedFaq === faq.id;
                      return (
                        <div
                          key={faq.id}
                          className="rounded-2xl bg-[#FFFFFF] border border-[#E8E2E5] overflow-hidden transition-colors"
                        >
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                            className="w-full p-3.5 text-left text-xs font-extrabold text-[#292329] flex items-center justify-between gap-2 hover:bg-[#FAF8F9] transition-colors"
                          >
                            <span>{faq.question}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#A20A3A] shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#8A8288] shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 text-xs text-[#625B60] font-normal leading-relaxed border-t border-[#E8E2E5] pt-2.5">
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Button Actions */}
          <div className="p-4 border-t border-[#E8E2E5] bg-[#FAF8F9] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-colors flex-1 sm:flex-none"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
              </a>
              <a
                href={`tel:${cleanPhoneNum}`}
                className="py-2 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#FAF8F9] text-[#292329] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#E8E2E5] transition-colors flex-1 sm:flex-none"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Support</span>
              </a>
              <a
                href={mailToUrl}
                className="py-2 px-4 rounded-xl bg-[#FFF0F4] hover:bg-[#FFD6E2] text-[#A20A3A] text-xs font-extrabold flex items-center justify-center gap-1.5 border border-[#FFD6E2] transition-colors flex-1 sm:flex-none"
              >
                <Mail className="w-3.5 h-3.5 text-[#A20A3A]" />
                <span>Send Email</span>
              </a>
            </div>
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl text-[#625B60] hover:text-[#292329] text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
