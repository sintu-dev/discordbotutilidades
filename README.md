# 🤖 Bot de Discord Profesional: Embeds, Modales, Sugerencias & Utilidades

Un bot modular, escalable y robusto desarrollado con **Discord.js v14** y **Node.js**. Diseñado con soporte híbrido completo para **Slash Commands (`/`)** y **Comandos con Prefijo (`!`)**, formularios emergentes interactivos (**Discord Modals**), componentes visuales (**Buttons**, **Select Menus**) y persistencia local atómica (offline-friendly).

---

## 📁 Estructura del Proyecto

```text
DiscordBot/
├── .env                       # Variables de entorno (Token, Prefijo, IDs)
├── package.json               # Dependencias y scripts
├── README.md                  # Documentación completa
└── src/
    ├── index.js               # Punto de entrada principal con apagado seguro
    ├── config/
    │   └── config.js          # Configuración y variables del entorno
    ├── variables/             # Carpeta centralizada de variables del sistema
    │   ├── colors.js          # Paleta de colores HEX y presets
    │   ├── emojis.js          # Emojis interactivos y de estado
    │   ├── constants.js       # Límites de la API de Discord y rutas DB
    │   ├── messages.js        # Textos y plantillas en español
    │   └── index.js           # Exportador unificado de variables
    ├── database/              # Persistencia atómica de datos (JSON)
    │   ├── index.js           # Gestor de base de datos con auto-recuperación
    │   └── data/              # Archivos de datos (guilds.json, suggestions.json, polls.json)
    ├── components/            # Lógica y gestores de componentes interactivos
    │   ├── embedManager.js    # Panel interactivo en vivo para crear embeds con modales
    │   ├── anuncioManager.js  # Formulario Modal emergente interactivo para redactar anuncios
    │   ├── decirManager.js    # Modal emergente para redactar y enviar mensajes como el bot
    │   ├── suggestionManager.js # Modales, menús de canales y votación de sugerencias
    │   ├── pollManager.js     # Modal emergente de encuestas y barras de votación dinámicas
    │   ├── clearManager.js    # Botones de purga rápida y modal de cantidad personalizada
    │   └── configManager.js   # Dashboard interactivo de configuración y selección de canales
    ├── handlers/              # Cargadores modulares
    │   ├── commandHandler.js  # Carga de comandos híbridos y auto-registro Slash
    │   ├── eventHandler.js    # Carga de eventos de cliente y servidor
    │   └── componentHandler.js# Enrutador central de botones, modales y select menus
    ├── events/                # Eventos de Discord
    │   ├── client/ready.js    # Inicio de sesión y presencia del bot (clientReady)
    │   └── guild/
    │       ├── interactionCreate.js # Ejecución de Slash Commands
    │       ├── messageCreate.js     # Ejecución de Comandos con Prefijo y alias
    │       ├── guildCreate.js
    │       └── guildDelete.js
    ├── commands/              # Comandos organizados por categorías
    │   ├── embeds/            # /embed, /anuncio, /decir
    │   ├── sugerencias/       # /sugerencia, /sugerencia-setup, /sugerencia-admin
    │   ├── utilidad/          # /encuesta, /clear, /config
    │   ├── informacion/       # /help, /ping, /serverinfo, /userinfo, /botinfo
    │   └── owner/             # /reload, /shutdown, /eval
    └── utils/                 # Utilidades generales
        ├── antiCrash.js       # Protección contra cierres inesperados
        ├── logger.js          # Consola profesional con colores y timestamps
        ├── embedBuilder.js    # Auxiliar para embeds estandarizados
        └── permissionChecker.js # Validador de permisos de usuario y bot
```

---

## 🚀 Experiencia 100% Interactiva (Modals, Botones & Menús)

Todos los comandos del bot han sido renovados para que, si no ingresas argumentos, se desplieguen **formularios emergentes (Modals)**, **botones de acción rápida** o **select menus interactivos**:

### 1. 📢 Anuncios Formales (`/anuncio` o `!anuncio`)
- **Modal interactivo:** Despliega formulario emergente con campos: *Título*, *Contenido (obligatorio)*, *Banner URL*, *Miniatura URL* y *Mención*.
- **Prefijo inteligente:** `!anuncio` genera un botón interactivo para abrir el formulario, o puedes escribir `!anuncio #canal Tu mensaje aquí` directamente sin necesidad de barras verticales obligatorias.

### 2. 💬 Decir / Hablar (`/decir` o `!decir`)
- **Modal interactivo:** Permite redactar mensajes directamente en una ventana de texto modal para que el bot los envíe al canal seleccionado.

### 3. 📋 Panel Interactivo de Creación de Embeds (`/embed` o `!embed`)
- Despliega un panel con **vista previa en tiempo real**.
- **✏️ Texto (Título & Contenido):** Modal interactivo.
- **🖼️ Imágenes:** Modal para banner y thumbnail.
- **🎨 Selector de Color:** Menú con presets o modal para código HEX personalizado.
- **👤 Autor & Footer:** Modal para autor y pie de página.
- **📑 Campos Dinámicos (Fields):** Modal para añadir campos inline o normales.
- **📢 Selección de Canal & Envío:** Menú desplegable de canales y botón de publicación.

