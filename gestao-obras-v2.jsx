import { useState, useEffect, useRef } from "react";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FONT_URL = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", surface: "#141414", surface2: "#1c1c1c", border: "#252525",
  borderLight: "#1e1e1e", orange: "#f97316", orangeHov: "#ea6c0a",
  orangeDim: "rgba(249,115,22,0.10)", orangeGlow: "rgba(249,115,22,0.22)",
  text: "#f0f0f0", muted: "#7a7a7a", dim: "#444",
  green: "#22c55e", red: "#ef4444", blue: "#60a5fa", yellow: "#fbbf24",
};
const F = { fontFamily:"'Sora',system-ui,sans-serif" };

// ─── ICONS (SVG stroke-only) ──────────────────────────────────────────────────
const Icon = ({ n, size=16, color="currentColor", sw=1.6 }) => {
  const s = { width:size, height:size, display:"inline-flex", flexShrink:0, verticalAlign:"middle" };
  const p = { fill:"none", stroke:color, strokeWidth:sw, strokeLinecap:"round", strokeLinejoin:"round" };
  const map = {
    dashboard:<svg style={s} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" {...p}/><rect x="14" y="3" width="7" height="7" rx="1.5" {...p}/><rect x="3" y="14" width="7" height="7" rx="1.5" {...p}/><rect x="14" y="14" width="7" height="7" rx="1.5" {...p}/></svg>,
    building:<svg style={s} viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" {...p}/></svg>,
    checklist:<svg style={s} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...p}/></svg>,
    excavator:<svg style={s} viewBox="0 0 24 24"><path d="M2 17l4-9 4 6 3-4 5 7H2z" {...p}/><circle cx="18" cy="9" r="3" {...p}/></svg>,
    people:<svg style={s} viewBox="0 0 24 24"><circle cx="9" cy="7" r="4" {...p}/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" {...p}/></svg>,
    cube:<svg style={s} viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" {...p}/></svg>,
    warehouse:<svg style={s} viewBox="0 0 24 24"><path d="M22 19V9L12 3 2 9v10h20zM12 15v7M9 14h6" {...p}/></svg>,
    link:<svg style={s} viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" {...p}/></svg>,
    barchart:<svg style={s} viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" {...p}/></svg>,
    key:<svg style={s} viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5" {...p}/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3" {...p}/></svg>,
    logout:<svg style={s} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" {...p}/></svg>,
    plus:<svg style={s} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" {...p}/></svg>,
    edit:<svg style={s} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...p}/></svg>,
    trash:<svg style={s} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" {...p}/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" {...p}/></svg>,
    x:<svg style={s} viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" {...p}/></svg>,
    alert:<svg style={s} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" {...p}/></svg>,
    pin:<svg style={s} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" {...p}/><circle cx="12" cy="10" r="3" {...p}/></svg>,
    cal:<svg style={s} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" {...p}/><path d="M16 2v4M8 2v4M3 10h18" {...p}/></svg>,
    money:<svg style={s} viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" {...p}/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" {...p}/></svg>,
    user:<svg style={s} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" {...p}/><circle cx="12" cy="7" r="4" {...p}/></svg>,
    upload:<svg style={s} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" {...p}/></svg>,
    check:<svg style={s} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" {...p}/></svg>,
    eye:<svg style={s} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...p}/><circle cx="12" cy="12" r="3" {...p}/></svg>,
    eyeoff:<svg style={s} viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" {...p}/></svg>,
    clock:<svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" {...p}/><polyline points="12 6 12 12 16 14" {...p}/></svg>,
    file:<svg style={s} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...p}/><polyline points="14 2 14 8 20 8" {...p}/></svg>,
    shield:<svg style={s} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p}/></svg>,
    arrow:<svg style={s} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" {...p}/></svg>,
  };
  return map[n] || <svg style={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" {...p}/></svg>;
};

// ─── TIPOS DE ETAPA ───────────────────────────────────────────────────────────
const TIPOS_ETAPA = [
  {id:1,nome:"Terraplanagem",icon:"excavator"},{id:2,nome:"Fundação",icon:"building"},
  {id:3,nome:"Estrutura de Concreto",icon:"building"},{id:4,nome:"Estrutura Metálica",icon:"excavator"},
  {id:5,nome:"Alvenaria",icon:"warehouse"},{id:6,nome:"Cobertura",icon:"building"},
  {id:7,nome:"Instalações Hidráulicas",icon:"cube"},{id:8,nome:"Instalações Elétricas",icon:"link"},
  {id:9,nome:"Instalações de HVAC",icon:"cube"},{id:10,nome:"Revestimento Interno",icon:"checklist"},
  {id:11,nome:"Revestimento Externo",icon:"building"},{id:12,nome:"Esquadrias",icon:"checklist"},
  {id:13,nome:"Pintura",icon:"checklist"},{id:14,nome:"Pavimentação",icon:"excavator"},
  {id:15,nome:"Paisagismo",icon:"pin"},{id:16,nome:"Acabamento Final",icon:"check"},
  {id:17,nome:"Comissionamento",icon:"file"},{id:18,nome:"Entrega",icon:"key"},
];

// ─── PLANOS ──────────────────────────────────────────────────────────────────
const PLANOS = [
  {
    id:"starter", nome:"Starter", cor:C.blue, corGlow:"rgba(96,165,250,0.18)",
    preco:{mensal:149, anual:119},
    usuarios:2, obras:5,
    desc:"Ideal para pequenas construtoras",
    features:["Até 2 usuários","Até 5 obras simultâneas","Dashboard e relatórios","Controle de estoque","Suporte por e-mail"],
    suporte:["email"],
  },
  {
    id:"business", nome:"Business", cor:C.orange, corGlow:"rgba(249,115,22,0.22)",
    preco:{mensal:349, anual:279},
    usuarios:5, obras:15,
    popular:true,
    desc:"Para empresas em crescimento",
    features:["Até 5 usuários","Até 15 obras simultâneas","Todas as funcionalidades","Controle de estoque avançado","Alocação de máquinas e insumos","Suporte por e-mail e WhatsApp"],
    suporte:["email","whatsapp"],
  },
  {
    id:"professional", nome:"Professional", cor:"#a78bfa", corGlow:"rgba(167,139,250,0.18)",
    preco:{mensal:749, anual:599},
    usuarios:999, obras:999,
    desc:"Sem limites, suporte dedicado",
    features:["Usuários ilimitados","Obras ilimitadas","Todas as funcionalidades","Importação de NF-e / XML","Relatórios avançados","Suporte prioritário por e-mail e WhatsApp"],
    suporte:["email","whatsapp"],
  },
];

// ─── INITIAL DATA (multi-tenant) ─────────────────────────────────────────────
// Estrutura: cada tenant é uma empresa contratante isolada.
// tenantId isola todos os dados — users, obras, máquinas etc.
// role: "tenant_admin" = dono/admin da empresa | "user" = usuário comum
// O array global de tenants simula o que seria um banco de dados compartilhado.

const INIT_TENANTS = [
  {
    id:"t1",
    razaoSocial:"Construtora Aurora Ltda",
    cnpj:"12.345.678/0001-90",
    email:"contato@aurora.com.br",
    plano:"professional",
    ativo:true,
    criadoEm:"2024-01-10",
    // Dados isolados da empresa:
    users:[
      {id:1,tenantId:"t1",nome:"João Silva",email:"admin@aurora.com",senha:"admin123",role:"tenant_admin",ativo:true,permissoes:[],obrasAcesso:[]},
      {id:2,tenantId:"t1",nome:"Maria Santos",email:"maria@aurora.com",senha:"1234",role:"user",ativo:true,permissoes:["obras","estoque","relatorios"],obrasAcesso:[1]},
      {id:3,tenantId:"t1",nome:"Carlos Lima",email:"carlos@aurora.com",senha:"1234",role:"user",ativo:true,permissoes:["obras","maquinas","alocacao"],obrasAcesso:[]},
    ],
    obras:[
      {id:1,nome:"Edifício Aurora",local:"Av. Paulista, 1500 — SP",inicio:"2024-01-15",previsaoFim:"2025-06-30",orcamento:2500000,status:"Em andamento",responsavel:"João Silva",descricao:"Edifício residencial 12 andares."},
      {id:2,nome:"Ponte Rio Verde",local:"Rodovia SP-330, km 45",inicio:"2024-03-01",previsaoFim:"2025-03-01",orcamento:800000,status:"Em andamento",responsavel:"Maria Santos",descricao:"Ponte de concreto armado 80m."},
      {id:3,nome:"Galpão Industrial Norte",local:"Distrito Industrial, Lote 22",inicio:"2023-08-10",previsaoFim:"2024-08-10",orcamento:450000,status:"Concluída",responsavel:"Carlos Lima",descricao:"Galpão 2000m²."},
    ],
    etapasObra:[
      {id:1,obraId:1,tipoEtapaId:2,dataInicioP:"2024-01-15",dataFimP:"2024-03-30",dataInicioR:"2024-01-18",dataFimR:null,progresso:100,status:"Concluída"},
      {id:2,obraId:1,tipoEtapaId:3,dataInicioP:"2024-04-01",dataFimP:"2024-09-30",dataInicioR:"2024-04-05",dataFimR:null,progresso:75,status:"Em andamento"},
      {id:3,obraId:1,tipoEtapaId:5,dataInicioP:"2024-07-01",dataFimP:"2025-01-30",dataInicioR:"2024-07-10",dataFimR:null,progresso:40,status:"Em andamento"},
      {id:4,obraId:1,tipoEtapaId:7,dataInicioP:"2024-09-01",dataFimP:"2025-03-30",dataInicioR:null,dataFimR:null,progresso:10,status:"Atrasada"},
      {id:5,obraId:1,tipoEtapaId:16,dataInicioP:"2025-02-01",dataFimP:"2025-06-30",dataInicioR:null,dataFimR:null,progresso:0,status:"Pendente"},
      {id:6,obraId:2,tipoEtapaId:1,dataInicioP:"2024-03-01",dataFimP:"2024-04-30",dataInicioR:"2024-03-05",dataFimR:"2024-05-15",progresso:100,status:"Concluída"},
      {id:7,obraId:2,tipoEtapaId:3,dataInicioP:"2024-05-01",dataFimP:"2024-12-30",dataInicioR:"2024-05-20",dataFimR:null,progresso:65,status:"Em andamento"},
      {id:8,obraId:2,tipoEtapaId:14,dataInicioP:"2024-10-01",dataFimP:"2025-03-01",dataInicioR:null,dataFimR:null,progresso:20,status:"Atrasada"},
      {id:9,obraId:3,tipoEtapaId:2,dataInicioP:"2023-08-10",dataFimP:"2023-10-30",dataInicioR:"2023-08-12",dataFimR:"2023-10-28",progresso:100,status:"Concluída"},
      {id:10,obraId:3,tipoEtapaId:4,dataInicioP:"2023-11-01",dataFimP:"2024-03-30",dataInicioR:"2023-11-05",dataFimR:"2024-03-25",progresso:100,status:"Concluída"},
      {id:11,obraId:3,tipoEtapaId:6,dataInicioP:"2024-04-01",dataFimP:"2024-08-10",dataInicioR:"2024-04-03",dataFimR:"2024-08-08",progresso:100,status:"Concluída"},
    ],
    maquinas:[
      {id:1,nome:"Escavadeira CAT 320",tipo:"Escavadeira",placa:"ABC-1234",custoHora:350},
      {id:2,nome:"Betoneira 400L",tipo:"Betoneira",placa:"N/A",custoHora:85},
      {id:3,nome:"Guindaste Liebherr LTM",tipo:"Guindaste",placa:"DEF-5678",custoHora:650},
    ],
    funcionarios:[
      {id:1,nome:"José Ferreira",tipo:"Funcionário",cargo:"Pedreiro",cpf:"123.456.789-00",salarioDia:180,ativo:true},
      {id:2,nome:"Ana Oliveira",tipo:"Funcionário",cargo:"Engenheira Civil",cpf:"987.654.321-00",salarioDia:450,ativo:true},
      {id:3,nome:"TechBuild Ltda",tipo:"Prestador",cargo:"Instalações Elétricas",cpf:"12.345.678/0001-90",salarioDia:1200,ativo:true},
    ],
    insumos:[
      {id:1,nome:"Cimento CP-II",unidade:"saco 50kg",custoUnit:38,categoria:"Material",fornecedor:"CimentosBR"},
      {id:2,nome:"Areia Média",unidade:"m³",custoUnit:95,categoria:"Material",fornecedor:"Pedreira Norte"},
      {id:3,nome:"Vergalhão CA-50 10mm",unidade:"barra 12m",custoUnit:42,categoria:"Material",fornecedor:"AçosBR"},
      {id:4,nome:"Concreto Usinado FCK 25",unidade:"m³",custoUnit:320,categoria:"Material",fornecedor:"ConcreMix"},
    ],
    estoques:[
      {id:1,obraId:1,insumoId:1,quantEntrada:500,quantUtilizado:320,dataMov:"2024-02-01",origem:"Manual"},
      {id:2,obraId:1,insumoId:2,quantEntrada:80,quantUtilizado:55,dataMov:"2024-02-01",origem:"Manual"},
      {id:3,obraId:1,insumoId:3,quantEntrada:200,quantUtilizado:140,dataMov:"2024-03-15",origem:"Manual"},
      {id:4,obraId:2,insumoId:1,quantEntrada:150,quantUtilizado:90,dataMov:"2024-04-01",origem:"Manual"},
    ],
    alocacoes:[
      {id:1,obraId:1,tipo:"maquina",referenciaId:1,quantidade:80,data:"2024-02-10",obs:"Escavação fundação"},
      {id:2,obraId:1,tipo:"maquina",referenciaId:2,quantidade:200,data:"2024-04-01",obs:"Concretagem"},
      {id:3,obraId:2,tipo:"maquina",referenciaId:1,quantidade:120,data:"2024-03-15",obs:"Escavação pilares"},
    ],
    funcionarioObra:[
      {id:1,obraId:1,funcionarioId:1,dias:90},{id:2,obraId:1,funcionarioId:2,dias:120},
      {id:3,obraId:2,funcionarioId:2,dias:60},{id:4,obraId:2,funcionarioId:3,dias:15},
    ],
  },
];
// Simula estado global persistente de tenants (seria um BD real em produção)
let _globalTenants = JSON.parse(JSON.stringify(INIT_TENANTS));

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n||0);
const nextId = arr => arr.length ? Math.max(...arr.map(i=>i.id))+1 : 1;
const today = () => new Date().toISOString().split("T")[0];
const isAtrasada = e => { const n=today(); if(e.status==="Concluída") return false; if(e.progresso<100&&e.dataFimP<n) return true; if(e.dataInicioP<n&&!e.dataInicioR&&e.progresso===0) return true; return false; };
const calcProg = (id,et) => { const a=et.filter(e=>e.obraId===id); return a.length?Math.round(a.reduce((s,e)=>s+e.progresso,0)/a.length):0; };
const calcIns = (id,es,in_) => es.filter(e=>e.obraId===id).reduce((s,e)=>{const i=in_.find(x=>x.id===e.insumoId);return s+(i?i.custoUnit*e.quantUtilizado:0);},0);
const calcMaq = (id,al,ma) => al.filter(a=>a.obraId===id&&a.tipo==="maquina").reduce((s,a)=>{const m=ma.find(x=>x.id===a.referenciaId);return s+(m?m.custoHora*a.quantidade:0);},0);
const calcMO = (id,fo,fn) => fo.filter(f=>f.obraId===id).reduce((s,f)=>{const x=fn.find(y=>y.id===f.funcionarioId);return s+(x?x.salarioDia*f.dias:0);},0);

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
const INP_BASE = {background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",fontSize:13,color:C.text,outline:"none",width:"100%",boxSizing:"border-box",...F,transition:"border-color .15s"};

function Badge({children,v="default",dot=false}){
  const vs={default:{bg:"rgba(255,255,255,0.05)",c:C.muted,b:C.border},
    orange:{bg:C.orangeDim,c:C.orange,b:"rgba(249,115,22,.3)"},
    green:{bg:"rgba(34,197,94,.08)",c:C.green,b:"rgba(34,197,94,.25)"},
    red:{bg:"rgba(239,68,68,.08)",c:C.red,b:"rgba(239,68,68,.25)"},
    blue:{bg:"rgba(96,165,250,.08)",c:C.blue,b:"rgba(96,165,250,.25)"},
    yellow:{bg:"rgba(251,191,36,.08)",c:C.yellow,b:"rgba(251,191,36,.25)"}};
  const t=vs[v]||vs.default;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,background:t.bg,color:t.c,border:`1px solid ${t.b}`,...F,letterSpacing:"0.02em"}}>
    {dot&&<span style={{width:5,height:5,borderRadius:"50%",background:t.c,flexShrink:0}}/>}{children}
  </span>;
}

function Bar({val,color}){
  const pct=Math.min(100,Math.max(0,val||0));
  const bg=color||(pct===100?C.green:pct>70?C.orange:C.blue);
  return <div style={{width:"100%",height:3,background:"rgba(255,255,255,0.06)",borderRadius:6,overflow:"hidden"}}>
    <div style={{width:`${pct}%`,height:"100%",background:bg,borderRadius:6,transition:"width .5s",boxShadow:`0 0 8px ${bg}50`}}/>
  </div>;
}

function Card({children,style={},onClick}){
  const [h,setH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:C.surface,border:`1px solid ${h&&onClick?C.orange:C.border}`,borderRadius:14,padding:18,transition:"all .2s",cursor:onClick?"pointer":"default",...style}}>{children}</div>;
}

function Modal({title,onClose,children,wide=false}){
  return <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.85)",backdropFilter:"blur(8px)",padding:16}} onClick={onClose}>
    <div style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:18,width:"100%",maxWidth:wide?760:500,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.9)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:`1px solid ${C.borderLight}`,position:"sticky",top:0,background:"#111",zIndex:1}}>
        <span style={{fontWeight:700,fontSize:14,color:C.text,...F}}>{title}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.05)",border:"none",cursor:"pointer",color:C.muted,width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}>
          <Icon n="x" size={14}/>
        </button>
      </div>
      <div style={{padding:"18px 22px"}}>{children}</div>
    </div>
  </div>;
}

function Fld({label,children}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.09em",...F}}>{label}</label>}
    {children}
  </div>;
}

function Inp({label,...p}){
  const [f,setF]=useState(false);
  return <Fld label={label}><input style={{...INP_BASE,borderColor:f?C.orange:C.border}} onFocus={()=>setF(true)} onBlur={()=>setF(false)} {...p}/></Fld>;
}

function Sel({label,children,...p}){
  const [f,setF]=useState(false);
  return <Fld label={label}><select style={{...INP_BASE,borderColor:f?C.orange:C.border,cursor:"pointer"}} onFocus={()=>setF(true)} onBlur={()=>setF(false)} {...p}>{children}</select></Fld>;
}

function Txta({label,...p}){
  const [f,setF]=useState(false);
  return <Fld label={label}><textarea style={{...INP_BASE,borderColor:f?C.orange:C.border,resize:"none"}} onFocus={()=>setF(true)} onBlur={()=>setF(false)} {...p}/></Fld>;
}

function Btn({children,onClick,v="primary",type="button",disabled=false,sx={}}){
  const [h,setH]=useState(false);
  const vs={
    primary:{bg:h?C.orangeHov:C.orange,c:"#0a0a0a",b:"none",fw:700},
    secondary:{bg:h?"rgba(255,255,255,.07)":"rgba(255,255,255,.04)",c:C.muted,b:`1px solid ${C.border}`,fw:600},
    danger:{bg:h?"#dc2626":"#991b1b",c:"#fff",b:"none",fw:700},
    outline:{bg:h?C.orangeDim:"transparent",c:h?C.orange:C.muted,b:`1px solid ${h?C.orange:C.border}`,fw:600},
    ghost:{bg:h?"rgba(255,255,255,.05)":"transparent",c:C.muted,b:"none",fw:500},
  };
  const t=vs[v]||vs.primary;
  return <button type={type} onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:t.bg,color:t.c,border:t.b,fontWeight:t.fw,padding:"8px 15px",borderRadius:10,fontSize:12,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,display:"inline-flex",alignItems:"center",gap:6,transition:"all .15s",...F,...sx}}>
    {children}</button>;
}

function Hdr({title,sub,action}){
  return <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:26,gap:12}}>
    <div>
      <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0,letterSpacing:"-0.03em",...F}}>{title}</h1>
      {sub&&<p style={{fontSize:11,color:C.muted,marginTop:4,...F}}>{sub}</p>}
    </div>
    {action}
  </div>;
}

function DSel({value,onChange,children}){
  return <select value={value} onChange={onChange} style={{...INP_BASE,padding:"7px 12px",fontSize:12,borderRadius:9,width:"auto",minWidth:175}}>{children}</select>;
}

