import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProCanvas from './components/ProCanvas.jsx'
import {
  analisisLintasan, azimuthKeDelta, azimuthKeKuadran, fmt, round,
  CONTOH_POLIGON, CONTOH_TERBUKA
} from './lib/survey.js'
import './index.css'

/* ============================ IKON ============================ */
const Icon = ({ name, size = 16 }) => {
  const p = {
    pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z',
    compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16 8l-2.5 5.5L8 16l2.5-5.5L16 8z',
    ruler: 'M3 15l6-6 4 4-6 6-4-4zM14 6l4 4M12 8l4 4M16 4l4 4',
    polygon: 'M12 3l8 5v8l-8 5-8-5V8l8-5z',
    line: 'M4 18L20 6M4 18a2 2 0 1 0 0 .01M20 6a2 2 0 1 0 0 .01',
    trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13',
    pen: 'M4 20h4L20 8l-4-4L4 16v4z',
    close: 'M4 4l16 16M20 4L4 20',
    plus: 'M12 5v14M5 12h14',
    reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
    down: 'M12 3v13M7 11l5 5 5-5M4 21h16',
    flag: 'M5 21V4h13l-3 4 3 4H5',
    link: 'M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1',
    check: 'M20 6L9 17l-5-5',
    undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
    grid: 'M4 4h16v16H4zM4 10h16M10 4v16',
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2'
  }[name] || ''
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={p} />
    </svg>
  )
}

/* ========================= TOAST ============================== */
function Toast({ items, onDismiss }) {
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={'toast toast--' + t.kind}>
          <span className="toast__dot" />
          <div className="toast__body">
            <strong>{t.title}</strong>
            {t.message ? <span>{t.message}</span> : null}
          </div>
          <button onClick={() => onDismiss(t.id)} aria-label="tutup"><Icon name="close" size={14} /></button>
        </div>
      ))}
    </div>
  )
}

/* ========================= MODAL ============================== */
function Modal({ open, title, children, onClose, onSave }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal__box" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h3><Icon name="pen" /> {title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="tutup"><Icon name="close" size={16} /></button>
        </div>
        <div className="modal__body">{children}</div>
        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={onClose}>Batal</button>
          <button className="btn btn--primary" onClick={onSave}><Icon name="check" /> Simpan</button>
        </div>
      </div>
    </div>
  )
}

