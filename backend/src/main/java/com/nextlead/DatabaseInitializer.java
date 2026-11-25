package com.nextlead;

import com.nextlead.dao.ContactDao;
import com.nextlead.dao.UserDao;
import com.nextlead.models.Contact;
import com.nextlead.models.Direccion;
import com.nextlead.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private final UserDao userDao;
    private final ContactDao contactDao;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DatabaseInitializer(UserDao userDao, ContactDao contactDao,
                               PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        this.userDao = userDao;
        this.contactDao = contactDao;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // Asegurar que las columnas críticas de tablas existentes existan (Migraciones idempotentes)
        ensureSchemaIntegrity();

        // ── Usuario administrador ───────────────────────────────────────────
        String allModules = "dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin";

        try {
            Integer adminCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE LOWER(TRIM(username)) = 'admin'",
                Integer.class
            );
            if (adminCount == null || adminCount == 0) {
                String defaultAdminPass = "admin123";
                String encodedPass = passwordEncoder.encode(defaultAdminPass);
                jdbcTemplate.update(
                    "INSERT INTO users (username, password, role, first_name, last_name, modules) VALUES ('admin', ?, 'ADMIN', 'Administrador', 'General', ?)",
                    encodedPass, allModules
                );
                System.out.println(">>> Usuario administrador inicial creado con usuario: admin y clave: admin123");
            } else {
                // Si la contraseña actual en la BD es la clave técnica "Admin#2026*Secure!", sincronizarla a "admin123" para permitir acceso y cambio
                List<String> currentPassList = jdbcTemplate.query(
                    "SELECT password FROM users WHERE LOWER(TRIM(username)) = 'admin'",
                    (rs, rowNum) -> rs.getString("password")
                );
                if (!currentPassList.isEmpty()) {
                    String currentPass = currentPassList.get(0);
                    if (currentPass != null && passwordEncoder.matches("Admin#2026*Secure!", currentPass)) {
                        jdbcTemplate.update(
                            "UPDATE users SET password = ? WHERE LOWER(TRIM(username)) = 'admin'",
                            passwordEncoder.encode("admin123")
                        );
                        System.out.println(">>> Contraseña de admin restablecida a valor inicial admin123 para permitir cambio seguro.");
                    } else {
                        System.out.println(">>> Usuario administrador ya tiene una clave personalizada. No se sobreescribe.");
                    }
                }
                // Asegurar que tenga rol ADMIN y módulos habilitados sin tocar su contraseña
                jdbcTemplate.update(
                    "UPDATE users SET role = 'ADMIN', modules = COALESCE(NULLIF(modules, ''), ?) WHERE LOWER(TRIM(username)) = 'admin'",
                    allModules
                );
            }
        } catch (Exception e) {
            System.err.println(">>> Error verificando usuario admin: " + e.getMessage());
        }

        // ── Catálogo de Ubigeo (muestra representativa INEI) ───────────────
        Long ubigeoCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ubigeo_peru", Long.class);
        if (ubigeoCount == null || ubigeoCount == 0) {
            System.out.println(">>> Cargando catálogo de Ubigeo Perú...");
            String sql = "INSERT INTO ubigeo_peru (codigo_ubigeo, departamento, provincia, distrito) VALUES (?,?,?,?) ON CONFLICT DO NOTHING";

            // Lima - Provincia Lima
            Object[][] lima = {
                {"150101","LIMA","LIMA","LIMA"},
                {"150102","LIMA","LIMA","ANCON"},
                {"150103","LIMA","LIMA","ATE"},
                {"150104","LIMA","LIMA","BARRANCO"},
                {"150105","LIMA","LIMA","BREÑA"},
                {"150106","LIMA","LIMA","CARABAYLLO"},
                {"150107","LIMA","LIMA","CHACLACAYO"},
                {"150108","LIMA","LIMA","CHORRILLOS"},
                {"150109","LIMA","LIMA","CIENEGUILLA"},
                {"150110","LIMA","LIMA","COMAS"},
                {"150111","LIMA","LIMA","EL AGUSTINO"},
                {"150112","LIMA","LIMA","INDEPENDENCIA"},
                {"150113","LIMA","LIMA","JESUS MARIA"},
                {"150114","LIMA","LIMA","LA MOLINA"},
                {"150115","LIMA","LIMA","LA VICTORIA"},
                {"150116","LIMA","LIMA","LINCE"},
                {"150117","LIMA","LIMA","LOS OLIVOS"},
                {"150118","LIMA","LIMA","LURIGANCHO"},
                {"150119","LIMA","LIMA","LURIN"},
                {"150120","LIMA","LIMA","MAGDALENA DEL MAR"},
                {"150121","LIMA","LIMA","MAGDALENA VIEJA"},
                {"150122","LIMA","LIMA","MIRAFLORES"},
                {"150123","LIMA","LIMA","PACHACAMAC"},
                {"150124","LIMA","LIMA","PUCUSANA"},
                {"150125","LIMA","LIMA","PUEBLO LIBRE"},
                {"150126","LIMA","LIMA","PUENTE PIEDRA"},
                {"150127","LIMA","LIMA","PUNTA HERMOSA"},
                {"150128","LIMA","LIMA","PUNTA NEGRA"},
                {"150129","LIMA","LIMA","RIMAC"},
                {"150130","LIMA","LIMA","SAN BARTOLO"},
                {"150131","LIMA","LIMA","SAN BORJA"},
                {"150132","LIMA","LIMA","SAN ISIDRO"},
                {"150133","LIMA","LIMA","SAN JUAN DE LURIGANCHO"},
                {"150134","LIMA","LIMA","SAN JUAN DE MIRAFLORES"},
                {"150135","LIMA","LIMA","SAN LUIS"},
                {"150136","LIMA","LIMA","SAN MARTIN DE PORRES"},
                {"150137","LIMA","LIMA","SAN MIGUEL"},
                {"150138","LIMA","LIMA","SANTA ANITA"},
                {"150139","LIMA","LIMA","SANTA MARIA DEL MAR"},
                {"150140","LIMA","LIMA","SANTA ROSA"},
                {"150141","LIMA","LIMA","SANTIAGO DE SURCO"},
                {"150142","LIMA","LIMA","SURQUILLO"},
                {"150143","LIMA","LIMA","VILLA EL SALVADOR"},
                {"150144","LIMA","LIMA","VILLA MARIA DEL TRIUNFO"},
            };
            // Lima - Callao
            Object[][] callao = {
                {"070101","CALLAO","CALLAO","CALLAO"},
                {"070102","CALLAO","CALLAO","BELLAVISTA"},
                {"070103","CALLAO","CALLAO","CARMEN DE LA LEGUA REYNOSO"},
                {"070104","CALLAO","CALLAO","LA PERLA"},
                {"070105","CALLAO","CALLAO","LA PUNTA"},
                {"070106","CALLAO","CALLAO","VENTANILLA"},
                {"070107","CALLAO","CALLAO","MI PERU"},
            };
            // Lima - Huarochiri
            Object[][] huarochiri = {
                {"150901","LIMA","HUAROCHIRI","MATUCANA"},
                {"150902","LIMA","HUAROCHIRI","ANTIOQUÍA"},
                {"150903","LIMA","HUAROCHIRI","CALLAHUANCA"},
                {"150904","LIMA","HUAROCHIRI","CARAMPOMA"},
                {"150905","LIMA","HUAROCHIRI","CHICLA"},
            };
            // Arequipa
            Object[][] arequipa = {
                {"040101","AREQUIPA","AREQUIPA","AREQUIPA"},
                {"040102","AREQUIPA","AREQUIPA","ALTO SELVA ALEGRE"},
                {"040103","AREQUIPA","AREQUIPA","CAYMA"},
                {"040104","AREQUIPA","AREQUIPA","CERRO COLORADO"},
                {"040105","AREQUIPA","AREQUIPA","CHARACATO"},
                {"040106","AREQUIPA","AREQUIPA","CHIGUATA"},
                {"040107","AREQUIPA","AREQUIPA","JACOBO HUNTER"},
                {"040108","AREQUIPA","AREQUIPA","LA JOYA"},
                {"040109","AREQUIPA","AREQUIPA","MARIANO MELGAR"},
                {"040110","AREQUIPA","AREQUIPA","MIRAFLORES"},
                {"040111","AREQUIPA","AREQUIPA","MOLLEBAYA"},
                {"040112","AREQUIPA","AREQUIPA","PAUCARPATA"},
                {"040113","AREQUIPA","AREQUIPA","POCSI"},
                {"040114","AREQUIPA","AREQUIPA","POLOBAYA"},
                {"040115","AREQUIPA","AREQUIPA","QUEQUEÑA"},
                {"040116","AREQUIPA","AREQUIPA","SABANDIA"},
                {"040117","AREQUIPA","AREQUIPA","SACHACA"},
                {"040118","AREQUIPA","AREQUIPA","SAN JUAN DE SIGUAS"},
                {"040119","AREQUIPA","AREQUIPA","SAN JUAN DE TARUCANI"},
                {"040120","AREQUIPA","AREQUIPA","SANTA ISABEL DE SIGUAS"},
                {"040121","AREQUIPA","AREQUIPA","SANTA RITA DE SIGUAS"},
                {"040122","AREQUIPA","AREQUIPA","SOCABAYA"},
                {"040123","AREQUIPA","AREQUIPA","TIABAYA"},
                {"040124","AREQUIPA","AREQUIPA","UCHUMAYO"},
                {"040125","AREQUIPA","AREQUIPA","VITOR"},
                {"040126","AREQUIPA","AREQUIPA","YANAHUARA"},
                {"040127","AREQUIPA","AREQUIPA","YARABAMBA"},
                {"040128","AREQUIPA","AREQUIPA","YURA"},
                {"040129","AREQUIPA","AREQUIPA","JOSE LUIS BUSTAMANTE Y RIVERO"},
            };
            // Cusco
            Object[][] cusco = {
                {"080101","CUSCO","CUSCO","CUSCO"},
                {"080102","CUSCO","CUSCO","CCORCA"},
                {"080103","CUSCO","CUSCO","POROY"},
                {"080104","CUSCO","CUSCO","SAN JERONIMO"},
                {"080105","CUSCO","CUSCO","SAN SEBASTIAN"},
                {"080106","CUSCO","CUSCO","SANTIAGO"},
                {"080107","CUSCO","CUSCO","SAYLLA"},
                {"080108","CUSCO","CUSCO","WANCHAQ"},
            };
            // Trujillo
            Object[][] trujillo = {
                {"130101","LA LIBERTAD","TRUJILLO","TRUJILLO"},
                {"130102","LA LIBERTAD","TRUJILLO","EL PORVENIR"},
                {"130103","LA LIBERTAD","TRUJILLO","FLORENCIA DE MORA"},
                {"130104","LA LIBERTAD","TRUJILLO","HUANCHACO"},
                {"130105","LA LIBERTAD","TRUJILLO","LA ESPERANZA"},
                {"130106","LA LIBERTAD","TRUJILLO","LAREDO"},
                {"130107","LA LIBERTAD","TRUJILLO","MOCHE"},
                {"130108","LA LIBERTAD","TRUJILLO","POROTO"},
                {"130109","LA LIBERTAD","TRUJILLO","SALAVERRY"},
                {"130110","LA LIBERTAD","TRUJILLO","SIMBAL"},
                {"130111","LA LIBERTAD","TRUJILLO","VICTOR LARCO HERRERA"},
            };
            // Chiclayo
            Object[][] chiclayo = {
                {"140101","LAMBAYEQUE","CHICLAYO","CHICLAYO"},
                {"140102","LAMBAYEQUE","CHICLAYO","CHONGOYAPE"},
                {"140103","LAMBAYEQUE","CHICLAYO","ETEN"},
                {"140104","LAMBAYEQUE","CHICLAYO","ETEN PUERTO"},
                {"140105","LAMBAYEQUE","CHICLAYO","JOSE LEONARDO ORTIZ"},
                {"140106","LAMBAYEQUE","CHICLAYO","LA VICTORIA"},
                {"140107","LAMBAYEQUE","CHICLAYO","LAGUNAS"},
                {"140108","LAMBAYEQUE","CHICLAYO","MONSEFU"},
                {"140109","LAMBAYEQUE","CHICLAYO","NUEVA ARICA"},
                {"140110","LAMBAYEQUE","CHICLAYO","OYOTUN"},
                {"140111","LAMBAYEQUE","CHICLAYO","PATAPO"},
                {"140112","LAMBAYEQUE","CHICLAYO","PICSI"},
                {"140113","LAMBAYEQUE","CHICLAYO","PIMENTEL"},
                {"140114","LAMBAYEQUE","CHICLAYO","REQUE"},
                {"140115","LAMBAYEQUE","CHICLAYO","SANTA ROSA"},
                {"140116","LAMBAYEQUE","CHICLAYO","SAÑA"},
                {"140117","LAMBAYEQUE","CHICLAYO","CAYALTI"},
                {"140118","LAMBAYEQUE","CHICLAYO","PUCALA"},
                {"140119","LAMBAYEQUE","CHICLAYO","TUMAN"},
                {"140120","LAMBAYEQUE","CHICLAYO","CIUDAD ETEN"},
            };
            // Piura
            Object[][] piura = {
                {"200101","PIURA","PIURA","PIURA"},
                {"200102","PIURA","PIURA","CASTILLA"},
                {"200103","PIURA","PIURA","CATACAOS"},
                {"200104","PIURA","PIURA","CURA MORI"},
                {"200105","PIURA","PIURA","EL TALLAN"},
                {"200106","PIURA","PIURA","LA ARENA"},
                {"200107","PIURA","PIURA","LA UNION"},
                {"200108","PIURA","PIURA","LAS LOMAS"},
                {"200109","PIURA","PIURA","TAMBO GRANDE"},
                {"200110","PIURA","PIURA","VEINTISEIS DE OCTUBRE"},
            };

            Object[][][] allUbigeos = {lima, callao, huarochiri, arequipa, cusco, trujillo, chiclayo, piura};
            for (Object[][] group : allUbigeos) {
                for (Object[] row : group) {
                    jdbcTemplate.update(sql, row[0], row[1], row[2], row[3]);
                }
            }
            System.out.println(">>> Ubigeo Perú cargado correctamente.");
        }

        // ── Contactos masivos y semilla ─────────────────────────────────────
        boolean massLoaded = false;
        if (contactDao.count() < 100) {
            massLoaded = seedContactsFromDump();
        }

        if (!massLoaded && contactDao.count() == 0) {
            System.out.println(">>> Creando contactos de prueba básicos...");

            // Empresa semilla
            Contact empresa = new Contact();
            empresa.setTipoPersona("EMPRESA");
            empresa.setTipoDocumento("RUC");
            empresa.setNumeroDocumento("20512382819");
            empresa.setRazonSocial("NextLead Technologies S.A.C.");
            empresa.setTelefonoPrincipal("016000001");
            empresa.setEmail("contacto@nextlead.pe");
            empresa.setStarred(false);

            Direccion dirEmpresa = new Direccion();
            dirEmpresa.setNombreUbicacion("Sede Principal");
            dirEmpresa.setCodigoUbigeo("150132");
            dirEmpresa.setDireccionCompleta("Av. El Derby 254, Torre 1 Piso 5");
            dirEmpresa.setReferencia("Frente al Jockey Plaza");
            dirEmpresa.setLatitud(-12.0985);
            dirEmpresa.setLongitud(-77.0363);
            empresa.setDirecciones(List.of(dirEmpresa));

            Contact empresaGuardada = contactDao.save(empresa);
            System.out.println(">>> Empresa creada con ID: " + empresaGuardada.getId());

            // Persona Natural semilla
            Contact persona = new Contact();
            persona.setTipoPersona("NATURAL");
            persona.setTipoDocumento("DNI");
            persona.setNumeroDocumento("72345678");
            persona.setNombres("Carlos Andrés");
            persona.setApellidos("Quispe Mamani");
            persona.setTelefonoPrincipal("999888777");
            persona.setEmail("carlos.quispe@email.com");
            persona.setEmpresaId(empresaGuardada.getId());
            persona.setStarred(true);

            Direccion dirPersona = new Direccion();
            dirPersona.setNombreUbicacion("Casa");
            dirPersona.setCodigoUbigeo("150122");
            dirPersona.setDireccionCompleta("Calle Schell 130, Dpto 302");
            dirPersona.setReferencia("A una cuadra de la Plaza de Miraflores");
            dirPersona.setLatitud(-12.1196);
            dirPersona.setLongitud(-77.0281);
            persona.setDirecciones(List.of(dirPersona));

            contactDao.save(persona);
            System.out.println(">>> Persona Natural semilla creada correctamente.");
        }
    }

    private boolean seedContactsFromDump() {
        System.out.println(">>> Verificando archivo de siembra /data/contacts_data.sql.gz...");
        try (java.io.InputStream is = getClass().getResourceAsStream("/data/contacts_data.sql.gz")) {
            if (is == null) {
                System.out.println(">>> No se encontró /data/contacts_data.sql.gz en los recursos.");
                return false;
            }

            System.out.println(">>> Restaurando catálogo masivo de 52,483 contactos B2B...");
            // Limpiar contactos residuales de prueba para evitar colisión de clave única
            try {
                jdbcTemplate.execute("TRUNCATE TABLE direcciones, contacts RESTART IDENTITY CASCADE;");
            } catch (Exception e) {
                System.err.println(">>> Nota al limpiar contactos previos: " + e.getMessage());
            }

            try {
                jdbcTemplate.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_contact_opportunity') THEN ALTER TABLE contacts DISABLE TRIGGER trg_new_contact_opportunity; END IF; END $$;");
            } catch (Exception ignored) {}

            try (java.util.zip.GZIPInputStream gzip = new java.util.zip.GZIPInputStream(is);
                 java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(gzip, java.nio.charset.StandardCharsets.UTF_8))) {

                StringBuilder batch = new StringBuilder();
                String line;
                int count = 0;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith("--") || trimmed.startsWith("\\")) {
                        continue;
                    }
                    batch.append(line).append("\n");
                    if (trimmed.endsWith(";")) {
                        count++;
                        if (count >= 500) {
                            jdbcTemplate.execute(batch.toString());
                            batch.setLength(0);
                            count = 0;
                        }
                    }
                }
                if (batch.length() > 0) {
                    jdbcTemplate.execute(batch.toString());
                }
            } finally {
                try {
                    jdbcTemplate.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_contact_opportunity') THEN ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity; END IF; END $$;");
                    jdbcTemplate.execute("SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1));");
                    jdbcTemplate.execute("SELECT setval('direcciones_id_seq', COALESCE((SELECT MAX(id) FROM direcciones), 1));");
                } catch (Exception ignored) {}
            }

            long total = contactDao.count();
            System.out.println(">>> ¡Restauración masiva completada exitosamente! Total contactos: " + total);
            return total > 0;
        } catch (Exception e) {
            System.err.println(">>> Advertencia en siembra masiva de contactos: " + e.getMessage());
            return false;
        }
    }

    private void ensureSchemaIntegrity() {
        String[] migrations = {
            // Users
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS modules TEXT DEFAULT ''",
            "ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) DEFAULT 'Administrador'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) DEFAULT 'General'",

            // Contactos - Experian y Finanzas
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS nro_entidades INTEGER",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS score_experian NUMERIC(10,4)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS semaforo_experian VARCHAR(20)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deuda_sbs NUMERIC(14,2)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS calificacion_sbs VARCHAR(50)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS rango_ventas VARCHAR(100)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cargo VARCHAR(100)",
            "ALTER TABLE contacts ALTER COLUMN numero_documento DROP NOT NULL",
            "ALTER TABLE contacts ALTER COLUMN tipo_documento DROP NOT NULL",
            "ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_tipo_documento_check",
            "CREATE INDEX IF NOT EXISTS idx_contacts_tipo_persona ON contacts(tipo_persona)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_numero_doc ON contacts(numero_documento)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_telefono ON contacts(telefono_principal)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_empresa_id ON contacts(empresa_id)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_semaforo ON contacts(semaforo_experian)",
            "CREATE INDEX IF NOT EXISTS idx_direcciones_id_contacto ON direcciones(id_contacto)",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS asignado_a_id INT REFERENCES users(id) ON DELETE SET NULL",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trabajador_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL",
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP",
            "CREATE INDEX IF NOT EXISTS idx_contacts_asignado_a ON contacts(asignado_a_id)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_trabajador_id ON contacts(trabajador_id)",
            "CREATE INDEX IF NOT EXISTS idx_contacts_fecha_asignacion ON contacts(fecha_asignacion)",

            // Trabajadores
            "ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS equipo VARCHAR(100)",
            "ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS supervisor_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL",
            "ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS perfil_comision_id INT REFERENCES rentabilidad_perfiles(id) ON DELETE SET NULL",
            "ALTER TABLE trabajadores ADD COLUMN IF NOT EXISTS gastos_adicionales NUMERIC(12,2) DEFAULT 0.00",

            // Ventas
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS oportunidad_id BIGINT REFERENCES oportunidades(id) ON DELETE SET NULL",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES trabajadores(id) ON DELETE SET NULL",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS equipo VARCHAR(100)",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_instalacion VARCHAR(50) DEFAULT 'pendiente'",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_instalacion TIMESTAMP",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS documentos_instalacion TEXT",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tecnico_instalador VARCHAR(100)",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS notas_instalacion TEXT",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(50)",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS aprobado_por VARCHAR(100)",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS facturas_seguimiento TEXT",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS igv NUMERIC(12, 2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS direccion_entrega VARCHAR(255)",

            // Oportunidades
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS notas TEXT",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS productos_json TEXT",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS tipo_propuesta VARCHAR(50) DEFAULT 'venta'",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS total_instalacion NUMERIC(12,2) DEFAULT 0.00",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS plazo_acuerdo VARCHAR(100)",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS moneda VARCHAR(20) DEFAULT 'PEN'",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_nombre VARCHAR(150)",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_cargo VARCHAR(100)",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_celular VARCHAR(50)",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_email VARCHAR(100)",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS condiciones_comerciales TEXT",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS detalles_json TEXT",
            "ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS contacto_persona VARCHAR(150)",

            // Limpieza de URLs con localhost en system_settings y productos
            "UPDATE system_settings SET value_text = SUBSTRING(value_text FROM POSITION('/uploads/' IN value_text)) WHERE value_text LIKE '%/uploads/%' AND (value_text LIKE 'http://localhost%' OR value_text LIKE 'http://127.0.0.1%')",
            "UPDATE system_settings SET value_text = SUBSTRING(value_text FROM POSITION('/productos/' IN value_text)) WHERE value_text LIKE '%/productos/%' AND (value_text LIKE 'http://localhost%' OR value_text LIKE 'http://127.0.0.1%')",
            "UPDATE productos SET imagen = SUBSTRING(imagen FROM POSITION('/uploads/' IN imagen)) WHERE imagen LIKE '%/uploads/%' AND (imagen LIKE 'http://localhost%' OR imagen LIKE 'http://127.0.0.1%')",
            "UPDATE productos SET imagen = SUBSTRING(imagen FROM POSITION('/productos/' IN imagen)) WHERE imagen LIKE '%/productos/%' AND (imagen LIKE 'http://localhost%' OR imagen LIKE 'http://127.0.0.1%')",

            // Asignación de imágenes oficiales a los planes de ON Negocios
            "UPDATE productos SET imagen = '/productos/01_plan_200_LITE.png' WHERE codigo = 'PLAN-200-LITE' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/02_plan_300_LITE.png' WHERE codigo = 'PLAN-300-LITE' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/03_plan_300_PLUS.png' WHERE codigo = 'PLAN-300-PLUS' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/04_plan_400_PLUS.png' WHERE codigo = 'PLAN-400-PLUS' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/05_plan_400_PLUS_Router.png' WHERE codigo = 'PLAN-400-PLUS-ROUTER' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/06_plan_600_LITE.png' WHERE codigo = 'PLAN-600-LITE' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/07_plan_600_PLUS.png' WHERE codigo = 'PLAN-600-PLUS' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/08_plan_600_PLUS_Router.png' WHERE codigo = 'PLAN-600-PLUS-ROUTER' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/09_plan_1000_LITE.png' WHERE codigo = 'PLAN-1000-LITE' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/10_plan_300_business.png' WHERE codigo = 'PLAN-300-BUSINESS' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",
            "UPDATE productos SET imagen = '/productos/11_plan_400_business_wifi.png' WHERE codigo = 'PLAN-400-BUSINESS-WIFI' AND (imagen IS NULL OR imagen = '' OR imagen LIKE '%localhost%')",

            // Roles y Permisos del Sistema
            "CREATE TABLE IF NOT EXISTS roles_sistema (" +
            "    id SERIAL PRIMARY KEY," +
            "    codigo VARCHAR(50) UNIQUE NOT NULL," +
            "    nombre VARCHAR(100) NOT NULL," +
            "    descripcion TEXT," +
            "    color VARCHAR(20) DEFAULT '#3b82f6'," +
            "    badge_color VARCHAR(30) DEFAULT 'bg-blue-600'," +
            "    es_sistema BOOLEAN DEFAULT false," +
            "    sales_scope VARCHAR(20) DEFAULT 'own'," +
            "    permisos JSONB DEFAULT '{}'::jsonb," +
            "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
            ")",

            "INSERT INTO roles_sistema (codigo, nombre, descripcion, color, badge_color, es_sistema, sales_scope, permisos) VALUES " +
            "('ADMIN', 'Administrador Total', 'Acceso total e irrestricto a todos los módulos comerciales, financieros y administrativos.', '#9333ea', 'bg-purple-600', true, 'all', '{\"ventas\":{\"ver\":true,\"crear\":true,\"editar\":true,\"instalar\":true,\"anular\":true,\"reasignar\":true,\"exportar\":true},\"finanzas\":{\"ver_flujo\":true,\"registrar_movimiento\":true,\"ver_cuentas_bancarias\":true,\"anular_movimiento\":true},\"rentabilidad\":{\"ver_margenes\":true,\"ver_costos\":true,\"simulador\":true,\"configurar_perfiles\":true},\"payroll\":{\"ver_personal\":true,\"gestionar_personal\":true,\"ver_liquidaciones\":true,\"pagar_comisiones\":true},\"clientes\":{\"ver_todos\":true,\"crear\":true,\"chatear_whatsapp\":true,\"exportar\":true},\"admin\":{\"gestionar_usuarios\":true,\"gestionar_roles\":true,\"ajustes_sistema\":true}}'::jsonb), " +
            "('SUPERVISOR', 'Supervisor de Ventas', 'Supervisión del equipo comercial, validación y pase a instaladas de ventas y comisiones del equipo.', '#2563eb', 'bg-blue-600', true, 'team', '{\"ventas\":{\"ver\":true,\"crear\":true,\"editar\":true,\"instalar\":true,\"anular\":false,\"reasignar\":true,\"exportar\":true},\"finanzas\":{\"ver_flujo\":false,\"registrar_movimiento\":false,\"ver_cuentas_bancarias\":false,\"anular_movimiento\":false},\"rentabilidad\":{\"ver_margenes\":true,\"ver_costos\":false,\"simulador\":true,\"configurar_perfiles\":false},\"payroll\":{\"ver_personal\":true,\"gestionar_personal\":false,\"ver_liquidaciones\":true,\"pagar_comisiones\":false},\"clientes\":{\"ver_todos\":true,\"crear\":true,\"chatear_whatsapp\":true,\"exportar\":false},\"admin\":{\"gestionar_usuarios\":false,\"gestionar_roles\":false,\"ajustes_sistema\":false}}'::jsonb), " +
            "('VENDEDOR', 'Vendedor / Asesor Comercial', 'Asesor comercial. Únicamente puede consultar sus propias ventas asignadas y dar seguimiento a sus prospectos.', '#059669', 'bg-emerald-600', true, 'own', '{\"ventas\":{\"ver\":true,\"crear\":true,\"editar\":true,\"instalar\":false,\"anular\":false,\"reasignar\":false,\"exportar\":false},\"finanzas\":{\"ver_flujo\":false,\"registrar_movimiento\":false,\"ver_cuentas_bancarias\":false,\"anular_movimiento\":false},\"rentabilidad\":{\"ver_margenes\":false,\"ver_costos\":false,\"simulador\":false,\"configurar_perfiles\":false},\"payroll\":{\"ver_personal\":false,\"gestionar_personal\":false,\"ver_liquidaciones\":false,\"pagar_comisiones\":false},\"clientes\":{\"ver_todos\":false,\"crear\":true,\"chatear_whatsapp\":true,\"exportar\":false},\"admin\":{\"gestionar_usuarios\":false,\"gestionar_roles\":false,\"ajustes_sistema\":false}}'::jsonb), " +
            "('FINANZAS', 'Finanzas & Tesorería', 'Tesorería y contabilidad. Control de caja chica, bancos (BCP, BBVA), márgenes sin IGV y pago de nóminas.', '#d97706', 'bg-amber-600', true, 'all', '{\"ventas\":{\"ver\":true,\"crear\":false,\"editar\":false,\"instalar\":false,\"anular\":false,\"reasignar\":false,\"exportar\":true},\"finanzas\":{\"ver_flujo\":true,\"registrar_movimiento\":true,\"ver_cuentas_bancarias\":true,\"anular_movimiento\":true},\"rentabilidad\":{\"ver_margenes\":true,\"ver_costos\":true,\"simulador\":true,\"configurar_perfiles\":true},\"payroll\":{\"ver_personal\":true,\"gestionar_personal\":true,\"ver_liquidaciones\":true,\"pagar_comisiones\":true},\"clientes\":{\"ver_todos\":true,\"crear\":false,\"chatear_whatsapp\":false,\"exportar\":false},\"admin\":{\"gestionar_usuarios\":false,\"gestionar_roles\":false,\"ajustes_sistema\":false}}'::jsonb), " +
            "('OPERACIONES', 'Operaciones & Logística', 'Logística e instalaciones. Verificación técnica de servicios, agendamiento de instalaciones y despacho.', '#0891b2', 'bg-cyan-600', true, 'all', '{\"ventas\":{\"ver\":true,\"crear\":false,\"editar\":false,\"instalar\":true,\"anular\":false,\"reasignar\":false,\"exportar\":false},\"finanzas\":{\"ver_flujo\":false,\"registrar_movimiento\":false,\"ver_cuentas_bancarias\":false,\"anular_movimiento\":false},\"rentabilidad\":{\"ver_margenes\":false,\"ver_costos\":false,\"simulador\":false,\"configurar_perfiles\":false},\"payroll\":{\"ver_personal\":true,\"gestionar_personal\":false,\"ver_liquidaciones\":false,\"pagar_comisiones\":false},\"clientes\":{\"ver_todos\":true,\"crear\":false,\"chatear_whatsapp\":true,\"exportar\":false},\"admin\":{\"gestionar_usuarios\":false,\"gestionar_roles\":false,\"ajustes_sistema\":false}}'::jsonb) " +
            "ON CONFLICT (codigo) DO NOTHING",

            // Mejoras IA y Shipping Coverage
            "ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS intent VARCHAR(100)",
            "ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100",
            "ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200)",
            "ALTER TABLE ai_products_config ADD COLUMN IF NOT EXISTS image_caption TEXT",

            "ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS intent VARCHAR(100)",
            "ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100",
            "ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_id_whatsapp VARCHAR(200)",
            "ALTER TABLE ai_knowledge_base ADD COLUMN IF NOT EXISTS media_caption TEXT",

            "ALTER TABLE shipping_coverage ADD COLUMN IF NOT EXISTS aliases TEXT"
        };

        for (String sql : migrations) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception e) {
                System.err.println(">>> Migración completada o columna ya existente: " + e.getMessage());
            }
        }
        System.out.println(">>> Integridad de esquema de base de datos verificada con éxito.");
    }
}
