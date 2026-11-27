package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import com.nextlead.dao.UserDao;
import com.nextlead.models.User;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final JdbcTemplate jdbcTemplate;
    private final UserDao userDao;

    @Autowired
    public DashboardController(JdbcTemplate jdbcTemplate, UserDao userDao) {
        this.jdbcTemplate = jdbcTemplate;
        this.userDao = userDao;
    }

    private Object[] resolveUserScope() {
        Integer usuarioId = null;
        Long trabajadorId = null;
        String scope = "all";
        String role = "ADMIN";
        String userName = "Usuario";

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                Optional<User> uOpt = userDao.findByUsername(auth.getName());
                if (uOpt.isPresent()) {
                    User u = uOpt.get();
                    role = u.getRole() != null ? u.getRole().toUpperCase() : "ADMIN";
                    usuarioId = u.getId() != null ? u.getId().intValue() : null;
                    userName = ((u.getFirstName() != null ? u.getFirstName() : "") + 
                               " " + (u.getLastName() != null ? u.getLastName() : "")).trim();
                    if (userName.isEmpty()) userName = u.getUsername();

                    if (!"ADMIN".equals(role)) {
                        try {
                            String s = jdbcTemplate.queryForObject(
                                "SELECT sales_scope FROM roles_sistema WHERE UPPER(codigo) = ?", String.class, role);
                            if (s != null) scope = s.toLowerCase();
                            else scope = "VENDEDOR".equals(role) ? "own" : ("SUPERVISOR".equals(role) ? "team" : "all");
                        } catch (Exception e) {
                            scope = "VENDEDOR".equals(role) ? "own" : ("SUPERVISOR".equals(role) ? "team" : "all");
                        }
                    } else {
                        scope = "all";
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
        } catch (Exception ignored) {}
        return new Object[]{ usuarioId, trabajadorId, scope, role, userName };
    }

    // ==========================================
    // 1. DASHBOARD COMERCIAL (CRM & PIPELINE - /dashboard/analytics)
    // Con soporte de filtros por Ejecutivo y por Supervisor con su Grupo
    // ==========================================
    @GetMapping("/commercial")
    public ResponseEntity<?> getCommercialDashboard(
            @RequestParam(required = false) Long supervisorId,
            @RequestParam(required = false) Long ejecutivoId,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) String scopeType) {
        try {
            Map<String, Object> data = new HashMap<>();

            Object[] scopeInfo = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeInfo[0];
            Long authTrabajadorId = (Long) scopeInfo[1];
            String scope = (String) scopeInfo[2];
            String authRole = (String) scopeInfo[3];
            String authUserName = (String) scopeInfo[4];

            String oppWhere = "";
            List<Object> filterParams = new ArrayList<>();
            Map<String, Object> activeFilter = new HashMap<>();

            // 1. Si el usuario tiene scope 'own' (Vendedor / Asesor Comercial), siempre se limita a sus propios datos
            if ("own".equals(scope)) {
                if (authTrabajadorId != null && authUsuarioId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ? OR (o.trabajador_id IS NULL AND o.usuario_id = ?))";
                    filterParams.add(authTrabajadorId.intValue());
                    filterParams.add(authUsuarioId);
                } else if (authTrabajadorId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ?)";
                    filterParams.add(authTrabajadorId.intValue());
                } else if (authUsuarioId != null) {
                    oppWhere = "WHERE (o.usuario_id = ?)";
                    filterParams.add(authUsuarioId);
                }
                activeFilter.put("type", "me");
                activeFilter.put("id", authTrabajadorId != null ? authTrabajadorId : authUsuarioId);
                activeFilter.put("label", "Mis Datos (" + authUserName + ")");
                activeFilter.put("equipo", null);
                activeFilter.put("canChangeFilter", false);
                activeFilter.put("userScope", "own");
            } 
            // 2. Si el usuario tiene scope 'team' (Supervisor) y no solicita un miembro específico
            else if ("team".equals(scope) && ejecutivoId == null && supervisorId == null && !Boolean.TRUE.equals(unassigned)) {
                Long supId = authTrabajadorId != null ? authTrabajadorId : -1L;
                oppWhere = "WHERE (o.supervisor_id = ? OR o.trabajador_id = ? " +
                           "OR o.trabajador_id IN (SELECT id FROM trabajadores WHERE supervisor_id = ?) " +
                           "OR o.usuario_id IN (SELECT usuario_id FROM trabajadores WHERE supervisor_id = ? AND usuario_id IS NOT NULL))";
                filterParams.add(supId.intValue());
                filterParams.add(supId.intValue());
                filterParams.add(supId.intValue());
                filterParams.add(supId.intValue());

                activeFilter.put("type", "supervisor");
                activeFilter.put("id", supId);
                activeFilter.put("label", "Mi Equipo (" + authUserName + ")");
                activeFilter.put("equipo", null);
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", "team");
            }
            // 3. Filtros explícitos o Admin
            else if (Boolean.TRUE.equals(unassigned)) {
                oppWhere = "WHERE (o.usuario_id IS NULL AND o.trabajador_id IS NULL)";
                activeFilter.put("type", "unassigned");
                activeFilter.put("label", "Leads y Oportunidades Sin Asignar");
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", scope);
            } else if (ejecutivoId != null && ejecutivoId > 0) {
                // Obtener datos del ejecutivo / usuario seleccionado
                Long targetTrabajadorId = null;
                Integer targetUsuarioId = null;
                String targetNombre = "Ejecutivo #" + ejecutivoId;
                String targetEquipo = null;

                try {
                    Map<String, Object> ej = jdbcTemplate.queryForMap(
                        "SELECT t.id as tid, t.usuario_id as uid, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo " +
                        "FROM trabajadores t WHERE t.id = ? OR t.usuario_id = ? LIMIT 1",
                        ejecutivoId, ejecutivoId
                    );
                    targetTrabajadorId = ((Number) ej.get("tid")).longValue();
                    targetUsuarioId = ej.get("uid") != null ? ((Number) ej.get("uid")).intValue() : null;
                    targetNombre = (String) ej.get("nombre");
                    targetEquipo = (String) ej.get("equipo");
                } catch (Exception e) {
                    try {
                        Map<String, Object> u = jdbcTemplate.queryForMap(
                            "SELECT id, TRIM(CONCAT(first_name, ' ', last_name)) as nombre FROM users WHERE id = ?",
                            ejecutivoId
                        );
                        targetUsuarioId = ((Number) u.get("id")).intValue();
                        targetNombre = (String) u.get("nombre");
                    } catch (Exception ignored) {}
                }

                if (targetTrabajadorId != null && targetUsuarioId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ? OR (o.trabajador_id IS NULL AND o.usuario_id = ?))";
                    filterParams.add(targetTrabajadorId.intValue());
                    filterParams.add(targetUsuarioId);
                } else if (targetTrabajadorId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ?)";
                    filterParams.add(targetTrabajadorId.intValue());
                } else if (targetUsuarioId != null) {
                    oppWhere = "WHERE (o.usuario_id = ?)";
                    filterParams.add(targetUsuarioId);
                }

                activeFilter.put("type", "ejecutivo");
                activeFilter.put("id", ejecutivoId);
                activeFilter.put("label", "Asesor: " + targetNombre);
                activeFilter.put("equipo", targetEquipo);
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", scope);
            } else if (supervisorId != null && supervisorId > 0) {
                oppWhere = "WHERE (o.supervisor_id = ? OR o.trabajador_id = ? " +
                           "OR o.trabajador_id IN (SELECT id FROM trabajadores WHERE supervisor_id = ?) " +
                           "OR o.usuario_id IN (SELECT usuario_id FROM trabajadores WHERE supervisor_id = ? AND usuario_id IS NOT NULL))";
                filterParams.add(supervisorId.intValue());
                filterParams.add(supervisorId.intValue());
                filterParams.add(supervisorId.intValue());
                filterParams.add(supervisorId.intValue());

                activeFilter.put("type", "supervisor");
                activeFilter.put("id", supervisorId);
                try {
                    Map<String, Object> sup = jdbcTemplate.queryForMap(
                        "SELECT TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo FROM trabajadores t WHERE t.id = ? LIMIT 1",
                        supervisorId
                    );
                    activeFilter.put("label", "Supervisor: " + sup.get("nombre") + " y su Grupo");
                    activeFilter.put("equipo", sup.get("equipo"));
                } catch (Exception ignored) {
                    activeFilter.put("label", "Supervisor #" + supervisorId + " y su Grupo");
                }
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", scope);
            } else if ("all".equalsIgnoreCase(scopeType)) {
                // Solo si explícitamente se solicita ver Toda la Empresa
                oppWhere = "";
                activeFilter.put("type", "all");
                activeFilter.put("label", "Toda la Empresa");
                activeFilter.put("equipo", null);
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", scope);
            } else {
                // Por defecto para cualquier usuario (incluyendo ADMIN si no pasa parámetros):
                // Muestra sus propios datos ("Mis Datos")
                if (authTrabajadorId != null && authUsuarioId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ? OR (o.trabajador_id IS NULL AND o.usuario_id = ?))";
                    filterParams.add(authTrabajadorId.intValue());
                    filterParams.add(authUsuarioId);
                } else if (authTrabajadorId != null) {
                    oppWhere = "WHERE (o.trabajador_id = ?)";
                    filterParams.add(authTrabajadorId.intValue());
                } else if (authUsuarioId != null) {
                    oppWhere = "WHERE (o.usuario_id = ?)";
                    filterParams.add(authUsuarioId);
                }
                activeFilter.put("type", "me");
                activeFilter.put("id", authTrabajadorId != null ? authTrabajadorId : authUsuarioId);
                activeFilter.put("label", "Mis Datos (" + authUserName + ")");
                activeFilter.put("equipo", null);
                activeFilter.put("canChangeFilter", true);
                activeFilter.put("userScope", scope);
            }
            data.put("activeFilter", activeFilter);

            // 1. KPIs Generales filtrados
            Map<String, Object> kpis = new HashMap<>();

            String sqlTotal = "SELECT COUNT(*) FROM oportunidades o " + oppWhere;
            Integer totalOpps = jdbcTemplate.queryForObject(sqlTotal, Integer.class, filterParams.toArray());

            String sqlVal = "SELECT COALESCE(SUM(o.valor), 0.0) FROM oportunidades o " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                (oppWhere.isEmpty() ? "WHERE " : oppWhere + " AND ") +
                "COALESCE(kc.es_perdida, false) = false";
            Double valorPipeline = jdbcTemplate.queryForObject(sqlVal, Double.class, filterParams.toArray());

            String sqlGan = "SELECT COUNT(*) FROM oportunidades o " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                (oppWhere.isEmpty() ? "WHERE " : oppWhere + " AND ") +
                "kc.es_ganada = true";
            Integer oppsGanadas = jdbcTemplate.queryForObject(sqlGan, Integer.class, filterParams.toArray());

            String sqlPerd = "SELECT COUNT(*) FROM oportunidades o " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                (oppWhere.isEmpty() ? "WHERE " : oppWhere + " AND ") +
                "kc.es_perdida = true";
            Integer oppsPerdidas = jdbcTemplate.queryForObject(sqlPerd, Integer.class, filterParams.toArray());

            String contactWhere = "";
            List<Object> contactParams = new ArrayList<>();
            if (!oppWhere.isEmpty()) {
                contactWhere = "WHERE (c.id IN (SELECT o.contacto_id FROM oportunidades o " + oppWhere + " AND o.contacto_id IS NOT NULL))";
                contactParams.addAll(filterParams);
            }
            String sqlContactos = "SELECT COUNT(DISTINCT c.id) FROM contacts c " + contactWhere;
            Integer totalContactos = jdbcTemplate.queryForObject(sqlContactos, Integer.class, contactParams.toArray());

            String sqlWsp = "SELECT COUNT(*) FROM oportunidades o " +
                (oppWhere.isEmpty() ? "WHERE " : oppWhere + " AND ") +
                "(LOWER(o.titulo) LIKE '%whatsapp%' OR LOWER(o.titulo) LIKE '%lead%')";
            Integer leadsWhatsapp = jdbcTemplate.queryForObject(sqlWsp, Integer.class, filterParams.toArray());

            double tasaConversion = (totalOpps != null && totalOpps > 0)
                ? ((double) (oppsGanadas != null ? oppsGanadas : 0) / totalOpps) * 100.0
                : 0.0;

            kpis.put("totalOportunidades", totalOpps != null ? totalOpps : 0);
            kpis.put("valorPipeline", valorPipeline != null ? valorPipeline : 0.0);
            kpis.put("oportunidadesGanadas", oppsGanadas != null ? oppsGanadas : 0);
            kpis.put("oportunidadesPerdidas", oppsPerdidas != null ? oppsPerdidas : 0);
            kpis.put("totalContactos", totalContactos != null ? totalContactos : 0);
            kpis.put("leadsWhatsapp", leadsWhatsapp != null ? leadsWhatsapp : 0);
            kpis.put("tasaConversion", Math.round(tasaConversion * 10.0) / 10.0);
            data.put("kpis", kpis);

            // 2. Embudo por Etapa Kanban (Funnel)
            String funnelJoin = oppWhere.isEmpty() ? "" : " AND " + (oppWhere.startsWith("WHERE ") ? oppWhere.substring(6) : oppWhere);
            String sqlFunnel = 
                "SELECT kc.id, kc.nombre, kc.orden, kc.es_ganada, kc.es_perdida, " +
                "       COUNT(o.id) as cantidad, " +
                "       COALESCE(SUM(o.valor), 0.0) as valor_total " +
                "FROM kanban_columnas kc " +
                "LEFT JOIN oportunidades o ON o.etapa_id = kc.id " + funnelJoin + " " +
                "GROUP BY kc.id, kc.nombre, kc.orden, kc.es_ganada, kc.es_perdida " +
                "ORDER BY kc.orden ASC";
            List<Map<String, Object>> funnel = jdbcTemplate.queryForList(sqlFunnel, filterParams.toArray());
            data.put("funnel", funnel);

            // 3. Oportunidades por Prioridad
            String sqlPrio = 
                "SELECT COALESCE(o.prioridad, 'Media') as prioridad, COUNT(*) as cantidad, COALESCE(SUM(o.valor), 0.0) as monto " +
                "FROM oportunidades o " +
                oppWhere + " " +
                "GROUP BY COALESCE(o.prioridad, 'Media') " +
                "ORDER BY cantidad DESC";
            List<Map<String, Object>> porPrioridad = jdbcTemplate.queryForList(sqlPrio, filterParams.toArray());
            data.put("porPrioridad", porPrioridad);

            // 4. Ranking de Vendedores / Asesores
            String sqlAsesores = 
                "SELECT COALESCE(TRIM(CONCAT(t.nombre, ' ', t.apellido)), TRIM(CONCAT(u.first_name, ' ', u.last_name)), 'Sin Asignar') as vendedor, " +
                "       COUNT(o.id) as total_opps, " +
                "       COUNT(CASE WHEN kc.es_ganada = true THEN 1 END) as ganadas, " +
                "       COALESCE(SUM(CASE WHEN kc.es_ganada = true THEN o.valor ELSE 0 END), 0.0) as monto_ganado, " +
                "       COALESCE(SUM(o.valor), 0.0) as monto_total " +
                "FROM oportunidades o " +
                "LEFT JOIN trabajadores t ON o.trabajador_id = t.id " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                oppWhere + " " +
                "GROUP BY t.id, t.nombre, t.apellido, u.id, u.first_name, u.last_name " +
                "ORDER BY monto_ganado DESC, total_opps DESC " +
                "LIMIT 5";
            List<Map<String, Object>> asesores = jdbcTemplate.queryForList(sqlAsesores, filterParams.toArray());
            data.put("asesores", asesores);

            // 5. Últimas Oportunidades
            String sqlUltimas = 
                "SELECT o.id, o.titulo, o.valor, o.prioridad, o.created_at, " +
                "       kc.nombre as etapa_nombre, " +
                "       kc.es_ganada, kc.es_perdida, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente, " +
                "       COALESCE(TRIM(CONCAT(t.nombre, ' ', t.apellido)), CONCAT(u.first_name, ' ', u.last_name), 'Sin Asignar') as asesor " +
                "FROM oportunidades o " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                "LEFT JOIN contacts c ON o.contacto_id = c.id " +
                "LEFT JOIN trabajadores t ON o.trabajador_id = t.id " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                oppWhere + " " +
                "ORDER BY o.created_at DESC " +
                "LIMIT 10";
            List<Map<String, Object>> ultimasOpps = jdbcTemplate.queryForList(sqlUltimas, filterParams.toArray());
            data.put("ultimasOportunidades", ultimasOpps);

            // 6. Opciones para el selector de filtro (Supervisores y Ejecutivos)
            Map<String, Object> filterOptions = new HashMap<>();
            filterOptions.put("userScope", scope);
            filterOptions.put("canChangeFilter", !"own".equals(scope));

            if (!"own".equals(scope)) {
                try {
                    String supSql = "team".equals(scope)
                        ? "SELECT t.id, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo, " +
                          "       (SELECT COUNT(*) FROM trabajadores sub WHERE sub.supervisor_id = t.id) as miembros_a_cargo " +
                          "FROM trabajadores t WHERE t.id = ? ORDER BY t.nombre ASC"
                        : "SELECT t.id, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo, " +
                          "       (SELECT COUNT(*) FROM trabajadores sub WHERE sub.supervisor_id = t.id) as miembros_a_cargo " +
                          "FROM trabajadores t " +
                          "WHERE (LOWER(t.rol_operativo) LIKE '%supervisor%' OR t.id IN (SELECT DISTINCT supervisor_id FROM trabajadores WHERE supervisor_id IS NOT NULL)) " +
                          "ORDER BY t.nombre ASC";
                    List<Map<String, Object>> supervisores = "team".equals(scope) && authTrabajadorId != null
                        ? jdbcTemplate.queryForList(supSql, authTrabajadorId)
                        : jdbcTemplate.queryForList(supSql);
                    filterOptions.put("supervisores", supervisores);
                } catch (Exception e) {
                    filterOptions.put("supervisores", Collections.emptyList());
                }

                try {
                    String ejSql = "team".equals(scope)
                        ? "SELECT t.id, t.usuario_id, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, " +
                          "       t.rol_operativo as cargo, t.equipo, t.supervisor_id, " +
                          "       TRIM(CONCAT(sup.nombre, ' ', sup.apellido)) as supervisor_nombre " +
                          "FROM trabajadores t " +
                          "LEFT JOIN trabajadores sup ON t.supervisor_id = sup.id " +
                          "WHERE t.supervisor_id = ? OR t.id = ? " +
                          "ORDER BY t.nombre ASC"
                        : "SELECT COALESCE(t.id, u.id) as id, u.id as usuario_id, " +
                          "       COALESCE(TRIM(CONCAT(t.nombre, ' ', t.apellido)), TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.username) as nombre, " +
                          "       COALESCE(t.rol_operativo, u.role) as cargo, COALESCE(t.equipo, 'Comercial') as equipo, t.supervisor_id, " +
                          "       TRIM(CONCAT(sup.nombre, ' ', sup.apellido)) as supervisor_nombre " +
                          "FROM users u " +
                          "LEFT JOIN trabajadores t ON t.usuario_id = u.id " +
                          "LEFT JOIN trabajadores sup ON t.supervisor_id = sup.id " +
                          "ORDER BY nombre ASC";
                    List<Map<String, Object>> ejecutivos = "team".equals(scope) && authTrabajadorId != null
                        ? jdbcTemplate.queryForList(ejSql, authTrabajadorId, authTrabajadorId)
                        : jdbcTemplate.queryForList(ejSql);
                    filterOptions.put("ejecutivos", ejecutivos);
                } catch (Exception e) {
                    filterOptions.put("ejecutivos", Collections.emptyList());
                }
            } else {
                filterOptions.put("supervisores", Collections.emptyList());
                filterOptions.put("ejecutivos", Collections.emptyList());
            }

            data.put("filterOptions", filterOptions);

            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al cargar dashboard comercial: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. DASHBOARD OPERATIVO Y VENTAS (/dashboard/eCommerce)
    // ==========================================
    @GetMapping("/operations")
    public ResponseEntity<?> getOperationsDashboard() {
        try {
            Map<String, Object> data = new HashMap<>();

            // 1. KPIs de Ventas y Finanzas
            Map<String, Object> kpis = new HashMap<>();

            Integer totalVentas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ventas WHERE estado != 'cancelada'", Integer.class
            );
            Double montoTotal = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total), 0.0) FROM ventas WHERE estado != 'cancelada'", Double.class
            );
            Double montoPagado = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total), 0.0) FROM ventas WHERE estado != 'cancelada' AND estado_pago = 'pagado'", Double.class
            );
            Double montoPendiente = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(total), 0.0) FROM ventas WHERE estado != 'cancelada' AND estado_pago = 'pendiente'", Double.class
            );

            // Pedidos / Instalaciones
            Integer totalPedidos = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pedidos", Integer.class
            );
            Integer pedidosEntregados = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pedidos WHERE etapa_id = 3", Integer.class
            );
            Integer pedidosPendientes = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pedidos WHERE etapa_id IN (1, 2)", Integer.class
            );

            // Gastos del periodo
            Double totalGastos = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(monto_total), 0.0) FROM gastos", Double.class
            );

            double ticketPromedio = (totalVentas != null && totalVentas > 0)
                ? (montoTotal != null ? montoTotal : 0.0) / totalVentas
                : 0.0;

            kpis.put("totalVentas", totalVentas != null ? totalVentas : 0);
            kpis.put("montoTotal", montoTotal != null ? montoTotal : 0.0);
            kpis.put("montoPagado", montoPagado != null ? montoPagado : 0.0);
            kpis.put("montoPendiente", montoPendiente != null ? montoPendiente : 0.0);
            kpis.put("ticketPromedio", Math.round(ticketPromedio * 100.0) / 100.0);
            kpis.put("totalPedidos", totalPedidos != null ? totalPedidos : 0);
            kpis.put("pedidosEntregados", pedidosEntregados != null ? pedidosEntregados : 0);
            kpis.put("pedidosPendientes", pedidosPendientes != null ? pedidosPendientes : 0);
            kpis.put("totalGastos", totalGastos != null ? totalGastos : 0.0);
            kpis.put("flujoNeto", (montoPagado != null ? montoPagado : 0.0) - (totalGastos != null ? totalGastos : 0.0));
            data.put("kpis", kpis);

            // 2. Tendencia de Ventas Diaria/Mensual
            List<Map<String, Object>> tendenciaVentas = jdbcTemplate.queryForList(
                "SELECT TO_CHAR(v.fecha_venta, 'YYYY-MM') as periodo, " +
                "       COUNT(v.id) as cantidad_ventas, " +
                "       COALESCE(SUM(v.total), 0.0) as monto_total " +
                "FROM ventas v " +
                "WHERE v.estado != 'cancelada' " +
                "GROUP BY TO_CHAR(v.fecha_venta, 'YYYY-MM') " +
                "ORDER BY periodo ASC " +
                "LIMIT 12"
            );
            data.put("tendenciaVentas", tendenciaVentas);

            // 3. Top Planes / Productos Vendidos
            List<Map<String, Object>> topProductos = jdbcTemplate.queryForList(
                "SELECT p.id, p.nombre, " +
                "       COALESCE(SUM(vd.cantidad), 0) as cantidad_vendida, " +
                "       COALESCE(SUM(vd.subtotal), 0.0) as monto_generado " +
                "FROM venta_detalles vd " +
                "JOIN ventas v ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "WHERE v.estado != 'cancelada' " +
                "GROUP BY p.id, p.nombre " +
                "ORDER BY monto_generado DESC " +
                "LIMIT 5"
            );
            data.put("topProductos", topProductos);

            // 4. Estado de Pedidos / Despacho
            List<Map<String, Object>> estadosPedido = jdbcTemplate.queryForList(
                "SELECT ep.id, ep.nombre, COUNT(p.id) as cantidad " +
                "FROM etapas_pedido ep " +
                "LEFT JOIN pedidos p ON p.etapa_id = ep.id " +
                "GROUP BY ep.id, ep.nombre, ep.orden " +
                "ORDER BY ep.orden ASC"
            );
            data.put("estadosPedido", estadosPedido);

            // 5. Ranking de Vendedores por Facturación
            List<Map<String, Object>> topVendedores = jdbcTemplate.queryForList(
                "SELECT COALESCE(TRIM(CONCAT(t.nombre, ' ', t.apellido)), u.username, 'Vendedor Desconocido') as vendedor, " +
                "       COUNT(v.id) as ventas_cerradas, " +
                "       COALESCE(SUM(v.total), 0.0) as total_facturado " +
                "FROM ventas v " +
                "LEFT JOIN trabajadores t ON v.trabajador_id = t.id " +
                "LEFT JOIN users u ON v.usuario_id = u.id " +
                "WHERE v.estado != 'cancelada' " +
                "GROUP BY t.id, t.nombre, t.apellido, u.username " +
                "ORDER BY total_facturado DESC " +
                "LIMIT 5"
            );
            data.put("topVendedores", topVendedores);

            // 6. Últimas Ventas
            List<Map<String, Object>> ultimasVentas = jdbcTemplate.queryForList(
                "SELECT v.id, v.numero_venta, v.total, v.estado, v.estado_pago, v.fecha_venta, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente, " +
                "       COALESCE(TRIM(CONCAT(t.nombre, ' ', t.apellido)), u.username) as vendedor " +
                "FROM ventas v " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "LEFT JOIN trabajadores t ON v.trabajador_id = t.id " +
                "LEFT JOIN users u ON v.usuario_id = u.id " +
                "ORDER BY v.fecha_venta DESC " +
                "LIMIT 7"
            );
            data.put("ultimasVentas", ultimasVentas);

            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al cargar dashboard operativo: " + e.getMessage()));
        }
    }
}
