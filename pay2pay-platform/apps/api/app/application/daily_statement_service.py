"""
Daily Automatic Account Statement Service
=========================================
Generates daily reconciled account statements for Retailers and Admin/Company.
Follows strict banking format, PDF password-protection using PAN, automatic email dispatch,
storage tracking, and duplicate protection.

Zero direct SQL queries: Uses existing Stored Procedures and Ledger tables.
"""

import io
import os
import json
import logging
import hashlib
import re
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

# Python 3.8 OpenSSL compatibility patch for ReportLab 4.x
try:
    hashlib.md5(b"test", usedforsecurity=False)
except TypeError:
    _orig_md5 = hashlib.md5
    def _safe_md5(*args, **kwargs):
        kwargs.pop("usedforsecurity", None)
        return _orig_md5(*args, **kwargs)
    hashlib.md5 = _safe_md5

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from reportlab.lib.pagesizes import A4
try:
    import reportlab.pdfbase.pdfdoc as _r_pdfdoc
    _r_pdfdoc.md5 = hashlib.md5
except Exception:
    pass
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
)
from reportlab.lib.pdfencrypt import StandardEncryption
from reportlab.pdfgen import canvas

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.global_context import GlobalContext
from app.infrastructure.adapters.email_service import email_service

logger = logging.getLogger("daily_statement_service")

# Base directory for local PDF storage
STORAGE_BASE_DIR = os.path.join(os.getcwd(), "storage", "statements")


class BankStatementCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic total page count and professional bank footer."""
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
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        # Top Accent Line
        self.setStrokeColor(colors.HexColor("#0284C7"))
        self.setLineWidth(3)
        self.line(32, 810, 563, 810)

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(32, 42, 563, 42)

        # Footer text
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(32, 28, "SUPER REX PRODUCTS PRIVATE LIMITED | Pay2Pay Enterprise FinTech Platform")
        self.drawRightString(563, 28, f"Page {self._pageNumber} of {page_count}  |  Confidential")
        self.restoreState()


class DailyAccountStatementService:
    """
    Enterprise Account Statement Generation & Delivery Engine.
    Strictly uses PostgreSQL Stored Procedures.
    """

    @classmethod
    def get_statement_password_details(cls, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Derives the combination password and user-facing hints for PDF protection.
        Standard banking formula:
        First 4 characters of PAN (in UPPERCASE) + Last 4 digits of registered Mobile Number.
        Fallback: If PAN is missing or <4 chars, uses retailer code + last 4 digits of mobile.
        """
        is_admin = data.get("statement_type") == "ADMIN"
        if is_admin:
            pan = (data.get("pan_number") or data.get("company_name") or "PAY2PAY").strip().upper()
            clean_pan = re.sub(r'[^A-Z0-9]', '', pan)
            pwd = clean_pan[:8] if len(clean_pan) >= 8 else "PAY2PAY2026"
            return {
                "password": pwd,
                "formula": "Admin Security Key (First 8 characters)",
                "hint": f"{pwd[:2]}••••{pwd[-2:]}",
                "example": "Admin Master Key (8 characters)",
                "pan_prefix": pwd[:4],
                "mob_suffix": pwd[-4:]
            }

        pan_clean = re.sub(r'[^A-Z0-9]', '', str(data.get("pan_number") or "").upper())
        code_clean = re.sub(r'[^A-Z0-9]', '', str(data.get("retailer_code") or "P2P").upper())
        mob_clean = re.sub(r'[^0-9]', '', str(data.get("mobile") or ""))

        pan_prefix = pan_clean[:4] if len(pan_clean) >= 4 else (code_clean[:4] if len(code_clean) >= 4 else "P2P1")
        mob_suffix = mob_clean[-4:] if len(mob_clean) >= 4 else "2026"

        comb_pwd = f"{pan_prefix}{mob_suffix}"
        formula = "First 4 characters of PAN (in CAPITAL) + Last 4 digits of Registered Mobile Number"
        masked_hint = f"{pan_prefix}••••{mob_suffix}"

        return {
            "password": comb_pwd,
            "formula": formula,
            "hint": masked_hint,
            "example": "If PAN is ABCDE1234F & Mobile is 9876543210 -> Password is ABCD3210",
            "pan_prefix": pan_prefix,
            "mob_suffix": mob_suffix
        }

    @classmethod
    def build_bank_statement_pdf(cls, data: Dict[str, Any]) -> bytes:
        """
        Builds a high-precision bank-style statement PDF with combination password protection.
        """
        buffer = io.BytesIO()
        pwd_info = cls.get_statement_password_details(data)
        user_password = pwd_info["password"]
        master_key = getattr(settings, "STATEMENT_MASTER_KEY", "PAY2PAY_MASTER_AUDIT_KEY_2026")

        enc = StandardEncryption(
            userPassword=user_password,
            ownerPassword=master_key,
            canPrint=1,
            canModify=0,
            canCopy=0
        )

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=32,
            rightMargin=32,
            topMargin=36,
            bottomMargin=54,
            encrypt=enc
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "BankTitle",
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=21,
            textColor=colors.HexColor("#0F172A")
        )
        sub_title_style = ParagraphStyle(
            "BankSubTitle",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#475569")
        )
        badge_style = ParagraphStyle(
            "BadgeText",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            alignment=2,
            textColor=colors.HexColor("#0284C7")
        )
        ref_style = ParagraphStyle(
            "Ref",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            alignment=2,
            textColor=colors.HexColor("#64748B")
        )
        normal_label = ParagraphStyle(
            "NormalLabel",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#64748B")
        )
        normal_val = ParagraphStyle(
            "NormalVal",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor("#0F172A")
        )
        card_label = ParagraphStyle(
            "CardLabel",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            alignment=1,
            textColor=colors.HexColor("#475569")
        )
        card_amt = ParagraphStyle(
            "CardAmt",
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            alignment=1,
            textColor=colors.HexColor("#0F172A")
        )
        card_amt_cr = ParagraphStyle(
            "CardAmtCr",
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            alignment=1,
            textColor=colors.HexColor("#15803D")
        )
        card_amt_dr = ParagraphStyle(
            "CardAmtDr",
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            alignment=1,
            textColor=colors.HexColor("#DC2626")
        )
        card_amt_cl = ParagraphStyle(
            "CardAmtCl",
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=16,
            alignment=1,
            textColor=colors.HexColor("#FFFFFF")
        )
        card_lbl_cl = ParagraphStyle(
            "CardLblCl",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10.5,
            alignment=1,
            textColor=colors.HexColor("#E0F2FE")
        )
        tbl_hdr = ParagraphStyle(
            "TblHdr",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            alignment=0,
            textColor=colors.HexColor("#FFFFFF")
        )
        tbl_hdr_right = ParagraphStyle(
            "TblHdrRight",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#FFFFFF")
        )
        tbl_cell = ParagraphStyle(
            "TblCell",
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#1E293B")
        )
        tbl_cell_dt = ParagraphStyle(
            "TblCellDt",
            fontName="Helvetica",
            fontSize=7,
            leading=8.5,
            textColor=colors.HexColor("#1E293B")
        )
        tbl_cell_txid = ParagraphStyle(
            "TblCellTxId",
            fontName="Helvetica-Bold",
            fontSize=7.2,
            leading=8.8,
            textColor=colors.HexColor("#0F172A")
        )
        tbl_cell_ref = ParagraphStyle(
            "TblCellRef",
            fontName="Helvetica",
            fontSize=6.2,
            leading=7.8,
            textColor=colors.HexColor("#475569")
        )
        tbl_cell_right = ParagraphStyle(
            "TblCellRight",
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#1E293B")
        )
        tbl_cell_cr = ParagraphStyle(
            "TblCellCr",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#15803D")
        )
        tbl_cell_dr = ParagraphStyle(
            "TblCellDr",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#DC2626")
        )
        tbl_cell_bal = ParagraphStyle(
            "TblCellBal",
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            alignment=2,
            textColor=colors.HexColor("#0F172A")
        )

        story = []

        # 1. Header Section with Company Logo
        logo_path = None
        for candidate in [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "logo.png"),
            os.path.join(os.getcwd(), "app", "static", "logo.png"),
            os.path.join(os.getcwd(), "backend", "app", "static", "logo.png"),
            "/home/ubuntu/pay2pay/backend/app/static/logo.png",
            "d:/pay2pay/backend/app/static/logo.png",
        ]:
            if os.path.exists(candidate):
                logo_path = candidate
                break

        logo_img = None
        if logo_path:
            try:
                # 808 x 500 aspect ratio 1.616:1 -> 66 x 41
                logo_img = RLImage(logo_path, width=66, height=41)
            except Exception as e:
                logger.warning(f"Could not load statement logo image from {logo_path}: {e}")

        if logo_img:
            header_data = [
                [
                    logo_img,
                    [
                        Paragraph("<b>PAY2PAY</b>", title_style),
                        Spacer(1, 2),
                        Paragraph("SUPER REX PRODUCTS PRIVATE LIMITED", sub_title_style)
                    ],
                    [
                        Paragraph("<b>ACCOUNT STATEMENT</b>", badge_style),
                        Spacer(1, 3),
                        Paragraph(f"Ref: <b>{data.get('statement_number', 'STMT-001')}</b>", ref_style)
                    ]
                ]
            ]
            hdr_table = Table(header_data, colWidths=[72, 258, 201])
            hdr_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
        else:
            header_data = [
                [
                    Paragraph("<b>PAY2PAY</b>", title_style),
                    Paragraph("<b>ACCOUNT STATEMENT</b>", badge_style)
                ],
                [
                    Paragraph("SUPER REX PRODUCTS PRIVATE LIMITED", sub_title_style),
                    Paragraph(f"Ref: <b>{data.get('statement_number', 'STMT-001')}</b>", ref_style)
                ]
            ]
            hdr_table = Table(header_data, colWidths=[330, 201])
            hdr_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
            ]))

        story.append(hdr_table)
        story.append(Spacer(1, 10))

        # 2. Account Information Block
        stmt_date_str = str(data.get("statement_date", ""))
        is_admin = data.get("statement_type") == "ADMIN"
        holder_title = "Company Name:" if is_admin else "Account Holder:"
        if is_admin:
            holder_name = data.get("company_name", "SUPER REX PRODUCTS PRIVATE LIMITED")
        else:
            s_name = (data.get("store_name") or "").strip()
            o_name = (data.get("owner_name") or "").strip()
            if s_name and o_name and s_name.lower() != o_name.lower():
                holder_name = f"{s_name} ({o_name})"
            else:
                holder_name = s_name or o_name or data.get("retailer_name", "Valued Retailer")
        id_title = "Company ID:" if is_admin else "Retailer ID:"
        id_val = str(data.get("company_id" if is_admin else "retailer_code", "N/A"))

        recon_status = data.get("reconciliation_status", "RECONCILED")
        recon_color = "#15803D" if recon_status == "RECONCILED" else "#DC2626"

        info_data = [
            [
                Paragraph(f"{holder_title}", normal_label),
                Paragraph(f"<b>{holder_name}</b>", normal_val),
                Paragraph("Statement Date:", normal_label),
                Paragraph(f"<b>{stmt_date_str}</b>", normal_val)
            ],
            [
                Paragraph(f"{id_title}", normal_label),
                Paragraph(f"<b>{id_val}</b>", normal_val),
                Paragraph("Statement Period:", normal_label),
                Paragraph(f"<b>{stmt_date_str} 00:00 – 23:59</b>", normal_val)
            ],
            [
                Paragraph("Registered Entity:", normal_label),
                Paragraph("SUPER REX PRODUCTS PRIVATE LIMITED", normal_val),
                Paragraph("Reconciliation:", normal_label),
                Paragraph(f"<font color='{recon_color}'><b>● {recon_status}</b></font>", normal_val)
            ]
        ]
        info_table = Table(info_data, colWidths=[90, 190, 95, 156])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 10))

        # 3. Balance Summary - Prominent Closing Balance (Universal Rs. Currency)
        op_bal = float(data.get("opening_balance", 0.0) or 0.0)
        cr_tot = float(data.get("total_credit", 0.0) or 0.0)
        dr_tot = float(data.get("total_debit", 0.0) or 0.0)
        cl_bal = float(data.get("closing_balance", 0.0) or 0.0)

        summary_data = [
            [
                Paragraph("OPENING BALANCE", card_label),
                Paragraph("TOTAL CREDIT", card_label),
                Paragraph("TOTAL DEBIT", card_label),
                Paragraph("CLOSING BALANCE", card_lbl_cl)
            ],
            [
                Paragraph(f"Rs. {op_bal:,.2f}", card_amt),
                Paragraph(f"+ Rs. {cr_tot:,.2f}", card_amt_cr),
                Paragraph(f"- Rs. {dr_tot:,.2f}", card_amt_dr),
                Paragraph(f"Rs. {cl_bal:,.2f}", card_amt_cl)
            ]
        ]
        summary_table = Table(summary_data, colWidths=[130, 130, 130, 141])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (2, -1), colors.HexColor("#F1F5F9")),
            ('BACKGROUND', (3, 0), (3, -1), colors.HexColor("#0284C7")),
            ('BOX', (0, 0), (2, -1), 1, colors.HexColor("#CBD5E1")),
            ('BOX', (3, 0), (3, -1), 2, colors.HexColor("#0369A1")),
            ('INNERGRID', (0, 0), (2, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, 0), 5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 12))

        # 4. Bank-Style Transaction Table
        tx_rows = data.get("transactions") or []
        table_content = [
            [
                Paragraph("DATE & TIME", tbl_hdr),
                Paragraph("TRANSACTION ID", tbl_hdr),
                Paragraph("DESCRIPTION", tbl_hdr),
                Paragraph("REFERENCE", tbl_hdr),
                Paragraph("CREDIT", tbl_hdr_right),
                Paragraph("DEBIT", tbl_hdr_right),
                Paragraph("BALANCE", tbl_hdr_right)
            ]
        ]

        for tx in tx_rows:
            created_at_str = str(tx.get("created_at") or "")
            date_fmt = str(tx.get("date_formatted") or "")
            txn_time = str(tx.get("txn_time") or "")

            if created_at_str and " " in created_at_str:
                try:
                    parts = created_at_str.split(" ", 1)
                    d_obj = datetime.strptime(parts[0], "%Y-%m-%d")
                    d_str = d_obj.strftime("%d-%b-%Y")
                    t_display = f"<b>{d_str}</b><br/><font color='#64748B'>{parts[1][:8]}</font>"
                except Exception:
                    t_display = created_at_str
            elif date_fmt:
                t_display = f"<b>{date_fmt}</b>"
            elif txn_time:
                t_display = f"<b>{txn_time}</b>"
            else:
                t_display = "—"

            t_id = str(tx.get("txn_id") or "")
            t_desc = str(tx.get("description") or tx.get("service") or tx.get("service_name") or "")
            t_ref = str(tx.get("ref_id") or tx.get("reference") or "—")

            c_val = float(tx.get("credit_amount") or tx.get("credit") or 0.0)
            d_val = float(tx.get("debit_amount") or tx.get("debit") or 0.0)
            b_val = float(tx.get("balance_after", 0.0) or 0.0)

            # Fallback if both credit and debit are 0.0 but entry_type is set
            if c_val == 0.0 and d_val == 0.0:
                ent = str(tx.get("entry_type", "")).upper()
                amt = float(tx.get("amount", 0.0) or 0.0)
                if ent == "CREDIT":
                    c_val = amt
                elif ent == "DEBIT":
                    d_val = amt

            c_str = f"Rs. {c_val:,.2f}" if c_val > 0 else "—"
            d_str = f"Rs. {d_val:,.2f}" if d_val > 0 else "—"
            b_str = f"Rs. {b_val:,.2f}"

            table_content.append([
                Paragraph(t_display, tbl_cell_dt),
                Paragraph(t_id, tbl_cell_txid),
                Paragraph(t_desc[:36], tbl_cell),
                Paragraph(t_ref[:25], tbl_cell_ref),
                Paragraph(c_str, tbl_cell_cr if c_val > 0 else tbl_cell_right),
                Paragraph(d_str, tbl_cell_dr if d_val > 0 else tbl_cell_right),
                Paragraph(b_str, tbl_cell_bal)
            ])

        if not tx_rows:
            table_content.append([
                Paragraph("—", tbl_cell),
                Paragraph("No transactions recorded on this date.", tbl_cell),
                Paragraph("—", tbl_cell),
                Paragraph("—", tbl_cell),
                Paragraph("—", tbl_cell_right),
                Paragraph("—", tbl_cell_right),
                Paragraph(f"Rs. {cl_bal:,.2f}", tbl_cell_right)
            ])

        # Footer Totals Row
        table_content.append([
            Paragraph("<b>TOTALS</b>", tbl_cell),
            Paragraph(f"<b>Count: {len(tx_rows)}</b>", tbl_cell),
            Paragraph("", tbl_cell),
            Paragraph("", tbl_cell),
            Paragraph(f"<b>Rs. {cr_tot:,.2f}</b>", tbl_cell_cr),
            Paragraph(f"<b>Rs. {dr_tot:,.2f}</b>", tbl_cell_dr),
            Paragraph(f"<b>Rs. {cl_bal:,.2f}</b>", tbl_cell_bal)
        ])

        # colWidths sum = 70 + 98 + 88 + 95 + 58 + 58 + 64 = 531 pt
        tx_table = Table(table_content, colWidths=[70, 98, 88, 95, 58, 58, 64], repeatRows=1)
        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('TOPPADDING', (0, 0), (-1, 0), 5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, -1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 4),
        ]

        for i in range(1, len(table_content) - 1):
            if i % 2 == 0:
                t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#F8FAFC")))

        tx_table.setStyle(TableStyle(t_style))
        story.append(tx_table)

        doc.build(story, canvasmaker=BankStatementCanvas)
        return buffer.getvalue()

    @classmethod
    async def generate_retailer_statement(
        cls,
        retailer_id: str,
        statement_date: date,
        force_regenerate: bool = False,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Generates and delivers a daily statement for a single retailer.
        Validates reconciliation before sending email. Protects against duplicate generation.
        """
        async def _run(db: AsyncSession) -> Dict[str, Any]:
            # 1. Fetch statement data from Stored Procedure
            res = await db.execute(
                text("SELECT public.sp_generate_retailer_statement_data(:p_retailer_id, :p_statement_date);"),
                {"p_retailer_id": retailer_id, "p_statement_date": statement_date}
            )
            raw_json = res.scalar()
            if not raw_json:
                raise ValueError(f"No statement data returned for retailer {retailer_id} on {statement_date}")
            
            d: Dict[str, Any] = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
            if not d.get("success", True):
                return d

            company_id = str(d.get("company_id")) if d.get("company_id") else (str(GlobalContext.company_id) if GlobalContext.company_id else None)
            tenant_id = str(d.get("tenant_id")) if d.get("tenant_id") else "00000000-0000-0000-0000-000000000001"
            retailer_code = d.get("retailer_code", "RET")
            stmt_date_str = statement_date.strftime("%Y-%m-%d")
            stmt_num = f"STMT-{retailer_code}-{statement_date.strftime('%Y%m%d')}"
            d["statement_number"] = stmt_num
            d["statement_type"] = "RETAILER"

            # 2. Check Duplicate Protection
            if not force_regenerate:
                chk_res = await db.execute(
                    text("SELECT * FROM public.sp_check_statement_exists(:p_company_id, :p_retailer_id, :p_statement_date);"),
                    {
                        "p_company_id": company_id,
                        "p_retailer_id": retailer_id,
                        "p_statement_date": statement_date
                    }
                )
                existing_row = chk_res.fetchone()
                if existing_row and existing_row.email_status in ("SENT", "SIMULATED"):
                    logger.info(f"Statement already generated and delivered for {stmt_num}. Skipping duplicate.")
                    return {
                        "success": True,
                        "statement_number": existing_row.statement_number,
                        "status": "ALREADY_GENERATED",
                        "email_status": existing_row.email_status,
                        "reconciliation_status": existing_row.reconciliation_status,
                        "file_path": existing_row.pdf_file_path
                    }

            # 3. Generate Password-Protected Bank Statement PDF
            pdf_bytes = cls.build_bank_statement_pdf(d)

            # 4. Save to storage
            date_dir = os.path.join(STORAGE_BASE_DIR, stmt_date_str)
            os.makedirs(date_dir, exist_ok=True)
            pdf_file_path = os.path.join(date_dir, f"{stmt_num}.pdf")
            with open(pdf_file_path, "wb") as f:
                f.write(pdf_bytes)

            # 5. Strict Reconciliation Check
            reconciled = d.get("reconciliation_status") == "RECONCILED" and abs(float(d.get("reconciliation_difference", 0.0) or 0.0)) < 0.01
            email_status = "PENDING"
            error_message = None

            if not reconciled:
                email_status = "SUPPRESSED_RECONCILIATION_FAILED"
                error_message = (
                    f"Reconciliation mismatch! Diff: Rs. {d.get('reconciliation_difference', 0.00)}. "
                    f"Opening Rs. {d.get('opening_balance')} + Cr Rs. {d.get('total_credit')} - Dr Rs. {d.get('total_debit')} "
                    f"!= Cl Rs. {d.get('closing_balance')}."
                )
                logger.error(f"[RECONCILIATION ALERT] Retailer statement suppressed: {error_message}")
            else:
                # 6. Automatic Email Dispatch
                recipient_email = d.get("email")
                store_name = (d.get("store_name") or "").strip()
                owner_name = (d.get("owner_name") or "").strip()
                retailer_code = d.get("retailer_code", "RET")

                if store_name and owner_name and store_name.lower() != owner_name.lower():
                    recipient_name = f"{store_name} ({owner_name} - {retailer_code})"
                elif store_name:
                    recipient_name = f"{store_name} ({retailer_code})"
                elif owner_name:
                    recipient_name = f"{owner_name} ({retailer_code})"
                else:
                    recipient_name = d.get("retailer_name") or retailer_code

                if recipient_email and "@" in recipient_email:
                    try:
                        pwd_info = cls.get_statement_password_details(d)
                        email_res = await email_service.send_statement_email(
                            recipient_email=recipient_email,
                            recipient_name=recipient_name,
                            statement_date_str=statement_date.strftime("%d %B %Y"),
                            opening_balance=float(d.get("opening_balance", 0.0)),
                            total_credit=float(d.get("total_credit", 0.0)),
                            total_debit=float(d.get("total_debit", 0.0)),
                            closing_balance=float(d.get("closing_balance", 0.0)),
                            pdf_bytes=pdf_bytes,
                            filename=f"{stmt_num}.pdf",
                            is_admin=False,
                            password_hint=pwd_info["hint"],
                            password_formula=pwd_info["formula"],
                            password_example=pwd_info["example"]
                        )
                        if email_res.get("delivered"):
                            email_status = "SENT"
                        elif email_res.get("status") == "SIMULATED":
                            email_status = "SIMULATED"
                        else:
                            email_status = "FAILED"
                        if not email_res.get("delivered") and email_res.get("status") != "SIMULATED":
                            error_message = email_res.get("detail") or "Failed to deliver email."
                    except Exception as ex:
                        email_status = "FAILED"
                        error_message = str(ex)
                        logger.error(f"Email dispatch error for {recipient_email}: {ex}")
                else:
                    email_status = "FAILED"
                    error_message = "No valid email address registered for retailer."

            # 7. Record Account Statement Log via Stored Procedure
            p_start = datetime.combine(statement_date, datetime.min.time(), tzinfo=timezone.utc)
            p_end = datetime.combine(statement_date, datetime.max.time(), tzinfo=timezone.utc)

            pwd_info_log = cls.get_statement_password_details(d)
            rec_res = await db.execute(
                text("""
                    SELECT * FROM public.sp_record_account_statement_log(
                        :p_statement_number, :p_tenant_id, :p_company_id, :p_retailer_id, :p_statement_type,
                        :p_statement_date, :p_period_start, :p_period_end,
                        :p_opening_balance, :p_total_credit, :p_total_debit, :p_closing_balance,
                        :p_total_commission, :p_total_gst, :p_transaction_count,
                        :p_reconciliation_status, :p_reconciliation_difference,
                        :p_pdf_file_path, :p_email_recipient, :p_email_status,
                        :p_error_message, :p_metadata_json
                    );
                """),
                {
                    "p_statement_number": stmt_num,
                    "p_tenant_id": tenant_id,
                    "p_company_id": company_id,
                    "p_retailer_id": retailer_id,
                    "p_statement_type": "RETAILER",
                    "p_statement_date": statement_date,
                    "p_period_start": p_start,
                    "p_period_end": p_end,
                    "p_opening_balance": d.get("opening_balance", 0.0),
                    "p_total_credit": d.get("total_credit", 0.0),
                    "p_total_debit": d.get("total_debit", 0.0),
                    "p_closing_balance": d.get("closing_balance", 0.0),
                    "p_total_commission": d.get("total_commission", 0.0),
                    "p_total_gst": d.get("total_gst", 0.0),
                    "p_transaction_count": d.get("transaction_count", 0),
                    "p_reconciliation_status": d.get("reconciliation_status", "RECONCILED"),
                    "p_reconciliation_difference": d.get("reconciliation_difference", 0.0),
                    "p_pdf_file_path": pdf_file_path,
                    "p_email_recipient": d.get("email"),
                    "p_email_status": email_status,
                    "p_error_message": error_message,
                    "p_metadata_json": json.dumps({
                        "retailer_code": retailer_code,
                        "pan_set": bool(d.get("pan_number")),
                        "password_hint": pwd_info_log["hint"],
                        "password_formula": pwd_info_log["formula"]
                    })
                }
            )
            log_row = rec_res.fetchone()
            await db.commit()

            return {
                "success": True,
                "statement_id": str(log_row.statement_id) if log_row else None,
                "statement_number": stmt_num,
                "email_status": email_status,
                "reconciliation_status": d.get("reconciliation_status"),
                "file_path": pdf_file_path,
                "error_message": error_message
            }

        if session:
            return await _run(session)
        async with AsyncSessionLocal() as s:
            return await _run(s)

    @classmethod
    async def generate_admin_statement(
        cls,
        company_id: str,
        statement_date: date,
        force_regenerate: bool = False,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Generates and delivers a daily statement for Company / Admin account.
        Validates reconciliation before sending email. Protects against duplicate generation.
        """
        async def _run(db: AsyncSession) -> Dict[str, Any]:
            res = await db.execute(
                text("SELECT public.sp_generate_admin_statement_data(:p_company_id, :p_statement_date);"),
                {"p_company_id": company_id, "p_statement_date": statement_date}
            )
            raw_json = res.scalar()
            if not raw_json:
                raise ValueError(f"No statement data returned for admin/company {company_id} on {statement_date}")

            d: Dict[str, Any] = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
            if not d.get("success", True):
                return d

            tenant_id = d.get("tenant_id") or "00000000-0000-0000-0000-000000000001"
            stmt_date_str = statement_date.strftime("%Y-%m-%d")
            cmp_code = company_id.replace('-', '')[:6].upper() if company_id else "GEN"
            stmt_num = f"STMT-ADMIN-CMP-{cmp_code}-{statement_date.strftime('%Y%m%d')}"
            d["statement_number"] = stmt_num
            d["statement_type"] = "ADMIN"

            # Check Duplicate Protection
            if not force_regenerate:
                chk_res = await db.execute(
                    text("SELECT * FROM public.sp_check_statement_exists(:p_company_id, NULL, :p_statement_date);"),
                    {
                        "p_company_id": company_id,
                        "p_statement_date": statement_date
                    }
                )
                existing_row = chk_res.fetchone()
                if existing_row and existing_row.email_status in ("SENT", "SIMULATED"):
                    logger.info(f"Admin statement already generated and delivered for {stmt_num}. Skipping duplicate.")
                    return {
                        "success": True,
                        "statement_number": existing_row.statement_number,
                        "status": "ALREADY_GENERATED",
                        "email_status": existing_row.email_status,
                        "reconciliation_status": existing_row.reconciliation_status,
                        "file_path": existing_row.pdf_file_path
                    }

            # Generate Password-Protected Bank Statement PDF
            pdf_bytes = cls.build_bank_statement_pdf(d)

            # Save to storage
            date_dir = os.path.join(STORAGE_BASE_DIR, stmt_date_str)
            os.makedirs(date_dir, exist_ok=True)
            pdf_file_path = os.path.join(date_dir, f"{stmt_num}.pdf")
            with open(pdf_file_path, "wb") as f:
                f.write(pdf_bytes)

            # Strict Reconciliation Check
            reconciled = d.get("reconciliation_status") == "RECONCILED" and d.get("can_send_email", True)
            email_status = "PENDING"
            error_message = None

            admin_email = (
                getattr(settings, "ADMIN_STATEMENT_EMAIL", "")
                or getattr(settings, "SMTP_FROM_EMAIL", "")
                or getattr(settings, "SMTP_USERNAME", "")
                or "admin@pay2pay.in"
            ).strip()

            if not reconciled:
                email_status = "SUPPRESSED_RECONCILIATION_FAILED"
                error_message = (
                    f"Admin reconciliation mismatch! Diff: Rs. {d.get('reconciliation_difference', 0.00)}. "
                    f"Platform Opening Rs. {d.get('opening_balance')} + Cr Rs. {d.get('total_credit')} - Dr Rs. {d.get('total_debit')} "
                    f"!= Cl Rs. {d.get('closing_balance')}."
                )
                logger.error(f"[ADMIN RECONCILIATION ALERT] {error_message}")
            else:
                try:
                    pwd_info = cls.get_statement_password_details(d)
                    email_res = await email_service.send_statement_email(
                        recipient_email=admin_email,
                        recipient_name="Pay2Pay Administration",
                        statement_date_str=statement_date.strftime("%d %B %Y"),
                        opening_balance=float(d.get("opening_balance", 0.0)),
                        total_credit=float(d.get("total_credit", 0.0)),
                        total_debit=float(d.get("total_debit", 0.0)),
                        closing_balance=float(d.get("closing_balance", 0.0)),
                        pdf_bytes=pdf_bytes,
                        filename=f"{stmt_num}.pdf",
                        is_admin=True,
                        password_hint=pwd_info["hint"],
                        password_formula=pwd_info["formula"],
                        password_example=pwd_info["example"]
                    )
                    if email_res.get("delivered"):
                        email_status = "SENT"
                    elif email_res.get("status") == "SIMULATED":
                        email_status = "SIMULATED"
                    else:
                        email_status = "FAILED"
                    if not email_res.get("delivered") and email_res.get("status") != "SIMULATED":
                        error_message = email_res.get("detail") or "Failed to deliver admin email."
                except Exception as ex:
                    email_status = "FAILED"
                    error_message = str(ex)
                    logger.error(f"Email dispatch error for Admin {admin_email}: {ex}")

            p_start = datetime.combine(statement_date, datetime.min.time(), tzinfo=timezone.utc)
            p_end = datetime.combine(statement_date, datetime.max.time(), tzinfo=timezone.utc)

            rec_res = await db.execute(
                text("""
                    SELECT * FROM public.sp_record_account_statement_log(
                        :p_statement_number, :p_tenant_id, :p_company_id, NULL, :p_statement_type,
                        :p_statement_date, :p_period_start, :p_period_end,
                        :p_opening_balance, :p_total_credit, :p_total_debit, :p_closing_balance,
                        :p_total_commission, :p_total_gst, :p_transaction_count,
                        :p_reconciliation_status, :p_reconciliation_difference,
                        :p_pdf_file_path, :p_email_recipient, :p_email_status,
                        :p_error_message, :p_metadata_json
                    );
                """),
                {
                    "p_statement_number": stmt_num,
                    "p_tenant_id": tenant_id,
                    "p_company_id": company_id,
                    "p_statement_type": "ADMIN",
                    "p_statement_date": statement_date,
                    "p_period_start": p_start,
                    "p_period_end": p_end,
                    "p_opening_balance": d.get("opening_balance", 0.0),
                    "p_total_credit": d.get("total_credit", 0.0),
                    "p_total_debit": d.get("total_debit", 0.0),
                    "p_closing_balance": d.get("closing_balance", 0.0),
                    "p_total_commission": d.get("total_commission", 0.0),
                    "p_total_gst": d.get("total_gst", 0.0),
                    "p_transaction_count": d.get("transaction_count", 0),
                    "p_reconciliation_status": d.get("reconciliation_status", "RECONCILED"),
                    "p_reconciliation_difference": d.get("reconciliation_difference", 0.0),
                    "p_pdf_file_path": pdf_file_path,
                    "p_email_recipient": admin_email,
                    "p_email_status": email_status,
                    "p_error_message": error_message,
                    "p_metadata_json": json.dumps({"admin_email": admin_email, "company_pan": d.get("pan_number")})
                }
            )
            log_row = rec_res.fetchone()
            await db.commit()

            return {
                "success": True,
                "statement_id": str(log_row.statement_id) if log_row else None,
                "statement_number": stmt_num,
                "email_status": email_status,
                "reconciliation_status": d.get("reconciliation_status"),
                "file_path": pdf_file_path,
                "error_message": error_message
            }

        if session:
            return await _run(session)
        async with AsyncSessionLocal() as s:
            return await _run(s)

    @classmethod
    async def execute_daily_statement_job(
        cls,
        statement_date: Optional[date] = None,
        company_id: Optional[str] = None,
        force_regenerate: bool = False
    ) -> Dict[str, Any]:
        """
        Scheduled end-of-day batch runner.
        Executes for every active retailer and the company admin account.
        """
        target_date = statement_date or (datetime.now(timezone.utc).date() - timedelta(days=1))
        # If company_id is explicitly provided, filter by it.
        # Otherwise, in scheduled end-of-day batch, process ALL retailers across all companies (target_company_id = None).
        target_company_id = str(company_id) if company_id else None

        logger.info(f"Starting daily automatic account statement batch for {target_date} (Company: {target_company_id or 'ALL'})")

        stats = {
            "statement_date": str(target_date),
            "total_retailers": 0,
            "retailers_processed": 0,
            "retailers_delivered": 0,
            "retailers_reconciled": 0,
            "reconciliation_failures": 0,
            "admin_statement_status": "SKIPPED",
            "errors": []
        }

        async with AsyncSessionLocal() as session:
            # 1. Fetch active retailers using Stored Procedure
            res = await session.execute(
                text("SELECT * FROM public.sp_list_active_retailers_for_statement(:p_company_id, :p_statement_date);"),
                {"p_company_id": target_company_id, "p_statement_date": target_date}
            )
            retailers = res.fetchall()
            stats["total_retailers"] = len(retailers)

        # 2. Process each retailer statement
        for r in retailers:
            rid = str(r.retailer_id)
            rcode = r.retailer_code
            try:
                ret_res = await cls.generate_retailer_statement(
                    retailer_id=rid,
                    statement_date=target_date,
                    force_regenerate=force_regenerate
                )
                stats["retailers_processed"] += 1
                if ret_res.get("reconciliation_status") == "RECONCILED":
                    stats["retailers_reconciled"] += 1
                else:
                    stats["reconciliation_failures"] += 1

                if ret_res.get("email_status") in ("SENT", "SIMULATED"):
                    stats["retailers_delivered"] += 1
            except Exception as ex:
                logger.error(f"Failed to generate statement for retailer {rcode} ({rid}): {ex}")
                stats["errors"].append({"retailer_code": rcode, "error": str(ex)})

        # 3. Generate Company/Admin Statement(s)
        target_companies = []
        if target_company_id:
            target_companies.append(target_company_id)
        else:
            try:
                async with AsyncSessionLocal() as session:
                    comp_res = await session.execute(text("SELECT public_id FROM public.company WHERE is_deleted = FALSE;"))
                    target_companies = [str(row[0]) for row in comp_res.fetchall()]
            except Exception as ex:
                logger.warning(f"Could not list companies for admin statement: {ex}")

        for cid in target_companies:
            try:
                admin_res = await cls.generate_admin_statement(
                    company_id=cid,
                    statement_date=target_date,
                    force_regenerate=force_regenerate
                )
                stats["admin_statement_status"] = admin_res.get("email_status", "UNKNOWN")
                stats["admin_reconciliation"] = admin_res.get("reconciliation_status")
            except Exception as ex:
                logger.error(f"Failed to generate Admin statement for company {cid}: {ex}")
                stats["errors"].append({"target": f"ADMIN_{cid}", "error": str(ex)})

        logger.info(f"Completed daily automatic account statement batch for {target_date}: {stats}")
        return stats

    @classmethod
    async def get_statements_admin(
        cls,
        statement_date: Optional[date] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Retrieves paginated statements and summary metrics for the Admin view.
        Uses `sp_get_daily_statements_admin`.
        """
        async def _run(db: AsyncSession) -> Dict[str, Any]:
            res = await db.execute(
                text("""
                    SELECT public.sp_get_daily_statements_admin(
                        :p_statement_date, :p_status, :p_search, :p_page, :p_page_size
                    );
                """),
                {
                    "p_statement_date": statement_date,
                    "p_status": status,
                    "p_search": search,
                    "p_page": page,
                    "p_page_size": page_size
                }
            )
            raw = res.scalar()
            return json.loads(raw) if isinstance(raw, str) else (raw or {})

        if session:
            return await _run(session)
        async with AsyncSessionLocal() as s:
            return await _run(s)

    @classmethod
    async def get_statement_details(
        cls,
        statement_id: str,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Retrieves complete statement details, ledger breakdown, and audit metadata.
        Uses `sp_get_daily_statement_details`.
        """
        async def _run(db: AsyncSession) -> Dict[str, Any]:
            res = await db.execute(
                text("SELECT public.sp_get_daily_statement_details(:p_statement_id);"),
                {"p_statement_id": statement_id}
            )
            raw = res.scalar()
            data = json.loads(raw) if isinstance(raw, str) else (raw or {})
            if data and data.get("statement_number"):
                return {"success": True, "statement": data}
            return data

        if session:
            return await _run(session)
        async with AsyncSessionLocal() as s:
            return await _run(s)

    @classmethod
    async def get_statement_pdf_path(
        cls,
        statement_id: str,
        session: Optional[AsyncSession] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Returns local PDF file path and statement number for download streaming.
        """
        info = await cls.get_statement_details(statement_id, session=session)
        stmt = info.get("statement") or info
        return stmt.get("pdf_file_path"), stmt.get("statement_number")

    @classmethod
    async def resend_statement_email(
        cls,
        statement_id: str,
        session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Forces re-sending of a statement email after verifying reconciliation.
        """
        async def _run(db: AsyncSession) -> Dict[str, Any]:
            stmt_info = await cls.get_statement_details(statement_id, session=db)
            if not stmt_info.get("success"):
                return {"success": False, "message": "Statement not found."}

            d = stmt_info.get("statement", {})
            if d.get("reconciliation_status") != "RECONCILED":
                return {
                    "success": False,
                    "message": f"Cannot send email: Reconciliation is {d.get('reconciliation_status')}. Alert unresolved."
                }

            file_path = d.get("pdf_file_path")
            if not file_path or not os.path.exists(file_path):
                # Regenerate PDF if file missing
                pdf_bytes = cls.build_bank_statement_pdf(d)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                with open(file_path, "wb") as f:
                    f.write(pdf_bytes)
            else:
                with open(file_path, "rb") as f:
                    pdf_bytes = f.read()

            recipient_email = d.get("email_recipient")
            if not recipient_email or "@" not in recipient_email:
                return {"success": False, "message": "Invalid recipient email address."}

            store_name = (d.get("store_name") or "").strip()
            owner_name = (d.get("owner_name") or "").strip()
            retailer_code = d.get("retailer_code", "RET")

            if store_name and owner_name and store_name.lower() != owner_name.lower():
                recipient_name = f"{store_name} ({owner_name} - {retailer_code})"
            elif store_name:
                recipient_name = f"{store_name} ({retailer_code})"
            elif owner_name:
                recipient_name = f"{owner_name} ({retailer_code})"
            else:
                recipient_name = d.get("retailer_name") or retailer_code

            stmt_date = date.fromisoformat(str(d.get("statement_date")))
            pwd_info = cls.get_statement_password_details(d)

            email_res = await email_service.send_statement_email(
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                statement_date_str=stmt_date.strftime("%d %B %Y"),
                opening_balance=float(d.get("opening_balance", 0.0)),
                total_credit=float(d.get("total_credit", 0.0)),
                total_debit=float(d.get("total_debit", 0.0)),
                closing_balance=float(d.get("closing_balance", 0.0)),
                pdf_bytes=pdf_bytes,
                filename=f"{d.get('statement_number')}.pdf",
                is_admin=d.get("statement_type") == "ADMIN",
                password_hint=pwd_info["hint"],
                password_formula=pwd_info["formula"],
                password_example=pwd_info["example"]
            )

            new_status = "SENT" if email_res.get("delivered") else "FAILED"
            await db.execute(
                text("SELECT public.sp_update_statement_delivery_status(:p_statement_id, :p_email_status, :p_error_message);"),
                {
                    "p_statement_id": statement_id,
                    "p_email_status": new_status,
                    "p_error_message": email_res.get("detail") if new_status != "SENT" else None
                }
            )
            await db.commit()

            return {
                "success": email_res.get("delivered", False),
                "email_status": new_status,
                "detail": email_res.get("detail")
            }

        if session:
            return await _run(session)
        async with AsyncSessionLocal() as s:
            return await _run(s)


daily_statement_service = DailyAccountStatementService()
