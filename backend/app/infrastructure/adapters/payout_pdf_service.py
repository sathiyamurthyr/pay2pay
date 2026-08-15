import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count: int):
        self.saveState()
        
        # Header (Top of page: y=568 pt)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E3A8A"))
        self.drawString(36, 568, "Pay2Pay FinTech Retailer Platform")
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(805, 568, "Official Retailer Outbound Payout Report")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 560, 805, 560)

        # Footer (Bottom of page: y=30 pt)
        self.line(36, 42, 805, 42)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "Confidential — For Authorized Use Only")
        gen_time = datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M UTC")
        self.drawRightString(805, 26, f"Generated: {gen_time}  |  Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_payout_pdf(
    items: List[Dict[str, Any]],
    summary: Dict[str, Any],
    retailer_info: Dict[str, Any],
    filter_info: Dict[str, Any]
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A")
    )
    
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2563EB")
    )

    label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748B")
    )

    value_style = ParagraphStyle(
        "MetaValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )

    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E293B")
    )

    cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )

    cell_mono = ParagraphStyle(
        "TableCellMono",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # 1. Report Header Section
    story.append(Paragraph("Pay2Pay FinTech Retailer Platform", subtitle_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("RETAILER PAYOUT REPORT", title_style))
    story.append(Spacer(1, 10))

    # 2. Metadata Grid (2-column key-value)
    ret_name = retailer_info.get("name") or retailer_info.get("retailer_name") or "Pay2Pay Verified Merchant"
    ret_code = retailer_info.get("code") or retailer_info.get("retailer_code") or "RET-0CFE2B"
    gen_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M:%S UTC")
    from_d = filter_info.get("from_date") or "All Time"
    to_d = filter_info.get("to_date") or "Today"
    period_str = f"{from_d} to {to_d}"
    st_filter = filter_info.get("status") or "ALL STATUSES"
    mode_filter = filter_info.get("payment_mode") or "ALL MODES"

    meta_data = [
        [
            Paragraph("Retailer Name:", label_style),
            Paragraph(ret_name, value_style),
            Paragraph("Report Period:", label_style),
            Paragraph(period_str, value_style),
        ],
        [
            Paragraph("Retailer ID:", label_style),
            Paragraph(ret_code, value_style),
            Paragraph("Report Generated:", label_style),
            Paragraph(gen_at, value_style),
        ],
        [
            Paragraph("Status Filter:", label_style),
            Paragraph(st_filter, value_style),
            Paragraph("Mode Filter:", label_style),
            Paragraph(mode_filter, value_style),
        ]
    ]

    meta_table = Table(meta_data, colWidths=[90, 290, 90, 299])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#F1F5F9")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 3. KPI Summary Section (4 Cards)
    tot_amt = summary.get("todays_transfer_amount") or summary.get("total_amount") or 0.0
    tot_txns = summary.get("todays_transactions") or summary.get("total_transactions") or 0
    
    succ_amt = summary.get("successful_amount", tot_amt)
    succ_txns = summary.get("successful_transactions", 0)
    
    pend_amt = summary.get("pending_amount", 0.0)
    pend_txns = summary.get("pending_transactions", 0)
    
    fail_amt = summary.get("failed_amount", 0.0)
    fail_txns = summary.get("failed_transactions", 0) + summary.get("reversed_transactions", 0)

    summary_data = [
        [
            Paragraph("TOTAL PAYOUTS", ParagraphStyle("S1", parent=label_style, textColor=colors.HexColor("#475569"))),
            Paragraph("SUCCESSFUL", ParagraphStyle("S2", parent=label_style, textColor=colors.HexColor("#16A34A"))),
            Paragraph("PENDING", ParagraphStyle("S3", parent=label_style, textColor=colors.HexColor("#D97706"))),
            Paragraph("FAILED / REVERSED", ParagraphStyle("S4", parent=label_style, textColor=colors.HexColor("#DC2626"))),
        ],
        [
            Paragraph(f"₹{tot_amt:,.2f}", ParagraphStyle("V1", parent=value_style, fontSize=12, textColor=colors.HexColor("#0F172A"))),
            Paragraph(f"₹{succ_amt:,.2f}", ParagraphStyle("V2", parent=value_style, fontSize=12, textColor=colors.HexColor("#16A34A"))),
            Paragraph(f"₹{pend_amt:,.2f}", ParagraphStyle("V3", parent=value_style, fontSize=12, textColor=colors.HexColor("#D97706"))),
            Paragraph(f"₹{fail_amt:,.2f}", ParagraphStyle("V4", parent=value_style, fontSize=12, textColor=colors.HexColor("#DC2626"))),
        ],
        [
            Paragraph(f"{tot_txns} txns", ParagraphStyle("Sub1", parent=cell_style, textColor=colors.HexColor("#64748B"))),
            Paragraph(f"{succ_txns} success", ParagraphStyle("Sub2", parent=cell_style, textColor=colors.HexColor("#16A34A"))),
            Paragraph(f"{pend_txns} proc.", ParagraphStyle("Sub3", parent=cell_style, textColor=colors.HexColor("#D97706"))),
            Paragraph(f"{fail_txns} txns", ParagraphStyle("Sub4", parent=cell_style, textColor=colors.HexColor("#DC2626"))),
        ]
    ]

    summary_table = Table(summary_data, colWidths=[192, 192, 192, 193])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('LINEABOVE', (0, 0), (0, 0), 2, colors.HexColor("#2563EB")),
        ('LINEABOVE', (1, 0), (1, 0), 2, colors.HexColor("#16A34A")),
        ('LINEABOVE', (2, 0), (2, 0), 2, colors.HexColor("#D97706")),
        ('LINEABOVE', (3, 0), (3, 0), 2, colors.HexColor("#DC2626")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 4. Payout Transaction Data Table (Exact 14 Columns)
    table_headers = [
        Paragraph("S.No", label_style),
        Paragraph("Txn ID", label_style),
        Paragraph("Customer", label_style),
        Paragraph("Beneficiary", label_style),
        Paragraph("Account", label_style),
        Paragraph("Amount", label_style),
        Paragraph("Mode", label_style),
        Paragraph("UTR", label_style),
        Paragraph("Tax", label_style),
        Paragraph("Date & Time", label_style),
        Paragraph("Fee", label_style),
        Paragraph("Wallet Type", label_style),
        Paragraph("Debit", label_style),
        Paragraph("Commission", label_style),
    ]

    table_rows = [table_headers]

    if items:
        for idx, item in enumerate(items, 1):
            amt_val = float(item.get("transfer_amount") or item.get("amount") or 0.0)
            fee_val = float(item.get("convenience_fee") or item.get("charges") or 0.0)
            tax_val = float(item.get("tax_amount") or ((item.get("gst_amount") or 0.0) + (item.get("tds_amount") or 0.0)))
            debit_val = float(item.get("wallet_debit") or item.get("net_debit") or (amt_val + fee_val + tax_val))
            comm_val = float(item.get("retailer_commission") or item.get("commission") or 0.0)

            row = [
                Paragraph(str(idx), cell_style),
                Paragraph(str(item.get("transaction_number") or item.get("transaction_id") or "-"), cell_mono),
                Paragraph(str(item.get("customer_name") or "N/A"), cell_style),
                Paragraph(str(item.get("beneficiary_name") or "N/A"), cell_style),
                Paragraph(str(item.get("masked_account_number") or "XXXXXXXX1234"), cell_mono),
                Paragraph(f"₹{amt_val:,.2f}", cell_bold),
                Paragraph(str(item.get("payment_mode") or "IMPS"), cell_style),
                Paragraph(str(item.get("utr_number") or "-"), cell_mono),
                Paragraph(f"₹{tax_val:,.2f}", cell_style),
                Paragraph(str(item.get("initiated_at") or "-"), cell_style),
                Paragraph(f"₹{fee_val:,.2f}", cell_style),
                Paragraph(str(item.get("wallet_type") or "MAIN_WALLET"), cell_style),
                Paragraph(f"₹{debit_val:,.2f}", cell_bold),
                Paragraph(f"₹{comm_val:,.2f}", cell_style),
            ]
            table_rows.append(row)
    else:
        empty_row = [
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("No payout transactions found.", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("₹0.00", cell_bold),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph("₹0.00", cell_style),
            Paragraph("-", cell_style),
            Paragraph("₹0.00", cell_style),
            Paragraph("-", cell_style),
            Paragraph("₹0.00", cell_bold),
            Paragraph("₹0.00", cell_style),
        ]
        table_rows.append(empty_row)

    # Column Widths total = 769 pt
    col_widths = [24, 70, 60, 60, 60, 52, 38, 56, 44, 62, 44, 55, 52, 52]

    payout_table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    payout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor("#CBD5E1")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))

    story.append(payout_table)

    # Build PDF Document
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()


class SingleReceiptNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count: int):
        self.saveState()
        
        # Header (Top of A4 Portrait: y=802 pt)
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E3A8A"))
        self.drawString(36, 802, "Pay2Pay FinTech Retailer Platform")
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(559, 802, "Official Transaction Receipt")
        
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 794, 559, 794)

        # Footer (Bottom of A4 Portrait: y=30 pt)
        self.line(36, 42, 559, 42)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "Confidential — For Authorized Customer Use")
        gen_time = datetime.now(timezone.utc).strftime("%d-%b-%Y %H:%M UTC")
        self.drawRightString(559, 26, f"Generated: {gen_time}  |  Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_single_transaction_receipt_pdf(
    txn: Dict[str, Any],
    retailer_info: Dict[str, Any]
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A")
    )
    
    sub_title_style = ParagraphStyle(
        "ReceiptSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2563EB")
    )

    sec_title_style = ParagraphStyle(
        "SecTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1E3A8A")
    )

    label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748B")
    )

    val_style = ParagraphStyle(
        "MetaValue",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )

    val_mono = ParagraphStyle(
        "MetaValueMono",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0F172A")
    )

    hero_amt_style = ParagraphStyle(
        "HeroAmount",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        alignment=1, # Center
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # 1. Corporate Header
    story.append(Paragraph("Pay2Pay FinTech Solutions", sub_title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("OFFICIAL TRANSACTION RECEIPT", title_style))
    story.append(Spacer(1, 10))

    # 2. Metadata Grid (Retailer & Generation)
    ret_name = retailer_info.get("name") or retailer_info.get("retailer_name") or "Pay2Pay Verified Merchant"
    ret_code = retailer_info.get("code") or retailer_info.get("retailer_code") or "RET-0CFE2B"
    gen_at = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    meta_table_data = [
        [
            Paragraph("RETAILER NAME", label_style),
            Paragraph("RETAILER ID", label_style),
            Paragraph("GENERATED AT", label_style),
            Paragraph("STATEMENT TYPE", label_style)
        ],
        [
            Paragraph(ret_name, val_style),
            Paragraph(ret_code, val_mono),
            Paragraph(gen_at, val_style),
            Paragraph("Outbound Payout Statement", val_style)
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[150, 100, 130, 143])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 3. Status & Transfer Amount Hero Box
    st_raw = str(txn.get("status") or "SUCCESS").upper()
    if st_raw == "SUCCESS":
        st_text = "✓ TRANSACTION SUCCESSFUL"
        st_color = colors.HexColor("#16A34A")
        st_bg = colors.HexColor("#F0FDF4")
    elif st_raw in ["PENDING", "PROCESSING"]:
        st_text = "◷ TRANSACTION PENDING"
        st_color = colors.HexColor("#D97706")
        st_bg = colors.HexColor("#FFFBEB")
    elif st_raw in ["REVERSED", "PARTIALLY_REVERSED"]:
        st_text = "↩ TRANSACTION REVERSED"
        st_color = colors.HexColor("#7C3AED")
        st_bg = colors.HexColor("#F3E8FF")
    else:
        st_text = "✕ TRANSACTION FAILED"
        st_color = colors.HexColor("#DC2626")
        st_bg = colors.HexColor("#FEF2F2")

    st_style = ParagraphStyle(
        "HeroStatus",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        alignment=1,
        textColor=st_color
    )

    amt_val = float(txn.get("transfer_amount") or txn.get("amount") or 0.0)

    hero_table_data = [
        [Paragraph(st_text, st_style)],
        [Paragraph("TRANSFER AMOUNT", label_style)],
        [Paragraph(f"₹{amt_val:,.2f}", hero_amt_style)]
    ]

    hero_table = Table(hero_table_data, colWidths=[523])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), st_bg),
        ('BOX', (0, 0), (-1, -1), 1, st_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 14))

    # Helper function for 2-column key-value tables
    def build_kv_table(pairs: List[tuple]) -> Table:
        rows = []
        for k, v, is_m, is_h in pairs:
            val_p = Paragraph(v, val_mono if is_m else (ParagraphStyle("HVal", parent=val_style, textColor=colors.HexColor("#16A34A")) if is_h else val_style))
            rows.append([Paragraph(k, label_style), val_p])
        t = Table(rows, colWidths=[180, 343])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return t

    # 4. Section: Transaction Information
    story.append(Paragraph("TRANSACTION INFORMATION", sec_title_style))
    story.append(Spacer(1, 4))
    txn_info_pairs = [
        ("Transaction ID", str(txn.get("transaction_number") or txn.get("transaction_id") or "-"), True, False),
        ("Reference ID", str(txn.get("reference_id") or "-"), True, False),
        ("UTR Number", str(txn.get("utr_number") or "--"), True, bool(txn.get("utr_number"))),
        ("Payment Mode", str(txn.get("payment_mode") or "IMPS"), False, False),
        ("Initiated At", str(txn.get("initiated_at") or "-"), False, False),
        ("Completed At", str(txn.get("completed_at") or "--"), False, False),
    ]
    story.append(build_kv_table(txn_info_pairs))
    story.append(Spacer(1, 12))

    # 5. Section: Customer Information
    story.append(Paragraph("CUSTOMER INFORMATION", sec_title_style))
    story.append(Spacer(1, 4))
    cust_name = txn.get("customer_name") or "N/A"
    cust_mob = txn.get("customer_mobile") or "N/A"
    cust_pairs = [
        ("Customer Name", cust_name, False, False),
        ("Mobile Number", cust_mob, True, False),
    ]
    story.append(build_kv_table(cust_pairs))
    story.append(Spacer(1, 12))

    # 6. Section: Beneficiary Information
    story.append(Paragraph("BENEFICIARY INFORMATION", sec_title_style))
    story.append(Spacer(1, 4))
    bene_name = txn.get("beneficiary_name") or "N/A"
    bank_name = txn.get("bank_name") or "N/A"
    masked_acc = txn.get("masked_account_number") or "XXXX XXXX 1234"
    ifsc = txn.get("ifsc_code") or "N/A"
    bene_pairs = [
        ("Beneficiary Name", bene_name, False, False),
        ("Bank Name", bank_name, False, False),
        ("Account Number", masked_acc, True, False),
        ("IFSC Code", ifsc, True, False),
    ]
    story.append(build_kv_table(bene_pairs))
    story.append(Spacer(1, 12))

    # 7. Section: Financial Breakdown
    story.append(Paragraph("FINANCIAL BREAKDOWN", sec_title_style))
    story.append(Spacer(1, 4))
    fee_val = float(txn.get("convenience_fee") or 0.0)
    gst_val = float(txn.get("gst_amount") or 0.0)
    debit_val = float(txn.get("wallet_debit") or (amt_val + fee_val + gst_val))
    comm_val = float(txn.get("retailer_commission") or 0.0)
    fin_pairs = [
        ("Transfer Amount", f"₹{amt_val:,.2f}", False, False),
        ("Convenience Fee", f"₹{fee_val:,.2f}", False, False),
        ("GST Amount", f"₹{gst_val:,.2f}", False, False),
        ("Total Wallet Debit", f"₹{debit_val:,.2f}", False, True),
        ("Retailer Commission Earned", f"₹{comm_val:,.2f}", False, False),
    ]
    story.append(build_kv_table(fin_pairs))
    story.append(Spacer(1, 12))

    # 8. Reversal / Failure Reason (if applicable)
    remarks = txn.get("remarks") or txn.get("failure_reason") or txn.get("reversal_reason")
    if remarks or st_raw in ["REVERSED", "FAILED", "PARTIALLY_REVERSED"]:
        rem_text = remarks or f"Transaction status recorded as {st_raw} by partner bank."
        rem_pairs = [("Status Remark / Reason", rem_text, False, False)]
        story.append(Paragraph("STATUS REMARK", sec_title_style))
        story.append(Spacer(1, 4))
        story.append(build_kv_table(rem_pairs))

    doc.build(story, canvasmaker=SingleReceiptNumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
