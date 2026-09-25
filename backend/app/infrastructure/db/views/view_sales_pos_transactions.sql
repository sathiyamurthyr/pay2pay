-- ==============================================================================
-- VIEW: view_sales_pos_transactions
-- Purpose: Unified POS & card transaction view linking swipe machines, 
--          retailers, distributors, and super distributors with MDR breakdown.
-- Strictly tenant scoped.
-- ==============================================================================

CREATE OR REPLACE VIEW view_sales_pos_transactions AS
SELECT
    t.public_id AS transaction_id,
    t.txn_id,
    t.ref_id,
    t.tenant_id,
    t.company_id,
    t.created_at AS transaction_time,
    t.service_name,
    t.status AS transaction_status,
    t.amount AS transaction_amount,
    
    -- Retailer Details
    t.retailer_id,
    r.retailer_code,
    r.store_name AS retailer_name,
    r.owner_name AS retailer_owner,
    
    -- Distributor Details
    t.dist_id AS distributor_id,
    d.distributor_code,
    d.business_name AS distributor_name,
    
    -- Super Distributor Details
    t.sd_id AS super_distributor_id,
    sd.super_distributor_code,
    sd.business_name AS super_distributor_name,
    
    -- Swipe Machine Details
    sm.public_id AS machine_id,
    sm.serial_number AS pos_serial_number,
    sm.tid AS pos_terminal_id,
    sm.mid AS pos_merchant_id,
    sm.pos_model,
    
    -- Settlement & MDR Breakdown
    COALESCE(sms.card_type, 'Credit Card') AS card_type,
    COALESCE(sms.card_network, 'Visa') AS card_network,
    COALESCE(sms.mdr_charge, 0.0) AS mdr_charge,
    COALESCE(sms.gst_amount, 0.0) AS gst_amount,
    COALESCE(sm.vendor_commission_value, 0.0) AS commission_rate,
    COALESCE(sms.net_settlement_amount, t.amount) AS net_amount

FROM transactions t
LEFT JOIN retailer r ON t.retailer_id = r.public_id
LEFT JOIN distributor d ON (t.dist_id = d.public_id OR r.mapped_distributor_id = d.public_id)
LEFT JOIN super_distributor sd ON (t.sd_id = sd.public_id OR r.mapped_super_distributor_id = sd.public_id OR d.mapped_super_distributor_id = sd.public_id)
LEFT JOIN swipe_machine sm ON r.public_id = sm.mapped_retailer_id AND sm.is_deleted = false
LEFT JOIN swipe_machine_settlement sms ON t.txn_id = sms.transaction_number
WHERE t.is_deleted = false;
