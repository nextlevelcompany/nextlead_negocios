package com.nextlead.dao;

import com.nextlead.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

@Repository
public class UserDaoImpl implements UserDao {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public UserDaoImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<User> rowMapper = new RowMapper<User>() {
        @Override
        public User mapRow(ResultSet rs, int rowNum) throws SQLException {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setUsername(rs.getString("username"));
            user.setPassword(rs.getString("password"));
            user.setRole(rs.getString("role"));
            try { user.setFirstName(rs.getString("first_name")); } catch (Exception ignored) { user.setFirstName("Administrador"); }
            try { user.setLastName(rs.getString("last_name")); } catch (Exception ignored) { user.setLastName("General"); }
            try { user.setLocation(rs.getString("location")); } catch (Exception ignored) {}
            try { user.setBio(rs.getString("bio")); } catch (Exception ignored) {}
            try { user.setPhone(rs.getString("phone")); } catch (Exception ignored) {}
            try { user.setWebsite(rs.getString("website")); } catch (Exception ignored) {}
            try { user.setAvatar(rs.getString("avatar")); } catch (Exception ignored) {}
            try { 
                String mods = rs.getString("modules");
                user.setModules(mods != null ? mods : "dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin");
            } catch (Exception ignored) {
                user.setModules("dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin");
            }
            return user;
        }
    };

    @Override
    public void save(User user) {
        try {
            String sql = "INSERT INTO users (username, password, role, first_name, last_name, location, bio, phone, website, avatar, modules) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            jdbcTemplate.update(sql, 
                user.getUsername(), 
                user.getPassword(), 
                user.getRole(),
                user.getFirstName() != null ? user.getFirstName() : "Administrador",
                user.getLastName() != null ? user.getLastName() : "General",
                user.getLocation() != null ? user.getLocation() : "Lima, Perú",
                user.getBio() != null ? user.getBio() : "",
                user.getPhone() != null ? user.getPhone() : "",
                user.getWebsite() != null ? user.getWebsite() : "",
                user.getAvatar(),
                user.getModules() != null ? user.getModules() : "dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin"
            );
        } catch (Exception e) {
            System.err.println("Error saving user with full schema, trying fallback: " + e.getMessage());
            String fallbackSql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
            jdbcTemplate.update(fallbackSql, user.getUsername(), user.getPassword(), user.getRole());
        }
    }

    @Override
    public Optional<User> findByUsername(String username) {
        if (username == null || username.trim().isEmpty()) return Optional.empty();
        String sql = "SELECT id, username, password, role, first_name, last_name, location, bio, phone, website, avatar, modules FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) ORDER BY id ASC LIMIT 1";
        try {
            java.util.List<User> list = jdbcTemplate.query(sql, rowMapper, username.trim());
            return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
        } catch (Exception e) {
            System.err.println("Error querying user with full schema: " + e.getMessage() + ". Attempting fallback query...");
            try {
                String fallbackSql = "SELECT id, username, password, role FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) ORDER BY id ASC LIMIT 1";
                java.util.List<User> fallbackList = jdbcTemplate.query(fallbackSql, (rs, rowNum) -> {
                    User u = new User();
                    u.setId(rs.getLong("id"));
                    u.setUsername(rs.getString("username"));
                    u.setPassword(rs.getString("password"));
                    u.setRole(rs.getString("role"));
                    u.setFirstName("Administrador");
                    u.setLastName("General");
                    u.setModules("dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin");
                    return u;
                }, username.trim());
                return fallbackList.isEmpty() ? Optional.empty() : Optional.of(fallbackList.get(0));
            } catch (Exception ex) {
                System.err.println("Fallback user query also failed: " + ex.getMessage());
                return Optional.empty();
            }
        }
    }

    @Override
    public boolean existsByUsername(String username) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, username);
        return count != null && count > 0;
    }

    @Override
    public long count() {
        String sql = "SELECT COUNT(*) FROM users";
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count != null ? count : 0;
    }

    @Override
    public void updateProfile(User user) {
        String sql = "UPDATE users SET first_name = ?, last_name = ?, location = ?, bio = ?, phone = ?, website = ?, avatar = ? WHERE username = ?";
        jdbcTemplate.update(sql, 
            user.getFirstName(), 
            user.getLastName(), 
            user.getLocation(), 
            user.getBio(), 
            user.getPhone(), 
            user.getWebsite(),
            user.getAvatar(),
            user.getUsername()
        );
    }

    @Override
    public void update(User user) {
        String sql = "UPDATE users SET password = ?, role = ?, first_name = ?, last_name = ?, location = ?, bio = ?, phone = ?, website = ?, avatar = ?, modules = ? WHERE username = ?";
        jdbcTemplate.update(sql, 
            user.getPassword(),
            user.getRole(),
            user.getFirstName(), 
            user.getLastName(), 
            user.getLocation(), 
            user.getBio(), 
            user.getPhone(), 
            user.getWebsite(),
            user.getAvatar(),
            user.getModules() != null ? user.getModules() : "",
            user.getUsername()
        );
    }

    @Override
    public java.util.List<User> findAll() {
        String sql = "SELECT id, username, password, role, first_name, last_name, location, bio, phone, website, avatar, modules FROM users ORDER BY id ASC";
        return jdbcTemplate.query(sql, rowMapper);
    }

    @Override
    public void deleteByUsername(String username) {
        String sql = "DELETE FROM users WHERE username = ?";
        jdbcTemplate.update(sql, username);
    }
}

