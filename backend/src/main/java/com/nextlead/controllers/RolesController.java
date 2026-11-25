package com.nextlead.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/roles")
public class RolesController {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public RolesController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // 1. Listar todos los roles con el conteo de usuarios asignados
    @GetMapping
    public ResponseEntity<?> getAllRoles() {
        try {
            String sql = "SELECT r.id, r.codigo, r.nombre, r.descripcion, r.color, r.badge_color, " +
                         "r.es_sistema, r.sales_scope, r.permisos::text as permisos, " +
                         "(SELECT COUNT(*) FROM users u WHERE UPPER(u.role) = UPPER(r.codigo)) as usuarios_count " +
                         "FROM roles_sistema r ORDER BY r.id ASC";
            List<Map<String, Object>> roles = jdbcTemplate.queryForList(sql);
            return ResponseEntity.ok(roles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al listar roles: " + e.getMessage()));
        }
    }

    // 2. Obtener un rol por su código
    @GetMapping("/{codigo}")
    public ResponseEntity<?> getRoleByCodigo(@PathVariable String codigo) {
        try {
            String sql = "SELECT r.id, r.codigo, r.nombre, r.descripcion, r.color, r.badge_color, " +
                         "r.es_sistema, r.sales_scope, r.permisos::text as permisos, " +
                         "(SELECT COUNT(*) FROM users u WHERE UPPER(u.role) = UPPER(r.codigo)) as usuarios_count " +
                         "FROM roles_sistema r WHERE UPPER(r.codigo) = UPPER(?)";
            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql, codigo);
            if (list.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Rol no encontrado"));
            }
            return ResponseEntity.ok(list.get(0));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al obtener rol: " + e.getMessage()));
        }
    }

    // 3. Crear un nuevo rol personalizado
    @PostMapping
    public ResponseEntity<?> createRole(@RequestBody Map<String, Object> body) {
        try {
            String codigo = body.get("codigo") != null ? body.get("codigo").toString().trim().toUpperCase() : "";
            String nombre = body.get("nombre") != null ? body.get("nombre").toString().trim() : "";
            String descripcion = body.get("descripcion") != null ? body.get("descripcion").toString().trim() : "";
            String color = body.get("color") != null ? body.get("color").toString() : "#3b82f6";
            String badgeColor = body.get("badge_color") != null ? body.get("badge_color").toString() : "bg-blue-600";
            String salesScope = body.get("sales_scope") != null ? body.get("sales_scope").toString() : "own";
            String permisos = body.get("permisos") != null ? body.get("permisos").toString() : "{}";

            if (codigo.isEmpty() || nombre.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El código y el nombre del rol son obligatorios"));
            }

            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles_sistema WHERE UPPER(codigo) = ?", Integer.class, codigo);
            if (count != null && count > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Ya existe un rol con el código " + codigo));
            }

            String sql = "INSERT INTO roles_sistema (codigo, nombre, descripcion, color, badge_color, es_sistema, sales_scope, permisos) " +
                         "VALUES (?, ?, ?, ?, ?, false, ?, ?::jsonb)";
            jdbcTemplate.update(sql, codigo, nombre, descripcion, color, badgeColor, salesScope, permisos);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Rol creado con éxito", "codigo", codigo));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al crear rol: " + e.getMessage()));
        }
    }

    // 4. Actualizar permisos y datos de un rol existente
    @PutMapping("/{codigo}")
    public ResponseEntity<?> updateRole(@PathVariable String codigo, @RequestBody Map<String, Object> body) {
        try {
            // Asegurar que la columna updated_at exista de forma resiliente
            try {
                jdbcTemplate.execute("ALTER TABLE roles_sistema ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            } catch (Exception ignored) {}

            Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles_sistema WHERE UPPER(codigo) = ?", Integer.class, codigo);
            if (count == null || count == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Rol no encontrado"));
            }

            String nombre = body.get("nombre") != null ? body.get("nombre").toString().trim() : null;
            String descripcion = body.get("descripcion") != null ? body.get("descripcion").toString().trim() : null;
            String color = body.get("color") != null ? body.get("color").toString() : null;
            String badgeColor = body.get("badge_color") != null ? body.get("badge_color").toString() : null;
            String salesScope = body.get("sales_scope") != null ? body.get("sales_scope").toString() : null;
            String permisos = body.get("permisos") != null ? body.get("permisos").toString() : null;

            StringBuilder sql = new StringBuilder("UPDATE roles_sistema SET updated_at = CURRENT_TIMESTAMP");
            if (nombre != null && !nombre.isEmpty()) sql.append(", nombre = '").append(nombre.replace("'", "''")).append("'");
            if (descripcion != null) sql.append(", descripcion = '").append(descripcion.replace("'", "''")).append("'");
            if (color != null) sql.append(", color = '").append(color).append("'");
            if (badgeColor != null) sql.append(", badge_color = '").append(badgeColor).append("'");
            if (salesScope != null) sql.append(", sales_scope = '").append(salesScope).append("'");
            if (permisos != null && !permisos.isEmpty()) sql.append(", permisos = '").append(permisos.replace("'", "''")).append("'::jsonb");

            sql.append(" WHERE UPPER(codigo) = UPPER(?)");

            jdbcTemplate.update(sql.toString(), codigo);

            return ResponseEntity.ok(Map.of("message", "Rol y accesos actualizados con éxito", "codigo", codigo));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al actualizar rol: " + e.getMessage()));
        }
    }

    // 5. Eliminar un rol (solo personalizados sin usuarios asignados)
    @DeleteMapping("/{codigo}")
    public ResponseEntity<?> deleteRole(@PathVariable String codigo) {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT es_sistema FROM roles_sistema WHERE UPPER(codigo) = ?", codigo);
            if (list.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Rol no encontrado"));
            }

            Boolean esSistema = (Boolean) list.get(0).get("es_sistema");
            if (Boolean.TRUE.equals(esSistema)) {
                return ResponseEntity.badRequest().body(Map.of("message", "No se puede eliminar un rol base del sistema"));
            }

            Integer userCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE UPPER(role) = UPPER(?)", Integer.class, codigo);
            if (userCount != null && userCount > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "No se puede eliminar el rol porque tiene " + userCount + " usuario(s) asignado(s)"));
            }

            jdbcTemplate.update("DELETE FROM roles_sistema WHERE UPPER(codigo) = UPPER(?)", codigo);
            return ResponseEntity.ok(Map.of("message", "Rol eliminado con éxito"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error al eliminar rol: " + e.getMessage()));
        }
    }
}
