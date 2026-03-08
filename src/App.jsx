import { useState, useRef } from "react";

const SETUPS = ["Breakout","Pullback","Reversal","Momentum","Scalp","News Play","VWAP Reclaim","Gap Fill"];
const EMOTIONS = ["Confident","Calm","Anxious","Revenge","FOMO","Bored","Focused","Rushed"];
const MILESTONES = [
  { streak: 3,  label: "Hot Hand",      icon: "🔥", desc: "3 green days in a row" },
  { streak: 5,  label: "On Fire",       icon: "⚡", desc: "5 green days in a row" },
  { streak: 10, label: "Iron Discipline",icon: "🏆", desc: "10 green days in a row" },
  { streak: 20, label: "Elite Trader",  icon: "💎", desc: "20 green days in a row" },
];

const initialTrades = [
  { id: 1, ticker: "NVDA", side: "Long",  entry: 875.50, exit: 891.20, shares: 20, setup: "Breakout",     emotion: "Confident", tags: "premarket,gap",       notes: "Clean break above HOD",              date: "2024-01-15" },
  { id: 2, ticker: "TSLA", side: "Short", entry: 242.80, exit: 238.10, shares: 50, setup: "Reversal",     emotion: "Calm",      tags: "resistance,overbought",notes: "Double top rejection",               date: "2024-01-15" },
  { id: 3, ticker: "SPY",  side: "Long",  entry: 478.20, exit: 476.50, shares: 30, setup: "VWAP Reclaim", emotion: "Revenge",   tags: "vwap,reclaim",         notes: "Should have waited for confirmation", date: "2024-01-14" },
  { id: 4, ticker: "AAPL", side: "Long",  entry: 185.10, exit: 188.40, shares: 40, setup: "Pullback",     emotion: "Focused",   tags: "trend,support",        notes: "Textbook pullback to 8ema",          date: "2024-01-13" },
  { id: 5, ticker: "AMD",  side: "Long",  entry: 162.30, exit: 168.90, shares: 25, setup: "Breakout",     emotion: "Confident", tags: "volume,gap",           notes: "Strong volume confirmation",         date: "2024-01-12" },
];

const initialWatchlist = [
  { id: 1, ticker: "NVDA", note: "Watching HOD breakout above 900", catalyst: "Earnings", priority: "high" },
  { id: 2, ticker: "META", note: "Bull flag on daily, tight range", catalyst: "Technical", priority: "medium" },
  { id: 3, ticker: "SPY",  note: "Key support at 478, monitor open", catalyst: "Market",   priority: "low" },
];

function pnlOf(tr) { return (tr.exit - tr.entry) * tr.shares * (tr.side === "Short" ? -1 : 1); }

// ── Theme helper ──────────────────────────────────────────────────────────────
function useTheme(dark) {
  return dark
    ? { bg:"#0e1017", card:"#161822", border:"#252840", text:"#e2e8f0", muted:"#4a5568", nav:"#12141e", navBorder:"#252840", sub:"#8892a4", input:"#1e2030", hover:"#1e2030" }
    : { bg:"#f4f6fc", card:"#fff",    border:"#e4e9f4", text:"#0d1117", muted:"#94a3b8", nav:"#fff",    navBorder:"#e4e9f4", sub:"#64748b", input:"#f8faff", hover:"#f0f4ff" };
}

function Badge({ color, children }) {
  const map = { green:["rgba(16,185,129,.13)","#10b981"], red:["rgba(239,68,68,.13)","#ef4444"], blue:["rgba(99,102,241,.13)","#6366f1"], amber:["rgba(245,158,11,.13)","#f59e0b"], gray:["rgba(148,163,184,.13)","#94a3b8"], purple:["rgba(168,85,247,.13)","#a855f7"] };
  const [bg,fg] = map[color]||map.gray;
  return <span style={{background:bg,color:fg,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:.4}}>{children}</span>;
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} style={{width:44,height:24,borderRadius:12,background:dark?"#6366f1":"#e2e8f0",border:"none",cursor:"pointer",position:"relative",padding:0,display:"flex",alignItems:"center",flexShrink:0}}>
      <span style={{position:"absolute",width:18,height:18,borderRadius:"50%",background:"#fff",top:3,left:dark?23:3,transition:"left .3s",boxShadow:"0 1px 4px rgba(0,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>
        {dark?"🌙":"☀️"}
      </span>
    </button>
  );
}

function StatCard({ label, value, sub, color, dark }) {
  const t = useTheme(dark);
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px",flex:1,minWidth:120}}>
      <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color:color||t.text,fontFamily:"'DM Mono',monospace"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:t.muted,marginTop:3}}>{sub}</div>}
    </div>
  );
}

function PnLChart({ trades, dark }) {
  const t = useTheme(dark);
  const sorted = [...trades].sort((a,b)=>a.date.localeCompare(b.date));
  let run = 0;
  const pts = sorted.map(tr=>{run+=pnlOf(tr);return run;});
  if(pts.length<2) return null;
  const mn=Math.min(0,...pts),mx=Math.max(0,...pts),rng=mx-mn||1;
  const W=500,H=90,P=8;
  const px=i=>P+(i/(pts.length-1))*(W-P*2);
  const py=v=>H-P-((v-mn)/rng)*(H-P*2);
  const d=pts.map((v,i)=>`${i===0?"M":"L"}${px(i)},${py(v)}`).join(" ");
  const area=`${d} L${px(pts.length-1)},${py(0)} L${px(0)},${py(0)} Z`;
  const c=pts[pts.length-1]>=0?"#10b981":"#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:90}}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity=".25"/>
          <stop offset="100%" stopColor={c} stopOpacity=".01"/>
        </linearGradient>
      </defs>
      <line x1={P} x2={W-P} y1={py(0)} y2={py(0)} stroke={t.border} strokeWidth="1" strokeDasharray="3,3"/>
      <path d={area} fill="url(#g1)"/>
      <path d={d} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TradeRow({ trade, dark, onSelect, onDelete }) {
  const t = useTheme(dark);
  const pnl = pnlOf(trade);
  const [hov,setHov] = useState(false);
  return (
    <div onClick={()=>onSelect(trade)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:16,padding:"13px 20px",background:hov?t.hover:t.card,borderBottom:`1px solid ${t.border}`,cursor:"pointer",transition:"background .15s"}}>
      <div style={{width:70}}>
        <div style={{fontWeight:700,fontSize:14,color:t.text,fontFamily:"'DM Mono',monospace"}}>{trade.ticker}</div>
        <Badge color={trade.side==="Long"?"green":"red"}>{trade.side}</Badge>
      </div>
      <div style={{flex:1,fontSize:12,color:t.muted}}>{trade.setup}</div>
      <div style={{width:110,fontSize:12,color:t.muted,fontFamily:"'DM Mono',monospace"}}>{trade.entry} → {trade.exit}</div>
      <div style={{width:70,textAlign:"right"}}>
        <Badge color={["Revenge","Anxious","FOMO"].includes(trade.emotion)?"amber":["Confident","Calm","Focused"].includes(trade.emotion)?"blue":"gray"}>{trade.emotion}</Badge>
      </div>
      <div style={{width:90,textAlign:"right",fontWeight:700,fontSize:14,color:pnl>=0?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>
        {pnl>=0?"+":""}${pnl.toFixed(0)}
      </div>
      <button onClick={e=>{e.stopPropagation();onDelete(trade.id);}} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,fontSize:16,padding:"0 4px",opacity:hov?1:0,transition:"opacity .15s"}}>×</button>
    </div>
  );
}

