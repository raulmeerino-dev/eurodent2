# Checklist de Produccion y Comercializacion

## Ya reforzado en la copia

- navegacion por modulos mas clara: Pacientes, Gestion, Agenda, Listados, Configuracion y Cumplimiento
- ficha del paciente como hub operativo para presupuestos, cobros y facturacion
- sesiones revocables y refresh token seguro
- cifrado de datos sensibles de salud
- endurecimiento de cabeceras y acceso local en Docker
- agenda con horarios, excepciones y bloqueo fuera de disponibilidad
- libro fiscal append-only con cadena y diagnostico SIF
- PDF de facturas con QR y datos fiscales visibles
- carga diferida de modulos para mejorar tiempo de arranque del frontend
- listados accionables con salto a ficha y agenda

## Imprescindible antes de vender

- remision VERI*FACTU real a AEAT con certificado y gestion de respuestas
- validacion fiscal externa del flujo SIF completo
- revision legal y DPO para RGPD, LOPDGDD y datos de salud
- politicas de backup cifrado y prueba real de restauracion
- rotacion de secretos y credenciales de produccion
- observabilidad: logs centralizados, alertas y trazas de error
- plan de soporte, versionado y actualizaciones
- entorno de despliegue estable con dominio, TLS, copias y monitorizacion

## Checklist tecnico de salida

1. Configurar `.env` de produccion con secretos unicos y hosts permitidos.
2. Desplegar `docker-compose.prod.yml` o empaquetado equivalente.
3. Verificar login, refresh, logout y revocacion de sesiones.
4. Verificar agenda por doctor y bloqueo de citas fuera de horario.
5. Verificar presupuesto -> tratamiento -> cobro -> factura -> PDF.
6. Verificar listados globales y navegacion hacia ficha/agenda.
7. Verificar diagnostico SIF y estado de registros fiscales.
8. Pasar pruebas E2E del circuito critico y prueba manual de restauracion.

## Riesgos que siguen abiertos

- sin AEAT real no se puede declarar cierre fiscal definitivo
- sin auditoria legal externa no debe anunciarse como cumplimiento cerrado al 100%
- sin backup/restauracion probado no esta lista para clinica real
- sin proceso de soporte y actualizacion no esta lista para comercializacion sostenida

## Criterio honesto

La copia esta cada vez mas cerca de producto serio, pero "lista para vender" exige cerrar tanto codigo como operacion, legalidad y soporte. Este documento sirve como puerta de salida real, no como marketing.
