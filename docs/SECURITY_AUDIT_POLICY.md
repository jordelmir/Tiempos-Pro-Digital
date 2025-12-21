# POLÍTICA DE AUDITORÍA Y TRAZABILIDAD DE SISTEMAS (PHRONT-SEC-001)

**Versión:** 3.1  
**Autoridad:** Arquitectura de Seguridad PHRONT  
**Clasificación:** CONFIDENCIAL / USO INTERNO

---

## 1. PROPÓSITO
Establecer los lineamientos técnicos y operativos para garantizar la **trazabilidad completa**, **integridad no repudiable** y **visibilidad forense** de todas las actividades críticas dentro de la plataforma TIEMPOSPRO.

## 2. ALCANCE
Esta política aplica a:
*   Todos los módulos backend (Kotlin/Edge Functions).
*   Base de datos transaccional (Supabase/Postgres).
*   Interfaces de usuario administrativas y operativas.
*   Todo personal con acceso al sistema (SuperAdmin, Vendedores, Desarrolladores).

## 3. PRINCIPIOS DE ARQUITECTURA "ZERO-TRUST"

### 3.1 Inmutabilidad
Todos los registros de auditoría (`audit_secure.logs`) son de **solo escritura (Append-Only)**.
*   Está prohibido el `UPDATE` o `DELETE` en tablas de auditoría.
*   La base de datos debe aplicar políticas RLS para impedir modificaciones incluso a administradores estándar.

### 3.2 Integridad Criptográfica (Chained Hashing)
Cada evento de auditoría debe contener un hash criptográfico (SHA-256) que incluya:
1.  Los datos del evento actual.
2.  La marca de tiempo precisa.
3.  El hash del evento inmediatamente anterior.

Cualquier ruptura en la cadena de hashes disparará una alerta de seguridad de **Nivel Crítico**.

### 3.3 No Repudio
Cada acción debe estar vinculada inequívocamente a un `actor_id` autenticado o una clave de API del sistema. El registro debe incluir la dirección IP de origen y la huella digital del dispositivo.

---

## 4. EVENTOS AUDITABLES OBLIGATORIOS

El sistema debe capturar automáticamente los siguientes eventos:

| Categoría | Evento | Severidad | Retención |
| :--- | :--- | :--- | :--- |
| **AUTH** | Login Exitoso / Fallido | INFO / WARN | 1 Año |
| **AUTH** | Cambio de Contraseña / MFA | CRITICAL | 2 Años |
| **DATA** | Creación de Usuario | WARNING | 5 Años |
| **DATA** | Modificación de Saldos (Ledger) | CRITICAL | Perpetuo |
| **DATA** | Purga de Datos (System Purge) | FORENSIC | Perpetuo |
| **FIN** | Colocación de Apuesta | INFO | 2 Años |
| **SYS** | Error de Integridad / Hash Mismatch | FORENSIC | 5 Años |

---

## 5. ROLES Y RESPONSABILIDADES

*   **Arquitecto de Seguridad:** Revisa mensualmente la integridad de la cadena de hashes.
*   **SuperAdmin:** Monitorea el dashboard de auditoría semanalmente en busca de anomalías.
*   **Sistema Automatizado:** Ejecuta el worker de auditoría y reporta discrepancias en tiempo real.

## 6. RESPUESTA A INCIDENTES

En caso de detectarse una alteración en los logs de auditoría:
1.  El sistema entrará en modo **LOCKDOWN** (suspensión de retiros/pagos).
2.  Se notificará al Oficial de Seguridad.
3.  Se preservará la imagen actual de la base de datos para análisis forense externo.

---

**Fin del Documento**  
*Aprobado por Phront Maestro - Nov 2025*
