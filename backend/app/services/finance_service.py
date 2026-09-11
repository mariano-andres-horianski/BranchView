from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.sucursal import Sucursal
from app.models.finanzas_mensuales import FinanzasMensuales
from app.services.alert_service import AlertService
from app.schemas.monthly_finance import (
    MonthlyFinanceResponse,
    FinanceSummaryMetric,
    FinanceSummaryResponse,
    BranchFinanceHistoryResponse,
    ComparativeBranchTotal,
    ComparativeAnalyticsResponse,
)

SPANISH_MONTHS = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic"
}

class FinanceService:
    @staticmethod
    def get_month_label(anio: int, mes: int) -> str:
        short_name = SPANISH_MONTHS.get(mes, str(mes))
        return f"{short_name} {anio}"

    @staticmethod
    def calculate_derived_fields(ventas: float, costo_ventas: float, gastos_operativos: float) -> Tuple[float, float, float, float]:
        """
        Calculates:
        ganancias_brutas = ventas - costo_ventas
        ganancias_netas = ganancias_brutas - gastos_operativos
        margen_bruto = (ganancias_brutas / ventas) * 100 (if ventas > 0 else 0.0)
        margen_neto = (ganancias_netas / ventas) * 100 (if ventas > 0 else 0.0)
        """
        v = round(float(ventas), 2)
        c = round(float(costo_ventas), 2)
        g = round(float(gastos_operativos), 2)

        ganancias_brutas = round(v - c, 2)
        ganancias_netas = round(ganancias_brutas - g, 2)

        if v > 0:
            margen_bruto = round((ganancias_brutas / v) * 100, 2)
            margen_neto = round((ganancias_netas / v) * 100, 2)
        else:
            margen_bruto = 0.0
            margen_neto = 0.0

        return ganancias_brutas, ganancias_netas, margen_bruto, margen_neto

    @staticmethod
    def upsert_monthly_record(
        db: Session,
        branch_id: int,
        anio: int,
        mes: int,
        ventas: float,
        costo_ventas: float,
        gastos_operativos: float
    ) -> FinanzasMensuales:
        """
        Inserts or updates a monthly financial record with backend-computed derivations.
        """
        ganancias_brutas, ganancias_netas, margen_bruto, margen_neto = FinanceService.calculate_derived_fields(
            ventas, costo_ventas, gastos_operativos
        )

        record = db.query(FinanzasMensuales).filter(
            FinanzasMensuales.id_sucursal == branch_id,
            FinanzasMensuales.anio == anio,
            FinanzasMensuales.mes == mes
        ).first()

        if record:
            record.ventas = round(ventas, 2)
            record.costo_ventas = round(costo_ventas, 2)
            record.gastos_operativos = round(gastos_operativos, 2)
            record.ganancias_brutas = ganancias_brutas
            record.ganancias_netas = ganancias_netas
            record.margen_bruto = margen_bruto
            record.margen_neto = margen_neto
        else:
            record = FinanzasMensuales(
                id_sucursal=branch_id,
                anio=anio,
                mes=mes,
                ventas=round(ventas, 2),
                costo_ventas=round(costo_ventas, 2),
                gastos_operativos=round(gastos_operativos, 2),
                ganancias_brutas=ganancias_brutas,
                ganancias_netas=ganancias_netas,
                margen_bruto=margen_bruto,
                margen_neto=margen_neto
            )
            db.add(record)

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def update_current_period(
        db: Session,
        branch: Sucursal,
        ventas: float,
        costo_ventas: float,
        gastos_operativos: float,
        anio: Optional[int] = None,
        mes: Optional[int] = None
    ) -> FinanzasMensuales:
        """
        Updates current period finances, keeps `sucursal` and `finanzas_mensuales`
        strictly synchronized as a single source of truth, and evaluates financial alerts.
        """
        now = datetime.utcnow()
        target_anio = anio or now.year
        target_mes = mes or now.month

        # 1. Update or create monthly record
        record = FinanceService.upsert_monthly_record(
            db=db,
            branch_id=branch.id,
            anio=target_anio,
            mes=target_mes,
            ventas=ventas,
            costo_ventas=costo_ventas,
            gastos_operativos=gastos_operativos
        )

        # 2. Synchronize current month in sucursal
        branch.ventas_mes = record.ventas
        branch.ganancias_netas_mes = record.ganancias_netas

        # 3. Recalculate annual figures from months of that year in finanzas_mensuales
        year_records = db.query(FinanzasMensuales).filter(
            FinanzasMensuales.id_sucursal == branch.id,
            FinanzasMensuales.anio == target_anio
        ).all()

        if year_records:
            branch.ventas_anio = round(sum(r.ventas for r in year_records), 2)
            branch.ganancias_netas_anio = round(sum(r.ganancias_netas for r in year_records), 2)

        db.add(branch)
        db.commit()
        db.refresh(branch)

        # 4. Trigger alert evaluation
        AlertService.evaluate_financial_alerts(db, branch)

        return record

    @staticmethod
    def get_branch_history(
        db: Session,
        branch_id: int,
        months: int = 12
    ) -> BranchFinanceHistoryResponse:
        """
        Returns chronological monthly financial history for the given window of months,
        plus calculated analytics (best/worst month, averages, growth).
        """
        all_records: List[FinanzasMensuales] = (
            db.query(FinanzasMensuales)
            .filter(FinanzasMensuales.id_sucursal == branch_id)
            .order_by(FinanzasMensuales.anio.asc(), FinanzasMensuales.mes.asc())
            .all()
        )

        if not all_records:
            return BranchFinanceHistoryResponse(
                history=[],
                summary=FinanceSummaryResponse()
            )

        # Take the last N months
        selected_records = all_records[-months:] if len(all_records) > months else all_records

        history_items = [
            MonthlyFinanceResponse(
                id=r.id,
                id_sucursal=r.id_sucursal,
                anio=r.anio,
                mes=r.mes,
                mes_label=FinanceService.get_month_label(r.anio, r.mes),
                ventas=r.ventas,
                costo_ventas=r.costo_ventas,
                gastos_operativos=r.gastos_operativos,
                ganancias_brutas=r.ganancias_brutas,
                ganancias_netas=r.ganancias_netas,
                margen_bruto=r.margen_bruto,
                margen_neto=r.margen_neto
            )
            for r in selected_records
        ]

        # Calculate analytics
        best_sales = max(selected_records, key=lambda r: r.ventas)
        worst_sales = min(selected_records, key=lambda r: r.ventas)
        best_profit = max(selected_records, key=lambda r: r.ganancias_netas)
        worst_profit = min(selected_records, key=lambda r: r.ganancias_netas)

        total_sales = sum(r.ventas for r in selected_records)
        total_profit = sum(r.ganancias_netas for r in selected_records)
        avg_sales = round(total_sales / len(selected_records), 2)
        avg_profit = round(total_profit / len(selected_records), 2)

        # Growth calculation: compare last half with first half of selected window
        crecimiento_ventas_pct = 0.0
        if len(selected_records) >= 2:
            mid = len(selected_records) // 2
            first_half = selected_records[:mid]
            second_half = selected_records[mid:]
            sum_first = sum(r.ventas for r in first_half)
            sum_second = sum(r.ventas for r in second_half)
            if sum_first > 0:
                crecimiento_ventas_pct = round(((sum_second - sum_first) / sum_first) * 100, 2)

        summary = FinanceSummaryResponse(
            mejor_mes_ventas=FinanceSummaryMetric(
                mes_label=FinanceService.get_month_label(best_sales.anio, best_sales.mes),
                valor=best_sales.ventas
            ),
            peor_mes_ventas=FinanceSummaryMetric(
                mes_label=FinanceService.get_month_label(worst_sales.anio, worst_sales.mes),
                valor=worst_sales.ventas
            ),
            mejor_mes_ganancias=FinanceSummaryMetric(
                mes_label=FinanceService.get_month_label(best_profit.anio, best_profit.mes),
                valor=best_profit.ganancias_netas
            ),
            peor_mes_ganancias=FinanceSummaryMetric(
                mes_label=FinanceService.get_month_label(worst_profit.anio, worst_profit.mes),
                valor=worst_profit.ganancias_netas
            ),
            promedio_ventas=avg_sales,
            promedio_ganancias=avg_profit,
            crecimiento_ventas_pct=crecimiento_ventas_pct
        )

        return BranchFinanceHistoryResponse(
            history=history_items,
            summary=summary
        )

    @staticmethod
    def get_comparative_analytics(
        db: Session,
        branch_ids: List[int],
        months: int = 12
    ) -> ComparativeAnalyticsResponse:
        """
        Builds synchronized time-series and aggregate analytics across multiple branches
        for rendering comparative charts (lines, bars, rankings).
        """
        branches = db.query(Sucursal).filter(Sucursal.id.in_(branch_ids), Sucursal.activa == True).all()

        branch_totals: List[ComparativeBranchTotal] = []
        branch_histories: Dict[int, List[FinanzasMensuales]] = {}

        # Collect histories
        for b in branches:
            records = (
                db.query(FinanzasMensuales)
                .filter(FinanzasMensuales.id_sucursal == b.id)
                .order_by(FinanzasMensuales.anio.asc(), FinanzasMensuales.mes.asc())
                .all()
            )
            selected = records[-months:] if len(records) > months else records
            branch_histories[b.id] = selected

            v_tot = sum(r.ventas for r in selected)
            g_tot = sum(r.ganancias_netas for r in selected)
            n_tot = len(selected)

            avg_net_margin = round(sum(r.margen_neto for r in selected) / n_tot, 2) if n_tot > 0 else 0.0
            avg_gross_margin = round(sum(r.margen_bruto for r in selected) / n_tot, 2) if n_tot > 0 else 0.0

            branch_totals.append(
                ComparativeBranchTotal(
                    id=b.id,
                    direccion=b.direccion,
                    ventas_total=round(v_tot, 2),
                    ganancias_netas_total=round(g_tot, 2),
                    margen_neto_promedio=avg_net_margin,
                    margen_bruto_promedio=avg_gross_margin
                )
            )

        # Ranking (highest total sales first)
        ranking = sorted(branch_totals, key=lambda bt: bt.ventas_total, reverse=True)

        # Build combined time series for Line Charts
        # Find all distinct (anio, mes) present in any of the branches, sorted
        all_month_keys = set()
        for b_id, recs in branch_histories.items():
            for r in recs:
                all_month_keys.add((r.anio, r.mes))

        sorted_month_keys = sorted(list(all_month_keys))

        time_series_ventas: List[Dict[str, Any]] = []
        time_series_ganancias: List[Dict[str, Any]] = []

        branch_name_map = {b.id: b.direccion for b in branches}

        for anio, mes in sorted_month_keys:
            label = FinanceService.get_month_label(anio, mes)
            point_ventas = {"mes_label": label, "anio": anio, "mes": mes}
            point_ganancias = {"mes_label": label, "anio": anio, "mes": mes}

            for b in branches:
                name = branch_name_map[b.id]
                rec = next((r for r in branch_histories[b.id] if r.anio == anio and r.mes == mes), None)
                point_ventas[name] = rec.ventas if rec else 0.0
                point_ganancias[name] = rec.ganancias_netas if rec else 0.0

            time_series_ventas.append(point_ventas)
            time_series_ganancias.append(point_ganancias)

        return ComparativeAnalyticsResponse(
            time_series_ventas=time_series_ventas,
            time_series_ganancias=time_series_ganancias,
            branch_totals=branch_totals,
            ranking=ranking
        )
