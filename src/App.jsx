import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════════*/

function getRatio(w, h) {
  if (!w || !h) return 'unknown'
  const r = w / h
  if (r < 0.95) return 'portrait'
  if (r <= 1.05) return 'square'
  return 'landscape'
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function fmtDuration(s) {
  if (!s || !isFinite(s)) return '--:--'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

function getFileExt(name) {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : '—'
}

function lsLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch { return fallback }
}
function lsSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

/* ════════════════════════════════════════════════════════════════════════════
   ICON (inline SVG — no dependency)
   ════════════════════════════════════════════════════════════════════════════*/

const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
)

const IC = {
  upload:    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  heart:     'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  trash:     'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2',
  search:    ['M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M21 21l-4.35-4.35'],
  sort:      'M3 6h18M7 12h10M11 18h2',
  image:     ['M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z','M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z','M21 15l-5-5L5 21'],
  x:         'M18 6L6 18M6 6l12 12',
  portrait:  'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  landscape: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  square:    'M3 3h18v18H3z',
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  grid:      'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  info:      ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 16v-4M12 8h.01'],
  chevDown:  'M6 9l6 6 6-6',
  video:     ['M23 7l-7 5 7 5V7z','M14 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2z'],
  play:      'M5 3l14 9-14 9V3z',
  clock:     ['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z','M12 6v6l4 2'],
  film:      ['M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5M2 2h20v20H2z'],
  maximize:  ['M15 3h6v6','M9 21H3v-6','M21 3l-7 7','M3 21l7-7'],
  eye:       ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
}

/* ════════════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ════════════════════════════════════════════════════════════════════════════*/