// ─── CONSTRUCTION SCENE (dark, orange-accented) ───────────────────────────────
function Scene(){
  return <div style={{position:"absolute",inset:0,overflow:"hidden",borderRadius:"0 18px 18px 0"}}>
    <svg width="100%" height="100%" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050505"/><stop offset="55%" stopColor="#110a03"/><stop offset="100%" stopColor="#1a0e06"/>
        </linearGradient>
        <linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1007"/><stop offset="100%" stopColor="#0d0803"/>
        </linearGradient>
        <linearGradient id="og" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#c2500a"/>
        </linearGradient>
        <linearGradient id="bld" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181e"/><stop offset="100%" stopColor="#101014"/>
        </linearGradient>
        <filter id="gw"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="gw2"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* BG */}
      <rect width="600" height="700" fill="url(#sky)"/>
      {/* Stars */}
      {[[50,25],[140,12],[230,40],[355,18],[440,33],[520,10],[565,52],[95,65],[305,55],[390,75],[480,45],[170,80],[260,22]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?1.2:0.7} fill="white" opacity={0.3+0.3*(i%3)}/>
      ))}
      {/* Moon */}
      <circle cx="510" cy="75" r="40" fill="rgba(255,195,100,.06)"/>
      <circle cx="510" cy="75" r="25" fill="rgba(255,200,120,.11)"/>
      <circle cx="510" cy="75" r="15" fill="rgba(255,210,140,.16)"/>
      {/* Ground */}
      <rect x="0" y="490" width="600" height="210" fill="url(#gnd)"/>
      <line x1="0" y1="494" x2="600" y2="498" stroke="rgba(249,115,22,.06)" strokeWidth="1"/>
      {/* Building */}
      <rect x="255" y="195" width="250" height="305" fill="url(#bld)"/>
      {[230,260,290,320,350,380,410,440,470].map(y=>(
        <line key={y} x1="255" y1={y} x2="505" y2={y} stroke="rgba(255,255,255,.03)" strokeWidth="1"/>
      ))}
      {[255,285,315,345,375,405,435,465,505].map(x=>(
        <line key={x} x1={x} y1="195" x2={x} y2="500" stroke="rgba(255,255,255,.025)" strokeWidth="1"/>
      ))}
      {/* Windows with orange glow */}
      {[270,300,330,360,390,420,450,478].flatMap(x=>
        [210,240,270,300,330,360,390,420,452].map(y=>({x,y,lit:(x+y)%7<4}))
      ).map(({x,y,lit},i)=>(
        <rect key={i} x={x} y={y} width="15" height="13" rx="2" fill={lit?"rgba(249,115,22,0.35)":"rgba(255,255,255,.035)"} opacity={lit?1:.7}/>
      ))}
      {/* Rebar top */}
      <rect x="255" y="190" width="250" height="9" fill="rgba(249,115,22,.1)"/>
      {[265,280,295,310,325,340,355,370,385,400,415,430,445,460,475,490].map(x=>(
        <line key={x} x1={x} y1="165" x2={x} y2="194" stroke="rgba(249,115,22,.55)" strokeWidth="2.5" filter="url(#gw)"/>
      ))}
      <line x1="263" y1="178" x2="498" y2="178" stroke="rgba(249,115,22,.25)" strokeWidth="2"/>
      {/* Scaffolding */}
      {[505,522,540].map(x=>[160,210,260,310,360,410,460].map((y,i,a)=>i<a.length-1?(
        <line key={`${x}-${y}`} x1={x} y1={y} x2={x} y2={a[i+1]} stroke="url(#og)" strokeWidth="2.5" opacity=".7"/>
      ):null))}
      {[160,210,260,310,360,410,460].map(y=>(
        <rect key={y} x="505" y={y-3} width="38" height="5" rx="2" fill="rgba(249,115,22,.45)"/>
      ))}
      {/* Crane mast */}
      <rect x="128" y="55" width="13" height="445" fill="url(#og)" opacity=".85"/>
      <rect x="131" y="55" width="3" height="445" fill="rgba(255,255,255,.12)"/>
      {[75,115,155,195,235,275,315,355,395,435,475].map((y,i)=>(
        <g key={y}><line x1="128" y1={y} x2="141" y2={y+40} stroke="rgba(0,0,0,.35)" strokeWidth="1.5"/><line x1="141" y1={y} x2="128" y2={y+40} stroke="rgba(0,0,0,.35)" strokeWidth="1.5"/></g>
      ))}
      {/* Crane jibs */}
      <rect x="35" y="48" width="96" height="9" fill="url(#og)" rx="3"/>
      <rect x="138" y="48" width="290" height="8" fill="url(#og)" rx="3"/>
      {/* Cab */}
      <rect x="120" y="32" width="28" height="22" rx="4" fill="#c2500a"/>
      <rect x="123" y="35" width="11" height="9" rx="1" fill="rgba(180,220,255,.55)"/>
      {/* Counterweight */}
      <rect x="33" y="56" width="30" height="18" rx="3" fill="#444"/>
      {/* Hook + cable */}
      <rect x="328" y="52" width="13" height="7" rx="2" fill="#333"/>
      <line x1="335" y1="59" x2="335" y2="170" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"/>
      <path d="M331 170 Q335 186 339 170" stroke="rgba(249,115,22,.9)" strokeWidth="2" fill="none" filter="url(#gw)"/>
      <rect x="324" y="175" width="20" height="13" rx="3" fill="#2a2a2a"/>
      <circle cx="335" cy="178" r="6" fill="rgba(249,115,22,.35)" filter="url(#gw2)"/>
      {/* Excavator */}
      <ellipse cx="92" cy="542" rx="58" ry="17" fill="rgba(0,0,0,.45)"/>
      <rect x="40" y="548" width="104" height="15" rx="7" fill="#181818"/>
      {[46,60,74,88,102,116,130].map(x=><rect key={x} x={x} y="548" width="9" height="15" rx="2" fill="#252525"/>)}
      <ellipse cx="90" cy="534" rx="42" ry="15" fill="url(#og)" opacity=".9"/>
      <rect x="56" y="517" width="70" height="18" rx="4" fill="#c2500a"/>
      <rect x="108" y="505" width="27" height="23" rx="4" fill="#a84010"/>
      <rect x="111" y="508" width="11" height="9" rx="1" fill="rgba(190,220,255,.5)"/>
      <line x1="64" y1="524" x2="20" y2="474" stroke="#f97316" strokeWidth="7" strokeLinecap="round"/>
      <line x1="20" y1="474" x2="6" y2="520" stroke="#ea6c0a" strokeWidth="6" strokeLinecap="round"/>
      <path d="M1 518 Q-3 535 11 538 Q25 541 22 525 Z" fill="#b05010"/>
      {/* Cement truck */}
      <rect x="450" y="500" width="50" height="42" rx="6" fill="#8b1a12"/>
      <rect x="455" y="503" width="19" height="15" rx="2" fill="rgba(190,220,255,.65)"/>
      <rect x="475" y="500" width="25" height="42" fill="#6b1008"/>
      <rect x="372" y="511" width="100" height="31" rx="3" fill="#252525"/>
      <ellipse cx="412" cy="503" rx="28" ry="35" fill="#2e2e2e"/>
      <ellipse cx="412" cy="503" rx="23" ry="30" fill="#363636"/>
      {[0,60,120,180,240,300].map(a=>{const r=a*Math.PI/180;return <line key={a} x1={412+23*Math.cos(r)} y1={503+30*Math.sin(r)} x2={412+23*Math.cos(r+1.2)} y2={503+30*Math.sin(r+1.2)} stroke="rgba(249,115,22,.3)" strokeWidth="1.8"/>;})}
      {[[389,545],[423,545],[495,543],[514,543]].map(([cx,cy],i)=>(
        <g key={i}><circle cx={cx} cy={cy} r={11} fill="#0d0d0d"/><circle cx={cx} cy={cy} r={4.5} fill="#2a2a2a"/></g>
      ))}
      {/* Workers */}
      {[[244,487,C.orange],[542,490,"#c2500a"]].map(([x,y,wc],i)=>(
        <g key={i}>
          <ellipse cx={x} cy={y-14} rx={7} ry={4.5} fill={C.yellow}/>
          <circle cx={x} cy={y-7} r={5.5} fill="#1a1a1a"/>
          <rect x={x-5} y={y-1} width={10} height={14} rx={3} fill={wc}/>
          <rect x={x-4} y={y+7} width={3} height={10} rx={2} fill="#111"/>
          <rect x={x+1} y={y+7} width={3} height={10} rx={2} fill="#111"/>
        </g>
      ))}
      {/* Fence */}
      {[0,60,120,180,240,300,360,420,480,540].map(x=>(
        <g key={x}>
          <rect x={x} y="580" width="53" height="26" rx="2" fill="rgba(249,115,22,.72)"/>
          <rect x={x+1} y="578" width="4" height="32" rx="2" fill="#444"/>
          <rect x={x+48} y="578" width="4" height="32" rx="2" fill="#444"/>
          {[6,16,26,36].map(o=><rect key={o} x={x+o} y="582" width="8" height="22" rx="1" fill="rgba(0,0,0,.2)"/>)}
        </g>
      ))}
      {/* Ambient overlay */}
      <rect x="0" y="450" width="600" height="60" fill="url(#sky)" opacity=".25"/>
    </svg>
    {/* Floating cards */}
    <div style={{position:"absolute",top:26,left:26}}>
      <div style={{background:"rgba(15,15,15,.88)",backdropFilter:"blur(14px)",border:"1px solid rgba(249,115,22,.25)",borderRadius:13,padding:"9px 15px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:9,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon n="building" size={15} color={C.orange}/>
        </div>
        <div>
          <div style={{fontSize:10,color:C.muted,...F}}>Obra em andamento</div>
          <div style={{fontSize:13,fontWeight:700,color:C.text,...F}}>Edifício Aurora</div>
        </div>
      </div>
    </div>
    <div style={{position:"absolute",top:"36%",right:18}}>
      <div style={{background:"rgba(15,15,15,.88)",backdropFilter:"blur(14px)",border:"1px solid rgba(249,115,22,.18)",borderRadius:13,padding:"10px 14px",textAlign:"right"}}>
        <div style={{fontSize:22,fontWeight:800,color:C.orange,...F,letterSpacing:"-0.04em"}}>75%</div>
        <div style={{fontSize:10,color:C.muted,...F}}>estrutura</div>
        <div style={{fontSize:10,color:C.dim,...F}}>concluída</div>
      </div>
    </div>
    <div style={{position:"absolute",bottom:88,left:22}}>
      <div style={{background:"rgba(15,15,15,.88)",backdropFilter:"blur(14px)",border:`1px solid ${C.border}`,borderRadius:11,padding:"8px 13px"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,...F}}>Bloco A · Torre 1</div>
      </div>
    </div>
    <div style={{position:"absolute",bottom:78,right:18}}>
      <div style={{background:C.orangeDim,backdropFilter:"blur(14px)",border:"1px solid rgba(249,115,22,.3)",borderRadius:11,padding:"8px 13px"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.orange,...F}}>3 obras ativas</div>
      </div>
    </div>
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 600 700" preserveAspectRatio="none">
      <circle cx="195" cy="50" r="4" fill={C.orange} opacity=".5"/>
      <line x1="195" y1="54" x2="195" y2="175" stroke={C.orange} strokeWidth="1.5" strokeDasharray="5 5" opacity=".25"/>
      <circle cx="195" cy="178" r="4" fill={C.orange} opacity=".35"/>
    </svg>
  </div>;
}


// ─── PLANOS PAGE (landing completa) ──────────────────────────────────────────
function PlanosPage({onEscolher,onLogin}){
  const [ciclo,setCiclo]=useState("mensal");
  const [hov,setHov]=useState(null);
  const [faqOpen,setFaqOpen]=useState(null);
  const anual=ciclo==="anual";

  const IcoEmail=({c="currentColor",s=13})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>;
  const IcoWpp=({c="currentColor",s=13})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
  const IcoChk=({c})=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const IcoChev=({open})=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}><polyline points="6 9 12 15 18 9"/></svg>;

  // ── CSS keyframes injected once ──
  const ANIM_CSS=`
@keyframes obg-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes obg-row{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes obg-bar{from{width:0}to{width:var(--w)}}
@keyframes obg-pulse{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes obg-pop{0%{transform:scale(.82);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes obg-cursor{0%,100%{transform:translate(0,0)}25%{transform:translate(60px,14px)}50%{transform:translate(120px,0px)}75%{transform:translate(60px,-10px)}}
@keyframes obg-type{from{width:0}to{width:100%}}
@keyframes obg-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes obg-kpi{from{opacity:.3;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes obg-drop{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes obg-badge{from{transform:scale(0) rotate(-15deg);opacity:0}to{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes obg-scan{0%{top:0}100%{top:100%}}
`;

  // ── DEMO 1 — ALOCAÇÃO ──────────────────────────────────────────────────────
  // Simula: clique em "+ Nova Alocação" → modal abre → campos preenchem → salva → nova linha aparece na tabela
  const DemoAlocacao=()=>{
    const [phase,setPhase]=useState(0);
    // phase 0=tabela, 1=modal abrindo, 2=preenchendo obra, 3=preenchendo tipo, 4=preenchendo máquina, 5=preenchendo horas, 6=salvando, 7=nova linha aparece
    const [typed,setTyped]=useState("");
    const [horasTyped,setHorasTyped]=useState("");
    // loop único phase-driven: tempo relativo entre cada fase
    useEffect(()=>{
      const next={0:[1200,()=>setPhase(1)],1:[700,()=>setPhase(2)],2:[900,()=>setPhase(3)],3:[700,()=>setPhase(4)],4:[900,()=>setPhase(5)],5:[1400,()=>setPhase(6)],6:[800,()=>setPhase(7)],7:[3200,()=>{setTyped("");setHorasTyped("");setPhase(0);}]};
      if(next[phase]){const[ms,fn]=next[phase];const t=setTimeout(fn,ms);return()=>clearTimeout(t);}
    },[phase]);
    // typewriter for campo obra
    useEffect(()=>{
      if(phase===2){
        const str="Edifício Aurora";let i=0;
        const iv=setInterval(()=>{i++;setTyped(str.slice(0,i));if(i>=str.length)clearInterval(iv);},60);
        return()=>clearInterval(iv);
      }
    },[phase]);
    useEffect(()=>{
      if(phase===5){
        const str="120";let i=0;
        const iv=setInterval(()=>{i++;setHorasTyped(str.slice(0,i));if(i>=str.length)clearInterval(iv);},120);
        return()=>clearInterval(iv);
      }
    },[phase]);

    const rows=[
      {obra:"Edifício Aurora",tipo:"Máquina",ref:"Escavadeira CAT 320",qtd:"80 h",data:"10/02",cor:"#60a5fa"},
      {obra:"Edifício Aurora",tipo:"Máquina",ref:"Betoneira 400L",qtd:"200 h",data:"01/04",cor:"#60a5fa"},
      {obra:"Ponte Rio Verde",tipo:"Insumo",ref:"Cimento CP-II",qtd:"150 sc",data:"10/04",cor:"#f97316"},
    ];
    const newRow={obra:"Edifício Aurora",tipo:"Máquina",ref:"Retroescavadeira JD",qtd:"120 h",data:"hoje",cor:"#60a5fa"};

    const S={
      wrap:{background:"#0d0d0d",borderRadius:0,fontFamily:"'Sora',sans-serif",position:"relative",overflow:"hidden",userSelect:"none"},
      sidebar:{position:"absolute",left:0,top:0,bottom:0,width:42,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:6},
      sideIcon:(active)=>({width:22,height:22,borderRadius:5,background:active?"rgba(249,115,22,.15)":"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center"}),
      main:{marginLeft:42,padding:"12px 14px",height:"100%"},
      hdr:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10},
      kpiRow:{display:"flex",gap:8,marginBottom:10},
      kpi:(cor,bg)=>({flex:1,background:bg,border:`1px solid ${cor}35`,borderRadius:8,padding:"7px 10px"}),
      tblHdr:{display:"grid",gridTemplateColumns:"1fr 70px 1.4fr 70px 50px",gap:6,padding:"5px 8px",background:"rgba(255,255,255,.025)",borderRadius:5,marginBottom:3,fontSize:9,color:"#5a5a5a",letterSpacing:"0.05em"},
      row:(hi)=>({display:"grid",gridTemplateColumns:"1fr 70px 1.4fr 70px 50px",gap:6,padding:"6px 8px",borderRadius:5,background:hi?"rgba(249,115,22,.07)":"rgba(255,255,255,.02)",border:`1px solid ${hi?"rgba(249,115,22,.2)":"transparent"}`,fontSize:10,color:"#d0d0d0",alignItems:"center",marginBottom:2,transition:"all .3s"}),
      badge:(cor)=>({display:"inline-flex",alignItems:"center",padding:"2px 7px",borderRadius:20,background:`${cor}18`,border:`1px solid ${cor}40`,fontSize:8.5,color:cor,fontWeight:600}),
      dot:(cor)=>({width:4,height:30,borderRadius:2,background:cor,flexShrink:0}),
    };

    const modalOpen=phase>=1&&phase<=6;
    const custoMaq=phase===7?"R$ 63.450":"R$ 47.450";
    const pct=phase===7?76:56;

    return <div style={{...S.wrap,height:310}}>
      <style>{ANIM_CSS}</style>
      {/* sidebar */}
      <div style={S.sidebar}>
        <div style={{width:24,height:24,borderRadius:7,background:"rgba(249,115,22,.15)",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        {["M","O","P","A","E","R"].map((l,i)=><div key={i} style={{...S.sideIcon(i===3),fontSize:9,color:i===3?"#f97316":"#333",fontWeight:700}}>{l}</div>)}
      </div>
      {/* main */}
      <div style={S.main}>
        {/* header */}
        <div style={S.hdr}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#f0f0f0",letterSpacing:"-0.03em"}}>Alocações</div>
            <div style={{fontSize:9,color:"#555"}}>Edifício Aurora · 3 máquinas · 2 insumos</div>
          </div>
          <button style={{background:phase>=1&&phase<=6?"rgba(249,115,22,.25)":"#f97316",border:"none",borderRadius:7,padding:"5px 11px",fontSize:9,fontWeight:700,color:phase>=1&&phase<=6?"#f97316":"#0a0a0a",cursor:"default",display:"flex",alignItems:"center",gap:5,transition:"all .3s",boxShadow:phase===0?"0 2px 12px rgba(249,115,22,.35)":"none"}}>
            <span style={{fontSize:12,lineHeight:1}}>+</span> Nova Alocação
          </button>
        </div>
        {/* KPIs */}
        <div style={S.kpiRow}>
          <div style={S.kpi("#60a5fa","rgba(96,165,250,.06)")}>
            <div style={{fontSize:8,color:"#60a5fa",opacity:.8,marginBottom:3}}>Custo Máquinas</div>
            <div style={{fontSize:14,fontWeight:800,color:"#60a5fa",letterSpacing:"-0.03em",transition:"all .5s",animation:phase===7?"obg-kpi .5s ease":"none"}}>{custoMaq}</div>
            <div style={{marginTop:5,height:3,borderRadius:2,background:"rgba(96,165,250,.15)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:"#60a5fa",width:`${pct}%`,transition:"width 1s ease"}}/>
            </div>
          </div>
          <div style={S.kpi("#f97316","rgba(249,115,22,.06)")}>
            <div style={{fontSize:8,color:"#f97316",opacity:.8,marginBottom:3}}>Custo Insumos</div>
            <div style={{fontSize:14,fontWeight:800,color:"#f97316",letterSpacing:"-0.03em"}}>R$ 18.200</div>
            <div style={{marginTop:5,height:3,borderRadius:2,background:"rgba(249,115,22,.15)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,background:"#f97316",width:"28%"}}/>
            </div>
          </div>
        </div>
        {/* table */}
        <div style={S.tblHdr}><span>OBRA</span><span>TIPO</span><span>REFERÊNCIA</span><span>QTD/H</span><span>DATA</span></div>
        {rows.map((r,i)=>(
          <div key={i} style={{...S.row(false),animation:`obg-row .4s ease ${i*0.08}s both`}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={S.dot(r.cor)}/>
              <span style={{fontSize:9.5}}>{r.obra}</span>
            </div>
            <span style={S.badge(r.cor)}>{r.tipo}</span>
            <span style={{fontSize:9,color:"#aaa"}}>{r.ref}</span>
            <span style={{fontWeight:700,fontSize:9.5}}>{r.qtd}</span>
            <span style={{fontSize:9,color:"#555"}}>{r.data}</span>
          </div>
        ))}
        {/* new row appearing */}
        {phase===7&&<div style={{...S.row(true),animation:"obg-row .45s cubic-bezier(.34,1.56,.64,1) both"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={S.dot("#60a5fa")}/>
            <span style={{fontSize:9.5}}>{newRow.obra}</span>
          </div>
          <span style={S.badge("#60a5fa")}>{newRow.tipo}</span>
          <span style={{fontSize:9,color:"#aaa"}}>{newRow.ref}</span>
          <span style={{fontWeight:700,fontSize:9.5,color:"#60a5fa"}}>{newRow.qtd}</span>
          <span style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#22c55e"}}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            {newRow.data}
          </span>
        </div>}
      </div>

      {/* ── Modal overlay ── */}
      {modalOpen&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",animation:"obg-fadein .2s ease",zIndex:10}}>
        <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:14,padding:"18px 20px",width:260,boxShadow:"0 32px 80px rgba(0,0,0,.8)",animation:"obg-drop .25s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontSize:12,fontWeight:700,color:"#f0f0f0"}}>Nova Alocação</span>
            <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#555"}}>✕</div>
          </div>
          {/* campo Obra */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:"#555",marginBottom:4,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Obra</div>
            <div style={{background:phase>=2?"rgba(249,115,22,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>=2?"rgba(249,115,22,.35)":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,color:phase>=2?"#f0f0f0":"#444",minHeight:24,display:"flex",alignItems:"center",transition:"all .2s"}}>
              {phase>=2?typed:<span style={{color:"#333"}}>Selecione a obra…</span>}
              {phase===2&&<span style={{width:1,height:11,background:"#f97316",marginLeft:1,animation:"obg-blink 1s infinite",display:"inline-block"}}/>}
            </div>
          </div>
          {/* campo Tipo */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:"#555",marginBottom:4,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Tipo</div>
            <div style={{background:phase>=3?"rgba(96,165,250,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>=3?"rgba(96,165,250,.35)":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
              {phase>=3?<><span style={{...S.badge("#60a5fa")}}>Máquina</span><span style={{fontSize:9,color:"#888"}}>selecionado</span></>:<span style={{color:"#333"}}>Tipo de alocação…</span>}
            </div>
          </div>
          {/* campo Referência */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:"#555",marginBottom:4,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Máquina / Insumo</div>
            <div style={{background:phase>=4?"rgba(96,165,250,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>=4?"rgba(96,165,250,.35)":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,color:phase>=4?"#f0f0f0":"#444",transition:"all .2s"}}>
              {phase>=4?"Retroescavadeira JD":<span style={{color:"#333"}}>Selecione…</span>}
            </div>
          </div>
          {/* campo Horas */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,color:"#555",marginBottom:4,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Horas / Qtd</div>
            <div style={{background:phase>=5?"rgba(96,165,250,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>=5?"rgba(96,165,250,.35)":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,color:phase>=5?"#f0f0f0":"#444",display:"flex",alignItems:"center",transition:"all .2s"}}>
              {phase>=5?<>{horasTyped}<span style={{color:"#555"}}> h</span>{phase===5&&<span style={{width:1,height:11,background:"#60a5fa",marginLeft:1,animation:"obg-blink 1s infinite",display:"inline-block"}}/>}</>:<span style={{color:"#333"}}>0</span>}
            </div>
          </div>
          {/* botão salvar */}
          <button style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:phase===6?"rgba(34,197,94,.15)":"linear-gradient(90deg,#f97316,#ea6c0a)",color:phase===6?"#22c55e":"#0a0a0a",fontWeight:700,fontSize:11,cursor:"default",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .3s",boxShadow:phase<6?"0 4px 16px rgba(249,115,22,.35)":"none"}}>
            {phase===6?<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Salvo!</>:"Salvar Alocação"}
          </button>
        </div>
      </div>}
    </div>;
  };

  // ── DEMO 2 — ESTOQUE ───────────────────────────────────────────────────────
  // Simula: arrasta arquivo XML → scan → lote importado → barras de estoque se atualizam
  const DemoEstoque=()=>{
    const [phase,setPhase]=useState(0);
    // 0=posição estoque, 1=aba entrada, 2=drag hover, 3=scanning, 4=preview itens, 5=confirmando, 6=volta posição com barras atualizadas
    useEffect(()=>{
      const next={0:[1000,1],1:[700,2],2:[700,3],3:[1400,4],4:[1400,5],5:[900,6],6:[3800,0]};
      if(next[phase]){const[ms,p]=next[phase];const t=setTimeout(()=>setPhase(p),ms);return()=>clearTimeout(t);}
    },[phase]);

    const INSUMOS=[
      {nome:"Cimento CP-II",unid:"sc",ent:500,util:320,cor:"#f97316",base:64},
      {nome:"Areia Média",unid:"m³",ent:80,util:55,cor:"#f97316",base:69},
      {nome:"Vergalhão CA-50",unid:"br",ent:200,util:140,cor:"#ef4444",base:70},
      {nome:"Concreto FCK 25",unid:"m³",ent:120,util:88,cor:"#ef4444",base:73},
    ];
    // after import, cimento gains +100 entrada
    const getUtil=(i,p)=>{if(p===6){return i===0?320:i===1?55:i===2?140:88;}return INSUMOS[i].util;};
    const getEnt=(i,p)=>{if(p===6){return i===0?600:i===1?120:INSUMOS[i].ent;}return INSUMOS[i].ent;};
    const getPct=(i,p)=>{const e=getEnt(i,p);const u=getUtil(i,p);return Math.round(u/e*100);};
    const totalDisp=p=>INSUMOS.reduce((a,v,i)=>{const e=getEnt(i,p);const u=getUtil(i,p);return a+(e-u)*38;},0);

    const S2={
      tab:(a)=>({flex:1,padding:"5px 0",textAlign:"center",fontSize:9.5,fontWeight:a?700:400,color:a?"#0a0a0a":"#555",background:a?"#f97316":"transparent",borderRadius:6,cursor:"default",transition:"all .2s"}),
      kpi:(cor,bg)=>({flex:1,background:bg,border:`1px solid ${cor}35`,borderRadius:8,padding:"7px 10px"}),
    };

    const activeTab=phase<=0||phase===6?"pos":"ent";

    return <div style={{background:"#0d0d0d",borderRadius:0,fontFamily:"'Sora',sans-serif",position:"relative",overflow:"hidden",height:310,userSelect:"none"}}>
      {/* sidebar */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:42,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:6}}>
        <div style={{width:24,height:24,borderRadius:7,background:"rgba(249,115,22,.15)",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        {["M","O","P","A","E","R"].map((l,i)=><div key={i} style={{width:22,height:22,borderRadius:5,background:i===4?"rgba(249,115,22,.15)":"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:i===4?"#f97316":"#333",fontWeight:700}}>{l}</div>)}
      </div>
      <div style={{marginLeft:42,padding:"12px 14px",height:"100%",display:"flex",flexDirection:"column"}}>
        {/* header */}
        <div style={{marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:700,color:"#f0f0f0",letterSpacing:"-0.03em"}}>Estoque</div>
          <div style={{fontSize:9,color:"#555"}}>Edifício Aurora · posição atual</div>
        </div>
        {/* tabs */}
        <div style={{display:"flex",gap:3,background:"rgba(255,255,255,.03)",borderRadius:8,padding:3,marginBottom:9}}>
          <div style={S2.tab(activeTab==="ent")}>Entrada de Insumos</div>
          <div style={S2.tab(activeTab==="pos")}>Estoque (Posição)</div>
        </div>

        {/* ── ABA ENTRADA ── */}
        {(phase>=1&&phase<=5)&&<>
          {/* drop zone */}
          {phase<=2&&<div style={{flex:1,border:`2px dashed ${phase===2?"#f97316":"#2a2a2a"}`,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:phase===2?"rgba(249,115,22,.05)":"transparent",transition:"all .3s",animation:phase===1?"obg-fadein .3s ease":"none"}}>
            <div style={{width:36,height:36,borderRadius:10,background:phase===2?"rgba(249,115,22,.12)":"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={phase===2?"#f97316":"#444"} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div style={{fontSize:10,fontWeight:600,color:phase===2?"#f97316":"#444",transition:"color .3s"}}>{phase===2?"Solte o arquivo aqui":"Arraste NF-e XML, PDF ou Excel"}</div>
            <div style={{fontSize:9,color:"#333"}}>ou clique para selecionar</div>
          </div>}
          {/* scanning */}
          {phase===3&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,animation:"obg-fadein .3s ease"}}>
            <div style={{width:52,height:64,background:"rgba(255,255,255,.04)",border:"1px solid #2a2a2a",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#f97316,transparent)",animation:"obg-scan 1.2s ease-in-out infinite"}}/>
              <svg width="20" height="24" viewBox="0 0 24 32" fill="none" stroke="#444" strokeWidth="1.5"><rect x="2" y="2" width="20" height="28" rx="2"/><path d="M7 8h10M7 13h10M7 18h7"/></svg>
            </div>
            <div style={{fontSize:10,color:"#888",animation:"obg-pulse 1.5s infinite"}}>Lendo NF_Aurora_0342.xml…</div>
            <div style={{width:120,height:3,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"#f97316",borderRadius:2,animation:"obg-bar 1.4s ease forwards",["--w"]:"100%"}}/>
            </div>
          </div>}
          {/* preview itens */}
          {(phase===4||phase===5)&&<div style={{flex:1,animation:"obg-fadein .25s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:16,height:16,borderRadius:4,background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{fontSize:9.5,color:"#22c55e",fontWeight:600}}>2 itens encontrados · NF 0342</span>
              </div>
              <span style={{fontSize:8,color:"#444"}}>Emissão 08/03/2025</span>
            </div>
            {[{nome:"Cimento CP-II",unid:"sc 50kg",qtd:"100",val:"R$ 38,00",total:"R$ 3.800"},{nome:"Areia Média",unid:"m³",qtd:"40",val:"R$ 95,00",total:"R$ 3.800"}].map((it,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"rgba(34,197,94,.04)",border:"1px solid rgba(34,197,94,.15)",borderRadius:7,marginBottom:4,animation:`obg-row .3s ease ${i*.1}s both`}}>
                <div style={{width:4,height:28,borderRadius:2,background:"#22c55e",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#f0f0f0"}}>{it.nome}</div>
                  <div style={{fontSize:8.5,color:"#555"}}>{it.unid} · {it.qtd} un · {it.val}/un</div>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:"#22c55e"}}>{it.total}</div>
              </div>
            ))}
            <button style={{width:"100%",marginTop:7,padding:"8px",borderRadius:7,border:"none",background:phase===5?"rgba(34,197,94,.15)":"linear-gradient(90deg,#f97316,#ea6c0a)",color:phase===5?"#22c55e":"#0a0a0a",fontWeight:700,fontSize:10,cursor:"default",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .3s"}}>
              {phase===5?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Lançado no estoque!</>:"Confirmar e lançar no estoque"}
            </button>
          </div>}
        </>}

        {/* ── ABA POSIÇÃO ── */}
        {(phase===0||phase===6)&&<div style={{flex:1,animation:"obg-fadein .35s ease"}}>
          <div style={{display:"flex",gap:7,marginBottom:8}}>
            <div style={{flex:1,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.25)",borderRadius:7,padding:"6px 9px"}}>
              <div style={{fontSize:8,color:"#22c55e",marginBottom:2}}>Valor em Estoque</div>
              <div style={{fontSize:13,fontWeight:800,color:"#22c55e",letterSpacing:"-0.03em",transition:"all .8s"}}>{phase===6?"R$ 35.730":"R$ 28.450"}</div>
            </div>
            <div style={{flex:1,background:"rgba(249,115,22,.06)",border:"1px solid rgba(249,115,22,.25)",borderRadius:7,padding:"6px 9px"}}>
              <div style={{fontSize:8,color:"#f97316",marginBottom:2}}>Consumido</div>
              <div style={{fontSize:13,fontWeight:800,color:"#f97316",letterSpacing:"-0.03em"}}>R$ 54.820</div>
            </div>
          </div>
          {INSUMOS.map((ins,i)=>{
            const ent=getEnt(i,phase);const util=getUtil(i,phase);const disp=ent-util;const pct=getPct(i,phase);
            return <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 38px 28px 28px 56px",gap:5,padding:"5px 6px",borderRadius:5,background:i%2===0?"rgba(255,255,255,.02)":"transparent",alignItems:"center",marginBottom:2,animation:phase===6&&i<=1?"obg-kpi .5s ease":"none"}}>
              <span style={{fontSize:9.5,color:"#ccc",fontWeight:500}}>{ins.nome}</span>
              <span style={{fontSize:8.5,color:i===0&&phase===6?"#22c55e":"#22c55e",fontWeight:700,transition:"all .5s"}}>{disp}</span>
              <span style={{fontSize:8,color:"#444"}}>{ins.unid}</span>
              <span style={{fontSize:8,color:pct>70?"#ef4444":"#f97316",fontWeight:600}}>{pct}%</span>
              <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:3,background:pct>70?"#ef4444":"#f97316",width:`${pct}%`,transition:"width 1s ease"}}/>
              </div>
            </div>;
          })}
        </div>}
      </div>
    </div>;
  };

  // ── DEMO 3 — PESSOAS ───────────────────────────────────────────────────────
  // Simula: clique + Nova Pessoa → modal preenche → salva → nova pessoa aparece com badge de obra
  const DemoPessoas=()=>{
    const [phase,setPhase]=useState(0);
    const [tNome,setTNome]=useState("");
    const [tCargo,setTCargo]=useState("");
    useEffect(()=>{
      const next={0:[1000,()=>setPhase(1)],1:[800,()=>setPhase(2)],2:[1100,()=>setPhase(3)],3:[1000,()=>setPhase(4)],4:[900,()=>setPhase(5)],5:[800,()=>setPhase(6)],6:[700,()=>setPhase(7)],7:[3200,()=>{setTNome("");setTCargo("");setPhase(0);}]};
      if(next[phase]){const[ms,fn]=next[phase];const t=setTimeout(fn,ms);return()=>clearTimeout(t);}
    },[phase]);
    useEffect(()=>{
      if(phase===2){const s="Carlos Menezes";let i=0;const iv=setInterval(()=>{i++;setTNome(s.slice(0,i));if(i>=s.length)clearInterval(iv);},55);return()=>clearInterval(iv);}
    },[phase]);
    useEffect(()=>{
      if(phase===3){const s="Eletricista";let i=0;const iv=setInterval(()=>{i++;setTCargo(s.slice(0,i));if(i>=s.length)clearInterval(iv);},65);return()=>clearInterval(iv);}
    },[phase]);

    const pessoas=[
      {ini:"J",nome:"José Ferreira",cargo:"Pedreiro",tipo:"Funcionário",val:"R$ 180",obras:2,cor:"#60a5fa"},
      {ini:"A",nome:"Ana Oliveira",cargo:"Eng. Civil",tipo:"Funcionário",val:"R$ 450",obras:3,cor:"#60a5fa"},
      {ini:"T",nome:"TechBuild Ltda",cargo:"Inst. Elétricas",tipo:"Prestador",val:"R$ 1.200",obras:1,cor:"#a78bfa"},
    ];
    const nova={ini:"C",nome:"Carlos Menezes",cargo:"Eletricista",tipo:"Funcionário",val:"R$ 210",obras:1,cor:"#60a5fa"};

    const Sb={
      row:(hi)=>({display:"grid",gridTemplateColumns:"26px 1fr 72px 70px 50px 34px",gap:6,padding:"6px 8px",borderRadius:6,background:hi?"rgba(96,165,250,.06)":"rgba(255,255,255,.02)",border:`1px solid ${hi?"rgba(96,165,250,.2)":"transparent"}`,alignItems:"center",marginBottom:3,transition:"all .3s"}),
      badge:(cor)=>({display:"inline-flex",padding:"2px 7px",borderRadius:20,background:`${cor}18`,border:`1px solid ${cor}40`,fontSize:8,color:cor,fontWeight:600,whiteSpace:"nowrap"}),
      avatar:(cor)=>({width:22,height:22,borderRadius:6,background:`${cor}20`,border:`1px solid ${cor}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:cor,flexShrink:0}),
    };

    return <div style={{background:"#0d0d0d",borderRadius:0,fontFamily:"'Sora',sans-serif",position:"relative",overflow:"hidden",height:310,userSelect:"none"}}>
      {/* sidebar */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:42,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:16,gap:6}}>
        <div style={{width:24,height:24,borderRadius:7,background:"rgba(249,115,22,.15)",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </div>
        {["M","O","P","A","E","R"].map((l,i)=><div key={i} style={{width:22,height:22,borderRadius:5,background:i===2?"rgba(167,139,250,.15)":"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:i===2?"#a78bfa":"#333",fontWeight:700}}>{l}</div>)}
      </div>
      <div style={{marginLeft:42,padding:"12px 14px",height:"100%",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#f0f0f0",letterSpacing:"-0.03em"}}>Pessoas & Equipes</div>
            <div style={{fontSize:9,color:"#555"}}>{phase===7?4:3} colaboradores cadastrados</div>
          </div>
          <button style={{background:phase>=1&&phase<=6?"rgba(167,139,250,.2)":"#a78bfa",border:"none",borderRadius:7,padding:"5px 11px",fontSize:9,fontWeight:700,color:phase>=1&&phase<=6?"#a78bfa":"#0a0a0a",cursor:"default",display:"flex",alignItems:"center",gap:5,transition:"all .3s"}}>
            <span style={{fontSize:12,lineHeight:1}}>+</span> Nova Pessoa
          </button>
        </div>
        {/* tabs */}
        <div style={{display:"flex",gap:3,background:"rgba(255,255,255,.03)",borderRadius:8,padding:3,marginBottom:8}}>
          {["Tipos de Etapa","Pessoas"].map((t,i)=><div key={i} style={{flex:1,padding:"4px 0",textAlign:"center",fontSize:9,fontWeight:i===1?700:400,color:i===1?"#0a0a0a":"#555",background:i===1?"#f97316":"transparent",borderRadius:5,cursor:"default"}}>{t}</div>)}
        </div>
        {/* table header */}
        <div style={{display:"grid",gridTemplateColumns:"26px 1fr 72px 70px 50px 34px",gap:6,padding:"4px 8px",fontSize:8.5,color:"#3a3a3a",letterSpacing:"0.05em",marginBottom:4}}>
          <span/><span>NOME</span><span>CARGO</span><span>TIPO</span><span>VAL/DIA</span><span>OBR</span>
        </div>
        {pessoas.map((p,i)=>(
          <div key={i} style={{...Sb.row(false),animation:`obg-row .4s ease ${i*.07}s both`}}>
            <div style={Sb.avatar(p.cor)}>{p.ini}</div>
            <div>
              <div style={{fontSize:9.5,fontWeight:600,color:"#e0e0e0",lineHeight:1.2}}>{p.nome}</div>
              <div style={{fontSize:8,color:"#555"}}>{p.cargo}</div>
            </div>
            <span style={Sb.badge(p.cor)}>{p.tipo}</span>
            <span style={{fontSize:10,fontWeight:700,color:"#ccc"}}>{p.val}</span>
            <span style={{fontSize:9,color:"#555"}}>{p.obras}×</span>
            <div style={{width:24,height:18,borderRadius:4,background:"rgba(255,255,255,.04)",border:"1px solid #222",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
        ))}
        {/* nova pessoa */}
        {phase===7&&<div style={{...Sb.row(true),animation:"obg-row .4s cubic-bezier(.34,1.56,.64,1) both"}}>
          <div style={Sb.avatar("#60a5fa")}>{nova.ini}</div>
          <div>
            <div style={{fontSize:9.5,fontWeight:600,color:"#e0e0e0",lineHeight:1.2,display:"flex",alignItems:"center",gap:5}}>
              {nova.nome}
              <span style={{fontSize:7,padding:"1px 5px",borderRadius:8,background:"rgba(34,197,94,.15)",color:"#22c55e",border:"1px solid rgba(34,197,94,.3)",animation:"obg-badge .4s cubic-bezier(.34,1.56,.64,1)"}}>novo</span>
            </div>
            <div style={{fontSize:8,color:"#555"}}>{nova.cargo}</div>
          </div>
          <span style={Sb.badge("#60a5fa")}>{nova.tipo}</span>
          <span style={{fontSize:10,fontWeight:700,color:"#60a5fa"}}>{nova.val}</span>
          <span style={{fontSize:9,color:"#22c55e",fontWeight:600}}>1×</span>
          <div style={{width:24,height:18,borderRadius:4,background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>}
      </div>

      {/* Modal */}
      {(phase>=1&&phase<=6)&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,animation:"obg-fadein .2s ease"}}>
        <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:14,padding:"18px 20px",width:255,boxShadow:"0 32px 80px rgba(0,0,0,.8)",animation:"obg-drop .25s cubic-bezier(.34,1.56,.64,1)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:700,color:"#f0f0f0"}}>Nova Pessoa</span>
            <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#555"}}>✕</div>
          </div>
          {[
            {label:"Nome completo",ph:"Digite o nome…",val:phase>=2?tNome:"",active:phase===2,cor:"#a78bfa"},
            {label:"Cargo",ph:"Ex: Pedreiro, Engenheiro…",val:phase>=3?tCargo:"",active:phase===3,cor:"#a78bfa"},
          ].map((f,i)=>(
            <div key={i} style={{marginBottom:9}}>
              <div style={{fontSize:9,color:"#555",marginBottom:3,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{f.label}</div>
              <div style={{background:phase>i+1?"rgba(167,139,250,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>i+1?f.cor+"40":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,color:phase>i+1?"#f0f0f0":"#444",display:"flex",alignItems:"center",transition:"all .2s",minHeight:26}}>
                {f.val||<span style={{color:"#333"}}>{f.ph}</span>}
                {f.active&&<span style={{width:1,height:11,background:f.cor,marginLeft:1,animation:"obg-blink 1s infinite",display:"inline-block"}}/>}
              </div>
            </div>
          ))}
          <div style={{marginBottom:9}}>
            <div style={{fontSize:9,color:"#555",marginBottom:3,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Tipo</div>
            <div style={{display:"flex",gap:5}}>
              {["Funcionário","Prestador"].map((t,i)=>(
                <div key={i} style={{flex:1,padding:"5px",borderRadius:6,border:`1px solid ${i===0&&phase>=4?"rgba(96,165,250,.5)":"#252525"}`,background:i===0&&phase>=4?"rgba(96,165,250,.08)":"rgba(255,255,255,.03)",textAlign:"center",fontSize:9,color:i===0&&phase>=4?"#60a5fa":"#444",fontWeight:i===0&&phase>=4?700:400,cursor:"default",transition:"all .2s"}}>{t}</div>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:"#555",marginBottom:3,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Valor / Dia</div>
            <div style={{background:phase>=5?"rgba(96,165,250,.06)":"rgba(255,255,255,.04)",border:`1px solid ${phase>=5?"rgba(96,165,250,.35)":"#252525"}`,borderRadius:7,padding:"6px 9px",fontSize:10,color:phase>=5?"#f0f0f0":"#444",transition:"all .2s"}}>
              {phase>=5?"R$ 210,00":<span style={{color:"#333"}}>R$ 0,00</span>}
            </div>
          </div>
          <button style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:phase===6?"rgba(34,197,94,.15)":"linear-gradient(90deg,#a78bfa,#7c5cbf)",color:phase===6?"#22c55e":"#fff",fontWeight:700,fontSize:11,cursor:"default",display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .3s"}}>
            {phase===6?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Pessoa cadastrada!</>:"Cadastrar Pessoa"}
          </button>
        </div>
      </div>}
    </div>;
  };

  const FEATURES=[
    {id:"alocacao",tag:"Alocação",cor:"#60a5fa",
      title:"Aloque máquinas, insumos e equipes por obra",
      desc:"Registre cada alocação vinculada a uma obra específica. Acompanhe custo por categoria (máquinas vs insumos), histórico de uso e observações. Controle total sobre o que está sendo consumido em cada frente.",
      bullets:["Vínculo direto por obra","KPIs de custo em tempo real","Histórico completo de alocações","Distingue máquinas de insumos"],
      screen:<DemoAlocacao/>},
    {id:"estoque",tag:"Estoque",cor:"#f97316",
      title:"Posição de estoque em tempo real por obra",
      desc:"Acompanhe entrada, consumo e saldo disponível de cada insumo. Barra de progresso visual indica o percentual utilizado. Veja o valor financeiro do estoque disponível e consumido filtrado por obra.",
      bullets:["Saldo por insumo e por obra","Barra de consumo visual","Valor financeiro em estoque","Importação de NF-e / XML"],
      screen:<DemoEstoque/>},
    {id:"pessoas",tag:"Pessoas & Equipes",cor:"#a78bfa",
      title:"Gerencie equipes, prestadores e mão de obra",
      desc:"Cadastre funcionários e prestadores de serviço, vincule-os às obras em que atuam e defina o valor por dia. O custo de mão de obra é calculado automaticamente nos relatórios de cada obra.",
      bullets:["Funcionários CLT e prestadores","Vínculo por obra","Custo de mão de obra por projeto","Controle de ativação e inativação"],
      screen:<DemoPessoas/>},
  ];

  const FAQS=[
    {q:"Como funciona a alocação de máquinas?",
     a:"Você registra cada uso de máquina vinculado a uma obra: seleciona a máquina, informa as horas trabalhadas e a data. O sistema calcula automaticamente o custo com base no valor/hora cadastrado para cada equipamento."},
    {q:"Posso controlar o estoque de mais de uma obra ao mesmo tempo?",
     a:"Sim. Cada entrada de insumo é vinculada a uma obra específica. Você pode filtrar a posição de estoque por obra ou visualizar tudo consolidado no dashboard principal."},
    {q:"Como importar notas fiscais para o estoque?",
     a:"No módulo Estoque > Entrada de Insumos, clique em 'Importar NF'. Arraste o arquivo XML, PDF ou Excel. O sistema faz o parsing automático e apresenta os itens para você confirmar antes de lançar no estoque da obra."},
    {q:"Posso alocar a mesma máquina em obras diferentes?",
     a:"Sim. Cada registro de alocação é independente — você pode alocar a mesma máquina em múltiplas obras em datas diferentes. O histórico fica separado por obra."},
    {q:"Quem pode cadastrar usuários e definir permissões?",
     a:"Apenas o administrador da sua empresa pode criar, editar e desativar usuários, além de definir quais telas e obras cada colaborador pode acessar."},
    {q:"O que acontece se eu atingir o limite de usuários do meu plano?",
     a:"O sistema bloqueia a criação de novos usuários e exibe um aviso de limite atingido com botão de upgrade. Nenhum dado é perdido. O upgrade de plano é feito diretamente dentro do sistema."},
    {q:"Posso mudar de plano depois de contratar?",
     a:"Sim. A migração é feita diretamente na tela de Usuários > Alterar Plano. No upgrade, o acesso é liberado imediatamente. No downgrade, os dados são preservados mas funcionalidades excedentes são limitadas."},
    {q:"Como funciona o cancelamento?",
     a:"Planos mensais podem ser cancelados a qualquer momento, sem multa e sem fidelidade mínima. Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação. No plano anual, o cancelamento encerra o acesso ao fim do período já pago, sem reembolso proporcional."},
    {q:"Meus dados ficam seguros após o cancelamento?",
     a:"Todos os dados são isolados por empresa. Após o cancelamento, você tem 30 dias para exportar relatórios e dados. Após esse prazo, os dados são removidos permanentemente de nossos servidores."},
    {q:"O sistema funciona no celular?",
     a:"A interface funciona em navegadores mobile. Para uso intensivo em campo, recomendamos tablets ou notebooks para aproveitar melhor dashboards e tabelas com muitas colunas."},
  ];

  const GridBg=()=><div aria-hidden style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
    <div style={{position:"absolute",top:"-15%",left:"50%",transform:"translateX(-50%)",width:900,height:600,background:"radial-gradient(ellipse at center, rgba(249,115,22,.06) 0%, transparent 65%)"}}/>
    <svg width="100%" height="100%" style={{position:"absolute",inset:0,opacity:.05}} preserveAspectRatio="xMidYMid slice">
      <defs><pattern id="pg" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M 52 0 L 0 0 0 52" fill="none" stroke="#f97316" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#pg)"/>
    </svg>
  </div>;

  const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});

  return <>
    <link href={FONT_URL} rel="stylesheet"/>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#060810;overflow-x:hidden}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#252525;border-radius:8px}`}</style>
    <div style={{minHeight:"100vh",background:"#060810",...F}}>

      {/* ── NAV ── */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 52px",borderBottom:"1px solid rgba(255,255,255,.05)",position:"sticky",top:0,background:"rgba(6,8,16,.92)",backdropFilter:"blur(20px)",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:29,height:29,borderRadius:8,background:"linear-gradient(135deg,#f97316,#ea6c0a)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon n="building" size={14} color="#0a0a0a"/>
          </div>
          <span style={{fontWeight:800,fontSize:17,color:"#f97316",letterSpacing:"-0.05em"}}>obrasgest</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:28}}>
          {[["Funcionalidades","sec-features"],["Planos","sec-pricing"],["FAQ","sec-faq"]].map(([label,id])=>(
            <button key={id} onClick={()=>scrollTo(id)} style={{background:"none",border:"none",cursor:"pointer",color:"#7a7a7a",fontSize:12,...F,transition:"color .15s",padding:0}}
              onMouseEnter={e=>e.currentTarget.style.color="#f0f0f0"} onMouseLeave={e=>e.currentTarget.style.color="#7a7a7a"}>
              {label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <button onClick={onLogin} style={{background:"none",border:"1px solid #252525",cursor:"pointer",fontSize:12,color:"#7a7a7a",...F,padding:"7px 15px",borderRadius:8,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#f0f0f0";e.currentTarget.style.borderColor="#444";}} onMouseLeave={e=>{e.currentTarget.style.color="#7a7a7a";e.currentTarget.style.borderColor="#252525";}}>
            Entrar
          </button>
          <button onClick={onLogin} style={{background:"rgba(249,115,22,.12)",border:"1px solid rgba(249,115,22,.35)",cursor:"pointer",fontSize:12,fontWeight:700,color:"#f97316",...F,padding:"7px 17px",borderRadius:8,display:"flex",alignItems:"center",gap:7,transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(249,115,22,.22)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(249,115,22,.12)"}>
            <Icon n="eye" size={13} color="#f97316"/>Acessar Demo
          </button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{position:"relative",textAlign:"center",padding:"88px 24px 80px",overflow:"hidden"}}>
        <GridBg/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(249,115,22,.08)",border:"1px solid rgba(249,115,22,.22)",borderRadius:20,padding:"5px 14px",marginBottom:24}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#f97316"}}/>
            <span style={{fontSize:11,color:"#f97316",fontWeight:600,letterSpacing:"0.04em"}}>Gestão de obras simplificada</span>
          </div>
          <h1 style={{fontSize:52,fontWeight:800,color:"#f0f0f0",lineHeight:1.08,letterSpacing:"-0.055em",marginBottom:20,...F}}>
            Controle total da sua<br/>
            <span style={{background:"linear-gradient(90deg,#f97316,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              obra, do início ao fim
            </span>
          </h1>
          <p style={{fontSize:15,color:"#7a7a7a",maxWidth:500,margin:"0 auto 44px",lineHeight:1.78}}>
            Estoque, alocação de máquinas, equipes e relatórios — tudo em um só lugar. Sem planilhas, sem retrabalho.
          </p>
          <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
            <button onClick={onLogin} style={{padding:"14px 30px",borderRadius:11,border:"none",background:"linear-gradient(90deg,#f97316,#ea6c0a)",color:"#0a0a0a",fontWeight:800,fontSize:14,cursor:"pointer",...F,display:"flex",alignItems:"center",gap:9,boxShadow:"0 8px 32px rgba(249,115,22,.38)"}}>
              <Icon n="eye" size={15} color="#0a0a0a"/>Acessar Demo Gratuito
            </button>
            <button onClick={()=>scrollTo("sec-features")} style={{padding:"14px 28px",borderRadius:11,border:"1px solid #252525",background:"rgba(255,255,255,.04)",color:"#f0f0f0",fontWeight:600,fontSize:14,cursor:"pointer",...F}}>
              Ver Funcionalidades ↓
            </button>
          </div>
          <p style={{fontSize:11,color:"#444",marginTop:18}}>Dados demo pré-carregados · Sem cadastro necessário</p>
        </div>
      </div>

      {/* ══ FUNCIONALIDADES ══ */}
      <div id="sec-features" style={{padding:"20px 52px 88px",maxWidth:1160,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:60}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:"5px 14px",marginBottom:18}}>
            <Icon n="checklist" size={12} color="#7a7a7a"/>
            <span style={{fontSize:10,fontWeight:700,color:"#7a7a7a",letterSpacing:"0.12em",textTransform:"uppercase"}}>Funcionalidades</span>
          </div>
          <h2 style={{fontSize:36,fontWeight:800,color:"#f0f0f0",letterSpacing:"-0.045em",marginBottom:12,...F}}>Tudo que sua obra precisa</h2>
          <p style={{fontSize:13,color:"#7a7a7a",maxWidth:420,margin:"0 auto",lineHeight:1.72}}>Prints reais do sistema. O que você vê abaixo é exatamente o que você usa.</p>
        </div>

        {FEATURES.map((f,i)=>{
          const flip=i%2!==0;
          return (
            <div key={f.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:56,alignItems:"center",marginBottom:i<FEATURES.length-1?88:0}}>
              <div style={{order:flip?2:1}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:7,background:`${f.cor}12`,border:`1px solid ${f.cor}30`,borderRadius:20,padding:"4px 12px",marginBottom:18}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:f.cor}}/>
                  <span style={{fontSize:10,fontWeight:700,color:f.cor,letterSpacing:"0.08em",textTransform:"uppercase"}}>{f.tag}</span>
                </div>
                <h3 style={{fontSize:26,fontWeight:800,color:"#f0f0f0",lineHeight:1.22,letterSpacing:"-0.035em",marginBottom:14,...F}}>{f.title}</h3>
                <p style={{fontSize:13.5,color:"#7a7a7a",lineHeight:1.78,marginBottom:24}}>{f.desc}</p>
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  {f.bullets.map(b=>(
                    <div key={b} style={{display:"flex",alignItems:"center",gap:11}}>
                      <div style={{width:19,height:19,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${f.cor}14`,border:`1px solid ${f.cor}35`}}>
                        <IcoChk c={f.cor}/>
                      </div>
                      <span style={{fontSize:13,color:"#7a7a7a",...F}}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{order:flip?1:2}}>
                <div style={{position:"relative"}}>
                  <div style={{position:"absolute",inset:-1,borderRadius:16,background:`radial-gradient(ellipse at 50% 100%, ${f.cor}18 0%, transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
                  <div style={{position:"relative",zIndex:1,borderRadius:14,overflow:"hidden",border:`1px solid ${f.cor}30`,boxShadow:`0 28px 72px rgba(0,0,0,.65), 0 0 40px ${f.cor}12`}}>
                    <div style={{background:"#161616",padding:"8px 12px",display:"flex",alignItems:"center",gap:7,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                      {["#ef4444","#fbbf24","#22c55e"].map(c=><div key={c} style={{width:8,height:8,borderRadius:"50%",background:c,opacity:.8}}/>)}
                      <div style={{flex:1,margin:"0 8px",background:"rgba(255,255,255,.05)",borderRadius:4,height:14,display:"flex",alignItems:"center",paddingLeft:8}}>
                        <span style={{fontSize:8,color:"#3a3a3a",fontFamily:"monospace"}}>app.obrasgest.com.br</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:10,background:`${f.cor}15`,border:`1px solid ${f.cor}30`}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:f.cor,animation:"obg-pulse 1.5s infinite"}}/>
                        <span style={{fontSize:7,color:f.cor,fontWeight:700,letterSpacing:"0.05em"}}>AO VIVO</span>
                      </div>
                    </div>
                    {f.screen}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ PLANOS ══ */}
      <div id="sec-pricing" style={{position:"relative",padding:"80px 24px 88px",overflow:"hidden",borderTop:"1px solid rgba(255,255,255,.04)"}}>
        <GridBg/>
        <div style={{position:"relative",zIndex:1,maxWidth:1060,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:52}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:"5px 14px",marginBottom:18}}>
              <Icon n="shield" size={12} color="#7a7a7a"/>
              <span style={{fontSize:10,fontWeight:700,color:"#7a7a7a",letterSpacing:"0.12em",textTransform:"uppercase"}}>Planos & Preços</span>
            </div>
            <h2 style={{fontSize:36,fontWeight:800,color:"#f0f0f0",letterSpacing:"-0.045em",marginBottom:12,...F}}>Preços flexíveis para<br/><span style={{color:"#f97316"}}>construtoras de todo porte</span></h2>
            <p style={{fontSize:13,color:"#7a7a7a",marginBottom:34,lineHeight:1.7}}>Sem taxas ocultas. Cancele quando quiser.</p>
            <div style={{display:"inline-flex",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:100,padding:5,gap:2}}>
              {[{id:"mensal",label:"Mensal"},{id:"anual",label:"Anual",tag:"−20%"}].map(t=>{
                const a=ciclo===t.id;
                return <button key={t.id} onClick={()=>setCiclo(t.id)} style={{padding:"8px 24px",borderRadius:100,border:"none",cursor:"pointer",fontSize:12,fontWeight:a?700:400,background:a?"#f97316":"transparent",color:a?"#0a0a0a":"#7a7a7a",display:"flex",alignItems:"center",gap:7,transition:"all .2s",...F}}>
                  {t.label}{t.tag&&<span style={{fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20,background:a?"rgba(0,0,0,.2)":"rgba(34,197,94,.15)",color:a?"rgba(0,0,0,.65)":"#22c55e"}}>{t.tag}</span>}
                </button>;
              })}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,alignItems:"start"}}>
            {PLANOS.map((p,i)=>{
              const mid=i===1; const h=hov===p.id;
              const preco=anual?p.preco.anual:p.preco.mensal;
              const economiaAno=(p.preco.mensal-p.preco.anual)*12;
              return (
                <div key={p.id} onMouseEnter={()=>setHov(p.id)} onMouseLeave={()=>setHov(null)}
                  style={{position:"relative",marginTop:mid?0:20,transition:"transform .25s",transform:h&&!mid?"translateY(-4px)":"translateY(0)"}}>
                  {mid&&<div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#f97316,#fbbf24)",color:"#0a0a0a",fontSize:10,fontWeight:800,padding:"4px 18px",borderRadius:20,letterSpacing:"0.07em",whiteSpace:"nowrap",zIndex:5,boxShadow:"0 4px 18px rgba(249,115,22,.5)"}}>★ MAIS POPULAR</div>}
                  <div style={{borderRadius:20,overflow:"hidden",border:`1.5px solid ${mid?"#f97316":h?p.cor+"90":"#252525"}`,background:mid?"linear-gradient(160deg,rgba(249,115,22,.08),rgba(249,115,22,.03))":"rgba(255,255,255,.025)",backdropFilter:"blur(12px)",boxShadow:mid?"0 0 50px rgba(249,115,22,.18),0 24px 60px rgba(0,0,0,.6)":h?"0 16px 48px rgba(0,0,0,.5)":"none",transition:"all .25s"}}>
                    <div style={{height:3,background:mid?"linear-gradient(90deg,#f97316,#fbbf24)":`linear-gradient(90deg,${p.cor}80,transparent)`}}/>
                    <div style={{padding:"26px 24px 24px"}}>
                      <div style={{width:50,height:50,borderRadius:"50%",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",background:mid?"linear-gradient(135deg,#f97316,#ea6c0a)":`linear-gradient(135deg,${p.cor}30,${p.cor}10)`,border:`2px solid ${mid?"#ea6c0a":p.cor}50`,boxShadow:mid?"0 0 24px rgba(249,115,22,.4)":h?`0 0 18px ${p.cor}40`:"none",transition:"box-shadow .25s"}}>
                        <Icon n={i===0?"building":i===1?"barchart":"shield"} size={20} color={mid?"#0a0a0a":p.cor}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
                        <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:p.cor,border:`1px solid ${p.cor}40`,padding:"3px 12px",borderRadius:20,...F}}>{p.nome}</span>
                      </div>
                      <div style={{textAlign:"center",marginBottom:4}}>
                        <span style={{fontSize:50,fontWeight:800,letterSpacing:"-0.05em",...F,color:mid?"#f97316":"#f0f0f0",lineHeight:1}}>R${preco}</span>
                        <span style={{fontSize:12,color:"#7a7a7a"}}> / mês</span>
                      </div>
                      <div style={{textAlign:"center",marginBottom:16,minHeight:16}}>
                        {anual?<span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>Economia de R${economiaAno}/ano</span>
                          :<span style={{fontSize:11,color:"#444"}}>ou R${p.preco.anual}/mês no anual</span>}
                      </div>
                      <div style={{height:"1px",background:`linear-gradient(90deg,transparent,${mid?"#f97316":p.cor}30,transparent)`,marginBottom:18}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:16}}>
                        {p.features.map(ff=>(
                          <div key={ff} style={{display:"flex",alignItems:"center",gap:9}}>
                            <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${p.cor}18`,border:`1px solid ${p.cor}40`}}><IcoChk c={p.cor}/></div>
                            <span style={{fontSize:11.5,color:"#7a7a7a",...F,lineHeight:1.3}}>{ff}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
                        {p.suporte.includes("email")&&<div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:20,background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.25)",fontSize:10,color:"#60a5fa",fontWeight:600}}><IcoEmail c="#60a5fa" s={10}/>E-mail</div>}
                        {p.suporte.includes("whatsapp")&&<div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:20,background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",fontSize:10,color:"#22c55e",fontWeight:600}}><IcoWpp c="#22c55e" s={10}/>WhatsApp</div>}
                      </div>
                      <button onClick={()=>onEscolher(p.id)} style={{width:"100%",padding:"12px",borderRadius:11,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9,fontSize:12,fontWeight:700,...F,transition:"all .2s",
                        background:mid?"linear-gradient(90deg,#f97316,#ea6c0a)":"rgba(255,255,255,.06)",color:mid?"#0a0a0a":p.cor,
                        boxShadow:mid?"0 6px 28px rgba(249,115,22,.45)":"none",...(h&&!mid?{background:`${p.cor}18`}:{})}}>
                        <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${mid?"rgba(0,0,0,.3)":p.cor+"60"}`,background:mid?"rgba(0,0,0,.12)":"transparent"}}>
                          <Icon n={i===0?"building":i===1?"barchart":"shield"} size={10} color={mid?"#0a0a0a":p.cor}/>
                        </div>
                        COMEÇAR AGORA
                      </button>
                      {mid&&anual&&<p style={{textAlign:"center",fontSize:10,color:"#444",marginTop:8}}>— Oferta por tempo limitado —</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {anual&&<p style={{textAlign:"center",marginTop:24,fontSize:11,color:"#444",opacity:.7}}>* Valores cobrados anualmente. Sem renovação automática sem aviso prévio.</p>}
        </div>
      </div>

      {/* ══ FAQ ══ */}
      <div id="sec-faq" style={{padding:"80px 52px 88px",maxWidth:820,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:"5px 14px",marginBottom:18}}>
            <Icon n="alert" size={12} color="#7a7a7a"/>
            <span style={{fontSize:10,fontWeight:700,color:"#7a7a7a",letterSpacing:"0.12em",textTransform:"uppercase"}}>Dúvidas Frequentes</span>
          </div>
          <h2 style={{fontSize:34,fontWeight:800,color:"#f0f0f0",letterSpacing:"-0.045em",...F}}>Tudo que você precisa saber</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {FAQS.map((f,i)=>{
            const open=faqOpen===i;
            return (
              <div key={i} onClick={()=>setFaqOpen(open?null:i)}
                style={{background:"rgba(255,255,255,.03)",border:`1px solid ${open?"rgba(249,115,22,.32)":"rgba(255,255,255,.07)"}`,borderRadius:13,overflow:"hidden",cursor:"pointer",transition:"border-color .2s"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",gap:16}}>
                  <span style={{fontSize:13,fontWeight:open?700:500,color:open?"#f97316":"#f0f0f0",...F,lineHeight:1.4,flex:1}}>{f.q}</span>
                  <div style={{color:open?"#f97316":"#7a7a7a",flexShrink:0,transition:"color .2s"}}><IcoChev open={open}/></div>
                </div>
                {open&&<div style={{padding:"0 20px 18px",borderTop:"1px solid rgba(255,255,255,.05)"}}>
                  <p style={{fontSize:12.5,color:"#7a7a7a",lineHeight:1.78,marginTop:14}}>{f.a}</p>
                </div>}
              </div>
            );
          })}
        </div>

        {/* CTA strip below FAQ */}
        <div style={{marginTop:52,padding:"28px 32px",background:"rgba(249,115,22,.06)",border:"1px solid rgba(249,115,22,.2)",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#f0f0f0",marginBottom:5,...F,letterSpacing:"-0.03em"}}>Ainda tem dúvidas?</div>
            <div style={{fontSize:12,color:"#7a7a7a"}}>Fale com a gente por e-mail ou WhatsApp — respondemos em até 24h.</div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",borderRadius:9,background:"rgba(96,165,250,.1)",border:"1px solid rgba(96,165,250,.25)",fontSize:12,color:"#60a5fa",fontWeight:600,cursor:"default"}}><IcoEmail c="#60a5fa" s={13}/>suporte@obrasgest.com.br</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",borderRadius:9,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",fontSize:12,color:"#22c55e",fontWeight:600,cursor:"default"}}><IcoWpp c="#22c55e" s={13}/>(11) 9 9999-0000</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{borderTop:"1px solid rgba(255,255,255,.05)",padding:"22px 52px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#f97316,#ea6c0a)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon n="building" size={11} color="#0a0a0a"/>
          </div>
          <span style={{fontWeight:800,fontSize:13,color:"#f97316",letterSpacing:"-0.04em"}}>obrasgest</span>
          <span style={{fontSize:11,color:"#444"}}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#7a7a7a"}}><IcoEmail c="#7a7a7a" s={11}/>suporte@obrasgest.com.br</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#7a7a7a"}}><IcoWpp c="#7a7a7a" s={11}/>WhatsApp: (11) 9 9999-0000</div>
        </div>
        <button onClick={onLogin} style={{background:"linear-gradient(90deg,#f97316,#ea6c0a)",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:"#0a0a0a",...F,padding:"9px 18px",borderRadius:8,display:"flex",alignItems:"center",gap:7,boxShadow:"0 4px 16px rgba(249,115,22,.3)"}}>
          <Icon n="eye" size={13} color="#0a0a0a"/>Acessar Demo
        </button>
      </div>

    </div>
  </>;
}


// ─── REGISTRO — TELA DE CADASTRO AUTÔNOMO ────────────────────────────────────
function Registro({tenants,planoInicial,onRegistrado,onVoltar,onVerPlanos}){
  const [step,setStep]=useState(planoInicial?2:1);
  const [plano,setPlano]=useState(planoInicial||null);
  const [form,setForm]=useState({razaoSocial:"",cnpj:"",email:"",nome:"",senha:"",confirma:""});
  const [err,setErr]=useState("");
  const [ok,setOk]=useState(false);

  const avancar=()=>{
    if(!plano){setErr("Selecione um plano.");return;}
    setErr(""); setStep(2);
  };
  const registrar=()=>{
    if(!form.razaoSocial||!form.cnpj||!form.email||!form.nome||!form.senha){setErr("Preencha todos os campos.");return;}
    if(form.senha!==form.confirma){setErr("Senhas não conferem.");return;}
    if(tenants.some(t=>t.email===form.email)){setErr("E-mail já cadastrado.");return;}
    const newTenant={
      id:`t${Date.now()}`,
      razaoSocial:form.razaoSocial,cnpj:form.cnpj,email:form.email,
      plano:plano,ativo:true,criadoEm:today(),
      users:[{id:1,tenantId:`t${Date.now()}`,nome:form.nome,email:form.email,senha:form.senha,role:"tenant_admin",ativo:true,permissoes:[],obrasAcesso:[]}],
      obras:[],etapasObra:[],maquinas:[],funcionarios:[],insumos:[],estoques:[],alocacoes:[],funcionarioObra:[],
    };
    onRegistrado(newTenant);
    setOk(true);
  };

  if(ok) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080808",...F}}>
      <div style={{background:"#111",border:`1px solid rgba(34,197,94,.25)`,borderRadius:20,padding:"52px 48px",maxWidth:440,textAlign:"center",boxShadow:"0 40px 80px rgba(0,0,0,.8)"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
          <Icon n="check" size={26} color={C.green}/>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:10,letterSpacing:"-0.04em"}}>Conta criada!</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:28,lineHeight:1.6}}>Sua empresa foi registrada com sucesso no plano <b style={{color:C.orange}}>{PLANOS.find(p=>p.id===plano)?.nome}</b>. Faça login para começar.</div>
        <Btn onClick={onVoltar} sx={{width:"100%",justifyContent:"center",padding:"12px"}}><Icon n="arrow" size={14}/>Fazer Login</Btn>
      </div>
    </div>
  );

  return <>
    <link href={FONT_URL} rel="stylesheet"/>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#080808}option{background:#1a1a1a;color:#f0f0f0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:8px}`}</style>
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,...F}}>
      <div style={{marginBottom:28,textAlign:"center"}}>
        <span style={{fontWeight:800,fontSize:22,color:C.orange,letterSpacing:"-0.05em"}}>obrasgest</span>
        <div style={{fontSize:11,color:C.dim,marginTop:3}}>Crie sua conta — é rápido e sem burocracia</div>
      </div>

      {/* Steps indicator */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:32}}>
        {["Escolha o Plano","Dados da Empresa"].map((s,i)=>{const a=i+1===step,d=i+1<step;return <div key={s} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,
            background:a||d?C.orange:"rgba(255,255,255,.05)",color:a||d?"#0a0a0a":C.dim,border:`1px solid ${a||d?C.orange:C.border}`}}>
            {d?<Icon n="check" size={11} color="#0a0a0a"/>:i+1}
          </div>
          <span style={{fontSize:11,color:a?C.text:C.dim,fontWeight:a?600:400}}>{s}</span>
          {i<1&&<div style={{width:32,height:1,background:C.border}}/>}
        </div>;})}
      </div>

      {step===1&&(
        <div style={{width:"100%",maxWidth:820}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
            {PLANOS.map(p=>{const sel=plano===p.id;return <div key={p.id} onClick={()=>setPlano(p.id)}
              style={{background:sel?"rgba(249,115,22,.06)":"#111",border:`2px solid ${sel?C.orange:C.border}`,borderRadius:16,padding:"22px 20px",cursor:"pointer",transition:"all .18s",position:"relative"}}>
              {p.popular&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:C.orange,color:"#0a0a0a",fontSize:10,fontWeight:800,padding:"3px 11px",borderRadius:20,letterSpacing:"0.03em"}}>POPULAR</div>}
              <div style={{fontSize:11,color:p.cor,fontWeight:700,marginBottom:6,letterSpacing:"0.05em",textTransform:"uppercase"}}>{p.nome}</div>
              <div style={{fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-0.05em",marginBottom:4}}>R$ {p.preco}<span style={{fontSize:12,fontWeight:400,color:C.muted}}>/mês</span></div>
              <div style={{fontSize:11,color:C.muted,marginBottom:14}}>{p.desc}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[`${p.usuarios===999?"Usuários ilimitados":`Até ${p.usuarios} usuários`}`,`${p.obras===999?"Obras ilimitadas":`Até ${p.obras} obras`}`,"Todas as funcionalidades","Suporte por e-mail"].map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:C.muted}}>
                    <Icon n="check" size={11} color={C.green}/>{f}
                  </div>
                ))}
              </div>
              {sel&&<div style={{position:"absolute",top:14,right:14,width:18,height:18,borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n="check" size={10} color="#0a0a0a"/>
              </div>}
            </div>;})}
          </div>
          {err&&<div style={{fontSize:11,color:C.red,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.15)",borderRadius:9,padding:"8px 13px",marginBottom:12}}>{err}</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={onVerPlanos||onVoltar} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,...F}}>← Ver planos</button>
            <Btn onClick={avancar} sx={{padding:"10px 22px"}}>Continuar <Icon n="arrow" size={13}/></Btn>
          </div>
        </div>
      )}

      {step===2&&(
        <div style={{width:"100%",maxWidth:480,background:"#111",border:`1px solid ${C.border}`,borderRadius:18,padding:"30px 28px",boxShadow:"0 32px 80px rgba(0,0,0,.8)"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:18,...F}}>Dados da Empresa</div>
          <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:14}}>
            <Inp label="Razão Social" placeholder="Construtora Exemplo Ltda" value={form.razaoSocial} onChange={e=>setForm(f=>({...f,razaoSocial:e.target.value}))}/>
            <Inp label="CNPJ" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e=>setForm(f=>({...f,cnpj:e.target.value}))}/>
            <Inp label="E-mail da empresa" type="email" placeholder="contato@empresa.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
            <div style={{height:1,background:C.borderLight,margin:"4px 0"}}/>
            <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.09em"}}>Dados do Administrador</div>
            <Inp label="Seu nome completo" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
            <Inp label="Senha de acesso" type="password" value={form.senha} onChange={e=>setForm(f=>({...f,senha:e.target.value}))}/>
            <Inp label="Confirmar senha" type="password" value={form.confirma} onChange={e=>setForm(f=>({...f,confirma:e.target.value}))}/>
          </div>
          {err&&<div style={{fontSize:11,color:C.red,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.15)",borderRadius:9,padding:"8px 13px",marginBottom:12}}>{err}</div>}
          <div style={{display:"flex",gap:9}}>
            <Btn v="secondary" onClick={()=>{setStep(1);setErr("");}}>← Voltar</Btn>
            <Btn onClick={registrar} sx={{flex:1,justifyContent:"center",padding:"10px"}}><Icon n="check" size={13}/>Criar minha conta</Btn>
          </div>
        </div>
      )}
    </div>
  </>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({tenants,onLogin,onRegistro}){
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [show,setShow]=useState(false);
  const [err,setErr]=useState("");
  const [focusField,setFocusField]=useState(null);
  const [loading,setLoading]=useState(false);

  const go=()=>{
    setLoading(true);
    setTimeout(()=>{
      for(const t of tenants){
        const u=t.users.find(u=>u.email===email&&u.senha===senha&&u.ativo);
        if(u&&t.ativo){onLogin(u,t);return;}
      }
      setErr("E-mail ou senha inválidos.");
      setLoading(false);
    },420);
  };

  const onKey=e=>{if(e.key==="Enter")go();};

  return <>
    <link href={FONT_URL} rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#060810}
      ::placeholder{color:#3a3a3a}
      ::-webkit-scrollbar{width:5px}
      ::-webkit-scrollbar-thumb{background:#252525;border-radius:8px}
      @keyframes lgn-in{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes lgn-glow{0%,100%{opacity:.5}50%{opacity:1}}
      @keyframes lgn-spin{to{transform:rotate(360deg)}}
    `}</style>

    {/* ── Full-screen background ── */}
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060810",position:"relative",overflow:"hidden",...F}}>

      {/* Ambient glows */}
      <div style={{position:"absolute",top:"-20%",left:"50%",transform:"translateX(-50%)",width:700,height:500,background:"radial-gradient(ellipse, rgba(249,115,22,.055) 0%, transparent 65%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-10%",left:"15%",width:400,height:400,background:"radial-gradient(ellipse, rgba(96,165,250,.03) 0%, transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"5%",right:"10%",width:300,height:300,background:"radial-gradient(ellipse, rgba(249,115,22,.03) 0%, transparent 70%)",pointerEvents:"none"}}/>

      {/* Subtle grid */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.04,pointerEvents:"none"}} preserveAspectRatio="xMidYMid slice">
        <defs><pattern id="lgrid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#f97316" strokeWidth="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#lgrid)"/>
      </svg>

      {/* ── Card ── */}
      <div style={{
        position:"relative",zIndex:1,width:"100%",maxWidth:400,
        animation:"lgn-in .55s cubic-bezier(.34,1.2,.64,1) both"
      }}>
        {/* card border glow */}
        <div style={{position:"absolute",inset:-1,borderRadius:22,background:`linear-gradient(160deg, rgba(249,115,22,.18) 0%, rgba(249,115,22,.04) 40%, transparent 70%)`,pointerEvents:"none"}}/>

        <div style={{
          position:"relative",
          background:"rgba(14,14,18,.82)",
          backdropFilter:"blur(28px)",
          WebkitBackdropFilter:"blur(28px)",
          border:"1px solid rgba(255,255,255,.07)",
          borderRadius:22,
          padding:"44px 40px 36px",
          boxShadow:"0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(249,115,22,.06)"
        }}>

          {/* ── Logo ── */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32,justifyContent:"center"}}>
            <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,#f97316,#ea6c0a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(249,115,22,.45)"}}>
              <Icon n="building" size={18} color="#0a0a0a"/>
            </div>
            <span style={{fontWeight:800,fontSize:22,color:"#f97316",letterSpacing:"-0.055em"}}>obrasgest</span>
          </div>

          {/* ── Headline ── */}
          <div style={{textAlign:"center",marginBottom:32}}>
            <h1 style={{fontSize:22,fontWeight:800,color:"#f0f0f0",letterSpacing:"-0.045em",lineHeight:1.2,marginBottom:8,...F}}>
              Bem-vindo de volta
            </h1>
            <p style={{fontSize:13,color:"#555",lineHeight:1.6}}>
              Acesse sua conta para continuar gerenciando suas obras
            </p>
          </div>

          {/* ── Fields ── */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:err?8:16}}>
            {/* email */}
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",transition:"opacity .2s",opacity:focusField==="email"||email?.length?0.9:0.4}}>
                <Icon n="eye" size={15} color={focusField==="email"?"#f97316":"#555"}/>
              </div>
              <input
                type="email" value={email}
                onChange={e=>{setEmail(e.target.value);setErr("");}}
                onFocus={()=>setFocusField("email")}
                onBlur={()=>setFocusField(null)}
                onKeyDown={onKey}
                placeholder="E-mail"
                style={{
                  width:"100%",background:focusField==="email"?"rgba(249,115,22,.05)":"rgba(255,255,255,.04)",
                  border:`1px solid ${focusField==="email"?"rgba(249,115,22,.45)":"rgba(255,255,255,.08)"}`,
                  borderRadius:12,padding:"13px 14px 13px 40px",
                  fontSize:13,color:"#f0f0f0",outline:"none",...F,
                  transition:"all .2s",
                }}
              />
            </div>
            {/* senha */}
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",transition:"opacity .2s",opacity:focusField==="senha"||senha?.length?0.9:0.4}}>
                <Icon n="key" size={15} color={focusField==="senha"?"#f97316":"#555"}/>
              </div>
              <input
                type={show?"text":"password"} value={senha}
                onChange={e=>{setSenha(e.target.value);setErr("");}}
                onFocus={()=>setFocusField("senha")}
                onBlur={()=>setFocusField(null)}
                onKeyDown={onKey}
                placeholder="Senha"
                style={{
                  width:"100%",background:focusField==="senha"?"rgba(249,115,22,.05)":"rgba(255,255,255,.04)",
                  border:`1px solid ${focusField==="senha"?"rgba(249,115,22,.45)":"rgba(255,255,255,.08)"}`,
                  borderRadius:12,padding:"13px 40px 13px 40px",
                  fontSize:13,color:"#f0f0f0",outline:"none",...F,
                  transition:"all .2s",
                }}
              />
              <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",display:"flex",padding:4,borderRadius:6}}>
                <Icon n={show?"eyeoff":"eye"} size={15} color={focusField==="senha"?"#7a7a7a":"#3a3a3a"}/>
              </button>
            </div>
          </div>

          {/* ── Erro ── */}
          {err&&<div style={{fontSize:11,color:"#ef4444",background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.15)",borderRadius:9,padding:"8px 13px",marginBottom:14,display:"flex",alignItems:"center",gap:7}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {err}
          </div>}

          {/* ── Botão Entrar ── */}
          <button onClick={go} disabled={loading}
            style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:loading?"rgba(249,115,22,.4)":"linear-gradient(90deg,#f97316,#ea6c0a)",
              color:"#0a0a0a",fontWeight:800,fontSize:14,cursor:loading?"default":"pointer",
              transition:"all .2s",...F,letterSpacing:"-0.02em",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              boxShadow:loading?"none":"0 6px 28px rgba(249,115,22,.35)",
            }}>
            {loading
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" style={{animation:"lgn-spin 0.8s linear infinite"}}><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              : "Entrar"}
          </button>

          {/* ── Divisor ── */}
          <div style={{display:"flex",alignItems:"center",gap:12,margin:"22px 0 18px"}}>
            <div style={{flex:1,height:"1px",background:"rgba(255,255,255,.06)"}}/>
            <span style={{fontSize:10,color:"#333",letterSpacing:"0.08em",textTransform:"uppercase"}}>ou</span>
            <div style={{flex:1,height:"1px",background:"rgba(255,255,255,.06)"}}/>
          </div>

          {/* ── Demo pill ── */}
          <button onClick={()=>{setEmail("admin@aurora.com");setSenha("admin123");}}
            style={{
              width:"100%",padding:"11px",borderRadius:12,
              background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
              color:"#7a7a7a",fontSize:12,fontWeight:600,cursor:"pointer",
              transition:"all .2s",...F,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.07)";e.currentTarget.style.color="#f0f0f0";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="#7a7a7a";}}>
            <Icon n="eye" size={13} color="currentColor"/>
            Usar credenciais de demonstração
          </button>

          {/* ── Link planos ── */}
          <p style={{textAlign:"center",fontSize:11,color:"#333",marginTop:22}}>
            Ainda não tem conta?{" "}
            <button onClick={onRegistro} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#f97316",fontWeight:700,...F,padding:0}}>
              Ver planos →
            </button>
          </p>
        </div>
      </div>
    </div>
  </>;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const MENU=[
  {id:"dashboard",label:"Dashboard",icon:"dashboard",perm:null},
  {id:"obras",label:"Obras",icon:"building",perm:"obras"},
  {id:"maquinas",label:"Máquinas",icon:"excavator",perm:"maquinas"},
  {id:"cadastros",label:"Cadastros",icon:"checklist",perm:null},
  {id:"estoque",label:"Estoque",icon:"warehouse",perm:"estoque"},
  {id:"alocacao",label:"Alocação",icon:"link",perm:"alocacao"},
  {id:"relatorios",label:"Relatórios",icon:"barchart",perm:"relatorios"},
  {id:"usuarios",label:"Usuários",icon:"key",perm:"usuarios"},
];

function NavItem({m,active,onClick}){
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",borderRadius:10,border:"none",width:"100%",textAlign:"left",cursor:"pointer",transition:"all .15s",
      background:active?"rgba(249,115,22,.1)":h?"rgba(255,255,255,.035)":"transparent",
      borderLeft:`2px solid ${active?C.orange:"transparent"}`}}>
    <Icon n={m.icon} size={15} color={active?C.orange:h?"rgba(255,255,255,.6)":C.muted}/>
    <span style={{fontSize:12,fontWeight:active?600:500,color:active?C.orange:h?"rgba(255,255,255,.6)":C.muted,...F,letterSpacing:"-0.01em"}}>{m.label}</span>
  </button>;
}

function Sidebar({page,setPage,user,onLogout,tenant}){
  const allowed=MENU.filter(m=>!m.perm||user.role==="tenant_admin"||(user.permissoes||[]).includes(m.perm));
  const [h,setH]=useState(false);
  const plano=PLANOS.find(p=>p.id===tenant?.plano);
  return <>
    <link href={FONT_URL} rel="stylesheet"/>
    <aside style={{width:210,minHeight:"100vh",display:"flex",flexDirection:"column",background:C.surface,borderRight:`1px solid ${C.borderLight}`,flexShrink:0}}>
      <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${C.borderLight}`}}>
        <span style={{fontWeight:800,fontSize:17,color:C.orange,letterSpacing:"-0.05em",...F}}>obrasgest</span>
        {tenant&&<div style={{fontSize:10,color:C.muted,marginTop:3,...F,letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tenant.razaoSocial}</div>}
        {plano&&<div style={{marginTop:5,display:"inline-flex",alignItems:"center",gap:4,background:`${plano.cor}14`,border:`1px solid ${plano.cor}30`,borderRadius:6,padding:"2px 7px"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:plano.cor,flexShrink:0}}/>
          <span style={{fontSize:9,fontWeight:700,color:plano.cor,letterSpacing:"0.04em",textTransform:"uppercase"}}>{plano.nome}</span>
        </div>}
      </div>
      <nav style={{flex:1,padding:"8px 7px",display:"flex",flexDirection:"column",gap:1,overflowY:"auto"}}>
        {allowed.map(m=><NavItem key={m.id} m={m} active={page===m.id} onClick={()=>setPage(m.id)}/>)}
      </nav>
      <div style={{padding:"10px 13px 14px",borderTop:`1px solid ${C.borderLight}`}}>
        <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.55)",marginBottom:1,...F}}>{user.nome}</div>
        <div style={{fontSize:10,color:C.dim,marginBottom:9,display:"flex",alignItems:"center",gap:5}}>
          <Icon n="shield" size={10} color={user.role==="tenant_admin"?C.orange:C.dim}/><span>{user.role==="tenant_admin"?"Administrador":"Usuário"}</span>
        </div>
        <button onClick={onLogout} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
          style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:h?"rgba(255,255,255,.5)":C.dim,background:"none",border:"none",cursor:"pointer",transition:"color .15s",...F,padding:0}}>
          <Icon n="logout" size={12} color={h?"rgba(255,255,255,.5)":C.dim}/> Sair
        </button>
      </div>
    </aside>
  </>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({data,userId,isMaster}){
  const {obras,maquinas,funcionarios,insumos,estoques,alocacoes,funcionarioObra,etapasObra,users}=data;
  const [filtro,setFiltro]=useState("all");
  const user=users.find(u=>u.id===userId);
  const acess=isMaster?obras:obras.filter(o=>(user?.obrasAcesso||[]).includes(o.id));
  const filt=filtro==="all"?acess:acess.filter(o=>o.id===parseInt(filtro));
  const totAtras=filt.reduce((s,o)=>s+etapasObra.filter(e=>e.obraId===o.id&&isAtrasada(e)).length,0);
  const kpis=[
    {l:"Obras Ativas",v:filt.filter(o=>o.status==="Em andamento").length,i:"building",col:C.orange,acc:true},
    {l:"Etapas Atrasadas",v:totAtras,i:"alert",col:totAtras>0?C.red:C.green,warn:totAtras>0},
    {l:"Custo Total",v:fmt(filt.reduce((s,o)=>s+calcIns(o.id,estoques,insumos)+calcMaq(o.id,alocacoes,maquinas)+calcMO(o.id,funcionarioObra,funcionarios),0)),i:"money",col:C.blue},
    {l:"Estoque Disponível",v:fmt(filt.reduce((s,o)=>s+estoques.filter(e=>e.obraId===o.id).reduce((ss,e)=>{const i=insumos.find(x=>x.id===e.insumoId);return ss+(i?i.custoUnit*(e.quantEntrada-e.quantUtilizado):0);},0),0)),i:"warehouse",col:"#a78bfa"},
  ];
  return <div>
    <Hdr title="Dashboard" sub={new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
      action={<DSel value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="all">Todas as obras</option>{acess.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</DSel>}/>
    {totAtras>0&&<div style={{marginBottom:18,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.18)",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
      <Icon n="alert" size={18} color={C.red}/><div>
        <div style={{fontWeight:700,color:C.red,fontSize:13,...F}}>{totAtras} etapa{totAtras>1?"s":""} atrasada{totAtras>1?"s":""}!</div>
        <div style={{fontSize:11,color:"rgba(239,68,68,.6)",...F}}>Etapas fora do prazo previsto.</div>
      </div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:22}}>
      {kpis.map(k=><Card key={k.l} style={{padding:16}}>
        <div style={{width:34,height:34,borderRadius:10,background:`${k.col}18`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
          <Icon n={k.i} size={16} color={k.col}/>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:k.warn?C.red:k.acc?C.orange:C.text,...F,letterSpacing:"-0.04em",marginBottom:3}}>{k.v}</div>
        <div style={{fontSize:11,color:C.muted,...F}}>{k.l}</div>
      </Card>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
      {filt.map(obra=>{
        const et=etapasObra.filter(e=>e.obraId===obra.id);
        const prog=calcProg(obra.id,etapasObra);
        const atrs=et.filter(e=>isAtrasada(e));
        const ea=et.find(e=>e.progresso>0&&e.progresso<100);
        const cT=calcIns(obra.id,estoques,insumos)+calcMaq(obra.id,alocacoes,maquinas)+calcMO(obra.id,funcionarioObra,funcionarios);
        const pOrc=Math.min(100,Math.round(cT/(obra.orcamento||1)*100));
        const sc={Concluída:"green","Em andamento":"orange",Pausada:"yellow"};
        return <Card key={obra.id}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div style={{flex:1,minWidth:0,paddingRight:8}}>
              <div style={{fontWeight:700,fontSize:13,color:C.text,...F,letterSpacing:"-0.02em",marginBottom:3}}>{obra.nome}</div>
              <div style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:4}}><Icon n="pin" size={10} color={C.dim}/>{obra.local}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
              <Badge v={sc[obra.status]||"default"} dot>{obra.status}</Badge>
              {atrs.length>0&&<Badge v="red" dot>{atrs.length} atraso{atrs.length>1?"s":""}</Badge>}
            </div>
          </div>
          {[{l:"Progresso",v:prog,c:C.orange},{l:"Orçamento",v:pOrc,c:pOrc>90?C.red:pOrc>70?C.yellow:C.green}].map(b=><div key={b.l} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:10,color:C.muted}}>{b.l}</span>
              <span style={{fontSize:10,fontWeight:700,color:b.v>90&&b.l==="Orçamento"?C.red:C.text}}>{b.v}%</span>
            </div>
            <Bar val={b.v} color={b.c}/>
          </div>)}
          <div style={{borderTop:`1px solid ${C.borderLight}`,paddingTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11,color:C.muted}}>
            <span>Custo: <b style={{color:C.text}}>{fmt(cT)}</b></span>
            <span>Meta: <b style={{color:C.text}}>{fmt(obra.orcamento)}</b></span>
            {ea&&(()=>{const tp=TIPOS_ETAPA.find(t=>t.id===ea.tipoEtapaId);return <span style={{gridColumn:"span 2",display:"flex",alignItems:"center",gap:4}}><Icon n={tp?.icon||"checklist"} size={10} color={C.orange}/>Etapa: <b style={{color:C.text}}>{tp?.nome}</b></span>})()}
          </div>
          {atrs.length>0&&<div style={{marginTop:10,background:"rgba(239,68,68,.05)",border:"1px solid rgba(239,68,68,.12)",borderRadius:9,padding:"9px 11px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:5,display:"flex",alignItems:"center",gap:5}}><Icon n="alert" size={11} color={C.red}/>Atrasadas</div>
            {atrs.map(e=>{const tp=TIPOS_ETAPA.find(t=>t.id===e.tipoEtapaId);return <div key={e.id} style={{fontSize:11,color:"rgba(239,68,68,.65)",marginBottom:2}}>· {tp?.nome} — {e.dataFimP}</div>;})}
          </div>}
        </Card>;
      })}
    </div>
  </div>;
}

// ─── TIPOS DE ETAPA (lista) ───────────────────────────────────────────────────
function TiposEtapa({canWrite}){
  const [tipos,setTipos]=useState(TIPOS_ETAPA);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({});
  const save=()=>{if(form.id)setTipos(t=>t.map(x=>x.id===form.id?form:x));else setTipos(t=>[...t,{...form,id:nextId(t)}]);setModal(false);};
  const del=id=>{if(confirm("Remover tipo?"))setTipos(t=>t.filter(x=>x.id!==id));};
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em"}}>Tipos de Etapa</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Catálogo padrão com tempo estimado</div>
      </div>
      {canWrite&&<Btn onClick={()=>{setForm({});setModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="plus" size={12}/>Novo Tipo</Btn>}
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:"rgba(255,255,255,.02)"}}>
          {["","Nome","Tempo Padrão","#",""].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F,whiteSpace:"nowrap"}}>{h}</th>)}
        </tr></thead>
        <tbody>{tipos.map(t=>(
          <tr key={t.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
            <td style={{padding:"10px 14px",width:36}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n={t.icon||"checklist"} size={13} color={C.orange}/>
              </div>
            </td>
            <td style={{padding:"10px 14px",fontWeight:600,color:C.text,...F}}>{t.nome}</td>
            <td style={{padding:"10px 14px"}}>
              {t.tempoPadrao
                ? <span style={{display:"flex",alignItems:"center",gap:5,color:C.muted,fontSize:11}}><Icon n="clock" size={11} color={C.dim}/>{t.tempoPadrao} dias</span>
                : <span style={{color:C.dim,fontSize:11}}>—</span>}
            </td>
            <td style={{padding:"10px 14px",color:C.dim,fontSize:11}}>#{t.id}</td>
            <td style={{padding:"10px 14px",textAlign:"right"}}>
              {canWrite&&<div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                <button onClick={()=>{setForm({...t});setModal(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex",padding:3}}><Icon n="edit" size={12} color={C.dim}/></button>
                <button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex",padding:3}}><Icon n="trash" size={12} color={C.dim}/></button>
              </div>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </Card>
    {modal&&<Modal title={form.id?"Editar Tipo":"Novo Tipo de Etapa"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <Inp label="Nome da Etapa" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <Inp label="Tempo Padrão de Conclusão (dias)" type="number" placeholder="Ex: 30" value={form.tempoPadrao||""} onChange={e=>setForm(f=>({...f,tempoPadrao:e.target.value?parseInt(e.target.value):null}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={save}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── OBRAS ───────────────────────────────────────────────────────────────────
function Obras({data,setData,canWrite}){
  const {obras,etapasObra}=data;
  const [modal,setModal]=useState(null);
  const [etModal,setEtModal]=useState(false);
  const [form,setForm]=useState({});
  const [etForm,setEtForm]=useState({});
  const [etObraId,setEtObraId]=useState(null);
  const saveObra=()=>{if(modal==="new")setData(d=>({...d,obras:[...d.obras,{...form,id:nextId(d.obras)}]}));else setData(d=>({...d,obras:d.obras.map(o=>o.id===form.id?form:o)}));setModal(null);};
  const saveEt=()=>{const e={...etForm,obraId:etObraId,id:etForm.id||nextId(data.etapasObra),progresso:etForm.progresso||0,status:etForm.status||"Pendente"};if(etForm.id)setData(d=>({...d,etapasObra:d.etapasObra.map(x=>x.id===e.id?e:x)}));else setData(d=>({...d,etapasObra:[...d.etapasObra,e]}));setEtModal(false);};
  const delEt=id=>{if(confirm("Remover etapa?"))setData(d=>({...d,etapasObra:d.etapasObra.filter(e=>e.id!==id)}));};
  const delObra=id=>{if(confirm("Remover obra?"))setData(d=>({...d,obras:d.obras.filter(o=>o.id!==id),etapasObra:d.etapasObra.filter(e=>e.obraId!==id)}));};
  const sc={Planejada:"default","Em andamento":"orange",Pausada:"yellow",Concluída:"green"};
  return <div>
    <Hdr title="Obras" action={canWrite&&<Btn onClick={()=>{setForm({status:"Planejada"});setModal("new");}}><Icon n="plus" size={13}/>Nova Obra</Btn>}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
      {obras.map(o=>{
        const et=etapasObra.filter(e=>e.obraId===o.id);
        const prog=calcProg(o.id,etapasObra);
        const atrs=et.filter(e=>isAtrasada(e)).length;
        return <Card key={o.id}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:9}}>
            <div style={{fontWeight:700,fontSize:13,color:C.text,...F,letterSpacing:"-0.02em",paddingRight:8}}>{o.nome}</div>
            <Badge v={sc[o.status]||"default"} dot>{o.status}</Badge>
          </div>
          <div style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:4,marginBottom:2}}><Icon n="pin" size={10} color={C.dim}/>{o.local}</div>
          <div style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:4,marginBottom:12}}><Icon n="user" size={10} color={C.dim}/>{o.responsavel} · {fmt(o.orcamento)}</div>
          <div style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:C.muted}}>Progresso</span><span style={{fontSize:10,fontWeight:700,color:C.text}}>{prog}%</span></div>
            <Bar val={prog} color={C.orange}/>
          </div>
          <div style={{fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
            <Icon n="cal" size={10} color={C.dim}/>{o.inicio} → {o.previsaoFim}
            {atrs>0&&<Badge v="red">{atrs} atraso{atrs>1?"s":""}</Badge>}
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <Btn v="outline" onClick={()=>setEtObraId(o.id)} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="checklist" size={12}/>Etapas ({et.length})</Btn>
            {canWrite&&<><Btn v="secondary" onClick={()=>{setForm({...o});setModal("edit");}} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="edit" size={12}/>Editar</Btn><Btn v="danger" onClick={()=>delObra(o.id)} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="trash" size={12}/></Btn></>}
          </div>
        </Card>;
      })}
    </div>
    {modal&&<Modal title={modal==="new"?"Nova Obra":"Editar Obra"} onClose={()=>setModal(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Inp label="Nome" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <Inp label="Local" value={form.local||""} onChange={e=>setForm(f=>({...f,local:e.target.value}))}/>
        <Inp label="Responsável" value={form.responsavel||""} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Início" type="date" value={form.inicio||""} onChange={e=>setForm(f=>({...f,inicio:e.target.value}))}/>
          <Inp label="Previsão de Fim" type="date" value={form.previsaoFim||""} onChange={e=>setForm(f=>({...f,previsaoFim:e.target.value}))}/>
        </div>
        <Inp label="Orçamento (R$)" type="number" value={form.orcamento||""} onChange={e=>setForm(f=>({...f,orcamento:parseFloat(e.target.value)}))}/>
        <Sel label="Status" value={form.status||"Planejada"} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
          {["Planejada","Em andamento","Pausada","Concluída"].map(s=><option key={s}>{s}</option>)}
        </Sel>
        <Txta label="Descrição" rows={3} value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={saveObra}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
    {etObraId!==null&&(()=>{
      const obra=obras.find(o=>o.id===etObraId);
      const ets=etapasObra.filter(e=>e.obraId===etObraId).sort((a,b)=>new Date(a.dataInicioP)-new Date(b.dataInicioP));
      const smap={Concluída:"green","Em andamento":"orange",Atrasada:"red",Pendente:"default",Pausada:"yellow"};
      return <Modal title={`Etapas — ${obra?.nome}`} onClose={()=>setEtObraId(null)} wide>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
          {canWrite&&<Btn onClick={()=>{setEtForm({obraId:etObraId});setEtModal(true);}}><Icon n="plus" size={13}/>Adicionar Etapa</Btn>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {ets.map(e=>{
            const tp=TIPOS_ETAPA.find(t=>t.id===e.tipoEtapaId);
            const at=isAtrasada(e);
            return <div key={e.id} style={{background:at?"rgba(239,68,68,.05)":"rgba(255,255,255,.02)",border:`1px solid ${at?"rgba(239,68,68,.18)":C.borderLight}`,borderRadius:11,padding:13}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:8,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon n={tp?.icon||"checklist"} size={13} color={C.orange}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:C.text,...F}}>{tp?.nome}</span>
                  {at&&<Badge v="red"><Icon n="alert" size={9}/>Atrasada</Badge>}
                  <Badge v={smap[e.status]||"default"}>{e.status}</Badge>
                </div>
                {canWrite&&<div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setEtForm({...e});setEtModal(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex"}}><Icon n="edit" size={12} color={C.dim}/></button>
                  <button onClick={()=>delEt(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex"}}><Icon n="trash" size={12} color={C.dim}/></button>
                </div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,fontSize:11,color:C.muted,marginBottom:9}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><Icon n="cal" size={10} color={C.dim}/>Prev: {e.dataInicioP} → {e.dataFimP}</span>
                {e.dataInicioR&&<span style={{display:"flex",alignItems:"center",gap:4}}><Icon n="check" size={10} color={C.green}/>Real: {e.dataInicioR} → {e.dataFimR||"Em andamento"}</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{flex:1}}><Bar val={e.progresso} color={at?C.red:e.progresso===100?C.green:C.orange}/></div>
                <span style={{fontSize:11,color:C.muted,width:26,textAlign:"right"}}>{e.progresso}%</span>
              </div>
            </div>;
          })}
          {!ets.length&&<div style={{textAlign:"center",padding:"40px 0",color:C.dim,fontSize:12}}>Nenhuma etapa adicionada.</div>}
        </div>
      </Modal>;
    })()}
    {etModal&&<Modal title={etForm.id?"Editar Etapa":"Adicionar Etapa"} onClose={()=>setEtModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Sel label="Tipo de Etapa" value={etForm.tipoEtapaId||""} onChange={e=>setEtForm(f=>({...f,tipoEtapaId:parseInt(e.target.value)}))}>
          <option value="">Selecione...</option>{TIPOS_ETAPA.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Início Previsto" type="date" value={etForm.dataInicioP||""} onChange={e=>setEtForm(f=>({...f,dataInicioP:e.target.value}))}/>
          <Inp label="Fim Previsto" type="date" value={etForm.dataFimP||""} onChange={e=>setEtForm(f=>({...f,dataFimP:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Início Real" type="date" value={etForm.dataInicioR||""} onChange={e=>setEtForm(f=>({...f,dataInicioR:e.target.value}))}/>
          <Inp label="Fim Real" type="date" value={etForm.dataFimR||""} onChange={e=>setEtForm(f=>({...f,dataFimR:e.target.value}))}/>
        </div>
        <Sel label="Status" value={etForm.status||"Pendente"} onChange={e=>setEtForm(f=>({...f,status:e.target.value}))}>
          {["Pendente","Em andamento","Concluída","Atrasada","Pausada"].map(s=><option key={s}>{s}</option>)}
        </Sel>
        <Fld label={`Progresso: ${etForm.progresso||0}%`}>
          <input type="range" min="0" max="100" value={etForm.progresso||0} onChange={e=>setEtForm(f=>({...f,progresso:parseInt(e.target.value)}))} style={{width:"100%",accentColor:C.orange}}/>
        </Fld>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setEtModal(false)}>Cancelar</Btn><Btn onClick={saveEt}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── MÁQUINAS ────────────────────────────────────────────────────────────────
function Maquinas({data,setData,canWrite}){
  const {maquinas}=data;
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({});
  const save=()=>{if(form.id)setData(d=>({...d,maquinas:d.maquinas.map(m=>m.id===form.id?form:m)}));else setData(d=>({...d,maquinas:[...d.maquinas,{...form,id:nextId(d.maquinas)}]}));setModal(false);};
  const del=id=>{if(confirm("Remover?"))setData(d=>({...d,maquinas:d.maquinas.filter(m=>m.id!==id)}));};
  return <div>
    <Hdr title="Máquinas e Equipamentos" action={canWrite&&<Btn onClick={()=>{setForm({});setModal(true);}}><Icon n="plus" size={13}/>Nova Máquina</Btn>}/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
      {maquinas.map(m=><Card key={m.id}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
          <div style={{width:38,height:38,borderRadius:11,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon n="excavator" size={17} color={C.orange}/>
          </div>
          <Badge v="default">{m.tipo}</Badge>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em",marginBottom:3}}>{m.nome}</div>
        <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Placa: {m.placa}</div>
        <div style={{fontSize:13,fontWeight:700,color:C.orange,marginBottom:12}}>{fmt(m.custoHora)}<span style={{fontSize:10,fontWeight:400,color:C.muted}}>/hora</span></div>
        {canWrite&&<div style={{display:"flex",gap:7,borderTop:`1px solid ${C.borderLight}`,paddingTop:11}}>
          <Btn v="secondary" onClick={()=>{setForm({...m});setModal(true);}} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="edit" size={12}/>Editar</Btn>
          <Btn v="danger" onClick={()=>del(m.id)} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="trash" size={12}/>Remover</Btn>
        </div>}
      </Card>)}
    </div>
    {modal&&<Modal title={form.id?"Editar Máquina":"Nova Máquina"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Inp label="Nome" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <Inp label="Tipo" value={form.tipo||""} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}/>
        <Inp label="Placa / Identificação" value={form.placa||""} onChange={e=>setForm(f=>({...f,placa:e.target.value}))}/>
        <Inp label="Custo/Hora (R$)" type="number" value={form.custoHora||""} onChange={e=>setForm(f=>({...f,custoHora:parseFloat(e.target.value)}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={save}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── PESSOAS (lista) ─────────────────────────────────────────────────────────
function Funcionarios({data,setData,canWrite}){
  const {funcionarios,obras,funcionarioObra}=data;
  const [modal,setModal]=useState(false);
  const [vincModal,setVincModal]=useState(false);
  const [form,setForm]=useState({});
  const [vincForm,setVincForm]=useState({});
  const save=()=>{if(form.id)setData(d=>({...d,funcionarios:d.funcionarios.map(f=>f.id===form.id?form:f)}));else setData(d=>({...d,funcionarios:[...d.funcionarios,{...form,id:nextId(d.funcionarios),ativo:true}]}));setModal(false);};
  const saveVinc=()=>{setData(d=>({...d,funcionarioObra:[...d.funcionarioObra,{...vincForm,id:nextId(d.funcionarioObra),obraId:parseInt(vincForm.obraId),funcionarioId:parseInt(vincForm.funcionarioId),dias:parseFloat(vincForm.dias)}]}));setVincModal(false);};
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em"}}>Pessoas</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Funcionários e prestadores</div>
      </div>
      {canWrite&&<div style={{display:"flex",gap:8}}>
        <Btn v="outline" onClick={()=>{setVincForm({});setVincModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="link" size={12}/>Vincular a Obra</Btn>
        <Btn onClick={()=>{setForm({tipo:"Funcionário"});setModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="plus" size={12}/>Nova Pessoa</Btn>
      </div>}
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:"rgba(255,255,255,.02)"}}>
          {["","Nome","Cargo","Tipo","CPF/CNPJ","Valor/dia","Obras",""].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F,whiteSpace:"nowrap"}}>{h}</th>)}
        </tr></thead>
        <tbody>{funcionarios.map(f=>{
          const vincs=funcionarioObra.filter(v=>v.funcionarioId===f.id);
          return <tr key={f.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
            <td style={{padding:"10px 14px",width:36}}>
              <div style={{width:32,height:32,borderRadius:10,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:C.orange,...F}}>{f.nome[0]}</div>
            </td>
            <td style={{padding:"10px 14px",fontWeight:600,color:C.text,...F}}>{f.nome}</td>
            <td style={{padding:"10px 14px",color:C.muted}}>{f.cargo}</td>
            <td style={{padding:"10px 14px"}}><Badge v={f.tipo==="Prestador"?"blue":"default"}>{f.tipo}</Badge></td>
            <td style={{padding:"10px 14px",color:C.muted,fontFamily:"monospace",fontSize:11}}>{f.cpf}</td>
            <td style={{padding:"10px 14px",fontWeight:700,color:C.orange}}>{fmt(f.salarioDia)}</td>
            <td style={{padding:"10px 14px"}}>
              {vincs.length>0
                ? <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{vincs.map(v=>{const ob=obras.find(o=>o.id===v.obraId);return ob?<Badge key={v.id} v="default">{ob.nome.split(" ")[0]}</Badge>:null;})}</div>
                : <span style={{color:C.dim,fontSize:11}}>—</span>}
            </td>
            <td style={{padding:"10px 14px",textAlign:"right"}}>
              {canWrite&&<button onClick={()=>{setForm({...f});setModal(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex",padding:3}}><Icon n="edit" size={12} color={C.dim}/></button>}
            </td>
          </tr>;
        })}</tbody>
      </table>
    </Card>
    {modal&&<Modal title={form.id?"Editar Pessoa":"Nova Pessoa"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Inp label="Nome" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <Sel label="Tipo" value={form.tipo||"Funcionário"} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option>Funcionário</option><option>Prestador</option></Sel>
        <Inp label="Cargo / Função" value={form.cargo||""} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))}/>
        <Inp label="CPF / CNPJ" value={form.cpf||""} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))}/>
        <Inp label="Valor/Dia (R$)" type="number" value={form.salarioDia||""} onChange={e=>setForm(f=>({...f,salarioDia:parseFloat(e.target.value)}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={save}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
    {vincModal&&<Modal title="Vincular Pessoa a Obra" onClose={()=>setVincModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Sel label="Pessoa" value={vincForm.funcionarioId||""} onChange={e=>setVincForm(f=>({...f,funcionarioId:e.target.value}))}><option value="">Selecione...</option>{funcionarios.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</Sel>
        <Sel label="Obra" value={vincForm.obraId||""} onChange={e=>setVincForm(f=>({...f,obraId:e.target.value}))}><option value="">Selecione...</option>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</Sel>
        <Inp label="Dias Trabalhados" type="number" value={vincForm.dias||""} onChange={e=>setVincForm(f=>({...f,dias:e.target.value}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setVincModal(false)}>Cancelar</Btn><Btn onClick={saveVinc}><Icon n="check" size={13}/>Vincular</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── INSUMOS (lista) ─────────────────────────────────────────────────────────
function Insumos({data,setData,canWrite}){
  const {insumos,obras}=data;
  const [modal,setModal]=useState(false);
  const [impModal,setImpModal]=useState(false);
  const [form,setForm]=useState({});
  const [step,setStep]=useState(1);
  const [impData,setImpData]=useState(null);
  const [impObra,setImpObra]=useState("");
  const [loading,setLoading]=useState(false);
  const fileRef=useRef();
  const save=()=>{if(form.id)setData(d=>({...d,insumos:d.insumos.map(i=>i.id===form.id?form:i)}));else setData(d=>({...d,insumos:[...d.insumos,{...form,id:nextId(d.insumos)}]}));setModal(false);};
  const onFile=e=>{const file=e.target.files?.[0];if(!file)return;setLoading(true);const ext=file.name.split(".").pop().toUpperCase();setTimeout(()=>{setImpData({fornecedor:"Distribuidora Santos Ltda",nfe:`NFE-${Math.floor(Math.random()*90000+10000)}`,data:today(),itens:[{nome:"Cimento CP-II 50kg",unidade:"saco 50kg",quantidade:100,valorUnit:39.90,categoria:"Material"},{nome:"Areia Fina Lavada",unidade:"m³",quantidade:15,valorUnit:110.00,categoria:"Material"},{nome:"Brita 1",unidade:"m³",quantidade:10,valorUnit:130.00,categoria:"Material"}],arquivo:file.name,tipo:ext});setLoading(false);setStep(2);},1800);};
  const confirmImp=()=>{if(!impObra)return;const oId=parseInt(impObra);impData.itens.forEach(item=>{setData(d=>{let iId=d.insumos.find(i=>i.nome===item.nome)?.id;let ni=d.insumos;if(!iId){iId=nextId(d.insumos);ni=[...d.insumos,{id:iId,nome:item.nome,unidade:item.unidade,custoUnit:item.valorUnit,categoria:item.categoria,fornecedor:impData.fornecedor}];}const ex=d.estoques.find(e=>e.obraId===oId&&e.insumoId===iId);const ne=ex?d.estoques.map(e=>e.id===ex.id?{...e,quantEntrada:e.quantEntrada+item.quantidade}:e):[...d.estoques,{id:nextId(d.estoques),obraId:oId,insumoId:iId,quantEntrada:item.quantidade,quantUtilizado:0,dataMov:today(),origem:`Import. ${impData.tipo} - ${impData.nfe}`}];return{...d,insumos:ni,estoques:ne};});});setImpModal(false);setStep(1);setImpData(null);setImpObra("");};
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em"}}>Insumos</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Catálogo de materiais</div>
      </div>
      {canWrite&&<div style={{display:"flex",gap:8}}>
        <Btn v="outline" onClick={()=>{setStep(1);setImpData(null);setImpObra("");setImpModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="upload" size={12}/>Importar NF</Btn>
        <Btn onClick={()=>{setForm({categoria:"Material"});setModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="plus" size={12}/>Novo Insumo</Btn>
      </div>}
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:"rgba(255,255,255,.02)"}}>
          {["","Nome","Unidade","Custo Unit.","Categoria","Fornecedor",""].map((h,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F,whiteSpace:"nowrap"}}>{h}</th>)}
        </tr></thead>
        <tbody>{insumos.map(i=>(
          <tr key={i.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
            <td style={{padding:"10px 14px",width:36}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon n="cube" size={13} color={C.orange}/>
              </div>
            </td>
            <td style={{padding:"10px 14px",fontWeight:600,color:C.text,...F}}>{i.nome}</td>
            <td style={{padding:"10px 14px",color:C.muted}}>{i.unidade}</td>
            <td style={{padding:"10px 14px",fontWeight:700,color:C.orange}}>{fmt(i.custoUnit)}</td>
            <td style={{padding:"10px 14px"}}><Badge v="default">{i.categoria}</Badge></td>
            <td style={{padding:"10px 14px",color:C.muted}}>{i.fornecedor}</td>
            <td style={{padding:"10px 14px",textAlign:"right"}}>
              {canWrite&&<button onClick={()=>{setForm({...i});setModal(true);}} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex",padding:3}}><Icon n="edit" size={12} color={C.dim}/></button>}
            </td>
          </tr>
        ))}{!insumos.length&&<tr><td colSpan={7} style={{padding:"40px",textAlign:"center",color:C.dim,fontSize:12}}>Nenhum insumo cadastrado.</td></tr>}</tbody>
      </table>
    </Card>
    {modal&&<Modal title={form.id?"Editar Insumo":"Novo Insumo"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Inp label="Nome" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Unidade" value={form.unidade||""} onChange={e=>setForm(f=>({...f,unidade:e.target.value}))}/>
          <Inp label="Custo Unit. (R$)" type="number" value={form.custoUnit||""} onChange={e=>setForm(f=>({...f,custoUnit:parseFloat(e.target.value)}))}/>
        </div>
        <Inp label="Categoria" value={form.categoria||""} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}/>
        <Inp label="Fornecedor" value={form.fornecedor||""} onChange={e=>setForm(f=>({...f,fornecedor:e.target.value}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={save}><Icon n="check" size={13}/>Salvar</Btn></div>
      </div>
    </Modal>}
    {impModal&&<Modal title="Importar Nota Fiscal" onClose={()=>setImpModal(false)} wide>
      {step===1&&<div>
        <div style={{background:C.orangeDim,border:"1px solid rgba(249,115,22,.2)",borderRadius:10,padding:"11px 14px",marginBottom:18,fontSize:12,color:"rgba(249,115,22,.8)"}}>
          Formatos suportados: <b>XML (NF-e)</b>, <b>PDF</b>, <b>Excel (.xlsx)</b>. Os itens serão vinculados ao estoque da obra selecionada.
        </div>
        <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files;onFile({target:{files:[f]}});}}}
          style={{border:`2px dashed ${C.border}`,borderRadius:14,padding:"56px 40px",textAlign:"center",cursor:"pointer",transition:"border .2s"}}
          onMouseEnter={e=>e.currentTarget.style.border=`2px dashed ${C.orange}`} onMouseLeave={e=>e.currentTarget.style.border=`2px dashed ${C.border}`}>
          <input ref={fileRef} type="file" accept=".xml,.pdf,.xlsx,.xls" style={{display:"none"}} onChange={onFile}/>
          {loading?<div><div style={{fontSize:30,marginBottom:8}}>⚙️</div><div style={{color:C.muted,fontSize:13,...F}}>Processando...</div></div>:<div>
            <div style={{width:52,height:52,borderRadius:14,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
              <Icon n="upload" size={22} color={C.orange}/>
            </div>
            <div style={{fontWeight:700,color:C.text,marginBottom:5,fontSize:13,...F}}>Arraste ou clique para importar</div>
            <div style={{color:C.dim,fontSize:11}}>XML · PDF · Excel (.xlsx)</div>
          </div>}
        </div>
      </div>}
      {step===2&&impData&&<div>
        <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.18)",borderRadius:10,padding:"11px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:7,color:C.green,fontWeight:700,fontSize:12,marginBottom:3}}><Icon n="check" size={13} color={C.green}/>Processado: {impData.arquivo}</div>
          <div style={{fontSize:11,color:"rgba(34,197,94,.65)"}}>Fornecedor: <b>{impData.fornecedor}</b> · NF: <b>{impData.nfe}</b> · {impData.data}</div>
        </div>
        <div style={{marginBottom:18}}><Sel label="Obra de Destino" value={impObra} onChange={e=>setImpObra(e.target.value)}><option value="">— Selecione —</option>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</Sel></div>
        <div style={{border:`1px solid ${C.border}`,borderRadius:11,overflow:"hidden",marginBottom:18}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"rgba(255,255,255,.025)"}}>{["Item","Qtd","Valor Unit.","Total"].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F}}>{h}</th>)}</tr></thead>
            <tbody>{impData.itens.map((it,i)=><tr key={i} style={{borderTop:`1px solid ${C.borderLight}`}}>
              <td style={{padding:"10px 13px"}}><div style={{fontWeight:600,color:C.text,...F}}>{it.nome}</div><div style={{fontSize:10,color:C.dim}}>{it.unidade}</div></td>
              <td style={{padding:"10px 13px",color:C.muted}}>{it.quantidade}</td>
              <td style={{padding:"10px 13px",color:C.muted}}>{fmt(it.valorUnit)}</td>
              <td style={{padding:"10px 13px",fontWeight:700,color:C.orange}}>{fmt(it.quantidade*it.valorUnit)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>{setStep(1);setImpData(null);}}>← Voltar</Btn><Btn disabled={!impObra} onClick={confirmImp}><Icon n="check" size={13}/>Confirmar Importação</Btn></div>
      </div>}
    </Modal>}
  </div>;
}

// ─── CADASTROS (guia unificada) ───────────────────────────────────────────────
const CADS=[{id:"etapas",label:"Tipos de Etapa",icon:"checklist"},{id:"pessoas",label:"Pessoas",icon:"people"}];
function Cadastros({data,setData,canWrite}){
  const [aba,setAba]=useState("etapas");
  return <div>
    <Hdr title="Cadastros" sub="Tipos de etapa e pessoas"/>
    {/* Tabs */}
    <div style={{display:"flex",gap:2,marginBottom:22,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:4,width:"fit-content"}}>
      {CADS.map(c=>{const a=aba===c.id;return <button key={c.id} onClick={()=>setAba(c.id)}
        style={{display:"flex",alignItems:"center",gap:7,padding:"7px 15px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:a?700:500,transition:"all .15s",...F,
          background:a?C.orange:"transparent",color:a?"#0a0a0a":C.muted,letterSpacing:"-0.01em"}}>
        <Icon n={c.icon} size={13} color={a?"#0a0a0a":C.muted}/>{c.label}
      </button>;})}
    </div>
    {aba==="etapas"&&<TiposEtapa canWrite={canWrite}/>}
    {aba==="pessoas"&&<Funcionarios data={data} setData={setData} canWrite={canWrite}/>}
  </div>;
}

// ─── ENTRADA DE INSUMOS (aba interna) ────────────────────────────────────────
function EntradaInsumos({data,setData,canWrite}){
  const {obras,insumos,estoques}=data;
  const fileRef=useRef();
  // Estado para nova entrada manual (múltiplos itens)
  const [modal,setModal]=useState(false);
  const [obraDestino,setObraDestino]=useState("");
  const [itensForm,setItensForm]=useState([{insumoId:"",quantidade:""}]);
  const addLinha=()=>setItensForm(f=>[...f,{insumoId:"",quantidade:""}]);
  const remLinha=i=>setItensForm(f=>f.filter((_,j)=>j!==i));
  const updLinha=(i,k,v)=>setItensForm(f=>f.map((l,j)=>j===i?{...l,[k]:v}:l));
  const salvarEntrada=()=>{
    if(!obraDestino) return;
    const oId=parseInt(obraDestino);
    itensForm.filter(l=>l.insumoId&&l.quantidade).forEach(l=>{
      const iId=parseInt(l.insumoId);
      const qtd=parseFloat(l.quantidade);
      setData(d=>{
        const ex=d.estoques.find(e=>e.obraId===oId&&e.insumoId===iId);
        const ne=ex
          ?d.estoques.map(e=>e.id===ex.id?{...e,quantEntrada:e.quantEntrada+qtd}:e)
          :[...d.estoques,{id:nextId(d.estoques),obraId:oId,insumoId:iId,quantEntrada:qtd,quantUtilizado:0,dataMov:today(),origem:"Manual"}];
        return {...d,estoques:ne};
      });
    });
    setModal(false);setObraDestino("");setItensForm([{insumoId:"",quantidade:""}]);
  };
  // Estado importação NF
  const [impModal,setImpModal]=useState(false);
  const [step,setStep]=useState(1);
  const [impData,setImpData]=useState(null);
  const [impObra,setImpObra]=useState("");
  const [loading,setLoading]=useState(false);
  const onFile=e=>{const file=e.target.files?.[0];if(!file)return;setLoading(true);const ext=file.name.split(".").pop().toUpperCase();setTimeout(()=>{setImpData({fornecedor:"Distribuidora Santos Ltda",nfe:`NFE-${Math.floor(Math.random()*90000+10000)}`,data:today(),itens:[{nome:"Cimento CP-II 50kg",unidade:"saco 50kg",quantidade:100,valorUnit:39.90,categoria:"Material"},{nome:"Areia Fina Lavada",unidade:"m³",quantidade:15,valorUnit:110.00,categoria:"Material"},{nome:"Brita 1",unidade:"m³",quantidade:10,valorUnit:130.00,categoria:"Material"}],arquivo:file.name,tipo:ext});setLoading(false);setStep(2);},1800);};
  const confirmImp=()=>{if(!impObra)return;const oId=parseInt(impObra);impData.itens.forEach(item=>{setData(d=>{let iId=d.insumos.find(i=>i.nome===item.nome)?.id;let ni=d.insumos;if(!iId){iId=nextId(d.insumos);ni=[...d.insumos,{id:iId,nome:item.nome,unidade:item.unidade,custoUnit:item.valorUnit,categoria:item.categoria,fornecedor:impData.fornecedor}];}const ex=d.estoques.find(e=>e.obraId===oId&&e.insumoId===iId);const ne=ex?d.estoques.map(e=>e.id===ex.id?{...e,quantEntrada:e.quantEntrada+item.quantidade}:e):[...d.estoques,{id:nextId(d.estoques),obraId:oId,insumoId:iId,quantEntrada:item.quantidade,quantUtilizado:0,dataMov:today(),origem:`Import. ${impData.tipo} - ${impData.nfe}`}];return{...d,insumos:ni,estoques:ne};});});setImpModal(false);setStep(1);setImpData(null);setImpObra("");};

  // Extrato: todas as entradas de estoque, mais recentes primeiro
  const extrato=[...estoques].sort((a,b)=>b.dataMov.localeCompare(a.dataMov));
  // Agrupa por obra+data+origem para mostrar "lotes"
  const lotes=extrato.reduce((acc,e)=>{
    const key=`${e.obraId}||${e.dataMov}||${e.origem}`;
    if(!acc[key]) acc[key]={obraId:e.obraId,dataMov:e.dataMov,origem:e.origem,itens:[]};
    acc[key].itens.push(e);
    return acc;
  },{});
  const lotesArr=Object.values(lotes);

  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em"}}>Entrada de Insumos</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Histórico de todas as entradas por obra</div>
      </div>
      {canWrite&&<div style={{display:"flex",gap:8}}>
        <Btn v="outline" onClick={()=>{setStep(1);setImpData(null);setImpObra("");setImpModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="upload" size={12}/>Importar NF</Btn>
        <Btn onClick={()=>{setModal(true);}} sx={{fontSize:11,padding:"6px 12px"}}><Icon n="plus" size={12}/>Nova Entrada</Btn>
      </div>}
    </div>

    {/* Extrato de entradas agrupado por lote */}
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      {!lotesArr.length&&<Card style={{padding:"40px",textAlign:"center"}}><span style={{color:C.dim,fontSize:12}}>Nenhuma entrada registrada.</span></Card>}
      {lotesArr.map((lote,idx)=>{
        const obra=obras.find(o=>o.id===lote.obraId);
        const total=lote.itens.reduce((s,e)=>{const ins=insumos.find(x=>x.id===e.insumoId);return s+(ins?ins.custoUnit*e.quantEntrada:0);},0);
        return <Card key={idx} style={{padding:0,overflow:"hidden"}}>
          {/* Cabeçalho do lote */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",borderBottom:`1px solid ${C.borderLight}`,background:"rgba(255,255,255,.015)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon n="warehouse" size={13} color={C.orange}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text,...F}}>{obra?.nome||"—"}</div>
                <div style={{fontSize:10,color:C.dim,display:"flex",alignItems:"center",gap:7,marginTop:1}}>
                  <span style={{display:"flex",alignItems:"center",gap:3}}><Icon n="cal" size={9} color={C.dim}/>{lote.dataMov}</span>
                  <span style={{display:"flex",alignItems:"center",gap:3}}><Icon n="file" size={9} color={C.dim}/>{lote.origem}</span>
                </div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.dim}}>Total do lote</div>
              <div style={{fontSize:13,fontWeight:800,color:C.orange,...F}}>{fmt(total)}</div>
            </div>
          </div>
          {/* Itens do lote */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"rgba(255,255,255,.01)"}}>
              {["Insumo","Unidade","Qtd. Entrada","Custo Unit.","Total"].map(h=><th key={h} style={{padding:"8px 16px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.07em",...F}}>{h}</th>)}
            </tr></thead>
            <tbody>{lote.itens.map(e=>{
              const ins=insumos.find(x=>x.id===e.insumoId);
              if(!ins) return null;
              return <tr key={e.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
                <td style={{padding:"9px 16px",fontWeight:600,color:C.text,...F}}>{ins.nome}</td>
                <td style={{padding:"9px 16px",color:C.muted}}>{ins.unidade}</td>
                <td style={{padding:"9px 16px",color:C.text}}>{e.quantEntrada}</td>
                <td style={{padding:"9px 16px",color:C.muted}}>{fmt(ins.custoUnit)}</td>
                <td style={{padding:"9px 16px",fontWeight:700,color:C.orange}}>{fmt(ins.custoUnit*e.quantEntrada)}</td>
              </tr>;
            })}</tbody>
          </table>
        </Card>;
      })}
    </div>

    {/* Modal — Nova Entrada Manual (múltiplos itens) */}
    {modal&&<Modal title="Nova Entrada de Insumos" onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Sel label="Obra de Destino" value={obraDestino} onChange={e=>setObraDestino(e.target.value)}>
          <option value="">— Selecione a obra —</option>
          {obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </Sel>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8,...F}}>Itens da Entrada</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {itensForm.map((ln,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 140px 32px",gap:8,alignItems:"end"}}>
                <Sel label={i===0?"Insumo":undefined} value={ln.insumoId} onChange={e=>updLinha(i,"insumoId",e.target.value)}>
                  <option value="">Selecione o insumo...</option>
                  {insumos.map(ins=><option key={ins.id} value={ins.id}>{ins.nome} ({ins.unidade})</option>)}
                </Sel>
                <Inp label={i===0?"Quantidade":undefined} type="number" placeholder="Qtd." value={ln.quantidade} onChange={e=>updLinha(i,"quantidade",e.target.value)}/>
                <button onClick={()=>remLinha(i)} disabled={itensForm.length===1}
                  style={{height:36,width:32,border:`1px solid ${C.border}`,borderRadius:9,background:"transparent",cursor:itensForm.length===1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:itensForm.length===1?.3:1,flexShrink:0}}>
                  <Icon n="trash" size={13} color={C.dim}/>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addLinha} style={{marginTop:8,background:"none",border:`1px dashed ${C.border}`,borderRadius:9,padding:"7px 14px",cursor:"pointer",fontSize:11,color:C.muted,...F,display:"flex",alignItems:"center",gap:6,width:"100%",justifyContent:"center",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.orange} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <Icon n="plus" size={12} color={C.muted}/>Adicionar item
          </button>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end",borderTop:`1px solid ${C.borderLight}`,paddingTop:12}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn disabled={!obraDestino||!itensForm.some(l=>l.insumoId&&l.quantidade)} onClick={salvarEntrada}><Icon n="check" size={13}/>Registrar Entrada</Btn>
        </div>
      </div>
    </Modal>}

    {/* Modal — Importar NF */}
    {impModal&&<Modal title="Importar Nota Fiscal" onClose={()=>setImpModal(false)} wide>
      {step===1&&<div>
        <div style={{background:C.orangeDim,border:"1px solid rgba(249,115,22,.2)",borderRadius:10,padding:"11px 14px",marginBottom:18,fontSize:12,color:"rgba(249,115,22,.8)"}}>
          Formatos suportados: <b>XML (NF-e)</b>, <b>PDF</b>, <b>Excel (.xlsx)</b>. Os itens serão vinculados ao estoque da obra selecionada.
        </div>
        <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files;onFile({target:{files:[f]}});}}}
          style={{border:`2px dashed ${C.border}`,borderRadius:14,padding:"56px 40px",textAlign:"center",cursor:"pointer",transition:"border .2s"}}
          onMouseEnter={e=>e.currentTarget.style.border=`2px dashed ${C.orange}`} onMouseLeave={e=>e.currentTarget.style.border=`2px dashed ${C.border}`}>
          <input ref={fileRef} type="file" accept=".xml,.pdf,.xlsx,.xls" style={{display:"none"}} onChange={onFile}/>
          {loading?<div><div style={{fontSize:30,marginBottom:8}}>⚙️</div><div style={{color:C.muted,fontSize:13,...F}}>Processando...</div></div>:<div>
            <div style={{width:52,height:52,borderRadius:14,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
              <Icon n="upload" size={22} color={C.orange}/>
            </div>
            <div style={{fontWeight:700,color:C.text,marginBottom:5,fontSize:13,...F}}>Arraste ou clique para importar</div>
            <div style={{color:C.dim,fontSize:11}}>XML · PDF · Excel (.xlsx)</div>
          </div>}
        </div>
      </div>}
      {step===2&&impData&&<div>
        <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.18)",borderRadius:10,padding:"11px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:7,color:C.green,fontWeight:700,fontSize:12,marginBottom:3}}><Icon n="check" size={13} color={C.green}/>Processado: {impData.arquivo}</div>
          <div style={{fontSize:11,color:"rgba(34,197,94,.65)"}}>Fornecedor: <b>{impData.fornecedor}</b> · NF: <b>{impData.nfe}</b> · {impData.data}</div>
        </div>
        <div style={{marginBottom:18}}><Sel label="Obra de Destino" value={impObra} onChange={e=>setImpObra(e.target.value)}><option value="">— Selecione —</option>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</Sel></div>
        <div style={{border:`1px solid ${C.border}`,borderRadius:11,overflow:"hidden",marginBottom:18}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"rgba(255,255,255,.025)"}}>{["Item","Qtd","Valor Unit.","Total"].map(h=><th key={h} style={{padding:"10px 13px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F}}>{h}</th>)}</tr></thead>
            <tbody>{impData.itens.map((it,i)=><tr key={i} style={{borderTop:`1px solid ${C.borderLight}`}}>
              <td style={{padding:"10px 13px"}}><div style={{fontWeight:600,color:C.text,...F}}>{it.nome}</div><div style={{fontSize:10,color:C.dim}}>{it.unidade}</div></td>
              <td style={{padding:"10px 13px",color:C.muted}}>{it.quantidade}</td>
              <td style={{padding:"10px 13px",color:C.muted}}>{fmt(it.valorUnit)}</td>
              <td style={{padding:"10px 13px",fontWeight:700,color:C.orange}}>{fmt(it.quantidade*it.valorUnit)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>{setStep(1);setImpData(null);}}>← Voltar</Btn><Btn disabled={!impObra} onClick={confirmImp}><Icon n="check" size={13}/>Confirmar Importação</Btn></div>
      </div>}
    </Modal>}
  </div>;
}

// ─── POSIÇÃO DE ESTOQUE (aba interna) ────────────────────────────────────────
function PosicaoEstoque({data,canWrite}){
  const {obras,insumos,estoques}=data;
  const [obraId,setObraId]=useState(obras[0]?.id||null);
  const itens=estoques.filter(e=>e.obraId===obraId);
  const totDisp=itens.reduce((s,e)=>{const i=insumos.find(x=>x.id===e.insumoId);return s+(i?i.custoUnit*(e.quantEntrada-e.quantUtilizado):0);},0);
  const totUtil=itens.reduce((s,e)=>{const i=insumos.find(x=>x.id===e.insumoId);return s+(i?i.custoUnit*e.quantUtilizado:0);},0);
  return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,...F,letterSpacing:"-0.02em"}}>Posição de Estoque</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Saldo atual consolidado por obra</div>
      </div>
      <DSel value={obraId} onChange={e=>setObraId(parseInt(e.target.value))}>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</DSel>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
      <Card style={{background:"rgba(34,197,94,.04)",borderColor:"rgba(34,197,94,.12)",padding:16}}>
        <div style={{fontSize:11,color:C.green,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="warehouse" size={13} color={C.green}/>Valor em Estoque</div>
        <div style={{fontSize:22,fontWeight:800,color:C.green,...F,letterSpacing:"-0.04em"}}>{fmt(totDisp)}</div>
      </Card>
      <Card style={{background:C.orangeDim,borderColor:"rgba(249,115,22,.18)",padding:16}}>
        <div style={{fontSize:11,color:C.orange,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="link" size={13} color={C.orange}/>Valor Consumido</div>
        <div style={{fontSize:22,fontWeight:800,color:C.orange,...F,letterSpacing:"-0.04em"}}>{fmt(totUtil)}</div>
      </Card>
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"rgba(255,255,255,.02)"}}>
            {["Insumo","Unid.","Entrada","Utilizado","Disponível","% Uso","Custo Util.","Custo Disp."].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",color:C.dim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",...F,whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>{itens.map(item=>{
            const ins=insumos.find(i=>i.id===item.insumoId); if(!ins) return null;
            const disp=item.quantEntrada-item.quantUtilizado;
            const pct=Math.round((item.quantUtilizado/item.quantEntrada)*100);
            return <tr key={item.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
              <td style={{padding:"11px 14px",fontWeight:600,color:C.text,...F}}>{ins.nome}</td>
              <td style={{padding:"11px 14px",color:C.muted}}>{ins.unidade}</td>
              <td style={{padding:"11px 14px",color:C.text}}>{item.quantEntrada}</td>
              <td style={{padding:"11px 14px",color:C.orange,fontWeight:600}}>{item.quantUtilizado}</td>
              <td style={{padding:"11px 14px",color:C.green,fontWeight:600}}>{disp}</td>
              <td style={{padding:"11px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:52}}><Bar val={pct} color={pct>90?C.red:C.orange}/></div><span style={{fontSize:11,color:C.muted}}>{pct}%</span></div></td>
              <td style={{padding:"11px 14px",color:C.muted}}>{fmt(ins.custoUnit*item.quantUtilizado)}</td>
              <td style={{padding:"11px 14px",color:C.muted}}>{fmt(ins.custoUnit*disp)}</td>
            </tr>;
          })}{!itens.length&&<tr><td colSpan={8} style={{padding:"48px",textAlign:"center",color:C.dim,fontSize:12}}>Nenhum insumo neste estoque.</td></tr>}</tbody>
        </table>
      </div>
    </Card>
  </div>;
}

// ─── ESTOQUE (wrapper com abas) ───────────────────────────────────────────────
const ESTABS=[{id:"entradas",label:"Entrada de Insumos",icon:"upload"},{id:"posicao",label:"Estoque",icon:"warehouse"}];
function Estoque({data,setData,canWrite}){
  const [aba,setAba]=useState("entradas");
  return <div>
    <Hdr title="Estoque" sub="Entradas de insumos e posição de estoque por obra"/>
    <div style={{display:"flex",gap:2,marginBottom:22,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:4,width:"fit-content"}}>
      {ESTABS.map(t=>{const a=aba===t.id;return <button key={t.id} onClick={()=>setAba(t.id)}
        style={{display:"flex",alignItems:"center",gap:7,padding:"7px 15px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:a?700:500,transition:"all .15s",...F,
          background:a?C.orange:"transparent",color:a?"#0a0a0a":C.muted,letterSpacing:"-0.01em"}}>
        <Icon n={t.icon} size={13} color={a?"#0a0a0a":C.muted}/>{t.label}
      </button>;})}
    </div>
    {aba==="entradas"&&<EntradaInsumos data={data} setData={setData} canWrite={canWrite}/>}
    {aba==="posicao"&&<PosicaoEstoque data={data} canWrite={canWrite}/>}
  </div>;
}

// ─── ALOCAÇÃO ────────────────────────────────────────────────────────────────
function Alocacao({data,setData,canWrite}){
  const {obras,maquinas,insumos,alocacoes}=data;
  const [obraId,setObraId]=useState(obras[0]?.id||null);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({tipo:"maquina"});
  const itens=alocacoes.filter(a=>a.obraId===obraId).sort((a,b)=>b.data.localeCompare(a.data));
  const save=()=>{setData(d=>({...d,alocacoes:[...d.alocacoes,{id:nextId(d.alocacoes),obraId,tipo:form.tipo,referenciaId:parseInt(form.referenciaId),quantidade:parseFloat(form.quantidade),data:form.data||today(),obs:form.obs||""}]}));setModal(false);setForm({tipo:"maquina"});};
  const del=id=>{if(confirm("Remover?"))setData(d=>({...d,alocacoes:d.alocacoes.filter(a=>a.id!==id)}));};
  const tMaq=itens.filter(a=>a.tipo==="maquina").reduce((s,a)=>{const m=maquinas.find(x=>x.id===a.referenciaId);return s+(m?m.custoHora*a.quantidade:0);},0);
  const tIns=itens.filter(a=>a.tipo==="insumo").reduce((s,a)=>{const i=insumos.find(x=>x.id===a.referenciaId);return s+(i?i.custoUnit*a.quantidade:0);},0);
  return <div>
    <Hdr title="Lançamento de Alocação" sub="Registre uso de máquinas e insumos por obra"
      action={<div style={{display:"flex",gap:9,alignItems:"center"}}>
        <DSel value={obraId} onChange={e=>setObraId(parseInt(e.target.value))}>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</DSel>
        {canWrite&&<Btn onClick={()=>{setForm({tipo:"maquina"});setModal(true);}}><Icon n="plus" size={13}/>Nova Alocação</Btn>}
      </div>}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
      <Card style={{background:"rgba(96,165,250,.04)",borderColor:"rgba(96,165,250,.12)",padding:16}}>
        <div style={{fontSize:11,color:C.blue,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="excavator" size={13} color={C.blue}/>Custo de Máquinas</div>
        <div style={{fontSize:22,fontWeight:800,color:C.blue,...F,letterSpacing:"-0.04em"}}>{fmt(tMaq)}</div>
      </Card>
      <Card style={{background:C.orangeDim,borderColor:"rgba(249,115,22,.18)",padding:16}}>
        <div style={{fontSize:11,color:C.orange,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Icon n="cube" size={13} color={C.orange}/>Custo de Insumos</div>
        <div style={{fontSize:22,fontWeight:800,color:C.orange,...F,letterSpacing:"-0.04em"}}>{fmt(tIns)}</div>
      </Card>
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.borderLight}`,fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",...F}}>
        Alocações — {obras.find(o=>o.id===obraId)?.nome}
      </div>
      {!itens.length&&<div style={{padding:"48px",textAlign:"center",color:C.dim,fontSize:12}}>Nenhuma alocação para esta obra.</div>}
      {itens.map(a=>{
        const iM=a.tipo==="maquina";
        const ref=iM?maquinas.find(m=>m.id===a.referenciaId):insumos.find(i=>i.id===a.referenciaId);
        const custo=ref?(iM?ref.custoHora*a.quantidade:ref.custoUnit*a.quantidade):0;
        return <div key={a.id} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 14px",borderBottom:`1px solid ${C.borderLight}`}}>
          <div style={{width:36,height:36,borderRadius:10,background:iM?"rgba(96,165,250,.08)":C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon n={iM?"excavator":"cube"} size={15} color={iM?C.blue:C.orange}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:12,color:C.text,...F,letterSpacing:"-0.01em"}}>{ref?.nome||"—"}</div>
            <div style={{fontSize:11,color:C.muted,display:"flex",gap:10,marginTop:2}}>
              <span style={{display:"flex",alignItems:"center",gap:3}}><Icon n="clock" size={10} color={C.dim}/>{iM?`${a.quantidade}h`:`${a.quantidade} ${ref?.unidade||""}`}</span>
              <span style={{display:"flex",alignItems:"center",gap:3}}><Icon n="cal" size={10} color={C.dim}/>{a.data}</span>
              {a.obs&&<span style={{display:"flex",alignItems:"center",gap:3}}><Icon n="file" size={10} color={C.dim}/>{a.obs}</span>}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontWeight:800,fontSize:13,color:C.text,...F}}>{fmt(custo)}</div>
            <div style={{fontSize:10,color:C.dim}}>{iM?`${fmt(ref?.custoHora)}/h`:`${fmt(ref?.custoUnit)}/un`}</div>
          </div>
          {canWrite&&<button onClick={()=>del(a.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.dim,display:"flex",padding:3,flexShrink:0}}><Icon n="trash" size={13} color={C.dim}/></button>}
        </div>;
      })}
    </Card>
    {modal&&<Modal title="Nova Alocação" onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Sel label="Tipo" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value,referenciaId:""}))}><option value="maquina">Máquina / Equipamento</option><option value="insumo">Insumo / Material</option></Sel>
        <Sel label={form.tipo==="maquina"?"Máquina":"Insumo"} value={form.referenciaId||""} onChange={e=>setForm(f=>({...f,referenciaId:e.target.value}))}>
          <option value="">Selecione...</option>
          {form.tipo==="maquina"?maquinas.map(m=><option key={m.id} value={m.id}>{m.nome} ({fmt(m.custoHora)}/h)</option>):insumos.map(i=><option key={i.id} value={i.id}>{i.nome} ({fmt(i.custoUnit)}/{i.unidade})</option>)}
        </Sel>
        <Inp label={form.tipo==="maquina"?"Horas Utilizadas":"Quantidade"} type="number" value={form.quantidade||""} onChange={e=>setForm(f=>({...f,quantidade:e.target.value}))}/>
        <Inp label="Data" type="date" value={form.data||today()} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
        <Txta label="Observações" rows={2} value={form.obs||""} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}/>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={save}><Icon n="check" size={13}/>Lançar</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── RELATÓRIOS ──────────────────────────────────────────────────────────────
function Relatorios({data}){
  const {obras,maquinas,funcionarios,insumos,estoques,alocacoes,funcionarioObra,etapasObra}=data;
  const [filtro,setFiltro]=useState("all");
  const filt=filtro==="all"?obras:obras.filter(o=>o.id===parseInt(filtro));
  return <div>
    <Hdr title="Relatórios" action={<DSel value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="all">Todas as obras</option>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</DSel>}/>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {filt.map(obra=>{
        const prog=calcProg(obra.id,etapasObra);
        const cIns=calcIns(obra.id,estoques,insumos); const cMaq=calcMaq(obra.id,alocacoes,maquinas); const cMO=calcMO(obra.id,funcionarioObra,funcionarios);
        const cT=cIns+cMaq+cMO;
        const estD=estoques.filter(e=>e.obraId===obra.id).reduce((s,e)=>{const i=insumos.find(x=>x.id===e.insumoId);return s+(i?i.custoUnit*(e.quantEntrada-e.quantUtilizado):0);},0);
        const pOrc=Math.min(100,Math.round(cT/(obra.orcamento||1)*100));
        const ets=etapasObra.filter(e=>e.obraId===obra.id).sort((a,b)=>new Date(a.dataInicioP)-new Date(b.dataInicioP));
        const atrs=ets.filter(e=>isAtrasada(e));
        const sc={Concluída:"green","Em andamento":"orange",Pausada:"yellow"};
        return <Card key={obra.id}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h2 style={{fontSize:15,fontWeight:800,color:C.text,margin:0,...F,letterSpacing:"-0.03em"}}>{obra.nome}</h2>
            <div style={{display:"flex",gap:7}}>
              {atrs.length>0&&<Badge v="red"><Icon n="alert" size={9}/>{atrs.length} atrasada{atrs.length>1?"s":""}</Badge>}
              <Badge v={sc[obra.status]||"default"} dot>{obra.status}</Badge>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{l:"Progresso",v:`${prog}%`,i:"checklist"},{l:"Custo Total",v:fmt(cT),i:"money"},{l:"Orçamento",v:fmt(obra.orcamento),i:"barchart"},{l:"Estoque Disp.",v:fmt(estD),i:"warehouse"}].map(k=>(
              <div key={k.l} style={{background:"rgba(255,255,255,.025)",borderRadius:10,padding:11}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:3,display:"flex",alignItems:"center",gap:4}}><Icon n={k.i} size={10} color={C.dim}/>{k.l}</div>
                <div style={{fontWeight:800,fontSize:13,color:C.text,...F}}>{k.v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:6}}><span>Orçamento utilizado</span><span style={{color:pOrc>90?C.red:C.text,fontWeight:700}}>{pOrc}%</span></div>
            <Bar val={pOrc} color={pOrc>90?C.red:pOrc>70?C.yellow:C.green}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:ets.length?16:0}}>
            {[{l:"Insumos",v:cIns,i:"cube"},{l:"Máquinas",v:cMaq,i:"excavator"},{l:"Mão de Obra",v:cMO,i:"people"}].map(k=>(
              <div key={k.l} style={{background:C.orangeDim,border:"1px solid rgba(249,115,22,.08)",borderRadius:10,padding:11}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:3,display:"flex",alignItems:"center",gap:4}}><Icon n={k.i} size={10} color={C.orange}/>{k.l}</div>
                <div style={{fontWeight:700,fontSize:12,color:C.text,...F}}>{fmt(k.v)}</div>
                <div style={{fontSize:10,color:C.dim}}>{cT>0?Math.round(k.v/cT*100):0}% do total</div>
              </div>
            ))}
          </div>
          {ets.length>0&&<div>
            <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Etapas</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {ets.map(e=>{const tp=TIPOS_ETAPA.find(t=>t.id===e.tipoEtapaId);const at=isAtrasada(e);return <div key={e.id} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:20,height:20,borderRadius:6,background:C.orangeDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n={tp?.icon||"checklist"} size={11} color={C.orange}/></div>
                <span style={{fontSize:11,color:at?C.red:C.muted,width:155,flexShrink:0,...F,fontWeight:at?600:400}}>{tp?.nome}</span>
                <div style={{flex:1}}><Bar val={e.progresso} color={at?C.red:e.progresso===100?C.green:C.orange}/></div>
                <span style={{fontSize:11,color:C.muted,width:26,textAlign:"right"}}>{e.progresso}%</span>
                {at&&<Badge v="red">Atraso</Badge>}
              </div>;})}
            </div>
          </div>}
        </Card>;
      })}
    </div>
  </div>;
}

// ─── USUÁRIOS (tenant-scoped com limite de plano) ─────────────────────────────
const ALL_PERMS=[{id:"obras",l:"Obras"},{id:"maquinas",l:"Máquinas"},{id:"cadastros",l:"Cadastros"},{id:"estoque",l:"Estoque"},{id:"alocacao",l:"Alocação"},{id:"relatorios",l:"Relatórios"}];

function Usuarios({data,setData,tenant,setTenant}){
  const {obras}=data;
  const users=tenant.users;
  const plano=PLANOS.find(p=>p.id===tenant.plano)||PLANOS[0];
  const ativos=users.filter(u=>u.ativo).length;
  const limiteAtingido=ativos>=plano.usuarios;
  const [modal,setModal]=useState(false);
  const [planoModal,setPlanoModal]=useState(false);
  const [form,setForm]=useState({});
  const updTenantUsers=fn=>setTenant(t=>({...t,users:fn(t.users)}));
  const save=()=>{
    if(form.id) updTenantUsers(us=>us.map(u=>u.id===form.id?{...form}:u));
    else updTenantUsers(us=>[...us,{...form,id:nextId(us),tenantId:tenant.id,role:"user",ativo:true,permissoes:form.permissoes||[],obrasAcesso:form.obrasAcesso||[]}]);
    setModal(false);
  };
  const togP=p=>{const pp=form.permissoes||[];setForm(f=>({...f,permissoes:pp.includes(p)?pp.filter(x=>x!==p):[...pp,p]}));};
  const togO=id=>{const oa=form.obrasAcesso||[];setForm(f=>({...f,obrasAcesso:oa.includes(id)?oa.filter(x=>x!==id):[...oa,id]}));};
  const togAtivo=u=>{if(u.role==="tenant_admin")return;updTenantUsers(us=>us.map(x=>x.id===u.id?{...x,ativo:!x.ativo}:x));};

  return <div>
    <Hdr title="Usuários" sub={`Plano ${plano.nome} — ${ativos} de ${plano.usuarios===999?"∞":plano.usuarios} usuários ativos`}
      action={<div style={{display:"flex",gap:9}}>
        <Btn v="outline" onClick={()=>setPlanoModal(true)} sx={{fontSize:11,padding:"6px 13px"}}><Icon n="shield" size={12}/>Alterar Plano</Btn>
        <Btn onClick={()=>{if(limiteAtingido){alert(`Limite de ${plano.usuarios} usuários atingido. Faça upgrade do plano.`);return;}setForm({permissoes:[],obrasAcesso:[]});setModal(true);}} sx={{opacity:limiteAtingido?.5:1}}><Icon n="plus" size={13}/>Novo Usuário</Btn>
      </div>}/>

    {/* Barra de uso */}
    <Card style={{padding:"13px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:11,color:C.muted}}>Usuários ativos</span>
          <span style={{fontSize:11,fontWeight:700,color:limiteAtingido?C.red:C.text}}>{ativos}{plano.usuarios!==999&&` / ${plano.usuarios}`}</span>
        </div>
        <Bar val={plano.usuarios===999?20:Math.round(ativos/plano.usuarios*100)} color={limiteAtingido?C.red:C.orange}/>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:10,color:C.dim}}>Plano atual</div>
        <div style={{fontSize:13,fontWeight:700,color:plano.cor||C.orange,...F}}>{plano.nome}</div>
      </div>
    </Card>

    {limiteAtingido&&<div style={{marginBottom:16,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.18)",borderRadius:11,padding:"11px 15px",display:"flex",alignItems:"center",gap:10}}>
      <Icon n="alert" size={16} color={C.red}/>
      <div style={{flex:1}}>
        <span style={{fontSize:12,fontWeight:700,color:C.red}}>Limite de usuários atingido. </span>
        <span style={{fontSize:12,color:"rgba(239,68,68,.65)"}}>Faça upgrade para adicionar mais usuários.</span>
      </div>
      <Btn v="danger" onClick={()=>setPlanoModal(true)} sx={{fontSize:11,padding:"5px 13px"}}>Upgrade</Btn>
    </div>}

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {users.map(u=><Card key={u.id}>
        <div style={{display:"flex",alignItems:"flex-start",gap:13}}>
          <div style={{width:42,height:42,borderRadius:13,background:u.role==="tenant_admin"?C.orangeDim:"rgba(255,255,255,.04)",border:`1px solid ${u.role==="tenant_admin"?C.orange:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:u.role==="tenant_admin"?C.orange:C.muted,flexShrink:0,...F}}>
            {u.nome[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}>
              <span style={{fontWeight:700,fontSize:13,color:C.text,...F,letterSpacing:"-0.02em"}}>{u.nome}</span>
              {u.role==="tenant_admin"&&<Badge v="orange"><Icon n="shield" size={9}/>Admin</Badge>}
              <Badge v={u.ativo?"green":"red"} dot>{u.ativo?"Ativo":"Inativo"}</Badge>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:7}}>{u.email}</div>
            {u.role!=="tenant_admin"&&<div style={{display:"flex",flexDirection:"column",gap:5}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.dim,marginRight:2}}>Telas:</span>
                {(u.permissoes||[]).length?(u.permissoes||[]).map(p=>{const pp=ALL_PERMS.find(x=>x.id===p);return pp?<Badge key={p}>{pp.l}</Badge>:null;}):<span style={{fontSize:11,color:C.dim}}>Nenhuma</span>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                <span style={{fontSize:10,color:C.dim,marginRight:2}}>Obras:</span>
                {(u.obrasAcesso||[]).length?(u.obrasAcesso||[]).map(id=>{const o=obras.find(x=>x.id===id);return o?<Badge key={id} v="blue">{o.nome}</Badge>:null;}):<span style={{fontSize:11,color:C.dim}}>Todas</span>}
              </div>
            </div>}
          </div>
          {u.role!=="tenant_admin"&&<div style={{display:"flex",gap:7,flexShrink:0}}>
            <Btn v="secondary" onClick={()=>{setForm({...u,permissoes:u.permissoes||[],obrasAcesso:u.obrasAcesso||[]});setModal(true);}} sx={{fontSize:11,padding:"5px 11px"}}><Icon n="edit" size={12}/>Editar</Btn>
            <Btn v={u.ativo?"danger":"secondary"} onClick={()=>togAtivo(u)} sx={{fontSize:11,padding:"5px 11px"}}>{u.ativo?"Desativar":"Ativar"}</Btn>
          </div>}
        </div>
      </Card>)}
    </div>

    {/* Modal novo/editar usuário */}
    {modal&&<Modal title={form.id?"Editar Usuário":"Novo Usuário"} onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Nome" value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
          <Inp label="E-mail" type="email" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        </div>
        {!form.id&&<Inp label="Senha" type="password" value={form.senha||""} onChange={e=>setForm(f=>({...f,senha:e.target.value}))}/>}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8,...F}}>Telas Permitidas</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
            {ALL_PERMS.map(p=>{const ch=(form.permissoes||[]).includes(p.id);return <label key={p.id} onClick={()=>togP(p.id)} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",background:ch?C.orangeDim:"rgba(255,255,255,.025)",border:`1px solid ${ch?C.orange:C.border}`,borderRadius:9,padding:"7px 10px",transition:"all .15s"}}>
              <div style={{width:14,height:14,borderRadius:4,background:ch?C.orange:"rgba(255,255,255,.05)",border:`1px solid ${ch?C.orange:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {ch&&<Icon n="check" size={9} color="#0a0a0a"/>}
              </div>
              <span style={{fontSize:11,color:ch?C.orange:C.muted,...F}}>{p.l}</span>
            </label>;})}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:4,...F}}>Obras com Acesso</div>
          <div style={{fontSize:10,color:C.dim,marginBottom:8}}>Deixe vazio para acesso a todas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {obras.map(o=>{const ch=(form.obrasAcesso||[]).includes(o.id);return <label key={o.id} onClick={()=>togO(o.id)} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",background:ch?"rgba(96,165,250,.07)":"rgba(255,255,255,.025)",border:`1px solid ${ch?C.blue:C.border}`,borderRadius:9,padding:"7px 10px",transition:"all .15s"}}>
              <div style={{width:14,height:14,borderRadius:4,background:ch?C.blue:"rgba(255,255,255,.05)",border:`1px solid ${ch?C.blue:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {ch&&<Icon n="check" size={9} color="#fff"/>}
              </div>
              <span style={{fontSize:11,color:ch?C.blue:C.muted,...F}}>{o.nome}</span>
            </label>;})}
          </div>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end",borderTop:`1px solid ${C.borderLight}`,paddingTop:14}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn onClick={save}><Icon n="check" size={13}/>Salvar Usuário</Btn>
        </div>
      </div>
    </Modal>}

    {/* Modal upgrade de plano */}
    {planoModal&&<Modal title="Alterar Plano" onClose={()=>setPlanoModal(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
        {PLANOS.map(p=>{const curr=tenant.plano===p.id;return <div key={p.id} onClick={()=>!curr&&setTenant(t=>({...t,plano:p.id}))}
          style={{background:curr?"rgba(249,115,22,.06)":"rgba(255,255,255,.02)",border:`2px solid ${curr?C.orange:C.border}`,borderRadius:14,padding:"18px 16px",cursor:curr?"default":"pointer",transition:"all .18s",position:"relative"}}>
          {curr&&<div style={{position:"absolute",top:10,right:10,width:16,height:16,borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="check" size={9} color="#0a0a0a"/></div>}
          {p.popular&&<div style={{fontSize:9,fontWeight:800,color:C.orange,marginBottom:6,letterSpacing:"0.07em"}}>★ POPULAR</div>}
          <div style={{fontSize:12,fontWeight:700,color:p.cor,...F,marginBottom:4}}>{p.nome}</div>
          <div style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:"-0.04em",marginBottom:4}}>R$ {p.preco}<span style={{fontSize:11,fontWeight:400,color:C.muted}}>/mês</span></div>
          <div style={{fontSize:11,color:C.muted}}>{p.usuarios===999?"Usuários ilimitados":`Até ${p.usuarios} usuários`}</div>
          <div style={{fontSize:11,color:C.muted}}>{p.obras===999?"Obras ilimitadas":`Até ${p.obras} obras`}</div>
          {curr&&<div style={{marginTop:10,fontSize:10,color:C.orange,fontWeight:700}}>Plano atual</div>}
          {!curr&&<Btn onClick={()=>{setTenant(t=>({...t,plano:p.id}));setPlanoModal(false);}} sx={{marginTop:12,width:"100%",justifyContent:"center",fontSize:11,padding:"7px"}}>Migrar para {p.nome}</Btn>}
        </div>;})}
      </div>
      <div style={{fontSize:11,color:C.dim,textAlign:"center"}}>A migração de plano é imediata nesta demonstração.</div>
    </Modal>}
  </div>;
}

// ─── APP (multi-tenant) ───────────────────────────────────────────────────────
export default function App(){
  // tenants = estado global de todas as empresas cadastradas
  const [tenants,setTenants]=useState(_globalTenants);
  // Sessão atual: { user, tenant }
  const [session,setSession]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [tela,setTela]=useState("planos"); // "planos" | "login" | "registro"
  const [planoEscolhido,setPlanoEscolhido]=useState(null);

  // Atualiza um tenant específico (mantém isolamento)
  const setTenant=fn=>{
    setTenants(ts=>ts.map(t=>t.id===session.tenant.id?fn(t):t));
    setSession(s=>({...s,tenant:fn(s.tenant)}));
  };

  // Data scopada ao tenant logado
  const tenant=session?.tenant;
  const data=tenant?{
    users:tenant.users,
    obras:tenant.obras,
    etapasObra:tenant.etapasObra,
    maquinas:tenant.maquinas,
    funcionarios:tenant.funcionarios,
    insumos:tenant.insumos,
    estoques:tenant.estoques,
    alocacoes:tenant.alocacoes,
    funcionarioObra:tenant.funcionarioObra,
  }:null;

  // setData — atualiza qualquer sub-coleção do tenant atual
  const setData=fn=>{
    setTenant(t=>{
      const next=fn({...t});
      return {...t,...next};
    });
  };

  const doLogin=(u,t)=>{setSession({user:u,tenant:t});setPage("dashboard");setTela("login");};
  const doLogout=()=>{setSession(null);setPage("dashboard");setTela("planos");};
  const doRegistro=nt=>{setTenants(ts=>[...ts,nt]);};

  if(!session){
    if(tela==="registro") return <Registro tenants={tenants} planoInicial={planoEscolhido} onRegistrado={doRegistro} onVoltar={()=>setTela("login")} onVerPlanos={()=>setTela("planos")}/>;
    if(tela==="login") return <Login tenants={tenants} onLogin={doLogin} onRegistro={()=>setTela("planos")}/>;
    // default: planos page (landing pública)
    return <PlanosPage
      onEscolher={planoId=>{setPlanoEscolhido(planoId);setTela("registro");}}
      onLogin={()=>setTela("login")}
    />;
  }

  const user=session.user;
  const isAdmin=user.role==="tenant_admin";
  const has=p=>isAdmin||(user.permissoes||[]).includes(p);

  const pages={
    dashboard:<Dashboard data={data} userId={user.id} isMaster={isAdmin}/>,
    obras:<Obras data={data} setData={setData} canWrite={has("obras")}/>,
    maquinas:<Maquinas data={data} setData={setData} canWrite={has("maquinas")}/>,
    cadastros:<Cadastros data={data} setData={setData} canWrite={has("cadastros")}/>,
    estoque:<Estoque data={data} setData={setData} canWrite={has("estoque")}/>,
    alocacao:<Alocacao data={data} setData={setData} canWrite={has("alocacao")}/>,
    relatorios:<Relatorios data={data}/>,
    usuarios:isAdmin?<Usuarios data={data} setData={setData} tenant={tenant} setTenant={setTenant}/>:null,
  };

  return <>
    <link href={FONT_URL} rel="stylesheet"/>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg}}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:8px}::-webkit-scrollbar-thumb:hover{background:#383838}input[type=range]{accent-color:${C.orange}}option{background:#1a1a1a;color:#f0f0f0}`}</style>
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,...F}}>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={doLogout} tenant={tenant}/>
      <main style={{flex:1,overflowY:"auto",minHeight:"100vh"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"28px 24px"}}>
          {pages[page]??<div style={{display:"flex",alignItems:"center",justifyContent:"center",paddingTop:120,color:C.dim,fontSize:13}}>Acesso não permitido.</div>}
        </div>
      </main>
    </div>
  </>;
}
