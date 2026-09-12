CREATE OR REPLACE FUNCTION public.sp_get_user_menu_access(p_user_type text, p_role_codes text[] DEFAULT ARRAY[]::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_u_type TEXT := UPPER(COALESCE(p_user_type, 'ADMIN'));
    v_is_admin BOOLEAN := false;
    v_is_rm BOOLEAN := false;
    v_is_crm BOOLEAN := false;
    v_is_audit BOOLEAN := false;
    v_is_operations BOOLEAN := false;
    v_is_finance BOOLEAN := false;
    v_categories JSONB;
BEGIN
    -- Check role conditions
    IF v_u_type IN ('ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN') 
       OR 'PLATFORM_ADMIN' = ANY(p_role_codes) 
       OR 'SUPER_ADMIN' = ANY(p_role_codes)
       OR 'ADMIN' = ANY(p_role_codes)
       OR 'COMPANY_ADMIN' = ANY(p_role_codes) THEN
        v_is_admin := true;
    ELSIF v_u_type IN ('RM', 'REGIONAL_MANAGER') OR 'REGIONAL_MANAGER' = ANY(p_role_codes) OR 'RM' = ANY(p_role_codes) THEN
        v_is_rm := true;
    ELSIF v_u_type IN ('CRM', 'CRM_EXECUTIVE', 'CRM_MANAGER') OR 'CRM_EXECUTIVE' = ANY(p_role_codes) OR 'CRM_MANAGER' = ANY(p_role_codes) THEN
        v_is_crm := true;
    ELSIF v_u_type IN ('AUDIT', 'AUDITOR') OR 'AUDITOR' = ANY(p_role_codes) OR 'AUDIT' = ANY(p_role_codes) THEN
        v_is_audit := true;
    ELSIF v_u_type IN ('OPERATIONS', 'OPERATIONS_ADMIN') OR 'OPERATIONS_ADMIN' = ANY(p_role_codes) OR 'OPERATIONS' = ANY(p_role_codes) THEN
        v_is_operations := true;
    ELSIF v_u_type IN ('FINANCE', 'FINANCE_ADMIN') OR 'FINANCE_ADMIN' = ANY(p_role_codes) OR 'FINANCE' = ANY(p_role_codes) THEN
        v_is_finance := true;
    ELSE
        -- Default permissive for other internal users
        v_is_admin := true;
    END IF;

    IF v_is_admin THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'User Management', 'items', jsonb_build_array(
                jsonb_build_object('label', 'User Management', 'href', '/users', 'icon', 'Users', 'badge', 'Admin'),
                jsonb_build_object('label', 'User Creation', 'href', '/users/create', 'icon', 'UserPlus', 'badge', 'New'),
                jsonb_build_object('label', 'Role & Permissions', 'href', '/roles', 'icon', 'ShieldCheck')
            )),
            jsonb_build_object('category', 'Retailers', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Retailer Management', 'href', '/retailers', 'icon', 'Store'),
                jsonb_build_object('label', 'Verification', 'href', '/admin/retailer-verification', 'icon', 'ShieldCheck', 'badge', 'Live'),
                jsonb_build_object('label', 'Approval', 'href', '/approvals', 'icon', 'CheckSquare'),
                jsonb_build_object('label', 'KYC', 'href', '/retailers', 'icon', 'Users')
            )),
            jsonb_build_object('category', 'Transactions', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Status Update', 'href', '/operations/transaction-status-update', 'icon', 'RefreshCw', 'badge', 'Pending'),
                jsonb_build_object('label', 'All Transactions', 'href', '/admin/reports/transactions', 'icon', 'Receipt', 'badge', 'Master'),
                jsonb_build_object('label', 'Payout', 'href', '/admin/reports/payout-transactions', 'icon', 'ArrowLeftRight'),
                jsonb_build_object('label', 'DMT', 'href', '/retailer/dmt/reports', 'icon', 'Send'),
                jsonb_build_object('label', 'AEPS', 'href', '/admin/reports/transactions?service=AEPS', 'icon', 'Fingerprint'),
                jsonb_build_object('label', 'Recharge', 'href', '/admin/reports/transactions?service=RECHARGE', 'icon', 'Zap'),
                jsonb_build_object('label', 'BBPS', 'href', '/admin/reports/transactions?service=BBPS', 'icon', 'Receipt'),
                jsonb_build_object('label', 'UPI', 'href', '/admin/reports/transactions?service=UPI', 'icon', 'CreditCard'),
                jsonb_build_object('label', 'POS', 'href', '/settlements/transactions', 'icon', 'CreditCard'),
                jsonb_build_object('label', 'QR Pay', 'href', '/admin/reports/transactions?service=QR_PAY', 'icon', 'QrCode')
            )),
            jsonb_build_object('category', 'Wallet', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Wallet Overview', 'href', '/wallet-ledger/wallets', 'icon', 'Wallet'),
                jsonb_build_object('label', 'Top-Up Requests', 'href', '/operations/topup-requests', 'icon', 'ArrowLeftRight', 'badge', 'Live'),
                jsonb_build_object('label', 'Wallet Transactions', 'href', '/wallet-ledger/transactions', 'icon', 'TrendingUp'),
                jsonb_build_object('label', 'Settlements', 'href', '/settlements/transactions', 'icon', 'Scale')
            )),
            jsonb_build_object('category', 'Services', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Service Status', 'href', '/ops-dashboard', 'icon', 'Activity', 'badge', 'Live'),
                jsonb_build_object('label', 'Service Configuration', 'href', '/configuration/services', 'icon', 'Sliders'),
                jsonb_build_object('label', 'Vendor Status', 'href', '/payouts/gateways', 'icon', 'ArrowLeftRight')
            )),
            jsonb_build_object('category', 'Reports', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Daily Statements', 'href', '/admin/statements', 'icon', 'FileText', 'badge', '3:00 AM'),
                jsonb_build_object('label', 'Transaction Reports', 'href', '/admin/reports/transactions', 'icon', 'FileText'),
                jsonb_build_object('label', 'Wallet Reports', 'href', '/admin/reports/transaction-ledger', 'icon', 'ScrollText'),
                jsonb_build_object('label', 'Commission Reports', 'href', '/retailer/reports', 'icon', 'FileText'),
                jsonb_build_object('label', 'Settlement Reports', 'href', '/settlement-processing/batches', 'icon', 'FileText')
            )),
            jsonb_build_object('category', 'Configuration', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Charges', 'href', '/financial-config/approvals', 'icon', 'Scale'),
                jsonb_build_object('label', 'MDR', 'href', '/configuration/payout-slabs', 'icon', 'Layers'),
                jsonb_build_object('label', 'GST', 'href', '/financial-config/rules', 'icon', 'BookOpen'),
                jsonb_build_object('label', 'Service Enable/Disable', 'href', '/configuration/services', 'icon', 'Sliders'),
                jsonb_build_object('label', 'Notifications', 'href', '/notifications', 'icon', 'Bell')
            )),
            jsonb_build_object('category', 'System', 'items', jsonb_build_array(
                jsonb_build_object('label', 'API Health', 'href', '/ops-dashboard', 'icon', 'Activity'),
                jsonb_build_object('label', 'Audit Logs', 'href', '/compliance/audit-explorer', 'icon', 'ScrollText'),
                jsonb_build_object('label', 'System Logs', 'href', '/operations/api-logs', 'icon', 'Terminal', 'badge', 'Live')
            ))
        );
    ELSIF v_is_rm THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'Retailers', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Retailer Management', 'href', '/retailers', 'icon', 'Store'),
                jsonb_build_object('label', 'Verification', 'href', '/admin/retailer-verification', 'icon', 'ShieldCheck', 'badge', 'Live'),
                jsonb_build_object('label', 'Approval', 'href', '/approvals', 'icon', 'CheckSquare')
            )),
            jsonb_build_object('category', 'Transactions', 'items', jsonb_build_array(
                jsonb_build_object('label', 'All Transactions', 'href', '/admin/reports/transactions', 'icon', 'Receipt', 'badge', 'Master'),
                jsonb_build_object('label', 'Payout', 'href', '/admin/reports/payout-transactions', 'icon', 'ArrowLeftRight')
            )),
            jsonb_build_object('category', 'Reports', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Transaction Reports', 'href', '/admin/reports/transactions', 'icon', 'FileText'),
                jsonb_build_object('label', 'Commission Reports', 'href', '/retailer/reports', 'icon', 'FileText')
            ))
        );
    ELSIF v_is_crm THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'Retailers', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Retailer Management', 'href', '/retailers', 'icon', 'Store'),
                jsonb_build_object('label', 'Verification', 'href', '/admin/retailer-verification', 'icon', 'ShieldCheck')
            )),
            jsonb_build_object('category', 'Transactions', 'items', jsonb_build_array(
                jsonb_build_object('label', 'All Transactions', 'href', '/admin/reports/transactions', 'icon', 'Receipt', 'badge', 'Master')
            )),
            jsonb_build_object('category', 'Wallet', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Wallet Overview', 'href', '/wallet-ledger/wallets', 'icon', 'Wallet'),
                jsonb_build_object('label', 'Top-Up Requests', 'href', '/operations/topup-requests', 'icon', 'ArrowLeftRight')
            )),
            jsonb_build_object('category', 'Configuration', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Notifications', 'href', '/notifications', 'icon', 'Bell')
            )),
            jsonb_build_object('category', 'Reports', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Transaction Reports', 'href', '/admin/reports/transactions', 'icon', 'FileText')
            ))
        );
    ELSIF v_is_audit THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'Reports', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Transaction Reports', 'href', '/admin/reports/transactions', 'icon', 'FileText'),
                jsonb_build_object('label', 'Wallet Reports', 'href', '/admin/reports/transaction-ledger', 'icon', 'ScrollText'),
                jsonb_build_object('label', 'Settlement Reports', 'href', '/settlement-processing/batches', 'icon', 'FileText')
            )),
            jsonb_build_object('category', 'System', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Audit Logs', 'href', '/compliance/audit-explorer', 'icon', 'ScrollText'),
                jsonb_build_object('label', 'System Logs', 'href', '/operations/api-logs', 'icon', 'Terminal', 'badge', 'Live')
            ))
        );
    ELSIF v_is_operations THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'User Management', 'items', jsonb_build_array(
                jsonb_build_object('label', 'User Management', 'href', '/users', 'icon', 'Users', 'badge', 'Admin'),
                jsonb_build_object('label', 'User Creation', 'href', '/users/create', 'icon', 'UserPlus', 'badge', 'New')
            )),
            jsonb_build_object('category', 'Services', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Service Status', 'href', '/ops-dashboard', 'icon', 'Activity', 'badge', 'Live'),
                jsonb_build_object('label', 'Vendor Status', 'href', '/payouts/gateways', 'icon', 'ArrowLeftRight')
            )),
            jsonb_build_object('category', 'Wallet', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Top-Up Requests', 'href', '/operations/topup-requests', 'icon', 'ArrowLeftRight', 'badge', 'Live')
            )),
            jsonb_build_object('category', 'Transactions', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Status Update', 'href', '/operations/transaction-status-update', 'icon', 'RefreshCw', 'badge', 'Pending'),
                jsonb_build_object('label', 'All Transactions', 'href', '/admin/reports/transactions', 'icon', 'Receipt', 'badge', 'Master')
            )),
            jsonb_build_object('category', 'System', 'items', jsonb_build_array(
                jsonb_build_object('label', 'API Health', 'href', '/ops-dashboard', 'icon', 'Activity'),
                jsonb_build_object('label', 'System Logs', 'href', '/operations/api-logs', 'icon', 'Terminal', 'badge', 'Live')
            ))
        );
    ELSIF v_is_finance THEN
        v_categories := jsonb_build_array(
            jsonb_build_object('category', 'Dashboard', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Dashboard', 'href', '/dashboard', 'icon', 'LayoutDashboard')
            )),
            jsonb_build_object('category', 'Wallet', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Wallet Overview', 'href', '/wallet-ledger/wallets', 'icon', 'Wallet'),
                jsonb_build_object('label', 'Top-Up Requests', 'href', '/operations/topup-requests', 'icon', 'ArrowLeftRight', 'badge', 'Live'),
                jsonb_build_object('label', 'Wallet Transactions', 'href', '/wallet-ledger/transactions', 'icon', 'TrendingUp'),
                jsonb_build_object('label', 'Settlements', 'href', '/settlements/transactions', 'icon', 'Scale')
            )),
            jsonb_build_object('category', 'Configuration', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Charges', 'href', '/financial-config/approvals', 'icon', 'Scale'),
                jsonb_build_object('label', 'MDR', 'href', '/configuration/payout-slabs', 'icon', 'Layers'),
                jsonb_build_object('label', 'GST', 'href', '/financial-config/rules', 'icon', 'BookOpen')
            )),
            jsonb_build_object('category', 'Reports', 'items', jsonb_build_array(
                jsonb_build_object('label', 'Daily Statements', 'href', '/admin/statements', 'icon', 'FileText', 'badge', '3:00 AM'),
                jsonb_build_object('label', 'Transaction Reports', 'href', '/admin/reports/transactions', 'icon', 'FileText'),
                jsonb_build_object('label', 'Wallet Reports', 'href', '/admin/reports/transaction-ledger', 'icon', 'ScrollText')
            ))
        );
    END IF;

    RETURN jsonb_build_object(
        'user_type', v_u_type,
        'categories', v_categories
    );
END;
$function$;
