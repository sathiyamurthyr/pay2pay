"""
Enterprise Date & Partition Key Generator for Financial Transactions.
Computes standard date keys and Indian Financial Year keys.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

def compute_transaction_date_and_partition_keys(dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Computes date, time, enterprise calendar, and partition keys for transactions.
    
    Returns a dictionary containing:
    - partition_year (SMALLINT)
    - partition_month (SMALLINT)
    - partition_day (SMALLINT)
    - date_key (INTEGER, YYYYMMDD)
    - time_key (INTEGER, HHMMSS)
    - day_key (INTEGER, 1-31)
    - week_key (INTEGER, 1-53)
    - month_key (INTEGER, 1-12)
    - quarter_key (INTEGER, 1-4)
    - year_key (INTEGER, YYYY)
    - financial_year_key (INTEGER, YYYY)
    - financial_quarter_key (INTEGER, 1-4: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
    - financial_month_key (INTEGER, 1-12: Apr=1 .. Mar=12)
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    
    # Calendar properties
    year = dt.year
    month = dt.month
    day = dt.day
    
    # Partition keys (SMALLINT)
    partition_year = year
    partition_month = month
    partition_day = day
    
    # Date & Time keys
    date_key = int(dt.strftime("%Y%m%d"))
    time_key = int(dt.strftime("%H%M%S"))
    
    day_key = day
    # ISO week number
    week_key = dt.isocalendar()[1]
    month_key = month
    quarter_key = (month - 1) // 3 + 1
    year_key = year
    
    # Indian Financial Year: Starts April 1st
    if month >= 4:
        financial_year_key = year
        financial_quarter_key = (month - 4) // 3 + 1
        financial_month_key = month - 3
    else:
        financial_year_key = year - 1
        financial_quarter_key = 4
        financial_month_key = month + 9
        
    return {
        "partition_year": partition_year,
        "partition_month": partition_month,
        "partition_day": partition_day,
        "date_key": date_key,
        "time_key": time_key,
        "day_key": day_key,
        "week_key": week_key,
        "month_key": month_key,
        "quarter_key": quarter_key,
        "year_key": year_key,
        "financial_year_key": financial_year_key,
        "financial_quarter_key": financial_quarter_key,
        "financial_month_key": financial_month_key,
    }
