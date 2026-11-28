"""
Dynamic Menu, Role-Permission, and Favorite Menu Service.

Centralizes server-side resolution of:
- Authenticated identity reference IDs:
  company_ref_id, retailer_ref_id, user_ref_id, user_type_ref_id, role_ref_id
- Dynamic permitted menus from public.menu + public.role_menu_permission + CustomerServiceConfigurationModel
- Multi-tenant favorite CRUD (add, remove, toggle, check, list, reorder) in public.favorite_menu
  and synchronized legacy views.

Strictly fail-closed: NEVER trusts client-supplied company_ref_id, retailer_ref_id,
user_ref_id, or role_ref_id. Always derives and validates against JWT + PostgreSQL + DomainContext.
"""

from __future__ import annotations

import logging
import re
import uuid
import zlib
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import HTTPException, Request, status
from sqlalchemy import and_, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.company_resolver import resolve_request_company_ref
from app.core.domain_resolver import extract_host, resolve_domain_context
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel
from app.infrastructure.db.menu_favorite_models import (
    FavoriteMenuModel,
    MenuModel,
    RoleMenuPermissionModel,
)
from app.infrastructure.db.models import (
    AdminFavoriteMenuModel,
    AdminUserModel,
    RetailerModel,
    RoleModel,
    UserFavoriteMenuModel,
    UserRoleModel,
    UserTypeModel,
)

logger = logging.getLogger("menu_favorite_service")


# ─── Authoritative Seed Catalog (loaded into public.menu & role_menu_permission) ───

