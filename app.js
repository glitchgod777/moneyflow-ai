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
  chat.scrollTop = chat.scrollHeight;
}

// =========================
// LOGIN GOOGLE (mais estável)
// =========================
function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithRedirect(provider).catch(err => {
    console.error(err);
    msg('❌ ' + err.message, 'bot');
  });
}

// =========================
// AUTH STATE
// =========================
auth.onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    msg(`👋 ${user.displayName} logado`, 'bot');
    carregarDados();
  } else {
    msg('🔐 Faça login para salvar seus dados', 'bot');
  }
});

// =========================
// SALVAR FIREBASE (MERGE FIX)
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
// CARREGAR DADOS
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

  // melhor parsing (mais seguro)
  const match = texto.match(/^(\d+([.,]\d+)?)\s(.+)/);

  if (!match) {
    msg('❌ Formato inválido. Ex: 50 mercado', 'bot');
    return;
  }

  const valor = parseFloat(match[1].replace(',', '.'));
  const descricao = match[3] || 'Geral';

  transacoes.push({
    valor,
    tipo: tipoSelecionado,
    descricao,
    data: new Date().toISOString()
  });

  salvar();
  atualizar();

  msg(`✅ ${descricao} registrado`, 'bot');
}

// =========================
// COMANDOS
// =========================
function processarComando(texto) {
  const t = texto.toLowerCase();

  if (t.startsWith('meta')) {
    const valor = parseFloat(t.replace('meta', '').trim());

    if (!isNaN(valor)) {
      meta = valor;
      salvar();
      atualizar();
      msg(`🎯 Meta definida: R$ ${meta}`, 'bot');
    }

    return true;
  }

  if (t.includes('comandos')) {
    msg(`
      📜 comandos:<br>
      meta 2000<br>
      quanto gastei<br>
      reset
    `, 'bot');
    return true;
  }

  if (t === 'reset') {
    confirmarReset();
    return true;
  }

  if (t.includes('quanto gastei')) {
    const total = transacoes
      .filter(x => x.tipo === 'gasto')
      .reduce((a, b) => a + b.valor, 0);

    msg(`💸 Total gasto: R$ ${total.toFixed(2)}`, 'bot');
    return true;
  }

  return false;
}

// =========================
// RESET (mais seguro)
// =========================
function confirmarReset() {
  if (!confirm('Tem certeza que deseja apagar tudo?')) return;

  transacoes = [];
  salvar();
  atualizar();
  msg('🧹 Dados resetados', 'bot');
}

// =========================
// SALDO RESTANTE
// =========================
function saldoRestante() {
  const gastos = transacoes
    .filter(x => x.tipo === 'gasto')
    .reduce((a, b) => a + b.valor, 0);

  const restante = meta - gastos;

  if (restante >= 0) {
    msg(`💰 Restante: R$ ${restante.toFixed(2)}`, 'bot');
  } else {
    msg(`🚨 Excedeu: R$ ${Math.abs(restante).toFixed(2)}`, 'bot');
  }
}

// =========================
// ATUALIZAR UI
// =========================
function atualizar() {
  const ganhos = transacoes
    .filter(x => x.tipo === 'ganho')
    .reduce((a, b) => a + b.valor, 0);

  const gastos = transacoes
    .filter(x => x.tipo === 'gasto')
    .reduce((a, b) => a + b.valor, 0);

  const saldo = ganhos - gastos;

  document.getElementById('ganhos').innerText = `R$ ${ganhos.toFixed(2)}`;
  document.getElementById('gastos').innerText = `R$ ${gastos.toFixed(2)}`;
  document.getElementById('saldo').innerText = `R$ ${saldo.toFixed(2)}`;
  document.getElementById('metaTxt').innerText = `R$ ${meta.toFixed(2)}`;

  const pct = meta ? Math.min((gastos / meta) * 100, 100) : 0;
  document.getElementById('barraMeta').style.width = pct + '%';

  atualizarPainel(ganhos, gastos, saldo);
}

// =========================
// PAINEL
// =========================
function toggleRelatorio() {
  document.getElementById('painel').classList.toggle('ativo');
  atualizar();
}

// =========================
// PAINEL UPDATE
// =========================
function atualizarPainel(ganhos, gastos, saldo) {
  document.getElementById('ganhosResumo').innerText = `R$ ${ganhos.toFixed(2)}`;
  document.getElementById('gastosResumo').innerText = `R$ ${gastos.toFixed(2)}`;
  document.getElementById('saldoResumo').innerText = `R$ ${saldo.toFixed(2)}`;

  renderGrafico(ganhos, gastos);
}

// =========================
// GRÁFICO
// =========================
function renderGrafico(ganhos, gastos) {
  const ctx = document.getElementById('graficoPainel');

  if (chartPainel) chartPainel.destroy();

  chartPainel = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Ganhos', 'Gastos'],
      datasets: [{
        data: [ganhos, gastos],
        backgroundColor: ['#00ff88', '#ff4d4d']
      }]
    }
  });
}

// =========================
// INIT
// =========================
input.addEventListener('keypress', e => {
  if (e.key === 'Enter') enviar();
});

window.onload = () => {
  setTipo('gasto');
  atualizar();
  msg('🤖 Sistema pronto. Faça login.', 'bot');
};