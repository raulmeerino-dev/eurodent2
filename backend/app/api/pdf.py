"""
Router de generación de PDFs — facturas y presupuestos.
Devuelve application/pdf para descarga directa o visualización en navegador.
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import CurrentUser
from app.database import get_db
from app.models.factura import Cobro, Factura
from app.models.presupuesto import Presupuesto
from app.services.pdf_service import generar_factura_pdf, generar_presupuesto_pdf
from app.services.verifactu_service import (
    _get_nif_emisor,
    generar_identificador_fiscal,
    generar_url_qr_verificacion,
    obtener_estado_remision,
    obtener_leyenda_factura,
)

router = APIRouter()


def _pdf_response(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Factura PDF ──────────────────────────────────────────────────────────────

@router.get("/facturas/{factura_id}")
async def pdf_factura(
    factura_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: CurrentUser,
) -> Response:
    """Genera y devuelve el PDF de una factura."""
    from sqlalchemy import select
    result = await db.execute(
        select(Factura)
        .options(
            selectinload(Factura.paciente),
            selectinload(Factura.entidad),
            selectinload(Factura.forma_pago),
            selectinload(Factura.lineas),
            selectinload(Factura.cobros).selectinload(Cobro.forma_pago),
        )
        .where(Factura.id == factura_id)
    )
    factura = result.scalar_one_or_none()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    pac = factura.paciente

    # El QR debe aparecer en toda factura visual con registro fiscal generado.
    url_qr = None
    if factura.huella:
        url_qr = generar_url_qr_verificacion(
            nif_emisor=_get_nif_emisor(),
            serie=factura.serie,
            numero=factura.numero,
            fecha=factura.fecha,
            total=factura.total,
        )

    cobros_data = [
        {
            "fecha": c.fecha,
            "importe": c.importe,
            "forma_pago": c.forma_pago.nombre if c.forma_pago else "",
        }
        for c in factura.cobros
    ]

    lineas_data = [
        {
            "concepto": l.concepto,
            "concepto_ficticio": l.concepto_ficticio,
            "cantidad": l.cantidad,
            "precio_unitario": l.precio_unitario,
            "iva_porcentaje": l.iva_porcentaje,
            "subtotal": l.subtotal,
        }
        for l in factura.lineas
    ]

    pdf_bytes = generar_factura_pdf(
        serie=factura.serie,
        numero=factura.numero,
        fecha=factura.fecha,
        subtotal=factura.subtotal,
        iva_total=factura.iva_total,
        total=factura.total,
        estado=factura.estado,
        observaciones=factura.observaciones,
        paciente_nombre=pac.nombre if pac else "",
        paciente_apellidos=pac.apellidos if pac else "",
        paciente_num_historial=pac.num_historial if pac else 0,
        paciente_dni=None,  # no incluir DNI en el PDF por RGPD
        paciente_direccion=pac.direccion if pac else None,
        lineas=lineas_data,
        cobros=cobros_data,
        huella=factura.huella,
        url_qr=url_qr,
        identificador_fiscal=generar_identificador_fiscal(factura),
        leyenda_fiscal=obtener_leyenda_factura(factura),
        estado_remision=obtener_estado_remision(factura),
    )

    filename = f"factura_{factura.serie}{factura.numero:04d}_{factura.fecha.strftime('%Y%m%d')}.pdf"
    return _pdf_response(pdf_bytes, filename)


# ─── Presupuesto PDF ──────────────────────────────────────────────────────────

@router.get("/presupuestos/{presupuesto_id}")
async def pdf_presupuesto(
    presupuesto_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: CurrentUser,
) -> Response:
    """Genera y devuelve el PDF de un presupuesto."""
    from sqlalchemy import select
    from app.models.presupuesto import PresupuestoLinea
    from app.models.tratamiento import TratamientoCatalogo
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Presupuesto)
        .options(
            selectinload(Presupuesto.paciente),
            selectinload(Presupuesto.doctor),
            selectinload(Presupuesto.lineas).selectinload(PresupuestoLinea.tratamiento),
        )
        .where(Presupuesto.id == presupuesto_id)
    )
    pres = result.scalar_one_or_none()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    pac = pres.paciente
    lineas_data = []
    for l in pres.lineas:
        importe_neto = float(l.precio_unitario) * (1 - float(l.descuento_porcentaje or 0) / 100)
        lineas_data.append({
            "tratamiento_nombre": l.tratamiento.nombre if l.tratamiento else "—",
            "pieza_dental": l.pieza_dental,
            "caras": l.caras,
            "precio_unitario": l.precio_unitario,
            "descuento_porcentaje": l.descuento_porcentaje,
            "importe_neto": importe_neto,
            "aceptado": l.aceptado,
        })

    total = sum(l["importe_neto"] for l in lineas_data)
    total_aceptado = sum(l["importe_neto"] for l in lineas_data if l["aceptado"])

    pdf_bytes = generar_presupuesto_pdf(
        numero=pres.numero,
        fecha=pres.fecha,
        estado=pres.estado,
        paciente_nombre=pac.nombre if pac else "",
        paciente_apellidos=pac.apellidos if pac else "",
        paciente_num_historial=pac.num_historial if pac else 0,
        doctor_nombre=pres.doctor.nombre if pres.doctor else None,
        lineas=lineas_data,
        total=total,
        total_aceptado=total_aceptado,
        pie_pagina=pres.pie_pagina,
    )

    filename = f"presupuesto_{pres.numero:04d}_{pres.fecha.strftime('%Y%m%d')}.pdf"
    return _pdf_response(pdf_bytes, filename)
