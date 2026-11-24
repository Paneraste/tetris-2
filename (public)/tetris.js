import { database, ref, set, push, query, orderByChild, limitToLast, get } from './firebase.js';

// --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');

const canvasNext = document.getElementById('next-board');
const ctxNext = canvasNext ? canvasNext.getContext('2d') : null;

// Configuração do Tabuleiro
const COLS = 10;
const ROWS = 20;
let cellSize = 30;

// Variáveis de Controle
let gameLoopId = null;
let velocidade = 500; 

function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Mobile: 50% da altura da tela
        const maxHeight = window.innerHeight * 0.50;
        cellSize = Math.floor(maxHeight / ROWS);
    } else {
        cellSize = 30; 
    }
    canvas.width = cellSize * COLS;
    canvas.height = cellSize * ROWS;
}

resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    if(typeof t !== 'undefined') t.desenharTabuleiro(ctx);
});

// --- LÓGICA DO JOGO ---

class Peca {
    constructor() {
        this.valores = [];
        this.dim = 0;
        this.cor = '#00f3ff'; 
    }

    inicializarPeca() {
        const x = Math.trunc(7 * Math.random()); 
        switch (x % 5) { 
            case 0: // T
                this.dim = 3;
                this.valores = [[' ', ' ', ' '], ['*', '*', '*'], [' ', '*', ' ']];
                this.cor = '#bc13fe'; 
                break;
            case 1: // I
                this.dim = 4;
                this.valores = [['*', ' ', ' ', ' '], ['*', ' ', ' ', ' '], ['*', ' ', ' ', ' '], ['*', ' ', ' ', ' ']];
                this.cor = '#00f3ff'; 
                break;
            case 2: // O
                this.dim = 2;
                this.valores = [['*', '*'], ['*', '*']];
                this.cor = '#ffff00'; 
                break;
            case 3: // S
                this.dim = 3;
                this.valores = [[' ', ' ', ' '], ['*', '*', ' '], [' ', '*', '*']];
                this.cor = '#0aff0a'; 
                break;
            case 4: // L
                this.dim = 5; 
                this.valores = [[' ', ' ', '*', ' ', ' '], [' ', ' ', '*', ' ', ' '], [' ', ' ', '*', ' ', ' '], [' ', ' ', '*', ' ', ' '], [' ', ' ', '*', ' ', ' ']];
                this.cor = '#ff0055'; 
                break;
        }
    }

    transposta() {
        let temp = Array.from({ length: this.dim }, () => Array(this.dim).fill(' '));
        for (let i = 0; i < this.dim; i++) {
            for (let j = 0; j < this.dim; j++) {
                temp[i][j] = this.valores[j][i];
            }
        }
        this.valores = temp;
    }

    rotacionarDireita() {
        this.transposta();
        for (let i = 0; i < this.dim; i++) this.valores[i].reverse();
    }

    rotacionarEsquerda() {
        this.transposta();
        this.valores.reverse();
    }
}

class Tabuleiro {
    constructor(colunas, linhas) {
        this.colunas = colunas;
        this.linhas = linhas;
        this.valores = Array.from({ length: linhas }, () => Array(colunas).fill(' '));
        this.cores = Array.from({ length: linhas }, () => Array(colunas).fill(''));
    }

    inicializarTabuleiro() {
        for (let i = 0; i < this.linhas; i++) {
            this.valores[i].fill(' ');
            this.cores[i].fill('');
        }
    }

    marcarPeca(x, y, p) {
        for (let i = 0; i < p.dim; i++) {
            for (let j = 0; j < p.dim; j++) {
                if (p.valores[i][j] !== ' ') {
                    if (y + i >= 0 && y + i < this.linhas && x + j >= 0 && x + j < this.colunas) {
                        this.valores[y + i][x + j] = p.valores[i][j];
                        this.cores[y + i][x + j] = p.cor;
                    }
                }
            }
        }
    }

    apagarPeca(x, y, p) {
        for (let i = 0; i < p.dim; i++) {
            for (let j = 0; j < p.dim; j++) {
                if (p.valores[i][j] !== ' ') {
                    if (y + i >= 0 && y + i < this.linhas && x + j >= 0 && x + j < this.colunas) {
                        this.valores[y + i][x + j] = ' ';
                        this.cores[y + i][x + j] = '';
                    }
                }
            }
        }
    }

