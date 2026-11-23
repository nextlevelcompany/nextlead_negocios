package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/rentabilidad")
public class RentabilidadController {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public RentabilidadController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ==========================================
    // 1. CONFIGURACIÓN GLOBAL & ESCALAS
    // ==========================================

    @GetMapping("/config")
    public ResponseEntity<?> getFullConfig() {
        try {
            // 1. Global config map
            List<Map<String, Object>> globals = jdbcTemplate.queryForList("SELECT * FROM rentabilidad_config_global");
            Map<String, String> configMap = new HashMap<>();
            for (Map<String, Object> row : globals) {
                configMap.put((String) row.get("clave"), (String) row.get("valor"));
            }

            // 2. Profiles with scales
            List<Map<String, Object>> perfiles = jdbcTemplate.queryForList(
                "SELECT * FROM rentabilidad_perfiles ORDER BY orden ASC, id ASC"
            );
            for (Map<String, Object> p : perfiles) {
                Integer perfilId = ((Number) p.get("id")).intValue();
                List<Map<String, Object>> escalas = jdbcTemplate.queryForList(
                    "SELECT * FROM rentabilidad_escalas_comisiones WHERE perfil_id = ? ORDER BY ventas_minimas ASC",
                    perfilId
                );
                p.put("escalas", escalas);
            }

            // 3. Dealer parameters
            List<Map<String, Object>> dealerParams = jdbcTemplate.queryForList(
                "SELECT * FROM rentabilidad_dealer_parametros ORDER BY ventas_minimas ASC"
            );

            return ResponseEntity.ok(Map.of(
                "configGlobal", configMap,
                "perfiles", perfiles,
                "dealerParametros", dealerParams
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al cargar configuración de rentabilidad: " + e.getMessage()));
        }
    }

    @PostMapping("/config/global")
    @Transactional
    public ResponseEntity<?> updateGlobalConfig(@RequestBody Map<String, String> updates) {
        try {
            for (Map.Entry<String, String> entry : updates.entrySet()) {
                jdbcTemplate.update(
                    "INSERT INTO rentabilidad_config_global (clave, valor) VALUES (?, ?) " +
                    "ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = CURRENT_TIMESTAMP",
                    entry.getKey(), entry.getValue()
                );
            }
            return ResponseEntity.ok(Map.of("message", "Parámetros globales actualizados con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar configuración global: " + e.getMessage()));
        }
    }

    @PostMapping("/perfiles/save")
    @Transactional
    public ResponseEntity<?> savePerfil(@RequestBody Map<String, Object> req) {
        try {
            Integer id = req.get("id") != null ? ((Number) req.get("id")).intValue() : null;
            String nombre = (String) req.get("nombre");
            Double sueldoBase = req.get("sueldo_base") != null ? ((Number) req.get("sueldo_base")).doubleValue() : 0.0;
            Double gastosAdic = req.get("gastos_adicionales_defecto") != null ? ((Number) req.get("gastos_adicionales_defecto")).doubleValue() : 0.0;
            String descripcion = (String) req.get("descripcion");
            Boolean activo = req.get("activo") != null ? (Boolean) req.get("activo") : true;
            Integer orden = req.get("orden") != null ? ((Number) req.get("orden")).intValue() : 0;

            if (nombre == null || nombre.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre del perfil es obligatorio."));
            }

            if (id != null) {
                jdbcTemplate.update(
                    "UPDATE rentabilidad_perfiles SET nombre = ?, sueldo_base = ?, gastos_adicionales_defecto = ?, " +
                    "descripcion = ?, activo = ?, orden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    nombre.trim(), sueldoBase, gastosAdic, descripcion, activo, orden, id
                );
                return ResponseEntity.ok(Map.of("message", "Perfil actualizado con éxito.", "id", id));
            } else {
                jdbcTemplate.update(
                    "INSERT INTO rentabilidad_perfiles (nombre, sueldo_base, gastos_adicionales_defecto, descripcion, activo, orden) " +
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    nombre.trim(), sueldoBase, gastosAdic, descripcion, activo, orden
                );
                Integer newId = jdbcTemplate.queryForObject("SELECT lastval()", Integer.class);
                return ResponseEntity.ok(Map.of("message", "Perfil creado con éxito.", "id", newId));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar perfil: " + e.getMessage()));
        }
    }

    @PostMapping("/escalas/save")
    @Transactional
    public ResponseEntity<?> saveEscalas(@RequestBody List<Map<String, Object>> escalas) {
        try {
            for (Map<String, Object> esc : escalas) {
                Integer id = esc.get("id") != null ? ((Number) esc.get("id")).intValue() : null;
                Integer perfilId = ((Number) esc.get("perfil_id")).intValue();
                String rangoNombre = (String) esc.get("rango_nombre");
                Integer ventasMin = ((Number) esc.get("ventas_minimas")).intValue();
                Integer ventasMax = esc.get("ventas_maximas") != null ? ((Number) esc.get("ventas_maximas")).intValue() : 9999;
                Double factor = esc.get("factor_comision") != null ? ((Number) esc.get("factor_comision")).doubleValue() : 0.0;
                Double bono = esc.get("bono_fijo") != null ? ((Number) esc.get("bono_fijo")).doubleValue() : 0.0;

                if (id != null) {
                    jdbcTemplate.update(
                        "UPDATE rentabilidad_escalas_comisiones SET rango_nombre = ?, ventas_minimas = ?, " +
                        "ventas_maximas = ?, factor_comision = ?, bono_fijo = ? WHERE id = ?",
                        rangoNombre, ventasMin, ventasMax, factor, bono, id
                    );
                } else {
                    jdbcTemplate.update(
                        "INSERT INTO rentabilidad_escalas_comisiones (perfil_id, rango_nombre, ventas_minimas, ventas_maximas, factor_comision, bono_fijo) " +
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        perfilId, rangoNombre, ventasMin, ventasMax, factor, bono
                    );
                }
            }
            return ResponseEntity.ok(Map.of("message", "Escalas comisionales actualizadas con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar escalas: " + e.getMessage()));
        }
    }

    @PostMapping("/dealer-parametros/save")
    @Transactional
    public ResponseEntity<?> saveDealerParametros(@RequestBody List<Map<String, Object>> params) {
        try {
            for (Map<String, Object> p : params) {
                Integer id = p.get("id") != null ? ((Number) p.get("id")).intValue() : null;
                Integer ventasMin = ((Number) p.get("ventas_minimas")).intValue();
                Double factor = ((Number) p.get("factor_dealer")).doubleValue();
                Double bonoUnit = ((Number) p.get("bono_unitario")).doubleValue();

                if (id != null) {
                    jdbcTemplate.update(
                        "UPDATE rentabilidad_dealer_parametros SET ventas_minimas = ?, factor_dealer = ?, bono_unitario = ? WHERE id = ?",
                        ventasMin, factor, bonoUnit, id
                    );
                } else {
                    jdbcTemplate.update(
                        "INSERT INTO rentabilidad_dealer_parametros (ventas_minimas, factor_dealer, bono_unitario) VALUES (?, ?, ?)",
                        ventasMin, factor, bonoUnit
                    );
                }
            }
            return ResponseEntity.ok(Map.of("message", "Parámetros del Dealer actualizados con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al actualizar parámetros del Dealer: " + e.getMessage()));
        }
    }

    @DeleteMapping("/escalas/{id}")
    @Transactional
    public ResponseEntity<?> deleteEscala(@PathVariable Integer id) {
        try {
            int rows = jdbcTemplate.update("DELETE FROM rentabilidad_escalas_comisiones WHERE id = ?", id);
            if (rows > 0) {
                return ResponseEntity.ok(Map.of("message", "Rango comisional eliminado con éxito."));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar escala: " + e.getMessage()));
        }
    }

    @DeleteMapping("/dealer-parametros/{id}")
    @Transactional
    public ResponseEntity<?> deleteDealerParametro(@PathVariable Integer id) {
        try {
            int rows = jdbcTemplate.update("DELETE FROM rentabilidad_dealer_parametros WHERE id = ?", id);
            if (rows > 0) {
                return ResponseEntity.ok(Map.of("message", "Parámetro de Dealer eliminado con éxito."));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar parámetro de Dealer: " + e.getMessage()));
        }
    }

    @DeleteMapping("/perfiles/{id}")
    @Transactional
    public ResponseEntity<?> deletePerfil(@PathVariable Integer id) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM rentabilidad_personal WHERE perfil_id = ?",
                Integer.class, id
            );
            if (count != null && count > 0) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "No se puede eliminar este perfil porque tiene " + count + " colaborador(es) asignado(s). Reasigne al personal primero."
                ));
            }
            jdbcTemplate.update("DELETE FROM rentabilidad_escalas_comisiones WHERE perfil_id = ?", id);
            int rows = jdbcTemplate.update("DELETE FROM rentabilidad_perfiles WHERE id = ?", id);
            if (rows > 0) {
                return ResponseEntity.ok(Map.of("message", "Perfil y sus escalas eliminados con éxito."));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar perfil: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. GESTIÓN DE PERSONAL
    // ==========================================

    @GetMapping("/personal")
    public ResponseEntity<?> getPersonal() {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT " +
                "  t.id, " +
                "  t.id as trabajador_id, " +
                "  TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as nombre_completo, " +
                "  t.dni as documento_identidad, " +
                "  COALESCE(t.sueldo_base, r.sueldo_base, 0) as sueldo_base, " +
                "  COALESCE(t.gastos_adicionales, r.gastos_adicionales_defecto, 50.0) as gastos_adicionales, " +
                "  t.telefono, " +
                "  t.usuario_id, " +
                "  t.estado, " +
                "  t.perfil_comision_id as perfil_id, " +
                "  r.nombre as perfil_nombre, " +
                "  r.sueldo_base as perfil_sueldo_defecto " +
                "FROM trabajadores t " +
                "JOIN rentabilidad_perfiles r ON t.perfil_comision_id = r.id " +
                "WHERE t.estado = 'Activo' " +
                "ORDER BY r.orden ASC, t.nombre ASC"
            );
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al listar personal: " + e.getMessage()));
        }
    }

