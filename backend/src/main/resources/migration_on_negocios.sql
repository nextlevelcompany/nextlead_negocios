-- Migración y Carga de Catálogo Oficial ON Negocios

-- 1. Asegurar nuevas columnas en tabla productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(30) DEFAULT 'PLAN';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS subcategoria VARCHAR(60);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS velocidad_mbps INT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS equipamiento_incluido TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS telefonia_incluida TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS requiere_ruc20 BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS permite_hardphone BOOLEAN DEFAULT TRUE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS central_virtual_costo NUMERIC(10,2) DEFAULT 59.00;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS es_multisede BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precios_escalonados_json TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS distritos_permitidos TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS provincias_excluidas TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS limite_max_cantidad INT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS documentos_requeridos TEXT;

-- 2. Limpiar registros antiguos
DELETE FROM ai_products_config;
DELETE FROM pedido_detalles;
DELETE FROM venta_detalles;
DELETE FROM compras_detalles;
DELETE FROM producto_composicion;
DELETE FROM productos;
DELETE FROM categorias_producto;

-- Resetear secuencias si existen
ALTER SEQUENCE IF EXISTS categorias_producto_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS productos_id_seq RESTART WITH 1;

-- 3. Insertar Categorías Oficiales ON Negocios
INSERT INTO categorias_producto (id, nombre, descripcion, activo) VALUES
(1, 'Planes Internet LITE', 'Planes de solo Internet 100% fibra óptica simétrica (GPON) al 70% garantizado con IP Fija y Asistencia 24/7 sin Ciberseguridad.', TRUE),
(2, 'Planes Internet PLUS', 'Planes de Internet 100% fibra óptica con Ciberseguridad Virtual Fortinet (Web Filter + IPS) e IP Pública Fija.', TRUE),
(3, 'Planes PLUS + Router Avanzado', 'Planes PLUS con Router Avanzado MikroTik (L009UiGS). Exclusivo RUC 20. Habilita SVAs de VPN y Pools de IP.', TRUE),
(4, 'Planes Business', 'Planes Business con equipamiento empresarial Omada (ER706W). Exclusivo RUC 20 con Ciberseguridad Fortinet e Instalación Gratuita.', TRUE),
(5, 'Servicios Adicionales Recurrentes (SVA)', 'Servicios mensuales adicionales de Redes, VPNs, Pools de IP, Equipamiento Wi-Fi adicional y Central Virtual.', TRUE),
(6, 'Servicios y Cargos de Pago Único', 'Cargos únicos de instalación en horarios especiales, factibilidad previa, cableado de puntos de red y garantía comercial.', TRUE);

SELECT setval('categorias_producto_id_seq', (SELECT MAX(id) FROM categorias_producto));

-- 4. Insertar Catálogo de Productos y Servicios ON Negocios

-- CATEGORÍA 1: Planes Internet LITE
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'PLAN-200-LITE',
    'ON Negocios 200 LITE',
    'Internet 100% Fibra Óptica Simétrica (GPON) 200 Mbps al 70% garantizado con IP Pública Fija y Asistencia 24/7. Exclusivo para Multisedes (mínimo 2 sedes). No disponible en Arequipa, Chiclayo ni Piura.',
    1, 179.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet LITE', 200,
    '1 ONT Wi-Fi 6 (Huawei EG8145X6) + 1 Access Point Wi-Fi 6 (Huawei K562e-10)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 59.00, TRUE,
    '[{"min_sedes":2,"max_sedes":2,"precio":179.00},{"min_sedes":3,"max_sedes":3,"precio":169.00},{"min_sedes":4,"max_sedes":999,"precio":159.00}]',
    NULL, 'AREQUIPA,CHICLAYO,PIURA', NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales'
),
(
    'PLAN-300-LITE',
    'ON Negocios 300 LITE',
    'Internet 100% Fibra Óptica Simétrica (GPON) 300 Mbps al 70% garantizado con IP Pública Fija y Asistencia Técnica Remota 24/7.',
    1, 199.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet LITE', 300,
    '1 ONT Wi-Fi 6 (Huawei) + 1 Access Point (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales'
),
(
    'PLAN-600-LITE',
    'ON Negocios 600 LITE',
    'Internet 100% Fibra Óptica Simétrica (GPON) 600 Mbps al 70% garantizado con IP Pública Fija y Asistencia Técnica Remota 24/7.',
    1, 259.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet LITE', 600,
    '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales'
),
(
    'PLAN-1000-LITE',
    'ON Negocios 1000 LITE',
    'Internet 100% Fibra Óptica Simétrica (GPON) 1000 Mbps al 70% garantizado con IP Pública Fija. Exclusivo para distritos de Miraflores y San Isidro. No disponible en provincias.',
    1, 299.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet LITE', 1000,
    '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 59.00, FALSE, NULL,
    'MIRAFLORES,SAN ISIDRO', 'AREQUIPA,CHICLAYO,PIURA,TRUJILLO,CUSCO,HUANCAYO,PIURA,TODAS_PROVINCIAS', NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales'
);