    eliminarLinhas() {
        let linhasRemovidas = 0;
        let linhaY = -1;
        
        for (let i = 0; i < this.linhas; i++) {
            if (this.valores[i].every(val => val !== ' ')) {
                linhasRemovidas++;
                linhaY = i;
                
                const sound = document.getElementById('line-clear-sound');
                if (sound) { sound.currentTime = 0; sound.play().catch(e => {}); }
                
                this.valores.splice(i, 1);
                this.cores.splice(i, 1);
                this.valores.unshift(Array(this.colunas).fill(' '));
                this.cores.unshift(Array(this.colunas).fill(''));
            }
        }
        return { qtd: linhasRemovidas, y: linhaY };
    }

    encaixa(x, y, p) {
        for (let i = 0; i < p.dim; i++) {
            for (let j = 0; j < p.dim; j++) {
                if (p.valores[i][j] !== ' ') {
                    let py = y + i;
                    let px = x + j;
                    if (px < 0 || px >= this.colunas || py >= this.linhas) return false;
                    if (py >= 0 && this.valores[py][px] !== ' ') return false;
                }
            }
        }
        return true;
    }

    desenharTabuleiro(ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<=this.colunas; i++) {
            ctx.beginPath(); ctx.moveTo(i*cellSize, 0); ctx.lineTo(i*cellSize, canvas.height); ctx.stroke();
        }
        for(let i=0; i<=this.linhas; i++) {
            ctx.beginPath(); ctx.moveTo(0, i*cellSize); ctx.lineTo(canvas.width, i*cellSize); ctx.stroke();
        }

        for (let i = 0; i < this.linhas; i++) {
            for (let j = 0; j < this.colunas; j++) {
                if (this.valores[i][j] !== ' ') {
                    const color = this.cores[i][j] || '#fff';
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 15;
                    ctx.fillStyle = color;
                    ctx.fillRect(j * cellSize + 1, i * cellSize + 1, cellSize - 2, cellSize - 2);
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect(j * cellSize + 1, i * cellSize + 1, cellSize - 2, (cellSize - 2)/2);
                }
            }
        }
    }
}

// --- ESTADO DO JOGO ---
let p = new Peca();         
let proximaPeca = new Peca(); 
const t = new Tabuleiro(COLS, ROWS);
let x = 0;
let y = 0;
let gameOver = false;
let paused = false;
let pontuacao = 0;

// --- FUNÇÕES DE ÁUDIO ---
function iniciarMusica() {
    const audio = document.getElementById('background-music');
    if (audio && audio.paused) {
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Aguardando interação"));
    }
}

// --- FUNÇÕES VISUAIS ---

function mostrarNotificacaoVelocidade() {
    const toast = document.getElementById('speed-toast');
    if(toast) {
        toast.textContent = `VELOCIDADE AUMENTOU! (${velocidade}ms)`;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
    }
}

function criarTextoFlutuante(pontos, linhaY) {
    const div = document.createElement('div');
    div.classList.add('float-score');
    div.textContent = `+${pontos}`;
    
    if (pontos < 400) div.classList.add('score-tier-1');
    else if (pontos < 900) div.classList.add('score-tier-2');
    else if (pontos < 1600) div.classList.add('score-tier-3');
    else div.classList.add('score-tier-4');

    const rect = canvas.getBoundingClientRect();
    const pixelY = (linhaY >= 0 ? linhaY : 10) * cellSize;
    
    div.style.left = (rect.left + rect.width / 2 - 30) + 'px'; 
    div.style.top = (rect.top + pixelY) + 'px';

    document.body.appendChild(div);
    setTimeout(() => { div.remove(); }, 1500);
}

function atualizarDificuldade() {
    const nivel = Math.floor(pontuacao / 1000);
    // LIMITE ALTERADO PARA 150ms COMO PEDIDO
    const novaVelocidade = Math.max(150, 500 - (nivel * 50));
    
    if (novaVelocidade !== velocidade) {
        velocidade = novaVelocidade;
        console.log(`Nova velocidade: ${velocidade}ms`);
        mostrarNotificacaoVelocidade();
    }
}