### 4. 💡 Sistema Completo de Sugerencias (`/sugerencia`, `/sugerencia-setup`, `/sugerencia-admin`)
- **/sugerencia:** Abre un **formulario modal emergente** para escribir la idea y descripción.
- **/sugerencia-setup:** Despliega un **menú interactivo de canales** para configurarlo con un solo clic.
- **/sugerencia-admin:** Panel interactivo de resolución y modal para ingresar motivos.
- Botones en vivo de apoyo 👍, rechazo 👎 y barra de porcentaje visual dinámica (`🟩🟩🟩🟥🟥`).

### 5. 📊 Sistema de Encuestas Comunitarias (`/encuesta` o `!encuesta`)
- **/encuesta:** Abre un **formulario modal** para ingresar la pregunta y hasta 5 opciones personalizadas.
- Botones de votación en tiempo real y actualización dinámica de porcentajes.

### 6. 🧹 Limpieza Rápida del Chat (`/clear` o `!clear`)
- Despliega botones de purga rápida (`[ 5 ]`, `[ 10 ]`, `[ 25 ]`, `[ 50 ]`, `[ 100 ]`) y un botón con **Modal para cantidad personalizada**.

### 7. ⚙️ Dashboard de Configuración (`/config` o `!config`)
- Panel de control completo con **botón modal para cambiar prefijo**, **menú selector para canal de sugerencias** y **menú selector para canal de anuncios**.

### 8. 👤 Información de Usuario (`/userinfo` o `!userinfo`)
- Incluye un **menú desplegable de miembros** (`UserSelectMenu`) para inspeccionar el perfil y roles de cualquier miembro del servidor al instante.

### 9. 📈 Información y Métricas en Tiempo Real (`/ping`, `/serverinfo`, `/botinfo`)
- Incluyen botones interactivos `[ 🔄 Actualizar ]` para refrescar latencias, estadísticas del servidor y consumo de RAM/uptime en caliente.

### 10. 👑 Herramientas de Propietario (`/shutdown`, `/eval`, `/reload`)
- **/shutdown:** Botones interactivos de confirmación de seguridad `[ ⚠️ Confirmar ]` y `[ ❌ Cancelar ]`.
- **/eval:** Modal con editor de código JavaScript multilinea.
- **/reload:** Recarga en caliente en memoria con embed de confirmación.

---

## 💻 Resumen de Comandos

| Comando | Slash | Prefix | Permisos | Modo Interactivo |
| :--- | :--- | :--- | :--- | :--- |
| **Anuncio** | `/anuncio [canal]` | `!anuncio [#canal]` | Gestionar Mensajes | Modal con Título, Contenido, Imágenes y Menciones |
| **Decir** | `/decir [#canal]` | `!decir [#canal]` | Gestionar Mensajes | Modal para redactar el mensaje a enviar |
| **Embed Builder** | `/embed [canal]` | `!embed [#canal]` | Gestionar Mensajes | Panel completo en vivo con modales y menús |
| **Sugerencia** | `/sugerencia` | `!sugerencia` | Todos | Modal para redactar título y propuesta |
| **Setup Sugerencias**| `/sugerencia-setup` | `!sugerencia-setup` | Gestionar Servidor | Menú selector de canales |
| **Moderar Sugerencia**| `/sugerencia-admin` | `!sugerencia-admin` | Gestionar Servidor | Panel interactivo y botones de estado |
| **Encuesta** | `/encuesta` | `!encuesta` | Gestionar Mensajes | Modal para pregunta y hasta 5 opciones |
| **Limpiar Chat** | `/clear` | `!clear` | Gestionar Mensajes | Botones de purga rápida y modal de cantidad |
| **Configuración** | `/config` | `!config` | Gestionar Servidor | Dashboard interactivo con selectores y modales |
| **User Info** | `/userinfo` | `!userinfo` | Todos | Menú desplegable para elegir usuario |
| **Server Info** | `/serverinfo` | `!serverinfo` | Todos | Botón de actualización en vivo |
| **Bot Info** | `/botinfo` | `!botinfo` | Todos | Botón de actualización de métricas |
| **Ping** | `/ping` | `!ping` | Todos | Botón de recálculo en tiempo real |
| **Ayuda** | `/help [cmd]` | `!help [cmd]` | Todos | Menú selector de categorías interactivo |
| **Eval** | `/eval` | `!eval` | Solo Dueño | Modal con editor de scripts |
| **Recargar** | `/reload` | `!reload` | Solo Dueño | Recarga en caliente sin reiniciar |
| **Apagar** | `/shutdown` | `!shutdown` | Solo Dueño | Botones de confirmación de seguridad |

---

## ⚙️ Cómo Iniciar el Bot

```powershell
cd "C:\Users\sintu\Documents\visual\DiscordBot"
npm start
```
