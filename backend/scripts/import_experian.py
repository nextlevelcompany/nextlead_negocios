import openpyxl
import csv
import subprocess
import os
import sys
import time

def main():
    excel_path = 'BD EXPERIAN 26,000.xlsx'
    csv_path = 'scratch/experian_data.csv'
    os.makedirs('scratch', exist_ok=True)
    
    print(f">>> [1/5] Leyendo archivo Excel: {excel_path}...")
    t0 = time.time()
    wb = openpyxl.load_workbook(excel_path, read_only=True)
    sheet = wb.active
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows)
    print(f">>> Cabeceras: {headers}")

    print(f">>> [2/5] Exportando a CSV para carga ultrarrápida...")
    row_count = 0
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, delimiter='\t', quoting=csv.QUOTE_MINIMAL)
        for row in rows:
            if not any(row):
                continue
            # Sanitizar campos
            clean_row = []
            for cell in row:
                if cell is None:
                    clean_row.append('')
                else:
                    s = str(cell).replace('\t', ' ').replace('\r', ' ').replace('\n', ' ').strip()
                    clean_row.append(s)
            writer.writerow(clean_row)
            row_count += 1
            if row_count % 5000 == 0:
                print(f"    Procesadas {row_count} filas...")

    t1 = time.time()
    print(f">>> CSV generado con éxito: {row_count} registros en {t1 - t0:.2f}s")

    print(">>> [3/5] Creando tabla de staging en PostgreSQL...")
    init_sql = """
    ALTER TABLE contacts DISABLE TRIGGER trg_new_contact_opportunity;

    CREATE TABLE IF NOT EXISTS experian_raw (
        tipo_documento VARCHAR(20),
        nro_documento VARCHAR(20),
        razon_social VARCHAR(250),
        nro_entidades INTEGER,
        score_nota NUMERIC(10,4),
        semaforo_actual VARCHAR(20),
        deuda_total_sbs NUMERIC(14,2),
        calificacion_sbs VARCHAR(50),
        rango_vta VARCHAR(100),
        nombre_rl VARCHAR(200),
        celular_rl VARCHAR(20),
        email_rl VARCHAR(150),
        ubigeo_fiscal VARCHAR(10),
        dpto_fiscal VARCHAR(100),
        prov_fiscal VARCHAR(100),
        dist_fiscal VARCHAR(100),
        direccion_fiscal TEXT
    );
    TRUNCATE TABLE experian_raw;
    """
    cmd_init = ["docker", "exec", "-i", "nextlead_postgres", "psql", "-U", "postgres", "-d", "nextlead", "-c", init_sql]
    subprocess.run(cmd_init, check=True)

    print(">>> [4/5] Copiando datos masivamente a staging (COPY)...")
    copy_sql = "COPY experian_raw FROM STDIN WITH (FORMAT csv, DELIMITER E'\\t', HEADER false, NULL '');"
    cmd_copy = ["docker", "exec", "-i", "nextlead_postgres", "psql", "-U", "postgres", "-d", "nextlead", "-c", copy_sql]
    with open(csv_path, 'rb') as f:
        p = subprocess.Popen(cmd_copy, stdin=f, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = p.communicate()
        if p.returncode != 0:
            print(f"Error en COPY: {stderr.decode('utf-8')}")
            sys.exit(1)
        print(f"Resultado COPY: {stdout.decode('utf-8').strip()}")

    print(">>> [5/5] Ejecutando sincronización de Empresas, Direcciones y Representantes Legales...")
    sync_sql = """
    BEGIN;

    -- 1. Insertar Ubigeos que falten en el catálogo maestro
    INSERT INTO ubigeo_peru (codigo_ubigeo, departamento, provincia, distrito)
    SELECT DISTINCT ubigeo_fiscal, dpto_fiscal, prov_fiscal, dist_fiscal
    FROM experian_raw
    WHERE ubigeo_fiscal IS NOT NULL AND LENGTH(ubigeo_fiscal) = 6
    ON CONFLICT (codigo_ubigeo) DO NOTHING;

    -- 2. Insertar o actualizar Empresas (contacts con tipo_persona = 'EMPRESA')
    INSERT INTO contacts (
        tipo_persona,
        tipo_documento,
        numero_documento,
        razon_social,
        telefono_principal,
        email,
        referencia,
        status,
        nro_entidades,
        score_experian,
        semaforo_experian,
        deuda_sbs,
        calificacion_sbs,
        rango_ventas,
        date_created
    )
    SELECT
        'EMPRESA',
        'RUC',
        nro_documento,
        razon_social,
        celular_rl,
        email_rl,
        'Importado de Experian',
        'Lead',
        nro_entidades,
        score_nota,
        semaforo_actual,
        deuda_total_sbs,
        calificacion_sbs,
        rango_vta,
        NOW()
    FROM experian_raw
    ON CONFLICT (numero_documento) DO UPDATE SET
        razon_social = EXCLUDED.razon_social,
        telefono_principal = EXCLUDED.telefono_principal,
        email = EXCLUDED.email,
        nro_entidades = EXCLUDED.nro_entidades,
        score_experian = EXCLUDED.score_experian,
        semaforo_experian = EXCLUDED.semaforo_experian,
        deuda_sbs = EXCLUDED.deuda_sbs,
        calificacion_sbs = EXCLUDED.calificacion_sbs,
        rango_ventas = EXCLUDED.rango_ventas;

    -- 3. Insertar Direcciones Fiscales para cada Empresa
    INSERT INTO direcciones (id_contacto, nombre_ubicacion, codigo_ubigeo, direccion_completa, referencia)
    SELECT c.id, 'Dirección Fiscal', r.ubigeo_fiscal, r.direccion_fiscal,
           'Fiscal - ' || r.dist_fiscal || ', ' || r.prov_fiscal
    FROM experian_raw r
    JOIN contacts c ON c.numero_documento = r.nro_documento AND c.tipo_persona = 'EMPRESA'
    WHERE NOT EXISTS (
        SELECT 1 FROM direcciones d WHERE d.id_contacto = c.id AND d.nombre_ubicacion = 'Dirección Fiscal'
    );

    -- 4. Insertar Representantes Legales (Personas Naturales) asociadas a su respectiva Empresa
    INSERT INTO contacts (
        tipo_persona,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        telefono_principal,
        email,
        empresa_id,
        cargo,
        referencia,
        status,
        date_created
    )
    SELECT
        'NATURAL',
        'DNI',
        NULL,
        r.nombre_rl,
        '',
        r.celular_rl,
        r.email_rl,
        c.id,
        'Representante Legal',
        'Rep. Legal de ' || r.razon_social,
        'Lead',
        NOW()
    FROM experian_raw r
    JOIN contacts c ON c.numero_documento = r.nro_documento AND c.tipo_persona = 'EMPRESA'
    WHERE NOT EXISTS (
        SELECT 1 FROM contacts p
        WHERE p.empresa_id = c.id 
          AND p.tipo_persona = 'NATURAL' 
          AND p.telefono_principal = r.celular_rl
    );

    -- 5. Re-habilitar trigger de oportunidades
    ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity;

    COMMIT;
    """
    cmd_sync = ["docker", "exec", "-i", "nextlead_postgres", "psql", "-U", "postgres", "-d", "nextlead", "-c", sync_sql]
    p_sync = subprocess.run(cmd_sync, capture_output=True, text=True)
    if p_sync.returncode != 0:
        print(f"Error en sincronización SQL: {p_sync.stderr}")
        # Asegurarse de re-habilitar el trigger ante cualquier fallo
        subprocess.run(["docker", "exec", "-i", "nextlead_postgres", "psql", "-U", "postgres", "-d", "nextlead", "-c", "ALTER TABLE contacts ENABLE TRIGGER trg_new_contact_opportunity;"])
        sys.exit(1)
    
    print(f"Salida SQL:\n{p_sync.stdout.strip()}")
    t_end = time.time()
    print(f"\n========================================================")
    print(f"¡CARGA Y ASOCIACIÓN COMPLETADA EN {t_end - t0:.2f} SEGUNDOS!")
    print(f"========================================================")

if __name__ == '__main__':
    main()