// --- FUNÇÕES AUXILIARES ---

function desenharPreview() {
    if (!ctxNext) return;
    const size = 25; 
    const w = canvasNext.width;
    const h = canvasNext.height;
    
    ctxNext.clearRect(0, 0, w, h);
    
    const dim = proximaPeca.dim;
    const offsetX = (w - dim * size) / 2;
    const offsetY = (h - dim * size) / 2;

    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            if (proximaPeca.valores[i][j] !== ' ') {
                ctxNext.fillStyle = proximaPeca.cor;
                ctxNext.shadowColor = proximaPeca.cor;
                ctxNext.shadowBlur = 10;
                ctxNext.fillRect(offsetX + j * size, offsetY + i * size, size - 2, size - 2);
                ctxNext.shadowBlur = 0;
            }
        }
    }
}

function alternarPausa() {
    if (gameOver) return;
    paused = !paused;
    iniciarMusica();
    document.getElementById('btnpause').textContent = paused ? "RETOMAR" : "PAUSAR";
    
    if (!paused) {
        gameLoop(); 
    }
}

// --- LÓGICA DE MOVIMENTO ---

async function descer() {
    if (paused || gameOver) return;
    
    t.apagarPeca(x, y, p);
    if (t.encaixa(x, y + 1, p)) {
        y++;
    } else {
        t.marcarPeca(x, y, p);
        const resultado = t.eliminarLinhas();
        const linhas = resultado.qtd;
        
        if (linhas > 0) {
            const pontosGanhos = linhas * 100 * linhas;
            pontuacao += pontosGanhos;
            document.getElementById('pontuacao').textContent = pontuacao;
            criarTextoFlutuante(pontosGanhos, resultado.y);
            atualizarDificuldade();
        }
        
        p = proximaPeca;
        proximaPeca = new Peca();
        proximaPeca.inicializarPeca();
        desenharPreview();

        x = Math.floor(COLS / 2) - Math.floor(p.dim / 2);
        y = 0;
        
        if (!t.encaixa(x, y, p)) {
            gameOver = true;
            t.marcarPeca(x, y, p);
            t.desenharTabuleiro(ctx);
            encerrarJogo();
            return;
        }
    }
    if(!gameOver) {
        t.marcarPeca(x, y, p);
        t.desenharTabuleiro(ctx);
    }
}

function mover(dir) {
    if (paused || gameOver) return;
    iniciarMusica();
    t.apagarPeca(x, y, p);
    if (t.encaixa(x + dir, y, p)) {
        x += dir;
    }
    t.marcarPeca(x, y, p);
    t.desenharTabuleiro(ctx);
}

function rotacionar() {
    if (paused || gameOver) return;
    iniciarMusica();
    t.apagarPeca(x, y, p);
    p.rotacionarDireita();
    if (!t.encaixa(x, y, p)) {
        p.rotacionarEsquerda();
    }
    t.marcarPeca(x, y, p);
    t.desenharTabuleiro(ctx);
}

// --- LÓGICA DE RECORDES (TOP 5 GLOBAL) ---

// Função Auxiliar: Busca recordes e retorna lista ordenada (Maior -> Menor)
async function getTopRecordes() {
    // Pega os últimos 10 para garantir
    const dbRef = query(ref(database, 'recordes'), orderByChild('pontos'), limitToLast(10));
    const snapshot = await get(dbRef);
    const records = [];

    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            records.push(child.val());
        });
    }
    
    // Ordena decrescente (Maior pontos primeiro)
    return records.sort((a, b) => b.pontos - a.pontos);
}

async function carregarRecordes() {
    try {
        const topList = await getTopRecordes();
        // Pega só os 5 primeiros (Top 5)
        const top5 = topList.slice(0, 5); 

        const container = document.getElementById('record-table');
        container.innerHTML = ''; // Limpa a lista atual

        // Cria a lista visualmente
        for (let i = 0; i < 5; i++) {
            const p = document.createElement('p');
            if (top5[i]) {
                p.textContent = `${i + 1}. ${top5[i].nome} - ${top5[i].pontos}`;
                // Destaca o 1º lugar
                if (i === 0) p.style.color = '#bc13fe'; 
            } else {
                p.textContent = `${i + 1}. ---`;
            }
            container.appendChild(p);
        }
    } catch (e) { 
        console.error("Erro ao carregar ranking:", e); 
    }
}

