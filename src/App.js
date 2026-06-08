import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const USERS = {
  slava:   { id:"slava",   name:"Слава",  emoji:"👨", pin:"1234", theme:{ primary:"#2563EB", light:"#EFF6FF", mid:"#BFDBFE", dark:"#1D4ED8", bg:"#F0F6FF" }},
  anechka: { id:"anechka", name:"Анечка", emoji:"👩", pin:"5678", theme:{ primary:"#DB2777", light:"#FDF2F8", mid:"#FBCFE8", dark:"#BE185D", bg:"#FDF0F8" }},
};
const INCOME_TYPES = [
  { key:"salary",   label:"Зарплата",   icon:"💼" },
  { key:"advance",  label:"Аванс",      icon:"💳" },
  { key:"vacation", label:"Отпускные",  icon:"🏖️" },
  { key:"sick",     label:"Больничный", icon:"🏥" },
  { key:"kk",       label:"КК",         icon:"💰" },
  { key:"other",    label:"Прочее",     icon:"💡" },
];
const OBLIGATION_ITEMS = [
  { key:"rent",      label:"Квартира", icon:"🏠" },
  { key:"utilities", label:"ЖКХ",      icon:"💡" },
  { key:"internet",  label:"Связь",    icon:"📶" },
  { key:"credit",    label:"Кредит",   icon:"🏦" },
  { key:"beauty",    label:"Красота",  icon:"💄" },
  { key:"other_obl", label:"Прочее",   icon:"📋" },
];
const DEFAULT_BUDGET_CATS = [
  { key:"food",          label:"Еда",             icon:"🛒", color:"#8B5CF6", percent:25, custom:false },
  { key:"transport",     label:"Транспорт",       icon:"🚗", color:"#F59E0B", percent:15, custom:false },
  { key:"entertainment", label:"Развлечения",     icon:"🎭", color:"#EC4899", percent:10, custom:false },
  { key:"travel",        label:"Командировки",    icon:"✈️", color:"#06B6D4", percent:10, custom:false },
  { key:"savings",       label:"Копилка",         icon:"🐷", color:"#10B981", percent:25, custom:false },
  { key:"charity",       label:"Благотворительность", icon:"❤️", color:"#EF4444", percent:5, custom:false },
  { key:"reserve",       label:"Резерв",          icon:"🛡️", color:"#6B7280", percent:10, custom:false },
];
const BANK_CARDS = [
  { key:"sber",    label:"Сбер",    color:"#21A038", bg:"#E8F5E9" },
  { key:"tbank",   label:"Т-Банк",  color:"#FFDD2D", bg:"#FFFDE7", textColor:"#333" },
  { key:"yandex",  label:"Яндекс", color:"#FC3F1D", bg:"#FFF0ED" },
  { key:"gazprom", label:"Газпром", color:"#003087", bg:"#E8EAF6" },
  { key:"vtb",     label:"ВТБ",    color:"#009FDF", bg:"#E0F7FA" },
  { key:"ozon",    label:"OZON",   color:"#005BFF", bg:"#E8EEFF" },
];
const CAT_COLORS = ["#8B5CF6","#F59E0B","#EC4899","#06B6D4","#10B981","#EF4444","#3B82F6","#14B8A6","#F97316","#A855F7"];
const MONTHS = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const fmt = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n??0);
const load = (k,fb) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; }};
const save = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };
const mkKey = (y,m) => `${y}-${m+1}`;
const nowKey = () => { const d=new Date(); return mkKey(d.getFullYear(),d.getMonth()); };
const periodLabel = key => { if(!key)return""; const [y,m]=key.split("-"); return `${MONTHS[Number(m)-1]} ${y}`; };
const historyMonths = (() => {
  const arr=[]; const start=new Date(2026,4,1);
  const now=new Date(); let d=new Date(start);
  while(d<=now){ arr.push(mkKey(d.getFullYear(),d.getMonth())); d=new Date(d.getFullYear(),d.getMonth()+1,1); }
  return arr;
})();

