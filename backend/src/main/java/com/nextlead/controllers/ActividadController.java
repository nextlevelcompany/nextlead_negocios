package com.nextlead.controllers;

import com.nextlead.dao.UserDao;
import com.nextlead.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/actividades")
public class ActividadController {

    private final JdbcTemplate jdbcTemplate;
    private final UserDao userDao;

    @Autowired
    public ActividadController(JdbcTemplate jdbcTemplate, UserDao userDao) {
        this.jdbcTemplate = jdbcTemplate;
        this.userDao = userDao;
    }

    private Object[] resolveUserScope() {
        Integer usuarioId = null;
        Long trabajadorId = null;
        String scope = "all";
        String username = "Sistema";
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                username = auth.getName();
                Optional<User> uOpt = userDao.findByUsername(username);
                if (uOpt.isPresent()) {
                    User u = uOpt.get();
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
                    }
                }
            }
        } catch (Exception ignored) {}
        return new Object[]{usuarioId, trabajadorId, scope, username};
    }

    // ==========================================
    // 1. LISTAR ACTIVIDADES CON FILTROS
    // ==========================================
    @GetMapping
    public ResponseEntity<?> getActividades(
        @RequestParam(value = "estado", required = false) String estado,
        @RequestParam(value = "tipo", required = false) String tipo,
        @RequestParam(value = "trabajador_id", required = false) Long trabajadorId,
        @RequestParam(value = "contacto_id", required = false) Long contactoId,
        @RequestParam(value = "oportunidad_id", required = false) Long oportunidadId,
        @RequestParam(value = "venta_id", required = false) Long ventaId,
        @RequestParam(value = "pedido_id", required = false) Long pedidoId,
        @RequestParam(value = "desde", required = false) String desde,
        @RequestParam(value = "hasta", required = false) String hasta,
        @RequestParam(value = "search", required = false) String search
    ) {
        try {
            Object[] scopeData = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeData[0];
            Long authTrabajadorId = (Long) scopeData[1];
            String scope = (String) scopeData[2];

            StringBuilder sql = new StringBuilder(
                "SELECT a.*, " +
                "  COALESCE(c.razon_social, TRIM(CONCAT(c.nombres, ' ', COALESCE(c.apellidos, '')))) as contacto_nombre, " +
                "  c.telefono_principal as contacto_telefono, c.email as contacto_correo, " +
                "  o.titulo as oportunidad_titulo, o.valor as oportunidad_valor, " +
                "  v.numero_venta, v.total as venta_total, " +
                "  p.numero_pedido, p.total as pedido_total, " +
                "  TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as trabajador_nombre, " +
                "  t.rol_operativo as trabajador_rol " +
                "FROM crm_actividades a " +
                "LEFT JOIN contacts c ON a.contacto_id = c.id " +
                "LEFT JOIN oportunidades o ON a.oportunidad_id = o.id " +
                "LEFT JOIN ventas v ON a.venta_id = v.id " +
                "LEFT JOIN pedidos p ON a.pedido_id = p.id " +
                "LEFT JOIN trabajadores t ON a.trabajador_id = t.id " +
                "WHERE 1=1 "
            );
            List<Object> params = new ArrayList<>();

            // Role Scope Enforcement (if not explicitly querying or if restricted)
            if ("own".equals(scope)) {
                if (authTrabajadorId != null) {
                    sql.append("AND (a.trabajador_id = ? OR (a.trabajador_id IS NULL AND a.usuario_id = ?)) ");
                    params.add(authTrabajadorId);
                    params.add(authUsuarioId != null ? authUsuarioId : -1);
                } else if (authUsuarioId != null) {
                    sql.append("AND a.usuario_id = ? ");
                    params.add(authUsuarioId);
                }
            } else if ("team".equals(scope) && authTrabajadorId != null) {
                sql.append("AND (a.trabajador_id = ? OR t.supervisor_id = ?) ");
                params.add(authTrabajadorId);
                params.add(authTrabajadorId);
            }

            // User Filters
            if (trabajadorId != null && !"own".equals(scope)) {
                sql.append("AND a.trabajador_id = ? ");
                params.add(trabajadorId);
            }

            if (estado != null && !estado.trim().isEmpty() && !"all".equalsIgnoreCase(estado)) {
                if ("hoy".equalsIgnoreCase(estado)) {
                    sql.append("AND a.fecha_programada::date = CURRENT_DATE ");
                } else if ("vencida".equalsIgnoreCase(estado) || "vencidas".equalsIgnoreCase(estado)) {
                    sql.append("AND a.estado = 'Pendiente' AND a.fecha_programada < NOW() ");
                } else {
                    sql.append("AND LOWER(a.estado) = LOWER(?) ");
                    params.add(estado.trim());
                }
            }

            if (tipo != null && !tipo.trim().isEmpty() && !"all".equalsIgnoreCase(tipo)) {
                sql.append("AND LOWER(a.tipo) = LOWER(?) ");
                params.add(tipo.trim());
            }

            if (contactoId != null) {
                sql.append("AND a.contacto_id = ? ");
                params.add(contactoId);
            }

            if (oportunidadId != null) {
                sql.append("AND a.oportunidad_id = ? ");
                params.add(oportunidadId);
            }

            if (ventaId != null) {
                sql.append("AND a.venta_id = ? ");
                params.add(ventaId);
            }

            if (pedidoId != null) {
                sql.append("AND a.pedido_id = ? ");
                params.add(pedidoId);
            }

            if (desde != null && !desde.trim().isEmpty()) {
                sql.append("AND a.fecha_programada >= ?::timestamp ");
                params.add(desde.trim().contains("T") ? desde.trim().replace("T", " ") : desde.trim() + " 00:00:00");
            }

            if (hasta != null && !hasta.trim().isEmpty()) {
                sql.append("AND a.fecha_programada <= ?::timestamp ");
                params.add(hasta.trim().contains("T") ? hasta.trim().replace("T", " ") : hasta.trim() + " 23:59:59");
            }

            if (search != null && !search.trim().isEmpty()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                sql.append("AND (LOWER(a.asunto) LIKE ? OR LOWER(COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos), '')) LIKE ? OR LOWER(COALESCE(a.descripcion, '')) LIKE ?) ");
                params.add(term);
                params.add(term);
                params.add(term);
            }

            sql.append("ORDER BY a.fecha_programada ASC, a.prioridad DESC");
            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql.toString(), params.toArray());

            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al consultar actividades: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. INDICADORES & KPIS OPERATIVOS
    // ==========================================
    @GetMapping("/kpis")
    public ResponseEntity<?> getKpis(@RequestParam(value = "trabajador_id", required = false) Long trabajadorId) {
        try {
            Object[] scopeData = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeData[0];
            Long authTrabajadorId = (Long) scopeData[1];
            String scope = (String) scopeData[2];

            String scopeFilter = "";
            List<Object> baseParams = new ArrayList<>();
            if ("own".equals(scope)) {
                if (authTrabajadorId != null) {
                    scopeFilter = " AND (a.trabajador_id = ? OR (a.trabajador_id IS NULL AND a.usuario_id = ?))";
                    baseParams.add(authTrabajadorId);
                    baseParams.add(authUsuarioId != null ? authUsuarioId : -1);
                } else if (authUsuarioId != null) {
                    scopeFilter = " AND a.usuario_id = ?";
                    baseParams.add(authUsuarioId);
                }
            } else if (trabajadorId != null) {
                scopeFilter = " AND a.trabajador_id = ?";
                baseParams.add(trabajadorId);
            }

            // 1. Actividades para Hoy Pendientes
            String sqlHoyPendientes = "SELECT COUNT(*) FROM crm_actividades a WHERE a.estado = 'Pendiente' AND a.fecha_programada::date = CURRENT_DATE" + scopeFilter;
            Integer hoyPendientes = jdbcTemplate.queryForObject(sqlHoyPendientes, Integer.class, baseParams.toArray());

            // 2. Actividades Vencidas (Fecha límite pasó sin completarse)
            String sqlVencidas = "SELECT COUNT(*) FROM crm_actividades a WHERE a.estado = 'Pendiente' AND a.fecha_programada < NOW()" + scopeFilter;
            Integer vencidas = jdbcTemplate.queryForObject(sqlVencidas, Integer.class, baseParams.toArray());

            // 3. Actividades Completadas Hoy (Verificación de lo hecho)
            String sqlCompletadasHoy = "SELECT COUNT(*) FROM crm_actividades a WHERE a.estado = 'Completada' AND a.fecha_ejecutada::date = CURRENT_DATE" + scopeFilter;
            Integer completadasHoy = jdbcTemplate.queryForObject(sqlCompletadasHoy, Integer.class, baseParams.toArray());

            // 4. Actividades Completadas en el Mes
            String sqlCompletadasMes = "SELECT COUNT(*) FROM crm_actividades a WHERE a.estado = 'Completada' " +
                "AND EXTRACT(MONTH FROM a.fecha_ejecutada) = EXTRACT(MONTH FROM CURRENT_DATE) " +
                "AND EXTRACT(YEAR FROM a.fecha_ejecutada) = EXTRACT(YEAR FROM CURRENT_DATE)" + scopeFilter;
            Integer completadasMes = jdbcTemplate.queryForObject(sqlCompletadasMes, Integer.class, baseParams.toArray());

            // 5. Total Pendientes Futuras
            String sqlFuturas = "SELECT COUNT(*) FROM crm_actividades a WHERE a.estado = 'Pendiente' AND a.fecha_programada::date > CURRENT_DATE" + scopeFilter;
            Integer futuras = jdbcTemplate.queryForObject(sqlFuturas, Integer.class, baseParams.toArray());

            // 6. Ranking de Productividad por Colaborador (últimos 30 días)
            List<Map<String, Object>> ranking = jdbcTemplate.queryForList(
                "SELECT t.id as trabajador_id, " +
                "  TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as trabajador_nombre, " +
                "  t.rol_operativo, " +
                "  COUNT(a.id) FILTER (WHERE a.estado = 'Completada') as completadas, " +
                "  COUNT(a.id) FILTER (WHERE a.estado = 'Pendiente' AND a.fecha_programada::date = CURRENT_DATE) as pendientes_hoy, " +
                "  COUNT(a.id) FILTER (WHERE a.estado = 'Pendiente' AND a.fecha_programada < NOW()) as vencidas " +
                "FROM trabajadores t " +
                "LEFT JOIN crm_actividades a ON a.trabajador_id = t.id AND a.created_at >= (CURRENT_DATE - INTERVAL '30 days') " +
                "WHERE t.estado = 'Activo' " +
                "GROUP BY t.id, t.nombre, t.apellido, t.rol_operativo " +
                "ORDER BY completadas DESC, pendientes_hoy DESC"
            );

            return ResponseEntity.ok(Map.of(
                "hoy_pendientes", hoyPendientes != null ? hoyPendientes : 0,
                "vencidas", vencidas != null ? vencidas : 0,
                "completadas_hoy", completadasHoy != null ? completadasHoy : 0,
                "completadas_mes", completadasMes != null ? completadasMes : 0,
                "futuras", futuras != null ? futuras : 0,
                "ranking", ranking
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al calcular KPIs de actividades: " + e.getMessage()));
        }
    }

    // ==========================================
    // 3. DETALLE DE ACTIVIDAD INDIVIDUAL
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<?> getActividadById(@PathVariable Long id) {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT a.*, " +
                "  COALESCE(c.razon_social, TRIM(CONCAT(c.nombres, ' ', COALESCE(c.apellidos, '')))) as contacto_nombre, " +
                "  c.telefono_principal as contacto_telefono, c.email as contacto_correo, " +
                "  o.titulo as oportunidad_titulo, " +
                "  v.numero_venta, " +
                "  p.numero_pedido, " +
                "  TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as trabajador_nombre " +
                "FROM crm_actividades a " +
                "LEFT JOIN contacts c ON a.contacto_id = c.id " +
                "LEFT JOIN oportunidades o ON a.oportunidad_id = o.id " +
                "LEFT JOIN ventas v ON a.venta_id = v.id " +
                "LEFT JOIN pedidos p ON a.pedido_id = p.id " +
                "LEFT JOIN trabajadores t ON a.trabajador_id = t.id " +
                "WHERE a.id = ?",
                id
            );
            if (list.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(list.get(0));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener actividad: " + e.getMessage()));
        }
    }

    // ==========================================
    // 4. CREAR / PROGRAMAR ACTIVIDAD
    // ==========================================
    @PostMapping
    @Transactional
    public ResponseEntity<?> createActividad(@RequestBody SaveActividadRequest req) {
        try {
            if (req.asunto == null || req.asunto.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El asunto es obligatorio."));
            }
            if (req.fecha_programada == null || req.fecha_programada.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "La fecha y hora programada son obligatorias."));
            }

            Object[] scopeData = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeData[0];
            Long authTrabajadorId = (Long) scopeData[1];
            String username = (String) scopeData[3];

            String tipo = req.tipo != null && !req.tipo.trim().isEmpty() ? req.tipo.trim() : "Llamada";
            String prioridad = req.prioridad != null && !req.prioridad.trim().isEmpty() ? req.prioridad.trim() : "Media";
            String estado = req.estado != null && !req.estado.trim().isEmpty() ? req.estado.trim() : "Pendiente";

            Timestamp fechaProg = parseTimestamp(req.fecha_programada);
            Timestamp fechaFin = req.fecha_fin_programada != null && !req.fecha_fin_programada.trim().isEmpty() ?
                parseTimestamp(req.fecha_fin_programada) :
                new Timestamp(fechaProg.getTime() + (30 * 60 * 1000)); // default 30 min duration for calendar

            Long trabajadorId = req.trabajador_id != null ? req.trabajador_id : authTrabajadorId;
            Integer usuarioId = req.usuario_id != null ? req.usuario_id : authUsuarioId;

            jdbcTemplate.update(
                "INSERT INTO crm_actividades (" +
                "  tipo, asunto, descripcion, fecha_programada, fecha_fin_programada, prioridad, estado, " +
                "  contacto_id, oportunidad_id, venta_id, pedido_id, trabajador_id, usuario_id, creado_por" +
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                tipo, req.asunto.trim(), req.descripcion, fechaProg, fechaFin, prioridad, estado,
                req.contacto_id, req.oportunidad_id, req.venta_id, req.pedido_id, trabajadorId, usuarioId, username
            );
            Long newId = jdbcTemplate.queryForObject("SELECT lastval()", Long.class);

            return ResponseEntity.ok(Map.of("message", "Actividad programada con éxito.", "id", newId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al programar actividad: " + e.getMessage()));
        }
    }

    // ==========================================
    // 5. EDITAR / REPROGRAMAR ACTIVIDAD
    // ==========================================
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateActividad(@PathVariable Long id, @RequestBody SaveActividadRequest req) {
        try {
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM crm_actividades WHERE id = ?", id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            if (req.asunto != null && req.asunto.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El asunto no puede ser vacío."));
            }

            Timestamp fechaProg = req.fecha_programada != null ? parseTimestamp(req.fecha_programada) : null;
            Timestamp fechaFin = req.fecha_fin_programada != null ? parseTimestamp(req.fecha_fin_programada) : null;

            StringBuilder updateSql = new StringBuilder("UPDATE crm_actividades SET updated_at = CURRENT_TIMESTAMP");
            List<Object> params = new ArrayList<>();

            if (req.asunto != null) {
                updateSql.append(", asunto = ?");
                params.add(req.asunto.trim());
            }
            if (req.tipo != null) {
                updateSql.append(", tipo = ?");
                params.add(req.tipo.trim());
            }
            if (req.descripcion != null) {
                updateSql.append(", descripcion = ?");
                params.add(req.descripcion);
            }
            if (fechaProg != null) {
                updateSql.append(", fecha_programada = ?");
                params.add(fechaProg);
            }
            if (fechaFin != null) {
                updateSql.append(", fecha_fin_programada = ?");
                params.add(fechaFin);
            }
            if (req.prioridad != null) {
                updateSql.append(", prioridad = ?");
                params.add(req.prioridad.trim());
            }
            if (req.estado != null) {
                updateSql.append(", estado = ?");
                params.add(req.estado.trim());
            }
            if (req.trabajador_id != null) {
                updateSql.append(", trabajador_id = ?");
                params.add(req.trabajador_id);
            }
            if (req.contacto_id != null) {
                updateSql.append(", contacto_id = ?");
                params.add(req.contacto_id);
            }
            if (req.oportunidad_id != null) {
                updateSql.append(", oportunidad_id = ?");
                params.add(req.oportunidad_id);
            }
            if (req.venta_id != null) {
                updateSql.append(", venta_id = ?");
                params.add(req.venta_id);
            }
            if (req.pedido_id != null) {
                updateSql.append(", pedido_id = ?");
                params.add(req.pedido_id);
            }

            updateSql.append(" WHERE id = ?");
            params.add(id);

            jdbcTemplate.update(updateSql.toString(), params.toArray());

            return ResponseEntity.ok(Map.of("message", "Actividad actualizada con éxito.", "id", id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar actividad: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6. COMPLETAR ACTIVIDAD (REGISTRAR LO HECHO)
    // ==========================================
    @PutMapping("/{id}/completar")
    @Transactional
    public ResponseEntity<?> completarActividad(@PathVariable Long id, @RequestBody CompletarActividadRequest req) {
        try {
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id, estado FROM crm_actividades WHERE id = ?", id);
            if (existing.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            String resultadoEstado = req.resultado_estado != null && !req.resultado_estado.trim().isEmpty() ?
                req.resultado_estado.trim() : "Completado";

            String resultadoNotas = req.resultado_notas != null ? req.resultado_notas.trim() : "";
            Integer duracion = req.duracion_minutos != null ? req.duracion_minutos : 0;

            jdbcTemplate.update(
                "UPDATE crm_actividades SET " +
                "  estado = 'Completada', " +
                "  fecha_ejecutada = CURRENT_TIMESTAMP, " +
                "  resultado_estado = ?, " +
                "  resultado_notas = ?, " +
                "  duracion_minutos = ?, " +
                "  updated_at = CURRENT_TIMESTAMP " +
                "WHERE id = ?",
                resultadoEstado, resultadoNotas, duracion, id
            );

            return ResponseEntity.ok(Map.of("message", "Actividad completada y registrada en la bitácora con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al completar actividad: " + e.getMessage()));
        }
    }

    // ==========================================
    // 7. ELIMINAR ACTIVIDAD
    // ==========================================
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteActividad(@PathVariable Long id) {
        try {
            int rows = jdbcTemplate.update("DELETE FROM crm_actividades WHERE id = ?", id);
            if (rows > 0) {
                return ResponseEntity.ok(Map.of("message", "Actividad eliminada con éxito."));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar actividad: " + e.getMessage()));
        }
    }

    // Helper timestamp parsing
    private Timestamp parseTimestamp(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return new Timestamp(System.currentTimeMillis());
        try {
            String clean = dateStr.trim();
            if (clean.length() == 10) clean += " 09:00:00"; // default 9am if only date provided
            if (clean.contains("T")) clean = clean.replace("T", " ");
            if (clean.length() == 16) clean += ":00"; // if format YYYY-MM-DD HH:mm
            if (clean.length() > 19) clean = clean.substring(0, 19); // truncate fractional seconds
            return Timestamp.valueOf(clean);
        } catch (Exception e) {
            return new Timestamp(System.currentTimeMillis());
        }
    }

    // DTOs
    public static class SaveActividadRequest {
        public String tipo;
        public String asunto;
        public String descripcion;
        public String fecha_programada;
        public String fecha_fin_programada;
        public String prioridad;
        public String estado;
        public Long contacto_id;
        public Long oportunidad_id;
        public Long venta_id;
        public Long pedido_id;
        public Long trabajador_id;
        public Integer usuario_id;
    }

    public static class CompletarActividadRequest {
        public String resultado_estado;
        public String resultado_notas;
        public Integer duracion_minutos;
    }
}
