package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DashboardController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ==========================================
    // 1. DASHBOARD COMERCIAL (CRM & PIPELINE - /dashboard/analytics)
    // Con soporte de filtros por Ejecutivo y por Supervisor con su Grupo
    // ==========================================
    @GetMapping("/commercial")
    public ResponseEntity<?> getCommercialDashboard(
            @RequestParam(required = false) Long supervisorId,
            @RequestParam(required = false) Long ejecutivoId,
            @RequestParam(required = false) Boolean unassigned) {
        try {
            Map<String, Object> data = new HashMap<>();

            // Construir cláusula WHERE para filtrar las oportunidades (o)
            String oppWhere = "";
            List<Object> filterParams = new ArrayList<>();

            Map<String, Object> activeFilter = new HashMap<>();
            activeFilter.put("type", "all");
            activeFilter.put("label", "Toda la Empresa");
            activeFilter.put("equipo", null);

            if (Boolean.TRUE.equals(unassigned)) {
                oppWhere = "WHERE o.usuario_id IS NULL";
                activeFilter.put("type", "unassigned");
                activeFilter.put("label", "Leads y Oportunidades Sin Asignar");
            } else if (ejecutivoId != null && ejecutivoId > 0) {
                oppWhere = "WHERE o.usuario_id IN (SELECT t.usuario_id FROM trabajadores t WHERE (t.id = ? OR t.usuario_id = ?) AND t.usuario_id IS NOT NULL)";
                filterParams.add(ejecutivoId);
                filterParams.add(ejecutivoId);
                activeFilter.put("type", "ejecutivo");
                activeFilter.put("id", ejecutivoId);

                try {
                    Map<String, Object> ej = jdbcTemplate.queryForMap(
                        "SELECT TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo FROM trabajadores t WHERE t.id = ? OR t.usuario_id = ? LIMIT 1",
                        ejecutivoId, ejecutivoId
                    );
                    activeFilter.put("label", "Ejecutivo: " + ej.get("nombre"));
                    activeFilter.put("equipo", ej.get("equipo"));
                } catch (Exception ignored) {
                    activeFilter.put("label", "Ejecutivo #" + ejecutivoId);
                }
            } else if (supervisorId != null && supervisorId > 0) {
                oppWhere = "WHERE o.usuario_id IN (SELECT t.usuario_id FROM trabajadores t WHERE (t.id = ? OR t.supervisor_id = ?) AND t.usuario_id IS NOT NULL)";
                filterParams.add(supervisorId);
                filterParams.add(supervisorId);
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

            Integer totalContactos = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM contacts", Integer.class
            );

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
                "SELECT COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), 'Sin Asignar') as vendedor, " +
                "       COUNT(o.id) as total_opps, " +
                "       COUNT(CASE WHEN kc.es_ganada = true THEN 1 END) as ganadas, " +
                "       COALESCE(SUM(CASE WHEN kc.es_ganada = true THEN o.valor ELSE 0 END), 0.0) as monto_ganado, " +
                "       COALESCE(SUM(o.valor), 0.0) as monto_total " +
                "FROM oportunidades o " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                oppWhere + " " +
                "GROUP BY u.id, u.first_name, u.last_name " +
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
                "       CONCAT(u.first_name, ' ', u.last_name) as asesor " +
                "FROM oportunidades o " +
                "LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id " +
                "LEFT JOIN contacts c ON o.contacto_id = c.id " +
                "LEFT JOIN users u ON o.usuario_id = u.id " +
                oppWhere + " " +
                "ORDER BY o.created_at DESC " +
                "LIMIT 10";
            List<Map<String, Object>> ultimasOpps = jdbcTemplate.queryForList(sqlUltimas, filterParams.toArray());
            data.put("ultimasOportunidades", ultimasOpps);

            // 6. Opciones para el selector de filtro (Supervisores y Ejecutivos)
            Map<String, Object> filterOptions = new HashMap<>();

            List<Map<String, Object>> supervisores = jdbcTemplate.queryForList(
                "SELECT t.id, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, t.equipo, " +
                "       (SELECT COUNT(*) FROM trabajadores sub WHERE sub.supervisor_id = t.id) as miembros_a_cargo " +
                "FROM trabajadores t " +
                "WHERE (LOWER(t.rol_operativo) LIKE '%supervisor%' OR t.id IN (SELECT DISTINCT supervisor_id FROM trabajadores WHERE supervisor_id IS NOT NULL)) " +
                "ORDER BY t.nombre ASC"
            );
            filterOptions.put("supervisores", supervisores);

            List<Map<String, Object>> ejecutivos = jdbcTemplate.queryForList(
                "SELECT t.id, t.usuario_id, TRIM(CONCAT(t.nombre, ' ', t.apellido)) as nombre, " +
                "       t.rol_operativo as cargo, t.equipo, t.supervisor_id, " +
                "       TRIM(CONCAT(sup.nombre, ' ', sup.apellido)) as supervisor_nombre " +
                "FROM trabajadores t " +
                "LEFT JOIN trabajadores sup ON t.supervisor_id = sup.id " +
                "ORDER BY t.nombre ASC"
            );
            filterOptions.put("ejecutivos", ejecutivos);

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