ADMIN_MENU_SEED: List[Dict[str, Any]] = [
    # Main
    {"menu_code": "ADMIN_DASHBOARD", "menu_label": "Dashboard", "menu_href": "/dashboard", "menu_category": "Main", "icon_name": "LayoutDashboard", "display_order": 1},
    # Administration
    {"menu_code": "ADMIN_COMPANY", "menu_label": "Company", "menu_href": "/companies", "menu_category": "Administration", "icon_name": "Building2", "required_permission_code": "read:company", "display_order": 10},
    {"menu_code": "ADMIN_COMPANY_PROFILE", "menu_label": "Company Profile", "menu_href": "/admin/company-profile", "menu_category": "Administration", "icon_name": "Briefcase", "badge_text": "Live", "required_permission_code": "read:company", "display_order": 11},
    {"menu_code": "ADMIN_ORGANIZATION", "menu_label": "Organization", "menu_href": "/organization", "menu_category": "Administration", "icon_name": "Network", "display_order": 12},
    {"menu_code": "ADMIN_RM", "menu_label": "RM", "menu_href": "/organization/transfers", "menu_category": "Administration", "icon_name": "UserCircle", "display_order": 13},
    {"menu_code": "ADMIN_SUPER_DISTRIBUTOR", "menu_label": "Super Distributor", "menu_href": "/retailers", "menu_category": "Administration", "icon_name": "Store", "display_order": 14},
    {"menu_code": "ADMIN_DISTRIBUTOR", "menu_label": "Distributor", "menu_href": "/retailers", "menu_category": "Administration", "icon_name": "Store", "display_order": 15},
    {"menu_code": "ADMIN_RETAILER", "menu_label": "Retailer", "menu_href": "/retailers", "menu_category": "Administration", "icon_name": "Store", "display_order": 16},
    {"menu_code": "ADMIN_ACCOUNT_MIGRATION", "menu_label": "Account Migration", "menu_href": "/admin/migration", "menu_category": "Administration", "icon_name": "ArrowLeftRight", "badge_text": "Admin", "display_order": 17},
    {"menu_code": "ADMIN_ENTITY_USER", "menu_label": "Entity User", "menu_href": "/wallet-ledger/wallets", "menu_category": "Administration", "icon_name": "Wallet", "display_order": 18},
    {"menu_code": "ADMIN_MANUAL_TOPUP", "menu_label": "Manual Top-up", "menu_href": "/wallet-ledger/manual-topup", "menu_category": "Administration", "icon_name": "ArrowLeftRight", "display_order": 19},
    {"menu_code": "ADMIN_TOPUP_REQUESTS", "menu_label": "Topup Requests", "menu_href": "/operations/topup-requests", "menu_category": "Administration", "icon_name": "ArrowLeftRight", "badge_text": "Live", "display_order": 20},
    {"menu_code": "ADMIN_POS_MACHINE", "menu_label": "POS Machine", "menu_href": "/machines", "menu_category": "Administration", "icon_name": "CreditCard", "display_order": 21},
    {"menu_code": "ADMIN_USERS", "menu_label": "Users", "menu_href": "/users", "menu_category": "Administration", "icon_name": "Users", "required_permission_code": "read:user", "display_order": 22},
    {"menu_code": "ADMIN_USER_CREATION", "menu_label": "User Creation", "menu_href": "/users/create", "menu_category": "Administration", "icon_name": "UserPlus", "badge_text": "New", "required_permission_code": "create:user", "display_order": 23},
    {"menu_code": "ADMIN_ROLES", "menu_label": "Roles", "menu_href": "/roles", "menu_category": "Administration", "icon_name": "ShieldCheck", "required_permission_code": "read:role", "display_order": 24},
    # Configuration
    {"menu_code": "ADMIN_SERVICE_AVAILABILITY", "menu_label": "Service Availability", "menu_href": "/configuration/services", "menu_category": "Configuration", "icon_name": "Sliders", "badge_text": "Live", "display_order": 30},
    {"menu_code": "ADMIN_PAYOUT_SLABS", "menu_label": "Payout Slabs", "menu_href": "/configuration/payout-slabs", "menu_category": "Configuration", "icon_name": "Layers", "badge_text": "New", "display_order": 31},
    {"menu_code": "ADMIN_WHATSAPP_ALERTS", "menu_label": "WhatsApp Alerts", "menu_href": "/configuration/whatsapp-alerts", "menu_category": "Configuration", "icon_name": "MessageSquare", "badge_text": "Live", "display_order": 32},
    {"menu_code": "ADMIN_PAYOUT_SWITCH", "menu_label": "Payout Switch", "menu_href": "/payouts/gateways", "menu_category": "Configuration", "icon_name": "ArrowLeftRight", "badge_text": "Live", "display_order": 33},
    {"menu_code": "ADMIN_CFG_WALLET", "menu_label": "Wallet", "menu_href": "/wallet-ledger/entity-wallets", "menu_category": "Configuration", "icon_name": "Wallet", "display_order": 34},
    {"menu_code": "ADMIN_COA", "menu_label": "Chart of Accounts", "menu_href": "/wallet-ledger/chart-of-accounts", "menu_category": "Configuration", "icon_name": "BookOpen", "display_order": 35},
    {"menu_code": "ADMIN_CFG_TRANSACTIONS", "menu_label": "Transactions", "menu_href": "/settlements/transactions", "menu_category": "Configuration", "icon_name": "TrendingUp", "display_order": 36},
    {"menu_code": "ADMIN_COMMISSION", "menu_label": "Commission", "menu_href": "/financial-config/rules", "menu_category": "Configuration", "icon_name": "BookOpen", "display_order": 37},
    {"menu_code": "ADMIN_CHARGES", "menu_label": "Charges", "menu_href": "/financial-config/approvals", "menu_category": "Configuration", "icon_name": "Scale", "display_order": 38},
    {"menu_code": "ADMIN_CUSTOMER_POLICY", "menu_label": "Customer Policy", "menu_href": "/policies", "menu_category": "Configuration", "icon_name": "Sliders", "display_order": 39},
    {"menu_code": "ADMIN_BENEFICIARY_POLICY", "menu_label": "Beneficiary Policy", "menu_href": "/policies/evaluator", "menu_category": "Configuration", "icon_name": "Sliders", "display_order": 40},
    {"menu_code": "ADMIN_RISK", "menu_label": "Risk", "menu_href": "/fraud/rules", "menu_category": "Configuration", "icon_name": "ShieldAlert", "display_order": 41},
    {"menu_code": "ADMIN_AML", "menu_label": "AML", "menu_href": "/compliance/reports", "menu_category": "Configuration", "icon_name": "ShieldCheck", "display_order": 42},
    {"menu_code": "ADMIN_ANNOUNCEMENTS", "menu_label": "Announcements", "menu_href": "/announcements", "menu_category": "Configuration", "icon_name": "Megaphone", "badge_text": "Live", "display_order": 43},
    {"menu_code": "ADMIN_NOTIFICATIONS", "menu_label": "Notifications", "menu_href": "/notifications", "menu_category": "Configuration", "icon_name": "Bell", "display_order": 44},
    {"menu_code": "ADMIN_CFG_API", "menu_label": "API", "menu_href": "/developer/api-keys", "menu_category": "Configuration", "icon_name": "Webhook", "display_order": 45},
    {"menu_code": "ADMIN_SECURITY", "menu_label": "Security", "menu_href": "/settings/secrets", "menu_category": "Configuration", "icon_name": "Key", "display_order": 46},
    # Approvals
    {"menu_code": "ADMIN_APP_TOPUP_REQUESTS", "menu_label": "Topup Requests", "menu_href": "/operations/topup-requests", "menu_category": "Approvals", "icon_name": "ArrowLeftRight", "badge_text": "P0", "display_order": 50},
    {"menu_code": "ADMIN_KYC_ONBOARDING", "menu_label": "KYC & Onboarding", "menu_href": "/approvals", "menu_category": "Approvals", "icon_name": "CheckSquare", "display_order": 51},
    {"menu_code": "ADMIN_APP_SETTLEMENT", "menu_label": "Settlement", "menu_href": "/settlements/batches", "menu_category": "Approvals", "icon_name": "Receipt", "display_order": 52},
    {"menu_code": "ADMIN_WALLET_ADJUSTMENTS", "menu_label": "Wallet Adjustments", "menu_href": "/wallet-ledger/wallets", "menu_category": "Approvals", "icon_name": "Wallet", "display_order": 53},
    {"menu_code": "ADMIN_APP_CONFIG", "menu_label": "Configuration", "menu_href": "/bpm/approvals", "menu_category": "Approvals", "icon_name": "CheckSquare", "display_order": 54},
    {"menu_code": "ADMIN_HIGH_VALUE", "menu_label": "High Value", "menu_href": "/bpm/tasks", "menu_category": "Approvals", "icon_name": "AlertTriangle", "display_order": 55},
    # Monitoring
    {"menu_code": "ADMIN_MON_SERVICES", "menu_label": "Services", "menu_href": "/ops-dashboard", "menu_category": "Monitoring", "icon_name": "Activity", "display_order": 60},
    {"menu_code": "ADMIN_MON_API_LOGS", "menu_label": "API Logs", "menu_href": "/operations/api-logs", "menu_category": "Monitoring", "icon_name": "Terminal", "display_order": 61},
    {"menu_code": "ADMIN_MON_QUEUES", "menu_label": "Queues", "menu_href": "/bpm/queues", "menu_category": "Monitoring", "icon_name": "GitMerge", "display_order": 62},
    {"menu_code": "ADMIN_MON_API", "menu_label": "API", "menu_href": "/developer-dashboard", "menu_category": "Monitoring", "icon_name": "Code", "display_order": 63},
    {"menu_code": "ADMIN_MON_WALLET", "menu_label": "Wallet", "menu_href": "/wallet-ledger/reconciliation", "menu_category": "Monitoring", "icon_name": "Wallet", "display_order": 64},
    {"menu_code": "ADMIN_MON_SETTLEMENT", "menu_label": "Settlement", "menu_href": "/settlement-dashboard", "menu_category": "Monitoring", "icon_name": "TrendingUp", "display_order": 65},
    {"menu_code": "ADMIN_MON_DATABASE", "menu_label": "Database", "menu_href": "/compliance-dashboard", "menu_category": "Monitoring", "icon_name": "Landmark", "display_order": 66},
    # PayIn Management
    {"menu_code": "ADMIN_PAYIN_DASHBOARD", "menu_label": "PayIn Dashboard", "menu_href": "/admin/payin/dashboard", "menu_category": "PayIn Management", "icon_name": "LayoutDashboard", "badge_text": "Live", "display_order": 70},
    {"menu_code": "ADMIN_PAYIN_GATEWAYS", "menu_label": "Payment Gateways", "menu_href": "/admin/payin/gateways", "menu_category": "PayIn Management", "icon_name": "ArrowLeftRight", "badge_text": "Dynamic", "display_order": 71},
    {"menu_code": "ADMIN_PAYIN_POLICY", "menu_label": "Pricing Policy", "menu_href": "/admin/payin/policy", "menu_category": "PayIn Management", "icon_name": "ShieldCheck", "badge_text": "Policy", "display_order": 72},
    {"menu_code": "ADMIN_PAYIN_COMPANIES", "menu_label": "Company Config", "menu_href": "/admin/payin/companies", "menu_category": "PayIn Management", "icon_name": "Building2", "display_order": 73},
    {"menu_code": "ADMIN_PAYIN_VENDORS", "menu_label": "Vendor Management", "menu_href": "/admin/payin/vendors", "menu_category": "PayIn Management", "icon_name": "Layers", "display_order": 74},
    {"menu_code": "ADMIN_PAYIN_COMPANY_VENDORS", "menu_label": "Company Vendors", "menu_href": "/admin/payin/company-vendors", "menu_category": "PayIn Management", "icon_name": "Network", "display_order": 75},
    {"menu_code": "ADMIN_PAYIN_SERVICE_TYPES", "menu_label": "Service Types", "menu_href": "/admin/payin/service-types", "menu_category": "PayIn Management", "icon_name": "Sliders", "display_order": 76},
    {"menu_code": "ADMIN_PAYIN_PAYMENT_MODES", "menu_label": "Payment Modes", "menu_href": "/admin/payin/payment-modes", "menu_category": "PayIn Management", "icon_name": "CreditCard", "display_order": 77},
    {"menu_code": "ADMIN_PAYIN_CARD_TYPES", "menu_label": "Card Types", "menu_href": "/admin/payin/card-types", "menu_category": "PayIn Management", "icon_name": "CreditCard", "display_order": 78},
    {"menu_code": "ADMIN_PAYIN_MDR", "menu_label": "MDR Matrix", "menu_href": "/admin/payin/mdr", "menu_category": "PayIn Management", "icon_name": "Scale", "badge_text": "Dynamic", "display_order": 79},
    {"menu_code": "ADMIN_PAYIN_TXNS", "menu_label": "PayIn Transactions", "menu_href": "/admin/payin/transactions", "menu_category": "PayIn Management", "icon_name": "TrendingUp", "display_order": 80},
    {"menu_code": "ADMIN_PAYIN_CALLBACKS", "menu_label": "Callback Logs", "menu_href": "/admin/payin/callbacks", "menu_category": "PayIn Management", "icon_name": "Terminal", "display_order": 81},
    {"menu_code": "ADMIN_PAYIN_RECON", "menu_label": "Reconciliation", "menu_href": "/admin/payin/reconciliation", "menu_category": "PayIn Management", "icon_name": "Scale", "display_order": 82},
    {"menu_code": "ADMIN_PAYIN_AUDIT", "menu_label": "Audit Logs", "menu_href": "/admin/payin/audit-logs", "menu_category": "PayIn Management", "icon_name": "ScrollText", "display_order": 83},
    # Reports
    {"menu_code": "ADMIN_RPT_TXNS", "menu_label": "Transaction Report", "menu_href": "/admin/reports/transactions", "menu_category": "Reports", "icon_name": "FileText", "badge_text": "Master", "display_order": 90},
    {"menu_code": "ADMIN_RPT_LEDGER", "menu_label": "Transaction Ledger", "menu_href": "/admin/reports/transaction-ledger", "menu_category": "Reports", "icon_name": "ScrollText", "display_order": 91},
    {"menu_code": "ADMIN_RPT_PAYIN", "menu_label": "PayIn Report", "menu_href": "/admin/reports/payin-transactions", "menu_category": "Reports", "icon_name": "TrendingUp", "badge_text": "Live", "display_order": 92},
    {"menu_code": "ADMIN_RPT_PAYOUT", "menu_label": "Payout Report", "menu_href": "/admin/reports/payout-transactions", "menu_category": "Reports", "icon_name": "FileText", "display_order": 93},
    {"menu_code": "ADMIN_RPT_GST", "menu_label": "GST Report", "menu_href": "/admin/reports/gst", "menu_category": "Reports", "icon_name": "Receipt", "badge_text": "P0", "display_order": 94},
    {"menu_code": "ADMIN_RPT_CENTER", "menu_label": "Report Center", "menu_href": "/retailer/reports", "menu_category": "Reports", "icon_name": "FileText", "display_order": 95},
    {"menu_code": "ADMIN_RPT_SETTLEMENT", "menu_label": "Settlement", "menu_href": "/settlement-processing/batches", "menu_category": "Reports", "icon_name": "FileText", "display_order": 96},
    {"menu_code": "ADMIN_RPT_WALLET", "menu_label": "Wallet", "menu_href": "/settlement-processing/journals", "menu_category": "Reports", "icon_name": "FileText", "display_order": 97},
    {"menu_code": "ADMIN_RPT_RETAILERS", "menu_label": "Retailers", "menu_href": "/retailer-dashboard", "menu_category": "Reports", "icon_name": "BarChart3", "display_order": 98},
    {"menu_code": "ADMIN_RPT_MACHINES", "menu_label": "Machines", "menu_href": "/machine-dashboard", "menu_category": "Reports", "icon_name": "CreditCard", "display_order": 99},
    {"menu_code": "ADMIN_RPT_AUDIT", "menu_label": "Audit", "menu_href": "/compliance/audit-explorer", "menu_category": "Reports", "icon_name": "ScrollText", "display_order": 100},
    {"menu_code": "ADMIN_RPT_RECON", "menu_label": "Reconciliation", "menu_href": "/mis-dashboard", "menu_category": "Reports", "icon_name": "Scale", "display_order": 101},
]

