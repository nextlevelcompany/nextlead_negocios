package com.nextlead.controllers;

import com.nextlead.dao.UserDao;
import com.nextlead.models.User;
import com.nextlead.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserDao userDao;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Autowired
    public AuthController(UserDao userDao, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userDao = userDao;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            if (loginRequest == null || loginRequest.getUsername() == null || loginRequest.getPassword() == null) {
                return ResponseEntity.badRequest().body("Usuario y contraseña son requeridos");
            }

            String inputUser = loginRequest.getUsername().trim();
            String inputPass = loginRequest.getPassword() != null ? loginRequest.getPassword() : "";
            String cleanPass = inputPass.trim();

            Optional<User> userOpt = userDao.findByUsername(inputUser);
            if (userOpt.isEmpty() && "admin".equalsIgnoreCase(inputUser)) {
                // Auto-reparación inmediata: si no existe el usuario admin en la BD, crearlo en el acto
                User autoAdmin = new User();
                autoAdmin.setUsername("admin");
                autoAdmin.setPassword(passwordEncoder.encode("admin123"));
                autoAdmin.setRole("ADMIN");
                autoAdmin.setFirstName("Administrador");
                autoAdmin.setLastName("General");
                autoAdmin.setModules("dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin");
                userDao.save(autoAdmin);
                userOpt = userDao.findByUsername("admin");
            }

            if (userOpt.isPresent()) {
                User user = userOpt.get();
                boolean matches = false;
                try {
                    matches = passwordEncoder.matches(inputPass, user.getPassword()) || passwordEncoder.matches(cleanPass, user.getPassword());
                } catch (Exception ignored) {}
                
                // Soporte si la contraseña en BD quedó temporalmente en texto plano
                if (!matches && user.getPassword() != null) {
                    if (inputPass.equals(user.getPassword()) || cleanPass.equals(user.getPassword())) {
                        matches = true;
                        // Auto-migrar a BCrypt seguro
                        try {
                            user.setPassword(passwordEncoder.encode(inputPass));
                            userDao.update(user);
                        } catch (Exception ignored) {}
                    }
                }

                if (matches) {
                    String role = user.getRole() != null ? user.getRole() : "ADMIN";
                    String token = jwtUtils.generateToken(user.getUsername(), role);
                    String modules = user.getModules() != null ? user.getModules() : "dashboard,chat,contactos,oportunidades,pedidos,ventas,productos,inventarios,finanzas,personal,admin";
                    LoginResponse response = new LoginResponse(token, user.getUsername(), role, modules);
                    response.setId(user.getId() != null ? user.getId() : 1L);
                    response.setFirstName(user.getFirstName() != null ? user.getFirstName() : "Administrador");
                    response.setLastName(user.getLastName() != null ? user.getLastName() : "General");
                    response.setAvatar(user.getAvatar());
                    return ResponseEntity.ok(response);
                }
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario o contraseña incorrectos");
        } catch (Exception e) {
            System.err.println(">>> Error interno en login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al procesar la autenticación: " + e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token no proporcionado");
        }
        String token = authHeader.substring(7);
        if (!jwtUtils.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token inválido o expirado");
        }
        String username = jwtUtils.getUsernameFromToken(token);
        Optional<User> userOpt = userDao.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado");
        }
        User user = userOpt.get();
        user.setPassword(null); // Ocultar contraseña por seguridad
        return ResponseEntity.ok(user);
    }

    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        Optional<User> userOpt = userDao.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return ResponseEntity.ok(new ProfileResponse(
                user.getUsername(),
                user.getRole(),
                user.getFirstName(),
                user.getLastName(),
                user.getLocation(),
                user.getBio(),
                user.getPhone(),
                user.getWebsite(),
                user.getAvatar()
            ));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
    }

    @PutMapping("/profile/{username}")
    public ResponseEntity<?> updateProfile(@PathVariable String username, @RequestBody ProfileRequest profileRequest) {
        Optional<User> userOpt = userDao.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setFirstName(profileRequest.getFirstName());
            user.setLastName(profileRequest.getLastName());
            user.setLocation(profileRequest.getLocation());
            user.setBio(profileRequest.getBio());
            user.setPhone(profileRequest.getPhone());
            user.setWebsite(profileRequest.getWebsite());
            user.setAvatar(profileRequest.getAvatar());
            userDao.updateProfile(user);
            return ResponseEntity.ok("Perfil actualizado con éxito");
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class LoginResponse {
        private String token;
        private String username;
        private String role;
        private String modules;
        private Long id;
        private String firstName;
        private String lastName;
        private String avatar;

        public LoginResponse(String token, String username, String role, String modules) {
            this.token = token;
            this.username = username;
            this.role = role;
            this.modules = modules;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getAvatar() {
            return avatar;
        }

        public void setAvatar(String avatar) {
            this.avatar = avatar;
        }

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getModules() {
            return modules;
        }

        public void setModules(String modules) {
            this.modules = modules;
        }
    }

    public static class ProfileRequest {
        private String firstName;
        private String lastName;
        private String location;
        private String bio;
        private String phone;
        private String website;
        private String avatar;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getBio() {
            return bio;
        }

        public void setBio(String bio) {
            this.bio = bio;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getWebsite() {
            return website;
        }

        public void setWebsite(String website) {
            this.website = website;
        }

        public String getAvatar() {
            return avatar;
        }

        public void setAvatar(String avatar) {
            this.avatar = avatar;
        }
    }

    public static class ProfileResponse {
        private String username;
        private String role;
        private String firstName;
        private String lastName;
        private String location;
        private String bio;
        private String phone;
        private String website;
        private String avatar;

        public ProfileResponse(String username, String role, String firstName, String lastName, String location, String bio, String phone, String website, String avatar) {
            this.username = username;
            this.role = role;
            this.firstName = firstName;
            this.lastName = lastName;
            this.location = location;
            this.bio = bio;
            this.phone = phone;
            this.website = website;
            this.avatar = avatar;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getBio() {
            return bio;
        }

        public void setBio(String bio) {
            this.bio = bio;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getWebsite() {
            return website;
        }

        public void setWebsite(String website) {
            this.website = website;
        }

        public String getAvatar() {
            return avatar;
        }

        public void setAvatar(String avatar) {
            this.avatar = avatar;
        }
    }
}
