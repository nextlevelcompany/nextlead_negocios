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

@RestController
@RequestMapping("/api/sales")
public class SalesController {

    private final JdbcTemplate jdbcTemplate;
    private final com.nextlead.dao.UserDao userDao;

    @Autowired
    public SalesController(JdbcTemplate jdbcTemplate, com.nextlead.dao.UserDao userDao) {
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
    // 1. GET SALES LIST
    // ==========================================
    @GetMapping
    public ResponseEntity<?> getSalesList() {
        try {
            Object[] scopeInfo = resolveUserScope();
            Integer authUsuarioId = (Integer) scopeInfo[0];
            Long authTrabajadorId = (Long) scopeInfo[1];
            String scope = (String) scopeInfo[2];

            String whereClause = "";
            List<Object> params = new ArrayList<>();
            if ("own".equals(scope)) {
                if (authTrabajadorId != null) {
                    whereClause = "WHERE (v.trabajador_id = ? OR (v.trabajador_id IS NULL AND v.usuario_id = ?)) ";
                    params.add(authTrabajadorId.intValue());
                    params.add(authUsuarioId != null ? authUsuarioId : -1);
                } else if (authUsuarioId != null) {
                    whereClause = "WHERE (v.usuario_id = ?) ";
                    params.add(authUsuarioId);
                }
            } else if ("team".equals(scope) && authTrabajadorId != null) {
                whereClause = "WHERE (v.supervisor_id = ? OR v.trabajador_id = ? OR t.supervisor_id = ?) ";
                params.add(authTrabajadorId.intValue());
                params.add(authTrabajadorId.intValue());
                params.add(authTrabajadorId.intValue());
            }

            String sql = 
                "SELECT v.*, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente_nombre_completo, " +
                "       c.numero_documento, " +
                "       o.titulo as oportunidad_titulo, " +
                "       TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as vendedor_nombre, " +
                "       t.rol_operativo as vendedor_cargo, " +
                "       rp.nombre as vendedor_perfil, " +
                "       COALESCE(v.equipo, t.equipo, 'Equipo Principal') as equipo_nombre, " +
                "       COALESCE(v.supervisor_id, t.supervisor_id) as supervisor_id, " +
                "       TRIM(CONCAT(sup.nombre, ' ', COALESCE(sup.apellido, ''))) as supervisor_nombre, " +
                "       (SELECT string_agg(CONCAT(vd.cantidad, 'x ', p.nombre), ', ') " +
                "        FROM venta_detalles vd " +
                "        JOIN productos p ON vd.producto_id = p.id " +
                "        WHERE vd.venta_id = v.id) as productos_detalle, " +
                "       latest_act.act_id, latest_act.act_tipo, latest_act.act_asunto, " +
                "       latest_act.act_fecha_programada, latest_act.act_estado, latest_act.act_prioridad, " +
                "       COALESCE(act_count.pendientes_count, 0) as act_pendientes_count " +
                "FROM ventas v " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "LEFT JOIN oportunidades o ON v.oportunidad_id = o.id " +
                "LEFT JOIN trabajadores t ON v.trabajador_id = t.id " +
                "LEFT JOIN rentabilidad_perfiles rp ON t.perfil_comision_id = rp.id " +
                "LEFT JOIN trabajadores sup ON COALESCE(v.supervisor_id, t.supervisor_id) = sup.id " +
                "LEFT JOIN LATERAL ( " +
                "    SELECT act.id as act_id, act.tipo as act_tipo, act.asunto as act_asunto, " +
                "           to_char(act.fecha_programada, 'YYYY-MM-DD\"T\"HH24:MI:SS') as act_fecha_programada, " +
                "           act.estado as act_estado, act.prioridad as act_prioridad " +
                "    FROM crm_actividades act " +
                "    WHERE act.venta_id = v.id " +
                "    ORDER BY CASE WHEN act.estado = 'Pendiente' THEN 0 ELSE 1 END, act.fecha_programada ASC " +
                "    LIMIT 1 " +
                ") latest_act ON true " +
                "LEFT JOIN LATERAL ( " +
                "    SELECT COUNT(*) as pendientes_count FROM crm_actividades WHERE venta_id = v.id AND estado = 'Pendiente' " +
                ") act_count ON true " +
                whereClause +
                "ORDER BY v.fecha_venta DESC, v.id DESC";
            
            List<Map<String, Object>> sales = params.isEmpty()
                ? jdbcTemplate.queryForList(sql)
                : jdbcTemplate.queryForList(sql, params.toArray());
            return ResponseEntity.ok(sales);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener lista de ventas: " + e.getMessage()));
        }
    }

    // ==========================================
    // 1.1 GET SALE BY ID WITH FULL DETAILS
    // ==========================================
    @GetMapping("/{id}")
    public ResponseEntity<?> getSaleById(@PathVariable Long id) {
        try {
            Map<String, Object> sale = jdbcTemplate.queryForMap(
                "SELECT v.*, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente_nombre_completo, " +
                "       c.numero_documento, c.telefono_principal, c.email, " +
                "       o.titulo as oportunidad_titulo, " +
                "       TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as vendedor_nombre, " +
                "       t.rol_operativo as vendedor_cargo, " +
                "       rp.nombre as vendedor_perfil, " +
                "       COALESCE(v.equipo, t.equipo, 'Equipo Principal') as equipo_nombre, " +
                "       COALESCE(v.supervisor_id, t.supervisor_id) as supervisor_id, " +
                "       TRIM(CONCAT(sup.nombre, ' ', COALESCE(sup.apellido, ''))) as supervisor_nombre " +
                "FROM ventas v " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "LEFT JOIN oportunidades o ON v.oportunidad_id = o.id " +
                "LEFT JOIN trabajadores t ON v.trabajador_id = t.id " +
                "LEFT JOIN rentabilidad_perfiles rp ON t.perfil_comision_id = rp.id " +
                "LEFT JOIN trabajadores sup ON COALESCE(v.supervisor_id, t.supervisor_id) = sup.id " +
                "WHERE v.id = ?", id
            );
            List<Map<String, Object>> items = jdbcTemplate.queryForList(
                "SELECT vd.*, p.nombre as producto_nombre, p.codigo, p.documentos_requeridos " +
                "FROM venta_detalles vd " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "WHERE vd.venta_id = ?", id
            );
            Map<String, Object> response = new HashMap<>(sale);
            response.put("items", items);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Venta no encontrada: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. GET SALES DETAILED ITEMS REPORT
    // ==========================================
    @GetMapping("/report/detailed")
    public ResponseEntity<?> getDetailedItemsReport() {
        try {
            String sql = 
                "SELECT v.numero_venta, v.fecha_venta, v.estado, v.metodo_pago, v.estado_pago, " +
                "       COALESCE(c.razon_social, CONCAT(c.nombres, ' ', c.apellidos)) as cliente_nombre_completo, " +
                "       p.nombre as producto_nombre, p.es_pack, cat.nombre as categoria_nombre, " +
                "       vd.cantidad, vd.precio_unitario, vd.subtotal, " +
                "       CONCAT(d.nombre, ' ', d.apellido) as chofer_nombre, " +
                "       ped.numero_pedido, ped.fecha_entrega as pedido_fecha_entrega, " +
                "       ped.direccion_entrega, z.nombre as zona_nombre, " +
                "       ped.prioridad, ped.tipo_envio, ped.notas as pedido_notas " +
                "FROM venta_detalles vd " +
                "JOIN ventas v ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN categorias_producto cat ON p.categoria_id = cat.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "LEFT JOIN pedidos ped ON v.id = ped.venta_id " +
                "LEFT JOIN conductores d ON ped.chofer_id = d.id " +
                "LEFT JOIN zonas z ON ped.zona = z.id " +
                "ORDER BY v.fecha_venta DESC, v.id DESC";
            
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener reporte detallado: " + e.getMessage()));
        }
    }

    // ==========================================
    // 3. GET COMPOSITIONS & METADATA FOR BOTTLES
    // ==========================================
    @GetMapping("/compositions")
    public ResponseEntity<?> getCompositions() {
        try {
            String sql = 
                "SELECT pc.producto_padre_id, pc.producto_hijo_id, pc.cantidad, " +
                "       ph.requiere_retorno, ph.categoria_id " +
                "FROM producto_composicion pc " +
                "JOIN productos ph ON pc.producto_hijo_id = ph.id";
            List<Map<String, Object>> compositions = jdbcTemplate.queryForList(sql);
            return ResponseEntity.ok(Map.of("compositions", compositions));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al obtener composiciones: " + e.getMessage()));
        }
    }

    // ==========================================
    // 4. GET SALES ANALYTICS & DASHBOARD DATA
    // ==========================================
    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoria_id,
            @RequestParam(required = false) String producto_id,
            @RequestParam(required = false) String estado_pago) {
        
        try {
            List<String> whereClauses = new ArrayList<>();
            List<Object> params = new ArrayList<>();

            whereClauses.add("v.estado NOT IN ('cancelada', 'anulada')");

            if (desde != null && !desde.isEmpty()) {
                whereClauses.add("DATE(v.fecha_venta) >= ?");
                params.add(java.sql.Date.valueOf(desde));
            }
            if (hasta != null && !hasta.isEmpty()) {
                whereClauses.add("DATE(v.fecha_venta) <= ?");
                params.add(java.sql.Date.valueOf(hasta));
            }
            if (search != null && !search.isEmpty()) {
                String likeTerm = "%" + search + "%";
                whereClauses.add("(v.numero_venta LIKE ? OR c.razon_social LIKE ? OR c.nombres LIKE ? OR p.nombre LIKE ?)");
                params.add(likeTerm);
                params.add(likeTerm);
                params.add(likeTerm);
                params.add(likeTerm);
            }
            if (categoria_id != null && !categoria_id.isEmpty() && !categoria_id.equals("all")) {
                whereClauses.add("p.categoria_id = ?");
                params.add(Integer.parseInt(categoria_id));
            }
            if (producto_id != null && !producto_id.isEmpty() && !producto_id.equals("all")) {
                whereClauses.add("p.id = ?");
                params.add(Integer.parseInt(producto_id));
            }
            if (estado_pago != null && !estado_pago.isEmpty() && !estado_pago.equals("all")) {
                whereClauses.add("v.estado_pago = ?");
                params.add(estado_pago);
            }

            String where = String.join(" AND ", whereClauses);

            // DATA 1: Distribution by Product
            String sqlProducts = 
                "SELECT p.nombre, SUM(vd.cantidad) as total_cantidad, SUM(vd.subtotal) as total_monto " +
                "FROM venta_detalles vd " +
                "JOIN ventas v ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "WHERE " + where + " " +
                "GROUP BY p.id, p.nombre " +
                "ORDER BY total_monto DESC";
            List<Map<String, Object>> byProduct = jdbcTemplate.queryForList(sqlProducts, params.toArray());

            // DATA 2: Trend Monthly
            String sqlTrend = 
                "SELECT EXTRACT(MONTH FROM v.fecha_venta) as mes, COUNT(DISTINCT v.id) as total_ventas, SUM(v.total) as monto_total " +
                "FROM ventas v " +
                "JOIN venta_detalles vd ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "WHERE " + where + " " +
                "GROUP BY EXTRACT(MONTH FROM v.fecha_venta) " +
                "ORDER BY mes ASC";
            List<Map<String, Object>> trend = jdbcTemplate.queryForList(sqlTrend, params.toArray());

            // DATA 3: Hierarchical Summary (Category -> Product)
            String sqlDetailed = 
                "SELECT cat.nombre as categoria_nombre, p.nombre as producto_nombre, " +
                "       SUM(vd.cantidad) as cantidad_vendida, SUM(vd.subtotal) as total_monto " +
                "FROM venta_detalles vd " +
                "JOIN ventas v ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN categorias_producto cat ON p.categoria_id = cat.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "WHERE " + where + " " +
                "GROUP BY cat.id, cat.nombre, p.id, p.nombre " +
                "ORDER BY categoria_nombre ASC, total_monto DESC";
            List<Map<String, Object>> detailed = jdbcTemplate.queryForList(sqlDetailed, params.toArray());

            // DATA 4: Distribution by Seller (User)
            String sqlUsers = 
                "SELECT CONCAT(u.first_name, ' ', u.last_name) as nombre, COUNT(DISTINCT v.id) as total_ventas, SUM(v.total) as monto_total " +
                "FROM ventas v " +
                "JOIN users u ON v.usuario_id = u.id " +
                "JOIN venta_detalles vd ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "WHERE " + where + " " +
                "GROUP BY u.id, u.first_name, u.last_name " +
                "ORDER BY monto_total DESC";
            List<Map<String, Object>> byUser = jdbcTemplate.queryForList(sqlUsers, params.toArray());

            // DATA 5: Daily Trend
            String sqlDaily = 
                "SELECT DATE(v.fecha_venta) as fecha, COUNT(DISTINCT v.id) as total_ventas, SUM(v.total) as monto_total " +
                "FROM ventas v " +
                "JOIN venta_detalles vd ON vd.venta_id = v.id " +
                "JOIN productos p ON vd.producto_id = p.id " +
                "LEFT JOIN contacts c ON v.contacto_id = c.id " +
                "WHERE " + where + " " +
                "GROUP BY DATE(v.fecha_venta) " +
                "ORDER BY fecha ASC";
            List<Map<String, Object>> dailyTrend = jdbcTemplate.queryForList(sqlDaily, params.toArray());

            return ResponseEntity.ok(Map.of(
                "byProduct", byProduct,
                "trend", trend,
                "detailed", detailed,
                "byUser", byUser,
                "dailyTrend", dailyTrend
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al procesar analíticas de ventas: " + e.getMessage()));
        }
    }

    // ==========================================
    // 5. CREATE / SAVE SALES DRAFT OR DIRECT SALE (ALIGNED WITH PHP LOGIC)
    // ==========================================
    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveSale(@RequestBody SaveSaleRequest req) {
        try {
            if (req.contacto_id == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "El cliente/contacto es obligatorio."));
            }
            if (req.items == null || req.items.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "La venta debe contener al menos un producto."));
            }

            boolean isEdit = req.id != null;
            Long ventaId;
            String numeroVenta;

            Object[] saveScopeInfo = resolveUserScope();
            Integer authSaveUsuarioId = (Integer) saveScopeInfo[0];
            Long authSaveTrabajadorId = (Long) saveScopeInfo[1];
            String saveScope = (String) saveScopeInfo[2];

            Integer defaultUserId = authSaveUsuarioId != null ? authSaveUsuarioId : 1;
            if (authSaveUsuarioId == null) {
                try {
                    defaultUserId = jdbcTemplate.queryForObject("SELECT id FROM users LIMIT 1", Integer.class);
                } catch (Exception ignored) {}
            }

            Integer trabajadorId = req.trabajador_id;
            if ("own".equals(saveScope) && authSaveTrabajadorId != null) {
                trabajadorId = authSaveTrabajadorId.intValue();
            } else if (trabajadorId == null) {
                try {
                    trabajadorId = jdbcTemplate.queryForObject("SELECT id FROM trabajadores WHERE estado = 'Activo' ORDER BY id ASC LIMIT 1", Integer.class);
                } catch (Exception ignored) {}
            }

            String workerEquipo = "Equipo Principal";
            Integer workerSupervisorId = null;
            if (trabajadorId != null) {
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
            String finalEquipo = (req.equipo != null && !req.equipo.trim().isEmpty()) ? req.equipo : workerEquipo;
            Integer finalSupervisorId = req.supervisor_id != null ? req.supervisor_id : workerSupervisorId;

            if (isEdit) {
                ventaId = req.id;
                // Fetch old sale to restore old stock & bottle balance
                Map<String, Object> oldSale = jdbcTemplate.queryForMap("SELECT * FROM ventas WHERE id = ?", req.id);
                numeroVenta = (String) oldSale.get("numero_venta");

                int oldImpact = ((Number) oldSale.get("bidones_entregados")).intValue() - ((Number) oldSale.get("bidones_recogidos")).intValue();
                if (oldImpact != 0) {
                    jdbcTemplate.update(
                        "UPDATE contacts SET bidones_prestados = COALESCE(bidones_prestados, 0) - ? WHERE id = ?",
                        oldImpact, oldSale.get("contacto_id")
                    );
                }

                // Restore old stock
                List<Map<String, Object>> oldItems = jdbcTemplate.queryForList("SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?", req.id);
                for (Map<String, Object> item : oldItems) {
                    int prodId = ((Number) item.get("producto_id")).intValue();
                    int cant = ((Number) item.get("cantidad")).intValue();
                    restoreProductStock(prodId, cant);
                }

                // Update sale details
                jdbcTemplate.update("DELETE FROM venta_detalles WHERE venta_id = ?", req.id);
                jdbcTemplate.update(
                    "UPDATE ventas SET contacto_id=?, trabajador_id=COALESCE(?, trabajador_id), equipo=?, supervisor_id=?, fecha_venta=NOW(), tipo_comprobante=?, subtotal=?, igv=?, total=?, estado=?, metodo_pago=?, estado_pago=?, monto_pagado=?, bidones_entregados=?, bidones_recogidos=?, notas=CONCAT(?, ' | ', COALESCE(notas,'')), direccion_entrega=? WHERE id=?",
                    req.contacto_id, trabajadorId, finalEquipo, finalSupervisorId, (req.tipo_comprobante != null ? req.tipo_comprobante : "nota_venta"), req.subtotal, req.igv, req.total, req.estado, req.metodo_pago, req.estado_pago, req.monto_pagado, req.bidones_entregados, req.bidones_recogidos, req.notas, req.direccion_entrega, req.id
                );
            } else {
                // Generate sale number: V- + 6 characters
                String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                StringBuilder sb = new StringBuilder();
                Random rng = new Random();
                for (int i = 0; i < 6; i++) {
                    sb.append(chars.charAt(rng.nextInt(chars.length())));
                }
                numeroVenta = "V-" + sb.toString();

                String initialPaymentState = req.estado_pago != null ? req.estado_pago : "pendiente";
                double finalPaidAmount = "pagado".equalsIgnoreCase(initialPaymentState) ? (req.monto_pagado != null && req.monto_pagado > 0 ? req.monto_pagado : req.total) : (req.monto_pagado != null ? req.monto_pagado : 0.0);
                String initialInstallState = "completada".equalsIgnoreCase(req.estado) ? "completada" : "pendiente";

                jdbcTemplate.update(
                    "INSERT INTO ventas (contacto_id, trabajador_id, equipo, supervisor_id, usuario_id, numero_venta, fecha_venta, tipo_comprobante, subtotal, igv, total, monto_pagado, estado, estado_pago, metodo_pago, bidones_entregados, bidones_recogidos, notas, direccion_entrega, estado_instalacion) " +
                    "VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    req.contacto_id, trabajadorId, finalEquipo, finalSupervisorId, defaultUserId, numeroVenta, (req.tipo_comprobante != null ? req.tipo_comprobante : "nota_venta"), req.subtotal, req.igv, req.total, finalPaidAmount, req.estado, initialPaymentState, req.metodo_pago, req.bidones_entregados, req.bidones_recogidos, req.notas, req.direccion_entrega, initialInstallState
                );
                ventaId = jdbcTemplate.queryForObject("SELECT lastval()", Long.class);
            }

            // Update Contact Status to 'Cliente'
            jdbcTemplate.update("UPDATE contacts SET status = 'Cliente' WHERE id = ?", req.contacto_id);

            // Apply new bottle balance impact
            int newImpact = req.bidones_entregados - req.bidones_recogidos;
            if (newImpact != 0) {
                jdbcTemplate.update(
                    "UPDATE contacts SET bidones_prestados = COALESCE(bidones_prestados, 0) + ? WHERE id = ?",
                    newImpact, req.contacto_id
                );

                // Audit logging to movimientos_envases
                Integer prevBalance = jdbcTemplate.queryForObject("SELECT COALESCE(bidones_prestados, 0) - ? FROM contacts WHERE id = ?", Integer.class, newImpact, req.contacto_id);
                if (prevBalance == null) prevBalance = 0;
                jdbcTemplate.update(
                    "INSERT INTO movimientos_envases (contacto_id, tipo, cantidad, saldo_anterior, saldo_posterior, usuario_id, venta_id, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    req.contacto_id, newImpact > 0 ? "Entrega" : "Recojo", Math.abs(newImpact), prevBalance, prevBalance + newImpact, defaultUserId, ventaId, "Venta Directa #" + numeroVenta
                );
            }

            // Insert details and deduct stock
            for (SaleDetailRequest item : req.items) {
                Integer prodId = item.producto_id;
                if (prodId == null || prodId <= 0) {
                    try {
                        prodId = jdbcTemplate.queryForObject("SELECT id FROM productos ORDER BY id ASC LIMIT 1", Integer.class);
                    } catch (Exception ignored) {}
                }
                if (prodId != null) {
                    double sub = item.cantidad * item.precio_unitario;
                    jdbcTemplate.update(
                        "INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
                        ventaId, prodId, item.cantidad, item.precio_unitario, sub
                    );
                    deductProductStock(prodId, item.cantidad);
                }
            }

            // LOGISTICS AUTOMATION: Create a linked Pedido in "Entregado" stage if registering a new sale
            if (!isEdit) {
                Integer entregadoStageId = null;
                try {
                    entregadoStageId = jdbcTemplate.queryForObject("SELECT id FROM etapas_pedido WHERE es_entregado = 1 ORDER BY orden ASC LIMIT 1", Integer.class);
                } catch (Exception ignored) {}

                if (entregadoStageId != null) {
                    // Generate order number: P- + 6 characters
                    String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                    StringBuilder sbOrder = new StringBuilder();
                    Random rng = new Random();
                    for (int i = 0; i < 6; i++) {
                        sbOrder.append(chars.charAt(rng.nextInt(chars.length())));
                    }
                    String numeroPedido = "P-" + sbOrder.toString();
                    String orderPaymentStatus = "completada".equalsIgnoreCase(req.estado) ? "Pagado" : "Pendiente";

                    jdbcTemplate.update(
                        "INSERT INTO pedidos (numero_pedido, contacto_id, venta_id, fecha_entrega, total, estado_pago, metodo_pago, envases_entregados, envases_devueltos, direccion_entrega, notas, etapa_id) " +
                        "VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, 'Venta Directa', ?)",
                        numeroPedido, req.contacto_id, ventaId, req.total, orderPaymentStatus, req.metodo_pago, req.bidones_entregados, req.bidones_recogidos, req.direccion_entrega, entregadoStageId
                    );
                    Long pedidoId = jdbcTemplate.queryForObject("SELECT lastval()", Long.class);

                    // Insert order details
                    for (SaleDetailRequest item : req.items) {
                        Integer prodId = item.producto_id;
                        if (prodId == null || prodId <= 0) {
                            try {
                                prodId = jdbcTemplate.queryForObject("SELECT id FROM productos ORDER BY id ASC LIMIT 1", Integer.class);
                            } catch (Exception ignored) {}
                        }
                        if (prodId != null) {
                            jdbcTemplate.update(
                                "INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
                                pedidoId, prodId, item.cantidad, item.precio_unitario
                            );
                        }
                    }
                }
            }

            // --- INTEGRATION WITH CASH FLOW (FINANCE) ---
            if ("completada".equalsIgnoreCase(req.estado)) {
                // Delete previous cash logs for this sale to avoid duplicates
                jdbcTemplate.update("DELETE FROM caja_movimientos WHERE referencia_id = ? AND tabla_referencia = 'ventas'", ventaId);

                String tipoModelo = getSetting("negocio.tipo_modelo", "TELECOM");
                if (!"TELECOM".equalsIgnoreCase(tipoModelo)) {
                    // Negocio Regular: cobro directo al cliente por lo vendido
                    // (En Telecomunicaciones NO se ingresa en automático; el ingreso de comisión se ingresa manualmente)
                    jdbcTemplate.update(
                        "INSERT INTO caja_movimientos (tipo, categoria, monto, metodo_pago, referencia_id, tabla_referencia, fecha, notas, usuario_id) " +
                        "VALUES ('Ingreso', 'Venta', ?, ?, ?, 'ventas', NOW(), ?, ?)",
                        req.total, req.metodo_pago, ventaId, (isEdit ? "Actualización de Venta Directa #" : "Venta Directa #") + numeroVenta, defaultUserId
                    );
                }
            } else {
                jdbcTemplate.update("DELETE FROM caja_movimientos WHERE referencia_id = ? AND tabla_referencia = 'ventas'", ventaId);
            }

            return ResponseEntity.ok(Map.of("status", "success", "id", ventaId, "numero", numeroVenta));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("status", "error", "message", "Error al guardar venta: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6. VALIDATE / CONFIRM DELIVERY AND PAYMENT
    // ==========================================
    @PostMapping("/validate")
    @Transactional
    public ResponseEntity<?> validateSale(@RequestBody ValidateSaleRequest req) {
        try {
            Map<String, Object> sale = jdbcTemplate.queryForMap(
                "SELECT estado, total, estado_pago, contacto_id, usuario_id FROM ventas WHERE id = ?",
                req.id
            );

            boolean alreadyDelivered = "completada".equalsIgnoreCase((String) sale.get("estado"));
            boolean wasAlreadyPaid = "pagado".equalsIgnoreCase((String) sale.get("estado_pago"));
            String currentEstado = (String) sale.get("estado");
            String nuevoEstado = currentEstado != null ? currentEstado : "pendiente";
            if (req.entrega_ok != null && req.entrega_ok) {
                nuevoEstado = "completada";
            }

            double finalPaid = req.monto_pagado;
            if ("pagado".equalsIgnoreCase(req.estado_pago)) {
                finalPaid = ((Number) sale.get("total")).doubleValue();
            }

            jdbcTemplate.update(
                "UPDATE ventas SET estado = ?, metodo_pago = ?, estado_pago = ?, monto_pagado = ? WHERE id = ?",
                nuevoEstado, req.metodo_pago, req.estado_pago, finalPaid, req.id
            );

            // Contact updates status to 'Cliente'
            jdbcTemplate.update("UPDATE contacts SET status = 'Cliente' WHERE id = ?", sale.get("contacto_id"));

            // Sync to Orders table if linked
            String orderPayment = "pagado".equalsIgnoreCase(req.estado_pago) ? "Pagado" : ("parcial".equalsIgnoreCase(req.estado_pago) ? "Parcial" : "Pendiente");
            jdbcTemplate.update("UPDATE pedidos SET estado_pago = ?, venta_estado = ? WHERE venta_id = ?", orderPayment, nuevoEstado, req.id);

            // Stock Management
            if (req.entrega_ok != null && req.entrega_ok && !alreadyDelivered) {
                // Deduct stock
                List<Map<String, Object>> details = jdbcTemplate.queryForList("SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?", req.id);
                for (Map<String, Object> det : details) {
                    deductProductStock((Integer) det.get("producto_id"), (Integer) det.get("cantidad"));
                }
            }

            // Sync bottle balance & finance cash
            Integer userId = (Integer) sale.get("usuario_id");
            syncValidationLogic(req.id, req.metodo_pago, req.estado_pago, wasAlreadyPaid, finalPaid, userId != null ? userId : 1);

            return ResponseEntity.ok(Map.of("message", "Venta validada y confirmada con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al validar la venta: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6.1 UPDATE SALE STATUS (KANBAN DRAG & DROP)
    // ==========================================
    @PostMapping("/update-status")
    @Transactional
    public ResponseEntity<?> updateSaleStatus(@RequestBody Map<String, Object> req) {
        try {
            Long id = Long.valueOf(String.valueOf(req.get("id")));
            String estado = (String) req.get("estado");
            if (estado == null || estado.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El estado es requerido."));
            }
            if ("completada".equalsIgnoreCase(estado)) {
                jdbcTemplate.update("UPDATE ventas SET estado = 'completada', estado_instalacion = 'completada', fecha_instalacion = COALESCE(fecha_instalacion, NOW()) WHERE id = ?", id);
            } else if ("cancelada".equalsIgnoreCase(estado)) {
                jdbcTemplate.update("UPDATE ventas SET estado = 'cancelada' WHERE id = ?", id);
            } else {
                jdbcTemplate.update("UPDATE ventas SET estado = ? WHERE id = ?", estado.toLowerCase(), id);
            }
            return ResponseEntity.ok(Map.of("message", "Estado actualizado con éxito.", "estado", estado.toLowerCase()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar estado: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6.1.1 UNLOCK SALE (DESBLOQUEAR VENTA CERRADA/ANULADA)
    // ==========================================
    @PostMapping("/unlock")
    @Transactional
    public ResponseEntity<?> unlockSale(@RequestBody Map<String, Object> req) {
        try {
            Long id = Long.valueOf(String.valueOf(req.get("id")));
            String targetEstado = req.get("target_estado") != null ? (String) req.get("target_estado") : "en_proceso";
            jdbcTemplate.update("UPDATE ventas SET estado = ?, estado_instalacion = 'pendiente' WHERE id = ?", targetEstado.toLowerCase(), id);
            return ResponseEntity.ok(Map.of("message", "Venta desbloqueada con éxito y trasladada a " + targetEstado, "estado", targetEstado.toLowerCase()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al desbloquear venta: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6.2 UPLOAD INSTALLATION DOCUMENT
    // ==========================================
    @PostMapping("/upload-doc")
    public ResponseEntity<?> uploadInstallationDoc(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El archivo está vacío."));
            }

            String uploadDir = "/app/uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String originalFilename = file.getOriginalFilename();
            String cleanName = originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_") : "doc";
            String filename = "doc_instalacion_" + System.currentTimeMillis() + "_" + cleanName;
            File targetFile = new File(dir, filename);
            file.transferTo(targetFile);

            String localPath = "/uploads/" + filename;
            return ResponseEntity.ok(Map.of(
                "url", localPath,
                "filename", originalFilename != null ? originalFilename : filename,
                "size", file.getSize(),
                "message", "Archivo subido con éxito."
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al subir documento: " + e.getMessage()));
        }
    }

    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    private String safeJsonString(Object obj) {
        if (obj == null) return "[]";
        if (obj instanceof String) {
            String s = ((String) obj).trim();
            return s.isEmpty() ? "[]" : s;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

    // ==========================================
    // 6.3 SAVE INSTALLATION DOCUMENTATION
    // ==========================================
    @PostMapping("/save-docs")
    @Transactional
    public ResponseEntity<?> saveInstallationDocs(@RequestBody Map<String, Object> req) {
        try {
            Long id = Long.valueOf(String.valueOf(req.get("id")));
            String documentos = safeJsonString(req.get("documentos"));
            String estadoInstalacion = req.get("estado_instalacion") != null ? String.valueOf(req.get("estado_instalacion")) : "completada";
            String tecnico = req.get("tecnico_instalador") != null ? String.valueOf(req.get("tecnico_instalador")) : null;
            String notasInstalacion = req.get("notas_instalacion") != null ? String.valueOf(req.get("notas_instalacion")) : null;
            boolean completarVenta = Boolean.parseBoolean(String.valueOf(req.get("completar_venta")));

            if (completarVenta) {
                jdbcTemplate.update(
                    "UPDATE ventas SET documentos_instalacion = ?, estado_instalacion = ?, tecnico_instalador = ?, notas_instalacion = ?, estado = 'completada', fecha_instalacion = NOW() WHERE id = ?",
                    documentos, estadoInstalacion, tecnico, notasInstalacion, id
                );
            } else {
                jdbcTemplate.update(
                    "UPDATE ventas SET documentos_instalacion = ?, estado_instalacion = ?, tecnico_instalador = ?, notas_instalacion = ? WHERE id = ?",
                    documentos, estadoInstalacion, tecnico, notasInstalacion, id
                );
            }

            return ResponseEntity.ok(Map.of(
                "message", completarVenta ? "Documentación guardada e instalación completada con éxito." : "Documentación guardada con éxito.",
                "estado_instalacion", estadoInstalacion
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar documentación: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6.4 APPROVE / VALIDATE DOCUMENTATION
    // ==========================================
    @PostMapping("/approve-docs")
    @Transactional
    public ResponseEntity<?> approveDocumentation(@RequestBody Map<String, Object> req) {
        try {
            Long id = Long.valueOf(String.valueOf(req.get("id")));
            String estadoAprobacion = req.get("estado_aprobacion") != null ? String.valueOf(req.get("estado_aprobacion")) : "aprobada";
            String aprobadoPor = req.get("aprobado_por") != null ? String.valueOf(req.get("aprobado_por")) : "Administrador";
            String nuevoEstado = req.get("nuevo_estado") != null ? String.valueOf(req.get("nuevo_estado")) : "en_proceso";

            jdbcTemplate.update(
                "UPDATE ventas SET estado_aprobacion = ?, aprobado_por = ?, fecha_aprobacion = NOW(), estado = ? WHERE id = ?",
                estadoAprobacion, aprobadoPor, nuevoEstado, id
            );

            return ResponseEntity.ok(Map.of(
                "message", "aprobada".equalsIgnoreCase(estadoAprobacion) 
                    ? "Documentación aprobada con éxito. Venta movida a Programación / Instalación." 
                    : "Estado de documentación actualizado.",
                "estado_aprobacion", estadoAprobacion,
                "estado", nuevoEstado
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al aprobar documentación: " + e.getMessage()));
        }
    }

    // ==========================================
    // 6.5 UPDATE 4 INVOICES TRACKING
    // ==========================================
    @PostMapping("/update-invoices")
    @Transactional
    public ResponseEntity<?> updateInvoicesTracking(@RequestBody Map<String, Object> req) {
        try {
            Long id = Long.valueOf(String.valueOf(req.get("id")));
            String facturasJson = safeJsonString(req.get("facturas_seguimiento"));
            
            // Check if 1st invoice is marked as paid
            Boolean f1Paid = req.get("f1_pagada") != null ? Boolean.parseBoolean(String.valueOf(req.get("f1_pagada"))) : null;
            if (Boolean.TRUE.equals(f1Paid)) {
                jdbcTemplate.update(
                    "UPDATE ventas SET facturas_seguimiento = ?, estado_pago = 'pagado' WHERE id = ?",
                    facturasJson, id
                );
            } else {
                jdbcTemplate.update(
                    "UPDATE ventas SET facturas_seguimiento = ? WHERE id = ?",
                    facturasJson, id
                );
            }

            return ResponseEntity.ok(Map.of(
                "message", "Seguimiento de facturas actualizado con éxito.",
                "facturas_seguimiento", facturasJson
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar facturas: " + e.getMessage()));
        }
    }

    // ==========================================
    // 7. CANCEL / VOID A SALE
    // ==========================================
    @PostMapping("/cancel")
    @Transactional
    public ResponseEntity<?> cancelSale(@RequestBody CancelSaleRequest req) {
        try {
            Map<String, Object> sale = jdbcTemplate.queryForMap(
                "SELECT estado, estado_pago, contacto_id, bidones_entregados, bidones_recogidos, notas, usuario_id FROM ventas WHERE id = ?",
                req.id
            );

            // Restore Stock
            if ("completada".equalsIgnoreCase((String) sale.get("estado"))) {
                List<Map<String, Object>> items = jdbcTemplate.queryForList("SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?", req.id);
                for (Map<String, Object> item : items) {
                    restoreProductStock((Integer) item.get("producto_id"), (Integer) item.get("cantidad"));
                }
            }

            // Revert bottle balance
            if ("pagado".equalsIgnoreCase((String) sale.get("estado_pago"))) {
                updateCustomerBottleBalance(req.id, true);
            }

            String timestamp = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date());
            String updatedNotes = "⚠️ ANULADA (" + timestamp + "): " + req.motivo + " | " + (sale.get("notes") != null ? sale.get("notes") : (sale.get("notas") != null ? sale.get("notas") : ""));

            jdbcTemplate.update(
                "UPDATE ventas SET estado = 'cancelada', estado_pago = 'pendiente', bidones_entregados = 0, bidones_recogidos = 0, notas = ? WHERE id = ?",
                updatedNotes, req.id
            );

            // Delete financial logs
            jdbcTemplate.update(
                "DELETE FROM caja_movimientos WHERE referencia_id = ? AND tabla_referencia = 'ventas'",
                req.id
            );

            // Cancel linked order if exists
            Integer lostStageId = 10;
            try {
                lostStageId = jdbcTemplate.queryForObject("SELECT id FROM etapas_pedido WHERE es_perdido = 1 ORDER BY orden DESC LIMIT 1", Integer.class);
            } catch (Exception ignored) {}

            jdbcTemplate.update(
                "UPDATE pedidos SET etapa_id = ?, estado_pago = 'Pendiente', venta_estado = 'cancelada', envases_entregados = 0, envases_devueltos = 0, notas = CONCAT('🚨 VENTA ANULADA: ', ?, '\n', COALESCE(notas,'')) WHERE venta_id = ?",
                lostStageId, req.motivo, req.id
            );

            return ResponseEntity.ok(Map.of("message", "Venta anulada correctamente."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al anular la venta: " + e.getMessage()));
        }
    }

    // ==========================================
    // 8. HARD DELETE A SALE
    // ==========================================
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteSale(@PathVariable Long id) {
        try {
            Map<String, Object> sale = jdbcTemplate.queryForMap(
                "SELECT estado, estado_pago, contacto_id FROM ventas WHERE id = ?",
                id
            );

            if ("completada".equalsIgnoreCase((String) sale.get("estado"))) {
                List<Map<String, Object>> items = jdbcTemplate.queryForList("SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?", id);
                for (Map<String, Object> item : items) {
                    restoreProductStock((Integer) item.get("producto_id"), (Integer) item.get("cantidad"));
                }
            }

            if ("pagado".equalsIgnoreCase((String) sale.get("estado_pago"))) {
                updateCustomerBottleBalance(id, true);
            }

            jdbcTemplate.update("UPDATE pedidos SET venta_id = NULL WHERE venta_id = ?", id);
            jdbcTemplate.update("DELETE FROM venta_detalles WHERE venta_id = ?", id);
            jdbcTemplate.update("DELETE FROM ventas WHERE id = ?", id);
            jdbcTemplate.update("DELETE FROM caja_movimientos WHERE referencia_id = ? AND tabla_referencia = 'ventas'", id);

            return ResponseEntity.ok(Map.of("message", "Venta eliminada permanentemente."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar la venta: " + e.getMessage()));
        }
    }

    // ==========================================
    // PRIVATE INTERNAL REUSABLE LOGIC
    // ==========================================
    private void syncValidationLogic(Long id, String metodo, String estadoPago, boolean wasAlreadyPaid, double finalPaid, Integer userId) {
        // 1. Bottle Balance Sync
        if ("pagado".equalsIgnoreCase(estadoPago) && !wasAlreadyPaid) {
            updateCustomerBottleBalance(id, false);
        }

        // 2. Finance Cash Flow Sync (Solo en Negocio Regular; en Telecomunicaciones las comisiones se registran manualmente)
        String tipoModelo = getSetting("negocio.tipo_modelo", "TELECOM");
        if (!"TELECOM".equalsIgnoreCase(tipoModelo)) {
            Double yaRegistrado = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END), 0.0) " +
                "FROM caja_movimientos WHERE referencia_id = ? AND tabla_referencia = 'ventas'",
                Double.class, id
            );

            double diff = finalPaid - (yaRegistrado != null ? yaRegistrado : 0.0);
            if (Math.abs(diff) > 0.01) {
                if (diff > 0) {
                    jdbcTemplate.update(
                        "INSERT INTO caja_movimientos (tipo, categoria, monto, metodo_pago, referencia_id, tabla_referencia, notas, usuario_id) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        "Ingreso", "Venta", diff, metodo != null ? metodo : "Efectivo", id, "ventas",
                        "Abono a Venta #" + id + ("parcial".equalsIgnoreCase(estadoPago) ? " (Pago Parcial)" : " (Pago Completo)"), userId
                    );
                } else {
                    jdbcTemplate.update(
                        "INSERT INTO caja_movimientos (tipo, categoria, monto, metodo_pago, referencia_id, tabla_referencia, notas, usuario_id) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        "Egreso", "Anulación/Corrección", Math.abs(diff), metodo != null ? metodo : "Efectivo", id, "ventas",
                        "Corrección de monto en Venta #" + id, userId
                    );
                }
            }
        }
    }

    private void updateCustomerBottleBalance(Long ventaId, boolean isReversal) {
        try {
            Map<String, Object> sale = jdbcTemplate.queryForMap(
                "SELECT id, contacto_id, bidones_entregados, bidones_recogidos, usuario_id FROM ventas WHERE id = ?",
                ventaId
            );

            int entregados = (Integer) sale.get("bidones_entregados");
            int recogidos = (Integer) sale.get("bidones_recogidos");
            int impact = entregados - recogidos;

            if (impact != 0) {
                String operator = isReversal ? "-" : "+";
                Long contactoId = ((Number) sale.get("contacto_id")).longValue();

                Integer prevBalance = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(bidones_prestados, 0) FROM contacts WHERE id = ?",
                    Integer.class, contactoId
                );

                if (prevBalance == null) prevBalance = 0;

                jdbcTemplate.update(
                    "UPDATE contacts SET bidones_prestados = COALESCE(bidones_prestados, 0) " + operator + " ? WHERE id = ?",
                    Math.abs(impact), contactoId
                );

                int newBalance = isReversal ? (prevBalance - impact) : (prevBalance + impact);

                // Log movement
                jdbcTemplate.update(
                    "INSERT INTO movimientos_envases (contacto_id, tipo, cantidad, saldo_anterior, saldo_posterior, usuario_id, venta_id, notas) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    contactoId, isReversal ? "Ajuste" : (impact > 0 ? "Entrega" : "Recojo"), Math.abs(impact), prevBalance, newBalance,
                    sale.get("usuario_id"), ventaId, isReversal ? "REVERSIÓN de Venta #" + ventaId : "Transacción en Venta #" + ventaId
                );
            }
        } catch (Exception e) {
            System.err.println("Error syncing bottle balance: " + e.getMessage());
        }
    }

    private void restoreProductStock(int product_id, int quantity) {
        List<Map<String, Object>> components = jdbcTemplate.queryForList(
            "SELECT producto_hijo_id, cantidad FROM producto_composicion WHERE producto_padre_id = ?",
            product_id
        );
        if (!components.isEmpty()) {
            for (Map<String, Object> comp : components) {
                int totalRest = quantity * ((Number) comp.get("cantidad")).intValue();
                jdbcTemplate.update(
                    "UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?",
                    totalRest, comp.get("producto_hijo_id")
                );
            }
        } else {
            jdbcTemplate.update(
                "UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?",
                quantity, product_id
            );
        }
    }

    private void deductProductStock(int product_id, int quantity) {
        List<Map<String, Object>> components = jdbcTemplate.queryForList(
            "SELECT producto_hijo_id, cantidad FROM producto_composicion WHERE producto_padre_id = ?",
            product_id
        );
        if (!components.isEmpty()) {
            for (Map<String, Object> comp : components) {
                int totalDesc = quantity * ((Number) comp.get("cantidad")).intValue();
                jdbcTemplate.update(
                    "UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?",
                    totalDesc, comp.get("producto_hijo_id")
                );
            }
        } else {
            jdbcTemplate.update(
                "UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?",
                quantity, product_id
            );
        }
    }

    // ==========================================
    // REQUEST DTO CLASSES
    // ==========================================
    public static class SaveSaleRequest {
        public Long id;
        public String numero_venta;
        public String tipo_comprobante = "nota_venta";
        public Long contacto_id;
        public Integer trabajador_id;
        public String equipo;
        public Integer supervisor_id;
        public String estado = "pendiente";
        public String metodo_pago = "Efectivo";
        public String estado_pago = "pendiente";
        public Double subtotal = 0.0;
        public Double igv = 0.0;
        public Double total = 0.0;
        public Double monto_pagado = 0.0;
        public Integer bidones_entregados = 0;
        public Integer bidones_recogidos = 0;
        public String notas;
        public String direccion_entrega;
        public List<SaleDetailRequest> items;
    }

    public static class SaleDetailRequest {
        public Integer producto_id;
        public Integer cantidad;
        public Double precio_unitario;
    }

    public static class ValidateSaleRequest {
        public Long id;
        public String metodo_pago;
        public String estado_pago;
        public Boolean entrega_ok = true;
        public Double monto_pagado = 0.0;
    }

    public static class CancelSaleRequest {
        public Long id;
        public String motivo;
    }
}