RETAILER_MENU_SEED: List[Dict[str, Any]] = [
    # MAIN
    {"menu_code": "RET_DASHBOARD", "menu_label": "Dashboard", "menu_href": "/retailer/dashboard", "menu_category": "MAIN", "icon_name": "Dashboard", "display_order": 1},
    # PAYMENTS
    {"menu_code": "RET_DMT", "menu_label": "DMT", "menu_href": "/retailer/dmt", "menu_category": "PAYMENTS", "service_code": "DMT", "icon_name": "Send", "is_financial": True, "display_order": 10},
    {"menu_code": "RET_CARD_TO_CASH", "menu_label": "Card to Cash", "menu_href": "/retailer/card-to-cash", "menu_category": "PAYMENTS", "service_code": "POS_TOPUP", "icon_name": "CreditCard", "is_financial": True, "display_order": 11},
    {"menu_code": "RET_CARD_MANAGEMENT", "menu_label": "Credit Card Management", "menu_href": "/retailer/cards", "menu_category": "PAYMENTS", "icon_name": "CreditCard", "is_financial": False, "display_order": 12},
    {"menu_code": "RET_AEPS", "menu_label": "AEPS", "menu_href": "/retailer/aeps", "menu_category": "PAYMENTS", "service_code": "AEPS", "icon_name": "Fingerprint", "is_financial": True, "display_order": 12},
    {"menu_code": "RET_UPI", "menu_label": "UPI", "menu_href": "/retailer/upi", "menu_category": "PAYMENTS", "service_code": "UPI", "icon_name": "QrCode", "is_financial": True, "display_order": 13},
    {"menu_code": "RET_BBPS", "menu_label": "BBPS", "menu_href": "/retailer/bbps", "menu_category": "PAYMENTS", "service_code": "BBPS", "icon_name": "Receipt", "is_financial": True, "display_order": 14},
    {"menu_code": "RET_PAYIN", "menu_label": "PayIn (Add Money)", "menu_href": "/retailer/payin", "menu_category": "PAYMENTS", "service_code": "PAYIN", "icon_name": "AddCard", "is_financial": True, "display_order": 15},
    {"menu_code": "RET_RECHARGE", "menu_label": "Recharge", "menu_href": "/retailer/recharge", "menu_category": "PAYMENTS", "service_code": "RECHARGE", "icon_name": "PhoneAndroid", "is_financial": True, "display_order": 16},
    # WALLET
    {"menu_code": "RET_WALLET", "menu_label": "Wallet", "menu_href": "/retailer/wallet", "menu_category": "WALLET", "icon_name": "AccountBalanceWallet", "is_financial": True, "display_order": 20},
    {"menu_code": "RET_WALLET_TOPUP", "menu_label": "Wallet Top-up", "menu_href": "/retailer/wallet-topup", "menu_category": "WALLET", "icon_name": "AddCard", "is_financial": True, "display_order": 21},
    {"menu_code": "RET_TOPUP_REQUEST", "menu_label": "Topup Request", "menu_href": "/retailer/topup-request", "menu_category": "WALLET", "icon_name": "CloudUpload", "is_financial": True, "display_order": 22},
    {"menu_code": "RET_WALLET_LEDGER", "menu_label": "Wallet Ledger", "menu_href": "/retailer/wallet-ledger", "menu_category": "WALLET", "icon_name": "ReceiptLong", "display_order": 23},
    # CUSTOMERS & REPORTS
    {"menu_code": "RET_CUSTOMERS", "menu_label": "Customers", "menu_href": "/retailer/customers", "menu_category": "CUSTOMERS & REPORTS", "icon_name": "Person", "display_order": 30},
    {"menu_code": "RET_BENEFICIARIES", "menu_label": "Beneficiaries", "menu_href": "/retailer/beneficiary", "menu_category": "CUSTOMERS & REPORTS", "parent_service_code": "DMT", "icon_name": "Contacts", "display_order": 31},
    {"menu_code": "RET_RPT_PAYIN", "menu_label": "PayIn Report", "menu_href": "/retailer/reports/payin-transactions", "menu_category": "CUSTOMERS & REPORTS", "parent_service_code": "PAYIN", "icon_name": "Assessment", "display_order": 32},
    {"menu_code": "RET_RPT_PAYOUT", "menu_label": "Payout Report", "menu_href": "/retailer/reports/payout-transactions", "menu_category": "CUSTOMERS & REPORTS", "parent_service_code": "DMT", "icon_name": "ReceiptLong", "display_order": 33},
    {"menu_code": "RET_RPT_TRANSACTIONS", "menu_label": "Transactions", "menu_href": "/retailer/reports/transactions", "menu_category": "CUSTOMERS & REPORTS", "icon_name": "Assessment", "display_order": 34},
    {"menu_code": "RET_RPT_GST", "menu_label": "GST Report", "menu_href": "/retailer/reports/gst", "menu_category": "CUSTOMERS & REPORTS", "icon_name": "Receipt", "display_order": 35},
    {"menu_code": "RET_RPT_SETTLEMENT", "menu_label": "Settlement", "menu_href": "/retailer/reports/settlement", "menu_category": "CUSTOMERS & REPORTS", "parent_service_code": "POS_TOPUP", "icon_name": "PointOfSale", "display_order": 36},
    # ACCOUNT
    {"menu_code": "RET_PROFILE", "menu_label": "Profile", "menu_href": "/retailer/profile", "menu_category": "ACCOUNT", "icon_name": "Person", "display_order": 40},
    {"menu_code": "RET_SECURITY", "menu_label": "Settings", "menu_href": "/retailer/security", "menu_category": "ACCOUNT", "icon_name": "Shield", "display_order": 41},
]

