# Stage 1: Build stage (usando Debian/glibc para máxima compatibilidad DNS en VPS y Dokploy)
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Forzar IPv4 y tolerancia ante microcortes de red en VPS
ENV MAVEN_OPTS="-Djava.net.preferIPv4Stack=true -Dmaven.wagon.http.retryHandler.count=5 -Dhttp.keepAlive=false -Dmaven.wagon.http.pool=false"

# Copiar configuración y código fuente
COPY pom.xml .
COPY src ./src

# Compilar proyecto en modo batch con reintentos automáticos
RUN mvn clean package -DskipTests --batch-mode \
    -Djava.net.preferIPv4Stack=true \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dhttp.keepAlive=false

# Stage 2: Run stage (imagen ligera de ejecución)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/nextlead-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
