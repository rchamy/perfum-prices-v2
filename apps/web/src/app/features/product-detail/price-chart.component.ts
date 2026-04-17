import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ApiService } from '../../core/services/api.service'
import type { PriceHistory } from '@perfum/shared'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler)

const COLORS = [
  { line: '#7c3aed', fill: 'rgba(124,58,237,.08)' },
  { line: '#0ea5e9', fill: 'rgba(14,165,233,.08)' },
  { line: '#f59e0b', fill: 'rgba(245,158,11,.08)' },
  { line: '#10b981', fill: 'rgba(16,185,129,.08)' },
  { line: '#ef4444', fill: 'rgba(239,68,68,.08)' },
  { line: '#8b5cf6', fill: 'rgba(139,92,246,.08)' },
]

@Component({
  selector: 'app-price-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chart-section">
      <div class="chart-header">
        <h2>Tendencia de precio</h2>
        <div class="range-tabs">
          @for (r of ranges; track r.value) {
            <button class="range-tab" [class.active]="range === r.value" (click)="setRange(r.value)">
              {{ r.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="chart-skeleton"></div>
      } @else if (empty()) {
        <div class="chart-empty">
          <p>No hay suficientes datos de precios para mostrar el gráfico.</p>
        </div>
      } @else {
        <div class="chart-wrap">
          <canvas #chartCanvas></canvas>
        </div>
      }
    </div>
  `,
  styles: [`
    .chart-section { margin-top: 2rem; }
    .chart-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: .75rem; margin-bottom: 1rem;
      h2 { font-size: 1.2rem; font-weight: 700; }
    }
    .range-tabs { display: flex; gap: .25rem; }
    .range-tab {
      padding: .3rem .75rem; border-radius: 999px; font-size: .8rem; font-weight: 500;
      border: 1px solid var(--color-border); background: var(--color-surface);
      cursor: pointer; color: var(--color-text-muted);
      &:hover { border-color: var(--color-primary); color: var(--color-primary); }
      &.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
    }
    .chart-wrap {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 1.25rem;
      canvas { max-height: 320px; }
    }
    .chart-skeleton {
      height: 320px; border-radius: var(--radius-lg);
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    .chart-empty {
      height: 200px; display: flex; align-items: center; justify-content: center;
      background: var(--color-surface); border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: .9rem;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
})
export class PriceChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() productId!: string
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>

  loading = signal(true)
  empty = signal(false)
  range = '30d'
  ranges = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1A' },
  ]

  private chart: Chart | null = null
  private viewReady = false
  private pendingData: PriceHistory[] | null = null

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['productId']?.currentValue) {
      this.fetchHistory()
    }
  }

  ngAfterViewInit() {
    this.viewReady = true
    if (this.pendingData) {
      this.renderChart(this.pendingData)
      this.pendingData = null
    }
  }

  ngOnDestroy() {
    this.chart?.destroy()
  }

  setRange(r: string) {
    this.range = r
    this.fetchHistory()
  }

  private fetchHistory() {
    this.loading.set(true)
    this.empty.set(false)
    this.api.getPriceHistory(this.productId, this.range).subscribe({
      next: (res) => {
        const hasData = res.data.some(s => s.data.length > 0)
        if (!hasData) {
          this.loading.set(false)
          this.empty.set(true)
          this.chart?.destroy()
          this.chart = null
          return
        }
        this.loading.set(false)
        if (this.viewReady) {
          this.renderChart(res.data)
        } else {
          this.pendingData = res.data
        }
      },
      error: () => { this.loading.set(false); this.empty.set(true) },
    })
  }

  private renderChart(histories: PriceHistory[]) {
    this.chart?.destroy()

    const canvas = this.canvasRef?.nativeElement
    if (!canvas) return

    const datasets = histories
      .filter(h => h.data.length > 0)
      .map((h, i) => {
        const color = COLORS[i % COLORS.length]
        return {
          label: h.store_name,
          data: h.data.map(d => ({ x: new Date(d.date).getTime(), y: d.price })),
          borderColor: color.line,
          backgroundColor: color.fill,
          fill: true,
          tension: 0.3,
          pointRadius: h.data.length < 30 ? 4 : 2,
          pointHoverRadius: 6,
        }
      })

    this.chart = new Chart(canvas, {
      type: 'line',
      data: { datasets: datasets as any },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y as number
                return ` ${ctx.dataset.label}: ${val.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}`
              },
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: this.range === '7d' ? 'day' : this.range === '1y' ? 'month' : 'week',
              tooltipFormat: 'dd/MM/yyyy',
              displayFormats: { day: 'dd MMM', week: 'dd MMM', month: 'MMM yyyy' },
            },
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            ticks: {
              font: { size: 11 },
              callback: (val) =>
                (val as number).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }),
            },
            grid: { color: 'rgba(0,0,0,.05)' },
          },
        },
      },
    })
  }
}
