/**
 * Convert Spanish translations to Portuguese
 * Run: node scripts/i18n/es-to-pt.cjs
 */
const fs = require('fs');

const es = JSON.parse(fs.readFileSync('waynest-FE/public/locales/es/translation.json', 'utf8'));
const pt = JSON.parse(fs.readFileSync('waynest-FE/public/locales/pt/translation.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('waynest-FE/public/locales/en/translation.json', 'utf8'));

function esToPt(text) {
  if (typeof text !== 'string') return text;
  let s = text;
  // Noun endings
  s = s.replace(/ci\u00f3n/g, '\u00e7\u00e3o');
  s = s.replace(/ciones/g, '\u00e7\u00f5es');
  s = s.replace(/dad(?=\b|[ ,.!?])/g, 'dade');
  s = s.replace(/ancia/g, 'an\u00e7a');
  s = s.replace(/encia\b/g, '\u00eancia');
  // Specific word replacements
  const replacements = [
    [/\by\b/g, 'e'], [/\bY\b/g, 'E'],
    [/iniciar sesi\u00f3n/g, 'fazer login'], [/Iniciar sesi\u00f3n/g, 'Fazer login'],
    [/Inicia sesi\u00f3n/g, 'Fa\u00e7a login'], [/Iniciando sesi\u00f3n/g, 'Entrando'],
    [/Cerrar sesi\u00f3n/g, 'Sair'], [/cerrar sesi\u00f3n/g, 'sair'],
    [/Compartir/g, 'Compartilhar'], [/compartir/g, 'compartilhar'],
    [/compartible/g, 'compartilh\u00e1vel'], [/compartibles/g, 'compartilh\u00e1veis'],
    [/A\u00f1adir/g, 'Adicionar'], [/a\u00f1adir/g, 'adicionar'],
    [/Guardar/g, 'Salvar'], [/guardar/g, 'salvar'],
    [/Guardado/g, 'Salvo'], [/guardado/g, 'salvo'],
    [/Bienvenido/g, 'Bem-vindo'], [/bienvenido/g, 'bem-vindo'], [/bienvenida/g, 'bem-vinda'],
    [/Gracias/g, 'Obrigado'], [/gracias/g, 'obrigado'],
    [/Registrarse/g, 'Cadastrar'], [/registrarse/g, 'cadastrar'],
    [/Eliminar/g, 'Excluir'], [/eliminar/g, 'excluir'],
    [/Crear cuenta/g, 'Criar conta'], [/crear cuenta/g, 'criar conta'],
    [/Crear una cuenta/g, 'Criar uma conta'], [/crear una cuenta/g, 'criar uma conta'],
    [/Descubrir/g, 'Descobrir'], [/descubrir/g, 'descobrir'],
    [/descubre/g, 'descobre'], [/Descubre/g, 'Descubra'],
    [/Conocer/g, 'Conhecer'], [/conocer/g, 'conhecer'], [/conocido/g, 'conhecido'],
    [/ahora/g, 'agora'], [/siempre/g, 'sempre'], [/tambi\u00e9n/g, 'tamb\u00e9m'],
    [/puede/g, 'pode'], [/Puede/g, 'Pode'], [/puedes/g, 'pode'], [/Puedes/g, 'Pode'],
    [/pueden/g, 'podem'], [/Pueden/g, 'Podem'],
    [/tiene/g, 'tem'], [/Tiene/g, 'Tem'], [/tienen/g, 't\u00eam'], [/tener/g, 'ter'],
    [/hacer/g, 'fazer'], [/Hacer/g, 'Fazer'], [/hace/g, 'faz'], [/Hace/g, 'Faz'], [/hacen/g, 'fazem'],
    [/eres/g, '\u00e9s'], [/son\b/g, 's\u00e3o'],
    [/est\u00e1n/g, 'est\u00e3o'],
    [/leer/g, 'ler'], [/Leer/g, 'Ler'],
    [/escribir/g, 'escrever'], [/trabajar/g, 'trabalhar'],
    [/empezar/g, 'come\u00e7ar'], [/Empezar/g, 'Come\u00e7ar'], [/empieza/g, 'come\u00e7a'],
    [/recibir/g, 'receber'], [/vivir/g, 'viver'],
    [/\u00f1/g, 'n'], [/\u00d1/g, 'N'], [/\u00bf/g, ''],
    [/naci\u00f3n/g, 'na\u00e7\u00e3o'], [/informaci\u00f3n/g, 'informa\u00e7\u00e3o'],
    [/comunidad/g, 'comunidade'], [/ciudad/g, 'cidade'],
    [/oportunidad/g, 'oportunidade'], [/realidad/g, 'realidade'], [/actividad/g, 'atividade'],
    [/experiencia/g, 'experi\u00eancia'], [/diferencia/g, 'diferen\u00e7a'],
    [/importancia/g, 'import\u00e2ncia'],
    [/asociaci\u00f3n/g, 'associa\u00e7\u00e3o'], [/organizaci\u00f3n/g, 'organiza\u00e7\u00e3o'],
    [/publicaci\u00f3n/g, 'publica\u00e7\u00e3o'], [/recomendaci\u00f3n/g, 'recomenda\u00e7\u00e3o'],
    [/colecci\u00f3n/g, 'cole\u00e7\u00e3o'], [/selecci\u00f3n/g, 'sele\u00e7\u00e3o'], [/direcci\u00f3n/g, 'dire\u00e7\u00e3o'],
    [/Descripci\u00f3n/g, 'Descri\u00e7\u00e3o'], [/descripci\u00f3n/g, 'descri\u00e7\u00e3o'],
    [/Verificaci\u00f3n/g, 'Verifica\u00e7\u00e3o'], [/verificaci\u00f3n/g, 'verifica\u00e7\u00e3o'],
    [/navegaci\u00f3n/g, 'navega\u00e7\u00e3o'], [/configuraci\u00f3n/g, 'configura\u00e7\u00e3o'],
    [/aplicaci\u00f3n/g, 'aplicativo'], [/traductor/g, 'tradutor'], [/Traductor/g, 'Tradutor'],
    [/actualizar/g, 'atualizar'], [/Actualizar/g, 'Atualizar'],
    [/editar/g, 'editar'], [/Editar/g, 'Editar'],
  ];
  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function convertObj(obj) {
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      res[k] = convertObj(v);
    } else if (typeof v === 'string') {
      res[k] = esToPt(v);
    } else {
      res[k] = v;
    }
  }
  return res;
}

// Get leaf keys for comparison
function getLeafKeys(o, p = '', res = {}) {
  for (const k of Object.keys(o)) {
    const fp = p ? p + '.' + k : k;
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) getLeafKeys(o[k], fp, res);
    else res[fp] = o[k];
  }
  return res;
}

