package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final JdbcTemplate jdbcTemplate;
    private final com.nextlead.dao.UserDao userDao;

    @Autowired
    public NotificationController(JdbcTemplate jdbcTemplate, com.nextlead.dao.UserDao userDao) {
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
                    }
                }
            }
        } catch (Exception ignored) {}
        return new Object[]{ usuarioId, trabajadorId, scope };
    }

    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts() {
        try {
            Object[] scopeData = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeData[0];
            Long authTrabajadorId = (Long) scopeData[1];
            String scope = (String) scopeData[2];

            List<Map<String, Object>> alerts = new ArrayList<>();

            // 1. OPORTUNIDADES ESTANCADAS (> 48 HORAS SIN MOVERSE EN ETAPA NO CERRADA)
            try {
                String oppWhere = "WHERE (kc.es_ganada = false AND kc.es_perdida = false) " +
                                  "AND o.created_at < (NOW() - INTERVAL '48 hours') ";
                List<Object> oppParams = new ArrayList<>();
                if ("own".equals(scope)) {
                    if (authTrabajadorId != null) {
                        oppWhere += "AND (o.trabajador_id = ? OR (o.trabajador_id IS NULL AND o.usuario_id = ?)) ";
                        oppParams.add(authTrabajadorId.intValue());
                        oppParams.add(authUsuarioId != null ? authUsuarioId : -1);
                    } else if (authUsuarioId != null) {
                        oppWhere += "AND (o.usuario_id = ?) ";
                        oppParams.add(authUsuarioId);
                    }
                } else if ("team".equals(scope) && authTrabajadorId != null) {
                    oppWhere += "AND (o.supervisor_id = ? OR o.trabajador_id = ?) ";
                    oppParams.add(authTrabajadorId.intValue());
                    oppParams.add(authTrabajadorId.intValue());
                }

                String oppSql = "SELECT o.id, o.titulo, o.valor, o.created_at, kc.nombre as etapa_nombre, " +
                                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente_nombre, " +
                                "       ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 86400) as dias_inactivo " +
                                "FROM oportunidades o " +
                                "JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                                "LEFT JOIN contacts c ON o.contacto_id = c.id " +
                                oppWhere +
                                "ORDER BY o.created_at ASC LIMIT 15";

                List<Map<String, Object>> oppList = oppParams.isEmpty()
                    ? jdbcTemplate.queryForList(oppSql)
                    : jdbcTemplate.queryForList(oppSql, oppParams.toArray());

                for (Map<String, Object> row : oppList) {
                    Number dias = (Number) row.get("dias_inactivo");
                    int diasCount = dias != null ? Math.max(dias.intValue(), 2) : 2;
                    Map<String, Object> a = new HashMap<>();
                    a.put("id", "opp-" + row.get("id"));
                    a.put("modulo", "oportunidad");
                    a.put("titulo", "Oportunidad sin movimiento");
                    a.put("descripcion", String.format("Lead '%s' lleva %d días estancado en '%s'.", 
                        row.get("cliente_nombre") != null ? row.get("cliente_nombre") : row.get("titulo"),
                        diasCount,
                        row.get("etapa_nombre")));
                    a.put("tiempo", "Hace " + diasCount + " días");
                    a.put("prioridad", diasCount >= 5 ? "alta" : "media");
                    a.put("url", "/opportunities/view");
                    a.put("referencia_id", row.get("id"));
                    alerts.add(a);
                }
            } catch (Exception e) {
                System.err.println("Error calculating opp alerts: " + e.getMessage());
            }

            // 2. VENTAS PENDIENTES DE INSTALACIÓN (> 72 HORAS)
            try {
                String ventaWhere = "WHERE (v.estado ILIKE '%pendiente%' OR v.estado ILIKE '%valida%' OR v.estado ILIKE '%instal%') " +
                                    "AND v.fecha_venta < (NOW() - INTERVAL '72 hours') ";
                List<Object> ventaParams = new ArrayList<>();
                if ("own".equals(scope)) {
                    if (authTrabajadorId != null) {
                        ventaWhere += "AND (v.trabajador_id = ? OR (v.trabajador_id IS NULL AND v.usuario_id = ?)) ";
                        ventaParams.add(authTrabajadorId.intValue());
                        ventaParams.add(authUsuarioId != null ? authUsuarioId : -1);
                    } else if (authUsuarioId != null) {
                        ventaWhere += "AND (v.usuario_id = ?) ";
                        ventaParams.add(authUsuarioId);
                    }
                }

                String ventaSql = "SELECT v.id, v.numero_venta, v.total, v.fecha_venta, v.estado, " +
                                  "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente_nombre, " +
                                  "       ROUND(EXTRACT(EPOCH FROM (NOW() - v.fecha_venta)) / 86400) as dias_inactivo " +
                                  "FROM ventas v " +
                                  "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                                  ventaWhere +
                                  "ORDER BY v.fecha_venta ASC LIMIT 15";

                List<Map<String, Object>> ventaList = ventaParams.isEmpty()
                    ? jdbcTemplate.queryForList(ventaSql)
                    : jdbcTemplate.queryForList(ventaSql, ventaParams.toArray());

                for (Map<String, Object> row : ventaList) {
                    Number dias = (Number) row.get("dias_inactivo");
                    int diasCount = dias != null ? Math.max(dias.intValue(), 3) : 3;
                    Map<String, Object> a = new HashMap<>();
                    a.put("id", "venta-" + row.get("id"));
                    a.put("modulo", "venta");
                    a.put("titulo", "Venta pendiente de instalación");
                    a.put("descripcion", String.format("Venta %s para '%s' sin instalar tras %d días.", 
                        row.get("numero_venta") != null ? row.get("numero_venta") : "#" + row.get("id"),
                        row.get("cliente_nombre") != null ? row.get("cliente_nombre") : "Cliente",
                        diasCount));
                    a.put("tiempo", "Hace " + diasCount + " días");
                    a.put("prioridad", "alta");
                    a.put("url", "/ventas/view");
                    a.put("referencia_id", row.get("id"));
                    alerts.add(a);
                }
            } catch (Exception e) {
                System.err.println("Error calculating venta alerts: " + e.getMessage());
            }

            // 3. PEDIDOS RETRASADOS / SIN ASIGNAR (> 24 HORAS)
            try {
                String pedSql = "SELECT p.id, p.numero_pedido, p.total, p.created_at, p.fecha_entrega, " +
                                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos), p.contacto_persona_nombre) as cliente_nombre, " +
                                "       ep.nombre as etapa_nombre " +
                                "FROM pedidos p " +
                                "LEFT JOIN contacts c ON p.contacto_id = c.id " +
                                "LEFT JOIN etapas_pedido ep ON p.etapa_id = ep.id " +
                                "WHERE (ep.es_entregado = false AND ep.es_perdido = false) " +
                                "  AND (p.created_at < (NOW() - INTERVAL '24 hours') OR (p.fecha_entrega IS NOT NULL AND p.fecha_entrega < CURRENT_DATE)) " +
                                "ORDER BY p.id ASC LIMIT 10";

                List<Map<String, Object>> pedList = jdbcTemplate.queryForList(pedSql);
                for (Map<String, Object> row : pedList) {
                    Map<String, Object> a = new HashMap<>();
                    a.put("id", "ped-" + row.get("id"));
                    a.put("modulo", "pedido");
                    a.put("titulo", "Pedido retrasado o sin despacho");
                    a.put("descripcion", String.format("Pedido %s (%s) requiere despacho o reprogramación.", 
                        row.get("numero_pedido") != null ? row.get("numero_pedido") : "#" + row.get("id"),
                        row.get("cliente_nombre") != null ? row.get("cliente_nombre") : "Cliente"));
                    a.put("tiempo", "+24 horas");
                    a.put("prioridad", "alta");
                    a.put("url", "/pedidos/view");
                    a.put("referencia_id", row.get("id"));
                    alerts.add(a);
                }
            } catch (Exception e) {
                System.err.println("Error calculating pedido alerts: " + e.getMessage());
            }

            // 4. MENSAJES DE WHATSAPP SIN RESPONDER (> 12 HORAS)
            try {
                String wspSql = "SELECT m.sender, m.message_text, m.timestamp, " +
                                "       ROUND(EXTRACT(EPOCH FROM (NOW() - m.timestamp)) / 3600) as horas_inactivo " +
                                "FROM whatsapp_messages m " +
                                "WHERE (m.status = 'received' OR m.sender NOT LIKE '%nextlead%') " +
                                "  AND m.timestamp < (NOW() - INTERVAL '12 hours') " +
                                "  AND m.timestamp > (NOW() - INTERVAL '7 days') " +
                                "ORDER BY m.timestamp DESC LIMIT 10";

                List<Map<String, Object>> wspList = jdbcTemplate.queryForList(wspSql);
                for (Map<String, Object> row : wspList) {
                    Number horas = (Number) row.get("horas_inactivo");
                    int horasCount = horas != null ? Math.max(horas.intValue(), 12) : 12;
                    Map<String, Object> a = new HashMap<>();
                    a.put("id", "wsp-" + row.get("sender"));
                    a.put("modulo", "mensaje");
                    a.put("titulo", "Mensaje de WhatsApp sin responder");
                    a.put("descripcion", String.format("Cliente %s envió mensaje hace %d horas sin respuesta de asesor.", row.get("sender"), horasCount));
                    a.put("tiempo", "Hace " + horasCount + "h");
                    a.put("prioridad", "urgente");
                    a.put("url", "/applications/chatbox");
                    a.put("referencia_id", row.get("sender"));
                    alerts.add(a);
                }
            } catch (Exception e) {
                System.err.println("Error calculating wsp alerts: " + e.getMessage());
            }

            Map<String, Object> result = new HashMap<>();
            result.put("total", alerts.size());
            result.put("alerts", alerts);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("total", 0, "alerts", Collections.emptyList()));
        }
    }
}
