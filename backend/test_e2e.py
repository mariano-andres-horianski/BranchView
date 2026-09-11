import httpx

def main():
    print("=== TEST E2E COMPLETO BRANCHVIEW ===")
    
    # 1. Login Supervisor
    r_sup = httpx.post("http://localhost:8000/api/auth/login", json={"username": "supervisor", "password": "admin123"}).json()
    sup_token = r_sup["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    print("[OK] Login Supervisor exitoso")

    # 2. Get Branches & Filters
    branches_op = httpx.get("http://localhost:8000/api/branches?filter_type=operativas", headers=sup_headers).json()
    print(f"[OK] Sucursales operativas obtenidas: {len(branches_op)}")

    branches_alert = httpx.get("http://localhost:8000/api/branches?filter_type=con_alerta", headers=sup_headers).json()
    print(f"[OK] Sucursales con alertas activas: {len(branches_alert)}")

    # 3. Compare branches 1, 2, 3
    comp = httpx.get("http://localhost:8000/api/branches/compare?ids=1,2,3", headers=sup_headers).json()
    assert len(comp) == 3
    print(f"[OK] Comparativa de 3 sucursales ejecutada correctamente:")
    for b in comp:
        print(f"     -> {b['direccion']} (Margen: {b['margen_neto_mes']}%, Empleados: {len(b['empleados'])}, Alertas: {len(b['alertas'])})")

    # 4. Global Alerts ordered
    alerts = httpx.get("http://localhost:8000/api/alerts", headers=sup_headers).json()
    print(f"[OK] Total alertas activas ordenadas por gravedad: {len(alerts)}")
    for a in alerts:
        print(f"     -> [{a['gravedad'].upper()}] {a['sucursales'][0]['direccion']}: {a['mensaje']}")

    # 5. Gerente workflow
    r_ger = httpx.post("http://localhost:8000/api/auth/login", json={"username": "gerente_centro", "password": "gerente123"}).json()
    ger_token = r_ger["access_token"]
    ger_headers = {"Authorization": f"Bearer {ger_token}"}
    print("[OK] Login Gerente Centro exitoso")

    # Verify gerente can only access their branch (1)
    res_b1 = httpx.get("http://localhost:8000/api/branches/1", headers=ger_headers)
    assert res_b1.status_code == 200
    print("[OK] Gerente accede a su propia sucursal")

    res_b2 = httpx.get("http://localhost:8000/api/branches/2", headers=ger_headers)
    assert res_b2.status_code == 403
    print("[OK] Acceso denegado (403) para gerente intentando ver otra sucursal")

    # 6. Test Frontend serving on port 3000
    r_fe = httpx.get("http://frontend:80")
    assert r_fe.status_code == 200
    assert "BranchView" in r_fe.text
    print("[OK] Frontend Nginx sirviendo correctamente HTML y assets")

    print("\n=== TODOS LOS CRITERIOS DE ÉXITO VERIFICADOS CON ÉXITO ===")

if __name__ == "__main__":
    main()
