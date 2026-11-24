package com.nextlead.dao;

import com.nextlead.models.Contact;
import com.nextlead.models.Direccion;
import com.nextlead.models.Ubigeo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class ContactDaoImpl implements ContactDao {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ContactDaoImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // -------------------------------------------------------
    // RowMappers
    // -------------------------------------------------------

    private final RowMapper<Contact> contactRowMapper = (rs, rowNum) -> {
        Contact c = new Contact();
        c.setId(rs.getLong("id"));
        c.setTipoPersona(rs.getString("tipo_persona"));
        c.setTipoDocumento(rs.getString("tipo_documento"));
        c.setNumeroDocumento(rs.getString("numero_documento"));
        c.setNombres(rs.getString("nombres"));
        c.setApellidos(rs.getString("apellidos"));
        c.setRazonSocial(rs.getString("razon_social"));
        c.setTelefonoPrincipal(rs.getString("telefono_principal"));
        c.setTelefonoSecundario(rs.getString("telefono_secundario"));
        c.setEmail(rs.getString("email"));
        long empresaId = rs.getLong("empresa_id");
        c.setEmpresaId(rs.wasNull() ? null : empresaId);
        // empresa_nombre puede estar presente en JOINs
        try { c.setEmpresaNombre(rs.getString("empresa_nombre")); } catch (SQLException ignored) {}
        c.setStarred(rs.getBoolean("starred"));
        c.setAiActive(rs.getBoolean("ai_active"));
        c.setReferencia(rs.getString("referencia"));
        c.setStatus(rs.getString("status"));
        try { int n = rs.getInt("nro_entidades"); c.setNroEntidades(rs.wasNull() ? null : n); } catch (SQLException ignored) {}
        try { double s = rs.getDouble("score_experian"); c.setScoreExperian(rs.wasNull() ? null : s); } catch (SQLException ignored) {}
        try { c.setSemaforoExperian(rs.getString("semaforo_experian")); } catch (SQLException ignored) {}
        try { double d = rs.getDouble("deuda_sbs"); c.setDeudaSbs(rs.wasNull() ? null : d); } catch (SQLException ignored) {}
        try { c.setCalificacionSbs(rs.getString("calificacion_sbs")); } catch (SQLException ignored) {}
        try { c.setRangoVentas(rs.getString("rango_ventas")); } catch (SQLException ignored) {}
        try { c.setCargo(rs.getString("cargo")); } catch (SQLException ignored) {}
        Timestamp ts = rs.getTimestamp("date_created");
        if (ts != null) c.setDateCreated(ts.toLocalDateTime());
        return c;
    };

    private final RowMapper<Direccion> direccionRowMapper = (rs, rowNum) -> {
        Direccion d = new Direccion();
        d.setIdDireccion(rs.getLong("id_direccion"));
        d.setIdContacto(rs.getLong("id_contacto"));
        d.setNombreUbicacion(rs.getString("nombre_ubicacion"));
        d.setCodigoUbigeo(rs.getString("codigo_ubigeo"));
        try { d.setDepartamento(rs.getString("departamento")); } catch (SQLException ignored) {}
        try { d.setProvincia(rs.getString("provincia")); } catch (SQLException ignored) {}
        try { d.setDistrito(rs.getString("distrito")); } catch (SQLException ignored) {}
        d.setDireccionCompleta(rs.getString("direccion_completa"));
        d.setReferencia(rs.getString("referencia"));
        double lat = rs.getDouble("latitud");
        d.setLatitud(rs.wasNull() ? null : lat);
        double lon = rs.getDouble("longitud");
        d.setLongitud(rs.wasNull() ? null : lon);
        return d;
    };

    private final RowMapper<Ubigeo> ubigeoRowMapper = (rs, rowNum) -> {
        Ubigeo u = new Ubigeo();
        u.setCodigoUbigeo(rs.getString("codigo_ubigeo"));
        u.setDepartamento(rs.getString("departamento"));
        u.setProvincia(rs.getString("provincia"));
        u.setDistrito(rs.getString("distrito"));
        return u;
    };

    // -------------------------------------------------------
    // CRUD de Contactos
    // -------------------------------------------------------

    @Override
    public List<Contact> findAll() {
        String sql = """
            SELECT c.*, e.razon_social AS empresa_nombre
            FROM contacts c
            LEFT JOIN contacts e ON c.empresa_id = e.id
            ORDER BY c.date_created DESC
            """;
        List<Contact> list = jdbcTemplate.query(sql, contactRowMapper);
        for (Contact c : list) {
            c.setDirecciones(findAddressesByContactId(c.getId()));
        }
        return list;
    }

    @Override
    public List<Contact> findAllEmpresas() {
        String sql = "SELECT *, NULL AS empresa_nombre FROM contacts WHERE tipo_persona = 'EMPRESA' ORDER BY razon_social ASC";
        return jdbcTemplate.query(sql, contactRowMapper);
    }

    @Override
    public Optional<Contact> findById(Long id) {
        String sql = """
            SELECT c.*, e.razon_social AS empresa_nombre
            FROM contacts c
            LEFT JOIN contacts e ON c.empresa_id = e.id
            WHERE c.id = ?
            """;
        try {
            Contact contact = jdbcTemplate.queryForObject(sql, contactRowMapper, id);
            return Optional.ofNullable(contact);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public Contact save(Contact contact) {
        String sql = """
            INSERT INTO contacts
              (tipo_persona, tipo_documento, numero_documento, nombres, apellidos,
               razon_social, telefono_principal, telefono_secundario, email, empresa_id, starred, ai_active, referencia, status,
               nro_entidades, score_experian, semaforo_experian, deuda_sbs, calificacion_sbs, rango_ventas, cargo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, new String[]{"id"});
            ps.setString(1, contact.getTipoPersona());
            ps.setString(2, contact.getTipoDocumento());
            ps.setString(3, contact.getNumeroDocumento());
            ps.setString(4, contact.getNombres());
            ps.setString(5, contact.getApellidos());
            ps.setString(6, contact.getRazonSocial());
            ps.setString(7, contact.getTelefonoPrincipal());
            ps.setString(8, contact.getTelefonoSecundario());
            ps.setString(9, contact.getEmail());
            if (contact.getEmpresaId() != null) {
                ps.setLong(10, contact.getEmpresaId());
            } else {
                ps.setNull(10, java.sql.Types.BIGINT);
            }
            ps.setBoolean(11, contact.getStarred() != null ? contact.getStarred() : false);
            ps.setBoolean(12, contact.getAiActive() != null ? contact.getAiActive() : false);
            ps.setString(13, contact.getReferencia());
            ps.setString(14, contact.getStatus() != null ? contact.getStatus() : "Lead");
            if (contact.getNroEntidades() != null) ps.setInt(15, contact.getNroEntidades()); else ps.setNull(15, java.sql.Types.INTEGER);
            if (contact.getScoreExperian() != null) ps.setDouble(16, contact.getScoreExperian()); else ps.setNull(16, java.sql.Types.NUMERIC);
            ps.setString(17, contact.getSemaforoExperian());
            if (contact.getDeudaSbs() != null) ps.setDouble(18, contact.getDeudaSbs()); else ps.setNull(18, java.sql.Types.NUMERIC);
            ps.setString(19, contact.getCalificacionSbs());
            ps.setString(20, contact.getRangoVentas());
            ps.setString(21, contact.getCargo());
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key != null) {
            contact.setId(key.longValue());
        }

        // Insertar direcciones asociadas
        if (contact.getDirecciones() != null) {
            for (Direccion dir : contact.getDirecciones()) {
                saveDireccion(contact.getId(), dir);
            }
        }

        return contact;
    }

    private void saveDireccion(Long contactId, Direccion dir) {
        String sql = """
            INSERT INTO direcciones
              (id_contacto, nombre_ubicacion, codigo_ubigeo, direccion_completa, referencia, latitud, longitud)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;
        jdbcTemplate.update(sql,
            contactId,
            dir.getNombreUbicacion(),
            dir.getCodigoUbigeo(),
            dir.getDireccionCompleta(),
            dir.getReferencia(),
            dir.getLatitud(),
            dir.getLongitud()
        );
    }

    @Override
    @Transactional
    public void update(Contact contact) {
        String sql = """
            UPDATE contacts SET
              tipo_persona = ?, tipo_documento = ?, numero_documento = ?, nombres = ?, apellidos = ?,
              razon_social = ?, telefono_principal = ?, telefono_secundario = ?, email = ?, empresa_id = ?, ai_active = ?, referencia = ?, status = ?,
              nro_entidades = ?, score_experian = ?, semaforo_experian = ?, deuda_sbs = ?, calificacion_sbs = ?, rango_ventas = ?, cargo = ?
            WHERE id = ?
            """;
        jdbcTemplate.update(sql,
            contact.getTipoPersona(),
            contact.getTipoDocumento(),
            contact.getNumeroDocumento(),
            contact.getNombres(),
            contact.getApellidos(),
            contact.getRazonSocial(),
            contact.getTelefonoPrincipal(),
            contact.getTelefonoSecundario(),
            contact.getEmail(),
            contact.getEmpresaId(),
            contact.getAiActive(),
            contact.getReferencia(),
            contact.getStatus() != null ? contact.getStatus() : "Lead",
            contact.getNroEntidades(),
            contact.getScoreExperian(),
            contact.getSemaforoExperian(),
            contact.getDeudaSbs(),
            contact.getCalificacionSbs(),
            contact.getRangoVentas(),
            contact.getCargo(),
            contact.getId()
        );

        // Actualizar direcciones: borrar anteriores e insertar nuevas
        jdbcTemplate.update("DELETE FROM direcciones WHERE id_contacto = ?", contact.getId());
        if (contact.getDirecciones() != null) {
            for (Direccion dir : contact.getDirecciones()) {
                saveDireccion(contact.getId(), dir);
            }
        }
    }

    @Override
    public void deleteById(Long id) {
        jdbcTemplate.update("DELETE FROM contacts WHERE id = ?", id);
    }

    @Override
    public void updateStarred(Long id, boolean starred) {
        jdbcTemplate.update("UPDATE contacts SET starred = ? WHERE id = ?", starred, id);
    }

    @Override
    public List<Direccion> findAddressesByContactId(Long id) {
        String sql = """
            SELECT d.*, u.departamento, u.provincia, u.distrito
            FROM direcciones d
            LEFT JOIN ubigeo_peru u ON d.codigo_ubigeo = u.codigo_ubigeo
            WHERE d.id_contacto = ?
            ORDER BY d.id_direccion ASC
            """;
        return jdbcTemplate.query(sql, direccionRowMapper, id);
    }

    @Override
    public List<Contact> findPersonasByEmpresaId(Long empresaId) {
        String sql = """
            SELECT c.*, NULL AS empresa_nombre
            FROM contacts c
            WHERE c.empresa_id = ?
            ORDER BY c.apellidos ASC, c.nombres ASC
            """;
        return jdbcTemplate.query(sql, contactRowMapper, empresaId);
    }

    @Override
    public List<Ubigeo> findAllUbigeos() {
        String sql = "SELECT * FROM ubigeo_peru ORDER BY departamento, provincia, distrito";
        return jdbcTemplate.query(sql, ubigeoRowMapper);
    }

    @Override
    public long count() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM contacts", Long.class);
        return count != null ? count : 0;
    }

    @Override
    public void updateAiActive(Long id, boolean aiActive) {
        jdbcTemplate.update("UPDATE contacts SET ai_active = ? WHERE id = ?", aiActive, id);
    }

    @Override
    public Optional<Contact> findByPhone(String phone) {
        if (phone == null || phone.isEmpty()) return Optional.empty();
        String cleanPhone = phone.replaceAll("\\D", "");
        String last9 = cleanPhone.length() >= 9 ? cleanPhone.substring(cleanPhone.length() - 9) : cleanPhone;
        String matchPattern = "%" + last9;
        
        String sql = """
            SELECT c.*, e.razon_social AS empresa_nombre
            FROM contacts c
            LEFT JOIN contacts e ON c.empresa_id = e.id
            WHERE c.telefono_principal LIKE ? OR c.telefono_secundario LIKE ?
            LIMIT 1
            """;
        try {
            List<Contact> list = jdbcTemplate.query(sql, contactRowMapper, matchPattern, matchPattern);
            if (list.isEmpty()) {
                return Optional.empty();
            }
            Contact contact = list.get(0);
            contact.setDirecciones(findAddressesByContactId(contact.getId()));
            return Optional.of(contact);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Contact> findByNumeroDocumento(String numeroDocumento) {
        if (numeroDocumento == null || numeroDocumento.isBlank()) return Optional.empty();
        String sql = """
            SELECT c.*, e.razon_social AS empresa_nombre
            FROM contacts c
            LEFT JOIN contacts e ON c.empresa_id = e.id
            WHERE c.numero_documento = ?
            LIMIT 1
            """;
        try {
            List<Contact> list = jdbcTemplate.query(sql, contactRowMapper, numeroDocumento.trim());
            if (list.isEmpty()) {
                return Optional.empty();
            }
            Contact contact = list.get(0);
            contact.setDirecciones(findAddressesByContactId(contact.getId()));
            return Optional.of(contact);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public java.util.Map<String, Object> findPaginated(int page, int size, String search, String tipoPersona, String semaforo) {
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new java.util.ArrayList<>();

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            where.append(" AND (LOWER(c.razon_social) LIKE ? OR LOWER(c.nombres) LIKE ? OR LOWER(c.apellidos) LIKE ? OR c.numero_documento LIKE ? OR c.telefono_principal LIKE ? OR LOWER(c.email) LIKE ?) ");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }

        if (tipoPersona != null && !tipoPersona.isBlank() && !"ALL".equalsIgnoreCase(tipoPersona)) {
            where.append(" AND c.tipo_persona = ? ");
            params.add(tipoPersona.toUpperCase());
        }

        if (semaforo != null && !semaforo.isBlank() && !"ALL".equalsIgnoreCase(semaforo)) {
            where.append(" AND UPPER(c.semaforo_experian) = ? ");
            params.add(semaforo.toUpperCase());
        }

        // Count query
        String countSql = "SELECT COUNT(*) FROM contacts c " + where;
        Long totalElements = jdbcTemplate.queryForObject(countSql, Long.class, params.toArray());
        if (totalElements == null) totalElements = 0L;

        // Data query with limit & offset
        int offset = Math.max(0, page) * size;
        String dataSql = "SELECT c.*, e.razon_social AS empresa_nombre FROM contacts c LEFT JOIN contacts e ON c.empresa_id = e.id "
                + where
                + " ORDER BY c.id DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new java.util.ArrayList<>(params);
        dataParams.add(size);
        dataParams.add(offset);

        List<Contact> content = jdbcTemplate.query(dataSql, contactRowMapper, dataParams.toArray());

        int totalPages = (int) Math.ceil((double) totalElements / size);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("content", content);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("page", page);
        result.put("size", size);
        return result;
    }
}
