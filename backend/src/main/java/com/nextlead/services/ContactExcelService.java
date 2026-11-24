package com.nextlead.services;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

@Service
public class ContactExcelService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public ContactExcelService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Genera un archivo Excel (.xlsx) de muestra con encabezados estándar y filas de ejemplo.
     */
    public byte[] generateSampleTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Contactos");

            // Estilos
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 10);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            Font dataFont = workbook.createFont();
            dataFont.setFontHeightInPoints((short) 9);
            dataStyle.setFont(dataFont);

            String[] headers = {
                "TIPO_PERSONA",         // EMPRESA | NATURAL
                "TIPO_DOCUMENTO",       // RUC | DNI | CE
                "NUMERO_DOCUMENTO",     // 20601234567 o 45678912
                "RAZON_SOCIAL_O_NOMBRE",// Razón Social para Empresa, o Nombre para Natural
                "APELLIDOS",            // Apellidos (solo para Natural)
                "TELEFONO_PRINCIPAL",   // 987654321
                "TELEFONO_SECUNDARIO",  // Opcional
                "EMAIL",                // contacto@empresa.com
                "DEPARTAMENTO",         // LIMA
                "PROVINCIA",            // LIMA
                "DISTRITO",             // SAN ISIDRO
                "DIRECCION",            // Av. Canaval y Moreyra 450
                "CARGO",                // Gerente General / Administrador
                "SEMAFORO_EXPERIAN",    // VERDE / AMARILLO / ROJO / GRIS
                "SCORE_EXPERIAN",       // 750 (opcional)
                "DEUDA_SBS",            // 0.00 (opcional)
                "CALIFICACION_SBS",     // NORMAL / CPP / DEFICIENTE (opcional)
                "RANGO_VENTAS"          // [300000.00-500000.00] (opcional)
            };

            // Fila de encabezado
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Fila 1 de Ejemplo (EMPRESA)
            Row row1 = sheet.createRow(1);
            row1.createCell(0).setCellValue("EMPRESA");
            row1.createCell(1).setCellValue("RUC");
            row1.createCell(2).setCellValue("20608778323");
            row1.createCell(3).setCellValue("SOLUCIONES LOGISTICAS PERU S.A.C.");
            row1.createCell(4).setCellValue("");
            row1.createCell(5).setCellValue("934525647");
            row1.createCell(6).setCellValue("014567890");
            row1.createCell(7).setCellValue("contacto@solucionesperu.pe");
            row1.createCell(8).setCellValue("LIMA");
            row1.createCell(9).setCellValue("LIMA");
            row1.createCell(10).setCellValue("MIRAFLORES");
            row1.createCell(11).setCellValue("Av. Jose Pardo 550 Of. 802");
            row1.createCell(12).setCellValue("GERENTE GENERAL");
            row1.createCell(13).setCellValue("VERDE");
            row1.createCell(14).setCellValue(780);
            row1.createCell(15).setCellValue(0.00);
            row1.createCell(16).setCellValue("NORMAL");
            row1.createCell(17).setCellValue("[300000.00-466297.00]");

            // Fila 2 de Ejemplo (PERSONA NATURAL)
            Row row2 = sheet.createRow(2);
            row2.createCell(0).setCellValue("NATURAL");
            row2.createCell(1).setCellValue("DNI");
            row2.createCell(2).setCellValue("47895621");
            row2.createCell(3).setCellValue("CARLOS ALBERTO");
            row2.createCell(4).setCellValue("MENDOZA RIVAS");
            row2.createCell(5).setCellValue("998765432");
            row2.createCell(6).setCellValue("");
            row2.createCell(7).setCellValue("carlos.mendoza@gmail.com");
            row2.createCell(8).setCellValue("LIMA");
            row2.createCell(9).setCellValue("LIMA");
            row2.createCell(10).setCellValue("SAN ISIDRO");
            row2.createCell(11).setCellValue("Calle Las Palmeras 185");
            row2.createCell(12).setCellValue("JEFE DE COMPRAS");
            row2.createCell(13).setCellValue("AMARILLO");
            row2.createCell(14).setCellValue(620);
            row2.createCell(15).setCellValue(2500.00);
            row2.createCell(16).setCellValue("CPP");
            row2.createCell(17).setCellValue("");

            // Ajustar anchos
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.max(currentWidth + 1000, 3500));
            }

            // Hoja de Instrucciones
            Sheet infoSheet = workbook.createSheet("Instrucciones");
            Row r0 = infoSheet.createRow(0);
            r0.createCell(0).setCellValue("GUÍA DE CARGA MASIVA DE CONTACTOS NEXTLEAD");
            infoSheet.createRow(2).createCell(0).setCellValue("1. TIPO_PERSONA: Debe ser 'EMPRESA' o 'NATURAL'.");
            infoSheet.createRow(3).createCell(0).setCellValue("2. TIPO_DOCUMENTO: 'RUC' (11 dígitos para empresas), 'DNI' (8 dígitos) o 'CE'.");
            infoSheet.createRow(4).createCell(0).setCellValue("3. Si la empresa ya existe (mismo RUC), se actualizarán sus datos si activas la casilla 'Actualizar existentes'.");
            infoSheet.createRow(5).createCell(0).setCellValue("4. Las columnas de Experian (Semáforo, Score, Deuda, etc.) son opcionales pero recomendadas para prospección B2B.");
            infoSheet.createRow(6).createCell(0).setCellValue("5. Nota: Si tienes una base directa de Experian con columnas como TIPO_DOC, NRO_DOC, RAZON_SOCIAL, NOMBRE_RL, etc., ¡también puedes subirla directamente!");
            infoSheet.autoSizeColumn(0);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar plantilla Excel: " + e.getMessage(), e);
        }
    }

    /**
     * Importa contactos desde un archivo Excel (.xlsx o .xls).
     * Soporta automáticamente tanto la plantilla estándar como el formato Experian.
     */
    @Transactional
    public Map<String, Object> importExcel(InputStream inputStream, boolean updateExisting) {
        int totalProcessed = 0;
        int created = 0;
        int updated = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getLastRowNum() < 1) {
                return Map.of("success", false, "message", "El archivo Excel no contiene filas de datos.");
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return Map.of("success", false, "message", "No se encontró fila de encabezados en el archivo.");
            }

            // Mapear encabezados
            Map<String, Integer> colMap = new HashMap<>();
            for (Cell cell : headerRow) {
                String val = getCellValue(cell).toUpperCase().trim();
                colMap.put(val, cell.getColumnIndex());
            }

            // Detectar formato: ¿Experian Raw o Estándar?
            boolean isExperianRaw = colMap.containsKey("NRO_DOC") && colMap.containsKey("RAZON_SOCIAL") && colMap.containsKey("NOMBRE_RL");

            // Deshabilitar trigger de oportunidad automática durante carga masiva para máximo rendimiento
            try {
                jdbcTemplate.execute("ALTER TABLE contacts DISABLE TRIGGER trg_new_contact_opportunity;");
            } catch (Exception ignored) {}

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                try {
                    if (isExperianRaw) {
                        // Procesar formato Experian (Empresa + Representante Legal + Dirección)
                        String nroDoc = getRowValue(row, colMap, "NRO_DOC");
                        String razonSocial = getRowValue(row, colMap, "RAZON_SOCIAL");
                        if (nroDoc.isBlank() && razonSocial.isBlank()) continue;

                        String tipoDoc = getRowValue(row, colMap, "TIPO_DOC");
                        if (tipoDoc.isBlank()) tipoDoc = "RUC";

                        String semaforo = getRowValue(row, colMap, "SEMAFORO_ACTUAL");
                        Double score = getDoubleValue(row, colMap, "SCORE_NOTA");
                        Double deuda = getDoubleValue(row, colMap, "DEUDA_TOTAL_SBS");
                        String calif = getRowValue(row, colMap, "CALIFICACION_SBS");
                        String rangoVta = getRowValue(row, colMap, "RANGO_VTA");
                        Integer nroEntidades = getIntValue(row, colMap, "NRO_ENTIDADES");

                        String nombreRl = getRowValue(row, colMap, "NOMBRE_RL");
                        String celRl = getRowValue(row, colMap, "CELULAR_RL");
                        String emailRl = getRowValue(row, colMap, "EMAIL_RL");

                        String dpto = getRowValue(row, colMap, "DPTO_FISCAL");
                        String prov = getRowValue(row, colMap, "PROV_FISCAL");
                        String dist = getRowValue(row, colMap, "DIST_FISCAL");
                        String direccion = getRowValue(row, colMap, "DIRECCION_FISCAL");
                        String ubigeo = getRowValue(row, colMap, "UBIGEO_FISCAL");

                        // 1. Empresa
                        Long empresaId = null;
                        List<Long> existingEmp = jdbcTemplate.queryForList(
                            "SELECT id FROM contacts WHERE numero_documento = ? AND tipo_persona = 'EMPRESA' LIMIT 1",
                            Long.class, nroDoc
                        );

                        if (!existingEmp.isEmpty()) {
                            empresaId = existingEmp.get(0);
                            if (updateExisting) {
                                jdbcTemplate.update(
                                    "UPDATE contacts SET razon_social = ?, telefono_principal = COALESCE(NULLIF(?, ''), telefono_principal), " +
                                    "email = COALESCE(NULLIF(?, ''), email), semaforo_experian = ?, score_experian = ?, deuda_sbs = ?, " +
                                    "calificacion_sbs = ?, rango_ventas = ?, nro_entidades = ? WHERE id = ?",
                                    razonSocial, celRl, emailRl, semaforo, score, deuda, calif, rangoVta, nroEntidades, empresaId
                                );
                                updated++;
                            }
                        } else {
                            empresaId = jdbcTemplate.queryForObject(
                                "INSERT INTO contacts (tipo_persona, tipo_documento, numero_documento, razon_social, " +
                                "telefono_principal, email, semaforo_experian, score_experian, deuda_sbs, calificacion_sbs, " +
                                "rango_ventas, nro_entidades, referencia, status, date_created) " +
                                "VALUES ('EMPRESA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importado Excel', 'Lead', NOW()) RETURNING id",
                                Long.class,
                                tipoDoc, nroDoc, razonSocial, celRl, emailRl, semaforo, score, deuda, calif, rangoVta, nroEntidades
                            );
                            created++;
                        }

                        // 2. Dirección de la Empresa
                        saveDireccion(empresaId, ubigeo, dpto, prov, dist, direccion);

                        // 3. Representante Legal (Persona Natural vinculada)
                        if (empresaId != null && !nombreRl.isBlank()) {
                            List<Long> existingRl = jdbcTemplate.queryForList(
                                "SELECT id FROM contacts WHERE empresa_id = ? AND nombres = ? LIMIT 1",
                                Long.class, empresaId, nombreRl
                            );
                            if (existingRl.isEmpty()) {
                                jdbcTemplate.update(
                                    "INSERT INTO contacts (tipo_persona, tipo_documento, numero_documento, nombres, apellidos, " +
                                    "telefono_principal, email, cargo, empresa_id, status, referencia, date_created) " +
                                    "VALUES ('NATURAL', 'DNI', NULL, ?, '', ?, ?, 'REPRESENTANTE LEGAL', ?, 'Lead', 'Importado Excel', NOW())",
                                    nombreRl, celRl, emailRl, empresaId
                                );
                                created++;
                            }
                        }

                    } else {
                        // Formato Estándar NextLead
                        String tipoPersona = getRowValue(row, colMap, "TIPO_PERSONA");
                        if (tipoPersona.isBlank()) tipoPersona = "EMPRESA";
                        tipoPersona = tipoPersona.toUpperCase().contains("NAT") ? "NATURAL" : "EMPRESA";

                        String tipoDoc = getRowValue(row, colMap, "TIPO_DOCUMENTO");
                        if (tipoDoc.isBlank()) tipoDoc = "EMPRESA".equals(tipoPersona) ? "RUC" : "DNI";

                        String numDoc = getRowValue(row, colMap, "NUMERO_DOCUMENTO");
                        String nombreOrazon = getRowValue(row, colMap, "RAZON_SOCIAL_O_NOMBRE");
                        if (numDoc.isBlank() && nombreOrazon.isBlank()) continue;

                        String apellidos = getRowValue(row, colMap, "APELLIDOS");
                        String tel1 = getRowValue(row, colMap, "TELEFONO_PRINCIPAL");
                        String tel2 = getRowValue(row, colMap, "TELEFONO_SECUNDARIO");
                        String email = getRowValue(row, colMap, "EMAIL");
                        String cargo = getRowValue(row, colMap, "CARGO");

                        String dpto = getRowValue(row, colMap, "DEPARTAMENTO");
                        String prov = getRowValue(row, colMap, "PROVINCIA");
                        String dist = getRowValue(row, colMap, "DISTRITO");
                        String direccion = getRowValue(row, colMap, "DIRECCION");

                        String semaforo = getRowValue(row, colMap, "SEMAFORO_EXPERIAN");
                        Double score = getDoubleValue(row, colMap, "SCORE_EXPERIAN");
                        Double deuda = getDoubleValue(row, colMap, "DEUDA_SBS");
                        String calif = getRowValue(row, colMap, "CALIFICACION_SBS");
                        String rangoVta = getRowValue(row, colMap, "RANGO_VENTAS");

                        Long contactId = null;
                        List<Long> existingList = Collections.emptyList();
                        if (!numDoc.isBlank()) {
                            existingList = jdbcTemplate.queryForList(
                                "SELECT id FROM contacts WHERE numero_documento = ? LIMIT 1", Long.class, numDoc
                            );
                        }

                        if (!existingList.isEmpty()) {
                            contactId = existingList.get(0);
                            if (updateExisting) {
                                if ("EMPRESA".equals(tipoPersona)) {
                                    jdbcTemplate.update(
                                        "UPDATE contacts SET razon_social = ?, telefono_principal = COALESCE(NULLIF(?, ''), telefono_principal), " +
                                        "telefono_secundario = COALESCE(NULLIF(?, ''), telefono_secundario), email = COALESCE(NULLIF(?, ''), email), " +
                                        "cargo = COALESCE(NULLIF(?, ''), cargo), semaforo_experian = COALESCE(NULLIF(?, ''), semaforo_experian), " +
                                        "score_experian = COALESCE(?, score_experian), deuda_sbs = COALESCE(?, deuda_sbs), " +
                                        "calificacion_sbs = COALESCE(NULLIF(?, ''), calificacion_sbs), rango_ventas = COALESCE(NULLIF(?, ''), rango_ventas) " +
                                        "WHERE id = ?",
                                        nombreOrazon, tel1, tel2, email, cargo, semaforo, score, deuda, calif, rangoVta, contactId
                                    );
                                } else {
                                    jdbcTemplate.update(
                                        "UPDATE contacts SET nombres = ?, apellidos = ?, telefono_principal = COALESCE(NULLIF(?, ''), telefono_principal), " +
                                        "telefono_secundario = COALESCE(NULLIF(?, ''), telefono_secundario), email = COALESCE(NULLIF(?, ''), email), " +
                                        "cargo = COALESCE(NULLIF(?, ''), cargo) WHERE id = ?",
                                        nombreOrazon, apellidos, tel1, tel2, email, cargo, contactId
                                    );
                                }
                                updated++;
                            }
                        } else {
                            if ("EMPRESA".equals(tipoPersona)) {
                                contactId = jdbcTemplate.queryForObject(
                                    "INSERT INTO contacts (tipo_persona, tipo_documento, numero_documento, razon_social, " +
                                    "telefono_principal, telefono_secundario, email, cargo, semaforo_experian, score_experian, " +
                                    "deuda_sbs, calificacion_sbs, rango_ventas, referencia, status, date_created) " +
                                    "VALUES ('EMPRESA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importado Excel', 'Lead', NOW()) RETURNING id",
                                    Long.class,
                                    tipoDoc, numDoc, nombreOrazon, tel1, tel2, email, cargo, semaforo, score, deuda, calif, rangoVta
                                );
                            } else {
                                contactId = jdbcTemplate.queryForObject(
                                    "INSERT INTO contacts (tipo_persona, tipo_documento, numero_documento, nombres, apellidos, " +
                                    "telefono_principal, telefono_secundario, email, cargo, referencia, status, date_created) " +
                                    "VALUES ('NATURAL', ?, ?, ?, ?, ?, ?, ?, ?, 'Importado Excel', 'Lead', NOW()) RETURNING id",
                                    Long.class,
                                    tipoDoc, numDoc, nombreOrazon, apellidos, tel1, tel2, email, cargo
                                );
                            }
                            created++;
                        }

                        // Dirección
                        saveDireccion(contactId, null, dpto, prov, dist, direccion);
                    }

                    totalProcessed++;
                } catch (Exception ex) {
                    errors.add("Fila " + (r + 1) + ": " + ex.getMessage());
                    if (errors.size() > 50) {
                        errors.add("Se alcanzaron más de 50 advertencias; procesamiento continuó.");
                    }
                }
            }

            // Rehabilitar trigger de oportunidad
            try {
                jdbcTemplate.execute("ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity;");
            } catch (Exception ignored) {}

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("totalProcessed", totalProcessed);
            res.put("created", created);
            res.put("updated", updated);
            res.put("errors", errors);
            return res;

        } catch (Exception e) {
            throw new RuntimeException("Error procesando Excel: " + e.getMessage(), e);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void saveDireccion(Long contactId, String ubigeo, String dpto, String prov, String dist, String direccion) {
        if (contactId == null) return;
        String dirCompleta = direccion != null && !direccion.isBlank() ? direccion.trim() : "";
        if (dirCompleta.isBlank() && dist != null && !dist.isBlank()) {
            dirCompleta = (dist + (prov != null && !prov.isBlank() ? ", " + prov : "") + (dpto != null && !dpto.isBlank() ? " - " + dpto : "")).trim();
        }
        if (dirCompleta.isBlank()) return;

        String codUbigeo = ubigeo != null && !ubigeo.isBlank() ? ubigeo.trim() : null;
        if (codUbigeo == null && dist != null && !dist.isBlank()) {
            try {
                List<String> ubs = jdbcTemplate.queryForList(
                    "SELECT codigo_ubigeo FROM ubigeo_peru WHERE LOWER(distrito) = LOWER(?) LIMIT 1",
                    String.class, dist.trim()
                );
                if (!ubs.isEmpty()) codUbigeo = ubs.get(0);
            } catch (Exception ignored) {}
        }

        try {
            int dirCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM direcciones WHERE id_contacto = ?", Integer.class, contactId
            );
            if (dirCount == 0) {
                jdbcTemplate.update(
                    "INSERT INTO direcciones (id_contacto, nombre_ubicacion, codigo_ubigeo, direccion_completa, referencia) " +
                    "VALUES (?, 'Fiscal', ?, ?, ?)",
                    contactId, codUbigeo, dirCompleta, (dist != null && !dist.isBlank() ? dist + ", " + dpto : null)
                );
            }
        } catch (Exception ignored) {}
    }

    private String getRowValue(Row row, Map<String, Integer> colMap, String colName) {
        Integer idx = colMap.get(colName.toUpperCase());
        if (idx == null) return "";
        Cell c = row.getCell(idx);
        return getCellValue(c);
    }

    private Double getDoubleValue(Row row, Map<String, Integer> colMap, String colName) {
        String val = getRowValue(row, colMap, colName);
        if (val.isBlank()) return null;
        try {
            return Double.parseDouble(val.replace(",", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private Integer getIntValue(Row row, Map<String, Integer> colMap, String colName) {
        Double d = getDoubleValue(row, colMap, colName);
        return d != null ? d.intValue() : null;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                double num = cell.getNumericCellValue();
                if (num == (long) num) {
                    return String.format(Locale.US, "%d", (long) num);
                }
                return String.format(Locale.US, "%.2f", num);
            case BOOLEAN:
                return Boolean.toString(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return "";
        }
    }
}
