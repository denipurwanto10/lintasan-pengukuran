import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { hitungJarak, hitungAzimuth, hitungLuasPoligon, hitungSudut, isTertutup, hitungCentroid, fmt } from '../lib/survey.js'

/* Palet gaya drafting / peta survei */
const T = {
  bg0: '#0a1c2c',
  bg1: '#16344f',
  gridMinor: 'rgba(231,223,201,0.09)',
  gridMajor: 'rgba(231,223,201,0.24)',
  gridText: '#8fa7bd',
  line: '#eee6d3',
  glow: 'rgba(212,175,55,0.55)',
  fill: 'rgba(166,65,43,0.16)',
  hatch: 'rgba(166,65,43,0.36)',
  edge: 'rgba(166,65,43,0.92)',
  pillBg: 'rgba(10,20,30,0.92)',
  pillBd: 'rgba(231,223,201,0.32)',
  pillTx: '#eee6d3',
  pillSub: '#d9b66a',
  err: '#e8a33d',
  errTx: '#f4d19b',
  start: '#d4af37',
  end: '#c1440e',
  mid: '#5b8db8',
  sel: '#f4c430'
}

const FONT = "Public Sans, system-ui, sans-serif"
const MONO = "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"

function niceStep(raw) {
  if (!isFinite(raw) || raw <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  const n = m >= 7.5 ? 10 : m >= 3.5 ? 5 : m >= 1.5 ? 2 : 1
  return n * p
}

function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + q, y)
  ctx.lineTo(x + w - q, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + q)
  ctx.lineTo(x + w, y + h - q)
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h)
  ctx.lineTo(x + q, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - q)
  ctx.lineTo(x, y + q)
  ctx.quadraticCurveTo(x, y, x + q, y)
  ctx.closePath()
}

function makeHatch(color) {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 8
  const g = c.getContext('2d')
  g.strokeStyle = color
  g.lineWidth = 1.3
  g.beginPath()
  g.moveTo(-2, 10)
  g.lineTo(10, -2)
  g.stroke()
  return ctxPattern(g, c)
}

function ctxPattern(g, c) {
  return g.createPattern(c, 'repeat')
}

