# PLAN: Armado de CV y muestras de trabajo en el alta

**Fuente:** documentos del cliente «armado de cv.docx» y «Documento sin título.docx» (tienen el mismo contenido), más un pedido nuestro: subir muestras de trabajos al registrarse.
**Estado:** Borrador. Falta escribir la SPEC y aprobarla antes de implementar.

---

## 1. Qué hay hoy (verificado en el código)

| Qué | Dónde | Relación con el pedido |
| --- | --- | --- |
| Alta del oferente en 4 pasos (actividad, datos personales, identidad, revisión) | `src/components/ProfessionalOnboardingForm.tsx`, `src/app/api/onboarding/route.ts` | Ya pide foto de perfil, nombre legal, teléfono, fecha de nacimiento con `type="date"`, CUIL, domicilio y localidad. El email ya está verificado. |
| Tilde «¿Querés recibir ofertas en relación de dependencia?» | `RegisterForm.tsx`, alta del pro, `pro/mi-perfil` (`OfertasDependencia`), listado en `admin/page.tsx` | Es el lugar natural del CV: hoy se guarda que la persona quiere ofertas, pero no se guarda ningún dato para evaluarla. |
| Muestras de trabajos (`WorkSample` + `WorkSampleImage`, hasta 24 muestras de 1 a 5 fotos) | `prisma/schema.prisma`, `src/app/api/pro/trabajos/route.ts`, `components/pro/TrabajosParticulares.tsx`, `components/MuestraTrabajos.tsx` | Ya existen, pero el endpoint exige perfil **aprobado** (`professionalStatus !== "approved"` → 403). En el alta todavía no se pueden cargar. |
| Subida de archivos | `src/lib/uploads.ts` (públicos, valida magic bytes), `src/lib/kyc.ts` (privados, cifrados) | Las fotos de muestras van por `uploads`. El CV es un dato personal y va por la carpeta privada, igual que las matrículas. |

---

## 2. Ítems del cliente: el CV en 13 pasos

