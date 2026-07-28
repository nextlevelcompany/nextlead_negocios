-- =========================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - CRM NEXTLEAD WHATSAPP
-- Consolidado de Esquema, Catálogos Iniciales (Seeds), Ajustes de IA y Triggers
-- Compatible con PostgreSQL 15+
-- =========================================================================

-- =========================================================================
-- PARTE 1: TABLAS DE NÚCLEO (USUARIOS Y WHATSAPP)
-- =========================================================================

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
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    first_name VARCHAR(50) DEFAULT 'Kate',
    last_name VARCHAR(50) DEFAULT 'Jones',
    location VARCHAR(100) DEFAULT 'Lane no 1, Newyork',
    bio TEXT DEFAULT '',
    phone VARCHAR(20) DEFAULT 'xxxxxxx987',
    website VARCHAR(100) DEFAULT 'hencework.com',
    avatar TEXT,
    modules TEXT DEFAULT ''
);

-- Insertar usuario admin por defecto (username: admin, password: admin123)
-- El hash corresponde a 'admin123' usando BCrypt
INSERT INTO users (username, password, role, modules)
VALUES ('admin', '$2a$10$3qmN3JiCajG5W2xrAMX1fexcOk59QXICEQd3Drjd.4u1PmUs1pD.6', 'ADMIN', 'dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin')
ON CONFLICT (username) DO NOTHING;

-- Asegurar que las columnas del perfil existan
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) DEFAULT 'Kate';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) DEFAULT 'Jones';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Lane no 1, Newyork';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT 'xxxxxxx987';
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(100) DEFAULT 'hencework.com';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS modules TEXT DEFAULT '';


-- =========================================================================
-- PARTE 2: MÓDULO DE CONTACTOS (PERÚ)
-- =========================================================================

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
    numero_documento     VARCHAR(20)  NOT NULL UNIQUE,
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
    date_created         TIMESTAMP    DEFAULT NOW(),
    referencia           VARCHAR(250),
    bidones_prestados    INT          DEFAULT 0
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

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS empresa_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referencia VARCHAR(250);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Lead';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bidones_prestados INT DEFAULT 0;

-- Tabla para almacenar configuraciones dinámicas de la aplicación
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


-- =========================================================================
-- PARTE 3: MÓDULO DE PRODUCTOS Y COMPOSICIONES
-- =========================================================================

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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producto_composicion (
    id SERIAL PRIMARY KEY,
    producto_padre_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    producto_hijo_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 1,
    UNIQUE (producto_padre_id, producto_hijo_id)
);

