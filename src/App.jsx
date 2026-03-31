import { useState, useRef } from "react";
import { useSupabase } from "./useSupabase";

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
  }
  .page-tab:hover { color: #5a4e3c; }
  .page-tab.active {
    background: #fffcf7;
    color: #3d3529;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(80, 60, 30, 0.1);
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
  .overdue { color: #d4644a !important; font-weight: 600; }

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
  }

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
`;

/* ━━━ Tasks Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TasksPage({ saveStatus }) {
  const { items: tasks, loading, addItem, updateItem, deleteItem, deleteWhere } = useSupabase('tasks');
  const [text, setText]     = useState("");
  const [pri, setPri]       = useState("medium");
  const [due, setDue]       = useState("");
  const [who, setWho]       = useState("Jay");
  const [filter, setFilter] = useState("active");
  const [fWho, setFWho]     = useState(null);
  const [fPri, setFPri]     = useState(null);
  const [sort, setSort]     = useState("priority");
  const inputRef = useRef(null);

  async function add() {
    const t = text.trim(); if (!t) return;
    await addItem({ text: t, done: false, priority: pri, due: due || null, who });
    setText(""); setDue(""); inputRef.current?.focus();
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
          <input type="date" className="mini-input" value={due} onChange={e=>setDue(e.target.value)} />
        </div>
      </div>

      <div className="list">
        {visible.length === 0 ? (
          <div className="empty">
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
                <div className="todo-meta">
                  <span className="pill" style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                  <span className="pill assignee-pill">{task.who || "Jay"}</span>
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

/* ━━━ Root ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function Organizer() {
  const [page, setPage] = useState("tasks");
  // Combine save status from both hooks via the active page
  const [saveStatus, setSaveStatus] = useState("saved");

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="card">
          <div className="header">
            <h1 className="title"><em>Organ</em>izer</h1>
          </div>

          <nav className="page-nav">
            {[["tasks","Tasks"],["groceries","Groceries"]].map(([id,label]) => (
              <button key={id} className={`page-tab ${page===id?"active":""}`} onClick={()=>setPage(id)}>
                {label}
              </button>
            ))}
          </nav>

          <div className="status-bar">
            <div className={`dot ${saveStatus}`} />
            <span>{saveStatus === "saving" ? "saving" : "saved"}</span>
          </div>

          {page === "tasks"
            ? <TasksPage saveStatus={saveStatus} />
            : <GroceriesPage saveStatus={saveStatus} />
          }
        </div>
      </div>
    </>
  );
}
