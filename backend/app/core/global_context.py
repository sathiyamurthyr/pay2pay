import uuid
from contextvars import ContextVar
from typing import Optional, Union

# Defaults pointing to the active Pay2Pay company & tenant
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_COMPANY_ID = uuid.UUID("b1e02b56-7742-4549-a4ef-31f5378f00a8") # SUPER REX PRODUCTS PRIVATE LIMITED

_tenant_id_ctx: ContextVar[uuid.UUID] = ContextVar("global_tenant_id", default=DEFAULT_TENANT_ID)
_company_id_ctx: ContextVar[uuid.UUID] = ContextVar("global_company_id", default=DEFAULT_COMPANY_ID)
_retailer_id_ctx: ContextVar[Optional[uuid.UUID]] = ContextVar("global_retailer_id", default=None)
_user_id_ctx: ContextVar[Optional[uuid.UUID]] = ContextVar("global_user_id", default=None)


class GlobalContextMeta(type):
    @property
    def tenant_id(cls) -> uuid.UUID:
        return _tenant_id_ctx.get()

    @property
    def company_id(cls) -> uuid.UUID:
        return _company_id_ctx.get()

    @property
    def retailer_id(cls) -> Optional[uuid.UUID]:
        return _retailer_id_ctx.get()

    @property
    def user_id(cls) -> Optional[uuid.UUID]:
        return _user_id_ctx.get()


class GlobalContext(metaclass=GlobalContextMeta):
    """
    Centralized Application Global Context.
    Provides context-safe access to tenant_id, company_id, retailer_id, and user_id.
    """

    @classmethod
    def set_context(
        cls,
        tenant_id: Optional[Union[uuid.UUID, str]] = None,
        company_id: Optional[Union[uuid.UUID, str]] = None,
        retailer_id: Optional[Union[uuid.UUID, str]] = None,
        user_id: Optional[Union[uuid.UUID, str]] = None,
    ):
        if tenant_id is not None:
            _tenant_id_ctx.set(tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id)))
        if company_id is not None:
            _company_id_ctx.set(company_id if isinstance(company_id, uuid.UUID) else uuid.UUID(str(company_id)))
        if retailer_id is not None:
            _retailer_id_ctx.set(retailer_id if isinstance(retailer_id, uuid.UUID) else uuid.UUID(str(retailer_id)))
        if user_id is not None:
            _user_id_ctx.set(user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id)))

    @classmethod
    def clear_retailer_context(cls):
        _retailer_id_ctx.set(None)
        _user_id_ctx.set(None)