-- Seed Categorías
INSERT INTO categorias_producto (nombre, descripcion, activo) VALUES
('Envase 20L', 'Categoría para envases vacíos de 20 litros', TRUE),
('Bidón 10L', 'Categoría para bidones de 10 litros', TRUE),
('Recargas 20L', 'Categoría para recargas de agua en bidones de 20 litros', TRUE),
('Bidón Completo (Envase + Recarga)', 'Combo inicial de envase nuevo con recarga de agua', TRUE),
('Promociones', 'Packs promocionales y ofertas especiales', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Seed Productos
INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, es_pack, requiere_retorno, activo) VALUES
('E_B20LSN', 'Envase Bidón 20 L Sin Caño', 'Envase Bidón 20 L Sin Caño', (SELECT id FROM categorias_producto WHERE nombre = 'Envase 20L'), 13.00, 0, FALSE, FALSE, TRUE),
('EB_10L', 'Envase Bidón 10 L', 'Envase Bidón 10 L', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 0.00, -149, FALSE, FALSE, TRUE),
('RB10_', 'Recarga Bidón 10L', 'Recarga Bidón 10L', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 0.00, -272, FALSE, FALSE, TRUE),
('E_B20LCN', 'Envase Bidón 20 L Con Caño', 'Envase Bidón 20 L Con Caño', (SELECT id FROM categorias_producto WHERE nombre = 'Envase 20L'), 13.00, -6, FALSE, FALSE, TRUE),
('B20L-C-R', 'Recarga Bidón 20L con Caño', 'Recarga de bidón 20L de agua alcalina con caño', (SELECT id FROM categorias_producto WHERE nombre = 'Recargas 20L'), 16.00, -446, FALSE, FALSE, TRUE),
('B20L-SC-R', 'Recarga Bidón 20L sin Caño', 'Recarga de 20L para dispensador. Agua ozonizada sin caño', (SELECT id FROM categorias_producto WHERE nombre = 'Recargas 20L'), 16.00, -17, FALSE, FALSE, TRUE),
('B20L-C-E', 'Bidón 20L (Envase + Recarga) con Caño', '¡Bienvenido a Antarqui! ✨ Incluye Bidón de 20L con caño más recarga de agua.', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón Completo (Envase + Recarga)'), 30.00, 0, FALSE, FALSE, TRUE),
('B20L-SC-E', 'Bidón 20L (Envase + Recarga) sin Caño', 'Pack de inicio: Envase Nuevo + 20L de agua ozonizada sin caño.', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón Completo (Envase + Recarga)'), 30.00, 0, FALSE, FALSE, TRUE),
('B10L-I', 'Bidón 10L No Retornable', 'Bidón práctico de 10L No Retornable.', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 7.50, -130, FALSE, FALSE, TRUE),
('P4-B10L', 'Pack 4 Bidones 10L', 'OFERTA: Lleva 4 bidones de 10L y paga solo por una fracción.', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 24.00, 0, TRUE, FALSE, TRUE),
('P6-B10L', 'Pack 6 Bidones 10L', 'SUPER PRECIO: 6 unidades de 10L (S/ 5.50 c/u)', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 33.00, 0, TRUE, FALSE, TRUE),
('P8-B10L', 'Pack 8 Bidones 10L', 'MAXI AHORRO: 8 bidones de 10L a precio de distribuidor.', (SELECT id FROM categorias_producto WHERE nombre = 'Bidón 10L'), 40.00, 0, TRUE, FALSE, TRUE),
('P3-B20LC-B10LG', 'Pack 3 Recargas 20L con Caño + 1 Bidon de 10 L', 'PROMO ESTRELLA: 3 Recargas de 20L + 1 Bidón de 10L gratis', (SELECT id FROM categorias_producto WHERE nombre = 'Promociones'), 48.00, 0, TRUE, FALSE, TRUE),
('P3-B20LC', 'Pack 3 Recargas Bidón 20L con Caño', 'Trío Saludable: 3 Recargas de 20L con caño', (SELECT id FROM categorias_producto WHERE nombre = 'Promociones'), 45.00, 0, TRUE, FALSE, TRUE),
('P3-B20LE-B10LG', 'Pack 3 Recargas Bidón 20L + Envase + Bidón 10L gratis', 'COMBO NUEVO CLIENTE: 3 Bidones nuevos (Lleva envase + recarga) + 1 bidón de 10L gratis', (SELECT id FROM categorias_producto WHERE nombre = 'Promociones'), 90.00, 0, TRUE, FALSE, TRUE)
ON CONFLICT (codigo) DO NOTHING;


-- =========================================================================
-- PARTE 4: MÓDULO AGENTE DE IA DINÁMICO
-- =========================================================================

-- Cobertura de despacho de la IA
CREATE TABLE IF NOT EXISTS shipping_coverage (
    id SERIAL PRIMARY KEY,
    district_name VARCHAR(100) UNIQUE NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    aliases TEXT
);

-- Seed de distritos de cobertura por defecto
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

-- Configuración de productos para la IA
CREATE TABLE IF NOT EXISTS ai_products_config (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE UNIQUE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    search_keywords TEXT,
    custom_ai_description TEXT,
    intent VARCHAR(100),
    priority INTEGER DEFAULT 100,
    media_id_whatsapp VARCHAR(200),
    image_caption TEXT
);

-- Seed inicial habilitando todos los productos existentes para la IA por defecto
INSERT INTO ai_products_config (producto_id, ai_enabled, search_keywords)
SELECT id, TRUE, nombre FROM productos
ON CONFLICT (producto_id) DO NOTHING;

-- Base de conocimientos de FAQs (Base de conocimiento del Chatbot)
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    keywords TEXT NOT NULL,
    answer TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type VARCHAR(20) CHECK (attachment_type IN ('IMAGE','PDF','AUDIO','NONE')) DEFAULT 'NONE',
    intent VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,
    media_id_whatsapp VARCHAR(200),
    media_caption TEXT
);

-- Seed de FAQs del Asesor Comercial
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


-- =========================================================================
-- PARTE 5: LOGÍSTICA, PEDIDOS Y RUTAS
-- =========================================================================

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


-- =========================================================================
-- PARTE 6: GASTOS, COMPRAS Y PROVEEDORES
-- =========================================================================

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


-- =========================================================================
-- PARTE 7: TESORERÍA, CAJA Y DEUDAS BANCARIAS
-- =========================================================================

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


-- =========================================================================
-- PARTE 8: RECURSOS HUMANOS (PERSONAL, ASISTENCIA Y NOMINAS)
-- =========================================================================

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

INSERT INTO gastos_categorias (nombre, tipo, grupo_contable, afecta_margen_bidon, afecta_cac) VALUES
('Planilla de Personal', 'Fijo', 'RRHH', false, false)
ON CONFLICT (nombre) DO NOTHING;


-- =========================================================================
-- PARTE 9: CRM LEADS & OPPORTUNITIES (KANBAN PIPELINE)
-- =========================================================================

CREATE TABLE IF NOT EXISTS kanban_columnas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden INT NOT NULL,
    es_ganada BOOLEAN DEFAULT FALSE,
    label_ganada VARCHAR(100) DEFAULT 'Ganada',
    es_perdida BOOLEAN DEFAULT FALSE,
    label_perdida VARCHAR(100) DEFAULT 'Perdida'
);

-- Insertar columnas por defecto solo si la tabla está vacía
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
    created_at TIMESTAMP DEFAULT NOW(),
    notas TEXT,
    productos_json TEXT
);


-- =========================================================================
-- PARTE 10: VENTAS, RENTABILIDAD & CONTROL DE ENVASES (BOTELLAS RETORNABLES)
-- =========================================================================