-- CATEGORÍA 2: Planes Internet PLUS (Fortinet)
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'PLAN-300-PLUS',
    'ON Negocios 300 PLUS',
    'Internet 100% Fibra Óptica 300 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS), IP Pública Fija y Asistencia Técnica 24/7. Central Virtual disponible con costo adicional.',
    2, 249.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet PLUS', 300,
    '1 ONT Wi-Fi 6 (Huawei) + 1 Access Point (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube'
),
(
    'PLAN-400-PLUS',
    'ON Negocios 400 PLUS',
    'Internet 100% Fibra Óptica 400 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS) y Central Virtual Gratuita (S/ 0.00 para 1 línea a solicitud).',
    2, 349.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet PLUS', 400,
    '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 0.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube'
),
(
    'PLAN-600-PLUS',
    'ON Negocios 600 PLUS',
    'Internet 100% Fibra Óptica 600 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS) y Central Virtual Gratuita (S/ 0.00 para 1 línea a solicitud).',
    2, 439.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Internet PLUS', 600,
    '1 ONT Wi-Fi 6 (Huawei) + 3 Access Points (Huawei)',
    '1 línea (1000 min) a elegir entre Softphone o Hardphone',
    FALSE, TRUE, 0.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube'
);

-- CATEGORÍA 3: Planes PLUS + Router Avanzado (MikroTik)
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'PLAN-400-PLUS-ROUTER',
    'ON Negocios 400 PLUS + Router',
    'Plan exclusivo para clientes RUC 20. 400 Mbps con Seguridad Fortinet, Router MikroTik L009UiGS en Modo Bridge y Central Virtual S/ 0.00. Habilita SVAs de VPN y Pools de IP. Solo Softphone (no permite Hardphone).',
    3, 419.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'PLUS + Router', 400,
    '1 ONT Wi-Fi 6 (Modo Bridge) + 1 Router Avanzado MikroTik (L009UiGS, hasta 80 disp.) + 2 Access Points TP-Link Wi-Fi 6 (HX520)',
    '1 línea (1000 min) SOLO Softphone (NO permite Hardphone)',
    TRUE, FALSE, 0.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube, Contrato Equipamiento MikroTik'
),
(
    'PLAN-600-PLUS-ROUTER',
    'ON Negocios 600 PLUS + Router',
    'Plan exclusivo para clientes RUC 20. 600 Mbps con Seguridad Fortinet, Router MikroTik L009UiGS en Modo Bridge y Central Virtual S/ 0.00. Habilita SVAs de VPN y Pools de IP. Solo Softphone (no permite Hardphone).',
    3, 439.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'PLUS + Router', 600,
    '1 ONT Wi-Fi 6 (Modo Bridge) + 1 Router Avanzado MikroTik (L009UiGS, hasta 80 disp.) + 3 Access Points TP-Link Wi-Fi 6 (HX520)',
    '1 línea (1000 min) SOLO Softphone (NO permite Hardphone)',
    TRUE, FALSE, 0.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube, Contrato Equipamiento MikroTik'
);

-- CATEGORÍA 4: Planes Business (Equipamiento Omada)
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'PLAN-300-BUSINESS',
    'ON Negocios 300 Business Plus',
    'Plan exclusivo para clientes RUC 20. 300 Mbps con Router Avanzado Omada ER706W (hasta 80 disp.), Seguridad Fortinet e Instalación Gratuita. Habilita SVAs de VPN, Pools de IP y Access Point PRO.',
    4, 319.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Business', 300,
    '1 Router Wi-Fi 6 Avanzado Omada (ER706W, hasta 80 dispositivos)',
    '1 línea (1000 min) Softphone o Hardphone',
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube'
),
(
    'PLAN-400-BUSINESS-WIFI',
    'ON Negocios 400 Business WiFi Plus',
    'Plan exclusivo RUC 20. 400 Mbps con Router Omada ER706W + Access Point PRO Omada EAP650 + Cableado UTP Cat6 hasta 30m. Central Virtual incluida e Instalación Gratuita.',
    4, 419.00, 999, FALSE, FALSE, TRUE,
    'PLAN', 'Business', 400,
    '1 Router Wi-Fi 6 Avanzado Omada (ER706W) + 1 Access Point PRO Omada (EAP650, hasta 50 disp.) + Cableado estructurado UTP Cat6 (hasta 30 m)',
    '1 línea (1000 min) Softphone o Hardphone',
    TRUE, TRUE, 0.00, FALSE, NULL,
    NULL, NULL, NULL,
    'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube'
);

