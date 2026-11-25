-- ============================================================
-- SCRIPT DE CORRECCIÓN INMEDIATA PARA BASE DE DATOS EN VPS
-- Crea roles_sistema, siembra los roles del sistema y agrega
-- columnas faltantes de IA y Shipping Coverage.
-- ============================================================

-- 1. Tabla roles_sistema y permisos
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Siembra de roles oficiales del sistema
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

-- 3. Columnas para IA de productos
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200);
ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS image_caption TEXT;

-- 4. Columnas para IA base de conocimiento
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS intent VARCHAR(100);
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200);
ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_caption TEXT;

-- 5. Columnas para cobertura de envíos
ALTER TABLE shipping_coverage ADD COLUMN IF NOT EXISTS aliases TEXT;

-- 6. Permitir representantes legales de empresas sin DNI obligatorio
ALTER TABLE contacts ALTER COLUMN numero_documento DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tipo_documento_check;
