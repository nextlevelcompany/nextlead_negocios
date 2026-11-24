package com.nextlead.controllers;

import com.nextlead.dao.UserDao;
import com.nextlead.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class UsersController {

    private final UserDao userDao;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    public UsersController(UserDao userDao, PasswordEncoder passwordEncoder, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userDao = userDao;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userDao.findAll();
        // Limpiar las contraseñas antes de enviarlas al frontend por seguridad
        for (User user : users) {
            user.setPassword(null);
        }
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User newUser) {
        try {
            if (newUser.getUsername() == null || newUser.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("El nombre de usuario es obligatorio");
            }
            if (newUser.getPassword() == null || newUser.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("La contraseña es obligatoria");
            }
            if (userDao.existsByUsername(newUser.getUsername().trim())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("El nombre de usuario ya está registrado");
            }

            // Encriptar la contraseña usando el PasswordEncoder de Spring Security
            newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
            
            // Valores por defecto para perfil si no se especifican
            if (newUser.getRole() == null || newUser.getRole().trim().isEmpty()) {
                newUser.setRole("USER");
            }
            if (newUser.getModules() == null) {
                newUser.setModules("dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin");
            }
            
            // Guardar en base de datos
            userDao.save(newUser);
            
            // Buscar el usuario recién creado para retornar su id asignado
            java.util.Optional<User> createdOpt = userDao.findByUsername(newUser.getUsername().trim());
            if (createdOpt.isPresent()) {
                User created = createdOpt.get();
                created.setPassword(null);
                return new ResponseEntity<>(created, HttpStatus.CREATED);
            }

            // Ocultar la contraseña en la respuesta
            newUser.setPassword(null);
            return new ResponseEntity<>(newUser, HttpStatus.CREATED);
        } catch (Exception e) {
            System.err.println(">>> Error creando usuario: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear usuario: " + e.getMessage());
        }
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> updateUser(@PathVariable String username, @RequestBody User updatedUser) {
        try {
            java.util.Optional<User> existingUserOpt = userDao.findByUsername(username);
            if (existingUserOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
            }

            User existingUser = existingUserOpt.get();

            // Actualizar rol si se especifica
            if (updatedUser.getRole() != null && !updatedUser.getRole().trim().isEmpty()) {
                existingUser.setRole(updatedUser.getRole());
            }
            
            // Encriptar y actualizar contraseña solo si se provee una nueva
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().trim().isEmpty()) {
                existingUser.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
            }
            
            existingUser.setFirstName(updatedUser.getFirstName());
            existingUser.setLastName(updatedUser.getLastName());
            existingUser.setPhone(updatedUser.getPhone());
            existingUser.setLocation(updatedUser.getLocation());
            existingUser.setBio(updatedUser.getBio());
            
            if (updatedUser.getAvatar() != null) {
                existingUser.setAvatar(updatedUser.getAvatar());
            }
            if (updatedUser.getModules() != null) {
                existingUser.setModules(updatedUser.getModules());
            }

            userDao.update(existingUser);
            existingUser.setPassword(null);
            return ResponseEntity.ok(existingUser);
        } catch (Exception e) {
            System.err.println(">>> Error actualizando usuario: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar usuario: " + e.getMessage());
        }
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        if (!userDao.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        }
        userDao.deleteByUsername(username);
        return ResponseEntity.noContent().build();
    }
}
