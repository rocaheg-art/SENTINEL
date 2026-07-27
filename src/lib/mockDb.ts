export const MOCK_FUENTES = [
  {
    "agregado_por": "Mauricio",
    "categoria_raiz": "Medio Informativo",
    "creado_en": "Thu, 16 Jul 2026 10:23:13 GMT",
    "duplicado": 0,
    "enlace_valido": 1,
    "estado": "Querétaro",
    "estado_validacion": "validado",
    "id": 1,
    "municipio": "Corregidora",
    "nombre": "AlertaQro Noticias Queretaro",
    "pagina_activa": 1,
    "pais": "México",
    "subcategoria": "Portal Digital",
    "tipo_especifico": "Noticias Estatales",
    "tipo_fuente": "Medio",
    "url_facebook": "https://www.facebook.com/alertaqro?locale=es_LA",
    "url_web": "http://www.alertaqronoticias.com/"
  },
  {
    "agregado_por": "Mauricio",
    "categoria_raiz": "Medio Informativo",
    "creado_en": "Thu, 16 Jul 2026 10:23:13 GMT",
    "duplicado": 0,
    "enlace_valido": 1,
    "estado": "Querétaro",
    "estado_validacion": "validado",
    "id": 2,
    "municipio": "Querétaro",
    "nombre": "Criptica Noticias Queretaro",
    "pagina_activa": 1,
    "pais": "México",
    "subcategoria": "Portal Digital",
    "tipo_especifico": "Noticias Locales",
    "tipo_fuente": "Medio",
    "url_facebook": "https://www.facebook.com/CripticaNoticias/about?locale=es_LA",
    "url_web": "http://www.criptica.com.mx/"
  }
];

export const MOCK_CATEGORIAS = {
  "nivel1": [
    { "id": 1, "nombre": "Gobierno", "nivel": 1 },
    { "id": 2, "nombre": "Medio Informativo", "nivel": 1 },
    { "id": 3, "nombre": "Comunidad / Opinión", "nivel": 1 }
  ],
  "nivel2": [
    { "id": 10, "nombre": "Dependencia Estatal", "nivel": 2, "id_padre": 1 },
    { "id": 11, "nombre": "Dependencia Municipal", "nivel": 2, "id_padre": 1 },
    { "id": 20, "nombre": "Portal Digital", "nivel": 2, "id_padre": 2 },
    { "id": 21, "nombre": "Prensa Escrita", "nivel": 2, "id_padre": 2 },
    { "id": 30, "nombre": "Grupo Vecinal", "nivel": 2, "id_padre": 3 }
  ],
  "nivel3": [
    { "id": 100, "nombre": "Protección Civil Estatal", "nivel": 3, "id_padre": 10 },
    { "id": 101, "nombre": "Protección Civil Municipal", "nivel": 3, "id_padre": 11 },
    { "id": 102, "nombre": "Policía Municipal", "nivel": 3, "id_padre": 11 },
    { "id": 140, "nombre": "Noticias Estatales", "nivel": 3, "id_padre": 20 },
    { "id": 141, "nombre": "Noticias Locales", "nivel": 3, "id_padre": 20 },
    { "id": 180, "nombre": "Reporte Vial", "nivel": 3, "id_padre": 30 }
  ]
};
