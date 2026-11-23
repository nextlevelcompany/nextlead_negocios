# Stage 1: Build stage (usando la imagen cacheada en el VPS con IPv4 forzado)
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Forzar resolución estricta por IPv4 ante la falta de enrutamiento IPv6 del VPS
ENV MAVEN_OPTS="-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true -Dmaven.wagon.http.retryHandler.count=5 -Dhttp.keepAlive=false -Dmaven.wagon.http.pool=false"

COPY pom.xml .
COPY src ./src

# Compilación batch con reintentos y tolerancia a latencia de red
RUN mvn clean package -DskipTests --batch-mode \
    -Djava.net.preferIPv4Stack=true \
    -Djava.net.preferIPv4Addresses=true \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dhttp.keepAlive=false

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/nextlead-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.net.preferIPv4Stack=true", "-jar", "app.jar"]
