Versión 1.0 · 24 de septiembre de 2026 · Guía de operación para Liliana (plan de octubre, sección 12, traspaso).

Todo lo que aparece aquí se hace desde `/admin` con tu usuario y contraseña. No hace falta tocar código ni pedirle nada a Óscar, salvo lo que se indica al final.

## Las cinco operaciones

### 1. Crear una campaña de encuentro

1. Entra a **Campañas de encuentro** (`/admin/campaigns`).
2. Escribe el nombre del encuentro, el precio de campaña (propuesto 98.900), el umbral de personas (propuesto 3), los cupos promocionales (propuesto 3) y las condiciones visibles. Marca «Permitir regalo con esta tarifa» solo si quieres que ese encuentro admita regalos con el precio de campaña.
3. Pulsa «Crear campaña». La tarjeta muestra el enlace `/encuentros/E-XXXXXXXX`. Genera el QR con ese enlace, después de abrirlo tú misma en el móvil.
4. En el encuentro, la gente se registra gratis desde el enlace. Verás «Registrados» y la lista de personas en la tarjeta.
5. Cuando compruebes el grupo, pulsa «Activar campaña». Si no escribes fecha de cierre, la oferta dura 48 horas. Si no se alcanzó el umbral y aun así quieres abrirla, marca la casilla «Activar aunque no se alcance el umbral».
6. Avisa a las personas registradas (mensaje de la sección 5 del plan) con el mismo enlace. Solo el WhatsApp o correo con el que se registraron obtiene la tarifa.
7. «Cerrar campaña» la termina antes de tiempo. Una reserva ya hecha conserva su precio.

### 2. Verificar un pago

1. La persona reserva en `/agenda`, ve la llave Bre-B, el valor y su código, y te escribe por WhatsApp.
2. Comprueba el ingreso en la cuenta. Una captura de pantalla no confirma.
3. En **Agenda** (`/admin`), en la fila de la reserva, pulsa «Confirmar pago». Solo entonces la cita queda confirmada y la persona lo ve en su página de estado.
4. Si el plazo de 24 horas venció antes del pago, el horario pudo liberarse. Crea la reserva a mano (operación 3) con «Pago verificado» marcado.

Regalos: la venta se confirma en **Regalos** (`/admin/gifts`) con «Pago verificado» sobre la orden, no sobre una reserva.

### 3. Agendar o reagendar a mano

1. En **Agenda**, sección «Reserva manual»: nombre, canal, contacto con indicativo (+57…), fecha y hora de Colombia, precio.
2. Marca «Pago verificado: crear confirmada» solo si ya viste el ingreso.
3. Si es un regalo pagado, escribe el código del bono (RG-…): la reserva queda confirmada sin precio y el bono pasa a canjeado.
4. Para reagendar: cancela la reserva actual (botón «Cancelar» en la fila) y crea la nueva. Si era un regalo, cancelar devuelve el bono a «pagado» y la persona puede elegir otra fecha con su mismo enlace.
5. Si la hora choca con otra reserva, el sistema no la crea y te lo dice.

### 4. Entregar el informe

1. Después de la sesión, abre la reserva (clic en el código) y marca «Sesión realizada».
2. Escribe el resumen en el editor (arranca con la plantilla del guion). Guárdalo como borrador o revisado mientras trabajas.
3. Cuando esté listo, guárdalo como **aprobado**: solo entonces la persona lo ve en su página `/agenda/AV-XXXXXX`. Si vuelves a guardarlo como borrador, desaparece de su página.
4. La sección «Entregas pendientes» de la agenda muestra las sesiones realizadas sin resumen aprobado; «Seguimiento del día 14», los seguimientos pendientes.

### 5. Pausar y reanudar la oferta

1. En **Agenda**, al final, está «Reservas públicas». Pulsa «Pausar reservas» cuando no quieras vender (viaje, agenda llena, cambio de precio).
2. Mientras está en pausa, `/agenda` muestra un aviso y el botón de WhatsApp; no aparece ningún horario. Las reservas ya hechas y el admin siguen funcionando.
3. «Reanudar reservas» vuelve a mostrar la agenda al instante.

Para cerrar días concretos o abrir una hora extra (por ejemplo una mañana para España), usa «Excepciones de disponibilidad» en la misma página.

## Qué puedes cambiar sin código y qué no

Sin código, desde `/admin`:

- Campañas: crear, activar, cerrar, precio, umbral, cupos, condiciones, si admite regalo.
- Reservas: confirmar, cancelar, crear a mano, marcar formulario, sesión y seguimiento, escribir y aprobar el informe.
- Regalos: crear órdenes, marcar pago, cancelar, reembolsar, editar la dedicatoria.
- Intereses: marcar contactado o cerrado, convertir una consulta de regalo en orden.
- Disponibilidad: cerrar días u horas, abrir horas extra, pausar o reanudar las reservas.
- Exportar: los cuatro archivos CSV de abajo.

Necesitan un cambio de código (pídeselo a Óscar):

- Textos públicos: nombres de servicios, descripciones, precio general (149.900), duración, copias de portada y de las páginas Yo, Nosotros, Celebremos, Empresas, Regalar.
- Activar un servicio nuevo (Mi Camino, Mi Huella, etc.) o pausar Mi Mapa 729 en el catálogo.
- La regla semanal base (lunes a jueves 18:00) y la duración protegida.
- La llave Bre-B y su nombre (variables `PAYMENT_BREB_KEY` y `PAYMENT_BREB_HOLDER` en Vercel: Óscar las cambia sin desplegar código, pero no están en `/admin`).
- Los textos legales (`/terms`, `/privacy`) y sus marcadores por confirmar.
- Los avisos automáticos por correo o WhatsApp: no existen todavía; cada mensaje lo envías tú.

## Exportar y respaldar (una vez por semana)

Con la sesión de admin abierta, descarga:

- `/admin/export/bookings` (reservas)
- `/admin/export/interests` (intereses)
- `/admin/export/campaigns` (campañas)
- `/admin/export/gifts` (regalos)

Guárdalos en tu carpeta privada. Contienen datos personales de clientes: no los compartas ni los subas a un grupo. Las horas van en hora de Colombia.

## Si algo falla

- **`/agenda` muestra solo WhatsApp y no está en pausa:** la base de datos no responde. Atiende por WhatsApp y avisa a Óscar. Nada se pierde: no se muestran horarios simulados.
- **Un formulario dice «No pudimos guardar tu registro»:** la persona ve el enlace de WhatsApp; anótala tú. Avisa a Óscar si se repite.
- **Una campaña no se activa:** revisa el aviso en la página: umbral no alcanzado (marca la casilla), fecha de cierre pasada, o campaña ya cerrada.
- **Un bono dice «ya fue canjeado» y no debería:** busca la reserva en Agenda por el nombre; si está cancelada, el bono ya volvió a «pagado». Si no, cancélala y la persona podrá agendar de nuevo.
- **Accesos:** el usuario y la contraseña de `/admin`, la llave Bre-B y las claves de Vercel y Neon los guarda Óscar en el gestor de contraseñas de la empresa. No los escribas en chats ni en vídeos.

## Pendiente, a propósito

- Encuesta al cliente después de la sesión: por ahora se envía a mano (preguntas en el guion). Se decidió aplazarla.
- Boletín, envío automático de bonos y avisos automáticos: posteriores al lanzamiento.
- Airtable: no está conectado; esta base de datos y los CSV son el registro.
