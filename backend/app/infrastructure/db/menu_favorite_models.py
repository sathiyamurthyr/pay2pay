"""
Dynamic Menu, Role-Menu Permission, and Favorite Menu ORM Models.

Adheres strictly to the enterprise reference-ID architecture:
- public.menu (`menu_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY`, `user_type_ref_id` FK)
- public.role_menu_permission (`role_menu_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY`,
  `role_ref_id`, `user_type_ref_id`, `menu_ref_id`, `company_ref_id`)
- public.favorite_menu (`favorite_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY`,
  `company_ref_id`, `retailer_ref_id`, `user_ref_id`, `menu_ref_id`,
  `role_ref_id`, `user_type_ref_id`, `created_at`, `updated_at`)
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MenuModel(Base):
    """Master catalog of navigation menus across Admin, Retailer, Distributor, and SD portals."""

    __tablename__ = "menu"

    menu_ref_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True
    )
    menu_code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    menu_label: Mapped[str] = mapped_column(String(150), nullable=False)
    menu_href: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    menu_category: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    portal_scope: Mapped[str] = mapped_column(String(30), nullable=False, default="RETAILER", index=True)
    user_type_ref_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user_type.user_type_ref_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    parent_menu_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("menu.menu_ref_id", ondelete="SET NULL"), nullable=True
    )
    service_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    parent_service_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    required_permission_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    icon_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    badge_text: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_financial: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class RoleMenuPermissionModel(Base):
    """Maps roles and user types to permitted menus (with optional company override)."""

    __tablename__ = "role_menu_permission"

    role_menu_ref_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    role_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("role.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_type_ref_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user_type.user_type_ref_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    menu_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("menu.menu_ref_id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="CASCADE"), nullable=True, index=True
    )
    can_view: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_favorite: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "uq_role_menu_company",
            "role_ref_id",
            "menu_ref_id",
            text("COALESCE(company_ref_id, 0)"),
            unique=True,
        ),
        {"extend_existing": True},
    )


class FavoriteMenuModel(Base):
    """
    Unified multi-tenant user favorite menus keyed strictly by database reference IDs:
    - company_ref_id (mandatory company boundary)
    - retailer_ref_id (mandatory for retailer users; NULL for admin/staff users)
    - user_ref_id (authenticated user's DB reference ID)
    - user_type_ref_id (1=ADMIN, 2=RETAILER, 3=DISTRIBUTOR, 4=SD)
    - role_ref_id (authenticated user's role ID from public.role)
    - menu_ref_id (selected menu from public.menu)
    """

    __tablename__ = "favorite_menu"

    favorite_ref_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True
    )
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="CASCADE"), nullable=False, index=True
    )
    retailer_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    user_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_type_ref_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user_type.user_type_ref_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    role_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("role.id", ondelete="SET NULL"), nullable=True, index=True
    )
    menu_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("menu.menu_ref_id", ondelete="CASCADE"), nullable=False, index=True
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "ix_favorite_menu_identity",
            "company_ref_id",
            "user_type_ref_id",
            "user_ref_id",
            "retailer_ref_id",
            "is_active",
            "is_deleted",
        ),
        Index(
            "uq_favorite_menu_user_item",
            "company_ref_id",
            "user_type_ref_id",
            "user_ref_id",
            text("COALESCE(retailer_ref_id, 0)"),
            "menu_ref_id",
            unique=True,
        ),
        {"extend_existing": True},
    )
