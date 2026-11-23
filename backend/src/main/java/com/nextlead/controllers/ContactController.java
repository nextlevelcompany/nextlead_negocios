package com.nextlead.controllers;

import com.nextlead.dao.ContactDao;
import com.nextlead.models.Contact;
import com.nextlead.models.Direccion;
import com.nextlead.models.Ubigeo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactDao contactDao;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    public ContactController(ContactDao contactDao, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.contactDao = contactDao;
        this.jdbcTemplate = jdbcTemplate;
    }

    // GET /api/contacts — Todos los contactos
    @GetMapping
    public ResponseEntity<List<Contact>> getAll() {
        return ResponseEntity.ok(contactDao.findAll());
    }

    // GET /api/contacts/search?phone={phone} — Buscar contacto por teléfono
    @GetMapping("/search")
    public ResponseEntity<?> getByPhone(@RequestParam String phone) {
        return contactDao.findByPhone(phone)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/contacts/check-document?numero={numero}&excludeId={id} — Comprobar si un número de documento ya está registrado
    @GetMapping("/check-document")
    public ResponseEntity<?> checkDocument(
            @RequestParam String numero,
            @RequestParam(required = false) Long excludeId) {
        if (numero == null || numero.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Número de documento requerido."));
        }
        Optional<Contact> existingOpt = contactDao.findByNumeroDocumento(numero.trim());
        if (existingOpt.isPresent()) {
            Contact existing = existingOpt.get();
            if (excludeId == null || !existing.getId().equals(excludeId)) {
                String nombre = "EMPRESA".equals(existing.getTipoPersona()) 
                    ? existing.getRazonSocial() 
                    : existing.getNombreDisplay();
                return ResponseEntity.ok(java.util.Map.of(
                    "exists", true,
                    "id", existing.getId(),
                    "tipoPersona", existing.getTipoPersona(),
                    "tipoDocumento", existing.getTipoDocumento(),
                    "numeroDocumento", existing.getNumeroDocumento(),
                    "nombre", nombre != null ? nombre.trim() : ""
                ));
            }
        }
        return ResponseEntity.ok(java.util.Map.of("exists", false));
    }

    // GET /api/contacts/empresas — Solo Empresas (para selector en formulario)
    @GetMapping("/empresas")
    public ResponseEntity<List<Contact>> getEmpresas() {
        return ResponseEntity.ok(contactDao.findAllEmpresas());
    }

    // GET /api/contacts/{id} — Contacto por ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isPresent()) {
            opt.get().setDirecciones(contactDao.findAddressesByContactId(id));
            return ResponseEntity.ok(opt.get());
        }
        return ResponseEntity.notFound().build();
    }

    // GET /api/contacts/{id}/addresses — Direcciones con Ubigeo resuelto
    @GetMapping("/{id}/addresses")
    public ResponseEntity<List<Direccion>> getAddresses(@PathVariable Long id) {
        return ResponseEntity.ok(contactDao.findAddressesByContactId(id));
    }

    // POST /api/contacts/{id}/addresses — Agregar una nueva dirección directamente
    @PostMapping("/{id}/addresses")
    public ResponseEntity<?> addAddress(@PathVariable Long id, @RequestBody DireccionRequest dr) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        if (dr.direccionCompleta == null || dr.direccionCompleta.isBlank()) {
            return ResponseEntity.badRequest().body("La dirección exacta es obligatoria.");
        }

        String ubi = (dr.codigoUbigeo != null && !dr.codigoUbigeo.isBlank()) ? dr.codigoUbigeo : "150101";
        String nombre = (dr.nombreUbicacion != null && !dr.nombreUbicacion.isBlank()) ? dr.nombreUbicacion : "Sede Principal";

        String sql = """
            INSERT INTO direcciones (id_contacto, nombre_ubicacion, codigo_ubigeo, direccion_completa, referencia, latitud, longitud)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """;
        jdbcTemplate.update(sql, id, nombre, ubi, dr.direccionCompleta.trim(), dr.referencia, dr.latitud, dr.longitud);

        return ResponseEntity.ok(contactDao.findAddressesByContactId(id));
    }

    // DELETE /api/contacts/{id}/addresses/{addrId} — Eliminar una dirección
    @DeleteMapping("/{id}/addresses/{addrId}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id, @PathVariable Long addrId) {
        jdbcTemplate.update("DELETE FROM direcciones WHERE id_direccion = ? AND id_contacto = ?", addrId, id);
        return ResponseEntity.ok(contactDao.findAddressesByContactId(id));
    }

    // GET /api/contacts/{id}/pedidos — Pedidos y ventas del contacto
    @GetMapping("/{id}/pedidos")
    public ResponseEntity<?> getPedidosAndVentasByContactId(@PathVariable Long id) {
        try {
            String sql = 
                "SELECT 'pedido' as tipo, p.id, p.numero_pedido as numero, p.created_at as fecha, " +
                "       p.total, p.estado_pago, ep.nombre as estado_entrega, p.direccion_entrega " +
                "FROM pedidos p " +
                "LEFT JOIN etapas_pedido ep ON p.etapa_id = ep.id " +
                "WHERE p.contacto_id IN (SELECT id FROM contacts WHERE id = ? OR empresa_id = ? OR id = (SELECT empresa_id FROM contacts WHERE id = ?)) " +
                "UNION ALL " +
                "SELECT 'venta' as tipo, v.id, v.numero_venta as numero, v.fecha_venta as fecha, " +
                "       v.total, v.estado_pago, v.estado as estado_entrega, v.direccion_entrega " +
                "FROM ventas v " +
                "WHERE v.contacto_id IN (SELECT id FROM contacts WHERE id = ? OR empresa_id = ? OR id = (SELECT empresa_id FROM contacts WHERE id = ?)) " +
                "ORDER BY fecha DESC";
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, id, id, id, id, id, id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("message", "Error al obtener historial: " + e.getMessage()));
        }
    }

    // GET /api/contacts/{id}/personas — Personas vinculadas a una empresa
    @GetMapping("/{id}/personas")
    public ResponseEntity<List<Contact>> getPersonasByEmpresa(@PathVariable Long id) {
        return ResponseEntity.ok(contactDao.findPersonasByEmpresaId(id));
    }

    // POST /api/contacts/{id}/personas — Agregar una persona de contacto a esta empresa
    @PostMapping("/{id}/personas")
    public ResponseEntity<?> addPersonaToEmpresa(@PathVariable Long id, @RequestBody ContactRequest req) {
        Optional<Contact> empOpt = contactDao.findById(id);
        if (empOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (!"EMPRESA".equals(empOpt.get().getTipoPersona())) {
            return ResponseEntity.badRequest().body("Solo se pueden agregar personas vinculadas a contactos de tipo EMPRESA.");
        }
        req.tipoPersona = "NATURAL";
        req.empresaId = id;
        if (req.tipoDocumento == null || req.tipoDocumento.isBlank()) req.tipoDocumento = "DNI";
        return create(req);
    }

    // GET /api/contacts/{id}/oportunidades — Oportunidades CRM vinculadas al contacto o a su empresa
    @GetMapping("/{id}/oportunidades")
    public ResponseEntity<?> getOportunidadesByContactId(@PathVariable Long id) {
        try {
            String sql = """
                SELECT o.id, o.titulo, o.valor, o.prioridad, o.etiquetas, o.created_at,
                       o.notas, o.productos_json,
                       kc.nombre as etapa_nombre, kc.es_ganada, kc.es_perdida,
                       CONCAT(u.first_name, ' ', u.last_name) as vendedor_nombre
                FROM oportunidades o
                LEFT JOIN kanban_columnas kc ON o.etapa_id = kc.id
                LEFT JOIN users u ON o.usuario_id = u.id
                WHERE o.contacto_id IN (SELECT id FROM contacts WHERE id = ? OR empresa_id = ? OR id = (SELECT empresa_id FROM contacts WHERE id = ?))
                ORDER BY o.created_at DESC
            """;
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, id, id, id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("message", "Error al obtener oportunidades: " + e.getMessage()));
        }
    }

    // GET /api/contacts/{id}/ventas — Ventas comerciales del contacto
    @GetMapping("/{id}/ventas")
    public ResponseEntity<?> getVentasByContactId(@PathVariable Long id) {
        try {
            String sql = """
                SELECT v.id, v.numero_venta as numero, v.fecha_venta as fecha, v.total,
                       v.subtotal, v.igv, v.monto_pagado, v.estado_pago, v.estado as estado_entrega,
                       v.metodo_pago, v.tipo_comprobante, v.direccion_entrega, v.bidones_entregados, v.bidones_recogidos
                FROM ventas v
                WHERE v.contacto_id IN (SELECT id FROM contacts WHERE id = ? OR empresa_id = ? OR id = (SELECT empresa_id FROM contacts WHERE id = ?))
                ORDER BY v.fecha_venta DESC
            """;
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, id, id, id));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("message", "Error al obtener ventas: " + e.getMessage()));
        }
    }

    // POST /api/contacts — Crear contacto con validaciones
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ContactRequest req) {
        // ---- Validaciones ----
        List<String> errors = new ArrayList<>();

        // Tipo de persona
        if (req.tipoPersona == null || (!req.tipoPersona.equals("NATURAL") && !req.tipoPersona.equals("EMPRESA"))) {
            errors.add("Tipo de persona inválido. Debe ser NATURAL o EMPRESA.");
        }

        // Tipo de documento vs tipo de persona
        if ("NATURAL".equals(req.tipoPersona)) {
            if (req.tipoDocumento == null || (!req.tipoDocumento.equals("DNI") && !req.tipoDocumento.equals("CE"))) {
                errors.add("Una persona natural solo puede tener DNI o CE.");
            }
        } else if ("EMPRESA".equals(req.tipoPersona)) {
            if (!"RUC".equals(req.tipoDocumento)) {
                errors.add("Una empresa debe tener RUC.");
            }
        }

        // Validación de número de documento
        if (req.numeroDocumento != null) {
            String numDocTrim = req.numeroDocumento.trim();
            if ("DNI".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^[0-9]{8}$")) {
                    errors.add("El DNI debe tener exactamente 8 dígitos numéricos.");
                }
            } else if ("RUC".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^(10|20)[0-9]{9}$")) {
                    errors.add("El RUC debe tener 11 dígitos y comenzar con 10 o 20.");
                }
            } else if ("CE".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^[a-zA-Z0-9]{8,12}$")) {
                    errors.add("El CE debe tener entre 8 y 12 caracteres alfanuméricos.");
                }
            }

            // Unicidad: verificar que no exista otro contacto con el mismo documento
            Optional<Contact> existingDoc = contactDao.findByNumeroDocumento(numDocTrim);
            if (existingDoc.isPresent()) {
                Contact c = existingDoc.get();
                String nombreExistente = "EMPRESA".equals(c.getTipoPersona()) ? c.getRazonSocial() : c.getNombreDisplay();
                errors.add("El número de documento " + numDocTrim + " ya está registrado y pertenece a: " + (nombreExistente != null ? nombreExistente.trim() : "otro contacto") + " (ID #" + c.getId() + ").");
            }
        } else {
            errors.add("El número de documento es obligatorio.");
        }

        // Campos de nombre/razón social
        if ("NATURAL".equals(req.tipoPersona)) {
            if (req.nombres == null || req.nombres.isBlank()) errors.add("Nombres es obligatorio para persona natural.");
            if (req.apellidos == null || req.apellidos.isBlank()) errors.add("Apellidos es obligatorio para persona natural.");
        } else if ("EMPRESA".equals(req.tipoPersona)) {
            if (req.razonSocial == null || req.razonSocial.isBlank()) errors.add("Razón social es obligatoria para empresa.");
        }

        // Teléfono principal
        if (req.telefonoPrincipal == null || !req.telefonoPrincipal.matches("^[0-9]{9}$")) {
            errors.add("El teléfono principal debe tener exactamente 9 dígitos.");
        }

        // Teléfono secundario (opcional)
        if (req.telefonoSecundario != null && !req.telefonoSecundario.isBlank()) {
            if (!req.telefonoSecundario.matches("^[0-9]{9}$")) {
                errors.add("El teléfono secundario debe tener exactamente 9 dígitos.");
            }
        }

        // Validar empresa vinculada (solo personas naturales)
        if (req.empresaId != null) {
            if (!"NATURAL".equals(req.tipoPersona)) {
                errors.add("Solo las personas naturales pueden vincularse a una empresa.");
            } else {
                Optional<Contact> empresaOpt = contactDao.findById(req.empresaId);
                if (empresaOpt.isEmpty()) {
                    errors.add("La empresa vinculada no existe.");
                } else if (!"EMPRESA".equals(empresaOpt.get().getTipoPersona())) {
                    errors.add("El contacto vinculado debe ser de tipo EMPRESA.");
                }
            }
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }

        // ---- Construcción del modelo ----
        Contact contact = new Contact();
        contact.setTipoPersona(req.tipoPersona);
        contact.setTipoDocumento(req.tipoDocumento);
        contact.setNumeroDocumento(req.numeroDocumento.trim());
        contact.setNombres(req.nombres);
        contact.setApellidos(req.apellidos);
        contact.setRazonSocial(req.razonSocial);
        contact.setTelefonoPrincipal(req.telefonoPrincipal.trim());
        contact.setTelefonoSecundario(
            req.telefonoSecundario != null && !req.telefonoSecundario.isBlank()
                ? req.telefonoSecundario.trim() : null);
        contact.setEmail(req.email != null && !req.email.isBlank() ? req.email.trim() : null);
        contact.setEmpresaId(req.empresaId);
        contact.setReferencia(req.referencia);
        contact.setStarred(false);

        // Direcciones
        if (req.direcciones != null) {
            for (DireccionRequest dr : req.direcciones) {
                Direccion dir = new Direccion();
                dir.setNombreUbicacion(dr.nombreUbicacion);
                dir.setCodigoUbigeo(dr.codigoUbigeo);
                dir.setDireccionCompleta(dr.direccionCompleta);
                dir.setReferencia(dr.referencia);
                dir.setLatitud(dr.latitud);
                dir.setLongitud(dr.longitud);
                contact.getDirecciones().add(dir);
            }
        }

        try {
            Contact saved = contactDao.save(contact);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(List.of("No se pudo registrar el contacto: el número de documento ya existe en el sistema."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of("Error al registrar el contacto: " + e.getMessage()));
        }
    }

    // PUT /api/contacts/{id} — Actualizar contacto con validaciones
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ContactRequest req) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        // ---- Validaciones ----
        List<String> errors = new ArrayList<>();

        // Tipo de persona
        if (req.tipoPersona == null || (!req.tipoPersona.equals("NATURAL") && !req.tipoPersona.equals("EMPRESA"))) {
            errors.add("Tipo de persona inválido. Debe ser NATURAL o EMPRESA.");
        }

        // Tipo de documento vs tipo de persona
        if ("NATURAL".equals(req.tipoPersona)) {
            if (req.tipoDocumento == null || (!req.tipoDocumento.equals("DNI") && !req.tipoDocumento.equals("CE"))) {
                errors.add("Una persona natural solo puede tener DNI o CE.");
            }
        } else if ("EMPRESA".equals(req.tipoPersona)) {
            if (!"RUC".equals(req.tipoDocumento)) {
                errors.add("Una empresa debe tener RUC.");
            }
        }

        // Validación de número de documento
        if (req.numeroDocumento != null) {
            String numDocTrim = req.numeroDocumento.trim();
            if ("DNI".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^[0-9]{8}$")) {
                    errors.add("El DNI debe tener exactamente 8 dígitos numéricos.");
                }
            } else if ("RUC".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^(10|20)[0-9]{9}$")) {
                    errors.add("El RUC debe tener 11 dígitos y comenzar con 10 o 20.");
                }
            } else if ("CE".equals(req.tipoDocumento)) {
                if (!numDocTrim.matches("^[a-zA-Z0-9]{8,12}$")) {
                    errors.add("El CE debe tener entre 8 y 12 caracteres alfanuméricos.");
                }
            }

            // Unicidad: verificar que no pertenezca a otro contacto
            Optional<Contact> existingDoc = contactDao.findByNumeroDocumento(numDocTrim);
            if (existingDoc.isPresent() && !existingDoc.get().getId().equals(id)) {
                Contact c = existingDoc.get();
                String nombreExistente = "EMPRESA".equals(c.getTipoPersona()) ? c.getRazonSocial() : c.getNombreDisplay();
                errors.add("El número de documento " + numDocTrim + " ya pertenece a otro contacto registrado: " + (nombreExistente != null ? nombreExistente.trim() : "ID #" + c.getId()) + ".");
            }
        } else {
            errors.add("El número de documento es obligatorio.");
        }

        // Campos de nombre/razón social
        if ("NATURAL".equals(req.tipoPersona)) {
            if (req.nombres == null || req.nombres.isBlank()) errors.add("Nombres es obligatorio para persona natural.");
            if (req.apellidos == null || req.apellidos.isBlank()) errors.add("Apellidos es obligatorio para persona natural.");
        } else if ("EMPRESA".equals(req.tipoPersona)) {
            if (req.razonSocial == null || req.razonSocial.isBlank()) errors.add("Razón social es obligatoria para empresa.");
        }

        // Teléfono principal
        if (req.telefonoPrincipal == null || !req.telefonoPrincipal.matches("^[0-9]{9}$")) {
            errors.add("El teléfono principal debe tener exactamente 9 dígitos.");
        }

        // Teléfono secundario (opcional)
        if (req.telefonoSecundario != null && !req.telefonoSecundario.isBlank()) {
            if (!req.telefonoSecundario.matches("^[0-9]{9}$")) {
                errors.add("El teléfono secundario debe tener exactamente 9 dígitos.");
            }
        }

        // Validar empresa vinculada (solo personas naturales)
        if (req.empresaId != null) {
            if (!"NATURAL".equals(req.tipoPersona)) {
                errors.add("Solo las personas naturales pueden vincularse a una empresa.");
            } else {
                Optional<Contact> empresaOpt = contactDao.findById(req.empresaId);
                if (empresaOpt.isEmpty()) {
                    errors.add("La empresa vinculada no existe.");
                } else if (!"EMPRESA".equals(empresaOpt.get().getTipoPersona())) {
                    errors.add("El contacto vinculado debe ser de tipo EMPRESA.");
                }
            }
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }

        // ---- Construcción del modelo ----
        Contact contact = opt.get();
        contact.setTipoPersona(req.tipoPersona);
        contact.setTipoDocumento(req.tipoDocumento);
        contact.setNumeroDocumento(req.numeroDocumento.trim());
        contact.setNombres(req.nombres);
        contact.setApellidos(req.apellidos);
        contact.setRazonSocial(req.razonSocial);
        contact.setTelefonoPrincipal(req.telefonoPrincipal.trim());
        contact.setTelefonoSecundario(
            req.telefonoSecundario != null && !req.telefonoSecundario.isBlank()
                ? req.telefonoSecundario.trim() : null);
        contact.setEmail(req.email != null && !req.email.isBlank() ? req.email.trim() : null);
        contact.setEmpresaId(req.empresaId);
        contact.setReferencia(req.referencia);

        // Direcciones
        contact.getDirecciones().clear();
        if (req.direcciones != null) {
            for (DireccionRequest dr : req.direcciones) {
                Direccion dir = new Direccion();
                dir.setNombreUbicacion(dr.nombreUbicacion);
                dir.setCodigoUbigeo(dr.codigoUbigeo);
                dir.setDireccionCompleta(dr.direccionCompleta);
                dir.setReferencia(dr.referencia);
                dir.setLatitud(dr.latitud);
                dir.setLongitud(dr.longitud);
                contact.getDirecciones().add(dir);
            }
        }

        try {
            contactDao.update(contact);
            return ResponseEntity.ok(contact);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(List.of("No se pudo actualizar el contacto: el número de documento ya pertenece a otro registro."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of("Error al actualizar el contacto: " + e.getMessage()));
        }
    }

    // PUT /api/contacts/{id}/star — Alternar favorito
    @PutMapping("/{id}/star")
    public ResponseEntity<?> toggleStar(@PathVariable Long id) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        boolean newStarred = !Boolean.TRUE.equals(opt.get().getStarred());
        contactDao.updateStarred(id, newStarred);
        return ResponseEntity.ok(java.util.Map.of("starred", newStarred));
    }

    // PUT /api/contacts/{id}/toggle-ai — Alternar respuestas automáticas por IA
    @PutMapping("/{id}/toggle-ai")
    public ResponseEntity<?> toggleAi(@PathVariable Long id) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        boolean newAiActive = !Boolean.TRUE.equals(opt.get().getAiActive());
        contactDao.updateAiActive(id, newAiActive);
        return ResponseEntity.ok(java.util.Map.of("aiActive", newAiActive));
    }

    // PUT /api/contacts/{id}/link-empresa — Vincular/desvincular persona a empresa
    @PutMapping("/{id}/link-empresa")
    public ResponseEntity<?> linkEmpresa(@PathVariable Long id, @RequestParam(required = false) Long empresaId) {
        Optional<Contact> opt = contactDao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Contact contact = opt.get();
        if (!"NATURAL".equals(contact.getTipoPersona())) {
            return ResponseEntity.badRequest().body("Solo se puede vincular personas naturales.");
        }
        if (empresaId != null) {
            Optional<Contact> empOpt = contactDao.findById(empresaId);
            if (empOpt.isEmpty() || !"EMPRESA".equals(empOpt.get().getTipoPersona())) {
                return ResponseEntity.badRequest().body("La empresa no existe o no es de tipo EMPRESA.");
            }
        }
        contact.setEmpresaId(empresaId);
        try {
            contactDao.update(contact);
            return ResponseEntity.ok(contact);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(List.of("No se pudo actualizar el contacto: el número de documento ya pertenece a otro registro."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(List.of("Error al actualizar el contacto: " + e.getMessage()));
        }
    }

    // DELETE /api/contacts/{id} — Eliminar contacto (cascada en direcciones)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (contactDao.findById(id).isEmpty()) return ResponseEntity.notFound().build();
        contactDao.deleteById(id);
        return ResponseEntity.ok("Contacto eliminado correctamente.");
    }

    // GET /api/ubigeos — Catálogo completo de ubigeos
    @GetMapping("/ubigeos")
    public ResponseEntity<List<Ubigeo>> getUbigeos() {
        return ResponseEntity.ok(contactDao.findAllUbigeos());
    }

    // GET /api/contacts/resolve-maps-url — Resolver URL de Google Maps para extraer coordenadas
    @GetMapping("/resolve-maps-url")
    public ResponseEntity<?> resolveMapsUrl(@RequestParam String url) {
        try {
            String target = url;
            if (url.contains("maps.app.goo.gl") || url.contains("goo.gl/maps")) {
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                int status = conn.getResponseCode();
                if (status >= 300 && status < 400) {
                    String loc = conn.getHeaderField("Location");
                    if (loc != null) {
                        target = loc;
                    }
                }
            }
            double lat = 0.0;
            double lng = 0.0;
            boolean found = false;
            java.util.regex.Pattern p1 = java.util.regex.Pattern.compile("@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
            java.util.regex.Matcher m1 = p1.matcher(target);
            if (m1.find()) {
                lat = Double.parseDouble(m1.group(1));
                lng = Double.parseDouble(m1.group(2));
                found = true;
            } else {
                java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)");
                java.util.regex.Matcher m2 = p2.matcher(target);
                if (m2.find()) {
                    lat = Double.parseDouble(m2.group(1));
                    lng = Double.parseDouble(m2.group(2));
                    found = true;
                } else {
                    java.util.regex.Pattern p3 = java.util.regex.Pattern.compile("[?&]q=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)");
                    java.util.regex.Matcher m3 = p3.matcher(target);
                    if (m3.find()) {
                        lat = Double.parseDouble(m3.group(1));
                        lng = Double.parseDouble(m3.group(2));
                        found = true;
                    }
                }
            }
            if (found) {
                return ResponseEntity.ok(java.util.Map.of("lat", lat, "lng", lng));
            } else {
                return ResponseEntity.badRequest().body("No se pudieron extraer coordenadas de la URL.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al resolver URL: " + e.getMessage());
        }
    }

    // GET /api/contacts/geocode?q={address} — Geocodificar dirección en Perú
    @GetMapping("/geocode")
    public ResponseEntity<?> geocodeAddress(@RequestParam String q) {
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=json&q=" +
                java.net.URLEncoder.encode(q, java.nio.charset.StandardCharsets.UTF_8) +
                "&countrycodes=pe&limit=1";
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .header("User-Agent", "NextLeadCRM/1.0 (contactos@nextlead.pe)")
                .GET()
                .build();
            java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                java.util.List<?> list = mapper.readValue(resp.body(), java.util.List.class);
                if (!list.isEmpty() && list.get(0) instanceof java.util.Map) {
                    java.util.Map<?, ?> item = (java.util.Map<?, ?>) list.get(0);
                    Double lat = Double.parseDouble(item.get("lat").toString());
                    Double lng = Double.parseDouble(item.get("lon").toString());
                    String displayName = item.get("display_name") != null ? item.get("display_name").toString() : "";
                    return ResponseEntity.ok(java.util.Map.of("found", true, "lat", lat, "lng", lng, "displayName", displayName));
                }
            }
            return ResponseEntity.ok(java.util.Map.of("found", false));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Map.of("found", false, "error", e.getMessage()));
        }
    }

    // ---- DTOs de Request ----

    public static class ContactRequest {
        public String tipoPersona;
        public String tipoDocumento;
        public String numeroDocumento;
        public String nombres;
        public String apellidos;
        public String razonSocial;
        public String telefonoPrincipal;
        public String telefonoSecundario;
        public String email;
        public Long empresaId;
        public String referencia;
        public List<DireccionRequest> direcciones;
    }

    public static class DireccionRequest {
        public String nombreUbicacion;
        public String codigoUbigeo;
        public String direccionCompleta;
        public String referencia;
        public Double latitud;
        public Double longitud;
    }
}