function LogTradeModal({ dark, onClose, onSave }) {
  const t = useTheme(dark);
  const [form,setForm] = useState({ticker:"",side:"Long",entry:"",exit:"",shares:"",setup:"Breakout",emotion:"Confident",tags:"",notes:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const pnl=form.entry&&form.exit&&form.shares?(parseFloat(form.exit)-parseFloat(form.entry))*parseInt(form.shares)*(form.side==="Short"?-1:1):null;
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 12px",color:t.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"};
  const lbl={fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:5,display:"block"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)"}}>
      <div style={{background:t.card,borderRadius:20,width:520,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${t.border}`,boxShadow:"0 32px 80px rgba(0,0,0,.4)"}}>
        <div style={{padding:"22px 28px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:800,fontSize:16,color:t.text}}>Log Trade</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,fontSize:20}}>×</button>
        </div>
        <div style={{padding:"22px 28px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1}}><label style={lbl}>Ticker</label><input style={inp} value={form.ticker} onChange={e=>set("ticker",e.target.value.toUpperCase())} placeholder="NVDA"/></div>
            <div style={{flex:1}}>
              <label style={lbl}>Side</label>
              <div style={{display:"flex",gap:8}}>
                {["Long","Short"].map(s=>(
                  <button key={s} onClick={()=>set("side",s)} style={{flex:1,padding:"9px 0",borderRadius:8,border:`1px solid ${form.side===s?(s==="Long"?"#10b981":"#ef4444"):t.border}`,background:form.side===s?(s==="Long"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)"):"transparent",color:form.side===s?(s==="Long"?"#10b981":"#ef4444"):t.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:12}}>
            {["entry","exit","shares"].map(k=>(
              <div key={k} style={{flex:1}}><label style={lbl}>{k.charAt(0).toUpperCase()+k.slice(1)}</label><input style={inp} type="number" value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={k==="shares"?"100":"0.00"}/></div>
            ))}
          </div>
          {pnl!==null&&<div style={{background:pnl>=0?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)",borderRadius:10,padding:"10px 14px",textAlign:"center",fontWeight:800,fontSize:17,color:pnl>=0?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>P&L: {pnl>=0?"+":""}${pnl.toFixed(2)}</div>}
          <div><label style={lbl}>Setup</label><select style={{...inp,appearance:"none"}} value={form.setup} onChange={e=>set("setup",e.target.value)}>{SETUPS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div>
            <label style={lbl}>Emotional State</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {EMOTIONS.map(em=>(
                <button key={em} onClick={()=>set("emotion",em)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${form.emotion===em?"#6366f1":t.border}`,background:form.emotion===em?"rgba(99,102,241,.12)":"transparent",color:form.emotion===em?"#6366f1":t.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{em}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Tags</label><input style={inp} value={form.tags} onChange={e=>set("tags",e.target.value)} placeholder="gap, premarket, high vol"/></div>
          <div><label style={lbl}>Notes</label><textarea style={{...inp,height:72,resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="What happened?"/></div>
          <button onClick={()=>{if(form.ticker&&form.entry&&form.exit&&form.shares){onSave({...form,id:Date.now(),date:new Date().toISOString().split("T")[0]});onClose();}}} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:10,padding:"13px 0",fontWeight:800,fontSize:14,cursor:"pointer",letterSpacing:.3}}>Save Trade</button>
        </div>
      </div>
    </div>
  );
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────
function UpgradeModal({ dark, onClose, onUpgrade }) {
  const t = useTheme(dark);
  const [billing,setBilling] = useState("monthly");
  const features = [
    { icon:"📸", label:"Chart Analyzer",    desc:"Paste any TradingView screenshot for instant AI analysis" },
    { icon:"🧠", label:"AI Trade Debrief",  desc:"Full psychological breakdown of all your trades" },
    { icon:"🔥", label:"Streak Tracker",    desc:"Track green day streaks and unlock milestone badges" },
    { icon:"⚖️", label:"Risk Calculator",   desc:"Position sizing, R:R, and max loss before you trade" },
    { icon:"📋", label:"Pre-Market Planner",desc:"Build your watchlist and game plan before the open" },
    { icon:"📊", label:"Daily P&L Summary", desc:"End-of-day recap with AI commentary on your session" },
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(8px)"}}>
      <div style={{background:t.card,borderRadius:24,width:540,maxHeight:"92vh",overflowY:"auto",border:`1px solid ${t.border}`,boxShadow:"0 40px 100px rgba(0,0,0,.5)"}}>
        <div style={{padding:"28px 32px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:22}}>💎</span>
              <span style={{fontWeight:900,fontSize:20,color:t.text}}>Blotter Pro</span>
            </div>
            <div style={{fontSize:13,color:t.muted}}>Everything serious traders need in one place.</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,fontSize:22,lineHeight:1}}>×</button>
        </div>

        {/* Billing toggle */}
        <div style={{padding:"20px 32px 0"}}>
          <div style={{display:"flex",background:t.input,borderRadius:12,padding:4,gap:4,marginBottom:20}}>
            {[["monthly","$9 / month"],["annual","$79 / year"]].map(([k,label])=>(
              <button key={k} onClick={()=>setBilling(k)} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:billing===k?"#6366f1":"transparent",color:billing===k?"#fff":t.muted,transition:"all .2s"}}>
                {label} {k==="annual"&&<span style={{fontSize:10,background:"rgba(16,185,129,.2)",color:"#10b981",borderRadius:4,padding:"1px 5px",marginLeft:4}}>SAVE 27%</span>}
              </button>
            ))}
          </div>

          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:44,fontWeight:900,color:t.text,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
              {billing==="monthly"?"$9":"$6.58"}
              <span style={{fontSize:16,fontWeight:500,color:t.muted}}>/mo</span>
            </div>
            {billing==="annual"&&<div style={{fontSize:12,color:t.muted,marginTop:4}}>Billed as $79/year · saves $29 vs monthly</div>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            {features.map(f=>(
              <div key={f.label} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"12px 16px",background:t.input,borderRadius:12,border:`1px solid ${t.border}`}}>
                <span style={{fontSize:20,flexShrink:0}}>{f.icon}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:t.text,marginBottom:2}}>{f.label}</div>
                  <div style={{fontSize:12,color:t.muted,lineHeight:1.5}}>{f.desc}</div>
                </div>
                <span style={{marginLeft:"auto",color:"#10b981",fontSize:16,flexShrink:0}}>✓</span>
              </div>
            ))}
          </div>

          <button onClick={()=>{onUpgrade();onClose();}} style={{width:"100%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:12,padding:"15px 0",fontWeight:800,fontSize:15,cursor:"pointer",letterSpacing:.4,marginBottom:12,boxShadow:"0 8px 24px rgba(99,102,241,.4)"}}>
            {billing==="monthly"?"Start Pro — $9/month":"Start Pro — $79/year"}
          </button>
          <div style={{textAlign:"center",fontSize:11,color:t.muted,paddingBottom:24}}>Cancel anytime · No hidden fees · Instant access</div>
        </div>
      </div>
    </div>
  );
}