-- CATEGORÍA 5: Servicios Adicionales Recurrentes (SVA)
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'SVA-VPN-S2S',
    'VPN Site-to-Site',
    '1 única conexión túnel IPsec entre 2 sedes con router avanzado (solo 1 sede contrata). Requiere Plan PLUS + Router o Plan Business y RUC 20.',
    5, 40.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Redes, VPN e IPs', NULL,
    'Configuración de túnel IPsec Site-to-Site', NULL,
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 1,
    'Anexo Solicitud VPN Site-to-Site'
),
(
    'SVA-VPN-S2C',
    'VPN Site-to-Client',
    'Túnel L2TP/IPsec solo para PC (no compatible con móviles). Máximo 10 usuarios por cliente. Requiere Plan PLUS + Router o Plan Business y RUC 20.',
    5, 20.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Redes, VPN e IPs', NULL,
    'Licencia de acceso remoto seguro L2TP/IPsec por usuario', NULL,
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 10,
    'Anexo Solicitud VPN Site-to-Client'
),
(
    'SVA-POOL-4IP',
    'Pool 4 IP Pública Adicional (/30)',
    '1 IP utilizable en segmento distinto. Sin modo Bridge, sin NAP Perú ni geolocalización. Requiere Plan PLUS + Router o Business y RUC 20.',
    5, 30.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Redes, VPN e IPs', NULL,
    'Enrutamiento de segmento /30 (1 IP útil)', NULL,
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 4,
    'Anexo Asignación de Pool IP Pública'
),
(
    'SVA-POOL-8IP',
    'Pool 8 IP Pública Adicional (/29)',
    '5 IPs utilizables en segmento distinto. Sin modo Bridge, sin NAP Perú ni geolocalización. Requiere Plan PLUS + Router o Business y RUC 20.',
    5, 60.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Redes, VPN e IPs', NULL,
    'Enrutamiento de segmento /29 (5 IPs útiles)', NULL,
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 2,
    'Anexo Asignación de Pool IP Pública'
),
(
    'SVA-AP-HUAWEI',
    'Access Point Adicional (Huawei)',
    'Punto de acceso Wi-Fi 6 adicional en modalidad comodato. Máximo 4 dispositivos en total por cliente.',
    5, 20.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Equipamiento Wi-Fi Adicional', NULL,
    '1 Access Point Wi-Fi 6 Huawei (K562e-10 o similar) en comodato', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 4,
    'Anexo Comodato de Equipos'
),
(
    'SVA-AP-OMADA-PRO',
    'Access Point PRO (Omada EAP650)',
    'Wi-Fi 6 empresarial de alta densidad, acceso a portal Omada (modo lectura), soporte remoto y cableado UTP Cat6 hasta 30 m (sin canaletas). Exclusivo planes PLUS + Router y Business (RUC 20).',
    5, 80.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Equipamiento Wi-Fi Adicional', NULL,
    '1 Access Point PRO Omada EAP650 + Cableado UTP Cat6 30m', NULL,
    TRUE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 6,
    'Anexo Equipamiento Empresarial Omada'
),
(
    'SVA-CENTRAL-VIRTUAL',
    'Central Virtual (WN 1000)',
    'Central telefónica Yeastar en la nube con 1000 minutos multidestino, hasta 4 anexos softphone Linkus (PC y móvil), IVR, colas de espera, Ring Group y portabilidad numérica.',
    5, 59.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Telefonía y Central Virtual', NULL,
    'Licencia Central Yeastar Cloud + 4 anexos Linkus', '1000 min multidestino',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 1,
    'Contrato de Telefonía y Central Virtual Cloud'
),
(
    'SVA-ANEXO-CV',
    'Anexo Adicional Central Virtual',
    'Anexo adicional para la Central Virtual Yeastar Linkus. Requiere Central Virtual activa. Máximo 45 anexos adicionales.',
    5, 10.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Telefonía y Central Virtual', NULL,
    '1 Licencia de Anexo Softphone Linkus adicional', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 45,
    'Anexo Licenciamiento Central Virtual'
),
(
    'SVA-TEL-YEALINK',
    'Teléfono IP (Yealink T31P)',
    'Teléfono físico IP Yealink T31P para escritorio. Requiere Central Virtual activa (consume 1 licencia de anexo). Máximo 1 por central.',
    5, 30.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Telefonía y Central Virtual', NULL,
    '1 Teléfono IP Yealink T31P en comodato', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 1,
    'Anexo Comodato Teléfono IP'
),
(
    'SVA-LINEA-1000',
    'Línea Telefónica Plan 1000',
    '1 numeración fija, 1000 minutos todo destino nacional, 1 softphone MAX UC (hasta 3 dispositivos móviles/tablets, no PC) o 1 hardphone. Máximo 10 líneas softphone por cliente.',
    5, 30.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Telefonía y Central Virtual', NULL,
    '1 Línea telefónica fija digital', '1000 min nacional (1 softphone MAX UC o 1 hardphone)',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 10,
    'Contrato Servicio Telefónico Fijo'
),
(
    'SVA-LINEA-100',
    'Línea Telefónica Plan 100',
    '1 numeración fija, 100 minutos todo destino nacional con 1 teléfono analógico convencional (Hardphone - solo 1 aparato).',
    5, 10.00, 999, FALSE, FALSE, TRUE,
    'SVA', 'Telefonía y Central Virtual', NULL,
    '1 Línea telefónica analógica básica', '100 min nacional (Hardphone)',
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 5,
    'Contrato Servicio Telefónico Fijo'
);

