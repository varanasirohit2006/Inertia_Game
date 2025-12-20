
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
    if (event.key === 'ArrowUp') movePlayer(0, -1);
    else if (event.key === 'ArrowDown') movePlayer(0, 1);
    else if (event.key === 'ArrowLeft') movePlayer(-1, 0);
    else if (event.key === 'ArrowRight') movePlayer(1, 0);
    else if (event.key === 'z') undoMove();
});

async function movePlayer(dx, dy) {
    if (isMoving) return;
    saveHistory(); // for undo
    isMoving = true;
    movesCount++;
    updateUI();

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

    isMoving = false;
    if (crashed) gameOver(false);
    else if (gemsCount === 0) gameOver(true);
}

// --- Simple Auto Solver ---

// --- Auto Solver (Very Simple BFS) ---

async function solveGame() {
    if (isMoving) return;
    let btn = document.getElementById('solveBtn');
    btn.innerText = "Solving...";

    // 1. Where are all the gems?
    // We make a list of their coordinates: ["3,4", "5,5", ...]
    let allGems = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === GEM) allGems.push(x + "," + y);
        }
    }

    // 2. Setup the Queue for BFS
    // Start with: Player position, NO collected gems yet, and NO moves made.
    let queue = [];
    queue.push({
        x: player.x,
        y: player.y,
        collected: [], // List of gems we picked up
        path: []       // List of moves: [[0,1], [1,0], ...]
    });

    // To prevent loops, remember where we have been
    let visited = new Set();
    visited.add(player.x + "," + player.y + ",");

    // The 8 possible directions
    let directions = [
        [0, -1], [0, 1], [-1, 0], [1, 0],  // Up, Down, Left, Right
        [-1, -1], [1, -1], [-1, 1], [1, 1] // Diagonals
    ];

    while (queue.length > 0) {
        // Take the first item
        let current = queue.shift();

        // Check if we WON
        if (current.collected.length === allGems.length) {
            // Yes! Run the moves
            for (let move of current.path) {
                await movePlayer(move[0], move[1]);
                await new Promise(r => setTimeout(r, 400));
            }
            btn.innerText = "Auto Solve";
            return;
        }

        // Try all 8 directions
        for (let dir of directions) {
            let dx = dir[0];
            let dy = dir[1];

            // --- SIMULATE THE SLIDE ---
            // (We pretend to move without actually moving the player)
            let simX = current.x;
            let simY = current.y;
            let simCollected = [...current.collected]; // Copy list
            let crashed = false;

            while (true) {
                let nextX = simX + dx;
                let nextY = simY + dy;

                // Hit Wall or Bounds? Stop.
                if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS || grid[nextY][nextX] === WALL) {
                    break;
                }

                // Move one step in simulation
                simX = nextX;
                simY = nextY;

                // Did we pass a gem?
                if (grid[simY][simX] === GEM) {
                    let gemId = simX + "," + simY;
                    if (!simCollected.includes(gemId)) {
                        simCollected.push(gemId);
                    }
                }

                // Stop circle?
                if (grid[simY][simX] === STOP) break;

                // Mine?
                if (grid[simY][simX] === MINE) {
                    crashed = true;
                    break;
                }
            }
            // ---------------------------

            if (crashed) continue; // Don't add if we die
            if (simX === current.x && simY === current.y) continue; // Don't add if we didn't move

            // Sort gems to ensure unique state ID (e.g. "a,b" is same as "b,a")
            simCollected.sort();

            // Create a "State ID" -> Position + Collected Gems
            let stateId = simX + "," + simY + "," + simCollected.join("|");

            if (!visited.has(stateId)) {
                visited.add(stateId);

                // Add to queue
                queue.push({
                    x: simX,
                    y: simY,
                    collected: simCollected,
                    path: [...current.path, [dx, dy]] // Add this move
                });
            }
        }
    }

    alert("No Solution Found!");
    btn.innerText = "Auto Solve";
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