const enLeaf = getLeafKeys(en);
const ptLeaf = getLeafKeys(pt);

// Strategy: rebuild pt by taking converted ES as base, then for any key where pt already had a DIFFERENT value from English, preserve that
const ptFromEs = convertObj(es);

// Walk the converted ES tree, override with pt values that are different from English
function mergeNonEnglish(t, s) {
  const r = { ...t };
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      r[k] = mergeNonEnglish(r[k] || {}, s[k]);
    } else if (typeof r[k] === 'string') {
      // keep r[k] (converted ES value)
    } else {
      r[k] = s[k];
    }
  }
  return r;
}

const merged = mergeNonEnglish(ptFromEs, pt);

// Ensure merged has ALL keys from en template
function ensureAllKeys(t, s) {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      if (!t[k] || typeof t[k] !== 'object') t[k] = {};
      ensureAllKeys(t[k], s[k]);
    } else if (!(k in t)) {
      t[k] = s[k];
    }
  }
}
ensureAllKeys(merged, en);

fs.writeFileSync('waynest-FE/public/locales/pt/translation.json', JSON.stringify(merged, null, 2) + '\n', 'utf-8');

const newPtLeaf = getLeafKeys(merged);
const stillEn = Object.entries(newPtLeaf).filter(([k, v]) => enLeaf[k] !== undefined && enLeaf[k] === v);
console.log('pt remaining English keys: ' + stillEn.length + '/' + Object.keys(newPtLeaf).length);
