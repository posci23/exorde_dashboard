import type { Dict } from "./en";

/**
 * Spanish translation. Typed as `Dict`, so a missing key or a changed
 * placeholder signature breaks the build rather than silently falling back.
 *
 * Register: neutral Spanish, "tú" throughout (this is a personal console, not
 * enterprise software). API identifiers stay in English — they are literal
 * values sent over the wire.
 */
export const es: Dict = {
  common: {
    refresh: "Actualizar",
    refreshing: "Actualizando…",
    loading: "Cargando…",
    save: "Guardar",
    clear: "Limpiar",
    remove: "Quitar",
    dismiss: "Cerrar",
    yes: "sí",
    no: "no",
    none: "—",
    unlimited: "sin límite",
    optional: "opcional",
    requiresApiKey: "Requiere una clave de API",
    left: (n: string) => `quedan ${n}`,
    language: "Idioma",
  },

  nav: {
    brand: "Exorde",
    product: "Exportación de datos",
    proxiedTo: "Conectado vía",
    overview: { label: "Resumen", hint: "Estado, cola y tu cuota" },
    query: { label: "Consulta", hint: "Construir · previsualizar · exportar" },
    jobs: { label: "Trabajos", hint: "Seguimiento · descarga · historial" },
    reference: { label: "Referencia", hint: "Todas las opciones, campos y límites" },
    settings: { label: "Ajustes", hint: "Clave de API" },
  },

  chips: {
    selectAll: "Seleccionar todo",
    selectMatches: "Seleccionar coincidencias",
    clearListed: "Quitar los listados",
    clearAll: "Quitar todo",
    noneSelected: "Sin selección",
    search: "Buscar…",
    addCustom: "Añadir",
    optionsAria: (label: string) => `Opciones de ${label}`,
    noMatch: (q: string) => `Ninguna opción coincide con “${q}”.`,
    addAsCustom: "Añádela abajo como valor personalizado.",
    removeAria: (label: string) => `Quitar ${label}`,
    maxReached: (max: number) => `Has alcanzado el máximo de ${max}.`,
  },

  ui: {
    helpAria: (field: string) => `Más sobre: ${field}`,
    helpAriaGeneric: "Más sobre este campo",
    readAbout: (topic: string) => `Leer sobre ${topic} en la Referencia`,
    customValue: "Valor personalizado…",
    customValueAria: (unit: string) => `Valor personalizado en ${unit}`,
    customValueAriaPlain: "Valor personalizado",
  },

  overview: {
    title: "Resumen",
    description:
      "Si la API está disponible, si la cola tiene espacio y cuánta cuota te queda.",
    healthError: (msg: string) => `Estado: ${msg}`,
    queueError: (msg: string) => `Cola: ${msg}`,
    quotaError: (msg: string) => `Cuota: ${msg}`,
    needKeyPrefix: "Casi todo esto necesita una clave de API — ",
    needKeyLink: "configura una en Ajustes",
    apiStatus: "Estado de la API",
    clickhouse: "ClickHouse",
    clickhouseHint: "Almacén de publicaciones",
    postgres: "PostgreSQL",
    postgresHint: "Trabajos y cuota",
    s3: "S3",
    s3Hint: "Archivos de exportación",
    yourPlan: "Tu plan",
    unknownPlan: "plan desconocido",
    quotaResets: (when: string) => `La cuota se reinicia el ${when}`,
    exportsToday: "Exportaciones hoy",
    rowsToday: "Filas hoy",
    exportsMonth: "Exportaciones este mes",
    rowsMonth: "Filas este mes",
    addKeyPrefix: "Añade tu clave en ",
    addKeySuffix: " para ver tu plan, tus límites y tu consumo.",
    settings: "Ajustes",
    queueTitle: "Cola de exportación",
    queueDescription: (slots: number) => `Compartida entre todos los clientes · ${slots} espacios`,
    runningNow: "En ejecución",
    capacity: "Capacidad",
    utilization: "Uso",
    acceptingJobs: "Acepta trabajos",
    safeToSubmit: "Puedes enviar",
    waitAndRetry: "Espera y reintenta",
    concurrencyNote: (running: number, inFlight: number) =>
      `Además puedes tener como máximo ${running} trabajos en ejecución y ${inFlight} en curso. Un 503 significa que la cola está llena: espera un poco y vuelve a comprobarlo aquí.`,
    queueNeedsKey: "La capacidad de la cola requiere una clave de API.",
    workflowTitle: "Cómo funciona el flujo",
    workflowDescription: "La previsualización es gratis; solo las exportaciones consumen cuota",
    step1: "1 · Construir y previsualizar",
    step1Text:
      "Ajusta los filtros y obtén un recuento exacto y 100 filas de muestra. No consume cuota.",
    step2: "2 · Exportar",
    step2Text: "Los mismos filtros, ejecutados como trabajo asíncrono. Esto sí consume cuota.",
    step3: "3 · Seguimiento",
    step3Text: "Míralo avanzar por las 7 fases hasta completarse.",
    step4: "4 · Descargar",
    step4Text: (hours: number) =>
      `Enlace firmado, válido ${hours} h. Sincroniza para renovarlo.`,
  },

  query: {
    title: "Consulta",
    description:
      "Responde a las preguntas de abajo que necesites: todas son opcionales salvo una palabra clave o un autor. La previsualizaci\u00f3n es gratis e inmediata; la exportaci\u00f3n ejecuta la misma consulta completa y aparece en Trabajos. Pasa el cursor por cualquier ? para ver una explicaci\u00f3n.",
    examples: "Consultas de ejemplo\u2026",
    loadedPreset: (label: string, desc: string) => `Preajuste cargado \u00ab${label}\u00bb \u2014 ${desc}`,
    issues: (n: number) => `${n} ${n > 1 ? "problemas" : "problema"}`,
    valid: "\u2713 V\u00e1lida",
    showIssues: "Ver qu\u00e9 hay que corregir",
    queryReady: "Esta consulta est\u00e1 lista para ejecutarse",
    previewOnly: "Solo previsualizaci\u00f3n",
    exportOnly: "Solo exportaci\u00f3n",
    preview: "Previsualizar (gratis)",
    previewing: "Previsualizando\u2026",
    previewHint: "Prueba esta consulta gratis",
    startExport: "Iniciar exportaci\u00f3n",
    submitting: "Enviando\u2026",
    exportHint: "Ejecutar la exportaci\u00f3n completa",
    cantPreview: (msg: string) => `No se puede previsualizar esta consulta: ${msg}`,
    cantExport: (msg: string) => `No se puede exportar esta consulta: ${msg}`,
    previewResult: "Resultado de la previsualizaci\u00f3n",
    matchingPosts: "Publicaciones coincidentes",
    matchingPostsHint: "Filas que tendr\u00eda la exportaci\u00f3n completa",
    queryTime: "Tiempo de consulta",
    estSize: "Tama\u00f1o estimado",
    sampleRows: (n: number) => `Filas de muestra (${n})`,
    sampleRowsHint: "Muestra gratuita: la exportaci\u00f3n devuelve todas las filas coincidentes",
    colPosted: "Publicado",
    colPlatform: "Plataforma",
    colLang: "Idioma",
    colSentiment: "Sentimiento",
    colContent: "Contenido",
    hide: "Ocultar",
    filtersApplied: "Filtros aplicados por la API",
  },

  builder: {
    keywordsTitle: "\u00bfQu\u00e9 palabras deben aparecer?",
    keywordsLabel: "las palabras clave",
    keywordsHelp: (groups: number, terms: number) =>
      `Hasta ${groups} grupos de ${terms} t\u00e9rminos. Usa "comillas dobles" para una frase exacta; termina con * para buscar por prefijo.`,
    groupOperatorLabel: "\u00bfLa publicaci\u00f3n debe cumplir todos los grupos?",
    groupOperatorHelp:
      "AND es m\u00e1s estricto: la publicaci\u00f3n tiene que cumplir todos los grupos. \u00dasalo para cruzar dos temas, p. ej. grupo 1 = t\u00e9rminos de cripto, grupo 2 = t\u00e9rminos de regulaci\u00f3n.",
    andHint: "Debe cumplir todos los grupos",
    orHint: "Puede cumplir cualquier grupo",
    matchAny: "Coincide con cualquier t\u00e9rmino del grupo",
    matchAll: "Coincide con todos los t\u00e9rminos del grupo",
    groupN: (n: number) => `Grupo ${n} \u00b7 coincidencia`,
    termsCount: (n: number, max: number) => `${n} / ${max} t\u00e9rminos`,
    noGroups:
      "Sin grupos de palabras clave. Solo se permite si defines un filtro selectivo en \u00ab\u00bfQu\u00e9 autores o publicaciones concretas?\u00bb.",
    addGroup: "A\u00f1adir grupo de palabras",
    matchModeLabel: "\u00bfCon qu\u00e9 precisi\u00f3n deben coincidir los t\u00e9rminos?",
    matchModeHelp:
      "R\u00e1pido solo busca palabras completas, as\u00ed que \u00abBTC\u00bb no aparecer\u00e1 dentro de \u00ab#BTCUSD\u00bb. Seguro recorre el texto car\u00e1cter a car\u00e1cter y s\u00ed las encuentra, con un coste 5\u201310\u00d7 mayor.",
    fast: "R\u00e1pido",
    fastHint: "Coincidencia por \u00edndice de tokens: 10\u201320\u00d7 m\u00e1s r\u00e1pido",
    safe: "Seguro",
    safeHint: "B\u00fasqueda por subcadena para palabras parciales y c\u00f3digos cortos",
    safeNote:
      "El modo seguro encuentra palabras parciales y c\u00f3digos cortos como BTC, pero es 5\u201310\u00d7 m\u00e1s lento.",
    fastNote:
      "El modo r\u00e1pido busca palabras completas. Cambia a Seguro si tus t\u00e9rminos son c\u00f3digos cortos o fragmentos.",

    timeTitle: "\u00bfCu\u00e1ndo se escribieron las publicaciones?",
    timeLabel: "el intervalo de fechas",
    timeHelp: (max: number, perDay: number) =>
      `Las fechas son UTC. El intervalo m\u00e1ximo es de ${max} d\u00edas, o ${perDay} d\u00edas si defines un tope diario.`,
    notBefore: "No antes de",
    notBeforeHelp:
      "Las horas son UTC, no tu reloj local. Una publicaci\u00f3n escrita a las 23:00 en Madrid cuenta aqu\u00ed como las 21:00 o las 22:00 seg\u00fan la \u00e9poca del a\u00f1o.",
    notAfter: "No despu\u00e9s de",
    notAfterHelp:
      "D\u00e9jalo en \u00abahora\u00bb para una ventana m\u00f3vil. Exorde indexa las publicaciones en cuesti\u00f3n de minutos, as\u00ed que la \u00faltima hora puede estar a\u00fan incompleta.",
    span: "Intervalo:",
    spanDays: (n: string) => `${n} d\u00edas`,
    spanOverLimit: (span: string, max: number, perDay: number) =>
      `El intervalo de ${span} d\u00edas supera el l\u00edmite de ${max} d\u00edas. Define un tope de filas por d\u00eda en \u00ab\u00bfQu\u00e9 va en el archivo?\u00bb para permitir hasta ${perDay} d\u00edas.`,
    endBeforeStart: "La fecha final es anterior a la inicial.",
    collectedLabel: "\u00bfCu\u00e1ndo lo recopil\u00f3 Exorde?",
    collectedHelp:
      "Son dos relojes distintos: arriba es cu\u00e1ndo public\u00f3 el autor, esto es cu\u00e1ndo lo vio Exorde. Difieren cuando se recuperan publicaciones antiguas; la mayor\u00eda puede ignorarlo.",
    collectedOn:
      "Limita a las publicaciones ingeridas en esta ventana; \u00fatil para capturar datos recuperados a posteriori. Requiere las dos fechas de arriba.",
    collectedOff:
      "Define las dos fechas de arriba para filtrar por momento de recopilaci\u00f3n.",
    clearCollected: "Quitar la ventana de recopilaci\u00f3n",

    sourcesTitle: "\u00bfDe d\u00f3nde deben venir las publicaciones?",
    sourcesLabel: "las plataformas y los idiomas",
    sourcesHelp: "Deja cualquiera de estos campos vac\u00edo para no restringir esa dimensi\u00f3n.",
    platforms: "\u00bfQu\u00e9 plataformas?",
    platformsHelp:
      "Coincide exactamente con el dominio de la publicaci\u00f3n, as\u00ed que \u00abreddit.com\u00bb incluye todos los subreddits. Para limitar a un subreddit o canal concreto, usa el campo de URL de abajo.",
    platformsEmpty: "Todas las plataformas (sin filtro de dominio)",
    platformsSearch: "Buscar plataformas\u2026",
    platformsCustom: "Otro dominio, p. ej. example-forum.com",
    platformsFootnote:
      "Exorde cubre m\u00e1s de 200 fuentes. Para subreddits o canales, los patrones de URL suelen funcionar mejor que los dominios.",
    languages: "\u00bfQu\u00e9 idiomas?",
    languagesHelp:
      "Se detecta por publicaci\u00f3n, no por autor. La detecci\u00f3n en publicaciones muy cortas no es fiable, as\u00ed que un filtro estricto de idioma puede descartar coincidencias reales.",
    languagesEmpty: "Todos los idiomas",
    languagesSearch: "Buscar idiomas\u2026",
    languagesCustom: "Otro c\u00f3digo ISO, p. ej. sw",
    languagesFootnote:
      "Se admiten m\u00e1s de 176 c\u00f3digos; la lista muestra los m\u00e1s habituales. Puedes a\u00f1adir cualquier otro directamente.",
    locationLabel: "\u00bfDe d\u00f3nde es el autor?",
    locationHelp:
      "Es la ubicaci\u00f3n de texto libre que la gente escribe en su perfil, no una ubicaci\u00f3n GPS verificada. \u00abParis\u00bb tambi\u00e9n coincide con \u00abParis, Texas\u00bb y \u00abParisian at heart\u00bb.",
    locationNote: (n: number, max: number) =>
      `${n} / ${max} \u00b7 coincide con el campo de ubicaci\u00f3n declarado por el usuario, sin distinguir may\u00fasculas.`,

    peopleTitle: "\u00bfQu\u00e9 autores o publicaciones concretas?",
    peopleLabel: "los autores y los identificadores de publicaci\u00f3n",
    peopleHelp:
      "Son filtros selectivos: cualquiera de ellos permite ejecutar una consulta sin ninguna palabra clave.",
    authors: "\u00bfQui\u00e9n escribi\u00f3 la publicaci\u00f3n?",
    authorsHelp:
      "Nombres de usuario sin la @, separados por comas. Con esto solo ya puedes ejecutar una consulta; no hacen falta palabras clave.",
    nameMatching: "Coincidencia del nombre",
    ignoreCase: "Ignorar may\u00fasculas",
    ignoreCaseHint: "Por defecto",
    exactCase: "May\u00fasculas exactas",
    urlLabel: "\u00bfQu\u00e9 debe contener el enlace?",
    urlHelp:
      "Una subcadena simple del enlace de la publicaci\u00f3n, sin comodines. As\u00ed es como se apunta a un subreddit o a un canal de YouTube concreto, algo que el filtro de plataforma no puede hacer.",
    urlNote:
      "Subcadena de la URL sin distinguir may\u00fasculas: la forma fiable de apuntar a un subreddit o canal.",
    insertExample: "Insertar un ejemplo",
    postIds: "\u00bfAlguna publicaci\u00f3n exacta que recuperar?",
    postIdsHelp:
      "El identificador propio de la plataforma: el n\u00famero al final de un enlace de X, o un c\u00f3digo t1_\u2026 en Reddit. \u00dasalo para volver a descargar publicaciones que ya conoces.",
    postIdsNote: "Vuelve a descargar publicaciones exactas por su ID de plataforma.",
    parentIds: "\u00bfRespuestas bajo qu\u00e9 publicaciones?",
    parentIdsHelp:
      "Indica el ID de una publicaci\u00f3n y obtendr\u00e1s las respuestas que cuelgan de ella en lugar de la publicaci\u00f3n misma; \u00fatil para extraer un hilo completo.",
    parentIdsNote: "Extrae las respuestas y el hilo de una publicaci\u00f3n concreta.",

    advancedTitle: "\u00bfQu\u00e9 hay que descartar?",
    advancedLabel: "las exclusiones y los filtros avanzados",
    excludeWords: "\u00bfQu\u00e9 palabras descartan una publicaci\u00f3n?",
    excludeWordsHelp:
      "Descarta cualquier publicaci\u00f3n que contenga estas palabras. Lo habitual es usarlo contra el spam: \u00abgiveaway, airdrop, follow me\u00bb. Las exclusiones siempre ganan a las coincidencias.",
    addExclusion: "A\u00f1adir grupo de exclusi\u00f3n",
    proximity: "\u00bfQu\u00e9 t\u00e9rminos deben estar cerca?",
    proximityHelp:
      "Exige que dos palabras est\u00e9n cerca, lo que suele indicar que est\u00e1n realmente relacionadas. \u00abbitcoin\u00bb a menos de 5 palabras de \u00abban\u00bb encuentra debate real; esas mismas palabras separadas por 200 palabras, casi nunca.",
    within: "a menos de",
    wordsOf: "palabras de",
    firstTerm: "primer t\u00e9rmino",
    secondTerm: "segundo t\u00e9rmino",
    addProximity: "A\u00f1adir regla de proximidad",
    profile: "\u00bfQu\u00e9 debe cumplir el autor?",
    profileHelp:
      "Filtra por el perfil de X del autor: texto de la biograf\u00eda, n\u00famero de seguidores, verificaci\u00f3n. Al usarlo se descartan las publicaciones de todas las dem\u00e1s plataformas, porque solo X trae estos metadatos.",
    addProfile: "A\u00f1adir filtro de perfil",
    profileNote: (values: number) =>
      `Los campos se combinan con AND; hasta ${values} valores cada uno (OR dentro de un campo). Solo las publicaciones de x.com traen estos metadatos.`,

    outputTitle: "\u00bfQu\u00e9 va en el archivo?",
    outputLabel: "los campos y formatos de salida",
    outputHelp:
      "El formato y los topes de filas solo afectan a las exportaciones: la previsualizaci\u00f3n los ignora y siempre devuelve unas 100 filas de muestra.",
    format: "\u00bfQu\u00e9 formato de archivo?",
    formatHelp:
      "Elige CSV si vas a abrirlo en Excel o Sheets. Elige JSONL si vas a cargarlo con pandas, un script o cualquier cosa que lea l\u00ednea a l\u00ednea.",
    jsonlHint: "Por defecto: ideal para streaming, los campos anidados siguen siendo JSON",
    csvHint: "Excel/Sheets: BOM UTF-8, los arrays se serializan como texto JSON",
    jsonlNote: "Un objeto JSON por l\u00ednea. Lo mejor para vol\u00famenes grandes y uso program\u00e1tico.",
    csvNote: "RFC 4180 con BOM UTF-8 para que Excel lo abra correctamente.",
    rowCap: "\u00bfCu\u00e1ntas filas como m\u00e1ximo?",
    rowCapHelp:
      "Un tope absoluto de filas. D\u00e9jalo vac\u00edo para obtener todas las coincidencias. Las filas cuentan para la cuota de tu plan, as\u00ed que un tope es una red de seguridad barata en una consulta amplia.",
    rows: "filas",
    perDayCap: "\u00bfCu\u00e1ntas filas por d\u00eda?",
    perDayCapHelp:
      "Toma una muestra equilibrada de cada d\u00eda UTC en lugar de dejar que un d\u00eda con mucho movimiento domine. Definirlo tambi\u00e9n ampl\u00eda el intervalo m\u00e1ximo de 30 a 90 d\u00edas.",
    rowsPerDay: "filas por d\u00eda UTC",
    perDayNote: (max: number) =>
      `Muestrea de forma uniforme entre d\u00edas y ampl\u00eda el intervalo m\u00e1ximo a ${max} d\u00edas. Requiere ambas fechas.`,
    fieldsLabel: "\u00bfQu\u00e9 debe contener cada fila?",
    fieldsHelp: (n: number) =>
      `Cada fila puede llevar hasta ${n} columnas, y la mayor\u00eda son puntuaciones generadas por IA. Elegir un preajuste aqu\u00ed define por ti la lista exclude_fields de la API.`,
    cols: (n: number) => `${n} columnas`,
    keeping: "Se conservan",
    andMore: (n: number) => ` +${n} m\u00e1s`,
    allExcluded: "Se excluyen todas las columnas: la exportaci\u00f3n no tendr\u00eda datos.",
    customFields: "\u00bfQu\u00e9 columnas hay que dejar fuera?",
    customFieldsHelp: (n: number) =>
      `Todo lo que marques aqu\u00ed se elimina de cada fila. D\u00e9jalo vac\u00edo para conservar las ${n}.`,
    customFieldsEmpty: (n: number) => `Sin exclusiones \u2014 las ${n} columnas`,
    customFieldsSearch: "Buscar columnas\u2026",
    customFieldsFootnote:
      "La API siempre excluye analysis_source_type, collection_module y collection_client_version.",

    payloadTitle: "\u00bfQu\u00e9 se env\u00eda a la API?",
    payloadSummary: "El JSON exacto que enviar\u00e1 este panel",
    payloadHelp: "\u00dasalo para reproducir la consulta fuera del panel.",
    previewBody: "Cuerpo de previsualizaci\u00f3n",
    exportBody: "Cuerpo de exportaci\u00f3n",
    copyCurl: "Copiar como curl",
    resetAll: "Restablecer todos los filtros",
  },

  jobs: {
    title: "Trabajos",
    description: (hours: number) =>
      `Sigue una exportaci\u00f3n en curso y desc\u00e1rgala. Los enlaces caducan ${hours} h despu\u00e9s de completarse; Sincronizar genera uno nuevo.`,
    monitor: "Seguimiento",
    polling: "Consultando cada 10 s, pasando a 30 s hasta que el trabajo termine",
    pasteId: "Pega un ID de trabajo o elige uno de las tablas de abajo",
    jobIdPlaceholder: "ID del trabajo",
    trackJob: "Seguir trabajo",
    refreshNow: "Actualizar ahora",
    stopWatching: "Dejar de seguir",
    jobId: "ID del trabajo",
    status: "Estado",
    rows: "Filas",
    size: "Tama\u00f1o",
    execution: "Ejecuci\u00f3n",
    downloadReady: "Descarga lista",
    expires: (when: string) =>
      `Caduca ${when} \u00b7 no requiere autenticaci\u00f3n, trata el enlace como informaci\u00f3n sensible`,
    expiresDefault: (hours: number) => `${hours} h despu\u00e9s de completarse`,
    downloadFile: "Descargar archivo",
    syncForLink: "Sincronizar para obtener un enlace nuevo",
    processingPhases: "Fases del procesamiento",
    nothingWatched: "No hay nada en seguimiento.",
    buildAQuery: "Construye una consulta",
    andStartExport: " e inicia una exportaci\u00f3n, o sigue un ID de trabajo arriba.",
    syncedRefreshed: (id: string, until: string) =>
      `${id} sincronizado \u2014 enlace de descarga renovado (v\u00e1lido hasta ${until}).`,
    syncedStatus: (id: string, status: string) => `${id} sincronizado \u2014 su estado es ${status}.`,
    expiryFallback: "su caducidad",
    fetchedFrom: "Obtenido de GET /api/v1/user/exports",
    newQuery: "Nueva consulta",
    clearList: "Vaciar lista",
    monitorRow: "Seguir",
    yourExports: "Tus exportaciones",
    thisBrowser: (n: number) => `Este navegador (${n})`,
    serverHistory: "Historial del servidor",
    sessionNote: "Trabajos iniciados o seguidos desde este navegador, guardados en localStorage",
    historyNote: (user: string, total: number) =>
      `Usuario ${user} \u00b7 ${total} trabajo(s) devuelto(s)`,
    noneTracked: "A\u00fan no hay trabajos seguidos en este navegador.",
    noExports:
      "No se han encontrado exportaciones. Se necesita una clave de API para leer el historial.",
    colCreated: "Creado",
    colCompleted: "Completado",
    colRows: "Filas",
    colMb: "MB",
    colSecs: "Seg",
    watch: "Seguir",
    sync: "Sincronizar",
    download: "Descargar",
  },

  summary: {
    noKeywords: "Sin palabras clave \u2014 necesita un filtro selectivo",
    groups: (g: number, terms: number, joiner: string, safe: string) =>
      `${g} grupo${g > 1 ? "s" : ""} \u00b7 ${terms} t\u00e9rmino${terms > 1 ? "s" : ""}${joiner}${safe}`,
    joiner: (op: string) => ` ${op} entre grupos`,
    safeMode: " \u00b7 modo seguro",
    noDates: "Sin intervalo de fechas",
    range: (start: string, end: string, days: string) => `${start} \u2192 ${end} (${days} d)`,
    collectedSet: " \u00b7 ventana de recopilaci\u00f3n definida",
    platforms: (n: number) => `${n} plataforma${n > 1 ? "s" : ""}`,
    languages: (n: number) => `${n} idioma${n > 1 ? "s" : ""}`,
    locations: (n: number) => `${n} ubicaci\u00f3${n > 1 ? "nes" : "n"}`,
    platformsList: (list: string) => `Plataformas: ${list}`,
    languagesList: (list: string) => `Idiomas: ${list}`,
    usernames: (n: number) => `${n} nombre${n > 1 ? "s" : ""} de usuario`,
    noSources: "Todas las plataformas, todos los idiomas, cualquier lugar",
    noSourceFilter: "Todas las plataformas e idiomas",
    authors: (n: number) => `${n} autor${n > 1 ? "es" : ""}`,
    postIds: (n: number) => `${n} ID${n > 1 ? "s" : ""} de publicaci\u00f3n`,
    parentIds: (n: number) => `${n} ID${n > 1 ? "s" : ""} de publicaci\u00f3n padre`,
    urlPatterns: (n: number) => `${n} patr\u00f3${n > 1 ? "nes" : "n"} de URL`,
    noPeople: "Sin filtro por autor ni por URL",
    exclusions: (n: number) => `${n} grupo${n > 1 ? "s" : ""} de exclusi\u00f3n`,
    proximity: (n: number) => `${n} regla${n > 1 ? "s" : ""} de proximidad`,
    profiles: (n: number) => `${n} filtro${n > 1 ? "s" : ""} de perfil`,
    noAdvanced: "Sin exclusiones, proximidad ni filtros de perfil",
    maxRows: (n: string) => `m\u00e1x. ${n} filas`,
    perDay: (n: string) => `${n}/d\u00eda`,
    fieldsExcluded: (n: number) => `${n} campo${n === 1 ? "" : "s"} excluido${n === 1 ? "" : "s"}`,
  },

  fieldPresets: {
    raw: {
      label: "Solo las publicaciones",
      description: "Texto, autor, enlace, hora e idioma. Sin puntuaciones de IA.",
    },
    sentiment: {
      label: "Publicaciones + sentimiento",
      description: "A\u00f1ade una puntuaci\u00f3n de sentimiento por publicaci\u00f3n, sin desglose de emociones.",
    },
    default: {
      label: "Todo menos los embeddings",
      description:
        "El valor por defecto de la API: todas las columnas de an\u00e1lisis salvo el vector de 1024 n\u00fameros.",
    },
    full: {
      label: "Todo",
      description: "Incluye analysis_embedding: los archivos pasan a ser unas 10\u00d7 m\u00e1s grandes.",
    },
    custom: {
      label: "Elegir los campos yo",
      description: "Elige exactamente qu\u00e9 columnas dejar fuera.",
    },
  },

  datePresets: {
    last24h: "\u00daltimas 24 h",
    last7d: "\u00daltimos 7 d\u00edas",
    last30d: "\u00daltimos 30 d\u00edas",
    last90d: "\u00daltimos 90 d\u00edas",
    custom: "Intervalo personalizado\u2026",
  },

  settings: {
    title: "Ajustes",
    description:
      "Tu clave de API de Exorde. Nunca se expone al navegador: las rutas de API de Next.js la añaden en el servidor.",
    saved:
      "Clave de API guardada en una cookie httpOnly para este navegador (30 días). Para algo permanente, usa .env.local.",
    cleared: "Clave de la cookie eliminada. La clave del entorno, si existe, sigue vigente.",
    connection: "Conexión",
    baseUrl: "URL base",
    envKey: "EXORDE_API_KEY en el entorno",
    configured: "configurada",
    missing: "ausente",
    cookieKey: "Clave en cookie",
    set: "definida",
    notSet: "sin definir",
    readyToCall: "Lista para llamar a la API",
    recommendedTitle: "Recomendado: .env.local",
    recommendedDescription:
      "Crea este archivo en la raíz del proyecto y reinicia npm run dev",
    pasteTitle: "O pega la clave para esta sesión del navegador",
    pasteDescription: "Se guarda como cookie httpOnly · no se vuelve a mostrar",
    saveKey: "Guardar clave",
    clearCookieKey: "Eliminar clave de la cookie",
    authHeader: "Cabecera de autenticación (referencia)",
    keysLookLike: "Las claves tienen la forma",
    keysCannotRetrieve: "y Exorde no permite recuperarlas después de crearlas.",
  },
};
