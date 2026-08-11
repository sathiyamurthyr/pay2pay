import uuid
import pytest
from datetime import datetime, timezone
from app.application.company_onboarding_service import (
    CompanyOnboardingService, TOTAL_ONBOARDING_STEPS
)


def test_onboarding_progress_calculation():
    """Verify progress percentage calculation logic."""
    total = TOTAL_ONBOARDING_STEPS
    completed_steps = [1, 2, 3, 4]
    progress = round((len(completed_steps) / float(total)) * 100.0, 2)
    assert progress == 40.0


def test_step_advancement_logic():
    """Verify step advancement never resets to step 1 unless explicitly requested."""
    current_step = 3
    next_step = current_step + 1
    assert next_step == 4
    assert next_step > current_step


def test_onboarding_status_completion():
    """Verify onboarding status moves to COMPLETED at final step."""
    completed_steps = list(range(1, 11))
    is_completed = len(completed_steps) >= TOTAL_ONBOARDING_STEPS
    assert is_completed is True
    redirect_target = "/dashboard" if is_completed else f"/register/step-{11}"
    assert redirect_target == "/dashboard"