// ── Pro lock wrapper ──────────────────────────────────────────────────────────
function ProGate({ title, desc, icon, onUpgrade, dark }) {
  const t = useTheme(dark);
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:48,textAlign:"center"}}>
      <div style={{fontSize:44,marginBottom:14}}>{icon}</div>
      <div style={{fontWeight:800,fontSize:17,color:t.text,marginBottom:8}}>{title}</div>
      <div style={{fontSize:13,color:t.muted,maxWidth:340,margin:"0 auto 24px",lineHeight:1.6}}>{desc}</div>
      <button onClick={onUpgrade} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"12px 28px",fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:"0 6px 20px rgba(99,102,241,.35)"}}>
        Unlock with Pro 💎
      </button>
    </div>
  );
}

// ── Risk Calculator ───────────────────────────────────────────────────────────
function RiskCalculator({ dark }) {
  const t = useTheme(dark);
  const [acct,setAcct] = useState("10000");
  const [risk,setRisk] = useState("1");
  const [entry,setEntry] = useState("");
  const [stop,setStop] = useState("");
  const [target,setTarget] = useState("");
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 12px",color:t.text,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box",fontFamily:"'DM Mono',monospace"};
  const lbl={fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:6,display:"block"};
  const riskAmt = parseFloat(acct)*(parseFloat(risk)/100)||0;
  const stopDist = entry&&stop?Math.abs(parseFloat(entry)-parseFloat(stop)):0;
  const shares = stopDist>0?Math.floor(riskAmt/stopDist):0;
  const rr = target&&stopDist>0?((Math.abs(parseFloat(target)-parseFloat(entry)))/stopDist).toFixed(2):null;
  const maxLoss = shares*stopDist;
  const profit = shares&&target?shares*Math.abs(parseFloat(target)-parseFloat(entry)):0;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{fontWeight:800,fontSize:16,color:t.text,marginBottom:4}}>⚖️ Position Size Calculator</div>
        <div style={{fontSize:13,color:t.muted,marginBottom:20}}>Never risk more than you plan. Enter your levels and get exact share count.</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 160px"}}><label style={lbl}>Account Size ($)</label><input style={inp} type="number" value={acct} onChange={e=>setAcct(e.target.value)} placeholder="10000"/></div>
          <div style={{flex:"1 1 120px"}}><label style={lbl}>Risk % per trade</label><input style={inp} type="number" value={risk} onChange={e=>setRisk(e.target.value)} placeholder="1"/></div>
          <div style={{flex:"1 1 130px"}}><label style={lbl}>Entry Price</label><input style={inp} type="number" value={entry} onChange={e=>setEntry(e.target.value)} placeholder="0.00"/></div>
          <div style={{flex:"1 1 130px"}}><label style={lbl}>Stop Loss</label><input style={inp} type="number" value={stop} onChange={e=>setStop(e.target.value)} placeholder="0.00"/></div>
          <div style={{flex:"1 1 130px"}}><label style={lbl}>Target (optional)</label><input style={inp} type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="0.00"/></div>
        </div>
      </div>
      {shares>0&&(
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[
            ["Shares to Buy", shares.toLocaleString(), "#6366f1"],
            ["Max Risk", `$${maxLoss.toFixed(2)}`, "#ef4444"],
            ["Risk Amount", `$${riskAmt.toFixed(2)}`, t.text],
            ...(rr?[["Risk:Reward", `${rr}R`, parseFloat(rr)>=2?"#10b981":"#f59e0b"]]:[] ),
            ...(profit?[["Target Profit", `+$${profit.toFixed(2)}`, "#10b981"]]:[] ),
          ].map(([l,v,c])=>(
            <div key={l} style={{flex:"1 1 120px",background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"16px 18px"}}>
              <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:6}}>{l}</div>
              <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {rr&&parseFloat(rr)<2&&(
        <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,padding:"12px 16px",fontSize:13,color:"#f59e0b"}}>
          ⚠️ R:R below 2:1 — consider a better target or skip the trade.
        </div>
      )}
    </div>
  );
}

