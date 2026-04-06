import { useState, useRef, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { supabase } from "./supabase";

const PRIORITIES = [
  { value: "high",   label: "High", color: "#d4644a", bg: "#fef0ed" },
  { value: "medium", label: "Med",  color: "#c49a3a", bg: "#fef8eb" },
  { value: "low",    label: "Low",  color: "#5a9e6f", bg: "#eef7f0" },
];

function priorityMeta(v) { return PRIORITIES.find(p => p.value === v) || PRIORITIES[1]; }

function formatDue(due) {
  if (!due) return { label: "immediate", overdue: false, ts: Infinity };
  const d = new Date(due + "T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  const ts = d.getTime();
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true,  ts };
  if (diff === 0) return { label: "today",    overdue: false, ts };
  if (diff === 1) return { label: "tomorrow", overdue: false, ts };
  if (diff <= 6)  return { label: `${diff}d`, overdue: false, ts };
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), overdue: false, ts };
}

const PO = { high: 0, medium: 1, low: 2 };

/* ─── Icons ─────────────────────────────────────────────────────────────── */
function CheckIcon() {
  return (<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function TrashIcon() {
  return (<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><polyline points="1,3 12,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4,3V2a1,1,0,0,1,1-1h3a1,1,0,0,1,1,1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="3" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>);
}

/* ─── Tab Icons ────────────────────────────────────────────────────────── */
function TasksIcon() {
  return (<svg className="tab-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><polyline points="4,7 6,9 10,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function GroceriesIcon() {
  return (<svg className="tab-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1L1 4v8a1 1 0 001 1h10a1 1 0 001-1V4L11 1H3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7a2 2 0 004 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>);
}
function PlantsIcon() {
  return (<svg className="tab-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 13V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 7C7 4 4 2 1 2c0 3 2 5 6 5z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M7 9C7 6 10 4 13 4c0 3-2 5-6 5z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>);
}

/* ─── Empty State Illustrations ────────────────────────────────────────── */
function EmptyTasksIllustration() {
  return (
    <svg className="empty-illustration" viewBox="0 0 120 120" fill="none">
      <rect x="25" y="20" width="70" height="80" rx="8" stroke="#b07d3a" strokeWidth="2" opacity="0.4"/>
      <line x1="40" y1="42" x2="80" y2="42" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
      <line x1="40" y1="56" x2="72" y2="56" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      <line x1="40" y1="70" x2="76" y2="70" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
      <circle cx="33" cy="42" r="3" stroke="#b07d3a" strokeWidth="1.5" opacity="0.4"/>
      <circle cx="33" cy="56" r="3" stroke="#b07d3a" strokeWidth="1.5" opacity="0.3"/>
      <circle cx="33" cy="70" r="3" stroke="#b07d3a" strokeWidth="1.5" opacity="0.25"/>
    </svg>
  );
}
function EmptyGroceriesIllustration() {
  return (
    <svg className="empty-illustration" viewBox="0 0 120 120" fill="none">
      <path d="M35 45L30 35h-8" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M35 45h55l-8 35H43L35 45z" stroke="#b07d3a" strokeWidth="2" strokeLinejoin="round" opacity="0.35"/>
      <circle cx="48" cy="90" r="4" stroke="#b07d3a" strokeWidth="2" opacity="0.3"/>
      <circle cx="77" cy="90" r="4" stroke="#b07d3a" strokeWidth="2" opacity="0.3"/>
    </svg>
  );
}
function EmptyPlantsIllustration() {
  return (
    <svg className="empty-illustration" viewBox="0 0 120 120" fill="none">
      <path d="M50 85h20" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M45 85L48 65h24l3 20" stroke="#b07d3a" strokeWidth="2" opacity="0.35"/>
      <path d="M60 65V45" stroke="#b07d3a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M60 50C60 40 50 32 40 32c0 8 8 18 20 18z" stroke="#b07d3a" strokeWidth="1.5" fill="#b07d3a" fillOpacity="0.1" opacity="0.4"/>
      <path d="M60 45C60 35 70 28 80 28c0 8-8 17-20 17z" stroke="#b07d3a" strokeWidth="1.5" fill="#b07d3a" fillOpacity="0.1" opacity="0.35"/>
    </svg>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=Source+Sans+3:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .app {
    min-height: 100vh;
    background: #f6f1eb;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px 80px;
    font-family: 'Source Sans 3', -apple-system, sans-serif;
    color: #3d3529;
  }

  .card {
    width: 100%;
    max-width: 560px;
    background: #fffcf7;
    border-radius: 20px;
    padding: 32px 28px 28px;
    box-shadow:
      0 1px 3px rgba(80, 60, 30, 0.06),
      0 8px 24px rgba(80, 60, 30, 0.08);
  }

  .header { margin-bottom: 24px; text-align: center; }
  .title {
    font-family: 'Fraunces', serif;
    font-size: 36px;
    font-weight: 700;
    color: #3d3529;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  .title em { font-style: italic; font-weight: 300; color: #b07d3a; }

  .page-nav {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
    background: #f0ebe3;
    border-radius: 12px;
    padding: 4px;
  }
  .page-tab {
    flex: 1;
    padding: 10px 16px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    font-weight: 500;
    border: none;
    background: transparent;
    color: #8a7d6b;
    cursor: pointer;
    border-radius: 9px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .page-tab:hover { color: #5a4e3c; }
  .page-tab.active {
    background: #fffcf7;
    color: #3d3529;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(80, 60, 30, 0.1);
  }
  .page-tab .tab-icon { opacity: 0.5; transition: opacity 0.2s; }
  .page-tab.active .tab-icon { opacity: 0.85; }

  .tagline {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 13px;
    color: #b0a48e;
    margin-top: 4px;
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 16px;
    gap: 6px;
    font-size: 12px;
    color: #b0a48e;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #c8bfa8;
    transition: background 0.3s;
  }
  .dot.saving { background: #d4a843; animation: pulse 1s infinite; }
  .dot.saved  { background: #82b78e; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .filter-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .filter-group {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .filter-group + .filter-group::before {
    content: '';
    width: 1px;
    height: 16px;
    background: #e4ddd2;
    margin: 0 6px;
  }
  .sort-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .sort-label {
    font-size: 12px;
    font-weight: 500;
    color: #b0a48e;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .filter-btn {
    padding: 5px 12px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid #e4ddd2;
    background: transparent;
    color: #8a7d6b;
    cursor: pointer;
    border-radius: 20px;
    transition: all 0.15s ease;
  }
  .filter-btn:hover { border-color: #c9bfad; color: #5a4e3c; background: #f8f4ed; }
  .filter-btn.active { background: #3d3529; color: #fffcf7; border-color: #3d3529; }
  .sort-select {
    padding: 5px 10px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid #e4ddd2;
    background: #fffcf7;
    color: #5a4e3c;
    cursor: pointer;
    border-radius: 20px;
    appearance: none;
    padding-right: 26px;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238a7d6b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }

  .input-area {
    background: #f8f4ed;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .input-row:last-child { margin-bottom: 0; }
  .text-input {
    flex: 1;
    padding: 9px 14px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 15px;
    border: 1.5px solid #e4ddd2;
    border-radius: 10px;
    background: #fffcf7;
    color: #3d3529;
    outline: none;
    transition: border-color 0.2s;
  }
  .text-input::placeholder { color: #c0b5a0; }
  .text-input:focus { border-color: #b07d3a; }
  .add-btn {
    padding: 9px 20px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    font-weight: 600;
    border: none;
    background: #b07d3a;
    color: #fffcf7;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .add-btn:hover { background: #9a6c2f; transform: translateY(-1px); }
  .add-btn:active { transform: translateY(0); }

  .mini-select, .mini-input {
    padding: 6px 10px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    border: 1.5px solid #e4ddd2;
    border-radius: 8px;
    background: #fffcf7;
    color: #5a4e3c;
    outline: none;
  }
  .mini-select { cursor: pointer; }
  .mini-input { width: 130px; }
  .mini-input:focus, .mini-select:focus { border-color: #b07d3a; }

  .assignee-toggle {
    display: flex;
    border-radius: 8px;
    overflow: hidden;
    border: 1.5px solid #e4ddd2;
  }
  .assignee-opt {
    padding: 6px 14px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: none;
    background: #fffcf7;
    color: #8a7d6b;
    cursor: pointer;
    transition: all 0.15s;
  }
  .assignee-opt + .assignee-opt { border-left: 1.5px solid #e4ddd2; }
  .assignee-opt.active { background: #3d3529; color: #fffcf7; }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: #fffcf7;
    border: 1.5px solid #eee8dc;
    border-radius: 12px;
    transition: all 0.15s ease;
  }
  .todo-item:hover { border-color: #d9d0c0; box-shadow: 0 2px 8px rgba(80, 60, 30, 0.06); }
  .todo-item:active { transform: scale(0.985); }
  .todo-item.done-item { opacity: 0.5; background: #f8f4ed; }

  .check-btn {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid #d0c7b5;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .check-btn:hover { border-color: #82b78e; background: #eef7f0; }
  .check-btn.checked { background: #82b78e; border-color: #82b78e; color: white; }

  .todo-content { flex: 1; min-width: 0; }
  .todo-text { font-size: 15px; color: #3d3529; word-break: break-word; }
  .todo-text.done { text-decoration: line-through; color: #b0a48e; }

  .todo-meta {
    display: flex;
    gap: 6px;
    margin-top: 5px;
    flex-wrap: wrap;
    align-items: center;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .assignee-pill { background: #eee8fa; color: #7c5cbf; font-size: 11px; font-weight: 600; }
  .label-pill-work { background: #e8f0fe; color: #4a7cc9; }
  .label-pill-personal { background: #f0ebe3; color: #8a7d6b; }
  .overdue { color: #d4644a !important; font-weight: 600; }
  .todo-note {
    font-size: 13px;
    color: #8a7d6b;
    margin-top: 3px;
    word-break: break-word;
    font-style: italic;
  }

  .delete-btn {
    background: none; border: none; cursor: pointer;
    color: #d0c7b5;
    padding: 4px;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .todo-item:hover .delete-btn { opacity: 1; }
  .delete-btn:hover { color: #d4644a; background: #fef0ed; }

  .empty {
    text-align: center;
    color: #b0a48e;
    font-size: 14px;
    padding: 40px 20px;
    font-style: italic;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .empty-illustration { width: 120px; height: 120px; opacity: 0.6; }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid #eee8dc;
  }
  .clear-btn {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: none;
    background: none;
    color: #b0a48e;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .clear-btn:hover { color: #d4644a; background: #fef0ed; }

  .qty-badge {
    background: #eee8fa;
    color: #7c5cbf;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .item-check {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 2px solid #d0c7b5;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .item-check:hover { border-color: #82b78e; background: #eef7f0; }
  .item-check.got { background: #82b78e; border-color: #82b78e; color: white; }

  .loading {
    text-align: center;
    color: #b0a48e;
    font-size: 14px;
    padding: 40px 20px;
  }

  /* ─── Plants Page ───────────────────────────────────────── */
  .plant-card {
    border: 1.5px solid #eee8dc;
    border-radius: 14px;
    background: #fffcf7;
    margin-bottom: 8px;
    transition: all 0.15s ease;
    overflow: hidden;
  }
  .plant-card:hover { border-color: #d9d0c0; box-shadow: 0 2px 8px rgba(80, 60, 30, 0.06); }
  .plant-card:active { transform: scale(0.985); }

  .plant-collapsed {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    cursor: pointer;
  }

  .plant-thumb {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    background: #f0ebe3;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }
  .plant-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .plant-thumb-placeholder {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: #f0ebe3;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #c0b5a0;
  }

  .plant-info { flex: 1; min-width: 0; }
  .plant-name {
    font-size: 15px;
    font-weight: 500;
    color: #3d3529;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .plant-nickname {
    font-size: 13px;
    color: #8a7d6b;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .plant-meta {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
    align-items: center;
  }
  .location-pill {
    background: #eee8fa;
    color: #7c5cbf;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 12px;
  }
  .water-status {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 12px;
  }
  .water-ok { background: #eef7f0; color: #5a9e6f; }
  .water-soon { background: #fef8eb; color: #c49a3a; }
  .water-overdue { background: #fef0ed; color: #d4644a; }
  .water-never { background: #f0ebe3; color: #8a7d6b; }

  .plant-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .water-btn {
    padding: 6px 14px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 600;
    border: none;
    background: #4a9eda;
    color: white;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .water-btn:hover { background: #3a8bc7; }
  .water-btn:active { transform: scale(0.96); }

  .backdate-btn {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: #c0b5a0;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .backdate-btn:hover { color: #8a7d6b; background: #f0ebe3; }
  .backdate-input {
    padding: 4px 8px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    border: 1.5px solid #e4ddd2;
    border-radius: 6px;
    background: #fffcf7;
    color: #5a4e3c;
    outline: none;
  }
  .backdate-input:focus { border-color: #b07d3a; }

  .chevron {
    color: #c0b5a0;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  .plant-expanded {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
  }
  .plant-expanded.open {
    max-height: 800px;
    padding: 0 14px 14px;
  }
  .plant-expanded-inner {
    border-top: 1px solid #eee8dc;
    padding-top: 14px;
  }

  .care-section h4 {
    font-family: 'Fraunces', serif;
    font-size: 14px;
    font-weight: 500;
    color: #3d3529;
    margin-bottom: 8px;
  }
  .care-description {
    font-size: 14px;
    color: #5a4e3c;
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .care-tips {
    list-style: none;
    padding: 0;
    margin: 0 0 14px;
  }
  .care-tips li {
    font-size: 13px;
    color: #5a4e3c;
    padding: 4px 0;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .care-tips li::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b07d3a;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .watering-history h4 {
    font-family: 'Fraunces', serif;
    font-size: 14px;
    font-weight: 500;
    color: #3d3529;
    margin-bottom: 8px;
  }
  .history-timeline {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
  }
  .history-entry {
    font-size: 12px;
    color: #8a7d6b;
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background: #f8f4ed;
    border-radius: 6px;
  }
  .history-date { font-weight: 500; color: #5a4e3c; }

  .plant-photo-section {
    margin-bottom: 14px;
  }
  .plant-photo-large {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 8px;
  }
  .photo-upload-area {
    border: 2px dashed #e4ddd2;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
    color: #b0a48e;
    font-size: 13px;
  }
  .photo-upload-area:hover { border-color: #b07d3a; color: #8a7d6b; }

  .delete-plant-btn {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 500;
    border: 1.5px solid #e4ddd2;
    background: none;
    color: #b0a48e;
    cursor: pointer;
    padding: 6px 14px;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .delete-plant-btn:hover { border-color: #d4644a; color: #d4644a; background: #fef0ed; }

  .confirm-delete {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .confirm-delete span { font-size: 13px; color: #d4644a; }
  .confirm-yes {
    padding: 4px 12px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    font-weight: 600;
    border: none;
    background: #d4644a;
    color: white;
    cursor: pointer;
    border-radius: 6px;
  }
  .confirm-no {
    padding: 4px 12px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    font-weight: 500;
    border: 1.5px solid #e4ddd2;
    background: none;
    color: #8a7d6b;
    cursor: pointer;
    border-radius: 6px;
  }

  .typeahead-wrapper { position: relative; flex: 1; }
  .typeahead-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fffcf7;
    border: 1.5px solid #e4ddd2;
    border-top: none;
    border-radius: 0 0 10px 10px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(80, 60, 30, 0.1);
  }
  .typeahead-option {
    padding: 8px 14px;
    cursor: pointer;
    transition: background 0.1s;
    font-size: 14px;
  }
  .typeahead-option:hover { background: #f8f4ed; }
  .typeahead-option .scientific { font-size: 12px; color: #8a7d6b; font-style: italic; }

  .winter-banner {
    background: #f0ebe3;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #8a7d6b;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .winter-banner svg { flex-shrink: 0; }

  .change-photo-btn {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    font-weight: 500;
    border: 1.5px solid #e4ddd2;
    background: none;
    color: #8a7d6b;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .change-photo-btn:hover { border-color: #b07d3a; color: #5a4e3c; }
`;

/* ━━━ Tasks Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TasksPage({ saveStatus }) {
  const { items: tasks, loading, addItem, updateItem, deleteItem, deleteWhere } = useSupabase('tasks');
  const [text, setText]     = useState("");
  const [pri, setPri]       = useState("medium");
  const [due, setDue]       = useState("");
  const [who, setWho]       = useState("Jay");
  const [label, setLabel]   = useState("personal");
  const [note, setNote]     = useState("");
  const [filter, setFilter] = useState("active");
  const [fWho, setFWho]     = useState(null);
  const [fPri, setFPri]     = useState(null);
  const [sort, setSort]     = useState("priority");
  const inputRef = useRef(null);

  async function add() {
    const t = text.trim(); if (!t) return;
    await addItem({ text: t, done: false, priority: pri, due: due || null, who, label, note: note.trim() || null });
    setText(""); setDue(""); setNote(""); inputRef.current?.focus();
  }
  function toggle(task) { updateItem(task.id, { done: !task.done }); }
  function remove(id) { deleteItem(id); }
  async function clearDone() {
    const doneTasks = tasks.filter(t => t.done);
    for (const t of doneTasks) await deleteItem(t.id);
  }

  let visible = tasks;
  if (filter === "active") visible = visible.filter(t => !t.done);
  if (filter === "done")   visible = visible.filter(t => t.done);
  if (fWho)                visible = visible.filter(t => t.who === fWho);
  if (fPri)                visible = visible.filter(t => t.priority === fPri);

  visible = [...visible].sort((a, b) => {
    if (sort === "priority") return (PO[a.priority] ?? 1) - (PO[b.priority] ?? 1);
    if (sort === "due") return (formatDue(a.due).ts) - (formatDue(b.due).ts);
    return a.text.localeCompare(b.text);
  });

  const doneCount = tasks.filter(t => t.done).length;
  if (loading) return <div className="loading">Loading tasks...</div>;

  return (
    <>
      <div className="filter-bar">
        <div className="filter-group">
          {["active","all","done"].map(f => (
            <button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {["Jay","Kathleen"].map(n => (
            <button key={n} className={`filter-btn ${fWho===n?"active":""}`} onClick={()=>setFWho(fWho===n?null:n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="filter-group">
          {PRIORITIES.map(p => (
            <button key={p.value} className={`filter-btn ${fPri===p.value?"active":""}`} onClick={()=>setFPri(fPri===p.value?null:p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="sort-row">
        <span className="sort-label">Sort by</span>
        <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="priority">Priority</option>
          <option value="due">Due date</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="input-area">
        <div className="input-row">
          <input ref={inputRef} className="text-input" placeholder="What needs doing?" value={text}
            onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} />
          <button className="add-btn" onClick={add}>Add</button>
        </div>
        <div className="input-row">
          <select className="mini-select" value={pri} onChange={e=>setPri(e.target.value)}>
            {PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <div className="assignee-toggle">
            {["Jay","Kathleen"].map(n=>(
              <button key={n} className={`assignee-opt ${who===n?"active":""}`} onClick={()=>setWho(n)}>{n}</button>
            ))}
          </div>
          <select className="mini-select" value={label} onChange={e=>setLabel(e.target.value)}>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
          </select>
          <input type="date" className="mini-input" value={due} onChange={e=>setDue(e.target.value)} />
        </div>
        <div className="input-row">
          <input className="text-input" placeholder="Add a note (optional)" value={note}
            onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} />
        </div>
      </div>

      <div className="list">
        {visible.length === 0 ? (
          <div className="empty">
            <EmptyTasksIllustration />
            {filter === "done" ? "Nothing completed yet." : filter === "active" ? "All caught up!" : "Nothing here yet."}
          </div>
        ) : visible.map(task => {
          const pm = priorityMeta(task.priority);
          const dueObj = formatDue(task.due);
          return (
            <div key={task.id} className={`todo-item ${task.done?"done-item":""}`}>
              <button className={`check-btn ${task.done?"checked":""}`} onClick={()=>toggle(task)}>
                {task.done && <CheckIcon />}
              </button>
              <div className="todo-content">
                <div className={`todo-text ${task.done?"done":""}`}>{task.text}</div>
                {task.note && <div className="todo-note">{task.note}</div>}
                <div className="todo-meta">
                  <span className="pill" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                  <span className="pill assignee-pill">{task.who || "Jay"}</span>
                  <span className={`pill label-pill-${task.label || "personal"}`}>{task.label === "work" ? "Work" : "Personal"}</span>
                  <span className={`pill ${dueObj.overdue?"overdue":""}`} style={{ background: dueObj.overdue ? "#fef0ed" : "#f0ebe3", color: dueObj.overdue ? "#d4644a" : "#8a7d6b" }}>
                    {dueObj.label}
                  </span>
                </div>
              </div>
              <button className="delete-btn" onClick={()=>remove(task.id)}><TrashIcon /></button>
            </div>
          );
        })}
      </div>

      {tasks.length > 0 && doneCount > 0 && (
        <div className="footer">
          <span style={{fontSize:13, color:"#b0a48e"}}>{doneCount} completed</span>
          <button className="clear-btn" onClick={clearDone}>clear completed</button>
        </div>
      )}
    </>
  );
}

/* ━━━ Groceries Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function GroceriesPage({ saveStatus }) {
  const { items, loading, addItem, updateItem, deleteItem } = useSupabase('grocery_items');
  const [text, setText]     = useState("");
  const [qty, setQty]       = useState("");
  const [filter, setFilter] = useState("needed");
  const inputRef = useRef(null);

  async function add() {
    const t = text.trim(); if (!t) return;
    await addItem({ text: t, got: false, qty: qty.trim() || null });
    setText(""); setQty(""); inputRef.current?.focus();
  }
  function toggleGot(item) { updateItem(item.id, { got: !item.got }); }
  function remove(id) { deleteItem(id); }
  async function clearGot() {
    const gotItems = items.filter(i => i.got);
    for (const i of gotItems) await deleteItem(i.id);
  }

  let visible = items;
  if (filter === "needed") visible = visible.filter(i => !i.got);
  if (filter === "got")    visible = visible.filter(i => i.got);
  const gotCount = items.filter(i => i.got).length;

  if (loading) return <div className="loading">Loading groceries...</div>;

  return (
    <>
      <div className="filter-bar">
        <div className="filter-group">
          {["needed","all","got"].map(f => (
            <button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="input-area">
        <div className="input-row">
          <input ref={inputRef} className="text-input" placeholder="Add an item..." value={text}
            onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} />
          <input className="mini-input" style={{width:70}} placeholder="Qty" value={qty}
            onChange={e=>setQty(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} />
          <button className="add-btn" onClick={add}>Add</button>
        </div>
      </div>

      <div className="list">
        {visible.length === 0 ? (
          <div className="empty">
            <EmptyGroceriesIllustration />
            {filter === "got" ? "Nothing picked up yet." : filter === "needed" ? "List is clear!" : "Nothing here yet."}
          </div>
        ) : visible.map(item => (
          <div key={item.id} className={`todo-item ${item.got?"done-item":""}`}>
            <button className={`item-check ${item.got?"got":""}`} onClick={()=>toggleGot(item)}>
              {item.got && <CheckIcon />}
            </button>
            <div className="todo-content">
              <div className={`todo-text ${item.got?"done":""}`}>{item.text}</div>
              {item.qty && <div className="todo-meta"><span className="qty-badge">{item.qty}</span></div>}
            </div>
            <button className="delete-btn" onClick={()=>remove(item.id)}><TrashIcon /></button>
          </div>
        ))}
      </div>

      {items.length > 0 && gotCount > 0 && (
        <div className="footer">
          <span style={{fontSize:13, color:"#b0a48e"}}>{gotCount} picked up</span>
          <button className="clear-btn" onClick={clearGot}>clear got</button>
        </div>
      )}
    </>
  );
}

/* ━━━ Season Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const LOCATIONS = ["Living room", "Primary bedroom", "Secondary bedroom", "Hallway bathroom", "Private bathroom"];

function getSeason() {
  const month = new Date().getMonth(); // 0-based
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

function isWinterMode() {
  const s = getSeason();
  return s === "fall" || s === "winter";
}

function getAdjustedFrequency(baseDays, seasonalAdj) {
  if (!isWinterMode()) return baseDays;
  const multiplier = seasonalAdj?.winter_multiplier || 1.5;
  return Math.round(baseDays * multiplier);
}

function getWaterStatus(lastWateredAt, frequencyDays, seasonalAdj) {
  if (!lastWateredAt) return { label: "Not yet watered", cls: "water-never", ratio: Infinity };
  const now = new Date();
  const last = new Date(lastWateredAt);
  const daysSince = Math.max(0, Math.floor((now - last) / 86400000));
  const adjusted = getAdjustedFrequency(frequencyDays, seasonalAdj);
  const ratio = daysSince / adjusted;

  if (daysSince === 0) return { label: "Watered today", cls: "water-ok", ratio };
  if (daysSince === 1) return { label: "Watered yesterday", cls: "water-ok", ratio };

  if (ratio > 1) return { label: `${daysSince}d overdue`, cls: "water-overdue", ratio };
  if (ratio >= 0.75) return { label: `Water soon (${daysSince}d ago)`, cls: "water-soon", ratio };
  return { label: `${daysSince}d ago`, cls: "water-ok", ratio };
}

function daysAgoText(date) {
  const now = new Date();
  const d = new Date(date);
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

async function resizeImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ━━━ Plants Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PlantsPage({ saveStatus }) {
  const { items: plants, loading, addItem, updateItem, deleteItem } = useSupabase('user_plants');
  const { items: waterLogs, addItem: addWaterLog, deleteWhere: deleteWaterLogs } = useSupabase('watering_log');
  const [houseplants, setHouseplants] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Add form state
  const [searchText, setSearchText] = useState("");
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nickname, setNickname] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Backdate state
  const [backdating, setBackdating] = useState(null);
  const [backdateValue, setBackdateValue] = useState("");

  // Filter/sort state
  const [filterLoc, setFilterLoc] = useState(null);
  const [sort, setSort] = useState("thirsty");

  // Photo upload
  const [uploading, setUploading] = useState(null);
  const fileInputRef = useRef(null);
  const [photoTarget, setPhotoTarget] = useState(null);

  // Load houseplants reference data
  useEffect(() => {
    supabase.from('houseplants').select('*').order('common_name').then(({ data }) => {
      if (data) setHouseplants(data);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Typeahead search
  const searchResults = searchText.length >= 1
    ? houseplants.filter(hp => {
        const q = searchText.toLowerCase();
        return hp.common_name.toLowerCase().includes(q) || hp.scientific_name.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  async function addPlant() {
    const fields = {
      houseplant_id: selectedPlant?.id || null,
      custom_name: selectedPlant ? null : searchText.trim() || null,
      nickname: nickname.trim() || null,
      location,
    };
    if (!selectedPlant && !searchText.trim()) return;
    const { data } = await addItem(fields);
    if (data) {
      // Log initial watering
      await addWaterLog({ user_plant_id: data.id, watered_at: new Date().toISOString(), logged_at: new Date().toISOString() });
    }
    setSearchText("");
    setSelectedPlant(null);
    setNickname("");
    setLocation(LOCATIONS[0]);
    inputRef.current?.focus();
  }

  async function waterPlant(plantId) {
    const now = new Date().toISOString();
    await addWaterLog({ user_plant_id: plantId, watered_at: now, logged_at: now });
  }

  async function backdateWater(plantId) {
    if (!backdateValue) return;
    const wateredAt = new Date(backdateValue + "T12:00:00").toISOString();
    const now = new Date().toISOString();
    await addWaterLog({ user_plant_id: plantId, watered_at: wateredAt, logged_at: now });
    setBackdating(null);
    setBackdateValue("");
  }

  async function removePlant(plantId) {
    // Delete watering logs (cascade should handle, but be explicit)
    await deleteWaterLogs('user_plant_id', plantId);
    // Delete photo from storage
    const plant = plants.find(p => p.id === plantId);
    if (plant?.photo_url) {
      const path = `plant-photos/${plantId}.jpg`;
      await supabase.storage.from('plant-photos').remove([path]);
    }
    await deleteItem(plantId);
    setConfirmDelete(null);
    if (expanded === plantId) setExpanded(null);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !photoTarget) return;
    setUploading(photoTarget);
    const resized = await resizeImage(file);
    const path = `plant-photos/${photoTarget}.jpg`;
    await supabase.storage.from('plant-photos').upload(path, resized, { upsert: true, contentType: 'image/jpeg' });
    const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(path);
    await updateItem(photoTarget, { photo_url: urlData.publicUrl + '?t=' + Date.now() });
    setUploading(null);
    setPhotoTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function triggerPhotoUpload(plantId) {
    setPhotoTarget(plantId);
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  // Helpers
  function getPlantName(plant) {
    if (plant.houseplant_id) {
      const hp = houseplants.find(h => h.id === plant.houseplant_id);
      return hp?.common_name || plant.custom_name || "Unknown plant";
    }
    return plant.custom_name || "Unknown plant";
  }

  function getHouseplantData(plant) {
    if (!plant.houseplant_id) return null;
    return houseplants.find(h => h.id === plant.houseplant_id) || null;
  }

  function getLastWatered(plantId) {
    const logs = waterLogs.filter(l => l.user_plant_id === plantId);
    if (logs.length === 0) return null;
    return logs.reduce((latest, l) => new Date(l.watered_at) > new Date(latest.watered_at) ? l : latest).watered_at;
  }

  function getWaterHistory(plantId) {
    return waterLogs
      .filter(l => l.user_plant_id === plantId)
      .sort((a, b) => new Date(b.watered_at) - new Date(a.watered_at))
      .slice(0, 10);
  }

  // Filter and sort
  let visible = plants;
  if (filterLoc) visible = visible.filter(p => p.location === filterLoc);

  visible = [...visible].sort((a, b) => {
    if (sort === "thirsty") {
      const hpA = getHouseplantData(a);
      const hpB = getHouseplantData(b);
      const statusA = getWaterStatus(getLastWatered(a.id), hpA?.water_frequency_days || 7, hpA?.seasonal_adjustment);
      const statusB = getWaterStatus(getLastWatered(b.id), hpB?.water_frequency_days || 7, hpB?.seasonal_adjustment);
      return statusB.ratio - statusA.ratio;
    }
    if (sort === "alpha") return getPlantName(a).localeCompare(getPlantName(b));
    if (sort === "location") return (a.location || "").localeCompare(b.location || "");
    if (sort === "recent") return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  });

  if (loading) return <div className="loading">Loading plants...</div>;

  const winterMode = isWinterMode();

  return (
    <>
      <input type="file" ref={fileInputRef} accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload} />

      {winterMode && (
        <div className="winter-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" stroke="#8a7d6b" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Winter mode: watering schedules adjusted for slower growth
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-group">
          <button className={`filter-btn ${!filterLoc?"active":""}`} onClick={()=>setFilterLoc(null)}>All</button>
          {LOCATIONS.map(loc => (
            <button key={loc} className={`filter-btn ${filterLoc===loc?"active":""}`} onClick={()=>setFilterLoc(filterLoc===loc?null:loc)}>
              {loc.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="sort-row">
        <span className="sort-label">Sort by</span>
        <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="thirsty">Most thirsty</option>
          <option value="alpha">Alphabetical</option>
          <option value="location">Location</option>
          <option value="recent">Recently added</option>
        </select>
      </div>

      <div className="input-area">
        <div className="input-row" ref={dropdownRef}>
          <div className="typeahead-wrapper">
            <input
              ref={inputRef}
              className="text-input"
              placeholder="Search for a plant..."
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setSelectedPlant(null);
                setShowDropdown(true);
              }}
              onFocus={() => searchText.length >= 1 && setShowDropdown(true)}
              onKeyDown={e => e.key === "Enter" && addPlant()}
            />
            {showDropdown && searchResults.length > 0 && (
              <div className="typeahead-dropdown">
                {searchResults.map(hp => (
                  <div key={hp.id} className="typeahead-option" onClick={() => {
                    setSelectedPlant(hp);
                    setSearchText(hp.common_name);
                    setShowDropdown(false);
                  }}>
                    <div>{hp.common_name}</div>
                    <div className="scientific">{hp.scientific_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="add-btn" onClick={addPlant}>Add</button>
        </div>
        <div className="input-row">
          <input className="text-input" placeholder="Nickname (optional)" value={nickname}
            onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPlant()} />
          <select className="mini-select" value={location} onChange={e=>setLocation(e.target.value)}>
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
      </div>

      <div className="list">
        {visible.length === 0 ? (
          <div className="empty">
            <EmptyPlantsIllustration />
            {plants.length === 0 ? "No plants yet. Add your first plant to get started!" : "No plants match this filter."}
          </div>
        ) : visible.map(plant => {
          const hp = getHouseplantData(plant);
          const name = getPlantName(plant);
          const lastWatered = getLastWatered(plant.id);
          const status = getWaterStatus(lastWatered, hp?.water_frequency_days || 7, hp?.seasonal_adjustment);
          const isExpanded = expanded === plant.id;
          const history = isExpanded ? getWaterHistory(plant.id) : [];
          const freq = hp ? getAdjustedFrequency(hp.water_frequency_days, hp.seasonal_adjustment) : null;
          const baseFreq = hp?.water_frequency_days;

          return (
            <div key={plant.id} className="plant-card">
              <div className="plant-collapsed" onClick={() => setExpanded(isExpanded ? null : plant.id)}>
                {plant.photo_url ? (
                  <div className="plant-thumb"><img src={plant.photo_url} alt={name} /></div>
                ) : (
                  <div className="plant-thumb-placeholder">
                    <svg width="20" height="20" viewBox="0 0 14 14" fill="none"><path d="M7 13V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 7C7 4 4 2 1 2c0 3 2 5 6 5z" stroke="currentColor" strokeWidth="1.3"/><path d="M7 9C7 6 10 4 13 4c0 3-2 5-6 5z" stroke="currentColor" strokeWidth="1.3"/></svg>
                  </div>
                )}
                <div className="plant-info">
                  <div className="plant-name">{name}</div>
                  {plant.nickname && <div className="plant-nickname">{plant.nickname}</div>}
                  <div className="plant-meta">
                    <span className="location-pill">{plant.location}</span>
                    <span className={`water-status ${status.cls}`}>{status.label}</span>
                  </div>
                </div>
                <div className="plant-actions" onClick={e => e.stopPropagation()}>
                  {backdating === plant.id ? (
                    <div style={{display:'flex', gap:4, alignItems:'center'}}>
                      <input type="date" className="backdate-input" value={backdateValue}
                        onChange={e=>setBackdateValue(e.target.value)} />
                      <button className="water-btn" style={{fontSize:12,padding:'4px 8px'}} onClick={()=>backdateWater(plant.id)}>Log</button>
                      <button className="backdate-btn" onClick={()=>{setBackdating(null);setBackdateValue("");}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <button className="backdate-btn" title="Backdate watering" onClick={()=>setBackdating(plant.id)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><polyline points="7,4 7,7 9.5,8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      </button>
                      <button className="water-btn" onClick={()=>waterPlant(plant.id)}>💧 Water</button>
                    </>
                  )}
                </div>
                <svg className={`chevron ${isExpanded?"open":""}`} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polyline points="3,5 7,9 11,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>

              <div className={`plant-expanded ${isExpanded?"open":""}`}>
                {isExpanded && (
                  <div className="plant-expanded-inner">
                    {hp && (
                      <div className="care-section">
                        <p className="care-description">{hp.description}</p>
                        <ul className="care-tips">
                          <li>
                            <strong>Water:</strong>&nbsp;
                            {baseFreq && freq && baseFreq !== freq
                              ? `Every ${baseFreq} days in summer, every ${freq} days in winter`
                              : `Every ${baseFreq || 7} days`}
                            {hp.water_tip ? ` — ${hp.water_tip}` : ''}
                          </li>
                          <li><strong>Light:</strong>&nbsp;{hp.sunlight}</li>
                          <li><strong>Environment:</strong>&nbsp;{hp.environment}</li>
                        </ul>
                      </div>
                    )}

                    <div className="plant-photo-section">
                      {plant.photo_url ? (
                        <>
                          <img className="plant-photo-large" src={plant.photo_url} alt={name} />
                          <button className="change-photo-btn" onClick={()=>triggerPhotoUpload(plant.id)} disabled={uploading===plant.id}>
                            {uploading === plant.id ? "Uploading..." : "Change photo"}
                          </button>
                        </>
                      ) : (
                        <div className="photo-upload-area" onClick={()=>triggerPhotoUpload(plant.id)}>
                          {uploading === plant.id ? "Uploading..." : "📷 Add a photo"}
                        </div>
                      )}
                    </div>

                    {history.length > 0 && (
                      <div className="watering-history">
                        <h4>Watering History</h4>
                        <div className="history-timeline">
                          {history.map(entry => (
                            <div key={entry.id} className="history-entry">
                              <span className="history-date">
                                {new Date(entry.watered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span>{daysAgoText(entry.watered_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{display:'flex', justifyContent:'flex-end'}}>
                      {confirmDelete === plant.id ? (
                        <div className="confirm-delete">
                          <span>Delete this plant?</span>
                          <button className="confirm-yes" onClick={()=>removePlant(plant.id)}>Yes, delete</button>
                          <button className="confirm-no" onClick={()=>setConfirmDelete(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="delete-plant-btn" onClick={()=>setConfirmDelete(plant.id)}>Delete plant</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ━━━ Root ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function Hearth() {
  const [page, setPage] = useState("tasks");
  const [saveStatus, setSaveStatus] = useState("saved");

  // Subtle seasonal background tint
  const season = getSeason();
  const seasonBg = (season === "fall" || season === "winter") ? "#f5eee4" : (season === "spring" || season === "summer") ? "#f2f1eb" : "#f6f1eb";

  return (
    <>
      <style>{styles}</style>
      <div className="app" style={{background: seasonBg}}>
        <div className="card">
          <div className="header">
            <h1 className="title"><em>He</em>arth</h1>
            <p className="tagline">your shared home base</p>
          </div>

          <nav className="page-nav">
            {[["tasks","Tasks",TasksIcon],["groceries","Groceries",GroceriesIcon],["plants","Plants",PlantsIcon]].map(([id,label,Icon]) => (
              <button key={id} className={`page-tab ${page===id?"active":""}`} onClick={()=>setPage(id)}>
                <Icon />{label}
              </button>
            ))}
          </nav>

          <div className="status-bar">
            <div className={`dot ${saveStatus}`} />
            <span>{saveStatus === "saving" ? "saving" : "saved"}</span>
          </div>

          {page === "tasks" && <TasksPage saveStatus={saveStatus} />}
          {page === "groceries" && <GroceriesPage saveStatus={saveStatus} />}
          {page === "plants" && <PlantsPage saveStatus={saveStatus} />}
        </div>
      </div>
    </>
  );
}
