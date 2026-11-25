#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GZ_FILE="$SCRIPT_DIR/contacts_data.sql.gz"
FIX_SQL="$SCRIPT_DIR/fix_vps_database.sql"

echo "=========================================================="
echo "  NEXTLEAD CRM - CARGA Y CORRECCIÓN COMPLETA EN VPS"
echo "=========================================================="

# 1. Aplicar correcciones de esquema (roles_sistema, IA, shipping)
if [ -f "$FIX_SQL" ]; then
    echo "1. Aplicando esquema roles_sistema y columnas faltantes de IA..."
    docker exec -i nextlead_postgres psql -U postgres -d nextlead -f - < "$FIX_SQL"
fi

if [ ! -f "$GZ_FILE" ]; then
    echo "Advertencia: No se encontró el archivo $GZ_FILE para restaurar contactos."
    exit 0
fi

echo "2. Preparando base de datos para carga masiva de contactos..."
# Deshabilitar triggers de manera segura (solo si existen) y limpiar registros semilla
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "
DO \$\$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_contact_opportunity') THEN 
        ALTER TABLE contacts DISABLE TRIGGER trg_new_contact_opportunity; 
    END IF; 
END \$\$;
TRUNCATE TABLE direcciones, contacts RESTART IDENTITY CASCADE;
"

echo "3. Descomprimiendo y restaurando 52,483 contactos B2B en nextlead_postgres..."
gunzip -c "$GZ_FILE" | docker exec -i nextlead_postgres psql -U postgres -d nextlead -q

echo "4. Reactivando triggers y ajustando secuencias..."
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "
DO \$\$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_contact_opportunity') THEN 
        ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity; 
    END IF; 
END \$\$;
SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1));
SELECT setval('direcciones_id_seq', COALESCE((SELECT MAX(id) FROM direcciones), 1));
"

echo "5. Verificando conteo de contactos restaurados..."
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "
SELECT 
    COUNT(*) as total_contactos,
    COUNT(*) FILTER (WHERE tipo_persona = 'EMPRESA') as total_empresas,
    COUNT(*) FILTER (WHERE tipo_persona = 'NATURAL') as total_naturales
FROM contacts;
"
echo "=========================================================="
echo ">>> ¡Carga y corrección completada exitosamente!"
echo "=========================================================="
