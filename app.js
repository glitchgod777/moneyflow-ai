// =========================
// LOADING VARS
// =========================
let loadingScreen, progressBar, loadingText;
let progress = 0;

// =========================
// FIREBASE CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyBmUImCCMkRQyLsTgEh77ipF7V2ia5WTJA",
  authDomain: "moneyflow-9ff3c.firebaseapp.com",
  projectId: "moneyflow-9ff3c",
  storageBucket: "moneyflow-9ff3c.firebasestorage.app",
  messagingSenderId: "301240648470",
  appId: "1:301240648470:web:a7631ec17fd0584b498637"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;
let authLoaded = false;

// =========================
// ESTADO
// =========================
let transacoes = [];
let meta = 2000;
let tipoSelecionado = 'gasto';
let chartPainel = null;

// =========================
// ELEMENTOS
// =========================
const chat = document.getElementById('chat');
const input = document.getElementById('input');

// =========================
// CHAT
// =========================
function msg(texto, tipo) {
  const div = document.createElement('div');
  div.className = 'msg ' + tipo;
  div.innerHTML = texto;
  chat.appendChild(div);

  chat.scrollTo({
    top: chat.scrollHeight,
    behavior: 'smooth'
  });
}

// =========================
// LOGIN GOOGLE (SMART)
// =========================
function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    auth.signInWithRedirect(provider);
  } else {
    auth.signInWithPopup(provider).catch(err => {
      msg('❌ ' + err.message, 'bot');
    });
  }
}

// =========================
// RETORNO REDIRECT
// =========================
auth.getRedirectResult()
  .then(result => {
    if (result.user) {
      msg(`👋 ${result.user.displayName} logado`, 'bot');
    }
  })
  .catch(error => {
    console.error(error);
    msg('❌ ' + error.message, 'bot');
  });

// =========================
// AUTH STATE
// =========================
auth.onAuthStateChanged(user => {
  authLoaded = true;

  if (user) {
    userId = user.uid;
    msg(`👋 ${user.displayName}`, 'bot');
    carregarDados();
  } else {
    userId = null;
    msg('🔐 Faça login', 'bot');
  }

  esconderLoading();
});

// =========================
// LOADING FAKE
// =========================
function iniciarLoadingFake() {
  const etapas = [
    { pct: 20, txt: 'Conectando...' },
    { pct: 40, txt: 'Carregando sistema...' },
    { pct: 60, txt: 'Sincronizando...' },
    { pct: 80, txt: 'Finalizando...' }
  ];

  let i = 0;

  const intervalo = setInterval(() => {
    if (i >= etapas.length) {
      clearInterval(intervalo);
      return;
    }

    progress = etapas[i].pct;
    progressBar.style.width = progress + '%';
    loadingText.innerText = etapas[i].txt;

    i++;
  }, 500);
}

// =========================
// ESCONDER LOADING
// =========================
function esconderLoading() {
  if (!loadingScreen) return;

  progress = 100;
  progressBar.style.width = '100%';
  loadingText.innerText = 'Pronto 🚀';

  setTimeout(() => {
    loadingScreen.classList.add('hide');

    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 400);
  }, 500);
}

// =========================
// FIREBASE SAVE
// =========================
function salvar() {
  if (!userId) return;

  db.collection('users')
    .doc(userId)
    .set({
      transacoes,
      meta
    }, { merge: true });
}

// =========================
// FIREBASE LOAD
// =========================
function carregarDados() {
  if (!userId) return;

  db.collection('users')
    .doc(userId)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        transacoes = data.transacoes || [];
        meta = data.meta || 2000;

        atualizar();
        msg('📊 Dados carregados', 'bot');
      }
    });
}

// =========================
// TIPO
// =========================
function setTipo(tipo) {
  tipoSelecionado = tipo;

  document.getElementById('btnGanho').classList.remove('active');
  document.getElementById('btnGasto').classList.remove('active');

  document.getElementById(
    tipo === 'ganho' ? 'btnGanho' : 'btnGasto'
  ).classList.add('active');
}

