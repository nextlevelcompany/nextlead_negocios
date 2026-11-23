package com.nextlead.dao;

import com.nextlead.models.Producto;
import com.nextlead.models.ProductoComponente;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class ProductoDaoImpl implements ProductoDao {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ProductoDaoImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Producto> rowMapper = (rs, rowNum) -> {
        Producto p = new Producto();
        p.setId(rs.getLong("id"));
        p.setCodigo(rs.getString("codigo"));
        p.setNombre(rs.getString("nombre"));
        p.setDescripcion(rs.getString("descripcion"));
        
        long catId = rs.getLong("categoria_id");
        p.setCategoriaId(rs.wasNull() ? null : catId);
        
        try { p.setCategoriaNombre(rs.getString("categoria_nombre")); } catch (Exception ignored) {}
        
        p.setPrecioVenta(rs.getDouble("precio_venta"));
        p.setStockActual(rs.getInt("stock_actual"));
        p.setImagen(rs.getString("imagen"));
        p.setEsPack(rs.getBoolean("es_pack"));
        p.setRequiereRetorno(rs.getBoolean("requiere_retorno"));
        p.setActivo(rs.getBoolean("activo"));

        // Telecom / ON Negocios Attributes
        try { p.setTipoProducto(rs.getString("tipo_producto")); } catch (Exception ignored) {}
        try { p.setSubcategoria(rs.getString("subcategoria")); } catch (Exception ignored) {}
        try {
            int vel = rs.getInt("velocidad_mbps");
            p.setVelocidadMbps(rs.wasNull() ? null : vel);
        } catch (Exception ignored) {}
        try { p.setEquipamientoIncluido(rs.getString("equipamiento_incluido")); } catch (Exception ignored) {}
        try { p.setTelefoniaIncluida(rs.getString("telefonia_incluida")); } catch (Exception ignored) {}
        try {
            boolean ruc20 = rs.getBoolean("requiere_ruc20");
            p.setRequiereRuc20(rs.wasNull() ? null : ruc20);
        } catch (Exception ignored) {}
        try {
            boolean hp = rs.getBoolean("permite_hardphone");
            p.setPermiteHardphone(rs.wasNull() ? null : hp);
        } catch (Exception ignored) {}
        try {
            double cvCosto = rs.getDouble("central_virtual_costo");
            p.setCentralVirtualCosto(rs.wasNull() ? null : cvCosto);
        } catch (Exception ignored) {}
        try {
            boolean multi = rs.getBoolean("es_multisede");
            p.setEsMultisede(rs.wasNull() ? null : multi);
        } catch (Exception ignored) {}
        try { p.setPreciosEscalonadosJson(rs.getString("precios_escalonados_json")); } catch (Exception ignored) {}
        try { p.setDistritosPermitidos(rs.getString("distritos_permitidos")); } catch (Exception ignored) {}
        try { p.setProvinciasExcluidas(rs.getString("provincias_excluidas")); } catch (Exception ignored) {}
        try {
            int lim = rs.getInt("limite_max_cantidad");
            p.setLimiteMaxCantidad(rs.wasNull() ? null : lim);
        } catch (Exception ignored) {}
        try { p.setDocumentosRequeridos(rs.getString("documentos_requeridos")); } catch (Exception ignored) {}

        return p;
    };

    private final RowMapper<ProductoComponente> compRowMapper = (rs, rowNum) -> {
        ProductoComponente c = new ProductoComponente();
        c.setProductoPadreId(rs.getLong("producto_padre_id"));
        c.setProductoHijoId(rs.getLong("producto_hijo_id"));
        c.setNombre(rs.getString("nombre"));
        c.setCantidad(rs.getDouble("cantidad"));
        c.setRequiereRetorno(rs.getBoolean("requiere_retorno"));
        
        long catId = rs.getLong("categoria_id");
        c.setCategoriaId(rs.wasNull() ? null : catId);
        return c;
    };

    @Override
    public List<Producto> findAll() {
        String sql = """
            SELECT p.*, c.nombre AS categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias_producto c ON p.categoria_id = c.id 
            ORDER BY p.id ASC
            """;
        List<Producto> list = jdbcTemplate.query(sql, rowMapper);
        for (Producto p : list) {
            if (Boolean.TRUE.equals(p.getEsPack())) {
                p.setComponents(findCompositionByPadreId(p.getId()));
            }
        }
        return list;
    }

    @Override
    public Optional<Producto> findById(Long id) {
        String sql = """
            SELECT p.*, c.nombre AS categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias_producto c ON p.categoria_id = c.id 
            WHERE p.id = ?
            """;
        try {
            Producto p = jdbcTemplate.queryForObject(sql, rowMapper, id);
            if (p != null && Boolean.TRUE.equals(p.getEsPack())) {
                p.setComponents(findCompositionByPadreId(p.getId()));
            }
            return Optional.ofNullable(p);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public Producto save(Producto prod) {
        String sql = """
            INSERT INTO productos (
                codigo, nombre, descripcion, categoria_id, precio_venta, stock_actual, imagen, es_pack, requiere_retorno, activo,
                tipo_producto, subcategoria, velocidad_mbps, equipamiento_incluido, telefonia_incluida,
                requiere_ruc20, permite_hardphone, central_virtual_costo, es_multisede, precios_escalonados_json,
                distritos_permitidos, provincias_excluidas, limite_max_cantidad, documentos_requeridos
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, prod.getCodigo());
            ps.setString(2, prod.getNombre());
            ps.setString(3, prod.getDescripcion());
            if (prod.getCategoriaId() != null) {
                ps.setLong(4, prod.getCategoriaId());
            } else {
                ps.setNull(4, java.sql.Types.INTEGER);
            }
            ps.setDouble(5, prod.getPrecioVenta() != null ? prod.getPrecioVenta() : 0.0);
            ps.setInt(6, prod.getStockActual() != null ? prod.getStockActual() : 0);
            ps.setString(7, prod.getImagen());
            ps.setBoolean(8, prod.getEsPack() != null ? prod.getEsPack() : false);
            ps.setBoolean(9, prod.getRequiereRetorno() != null ? prod.getRequiereRetorno() : false);
            ps.setBoolean(10, prod.getActivo() != null ? prod.getActivo() : true);

            ps.setString(11, prod.getTipoProducto() != null ? prod.getTipoProducto() : "PLAN");
            ps.setString(12, prod.getSubcategoria());
            if (prod.getVelocidadMbps() != null) ps.setInt(13, prod.getVelocidadMbps()); else ps.setNull(13, java.sql.Types.INTEGER);
            ps.setString(14, prod.getEquipamientoIncluido());
            ps.setString(15, prod.getTelefoniaIncluida());
            ps.setBoolean(16, prod.getRequiereRuc20() != null ? prod.getRequiereRuc20() : false);
            ps.setBoolean(17, prod.getPermiteHardphone() != null ? prod.getPermiteHardphone() : true);
            ps.setDouble(18, prod.getCentralVirtualCosto() != null ? prod.getCentralVirtualCosto() : 59.0);
            ps.setBoolean(19, prod.getEsMultisede() != null ? prod.getEsMultisede() : false);
            ps.setString(20, prod.getPreciosEscalonadosJson());
            ps.setString(21, prod.getDistritosPermitidos());
            ps.setString(22, prod.getProvinciasExcluidas());
            if (prod.getLimiteMaxCantidad() != null) ps.setInt(23, prod.getLimiteMaxCantidad()); else ps.setNull(23, java.sql.Types.INTEGER);
            ps.setString(24, prod.getDocumentosRequeridos());

            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key != null) {
            prod.setId(key.longValue());
        }

        // Guardar composición si es pack
        if (Boolean.TRUE.equals(prod.getEsPack()) && prod.getComponents() != null) {
            saveComposition(prod.getId(), prod.getComponents());
        }

        return prod;
    }

    @Override
    @Transactional
    public void update(Producto prod) {
        String sql = """
            UPDATE productos SET 
                codigo = ?, nombre = ?, descripcion = ?, categoria_id = ?, precio_venta = ?, 
                stock_actual = ?, imagen = ?, es_pack = ?, requiere_retorno = ?, activo = ?,
                tipo_producto = ?, subcategoria = ?, velocidad_mbps = ?, equipamiento_incluido = ?,
                telefonia_incluida = ?, requiere_ruc20 = ?, permite_hardphone = ?, central_virtual_costo = ?,
                es_multisede = ?, precios_escalonados_json = ?, distritos_permitidos = ?,
                provincias_excluidas = ?, limite_max_cantidad = ?, documentos_requeridos = ?
            WHERE id = ?
            """;
        jdbcTemplate.update(sql, 
            prod.getCodigo(), 
            prod.getNombre(), 
            prod.getDescripcion(), 
            prod.getCategoriaId(), 
            prod.getPrecioVenta(), 
            prod.getStockActual(), 
            prod.getImagen(), 
            prod.getEsPack(), 
            prod.getRequiereRetorno(), 
            prod.getActivo(),
            prod.getTipoProducto(),
            prod.getSubcategoria(),
            prod.getVelocidadMbps(),
            prod.getEquipamientoIncluido(),
            prod.getTelefoniaIncluida(),
            prod.getRequiereRuc20(),
            prod.getPermiteHardphone(),
            prod.getCentralVirtualCosto(),
            prod.getEsMultisede(),
            prod.getPreciosEscalonadosJson(),
            prod.getDistritosPermitidos(),
            prod.getProvinciasExcluidas(),
            prod.getLimiteMaxCantidad(),
            prod.getDocumentosRequeridos(),
            prod.getId()
        );

        // Guardar composición si es pack
        if (Boolean.TRUE.equals(prod.getEsPack()) && prod.getComponents() != null) {
            saveComposition(prod.getId(), prod.getComponents());
        }
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        jdbcTemplate.update("DELETE FROM producto_composicion WHERE producto_padre_id = ?", id);
        jdbcTemplate.update("DELETE FROM productos WHERE id = ?", id);
    }

    @Override
    public List<ProductoComponente> findCompositionByPadreId(Long padreId) {
        String sql = """
            SELECT pc.producto_padre_id, pc.producto_hijo_id, pc.cantidad,
                   p.nombre, p.requiere_retorno, p.categoria_id
            FROM producto_composicion pc
            JOIN productos p ON pc.producto_hijo_id = p.id
            WHERE pc.producto_padre_id = ?
            """;
        return jdbcTemplate.query(sql, compRowMapper, padreId);
    }

    @Override
    @Transactional
    public void saveComposition(Long padreId, List<ProductoComponente> components) {
        jdbcTemplate.update("DELETE FROM producto_composicion WHERE producto_padre_id = ?", padreId);
        if (components != null && !components.isEmpty()) {
            String insertSql = "INSERT INTO producto_composicion (producto_padre_id, producto_hijo_id, cantidad) VALUES (?, ?, ?)";
            for (ProductoComponente c : components) {
                if (c.getProductoHijoId() != null) {
                    jdbcTemplate.update(insertSql, padreId, c.getProductoHijoId(), c.getCantidad() != null ? c.getCantidad() : 1.0);
                }
            }
        }
    }
}
