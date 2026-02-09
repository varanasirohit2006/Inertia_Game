// Configuration
let COLS = 15;
let ROWS = 10;
let GEMS_TARGET = 10;
let WALLS_COUNT = 35;
let MINES_COUNT = 19;
const TILE_SIZE = 40;

// Tile Types
const EMPTY = 0;
const WALL = 1;
const STOP = 2;
const MINE = 3;
const GEM = 4;

// Game State Variables
let grid = [];
let player = { x: 0, y: 0 };
let gemsCount = 0;
let movesCount = 0;
let actualMines = 0;
let actualWalls = 0;
let isMoving = false;
let historyStack = [];
let initialState = null; // Store initial level state

// DOM Elements
// DOM Elements
const container = document.getElementById('gameContainer');
const playerDiv = document.getElementById('player');
const gemsDisplay = document.getElementById('gemsDisplay');
const movesDisplay = document.getElementById('movesDisplay');
const minesDisplay = document.getElementById('minesDisplay');
const wallsDisplay = document.getElementById('wallsDisplay');
const overlay = document.getElementById('overlay');
const msgText = document.getElementById('msg');
let isProcessing = false; // specific lock for solvers/animations

// Inputs
const inputRows = document.getElementById('inRows');
const inputCols = document.getElementById('inCols');
const inputGems = document.getElementById('inGems');
const inputMines = document.getElementById('inMines');
const inputWalls = document.getElementById('inWalls');

// --- Pause Mechanism ---
let isPaused = false;
let pauseResolver = null;

function togglePause() {
    isPaused = !isPaused;
    let btn = document.getElementById('pauseBtn');
    if (btn) btn.innerText = isPaused ? "Resume" : "Pause";

    // Resume if unpaused
    if (!isPaused && pauseResolver) {
        pauseResolver();
        pauseResolver = null;
    }
}

async function checkPause() {
    if (isPaused) {
        await new Promise(r => pauseResolver = r);
    }
}

// --- UI Interaction Lock ---
function toggleUI(disabled) {
    isProcessing = disabled;
    // Disable all buttons EXECPT Pause
    let btns = document.querySelectorAll('button');
    btns.forEach(b => {
        if (b.id !== 'pauseBtn') b.disabled = disabled;
    });

    let pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.disabled = !disabled; // Enable only when processing
        if (!disabled) {
            isPaused = false;
            pauseBtn.innerText = "Pause";
        }
    }

    // updates visual state if needed
    container.style.opacity = disabled ? "0.9" : "1";
}

// --- Initialization ---

window.onload = function () {
    // Set defaults if inputs exist
    if (inputRows) inputRows.value = ROWS;
    if (inputCols) inputCols.value = COLS;
    if (inputGems) inputGems.value = GEMS_TARGET;
    if (inputMines) inputMines.value = MINES_COUNT;
    if (inputWalls) inputWalls.value = WALLS_COUNT;

    startNewGame();
};

function startNewGame() {
    isPaused = false;
    let pBtn = document.getElementById('pauseBtn');
    if (pBtn) pBtn.innerText = "Pause";
    // Read Config if inputs exist
    if (inputRows) ROWS = parseInt(inputRows.value) || 10;
    if (inputCols) COLS = parseInt(inputCols.value) || 15;
    if (inputGems) GEMS_TARGET = parseInt(inputGems.value) || 10;
    if (inputWalls) WALLS_COUNT = parseInt(inputWalls.value) || 35;
    if (inputMines) MINES_COUNT = parseInt(inputMines.value) || 19;

    // Constraints
    if (ROWS < 5) ROWS = 5; if (ROWS > 20) ROWS = 20;
    if (COLS < 5) COLS = 5; if (COLS > 30) COLS = 30;

    overlay.style.display = 'none';
    historyStack = [];
    movesCount = 0;

    // RESET LOCKS
    isMoving = false;
    isProcessing = false;

    // Update CSS Grid Size
    document.documentElement.style.setProperty('--grid-width', COLS);
    document.documentElement.style.setProperty('--grid-height', ROWS);
    container.style.width = (COLS * TILE_SIZE) + 'px';
    container.style.height = (ROWS * TILE_SIZE) + 'px';

    createLevel();
    drawGrid();
    updateUI();
}

function restartLevel() {
    if (!initialState) return;

    overlay.style.display = 'none';
    historyStack = [];
    isMoving = false;
    isProcessing = false; // Reset lock

    // Restore State
    grid = JSON.parse(JSON.stringify(initialState.grid));
    player = { ...initialState.player };
    gemsCount = initialState.gemsCount;
    movesCount = 0;

    // Restore Dimensions if changed
    ROWS = grid.length;
    COLS = grid[0].length;
    document.documentElement.style.setProperty('--grid-width', COLS);
    document.documentElement.style.setProperty('--grid-height', ROWS);
    container.style.width = (COLS * TILE_SIZE) + 'px';
    container.style.height = (ROWS * TILE_SIZE) + 'px';

    drawGrid();
    updateUI();
}

