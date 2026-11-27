CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(50) NOT NULL,
    receiver VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    wamid VARCHAR(100)
);

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS wamid VARCHAR(100);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    first_name VARCHAR(50) DEFAULT 'Administrador',
    last_name VARCHAR(50) DEFAULT 'General',
    location VARCHAR(100) DEFAULT 'Lima, Perú',
    bio TEXT DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    website VARCHAR(100) DEFAULT '',
    avatar TEXT,
    modules TEXT DEFAULT 'dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin'
);

-- Asegurar que las columnas existan si la tabla ya había sido creada sin ellas
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) DEFAULT 'Administrador';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) DEFAULT 'General';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Lima, Perú';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS modules TEXT DEFAULT 'dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin';
ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);

-- Insertar o actualizar usuario admin por defecto
INSERT INTO users (username, password, role, first_name, last_name, modules)
VALUES ('admin', '$2a$10$wN2Jm8E8L5qjPjA1zH3rQ.uHjYgHkl4F7zDkR8v0O2dF9yP1kC6xW', 'ADMIN', 'Administrador', 'General', 'dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin')
ON CONFLICT (username) DO UPDATE SET modules = EXCLUDED.modules;


-- ============================================================
-- MÓDULO DE CONTACTOS (Perú)
-- ============================================================

-- Tabla maestra de Ubigeo del Perú (INEI)
CREATE TABLE IF NOT EXISTS ubigeo_peru (
    codigo_ubigeo VARCHAR(6) PRIMARY KEY,
    departamento  VARCHAR(100) NOT NULL,
    provincia     VARCHAR(100) NOT NULL,
    distrito      VARCHAR(100) NOT NULL
);

-- Entidad principal de contactos (Personas Naturales y Empresas)
CREATE TABLE IF NOT EXISTS contacts (
    id                   BIGSERIAL PRIMARY KEY,
    tipo_persona         VARCHAR(20)  NOT NULL CHECK (tipo_persona IN ('NATURAL','EMPRESA')),
    tipo_documento       VARCHAR(20)  NOT NULL CHECK (tipo_documento IN ('DNI','CE','RUC')),
    numero_documento     VARCHAR(20)  UNIQUE,
    nombres              VARCHAR(100),
    apellidos            VARCHAR(100),
    razon_social         VARCHAR(200),
    telefono_principal   VARCHAR(20)  NOT NULL,
    telefono_secundario  VARCHAR(20),
    email                VARCHAR(100),
    empresa_id           BIGINT       REFERENCES contacts(id) ON DELETE SET NULL,
    starred              BOOLEAN      DEFAULT FALSE,
    ai_active            BOOLEAN      DEFAULT FALSE,
    status               VARCHAR(50)  DEFAULT 'Lead',
    date_created         TIMESTAMP    DEFAULT NOW()
);

-- Direcciones (relación 1 a Muchos con contacts)
CREATE TABLE IF NOT EXISTS direcciones (
    id_direccion       BIGSERIAL PRIMARY KEY,
    id_contacto        BIGINT       NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    nombre_ubicacion   VARCHAR(100) NOT NULL,
    codigo_ubigeo      VARCHAR(6)   REFERENCES ubigeo_peru(codigo_ubigeo) ON DELETE SET NULL,
    direccion_completa VARCHAR(250) NOT NULL,
    referencia         VARCHAR(250),
    latitud            DOUBLE PRECISION,
    longitud           DOUBLE PRECISION
);

-- Asegurar columna empresa_id si la tabla ya existía sin ella
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referencia VARCHAR(250);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nro_entidades INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS score_experian NUMERIC(10,4);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS semaforo_experian VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deuda_sbs NUMERIC(14,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS calificacion_sbs VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS rango_ventas VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);
ALTER TABLE contacts ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tipo_documento_check;

