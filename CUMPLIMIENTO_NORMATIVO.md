# Cumplimiento normativo y seguridad

## Alcance

Este documento resume el estado tecnico de la copia de trabajo respecto a:

- sistemas informaticos de facturacion y VeriFactu
- privacidad y seguridad de datos sanitarios
- cifrado, trazabilidad y reduccion de superficie de ataque

No sustituye auditoria legal, fiscal o certificacion externa.

## Referencias oficiales

- Real Decreto 1007/2023: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Reglamento (UE) 2016/679 RGPD: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Ley Organica 3/2018 LOPDGDD: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- Ley 41/2002 autonomia del paciente e historia clinica: https://www.boe.es/buscar/act.php?id=BOE-A-2002-22188
- AEPD guia de evaluaciones de impacto: https://www.aepd.es/documento/guia-evaluaciones-de-impacto-rgpd.pdf
- AEAT manual VeriFactu: https://sede.agenciatributaria.gob.es/static_files/Sede/Biblioteca/Manual/Practicos/Manual_facturacion/Manual_Usuario_Verifactu_Accesible.pdf
- AEAT FAQs para desarrolladores VeriFactu: https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/FAQs-Desarrolladores.pdf

## Mejoras aplicadas en esta copia

### Datos sanitarios

- Los datos de salud del paciente dejan de depender del campo JSONB en claro y pasan a almacenarse cifrados en `datos_salud_cifrado`.
- La migracion mueve los datos legacy a almacenamiento cifrado y limpia el campo anterior.
- Recepcion ya no ve `datos_salud` en la respuesta general de paciente.
- Los endpoints especificos de salud quedan restringidos a `admin` y `doctor`.

### Trazabilidad sanitaria

- El audit log registra tambien accesos denegados a rutas sensibles.
- Las entradas de auditoria incluyen metadatos operativos minimos de ruta, metodo y estado.
- El audit log queda encadenado con `previous_hash` y `event_hash` para detectar manipulaciones posteriores.

### Facturacion y SIF

- Las facturas emitidas y selladas no se sobrescriben.
- Los intentos de modificar una factura sellada quedan registrados como evento rechazado.
- Existe flujo formal de factura rectificativa enlazada con la factura original.
- Se registra un evento SIF al emitir, rectificar, anular y rechazar modificaciones.
- Los eventos del SIF quedan encadenados con `previous_hash` y `event_hash`.
- La respuesta de factura ya expone `huella`, `num_registro`, `estado_verifactu` y `enviada_aeat_at`.
- El QR de cotejo AEAT ya no debe mostrarse salvo que el modo sea VeriFactu y conste envio.

### Endurecimiento tecnico

- La copia ya no expone PostgreSQL, backend ni frontend en todas las interfaces del host; queda vinculada a `127.0.0.1`.
- Se elimina el `echo` SQL por defecto para evitar trazas locales con consultas y datos sensibles.
- Los `refresh_token` ya no son puramente estaticos: existen sesiones revocables en servidor con rotacion de nonce, listado y cierre selectivo.

## Estado actual real

### Ya defendible tecnicamente

- cifrado en reposo para datos identificativos y de salud
- control de acceso por rol mas estricto para datos clinicos
- auditoria de accesos y denegaciones en rutas sensibles
- huella encadenada y numeracion de registro en facturas
- base de eventos del sistema informatico de facturacion con cadena de integridad
- rectificativas enlazadas sin sobrescritura de registros emitidos
- menor exposicion de red local y menos fuga por logs
- sesiones revocables y rotadas para reducir impacto de robo de cookie de refresh

### Sigue pendiente para un cumplimiento fuerte de verdad

- remision real a AEAT en modo VeriFactu
- certificado electronico y gestion de respuestas oficiales
- inclusion automatica y verificada de todos los elementos finales de salida exigidos en factura segun el modo operativo aplicado
- politica formal de copias cifradas y restauracion probada
- gestion de secretos fuera de `.env`
- EIPD formal, registro de actividades y procedimientos de brechas
- control de acceso organizativo, doble factor y segregacion de funciones
- politica de conservacion y borrado documentada

## Recomendacion practica

- "No hackeable" no existe en terminos serios; el objetivo realista es defensa en profundidad, cifrado, minima exposicion, registro de evidencias y recuperacion ante incidente.
- Usar ahora mismo `VERIFACTU_MODE=no_verifactu` mientras no exista envio real a AEAT.
- No presentar la app como producto clinico o fiscal plenamente listo hasta completar la remision VeriFactu, la documentacion RGPD sanitaria y una revision externa.