-- CATEGORÍA 6: Servicios y Cargos de Pago Único
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
) VALUES
(
    'PAGO-CABLEADO-RED',
    'Cableado de Punto de Red',
    'Instalación de 1 punto de red UTP Categoría 6 hasta 35 metros con conectores terminales y caja sobrepuesta. No incluye canaletas ni soporte remoto posterior. Garantía de 1 mes.',
    6, 118.00, 999, FALSE, FALSE, TRUE,
    'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL,
    'Cable UTP Cat6 hasta 35m, terminales RJ45 y caja externa', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 50,
    'Orden de Trabajo de Cableado Estructurado'
),
(
    'PAGO-FACTIBILIDAD',
    'Visita de Factibilidad Previa',
    'Inspección técnica presencial con levantamiento de información y emisión de reporte detallado de ruta de acometida con fotografías.',
    6, 120.00, 999, FALSE, FALSE, TRUE,
    'CARGO_UNICO', 'Servicios Técnicos Previos', NULL,
    'Informe Técnico de Factibilidad Presencial con Fotografías', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 10,
    'Reporte de Factibilidad Técnica'
),
(
    'PAGO-INSTALACION-NOCHE',
    'Instalación Turno Noche / Madrugada',
    'Recargo por cuadrilla especializada de instalación en horario nocturno (23:00 a 05:00 horas).',
    6, 775.00, 999, FALSE, FALSE, TRUE,
    'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL,
    'Cuadrilla técnica nocturna certificada', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 5,
    'Acta de Instalación en Horario Especial'
),
(
    'PAGO-INSTALACION-CC',
    'Instalación en Centro Comercial',
    'Sobrecosto por restricciones de horario, normativas de seguridad, permisos de trabajo en altura e infraestructura especial en Centros Comerciales.',
    6, 1200.00, 999, FALSE, FALSE, TRUE,
    'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL,
    'Acreditaciones, SCTR y equipamiento de seguridad para Mall', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 5,
    'Permiso de Trabajo e Instalación en Centro Comercial'
),
(
    'PAGO-GARANTIA',
    'Cargo de Garantía Comercial',
    'Depósito en garantía exigido por política de riesgo comercial (antigüedad de RUC menor a 12 meses, bajo score crediticio o reportes de deuda). Monto amortizable al 6.º mes de facturación puntual.',
    6, 120.00, 999, FALSE, FALSE, TRUE,
    'CARGO_UNICO', 'Garantías Financieras', NULL,
    'Depósito en Garantía por Riesgo Crediticio', NULL,
    FALSE, TRUE, 59.00, FALSE, NULL,
    NULL, NULL, 1,
    'Acuerdo de Depósito en Garantía Comercial'
);

SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