CREATE TABLE IF NOT EXISTS ventas (
    id BIGSERIAL PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE,
    contacto_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'pendiente', 
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'pendiente', 
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


-- =========================================================================
-- PARTE 11: AUTOMATIZACIONES MEDIANTE TRIGGERS EN LA BASE DE DATOS
-- =========================================================================

-- Trigger 1: Abre automáticamente una oportunidad de venta a contactos 
-- existentes que envían un mensaje de WhatsApp si no tienen otra activa.
CREATE OR REPLACE FUNCTION trg_create_opportunity_on_wsp()
RETURNS TRIGGER AS $$
DECLARE
    v_contact_id BIGINT;
    v_contact_name VARCHAR;
    v_active_opp_count INT;
    v_default_user_id INT;
    v_max_order INT;
    v_clean_sender VARCHAR;
BEGIN
    IF NEW.status = 'RECEIVED' THEN
        v_clean_sender := RIGHT(REGEXP_REPLACE(NEW.sender, '\D', '', 'g'), 9);

        SELECT id, COALESCE(nombres, '') || ' ' || COALESCE(apellidos, '')
        INTO v_contact_id, v_contact_name
        FROM contacts
        WHERE RIGHT(REGEXP_REPLACE(telefono_principal, '\D', '', 'g'), 9) = v_clean_sender
        LIMIT 1;

        IF v_contact_id IS NOT NULL THEN
            SELECT COUNT(*)
            INTO v_active_opp_count
            FROM oportunidades o
            JOIN kanban_columnas kc ON o.etapa_id = kc.id
            WHERE o.contacto_id = v_contact_id
              AND kc.es_ganada = false
              AND kc.es_perdida = false;

            IF v_active_opp_count = 0 THEN
                SELECT id INTO v_default_user_id FROM users LIMIT 1;
                IF v_default_user_id IS NULL THEN
                    v_default_user_id := 1;
                END IF;

                SELECT COALESCE(MAX(orden), 0)
                INTO v_max_order
                FROM oportunidades
                WHERE etapa_id = 1;

                INSERT INTO oportunidades (
                    titulo, contacto_id, etapa_id, valor, prioridad, etiquetas, usuario_id, orden, created_at, notas
                ) VALUES (
                    'Lead WhatsApp: ' || TRIM(v_contact_name),
                    v_contact_id,
                    1, 
                    0.00,
                    'Media',
                    'WSP', 
                    v_default_user_id,
                    v_max_order + 1,
                    NOW(),
                    'Creado automáticamente por mensaje entrante: ' || NEW.message_text
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_opportunity ON whatsapp_messages;
CREATE TRIGGER trg_whatsapp_opportunity
AFTER INSERT ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION trg_create_opportunity_on_wsp();


-- Trigger 2: Crea automáticamente una oportunidad comercial cuando se registra
-- un nuevo contacto que proviene de un mensaje de WhatsApp.
CREATE OR REPLACE FUNCTION trg_create_opportunity_on_new_contact()
RETURNS TRIGGER AS $$
DECLARE
    v_active_opp_count INT;
    v_default_user_id INT;
    v_max_order INT;
    v_has_wsp_message BOOLEAN;
    v_clean_phone VARCHAR;
END;
DECLARE
BEGIN
    v_clean_phone := RIGHT(REGEXP_REPLACE(NEW.telefono_principal, '\D', '', 'g'), 9);

    SELECT EXISTS(
        SELECT 1 FROM whatsapp_messages 
        WHERE RIGHT(REGEXP_REPLACE(sender, '\D', '', 'g'), 9) = v_clean_phone
          AND status = 'RECEIVED'
    ) INTO v_has_wsp_message;

    IF v_has_wsp_message THEN
        SELECT COUNT(*)
        INTO v_active_opp_count
        FROM oportunidades o
        JOIN kanban_columnas kc ON o.etapa_id = kc.id
        WHERE o.contacto_id = NEW.id
          AND kc.es_ganada = false
          AND kc.es_perdida = false;

        IF v_active_opp_count = 0 THEN
            SELECT id INTO v_default_user_id FROM users LIMIT 1;
            IF v_default_user_id IS NULL THEN
                v_default_user_id := 1;
            END IF;

            SELECT COALESCE(MAX(orden), 0)
            INTO v_max_order
            FROM oportunidades
            WHERE etapa_id = 1;

            INSERT INTO oportunidades (
                titulo, contacto_id, etapa_id, valor, prioridad, etiquetas, usuario_id, orden, created_at, notas
            ) VALUES (
                'Lead WhatsApp: ' || TRIM(COALESCE(NEW.nombres, '') || ' ' || COALESCE(NEW.apellidos, '')),
                NEW.id,
                1, 
                0.00,
                'Media',
                'WSP',
                v_default_user_id,
                v_max_order + 1,
                NOW(),
                'Oportunidad creada automáticamente al registrar nuevo contacto de WhatsApp.'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_contact_opportunity ON contacts;
CREATE TRIGGER trg_new_contact_opportunity
AFTER INSERT ON contacts
FOR EACH ROW
EXECUTE FUNCTION trg_create_opportunity_on_new_contact();