    @PostMapping("/personal/save")
    @Transactional
    public ResponseEntity<?> savePersonal(@RequestBody Map<String, Object> req) {
        try {
            Integer id = req.get("id") != null ? ((Number) req.get("id")).intValue() : null;
            Integer perfilId = ((Number) req.get("perfil_id")).intValue();
            String nombreCompleto = (String) req.get("nombre_completo");
            String dni = (String) req.get("documento_identidad");
            Double sueldo = req.get("sueldo_base") != null ? ((Number) req.get("sueldo_base")).doubleValue() : 0.0;
            Double gastos = req.get("gastos_adicionales") != null ? ((Number) req.get("gastos_adicionales")).doubleValue() : 0.0;
            String telefono = (String) req.get("telefono");
            String estado = req.get("estado") != null ? (String) req.get("estado") : "Activo";

            if (nombreCompleto == null || nombreCompleto.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El nombre completo es obligatorio."));
            }

            String[] parts = nombreCompleto.trim().split("\\s+", 2);
            String nombre = parts[0];
            String apellido = parts.length > 1 ? parts[1] : "";

            if (id != null) {
                jdbcTemplate.update(
                    "UPDATE trabajadores SET nombre = ?, apellido = ?, dni = ?, sueldo_base = ?, " +
                    "gastos_adicionales = ?, telefono = ?, estado = ?, perfil_comision_id = ?, paga_comision = true WHERE id = ?",
                    nombre, apellido, dni, sueldo, gastos, telefono, estado, perfilId, id
                );
                return ResponseEntity.ok(Map.of("message", "Personal actualizado con éxito en Personal."));
            } else {
                jdbcTemplate.update(
                    "INSERT INTO trabajadores (nombre, apellido, dni, telefono, sueldo_base, gastos_adicionales, " +
                    "estado, perfil_comision_id, paga_comision, frecuencia_pago, tiene_hijos, paga_ley, regimen_pension, rol_operativo) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, 'Mensual', false, true, 'ONP', 'Comercial')",
                    nombre, apellido, dni, telefono, sueldo, gastos, estado, perfilId
                );
                return ResponseEntity.ok(Map.of("message", "Personal registrado con éxito en Personal."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar personal: " + e.getMessage()));
        }
    }

    @DeleteMapping("/personal/{id}")
    @Transactional
    public ResponseEntity<?> deletePersonal(@PathVariable Integer id) {
        try {
            int rows = jdbcTemplate.update("UPDATE trabajadores SET perfil_comision_id = NULL, paga_comision = false WHERE id = ?", id);
            if (rows == 0) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(Map.of("message", "Personal retirado de la planilla comercial con éxito."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "No se puede retirar personal: " + e.getMessage()));
        }
    }

    // ==========================================
    // 3. RENTABILIDAD ACTUAL (CÁLCULO REAL)
    // ==========================================

    @GetMapping("/actual")
    public ResponseEntity<?> getRentabilidadActual(
        @RequestParam(required = false) Integer mes,
        @RequestParam(required = false) Integer anio
    ) {
        try {
            LocalDate now = LocalDate.now();
            int currentMes = (mes != null && mes >= 1 && mes <= 12) ? mes : now.getMonthValue();
            int currentAnio = (anio != null && anio >= 2020) ? anio : now.getYear();

            // Load global configs
            Map<String, String> config = loadGlobalConfigMap();
            double arpu = Double.parseDouble(config.getOrDefault("arpu_promedio", "168.64"));
            int divisorBonos = Integer.parseInt(config.getOrDefault("divisor_bonos", "4"));
            double bonoSup15 = Double.parseDouble(config.getOrDefault("bono_supervisor_matriz_15", "1500.00"));
            double bonoSup20 = Double.parseDouble(config.getOrDefault("bono_supervisor_matriz_20", "3000.00"));
            // Real registered expenses from gastos table for current month (Rentabilidad Actual toma 100% gastos reales)
            Double gastosRealesCRM = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(monto_total), 0) FROM gastos " +
                "WHERE EXTRACT(MONTH FROM fecha_gasto) = ? AND EXTRACT(YEAR FROM fecha_gasto) = ?",
                Double.class, currentMes, currentAnio
            );
            double gastosFijosOficina = (gastosRealesCRM != null) ? gastosRealesCRM : 0.0;

            List<Map<String, Object>> listaGastosReales = jdbcTemplate.queryForList(
                "SELECT id, descripcion, monto_total, fecha_gasto, tipo_comprobante, numero_comprobante FROM gastos " +
                "WHERE EXTRACT(MONTH FROM fecha_gasto) = ? AND EXTRACT(YEAR FROM fecha_gasto) = ? ORDER BY fecha_gasto DESC",
                currentMes, currentAnio
            );

            // 1. Real installed sales (Altas efectivas de telecomunicaciones)
            Integer totalAltasInstaladas = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ventas " +
                "WHERE EXTRACT(MONTH FROM COALESCE(fecha_instalacion, fecha_venta)) = ? " +
                "  AND EXTRACT(YEAR FROM COALESCE(fecha_instalacion, fecha_venta)) = ? " +
                "  AND (LOWER(estado_instalacion) IN ('completada', 'instalada') OR fecha_instalacion IS NOT NULL)",
                Integer.class, currentMes, currentAnio
            );
            if (totalAltasInstaladas == null) totalAltasInstaladas = 0;

            // 2. Real sales pending installation (en trámite técnico)
            Integer totalVentasPendientesInstalacion = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ventas " +
                "WHERE EXTRACT(MONTH FROM fecha_venta) = ? AND EXTRACT(YEAR FROM fecha_venta) = ? " +
                "  AND (estado_instalacion IS NULL OR LOWER(estado_instalacion) = 'pendiente') " +
                "  AND fecha_instalacion IS NULL " +
                "  AND estado IN ('completada', 'en_proceso', 'pendiente')",
                Integer.class, currentMes, currentAnio
            );
            if (totalVentasPendientesInstalacion == null) totalVentasPendientesInstalacion = 0;

            // Calculate real average ARPU from installed sales if available
            Double avgArpuReal = jdbcTemplate.queryForObject(
                "SELECT AVG(total / 1.18) FROM ventas " +
                "WHERE EXTRACT(MONTH FROM COALESCE(fecha_instalacion, fecha_venta)) = ? " +
                "  AND EXTRACT(YEAR FROM COALESCE(fecha_instalacion, fecha_venta)) = ? " +
                "  AND (LOWER(estado_instalacion) IN ('completada', 'instalada') OR fecha_instalacion IS NOT NULL) " +
                "  AND total > 0",
                Double.class, currentMes, currentAnio
            );
            if (avgArpuReal != null && avgArpuReal > 0) {
                arpu = round2(avgArpuReal);
            }

            // Load active personnel directly from trabajadores
            List<Map<String, Object>> personalList = jdbcTemplate.queryForList(
                "SELECT " +
                "  t.id, " +
                "  t.id as trabajador_id, " +
                "  TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) as nombre_completo, " +
                "  t.dni as documento_identidad, " +
                "  COALESCE(t.sueldo_base, r.sueldo_base, 0) as sueldo_base, " +
                "  COALESCE(t.gastos_adicionales, r.gastos_adicionales_defecto, 50.0) as gastos_adicionales, " +
                "  t.telefono, " +
                "  t.usuario_id, " +
                "  t.estado, " +
                "  COALESCE(t.perfil_comision_id, 1) as perfil_id, " +
                "  COALESCE(r.nombre, 'Full Time') as perfil_nombre, " +
                "  COALESCE(r.orden, 1) as perfil_orden " +
                "FROM trabajadores t " +
                "LEFT JOIN rentabilidad_perfiles r ON t.perfil_comision_id = r.id " +
                "WHERE t.estado = 'Activo' " +
                "ORDER BY COALESCE(r.orden, 1) ASC, t.id ASC"
            );

            // Fetch real installed sales count per worker from ventas table
            List<Map<String, Object>> userSales = jdbcTemplate.queryForList(
                "SELECT COALESCE(v.trabajador_id, t.id, v.usuario_id) as personal_id, COUNT(*) as altas FROM ventas v " +
                "LEFT JOIN trabajadores t ON v.usuario_id = t.usuario_id " +
                "WHERE EXTRACT(MONTH FROM COALESCE(v.fecha_instalacion, v.fecha_venta)) = ? " +
                "  AND EXTRACT(YEAR FROM COALESCE(v.fecha_instalacion, v.fecha_venta)) = ? " +
                "  AND (LOWER(v.estado_instalacion) IN ('completada', 'instalada') OR v.fecha_instalacion IS NOT NULL) " +
                "GROUP BY COALESCE(v.trabajador_id, t.id, v.usuario_id)",
                currentMes, currentAnio
            );
            Map<Integer, Integer> salesByPersonal = new HashMap<>();
            for (Map<String, Object> r : userSales) {
                if (r.get("personal_id") != null) {
                    salesByPersonal.put(((Number) r.get("personal_id")).intValue(), ((Number) r.get("altas")).intValue());
                }
            }

            // Distribute real sales among active personal or use their actual assigned sales
            int totalAltasVendedores = 0;
            List<Map<String, Object>> personalCalculado = new ArrayList<>();

            // 1. First pass: advisors (non-supervisors)
            for (Map<String, Object> p : personalList) {
                String perfil = (String) p.get("perfil_nombre");
                if ("Supervisor".equalsIgnoreCase(perfil)) continue;

                int personalId = ((Number) p.get("id")).intValue();
                int perfilId = ((Number) p.get("perfil_id")).intValue();
                double sueldoBase = ((Number) p.get("sueldo_base")).doubleValue();
                double gastosAdic = ((Number) p.get("gastos_adicionales")).doubleValue();

                // Determine sales for this person
                Integer userAltas = null;
                if (p.get("trabajador_id") != null) {
                    userAltas = salesByPersonal.get(((Number) p.get("trabajador_id")).intValue());
                }
                if (userAltas == null && p.get("usuario_id") != null) {
                    userAltas = salesByPersonal.get(((Number) p.get("usuario_id")).intValue());
                }
                int altas = userAltas != null ? userAltas : 0;

                // Fallback: If system has real sales without individual user_id mapping, distribute among advisors
                if (altas == 0 && totalAltasInstaladas > 0 && salesByPersonal.isEmpty()) {
                    long numAdvisors = personalList.stream().filter(x -> !"Supervisor".equalsIgnoreCase((String) x.get("perfil_nombre"))).count();
                    altas = (int) Math.round((double) totalAltasInstaladas / Math.max(1, numAdvisors));
                }

                totalAltasVendedores += altas;

                // Calculate commission & bonus from scale
                EscalaMatch match = findScale(perfilId, altas);
                double comision = altas * arpu * match.factorComision;
                double bono = match.bonoFijo;
                double totalPagar = sueldoBase + comision + bono;

                Map<String, Object> item = new HashMap<>(p);
                item.put("altas", altas);
                item.put("factor_comision", match.factorComision);
                item.put("rango_nombre", match.rangoNombre);
                item.put("comision_generada", round2(comision));
                item.put("bono_individual", round2(bono));
                item.put("total_a_pagar", round2(totalPagar));
                personalCalculado.add(item);
            }

            // Ensure totalAltasVendedores matches totalAltasInstaladas if installed sales exist
            if (totalAltasInstaladas > 0 && totalAltasVendedores == 0) {
                totalAltasVendedores = totalAltasInstaladas;
            }

            // 2. Second pass: supervisors
            for (Map<String, Object> p : personalList) {
                String perfil = (String) p.get("perfil_nombre");
                if (!"Supervisor".equalsIgnoreCase(perfil)) continue;

                int perfilId = ((Number) p.get("perfil_id")).intValue();
                double sueldoBase = ((Number) p.get("sueldo_base")).doubleValue();
                double gastosAdic = ((Number) p.get("gastos_adicionales")).doubleValue();

                // Supervisor commissions on team's total sales
                int altasEquipo = totalAltasVendedores;
                EscalaMatch match = findScale(perfilId, altasEquipo);
                double comision = altasEquipo * arpu * match.factorComision;
                double bono = match.bonoFijo;
                double totalPagar = sueldoBase + comision + bono;

                Map<String, Object> item = new HashMap<>(p);
                item.put("altas", altasEquipo);
                item.put("factor_comision", match.factorComision);
                item.put("rango_nombre", match.rangoNombre);
                item.put("comision_generada", round2(comision));
                item.put("bono_individual", round2(bono));
                item.put("total_a_pagar", round2(totalPagar));
                personalCalculado.add(item);
            }

            // 3. Dealer Gross Revenues (from Matrix ON Negocios)
            DealerTier dealerTier = findDealerTier(totalAltasVendedores);
            double comisionBaseDealer = totalAltasVendedores * dealerTier.factor * arpu;
            int bonosDesbloqueados = divisorBonos > 0 ? (totalAltasVendedores / divisorBonos) : 0;
            double totalBonosDealer = bonosDesbloqueados * dealerTier.bonoUnitario;

            double bonoSupervisorMatriz = 0.0;
            if (totalAltasVendedores >= 20) {
                bonoSupervisorMatriz = bonoSup20;
            } else if (totalAltasVendedores >= 15) {
                bonoSupervisorMatriz = bonoSup15;
            }

            double ingresosTotalesDealer = comisionBaseDealer + totalBonosDealer + bonoSupervisorMatriz;

            // 4. Outflows & Expenses
            double totalPlanillaYComisiones = 0.0;
            double totalGastosPersonal = 0.0;
            double totalSueldosBase = 0.0;
            double totalComisionesPersonal = 0.0;
            double totalBonosPersonal = 0.0;

            for (Map<String, Object> item : personalCalculado) {
                totalPlanillaYComisiones += ((Number) item.get("total_a_pagar")).doubleValue();
                totalGastosPersonal += ((Number) item.get("gastos_adicionales")).doubleValue();
                totalSueldosBase += ((Number) item.get("sueldo_base")).doubleValue();
                totalComisionesPersonal += ((Number) item.get("comision_generada")).doubleValue();
                totalBonosPersonal += ((Number) item.get("bono_individual")).doubleValue();
            }

            double egresosTotales = totalPlanillaYComisiones + totalGastosPersonal + gastosFijosOficina;
            double gananciaNeta = ingresosTotalesDealer - egresosTotales;
            double margenRentabilidad = ingresosTotalesDealer > 0 ? (gananciaNeta / ingresosTotalesDealer) * 100.0 : 0.0;

            // Construct full response
            Map<String, Object> result = new HashMap<>();
            result.put("periodo", Map.of("mes", currentMes, "anio", currentAnio));
            result.put("arpu_aplicado", round2(arpu));

            // Indicadores Generales
            Map<String, Object> kpis = new HashMap<>();
            kpis.put("total_altas", totalAltasVendedores);
            kpis.put("ventas_instaladas", totalAltasInstaladas);
            kpis.put("ventas_pendientes_instalacion", totalVentasPendientesInstalacion);
            kpis.put("total_ventas_periodo", totalAltasInstaladas + totalVentasPendientesInstalacion);
            kpis.put("ingresos_brutos_dealer", round2(ingresosTotalesDealer));
            kpis.put("comision_base_dealer", round2(comisionBaseDealer));
            kpis.put("bonos_obtenidos_dealer", round2(totalBonosDealer));
            kpis.put("bono_supervisor_matriz", round2(bonoSupervisorMatriz));
            kpis.put("total_ingresos", round2(ingresosTotalesDealer));
            kpis.put("total_remuneraciones", round2(totalSueldosBase));
            kpis.put("total_comisiones_personal", round2(totalComisionesPersonal));
            kpis.put("total_bonos_personal", round2(totalBonosPersonal));
            kpis.put("total_gastos_personal", round2(totalGastosPersonal));
            kpis.put("otros_gastos_operativos", round2(gastosFijosOficina));
            kpis.put("total_egresos", round2(egresosTotales));
            kpis.put("ganancia_neta", round2(gananciaNeta));
            kpis.put("margen_rentabilidad", round2(margenRentabilidad));
            result.put("indicadores", kpis);

            // Detalle de Ingresos Dealer
            Map<String, Object> detalleIngresos = new HashMap<>();
            detalleIngresos.put("altas_totales", totalAltasVendedores);
            detalleIngresos.put("ventas_instaladas", totalAltasInstaladas);
            detalleIngresos.put("ventas_pendientes_instalacion", totalVentasPendientesInstalacion);
            detalleIngresos.put("total_ventas_periodo", totalAltasInstaladas + totalVentasPendientesInstalacion);
            detalleIngresos.put("factor_dealer", dealerTier.factor);
            detalleIngresos.put("arpu", round2(arpu));
            detalleIngresos.put("comision_base", round2(comisionBaseDealer));
            detalleIngresos.put("bonos_desbloqueados", bonosDesbloqueados);
            detalleIngresos.put("bono_unitario", round2(dealerTier.bonoUnitario));
            detalleIngresos.put("total_bonos", round2(totalBonosDealer));
            detalleIngresos.put("bono_supervisor_matriz", round2(bonoSupervisorMatriz));
            detalleIngresos.put("ingresos_totales_brutos", round2(ingresosTotalesDealer));
            result.put("detalleIngresos", detalleIngresos);

            // Detalle de Egresos
            Map<String, Object> detalleEgresos = new HashMap<>();
            detalleEgresos.put("sueldos_base", round2(totalSueldosBase));
            detalleEgresos.put("comisiones_personal", round2(totalComisionesPersonal));
            detalleEgresos.put("bonos_individuales", round2(totalBonosPersonal));
            detalleEgresos.put("gastos_adicionales_personal", round2(totalGastosPersonal));
            detalleEgresos.put("otros_gastos_fijos", round2(gastosFijosOficina));
            detalleEgresos.put("lista_gastos_reales", listaGastosReales);
            detalleEgresos.put("total_egresos", round2(egresosTotales));
            result.put("detalleEgresos", detalleEgresos);

            // Personal breakdown
            result.put("personalDetalle", personalCalculado);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al calcular rentabilidad actual: " + e.getMessage()));
        }
    }

    // ==========================================
    // 4. SIMULADOR DE INGRESOS
    // ==========================================

    @PostMapping("/simular")
    public ResponseEntity<?> simularEscenario(@RequestBody Map<String, Object> req) {
        try {
            Map<String, String> config = loadGlobalConfigMap();
            double arpu = req.get("arpu_promedio") != null ? ((Number) req.get("arpu_promedio")).doubleValue() : Double.parseDouble(config.getOrDefault("arpu_promedio", "168.64"));
            double gastosFijosOficina = req.get("gastos_fijos_oficina") != null ? ((Number) req.get("gastos_fijos_oficina")).doubleValue() : Double.parseDouble(config.getOrDefault("gastos_fijos_oficina", "500.00"));
            int divisorBonos = Integer.parseInt(config.getOrDefault("divisor_bonos", "4"));
            double bonoSup15 = Double.parseDouble(config.getOrDefault("bono_supervisor_matriz_15", "1500.00"));
            double bonoSup20 = Double.parseDouble(config.getOrDefault("bono_supervisor_matriz_20", "3000.00"));

            // Groups array from request
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> grupos = (List<Map<String, Object>>) req.get("grupos");
            if (grupos == null) {
                grupos = new ArrayList<>();
            }

            int totalAltasVendedores = 0;
            List<Map<String, Object>> detalleFilas = new ArrayList<>();

            // 1. Process regular sellers first
            for (Map<String, Object> g : grupos) {
                String perfil = (String) g.get("tipo_personal");
                if ("Supervisor".equalsIgnoreCase(perfil)) continue;

                int perfilId = ((Number) g.get("perfil_id")).intValue();
                int cantidad = ((Number) g.get("cantidad")).intValue();
                double sueldoBase = ((Number) g.get("sueldo_base")).doubleValue();
                double gastosAdic = ((Number) g.get("gastos_adicionales")).doubleValue();
                int altasCadaUno = ((Number) g.get("altas_por_persona")).intValue();

                int altasTotalesFila = cantidad * altasCadaUno;
                totalAltasVendedores += altasTotalesFila;

                EscalaMatch match = findScale(perfilId, altasCadaUno);
                double comisionesFila = altasTotalesFila * arpu * match.factorComision;
                double bonosFila = cantidad * match.bonoFijo;
                double pagoPlanillaFila = (cantidad * sueldoBase) + bonosFila + comisionesFila;
                double totalGastosAdicFila = cantidad * gastosAdic;

                Map<String, Object> row = new HashMap<>(g);
                row.put("altas_totales", altasTotalesFila);
                row.put("factor_comision", match.factorComision);
                row.put("bono_unitario", match.bonoFijo);
                row.put("sueldo_base_total", round2(cantidad * sueldoBase));
                row.put("bonos_fila", round2(bonosFila));
                row.put("comisiones_fila", round2(comisionesFila));
                row.put("pago_planilla_fila", round2(pagoPlanillaFila));
                row.put("total_gastos_adic_fila", round2(totalGastosAdicFila));
                row.put("total_costo_fila", round2(pagoPlanillaFila + totalGastosAdicFila));
                detalleFilas.add(row);
            }

            // 2. Process supervisors
            for (Map<String, Object> g : grupos) {
                String perfil = (String) g.get("tipo_personal");
                if (!"Supervisor".equalsIgnoreCase(perfil)) continue;

                int perfilId = ((Number) g.get("perfil_id")).intValue();
                int cantidad = ((Number) g.get("cantidad")).intValue();
                double sueldoBase = ((Number) g.get("sueldo_base")).doubleValue();
                double gastosAdic = ((Number) g.get("gastos_adicionales")).doubleValue();

                // Supervisor comisiona sobre el total de ventas del equipo
                int altasParaSupervisor = totalAltasVendedores;
                EscalaMatch match = findScale(perfilId, altasParaSupervisor);

                double comisionesFila = altasParaSupervisor * arpu * match.factorComision;
                double bonosFila = cantidad * match.bonoFijo;
                double pagoPlanillaFila = (cantidad * sueldoBase) + bonosFila + comisionesFila;
                double totalGastosAdicFila = cantidad * gastosAdic;

                Map<String, Object> row = new HashMap<>(g);
                row.put("altas_por_persona", altasParaSupervisor);
                row.put("altas_totales", altasParaSupervisor);
                row.put("factor_comision", match.factorComision);
                row.put("bono_unitario", match.bonoFijo);
                row.put("sueldo_base_total", round2(cantidad * sueldoBase));
                row.put("bonos_fila", round2(bonosFila));
                row.put("comisiones_fila", round2(comisionesFila));
                row.put("pago_planilla_fila", round2(pagoPlanillaFila));
                row.put("total_gastos_adic_fila", round2(totalGastosAdicFila));
                row.put("total_costo_fila", round2(pagoPlanillaFila + totalGastosAdicFila));
                detalleFilas.add(row);
            }

            // 3. Dealer Gross Revenues
            DealerTier dealerTier = findDealerTier(totalAltasVendedores);
            double comisionBaseDealer = totalAltasVendedores * dealerTier.factor * arpu;
            int bonosDesbloqueados = divisorBonos > 0 ? (totalAltasVendedores / divisorBonos) : 0;
            double totalBonosDealer = bonosDesbloqueados * dealerTier.bonoUnitario;

            double bonoSupervisorMatriz = 0.0;
            if (totalAltasVendedores >= 20) {
                bonoSupervisorMatriz = bonoSup20;
            } else if (totalAltasVendedores >= 15) {
                bonoSupervisorMatriz = bonoSup15;
            }

            double ingresosTotalesDealer = comisionBaseDealer + totalBonosDealer + bonoSupervisorMatriz;

            // 4. Outflows
            double totalPlanillaYComisiones = 0.0;
            double totalGastosPersonal = 0.0;
            for (Map<String, Object> r : detalleFilas) {
                totalPlanillaYComisiones += ((Number) r.get("pago_planilla_fila")).doubleValue();
                totalGastosPersonal += ((Number) r.get("total_gastos_adic_fila")).doubleValue();
            }

            double egresosTotales = totalPlanillaYComisiones + totalGastosPersonal + gastosFijosOficina;
            double gananciaNeta = ingresosTotalesDealer - egresosTotales;
            double margenRentabilidad = ingresosTotalesDealer > 0 ? (gananciaNeta / ingresosTotalesDealer) * 100.0 : 0.0;

            Map<String, Object> simResult = new HashMap<>();
            simResult.put("arpu", round2(arpu));
            simResult.put("total_altas", totalAltasVendedores);
            simResult.put("factor_dealer", dealerTier.factor);
            simResult.put("comision_base_dealer", round2(comisionBaseDealer));
            simResult.put("bonos_desbloqueados", bonosDesbloqueados);
            simResult.put("bono_unitario_dealer", round2(dealerTier.bonoUnitario));
            simResult.put("total_bonos_dealer", round2(totalBonosDealer));
            simResult.put("bono_supervisor_matriz", round2(bonoSupervisorMatriz));
            simResult.put("ingresos_totales_brutos", round2(ingresosTotalesDealer));
            simResult.put("total_planilla_comisiones", round2(totalPlanillaYComisiones));
            simResult.put("total_gastos_personal", round2(totalGastosPersonal));
            simResult.put("gastos_fijos_oficina", round2(gastosFijosOficina));
            simResult.put("egresos_totales", round2(egresosTotales));
            simResult.put("ganancia_neta", round2(gananciaNeta));
            simResult.put("margen_rentabilidad", round2(margenRentabilidad));
            simResult.put("grupos_detalle", detalleFilas);

            return ResponseEntity.ok(simResult);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error en simulación: " + e.getMessage()));
        }
    }

    @GetMapping("/simulaciones")
    public ResponseEntity<?> getSimulacionesGuardadas() {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT * FROM rentabilidad_simulaciones ORDER BY created_at DESC"
            );
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al listar simulaciones: " + e.getMessage()));
        }
    }

    @PostMapping("/simulaciones/save")
    @Transactional
    public ResponseEntity<?> saveSimulacion(@RequestBody Map<String, Object> req) {
        try {
            String nombre = (String) req.get("nombre_escenario");
            String tipo = req.get("tipo_escenario") != null ? (String) req.get("tipo_escenario") : "NORMAL";
            Double arpu = ((Number) req.get("arpu_promedio")).doubleValue();
            Double gastosFijos = ((Number) req.get("gastos_fijos_oficina")).doubleValue();
            Integer totalAltas = ((Number) req.get("total_altas")).intValue();
            Double factorDealer = ((Number) req.get("factor_dealer")).doubleValue();
            Double comisionBase = ((Number) req.get("comision_base_dealer")).doubleValue();
            Integer bonosCount = ((Number) req.get("cantidad_bonos")).intValue();
            Double bonosTotal = ((Number) req.get("bonos_dealer_total")).doubleValue();
            Double bonoSup = ((Number) req.get("bono_supervisor_matriz")).doubleValue();
            Double ingresosTotales = ((Number) req.get("ingresos_totales_brutos")).doubleValue();
            Double planilla = ((Number) req.get("total_planilla_comisiones")).doubleValue();
            Double gastosPersonal = ((Number) req.get("total_gastos_personal")).doubleValue();
            Double egresosTotales = ((Number) req.get("egresos_totales")).doubleValue();
            Double gananciaNeta = ((Number) req.get("ganancia_neta")).doubleValue();
            Double margen = ((Number) req.get("margen_rentabilidad")).doubleValue();

            String paramsJson = "{}";
            if (req.get("parametros_json") != null) {
                paramsJson = req.get("parametros_json").toString();
            }

            jdbcTemplate.update(
                "INSERT INTO rentabilidad_simulaciones (nombre_escenario, tipo_escenario, arpu_promedio, gastos_fijos_oficina, " +
                "total_altas, factor_dealer, comision_base_dealer, cantidad_bonos, bonos_dealer_total, bono_supervisor_matriz, " +
                "ingresos_totales_brutos, total_planilla_comisiones, total_gastos_personal, egresos_totales, ganancia_neta, " +
                "margen_rentabilidad, parametros_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)",
                nombre, tipo, arpu, gastosFijos, totalAltas, factorDealer, comisionBase, bonosCount, bonosTotal, bonoSup,
                ingresosTotales, planilla, gastosPersonal, egresosTotales, gananciaNeta, margen, paramsJson
            );

            return ResponseEntity.ok(Map.of("message", "Simulación guardada exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al guardar simulación: " + e.getMessage()));
        }
    }

    @DeleteMapping("/simulaciones/{id}")
    @Transactional
    public ResponseEntity<?> deleteSimulacion(@PathVariable Integer id) {
        try {
            jdbcTemplate.update("DELETE FROM rentabilidad_simulaciones WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("message", "Simulación eliminada."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar simulación: " + e.getMessage()));
        }
    }

    // ==========================================
    // 5. LIQUIDACIONES & PAGOS
    // ==========================================

    @GetMapping("/liquidaciones")
    public ResponseEntity<?> getLiquidaciones() {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(
                "SELECT * FROM rentabilidad_liquidaciones ORDER BY periodo_anio DESC, periodo_mes DESC, id DESC"
            );
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al listar liquidaciones: " + e.getMessage()));
        }
    }

    @GetMapping("/liquidaciones/{id}")
    public ResponseEntity<?> getLiquidacionDetalle(@PathVariable Integer id) {
        try {
            List<Map<String, Object>> liqList = jdbcTemplate.queryForList("SELECT * FROM rentabilidad_liquidaciones WHERE id = ?", id);
            if (liqList.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Map<String, Object> liq = liqList.get(0);

            List<Map<String, Object>> detalles = jdbcTemplate.queryForList(
                "SELECT * FROM rentabilidad_liquidaciones_detalle WHERE liquidacion_id = ? ORDER BY id ASC",
                id
            );

            return ResponseEntity.ok(Map.of("liquidacion", liq, "detalles", detalles));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al cargar detalle de liquidación: " + e.getMessage()));
        }
    }

    @PostMapping("/liquidaciones/generar")
    @Transactional
    public ResponseEntity<?> generarLiquidacion(@RequestBody Map<String, Object> req) {
        try {
            int mes = ((Number) req.get("mes")).intValue();
            int anio = ((Number) req.get("anio")).intValue();
            String notas = (String) req.get("notas");

            // Check if already exists
            Integer existingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM rentabilidad_liquidaciones WHERE periodo_mes = ? AND periodo_anio = ? AND estado != 'Anulado'",
                Integer.class, mes, anio
            );
            if (existingCount != null && existingCount > 0) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Ya existe una liquidación activa para el periodo " + mes + "/" + anio + ". Anúlela primero si desea regenerarla."
                ));
            }

            // Calculate actual rentabilidad data
            ResponseEntity<?> actualRes = getRentabilidadActual(mes, anio);
            if (!actualRes.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.badRequest().body(Map.of("message", "No se pudo calcular la rentabilidad para el periodo."));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) actualRes.getBody();
            if (data == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Sin datos calculados."));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> kpis = (Map<String, Object>) data.get("indicadores");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> personalDetalle = (List<Map<String, Object>>) data.get("personalDetalle");

            String codigo = String.format("LIQ-%d-%02d-%03d", anio, mes, (int) (System.currentTimeMillis() % 1000));
            double arpu = ((Number) data.get("arpu_aplicado")).doubleValue();
            int totalAltas = ((Number) kpis.get("total_altas")).intValue();
            double totalIngresos = ((Number) kpis.get("ingresos_brutos_dealer")).doubleValue();
            double totalPagos = ((Number) kpis.get("total_remuneraciones")).doubleValue() + ((Number) kpis.get("total_comisiones_personal")).doubleValue() + ((Number) kpis.get("total_bonos_personal")).doubleValue();
            double totalGastos = ((Number) kpis.get("total_gastos_personal")).doubleValue() + ((Number) kpis.get("otros_gastos_operativos")).doubleValue();
            double gananciaNeta = ((Number) kpis.get("ganancia_neta")).doubleValue();
            double margen = ((Number) kpis.get("margen_rentabilidad")).doubleValue();

            // Insert liquidacion header
            jdbcTemplate.update(
                "INSERT INTO rentabilidad_liquidaciones (codigo_liquidacion, periodo_mes, periodo_anio, arpu_aplicado, " +
                "total_altas_periodo, total_ingresos_dealer, total_pagos_personal, total_gastos_operativos, " +
                "ganancia_neta_dealer, margen_rentabilidad, estado, notas) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)",
                codigo, mes, anio, arpu, totalAltas, totalIngresos, totalPagos, totalGastos, gananciaNeta, margen, notas
            );
            Integer liqId = jdbcTemplate.queryForObject("SELECT lastval()", Integer.class);

            // Insert details per person
            for (Map<String, Object> p : personalDetalle) {
                Integer personalId = ((Number) p.get("id")).intValue();
                String nombre = (String) p.get("nombre_completo");
                String perfil = (String) p.get("perfil_nombre");
                int altas = ((Number) p.get("altas")).intValue();
                double factor = ((Number) p.get("factor_comision")).doubleValue();
                double comision = ((Number) p.get("comision_generada")).doubleValue();
                double bono = ((Number) p.get("bono_individual")).doubleValue();
                double sueldo = ((Number) p.get("sueldo_base")).doubleValue();
                double gastos = ((Number) p.get("gastos_adicionales")).doubleValue();
                double totalPagar = ((Number) p.get("total_a_pagar")).doubleValue();

                jdbcTemplate.update(
                    "INSERT INTO rentabilidad_liquidaciones_detalle (liquidacion_id, personal_id, trabajador_nombre, perfil_nombre, " +
                    "altas_individuales, factor_comision_aplicado, comision_generada, bono_individual, sueldo_base, gastos_adicionales, " +
                    "total_a_pagar, estado_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')",
                    liqId, personalId, nombre, perfil, altas, factor, comision, bono, sueldo, gastos, totalPagar
                );
            }

            return ResponseEntity.ok(Map.of(
                "message", "Liquidación generada con éxito.",
                "id", liqId,
                "codigo", codigo
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al generar liquidación: " + e.getMessage()));
        }
    }

    @PostMapping("/liquidaciones/aprobar/{id}")
    @Transactional
    public ResponseEntity<?> aprobarLiquidacion(@PathVariable Integer id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String aprobadoPor = body != null ? body.getOrDefault("aprobado_por", "Administrador") : "Administrador";
            int rows = jdbcTemplate.update(
                "UPDATE rentabilidad_liquidaciones SET estado = 'Aprobado', aprobado_por = ?, fecha_aprobacion = CURRENT_TIMESTAMP WHERE id = ?",
                aprobadoPor, id
            );
            if (rows == 0) return ResponseEntity.notFound().build();

            jdbcTemplate.update(
                "UPDATE rentabilidad_liquidaciones_detalle SET estado_pago = 'Aprobado' WHERE liquidacion_id = ?", id
            );

            return ResponseEntity.ok(Map.of("message", "Liquidación aprobada formalmente. Valores congelados."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al aprobar liquidación: " + e.getMessage()));
        }
    }

    @PostMapping("/liquidaciones/pagar/{id}")
    @Transactional
    public ResponseEntity<?> pagarLiquidacion(@PathVariable Integer id, @RequestBody(required = false) Map<String, String> body) {
        try {
            String metodoPago = body != null ? body.getOrDefault("metodo_pago", "Transferencia") : "Transferencia";

            List<Map<String, Object>> liqList = jdbcTemplate.queryForList("SELECT * FROM rentabilidad_liquidaciones WHERE id = ?", id);
            if (liqList.isEmpty()) return ResponseEntity.notFound().build();
            Map<String, Object> liq = liqList.get(0);

            if ("Pagado".equals(liq.get("estado"))) {
                return ResponseEntity.badRequest().body(Map.of("message", "Esta liquidación ya fue pagada."));
            }

            double totalPagar = ((Number) liq.get("total_pagos_personal")).doubleValue();
            String codigo = (String) liq.get("codigo_liquidacion");

            // Register Cash Outflow in caja_movimientos
            Integer defaultUserId = 1;
            try {
                defaultUserId = jdbcTemplate.queryForObject("SELECT id FROM users LIMIT 1", Integer.class);
            } catch (Exception ignored) {}

            jdbcTemplate.update(
                "INSERT INTO caja_movimientos (tipo, categoria, monto, metodo_pago, referencia_id, tabla_referencia, " +
                "notas, usuario_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                "Egreso", "Comisiones", totalPagar, metodoPago, id, "rentabilidad_liquidaciones",
                "Pago Planilla y Comisiones Dealer: " + codigo, defaultUserId
            );

            // Update status
            jdbcTemplate.update(
                "UPDATE rentabilidad_liquidaciones SET estado = 'Pagado' WHERE id = ?", id
            );
            jdbcTemplate.update(
                "UPDATE rentabilidad_liquidaciones_detalle SET estado_pago = 'Pagado', fecha_pago = CURRENT_TIMESTAMP WHERE liquidacion_id = ?", id
            );

            return ResponseEntity.ok(Map.of("message", "Liquidación pagada con éxito. Egreso de tesorería registrado."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al pagar liquidación: " + e.getMessage()));
        }
    }

    @DeleteMapping("/liquidaciones/{id}")
    @Transactional
    public ResponseEntity<?> eliminarLiquidacion(@PathVariable Integer id) {
        try {
            List<Map<String, Object>> liqList = jdbcTemplate.queryForList("SELECT * FROM rentabilidad_liquidaciones WHERE id = ?", id);
            if (liqList.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Map<String, Object> liq = liqList.get(0);
            String estado = (String) liq.get("estado");

            // Si estaba pagada, revertir/eliminar movimiento de caja asociado
            if ("Pagado".equalsIgnoreCase(estado)) {
                jdbcTemplate.update("DELETE FROM caja_movimientos WHERE tabla_referencia = 'rentabilidad_liquidaciones' AND referencia_id = ?", id);
            }

            // Eliminar detalles (aunque tenga ON DELETE CASCADE, aseguramos eliminación)
            jdbcTemplate.update("DELETE FROM rentabilidad_liquidaciones_detalle WHERE liquidacion_id = ?", id);

            // Eliminar cabecera
            int rows = jdbcTemplate.update("DELETE FROM rentabilidad_liquidaciones WHERE id = ?", id);

            return ResponseEntity.ok(Map.of(
                "message", "Liquidación " + liq.get("codigo_liquidacion") + " eliminada correctamente.",
                "id", id
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error al eliminar liquidación: " + e.getMessage()));
        }
    }

    // ==========================================
    // HELPER METHODS & DATA STRUCTURES
    // ==========================================

    private Map<String, String> loadGlobalConfigMap() {
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM rentabilidad_config_global");
        Map<String, String> map = new HashMap<>();
        for (Map<String, Object> row : list) {
            map.put((String) row.get("clave"), (String) row.get("valor"));
        }
        return map;
    }

    private EscalaMatch findScale(int perfilId, int ventas) {
        List<Map<String, Object>> escalas = jdbcTemplate.queryForList(
            "SELECT * FROM rentabilidad_escalas_comisiones " +
            "WHERE perfil_id = ? AND ventas_minimas <= ? " +
            "ORDER BY ventas_minimas DESC LIMIT 1",
            perfilId, ventas
        );
        if (!escalas.isEmpty()) {
            Map<String, Object> r = escalas.get(0);
            return new EscalaMatch(
                (String) r.get("rango_nombre"),
                ((Number) r.get("factor_comision")).doubleValue(),
                ((Number) r.get("bono_fijo")).doubleValue()
            );
        }
        return new EscalaMatch("Sin escala", 0.0, 0.0);
    }

    private DealerTier findDealerTier(int ventas) {
        List<Map<String, Object>> tiers = jdbcTemplate.queryForList(
            "SELECT * FROM rentabilidad_dealer_parametros " +
            "WHERE ventas_minimas <= ? " +
            "ORDER BY ventas_minimas DESC LIMIT 1",
            ventas
        );
        if (!tiers.isEmpty()) {
            Map<String, Object> r = tiers.get(0);
            return new DealerTier(
                ((Number) r.get("ventas_minimas")).intValue(),
                ((Number) r.get("factor_dealer")).doubleValue(),
                ((Number) r.get("bono_unitario")).doubleValue()
            );
        }
        return new DealerTier(0, 0.0, 0.0);
    }

    private double round2(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static class EscalaMatch {
        String rangoNombre;
        double factorComision;
        double bonoFijo;
        EscalaMatch(String n, double f, double b) {
            this.rangoNombre = n;
            this.factorComision = f;
            this.bonoFijo = b;
        }
    }

    private static class DealerTier {
        int ventasMin;
        double factor;
        double bonoUnitario;
        DealerTier(int v, double f, double b) {
            this.ventasMin = v;
            this.factor = f;
            this.bonoUnitario = b;
        }
    }
}