function StatBadge({ label, value }) {
  return (
    <div className="stat-badge">
      <span className="stat-badge-val">{value}</span>
      <span className="stat-badge-lbl">{label}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   PHOTO CARD
   ════════════════════════════════════════════════════════════════════════════*/

function PhotoCard({ img, isFav, onFav, onRemove, onClick }) {
  return (
    <div className="media-card">
      <div className="media-thumb-wrap">
        <img src={img.url} alt={img.name} className="media-thumb" loading="lazy" />
        {/* Format badge top-right */}
        <span className="fmt-badge">{getFileExt(img.name)}</span>
        {/* Preview button centered */}
        <button className="ov-preview-btn" onClick={() => onClick(img)}
          aria-label={`Preview ${img.name}`} title="Preview">
          <Icon d={IC.eye} size={15} stroke="#fff" />
        </button>
        {/* Hover overlay with action buttons */}
        <div className="media-overlay">
          <button className={`ov-btn fav-btn ${isFav ? 'fav-active' : ''}`}
            onClick={() => onFav(img.id)} aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
            <Icon d={IC.heart} size={14} fill={isFav ? '#fff' : 'none'} stroke="#fff" />
          </button>
          <button className="ov-btn del-btn" onClick={() => onRemove(img.id)}
            aria-label="Remove photo" title="Remove">
            <Icon d={IC.trash} size={14} stroke="#fff" />
          </button>
        </div>
        {isFav && <span className="fav-dot" aria-hidden="true" />}
      </div>
      <div className="media-info">
        <p className="media-name" title={img.name}>{img.name}</p>
        <div className="meta-grid">
          <span className="mg-label">Size</span>
          <span className="mg-value mono">{fmtSize(img.size)}</span>
          <span className="mg-label">Dims</span>
          <span className="mg-value mono">{img.width}×{img.height}</span>
          <span className="mg-label">Format</span>
          <span className="mg-value mono">{getFileExt(img.name)}</span>
          <span className="mg-label">Aspect</span>
          <span className="mg-value">
            <span className={`tag tag-${img.ratio}`}>{img.ratio}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   VIDEO CARD
   ════════════════════════════════════════════════════════════════════════════*/

function VideoCard({ vid, isFav, onFav, onRemove, onClick }) {
  return (
    <div className="media-card" onClick={() => onClick(vid)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(vid)}
      aria-label={`Preview ${vid.name}`}>
      <div className="media-thumb-wrap">
        {vid.thumbUrl
          ? <img src={vid.thumbUrl} alt={vid.name} className="media-thumb" loading="lazy" />
          : <div className="vid-placeholder"><Icon d={IC.film} size={32} stroke="#94a3b8" /></div>
        }
        {/* Duration overlay — bottom-left */}
        <div className="vid-dur-badge mono">{fmtDuration(vid.duration)}</div>
        {/* Format badge — top-right */}
        <span className="fmt-badge">{getFileExt(vid.name)}</span>
        {/* Play ring — center */}
        <div className="vid-play-ring" aria-hidden="true">
          <Icon d={IC.play} size={16} stroke="#fff" fill="#fff" />
        </div>
        <div className="media-overlay">
          <button className={`ov-btn fav-btn ${isFav ? 'fav-active' : ''}`}
            onClick={e => { e.stopPropagation(); onFav(vid.id) }}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
            <Icon d={IC.heart} size={14} fill={isFav ? '#fff' : 'none'} stroke="#fff" />
          </button>
          <button className="ov-btn del-btn"
            onClick={e => { e.stopPropagation(); onRemove(vid.id) }}
            aria-label="Remove video" title="Remove">
            <Icon d={IC.trash} size={14} stroke="#fff" />
          </button>
        </div>
        {isFav && <span className="fav-dot" aria-hidden="true" />}
      </div>
      <div className="media-info">
        <p className="media-name" title={vid.name}>{vid.name}</p>
        <div className="meta-grid">
          <span className="mg-label">Duration</span>
          <span className="mg-value mono">{fmtDuration(vid.duration)}</span>
          <span className="mg-label">Resolution</span>
          <span className="mg-value mono">{vid.width && vid.height ? `${vid.width}×${vid.height}` : 'N/A'}</span>
          <span className="mg-label">Size</span>
          <span className="mg-value mono">{fmtSize(vid.size)}</span>
          <span className="mg-label">Format</span>
          <span className="mg-value mono">{getFileExt(vid.name)}</span>
          <span className="mg-label">Aspect</span>
          <span className="mg-value">
            {vid.ratio !== 'unknown'
              ? <span className={`tag tag-${vid.ratio}`}>{vid.ratio}</span>
              : <span className="mg-value mono">—</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   PHOTO PREVIEW MODAL
   ════════════════════════════════════════════════════════════════════════════*/

function PhotoPreview({ img, isFav, onFav, onClose }) {
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="preview-backdrop" onClick={onClose} role="dialog" aria-modal="true"
      aria-label={`Photo preview: ${img.name}`}>
      <div className="preview-panel" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <h2 className="preview-title" title={img.name}>{img.name}</h2>
          <div className="preview-actions">
            <button className={`preview-fav-btn ${isFav ? 'active' : ''}`}
              onClick={() => onFav(img.id)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
              <Icon d={IC.heart} size={15} fill={isFav ? 'currentColor' : 'none'} />
              {isFav ? 'Favorited' : 'Favorite'}
            </button>
            <button className="preview-close" onClick={onClose} aria-label="Close preview">
              <Icon d={IC.x} size={17} />
            </button>
          </div>
        </div>
        <div className="preview-body">
          <img className="preview-image" src={img.url} alt={img.name} />
        </div>
        <div className="preview-meta-row">
          <div className="pm-item">
            <span className="pm-label">Dimensions</span>
            <span className="pm-value mono">{img.width}×{img.height}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">Aspect</span>
            <span className="pm-value">
              <span className={`tag tag-${img.ratio}`}>{img.ratio}</span>
            </span>
          </div>
          <div className="pm-item">
            <span className="pm-label">File Size</span>
            <span className="pm-value mono">{fmtSize(img.size)}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">Format</span>
            <span className="pm-value mono">{getFileExt(img.name)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   VIDEO PREVIEW MODAL
   ════════════════════════════════════════════════════════════════════════════*/

function VideoPreview({ vid, isFav, onFav, onClose }) {
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="preview-backdrop" onClick={onClose} role="dialog" aria-modal="true"
      aria-label={`Video preview: ${vid.name}`}>
      <div className="preview-panel" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <h2 className="preview-title" title={vid.name}>{vid.name}</h2>
          <div className="preview-actions">
            <button className={`preview-fav-btn ${isFav ? 'active' : ''}`}
              onClick={() => onFav(vid.id)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
              <Icon d={IC.heart} size={15} fill={isFav ? 'currentColor' : 'none'} />
              {isFav ? 'Favorited' : 'Favorite'}
            </button>
            <button className="preview-close" onClick={onClose} aria-label="Close preview">
              <Icon d={IC.x} size={17} />
            </button>
          </div>
        </div>
        <div className="preview-body">
          <video className="preview-video" src={vid.url} controls autoPlay />
        </div>
        <div className="preview-meta-row">
          <div className="pm-item">
            <span className="pm-label">Duration</span>
            <span className="pm-value mono">{fmtDuration(vid.duration)}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">Resolution</span>
            <span className="pm-value mono">{vid.width && vid.height ? `${vid.width}×${vid.height}` : 'N/A'}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">File Size</span>
            <span className="pm-value mono">{fmtSize(vid.size)}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">Format</span>
            <span className="pm-value mono">{getFileExt(vid.name)}</span>
          </div>
          <div className="pm-item">
            <span className="pm-label">Aspect</span>
            <span className="pm-value">
              {vid.ratio !== 'unknown'
                ? <span className={`tag tag-${vid.ratio}`}>{vid.ratio}</span>
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   IMPORT ZONE (shared between tabs)
   ════════════════════════════════════════════════════════════════════════════*/

function ImportZone({ accept, label, hint, dragging, setDragging, onFiles, inputRef, collapsed }) {
  return (
    <section
      className={`import-zone ${dragging ? 'dragging' : ''} ${collapsed ? 'collapsed' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current.click()}
      role="button" tabIndex={0} aria-label={label}
      onKeyDown={e => e.key === 'Enter' && inputRef.current.click()}
    >
      <Icon d={IC.upload} size={collapsed ? 15 : 18} stroke="var(--accent)" />
      <div className="import-text">
        <span className="import-label">{dragging ? 'Release to import' : label}</span>
        {!collapsed && <span className="import-hint">{hint}</span>}
      </div>
      <input ref={inputRef} type="file" accept={accept} multiple hidden
        onChange={e => { onFiles(e.target.files); e.target.value = '' }} />
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   TOOLBAR (shared between tabs)
   ════════════════════════════════════════════════════════════════════════════*/

function Toolbar({ search, setSearch, filter, setFilter, filters, sortBy, setSortBy, sortOptions,
  itemCount, displayedCount, confirmClear, setConfirmClear, onClear, label }) {
  return (
    <>
      <section className="toolbar">
        <div className="search-wrap">
          <Icon d={IC.search} size={14} stroke="#9ca3af" />
          <input className="search-input" placeholder={`Search ${label}…`}
            value={search} onChange={e => setSearch(e.target.value)}
            aria-label={`Search ${label}`} />
          {search && (
            <button className="icon-btn" onClick={() => setSearch('')}
              aria-label="Clear search">
              <Icon d={IC.x} size={12} stroke="#6b7280" />
            </button>
          )}
        </div>
        <div className="filter-strip" role="group" aria-label="Filter by aspect ratio">
          {filters.map(f => (
            <button key={f.key} className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="select-wrap">
          <Icon d={IC.sort} size={13} stroke="#6b7280" />
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}
            aria-label="Sort order">
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Icon d={IC.chevDown} size={12} stroke="#6b7280" />
        </div>
        {itemCount > 0 && (
          confirmClear ? (
            <div className="confirm-row">
              <span>Clear {itemCount} {label}?</span>
              <button className="btn-sm btn-danger" onClick={onClear}>Clear all</button>
              <button className="btn-sm btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-sm btn-ghost" onClick={() => setConfirmClear(true)}
              aria-label={`Clear all ${label}`}>
              <Icon d={IC.trash} size={12} /> Clear all
            </button>
          )
        )}
      </section>
      <div className="meta-bar">
        {itemCount > 0 && (
          <span className="result-count">
            {displayedCount} of {itemCount} {displayedCount !== itemCount ? 'shown' : label}
          </span>
        )}
      </div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   META FILTERS — Format / Resolution / File Size / Duration
   ════════════════════════════════════════════════════════════════════════════*/

const SIZE_RANGES = [
  { value: 'all',   label: 'Any Size' },
  { value: 'xs',    label: '< 1 MB' },
  { value: 'sm',    label: '1–10 MB' },
  { value: 'md',    label: '10–100 MB' },
  { value: 'lg',    label: '> 100 MB' },
]
const RES_RANGES = [
  { value: 'all',   label: 'Any Resolution' },
  { value: 'sd',    label: 'SD (< 720 p)' },
  { value: 'hd',    label: 'HD (720 p)' },
  { value: 'fhd',   label: 'FHD (1080 p)' },
  { value: '2k',    label: '2K (1440 p)' },
  { value: '4k',    label: '4K+ (2160 p+)' },
]
const DUR_RANGES = [
  { value: 'all',   label: 'Any Duration' },
  { value: 'short', label: '< 1 min' },
  { value: 'med',   label: '1–5 min' },
  { value: 'long',  label: '5–30 min' },
  { value: 'vlong', label: '> 30 min' },
]

function matchSize(size, range) {
  const MB = 1024 * 1024
  if (range === 'xs')  return size < MB
  if (range === 'sm')  return size >= MB && size < 10 * MB
  if (range === 'md')  return size >= 10 * MB && size < 100 * MB
  if (range === 'lg')  return size >= 100 * MB
  return true
}
function matchRes(h, range) {
  if (range === 'sd')  return h > 0 && h < 720
  if (range === 'hd')  return h >= 720 && h < 1080
  if (range === 'fhd') return h >= 1080 && h < 1440
  if (range === '2k')  return h >= 1440 && h < 2160
  if (range === '4k')  return h >= 2160
  return true
}
function matchDur(sec, range) {
  if (range === 'short') return sec < 60
  if (range === 'med')   return sec >= 60 && sec < 300
  if (range === 'long')  return sec >= 300 && sec < 1800
  if (range === 'vlong') return sec >= 1800
  return true
}

function MetaFilters({ formats, fmtFilter, setFmtFilter,
  sizeFilter, setSizeFilter, resFilter, setResFilter,
  durFilter, setDurFilter, showDuration, hasActiveExtra, onResetExtra }) {
  return (
    <div className="meta-filters-bar">
      <span className="mf-label">Filter</span>

      <div className="mf-select-wrap">
        <label className="mf-sel-label">Format</label>
        <select className="mf-select" value={fmtFilter} onChange={e => setFmtFilter(e.target.value)}
          aria-label="Filter by format">
          <option value="all">Any Format</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="mf-select-wrap">
        <label className="mf-sel-label">Resolution</label>
        <select className="mf-select" value={resFilter} onChange={e => setResFilter(e.target.value)}
          aria-label="Filter by resolution">
          {RES_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="mf-select-wrap">
        <label className="mf-sel-label">File Size</label>
        <select className="mf-select" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
          aria-label="Filter by file size">
          {SIZE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {showDuration && (
        <div className="mf-select-wrap">
          <label className="mf-sel-label">Duration</label>
          <select className="mf-select" value={durFilter} onChange={e => setDurFilter(e.target.value)}
            aria-label="Filter by duration">
            {DUR_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}

      {hasActiveExtra && (
        <button className="mf-reset-btn" onClick={onResetExtra} title="Clear all metadata filters"
          aria-label="Reset metadata filters">
          <Icon d={IC.x} size={11} /> Reset filters
        </button>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════════════════════════════════*/

export default function App() {
  /* ── tab ── */
  const [tab, setTab] = useState('photos')

  /* ── photos state ── */
  const [images, setImages]         = useState([])
  const [imgFavs, setImgFavs]       = useState(() => lsLoad('fs_img_favs', []))
  const [imgFilter, setImgFilter]   = useState('all')
  const [imgSearch, setImgSearch]   = useState('')
  const [imgSort, setImgSort]       = useState('name-asc')
  const [imgConfirm, setImgConfirm] = useState(false)
  const [imgDrag, setImgDrag]       = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const imgInputRef = useRef()
  /* photo meta-filters */
  const [imgFmtFilter, setImgFmtFilter]   = useState('all')
  const [imgSizeFilter, setImgSizeFilter] = useState('all')
  const [imgResFilter, setImgResFilter]   = useState('all')

  /* ── videos state ── */
  const [videos, setVideos]         = useState([])
  const [vidFavs, setVidFavs]       = useState(() => lsLoad('fs_vid_favs', []))
  const [vidFilter, setVidFilter]   = useState('all')
  const [vidSearch, setVidSearch]   = useState('')
  const [vidSort, setVidSort]       = useState('name-asc')
  const [vidConfirm, setVidConfirm] = useState(false)
  const [vidDrag, setVidDrag]       = useState(false)
  const [previewVid, setPreviewVid] = useState(null)
  const vidInputRef = useRef()
  /* video meta-filters */
  const [vidFmtFilter, setVidFmtFilter]   = useState('all')
  const [vidSizeFilter, setVidSizeFilter] = useState('all')
  const [vidResFilter, setVidResFilter]   = useState('all')
  const [vidDurFilter, setVidDurFilter]   = useState('all')

  /* ── persist favorites ── */
  useEffect(() => { lsSave('fs_img_favs', imgFavs) }, [imgFavs])
  useEffect(() => { lsSave('fs_vid_favs', vidFavs) }, [vidFavs])

  /* ── revoke object URLs on unmount ── */
  useEffect(() => () => {
    images.forEach(i => URL.revokeObjectURL(i.url))
    videos.forEach(v => { URL.revokeObjectURL(v.url); if (v.thumbUrl) URL.revokeObjectURL(v.thumbUrl) })
  }, []) // eslint-disable-line

  /* ───────── PHOTO IMPORT ───────── */
  const handleImageFiles = useCallback(files => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    const keys = new Set(images.map(i => i.name + i.size))
    const promises = arr.map(file => new Promise(resolve => {
      if (keys.has(file.name + file.size)) { resolve(null); return }
      const url = URL.createObjectURL(file)
      const el = new Image()
      el.onload = () => resolve({
        id: crypto.randomUUID(), name: file.name, size: file.size,
        width: el.naturalWidth, height: el.naturalHeight,
        ratio: getRatio(el.naturalWidth, el.naturalHeight), url
      })
      el.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      el.src = url
    }))
    Promise.all(promises).then(r => {
      const v = r.filter(Boolean)
      if (v.length) setImages(p => [...p, ...v])
    })
  }, [images])

  /* ───────── VIDEO IMPORT ───────── */
  const handleVideoFiles = useCallback(files => {
    const arr = Array.from(files).filter(f => f.type.startsWith('video/'))
    if (!arr.length) return
    const keys = new Set(videos.map(v => v.name + v.size))
    const promises = arr.map(file => new Promise(resolve => {
      if (keys.has(file.name + file.size)) { resolve(null); return }
      const url = URL.createObjectURL(file)
      const el = document.createElement('video')
      el.preload = 'metadata'
      el.muted = true

      const timer = setTimeout(() => {
        resolve({ id: crypto.randomUUID(), name: file.name, size: file.size,
          width: 0, height: 0, duration: 0, ratio: 'unknown', url, thumbUrl: null })
      }, 6000)

      el.onloadedmetadata = () => {
        clearTimeout(timer)
        const w = el.videoWidth || 0
        const h = el.videoHeight || 0
        const dur = el.duration || 0
        const ratio = getRatio(w, h)

        el.currentTime = Math.min(1, dur / 2)
        el.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = w || 320; canvas.height = h || 180
            const ctx = canvas.getContext('2d')
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blob => {
              const thumbUrl = blob ? URL.createObjectURL(blob) : null
              resolve({ id: crypto.randomUUID(), name: file.name, size: file.size,
                width: w, height: h, duration: dur, ratio, url, thumbUrl })
            })
          } catch {
            resolve({ id: crypto.randomUUID(), name: file.name, size: file.size,
              width: w, height: h, duration: dur, ratio, url, thumbUrl: null })
          }
        }
        setTimeout(() => {
          resolve({ id: crypto.randomUUID(), name: file.name, size: file.size,
            width: w, height: h, duration: dur, ratio, url, thumbUrl: null })
        }, 3000)
      }
      el.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(null) }
      el.src = url
    }))
    Promise.all(promises).then(r => {
      const v = r.filter(Boolean)
      if (v.length) setVideos(p => [...p, ...v])
    })
  }, [videos])

  /* ───────── REMOVE / CLEAR helpers ───────── */
  const removeImage = id => {
    setImages(p => {
      const it = p.find(i => i.id === id)
      if (it) URL.revokeObjectURL(it.url)
      return p.filter(i => i.id !== id)
    })
    setImgFavs(p => p.filter(f => f !== id))
    if (previewImg?.id === id) setPreviewImg(null)
  }
  const clearImages = () => {
    images.forEach(i => URL.revokeObjectURL(i.url))
    setImages([]); setImgFavs([]); setImgConfirm(false); setPreviewImg(null)
  }

  const removeVideo = id => {
    setVideos(p => {
      const it = p.find(v => v.id === id)
      if (it) { URL.revokeObjectURL(it.url); if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl) }
      return p.filter(v => v.id !== id)
    })
    setVidFavs(p => p.filter(f => f !== id))
    if (previewVid?.id === id) setPreviewVid(null)
  }
  const clearVideos = () => {
    videos.forEach(v => { URL.revokeObjectURL(v.url); if (v.thumbUrl) URL.revokeObjectURL(v.thumbUrl) })
    setVideos([]); setVidFavs([]); setVidConfirm(false); setPreviewVid(null)
  }

  const toggleImgFav = id => setImgFavs(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id])
  const toggleVidFav = id => setVidFavs(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id])

  /* ───────── Derived format lists ───────── */
  const imgFormats = [...new Set(images.map(i => getFileExt(i.name)))].sort()
  const vidFormats = [...new Set(videos.map(v => getFileExt(v.name)))].sort()

  /* ───────── FILTER/SORT: photos ───────── */
  const displayedImages = images
    .filter(i => imgFilter === 'favorites' ? imgFavs.includes(i.id) : imgFilter !== 'all' ? i.ratio === imgFilter : true)
    .filter(i => i.name.toLowerCase().includes(imgSearch.toLowerCase()))
    .filter(i => imgFmtFilter  === 'all' || getFileExt(i.name) === imgFmtFilter)
    .filter(i => matchSize(i.size, imgSizeFilter))
    .filter(i => matchRes(i.height, imgResFilter))
    .sort((a, b) => {
      if (imgSort === 'name-asc')  return a.name.localeCompare(b.name)
      if (imgSort === 'name-desc') return b.name.localeCompare(a.name)
      if (imgSort === 'size-asc')  return a.size - b.size
      if (imgSort === 'size-desc') return b.size - a.size
      return 0
    })

  /* ───────── FILTER/SORT: videos ───────── */
  const displayedVideos = videos
    .filter(v => vidFilter === 'favorites' ? vidFavs.includes(v.id) : vidFilter !== 'all' ? v.ratio === vidFilter : true)
    .filter(v => v.name.toLowerCase().includes(vidSearch.toLowerCase()))
    .filter(v => vidFmtFilter  === 'all' || getFileExt(v.name) === vidFmtFilter)
    .filter(v => matchSize(v.size, vidSizeFilter))
    .filter(v => matchRes(v.height, vidResFilter))
    .filter(v => matchDur(v.duration || 0, vidDurFilter))
    .sort((a, b) => {
      if (vidSort === 'name-asc')  return a.name.localeCompare(b.name)
      if (vidSort === 'name-desc') return b.name.localeCompare(a.name)
      if (vidSort === 'size-asc')  return a.size - b.size
      if (vidSort === 'size-desc') return b.size - a.size
      if (vidSort === 'dur-asc')   return (a.duration || 0) - (b.duration || 0)
      if (vidSort === 'dur-desc')  return (b.duration || 0) - (a.duration || 0)
      return 0
    })

  /* ───────── Reset helpers ───────── */
  const resetImgExtra = () => { setImgFmtFilter('all'); setImgSizeFilter('all'); setImgResFilter('all') }
  const resetVidExtra = () => { setVidFmtFilter('all'); setVidSizeFilter('all'); setVidResFilter('all'); setVidDurFilter('all') }
  const imgHasExtra = imgFmtFilter !== 'all' || imgSizeFilter !== 'all' || imgResFilter !== 'all'
  const vidHasExtra = vidFmtFilter !== 'all' || vidSizeFilter !== 'all' || vidResFilter !== 'all' || vidDurFilter !== 'all'

  /* ───────── STATS ───────── */
  const imgP = images.filter(i => i.ratio === 'portrait').length
  const imgL = images.filter(i => i.ratio === 'landscape').length
  const imgS = images.filter(i => i.ratio === 'square').length
  const vidP = videos.filter(v => v.ratio === 'portrait').length
  const vidL = videos.filter(v => v.ratio === 'landscape').length
  const vidS = videos.filter(v => v.ratio === 'square').length

  const filterDefs = [
    { key: 'all',       label: 'All' },
    { key: 'portrait',  label: 'Portrait' },
    { key: 'landscape', label: 'Landscape' },
    { key: 'square',    label: 'Square' },
    { key: 'favorites', label: '♥ Faves' },
  ]
  const imgSortOpts = [
    { value: 'name-asc',  label: 'Name A → Z' },
    { value: 'name-desc', label: 'Name Z → A' },
    { value: 'size-asc',  label: 'Size ↑' },
    { value: 'size-desc', label: 'Size ↓' },
  ]
  const vidSortOpts = [
    ...imgSortOpts,
    { value: 'dur-asc',  label: 'Duration ↑' },
    { value: 'dur-desc', label: 'Duration ↓' },
  ]

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════════*/
  return (
    <div className="app">

      {/* ── SIDEBAR NAV RAIL ── */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-mark">
            <div className="brand-icon" aria-hidden="true">
              <Icon d={IC.film} size={15} stroke="#fff" />
            </div>
            <span className="brand-name">FrameSort <span>Lite</span></span>
          </div>
          <div className="brand-tagline">Media Workspace</div>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Library</div>

          <button
            className={`nav-item ${tab === 'photos' ? 'active' : ''}`}
            onClick={() => setTab('photos')}
            aria-current={tab === 'photos' ? 'page' : undefined}
          >
            <Icon d={IC.image} size={15} />
            <span>Photos</span>
            {images.length > 0 && <span className="nav-badge">{images.length}</span>}
          </button>

          <button
            className={`nav-item ${tab === 'videos' ? 'active' : ''}`}
            onClick={() => setTab('videos')}
            aria-current={tab === 'videos' ? 'page' : undefined}
          >
            <Icon d={IC.video} size={15} />
            <span>Videos</span>
            {videos.length > 0 && <span className="nav-badge">{videos.length}</span>}
          </button>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-dot" aria-hidden="true" />
          <span>
            {images.length} photo{images.length !== 1 ? 's' : ''}
            {' · '}
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </aside>

      {/* ── WORKSPACE ── */}
      <div className="workspace">

        {/* Workspace header — changes per tab */}
        {tab === 'photos' ? (
          <div className="workspace-header">
            <div className="ws-title-group">
              <div className="ws-label">Library</div>
              <h1 className="ws-title">Photos</h1>
              <p className="ws-sub">Review and organise your visual library.</p>
            </div>
            <div className="ws-actions">
              {images.length > 0 && (
                <div className="ws-count-chip">
                  <strong>{displayedImages.length}</strong>&nbsp;of&nbsp;<strong>{images.length}</strong>&nbsp;photos
                </div>
              )}
              <button className="btn-import" onClick={() => imgInputRef.current.click()}>
                <Icon d={IC.upload} size={13} />
                Import Photos
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" multiple hidden
                onChange={e => { handleImageFiles(e.target.files); e.target.value = '' }} />
            </div>
          </div>
        ) : (
          <div className="workspace-header">
            <div className="ws-title-group">
              <div className="ws-label">Library</div>
              <h1 className="ws-title">Videos</h1>
              <p className="ws-sub">Browse footage. Inspect details. Find the right shot.</p>
            </div>
            <div className="ws-actions">
              {videos.length > 0 && (
                <div className="ws-count-chip">
                  <strong>{displayedVideos.length}</strong>&nbsp;of&nbsp;<strong>{videos.length}</strong>&nbsp;clips
                </div>
              )}
              <button className="btn-import" onClick={() => vidInputRef.current.click()}>
                <Icon d={IC.upload} size={13} />
                Import Videos
              </button>
              <input ref={vidInputRef} type="file" accept="video/*" multiple hidden
                onChange={e => { handleVideoFiles(e.target.files); e.target.value = '' }} />
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="main">

          {/* ──────────── PHOTOS TAB ──────────── */}
          {tab === 'photos' && (
            <>
              {/* Import zone — wide when empty, compact strip when library has items */}
              <ImportZone accept="image/*"
                label={images.length > 0 ? 'Drop photos to import more' : 'Drop photos here to import'}
                hint="JPG, PNG, GIF, WebP, AVIF — or use the Import button above"
                dragging={imgDrag} setDragging={setImgDrag}
                onFiles={handleImageFiles} inputRef={imgInputRef}
                collapsed={images.length > 0} />

              {/* Stats row — only when library has content */}
              {images.length > 0 && (
                <section className="stats-strip" aria-label="Photo library stats">
                  <StatBadge label="Total" value={images.length} />
                  <StatBadge label="Portrait" value={imgP} />
                  <StatBadge label="Landscape" value={imgL} />
                  <StatBadge label="Square" value={imgS} />
                  <StatBadge label="Favorites" value={imgFavs.length} />
                </section>
              )}

              <Toolbar search={imgSearch} setSearch={setImgSearch} filter={imgFilter} setFilter={setImgFilter}
                filters={filterDefs} sortBy={imgSort} setSortBy={setImgSort} sortOptions={imgSortOpts}
                itemCount={images.length} displayedCount={displayedImages.length}
                confirmClear={imgConfirm} setConfirmClear={setImgConfirm} onClear={clearImages} label="photos" />

              {images.length > 0 && (
                <MetaFilters
                  formats={imgFormats} fmtFilter={imgFmtFilter} setFmtFilter={setImgFmtFilter}
                  sizeFilter={imgSizeFilter} setSizeFilter={setImgSizeFilter}
                  resFilter={imgResFilter} setResFilter={setImgResFilter}
                  durFilter="all" setDurFilter={() => {}} showDuration={false}
                  hasActiveExtra={imgHasExtra} onResetExtra={resetImgExtra} />
              )}

              {images.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-glyph"><Icon d={IC.image} size={28} stroke="#b0b8c4" /></div>
                  <p className="empty-title">No photos imported yet</p>
                  <p className="empty-sub">Drop images above, or click <strong>Import Photos</strong> to browse your files.</p>
                </div>
              ) : displayedImages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-glyph"><Icon d={IC.search} size={28} stroke="#b0b8c4" /></div>
                  <p className="empty-title">No matches found</p>
                  <p className="empty-sub">Try a different search term, aspect ratio, format, or size filter.</p>
                </div>
              ) : (
                <div className="gallery">
                  {displayedImages.map(img => (
                    <PhotoCard key={img.id} img={img} isFav={imgFavs.includes(img.id)}
                      onFav={toggleImgFav} onRemove={removeImage} onClick={setPreviewImg} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ──────────── VIDEOS TAB ──────────── */}
          {tab === 'videos' && (
            <>
              <ImportZone accept="video/*"
                label={videos.length > 0 ? 'Drop videos to import more' : 'Drop videos here to import'}
                hint="MP4, WebM, MOV, AVI — or use the Import button above"
                dragging={vidDrag} setDragging={setVidDrag}
                onFiles={handleVideoFiles} inputRef={vidInputRef}
                collapsed={videos.length > 0} />

              {videos.length > 0 && (
                <section className="stats-strip" aria-label="Video library stats">
                  <StatBadge label="Total" value={videos.length} />
                  <StatBadge label="Portrait" value={vidP} />
                  <StatBadge label="Landscape" value={vidL} />
                  <StatBadge label="Square" value={vidS} />
                  <StatBadge label="Favorites" value={vidFavs.length} />
                </section>
              )}

              <Toolbar search={vidSearch} setSearch={setVidSearch} filter={vidFilter} setFilter={setVidFilter}
                filters={filterDefs} sortBy={vidSort} setSortBy={setVidSort} sortOptions={vidSortOpts}
                itemCount={videos.length} displayedCount={displayedVideos.length}
                confirmClear={vidConfirm} setConfirmClear={setVidConfirm} onClear={clearVideos} label="videos" />

              {videos.length > 0 && (
                <MetaFilters
                  formats={vidFormats} fmtFilter={vidFmtFilter} setFmtFilter={setVidFmtFilter}
                  sizeFilter={vidSizeFilter} setSizeFilter={setVidSizeFilter}
                  resFilter={vidResFilter} setResFilter={setVidResFilter}
                  durFilter={vidDurFilter} setDurFilter={setVidDurFilter} showDuration={true}
                  hasActiveExtra={vidHasExtra} onResetExtra={resetVidExtra} />
              )}

              {videos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-glyph"><Icon d={IC.video} size={28} stroke="#b0b8c4" /></div>
                  <p className="empty-title">No videos imported yet</p>
                  <p className="empty-sub">Drop video files above, or click <strong>Import Videos</strong> to browse your footage.</p>
                </div>
              ) : displayedVideos.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-glyph"><Icon d={IC.search} size={28} stroke="#b0b8c4" /></div>
                  <p className="empty-title">No matches found</p>
                  <p className="empty-sub">Try a different search term, aspect ratio, format, size, or duration filter.</p>
                </div>
              ) : (
                <div className="gallery">
                  {displayedVideos.map(vid => (
                    <VideoCard key={vid.id} vid={vid} isFav={vidFavs.includes(vid.id)}
                      onFav={toggleVidFav} onRemove={removeVideo} onClick={setPreviewVid} />
                  ))}
                </div>
              )}
            </>
          )}

          <p className="persist-hint">
            <Icon d={IC.info} size={12} stroke="var(--text-3)" />
            Favorites are saved automatically. Media files must be re-imported after a page refresh.
          </p>
        </main>
      </div>

      {/* ── PHOTO PREVIEW MODAL ── */}
      {previewImg && (
        <PhotoPreview img={previewImg} isFav={imgFavs.includes(previewImg.id)}
          onFav={toggleImgFav} onClose={() => setPreviewImg(null)} />
      )}

      {/* ── VIDEO PREVIEW MODAL ── */}
      {previewVid && (
        <VideoPreview vid={previewVid} isFav={vidFavs.includes(previewVid.id)}
          onFav={toggleVidFav} onClose={() => setPreviewVid(null)} />
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-nav-bar" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          <button className={`mobile-nav-item ${tab === 'photos' ? 'active' : ''}`}
            onClick={() => setTab('photos')} aria-current={tab === 'photos' ? 'page' : undefined}>
            <Icon d={IC.image} size={20} />
            Photos {images.length > 0 && `(${images.length})`}
          </button>
          <button className={`mobile-nav-item ${tab === 'videos' ? 'active' : ''}`}
            onClick={() => setTab('videos')} aria-current={tab === 'videos' ? 'page' : undefined}>
            <Icon d={IC.video} size={20} />
            Videos {videos.length > 0 && `(${videos.length})`}
          </button>
        </div>
      </nav>
    </div>
  )
}