function encerrarJogo() {
    if (gameLoopId) clearTimeout(gameLoopId);
    
    checarNovoRecorde(pontuacao).then(isNewRecord => {
        if (isNewRecord) {
            document.getElementById('name-input-container').classList.remove('hidden');
        } else {
            alert('Game Over! Pontuação: ' + pontuacao);
            setTimeout(resetGame, 2000); 
        }
    });
}

async function checarNovoRecorde(pontos) {
    if (pontos === 0) return false;
    try {
        const topList = await getTopRecordes();
        
        // Se tem menos de 5 recordes, com certeza entrou
        if (topList.length < 5) return true;

        // Se tem 5, verifica se sua pontuação é maior que a do 5º colocado
        const quintoLugar = topList[4].pontos; // Índice 4 é o quinto
        return pontos > quintoLugar;

    } catch(e) { 
        console.error(e);
        return false; 
    }
}

document.getElementById('save-name').addEventListener('click', async () => {
    const nomeInput = document.getElementById('player-name');
    const nome = nomeInput.value.trim() || 'Anônimo';
    try {
        // Apenas salva no banco. A ordenação é feita na visualização.
        await set(push(ref(database, 'recordes')), {
            nome: nome,
            pontos: Number(pontuacao)
        });
        
        document.getElementById('name-input-container').classList.add('hidden');
        nomeInput.value = '';
        await carregarRecordes(); // Recarrega para mostrar a nova posição
        resetGame();
    } catch(e) { 
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar recorde."); 
        resetGame();
    }
});

// --- GAME LOOP E INICIALIZAÇÃO ---

function gameLoop() {
    if (!gameOver && !paused) {
        descer();
        gameLoopId = setTimeout(gameLoop, velocidade);
    }
}

function resetGame() {
    t.inicializarTabuleiro();
    
    p = new Peca();
    p.inicializarPeca();
    proximaPeca = new Peca();
    proximaPeca.inicializarPeca();
    desenharPreview();

    x = Math.floor(COLS / 2) - Math.floor(p.dim / 2);
    y = 0;
    
    pontuacao = 0;
    velocidade = 500; 
    
    document.getElementById('pontuacao').textContent = "0";
    gameOver = false;
    paused = false;
    document.getElementById('btnpause').textContent = "PAUSAR";
    
    t.marcarPeca(x, y, p);
    t.desenharTabuleiro(ctx);
    
    if (gameLoopId) clearTimeout(gameLoopId);
    gameLoop();
}

// --- EVENTOS DE ENTRADA ---

document.addEventListener('keydown', (e) => {
    iniciarMusica(); 

    if (e.keyCode === 32) {
        e.preventDefault(); 
        alternarPausa();
        return;
    }

    switch(e.keyCode) {
        case 37: mover(-1); break;
        case 39: mover(1); break;
        case 38: rotacionar(); break;
        case 40: descer(); break;
    }
});

function setupBtn(id, action) {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        iniciarMusica();
        action(); 
    }, {passive: false});
    btn.addEventListener('click', (e) => { 
        iniciarMusica();
        action(); 
    });
}

setupBtn('btnleft', () => mover(-1));
setupBtn('btnesq', () => mover(-1));
setupBtn('btnright', () => mover(1));
setupBtn('btndir', () => rotacionar());
setupBtn('btndown', () => descer());

document.getElementById('btnpause').addEventListener('click', alternarPausa);

document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    t.inicializarTabuleiro();
    
    p.inicializarPeca();
    proximaPeca.inicializarPeca();
    desenharPreview();
    
    t.marcarPeca(x, y, p);
    t.desenharTabuleiro(ctx);
    carregarRecordes();
    
    gameLoop();
    iniciarMusica();
});

// --- CENA THREE.JS (Fundo) ---
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';

const container = document.getElementById('particle-background');
if(container) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    camera.position.z = 5;

    const particles = new THREE.Group();
    scene.add(particles);
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });

    for (let i = 0; i < 300; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
        particles.add(mesh);
    }

    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.002;
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}