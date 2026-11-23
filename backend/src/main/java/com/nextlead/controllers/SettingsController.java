package com.nextlead.controllers;

import com.nextlead.services.SettingsService;
import com.nextlead.wspai.service.KmzParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;
    private final KmzParserService kmzParserService;
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();

    @Autowired
    public SettingsController(SettingsService settingsService, KmzParserService kmzParserService) {
        this.settingsService = settingsService;
        this.kmzParserService = kmzParserService;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getSettings() {
        return new ResponseEntity<>(settingsService.getAllSettings(), HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Void> updateSettings(@RequestBody Map<String, String> newSettings) {
        if (newSettings != null) {
            for (Map.Entry<String, String> entry : newSettings.entrySet()) {
                settingsService.saveSetting(entry.getKey(), entry.getValue());
            }
        }
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/coverage-map")
    public ResponseEntity<List<KmzParserService.CoveragePolygon>> getCoverageMap() {
        String kmzPath = settingsService.getSetting("ai.coverage.kmz");
        if (kmzPath == null || kmzPath.trim().isEmpty()) {
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.OK);
        }

        File file = getPhysicalFile(kmzPath);
        if (file == null || !file.exists()) {
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.OK);
        }

        try {
            List<KmzParserService.CoveragePolygon> polygons = kmzParserService.parseGeoFile(file);
            return new ResponseEntity<>(polygons, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public static class PolygonRequest {
        public String name;
        public List<KmzParserService.Point> vertices;
    }

    @PostMapping("/save-kml-polygons")
    public ResponseEntity<Map<String, String>> saveKmlPolygons(@RequestBody List<PolygonRequest> polygonRequests) {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            sb.append("<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n");
            sb.append("  <Document>\n");
            sb.append("    <name>Zonas de Cobertura Web</name>\n");

            for (PolygonRequest poly : polygonRequests) {
                sb.append("    <Placemark>\n");
                sb.append("      <name>").append(poly.name).append("</name>\n");
                sb.append("      <Polygon>\n");
                sb.append("        <outerBoundaryIs>\n");
                sb.append("          <LinearRing>\n");
                sb.append("            <coordinates>\n");

                for (KmzParserService.Point pt : poly.vertices) {
                    sb.append("              ").append(pt.lng).append(",").append(pt.lat).append(",0\n");
                }
                if (!poly.vertices.isEmpty()) {
                    KmzParserService.Point first = poly.vertices.get(0);
                    sb.append("              ").append(first.lng).append(",").append(first.lat).append(",0\n");
                }

                sb.append("            </coordinates>\n");
                sb.append("          </LinearRing>\n");
                sb.append("        </outerBoundaryIs>\n");
                sb.append("      </Polygon>\n");
                sb.append("    </Placemark>\n");
            }

            sb.append("  </Document>\n");
            sb.append("</kml>\n");

            String uploadDir = "/app/uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String filename = "drawn_coverage_" + System.currentTimeMillis() + ".kml";
            File destFile = new File(dir, filename);
            Files.writeString(destFile.toPath(), sb.toString(), StandardCharsets.UTF_8);

            String localPath = "/uploads/" + filename;

            // Guardar configuración
            settingsService.saveSetting("ai.coverage.kmz", localPath);

            return new ResponseEntity<>(Map.of("url", localPath), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/test-meta")
    public ResponseEntity<Map<String, Object>> testMetaConnection(@RequestBody(required = false) Map<String, String> body) {
        String token = (body != null && body.containsKey("token") && !body.get("token").trim().isEmpty())
                ? body.get("token").trim()
                : settingsService.getSetting("whatsapp.api.token");
        String phoneId = (body != null && body.containsKey("phoneId") && !body.get("phoneId").trim().isEmpty())
                ? body.get("phoneId").trim()
                : settingsService.getSetting("whatsapp.phone.id");
        String version = (body != null && body.containsKey("version") && !body.get("version").trim().isEmpty())
                ? body.get("version").trim()
                : settingsService.getSetting("whatsapp.api.version");
        if (version == null || version.trim().isEmpty()) version = "v18.0";

        if (token == null || token.trim().isEmpty() || phoneId == null || phoneId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Token de Meta o Phone Number ID no configurado."
            ));
        }

        // Sanitización y validación estricta de parámetros
        if (!version.matches("^v[0-9.]+$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Versión de Meta Graph API inválida. Ejemplo: v18.0"
            ));
        }
        if (!phoneId.matches("^[0-9]+$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Phone Number ID debe contener exclusivamente dígitos numéricos."
            ));
        }

        try {
            String url = String.format("https://graph.facebook.com/%s/%s?fields=verified_name,code_verification_status,display_phone_number,quality_rating", version, phoneId);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(token);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Conexión a Meta Cloud API verificada con éxito",
                    "data", response.getBody() != null ? response.getBody() : Map.of()
            ));
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "statusCode", e.getStatusCode().value(),
                    "error", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/test-gemini")
    public ResponseEntity<Map<String, Object>> testGeminiConnection(@RequestBody(required = false) Map<String, String> body) {
        String apiKey = (body != null && body.containsKey("apiKey") && !body.get("apiKey").trim().isEmpty())
                ? body.get("apiKey").trim()
                : settingsService.getSetting("gemini.api.key");
        String model = (body != null && body.containsKey("model") && !body.get("model").trim().isEmpty())
                ? body.get("model").trim()
                : settingsService.getSetting("gemini.model");
        if (model == null || model.trim().isEmpty()) model = "gemini-1.5-flash";

        if (apiKey == null || apiKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "API Key de Gemini no configurada."
            ));
        }

        // Sanitización del identificador del modelo
        if (!model.matches("^[a-zA-Z0-9._-]+$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Identificador de modelo de Gemini inválido."
            ));
        }

        try {
            String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            Map<String, Object> part = Map.of("text", "Responde únicamente 'OK'");
            Map<String, Object> content = Map.of("parts", List.of(part));
            Map<String, Object> reqBody = Map.of("contents", List.of(content));

            org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(reqBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Conexión con Google Gemini exitosa",
                    "model", model,
                    "raw", response.getBody() != null ? response.getBody() : ""
            ));
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "statusCode", e.getStatusCode().value(),
                    "error", e.getResponseBodyAsString()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    private File getPhysicalFile(String webPath) {
        if (webPath == null || webPath.trim().isEmpty()) return null;
        try {
            File baseDir = new File("/app/uploads/").getCanonicalFile();
            // Extraer estrictamente solo el nombre de archivo seguro
            String cleanName = java.nio.file.Paths.get(webPath).getFileName().toString();
            File resolved = new File(baseDir, cleanName).getCanonicalFile();
            if (!resolved.getPath().startsWith(baseDir.getPath())) {
                return null;
            }
            return resolved;
        } catch (Exception e) {
            return null;
        }
    }
}