CREATE INDEX IF NOT EXISTS idx_contacts_tipo_persona ON contacts(tipo_persona);
CREATE INDEX IF NOT EXISTS idx_contacts_numero_doc ON contacts(numero_documento);
CREATE INDEX IF NOT EXISTS idx_contacts_telefono ON contacts(telefono_principal);
CREATE INDEX IF NOT EXISTS idx_contacts_empresa_id ON contacts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contacts_semaforo ON contacts(semaforo_experian);
CREATE INDEX IF NOT EXISTS idx_direcciones_id_contacto ON direcciones(id_contacto);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS asignado_a_id INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trabajador_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_contacts_asignado_a ON contacts(asignado_a_id);
CREATE INDEX IF NOT EXISTS idx_contacts_trabajador_id ON contacts(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_contacts_fecha_asignacion ON contacts(fecha_asignacion);

-- Tabla para almacenar configuraciones dinámicas de la aplicación (como credenciales de Meta y Gemini)
CREATE TABLE IF NOT EXISTS system_settings (
    key_name VARCHAR(100) PRIMARY KEY,
    value_text TEXT NOT NULL
);

-- Seed de configuración inicial de la IA
INSERT INTO system_settings (key_name, value_text) VALUES
('ai.active', 'true'),
('ai.agent.name', 'Antarqui Bot'),
('ai.business.description', 'Venta de agua alcalina premium Antarqui en Lima'),
('ai.tone', 'Amigable y cercano')
ON CONFLICT (key_name) DO NOTHING;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_active BOOLEAN DEFAULT FALSE;

-- ============================================================
-- MÓDULO DE PRODUCTOS Y CATEGORÍAS
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias_producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria_id INT REFERENCES categorias_producto(id) ON DELETE SET NULL,
    precio_venta NUMERIC(10, 2) DEFAULT 0.00,
    stock_actual INT DEFAULT 0,
    imagen TEXT,
    es_pack BOOLEAN DEFAULT FALSE,
    requiere_retorno BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    tipo_producto VARCHAR(30) DEFAULT 'PLAN',
    subcategoria VARCHAR(60),
    velocidad_mbps INT,
    equipamiento_incluido TEXT,
    telefonia_incluida TEXT,
    requiere_ruc20 BOOLEAN DEFAULT FALSE,
    permite_hardphone BOOLEAN DEFAULT TRUE,
    central_virtual_costo NUMERIC(10,2) DEFAULT 59.00,
    es_multisede BOOLEAN DEFAULT FALSE,
    precios_escalonados_json TEXT,
    distritos_permitidos TEXT,
    provincias_excluidas TEXT,
    limite_max_cantidad INT,
    documentos_requeridos TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_composicion (
    producto_padre_id INT REFERENCES productos(id) ON DELETE CASCADE,
    producto_hijo_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (producto_padre_id, producto_hijo_id)
);

-- Seed Categorías Oficiales ON Negocios
INSERT INTO categorias_producto (nombre, descripcion, activo) VALUES
('Planes Internet LITE', 'Planes de solo Internet 100% fibra óptica simétrica (GPON) al 70% garantizado con IP Fija y Asistencia 24/7 sin Ciberseguridad.', TRUE),
('Planes Internet PLUS', 'Planes de Internet 100% fibra óptica con Ciberseguridad Virtual Fortinet (Web Filter + IPS) e IP Pública Fija.', TRUE),
('Planes PLUS + Router Avanzado', 'Planes PLUS con Router Avanzado MikroTik (L009UiGS). Exclusivo RUC 20. Habilita SVAs de VPN y Pools de IP.', TRUE),
('Planes Business', 'Planes Business con equipamiento empresarial Omada (ER706W). Exclusivo RUC 20 con Ciberseguridad Fortinet e Instalación Gratuita.', TRUE),
('Servicios Adicionales Recurrentes (SVA)', 'Servicios mensuales adicionales de Redes, VPNs, Pools de IP, Equipamiento Wi-Fi adicional y Central Virtual.', TRUE),
('Servicios y Cargos de Pago Único', 'Cargos únicos de instalación en horarios especiales, factibilidad previa, cableado de puntos de red y garantía comercial.', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Seed Catálogo ON Negocios
INSERT INTO productos (
    codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo,
    tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
    requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
    distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos, imagen
) VALUES
('PLAN-200-LITE', 'ON Negocios 200 LITE', 'Internet 100% Fibra Óptica Simétrica (GPON) 200 Mbps al 70% garantizado con IP Pública Fija y Asistencia 24/7. Exclusivo para Multisedes (mínimo 2 sedes). No disponible en Arequipa, Chiclayo ni Piura.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet LITE'), 179.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet LITE', 200, '1 ONT Wi-Fi 6 (Huawei EG8145X6) + 1 Access Point Wi-Fi 6 (Huawei K562e-10)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 59.00, TRUE, '[{"min_sedes":2,"max_sedes":2,"precio":179.00},{"min_sedes":3,"max_sedes":3,"precio":169.00},{"min_sedes":4,"max_sedes":999,"precio":159.00}]', NULL, 'AREQUIPA,CHICLAYO,PIURA', NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales', '/productos/01_plan_200_LITE.png'),
('PLAN-300-LITE', 'ON Negocios 300 LITE', 'Internet 100% Fibra Óptica Simétrica (GPON) 300 Mbps al 70% garantizado con IP Pública Fija y Asistencia Técnica Remota 24/7.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet LITE'), 199.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet LITE', 300, '1 ONT Wi-Fi 6 (Huawei) + 1 Access Point (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales', '/productos/02_plan_300_LITE.png'),
('PLAN-600-LITE', 'ON Negocios 600 LITE', 'Internet 100% Fibra Óptica Simétrica (GPON) 600 Mbps al 70% garantizado con IP Pública Fija y Asistencia Técnica Remota 24/7.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet LITE'), 259.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet LITE', 600, '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales', '/productos/06_plan_600_LITE.png'),
('PLAN-1000-LITE', 'ON Negocios 1000 LITE', 'Internet 100% Fibra Óptica Simétrica (GPON) 1000 Mbps al 70% garantizado con IP Pública Fija. Exclusivo para distritos de Miraflores y San Isidro. No disponible en provincias.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet LITE'), 299.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet LITE', 1000, '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 59.00, FALSE, NULL, 'MIRAFLORES,SAN ISIDRO', 'AREQUIPA,CHICLAYO,PIURA,TODAS_PROVINCIAS', NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales', '/productos/09_plan_1000_LITE.png'),
('PLAN-300-PLUS', 'ON Negocios 300 PLUS', 'Internet 100% Fibra Óptica 300 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS), IP Pública Fija y Asistencia Técnica 24/7. Central Virtual disponible con costo adicional.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet PLUS'), 249.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet PLUS', 300, '1 ONT Wi-Fi 6 (Huawei) + 1 Access Point (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube', '/productos/03_plan_300_PLUS.png'),
('PLAN-400-PLUS', 'ON Negocios 400 PLUS', 'Internet 100% Fibra Óptica 400 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS) y Central Virtual Gratuita (S/ 0.00 para 1 línea a solicitud).', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet PLUS'), 349.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet PLUS', 400, '1 ONT Wi-Fi 6 (Huawei) + 2 Access Points (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 0.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube', '/productos/04_plan_400_PLUS.png'),
('PLAN-600-PLUS', 'ON Negocios 600 PLUS', 'Internet 100% Fibra Óptica 600 Mbps con Seguridad Virtual Fortinet (Web Filter + IPS) y Central Virtual Gratuita (S/ 0.00 para 1 línea a solicitud).', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Internet PLUS'), 439.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Internet PLUS', 600, '1 ONT Wi-Fi 6 (Huawei) + 3 Access Points (Huawei)', '1 línea (1000 min) a elegir entre Softphone o Hardphone', FALSE, TRUE, 0.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube', '/productos/07_plan_600_PLUS.png'),
('PLAN-400-PLUS-ROUTER', 'ON Negocios 400 PLUS + Router', 'Plan exclusivo para clientes RUC 20. 400 Mbps con Seguridad Fortinet, Router MikroTik L009UiGS en Modo Bridge y Central Virtual S/ 0.00. Habilita SVAs de VPN y Pools de IP. Solo Softphone.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes PLUS + Router Avanzado'), 419.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'PLUS + Router', 400, '1 ONT Wi-Fi 6 (Modo Bridge) + 1 Router Avanzado MikroTik (L009UiGS) + 2 Access Points TP-Link Wi-Fi 6 (HX520)', '1 línea (1000 min) SOLO Softphone (NO permite Hardphone)', TRUE, FALSE, 0.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube, Contrato Equipamiento MikroTik', '/productos/05_plan_400_PLUS_Router.png'),
('PLAN-600-PLUS-ROUTER', 'ON Negocios 600 PLUS + Router', 'Plan exclusivo para clientes RUC 20. 600 Mbps con Seguridad Fortinet, Router MikroTik L009UiGS en Modo Bridge y Central Virtual S/ 0.00. Habilita SVAs de VPN y Pools de IP. Solo Softphone.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes PLUS + Router Avanzado'), 439.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'PLUS + Router', 600, '1 ONT Wi-Fi 6 (Modo Bridge) + 1 Router Avanzado MikroTik (L009UiGS) + 3 Access Points TP-Link Wi-Fi 6 (HX520)', '1 línea (1000 min) SOLO Softphone (NO permite Hardphone)', TRUE, FALSE, 0.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube, Contrato Equipamiento MikroTik', '/productos/08_plan_600_PLUS_Router.png'),
('PLAN-300-BUSINESS', 'ON Negocios 300 Business Plus', 'Plan exclusivo para clientes RUC 20. 300 Mbps con Router Avanzado Omada ER706W, Seguridad Fortinet e Instalación Gratuita.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Business'), 319.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Business', 300, '1 Router Wi-Fi 6 Avanzado Omada (ER706W)', '1 línea (1000 min) Softphone o Hardphone', TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube', '/productos/10_plan_300_business.png'),
('PLAN-400-BUSINESS-WIFI', 'ON Negocios 400 Business WiFi Plus', 'Plan exclusivo RUC 20. 400 Mbps con Router Omada ER706W + Access Point PRO Omada EAP650 + Cableado UTP Cat6 hasta 30m. Central Virtual incluida e Instalación Gratuita.', (SELECT id FROM categorias_producto WHERE nombre = 'Planes Business'), 419.00, 999, FALSE, FALSE, TRUE, 'PLAN', 'Business', 400, '1 Router Wi-Fi 6 Avanzado Omada (ER706W) + 1 Access Point PRO Omada (EAP650) + Cableado UTP Cat6', '1 línea (1000 min) Softphone o Hardphone', TRUE, TRUE, 0.00, FALSE, NULL, NULL, NULL, NULL, 'Contrato de Arrendamiento, Anexo I, Anexo Contactos Oficiales, Anexo Seguridad en la Nube', '/productos/11_plan_400_business_wifi.png'),
('SVA-VPN-S2S', 'VPN Site-to-Site', '1 única conexión túnel IPsec entre 2 sedes con router avanzado (solo 1 sede contrata). Requiere Plan PLUS + Router o Business y RUC 20.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 40.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Redes, VPN e IPs', NULL, 'Túnel IPsec Site-to-Site', NULL, TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 1, 'Anexo Solicitud VPN Site-to-Site', NULL),
('SVA-VPN-S2C', 'VPN Site-to-Client', 'Túnel L2TP/IPsec solo para PC (no móviles). Máximo 10 usuarios. Requiere Plan PLUS + Router o Business y RUC 20.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 20.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Redes, VPN e IPs', NULL, 'Acceso remoto L2TP/IPsec por usuario', NULL, TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 10, 'Anexo Solicitud VPN Site-to-Client', NULL),
('SVA-POOL-4IP', 'Pool 4 IP Pública Adicional (/30)', '1 IP utilizable en segmento distinto. Sin modo Bridge, sin NAP Perú ni geolocalización. Requiere Plan PLUS + Router o Business y RUC 20.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 30.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Redes, VPN e IPs', NULL, 'Enrutamiento /30 (1 IP útil)', NULL, TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 4, 'Anexo Asignación de Pool IP Pública', NULL),
('SVA-POOL-8IP', 'Pool 8 IP Pública Adicional (/29)', '5 IPs utilizables en segmento distinto. Sin modo Bridge, sin NAP Perú ni geolocalización. Requiere Plan PLUS + Router o Business y RUC 20.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 60.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Redes, VPN e IPs', NULL, 'Enrutamiento /29 (5 IPs útiles)', NULL, TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 2, 'Anexo Asignación de Pool IP Pública', NULL),
('SVA-AP-HUAWEI', 'Access Point Adicional (Huawei)', 'Punto de acceso Wi-Fi 6 adicional en comodato. Máximo 4 dispositivos en total por cliente.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 20.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Equipamiento Wi-Fi Adicional', NULL, '1 AP Wi-Fi 6 Huawei en comodato', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 4, 'Anexo Comodato de Equipos', NULL),
('SVA-AP-OMADA-PRO', 'Access Point PRO (Omada EAP650)', 'Wi-Fi 6 empresarial, portal Omada, soporte remoto y cableado Cat6 hasta 30 m. Exclusivo planes PLUS + Router y Business (RUC 20).', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 80.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Equipamiento Wi-Fi Adicional', NULL, '1 AP PRO Omada EAP650 + Cableado Cat6 30m', NULL, TRUE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 6, 'Anexo Equipamiento Empresarial Omada', NULL),
('SVA-CENTRAL-VIRTUAL', 'Central Virtual (WN 1000)', 'Central Yeastar en la nube, 1000 min, hasta 4 anexos softphone Linkus, IVR, colas y portabilidad.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 59.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Telefonía y Central Virtual', NULL, 'Central Yeastar Cloud + 4 anexos Linkus', '1000 min multidestino', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 1, 'Contrato de Telefonía y Central Virtual Cloud', NULL),
('SVA-ANEXO-CV', 'Anexo Adicional Central Virtual', 'Anexo adicional Linkus. Requiere Central Virtual activa. Máximo 45 anexos adicionales.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 10.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Telefonía y Central Virtual', NULL, '1 Anexo Linkus adicional', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 45, 'Anexo Licenciamiento Central Virtual', NULL),
('SVA-TEL-YEALINK', 'Teléfono IP (Yealink T31P)', 'Teléfono IP para escritorio. Requiere Central Virtual activa (consume 1 licencia de anexo). Máximo 1 por central.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 30.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Telefonía y Central Virtual', NULL, '1 Teléfono IP Yealink T31P', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 1, 'Anexo Comodato Teléfono IP', NULL),
('SVA-LINEA-1000', 'Línea Telefónica Plan 1000', '1 numeración fija, 1000 min todo destino nacional, 1 softphone MAX UC o 1 hardphone. Máximo 10 líneas.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 30.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Telefonía y Central Virtual', NULL, '1 Línea fija digital', '1000 min nacional', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 10, 'Contrato Servicio Telefónico Fijo', NULL),
('SVA-LINEA-100', 'Línea Telefónica Plan 100', '1 numeración fija, 100 min todo destino nacional, 1 hardphone (solo 1 aparato).', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios Adicionales Recurrentes (SVA)'), 10.00, 999, FALSE, FALSE, TRUE, 'SVA', 'Telefonía y Central Virtual', NULL, '1 Línea analógica básica', '100 min nacional', FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 5, 'Contrato Servicio Telefónico Fijo', NULL),
('PAGO-CABLEADO-RED', 'Cableado de Punto de Red', '1 punto UTP Cat6 hasta 35 m con terminal y caja (sin canaletas, 1 mes garantía).', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios y Cargos de Pago Único'), 118.00, 999, FALSE, FALSE, TRUE, 'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL, 'Punto UTP Cat6 hasta 35m', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 50, 'Orden de Trabajo de Cableado Estructurado', NULL),
('PAGO-FACTIBILIDAD', 'Visita de Factibilidad Previa', 'Inspección técnica presencial con reporte detallado y fotos.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios y Cargos de Pago Único'), 120.00, 999, FALSE, FALSE, TRUE, 'CARGO_UNICO', 'Servicios Técnicos Previos', NULL, 'Reporte de Factibilidad Presencial con Fotos', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 10, 'Reporte de Factibilidad Técnica', NULL),
('PAGO-INSTALACION-NOCHE', 'Instalación Turno Noche / Madrugada', 'Cuadrilla técnica nocturna (23:00 a 05:00 horas).', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios y Cargos de Pago Único'), 775.00, 999, FALSE, FALSE, TRUE, 'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL, 'Cuadrilla nocturna certificada', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 5, 'Acta de Instalación Horario Especial', NULL),
('PAGO-INSTALACION-CC', 'Instalación en Centro Comercial', 'Sobrecosto por normas de seguridad e infraestructura en Mall.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios y Cargos de Pago Único'), 1200.00, 999, FALSE, FALSE, TRUE, 'CARGO_UNICO', 'Cargos de Instalación y Obra', NULL, 'Permisos y seguridad Mall', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 5, 'Permiso de Trabajo Centro Comercial', NULL),
('PAGO-GARANTIA', 'Cargo de Garantía Comercial', 'Depósito en garantía por política de riesgo; amortizable al 6.º mes.', (SELECT id FROM categorias_producto WHERE nombre = 'Servicios y Cargos de Pago Único'), 120.00, 999, FALSE, FALSE, TRUE, 'CARGO_UNICO', 'Garantías Financieras', NULL, 'Depósito en Garantía', NULL, FALSE, TRUE, 59.00, FALSE, NULL, NULL, NULL, 1, 'Acuerdo de Depósito en Garantía', NULL)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- NUEVAS TABLAS PARA EL AGENTE DE IA DINÁMICO
-- ============================================================

-- Cobertura de despacho de la IA
CREATE TABLE IF NOT EXISTS shipping_coverage (
    id SERIAL PRIMARY KEY,
    district_name VARCHAR(100) UNIQUE NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed de distritos de cobertura por defecto (de Antarqui)
INSERT INTO shipping_coverage (district_name, delivery_fee, min_order_amount, is_active) VALUES
('Ate', 0.00, 0.00, TRUE),
('Vitarte', 0.00, 0.00, TRUE),
('La Molina', 0.00, 0.00, TRUE),
('Santa Anita', 0.00, 0.00, TRUE),
('SJL', 0.00, 0.00, TRUE),
('Huachipa', 0.00, 0.00, TRUE),
('Santa Clara', 0.00, 0.00, TRUE),
('Carapongo', 0.00, 0.00, TRUE),
('Rímac', 0.00, 0.00, TRUE),
('Campoy', 0.00, 0.00, TRUE),
('Zarate', 0.00, 0.00, TRUE),
('San Luis', 0.00, 0.00, TRUE)
ON CONFLICT (district_name) DO NOTHING;

-- Configuración de productos específicos para el Agente de IA (enlazando al catálogo existente)
CREATE TABLE IF NOT EXISTS ai_products_config (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE UNIQUE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    search_keywords TEXT,
    custom_ai_description TEXT
);

-- Seed inicial habilitando todos los productos existentes para la IA por defecto
INSERT INTO ai_products_config (producto_id, ai_enabled, search_keywords)
SELECT id, TRUE, nombre FROM productos
ON CONFLICT (producto_id) DO NOTHING;

-- Base de conocimientos de FAQs con soporte para archivos adjuntos
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    keywords TEXT NOT NULL,
    answer TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type VARCHAR(20) CHECK (attachment_type IN ('IMAGE','PDF','AUDIO','NONE')) DEFAULT 'NONE'
);

-- Seed de preguntas frecuentes (FAQs) del Asesor Comercial Antarqui
INSERT INTO ai_knowledge_base (category, keywords, answer, attachment_url, attachment_type)
SELECT 'Bienvenida', 'hola,buenos dias,buenas tardes,buenas noches,informacion,info,menu,catalogo,productos', '¡Hola! 💧 Bienvenido a *Antarqui Perú*. Impulsa tu bienestar con la mejor hidratación:\n\n✅ *Agua Alcalina* (PH 8.2)\n✅ *Ionizada*\n✅ *Ozonizada*\n✅ *12 procesos de purificación*\n\n🚚 ¡*DELIVERY GRATIS* en Zonas de Cobertura! 🏠💨', 'pack10l.jpg', 'IMAGE'
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_base WHERE category = 'Bienvenida');

INSERT INTO ai_knowledge_base (category, keywords, answer, attachment_url, attachment_type)
SELECT 'Promoción Especial', 'promocion,especial,oferta,descuento,promo', '🌟 ¡Aquí está nuestra promo *ANTARQUI*!\nIdeal para familias que consumen agua frecuentemente:\n*Pack 3 Recargas 20L con Caño + 1 Bidón de 10 L de regalo* a un precio increíble de S/ 48.00.', NULL, 'NONE'
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_base WHERE category = 'Promoción Especial');

INSERT INTO ai_knowledge_base (category, keywords, answer, attachment_url, attachment_type)
SELECT 'Zonas de Cobertura', 'cobertura,distritos,envian,delivery,entregan,direccion,envios,donde envian', 'Realizamos delivery gratuito en los siguientes distritos: Ate, Vitarte, La Molina, Santa Anita, SJL, Huachipa, Santa Clara, Carapongo, Rímac, Campoy, Zarate y San Luis. 🚛💨', NULL, 'NONE'
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_base WHERE category = 'Zonas de Cobertura');

INSERT INTO ai_knowledge_base (category, keywords, answer, attachment_url, attachment_type)
SELECT 'Beneficios del Agua', 'alcalina,beneficios,ph,por que,salud,buena,ozonizada', 'Nuestra Agua Alcalina pH 8.2 está ionizada y ozonizada mediante 12 procesos de purificación. Ayuda a neutralizar la acidez en el cuerpo, mejora la hidratación celular y aporta minerales esenciales para tu bienestar diario. 💧✨', NULL, 'NONE'
WHERE NOT EXISTS (SELECT 1 FROM ai_knowledge_base WHERE category = 'Beneficios del Agua');


-- ============================================================
-- MÓDULO DE LOGÍSTICA Y PEDIDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS conductores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    foto VARCHAR(250),
    dni VARCHAR(20),
    telefono VARCHAR(20),
    licencia VARCHAR(50),
    vehiculo_placa VARCHAR(20),
    vehiculo_marca VARCHAR(100),
    vehiculo_modelo VARCHAR(100),
    vehiculo_anho VARCHAR(10),
    tipo_combustible VARCHAR(50),
    vehiculo_tipo VARCHAR(50),
    capacidad_toneladas NUMERIC(10,2),
    fecha_mantenimiento_motor DATE,
    fecha_mantenimiento_gas DATE,
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),
    direccion VARCHAR(250),
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS zonas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS etapas_pedido (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden INT DEFAULT 0,
    es_entregado INT DEFAULT 0,
    label_ganado VARCHAR(100),
    es_perdido INT DEFAULT 0,
    label_perdido VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id BIGSERIAL PRIMARY KEY,
    numero_pedido VARCHAR(50) UNIQUE,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    contacto_persona_nombre VARCHAR(200),
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'Pendiente',
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    igv NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) DEFAULT 0.00,
    direccion_entrega VARCHAR(250),
    distrito VARCHAR(100),
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    notas TEXT,
    fecha_entrega DATE,
    hora_entrega VARCHAR(50),
    chofer_id INT REFERENCES conductores(id) ON DELETE SET NULL,
    prioridad VARCHAR(20) DEFAULT 'Media',
    zona INT REFERENCES zonas(id) ON DELETE SET NULL,
    tipo_envio VARCHAR(50) DEFAULT 'Despacho',
    etapa_id INT REFERENCES etapas_pedido(id) ON DELETE SET NULL,
    es_reprogramado INT DEFAULT 0,
    quien_recibio VARCHAR(200),
    envases_entregados INT DEFAULT 0,
    envases_devueltos INT DEFAULT 0,
    cant_vendidos INT DEFAULT 0,
    monto_final NUMERIC(10, 2) DEFAULT 0.00,
    metodo_pago_real VARCHAR(50),
    saldo_actual_cliente INT DEFAULT 0,
    venta_id INT,
    venta_estado VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_detalles (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- Seed Conductores
INSERT INTO conductores (nombre, apellido, vehiculo_placa, activo)
SELECT 'Juan', 'Pérez', 'F4D-882', TRUE
WHERE NOT EXISTS (SELECT 1 FROM conductores WHERE nombre = 'Juan' AND apellido = 'Pérez');

INSERT INTO conductores (nombre, apellido, vehiculo_placa, activo)
SELECT 'Carlos', 'Sánchez', 'A9K-123', TRUE
WHERE NOT EXISTS (SELECT 1 FROM conductores WHERE nombre = 'Carlos' AND apellido = 'Sánchez');

-- Seed Zonas
INSERT INTO zonas (nombre, activo)
SELECT 'Zona Este', TRUE
WHERE NOT EXISTS (SELECT 1 FROM zonas WHERE nombre = 'Zona Este');

INSERT INTO zonas (nombre, activo)
SELECT 'Zona Centro', TRUE
WHERE NOT EXISTS (SELECT 1 FROM zonas WHERE nombre = 'Zona Centro');

INSERT INTO zonas (nombre, activo)
SELECT 'Zona Norte', TRUE
WHERE NOT EXISTS (SELECT 1 FROM zonas WHERE nombre = 'Zona Norte');

INSERT INTO zonas (nombre, activo)
SELECT 'Zona Sur', TRUE
WHERE NOT EXISTS (SELECT 1 FROM zonas WHERE nombre = 'Zona Sur');

-- Seed Etapas de Pedido
INSERT INTO etapas_pedido (nombre, orden, es_entregado, label_ganado, es_perdido, label_perdido)
SELECT 'Pendiente', 1, 0, NULL, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM etapas_pedido WHERE nombre = 'Pendiente');

