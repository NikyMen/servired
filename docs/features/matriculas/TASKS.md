# TASKS: Matrícula o certificado con aprobación de administración

**SPEC:** [SPEC.md](SPEC.md) (Aprobada) · **PLAN:** [PLAN.md](PLAN.md) (Aprobado)
**Autorización para implementar:** autorización general del usuario del 2026-09-18 ("sin parar hasta el último").

Leyenda: `[ ]` pendiente · `[x]` hecha y validada · `[!]` bloqueada (con motivo) · `[~]` hecha, con una parte que valida el usuario.

## Tareas

- [x] **T1 · Datos, archivos y lógica**
  - Objetivo: guardar credenciales con su archivo privado y reglas de validación.
  - Alcance: esquema (`Credential`, `Professional.matriculado`); `kyc.ts` (PDF, `saveCredentialFile`); `src/lib/matriculas.ts`; tests.
  - Depende de: —
  - Resuelve: RF-01, RF-02 · CA-02 (lógica)
  - Validación: `db:push`; `pnpm test`.

- [x] **T2 · API y sección del profesional**
  - Objetivo: subir, ver y borrar las propias; nadie más ve los archivos.
  - Alcance: `api/pro/matriculas` y `[id]`; `components/pro/Matriculas.tsx`; `pro/mi-perfil`.
  - Depende de: T1
  - Resuelve: RF-01, RF-02, RF-06, RF-07 · CA-01, CA-02, CA-06
  - Validación: API con sesiones de prueba; HTML del perfil.

- [~] **T3 · Revisión y avisos**
  - Objetivo: administración aprueba o rechaza con motivo; el pro recibe el aviso.
  - Alcance: `revisarCredencial`, `reviewCredentialAction`, pestaña y visor de admin, aviso `matricula`.
  - Depende de: T1
  - Resuelve: RF-03, RF-05 · CA-03, CA-05
  - Validación: script sobre `revisarCredencial`; campanita. Pantalla de admin: la prueba el usuario.

- [x] **T4 · Insignia y baja**
  - Objetivo: "Matriculado" en tarjeta y perfil; los archivos se van con la cuenta.
  - Alcance: `MatriculadoBadge`, `ProCard`, portada, perfil público; `baja-cuenta.ts`.
  - Depende de: T3
  - Resuelve: RF-04, RF-07 · CA-04, CA-07
  - Validación: HTML con y sin aprobadas.

- [x] **T5 · Cierre**
  - Objetivo: build, regresiones y limpieza.
  - Alcance: `pnpm test`, `tsc`, `pnpm build`; datos y archivos de prueba borrados.
  - Depende de: T1–T4
  - Resuelve: regresiones
  - Validación: salida registrada abajo.

## Evidencia

<!-- Resultados reales de cada validación: comando o pasos, resultado observado y fecha. -->

Todo en local el 2026-09-18, contra `next dev`, con copia de `dev.db` antes del
`db push`. Dos profesionales de prueba aprobados (`tmp-g6-*`, rubro Plomería) con
sesión por cookie; al final se dieron de baja con `deleteAccount` (la función real
de la baja), que también borró sus archivos privados.

| Tarea / criterio | Qué se hizo | Resultado observado |
| --- | --- | --- |
| T1 | `db push` (tabla `Credential`, `Professional.matriculado`); tests de `validarCredencial` y `formatoPorContenido`. | Sin pérdida; 21/21. |
| T2 · CA-01 | `POST /api/pro/matriculas` con un PDF real (matrícula, Plomería, número y emisor); lista; HTML de `/pro/mi-perfil`. | 201; la lista la trae `pending`; el perfil muestra la sección y "Pendiente de aprobación". |
| T2 · CA-02 | Texto con `type: application/pdf`; PDF de 9 MB; tipo "diploma"; sin archivo. | 422 "El archivo no coincide con su formato."; 422 "…hasta 8 MB."; 422 "Elegí si es una matrícula o un certificado."; 422 "Adjuntá la foto o el PDF.". Solo quedó guardado el archivo válido. |
| T2 · CA-06 | `GET /api/pro/matriculas/{id}` como dueño, como otro pro y sin sesión; visor de admin sin sesión de admin. | Dueño: 200 `application/pdf` con el contenido; otro pro 404; invitado 401; visor 401. |
| T3 · CA-03 (lógica) | `revisarCredencial` (lo que llama `reviewCredentialAction`) para aprobar, rechazar sin motivo, rechazar con motivo y quitar una aprobación. | Aprobar ok; sin motivo: "Escribí el motivo del rechazo…"; con motivo ok; quitarla deja `matriculado = false`. |
| T3 · CA-05 | Rechazo con motivo; HTML de `/pro/mi-perfil`; `DELETE` de la rechazada y de la aprobada. | Se ve "Motivo: La foto no se lee…"; borrar la rechazada 200; la aprobada 409 "Un documento aprobado lo quita administración…". |
| T3 · aviso | Campanita del pro tras aprobar. | `matricula`: "Matrícula aprobada: tu perfil ya dice "Matriculado"", cuerpo "Rubro: Plomería", enlace a `/pro/mi-perfil`. |
| T3 · pantalla de admin | **No ejecutado por el agente** (pide la contraseña de administración). | Pendiente del usuario: pestaña Matrículas (contador, ver PDF, Aprobar/Rechazar con motivo). `/admin` compila en el build. |
| T4 · CA-04 | HTML de la portada y del perfil público después de aprobar. | Tarjeta con "🎓 Matriculado"; perfil con "🎓 Matriculado · Plomería". Ni el número ni el id del archivo aparecen en la página pública. |
| T4 · CA-07 | Perfil de un pro sin aprobadas, y del mismo pro antes de aprobar. | Sin insignia en los dos. |
| T4 · baja | `deleteAccount` de los pros de prueba. | Archivos privados de prueba: 1 antes, 0 después. |
| T5 | `tsc --noEmit`, `corepack pnpm test`, `rm -rf .next && corepack pnpm build`; logs del dev. | Sin errores; 21/21; build completo; sin errores del servidor. |

**Ajuste durante la validación:** el texto de la insignia se dejó como un solo
string: React lo partía con un comentario (`Matriculado<!-- --> · Plomería`) y una
búsqueda de texto no lo encontraba.
