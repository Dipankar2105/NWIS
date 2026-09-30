/**
 * NWIS Shared UI Components
 * Complete shared component library — DO NOT change design/theme.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './shared.css';

// ---- Source / Provenance Badge ----
const SOURCE_MAP = {
  'DEMO_SYNTHETIC': { label: 'PROTOTYPE DATA', cls: 'demo' },
  'PUBLIC_REFERENCE': { label: 'PUBLIC REFERENCE', cls: 'public' },
  'PUBLIC_INDIA_CONTEXT': { label: 'INDIA PUBLIC CONTEXT', cls: 'india' },
  'USER_UPLOADED': { label: 'USER UPLOAD', cls: 'user' },
};

export function SourceBadge({ sourceType, className = '' }) {
  const info = SOURCE_MAP[sourceType] || SOURCE_MAP['DEMO_SYNTHETIC'];
  return (
    <span className={`source-badge ${info.cls} ${className}`}>
      {info.label}
    </span>
  );
}

// ---- Severity Badge ----
const SEVERITY_ICONS = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
const SEVERITY_ARIA = { CRITICAL: 'Critical severity', HIGH: 'High severity', MEDIUM: 'Medium severity', LOW: 'Low severity' };

export function SeverityBadge({ severity, className = '' }) {
  const s = (severity || 'LOW').toUpperCase();
  return (
    <span
      className={`severity-badge ${s.toLowerCase()} ${className}`}
      title={SEVERITY_ARIA[s] || s}
      aria-label={SEVERITY_ARIA[s] || s}
    >
      <span aria-hidden="true">{SEVERITY_ICONS[s] || '⚪'}</span>
      {s}
    </span>
  );
}

// ---- Status Badge ----
const STATUS_DOTS = {
  drilling: '●', active: '●', active_drilling: '●',
  completed: '●', suspended: '◐', standby: '◐',
  abandoned: '●', planned: '○'
};

export function StatusBadge({ status, className = '' }) {
  const s = (status || 'standby').toLowerCase().replace(/ /g, '_');
  const label = status ? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) : 'Unknown';
  return (
    <span className={`status-badge ${s} ${className}`} aria-label={`Status: ${label}`}>
      <span aria-hidden="true">{STATUS_DOTS[s] || '○'}</span>
      {label}
    </span>
  );
}

// ---- Loading Skeleton ----
export function LoadingSkeleton({ type = 'text', count = 1, className = '' }) {
  const skeletonClass = {
    text: 'skeleton skeleton-text',
    title: 'skeleton skeleton-title',
    card: 'skeleton skeleton-card',
    row: 'skeleton skeleton-row',
    kpi: 'skeleton skeleton-kpi',
  }[type] || 'skeleton skeleton-text';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${skeletonClass} ${className}`} aria-hidden="true" />
      ))}
    </>
  );
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card">
          <LoadingSkeleton type="text" />
          <LoadingSkeleton type="title" />
          <LoadingSkeleton type="text" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div style={{ padding: '16px 20px' }} aria-label="Loading data..." aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} type="row" />
      ))}
    </div>
  );
}

// ---- Empty State ----
export function EmptyState({ icon = '📋', title, message, action = null }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

// ---- Error State ----
export function ErrorState({ title = 'Failed to load data', message, onRetry = null }) {
  return (
    <div className="error-state" role="alert" aria-live="assertive">
      <div className="error-state-icon" aria-hidden="true">⚠</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button
          className="btn-primary"
          onClick={onRetry}
          style={{ marginTop: 8 }}
          aria-label={`Retry: ${title}`}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---- Loading Overlay ----
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="loading-overlay" role="status" aria-label={message}>
      <div className="loading-spinner" aria-hidden="true" />
      <span className="loading-text">{message}</span>
    </div>
  );
}

// ---- KPI Card ----
export function KpiCard({ label, value, sub, icon, trend, accentColor, onClick }) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', borderTopColor: accentColor, borderTopWidth: accentColor ? 3 : undefined }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? `${label}: ${value}` : undefined}
    >
      {icon && <span className="kpi-card-icon" aria-hidden="true">{icon}</span>}
      <div className="kpi-card-label">{label}</div>
      <div className="kpi-card-value">{value ?? '–'}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}

// ---- Page Header ----
export function PageHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="page-header">
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </h1>
        {subtitle && <div className="page-header-sub">{subtitle}</div>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ---- Filter Bar ----
export function FilterBar({ children, chips = [], onClearAll }) {
  return (
    <div className="filter-bar" role="search">
      {children}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {chips.map((chip, i) => (
            <span key={i} className="filter-chip">
              {chip.label}
              {chip.onRemove && (
                <button
                  className="filter-chip-close"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label} filter`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {onClearAll && (
            <button
              onClick={onClearAll}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Modal ----
export function Modal({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus trap
      const el = overlayRef.current;
      if (el) el.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full',
  }[size] || 'modal-md';

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={overlayRef}
      tabIndex={-1}
    >
      <div className={`modal-container ${sizeClass} ${className}`}>
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ---- Confirm Dialog ----
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  requireTyping = null, // string the user must type to confirm
  isLoading = false
}) {
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    if (!isOpen) setTypedValue('');
  }, [isOpen]);

  const canConfirm = !requireTyping || typedValue === requireTyping;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={isLoading || !canConfirm}
            aria-busy={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      }
    >
      <div>
        {message && <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 16, lineHeight: 1.6 }}>{message}</p>}
        {requireTyping && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Type <strong style={{ color: '#e2e8f0' }}>{requireTyping}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={e => setTypedValue(e.target.value)}
              className="filter-input"
              style={{ width: '100%' }}
              placeholder={requireTyping}
              autoFocus
              aria-label={`Type ${requireTyping} to confirm`}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---- Drawer ----
export function Drawer({ isOpen, onClose, title, children, position = 'right', width = 420 }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen && typeof document !== 'undefined') return null;

  return createPortal(
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'drawer-overlay-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`drawer-panel drawer-${position} ${isOpen ? 'drawer-open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-header">
          <h2 id="drawer-title" className="drawer-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close panel">×</button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

// ---- Well Context Bar ----
export function WellContextBar({ well, wellId, onNavigate, lastUpdated }) {
  if (!well && !wellId) return null;

  const name = well?.well_name || well?.name || wellId || '—';
  const field = well?.field_name || well?.field || '—';
  const status = well?.status || '—';
  const depth = well?.total_depth_md || well?.current_depth_m || null;
  const area = well?.operational_area || '—';

  return (
    <div className="well-context-bar" role="status" aria-label={`Selected well: ${name}`}>
      <div className="well-context-left">
        <span className="well-context-label">Selected Well</span>
        <span className="well-context-name">{name}</span>
        <span className="well-context-meta">{field} · {area}</span>
      </div>
      <div className="well-context-right">
        {depth && <span className="well-context-chip">Depth: {depth.toLocaleString()} m</span>}
        {status && status !== '—' && (
          <span className={`well-context-status ${status.toLowerCase()}`}>{status}</span>
        )}
        {onNavigate && (
          <button className="well-context-action" onClick={onNavigate}>
            View Details →
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Data Last Updated ----
export function LastUpdatedBadge({ timestamp, onRefresh, isRefreshing = false, source = 'NWIS Prototype Dataset' }) {
  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="last-updated-bar">
      <span className="last-updated-text">
        Last updated: <strong>{formatTime(timestamp)}</strong>
      </span>
      <span className="last-updated-source">{source}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="last-updated-refresh"
          aria-label="Refresh data"
          title="Refresh data"
        >
          {isRefreshing ? '↻' : '↺'}
        </button>
      )}
    </div>
  );
}

// ---- Network Status Banner ----
export function NetworkStatusBanner({ isOnline }) {
  if (isOnline) return null;
  return (
    <div
      className="network-banner"
      role="alert"
      aria-live="assertive"
    >
      ⚠ Connection lost — changes will not be saved until connection is restored.
    </div>
  );
}

// ---- Search Input ----
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  isLoading = false,
  resultCount = null,
  className = '',
  id,
  autoFocus = false
}) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <span className="search-input-icon" aria-hidden="true">🔍</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input"
        autoFocus={autoFocus}
        aria-label={placeholder}
        aria-busy={isLoading}
      />
      {isLoading && <span className="search-input-spinner" aria-label="Searching..." />}
      {!isLoading && value && onClear && (
        <button
          onClick={onClear}
          className="search-input-clear"
          aria-label="Clear search"
          title="Clear search"
        >
          ×
        </button>
      )}
      {resultCount !== null && !isLoading && (
        <span className="search-input-count" aria-live="polite">
          {resultCount === 0 ? 'No results' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  );
}

// ---- Button with loading state ----
export function ActionButton({
  onClick,
  isLoading = false,
  disabled = false,
  children,
  loadingLabel = 'Processing...',
  variant = 'primary',
  type = 'button',
  icon = null,
  className = '',
  ...rest
}) {
  const cls = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${cls} ${className}`}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        <>
          {icon && <span aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

// ---- Responsive Table ----
export function ResponsiveTable({
  columns,         // [{ key, label, render?, sortable?, width? }]
  rows,            // array of data objects
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No data available.',
  emptyIcon = '📋',
  isLoading = false,
  mobileCard,      // optional: (row) => JSX for mobile card view
  className = '',
  sortField,
  sortDir,
  onSort,
}) {
  if (isLoading) return <TableSkeleton rows={5} />;

  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />;
  }

  return (
    <div className={`responsive-table-wrapper ${className}`}>
      {/* Desktop Table */}
      <table className="data-table desktop-table" role="grid" aria-rowcount={rows.length}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                scope="col"
                onClick={onSort && col.sortable ? () => onSort(col.key) : undefined}
                className={onSort && col.sortable ? 'sortable-col' : ''}
                aria-sort={sortField === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}
                {sortField === col.key && (
                  <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row[keyField] || idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
              role={onRowClick ? 'button' : 'row'}
              aria-label={onRowClick ? `View row ${idx + 1}` : undefined}
            >
              {columns.map(col => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="mobile-card-list" aria-label="Data list">
        {rows.map((row, idx) => (
          <div
            key={row[keyField] || idx}
            className="mobile-data-card"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
            role={onRowClick ? 'button' : undefined}
          >
            {mobileCard ? mobileCard(row) : (
              <div>
                {columns.slice(0, 4).map(col => (
                  <div key={col.key} className="mobile-data-card-row">
                    <span className="mobile-data-card-label">{col.label}</span>
                    <span className="mobile-data-card-value">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Pagination ----
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pagination-bar" role="navigation" aria-label="Pagination">
      <div className="pagination-info">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="pagination-btn"
          aria-label="Previous page"
        >
          ‹
        </button>
        {[...Array(Math.min(totalPages, 7))].map((_, i) => {
          const pg = i + 1;
          return (
            <button
              key={pg}
              onClick={() => onPageChange(pg)}
              className={`pagination-btn ${pg === page ? 'pagination-btn-active' : ''}`}
              aria-label={`Page ${pg}`}
              aria-current={pg === page ? 'page' : undefined}
            >
              {pg}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="pagination-btn"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="filter-select"
          aria-label="Results per page"
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ---- Form Field with validation ----
export function FormField({ label, required, error, hint, children, id }) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-required" aria-label="required"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && (
        <span className="form-error" role="alert" aria-live="polite">{error}</span>
      )}
    </div>
  );
}

// ---- Data Source badges (consistent) ----
export function DataSourceInfo({ source = 'PROTOTYPE DATA', timestamp }) {
  return (
    <div className="data-source-info">
      <SourceBadge sourceType={
        source === 'PROTOTYPE DATA' ? 'DEMO_SYNTHETIC' :
        source === 'PUBLIC REFERENCE' ? 'PUBLIC_REFERENCE' :
        source === 'INDIA PUBLIC CONTEXT' ? 'PUBLIC_INDIA_CONTEXT' :
        source === 'USER UPLOAD' ? 'USER_UPLOADED' : 'DEMO_SYNTHETIC'
      } />
      {timestamp && (
        <span className="data-source-time">
          Updated {new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

// ---- Inline spinner ----
export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid rgba(255,255,255,0.2)`,
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
      className={className}
      aria-hidden="true"
    />
  );
}

// ---- Tooltip ----
export function Tooltip({ children, content, placement = 'top' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span
          className={`tooltip tooltip-${placement}`}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}

// ---- Tab Bar ----
export function TabBar({ tabs, activeTab, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onChange(tab.key)}
          className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
        >
          {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default {
  SourceBadge,
  SeverityBadge,
  StatusBadge,
  LoadingSkeleton,
  KpiSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  LoadingOverlay,
  KpiCard,
  PageHeader,
  FilterBar,
  Modal,
  ConfirmDialog,
  Drawer,
  WellContextBar,
  LastUpdatedBadge,
  NetworkStatusBanner,
  SearchInput,
  ActionButton,
  ResponsiveTable,
  Pagination,
  FormField,
  DataSourceInfo,
  Spinner,
  Tooltip,
  TabBar,
};
