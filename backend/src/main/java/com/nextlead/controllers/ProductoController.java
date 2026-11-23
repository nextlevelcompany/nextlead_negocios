package com.nextlead.controllers;

import com.nextlead.dao.ProductoDao;
import com.nextlead.dao.CategoriaProductoDao;
import com.nextlead.models.Producto;
import com.nextlead.models.ProductoComponente;
import com.nextlead.models.CategoriaProducto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoDao productoDao;
    private final CategoriaProductoDao categoriaDao;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    public ProductoController(ProductoDao productoDao, CategoriaProductoDao categoriaDao) {
        this.productoDao = productoDao;
        this.categoriaDao = categoriaDao;
    }

    @GetMapping
    public ResponseEntity<List<Producto>> getAll() {
        return ResponseEntity.ok(productoDao.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Optional<Producto> opt = productoDao.findById(id);
        return opt.map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Producto prod) {
        if (prod.getNombre() == null || prod.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El nombre es obligatorio."));
        }
        Producto saved = productoDao.save(prod);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Producto prod) {
        Optional<Producto> opt = productoDao.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (prod.getNombre() == null || prod.getNombre().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El nombre es obligatorio."));
        }
        prod.setId(id);
        Producto existing = opt.get();
        if (prod.getTipoProducto() == null) prod.setTipoProducto(existing.getTipoProducto());
        if (prod.getSubcategoria() == null) prod.setSubcategoria(existing.getSubcategoria());
        if (prod.getVelocidadMbps() == null) prod.setVelocidadMbps(existing.getVelocidadMbps());
        if (prod.getEquipamientoIncluido() == null) prod.setEquipamientoIncluido(existing.getEquipamientoIncluido());
        if (prod.getTelefoniaIncluida() == null) prod.setTelefoniaIncluida(existing.getTelefoniaIncluida());
        if (prod.getRequiereRuc20() == null) prod.setRequiereRuc20(existing.getRequiereRuc20());
        if (prod.getPermiteHardphone() == null) prod.setPermiteHardphone(existing.getPermiteHardphone());
        if (prod.getCentralVirtualCosto() == null) prod.setCentralVirtualCosto(existing.getCentralVirtualCosto());
        if (prod.getEsMultisede() == null) prod.setEsMultisede(existing.getEsMultisede());
        if (prod.getPreciosEscalonadosJson() == null) prod.setPreciosEscalonadosJson(existing.getPreciosEscalonadosJson());
        if (prod.getDistritosPermitidos() == null) prod.setDistritosPermitidos(existing.getDistritosPermitidos());
        if (prod.getProvinciasExcluidas() == null) prod.setProvinciasExcluidas(existing.getProvinciasExcluidas());
        if (prod.getLimiteMaxCantidad() == null) prod.setLimiteMaxCantidad(existing.getLimiteMaxCantidad());
        if (prod.getDocumentosRequeridos() == null) prod.setDocumentosRequeridos(existing.getDocumentosRequeridos());
        if (prod.getImagen() == null && existing.getImagen() != null) prod.setImagen(existing.getImagen());

        productoDao.update(prod);
        return ResponseEntity.ok(prod);
    }

    @PatchMapping("/{id}/imagen")
    public ResponseEntity<?> updateImage(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Producto> opt = productoDao.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String newImage = body.get("imagen");
        jdbcTemplate.update("UPDATE productos SET imagen = ? WHERE id = ?", newImage, id);
        return ResponseEntity.ok(Map.of("message", "Imagen actualizada con éxito.", "imagen", newImage != null ? newImage : ""));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        Optional<Producto> opt = productoDao.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        productoDao.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Producto eliminado con éxito."));
    }

    @PostMapping("/import")
    public ResponseEntity<?> importProducts(@RequestBody List<Map<String, Object>> productsList) {
        try {
            // Cargar categorías actuales para mapear por nombre en mayúsculas
            List<CategoriaProducto> currentCategories = categoriaDao.findAll();
            Map<String, Long> categoryMap = new HashMap<>();
            for (CategoriaProducto cat : currentCategories) {
                categoryMap.put(cat.getNombre().toUpperCase().trim(), cat.getId());
            }

            long defaultCatId = currentCategories.isEmpty() ? 1L : currentCategories.get(0).getId();

            // Cargar todos los productos para verificar SKU existente
            List<Producto> allProducts = productoDao.findAll();
            Map<String, Long> productSkuMap = new HashMap<>();
            for (Producto p : allProducts) {
                if (p.getCodigo() != null && !p.getCodigo().trim().isEmpty()) {
                    productSkuMap.put(p.getCodigo().toUpperCase().trim(), p.getId());
                }
            }

            int count = 0;
            for (Map<String, Object> row : productsList) {
                String codigo = row.containsKey("Codigo") ? String.valueOf(row.get("Codigo")).trim() : "";
                String nombre = row.containsKey("Nombre") ? String.valueOf(row.get("Nombre")).trim() : "";
                String catName = row.containsKey("Categoria") ? String.valueOf(row.get("Categoria")).trim().toUpperCase() : "";
                
                double precio = 0.0;
                if (row.containsKey("Precio")) {
                    try {
                        precio = Double.parseDouble(String.valueOf(row.get("Precio")).replaceAll("[^0-9.]", ""));
                    } catch (Exception ignored) {}
                }

                int stock = 0;
                if (row.containsKey("Stock")) {
                    try {
                        stock = Integer.parseInt(String.valueOf(row.get("Stock")).replaceAll("[^0-9-]", ""));
                    } catch (Exception ignored) {}
                }

                String desc = row.containsKey("Descripcion") ? String.valueOf(row.get("Descripcion")).trim() : "";

                if (nombre.isEmpty()) {
                    continue;
                }

                // Determinar id de categoría o crearla si no existe
                Long catId = categoryMap.get(catName);
                if (catId == null && !catName.isEmpty()) {
                    CategoriaProducto newCat = new CategoriaProducto();
                    newCat.setNombre(row.get("Categoria").toString().trim());
                    newCat.setDescripcion("Creada automáticamente durante importación");
                    newCat.setActivo(true);
                    newCat = categoriaDao.save(newCat);
                    catId = newCat.getId();
                    categoryMap.put(catName, catId);
                }
                if (catId == null) {
                    catId = defaultCatId;
                }

                // Si no existe el SKU, lo insertamos
                boolean exists = false;
                if (!codigo.isEmpty()) {
                    exists = productSkuMap.containsKey(codigo.toUpperCase().trim());
                }

                if (!exists) {
                    Producto p = new Producto();
                    p.setCodigo(codigo);
                    p.setNombre(nombre);
                    p.setDescripcion(desc);
                    p.setCategoriaId(catId);
                    p.setPrecioVenta(precio);
                    p.setStockActual(stock);
                    p.setEsPack(nombre.toUpperCase().contains("PACK") || nombre.toUpperCase().contains("PROMO") || nombre.toUpperCase().contains("COMBO"));
                    p.setRequiereRetorno(false);
                    p.setActivo(true);
                    
                    productoDao.save(p);
                    count++;
                }
            }

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", count + " nuevos productos importados correctamente."
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/imagen")
    public ResponseEntity<byte[]> getProductImage(@PathVariable Long id) {
        Optional<Producto> opt = productoDao.findById(id);
        if (opt.isEmpty() || opt.get().getImagen() == null || opt.get().getImagen().trim().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            String rawImage = opt.get().getImagen();
            String base64Data = rawImage;
            String contentType = "image/jpeg"; // default
            
            if (rawImage.contains(",")) {
                String[] parts = rawImage.split(",");
                String header = parts[0];
                base64Data = parts[1];
                if (header.contains("image/png")) {
                    contentType = "image/png";
                } else if (header.contains("image/webp")) {
                    contentType = "image/webp";
                } else if (header.contains("image/gif")) {
                    contentType = "image/gif";
                }
            }
            
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data.trim());
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .body(imageBytes);
        } catch (IllegalArgumentException e) {
            // Si no era base64 válido, tal vez es un nombre de archivo local
            try {
                String filename = opt.get().getImagen();
                java.io.File file = new java.io.File("/app/uploads/" + filename);
                if (file.exists()) {
                    byte[] fileBytes = java.nio.file.Files.readAllBytes(file.toPath());
                    String contentType = "image/jpeg";
                    if (filename.toLowerCase().endsWith(".png")) contentType = "image/png";
                    else if (filename.toLowerCase().endsWith(".webp")) contentType = "image/webp";
                    return ResponseEntity.ok()
                            .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                            .body(fileBytes);
                }
            } catch (Exception ignored) {}
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/validar-cotizacion")
    public ResponseEntity<?> validarCotizacion(@RequestBody Map<String, Object> req) {
        List<String> errores = new ArrayList<>();
        List<String> advertencias = new ArrayList<>();
        List<String> documentos = new ArrayList<>();

        // 1. Datos del cliente y ubicación
        String ruc = req.containsKey("clienteRuc") ? String.valueOf(req.get("clienteRuc")).trim() : "";
        String departamento = req.containsKey("departamento") ? String.valueOf(req.get("departamento")).trim().toUpperCase() : "";
        String provincia = req.containsKey("provincia") ? String.valueOf(req.get("provincia")).trim().toUpperCase() : "";
        String distrito = req.containsKey("distrito") ? String.valueOf(req.get("distrito")).trim().toUpperCase() : "";
        
        int sedesCount = 1;
        if (req.containsKey("sedesCount")) {
            try {
                sedesCount = Integer.parseInt(String.valueOf(req.get("sedesCount")));
                if (sedesCount < 1) sedesCount = 1;
            } catch (Exception ignored) {}
        }

        String tipoTelefonia = req.containsKey("tipoTelefonia") ? String.valueOf(req.get("tipoTelefonia")).trim().toUpperCase() : "SOFTPHONE";
        boolean esRuc20 = ruc.startsWith("20") && ruc.length() == 11;

        // 2. Plan Principal
        Long planId = null;
        if (req.containsKey("planId") && req.get("planId") != null) {
            try {
                planId = Long.parseLong(String.valueOf(req.get("planId")));
            } catch (Exception ignored) {}
        }

        if (planId == null) {
            errores.add("Debe seleccionar un plan principal de Internet.");
            return ResponseEntity.ok(Map.of(
                "valido", false,
                "errores", errores,
                "advertencias", advertencias
            ));
        }

        Optional<Producto> optPlan = productoDao.findById(planId);
        if (optPlan.isEmpty()) {
            errores.add("El plan seleccionado no existe en el catálogo.");
            return ResponseEntity.ok(Map.of("valido", false, "errores", errores));
        }

        Producto plan = optPlan.get();
        double precioPlanUnitario = plan.getPrecioVenta() != null ? plan.getPrecioVenta() : 0.0;

        // Documentos base obligatorios
        documentos.add("Contrato de Arrendamiento de Servicios");
        documentos.add("Anexo I: Condiciones Técnicas y Niveles de Servicio (SLA 70%)");
        documentos.add("Anexo Contactos Oficiales y Representante Legal");

        // Regla: Validación de RUC 20 en Plan
        if (Boolean.TRUE.equals(plan.getRequiereRuc20()) && !esRuc20) {
            errores.add("El plan " + plan.getNombre() + " es exclusivo para empresas con RUC 20. El RUC ingresado (" + (ruc.isEmpty() ? "Vacío" : ruc) + ") no califica.");
        }

        // Regla: Incompatibilidad Hardphone en Planes PLUS + Router
        if (Boolean.FALSE.equals(plan.getPermiteHardphone()) && "HARDPHONE".equals(tipoTelefonia)) {
            errores.add("El plan " + plan.getNombre() + " opera en Modo Bridge con Router MikroTik y solo permite telefonía Softphone (el teléfono analógico / Hardphone no es compatible).");
        }

        // Regla: Multisede en 200 LITE
        if (Boolean.TRUE.equals(plan.getEsMultisede())) {
            if (sedesCount < 2) {
                errores.add("El plan " + plan.getNombre() + " es exclusivo para Multisedes (requiere contratar un mínimo de 2 sedes).");
            }
            if (sedesCount == 2) {
                precioPlanUnitario = 179.00;
            } else if (sedesCount == 3) {
                precioPlanUnitario = 169.00;
            } else if (sedesCount >= 4) {
                precioPlanUnitario = 159.00;
            }
        }

        // Regla: Restricciones Geográficas
        if (plan.getDistritosPermitidos() != null && !plan.getDistritosPermitidos().trim().isEmpty()) {
            String permitidos = plan.getDistritosPermitidos().toUpperCase();
            if (distrito.isEmpty() || !permitidos.contains(distrito)) {
                errores.add("El plan " + plan.getNombre() + " solo está disponible comercialmente en los distritos de: " + plan.getDistritosPermitidos() + ".");
            }
        }

        if (plan.getProvinciasExcluidas() != null && !plan.getProvinciasExcluidas().trim().isEmpty()) {
            String excluidas = plan.getProvinciasExcluidas().toUpperCase();
            if (!provincia.isEmpty() && (excluidas.contains(provincia) || (excluidas.contains("TODAS_PROVINCIAS") && !provincia.equals("LIMA")))) {
                errores.add("El plan " + plan.getNombre() + " no está habilitado para la provincia de " + provincia + ".");
            }
        }

        // Anexo Ciberseguridad Fortinet
        Long catId = plan.getCategoriaId() != null ? plan.getCategoriaId() : 0L;
        boolean esPlusOBusiness = (catId == 2L || catId == 3L || catId == 4L);
        if (esPlusOBusiness) {
            documentos.add("Anexo Seguridad en la Nube (Fortinet Virtual Security)");
        }
        if (catId == 3L) {
            documentos.add("Contrato de Equipamiento Router Avanzado MikroTik (L009UiGS)");
        }

        // 3. Procesar Servicios Adicionales (SVAs)
        List<Map<String, Object>> svasDetalle = new ArrayList<>();
        double svasRecurrenteTotal = 0.0;
        boolean centralVirtualActiva = "PLAN-400-BUSINESS-WIFI".equalsIgnoreCase(plan.getCodigo());

        List<?> svasInput = req.containsKey("svas") && req.get("svas") instanceof List ? (List<?>) req.get("svas") : List.of();
        
        // Primero detectar si Central Virtual está en los SVAs
        for (Object item : svasInput) {
            if (item instanceof Map<?,?> m) {
                try {
                    Long sId = Long.parseLong(String.valueOf(m.get("id")));
                    Optional<Producto> optS = productoDao.findById(sId);
                    if (optS.isPresent() && "SVA-CENTRAL-VIRTUAL".equalsIgnoreCase(optS.get().getCodigo())) {
                        centralVirtualActiva = true;
                    }
                } catch (Exception ignored) {}
            }
        }

        for (Object item : svasInput) {
            if (!(item instanceof Map<?,?> m)) continue;
            try {
                Long sId = Long.parseLong(String.valueOf(m.get("id")));
                int cantidad = 1;
                if (m.containsKey("cantidad")) {
                    cantidad = Integer.parseInt(String.valueOf(m.get("cantidad")));
                    if (cantidad < 1) cantidad = 1;
                }

                Optional<Producto> optS = productoDao.findById(sId);
                if (optS.isEmpty()) continue;
                Producto sva = optS.get();

                // Validación RUC 20 en SVA
                if (Boolean.TRUE.equals(sva.getRequiereRuc20()) && !esRuc20) {
                    errores.add("El adicional " + sva.getNombre() + " requiere RUC 20 para ser contratado.");
                }

                // Dependencia de Router Avanzado (MikroTik o Omada)
                String codigo = sva.getCodigo() != null ? sva.getCodigo().toUpperCase() : "";
                boolean esSvaRedAvanzada = codigo.startsWith("SVA-VPN") || codigo.startsWith("SVA-POOL");
                if (esSvaRedAvanzada && catId != 3L && catId != 4L) {
                    errores.add("El servicio " + sva.getNombre() + " solo puede contratarse con Planes PLUS + Router MikroTik o Planes Business.");
                }

                if ("SVA-AP-OMADA-PRO".equalsIgnoreCase(codigo) && catId != 3L && catId != 4L) {
                    errores.add("El Access Point PRO Omada (EAP650) solo aplica para Planes PLUS + Router o Business (RUC 20).");
                }

                // Validaciones de Central Virtual
                if ("SVA-ANEXO-CV".equalsIgnoreCase(codigo)) {
                    if (!centralVirtualActiva) {
                        errores.add("El Anexo Adicional requiere tener activa la Central Virtual.");
                    }
                    if (cantidad > 45) {
                        errores.add("Máximo 45 anexos adicionales para la Central Virtual (solicitados: " + cantidad + ").");
                    }
                }

                if ("SVA-TEL-YEALINK".equalsIgnoreCase(codigo)) {
                    if (!centralVirtualActiva) {
                        errores.add("El Teléfono IP Yealink T31P requiere tener activa la Central Virtual.");
                    }
                    if (cantidad > 1) {
                        errores.add("Solo se permite un máximo de 1 Teléfono IP Yealink por Central Virtual.");
                    }
                    documentos.add("Anexo de Comodato de Teléfono IP");
                }

                if ("SVA-VPN-S2C".equalsIgnoreCase(codigo)) {
                    if (cantidad < 1 || cantidad > 10) {
                        errores.add("La VPN Site-to-Client admite entre 1 y 10 usuarios concurrentes.");
                    }
                    documentos.add("Anexo Solicitud y Credenciales VPN Site-to-Client");
                }

                if ("SVA-VPN-S2S".equalsIgnoreCase(codigo)) {
                    documentos.add("Anexo Solicitud de Interconexión VPN Site-to-Site");
                }

                if (codigo.startsWith("SVA-POOL")) {
                    documentos.add("Anexo Asignación y Enrutamiento Pool IP Pública");
                }

                if ("SVA-AP-HUAWEI".equalsIgnoreCase(codigo)) {
                    if (cantidad > 4) {
                        errores.add("Máximo 4 Access Points Huawei adicionales en comodato por cliente.");
                    }
                    documentos.add("Anexo Comodato de Equipos Wi-Fi");
                }

                // Lógica de precio para Central Virtual
                double precioUnitario = sva.getPrecioVenta() != null ? sva.getPrecioVenta() : 0.0;
                boolean esGratis = false;
                String motivoGratis = null;

                if ("SVA-CENTRAL-VIRTUAL".equalsIgnoreCase(codigo)) {
                    documentos.add("Contrato de Telefonía Fija y Central Cloud Yeastar");
                    // Gratis a solicitud para 1 única línea en 400 PLUS, 600 PLUS, 400 PLUS + Router, 600 PLUS + Router y Business 400
                    boolean calificaGratis = "PLAN-400-PLUS".equalsIgnoreCase(plan.getCodigo())
                                          || "PLAN-600-PLUS".equalsIgnoreCase(plan.getCodigo())
                                          || "PLAN-400-PLUS-ROUTER".equalsIgnoreCase(plan.getCodigo())
                                          || "PLAN-600-PLUS-ROUTER".equalsIgnoreCase(plan.getCodigo())
                                          || "PLAN-400-BUSINESS-WIFI".equalsIgnoreCase(plan.getCodigo());
                    if (calificaGratis) {
                        precioUnitario = 0.00;
                        esGratis = true;
                        motivoGratis = "Bonificación 100% gratuita incluida para 1 línea en su plan seleccionado.";
                    }
                }

                if (codigo.startsWith("SVA-LINEA")) {
                    documentos.add("Formato de Asignación / Portabilidad Numérica Telefónica Fija");
                }

                double subtotal = precioUnitario * cantidad;
                svasRecurrenteTotal += subtotal;

                Map<String, Object> itemResp = new HashMap<>();
                itemResp.put("id", sva.getId());
                itemResp.put("codigo", sva.getCodigo());
                itemResp.put("nombre", sva.getNombre());
                itemResp.put("cantidad", cantidad);
                itemResp.put("precioUnitario", precioUnitario);
                itemResp.put("subtotal", subtotal);
                itemResp.put("esGratis", esGratis);
                if (motivoGratis != null) itemResp.put("motivoGratis", motivoGratis);
                svasDetalle.add(itemResp);

            } catch (Exception ignored) {}
        }

        // 4. Procesar Cargos de Pago Único
        List<Map<String, Object>> cargosDetalle = new ArrayList<>();
        double cargosUnicosTotal = 0.0;

        List<?> cargosInput = req.containsKey("cargosUnicos") && req.get("cargosUnicos") instanceof List ? (List<?>) req.get("cargosUnicos") : List.of();
        for (Object item : cargosInput) {
            if (!(item instanceof Map<?,?> m)) continue;
            try {
                Long cId = Long.parseLong(String.valueOf(m.get("id")));
                int cantidad = 1;
                if (m.containsKey("cantidad")) {
                    cantidad = Integer.parseInt(String.valueOf(m.get("cantidad")));
                    if (cantidad < 1) cantidad = 1;
                }

                Optional<Producto> optC = productoDao.findById(cId);
                if (optC.isEmpty()) continue;
                Producto cargo = optC.get();

                double precioUnitario = cargo.getPrecioVenta() != null ? cargo.getPrecioVenta() : 0.0;
                double subtotal = precioUnitario * cantidad;
                cargosUnicosTotal += subtotal;

                if (cargo.getDocumentosRequeridos() != null && !cargo.getDocumentosRequeridos().trim().isEmpty()) {
                    documentos.add(cargo.getDocumentosRequeridos());
                }

                Map<String, Object> itemResp = new HashMap<>();
                itemResp.put("id", cargo.getId());
                itemResp.put("codigo", cargo.getCodigo());
                itemResp.put("nombre", cargo.getNombre());
                itemResp.put("cantidad", cantidad);
                itemResp.put("precioUnitario", precioUnitario);
                itemResp.put("subtotal", subtotal);
                cargosDetalle.add(itemResp);
            } catch (Exception ignored) {}
        }

        // 5. Totales
        double planTotal = precioPlanUnitario * sedesCount;
        double recurrenteTotalConIgv = planTotal + svasRecurrenteTotal;
        double recurrenteNeto = Math.round((recurrenteTotalConIgv / 1.18) * 100.0) / 100.0;
        double recurrenteIgv = Math.round((recurrenteTotalConIgv - recurrenteNeto) * 100.0) / 100.0;

        double pagoUnicoConIgv = cargosUnicosTotal;
        double pagoUnicoNeto = Math.round((pagoUnicoConIgv / 1.18) * 100.0) / 100.0;
        double pagoUnicoIgv = Math.round((pagoUnicoConIgv - pagoUnicoNeto) * 100.0) / 100.0;

        double primerPagoEstimado = recurrenteTotalConIgv + pagoUnicoConIgv;

        // Limpiar documentos duplicados manteniendo orden
        List<String> docsUnicos = new ArrayList<>();
        for (String d : documentos) {
            if (!docsUnicos.contains(d)) docsUnicos.add(d);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("valido", errores.isEmpty());
        response.put("errores", errores);
        response.put("advertencias", advertencias);
        response.put("plan", plan);
        response.put("sedesCount", sedesCount);
        response.put("precioPlanUnitario", precioPlanUnitario);
        response.put("precioPlanTotal", planTotal);
        response.put("svasDetalle", svasDetalle);
        response.put("cargosUnicosDetalle", cargosDetalle);
        response.put("totales", Map.of(
            "recurrenteMensualNeto", recurrenteNeto,
            "recurrenteMensualIgv", recurrenteIgv,
            "recurrenteMensualTotal", recurrenteTotalConIgv,
            "pagoUnicoNeto", pagoUnicoNeto,
            "pagoUnicoIgv", pagoUnicoIgv,
            "pagoUnicoTotal", pagoUnicoConIgv,
            "primerPagoEstimado", primerPagoEstimado
        ));
        response.put("documentosObligatorios", docsUnicos);

        return ResponseEntity.ok(response);
    }
}

