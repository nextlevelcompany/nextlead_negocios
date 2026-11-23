package com.nextlead.wspai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class KmzParserService {

    private static final Logger logger = LoggerFactory.getLogger(KmzParserService.class);

    public static class Point {
        public final double lat;
        public final double lng;

        public Point(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }

        @Override
        public String toString() {
            return "(" + lat + "," + lng + ")";
        }
    }

    public static class CoveragePolygon {
        private String name;
        private List<Point> vertices;

        public CoveragePolygon(String name, List<Point> vertices) {
            this.name = name;
            this.vertices = vertices;
        }

        public String getName() {
            return name;
        }

        public List<Point> getVertices() {
            return vertices;
        }
    }

    /**
     * Checks if a GPS point (latitude, longitude) is inside a KML/KMZ coverage zone.
     * Returns the name of the matching zone, or null if no match is found.
     */
    public String checkCoverage(double lat, double lng, File geoFile) {
        if (geoFile == null || !geoFile.exists()) {
            logger.warn("El archivo de cobertura geográfica no existe o es nulo.");
            return null;
        }

        try {
            List<CoveragePolygon> polygons = parseGeoFile(geoFile);
            logger.info("Se cargaron {} polígonos del archivo {}", polygons.size(), geoFile.getName());
            
            for (CoveragePolygon polygon : polygons) {
                if (isPointInPolygon(lat, lng, polygon.getVertices())) {
                    logger.info("📍 Punto ({}, {}) coincide con polígono: {}", lat, lng, polygon.getName());
                    return polygon.getName();
                }
            }
        } catch (Exception e) {
            logger.error("Error al procesar el archivo KMZ/KML: {}", e.getMessage(), e);
        }
        return null;
    }

    /**
     * Parses KML or KMZ files into a list of CoveragePolygon objects.
     */
    public List<CoveragePolygon> parseGeoFile(File file) throws Exception {
        String kmlContent;
        if (file.getName().toLowerCase().endsWith(".kmz")) {
            kmlContent = getKmlContentFromKmz(file);
        } else if (file.getName().toLowerCase().endsWith(".kml")) {
            kmlContent = Files.readString(file.toPath(), StandardCharsets.UTF_8);
        } else {
            throw new IllegalArgumentException("Extensión de archivo no soportada. Use .kml o .kmz");
        }

        return parseKmlXml(kmlContent);
    }

    private String getKmlContentFromKmz(File kmzFile) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(kmzFile))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().toLowerCase().endsWith(".kml")) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buffer = new byte[4096];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        baos.write(buffer, 0, len);
                    }
                    return baos.toString(StandardCharsets.UTF_8);
                }
            }
        }
        throw new IOException("No se encontró ningún archivo .kml dentro del archivo KMZ");
    }

    private List<CoveragePolygon> parseKmlXml(String kmlContent) throws Exception {
        List<CoveragePolygon> list = new ArrayList<>();
        
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Evitar vulnerabilidades XXE al desactivar resolución de entidades externas DTD
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        
        Document doc = builder.parse(new ByteArrayInputStream(kmlContent.getBytes(StandardCharsets.UTF_8)));
        NodeList placemarks = doc.getElementsByTagName("Placemark");
        
        for (int i = 0; i < placemarks.getLength(); i++) {
            Element placemark = (Element) placemarks.item(i);
            
            // Obtener el nombre del polígono (zona)
            String name = "";
            NodeList nameNodes = placemark.getElementsByTagName("name");
            if (nameNodes.getLength() > 0) {
                name = nameNodes.item(0).getTextContent().trim();
            }
            
            // Buscar polígonos
            NodeList polygons = placemark.getElementsByTagName("Polygon");
            if (polygons.getLength() > 0) {
                NodeList coordsNodes = placemark.getElementsByTagName("coordinates");
                if (coordsNodes.getLength() > 0) {
                    String coordsText = coordsNodes.item(0).getTextContent();
                    List<Point> vertices = parseCoordinates(coordsText);
                    if (vertices.size() >= 3) {
                        list.add(new CoveragePolygon(name, vertices));
                    }
                }
            }
        }
        
        return list;
    }

    private List<Point> parseCoordinates(String coordsText) {
        List<Point> points = new ArrayList<>();
        // Las coordenadas en KML son: lng,lat,alt o lng,lat separadas por espacios o saltos de línea
        String[] tuples = coordsText.trim().split("\\s+");
        for (String tuple : tuples) {
            if (tuple.trim().isEmpty()) continue;
            String[] parts = tuple.split(",");
            if (parts.length >= 2) {
                try {
                    double lng = Double.parseDouble(parts[0].trim());
                    double lat = Double.parseDouble(parts[1].trim());
                    points.add(new Point(lat, lng));
                } catch (NumberFormatException e) {
                    // Ignorar coordenadas mal formadas
                }
            }
        }
        return points;
    }

    /**
     * Jordan Curve Theorem / Ray-Casting algorithm for Point-in-Polygon (PIP) check.
     */
    public boolean isPointInPolygon(double lat, double lng, List<Point> polygon) {
        boolean inside = false;
        int n = polygon.size();
        for (int i = 0, j = n - 1; i < n; j = i++) {
            double xi = polygon.get(i).lng;
            double yi = polygon.get(i).lat;
            double xj = polygon.get(j).lng;
            double yj = polygon.get(j).lat;

            boolean intersect = ((yi > lat) != (yj > lat))
                    && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }
}