// ═══════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════
function Toast({ msg, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2600); return()=>clearTimeout(t); },[]);
  return <div style={{ position:"fixed",bottom:96,left:"50%",transform:"translateX(-50%)",background:"#1e293b",color:"#fff",padding:"11px 24px",borderRadius:99,fontSize:14,fontWeight:700,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,.28)",whiteSpace:"nowrap",pointerEvents:"none" }}>{msg}</div>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"white",borderRadius:"24px 24px 0 0",padding:"20px 18px 36px",width:"100%",maxWidth:430,maxHeight:"92vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <h3 style={{ margin:0,fontSize:17,fontWeight:900,color:"#1e293b" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════════
function Calculator({ onResult, onClose, initial="" }) {
  const [expr,setExpr] = useState(initial ? String(initial) : "");
  const [preview,setPreview] = useState("");

  const calc = str => {
    try {
      const cleaned = str.replace(/[^0-9+\-*/().]/g,"");
      if(!cleaned) return "";
      const result = Function('"use strict"; return (' + cleaned + ')')();
      return isFinite(result) ? Math.round(result*100)/100 : "";
    } catch { return ""; }
  };

  const press = btn => {
    if(btn==="="){
      const r=calc(expr);
      if(r!==""){setExpr(String(r));setPreview("");}
      return;
    }
    if(btn==="C"){setExpr("");setPreview("");return;}
    if(btn==="⌫"){const ne=expr.slice(0,-1);setExpr(ne);setPreview(calc(ne)||"");return;}
    if(btn==="✓"){const r=calc(expr)||Number(expr)||0;onResult(r);onClose();return;}
    const ne=expr+btn;
    setExpr(ne);
    setPreview(calc(ne)||"");
  };

  const keys=[["7","8","9","⌫"],["4","5","6","×"],["1","2","3","-"],["C","0",".","+"],["%","(",")","/"],["=","","","✓"]];
  const opMap={"×":"*"};

  return (
    <div style={{ background:"white",borderRadius:20,padding:16,boxShadow:"0 8px 32px rgba(0,0,0,.12)" }}>
      <div style={{ background:"#f8fafc",borderRadius:14,padding:"12px 16px",marginBottom:12,minHeight:60 }}>
        <p style={{ margin:0,fontSize:13,color:"#94a3b8",minHeight:18 }}>{preview ? `= ${fmt(preview)}` : " "}</p>
        <p style={{ margin:0,fontSize:24,fontWeight:800,color:"#1e293b",wordBreak:"break-all" }}>{expr||"0"}</p>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
        {keys.flat().map((btn,i)=>{
          const mapped=opMap[btn]||btn;
          const isOp=["+","-","×","/","(",")","=","%"].includes(btn);
          const isConfirm=btn==="✓";
          const isEmpty=btn==="";
          if(isEmpty) return <div key={i}/>;
          return (
            <button key={i} onClick={()=>press(mapped)} style={{
              height:48,borderRadius:12,border:"none",fontSize:btn==="⌫"?16:17,fontWeight:700,
              background:isConfirm?"#10B981":isOp?"#EFF6FF":"#f1f5f9",
              color:isConfirm?"white":isOp?"#2563EB":"#1e293b",
              cursor:"pointer",fontFamily:"inherit"
            }}>{btn}</button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MONTH PICKER
// ═══════════════════════════════════════════
function MonthPicker({ current, onChange }) {
  return (
    <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:0 }}>
      {historyMonths.map(key=>(
        <button key={key} onClick={()=>onChange(key)} style={{
          flexShrink:0,padding:"6px 14px",borderRadius:99,
          border:`2px solid ${current===key?"#2563EB":"#e2e8f0"}`,
          background:current===key?"#EFF6FF":"white",
          fontWeight:700,fontSize:12,color:current===key?"#2563EB":"#64748b",cursor:"pointer"
        }}>{periodLabel(key)}</button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [sel,setSel]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [shake,setShake]=useState(false);
  const tryLogin=np=>{ if(np===USERS[sel].pin){onLogin(sel);}else{setShake(true);setTimeout(()=>setShake(false),450);setErr("Неверный PIN");setPin("");} };
  const press=d=>{ if(pin.length>=4)return; const np=pin+d; setPin(np); setErr(""); if(np.length===4)setTimeout(()=>tryLogin(np),120); };
  const u=sel?USERS[sel]:null;
  return (
    <div style={{ minHeight:"100vh",background:sel==="slava"?"linear-gradient(160deg,#1e3a8a,#2563EB,#1e40af)":sel==="anechka"?"linear-gradient(160deg,#831843,#DB2777,#9d174d)":"linear-gradient(160deg,#1e3a5f,#2d6a9f,#1a2f4a)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif",padding:20,transition:"background .5s" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}@keyframes pop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}*{-webkit-tap-highlight-color:transparent}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>
      <div style={{ textAlign:"center",marginBottom:28 }}>
        <div style={{ fontSize:52,marginBottom:6 }}>💑</div>
        <h1 style={{ color:"white",fontSize:40,fontWeight:900,margin:0,letterSpacing:-2 }}>Мы</h1>
        <p style={{ color:"rgba(255,255,255,.6)",margin:"6px 0 0",fontSize:13 }}>Семейные финансы под контролем</p>
      </div>
      <div style={{ background:"white",borderRadius:28,padding:"24px 20px 28px",width:"100%",maxWidth:360,boxShadow:"0 30px 70px rgba(0,0,0,.3)" }}>
        <p style={{ textAlign:"center",color:"#64748b",marginBottom:14,fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:.8 }}>Выберите профиль</p>
        <div style={{ display:"flex",gap:12,marginBottom:20 }}>
          {Object.values(USERS).map(usr=>(
            <button key={usr.id} onClick={()=>{setSel(usr.id);setPin("");setErr("");}} style={{ flex:1,padding:"14px 8px",borderRadius:18,border:`2.5px solid ${sel===usr.id?usr.theme.primary:"#e2e8f0"}`,background:sel===usr.id?usr.theme.light:"#f8fafc",cursor:"pointer",transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:32 }}>{usr.emoji}</span>
              <span style={{ fontWeight:800,color:sel===usr.id?usr.theme.primary:"#374151",fontSize:14 }}>{usr.name}</span>
            </button>
          ))}
        </div>
        {sel&&(
          <div style={{ animation:"pop .25s ease" }}>
            <p style={{ color:"#64748b",fontSize:12,fontWeight:700,textAlign:"center",marginBottom:10,textTransform:"uppercase",letterSpacing:.8 }}>Введите PIN</p>
            <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:14,...(shake?{animation:"shake .4s ease"}:{}) }}>
              {[0,1,2,3].map(i=><div key={i} style={{ width:46,height:46,borderRadius:12,border:`2.5px solid ${pin.length>i?u.theme.primary:"#e2e8f0"}`,background:pin.length>i?u.theme.light:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:u.theme.primary }}>{pin.length>i?"●":""}</div>)}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:6 }}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
                <button key={i} onClick={()=>{ if(d==="⌫"){setPin(p=>p.slice(0,-1));setErr("");}else if(d!=="")press(String(d)); }} style={{ height:48,borderRadius:12,border:d===""?"none":"2px solid #f1f5f9",background:d===""?"transparent":"white",fontSize:d==="⌫"?16:18,fontWeight:700,color:"#374151",cursor:d===""?"default":"pointer",pointerEvents:d===""?"none":"auto" }}>{d}</button>
              ))}
            </div>
            {err?<p style={{ color:"#EF4444",textAlign:"center",fontSize:13,fontWeight:700,margin:"8px 0 0" }}>{err}</p>:<p style={{ textAlign:"center",color:"#c4cdd8",fontSize:12,margin:"8px 0 0" }}>Подсказка: {u.pin}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [cu,setCu]       = useState(null);
  const [tab,setTab]     = useState("income");
  const [toast,setToast] = useState(null);
  const [modal,setModal] = useState(null);
  // Global active month (allows editing past periods)
  const [activeMk,setActiveMk] = useState(nowKey());

  const [incomes,setIncomes]           = useState(()=>load("my_inc2",{slava:{},anechka:{}}));
  const [obligations,setObligations]   = useState(()=>load("my_obl",{}));
  const [budgetCats,setBudgetCats]     = useState(()=>load("my_bcat",DEFAULT_BUDGET_CATS));
  const [actual,setActual]             = useState(()=>load("my_actual",{}));
  const [savingsGoals,setSavingsGoals] = useState(()=>load("my_goals",[
    {id:1,title:"Отпуск в Европе", target:300000,saved:45000,icon:"🌍",color:"#10B981"},
    {id:2,title:"Новый автомобиль",target:2000000,saved:350000,icon:"🚘",color:"#F59E0B"},
  ]));
  const [savingsTotal,setSavingsTotal] = useState(()=>load("my_savtot",0));
  const [cashbacks,setCashbacks]       = useState(()=>load("my_cb",[]));

  useEffect(()=>save("my_inc2",incomes),      [incomes]);
  useEffect(()=>save("my_obl",obligations),   [obligations]);
  useEffect(()=>save("my_bcat",budgetCats),   [budgetCats]);
  useEffect(()=>save("my_actual",actual),     [actual]);
  useEffect(()=>save("my_goals",savingsGoals),[savingsGoals]);
  useEffect(()=>save("my_savtot",savingsTotal),[savingsTotal]);
  useEffect(()=>save("my_cb",cashbacks),      [cashbacks]);

  const showToast = msg => setToast(msg);

  if(!cu) return <LoginScreen onLogin={id=>{setCu(id);setTab("income");}}/>;

  const user=USERS[cu], theme=user.theme;

  // Finance helpers (use activeMk for period-aware calculations)
  const monthIncome=(uid,key=activeMk)=>{ const m=incomes[uid]?.[key]||{}; return Object.values(m).reduce((s,v)=>s+(Number(v?.amount||v)||0),0); };
  const totalMonthIncome=(key=activeMk)=>monthIncome("slava",key)+monthIncome("anechka",key);
  const totalObl=Object.values(obligations).reduce((s,v)=>s+(Number(v)||0),0);
  const available=Math.max(totalMonthIncome()-totalObl,0);
  const catBudget=c=>Math.round(available*c.percent/100);
  const monthActual=(key=activeMk)=>actual[key]||{};
  const catActual=(ck,key=activeMk)=>Number(monthActual(key)[ck]||0);
  const totalActual=(key=activeMk)=>Object.values(monthActual(key)).reduce((s,v)=>s+(Number(v)||0),0);

  const card={background:"white",borderRadius:20,padding:18,boxShadow:"0 2px 16px rgba(0,0,0,.06)",marginBottom:12};
  const inp={width:"100%",boxSizing:"border-box",padding:"11px 13px",borderRadius:11,border:"2px solid #e2e8f0",fontSize:15,fontWeight:600,color:"#1e293b",outline:"none",fontFamily:"inherit"};
  const Btn=({ch,onClick,color,tc="#fff",dis,full,sm})=>(
    <button onClick={onClick} disabled={dis} style={{ padding:sm?"8px 14px":"12px 18px",borderRadius:12,border:"none",background:dis?"#e2e8f0":color,color:dis?"#94a3b8":tc,fontWeight:700,fontSize:sm?12:14,cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",width:full?"100%":"auto" }}>{ch}</button>
  );

  // ─── MONTH NAVIGATOR (top of each tab) ─────────────────────
  const MkNav = () => (
    <div style={{ ...card,padding:"10px 14px" }}>
      <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.6 }}>Период</p>
      <MonthPicker current={activeMk} onChange={setActiveMk}/>
    </div>
  );

  // ═══════════════════════════════════════════
  // STATS MODAL
  // ═══════════════════════════════════════════
  const StatsModal=()=>{
    const [sm,setSm]=useState(activeMk);
    const ti=totalMonthIncome(sm), ta=totalActual(sm);
    const ub=Object.values(USERS).map(u=>({
      name:u.name,emoji:u.emoji,color:u.theme.primary,light:u.theme.light,
      total:monthIncome(u.id,sm),
      cats:INCOME_TYPES.map(t=>({ label:t.label,icon:t.icon,amount:Number(incomes[u.id]?.[sm]?.[t.key]?.amount||incomes[u.id]?.[sm]?.[t.key]||0) })).filter(x=>x.amount>0)
    }));
    const chartData=historyMonths.map(key=>({ month:periodLabel(key).split(" ")[0], Доход:totalMonthIncome(key), Расходы:totalActual(key)+totalObl }));
    return (
      <Modal title="📈 Статистика" onClose={()=>setModal(null)}>
        <MonthPicker current={sm} onChange={setSm}/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,margin:"14px 0" }}>
          {[["💰 Доход",ti,theme.primary],["🏠 Обязат.",totalObl,"#EF4444"],["💸 Расходы",ta,"#F59E0B"]].map(([l,v,c],i)=>(
            <div key={i} style={{ background:"#f8fafc",borderRadius:14,padding:"12px 8px",textAlign:"center" }}>
              <p style={{ margin:0,fontSize:11,color:"#64748b" }}>{l}</p>
              <p style={{ margin:"4px 0 0",fontSize:14,fontWeight:900,color:c }}>{fmt(v)}</p>
            </div>
          ))}
        </div>
        {ub.map(u=>(
          <div key={u.name} style={{ ...card,border:`1.5px solid ${u.light}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ fontWeight:800,fontSize:14 }}>{u.emoji} {u.name}</span>
              <span style={{ fontWeight:900,color:u.color }}>{fmt(u.total)} ₽</span>
            </div>
            {u.cats.length===0?<p style={{ margin:0,fontSize:13,color:"#94a3b8" }}>Нет данных</p>:u.cats.map((c,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f8fafc" }}>
                <span style={{ fontSize:13,color:"#374151" }}>{c.icon} {c.label}</span>
                <span style={{ fontSize:13,fontWeight:700 }}>{fmt(c.amount)} ₽</span>
              </div>
            ))}
          </div>
        ))}
        {ta>0&&(
          <div style={card}>
            <p style={{ margin:"0 0 8px",fontWeight:800,fontSize:14 }}>📊 Фактические расходы</p>
            {budgetCats.map(c=>{ const a=catActual(c.key,sm); if(!a)return null;
              return <div key={c.key} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f8fafc" }}><span style={{ fontSize:13 }}>{c.icon} {c.label}</span><span style={{ fontSize:13,fontWeight:700,color:c.color }}>{fmt(a)} ₽</span></div>;
            })}
          </div>
        )}
        {chartData.length>1&&(
          <div style={card}>
            <p style={{ margin:"0 0 8px",fontWeight:800,fontSize:14 }}>📈 Динамика</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}к`}/>
                <Tooltip formatter={v=>`${fmt(v)} ₽`} contentStyle={{borderRadius:12,border:"none"}}/>
                <Bar dataKey="Доход" fill={theme.primary} radius={[6,6,0,0]}/><Bar dataKey="Расходы" fill="#F59E0B" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Modal>
    );
  };

  // ═══════════════════════════════════════════
  // OBLIGATIONS MODAL
  // ═══════════════════════════════════════════
  const ObligationsModal=()=>{
    const [local,setLocal]=useState({...obligations});
    const lt=Object.values(local).reduce((s,v)=>s+(Number(v)||0),0);
    const pd=OBLIGATION_ITEMS.filter(i=>Number(local[i.key]||0)>0).map((i,idx)=>({name:i.label,value:Number(local[i.key]),color:CAT_COLORS[idx%CAT_COLORS.length]}));
    return (
      <Modal title="🏠 Обязательства" onClose={()=>setModal(null)}>
        {lt>0&&(
          <div style={{ ...card,background:"linear-gradient(135deg,#1e293b,#374151)",color:"white",marginBottom:12 }}>
            <p style={{ margin:0,fontSize:11,opacity:.7 }}>Ежемесячные обязательства</p>
            <p style={{ margin:"3px 0 10px",fontSize:26,fontWeight:900,letterSpacing:-1 }}>{fmt(lt)} ₽</p>
            <ResponsiveContainer width="100%" height={110}>
              <PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={3}>{pd.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>`${fmt(v)} ₽`} contentStyle={{borderRadius:12,border:"none"}}/></PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
              {pd.map((e,i)=><div key={i} style={{ display:"flex",alignItems:"center",gap:3 }}><div style={{ width:7,height:7,borderRadius:"50%",background:e.color }}/><span style={{ fontSize:10,opacity:.85 }}>{e.name}: {fmt(e.value)} ₽</span></div>)}
            </div>
          </div>
        )}
        {OBLIGATION_ITEMS.map(item=>(
          <div key={item.key} style={{ marginBottom:9 }}>
            <label style={{ display:"block",fontSize:13,fontWeight:700,color:"#64748b",marginBottom:4 }}>{item.icon} {item.label}</label>
            <input type="number" placeholder="0 ₽" value={local[item.key]||""} onChange={e=>setLocal(p=>({...p,[item.key]:e.target.value}))} style={inp}/>
          </div>
        ))}
        <div style={{ background:"#fef2f2",borderRadius:12,padding:"11px 14px",margin:"10px 0" }}>
          <div style={{ display:"flex",justifyContent:"space-between" }}>
            <span style={{ fontSize:14,fontWeight:600,color:"#64748b" }}>Итого</span>
            <span style={{ fontWeight:900,fontSize:17,color:"#EF4444" }}>{fmt(lt)} ₽</span>
          </div>
        </div>
        <Btn ch="Сохранить" full color="#EF4444" onClick={()=>{setObligations(local);setModal(null);showToast("✅ Обязательства сохранены");}}/>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════
  // TAB: INCOME
  // ═══════════════════════════════════════════
  const Income=()=>{
    const [eu,setEu]=useState(cu);
    const mkIncome=()=>{ const m=incomes[eu]?.[activeMk]||{}; const r={}; INCOME_TYPES.forEach(t=>{ r[t.key]={ amount:m[t.key]?.amount||m[t.key]||"", comment:m[t.key]?.comment||"" }; }); return r; };
    const [local,setLocal]=useState(mkIncome);
    useEffect(()=>setLocal(mkIncome()),[eu,activeMk]);
    const localTotal=INCOME_TYPES.reduce((s,t)=>s+(Number(local[t.key]?.amount)||0),0);
    return (
      <div>
        <MkNav/>
        <div style={{ display:"flex",gap:8,marginBottom:12 }}>
          {Object.values(USERS).map(u=>(
            <button key={u.id} onClick={()=>setEu(u.id)} style={{ flex:1,padding:"11px 8px",borderRadius:14,border:`2.5px solid ${eu===u.id?u.theme.primary:"#e2e8f0"}`,background:eu===u.id?u.theme.light:"white",fontWeight:700,fontSize:14,color:eu===u.id?u.theme.primary:"#64748b",cursor:"pointer" }}>{u.emoji} {u.name}</button>
          ))}
        </div>
        <div style={{ ...card,background:USERS[eu].theme.light,border:`1.5px solid ${USERS[eu].theme.mid}`,padding:"12px 16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between" }}>
            <div><p style={{ margin:0,fontSize:11,color:"#64748b" }}>Период</p><p style={{ margin:"2px 0 0",fontSize:15,fontWeight:800,color:USERS[eu].theme.primary }}>{periodLabel(activeMk)}</p></div>
            <div style={{ textAlign:"right" }}><p style={{ margin:0,fontSize:11,color:"#64748b" }}>Итого</p><p style={{ margin:"2px 0 0",fontSize:17,fontWeight:900,color:USERS[eu].theme.primary }}>{fmt(localTotal)} ₽</p></div>
          </div>
        </div>
        <div style={card}>
          <h3 style={{ margin:"0 0 12px",fontSize:15,fontWeight:800,color:"#1e293b" }}>Доходы — {USERS[eu].name}</h3>
          {INCOME_TYPES.map(t=>(
            <div key={t.key} style={{ marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f8fafc" }}>
              <label style={{ display:"block",fontSize:13,fontWeight:700,color:"#64748b",marginBottom:5 }}>{t.icon} {t.label}</label>
              <input type="number" placeholder="0 ₽" value={local[t.key]?.amount||""} onChange={e=>setLocal(p=>({...p,[t.key]:{...p[t.key],amount:e.target.value}}))} style={{ ...inp,marginBottom:5 }}/>
              <input type="text" placeholder="Комментарий…" value={local[t.key]?.comment||""} onChange={e=>setLocal(p=>({...p,[t.key]:{...p[t.key],comment:e.target.value}}))} style={{ ...inp,fontSize:13,fontWeight:400,color:"#64748b",border:"1.5px solid #f1f5f9",background:"#f8fafc" }}/>
            </div>
          ))}
          <Btn ch="Сохранить доходы" full color={USERS[eu].theme.primary} onClick={()=>{ setIncomes(p=>({...p,[eu]:{...p[eu],[activeMk]:{...local}}})); showToast("✅ Доходы сохранены"); }}/>
        </div>
        <div style={{ ...card,background:`linear-gradient(135deg,${theme.primary},${theme.dark})`,color:"white" }}>
          <p style={{ margin:0,fontSize:12,opacity:.8 }}>💑 Общий доход · {periodLabel(activeMk)}</p>
          <p style={{ margin:"3px 0 8px",fontSize:28,fontWeight:900,letterSpacing:-1 }}>{fmt(totalMonthIncome())} ₽</p>
          <div style={{ display:"flex",gap:10 }}>
            {Object.values(USERS).map(u=>(
              <div key={u.id} style={{ flex:1,background:"rgba(255,255,255,.18)",borderRadius:12,padding:"8px 12px" }}>
                <p style={{ margin:0,fontSize:12,opacity:.85 }}>{u.emoji} {u.name}</p>
                <p style={{ margin:"2px 0 0",fontWeight:800,fontSize:14 }}>{fmt(monthIncome(u.id))} ₽</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // TAB: BUDGET
  // ═══════════════════════════════════════════
  const Budget=()=>{
    const [cats,setCats]=useState(budgetCats.map(c=>({...c})));
    const [showAdd,setShowAdd]=useState(false);
    const [newCat,setNewCat]=useState({label:"",icon:"📦",color:CAT_COLORS[0],percent:5});
    const totalPct=cats.reduce((s,c)=>s+c.percent,0), isValid=totalPct===100;
    const update=(key,val)=>setCats(p=>p.map(c=>c.key===key?{...c,percent:Math.max(0,Math.min(100,Number(val)||0))}:c));
    const customIcons=["📦","🎮","🐾","🏋️","📚","🍕","👗","💊","🎁","🏡","🧴","🚀"];
    return (
      <div>
        <MkNav/>
        <div style={{ ...card,background:theme.light,border:`1.5px solid ${theme.mid}`,padding:"12px 16px" }}>
          <p style={{ margin:"0 0 2px",fontSize:12,color:"#64748b",fontWeight:600 }}>После обязательств ({fmt(totalObl)} ₽) доступно:</p>
          <p style={{ margin:0,fontSize:20,fontWeight:900,color:theme.primary }}>{fmt(available)} ₽ / мес</p>
        </div>
        <div style={{ ...card,background:isValid?"#f0fdf4":"#fef2f2",border:`2px solid ${isValid?"#10B981":"#EF4444"}`,padding:"11px 16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontWeight:700,color:isValid?"#10B981":"#EF4444",fontSize:13 }}>{isValid?"✅ Сумма = 100%":`⚠️ Сумма: ${totalPct}%`}</span>
            <span style={{ fontWeight:900,fontSize:18,color:isValid?"#10B981":"#EF4444" }}>{totalPct}%</span>
          </div>
        </div>
        {available>0&&(
          <div style={card}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={cats.map(c=>({name:c.label,value:catBudget(c),color:c.color}))} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value" paddingAngle={2}>{cats.map((c,i)=><Cell key={i} fill={c.color}/>)}</Pie><Tooltip formatter={v=>`${fmt(v)} ₽`} contentStyle={{borderRadius:12,border:"none"}}/></PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {cats.map(c=>(
          <div key={c.key} style={card}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
              <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                <div style={{ width:38,height:38,borderRadius:11,background:`${c.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19 }}>{c.icon}</div>
                <div><p style={{ margin:0,fontWeight:800,color:"#1e293b",fontSize:13 }}>{c.label}</p><p style={{ margin:0,fontSize:11,color:"#64748b" }}>{available>0?fmt(catBudget(c))+" ₽":"—"}</p></div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                <button onClick={()=>update(c.key,c.percent-5)} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:16 }}>−</button>
                <span style={{ fontWeight:900,fontSize:16,color:c.color,minWidth:38,textAlign:"center" }}>{c.percent}%</span>
                <button onClick={()=>update(c.key,c.percent+5)} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:16 }}>+</button>
                {c.custom&&<button onClick={()=>setCats(p=>p.filter(x=>x.key!==c.key))} style={{ width:26,height:26,borderRadius:7,border:"none",background:"#fef2f2",color:"#EF4444",cursor:"pointer",fontSize:13 }}>×</button>}
              </div>
            </div>
            <div style={{ height:4,background:"#f1f5f9",borderRadius:99 }}><div style={{ width:`${c.percent}%`,height:"100%",background:c.color,borderRadius:99,transition:"width .3s" }}/></div>
          </div>
        ))}
        {showAdd?(
          <div style={card}>
            <h3 style={{ margin:"0 0 10px",fontSize:14,fontWeight:800 }}>Новая категория</h3>
            <div style={{ marginBottom:8 }}><label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase" }}>Иконка</label><div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{customIcons.map(ic=><button key={ic} onClick={()=>setNewCat(p=>({...p,icon:ic}))} style={{ width:34,height:34,borderRadius:8,border:`2px solid ${newCat.icon===ic?theme.primary:"#e2e8f0"}`,background:newCat.icon===ic?theme.light:"white",fontSize:17,cursor:"pointer" }}>{ic}</button>)}</div></div>
            <div style={{ marginBottom:8 }}><label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase" }}>Цвет</label><div style={{ display:"flex",gap:5 }}>{CAT_COLORS.map(cl=><button key={cl} onClick={()=>setNewCat(p=>({...p,color:cl}))} style={{ width:26,height:26,borderRadius:"50%",background:cl,border:newCat.color===cl?"3px solid #1e293b":"3px solid transparent",cursor:"pointer" }}/>)}</div></div>
            <input placeholder="Название" value={newCat.label} onChange={e=>setNewCat(p=>({...p,label:e.target.value}))} style={{ ...inp,marginBottom:7 }}/>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <span style={{ fontSize:12,fontWeight:600,color:"#64748b" }}>Процент:</span>
              <button onClick={()=>setNewCat(p=>({...p,percent:Math.max(0,p.percent-5)}))} style={{ width:26,height:26,borderRadius:7,border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:15 }}>−</button>
              <span style={{ fontWeight:800,fontSize:16,color:newCat.color,minWidth:32,textAlign:"center" }}>{newCat.percent}%</span>
              <button onClick={()=>setNewCat(p=>({...p,percent:p.percent+5}))} style={{ width:26,height:26,borderRadius:7,border:"1.5px solid #e2e8f0",background:"white",cursor:"pointer",fontSize:15 }}>+</button>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <Btn ch="Отмена" color="#f1f5f9" tc="#374151" onClick={()=>setShowAdd(false)}/>
              <Btn ch="Добавить" color={theme.primary} onClick={()=>{ if(!newCat.label)return; setCats(p=>[...p,{...newCat,key:"c_"+Date.now(),custom:true}]); setNewCat({label:"",icon:"📦",color:CAT_COLORS[0],percent:5}); setShowAdd(false); }}/>
            </div>
          </div>
        ):(
          <button onClick={()=>setShowAdd(true)} style={{ width:"100%",padding:11,borderRadius:13,border:`2px dashed ${theme.primary}`,background:theme.light,color:theme.primary,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,fontFamily:"inherit" }}>+ Добавить категорию</button>
        )}
        <Btn ch="Сохранить распределение" full color={isValid?theme.primary:"#e2e8f0"} tc={isValid?"white":"#94a3b8"} dis={!isValid} onClick={()=>{setBudgetCats(cats);showToast("✅ Бюджет сохранён");}}/>
        <div style={{ height:8 }}/>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // TAB: SAVINGS
  // ═══════════════════════════════════════════
  const Savings=()=>{
    const [goals,setGoals]=useState(savingsGoals.map(g=>({...g})));
    const [showForm,setShowForm]=useState(false);
    const [form,setForm]=useState({title:"",target:"",saved:"",icon:"🎯",color:"#10B981"});
    const [addAmt,setAddAmt]=useState({});
    const icons=["🎯","✈️","🏠","🚘","💻","🌍","💍","🎓","🏖️","🎸","📱","🐱"];
    const colors=["#10B981","#3B82F6","#F59E0B","#8B5CF6","#EF4444","#EC4899","#06B6D4"];
    const sync=g=>{setGoals(g);setSavingsGoals(g);};
    const addFunds=id=>{ const amt=Number(addAmt[id]||0); if(!amt)return; sync(goals.map(g=>g.id===id?{...g,saved:Math.min(g.saved+amt,g.target)}:g)); setSavingsTotal(p=>p+amt); setAddAmt(p=>({...p,[id]:""})); showToast("🐷 Пополнено!"); };
    const savCat=budgetCats.find(c=>c.key==="savings");
    return (
      <div>
        <div style={{ background:"linear-gradient(135deg,#10B981,#059669)",borderRadius:22,padding:18,marginBottom:12,color:"white" }}>
          <p style={{ margin:0,fontSize:12,opacity:.85 }}>🐷 Всего в копилке</p>
          <p style={{ margin:"3px 0 3px",fontSize:30,fontWeight:900,letterSpacing:-1.5 }}>{fmt(savingsTotal)} ₽</p>
          <p style={{ margin:0,opacity:.75,fontSize:12 }}>По целям: {fmt(goals.reduce((s,g)=>s+g.saved,0))} ₽ · Бюджет: {fmt(savCat?catBudget(savCat):0)} ₽/мес</p>
        </div>
        {goals.map(g=>{ const pct=Math.min((g.saved/g.target)*100,100),done=pct>=100; return (
          <div key={g.id} style={card}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7 }}>
              <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`${g.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21 }}>{g.icon}</div>
                <div><p style={{ margin:0,fontWeight:800,color:"#1e293b",fontSize:14 }}>{g.title}</p><p style={{ margin:0,fontSize:11,color:"#64748b" }}>{done?"🎉 Достигнута!":`Осталось ${fmt(g.target-g.saved)} ₽`}</p></div>
              </div>
              <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                <span style={{ background:`${g.color}18`,color:g.color,fontWeight:800,fontSize:11,padding:"3px 8px",borderRadius:99 }}>{pct.toFixed(0)}%</span>
                <button onClick={()=>sync(goals.filter(x=>x.id!==g.id))} style={{ background:"#fef2f2",border:"none",borderRadius:8,width:24,height:24,cursor:"pointer",color:"#EF4444",fontSize:13 }}>×</button>
              </div>
            </div>
            <div style={{ height:7,background:"#f1f5f9",borderRadius:99,overflow:"hidden",marginBottom:4 }}><div style={{ width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${g.color},${g.color}99)`,borderRadius:99,transition:"width .5s" }}/></div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:9 }}><span style={{ fontSize:11,color:"#94a3b8" }}>{fmt(g.saved)} ₽</span><span style={{ fontSize:11,color:"#94a3b8" }}>из {fmt(g.target)} ₽</span></div>
            {!done&&(<div style={{ display:"flex",gap:7 }}><input type="number" placeholder="Сумма ₽" value={addAmt[g.id]||""} onChange={e=>setAddAmt(p=>({...p,[g.id]:e.target.value}))} style={{ ...inp,flex:1,padding:"8px 11px",fontSize:13 }}/><Btn ch="Внести" color={g.color} sm onClick={()=>addFunds(g.id)}/></div>)}
          </div>
        );})}
        {showForm?(
          <div style={card}>
            <h3 style={{ margin:"0 0 10px",fontSize:14,fontWeight:800 }}>Новая цель</h3>
            <div style={{ marginBottom:8 }}><label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase" }}>Иконка</label><div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>{icons.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ width:34,height:34,borderRadius:8,border:`2px solid ${form.icon===ic?theme.primary:"#e2e8f0"}`,background:form.icon===ic?theme.light:"white",fontSize:18,cursor:"pointer" }}>{ic}</button>)}</div></div>
            <div style={{ marginBottom:8 }}><label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase" }}>Цвет</label><div style={{ display:"flex",gap:5 }}>{colors.map(cl=><button key={cl} onClick={()=>setForm(p=>({...p,color:cl}))} style={{ width:26,height:26,borderRadius:"50%",background:cl,border:form.color===cl?"3px solid #1e293b":"3px solid transparent",cursor:"pointer" }}/>)}</div></div>
            <input placeholder="Название" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{ ...inp,marginBottom:7 }}/>
            <input type="number" placeholder="Целевая сумма ₽" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} style={{ ...inp,marginBottom:7 }}/>
            <input type="number" placeholder="Уже накоплено ₽" value={form.saved} onChange={e=>setForm(p=>({...p,saved:e.target.value}))} style={{ ...inp,marginBottom:11 }}/>
            <div style={{ display:"flex",gap:7 }}><Btn ch="Отмена" color="#f1f5f9" tc="#374151" onClick={()=>setShowForm(false)}/><Btn ch="Добавить цель" color="#10B981" onClick={()=>{ if(!form.title||!form.target)return; sync([...goals,{id:Date.now(),title:form.title,target:Number(form.target),saved:Number(form.saved)||0,icon:form.icon,color:form.color}]); setForm({title:"",target:"",saved:"",icon:"🎯",color:"#10B981"}); setShowForm(false); showToast("🎯 Цель добавлена"); }}/></div>
          </div>
        ):(
          <button onClick={()=>setShowForm(true)} style={{ width:"100%",padding:11,borderRadius:13,border:"2px dashed #10B981",background:"#f0fdf4",color:"#10B981",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,fontFamily:"inherit" }}>+ Новая цель</button>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // TAB: EXPENSES with CALCULATOR
  // ═══════════════════════════════════════════
  const Expenses=()=>{
    const [localAct,setLocalAct]=useState({...monthActual()});
    const [calcFor,setCalcFor]=useState(null); // catKey | null
    useEffect(()=>setLocalAct({...monthActual()}),[activeMk]);
    const totalSpent=Object.values(localAct).reduce((s,v)=>s+(Number(v)||0),0);
    const surplus=Math.max(available-totalSpent,0), deficit=Math.max(totalSpent-available,0);
    const handleSave=()=>{
      setActual(p=>({...p,[activeMk]:{...localAct}}));
      let totalSurplus=0;
      budgetCats.forEach(c=>{ const s=catBudget(c)-Number(localAct[c.key]||0); if(s>0)totalSurplus+=s; });
      if(totalSurplus>0){
        setSavingsTotal(p=>p+totalSurplus);
        setSavingsGoals(prev=>prev.length>0?prev.map((g,i)=>i===0?{...g,saved:Math.min(g.saved+totalSurplus,g.target)}:g):prev);
        showToast(`✅ Сохранено · ${fmt(totalSurplus)} ₽ → Копилка`);
      } else showToast("✅ Расходы сохранены");
    };
    return (
      <div>
        <MkNav/>
        {/* Summary */}
        <div style={{ ...card,background:`linear-gradient(135deg,${theme.primary},${theme.dark})`,color:"white" }}>
          <p style={{ margin:0,fontSize:12,opacity:.8 }}>Расходы · {periodLabel(activeMk)}</p>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:3 }}>
            <div><p style={{ margin:0,fontSize:26,fontWeight:900,letterSpacing:-1 }}>{fmt(totalSpent)} ₽</p><p style={{ margin:"1px 0 0",opacity:.75,fontSize:11 }}>из {fmt(available)} ₽</p></div>
            <div style={{ textAlign:"right" }}>
              {surplus>0&&<div><p style={{ margin:0,fontSize:10,opacity:.8 }}>→ Копилка</p><p style={{ margin:"1px 0 0",fontSize:18,fontWeight:900 }}>+{fmt(surplus)} ₽</p></div>}
              {deficit>0&&<div><p style={{ margin:0,fontSize:10,opacity:.8 }}>Перерасход</p><p style={{ margin:"1px 0 0",fontSize:18,fontWeight:900,color:"#fca5a5" }}>−{fmt(deficit)} ₽</p></div>}
            </div>
          </div>
          <div style={{ marginTop:10,height:5,background:"rgba(255,255,255,.3)",borderRadius:99,overflow:"hidden" }}>
            <div style={{ width:`${Math.min(available>0?totalSpent/available*100:0,100)}%`,height:"100%",background:"white",borderRadius:99,transition:"width .4s" }}/>
          </div>
        </div>

        {/* Categories */}
        {budgetCats.map(c=>{
          const budget=catBudget(c), spent=Number(localAct[c.key]||0), over=spent>budget;
          const pct=budget>0?Math.min(spent/budget*100,100):0;
          const catSurplus=budget-spent;
          const isCalcOpen=calcFor===c.key;
          return (
            <div key={c.key} style={card}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:34,height:34,borderRadius:10,background:`${c.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17 }}>{c.icon}</div>
                  <div>
                    <p style={{ margin:0,fontWeight:800,color:"#1e293b",fontSize:13 }}>{c.label}</p>
                    <p style={{ margin:0,fontSize:10,color:over?"#EF4444":"#64748b" }}>{over?`⚠️ перебор ${fmt(spent-budget)} ₽`:`бюджет ${fmt(budget)} ₽`}</p>
                  </div>
                </div>
                <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                  {catSurplus>0&&spent>0&&<span style={{ fontSize:10,color:"#10B981",fontWeight:700,background:"#f0fdf4",padding:"2px 7px",borderRadius:99 }}>+{fmt(catSurplus)}→🐷</span>}
                  {/* Calculator toggle */}
                  <button onClick={()=>setCalcFor(isCalcOpen?null:c.key)} style={{ width:28,height:28,borderRadius:8,border:`1.5px solid ${isCalcOpen?c.color:"#e2e8f0"}`,background:isCalcOpen?`${c.color}15`:"white",cursor:"pointer",fontSize:14 }}>🧮</button>
                </div>
              </div>
              <input type="number" placeholder={`0 ₽  (план ${fmt(budget)} ₽)`}
                value={localAct[c.key]||""}
                onChange={e=>setLocalAct(p=>({...p,[c.key]:e.target.value}))}
                style={{ ...inp,borderColor:over?"#fca5a5":"#e2e8f0",background:over?"#fff5f5":"white",marginBottom:5 }}/>
              <div style={{ height:4,background:"#f1f5f9",borderRadius:99,overflow:"hidden" }}>
                <div style={{ width:`${pct}%`,height:"100%",background:over?"#EF4444":c.color,borderRadius:99,transition:"width .3s" }}/>
              </div>
              {/* Inline Calculator */}
              {isCalcOpen&&(
                <div style={{ marginTop:10 }}>
                  <Calculator
                    initial={localAct[c.key]||""}
                    onResult={r=>setLocalAct(p=>({...p,[c.key]:r}))}
                    onClose={()=>setCalcFor(null)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {surplus>0&&(
          <div style={{ ...card,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"1.5px solid #86efac" }}>
            <p style={{ margin:"0 0 3px",fontSize:14,fontWeight:800,color:"#15803d" }}>🐷 Остаток → Копилка</p>
            <p style={{ margin:0,fontSize:22,fontWeight:900,color:"#16a34a" }}>{fmt(surplus)} ₽</p>
            <p style={{ margin:"3px 0 0",fontSize:11,color:"#64748b" }}>Не потрачено за {periodLabel(activeMk)}</p>
          </div>
        )}
        <Btn ch={surplus>0?`Сохранить · ${fmt(surplus)} ₽ → Копилка`:"Сохранить расходы"} full color={theme.primary} onClick={handleSave}/>
        <div style={{ height:8 }}/>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // TAB: CASHBACK
  // ═══════════════════════════════════════════
  const Cashback=()=>{
    const [items,setItems]=useState(cashbacks.map(c=>({...c})));
    const [showForm,setShowForm]=useState(false);
    const [form,setForm]=useState({category:"",card:"sber",owner:"slava",percent:"",note:""});
    const sync=it=>{setItems(it);setCashbacks(it);};
    const addItem=()=>{
      if(!form.category||!form.card)return;
      sync([...items,{id:Date.now(),...form}]);
      setForm({category:"",card:"sber",owner:"slava",percent:"",note:""});
      setShowForm(false); showToast("✅ Кэшбэк добавлен");
    };
    const totalCb=items.reduce((s,i)=>s+(Number(i.percent)||0),0);
    return (
      <div>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#F59E0B,#D97706)",borderRadius:22,padding:18,marginBottom:12,color:"white" }}>
          <p style={{ margin:0,fontSize:12,opacity:.85 }}>💳 Кэшбэк</p>
          <p style={{ margin:"3px 0 2px",fontSize:28,fontWeight:900 }}>{items.length} {items.length===1?"категория":"категорий"}</p>
          <p style={{ margin:0,opacity:.75,fontSize:12 }}>Суммарный % кэшбэка: {totalCb}%</p>
        </div>

        {/* Cards legend */}
        <div style={{ ...card,padding:"12px 14px" }}>
          <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:.5 }}>Карты</p>
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {BANK_CARDS.map(bc=>(
              <div key={bc.key} style={{ display:"flex",alignItems:"center",gap:5,background:bc.bg,borderRadius:10,padding:"5px 10px",border:`1.5px solid ${bc.color}30` }}>
                <div style={{ width:10,height:10,borderRadius:3,background:bc.color }}/>
                <span style={{ fontSize:12,fontWeight:700,color:bc.textColor||bc.color }}>{bc.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashback items */}
        {items.map(item=>{
          const bc=BANK_CARDS.find(b=>b.key===item.card)||BANK_CARDS[0];
          const ow=USERS[item.owner]||USERS.slava;
          return (
            <div key={item.id} style={card}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:7,flexWrap:"wrap" }}>
                    <span style={{ fontWeight:800,color:"#1e293b",fontSize:14 }}>{item.category}</span>
                    {/* Owner badge */}
                    <span style={{ background:ow.theme.light,color:ow.theme.primary,fontWeight:700,fontSize:11,padding:"2px 9px",borderRadius:99,border:`1px solid ${ow.theme.mid}` }}>{ow.emoji} {ow.name}</span>
                    {/* Card badge */}
                    <span style={{ background:bc.bg,color:bc.textColor||bc.color,fontWeight:700,fontSize:11,padding:"2px 9px",borderRadius:99,border:`1.5px solid ${bc.color}` }}>{bc.label}</span>
                  </div>
                  {item.note&&<p style={{ margin:0,fontSize:12,color:"#94a3b8" }}>{item.note}</p>}
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:7,flexShrink:0 }}>
                  {item.percent&&<span style={{ background:"#FFF7ED",color:"#F59E0B",fontWeight:900,fontSize:14,padding:"3px 10px",borderRadius:99 }}>{item.percent}%</span>}
                  <button onClick={()=>sync(items.filter(x=>x.id!==item.id))} style={{ background:"#fef2f2",border:"none",borderRadius:8,width:26,height:26,cursor:"pointer",color:"#EF4444",fontSize:13 }}>×</button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add form */}
        {showForm?(
          <div style={card}>
            <h3 style={{ margin:"0 0 12px",fontSize:14,fontWeight:800 }}>Новый кэшбэк</h3>
            {/* Category name */}
            <div style={{ marginBottom:9 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:4 }}>📌 Категория кэшбэка</label>
              <input placeholder="Такси, Продукты, АЗС…" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inp}/>
            </div>
            {/* Card selector */}
            <div style={{ marginBottom:9 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:6 }}>💳 Карта</label>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
                {BANK_CARDS.map(bc=>(
                  <button key={bc.key} onClick={()=>setForm(p=>({...p,card:bc.key}))} style={{
                    padding:"8px 4px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:12,
                    border:`2px solid ${form.card===bc.key?bc.color:"#e2e8f0"}`,
                    background:form.card===bc.key?bc.bg:"white",
                    color:bc.textColor||bc.color
                  }}>{bc.label}</button>
                ))}
              </div>
            </div>
            {/* Owner */}
            <div style={{ marginBottom:9 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:6 }}>👤 Кто получает</label>
              <div style={{ display:"flex",gap:8 }}>
                {Object.values(USERS).map(u=>(
                  <button key={u.id} onClick={()=>setForm(p=>({...p,owner:u.id}))} style={{ flex:1,padding:"9px",borderRadius:12,border:`2px solid ${form.owner===u.id?u.theme.primary:"#e2e8f0"}`,background:form.owner===u.id?u.theme.light:"white",fontWeight:700,fontSize:13,color:form.owner===u.id?u.theme.primary:"#64748b",cursor:"pointer" }}>{u.emoji} {u.name}</button>
                ))}
              </div>
            </div>
            {/* Percent */}
            <div style={{ marginBottom:9 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:4 }}>% кэшбэка</label>
              <input type="number" placeholder="1, 3, 5…" value={form.percent} onChange={e=>setForm(p=>({...p,percent:e.target.value}))} style={inp}/>
            </div>
            {/* Note */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:4 }}>💬 Комментарий</label>
              <input placeholder="Через приложение, при оплате онлайн…" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{ ...inp,fontSize:13,fontWeight:400 }}/>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <Btn ch="Отмена" color="#f1f5f9" tc="#374151" onClick={()=>setShowForm(false)}/>
              <Btn ch="Добавить" color="#F59E0B" onClick={addItem}/>
            </div>
          </div>
        ):(
          <button onClick={()=>setShowForm(true)} style={{ width:"100%",padding:11,borderRadius:13,border:"2px dashed #F59E0B",background:"#FFFBEB",color:"#D97706",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:10,fontFamily:"inherit" }}>+ Добавить кэшбэк</button>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // SHELL
  // ═══════════════════════════════════════════
  const navItems=[
    {key:"income",   icon:"💸", label:"Доходы"},
    {key:"budget",   icon:"📊", label:"Бюджет"},
    {key:"savings",  icon:"🐷", label:"Копилка"},
    {key:"expenses", icon:"💳", label:"Расходы"},
    {key:"cashback", icon:"🎯", label:"Кэшбэк"},
  ];
  const views={income:<Income/>,budget:<Budget/>,savings:<Savings/>,expenses:<Expenses/>,cashback:<Cashback/>};

  return (
    <div style={{ maxWidth:430,margin:"0 auto",minHeight:"100vh",background:theme.bg,fontFamily:"'Nunito',sans-serif",paddingBottom:84 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');*{-webkit-tap-highlight-color:transparent}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>

      {/* TOP BAR */}
      <div style={{ background:"white",padding:"11px 14px",boxShadow:`0 1px 0 ${theme.mid}`,position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <span style={{ fontSize:24 }}>💑</span>
          <div>
            <h2 style={{ margin:0,fontSize:19,fontWeight:900,color:"#1e293b",letterSpacing:-0.5 }}>Мы</h2>
            <p style={{ margin:0,fontSize:10,color:"#94a3b8" }}>{periodLabel(activeMk)}</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:7 }}>
          <button onClick={()=>setModal("stats")} style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"5px 9px",borderRadius:11,border:`1.5px solid ${theme.mid}`,background:theme.light,cursor:"pointer",gap:1 }}>
            <span style={{ fontSize:15 }}>📈</span><span style={{ fontSize:8,fontWeight:700,color:theme.primary }}>Стат.</span>
          </button>
          <button onClick={()=>setModal("obligations")} style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"5px 9px",borderRadius:11,border:"1.5px solid #fecaca",background:"#fff5f5",cursor:"pointer",gap:1 }}>
            <span style={{ fontSize:15 }}>🏠</span><span style={{ fontSize:8,fontWeight:700,color:"#EF4444" }}>Обязат.</span>
          </button>
          <button onClick={()=>setCu(null)} style={{ display:"flex",alignItems:"center",padding:"5px 9px",borderRadius:11,border:`1.5px solid ${theme.mid}`,background:theme.light,cursor:"pointer",color:theme.primary,fontWeight:700,fontSize:16 }}>{user.emoji}</button>
        </div>
      </div>

      <div style={{ padding:"12px 12px 0" }}>{views[tab]}</div>

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"white",borderTop:`2px solid ${theme.mid}`,display:"flex",boxShadow:"0 -4px 20px rgba(0,0,0,.08)",paddingBottom:"env(safe-area-inset-bottom)" }}>
        {navItems.map(n=>(
          <button key={n.key} onClick={()=>setTab(n.key)} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"9px 2px 6px",border:"none",background:"transparent",cursor:"pointer",borderTop:`3px solid ${tab===n.key?theme.primary:"transparent"}`,transition:"all .15s" }}>
            <span style={{ fontSize:17,marginBottom:1 }}>{n.icon}</span>
            <span style={{ fontSize:9,fontWeight:tab===n.key?800:500,color:tab===n.key?theme.primary:"#94a3b8" }}>{n.label}</span>
          </button>
        ))}
      </div>

      {modal==="stats"&&<StatsModal/>}
      {modal==="obligations"&&<ObligationsModal/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
