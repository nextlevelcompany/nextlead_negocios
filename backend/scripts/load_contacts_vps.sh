#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GZ_FILE="$SCRIPT_DIR/contacts_data.sql.gz"

if [ ! -f "$GZ_FILE" ]; then
    echo "Error: No se encontró el archivo $GZ_FILE"
    exit 1
fi

echo "=========================================================="
echo "  NEXTLEAD CRM - CARGA DE CONTACTOS AL POSTGRES DEL VPS"
echo "=========================================================="
echo "1. Descomprimiendo y restaurando datos en nextlead_postgres..."

# Deshabilitar triggers durante la restauración masiva
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "ALTER TABLE contacts DISABLE TRIGGER trg_new_contact_opportunity;"

gunzip -c "$GZ_FILE" | docker exec -i nextlead_postgres psql -U postgres -d nextlead -q

# Rehabilitar triggers
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity;"

echo "2. Verificando conteo de contactos restaurados..."
docker exec -i nextlead_postgres psql -U postgres -d nextlead -c "
SELECT 
    COUNT(*) as total_contactos,
    COUNT(*) FILTER (WHERE tipo_persona = 'EMPRESA') as total_empresas,
    COUNT(*) FILTER (WHERE tipo_persona = 'NATURAL') as total_naturales
FROM contacts;
"
echo "=========================================================="
echo ">>> ¡Carga de contactos completada exitosamente!"
echo "=========================================================="
