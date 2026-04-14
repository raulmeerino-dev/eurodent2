import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Consentimiento(UUIDMixin, TimestampMixin, Base):
    """Consentimientos informados firmados por el paciente."""
    __tablename__ = "consentimientos"

    paciente_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_firma: Mapped[date] = mapped_column(Date, nullable=False)
    documento_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    revocado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_revocacion: Mapped[date | None] = mapped_column(Date, nullable=True)

    paciente: Mapped["Paciente"] = relationship("Paciente", back_populates="consentimientos")  # noqa: F821