function ProCanvasInner(props, ref) {
  const points = props.points || []
  const layers = props.layers || {}
  const selected = props.selected
  const onPointClick = props.onPointClick
  const onHover = props.onHover

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const ptrs = useRef(new Map())
  const pinchRef = useRef(null)
  const dragRef = useRef(null)
  const [size, setSize] = useState({ w: 900, h: 580 })
  const [view, setView] = useState({ s: 1, ox: 0, oy: 0 })
  const [cursor, setCursor] = useState(null)
  const [ui, setUi] = useState({ grid: true, dims: true, fill: true, labels: true, angles: true })

  const dataKey = useMemo(() => points.map((p) => p.x + ':' + p.y).join('|'), [points])

  /* ---------- worldview ---------- */
  const fit = useCallback((pts, w, h) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const p of pts) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
    if (!isFinite(minX)) { minX = -12; maxX = 12; minY = -8; maxY = 8 }
    const bw = Math.max(maxX - minX, 1e-6)
    const bh = Math.max(maxY - minY, 1e-6)
    const padL = 86, padR = 86, padT = 84, padB = 108
    const s = Math.max(0.01, Math.min((w - padL - padR) / bw, (h - padT - padB) / bh))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const centerY = padT + (h - padT - padB) / 2
    setView({ s: s, ox: w / 2 - cx * s, oy: h - cy * s - centerY })
  }, [])

  /* ---------- ukuran wadah (device pixel ratio) ---------- */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, Math.round(r.width)), h: Math.max(420, Math.round(r.height)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ---------- auto-fit saat data berubah ---------- */
  useEffect(() => {
    fit(points, size.w, size.h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, size.w, size.h])

  /* ---------- zoom di sekitar kursor ---------- */
  const zoomAt = useCallback((mx, my, factor) => {
    setView((v) => {
      const h = size.h
      const ns = Math.min(6000, Math.max(0.004, v.s * factor))
      const wx = (mx - v.ox) / v.s
      const wy = (h - my - v.oy) / v.s
      return { s: ns, ox: mx - wx * ns, oy: h - my - wy * ns }
    })
  }, [size.h])

  useImperativeHandle(ref, () => ({
    fit: () => fit(points, size.w, size.h),
    exportPNG: () => {
      const cv = canvasRef.current
      if (!cv) return
      const a = document.createElement('a')
      a.download = 'lintasan-pengukuran.png'
      a.href = cv.toDataURL('image/png')
      a.click()
    },
    zoomIn: () => zoomAt(size.w / 2, size.h / 2, 1.25),
    zoomOut: () => zoomAt(size.w / 2, size.h / 2, 0.8)
  }), [fit, points, size, zoomAt])

  /* ---------- interaksi pointer ---------- */
  const screenPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragRef.current = { moved: false, x: e.clientX, y: e.clientY }
    if (ptrs.current.size === 2) {
      const ps = Array.from(ptrs.current.values())
      pinchRef.current = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), s: view.s }
    }
  }

  const onPointerMove = (e) => {
    const m = screenPos(e)
    setView((v) => {
      const wx = (m.x - v.ox) / v.s
      const wy = (size.h - m.y - v.oy) / v.s
      setCursor({ x: wx, y: wy })
      return v
    })
    if (!ptrs.current.has(e.pointerId)) return
    const prev = ptrs.current.get(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dragRef.current && (Math.abs(e.clientX - dragRef.current.x) > 3 || Math.abs(e.clientY - dragRef.current.y) > 3)) {
      dragRef.current.moved = true
    }
    if (ptrs.current.size === 2) {
      const ps = Array.from(ptrs.current.values())
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y)
      const p0 = pinchRef.current
      if (p0 && d > 0) setView((v) => ({ ...v, s: Math.min(6000, Math.max(0.004, p0.s * (d / p0.d))) }))
      return
    }
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    setView((v) => ({ ...v, ox: v.ox + dx, oy: v.oy - dy }))
  }

  const onPointerUp = (e) => {
    const wasSingle = ptrs.current.size === 1
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinchRef.current = null
    if (wasSingle && dragRef.current && !dragRef.current.moved && onPointClick) {
      const m = screenPos(e)
      let best = -1
      let bd = 18
      points.forEach((p, i) => {
        const sx = view.ox + p.x * view.s
        const sy = size.h - (view.oy + p.y * view.s)
        const d = Math.hypot(sx - m.x, sy - m.y)
        if (d < bd) { bd = d; best = i }
      })
      if (best >= 0) onPointClick(best)
    }
    dragRef.current = null
  }

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const wheel = (e) => {
      e.preventDefault()
      const r = cv.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015))
    }
    cv.addEventListener('wheel', wheel, { passive: false })
    const ctxmenu = (e) => e.preventDefault()
    cv.addEventListener('contextmenu', ctxmenu)
    return () => {
      cv.removeEventListener('wheel', wheel)
      cv.removeEventListener('contextmenu', ctxmenu)
    }
  }, [zoomAt])

  /* ---------- gambar ---------- */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(size.w * dpr)
    cv.height = Math.round(size.h * dpr)
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const W = size.w
    const H = size.h
    const v = view
    const S = (x, y) => ({ x: v.ox + x * v.s, y: H - (v.oy + y * v.s) })

    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H)
    bg.addColorStop(0, T.bg1)
    bg.addColorStop(1, T.bg0)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    /* grid + label sumbu */
    if (ui.grid) {
      const step = niceStep(W / v.s / 9)
      const x0 = Math.floor((0 - v.ox) / v.s / step) * step
      const x1 = (W - v.ox) / v.s
      const y0 = Math.floor((0 - v.oy) / v.s / step) * step
      const y1 = (H - v.oy) / v.s
      ctx.font = '10px ' + MONO
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      for (let gx = x0; gx <= x1 + 1e-9; gx += step) {
        const gr = Math.round(gx * 1e4) / 1e4
        const px = Math.round(v.ox + gr * v.s) + 0.5
        const major = Math.abs(gr / (step * 5) - Math.round(gr / (step * 5))) < 1e-6
        ctx.strokeStyle = major ? T.gridMajor : T.gridMinor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, H)
        ctx.stroke()
        if (major) {
          ctx.fillStyle = T.gridText
          ctx.fillText(String(gr), px, H - 32)
        }
      }
      for (let gy = y0; gy <= y1 + 1e-9; gy += step) {
        const gr = Math.round(gy * 1e4) / 1e4
        const py = Math.round(H - (v.oy + gr * v.s)) + 0.5
        const major = Math.abs(gr / (step * 5) - Math.round(gr / (step * 5))) < 1e-6
        ctx.strokeStyle = major ? T.gridMajor : T.gridMinor
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(W, py)
        ctx.stroke()
        if (major) {
          ctx.fillStyle = T.gridText
          ctx.textAlign = 'left'
          ctx.fillText(String(gr), 10, py - 5)
        }
      }
      ctx.fillStyle = 'rgba(143,160,189,0.9)'
      ctx.textAlign = 'right'
      ctx.font = '700 10px ' + MONO
      ctx.fillText('X (m)', W - 14, H - 32)
      ctx.textAlign = 'left'
      ctx.fillText('Y (m)', 10, 20)
    }

    const n = points.length
    if (n === 0) {
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(226,232,240,0.8)'
      ctx.font = '700 15px ' + FONT
      ctx.fillText('Kanvas siap — belum ada titik', W / 2, H / 2 - 8)
      ctx.fillStyle = 'rgba(148,163,184,0.85)'
      ctx.font = '12.5px ' + FONT
      ctx.fillText('Tambahkan titik di panel kiri, atau muat contoh untuk melihat hasil plot', W / 2, H / 2 + 16)
      return
    }

    const closed = isTertutup(points)

    /* arsir luas */
    if (closed && ui.fill && n >= 4) {
      const hatch = makeHatch(T.hatch)
      ctx.save()
      ctx.beginPath()
      points.forEach((p, i) => {
        const q = S(p.x, p.y)
        if (i === 0) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
      })
      ctx.closePath()
      ctx.fillStyle = T.fill
      ctx.fill()
      if (hatch) {
        ctx.fillStyle = hatch
        ctx.fill()
      }
      ctx.strokeStyle = T.edge
      ctx.lineWidth = 1.4
      ctx.setLineDash([8, 6])
      ctx.stroke()
      ctx.restore()
    }

    /* garis lintasan */
    if (n >= 2) {
      ctx.save()
      ctx.shadowColor = T.glow
      ctx.shadowBlur = 12
      ctx.strokeStyle = T.line
      ctx.lineWidth = 3.2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      points.forEach((p, i) => {
        const q = S(p.x, p.y)
        if (i === 0) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
      })
      ctx.stroke()
      ctx.restore()

      /* chevron arah */
      ctx.lineWidth = 1.5
      for (let i = 0; i < n - 1; i++) {
        const a = S(points[i].x, points[i].y)
        const b = S(points[i + 1].x, points[i + 1].y)
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy)
        if (len < 34) continue
        const px = a.x + dx * 0.6
        const py = a.y + dy * 0.6
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(Math.atan2(dy, dx))
        ctx.beginPath()
        ctx.moveTo(8, 0)
        ctx.lineTo(-4.5, -6)
        ctx.lineTo(-4.5, 6)
        ctx.closePath()
        ctx.fillStyle = T.bg0
        ctx.fill()
        ctx.strokeStyle = T.line
        ctx.stroke()
        ctx.restore()
      }
    }

    /* label dimensi tiap segmen */
    if (ui.dims) {
      for (let i = 0; i < n - 1; i++) {
        const A = points[i]
        const B = points[i + 1]
        const a = S(A.x, A.y)
        const b = S(B.x, B.y)
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy)
        if (len < 40) continue
        const nx = -dy / len
        const ny = dx / len
        const side = i % 2 === 0 ? 1 : -1
        const mx = (a.x + b.x) / 2 + nx * 24 * side
        const my = (a.y + b.y) / 2 + ny * 24 * side
        const d = hitungJarak(A, B)
        const az = hitungAzimuth(A, B)
        const l1 = d.toFixed(2) + ' m'
        const l2 = az.toFixed(1) + '°'
        ctx.font = '700 11px ' + FONT
        const w1 = ctx.measureText(l1).width
        ctx.font = '600 10px ' + MONO
        const w2 = ctx.measureText(l2).width
        const bw = Math.max(w1, w2) + 18
        const bh = 33
        ctx.strokeStyle = 'rgba(148,163,184,0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2)
        ctx.lineTo(mx, my)
        ctx.stroke()
        rr(ctx, mx - bw / 2, my - bh / 2, bw, bh, 9)
        ctx.fillStyle = T.pillBg
        ctx.fill()
        ctx.strokeStyle = T.pillBd
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.fillStyle = T.pillTx
        ctx.font = '700 11px ' + FONT
        ctx.fillText(l1, mx, my - 3)
        ctx.fillStyle = T.pillSub
        ctx.font = '600 10px ' + MONO
        ctx.fillText(l2, mx, my + 11)
      }
    }

    /* busur sudut interior */
    if (closed && ui.angles && n >= 5) {
      const ring = points.slice(0, -1)
      ctx.font = '600 9.5px ' + MONO
      ctx.textAlign = 'center'
      for (let i = 0; i < ring.length; i++) {
        const prev = ring[(i - 1 + ring.length) % ring.length]
        const cur = ring[i]
        const next = ring[(i + 1) % ring.length]
        const deg = hitungSudut(prev, cur, next)
        if (deg == null) continue
        const c = S(cur.x, cur.y)
        const p1 = S(prev.x, prev.y)
        const p2 = S(next.x, next.y)
        const a1 = Math.atan2(p1.y - c.y, p1.x - c.x)
        const a2 = Math.atan2(p2.y - c.y, p2.x - c.x)
        ctx.strokeStyle = 'rgba(250,204,21,0.9)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(c.x, c.y, 22, a1, a2, false)
        ctx.stroke()
        let mid = (a1 + a2) / 2
        if (Math.abs(a1 - a2) > Math.PI) mid += Math.PI
        ctx.fillStyle = '#fde68a'
        ctx.fillText(deg.toFixed(0) + '°', c.x + Math.cos(mid) * 34, c.y + Math.sin(mid) * 34 + 3)
      }
    }

    /* titik stasiun */
    points.forEach((p, i) => {
      const c = S(p.x, p.y)
      const role = i === 0 ? T.start : (i === n - 1 ? (closed ? T.start : T.end) : T.mid)
      if (i === selected) {
        ctx.strokeStyle = T.sel
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.arc(c.x, c.y, 15, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.save()
      ctx.shadowColor = role
      ctx.shadowBlur = 10
      ctx.fillStyle = role
      ctx.beginPath()
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = T.bg0
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(c.x, c.y, 7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(c.x, c.y, 1.8, 0, Math.PI * 2)
      ctx.fill()

      if (ui.labels) {
        const tag = 'P' + (i + 1)
        ctx.font = '800 11px ' + FONT
        const tw = ctx.measureText(tag).width + 16
        rr(ctx, c.x - tw / 2, c.y - 31, tw, 19, 9)
        ctx.fillStyle = 'rgba(5,9,18,0.9)'
        ctx.fill()
        ctx.strokeStyle = role
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.fillStyle = '#f8fafc'
        ctx.textAlign = 'center'
        ctx.fillText(tag, c.x, c.y - 17)
        ctx.font = '9px ' + MONO
        ctx.fillStyle = 'rgba(203,213,225,0.9)'
        ctx.fillText(p.x.toFixed(1) + ', ' + p.y.toFixed(1), c.x, c.y + 24)
      }
    })

    /* vektor closing error */
    if (!closed && n >= 2) {
      const a = S(points[0].x, points[0].y)
      const b = S(points[n - 1].x, points[n - 1].y)
      ctx.save()
      ctx.strokeStyle = T.err
      ctx.lineWidth = 1.8
      ctx.setLineDash([7, 6])
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(a.x, a.y)
      ctx.stroke()
      ctx.restore()
      const d = hitungJarak(points[0], points[n - 1])
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const txt = 'Δ ' + d.toFixed(3) + ' m'
      ctx.font = '700 10.5px ' + MONO
      const tw = ctx.measureText(txt).width + 18
      rr(ctx, mx - tw / 2, my - 26, tw, 19, 9)
      ctx.fillStyle = T.pillBg
      ctx.fill()
      ctx.strokeStyle = T.err
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.fillStyle = T.errTx
      ctx.textAlign = 'center'
      ctx.fillText(txt, mx, my - 12)
    }

    /* centroid + luas */
    if (closed && n >= 4) {
      const ring = points.slice(0, -1)
      const cen = hitungCentroid(ring)
      if (cen) {
        const c = S(cen.x, cen.y)
        ctx.strokeStyle = 'rgba(52,211,153,0.95)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(c.x - 9, c.y)
        ctx.lineTo(c.x + 9, c.y)
        ctx.moveTo(c.x, c.y - 9)
        ctx.lineTo(c.x, c.y + 9)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2)
        ctx.stroke()
        const luas = hitungLuasPoligon(ring)
        const txt = 'Luas ' + fmt(luas, 2) + ' m²'
        ctx.font = '700 11.5px ' + FONT
        const tw = ctx.measureText(txt).width + 22
        rr(ctx, c.x - tw / 2, c.y + 16, tw, 23, 11)
        ctx.fillStyle = 'rgba(4,32,24,0.94)'
        ctx.fill()
        ctx.strokeStyle = T.edge
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.fillStyle = '#a7f3d0'
        ctx.textAlign = 'center'
        ctx.fillText(txt, c.x, c.y + 32)
      }
    }

    /* kompas */
    const nx = W - 46
    const ny = 48
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 12
    ctx.fillStyle = 'rgba(6,10,22,0.88)'
    ctx.beginPath()
    ctx.arc(nx, ny, 25, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(nx, ny, 25, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(nx, ny - 15)
    ctx.lineTo(nx + 7, ny + 5)
    ctx.lineTo(nx, ny + 1)
    ctx.closePath()
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(nx, ny - 15)
    ctx.lineTo(nx - 7, ny + 5)
    ctx.lineTo(nx, ny + 1)
    ctx.closePath()
    ctx.fillStyle = 'rgba(148,163,184,0.65)'
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '800 10px ' + FONT
    ctx.textAlign = 'center'
    ctx.fillText('U', nx, ny + 18)

    /* skalabar */
    const target = 150 / v.s
    const segLen = niceStep(target)
    const px = segLen * v.s
    const reps = Math.max(1, Math.floor(170 / px))
    const totalW = segLen * reps * v.s
    const sx0 = 18
    const sy0 = H - 24
    for (let i = 0; i < reps; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#cbd5e1' : 'rgba(148,163,184,0.35)'
      ctx.fillRect(sx0 + i * px, sy0 - 6, px, 6)
    }
    ctx.strokeStyle = 'rgba(203,213,225,0.75)'
    ctx.lineWidth = 1
    ctx.strokeRect(sx0 + 0.5, sy0 - 5.5, totalW, 6)
    ctx.fillStyle = 'rgba(203,213,225,0.9)'
    ctx.font = '9.5px ' + MONO
    ctx.textAlign = 'center'
    for (let i = 0; i <= reps; i++) {
      ctx.fillText(String(Math.round(segLen * i * 100) / 100), sx0 + i * px, sy0 - 10)
    }
    ctx.fillStyle = 'rgba(148,163,184,0.8)'
    ctx.textAlign = 'left'
    ctx.fillText('skala meter', sx0, sy0 + 16)

    /* crosshair kursor */
    if (cursor) {
      const cx = v.ox + cursor.x * v.s
      const cy = H - (v.oy + cursor.y * v.s)
      if (cx > 0 && cx < W && cy > 0 && cy < H) {
        ctx.strokeStyle = 'rgba(226,232,240,0.16)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(cx, 0)
        ctx.lineTo(cx, H)
        ctx.moveTo(0, cy)
        ctx.lineTo(W, cy)
        ctx.stroke()
        ctx.setLineDash([])
        const txt = cursor.x.toFixed(2) + ' , ' + cursor.y.toFixed(2)
        ctx.font = '600 10px ' + MONO
        const tw = ctx.measureText(txt).width + 16
        const bx = Math.min(W - tw - 6, Math.max(6, cx + 14))
        const by = Math.min(H - 26, Math.max(6, cy + 14))
        rr(ctx, bx, by, tw, 18, 8)
        ctx.fillStyle = 'rgba(5,9,18,0.92)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(148,163,184,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.textAlign = 'left'
        ctx.fillText(txt, bx + 8, by + 13)
      }
    }
  }, [size, view, dataKey, ui, selected, cursor])

  const toggle = (k) => setUi((s) => ({ ...s, [k]: !s[k] }))

  return (
    <div className="procanvas">
      <div className="procanvas__frame" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="procanvas__cv"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => { setCursor(null); onHover && onHover(null) }}
        />
        <div className="procanvas__hint">
          <span className="procanvas__hint--desk">scroll = zoom · drag = geser · klik titik = pilih</span>
          <span className="procanvas__hint--mob">cubit 2 jari = zoom · geser = pan · ketuk titik</span>
        </div>
      </div>

      <div className="procanvas__bar">
        <div className="procanvas__tools">
          <button title="Perbesar" aria-label="Perbesar" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.25)}>+</button>
          <button title="Perkecil" aria-label="Perkecil" onClick={() => zoomAt(size.w / 2, size.h / 2, 0.8)}>&minus;</button>
          <button title="Pas ke lintasan" onClick={() => fit(points, size.w, size.h)}>Fit</button>
          <button title="Unduh PNG" onClick={() => {
            const cv = canvasRef.current
            if (!cv) return
            const a = document.createElement('a')
            a.download = 'lintasan-pengukuran.png'
            a.href = cv.toDataURL('image/png')
            a.click()
          }}>PNG</button>
        </div>
        <div className="procanvas__layers">
          <button className={ui.grid ? 'on' : ''} onClick={() => toggle('grid')} title="Grid">Grid</button>
          <button className={ui.dims ? 'on' : ''} onClick={() => toggle('dims')} title="Dimensi">Dim</button>
          <button className={ui.fill ? 'on' : ''} onClick={() => toggle('fill')} title="Arsir luas">Fill</button>
          <button className={ui.angles ? 'on' : ''} onClick={() => toggle('angles')} title="Sudut">Angle</button>
          <button className={ui.labels ? 'on' : ''} onClick={() => toggle('labels')} title="Label">Label</button>
        </div>
      </div>
    </div>
  )
}

const ProCanvas = forwardRef(ProCanvasInner)
export default ProCanvas
