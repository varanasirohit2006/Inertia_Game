// Configuration
const COLS = 15;
const ROWS = 10;
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
let isMoving = false;
let historyStack = [];

// DOM Elements
const container = document.getElementById('gameContainer');
const playerDiv = document.getElementById('player');
const gemsDisplay = document.getElementById('gemsDisplay');
const movesDisplay = document.getElementById('movesDisplay');
const overlay = document.getElementById('overlay');
const msgText = document.getElementById('msg');

// --- Initialization ---

window.onload = function () {
    startNewGame();
};

function startNewGame() {
    overlay.style.display = 'none';
    historyStack = [];
    movesCount = 0;
    createLevel();
    drawGrid();
    updateUI();
}

// Initializes the game grid and randomly populates it with obstacles, gems, and the player to set up a new level.
function createLevel() {
    grid = [];
    gemsCount = 0;

    // 1. Create Grid
    for (let y = 0; y < ROWS; y++) {
        let row = [];
        for (let x = 0; x < COLS; x++) {
            row.push(EMPTY);
        }
        grid.push(row);
    }

    // 2. Add Stuff
    addRandomEntity(WALL, 30);
    addRandomEntity(STOP, 8);
    addRandomEntity(MINE, 12);

    // 3. Add Player
    do {
        player.x = Math.floor(Math.random() * COLS);
        player.y = Math.floor(Math.random() * ROWS);
    } while (grid[player.y][player.x] !== EMPTY);

    // 4. Add Gems
    while (gemsCount < 10) {
        let x = Math.floor(Math.random() * COLS);
        let y = Math.floor(Math.random() * ROWS);
        if (grid[y][x] === EMPTY && (x !== player.x || y !== player.y)) {
            grid[y][x] = GEM;
            gemsCount++;
        }
    }
}

function addRandomEntity(type, count) {
    for (let i = 0; i < count; i++) {
        let x = Math.floor(Math.random() * COLS);
        let y = Math.floor(Math.random() * ROWS);
        if (grid[y][x] === EMPTY) grid[y][x] = type;
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
}

// --- Player Movement ---

document.addEventListener('keydown', function (event) {
    if (isMoving) return;

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
    updateUI();//increment move count and gem count in UI

    let crashed = false;

    // Slide Loop
    while (true) {
        let nx = player.x + dx;
        let ny = player.y + dy;

        // Check Walls & Bounds 
        //it not for dfs and bfs pathfinding algorithms only for player movement
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || grid[ny][nx] === WALL) break;

        player.x = nx;
        player.y = ny;
        updatePlayerPos();//update player position on UI

        // Collect Gem
        if (grid[player.y][player.x] === GEM) {
            grid[player.y][player.x] = EMPTY;
            gemsCount--;
            let g = document.getElementById(`gem-${player.x}-${player.y}`);
            if (g) g.remove();
            updateUI();//update gem count in UI
        }

        await new Promise(r => setTimeout(r, 120)); // Animation Delay
        //time takes to move player from one tile to another for ui

        if (grid[player.y][player.x] === STOP) break;
        if (grid[player.y][player.x] === MINE) { crashed = true; break; }
    }

    isMoving = false;
    if (crashed) gameOver(false);
    else if (gemsCount === 0) gameOver(true);
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