# Restricted Admin role filters matching existing RBAC matrix
ROLE_RESTRICTED_ADMIN_CODES: Dict[str, Set[str]] = {
    "REGIONAL_MANAGER": {
        "ADMIN_DASHBOARD", "ADMIN_ORGANIZATION", "ADMIN_RM", "ADMIN_SUPER_DISTRIBUTOR",
        "ADMIN_DISTRIBUTOR", "ADMIN_RETAILER", "ADMIN_POS_MACHINE", "ADMIN_KYC_ONBOARDING",
        "ADMIN_RPT_TXNS", "ADMIN_RPT_LEDGER", "ADMIN_RPT_PAYIN", "ADMIN_RPT_PAYOUT",
        "ADMIN_RPT_GST", "ADMIN_RPT_RETAILERS", "ADMIN_RPT_MACHINES",
    },
    "FINANCE": {
        "ADMIN_DASHBOARD", "ADMIN_ENTITY_USER", "ADMIN_MANUAL_TOPUP", "ADMIN_TOPUP_REQUESTS",
        "ADMIN_PAYOUT_SWITCH", "ADMIN_CFG_WALLET", "ADMIN_COA", "ADMIN_CFG_TRANSACTIONS",
        "ADMIN_COMMISSION", "ADMIN_CHARGES", "ADMIN_APP_TOPUP_REQUESTS", "ADMIN_APP_SETTLEMENT",
        "ADMIN_WALLET_ADJUSTMENTS", "ADMIN_RPT_TXNS", "ADMIN_RPT_LEDGER", "ADMIN_RPT_PAYIN",
        "ADMIN_RPT_PAYOUT", "ADMIN_RPT_GST", "ADMIN_RPT_SETTLEMENT", "ADMIN_RPT_WALLET",
        "ADMIN_RPT_RECON",
    },
    "SETTLEMENT_MGR": {
        "ADMIN_DASHBOARD", "ADMIN_TOPUP_REQUESTS", "ADMIN_CFG_WALLET", "ADMIN_CFG_TRANSACTIONS",
        "ADMIN_APP_SETTLEMENT", "ADMIN_WALLET_ADJUSTMENTS", "ADMIN_RPT_SETTLEMENT",
        "ADMIN_RPT_WALLET", "ADMIN_RPT_RECON",
    },
    "COMPLIANCE": {
        "ADMIN_DASHBOARD", "ADMIN_CUSTOMER_POLICY", "ADMIN_BENEFICIARY_POLICY",
        "ADMIN_RISK", "ADMIN_AML", "ADMIN_SECURITY", "ADMIN_KYC_ONBOARDING",
        "ADMIN_HIGH_VALUE", "ADMIN_RPT_TXNS", "ADMIN_RPT_AUDIT", "ADMIN_RPT_GST",
    },
    "AUDIT_VIEWER": {
        "ADMIN_DASHBOARD", "ADMIN_RPT_TXNS", "ADMIN_RPT_LEDGER", "ADMIN_RPT_PAYIN",
        "ADMIN_RPT_PAYOUT", "ADMIN_RPT_GST", "ADMIN_RPT_AUDIT", "ADMIN_RPT_RECON",
        "ADMIN_PAYIN_AUDIT",
    },
    "OPERATIONS": {
        "ADMIN_DASHBOARD", "ADMIN_SUPER_DISTRIBUTOR", "ADMIN_DISTRIBUTOR", "ADMIN_RETAILER",
        "ADMIN_POS_MACHINE", "ADMIN_TOPUP_REQUESTS", "ADMIN_SERVICE_AVAILABILITY",
        "ADMIN_ANNOUNCEMENTS", "ADMIN_NOTIFICATIONS", "ADMIN_KYC_ONBOARDING",
        "ADMIN_MON_SERVICES", "ADMIN_MON_API_LOGS", "ADMIN_MON_QUEUES",
        "ADMIN_RPT_TXNS", "ADMIN_RPT_PAYIN", "ADMIN_RPT_PAYOUT",
    },
}

SERVICE_SUBMENU_PATHS: Dict[str, List[str]] = {
    "DMT": [
        "/retailer/dmt",
        "/retailer/beneficiary",
        "/retailer/beneficiaries",
        "/retailer/reports/payout-transactions",
        "/retailer/dmt/reports",
    ],
    "PAYIN": [
        "/retailer/payin",
        "/retailer/reports/payin-transactions",
        "/retailer/reports/payin",
    ],
    "POS_TOPUP": [
        "/retailer/card-to-cash",
        "/retailer/settlement",
        "/retailer/reports/settlement",
        "/retailer/settlements",
    ],
    "RECHARGE": ["/retailer/recharge"],
    "AEPS": ["/retailer/aeps"],
    "BBPS": ["/retailer/bbps"],
    "UPI": ["/retailer/upi"],
}


@dataclass
class ResolvedFavoriteIdentity:
    company_ref_id: int
    user_ref_id: int
    retailer_ref_id: Optional[int]
    user_type_ref_id: int
    role_ref_id: Optional[int]
    role_codes: List[str]
    is_admin: bool
    is_super_admin: bool
    actor_email: str
    retailer_code: Optional[str] = None


def _stable_numeric_id(value: str) -> int:
    """Deterministic positive 31-bit integer fallback when a mock/synthetic token has no DB int PK."""
    if not value:
        return 1
    if str(value).isdigit():
        return int(value)
    return 100_000_000 + (zlib.crc32(str(value).encode("utf-8")) & 0x7FFFFFFF)


