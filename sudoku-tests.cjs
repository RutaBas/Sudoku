const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/sudoku.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function session(saved) {
  const elements = new Map();
  function element() {
    const classes = new Set();
    const children = [];
    return { children, dataset: {}, style: {}, textContent: '',
      classList: { add: (...s) => s.forEach(x => classes.add(x)), remove: (...s) => s.forEach(x => classes.delete(x)), toggle: (s, yes) => yes ? classes.add(s) : classes.delete(s), contains: s => classes.has(s) },
      appendChild: c => children.push(c), addEventListener() {}, setAttribute() {}, focus() {},
      querySelector: s => children.find(c => c.className === s.slice(1)),
      querySelectorAll: () => children,
    };
  }
  const get = key => { if (!elements.has(key)) elements.set(key, element()); return elements.get(key); };
  const storage = new Map(saved ? [['forest-sudoku-game-v1', saved]] : []);
  const ctx = vm.createContext({
    document: { getElementById: get, querySelector: get, createElement: element,
      querySelectorAll: s => s === '.num-btn' ? get('numpad').children : [], addEventListener() {} },
    window: { addEventListener() {} }, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    setInterval: () => 1, clearInterval() {}, setTimeout() {}, console, confirm:()=>true,
  });
  vm.runInContext(code, ctx);
  return { run: s => vm.runInContext(s, ctx), storage, get };
}
const a = session();
a.run(`newGame('mild');`);
assert.equal(a.run('board.length'), 81);
assert.equal(a.run('countSolutions(puzzle.slice())'), 1);
// Use an empty board with a valid solution so candidate behavior is deterministic.
a.run(`puzzle.fill(0); givens.fill(0); board.fill(0); initNotes(); history.length = 0; state.selected = 0;
notes[1].delete(9); placeDigit(0, 5);`);
assert.equal(a.run('notes[1].has(5)'), false);
a.run('placeDigit(0, 0)');
assert.equal(a.run('notes[1].has(5)'), true);
assert.equal(a.run('notes[1].has(9)'), false, 'manual exclusion preserved');
a.run('undoMove()');
assert.equal(a.run('board[0]'), 5);
assert.equal(a.run('notes[1].has(5)'), false);
a.run('placeDigit(0, 6)');
assert.equal(a.run('notes[1].has(5)'), true, 'replacement restores old candidate');
assert.equal(a.run('notes[1].has(6)'), false);
a.run('placeDigit(9, 6); placeDigit(0, 0)');
assert.equal(a.run('notes[1].has(6)'), false, 'another peer still excludes digit');
a.run('state.timerSeconds = 123; state.notesMode = true; state.hideNotes = true; togglePause();');
const b = session(a.storage.get('forest-sudoku-game-v1'));
for (const expr of ['JSON.stringify([...board])', 'JSON.stringify([...puzzle])', 'JSON.stringify([...solution])', 'JSON.stringify(notes.map(s => [...s]))', 'state.timerSeconds', 'state.paused', 'state.hideNotes', 'state.notesMode', 'history.length']) assert.equal(b.run(expr), a.run(expr), expr);
assert.equal(b.get('timer').textContent, '⏱ 02:03');
assert.equal(b.get('picker-overlay').classList.contains('hidden'), false);
assert.equal(b.get('game-screen').hidden, true);
assert.equal(b.run('state.timerInterval'), null, 'reload on Home stops timer');
b.run('resumeGame(); undoMove()');
assert.equal(b.run('board[0]'), 6, 'undo survives reload');
assert.equal(b.get('erase-btn').disabled, false);
b.run('placeDigit(state.selected, 0)');
assert.equal(b.get('erase-btn').disabled, true);
assert.equal(session('{bad json').run('gameStarted'), false);
assert.equal(session('{"version":99}').run('gameStarted'), false);
b.run(`localStorage.setItem = () => { throw new Error('quota'); }; placeDigit(0, 2);`);
assert.equal(b.run('board[0]'), 2, 'storage errors do not stop play');
assert.equal(b.get('save-status').textContent, 'Not saved');
assert.match(b.get('save-error').textContent, /could not be saved/);
console.log('PASS: unique puzzle, erase/replace candidates, manual exclusions, undo, save/resume, paused resume, invalid saves, storage failures.');
// Every offered level is classified by the exact same solver used for hints.
const c=session();
for(let rank=0;rank<6;rank++) for(let n=1;n<=8;n++) {
  c.run(`var sample=ratedPuzzle(LEVELS[${rank}], '2026-10-${String(n).padStart(2,'0')}');`);
  assert.equal(c.run('SudokuLogic.grade(sample).rank'),rank);
  assert.equal(c.run('SudokuLogic.solve(sample,2).length'),1);
  assert.equal(c.run(`JSON.stringify(sample)`), c.run(`JSON.stringify(ratedPuzzle(LEVELS[${rank}], '2026-10-${String(n).padStart(2,'0')}'))`));
  c.run('var testBoard=[...sample], testCandidates=SudokuLogic.candidates(testBoard), answer=SudokuLogic.solve(sample,1)[0];');
  for(let k=0;k<150;k++) {
    if(!c.run('var deduction=SudokuLogic.step(testBoard,testCandidates);Boolean(deduction)')) break;
    assert.equal(c.run('deduction.place ? answer[deduction.place[0]]===deduction.place[1] : deduction.remove.every(([i,d])=>answer[i]!==d)'),true,'hint is logically sound');
    c.run('SudokuLogic.apply(testBoard,testCandidates,deduction)');
  }
}
c.run(`newGame('seasoned','2026-10-17'); var initial=JSON.stringify([...board]);confirm=()=>false;requestGame('fiery');`);
assert.equal(c.run('JSON.stringify([...board])'),c.run('initial'),'cancel keeps game');
c.run('solveBoard()');assert.equal(c.run('state.solved'),false,'cancel reveal keeps game');
c.run('confirm=()=>true;showHint()');assert.equal(c.run('Boolean(pendingHint)'),true);
c.run('var hintIndex=pendingHint.step.place[0];applyHint()');assert.equal(c.run('board[hintIndex]===solution[hintIndex]'),true);
c.run('var empty=board.findIndex((v,i)=>!v);placeDigit(empty,solution[empty]%9+1);checkBoard();onCellClick((empty+1)%81)');
assert.equal(c.run('checkedErrors.has(empty)'),true,'check persists across selection');
c.run('placeDigit(empty,0)');assert.equal(c.run('checkedErrors.has(empty)'),false,'erase clears checked error');
c.run(`newGame('mild','2026-10-17');state.timerSeconds=80;board.set(solution);checkWin();recordWin();`);
assert.equal(c.run('Object.keys(stats).length'),1,'win counts once');
c.run(`newGame('mild','2026-10-17');board.set(solution);checkWin();`);
assert.equal(c.run('Object.keys(stats).length'),1,'daily replay does not count twice');
c.run(`newGame('fiery');solveBoard()`);
assert.equal(c.run('Object.keys(stats).length'),1,'revealing does not count as win');
c.run(`newGame('mild');state.autoNotes=false;notes=Array.from({length:81},()=>new Set());var free=board.indexOf(0);placeDigit(free,solution[free]);placeDigit(free,0);`);
assert.equal(c.run('notes.every(s=>s.size===0)'),true,'manual mode does not autofill');
console.log('PASS: 48 rated daily puzzles, unique solutions, deterministic generation, hint deduction soundness, cancel/reveal protection, persistent checks, daily deduplication, manual notes.');
const d=session();
d.run("newGame('seasoned');state.timerSeconds=135;var free=board.indexOf(0);placeDigit(free,solution[free]);var beforeHome=JSON.stringify([...board]);var historyLength=history.length;openPicker();");
assert.equal(d.run('screen'),'home');
assert.equal(d.run('state.timerInterval'),null);
assert.equal(d.get('resume-time').textContent,'02:15');
d.run('placeDigit(free,0);undoMove()');
assert.equal(d.run('JSON.stringify([...board])'),d.run('beforeHome'),'Home blocks board changes');
assert.equal(d.run('history.length'),d.run('historyLength'));
d.run('resumeGame()');
assert.equal(d.run('screen'),'game');
assert.equal(d.run('state.timerSeconds'),135);
assert.equal(d.run('JSON.stringify([...board])'),d.run('beforeHome'));
d.run("openSecondary('settings')");
assert.equal(d.run('state.timerInterval'),null,'settings stops timer');
d.run('backFromSecondary()');assert.equal(d.run('screen'),'game');
d.run("openPicker('daily');confirm=()=>false;requestGame('fiery',localDate());");
assert.equal(d.run('screen'),'home','cancel stays on Home');
assert.equal(d.run('JSON.stringify([...board])'),d.run('beforeHome'));
d.run("confirm=()=>true;requestGame('mild',localDate());var daily=JSON.stringify([...board]);openPicker('daily');confirm=()=>{throw Error('must not replace active daily')};requestGame('mild',localDate());");
assert.equal(d.run('screen'),'game');
assert.equal(d.run('JSON.stringify([...board])'),d.run('daily'));
d.run('showHint()');assert.equal(d.get('hint-card').hidden,false);
assert.match(d.get('apply-hint-btn').textContent,/^Place [1-9]$/);
d.run('openPicker()');assert.equal(d.get('hint-card').hidden,true);
console.log('PASS: Home/Resume preserves board, notes and history; secondary-screen timer suspension; reset cancellation; active daily resumption; hint card.');
const page=fs.readFileSync(__dirname+'/sudoku.html','utf8');
const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'unique DOM IDs');
for(const match of code.matchAll(/getElementById\('([^']+)'\)/g))assert(ids.includes(match[1]),'referenced element exists: '+match[1]);
const worker=fs.readFileSync(__dirname+'/sw.js','utf8');
for(const name of ['sudoku.html','ui.css','assets/pepper-tiers.png']) {
  assert(fs.existsSync(__dirname+'/'+name),'runtime asset exists: '+name);
  assert(worker.includes("'"+name+"'"),'runtime asset cached: '+name);
}
const artwork=fs.readFileSync(__dirname+'/assets/pepper-tiers.png');
assert.equal(artwork.readUInt32BE(16),1536);assert.equal(artwork.readUInt32BE(20),1024);
console.log('PASS: UI references, offline asset manifest, and approved pepper sprite dimensions.');