INSERT INTO etapas_pedido (nombre, orden, es_entregado, label_ganado, es_perdido, label_perdido)
SELECT 'En Ruta', 2, 0, NULL, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM etapas_pedido WHERE nombre = 'En Ruta');

INSERT INTO etapas_pedido (nombre, orden, es_entregado, label_ganado, es_perdido, label_perdido)
SELECT 'Entregado', 3, 1, 'ENTREGADO', 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM etapas_pedido WHERE nombre = 'Entregado');

INSERT INTO etapas_pedido (nombre, orden, es_entregado, label_ganado, es_perdido, label_perdido)
SELECT 'Reprogramado', 4, 0, NULL, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM etapas_pedido WHERE nombre = 'Reprogramado');

INSERT INTO etapas_pedido (nombre, orden, es_entregado, label_ganado, es_perdido, label_perdido)
SELECT 'Cancelado', 5, 0, NULL, 1, 'CANCELADO'
WHERE NOT EXISTS (SELECT 1 FROM etapas_pedido WHERE nombre = 'Cancelado');


-- ============================================================
-- FASE 2: GASTOS, COMPRAS Y PROVEEDORES
-- ============================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    ruc VARCHAR(20) UNIQUE,
    razon_social VARCHAR(250) NOT NULL,
    contacto_nombre VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(250),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gastos_categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Operativo',
    grupo_contable VARCHAR(100) DEFAULT 'Otros Gastos',
    afecta_margen_bidon BOOLEAN DEFAULT FALSE,
    afecta_cac BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS gastos (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
    categoria_id INT REFERENCES gastos_categorias(id) ON DELETE SET NULL,
    vehiculo_id INT REFERENCES conductores(id) ON DELETE SET NULL,
    fecha_gasto DATE NOT NULL,
    numero_comprobante VARCHAR(50),
    tipo_comprobante VARCHAR(50) DEFAULT 'Ninguno',
    descripcion TEXT,
    cantidad NUMERIC(10,2) DEFAULT 1.00,
    costo_unitario NUMERIC(12,2) DEFAULT 0.00,
    monto_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado_pago VARCHAR(50) DEFAULT 'Pagado',
    metodo_pago VARCHAR(50),
    archivo_comprobante VARCHAR(250),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
    id BIGSERIAL PRIMARY KEY,
    proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    numero_compra VARCHAR(50) UNIQUE,
    fecha_compra DATE NOT NULL,
    tipo_comprobante VARCHAR(50) DEFAULT 'Factura',
    numero_comprobante VARCHAR(50),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igv NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(50) DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras_detalles (
    id BIGSERIAL PRIMARY KEY,
    compra_id BIGINT REFERENCES compras(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE SET NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    costo_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Seed de Categorías de Gastos
INSERT INTO gastos_categorias (nombre, tipo, grupo_contable, afecta_margen_bidon, afecta_cac) VALUES
('Compra de Inventario', 'Variable', 'Compras', true, false),
('Carga Financiera (Bancos)', 'Fijo', 'Financiero', false, false),
('Combustible', 'Variable', 'Logística', true, false),
('Mantenimiento de Vehículo', 'Variable', 'Logística', true, false),
('Publicidad y Marketing', 'Variable', 'Comercial', false, true),
('Servicios Básicos (Luz/Agua/Internet)', 'Fijo', 'Servicios', false, false),
('Sueldos y Planilla', 'Fijo', 'RRHH', false, false),
('Otros Gastos', 'Variable', 'Otros', false, false)
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- FASE 3: TESORERÍA, CAJA Y DEUDAS BANCARIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS caja_movimientos (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Ingreso', 'Egreso')),
    categoria VARCHAR(100) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    referencia_id BIGINT,
    tabla_referencia VARCHAR(100),
    notas TEXT,
    archivo_comprobante VARCHAR(250),
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deudas_bancarias (
    id BIGSERIAL PRIMARY KEY,
    entidad_bancaria VARCHAR(150) NOT NULL,
    numero_prestamo VARCHAR(100),
    monto_prestado NUMERIC(12, 2) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'PEN',
    fecha_inicio DATE NOT NULL,
    cuotas_totales INT NOT NULL,
    tcea NUMERIC(5, 2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Liquidada')),
    notas TEXT
);

CREATE TABLE IF NOT EXISTS deudas_cuotas (
    id BIGSERIAL PRIMARY KEY,
    deuda_id BIGINT REFERENCES deudas_bancarias(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_cuota NUMERIC(12, 2) NOT NULL,
    capital NUMERIC(12, 2) NOT NULL,
    interes NUMERIC(12, 2) DEFAULT 0.00,
    seguro_comisiones NUMERIC(12, 2) DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado')),
    gasto_id BIGINT REFERENCES gastos(id) ON DELETE SET NULL,
    fecha_pago TIMESTAMP
);

-- ============================================================
-- FASE 4: RECURSOS HUMANOS (PERSONAL, ASISTENCIA Y NOMINAS)
-- ============================================================

CREATE TABLE IF NOT EXISTS afp_maestra (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    comision_flujo NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    comision_mixta NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    prima_seguro NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    aporte_obligatorio NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    activo BOOLEAN DEFAULT TRUE
);

INSERT INTO afp_maestra (nombre, comision_flujo, comision_mixta, prima_seguro, aporte_obligatorio, activo) VALUES
('Integra', 0.0155, 0.0082, 0.0184, 0.1000, true),
('Prima', 0.0160, 0.0087, 0.0184, 0.1000, true),
('Profuturo', 0.0169, 0.0107, 0.0184, 0.1000, true),
('Habitat', 0.0147, 0.0038, 0.0184, 0.1000, true)
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS trabajadores (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    rol_operativo VARCHAR(50) NOT NULL,
    sueldo_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    frecuencia_pago VARCHAR(50) DEFAULT 'Mensual',
    monto_tardanza NUMERIC(12, 2) DEFAULT 0.00,
    tiene_hijos BOOLEAN DEFAULT FALSE,
    paga_ley BOOLEAN DEFAULT TRUE,
    regimen_pension VARCHAR(20) DEFAULT 'ONP',
    afp_id INT REFERENCES afp_maestra(id) ON DELETE SET NULL,
    tipo_comision_afp VARCHAR(20) DEFAULT 'Flujo',
    paga_comision BOOLEAN DEFAULT FALSE,
    monto_comision_bidon NUMERIC(10, 2) DEFAULT 0.00,
    vehiculo_placa VARCHAR(20),
    vehiculo_marca VARCHAR(50),
    vehiculo_modelo VARCHAR(50),
    vehiculo_capacidad NUMERIC(10, 2) DEFAULT 0.00,
    linea_movil VARCHAR(50),
    cuenta_bancaria VARCHAR(100),
    banco_nombre VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'Activo',
    fecha_ingreso DATE
);

CREATE TABLE IF NOT EXISTS pagos_nominas (
    id BIGSERIAL PRIMARY KEY,
    trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
    gasto_id BIGINT REFERENCES gastos(id) ON DELETE SET NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    frecuencia VARCHAR(50) NOT NULL,
    monto_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_comisiones NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_descuentos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_adelantos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    metadata TEXT
);

CREATE TABLE IF NOT EXISTS asistencia (
    id BIGSERIAL PRIMARY KEY,
    trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_entrada VARCHAR(20),
    hora_salida VARCHAR(20),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('Presente', 'Falta', 'Tardanza', 'Permiso', 'Vacaciones')),
    notas TEXT,
    pago_id BIGINT REFERENCES pagos_nominas(id) ON DELETE SET NULL,
    UNIQUE (trabajador_id, fecha)
);

CREATE TABLE IF NOT EXISTS adelantos (
    id BIGSERIAL PRIMARY KEY,
    trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
    gasto_id BIGINT REFERENCES gastos(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notas TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Descontado', 'Anulado'))
);

-- Seed de Categoría de Gasto para Planilla
INSERT INTO gastos_categorias (nombre, tipo, grupo_contable, afecta_margen_bidon, afecta_cac) VALUES
('Planilla de Personal', 'Fijo', 'RRHH', false, false)
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- FASE 5: CRM LEADS & OPPORTUNITIES (KANBAN)
-- ============================================================

CREATE TABLE IF NOT EXISTS kanban_columnas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden INT NOT NULL,
    es_ganada BOOLEAN DEFAULT FALSE,
    label_ganada VARCHAR(100) DEFAULT 'Ganada',
    es_perdida BOOLEAN DEFAULT FALSE,
    label_perdida VARCHAR(100) DEFAULT 'Perdida'
);

-- Eliminar posibles registros duplicados generados anteriormente por reinicios (manteniendo el primer ID creado)
DELETE FROM kanban_columnas 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM kanban_columnas 
    GROUP BY nombre
);

-- Insertar columnas por defecto solo si la tabla está vacía para evitar duplicados en reinicios de Spring Boot
INSERT INTO kanban_columnas (nombre, orden, es_ganada, es_perdida)
SELECT nombre_val, orden_val, es_ganada_val, es_perdida_val
FROM (
    VALUES 
    ('Prospecto', 1, false, false),
    ('Contacto Establecido', 2, false, false),
    ('Propuesta Presentada', 3, false, false),
    ('En Negociación', 4, false, false),
    ('Ganada', 5, true, false),
    ('Perdida', 6, false, true)
) AS t(nombre_val, orden_val, es_ganada_val, es_perdida_val)
WHERE NOT EXISTS (SELECT 1 FROM kanban_columnas);

CREATE TABLE IF NOT EXISTS kanban_etiquetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(50) DEFAULT '#6366f1'
);

INSERT INTO kanban_etiquetas (nombre, color) VALUES
('Agua de Mesa', '#3b82f6'),
('Servicio Técnico', '#ef4444'),
('Bidón 20L', '#10b981'),
('Pack Dispensador', '#f59e0b')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS oportunidades (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(250) NOT NULL,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    etapa_id INT REFERENCES kanban_columnas(id) ON DELETE SET NULL,
    valor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    prioridad VARCHAR(50) DEFAULT 'Media',
    etiquetas VARCHAR(500),
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    orden INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar columnas para soportar más detalles y lista de productos en Oportunidades (CRM)
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS productos_json TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES trabajadores(id) ON DELETE SET NULL;

-- ============================================================
-- FASE 5 PART 2: VENTAS, RENTABILIDAD & ENVASES
-- ============================================================

CREATE TABLE IF NOT EXISTS ventas (
    id BIGSERIAL PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente', 'completada', 'cancelada'
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente', 'parcial', 'pagado'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igv NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_pagado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bidones_entregados INT DEFAULT 0,
    bidones_recogidos INT DEFAULT 0,
    notas TEXT,
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    tipo_comprobante VARCHAR(50) DEFAULT 'nota_venta',
    direccion_entrega VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS venta_detalles (
    id BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS movimientos_envases (
    id BIGSERIAL PRIMARY KEY,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'Entrega', 'Recojo', 'Ajuste'
    cantidad INT NOT NULL,
    saldo_anterior INT NOT NULL,
    saldo_posterior INT NOT NULL,
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    venta_id BIGINT REFERENCES ventas(id) ON DELETE SET NULL,
    pedido_id BIGINT REFERENCES pedidos(id) ON DELETE SET NULL,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_composicion (
    id SERIAL PRIMARY KEY,
    producto_padre_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    producto_hijo_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 1,
    UNIQUE (producto_padre_id, producto_hijo_id)
);

-- Schema alignment updates (fixes database drifts)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bidones_prestados INT DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS igv NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(255);




-- ============================================================================
-- MÓDULO DE RENTABILIDAD, COMISIONES Y DEALER ON NEGOCIOS (Referencia v10)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rentabilidad_config_global (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) UNIQUE NOT NULL,
    valor VARCHAR(100) NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_dealer_parametros (
    id SERIAL PRIMARY KEY,
    ventas_minimas INT UNIQUE NOT NULL,
    factor_dealer NUMERIC(6,3) NOT NULL,
    bono_unitario NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_perfiles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gastos_adicionales_defecto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_escalas_comisiones (
    id SERIAL PRIMARY KEY,
    perfil_id INT NOT NULL REFERENCES rentabilidad_perfiles(id) ON DELETE CASCADE,
    rango_nombre VARCHAR(50) NOT NULL,
    ventas_minimas INT NOT NULL,
    ventas_maximas INT,
    factor_comision NUMERIC(6,3) NOT NULL DEFAULT 0.000,
    bono_fijo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_personal (
    id SERIAL PRIMARY KEY,
    trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL,
    perfil_id INT NOT NULL REFERENCES rentabilidad_perfiles(id) ON DELETE RESTRICT,
    nombre_completo VARCHAR(150) NOT NULL,
    documento_identidad VARCHAR(20),
    sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gastos_adicionales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    telefono VARCHAR(30),
    email VARCHAR(100),
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_liquidaciones (
    id SERIAL PRIMARY KEY,
    codigo_liquidacion VARCHAR(50) UNIQUE NOT NULL,
    mes INT NOT NULL,
    anio INT NOT NULL,
    total_altas_dealer INT NOT NULL DEFAULT 0,
    ingresos_brutos_dealer NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_pagos_personal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_gastos_personal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gastos_fijos_oficina NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    egresos_totales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ganancia_neta NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    margen_rentabilidad NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Borrador',
    generado_por VARCHAR(100),
    aprobado_por VARCHAR(100),
    fecha_aprobacion TIMESTAMP,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_liquidaciones_detalle (
    id SERIAL PRIMARY KEY,
    liquidacion_id INT NOT NULL REFERENCES rentabilidad_liquidaciones(id) ON DELETE CASCADE,
    personal_id INT REFERENCES trabajadores(id) ON DELETE SET NULL,
    nombre_personal VARCHAR(150) NOT NULL,
    perfil_nombre VARCHAR(100) NOT NULL,
    altas_individuales INT NOT NULL DEFAULT 0,
    sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    factor_comision NUMERIC(6,3) NOT NULL DEFAULT 0.000,
    comision_calculada NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    bono_fijo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_comisiones NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    pago_planilla_bruto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gastos_adicionales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_a_pagar NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado_pago VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    fecha_pago TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_simulaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    usuario_id INT REFERENCES users(id),
    parametros_json JSONB NOT NULL,
    resultados_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rentabilidad_historial_cambios (
    id SERIAL PRIMARY KEY,
    tipo_entidad VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    valores_anteriores JSONB,
    valores_nuevos JSONB,
    usuario VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (de Rentabilidad_Dealer_ON_Negocios_v10.xlsx)
INSERT INTO rentabilidad_config_global (clave, valor, descripcion) VALUES
('arpu_promedio', '168.64', 'ARPU promedio sin IGV (por defecto S/ 199 / 1.18)'),
('divisor_bonos', '4', 'Cantidad de altas requeridas para desbloquear 1 bono del Dealer'),
('bono_supervisor_matriz_15', '1500.00', 'Bono de supervisor matriz a partir de 15 altas totales'),
('bono_supervisor_matriz_20', '3000.00', 'Bono de supervisor matriz a partir de 20 altas totales'),
('gastos_fijos_oficina', '500.00', 'Gastos fijos operativos mensuales base (alquiler, servicios, internet)')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO rentabilidad_dealer_parametros (ventas_minimas, factor_dealer, bono_unitario) VALUES
(0, 0.000, 0.00),
(1, 2.500, 1100.00),
(7, 3.000, 1100.00),
(10, 3.500, 1350.00),
(15, 3.800, 1350.00),
(20, 4.000, 1500.00)
ON CONFLICT (ventas_minimas) DO NOTHING;

INSERT INTO rentabilidad_perfiles (id, nombre, sueldo_base, gastos_adicionales_defecto, descripcion, activo, orden) VALUES
(1, 'Full Time', 1500.00, 50.00, 'Vendedor a tiempo completo con metas comerciales estándar', TRUE, 1),
(2, 'Medio Tiempo', 800.00, 50.00, 'Vendedor part-time enfocado en turnos reducidos', TRUE, 2),
(3, 'Freelance', 0.00, 0.00, 'Comisionista externo sin sueldo base, 100% variable', TRUE, 3),
(4, 'Supervisor', 2000.00, 50.00, 'Líder de equipo comisiona sobre el volumen consolidado del grupo', TRUE, 4)
ON CONFLICT (nombre) DO NOTHING;

SELECT setval('rentabilidad_perfiles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM rentabilidad_perfiles));


-- Vinculación de Trabajadores con Módulo de Rentabilidad y Comisiones Dealer
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS perfil_comision_id INT REFERENCES rentabilidad_perfiles(id) ON DELETE SET NULL;
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS gastos_adicionales NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS equipo VARCHAR(100);
ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS supervisor_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL;

-- Asegurar columnas necesarias en Ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS oportunidad_id BIGINT REFERENCES oportunidades(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES trabajadores(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS equipo VARCHAR(100);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_instalacion VARCHAR(50) DEFAULT 'pendiente';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_instalacion TIMESTAMP;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS documentos_instalacion TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tecnico_instalador VARCHAR(100);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS notas_instalacion TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(50);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(100);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS facturas_seguimiento TEXT;

-- Asegurar columnas necesarias en Oportunidades
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS tipo_propuesta VARCHAR(50) DEFAULT 'venta';
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS total_instalacion NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS plazo_acuerdo VARCHAR(100);
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS moneda VARCHAR(20) DEFAULT 'PEN';
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_nombre VARCHAR(150);
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_cargo VARCHAR(100);
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_celular VARCHAR(50);
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_email VARCHAR(100);
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS condiciones_comerciales TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS detalles_json TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS contacto_persona VARCHAR(150);

-- Roles y Permisos del Sistema
CREATE TABLE IF NOT EXISTS roles_sistema (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3b82f6',
    badge_color VARCHAR(30) DEFAULT 'bg-blue-600',
    es_sistema BOOLEAN DEFAULT false,
    sales_scope VARCHAR(20) DEFAULT 'own',
    permisos JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE roles_sistema ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

INSERT INTO roles_sistema (codigo, nombre, descripcion, color, badge_color, es_sistema, sales_scope, permisos)
VALUES 
('ADMIN', 'Administrador Total', 'Acceso total e irrestricto a todos los módulos comerciales, financieros y administrativos.', '#9333ea', 'bg-purple-600', true, 'all', 
'{"ventas":{"ver":true,"crear":true,"editar":true,"instalar":true,"anular":true,"reasignar":true,"exportar":true},"finanzas":{"ver_flujo":true,"registrar_movimiento":true,"ver_cuentas_bancarias":true,"anular_movimiento":true},"rentabilidad":{"ver_margenes":true,"ver_costos":true,"simulador":true,"configurar_perfiles":true},"payroll":{"ver_personal":true,"gestionar_personal":true,"ver_liquidaciones":true,"pagar_comisiones":true},"clientes":{"ver_todos":true,"crear":true,"chatear_whatsapp":true,"exportar":true},"admin":{"gestionar_usuarios":true,"gestionar_roles":true,"ajustes_sistema":true}}'::jsonb),

('SUPERVISOR', 'Supervisor de Ventas', 'Supervisión del equipo comercial, validación y pase a instaladas de ventas y comisiones del equipo.', '#2563eb', 'bg-blue-600', true, 'team',
'{"ventas":{"ver":true,"crear":true,"editar":true,"instalar":true,"anular":false,"reasignar":true,"exportar":true},"finanzas":{"ver_flujo":false,"registrar_movimiento":false,"ver_cuentas_bancarias":false,"anular_movimiento":false},"rentabilidad":{"ver_margenes":true,"ver_costos":false,"simulador":true,"configurar_perfiles":false},"payroll":{"ver_personal":true,"gestionar_personal":false,"ver_liquidaciones":true,"pagar_comisiones":false},"clientes":{"ver_todos":true,"crear":true,"chatear_whatsapp":true,"exportar":false},"admin":{"gestionar_usuarios":false,"gestionar_roles":false,"ajustes_sistema":false}}'::jsonb),

('VENDEDOR', 'Vendedor / Asesor Comercial', 'Asesor comercial. Únicamente puede consultar sus propias ventas asignadas y dar seguimiento a sus prospectos.', '#059669', 'bg-emerald-600', true, 'own',
'{"ventas":{"ver":true,"crear":true,"editar":true,"instalar":false,"anular":false,"reasignar":false,"exportar":false},"finanzas":{"ver_flujo":false,"registrar_movimiento":false,"ver_cuentas_bancarias":false,"anular_movimiento":false},"rentabilidad":{"ver_margenes":false,"ver_costos":false,"simulador":false,"configurar_perfiles":false},"payroll":{"ver_personal":false,"gestionar_personal":false,"ver_liquidaciones":false,"pagar_comisiones":false},"clientes":{"ver_todos":false,"crear":true,"chatear_whatsapp":true,"exportar":false},"admin":{"gestionar_usuarios":false,"gestionar_roles":false,"ajustes_sistema":false}}'::jsonb),

('FINANZAS', 'Finanzas & Tesorería', 'Tesorería y contabilidad. Control de caja chica, bancos (BCP, BBVA), márgenes sin IGV y pago de nóminas.', '#d97706', 'bg-amber-600', true, 'all',
'{"ventas":{"ver":true,"crear":false,"editar":false,"instalar":false,"anular":false,"reasignar":false,"exportar":true},"finanzas":{"ver_flujo":true,"registrar_movimiento":true,"ver_cuentas_bancarias":true,"anular_movimiento":true},"rentabilidad":{"ver_margenes":true,"ver_costos":true,"simulador":true,"configurar_perfiles":true},"payroll":{"ver_personal":true,"gestionar_personal":true,"ver_liquidaciones":true,"pagar_comisiones":true},"clientes":{"ver_todos":true,"crear":false,"chatear_whatsapp":false,"exportar":false},"admin":{"gestionar_usuarios":false,"gestionar_roles":false,"ajustes_sistema":false}}'::jsonb),

('OPERACIONES', 'Operaciones & Logística', 'Logística e instalaciones. Verificación técnica de servicios, agendamiento de instalaciones y despacho.', '#0891b2', 'bg-cyan-600', true, 'all',
'{"ventas":{"ver":true,"crear":false,"editar":false,"instalar":true,"anular":false,"reasignar":false,"exportar":false},"finanzas":{"ver_flujo":false,"registrar_movimiento":false,"ver_cuentas_bancarias":false,"anular_movimiento":false},"rentabilidad":{"ver_margenes":false,"ver_costos":false,"simulador":false,"configurar_perfiles":false},"payroll":{"ver_personal":true,"gestionar_personal":false,"ver_liquidaciones":false,"pagar_comisiones":false},"clientes":{"ver_todos":true,"crear":false,"chatear_whatsapp":true,"exportar":false},"admin":{"gestionar_usuarios":false,"gestionar_roles":false,"ajustes_sistema":false}}'::jsonb)
ON CONFLICT (codigo) DO NOTHING;

-- Extensiones de Chatbot IA y Cobertura de Envíos
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200);
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS image_caption TEXT;

ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200);
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_caption TEXT;

ALTER TABLE shipping_coverage ADD COLUMN IF NOT EXISTS aliases TEXT;

ALTER TABLE contacts ALTER COLUMN numero_documento DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tipo_documento_check;

-- Tabla de Registro de Descuentos para Comisiones y Personal
CREATE TABLE IF NOT EXISTS trabajadores_descuentos (
    id BIGSERIAL PRIMARY KEY,
    trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
    periodo_mes INT NOT NULL,
    periodo_anio INT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    tipo VARCHAR(50) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    motivo TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'Pendiente',
    registrado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_desc_trab_periodo ON trabajadores_descuentos (trabajador_id, periodo_anio, periodo_mes);

-- Tabla de Registro y Planificación de Actividades (Agenda / Planificador / Bitácora)
CREATE TABLE IF NOT EXISTS crm_actividades (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    asunto VARCHAR(250) NOT NULL,
    descripcion TEXT,
    fecha_programada TIMESTAMP NOT NULL,
    fecha_fin_programada TIMESTAMP,
    prioridad VARCHAR(20) DEFAULT 'Media',
    estado VARCHAR(30) DEFAULT 'Pendiente',
    fecha_ejecutada TIMESTAMP,
    resultado_notas TEXT,
    resultado_estado VARCHAR(50),
    duracion_minutos INT,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    empresa_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    oportunidad_id BIGINT REFERENCES oportunidades(id) ON DELETE SET NULL,
    venta_id BIGINT REFERENCES ventas(id) ON DELETE SET NULL,
    pedido_id BIGINT REFERENCES pedidos(id) ON DELETE SET NULL,
    trabajador_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,
    usuario_id INT REFERENCES users(id) ON DELETE SET NULL,
    creado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actividades_estado_fecha ON crm_actividades (estado, fecha_programada);
CREATE INDEX IF NOT EXISTS idx_actividades_trabajador ON crm_actividades (trabajador_id, fecha_programada);
CREATE INDEX IF NOT EXISTS idx_actividades_contacto ON crm_actividades (contacto_id);
CREATE INDEX IF NOT EXISTS idx_actividades_empresa ON crm_actividades (empresa_id);
CREATE INDEX IF NOT EXISTS idx_actividades_oportunidad ON crm_actividades (oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_actividades_venta ON crm_actividades (venta_id);
CREATE INDEX IF NOT EXISTS idx_actividades_pedido ON crm_actividades (pedido_id);