Se arma como un formulario por pasos, con barra de progreso, borrador guardado y botones «Atrás / Continuar». Los pasos marcados con (#) en el documento se toman como **obligatorios**; el resto es opcional.

### Paso 1. Foto
- [ ] Foto de perfil. Si la persona ya tiene una (`User.avatarUrl`), se reusa y se puede cambiar.

### Paso 2. Datos personales (#)
- [ ] Nombre
- [ ] Apellido
- [ ] Fecha de nacimiento con calendario. La edad se calcula sola.
- [ ] ¿Con qué sexo te identificás? Masculino / Femenino / Otro
- [ ] Correo electrónico (viene precargado de la cuenta)
- [ ] Teléfono celular
- [ ] Dirección
- Si la persona ya hizo el alta de oferente, se precargan nombre, teléfono, fecha y domicilio del KYC.

### Paso 3. Formación académica (#)
- [ ] Nivel educativo más alto: Primario / Secundario / Terciario / Universitario / Posgrado
- [ ] Lista de estudios: título o carrera, institución, año de inicio y estado (Completo / En curso / Incompleto)
- [ ] Botón «Agregar otro estudio»

### Paso 4. Cursos y capacitaciones
- [ ] Lista: nombre del curso, institución, año de realización
- [ ] Botón «Agregar otro curso»

### Paso 5. Herramientas informáticas
- [ ] Excel, Word, PowerPoint y Outlook, cada una con nivel Básico / Intermedio / Avanzado (o «No uso»)
- [ ] Texto libre: «¿Usás algún software específico de tu trabajo?» (SAP, Tango, Bejerman, AutoCAD, SolidWorks, Photoshop, CRM, ERP…)

### Paso 6. Idiomas
- [ ] Lista: idioma y nivel (Básico / Intermedio / Avanzado / Nativo)
- [ ] Botón «Agregar otro idioma»

### Paso 7. Disponibilidad
El documento no le pone número ni título; en el resumen final figura como «Disponibilidad».
- [ ] ¿Tenés disponibilidad para viajar? Sí / No / Ocasionalmente
- [ ] ¿Tenés licencia de conducir? Sí / No. Si dice Sí: ¿qué categoría?
- [ ] ¿Tenés vehículo propio? Sí / No

### Paso 8. Situación laboral actual (#)
- [ ] ¿Estás trabajando actualmente? Sí / No

### Paso 9. Experiencia laboral (#)
- [ ] ¿Tenés experiencia laboral previa? Sí / No. Si dice No, se saltea la lista.
- [ ] Lista de experiencias: empresa, puesto, fecha de ingreso y egreso, «¿Es tu trabajo actual?» (si está tildado, no se pide fecha de egreso), principales responsabilidades
- [ ] ¿Tuviste personas a cargo? Sí / No. Si dice Sí, una breve descripción.
- [ ] Botón «Agregar otra experiencia laboral»

### Paso 10. Modalidad de trabajo deseada (#)
- [ ] Modalidad: Presencial / Remoto / Híbrido / Indistinto
- [ ] Jornada: Completa / Media / Ambas

### Paso 11. Perfil profesional (#)
- [ ] «Contanos brevemente sobre vos»: texto de 50 a 1000 caracteres, con la ayuda «Resumí tu experiencia, fortalezas, conocimientos y objetivos profesionales».

### Paso 12. Adjuntar CV (#)
- [ ] CV actualizado. **Formatos (el cliente nos pide definirlos): PDF, DOC y DOCX, hasta 5 MB.**
  - Se valida el tipo real por los primeros bytes: PDF `%PDF-`, DOCX `PK` (zip), DOC `D0 CF 11 E0`.
  - Se guarda en la carpeta privada (`kyc.ts`), no en `public/uploads`: un CV tiene DNI, dirección y teléfono.
  - Solo lo descarga administración con sesión de admin, como los documentos de KYC.
- Pendiente de confirmar: el documento lo marca como obligatorio, pero quien completó los 11 pasos ya tiene un CV armado. Proponemos que el adjunto sea **opcional** (ver decisión 3).

### Paso 13. Confirmación (#)
- [ ] Resumen con un ✅ por sección: datos personales, formación, cursos, herramientas, idiomas, disponibilidad, experiencia, preferencias y CV adjunto. Cada sección tiene «Editar», que vuelve a ese paso.
- [ ] Botón «Finalizar postulación»

### Preguntas filtro (el cliente las recomienda al final)
- [ ] ¿Cuántos años de experiencia tenés en tu profesión?
- [ ] ¿Lideraste equipos de trabajo?
- [ ] ¿Cuántas personas tuviste a cargo?
- [ ] ¿Tenés experiencia en puestos de supervisión o gerencia?
- [ ] ¿Estás dispuesto a viajar? → **ya respondida en el paso 7**, no se vuelve a preguntar
- [ ] ¿Tenés movilidad propia? → **paso 7** (vehículo propio)
- [ ] ¿Cuál es tu nivel de Excel? → **paso 5**
- [ ] ¿Cuál es tu nivel de inglés? → **paso 6** (si no cargó inglés, se toma como «No»)

Las cuatro que se repiten no se vuelven a preguntar: se guardan como campos propios para poder filtrar por ellas.

### Admin: para qué le sirve al cliente
- [ ] En el listado de «Ofertas en relación de dependencia» de `/admin`, una columna «CV» (completo, incompleto o sin cargar) y un botón para verlo completo.
- [ ] Filtros: localidad, nivel educativo, años de experiencia, modalidad, jornada, viajar, movilidad, licencia, Excel, inglés, si lideró equipos.
- [ ] Ficha del candidato con todo el CV y la descarga del adjunto.
- [ ] Exportar el listado filtrado a CSV.

---

## 3. Pedido nuestro: muestras de trabajos en el registro (opcional)

- [ ] En el alta del oferente se agrega un paso **«Muestras de tus trabajos (opcional)»** entre «Actividad» y «Datos personales». El alta pasa de 4 a 5 pasos.
- [ ] Se usa la misma estructura que ya existe: cada muestra tiene título, descripción opcional y de 1 a 5 fotos.
- [ ] Botón «Agregar otra muestra». Hasta **6 muestras en el alta**; después, desde Mi perfil, se completan hasta las 24 de siempre.
- [ ] Botón visible **«Saltear este paso»**: el «Continuar» funciona con cero muestras y `validateStep()` no pide nada.
- [ ] En la revisión final: «Muestras: 3 cargadas» o «Sin muestras (podés sumarlas después)».
- [ ] **Backend:** `POST /api/pro/trabajos` hoy rechaza a quien no está aprobado. Se habilita también a quien tiene perfil `pending` o `changes_requested`, o las muestras viajan en el mismo envío del alta. Recomendamos la primera opción: cada muestra se guarda al cargarla y no se pierde si falla el envío final.
- [ ] Las muestras de un perfil pendiente **no se ven en público** hasta que se aprueba: el perfil público ya filtra por aprobado.
- [ ] Administración las ve en la revisión del perfil, junto al KYC, y puede borrar una foto inapropiada.
- [ ] Las fotos se suben de a una con la barra de progreso y la compresión que ya hay en `uploads.ts`. Como el borrador local no guarda archivos, se avisa que las fotos ya quedan guardadas en el servidor.
- Este paso queda solo en el alta de Ofrezco. No va en el registro común de cliente, porque las muestras son del perfil del oferente.

---

## 4. Diseño técnico propuesto

**Datos (Prisma).** Un modelo `Curriculum` 1 a 1 con `User` (cualquier persona puede postularse, sea oferente o no):
- Campos escalares: nombre, apellido, nacimiento, sexo, teléfono, dirección, nivel educativo, nivel de Excel, Word, PowerPoint y Outlook, software específico, viajar, licencia y categoría, vehículo, trabaja actualmente, tiene experiencia, modalidad, jornada, perfil profesional, años de experiencia, lideró equipos, personas a cargo, supervisión o gerencia, CV adjunto (archivo, tipo, tamaño), `completedAt`, `updatedAt`.
- Listas como modelos hijos (`CvEstudio`, `CvCurso`, `CvIdioma`, `CvExperiencia`) para poder filtrar por ellas desde admin. Hay que agregar `onDelete: Cascade`.
- La baja de cuenta (`src/lib/baja-cuenta.ts`) borra también el archivo del CV.

**Rutas.**
- Página nueva `/mi-cv` (asistente de 13 pasos), con acceso desde: el registro, cuando se tilda «ofertas en relación de dependencia»; el alta del oferente, con el mismo tilde; y Mi perfil (`OfertasDependencia`), con el botón «Completar / editar mi CV».
- `PUT /api/cv` guarda paso por paso (autoguardado), así un corte no hace perder nada.
- `POST /api/cv/adjunto` y `GET /api/admin/cv/[userId]/adjunto` (solo admin, `no-store`).

**Reglas puras** (validar cada paso, calcular la edad, calcular «completo») en `src/lib/curriculum.ts`, con tests en `tests/`.

**Mobile.** Un paso por pantalla, botones grandes, selector de fecha nativo y listas que se pliegan. Se revisa contra `docs/MOBILE_GUIDELINES.md`.

---

## 5. Orden de implementación

1. **Muestras en el alta**: es chico y no depende de nada. Se abre el endpoint a perfiles pendientes, se agrega el paso al formulario y se muestran en la revisión de admin.
2. **Modelo `Curriculum` y `src/lib/curriculum.ts`** con tests.
3. **Asistente `/mi-cv`**, pasos 1 a 11, con autoguardado.
4. **Adjunto del CV** (paso 12) en la carpeta privada.
5. **Resumen, preguntas filtro y «Finalizar postulación»** (paso 13).
6. **Accesos** desde el registro, el alta y Mi perfil.
7. **Admin**: columna, ficha, filtros y CSV.
8. **Baja de cuenta** y prueba completa en el celular.

---

## 6. Decisiones a confirmar con el cliente

1. **¿Quién completa el CV?** Proponemos: solo quien tilda «quiero ofertas en relación de dependencia», sea cliente u oferente. No se agrega al alta de oferente si no lo tilda.
2. **Sexo:** el documento lo pide. Es un dato sensible para una búsqueda laboral; proponemos dejarlo opcional, con la opción «Prefiero no decirlo», y que no se use como filtro en admin.
3. **CV adjunto:** ¿obligatorio u opcional? Proponemos opcional, porque el formulario ya arma el CV.
4. **Formatos:** PDF, DOC y DOCX hasta 5 MB. ¿Le sirve al cliente?
5. **¿Generamos un PDF del CV** a partir del formulario, para quien no tiene uno? Queda fuera de esta etapa, salvo que lo pida.
6. **Muestras en el alta:** ¿6 muestras como tope en el alta te parece bien?