// ── Streak Tracker ────────────────────────────────────────────────────────────
function StreakTracker({ trades, dark }) {
  const t = useTheme(dark);
  const byDate = {};
  trades.forEach(tr=>{
    if(!byDate[tr.date]) byDate[tr.date]=0;
    byDate[tr.date]+=pnlOf(tr);
  });
  const dates = Object.keys(byDate).sort();
  let streak=0, best=0, cur=0;
  dates.forEach(d=>{
    if(byDate[d]>0){ cur++; if(cur>best)best=cur; }
    else cur=0;
  });
  streak=cur;
  const totalGreen=dates.filter(d=>byDate[d]>0).length;
  const totalRed=dates.filter(d=>byDate[d]<0).length;
  const achieved=MILESTONES.filter(m=>best>=m.streak);
  const next=MILESTONES.find(m=>best<m.streak);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {[
          ["Current Streak", `${streak} days`, streak>0?"#10b981":"#ef4444"],
          ["Best Streak",    `${best} days`,   "#6366f1"],
          ["Green Days",     totalGreen,        "#10b981"],
          ["Red Days",       totalRed,          "#ef4444"],
        ].map(([l,v,c])=><StatCard key={l} dark={dark} label={l} value={v} color={c}/>)}
      </div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{fontWeight:800,fontSize:15,color:t.text,marginBottom:16}}>🏆 Milestones</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {MILESTONES.map(m=>{
            const done=best>=m.streak;
            return (
              <div key={m.streak} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:done?"rgba(99,102,241,.07)":t.input,borderRadius:12,border:`1px solid ${done?"rgba(99,102,241,.25)":t.border}`,opacity:done?1:.5}}>
                <span style={{fontSize:26}}>{m.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:t.text}}>{m.label}</div>
                  <div style={{fontSize:12,color:t.muted}}>{m.desc}</div>
                </div>
                {done?<span style={{color:"#10b981",fontSize:18}}>✓</span>:<span style={{fontSize:12,color:t.muted}}>{m.streak - best} more days</span>}
              </div>
            );
          })}
        </div>
        {next&&(
          <div style={{marginTop:16,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:12,padding:"14px 18px"}}>
            <div style={{fontSize:12,color:"#6366f1",fontWeight:700,marginBottom:4}}>NEXT MILESTONE</div>
            <div style={{fontSize:13,color:t.text}}>You need <strong>{next.streak-best} more green days</strong> to earn <strong>{next.label} {next.icon}</strong></div>
          </div>
        )}
      </div>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{fontWeight:800,fontSize:15,color:t.text,marginBottom:14}}>📅 Day History</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {dates.map(d=>{
            const p=byDate[d];
            return (
              <div key={d} title={`${d}: ${p>=0?"+":""}$${p.toFixed(0)}`} style={{width:36,height:36,borderRadius:8,background:p>0?"rgba(16,185,129,.2)":"rgba(239,68,68,.2)",border:`1px solid ${p>0?"rgba(16,185,129,.3)":"rgba(239,68,68,.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:p>0?"#10b981":"#ef4444",fontWeight:700,cursor:"default",fontFamily:"'DM Mono',monospace"}}>
                {p>=0?"+":"-"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Pre-market Planner ────────────────────────────────────────────────────────
function PreMarketPlanner({ dark }) {
  const t = useTheme(dark);
  const [watchlist,setWatchlist] = useState(initialWatchlist);
  const [form,setForm] = useState({ticker:"",note:"",catalyst:"Technical",priority:"medium"});
  const [note,setNote] = useState("Focus on high-volume setups only. No revenge trading. Max 3 trades today.");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const prioColor={high:"red",medium:"amber",low:"gray"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{fontWeight:800,fontSize:16,color:t.text,marginBottom:4}}>📋 Pre-Market Planner</div>
        <div style={{fontSize:13,color:t.muted,marginBottom:16}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        <div style={{marginBottom:6,fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase"}}>Today's Game Plan</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp,width:"100%",height:80,resize:"vertical",lineHeight:1.6}} placeholder="Write your trading rules for today..."/>
      </div>

      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{fontWeight:800,fontSize:15,color:t.text,marginBottom:14}}>👁 Watchlist</div>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          <input style={{...inp,flex:"1 1 80px"}} value={form.ticker} onChange={e=>set("ticker",e.target.value.toUpperCase())} placeholder="Ticker"/>
          <input style={{...inp,flex:"3 1 160px"}} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Setup / note"/>
          <select style={{...inp,flex:"1 1 100px"}} value={form.catalyst} onChange={e=>set("catalyst",e.target.value)}>
            {["Technical","Earnings","News","Gap","Market"].map(c=><option key={c}>{c}</option>)}
          </select>
          <select style={{...inp,flex:"1 1 90px"}} value={form.priority} onChange={e=>set("priority",e.target.value)}>
            {["high","medium","low"].map(p=><option key={p}>{p}</option>)}
          </select>
          <button onClick={()=>{if(form.ticker&&form.note){setWatchlist(w=>[...w,{...form,id:Date.now()}]);setForm({ticker:"",note:"",catalyst:"Technical",priority:"medium"});}}} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>Add</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {watchlist.length===0&&<div style={{textAlign:"center",color:t.muted,fontSize:13,padding:20}}>No tickers yet. Add some above.</div>}
          {watchlist.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:t.input,borderRadius:12,border:`1px solid ${t.border}`}}>
              <div style={{fontWeight:800,fontSize:14,color:t.text,fontFamily:"'DM Mono',monospace",width:55}}>{item.ticker}</div>
              <div style={{flex:1,fontSize:12,color:t.sub,lineHeight:1.4}}>{item.note}</div>
              <Badge color="gray">{item.catalyst}</Badge>
              <Badge color={prioColor[item.priority]||"gray"}>{item.priority}</Badge>
              <button onClick={()=>setWatchlist(w=>w.filter(x=>x.id!==item.id))} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,fontSize:16}}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Daily Summary ─────────────────────────────────────────────────────────────
function DailySummary({ trades, dark }) {
  const t = useTheme(dark);
  const [loading,setLoading] = useState(false);
  const [summary,setSummary] = useState(null);
  const [selDate,setSelDate] = useState(new Date().toISOString().split("T")[0]);
  const dates=[...new Set(trades.map(tr=>tr.date))].sort().reverse();
  if(!dates.includes(selDate)&&dates.length) setSelDate(dates[0]);
  const dayTrades=trades.filter(tr=>tr.date===selDate);
  const dayPnl=dayTrades.reduce((a,tr)=>a+pnlOf(tr),0);
  const dayWins=dayTrades.filter(tr=>pnlOf(tr)>0).length;
  const inp={background:t.input,border:`1px solid ${t.border}`,borderRadius:8,padding:"8px 12px",color:t.text,fontSize:13,outline:"none"};

  const genSummary=async()=>{
    setLoading(true);
    const detail=dayTrades.map(tr=>`${tr.ticker} ${tr.side} | Entry:$${tr.entry} Exit:$${tr.exit} | P&L:$${pnlOf(tr).toFixed(2)} | Setup:${tr.setup} | Emotion:${tr.emotion}`).join("\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"You are a trading performance coach. Write a concise end-of-day recap for a day trader. Cover: 1) Session performance summary, 2) Best trade and why, 3) Worst trade and lesson, 4) Emotional patterns noticed, 5) One focus for tomorrow. Be direct, honest, and actionable. Keep it under 200 words.",messages:[{role:"user",content:`Date: ${selDate}\nTrades:\n${detail}\nTotal P&L: $${dayPnl.toFixed(2)}\nWin rate: ${dayTrades.length?Math.round(dayWins/dayTrades.length*100):0}%`}]})});
      const data=await res.json();
      setSummary(data.content[0].text);
    }catch(e){setSummary("Error: "+e.message);}
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:"22px 26px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div style={{fontWeight:800,fontSize:16,color:t.text}}>📊 Daily P&L Summary</div>
          <select style={inp} value={selDate} onChange={e=>{setSelDate(e.target.value);setSummary(null);}}>
            {dates.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {dayTrades.length===0?(
          <div style={{textAlign:"center",color:t.muted,fontSize:13,padding:20}}>No trades logged for this date.</div>
        ):(
          <>
            <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              {[["Day P&L",`${dayPnl>=0?"+":""}$${dayPnl.toFixed(2)}`,dayPnl>=0?"#10b981":"#ef4444"],["Trades",dayTrades.length,t.text],["Wins",dayWins,"#10b981"],["Win Rate",`${Math.round(dayWins/dayTrades.length*100)}%`,t.text]].map(([l,v,c])=>(
                <div key={l} style={{flex:"1 1 100px",background:t.input,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:4}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
              {dayTrades.map(tr=>{
                const p=pnlOf(tr);
                return(
                  <div key={tr.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:t.input,borderRadius:10}}>
                    <span style={{fontWeight:700,fontSize:13,color:t.text,fontFamily:"'DM Mono',monospace",width:55}}>{tr.ticker}</span>
                    <Badge color={tr.side==="Long"?"green":"red"}>{tr.side}</Badge>
                    <span style={{flex:1,fontSize:12,color:t.muted}}>{tr.setup} · {tr.emotion}</span>
                    <span style={{fontWeight:700,fontSize:13,color:p>=0?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>{p>=0?"+":""}${p.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={genSummary} disabled={loading} style={{width:"100%",background:summary?"transparent":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:summary?t.muted:"#fff",border:summary?`1px solid ${t.border}`:"none",borderRadius:10,padding:"11px 0",fontWeight:800,fontSize:13,cursor:loading?"wait":"pointer",opacity:loading?.7:1}}>
              {loading?"Generating recap...":summary?"Regenerate AI Recap ↻":"Generate AI Day Recap"}
            </button>
            {summary&&(
              <div style={{marginTop:14,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",borderRadius:12,padding:"16px 18px",fontSize:13,color:t.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>
                <div style={{fontWeight:700,color:"#6366f1",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>AI Day Recap</div>
                {summary}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Chart Analysis Tab ────────────────────────────────────────────────────────
function ChartAnalysisTab({ dark, t }) {
  const [image,setImage]=useState(null);
  const [ctx,setCtx]=useState("");
  const [dragOver,setDragOver]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const [err,setErr]=useState(null);
  const fileRef=useRef();
  const loadFile=f=>{if(!f||!f.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>{setImage(e.target.result);setAnalysis(null);setErr(null);};r.readAsDataURL(f);};
  const handlePaste=e=>{const items=e.clipboardData?e.clipboardData.items:[];for(let i=0;i<items.length;i++){if(items[i].type.startsWith("image/")){loadFile(items[i].getAsFile());break;}}};
  const run=()=>{
    if(!image)return;setAnalyzing(true);setErr(null);
    const img=new Image();
    img.onload=async()=>{
      const MAX=1500;let w=img.width,h=img.height;
      if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
      if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      const b64=c.toDataURL("image/jpeg",.92).split(",")[1];
      try{
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:"You are an expert day trader and technical analyst. Analyze the provided chart screenshot with precision. Structure your response:\n\n📊 PATTERN & STRUCTURE — patterns, formations visible\n🎯 KEY LEVELS — support, resistance, confluence zones\n📈 BIAS — directional bias and reasoning\n⚡ ENTRY OPPORTUNITY — potential setups and triggers\n⚠️ RISK — invalidation levels\n💡 INSIGHT — one sharp actionable takeaway",messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:ctx?`Context: ${ctx}\n\nAnalyze this chart.`:"Analyze this chart."}]}]})});
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        setAnalysis(data.content[0].text);
      }catch(e){setErr(e.message);}
      setAnalyzing(false);
    };
    img.src=image;
  };
  const inp={background:dark?"#1e2030":"#f8faff",border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 12px",color:t.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"};
  return (
    <div onPaste={handlePaste} style={{display:"flex",flexDirection:"column",gap:16}} tabIndex={0}>
      <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"20px 24px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:18}}>📸</span>
          <span style={{fontWeight:800,fontSize:16,color:t.text}}>Chart Analyzer</span>
          <Badge color="blue">Pro</Badge>
        </div>
        <div style={{fontSize:13,color:t.muted}}>Paste with <kbd style={{background:dark?"#2d3148":"#e8ecf4",borderRadius:4,padding:"1px 6px",fontSize:11,fontFamily:"monospace"}}>Ctrl+V</kbd>, drag & drop, or click to upload.</div>
      </div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 340px"}}>
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);loadFile(e.dataTransfer.files[0]);}}
            onClick={()=>!image&&fileRef.current&&fileRef.current.click()}
            style={{border:`2px dashed ${dragOver?"#6366f1":t.border}`,borderRadius:14,minHeight:260,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:dragOver?"rgba(99,102,241,.06)":t.card,cursor:image?"default":"pointer",transition:"all .2s",overflow:"hidden",position:"relative"}}>
            {image?(
              <div style={{position:"relative",width:"100%"}}>
                <img src={image} alt="chart" style={{maxWidth:"100%",maxHeight:360,borderRadius:10,display:"block",margin:"0 auto"}}/>
                <button onClick={e=>{e.stopPropagation();setImage(null);setAnalysis(null);setErr(null);}} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,.6)",color:"#fff",border:"none",borderRadius:"50%",width:28,height:28,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            ):(
              <div style={{textAlign:"center",padding:32}}>
                <div style={{fontSize:36,marginBottom:12}}>📋</div>
                <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:6}}>Paste, drag & drop, or click</div>
                <div style={{fontSize:12,color:t.muted}}>PNG, JPG, WEBP supported</div>
                <div style={{marginTop:14,display:"inline-block",padding:"7px 18px",borderRadius:8,border:`1px solid ${t.border}`,fontSize:12,color:t.muted}}>Press <strong>Ctrl+V</strong> to paste</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])}/>
        </div>
        <div style={{flex:"1 1 280px",display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:5,display:"block"}}>Context (optional)</label>
            <textarea value={ctx} onChange={e=>setCtx(e.target.value)} placeholder="e.g. NVDA 5min, looking for long..." style={{...inp,height:80,resize:"vertical"}}/>
          </div>
          <button onClick={run} disabled={!image||analyzing} style={{background:image&&!analyzing?"linear-gradient(135deg,#6366f1,#8b5cf6)":(dark?"#252840":"#e8ecf4"),color:image&&!analyzing?"#fff":t.muted,border:"none",borderRadius:10,padding:"12px 0",fontWeight:800,fontSize:14,cursor:image&&!analyzing?"pointer":"not-allowed",transition:"all .2s"}}>
            {analyzing?"Analyzing chart...":"Analyze Chart"}
          </button>
          {err&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#ef4444"}}>⚠️ {err}</div>}
          {analysis&&(
            <div style={{background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",borderRadius:12,padding:"16px 18px",fontSize:13,color:t.text,lineHeight:1.75,whiteSpace:"pre-wrap",overflowY:"auto",maxHeight:400}}>
              <div style={{fontWeight:700,color:"#6366f1",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>AI Analysis</div>
              {analysis}
            </div>
          )}
          {!image&&!analysis&&(
            <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",fontSize:12,color:t.muted,lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:8,color:t.text}}>Tips</div>
              <div>• Full TradingView screenshots work best</div>
              <div>• Add ticker + timeframe in context</div>
              <div>• Ctrl+V to paste straight from clipboard</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AI Insights ───────────────────────────────────────────────────────────────
function AIInsights({ trades, dark, t }) {
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const run=async()=>{
    setLoading(true);
    const summary=trades.map(tr=>`${tr.ticker} ${tr.side} | Setup:${tr.setup} | Emotion:${tr.emotion} | P&L:$${pnlOf(tr).toFixed(2)}`).join("\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"You are an expert trading psychologist and performance coach. Give a sharp, honest, actionable debrief with 4 sections: PSYCHOLOGICAL WEAKNESS, BEST SETUP, WORST HABIT, ONE RULE.",messages:[{role:"user",content:`Trades:\n${summary}\n\nFull debrief.`}]})});
      const data=await res.json();setResult(data.content[0].text);
    }catch(e){setResult("Error: "+e.message);}
    setLoading(false);
  };
  return (
    <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:16,padding:28}}>
      <div style={{fontWeight:800,fontSize:15,color:t.text,marginBottom:6}}>🧠 AI Trade Debrief</div>
      <div style={{fontSize:13,color:t.muted,marginBottom:20}}>Full psychological analysis across all {trades.length} trades.</div>
      {!result&&<button onClick={run} disabled={loading} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontWeight:800,fontSize:14,cursor:loading?"wait":"pointer",opacity:loading?.7:1}}>{loading?"Analyzing...":"Run Full Debrief"}</button>}
      {result&&<div style={{background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.18)",borderRadius:12,padding:"18px 20px",fontSize:13,color:t.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{result}</div>}
    </div>
  );
}

// ── Trade Detail Modal ────────────────────────────────────────────────────────
function TradeDetailModal({ trade, dark, onClose, proUnlocked, onUpgrade }) {
  const t = useTheme(dark);
  const [analyzing,setAnalyzing]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const [image,setImage]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [err,setErr]=useState(null);
  const fileRef=useRef();
  const pnl=pnlOf(trade);
  const loadFile=f=>{if(!f||!f.type.startsWith("image/"))return;const r=new FileReader();r.onload=e=>{setImage(e.target.result);setAnalysis(null);setErr(null);};r.readAsDataURL(f);};
  const run=()=>{
    if(!image)return;setAnalyzing(true);
    const img=new Image();
    img.onload=async()=>{
      const MAX=1500;let w=img.width,h=img.height;
      if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}
      const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
      const b64=c.toDataURL("image/jpeg",.92).split(",")[1];
      try{
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"Expert day trader and technical analyst. Analyze the chart and trade details. Cover: key patterns, entry/exit quality, what worked or didn't, one concrete improvement.",messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:b64}},{type:"text",text:`Trade: ${trade.side} ${trade.ticker} | Entry:$${trade.entry} Exit:$${trade.exit} Shares:${trade.shares} Setup:${trade.setup} Emotion:${trade.emotion} P&L:$${pnl.toFixed(2)} Notes:${trade.notes}`}]}]})});
        const data=await res.json();if(data.error)throw new Error(data.error.message);
        setAnalysis(data.content[0].text);
      }catch(e){setErr(e.message);}
      setAnalyzing(false);
    };img.src=image;
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)"}}>
      <div style={{background:t.card,borderRadius:20,width:580,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${t.border}`,boxShadow:"0 32px 80px rgba(0,0,0,.4)"}}>
        <div style={{padding:"22px 28px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontWeight:800,fontSize:18,color:t.text,fontFamily:"'DM Mono',monospace"}}>{trade.ticker}</span>
            <Badge color={trade.side==="Long"?"green":"red"}>{trade.side}</Badge>
            <span style={{fontWeight:800,fontSize:16,color:pnl>=0?"#10b981":"#ef4444",fontFamily:"'DM Mono',monospace"}}>{pnl>=0?"+":""}${pnl.toFixed(2)}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:t.muted,fontSize:22}}>×</button>
        </div>
        <div style={{padding:"22px 28px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",gap:12}}>
            {[["Entry",`$${trade.entry}`],["Exit",`$${trade.exit}`],["Shares",trade.shares],["Setup",trade.setup]].map(([l,v])=>(
              <div key={l} style={{flex:1,background:t.input,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:.8,textTransform:"uppercase",marginBottom:4}}>{l}</div>
                <div style={{fontWeight:700,fontSize:13,color:t.text}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Badge color={["Revenge","Anxious"].includes(trade.emotion)?"amber":"blue"}>{trade.emotion}</Badge>
            {trade.tags&&trade.tags.split(",").map(tag=><Badge key={tag} color="gray">{tag.trim()}</Badge>)}
          </div>
          {trade.notes&&<div style={{background:t.input,borderRadius:10,padding:"12px 14px",fontSize:13,color:t.text,lineHeight:1.6}}>{trade.notes}</div>}
          <div style={{borderTop:`1px solid ${t.border}`,paddingTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontWeight:800,fontSize:13,color:t.text}}>Chart Analyzer</span>
              <Badge color="blue">Pro</Badge>
            </div>
            {!proUnlocked?(
              <div style={{background:t.input,borderRadius:10,padding:16,textAlign:"center",color:t.muted,fontSize:13}}>
                🔒 <button onClick={onUpgrade} style={{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontWeight:700,fontSize:13}}>Upgrade to Pro</button> to analyze chart screenshots
              </div>
            ):(
              <div>
                <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);loadFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current&&fileRef.current.click()}
                  style={{border:`2px dashed ${dragOver?"#6366f1":t.border}`,borderRadius:12,padding:"18px 16px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(99,102,241,.05)":t.input,transition:"all .2s"}}>
                  {image?<img src={image} alt="chart" style={{maxWidth:"100%",maxHeight:200,borderRadius:8}}/>:<div style={{color:t.muted,fontSize:13}}>📸 Drop screenshot or click to upload</div>}
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])}/>
                </div>
                {image&&!analysis&&<button onClick={run} disabled={analyzing} style={{width:"100%",marginTop:10,background:"#6366f1",color:"#fff",border:"none",borderRadius:10,padding:"11px 0",fontWeight:800,fontSize:13,cursor:analyzing?"wait":"pointer",opacity:analyzing?.7:1}}>{analyzing?"Analyzing...":"Analyze Chart with AI"}</button>}
                {err&&<div style={{marginTop:10,color:"#ef4444",fontSize:12}}>⚠️ {err}</div>}
                {analysis&&<div style={{marginTop:12,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:12,padding:"14px 16px",fontSize:13,color:t.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}><div style={{fontWeight:700,color:"#6366f1",fontSize:11,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>AI Analysis</div>{analysis}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Blotter() {
  const [dark,setDark] = useState(true);
  const [trades,setTrades] = useState(initialTrades);
  const [tab,setTab] = useState("dashboard");
  const [showLog,setShowLog] = useState(false);
  const [selected,setSelected] = useState(null);
  const [proUnlocked,setProUnlocked] = useState(false);
  const [showUpgrade,setShowUpgrade] = useState(false);
  const [filter,setFilter] = useState("all");
  const t = useTheme(dark);

  const allPnl=trades.reduce((a,tr)=>a+pnlOf(tr),0);
  const wins=trades.filter(tr=>pnlOf(tr)>0);
  const losses=trades.filter(tr=>pnlOf(tr)<0);
  const winRate=trades.length?Math.round(wins.length/trades.length*100):0;
  const avgWin=wins.length?wins.reduce((a,tr)=>a+pnlOf(tr),0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((a,tr)=>a+pnlOf(tr),0)/losses.length):0;
  const shown=trades.filter(tr=>filter==="wins"?pnlOf(tr)>0:filter==="losses"?pnlOf(tr)<0:true);

  const PRO_TABS = ["chart","insights","streak","risk","planner","daily"];
  const tabs=[
    {id:"dashboard",label:"Dashboard"},
    {id:"trades",   label:"Trades"},
    {id:"chart",    label:"📸 Charts",  pro:true},
    {id:"insights", label:"🧠 Insights",pro:true},
    {id:"streak",   label:"🔥 Streaks", pro:true},
    {id:"risk",     label:"⚖️ Risk Calc",pro:true},
    {id:"planner",  label:"📋 Planner", pro:true},
    {id:"daily",    label:"📊 Daily",   pro:true},
  ];

  const handleTabClick = id => {
    if(PRO_TABS.includes(id)&&!proUnlocked){ setShowUpgrade(true); return; }
    setTab(id);
  };

  return (
    <div style={{minHeight:"100vh",background:t.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:t.text,transition:"background .3s,color .3s"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;0,9..40,900&family=DM+Mono:wght@400;500;600&display=swap'); * { box-sizing: border-box; }`}</style>

      {/* Navbar */}
      <div style={{background:t.nav,borderBottom:`1px solid ${t.navBorder}`,padding:"0 20px",display:"flex",alignItems:"center",height:56,position:"sticky",top:0,zIndex:50,gap:0}}>
        <div style={{fontWeight:900,fontSize:18,letterSpacing:-0.8,color:t.text,marginRight:24,flexShrink:0}}>
          <span style={{color:"#6366f1"}}>●</span> Blotter
        </div>
        <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
          {tabs.map(tb=>(
            <button key={tb.id} onClick={()=>handleTabClick(tb.id)}
              style={{padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:tab===tb.id?(dark?"#252840":"#eef0ff"):"transparent",color:tab===tb.id?"#6366f1":t.muted,transition:"all .15s",whiteSpace:"nowrap",flexShrink:0,opacity:tb.pro&&!proUnlocked?.6:1}}>
              {tb.label}{tb.pro&&!proUnlocked&&" 🔒"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,marginLeft:10}}>
          {!proUnlocked?(
            <button onClick={()=>setShowUpgrade(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 4px 14px rgba(99,102,241,.4)"}}>
              💎 Go Pro
            </button>
          ):<Badge color="blue">Pro ✓</Badge>}
          <span style={{fontSize:11,color:t.muted}}>☀️</span>
          <ThemeToggle dark={dark} onToggle={()=>setDark(d=>!d)}/>
          <span style={{fontSize:11,color:t.muted}}>🌙</span>
          <button onClick={()=>setShowLog(true)} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontWeight:800,fontSize:12,cursor:"pointer",marginLeft:4}}>+ Log Trade</button>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"28px 20px"}}>

        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <StatCard dark={dark} label="Total P&L" value={`${allPnl>=0?"+":""}$${allPnl.toFixed(0)}`} color={allPnl>=0?"#10b981":"#ef4444"} sub={`${trades.length} trades`}/>
              <StatCard dark={dark} label="Win Rate" value={`${winRate}%`} sub={`${wins.length}W / ${losses.length}L`}/>
              <StatCard dark={dark} label="Avg Win" value={`$${avgWin.toFixed(0)}`} color="#10b981"/>
              <StatCard dark={dark} label="Avg Loss" value={`$${avgLoss.toFixed(0)}`} color="#ef4444"/>
            </div>
            <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px"}}>
              <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Cumulative P&L</div>
              <PnLChart trades={trades} dark={dark}/>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1,background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px"}}>
                <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>Emotion P&L</div>
                {EMOTIONS.filter(em=>trades.some(tr=>tr.emotion===em)).map(em=>{
                  const emt=trades.filter(tr=>tr.emotion===em);
                  const emp=emt.reduce((a,tr)=>a+pnlOf(tr),0);
                  return(
                    <div key={em} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:["Revenge","Anxious","FOMO"].includes(em)?"#f59e0b":"#6366f1"}}/>
                        <span style={{fontSize:12,color:t.sub}}>{em}</span>
                        <span style={{fontSize:11,color:t.muted}}>{emt.length}x</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:emp>=0?"#10b981":"#ef4444"}}>{emp>=0?"+":""}${emp.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{flex:1,background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"18px 20px"}}>
                <div style={{fontSize:10,fontWeight:700,color:t.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>Setup Performance</div>
                {SETUPS.filter(s=>trades.some(tr=>tr.setup===s)).map(s=>{
                  const st=trades.filter(tr=>tr.setup===s);
                  const sp=st.reduce((a,tr)=>a+pnlOf(tr),0);
                  const sw=st.filter(tr=>pnlOf(tr)>0).length;
                  return(
                    <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:"#6366f1"}}/>
                        <span style={{fontSize:12,color:t.sub}}>{s}</span>
                        <span style={{fontSize:11,color:t.muted}}>{Math.round(sw/st.length*100)}%</span>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:sp>=0?"#10b981":"#ef4444"}}>{sp>=0?"+":""}${sp.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Pro upsell banner */}
            {!proUnlocked&&(
              <div style={{background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(168,85,247,.08))",border:"1px solid rgba(99,102,241,.25)",borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                <span style={{fontSize:28}}>💎</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:t.text,marginBottom:3}}>Unlock the full Blotter experience</div>
                  <div style={{fontSize:12,color:t.muted}}>Chart AI · Streak tracker · Risk calculator · Pre-market planner · Daily recaps · AI debrief</div>
                </div>
                <button onClick={()=>setShowUpgrade(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",border:"none",borderRadius:10,padding:"10px 22px",fontWeight:800,fontSize:13,cursor:"pointer",flexShrink:0,boxShadow:"0 6px 20px rgba(99,102,241,.35)"}}>Go Pro — $9/mo</button>
              </div>
            )}
          </div>
        )}

        {tab==="trades"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"flex",gap:8}}>
              {["all","wins","losses"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${filter===f?"#6366f1":t.border}`,background:filter===f?"rgba(99,102,241,.1)":"transparent",color:filter===f?"#6366f1":t.muted,fontWeight:700,fontSize:12,cursor:"pointer",textTransform:"capitalize"}}>{f}</button>
              ))}
            </div>
            <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:16,padding:"10px 20px",borderBottom:`1px solid ${t.border}`}}>
                {["Ticker","Setup","Entry → Exit","Emotion","P&L",""].map((h,i)=>(
                  <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:.8,color:t.muted,textTransform:"uppercase",flex:i===0?"0 0 70px":i===1?1:i===2?"0 0 110px":i===3?"0 0 70px":i===4?"0 0 90px":"0 0 24px",textAlign:i===4?"right":"left"}}>{h}</div>
                ))}
              </div>
              {shown.length===0
                ?<div style={{padding:32,textAlign:"center",color:t.muted,fontSize:13}}>No trades yet.</div>
                :shown.map(tr=><TradeRow key={tr.id} trade={tr} dark={dark} onSelect={setSelected} onDelete={id=>setTrades(ts=>ts.filter(x=>x.id!==id))}/>)
              }
            </div>
          </div>
        )}

        {tab==="chart"&&<ChartAnalysisTab dark={dark} t={t}/>}
        {tab==="insights"&&<AIInsights trades={trades} dark={dark} t={t}/>}
        {tab==="streak"&&<StreakTracker trades={trades} dark={dark}/>}
        {tab==="risk"&&<RiskCalculator dark={dark}/>}
        {tab==="planner"&&<PreMarketPlanner dark={dark}/>}
        {tab==="daily"&&<DailySummary trades={trades} dark={dark}/>}

      </div>

      {showLog&&<LogTradeModal dark={dark} onClose={()=>setShowLog(false)} onSave={tr=>setTrades(ts=>[tr,...ts])}/>}
      {selected&&<TradeDetailModal trade={selected} dark={dark} onClose={()=>setSelected(null)} proUnlocked={proUnlocked} onUpgrade={()=>{setSelected(null);setShowUpgrade(true);}}/>}
      {showUpgrade&&<UpgradeModal dark={dark} onClose={()=>setShowUpgrade(false)} onUpgrade={()=>setProUnlocked(true)}/>}
    </div>
  );
}