// =========================
// ENVIAR
// =========================
function enviar() {
  const texto = input.value.trim();
  if (!texto) return;

  msg(texto, 'user');
  input.value = '';

  if (processarComando(texto)) return;

  const match = texto.match(/^(\d+([.,]\d+)?)\s(.+)/);

  if (!match) {
    msg('❌ Use: 50 mercado', 'bot');
    return;
  }

  const valor = parseFloat(match[1].replace(',', '.'));
  const descricao = match[3];

  transacoes.push({
    valor,
    tipo: tipoSelecionado,
    descricao,
    data: new Date().toISOString()
  });

  salvar();
  atualizar();

  msg(`✅ ${descricao}`, 'bot');
}

// =========================
// COMANDOS
// =========================
function processarComando(texto) {
  const t = texto.toLowerCase();

  if (t.startsWith('meta')) {
    const valor = parseFloat(t.replace('meta','').trim());

    if (!isNaN(valor)) {
      meta = valor;
      salvar();
      atualizar();
      msg(`🎯 Meta: R$ ${meta}`, 'bot');
    }
    return true;
  }

  if (t.includes('quanto gastei')) {
    const total = transacoes
      .filter(x => x.tipo === 'gasto')
      .reduce((a,b)=>a+b.valor,0);

    msg(`💸 R$ ${total.toFixed(2)}`,'bot');
    return true;
  }

  if (t === 'reset') {
    resetTudo();
    return true;
  }

  return false;
}

// =========================
// RESET
// =========================
function resetTudo() {
  if (!confirm('Apagar tudo?')) return;

  transacoes = [];
  salvar();
  atualizar();
  msg('🧹 resetado','bot');
}

function confirmarReset() {
  resetTudo();
}

// =========================
// ATUALIZAR UI
// =========================
function atualizar() {
  const ganhos = transacoes
    .filter(x=>x.tipo==='ganho')
    .reduce((a,b)=>a+b.valor,0);

  const gastos = transacoes
    .filter(x=>x.tipo==='gasto')
    .reduce((a,b)=>a+b.valor,0);

  const saldo = ganhos - gastos;

  document.getElementById('ganhos').innerText = `R$ ${ganhos.toFixed(2)}`;
  document.getElementById('gastos').innerText = `R$ ${gastos.toFixed(2)}`;
  document.getElementById('saldo').innerText = `R$ ${saldo.toFixed(2)}`;
  document.getElementById('metaTxt').innerText = `R$ ${meta.toFixed(2)}`;

  const pct = meta ? Math.min((gastos/meta)*100,100) : 0;
  document.getElementById('barraMeta').style.width = pct + '%';

  atualizarPainel(ganhos,gastos,saldo);
}

// =========================
// PAINEL
// =========================
function toggleRelatorio() {
  const painel = document.getElementById('painel');
  const overlay = document.getElementById('overlay');

  const ativo = painel.classList.toggle('ativo');
  overlay.classList.toggle('ativo');

  if (ativo) atualizar();
}

// fechar clicando fora
document.getElementById('overlay').addEventListener('click', () => {
  document.getElementById('painel').classList.remove('ativo');
  document.getElementById('overlay').classList.remove('ativo');
});

// =========================
// PAINEL DADOS
// =========================
function atualizarPainel(ganhos,gastos,saldo){
  document.getElementById('ganhosResumo').innerText = `R$ ${ganhos.toFixed(2)}`;
  document.getElementById('gastosResumo').innerText = `R$ ${gastos.toFixed(2)}`;
  document.getElementById('saldoResumo').innerText = `R$ ${saldo.toFixed(2)}`;

  renderGrafico(ganhos,gastos);
}

// =========================
// GRÁFICO
// =========================
function renderGrafico(ganhos,gastos){
  const ctx = document.getElementById('graficoPainel');

  if(chartPainel) chartPainel.destroy();

  chartPainel = new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Ganhos','Gastos'],
      datasets:[{
        data:[ganhos,gastos],
        backgroundColor:['#00ff88','#ff4d4d']
      }]
    }
  });
}

// =========================
// ENTER
// =========================
input.addEventListener('keypress', e=>{
  if(e.key==='Enter') enviar();
});

// =========================
// INIT
// =========================
window.onload = ()=>{
  loadingScreen = document.getElementById('loadingScreen');
  progressBar = document.getElementById('progressBar');
  loadingText = document.getElementById('loadingText');

  setTipo('gasto');
  atualizar();

  iniciarLoadingFake();

  setTimeout(()=>{
    if(!authLoaded){
      msg('⏳ Verificando login...', 'bot');
    }
  },800);
};