/* ======================== KOMPONEN KECIL ======================= */
function Stat({ icon, label, value, sub, tone }) {
  return (
    <div className={'stat' + (tone ? ' stat--' + tone : '')}>
      <div className="stat__icon"><Icon name={icon} size={18} /></div>
      <div className="stat__text">
        <span className="stat__label">{label}</span>
        <strong className="stat__value">{value}</strong>
        {sub ? <span className="stat__sub">{sub}</span> : null}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}

/* ============ DETEKSI UKURAN LAYAR ============ */
function useMediaQuery(query) {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  )
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/* =========================== APP ============================== */
export default function App() {
  const [points, setPoints] = useState([])
  const isMobile = useMediaQuery('(max-width: 980px)')
  const [tab, setTab] = useState('peta')
  const [mode, setMode] = useState('koordinat')
  const [sel, setSel] = useState(null)
  const [history, setHistory] = useState([])
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState({ open: false, index: -1, x: '', y: '' })
  const canvasRef = useRef(null)
  const seq = useRef(0)

  const notify = useCallback((title, message, kind = 'info') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, title, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const commit = useCallback((next, undoNote) => {
    setHistory((h) => [...h.slice(-29), points])
    setPoints(next)
    if (undoNote) setUndoNote(undoNote)
  }, [points])

  const [undoNote, setUndoNote] = useState('')

  /* ---- kalkulasi ---- */
  const stat = useMemo(() => analisisLintasan(points), [points])
  const canArea = points.length >= 3 && stat.tertutup
  const canLength = points.length >= 2

  /* ---- persistensi ---- */
  useEffect(() => {
    try { localStorage.setItem('lintasan-points', JSON.stringify(points)) } catch (e) { void e }
  }, [points])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lintasan-points')
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) setPoints(arr)
      }
    } catch (e) { void e }
  }, [])

  /* ---- aksi ---- */
  const tambahKoordinat = (rawX, rawY) => {
    const x = parseFloat(rawX)
    const y = parseFloat(rawY)
    if (!isFinite(x) || !isFinite(y)) {
      notify('Input tidak valid', 'X dan Y harus berupa angka.', 'error')
      return false
    }
    commit([...points, { x: round(x, 4), y: round(y, 4) }])
    notify('Titik #' + (points.length + 1) + ' ditambahkan', 'X ' + fmt(x, 2) + ' , Y ' + fmt(y, 2), 'success')
    return true
  }

  const tambahJarakArah = (rawJ, rawA) => {
    if (!points.length) {
      notify('Belum ada titik awal', 'Tekan "Set Titik Awal" lebih dulu.', 'warning')
      return false
    }
    const j = parseFloat(rawJ)
    const a = parseFloat(rawA)
    if (!isFinite(j) || !isFinite(a) || j <= 0) {
      notify('Input tidak valid', 'Jarak harus > 0 dan azimuth berupa angka.', 'error')
      return false
    }
    if (a < 0 || a > 360) {
      notify('Azimuth di luar rentang', 'Azimuth harus 0 - 360 derajat.', 'error')
      return false
    }
    const last = points[points.length - 1]
    const d = azimuthKeDelta(j, a)
    const p = { x: round(last.x + d.dx, 4), y: round(last.y + d.dy, 4) }
    commit([...points, p])
    notify('Segmen ' + (points.length) + ' ditambahkan',
      fmt(j, 2) + ' m pada azimuth ' + fmt(a, 2) + '°', 'success')
    return true
  }

  const setAwal = () => {
    commit([{ x: 0, y: 0 }])
    notify('Titik awal ditetapkan', 'Stasiun P1 berada di (0, 0)', 'success')
  }

  const tutupLintasan = () => {
    if (points.length < 3) {
      notify('Terlalu sedikit titik', 'Butuh minimal 3 titik untuk menutup bidang.', 'warning')
      return
    }
    if (stat.tertutup) {
      notify('Sudah tertutup', 'Lintasan aktif sudah kembali ke P1.', 'info')
      return
    }
    const f = points[0]
    commit([...points, { x: f.x, y: f.y }])
    notify('Lintasan ditutup', 'Luas area = ' + fmt(hitungLuasSafe(points), 2) + ' m²', 'success')
  }

  const undo = () => {
    if (!history.length) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setPoints(prev)
    notify('Dibatalkan', 'Dikembalikan ' + prev.length + ' titik sebelumnya.', 'info')
  }

  const reset = () => {
    if (!points.length) return
    if (!window.confirm('Hapus semua ' + points.length + ' titik lintasan?')) return
    commit([])
    setSel(null)
    notify('Data dihapus', 'Semua titik telah dibersihkan.', 'info')
  }

  const muat = (arr, label) => {
    commit(arr.map((p) => ({ x: p.x, y: p.y })))
    setSel(null)
    notify(label, arr.length + ' titik dimuat ke kanvas.', 'success')
  }

  const hapusTitik = (i) => {
    const p = points[i]
    if (!window.confirm('Hapus P' + (i + 1) + ' (' + fmt(p.x, 2) + ', ' + fmt(p.y, 2) + ')?')) return
    commit(points.filter((_, k) => k !== i))
    if (sel === i) setSel(null)
    notify('P' + (i + 1) + ' dihapus', null, 'warning')
  }

  const bukaEdit = (i) => {
    setModal({ open: true, index: i, x: String(points[i].x), y: String(points[i].y) })
  }

  const simpanEdit = () => {
    const x = parseFloat(modal.x)
    const y = parseFloat(modal.y)
    if (!isFinite(x) || !isFinite(y)) {
      notify('Input tidak valid', 'X dan Y harus berupa angka.', 'error')
      return
    }
    commit(points.map((p, k) => (k === modal.index ? { x: round(x, 4), y: round(y, 4) } : p)))
    setModal({ open: false, index: -1, x: '', y: '' })
    notify('P' + (modal.index + 1) + ' diperbarui', null, 'success')
  }

  const eksporCSV = () => {
    const rows = [['Stasiun', 'X (m)', 'Y (m)']]
    points.forEach((p, i) => rows.push(['P' + (i + 1), p.x, p.y]))
    if (stat.segments.length) {
      rows.push([])
      rows.push(['Segmen', 'Dari', 'Ke', 'Jarak (m)', 'Azimuth (°)', 'Kuadran', 'dX', 'dY'])
      stat.segments.forEach((s) => rows.push([
        s.id, 'P' + (s.index + 1), 'P' + (s.index + 2), s.distance, s.azimuth, s.kuadran, s.deltaX, s.deltaY
      ]))
    }
    if (stat.angles.length) {
      rows.push([])
      rows.push(['Sudut', 'Nilai (°)'])
      stat.angles.forEach((a) => rows.push([a.label, a.nilai]))
    }
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c == null ? '' : c)
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }).join(';')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'data-lintasan.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    notify('CSV diunduh', 'Data titik, segmen, dan sudut tersimpan.', 'success')
  }

  const err = stat.error
  const errTone = !err ? 'muted' : err.konvergen ? 'ok' : err.distance < 0.5 ? 'warn' : 'bad'

  return (
    <div className="app" data-tab={tab}>
      <Toast items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />

      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__mark"><Icon name="polygon" size={20} /></div>
          <div>
            <h1>Sistem Pengukuran Lintasan</h1>
            <p>Plot topografi, panjang lintasan, luas bidang, sudut &amp; closing error</p>
          </div>
        </div>
        <div className="topbar__tools">
          <button className="btn btn--ghost" onClick={undo} disabled={!history.length} title="Undo (tingkat surveying)">
            <Icon name="undo" /> Undo
          </button>
          <button className="btn btn--ghost" onClick={eksporCSV} disabled={!points.length}>
            <Icon name="down" /> CSV
          </button>
          <button className="btn btn--primary" onClick={() => canvasRef.current && canvasRef.current.exportPNG()}>
            <Icon name="chart" /> Ekspor PNG
          </button>
        </div>
      </header>

      <nav className="mobnav" role="tablist" aria-label="Navigasi">
        <button role="tab" aria-selected={tab === 'input'} className={tab === 'input' ? 'on' : ''} onClick={() => setTab('input')}>
          <Icon name="pin" size={14} /> Input
        </button>
        <button role="tab" aria-selected={tab === 'peta'} className={tab === 'peta' ? 'on' : ''} onClick={() => setTab('peta')}>
          <Icon name="polygon" size={14} /> Peta
          {points.length ? <span className="mobnav__badge">{points.length}</span> : null}
        </button>
        <button role="tab" aria-selected={tab === 'hasil'} className={tab === 'hasil' ? 'on' : ''} onClick={() => setTab('hasil')}>
          <Icon name="chart" size={14} /> Hasil
        </button>
      </nav>

      <div className="layout">
        {/* ================= PANEL KIRI ================= */}
        <div className="mgroup mgroup--input"><aside className="side">
          <section className="card">
            <h2 className="card__title"><Icon name="compass" /> Mode Input</h2>
            <div className="seg">
              <button className={mode === 'koordinat' ? 'on' : ''} onClick={() => setMode('koordinat')}>
                <Icon name="pin" /> Koordinat X,Y
              </button>
              <button className={mode === 'jarak' ? 'on' : ''} onClick={() => setMode('jarak')}>
                <Icon name="ruler" /> Jarak + Azimuth
              </button>
            </div>

            {mode === 'koordinat' ? (
              <KoordinatForm onSubmit={tambahKoordinat} />
            ) : (
              <JarakForm onSubmit={tambahJarakArah} />
            )}
          </section>

          <section className="card">
            <h2 className="card__title"><Icon name="line" /> Operasional</h2>
            <div className="grid2">
              <button className="btn btn--soft" onClick={setAwal}><Icon name="flag" /> Set Titik Awal</button>
              <button className="btn btn--soft" onClick={tutupLintasan}><Icon name="link" /> Tutup Lintasan</button>
            </div>
            <div className="grid2">
              <button className="btn btn--ghost" onClick={() => muat(CONTOH_POLIGON, 'Contoh poligon dimuat')}>
                <Icon name="polygon" /> Contoh Poligon
              </button>
              <button className="btn btn--ghost" onClick={() => muat(CONTOH_TERBUKA, 'Contoh lintasan terbuka dimuat')}>
                <Icon name="chart" /> Contoh Terbuka
              </button>
            </div>
            <button className="btn btn--danger btn--full" onClick={reset} disabled={!points.length}>
              <Icon name="reset" /> Reset Semua
            </button>
            {undoNote ? <p className="hint">Aksi terakhir: {undoNote}</p> : null}
          </section>

          <section className="card card--list">
            <h2 className="card__title">
              <Icon name="pin" /> Daftar Titik
              <span className="badge">{points.length}</span>
            </h2>
            {points.length === 0 ? (
              <div className="empty">
                <Icon name="pin" size={22} />
                <p>Belum ada titik</p>
                <small>Mulai survei dengan menambahkan titik pertama.</small>
              </div>
            ) : (
              <ul className="plist">
                {points.map((p, i) => (
                  <li key={i} className={sel === i ? 'on' : ''} onClick={() => setSel(i)}>
                    <span className="plist__tag">P{i + 1}</span>
                    <span className="plist__xy">{fmt(p.x, 2)}, {fmt(p.y, 2)}</span>
                    <span className="plist__acts">
                      <button title="Edit" onClick={(e) => { e.stopPropagation(); bukaEdit(i) }}><Icon name="pen" size={14} /></button>
                      <button title="Hapus" onClick={(e) => { e.stopPropagation(); hapusTitik(i) }}><Icon name="trash" size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside></div>

        {/* ================= PANEL KANAN ================= */}
        <main className="main">
          <div className="mgroup mgroup--peta">
          <div className="stage">
            <ProCanvas ref={canvasRef} points={points} selected={sel} onPointClick={(i) => setSel(i === sel ? null : i)} />
          </div>

          <section className="stats">
            <Stat icon="ruler" label="Panjang Lintasan" value={canLength ? fmt(stat.total, 2) + ' m' : '—'}
              sub={canLength ? stat.segments.length + ' segmen' : 'butuh 2 titik'} />
            <Stat icon="polygon" label="Luas Bidang" value={canArea ? fmt(stat.luas, 2) + ' m²' : '—'}
              sub={canArea ? fmt(stat.luasHa, 4) + ' ha' : 'butuh poligon tertutup'} />
            <Stat icon="target" label="Closing Error" value={err ? fmt(err.distance, 3) + ' m' : '—'}
              tone={errTone}
              sub={err ? 'ΔX ' + fmt(err.dx, 3) + ' / ΔY ' + fmt(err.dy, 3) : 'lintasan masih terbuka'} />
            <Stat icon="check" label="Keliling" value={canLength ? fmt(stat.keliling, 2) + ' m' : '—'}
              sub={stat.tertutup ? 'poligon tertutup' : 'jalur terbuka'} />
          </section>
          </div>

          <div className="mgroup mgroup--hasil">
          <section className="card">
            <h2 className="card__title">
              <Icon name="ruler" /> Detail Segmen
              <span className="badge">{stat.segments.length}</span>
            </h2>
            {stat.segments.length === 0 ? (
              <p className="muted">Belum ada segmen untuk ditampilkan.</p>
            ) : (
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Seg</th><th>Dari</th><th>Ke</th>
                      <th className="r">Jarak (m)</th><th className="r">Azimuth</th>
                      <th>Kuadran</th><th className="r">ΔX</th><th className="r">ΔY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.segments.map((s) => (
                      <tr key={s.id}>
                        <td className="mono strong">{s.id}</td>
                        <td className="mono">P{s.index + 1}</td>
                        <td className="mono">P{s.index + 2}</td>
                        <td className="r mono">{fmt(s.distance, 3)}</td>
                        <td className="r mono">{fmt(s.azimuth, 3)}°</td>
                        <td className="mono dim">{s.kuadran}</td>
                        <td className="r mono dim">{fmt(s.deltaX, 2)}</td>
                        <td className="r mono dim">{fmt(s.deltaY, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {stat.angles.length > 0 && (
            <section className="card">
              <h2 className="card__title">
                <Icon name="target" /> Sudut Interior
                <span className="badge">{stat.angles.length}</span>
              </h2>
              <div className="chips">
                {stat.angles.map((a) => (
                  <span className="chip" key={a.label}>
                    <b>P{a.label}</b> {a.nilai === null ? '—' : fmt(a.nilai, 2) + '°'}
                  </span>
                ))}
              </div>
            </section>
          )}
          </div>
        </main>
      </div>

      <Modal
        open={modal.open}
        title={"Edit Titik P" + (modal.index + 1)}
        onClose={() => setModal({ open: false, index: -1, x: '', y: '' })}
        onSave={simpanEdit}
      >
        <div className="grid2">
          <Field label="X (meter)">
            <input type="number" step="any" value={modal.x}
              onChange={(e) => setModal((m) => ({ ...m, x: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') simpanEdit() }} />
          </Field>
          <Field label="Y (meter)">
            <input type="number" step="any" value={modal.y}
              onChange={(e) => setModal((m) => ({ ...m, y: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') simpanEdit() }} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

/* hitung luas dengan aman (tanpa titik duplikat terakhir) */
function hitungLuasSafe(pts) {
  const ring = pts.slice(0, -1)
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    s += a.x * b.y - a.y * b.x
  }
  return Math.abs(s) / 2
}

/* ======================= FORM MODES =========================== */
function KoordinatForm({ onSubmit }) {
  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const go = () => { if (onSubmit(x, y)) { setX(''); setY('') } }
  return (
    <div className="form">
      <div className="grid2">
        <Field label="X (meter)">
          <input type="number" step="any" placeholder="0.00" value={x} autoFocus
            onChange={(e) => setX(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
        </Field>
        <Field label="Y (meter)">
          <input type="number" step="any" placeholder="0.00" value={y}
            onChange={(e) => setY(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
        </Field>
      </div>
      <button className="btn btn--primary btn--full" onClick={go}><Icon name="plus" /> Tambah Titik</button>
      <p className="hint">Tekan Enter untuk menambahkan titik.</p>
    </div>
  )
}

function JarakForm({ onSubmit }) {
  const [j, setJ] = useState('')
  const [a, setA] = useState('')
  const go = () => { if (onSubmit(j, a)) { setJ(''); setA('') } }
  return (
    <div className="form">
      <div className="grid2">
        <Field label="Jarak (meter)">
          <input type="number" step="any" placeholder="0.00" value={j} autoFocus
            onChange={(e) => setJ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
        </Field>
        <Field label="Azimuth (derajat)">
          <input type="number" step="any" min="0" max="360" placeholder="0 - 360" value={a}
            onChange={(e) => setA(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
        </Field>
      </div>
      <p className="hint hint--axis">0° Utara · 90° Timur · 180° Selatan · 270° Barat</p>
      <button className="btn btn--primary btn--full" onClick={go}><Icon name="plus" /> Tambah dari Titik Terakhir</button>
    </div>
  )
}
