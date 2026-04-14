# Roadmap de Refactorizacion

## Vision

La aplicacion debe evolucionar hacia un producto dental profesional, modular y preparado para cumplimiento en Espana. La ficha del paciente pasa a ser el hub operativo y el sistema se reorganiza en:

- Pacientes
- Gestion
- Agenda
- Listados
- Configuracion
- Cumplimiento SIF / VERI*FACTU

## Principios

- La ficha del paciente es el centro de operacion diaria.
- La facturacion de trabajo diario se lanza desde la ficha del paciente.
- El odontograma se usa solo en presupuestos y planes.
- El historial clinico se mantiene como registro cronologico legible.
- La facturacion fiscal es append-only, trazable y auditable.
- La interfaz debe reducir clics y priorizar claridad operativa.

## Estado actual de la copia

La copia ya incorpora una base importante:

- autenticacion con sesiones revocables
- cifrado de datos sensibles de salud
- endurecimiento de acceso y cabeceras de seguridad
- agenda funcional con base de horarios y excepciones
- ficha de paciente avanzada
- odontograma SVG mas profesional
- libro fiscal append-only con diagnostico de cadena
- pantalla admin de cumplimiento SIF
- PDF de facturas con QR fiscal al inicio

## Huecos pendientes

- remision real a AEAT para VERI*FACTU
- separacion mas estricta por dominios y capas
- mayor cobertura de tests E2E
- consolidacion del modulo de Gestion
- limpieza de deuda tecnica y pantallas heredadas
- auditoria y hardening final para despliegue comercial

## Arquitectura objetivo

### Dominios

- Clinico: pacientes, historia, tratamientos, presupuestos
- Agenda: citas, disponibilidad, gabinetes, huecos
- Facturacion: facturas, cobros, recibos, listados
- SIF: registros fiscales, cadena, remisiones, diagnostico
- Seguridad: usuarios, roles, permisos, auditoria

### Capas

- `domain/`: reglas de negocio y entidades
- `application/`: casos de uso
- `infrastructure/`: persistencia, PDF, servicios externos
- `ui/`: vistas, modulos y componentes

## Backlog por PRs

### PR1

- base de roles, permisos y auditoria
- endurecimiento de accesos a datos clinicos
- logs de acciones criticas

### PR2

- nueva navegacion por modulos
- separacion visible entre Gestion, Configuracion y Cumplimiento
- ocultacion gradual de accesos heredados

### PR3

- ficha de paciente como hub
- accesos a presupuestos, cobros, facturas y documentos desde ficha
- resumen operativo mas claro

### PR4

- facturacion integrada en ficha del paciente
- la vista global de facturacion queda orientada a control y listados

### PR5

- infraestructura SIF y VERI*FACTU
- registros append-only
- cadena de trazabilidad
- QR y declaracion responsable

### PR6

- motor PDF robusto y testeable
- factura, presupuesto, recibo e informes

### PR7

- agenda avanzada por doctor
- plantillas semanales, excepciones, validacion de disponibilidad

### PR8

- odontograma profesional para presupuestos
- snapshots por plan
- historial clinico solo textual y filtrable

### PR9

- listados globales y KPIs
- facturacion, caja, agenda, pendientes y productividad

### PR10

- configuracion avanzada
- series, impuestos, plantillas, clinica y parametros fiscales

### PR11

- limpieza final
- documentacion
- tests de regresion y hardening

## Criterios de aceptacion globales

- se puede trabajar con un paciente sin navegar por pantallas dispersas
- la factura emitida es inalterable y trazable
- la agenda respeta disponibilidad del doctor
- el historial clinico es legible y no mezcla odontograma historico
- la configuracion y el cumplimiento tienen espacio propio en la app
- el producto queda preparado para iterar PR a PR sin reescritura total
