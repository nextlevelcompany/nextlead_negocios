package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.*;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/opportunities")
public class OpportunityController {

    private final JdbcTemplate jdbcTemplate;
    private final com.nextlead.dao.UserDao userDao;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public OpportunityController(JdbcTemplate jdbcTemplate, com.nextlead.dao.UserDao userDao) {
        this.jdbcTemplate = jdbcTemplate;
        this.userDao = userDao;
    }

    private Object[] resolveUserScope() {
        Integer usuarioId = null;
        Long trabajadorId = null;
        String scope = "all";
        try {
            org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                java.util.Optional<com.nextlead.models.User> uOpt = userDao.findByUsername(auth.getName());
                if (uOpt.isPresent()) {
                    com.nextlead.models.User u = uOpt.get();
                    String role = u.getRole() != null ? u.getRole().toUpperCase() : "ADMIN";
                    if (!"ADMIN".equals(role)) {
                        usuarioId = u.getId() != null ? u.getId().intValue() : null;
                        try {
                            String s = jdbcTemplate.queryForObject(
                                "SELECT sales_scope FROM roles_sistema WHERE UPPER(codigo) = ?", String.class, role);
                            if (s != null) scope = s.toLowerCase();
                            else scope = "VENDEDOR".equals(role) ? "own" : ("SUPERVISOR".equals(role) ? "team" : "all");
                        } catch (Exception e) {
                            scope = "VENDEDOR".equals(role) ? "own" : ("SUPERVISOR".equals(role) ? "team" : "all");
                        }
                        try {
                            Long tid = jdbcTemplate.queryForObject(
                                "SELECT id FROM trabajadores WHERE usuario_id = ? LIMIT 1", Long.class, u.getId());
                            if (tid != null) trabajadorId = tid;
                        } catch (Exception ignored) {}
                        if (trabajadorId == null && u.getModules() != null && u.getModules().contains("\"trabajador_id\":")) {
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"trabajador_id\"\\s*:\\s*(\\d+)").matcher(u.getModules());
                            if (m.find()) trabajadorId = Long.parseLong(m.group(1));
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return new Object[]{ usuarioId, trabajadorId, scope };
    }

    private String getSetting(String key, String defaultVal) {
        try {
            String val = jdbcTemplate.queryForObject("SELECT value_text FROM system_settings WHERE key_name = ?", String.class, key);
            return val != null ? val : defaultVal;
        } catch (Exception e) {
            return defaultVal;
        }
    }

    // ==========================================
    // 1. KANBAN BOARD DATA BUNDLE
    // ==========================================
    @GetMapping("/kanban")
    public ResponseEntity<?> getKanbanData() {
        try {
            // Auto hot migration: Ensure columns exist
            try {
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES trabajadores(id) ON DELETE SET NULL");
            } catch (Exception ignored) {}

            // Resolve user scope for data privacy
            Object[] scopeInfo = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeInfo[0];
            Long authTrabajadorId = (Long) scopeInfo[1];
            String scope = (String) scopeInfo[2];

            String oppWhere = "";
            List<Object> oppParams = new ArrayList<>();
            if ("own".equals(scope)) {
                if (authTrabajadorId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ? OR (o.trabajador_id IS NULL AND o.usuario_id = ?)) ";
                    oppParams.add(authTrabajadorId.intValue());
                    oppParams.add(authUsuarioId != null ? authUsuarioId : -1);
                } else if (authUsuarioId != null) {
                    oppWhere = "WHERE (o.usuario_id = ?) ";
                    oppParams.add(authUsuarioId);
                }
            } else if ("team".equals(scope) && authTrabajadorId != null) {
                oppWhere = "WHERE (o.supervisor_id = ? OR o.trabajador_id = ? OR t.supervisor_id = ?) ";
                oppParams.add(authTrabajadorId.intValue());
                oppParams.add(authTrabajadorId.intValue());
                oppParams.add(authTrabajadorId.intValue());
            }

            // Columns (Stages)
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT * FROM kanban_columnas ORDER BY orden ASC"
            );

            // Opportunities with Commercial Staff & Supervisor info
            String oppSql =
                "SELECT o.*, " +
                "       COALESCE(NULLIF(o.contacto_persona, ''), " +
                "                (SELECT CONCAT(sc.nombres, ' ', sc.apellidos) FROM contacts sc WHERE sc.empresa_id = c.id AND sc.nombres IS NOT NULL LIMIT 1), " +
                "                CASE WHEN c.tipo_persona = 'natural' THEN CONCAT(c.nombres, ' ', c.apellidos) ELSE NULL END " +
                "       ) as contacto_persona_calculado, " +
                "       c.tipo_persona as contacto_tipo_persona, c.numero_documento, c.telefono_principal as telefono_movil, c.email as contacto_email, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as contacto_nombre_completo, " +
                "       COALESCE(o.trabajador_id, t.id) as trabajador_id, " +
                "       COALESCE(TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))), NULLIF(o.firma_nombre, ''), CONCAT(u.first_name, ' ', u.last_name)) as vendedor_nombre, " +
                "       rp.id as vendedor_perfil_id, " +
                "       COALESCE(rp.nombre, t.rol_operativo, 'Ejecutivo') as vendedor_perfil, " +
                "       COALESCE(o.supervisor_id, t.supervisor_id) as supervisor_id, " +
                "       TRIM(CONCAT(sup.nombre, ' ', COALESCE(sup.apellido, ''))) as supervisor_nombre, " +
                "       COALESCE(t.equipo, 'Equipo Principal') as equipo_nombre " +
                "FROM oportunidades o " +
                "LEFT JOIN contacts c ON o.contacto_id = c.id " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                "LEFT JOIN trabajadores t ON (o.trabajador_id IS NOT NULL AND o.trabajador_id = t.id) " +
                "                         OR (o.trabajador_id IS NULL AND t.usuario_id = o.usuario_id) " +
                "                         OR (o.trabajador_id IS NULL AND o.usuario_id IS NULL AND o.firma_nombre IS NOT NULL AND (t.nombre ILIKE o.firma_nombre OR CONCAT(t.nombre, ' ', t.apellido) ILIKE o.firma_nombre)) " +
                "LEFT JOIN rentabilidad_perfiles rp ON t.perfil_comision_id = rp.id " +
                "LEFT JOIN trabajadores sup ON COALESCE(o.supervisor_id, t.supervisor_id) = sup.id " +
                oppWhere +
                "ORDER BY o.orden ASC, o.id DESC";

            List<Map<String, Object>> opps = oppParams.isEmpty()
                ? jdbcTemplate.queryForList(oppSql)
                : jdbcTemplate.queryForList(oppSql, oppParams.toArray());

            // Master Tags
            List<Map<String, Object>> tags = jdbcTemplate.queryForList(
                "SELECT * FROM kanban_etiquetas ORDER BY nombre ASC"
            );

            // Contacts for dropdown: If scope is own, only assigned contacts
            String contactsSql =
                "SELECT c.id, c.tipo_persona, c.numero_documento, c.telefono_principal, c.email, " +
                "       c.razon_social, c.nombres, c.apellidos, c.empresa_id, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as display_name, " +
                "       e.razon_social as empresa_padre_nombre " +
                "FROM contacts c " +
                "LEFT JOIN contacts e ON c.empresa_id = e.id ";

            List<Object> contactsParams = new ArrayList<>();
            if ("own".equals(scope)) {
                contactsSql += "WHERE (c.asignado_a_id = ? OR c.trabajador_id = ?) ";
                contactsParams.add(authTrabajadorId != null ? authTrabajadorId.intValue() : (authUsuarioId != null ? authUsuarioId : -1));
                contactsParams.add(authTrabajadorId != null ? authTrabajadorId.intValue() : -1);
            }
            contactsSql += "ORDER BY display_name ASC";

            List<Map<String, Object>> contacts = contactsParams.isEmpty()
                ? jdbcTemplate.queryForList(contactsSql)
                : jdbcTemplate.queryForList(contactsSql, contactsParams.toArray());

            // Active Staff for Commercial Filters & Assignment
            String staffSql =
                "SELECT t.id, t.nombre, t.apellido, t.rol_operativo, t.perfil_comision_id, rp.nombre as perfil_nombre, " +
                "       t.supervisor_id, TRIM(CONCAT(sup.nombre, ' ', COALESCE(sup.apellido, ''))) as supervisor_nombre, t.equipo " +
                "FROM trabajadores t " +
                "LEFT JOIN rentabilidad_perfiles rp ON t.perfil_comision_id = rp.id " +
                "LEFT JOIN trabajadores sup ON t.supervisor_id = sup.id " +
                "WHERE (t.estado IS NULL OR t.estado = 'Activo') ";

            List<Object> staffParams = new ArrayList<>();
            if ("own".equals(scope) && authTrabajadorId != null) {
                staffSql += "AND t.id = ? ";
                staffParams.add(authTrabajadorId.intValue());
            } else if ("team".equals(scope) && authTrabajadorId != null) {
                staffSql += "AND (t.id = ? OR t.supervisor_id = ?) ";
                staffParams.add(authTrabajadorId.intValue());
                staffParams.add(authTrabajadorId.intValue());
            }
            staffSql += "ORDER BY t.nombre ASC";

            List<Map<String, Object>> staff = staffParams.isEmpty()
                ? jdbcTemplate.queryForList(staffSql)
                : jdbcTemplate.queryForList(staffSql, staffParams.toArray());

            Map<String, Object> resp = new HashMap<>();
            resp.put("columns", columns);
            resp.put("opportunities", opps);
            resp.put("tags", tags);
            resp.put("contacts", contacts);
            resp.put("staff", staff);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener datos de oportunidades: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. OPPORTUNITY CRUD
    // ==========================================
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveOpportunity(@RequestBody SaveOpportunityRequest req) {
        try {
            // Hot migration: Ensure all quote fields exist in DB
            try {
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS notas TEXT");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS productos_json TEXT");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS tipo_propuesta VARCHAR(30) DEFAULT 'venta'");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS total_instalacion NUMERIC(12,2) DEFAULT 0.00");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS plazo_acuerdo INT DEFAULT 12");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS moneda VARCHAR(20) DEFAULT 'Soles'");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_nombre VARCHAR(150)");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_cargo VARCHAR(150)");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_celular VARCHAR(50)");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS firma_email VARCHAR(150)");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS condiciones_comerciales TEXT");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS detalles_json TEXT");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS trabajador_id INT REFERENCES trabajadores(id) ON DELETE SET NULL");
                jdbcTemplate.execute("ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS supervisor_id INT REFERENCES trabajadores(id) ON DELETE SET NULL");
            } catch (Exception ignored) {}

            if (req.titulo == null || req.titulo.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El título de la oportunidad es obligatorio."));
            }
            if (req.etapa_id == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "La etapa o columna es obligatoria."));
            }

            Object[] saveScopeInfo = resolveUserScope();
            Integer authSaveUsuarioId = (Integer) saveScopeInfo[0];
            Long authSaveTrabajadorId = (Long) saveScopeInfo[1];
            String saveScope = (String) saveScopeInfo[2];

            Integer finalTrabajadorId = req.trabajador_id;
            Integer finalSupervisorId = req.supervisor_id;

            if ("own".equals(saveScope)) {
                if (authSaveTrabajadorId != null) {
                    finalTrabajadorId = authSaveTrabajadorId.intValue();
                }
            }

            if (finalTrabajadorId != null && finalSupervisorId == null) {
                try {
                    finalSupervisorId = jdbcTemplate.queryForObject(
                        "SELECT supervisor_id FROM trabajadores WHERE id = ?", Integer.class, finalTrabajadorId
                    );
                } catch (Exception ignored) {}
            }

            boolean isEdit = req.id != null;
            Long oppId;

            if (isEdit) {
                jdbcTemplate.update(
                    "UPDATE oportunidades SET titulo = ?, contacto_id = ?, etapa_id = ?, valor = ?, prioridad = ?, etiquetas = ?, notas = ?, productos_json = ?, " +
                    "tipo_propuesta = ?, total_instalacion = ?, plazo_acuerdo = ?, moneda = ?, firma_nombre = ?, firma_cargo = ?, firma_celular = ?, firma_email = ?, condiciones_comerciales = ?, detalles_json = ?, contacto_persona = ?, trabajador_id = ?, supervisor_id = ? " +
                    "WHERE id = ?",
                    req.titulo, req.contacto_id, req.etapa_id, req.valor, req.prioridad, req.etiquetas, req.notas, req.productos_json,
                    req.tipo_propuesta != null ? req.tipo_propuesta : "venta",
                    req.total_instalacion != null ? req.total_instalacion : 0.0,
                    req.plazo_acuerdo != null ? req.plazo_acuerdo : 12,
                    req.moneda != null ? req.moneda : "Soles",
                    req.firma_nombre, req.firma_cargo, req.firma_celular, req.firma_email,
                    req.condiciones_comerciales, req.detalles_json, req.contacto_persona,
                    finalTrabajadorId, finalSupervisorId,
                    req.id
                );
                oppId = req.id;
            } else {
                // Fetch user id to assign
                Integer defaultUserId = authSaveUsuarioId != null ? authSaveUsuarioId : 1;
                if (authSaveUsuarioId == null) {
                    try {
                        defaultUserId = jdbcTemplate.queryForObject("SELECT id FROM users LIMIT 1", Integer.class);
                    } catch (Exception ignored) {}
                }

                // Get max order
                Integer maxOrder = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(MAX(orden), 0) FROM oportunidades WHERE etapa_id = ?",
                    Integer.class, req.etapa_id
                );

                jdbcTemplate.update(
                    "INSERT INTO oportunidades (titulo, contacto_id, etapa_id, valor, prioridad, etiquetas, usuario_id, orden, notas, productos_json, " +
                    "tipo_propuesta, total_instalacion, plazo_acuerdo, moneda, firma_nombre, firma_cargo, firma_celular, firma_email, condiciones_comerciales, detalles_json, contacto_persona, trabajador_id, supervisor_id, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, timezone(COALESCE((SELECT value_text FROM system_settings WHERE key_name = 'timezone' LIMIT 1), 'America/Lima'), now()))",
                    req.titulo, req.contacto_id, req.etapa_id, req.valor, req.prioridad, req.etiquetas, defaultUserId, (maxOrder != null ? maxOrder : 0) + 1, req.notas, req.productos_json,
                    req.tipo_propuesta != null ? req.tipo_propuesta : "venta",
                    req.total_instalacion != null ? req.total_instalacion : 0.0,
                    req.plazo_acuerdo != null ? req.plazo_acuerdo : 12,
                    req.moneda != null ? req.moneda : "Soles",
                    req.firma_nombre, req.firma_cargo, req.firma_celular, req.firma_email,
                    req.condiciones_comerciales, req.detalles_json, req.contacto_persona,
                    finalTrabajadorId, finalSupervisorId
                );
                oppId = jdbcTemplate.queryForObject("SELECT lastval()", Long.class);
            }

            Map<String, Object> conversionResult = checkAndConvertToSaleAndOrder(oppId, req.etapa_id);

            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Oportunidad guardada con éxito.");
            resp.put("id", oppId);
            if (conversionResult != null) {
                resp.putAll(conversionResult);
            }

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar oportunidad: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOpportunityById(@PathVariable Long id) {
        try {
            List<Map<String, Object>> oppList = jdbcTemplate.queryForList(
                "SELECT o.*, " +
                "       c.tipo_persona as contacto_tipo_persona, c.numero_documento, c.telefono_principal as telefono_movil, c.email as contacto_email, " +
                "       c.razon_social, c.nombres, c.apellidos, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as contacto_nombre_completo, " +
                "       COALESCE(o.trabajador_id, t.id) as trabajador_id, " +
                "       COALESCE(TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))), NULLIF(o.firma_nombre, ''), CONCAT(u.first_name, ' ', u.last_name)) as vendedor_nombre, " +
                "       rp.id as vendedor_perfil_id, " +
                "       COALESCE(rp.nombre, t.rol_operativo, 'Ejecutivo') as vendedor_perfil, " +
                "       COALESCE(o.supervisor_id, t.supervisor_id) as supervisor_id, " +
                "       TRIM(CONCAT(sup.nombre, ' ', COALESCE(sup.apellido, ''))) as supervisor_nombre, " +
                "       k.nombre as etapa_nombre " +
                "FROM oportunidades o " +
                "LEFT JOIN contacts c ON o.contacto_id = c.id " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                "LEFT JOIN trabajadores t ON (o.trabajador_id IS NOT NULL AND o.trabajador_id = t.id) " +
                "                         OR (o.trabajador_id IS NULL AND t.usuario_id = o.usuario_id) " +
                "                         OR (o.trabajador_id IS NULL AND o.usuario_id IS NULL AND o.firma_nombre IS NOT NULL AND (t.nombre ILIKE o.firma_nombre OR CONCAT(t.nombre, ' ', t.apellido) ILIKE o.firma_nombre)) " +
                "LEFT JOIN rentabilidad_perfiles rp ON t.perfil_comision_id = rp.id " +
                "LEFT JOIN trabajadores sup ON COALESCE(o.supervisor_id, t.supervisor_id) = sup.id " +
                "LEFT JOIN kanban_columnas k ON o.etapa_id = k.id " +
                "WHERE o.id = ?",
                id
            );

            if (oppList.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> opp = oppList.get(0);

            // Fetch addresses of contact with complete ubigeo (distrito y provincia)
            Object contactoId = opp.get("contacto_id");
            List<Map<String, Object>> addresses = new ArrayList<>();
            if (contactoId != null) {
                addresses = jdbcTemplate.queryForList(
                    "SELECT d.id_direccion as id, d.direccion_completa as direccion, d.direccion_completa, d.referencia, " +
                    "       u.departamento, u.provincia, u.distrito, d.codigo_ubigeo, " +
                    "       CASE " +
                    "         WHEN u.distrito IS NOT NULL AND u.provincia IS NOT NULL " +
                    "           THEN CONCAT(d.direccion_completa, ', ', u.distrito, ', ', u.provincia) " +
                    "         WHEN u.distrito IS NOT NULL " +
                    "           THEN CONCAT(d.direccion_completa, ', ', u.distrito) " +
                    "         ELSE d.direccion_completa " +
                    "       END as direccion_con_ubigeo " +
                    "FROM direcciones d " +
                    "LEFT JOIN ubigeo_peru u ON d.codigo_ubigeo = u.codigo_ubigeo " +
                    "WHERE d.id_contacto = ? OR d.id_contacto = (SELECT empresa_id FROM contacts WHERE id = ? AND empresa_id IS NOT NULL) " +
                    "ORDER BY d.id_direccion ASC",
                    contactoId, contactoId
                );
            }

            // Fetch subcontacts (Personas de contacto) if contact is company
            List<Map<String, Object>> subcontacts = new ArrayList<>();
            if (contactoId != null) {
                subcontacts = jdbcTemplate.queryForList(
                    "SELECT id, nombres, apellidos, CONCAT(nombres, ' ', apellidos) as nombre_completo, " +
                    "       telefono_principal, email, numero_documento " +
                    "FROM contacts WHERE empresa_id = ? ORDER BY id ASC",
                    contactoId
                );
            }

            // Compute sensible contact person (NEVER the company name)
            String razonSocial = (String) opp.get("razon_social");
            String contactoPersona = (String) opp.get("contacto_persona");
            if (contactoPersona == null || contactoPersona.trim().isEmpty() || (razonSocial != null && contactoPersona.trim().equalsIgnoreCase(razonSocial.trim()))) {
                if (!subcontacts.isEmpty()) {
                    contactoPersona = (String) subcontacts.get(0).get("nombre_completo");
                } else if (opp.get("nombres") != null && !((String)opp.get("nombres")).trim().isEmpty()) {
                    contactoPersona = ((String)opp.get("nombres") + " " + (opp.get("apellidos") != null ? opp.get("apellidos") : "")).trim();
                } else {
                    contactoPersona = "Representante Legal / Gerencia";
                }
            }
            opp.put("contacto_persona_calculado", contactoPersona);

            // Fetch settings for quotation
            List<Map<String, Object>> settingsList = jdbcTemplate.queryForList(
                "SELECT key_name, value_text FROM system_settings WHERE key_name LIKE 'cotizacion.%'"
            );
            Map<String, String> settings = new HashMap<>();
            for (Map<String, Object> s : settingsList) {
                settings.put(String.valueOf(s.get("key_name")), String.valueOf(s.get("value_text")));
            }

            return ResponseEntity.ok(Map.of(
                "opportunity", opp,
                "addresses", addresses,
                "subcontacts", subcontacts,
                "settings", settings
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener oportunidad: " + e.getMessage()));
        }
    }

    @GetMapping("/contact-addresses/{contactId}")
    public ResponseEntity<?> getContactAddresses(@PathVariable Long contactId) {
        try {
            List<Map<String, Object>> addresses = jdbcTemplate.queryForList(
                "SELECT d.id_direccion as id, d.direccion_completa as direccion, d.direccion_completa, d.referencia, " +
                "       u.departamento, u.provincia, u.distrito, d.codigo_ubigeo, " +
                "       CASE " +
                "         WHEN u.distrito IS NOT NULL AND u.provincia IS NOT NULL " +
                "           THEN CONCAT(d.direccion_completa, ', ', u.distrito, ', ', u.provincia) " +
                "         WHEN u.distrito IS NOT NULL " +
                "           THEN CONCAT(d.direccion_completa, ', ', u.distrito) " +
                "         ELSE d.direccion_completa " +
                "       END as direccion_con_ubigeo " +
                "FROM direcciones d " +
                "LEFT JOIN ubigeo_peru u ON d.codigo_ubigeo = u.codigo_ubigeo " +
                "WHERE d.id_contacto = ? OR d.id_contacto = (SELECT empresa_id FROM contacts WHERE id = ? AND empresa_id IS NOT NULL) " +
                "ORDER BY d.id_direccion ASC",
                contactId, contactId
            );

            List<Map<String, Object>> subcontacts = jdbcTemplate.queryForList(
                "SELECT id, CONCAT(nombres, ' ', apellidos) as nombre_completo, numero_documento, telefono_principal, email " +
                "FROM contacts WHERE empresa_id = ?",
                contactId
            );

            return ResponseEntity.ok(Map.of("addresses", addresses, "subcontacts", subcontacts));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener direcciones: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2.1 QUOTATION SETTINGS ENDPOINTS
    // ==========================================
    @GetMapping("/settings")
    public ResponseEntity<?> getQuotationSettings() {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT key_name, value_text FROM system_settings WHERE key_name LIKE 'cotizacion.%'"
            );
            Map<String, String> map = new HashMap<>();
            for (Map<String, Object> row : list) {
                String k = String.valueOf(row.get("key_name"));
                String v = String.valueOf(row.get("value_text"));
                if (v != null) {
                    if (v.contains("/uploads/")) {
                        v = v.substring(v.indexOf("/uploads/"));
                    } else if (v.contains("/productos/")) {
                        v = v.substring(v.indexOf("/productos/"));
                    }
                }
                map.put(k, v);
            }
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener configuración de cotización: " + e.getMessage()));
        }
    }

    @PostMapping("/settings")
    public ResponseEntity<?> saveQuotationSettings(@RequestBody Map<String, String> settings) {
        try {
            for (Map.Entry<String, String> entry : settings.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue() != null ? entry.getValue().trim() : "";
                if (val.contains("/uploads/")) {
                    val = val.substring(val.indexOf("/uploads/"));
                } else if (val.contains("/productos/")) {
                    val = val.substring(val.indexOf("/productos/"));
                }
                jdbcTemplate.update(
                    "INSERT INTO system_settings (key_name, value_text) VALUES (?, ?) " +
                    "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text",
                    key, val
                );
            }
            return ResponseEntity.ok(Map.of("message", "Configuración de cotización guardada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar configuración: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-membrete")
    public ResponseEntity<?> uploadMembrete(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El archivo está vacío."));
            }

            String originalName = file.getOriginalFilename();
            if (originalName == null) originalName = "hoja_membrete";
            String cleanName = originalName.replaceAll("\\s+", "_");
            String ext = "";
            int dotIdx = cleanName.lastIndexOf('.');
            if (dotIdx > 0) {
                ext = cleanName.substring(dotIdx).toLowerCase();
            }

            List<String> allowed = List.of(".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".webp");
            if (!allowed.contains(ext)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Formato no permitido. Solo se aceptan archivos PDF (.pdf), Word (.docx, .doc) o Imágenes (.png, .jpg)."));
            }

            String uploadDir = "/app/uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String filename = "membrete_" + System.currentTimeMillis() + "_" + cleanName;
            File destFile = new File(dir, filename);
            file.transferTo(destFile);

            String localPath = "/uploads/" + filename;
            String localImagePath = localPath;

            if (ext.equals(".pdf")) {
                try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.pdmodel.PDDocument.load(destFile)) {
                    org.apache.pdfbox.rendering.PDFRenderer renderer = new org.apache.pdfbox.rendering.PDFRenderer(doc);
                    java.awt.image.BufferedImage bim = renderer.renderImageWithDPI(0, 150, org.apache.pdfbox.rendering.ImageType.RGB);
                    String pngFilename = filename.substring(0, filename.lastIndexOf('.')) + "_a4.png";
                    File pngFile = new File(dir, pngFilename);
                    javax.imageio.ImageIO.write(bim, "png", pngFile);
                    localImagePath = "/uploads/" + pngFilename;
                } catch (Exception ex) {
                    System.err.println("Error rendering PDF to image: " + ex.getMessage());
                }
            }

            // Guardar automáticamente en system_settings para reflejo inmediato
            jdbcTemplate.update(
                "INSERT INTO system_settings (key_name, value_text) VALUES ('cotizacion.hoja_membrete_url', ?) " +
                "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text",
                localPath
            );
            jdbcTemplate.update(
                "INSERT INTO system_settings (key_name, value_text) VALUES ('cotizacion.hoja_membrete_imagen_url', ?) " +
                "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text",
                localImagePath
            );
            jdbcTemplate.update(
                "INSERT INTO system_settings (key_name, value_text) VALUES ('cotizacion.hoja_membrete_nombre', ?) " +
                "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text",
                originalName
            );
            jdbcTemplate.update(
                "INSERT INTO system_settings (key_name, value_text) VALUES ('cotizacion.hoja_membrete_tipo', ?) " +
                "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text",
                ext.replace(".", "")
            );
            jdbcTemplate.update(
                "INSERT INTO system_settings (key_name, value_text) VALUES ('cotizacion.usar_hoja_membrete', 'true') " +
                "ON CONFLICT (key_name) DO UPDATE SET value_text = EXCLUDED.value_text"
            );

            return ResponseEntity.ok(Map.of(
                "url", localPath,
                "imageUrl", localImagePath,
                "filename", originalName,
                "fileType", ext.replace(".", "")
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al subir hoja membrete: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteOpportunity(@PathVariable Long id) {
        try {
            int rows = jdbcTemplate.update("DELETE FROM oportunidades WHERE id = ?", id);
            if (rows == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Oportunidad eliminada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar oportunidad: " + e.getMessage()));
        }
    }

    @PostMapping("/move")
    @Transactional
    public ResponseEntity<?> moveOpportunity(@RequestBody MoveOpportunityRequest req) {
        try {
            if (req.opp_id == null || req.etapa_id == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "IDs de oportunidad y etapa son obligatorios."));
            }

            jdbcTemplate.update("UPDATE oportunidades SET etapa_id = ? WHERE id = ?", req.etapa_id, req.opp_id);

            Map<String, Object> conversionResult = checkAndConvertToSaleAndOrder(req.opp_id, req.etapa_id);

            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Oportunidad movida con éxito.");
            if (conversionResult != null) {
                resp.putAll(conversionResult);
            }

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al mover oportunidad: " + e.getMessage()));
        }
    }

    private Map<String, Object> checkAndConvertToSaleAndOrder(Long oppId, Integer etapaId) {
        try {
            // Check if target column is es_ganada
            Boolean esGanada = jdbcTemplate.queryForObject(
                "SELECT es_ganada FROM kanban_columnas WHERE id = ?",
                Boolean.class, etapaId
            );
            if (esGanada == null || !esGanada) {
                return null;
            }

            // Ensure columns exist
            try {
                jdbcTemplate.execute("ALTER TABLE ventas ADD COLUMN IF NOT EXISTS oportunidad_id BIGINT");
                jdbcTemplate.execute("ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS oportunidad_id BIGINT");
            } catch (Exception ignored) {}

            // Check if sale already converted for this opportunity
            List<Map<String, Object>> existingSales = jdbcTemplate.queryForList(
                "SELECT id, numero_venta FROM ventas WHERE oportunidad_id = ? LIMIT 1",
                oppId
            );
            if (!existingSales.isEmpty()) {
                Map<String, Object> s = existingSales.get(0);
                return Map.of(
                    "venta_creada", false,
                    "ya_existia", true,
                    "numero_venta", String.valueOf(s.get("numero_venta")),
                    "venta_id", s.get("id")
                );
            }

            // Fetch opportunity details
            Map<String, Object> opp = jdbcTemplate.queryForMap(
                "SELECT titulo, contacto_id, usuario_id, valor, total_instalacion, prioridad, notas, productos_json, detalles_json, trabajador_id, supervisor_id FROM oportunidades WHERE id = ?",
                oppId
            );

            Long contactoId = opp.get("contacto_id") != null ? ((Number) opp.get("contacto_id")).longValue() : null;
            Integer usuarioId = opp.get("usuario_id") != null ? ((Number) opp.get("usuario_id")).intValue() : null;
            Integer trabajadorId = opp.get("trabajador_id") != null ? ((Number) opp.get("trabajador_id")).intValue() : null;
            Integer workerSupervisorId = opp.get("supervisor_id") != null ? ((Number) opp.get("supervisor_id")).intValue() : null;

            if (usuarioId != null) {
                try {
                    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE id = ?", Integer.class, usuarioId);
                    if (count == null || count == 0) {
                        usuarioId = null;
                    }
                } catch (Exception ignored) {
                    usuarioId = null;
                }
            }
            if (usuarioId == null) {
                try {
                    usuarioId = jdbcTemplate.queryForObject("SELECT id FROM users ORDER BY id ASC LIMIT 1", Integer.class);
                } catch (Exception ignored) {}
            }
            Double total = opp.get("valor") != null ? ((Number) opp.get("valor")).doubleValue() : 0.0;
            String titulo = opp.get("titulo") != null ? opp.get("titulo").toString() : "Propuesta Comercial";
            String prioridad = opp.get("prioridad") != null ? opp.get("prioridad").toString() : "Media";
            String notas = opp.get("notas") != null ? opp.get("notas").toString() : "";
            String productosJson = opp.get("productos_json") != null ? opp.get("productos_json").toString() : null;

            // Fetch contact display name
            String contactoNombre = "";
            if (contactoId != null) {
                try {
                    contactoNombre = jdbcTemplate.queryForObject(
                        "SELECT COALESCE(razon_social, CONCAT(nombres, ' ', apellidos)) FROM contacts WHERE id = ?",
                        String.class, contactoId
                    );
                } catch (Exception ignored) {}
            }

            // Fetch primary address of contact
            String direccion = null;
            String referencia = null;
            Double latitud = null;
            Double longitud = null;
            String distrito = null;
            if (contactoId != null) {
                try {
                    List<Map<String, Object>> addrs = jdbcTemplate.queryForList(
                        "SELECT d.direccion_completa, d.referencia, d.latitud, d.longitud, u.distrito " +
                        "FROM direcciones d " +
                        "LEFT JOIN ubigeo_peru u ON d.codigo_ubigeo = u.codigo_ubigeo " +
                        "WHERE d.id_contacto = ? " +
                        "ORDER BY d.id_direccion ASC LIMIT 1",
                        contactoId
                    );
                    if (!addrs.isEmpty()) {
                        Map<String, Object> addr = addrs.get(0);
                        direccion = addr.get("direccion_completa") != null ? addr.get("direccion_completa").toString() : null;
                        referencia = addr.get("referencia") != null ? addr.get("referencia").toString() : null;
                        latitud = addr.get("latitud") != null ? ((Number) addr.get("latitud")).doubleValue() : null;
                        longitud = addr.get("longitud") != null ? ((Number) addr.get("longitud")).doubleValue() : null;
                        distrito = addr.get("distrito") != null ? addr.get("distrito").toString() : null;
                    }
                } catch (Exception ignored) {}
            }

            // Generate sale number: V- + 6 characters
            String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            String numeroVenta = "V-" + sb.toString();

            // Calculate Subtotal & IGV: Product/Opportunity total includes IGV (18%)
            double subtotal = total > 0 ? total / 1.18 : 0.0;
            double igv = total - subtotal;

            String notasVenta = "Venta generada automáticamente desde Oportunidad Ganada COT-" + String.format("%04d", oppId) + ": " + titulo;
            if (notas != null && !notas.trim().isEmpty()) {
                notasVenta += " | " + notas.trim();
            }

            // Insert into ventas (Venta Directa Formal - Estado inicial: Por Instalar, 1ra Factura Pendiente)
            if (trabajadorId == null && usuarioId != null) {
                try {
                    trabajadorId = jdbcTemplate.queryForObject("SELECT id FROM trabajadores WHERE usuario_id = ? AND (estado IS NULL OR estado = 'Activo') LIMIT 1", Integer.class, usuarioId);
                } catch (Exception ignored) {}
            }
            if (trabajadorId == null) {
                try {
                    trabajadorId = jdbcTemplate.queryForObject("SELECT id FROM trabajadores WHERE (estado IS NULL OR estado = 'Activo') ORDER BY id ASC LIMIT 1", Integer.class);
                } catch (Exception ignored) {}
            }

            String workerEquipo = "Equipo Principal";
            if (workerSupervisorId == null && trabajadorId != null) {
                try {
                    Map<String, Object> wInfo = jdbcTemplate.queryForMap(
                        "SELECT equipo, supervisor_id FROM trabajadores WHERE id = ?", trabajadorId
                    );
                    if (wInfo.get("equipo") != null && !((String) wInfo.get("equipo")).trim().isEmpty()) {
                        workerEquipo = (String) wInfo.get("equipo");
                    }
                    if (wInfo.get("supervisor_id") != null) {
                        workerSupervisorId = ((Number) wInfo.get("supervisor_id")).intValue();
                    }
                } catch (Exception ignored) {}
            }

            jdbcTemplate.update(
                "INSERT INTO ventas (" +
                "contacto_id, trabajador_id, equipo, supervisor_id, usuario_id, numero_venta, fecha_venta, tipo_comprobante, subtotal, igv, total, monto_pagado, estado, estado_pago, metodo_pago, bidones_entregados, bidones_recogidos, notas, direccion_entrega, oportunidad_id, estado_instalacion" +
                ") VALUES (?, ?, ?, ?, ?, ?, NOW(), 'nota_venta', ?, ?, ?, 0.0, 'pendiente', 'pendiente', 'Pendiente', 0, 0, ?, ?, ?, 'pendiente')",
                contactoId, trabajadorId, workerEquipo, workerSupervisorId, usuarioId, numeroVenta, subtotal, igv, total, notasVenta, direccion, oppId
            );

            Long ventaId = jdbcTemplate.queryForObject("SELECT lastval()", Long.class);

            // Update contact status to 'Cliente'
            if (contactoId != null) {
                try {
                    jdbcTemplate.update("UPDATE contacts SET status = 'Cliente' WHERE id = ?", contactoId);
                } catch (Exception ignored) {}
            }

            // Insert details into venta_detalles
            boolean hasInsertedDetails = false;
            ObjectMapper mapper = new ObjectMapper();

            if (productosJson != null && !productosJson.trim().isEmpty()) {
                try {
                    List<?> products = mapper.readValue(productosJson, List.class);
                    for (Object prodObj : products) {
                        if (prodObj instanceof Map) {
                            Map<?, ?> prodMap = (Map<?, ?>) prodObj;
                            Number pId = (Number) prodMap.get("id");
                            String pNombre = (String) prodMap.get("nombre");
                            Number cant = (Number) prodMap.get("cantidad");
                            Number prec = (Number) prodMap.get("precio");

                            int cantidadInt = (cant != null && cant.intValue() > 0) ? cant.intValue() : 1;
                            double precioUnit = prec != null ? prec.doubleValue() : (total / cantidadInt);
                            double subUnit = cantidadInt * precioUnit;

                            Integer resolvedProdId = null;
                            if (pId != null && pId.intValue() > 0) {
                                resolvedProdId = pId.intValue();
                            } else if (pNombre != null && !pNombre.trim().isEmpty()) {
                                try {
                                    resolvedProdId = jdbcTemplate.queryForObject(
                                        "SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
                                        Integer.class, pNombre.trim()
                                    );
                                } catch (Exception ignored) {}
                            }

                            if (resolvedProdId == null) {
                                try {
                                    resolvedProdId = jdbcTemplate.queryForObject(
                                        "SELECT id FROM productos ORDER BY id ASC LIMIT 1",
                                        Integer.class
                                    );
                                } catch (Exception ignored) {}
                            }

                            if (resolvedProdId != null) {
                                jdbcTemplate.update(
                                    "INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
                                    ventaId, resolvedProdId, cantidadInt, precioUnit, subUnit
                                );
                                hasInsertedDetails = true;
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing productos_json for venta: " + e.getMessage());
                }
            }

            // Fallback detail if no items were registered
            if (!hasInsertedDetails) {
                Integer fallbackProdId = null;
                try {
                    fallbackProdId = jdbcTemplate.queryForObject("SELECT id FROM productos ORDER BY id ASC LIMIT 1", Integer.class);
                } catch (Exception ignored) {}
                if (fallbackProdId != null) {
                    jdbcTemplate.update(
                        "INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, 1, ?, ?)",
                        ventaId, fallbackProdId, total, total
                    );
                }
            }

            // Register in Cash Flow (Caja) - Solo en Negocio Regular (en Telecom el ingreso de comisión se registra manualmente)
            try {
                String modeloNegocio = getSetting("negocio.tipo_modelo", "TELECOM");
                if (!"TELECOM".equalsIgnoreCase(modeloNegocio)) {
                    // Negocio Regular: se cobra de acuerdo a lo que se vende al cliente
                    jdbcTemplate.update(
                        "INSERT INTO caja_movimientos (tipo, categoria, monto, metodo_pago, referencia_id, tabla_referencia, fecha, notas, usuario_id) " +
                        "VALUES ('Ingreso', 'Venta', ?, 'Transferencia', ?, 'ventas', NOW(), ?, ?)",
                        total, ventaId, "Venta Automática #" + numeroVenta + " desde Oportunidad Ganada #" + oppId, usuarioId
                    );
                }
            } catch (Exception ignored) {}

            // Also create dispatch order in pedidos linked to this sale
            try {
                Integer existingOrderCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM pedidos WHERE oportunidad_id = ?",
                    Integer.class, oppId
                );
                if (existingOrderCount == null || existingOrderCount == 0) {
                    String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
                    int randNum = 1000 + random.nextInt(9000);
                    String numeroPedido = "PED-" + todayStr + "-" + randNum;

                    Integer stageId = null;
                    try {
                        stageId = jdbcTemplate.queryForObject(
                            "SELECT id FROM etapas_pedido ORDER BY orden ASC LIMIT 1",
                            Integer.class
                        );
                    } catch (Exception ignored) {}

                    jdbcTemplate.update(
                        "INSERT INTO pedidos (" +
                        "numero_pedido, contacto_id, contacto_persona_nombre, metodo_pago, estado_pago, " +
                        "subtotal, igv, total, direccion_entrega, distrito, latitud, longitud, notas, " +
                        "fecha_entrega, hora_entrega, prioridad, tipo_envio, etapa_id, oportunidad_id, venta_id, created_at" +
                        ") VALUES (?, ?, ?, 'Transferencia', 'Pagado', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, '12:00', ?, 'Despacho', ?, ?, ?, timezone(COALESCE((SELECT value_text FROM system_settings WHERE key_name = 'timezone' LIMIT 1), 'America/Lima'), now()))",
                        numeroPedido, contactoId, contactoNombre, subtotal, igv, total, direccion, distrito, latitud, longitud,
                        "Creado desde Oportunidad Ganada #" + oppId, prioridad, stageId, oppId, ventaId
                    );
                }
            } catch (Exception e) {
                System.err.println("Error creating linked order: " + e.getMessage());
            }

            Map<String, Object> result = new HashMap<>();
            result.put("venta_creada", true);
            result.put("numero_venta", numeroVenta);
            result.put("venta_id", ventaId);
            result.put("total", total);
            return result;
        } catch (Exception e) {
            System.err.println("Error converting opportunity to sale: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    // ==========================================
    // 3. KANBAN COLUMNS CRUD
    // ==========================================
    @PostMapping("/columns/save")
    @Transactional
    public ResponseEntity<?> saveColumn(@RequestBody SaveColumnRequest req) {
        try {
            if (req.nombre == null || req.nombre.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre de la columna es obligatorio."));
            }

            if (req.id != null) {
                jdbcTemplate.update(
                    "UPDATE kanban_columnas SET nombre = ?, es_ganada = ?, label_ganada = ?, es_perdida = ?, label_perdida = ? WHERE id = ?",
                    req.nombre, req.es_ganada, req.label_ganada, req.es_perdida, req.label_perdida, req.id
                );
            } else {
                Integer maxOrder = jdbcTemplate.queryForObject("SELECT COALESCE(MAX(orden), 0) FROM kanban_columnas", Integer.class);
                jdbcTemplate.update(
                    "INSERT INTO kanban_columnas (nombre, orden, es_ganada, es_perdida) VALUES (?, ?, ?, ?)",
                    req.nombre, (maxOrder != null ? maxOrder : 0) + 1, req.es_ganada, req.es_perdida
                );
            }
            return ResponseEntity.ok(Map.of("message", "Columna de Kanban guardada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar columna: " + e.getMessage()));
        }
    }

    @DeleteMapping("/columns/{id}")
    @Transactional
    public ResponseEntity<?> deleteColumn(@PathVariable Integer id) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM oportunidades WHERE etapa_id = ?",
                Integer.class, id
            );

            if (count != null && count > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "No se puede eliminar la columna: Tiene oportunidades asociadas."));
            }

            int rows = jdbcTemplate.update("DELETE FROM kanban_columnas WHERE id = ?", id);
            if (rows == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Columna de Kanban eliminada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar columna: " + e.getMessage()));
        }
    }

    @PostMapping("/columns/order")
    @Transactional
    public ResponseEntity<?> updateColumnOrder(@RequestBody List<Integer> order) {
        try {
            for (int i = 0; i < order.size(); i++) {
                jdbcTemplate.update("UPDATE kanban_columnas SET orden = ? WHERE id = ?", i + 1, order.get(i));
            }
            return ResponseEntity.ok(Map.of("message", "Orden de columnas guardado con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar orden de columnas: " + e.getMessage()));
        }
    }

    // ==========================================
    // 4. KANBAN MASTER TAGS CRUD
    // ==========================================
    @PostMapping("/tags/save")
    @Transactional
    public ResponseEntity<?> saveTag(@RequestBody SaveTagRequest req) {
        try {
            if (req.nombre == null || req.nombre.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre de la etiqueta es obligatorio."));
            }

            jdbcTemplate.update(
                "INSERT INTO kanban_etiquetas (nombre, color) VALUES (?, ?) ON CONFLICT (nombre) DO UPDATE SET color = EXCLUDED.color",
                req.nombre, req.color != null ? req.color : "#6366f1"
            );
            return ResponseEntity.ok(Map.of("message", "Etiqueta guardada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar etiqueta: " + e.getMessage()));
        }
    }

    @DeleteMapping("/tags/{id}")
    @Transactional
    public ResponseEntity<?> deleteTag(@PathVariable Integer id) {
        try {
            int rows = jdbcTemplate.update("DELETE FROM kanban_etiquetas WHERE id = ?", id);
            if (rows == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Etiqueta eliminada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar etiqueta: " + e.getMessage()));
        }
    }


    // ==========================================
    // DTO REQUESTS CLASSES
    // ==========================================
    public static class SaveOpportunityRequest {
        public Long id;
        public String titulo;
        public Long contacto_id;
        public Integer etapa_id;
        public Double valor = 0.0;
        public String prioridad = "Media";
        public String etiquetas;
        public String notas;
        public String productos_json;
        public String tipo_propuesta;
        public Double total_instalacion = 0.0;
        public Integer plazo_acuerdo = 12;
        public String moneda = "Soles";
        public String firma_nombre;
        public String firma_cargo;
        public String firma_celular;
        public String firma_email;
        public String condiciones_comerciales;
        public String detalles_json;
        public String contacto_persona;
        public Integer trabajador_id;
        public Integer supervisor_id;
    }

    public static class MoveOpportunityRequest {
        public Long opp_id;
        public Integer etapa_id;
    }

    public static class SaveColumnRequest {
        public Integer id;
        public String nombre;
        public Boolean es_ganada = false;
        public String label_ganada = "Ganada";
        public Boolean es_perdida = false;
        public String label_perdida = "Perdida";
    }

    public static class SaveTagRequest {
        public String nombre;
        public String color;
    }
}