class MenuFavoriteService:
    """Authoritative reference-ID based menu & favorite manager for Admin and Retailer portals."""

    _seeded_flag: bool = False

    @classmethod
    async def ensure_seeded(cls, db: AsyncSession) -> None:
        """Idempotently create menu/favorite tables if missing and seed public.menu & role_menu_permission."""
        try:
            existing_menus = (await db.execute(select(MenuModel).where(MenuModel.is_deleted == False))).scalars().all()
        except Exception:
            await db.rollback()
            try:
                conn = await db.connection()
                await conn.run_sync(
                    lambda sync_conn: MenuModel.__table__.create(sync_conn, checkfirst=True)
                )
                await conn.run_sync(
                    lambda sync_conn: RoleMenuPermissionModel.__table__.create(sync_conn, checkfirst=True)
                )
                await conn.run_sync(
                    lambda sync_conn: FavoriteMenuModel.__table__.create(sync_conn, checkfirst=True)
                )
                await db.commit()
                existing_menus = (await db.execute(select(MenuModel).where(MenuModel.is_deleted == False))).scalars().all()
            except Exception as ddl_err:
                logger.warning(f"Menu/favorite DDL ensure notice: {ddl_err}")
                await db.rollback()
                return

        by_code = {m.menu_code: m for m in existing_menus}
        changed = False

        for entry in ADMIN_MENU_SEED:
            if entry["menu_code"] not in by_code:
                m = MenuModel(
                    public_id=uuid.uuid4(),
                    user_type_ref_id=1,
                    portal_scope="ADMIN",
                    is_active=True,
                    is_deleted=False,
                    **entry,
                )
                db.add(m)
                by_code[entry["menu_code"]] = m
                changed = True

        for entry in RETAILER_MENU_SEED:
            if entry["menu_code"] not in by_code:
                m = MenuModel(
                    public_id=uuid.uuid4(),
                    user_type_ref_id=2,
                    portal_scope="RETAILER",
                    is_active=True,
                    is_deleted=False,
                    **entry,
                )
                db.add(m)
                by_code[entry["menu_code"]] = m
                changed = True

        if changed:
            await db.flush()

        # Seed baseline RoleMenuPermissionModel rows for roles present in public.role
        try:
            roles = (await db.execute(select(RoleModel).where(RoleModel.is_deleted == False))).scalars().all()
            existing_rmp = (
                await db.execute(select(RoleMenuPermissionModel).where(RoleMenuPermissionModel.is_deleted == False))
            ).scalars().all()
            existing_pairs = {(r.role_ref_id, r.menu_ref_id, r.company_ref_id or 0) for r in existing_rmp}

            for role in roles:
                rcode = (role.code or "").upper()
                if rcode == "RETAILER":
                    target_menus = [m for m in by_code.values() if m.user_type_ref_id == 2]
                    ut_ref = 2
                elif rcode in ("DISTRIBUTOR", "DIST", "SUPER_DISTRIBUTOR", "SD"):
                    continue
                else:
                    all_admin = [m for m in by_code.values() if m.user_type_ref_id == 1]
                    restricted = ROLE_RESTRICTED_ADMIN_CODES.get(rcode)
                    target_menus = [m for m in all_admin if restricted is None or m.menu_code in restricted]
                    ut_ref = 1

                for m in target_menus:
                    if m.menu_ref_id and (role.id, m.menu_ref_id, 0) not in existing_pairs:
                        db.add(
                            RoleMenuPermissionModel(
                                role_ref_id=role.id,
                                user_type_ref_id=ut_ref,
                                menu_ref_id=m.menu_ref_id,
                                company_ref_id=None,
                                can_view=True,
                                can_favorite=True,
                                is_active=True,
                                is_deleted=False,
                            )
                        )
                        existing_pairs.add((role.id, m.menu_ref_id, 0))
                        changed = True
        except Exception as e:
            logger.debug(f"Role menu permission seed skipped: {e}")

        if changed:
            await db.commit()
        cls._seeded_flag = True

    @classmethod
    async def resolve_authenticated_identity(
        cls,
        db: AsyncSession,
        request: Optional[Request],
        token_payload: Optional[dict],
        current_user: Optional[Any],
        portal_hint: Optional[str] = None,
    ) -> ResolvedFavoriteIdentity:
        """
        Resolves company_ref_id, retailer_ref_id, user_ref_id, user_type_ref_id, and role_ref_id
        strictly from verified JWT claims, PostgreSQL entities, and active domain context.
        """
        if not token_payload or not token_payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided",
            )

        sub_str = str(token_payload.get("sub"))
        token_roles = [str(r).strip().upper() for r in (token_payload.get("roles") or []) if r]
        tok_ut = token_payload.get("user_type_ref_id")
        try:
            tok_ut_int = int(tok_ut) if tok_ut is not None else None
        except (ValueError, TypeError):
            tok_ut_int = None

        is_admin = bool(
            portal_hint == "ADMIN"
            or tok_ut_int == 1
            or any(r in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "OPERATIONS", "COMPLIANCE", "FINANCE", "SETTLEMENT_MGR", "AUDIT_VIEWER", "REGIONAL_MANAGER", "OPERATIONS_ADMIN") for r in token_roles)
        )
        if tok_ut_int == 2 or "RETAILER" in token_roles:
            if portal_hint != "ADMIN":
                is_admin = False

        # Resolve company context strictly from request host + token + DB
        domain_comp_ref: Optional[int] = None
        is_super_portal = False
        if request is not None:
            host = extract_host(request)
            is_super_portal = "superadmin." in host or "super-admin." in host
            if host and host not in ("localhost", "127.0.0.1", "0.0.0.0", "backend", "near4you-retailer-backend", "testserver", "test"):
                try:
                    dom_ctx = await resolve_domain_context(request, db)
                    domain_comp_ref = dom_ctx.cmp_ref_id
                except HTTPException:
                    domain_comp_ref = resolve_request_company_ref(request)
            else:
                domain_comp_ref = resolve_request_company_ref(request)

        # Query DB user record (admin_user or retailer)
        admin_rec: Optional[AdminUserModel] = None
        retailer_rec: Optional[RetailerModel] = None
        db_comp_ref: Optional[int] = None
        role_codes: List[str] = list(dict.fromkeys(token_roles))
        role_ref_id: Optional[int] = None

        if is_admin:
            try:
                sub_uuid = uuid.UUID(sub_str)
                admin_rec = (
                    await db.execute(
                        select(AdminUserModel).where(
                            AdminUserModel.public_id == sub_uuid,
                            AdminUserModel.is_deleted == False,
                        )
                    )
                ).scalars().first()
            except Exception:
                admin_rec = None

            if not admin_rec and token_payload.get("email"):
                try:
                    admin_rec = (
                        await db.execute(
                            select(AdminUserModel).where(
                                AdminUserModel.email == str(token_payload["email"]),
                                AdminUserModel.is_deleted == False,
                            )
                        )
                    ).scalars().first()
                except Exception:
                    admin_rec = None

            if not admin_rec and isinstance(current_user, AdminUserModel) and getattr(current_user, "id", None):
                admin_rec = current_user

            if admin_rec:
                if getattr(admin_rec, "company_ref_id", None) is not None:
                    db_comp_ref = int(admin_rec.company_ref_id)
                if getattr(admin_rec, "user_type", None):
                    ut_code = str(admin_rec.user_type).strip().upper()
                    if ut_code not in role_codes:
                        role_codes.insert(0, ut_code)
        else:
            # Retailer lookup across public_id, retailer_ref_id, retailer_code, and mobile
            ret_conds = []
            try:
                sub_uuid = uuid.UUID(sub_str)
                ret_conds.append(RetailerModel.public_id == sub_uuid)
            except Exception:
                pass
            if token_payload.get("retailer_ref_id") is not None:
                try:
                    ret_conds.append(RetailerModel.retailer_ref_id == int(token_payload["retailer_ref_id"]))
                except (ValueError, TypeError):
                    pass
            ret_code_claim = token_payload.get("retailer_code") or (
                sub_str if not sub_str.startswith("{") and len(sub_str) < 40 and "-" in sub_str else None
            )
            if ret_code_claim:
                ret_conds.append(RetailerModel.retailer_code == str(ret_code_claim))

            if ret_conds:
                try:
                    rq = select(RetailerModel).where(or_(*ret_conds), RetailerModel.is_deleted == False)
                    if domain_comp_ref is not None:
                        # Prefer exact company match first if available
                        exact_rq = rq.where(RetailerModel.company_ref_id == domain_comp_ref)
                        retailer_rec = (await db.execute(exact_rq)).scalars().first()
                    if not retailer_rec:
                        retailer_rec = (await db.execute(rq)).scalars().first()
                except Exception:
                    retailer_rec = None

            if not retailer_rec and token_payload.get("mobile"):
                clean_mob = re.sub(r"\D", "", str(token_payload["mobile"]))[-10:]
                if clean_mob:
                    try:
                        q_sql = text(
                            """
                            SELECT r.id, r.retailer_ref_id, r.retailer_code, r.company_ref_id, r.owner_name, r.public_id
                            FROM public.retailer r
                            JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id
                            WHERE r.is_deleted = false
                              AND RIGHT(REGEXP_REPLACE(rc.mobile, '[^0-9]', '', 'g'), 10) = :mob
                              AND (:comp IS NULL OR r.company_ref_id = :comp)
                            LIMIT 1
                            """
                        )
                        rmap = (await db.execute(q_sql, {"mob": clean_mob, "comp": domain_comp_ref})).mappings().first()
                        if rmap:
                            retailer_rec = RetailerModel(
                                id=rmap["id"],
                                retailer_ref_id=rmap["retailer_ref_id"],
                                retailer_code=rmap["retailer_code"],
                                company_ref_id=rmap["company_ref_id"],
                                owner_name=rmap["owner_name"] or "",
                                store_name=rmap["owner_name"] or "",
                                legal_name=rmap["owner_name"] or "",
                                public_id=rmap["public_id"],
                                tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                            )
                    except Exception:
                        pass

            if retailer_rec and getattr(retailer_rec, "company_ref_id", None) is not None:
                db_comp_ref = int(retailer_rec.company_ref_id)

        tok_comp_ref = token_payload.get("company_ref_id")
        try:
            tok_comp_int = int(tok_comp_ref) if tok_comp_ref is not None else None
        except (ValueError, TypeError):
            tok_comp_int = None

        is_super_admin = bool(
            is_admin
            and (
                "SUPER_ADMIN" in role_codes
                or bool(token_payload.get("is_super_admin"))
                or (admin_rec and (getattr(admin_rec, "user_type", "") or "").upper() == "SUPER_ADMIN")
            )
            and (is_super_portal or (db_comp_ref is None and tok_comp_int is None))
        )

        effective_comp_ref = db_comp_ref if db_comp_ref is not None else (tok_comp_int if tok_comp_int is not None else domain_comp_ref)

        # Enforce strict multi-tenant company isolation
        if domain_comp_ref is not None and not is_super_admin and not is_super_portal:
            if effective_comp_ref is not None and int(effective_comp_ref) != int(domain_comp_ref):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Authenticated company does not match active domain company.",
                )
            effective_comp_ref = domain_comp_ref
        elif domain_comp_ref is not None and effective_comp_ref is None:
            effective_comp_ref = domain_comp_ref

        if effective_comp_ref is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company context could not be verified for this session.",
            )

        # Resolve user_type_ref_id dynamically from public.user_type
        user_type_code = "ADMIN" if is_admin else "RETAILER"
        if tok_ut_int == 3 or "DISTRIBUTOR" in role_codes or "DIST" in role_codes:
            user_type_code = "DISTRIBUTOR"
        elif tok_ut_int == 4 or "SUPER_DISTRIBUTOR" in role_codes or "SD" in role_codes:
            user_type_code = "SD"

        user_type_ref_id: Optional[int] = None
        try:
            ut_row = (
                await db.execute(
                    select(UserTypeModel.user_type_ref_id).where(
                        UserTypeModel.user_type_code == user_type_code,
                        UserTypeModel.is_deleted == False,
                    )
                )
            ).scalar_one_or_none()
            if ut_row is not None:
                user_type_ref_id = int(ut_row)
        except Exception:
            user_type_ref_id = None
        if user_type_ref_id is None:
            user_type_ref_id = tok_ut_int or (1 if is_admin else 2)

        # Resolve role_ref_id from public.user_role or public.role
        try:
            if admin_rec and getattr(admin_rec, "id", None):
                ur_row = (
                    await db.execute(
                        select(UserRoleModel.role_id)
                        .where(UserRoleModel.user_id == admin_rec.id, UserRoleModel.is_deleted == False)
                    )
                ).scalars().first()
                if ur_row is not None:
                    role_ref_id = int(ur_row)
            if role_ref_id is None:
                cand_codes = role_codes or ([user_type_code] if user_type_code != "ADMIN" else ["ADMIN", "PLATFORM_ADMIN", "SUPER_ADMIN"])
                r_row = (
                    await db.execute(
                        select(RoleModel.id)
                        .where(RoleModel.code.in_(cand_codes), RoleModel.is_deleted == False)
                        .order_by(RoleModel.id.asc())
                    )
                ).scalars().first()
                if r_row is not None:
                    role_ref_id = int(r_row)
        except Exception:
            role_ref_id = None

        # Resolve authoritative numeric user_ref_id and retailer_ref_id
        retailer_ref_id: Optional[int] = None
        retailer_code: Optional[str] = None
        if is_admin:
            if admin_rec:
                user_ref_id = int(getattr(admin_rec, "admin_user_ref_id", None) or admin_rec.id)
                actor_email = admin_rec.email or admin_rec.username or "admin"
            else:
                tok_uid = token_payload.get("user_ref_id") or token_payload.get("admin_user_ref_id")
                user_ref_id = int(tok_uid) if tok_uid and str(tok_uid).isdigit() else _stable_numeric_id(sub_str)
                actor_email = str(token_payload.get("email") or sub_str)
        else:
            if retailer_rec:
                retailer_ref_id = int(getattr(retailer_rec, "retailer_ref_id", None) or retailer_rec.id)
                retailer_code = retailer_rec.retailer_code
                user_ref_id = retailer_ref_id
                actor_email = str(token_payload.get("email") or retailer_rec.retailer_code or sub_str)
            else:
                tok_ret_ref = token_payload.get("retailer_ref_id") or token_payload.get("user_ref_id")
                if tok_ret_ref and str(tok_ret_ref).isdigit():
                    retailer_ref_id = int(tok_ret_ref)
                else:
                    retailer_ref_id = _stable_numeric_id(
                        str(token_payload.get("retailer_code") or token_payload.get("mobile") or sub_str)
                    )
                retailer_code = str(token_payload.get("retailer_code") or "") or None
                user_ref_id = retailer_ref_id
                actor_email = str(token_payload.get("email") or token_payload.get("mobile") or sub_str)

        return ResolvedFavoriteIdentity(
            company_ref_id=int(effective_comp_ref),
            user_ref_id=int(user_ref_id),
            retailer_ref_id=retailer_ref_id,
            user_type_ref_id=int(user_type_ref_id),
            role_ref_id=role_ref_id,
            role_codes=role_codes,
            is_admin=is_admin,
            is_super_admin=is_super_admin,
            actor_email=actor_email,
            retailer_code=retailer_code,
        )

    @classmethod
    async def _get_disabled_services(cls, db: AsyncSession, company_ref_id: int) -> Set[str]:
        """Returns service_codes disabled for the given company_ref_id."""
        disabled: Set[str] = set()
        try:
            stmt = select(CustomerServiceConfigurationModel).where(
                CustomerServiceConfigurationModel.is_deleted == False,
                or_(
                    CustomerServiceConfigurationModel.company_ref_id == company_ref_id,
                    CustomerServiceConfigurationModel.company_ref_id == None,
                ),
            )
            rows = (await db.execute(stmt)).scalars().all()
            by_svc: Dict[str, bool] = {}
            # Global fallback first, then company-specific overrides
            for r in rows:
                if r.company_ref_id is None and r.service_code not in by_svc:
                    by_svc[r.service_code] = bool(r.is_enabled)
            for r in rows:
                if r.company_ref_id == company_ref_id:
                    by_svc[r.service_code] = bool(r.is_enabled)
            for svc, enabled in by_svc.items():
                if not enabled:
                    disabled.add(svc)
        except Exception:
            pass
        return disabled

    @classmethod
    def _service_code_for_menu(cls, menu: MenuModel) -> Optional[str]:
        if menu.service_code:
            return menu.service_code
        if menu.parent_service_code:
            return menu.parent_service_code
        href = (menu.menu_href or "").strip().lower()
        for svc, paths in SERVICE_SUBMENU_PATHS.items():
            for p in paths:
                if href == p.lower() or (p != "/retailer/dashboard" and href.startswith(p.lower())):
                    return svc
        return None

    @classmethod
    async def get_permitted_menus(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
    ) -> List[MenuModel]:
        """Returns active menus that the authenticated user is authorized to access."""
        await cls.ensure_seeded(db)

        stmt = (
            select(MenuModel)
            .where(
                MenuModel.user_type_ref_id == identity.user_type_ref_id,
                MenuModel.is_active == True,
                MenuModel.is_deleted == False,
            )
            .order_by(MenuModel.display_order.asc(), MenuModel.menu_ref_id.asc())
        )
        menus = (await db.execute(stmt)).scalars().all()

        if identity.is_admin:
            upper_roles = {r.upper() for r in identity.role_codes}
            restricted_hit = upper_roles.intersection(set(ROLE_RESTRICTED_ADMIN_CODES.keys()))
            unrestricted = bool(
                not restricted_hit
                and (
                    identity.is_super_admin
                    or upper_roles.intersection({"SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN"})
                )
            )
            if not unrestricted and identity.role_ref_id is not None:
                rmp_rows = (
                    await db.execute(
                        select(RoleMenuPermissionModel).where(
                            RoleMenuPermissionModel.role_ref_id == identity.role_ref_id,
                            RoleMenuPermissionModel.is_active == True,
                            RoleMenuPermissionModel.is_deleted == False,
                            RoleMenuPermissionModel.can_view == True,
                            or_(
                                RoleMenuPermissionModel.company_ref_id == identity.company_ref_id,
                                RoleMenuPermissionModel.company_ref_id == None,
                            ),
                        )
                    )
                ).scalars().all()
                if rmp_rows:
                    allowed_ids = {r.menu_ref_id for r in rmp_rows}
                    menus = [m for m in menus if m.menu_ref_id in allowed_ids]
                else:
                    # Code-based fallback for restricted role codes
                    for rc in upper_roles:
                        if rc in ROLE_RESTRICTED_ADMIN_CODES:
                            allowed_codes = ROLE_RESTRICTED_ADMIN_CODES[rc]
                            menus = [m for m in menus if m.menu_code in allowed_codes]
                            break
            return menus

        # Non-admin (Retailer / Dist / SD): filter by company-enabled services
        disabled_services = await cls._get_disabled_services(db, identity.company_ref_id)
        if not disabled_services:
            return menus

        permitted: List[MenuModel] = []
        for m in menus:
            svc = cls._service_code_for_menu(m)
            if svc and svc in disabled_services:
                continue
            permitted.append(m)
        return permitted

    @classmethod
    def _serialize_menu_favorite(
        cls,
        fav: FavoriteMenuModel,
        menu: MenuModel,
        identity: ResolvedFavoriteIdentity,
    ) -> Dict[str, Any]:
        return {
            "favorite_ref_id": fav.favorite_ref_id,
            "public_id": str(fav.public_id),
            "company_ref_id": fav.company_ref_id,
            "retailer_ref_id": fav.retailer_ref_id,
            "user_ref_id": fav.user_ref_id,
            "user_type_ref_id": fav.user_type_ref_id,
            "role_ref_id": fav.role_ref_id,
            "menu_ref_id": menu.menu_ref_id,
            "menu_code": menu.menu_code,
            "menu_href": menu.menu_href,
            "menu_label": menu.menu_label,
            "menu_category": menu.menu_category,
            "icon_name": menu.icon_name,
            "badge_text": menu.badge_text,
            "service_code": menu.service_code or menu.parent_service_code,
            "is_financial": menu.is_financial,
            "display_order": fav.display_order,
            "is_active": fav.is_active,
            "created_at": fav.created_at.isoformat() if fav.created_at else None,
            "updated_at": fav.updated_at.isoformat() if fav.updated_at else None,
        }

    @classmethod
    async def list_favorites(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
    ) -> List[Dict[str, Any]]:
        permitted = await cls.get_permitted_menus(db, identity)
        permitted_by_id = {m.menu_ref_id: m for m in permitted}
        if not permitted_by_id:
            return []

        stmt = (
            select(FavoriteMenuModel)
            .where(
                FavoriteMenuModel.company_ref_id == identity.company_ref_id,
                FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
                FavoriteMenuModel.user_ref_id == identity.user_ref_id,
                FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
                FavoriteMenuModel.is_active == True,
                FavoriteMenuModel.is_deleted == False,
            )
            .order_by(FavoriteMenuModel.display_order.asc(), FavoriteMenuModel.favorite_ref_id.asc())
        )
        rows = (await db.execute(stmt)).scalars().all()
        return [
            cls._serialize_menu_favorite(fav, permitted_by_id[fav.menu_ref_id], identity)
            for fav in rows
            if fav.menu_ref_id in permitted_by_id
        ]

    @classmethod
    async def _resolve_target_menu(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_id: Optional[int] = None,
        menu_href: Optional[str] = None,
        menu_label: Optional[str] = None,
        require_permitted: bool = True,
    ) -> MenuModel:
        await cls.ensure_seeded(db)
        permitted = await cls.get_permitted_menus(db, identity)
        permitted_ids = {m.menu_ref_id for m in permitted}

        all_user_type_menus = (
            await db.execute(
                select(MenuModel).where(
                    MenuModel.user_type_ref_id == identity.user_type_ref_id,
                    MenuModel.is_active == True,
                    MenuModel.is_deleted == False,
                )
            )
        ).scalars().all()

        target: Optional[MenuModel] = None
        if menu_ref_id is not None:
            for m in all_user_type_menus:
                if int(m.menu_ref_id) == int(menu_ref_id):
                    target = m
                    break
            if not target:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Menu reference ID {menu_ref_id} is not authorized for this portal.",
                )
        elif menu_href:
            clean_href = str(menu_href).strip()
            clean_lbl = (menu_label or "").strip().lower()
            matches = [m for m in all_user_type_menus if m.menu_href.strip().lower() == clean_href.lower()]
            if matches and clean_lbl:
                exact_lbl = [m for m in matches if m.menu_label.strip().lower() == clean_lbl]
                target = exact_lbl[0] if exact_lbl else matches[0]
            elif matches:
                target = matches[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown menu route '{clean_href}' for this portal.",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either menu_ref_id or menu_href is required.",
            )

        if require_permitted and target.menu_ref_id not in permitted_ids:
            svc = cls._service_code_for_menu(target)
            if svc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot favourite '{target.menu_label}' because service '{svc}' is currently disabled for your company.",
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You do not have permission to favorite '{target.menu_label}'.",
            )

        return target

    @classmethod
    async def add_favorite(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_id: Optional[int] = None,
        menu_href: Optional[str] = None,
        menu_label: Optional[str] = None,
        display_order: Optional[int] = None,
    ) -> Dict[str, Any]:
        menu = await cls._resolve_target_menu(
            db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href, menu_label=menu_label, require_permitted=True
        )

        stmt = select(FavoriteMenuModel).where(
            FavoriteMenuModel.company_ref_id == identity.company_ref_id,
            FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
            FavoriteMenuModel.user_ref_id == identity.user_ref_id,
            FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
            FavoriteMenuModel.menu_ref_id == menu.menu_ref_id,
        )
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            existing.is_active = True
            existing.is_deleted = False
            existing.role_ref_id = identity.role_ref_id
            if display_order is not None:
                existing.display_order = int(display_order)
            existing.updated_by = identity.actor_email
        else:
            db.add(
                FavoriteMenuModel(
                    public_id=uuid.uuid4(),
                    company_ref_id=identity.company_ref_id,
                    retailer_ref_id=identity.retailer_ref_id,
                    user_ref_id=identity.user_ref_id,
                    user_type_ref_id=identity.user_type_ref_id,
                    role_ref_id=identity.role_ref_id,
                    menu_ref_id=menu.menu_ref_id,
                    display_order=int(display_order or 0),
                    is_active=True,
                    is_deleted=False,
                    created_by=identity.actor_email,
                    updated_by=identity.actor_email,
                )
            )
        await db.commit()
        favorites = await cls.list_favorites(db, identity)
        return {
            "status": "SUCCESS",
            "success": True,
            "action": "ADDED",
            "message": f"Favorite menu '{menu.menu_label}' saved successfully",
            "menu_ref_id": menu.menu_ref_id,
            "menu_href": menu.menu_href,
            "company_ref_id": identity.company_ref_id,
            "retailer_ref_id": identity.retailer_ref_id,
            "user_ref_id": identity.user_ref_id,
            "user_type_ref_id": identity.user_type_ref_id,
            "role_ref_id": identity.role_ref_id,
            "favorites": favorites,
            "data": favorites,
        }

    @classmethod
    async def remove_favorite(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_id: Optional[int] = None,
        menu_href: Optional[str] = None,
        menu_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        menu = await cls._resolve_target_menu(
            db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href, menu_label=menu_label, require_permitted=False
        )
        stmt = select(FavoriteMenuModel).where(
            FavoriteMenuModel.company_ref_id == identity.company_ref_id,
            FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
            FavoriteMenuModel.user_ref_id == identity.user_ref_id,
            FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
            FavoriteMenuModel.menu_ref_id == menu.menu_ref_id,
        )
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            existing.is_active = False
            existing.is_deleted = True
            existing.updated_by = identity.actor_email
            await db.commit()

        favorites = await cls.list_favorites(db, identity)
        return {
            "status": "SUCCESS",
            "success": True,
            "action": "REMOVED",
            "message": f"Favorite menu '{menu.menu_label}' removed successfully",
            "menu_ref_id": menu.menu_ref_id,
            "menu_href": menu.menu_href,
            "company_ref_id": identity.company_ref_id,
            "retailer_ref_id": identity.retailer_ref_id,
            "user_ref_id": identity.user_ref_id,
            "favorites": favorites,
            "data": favorites,
        }

    @classmethod
    async def toggle_favorite(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_id: Optional[int] = None,
        menu_href: Optional[str] = None,
        menu_label: Optional[str] = None,
    ) -> Dict[str, Any]:
        target = await cls._resolve_target_menu(
            db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href, menu_label=menu_label, require_permitted=False
        )
        stmt = select(FavoriteMenuModel).where(
            FavoriteMenuModel.company_ref_id == identity.company_ref_id,
            FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
            FavoriteMenuModel.user_ref_id == identity.user_ref_id,
            FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
            FavoriteMenuModel.menu_ref_id == target.menu_ref_id,
        )
        existing = (await db.execute(stmt)).scalars().first()
        if existing and existing.is_active and not existing.is_deleted:
            return await cls.remove_favorite(db, identity, menu_ref_id=target.menu_ref_id)
        return await cls.add_favorite(db, identity, menu_ref_id=target.menu_ref_id)

    @classmethod
    async def check_favorite(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_id: Optional[int] = None,
        menu_href: Optional[str] = None,
    ) -> Dict[str, Any]:
        menu = await cls._resolve_target_menu(
            db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href, require_permitted=False
        )
        permitted = {m.menu_ref_id for m in await cls.get_permitted_menus(db, identity)}
        stmt = select(FavoriteMenuModel).where(
            FavoriteMenuModel.company_ref_id == identity.company_ref_id,
            FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
            FavoriteMenuModel.user_ref_id == identity.user_ref_id,
            FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
            FavoriteMenuModel.menu_ref_id == menu.menu_ref_id,
            FavoriteMenuModel.is_active == True,
            FavoriteMenuModel.is_deleted == False,
        )
        existing = (await db.execute(stmt)).scalars().first()
        is_fav = bool(existing and menu.menu_ref_id in permitted)
        return {
            "status": "SUCCESS",
            "success": True,
            "is_favorite": is_fav,
            "is_permitted": menu.menu_ref_id in permitted,
            "menu_ref_id": menu.menu_ref_id,
            "menu_href": menu.menu_href,
            "company_ref_id": identity.company_ref_id,
            "retailer_ref_id": identity.retailer_ref_id,
            "user_ref_id": identity.user_ref_id,
        }

    @classmethod
    async def reorder_favorites(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
        menu_ref_ids: Optional[List[int]] = None,
        menu_hrefs: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        stmt = select(FavoriteMenuModel).where(
            FavoriteMenuModel.company_ref_id == identity.company_ref_id,
            FavoriteMenuModel.user_type_ref_id == identity.user_type_ref_id,
            FavoriteMenuModel.user_ref_id == identity.user_ref_id,
            FavoriteMenuModel.retailer_ref_id == identity.retailer_ref_id,
            FavoriteMenuModel.is_active == True,
            FavoriteMenuModel.is_deleted == False,
        )
        favs = (await db.execute(stmt)).scalars().all()
        if menu_ref_ids:
            order_map = {int(mid): idx for idx, mid in enumerate(menu_ref_ids)}
            for fav in favs:
                if fav.menu_ref_id in order_map:
                    fav.display_order = order_map[fav.menu_ref_id]
                    fav.updated_by = identity.actor_email
        elif menu_hrefs:
            menus = (await db.execute(select(MenuModel))).scalars().all()
            href_to_id = {m.menu_href: m.menu_ref_id for m in menus}
            id_order = {href_to_id[h]: idx for idx, h in enumerate(menu_hrefs) if h in href_to_id}
            for fav in favs:
                if fav.menu_ref_id in id_order:
                    fav.display_order = id_order[fav.menu_ref_id]
                    fav.updated_by = identity.actor_email
        await db.commit()
        favorites = await cls.list_favorites(db, identity)
        return {
            "status": "SUCCESS",
            "success": True,
            "message": "Favorite menus reordered successfully",
            "favorites": favorites,
            "data": favorites,
        }

    @classmethod
    async def get_authorized_menus_payload(
        cls,
        db: AsyncSession,
        identity: ResolvedFavoriteIdentity,
    ) -> Dict[str, Any]:
        menus = await cls.get_permitted_menus(db, identity)
        favs = await cls.list_favorites(db, identity)
        fav_ids = {f["menu_ref_id"] for f in favs}
        items = [
            {
                "menu_ref_id": m.menu_ref_id,
                "menu_code": m.menu_code,
                "menu_label": m.menu_label,
                "menu_href": m.menu_href,
                "menu_category": m.menu_category,
                "icon_name": m.icon_name,
                "badge_text": m.badge_text,
                "service_code": m.service_code,
                "parent_service_code": m.parent_service_code,
                "is_financial": m.is_financial,
                "display_order": m.display_order,
                "is_favorite": m.menu_ref_id in fav_ids,
            }
            for m in menus
        ]
        return {
            "status": "SUCCESS",
            "success": True,
            "company_ref_id": identity.company_ref_id,
            "retailer_ref_id": identity.retailer_ref_id,
            "user_ref_id": identity.user_ref_id,
            "user_type_ref_id": identity.user_type_ref_id,
            "role_ref_id": identity.role_ref_id,
            "menus": items,
            "favorites": favs,
        }