// Initial Level Creation
function createLevel() {
    grid = [];
    gemsCount = 0;
    actualMines = 0;
    actualWalls = 0;

    // 1. Create Grid
    for (let y = 0; y < ROWS; y++) {
        let row = [];
        for (let x = 0; x < COLS; x++) {
            row.push(EMPTY);
        }
        grid.push(row);
    }

    // 2. Add Stuff
    addRandomEntity(WALL, WALLS_COUNT);
    addRandomEntity(STOP, 15);
    addRandomEntity(MINE, MINES_COUNT);

    // 3. Add Player
    do {
        player.x = Math.floor(Math.random() * COLS);
        player.y = Math.floor(Math.random() * ROWS);
    } while (grid[player.y][player.x] !== EMPTY);

    // 4. Add Gems
    // Limit gems if too many for grid size
    let safeSlots = (ROWS * COLS) - (WALLS_COUNT + MINES_COUNT + 15 + 1);
    let actualGems = Math.min(GEMS_TARGET, safeSlots);
    if (actualGems < 1) actualGems = 1;

    let placedGems = 0;
    let attempts = 0;
    while (placedGems < actualGems && attempts < 20000) {
        attempts++;
        let x = Math.floor(Math.random() * COLS);
        let y = Math.floor(Math.random() * ROWS);
        if (grid[y][x] === EMPTY && (x !== player.x || y !== player.y)) {
            grid[y][x] = GEM;
            placedGems++;
            gemsCount++;
        }
    }

    // Count Actual Entities
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === MINE) actualMines++;
            if (grid[y][x] === WALL) actualWalls++;
        }
    }

    // SAVE INITIAL STATE
    initialState = {
        grid: JSON.parse(JSON.stringify(grid)),
        player: { ...player },
        gemsCount: gemsCount,
        actualMines: actualMines,
        actualWalls: actualWalls
    };
}

function addRandomEntity(type, count) {
    let placed = 0;
    let attempts = 0;
    // Try to place exactly 'count' items, up to a safety limit
    while (placed < count && attempts < 20000) {
        attempts++;
        let x = Math.floor(Math.random() * COLS);
        let y = Math.floor(Math.random() * ROWS);
        if (grid[y][x] === EMPTY) {
            grid[y][x] = type;
            placed++;
        }
    }
}

// --- Rendering ---

function drawGrid() {
    let cells = document.querySelectorAll('.cell');
    cells.forEach(c => c.remove());

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.left = (x * TILE_SIZE) + 'px';
            cell.style.top = (y * TILE_SIZE) + 'px';

            let type = grid[y][x];
            if (type !== EMPTY) {
                let div = document.createElement('div');
                if (type === WALL) div.className = 'wall';
                if (type === STOP) div.className = 'stop';
                if (type === MINE) div.className = 'mine';
                if (type === GEM) { div.className = 'gem'; div.id = `gem-${x}-${y}`; }
                cell.appendChild(div);
            }
            container.appendChild(cell);
        }
    }
    updatePlayerPos();
}

function updatePlayerPos() {
    playerDiv.style.left = (player.x * TILE_SIZE) + 'px';
    playerDiv.style.top = (player.y * TILE_SIZE) + 'px';
}

function updateUI() {
    gemsDisplay.innerText = gemsCount;
    movesDisplay.innerText = movesCount;
    if (minesDisplay) minesDisplay.innerText = actualMines;
    if (wallsDisplay) wallsDisplay.innerText = actualWalls;
}

// --- Player Movement ---

document.addEventListener('keydown', function (event) {
    if (isMoving || isProcessing) return; // Block input if processing (solving)

    // Numpad Movement (1-9)
    if (event.key === '8') movePlayer(0, -1);       // Up
    else if (event.key === '2') movePlayer(0, 1);   // Down
    else if (event.key === '4') movePlayer(-1, 0);  // Left
    else if (event.key === '6') movePlayer(1, 0);   // Right
    else if (event.key === '7') movePlayer(-1, -1); // Up-Left
    else if (event.key === '9') movePlayer(1, -1);  // Up-Right
    else if (event.key === '1') movePlayer(-1, 1);  // Down-Left
    else if (event.key === '3') movePlayer(1, 1);   // Down-Right
    else if (event.key === '5'); // Wait / No Move

    else if (event.key === 'z') undoMove();
});

async function movePlayer(dx, dy) {
    if (isMoving) return;
    saveHistory(); // for undo
    isMoving = true;
    movesCount++;
    updateUI();

    try {
        let crashed = false;

        // Slide Loop
        while (true) {
            let nx = player.x + dx;
            let ny = player.y + dy;

            // Check Walls & Bounds 
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || grid[ny][nx] === WALL) break;

            player.x = nx;
            player.y = ny;
            updatePlayerPos();

            // Collect Gem
            if (grid[player.y][player.x] === GEM) {
                grid[player.y][player.x] = EMPTY;
                gemsCount--;
                let g = document.getElementById(`gem-${player.x}-${player.y}`);
                if (g) g.remove();
                updateUI();
            }

            await new Promise(r => setTimeout(r, 120)); // Animation Delay

            if (grid[player.y][player.x] === STOP) break;
            if (grid[player.y][player.x] === MINE) { crashed = true; break; }
        }

        if (crashed) gameOver(false);
        else if (gemsCount === 0) gameOver(true);

    } catch (e) {
        console.error("Movement Error:", e);
    } finally {
        isMoving = false;
    }
}

// --- Utils ---

function gameOver(win) {
    overlay.style.display = 'flex';
    msgText.innerText = win ? "You Win!" : "You Died!";
    msgText.style.color = win ? "lightgreen" : "red";
}

function saveHistory() {
    historyStack.push({
        grid: JSON.parse(JSON.stringify(grid)),
        player: { ...player },
        gems: gemsCount,
        moves: movesCount
    });
}

function undoMove() {
    if (historyStack.length === 0 || isMoving) return;
    let s = historyStack.pop();
    grid = s.grid; player = s.player; gemsCount = s.gems; movesCount = s.moves;
    drawGrid();
    updateUI();
    overlay.style.display = 'none';
}