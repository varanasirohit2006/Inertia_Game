// --- Auto Solver (Very Simple BFS) ---

async function solveGame() {
    if (isMoving) return;
    let btn = document.getElementById('solveBtn');
    btn.innerText = "BFS Solving...";

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
            btn.innerText = "BFS Solve";
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
    btn.innerText = "BFS Solve";
}

// --- Auto Solver (DFS) ---

async function solveGameDFS() {
    if (isMoving) return;
    let btn = document.getElementById('solveDfsBtn');
    btn.innerText = "DFS Solving...";

    // 1. Where are all the gems?
    let allGems = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === GEM) allGems.push(x + "," + y);
        }
    }

    // 2. Setup the Stack for DFS
    let stack = [];
    stack.push({
        x: player.x,
        y: player.y,
        collected: [],
        path: []
    });

    let visited = new Set();
    visited.add(player.x + "," + player.y + ",");

    let directions = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    while (stack.length > 0) {
        let current = stack.pop(); // DFS: Last In, First Out

        // Check if we WON
        if (current.collected.length === allGems.length) {
            for (let move of current.path) {
                await movePlayer(move[0], move[1]);
                await new Promise(r => setTimeout(r, 400));
            }
            btn.innerText = "DFS Solve";
            return;
        }

        for (let dir of directions) {
            let dx = dir[0];
            let dy = dir[1];

            let simX = current.x;
            let simY = current.y;
            let simCollected = [...current.collected];
            let crashed = false;

            while (true) {
                let nextX = simX + dx;
                let nextY = simY + dy;

                if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS || grid[nextY][nextX] === WALL) {
                    break;
                }

                simX = nextX;
                simY = nextY;

                if (grid[simY][simX] === GEM) {
                    let gemId = simX + "," + simY;
                    if (!simCollected.includes(gemId)) {
                        simCollected.push(gemId);
                    }
                }

                if (grid[simY][simX] === STOP) break;
                if (grid[simY][simX] === MINE) {
                    crashed = true;
                    break;
                }
            }

            if (crashed) continue;
            if (simX === current.x && simY === current.y) continue;

            simCollected.sort();
            let stateId = simX + "," + simY + "," + simCollected.join("|");

            if (!visited.has(stateId)) {
                visited.add(stateId);
                stack.push({
                    x: simX,
                    y: simY,
                    collected: simCollected,
                    path: [...current.path, [dx, dy]]
                });
            }
        }
    }

    alert("No Solution Found (DFS)!");
    btn.innerText = "DFS Solve";
}

// --- Auto Solver (Sorted / Greedy Best-First) ---

async function solveGameSorted() {
    if (isMoving) return;
    let btn = document.getElementById('solveSortedBtn');
    btn.innerText = "Sorted Solving...";

    // 1. Where are all the gems?
    let allGems = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] === GEM) allGems.push(x + "," + y);
        }
    }

    // Helper to calculate score (Lower is better)
    function getScore(state) {
        let remaining = allGems.length - state.collected.length;
        if (remaining === 0) return 0;

        // Find distance to closest gem
        let minDist = 10000;

        // Convert gem strings back to coords for distance calc
        // Optimization: parse only if needed or pre-parse. 
        // Given small N, parsing is okay.
        for (let g of allGems) {
            if (!state.collected.includes(g)) {
                let [gx, gy] = g.split(',').map(Number);
                let dist = Math.abs(state.x - gx) + Math.abs(state.y - gy);
                if (dist < minDist) minDist = dist;
            }
        }

        // Priority: Get gems first, then minimize distance
        return (remaining * 1000) + minDist;
    }

    // 2. Setup the Queue
    let queue = [];
    queue.push({
        x: player.x,
        y: player.y,
        collected: [],
        path: []
    });

    let visited = new Set();
    visited.add(player.x + "," + player.y + ",");

    let directions = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    while (queue.length > 0) {
        // --- SORTING STEP ---
        // Sort queue so the state with LOWEST score is at the start (Greedy)
        queue.sort((a, b) => getScore(a) - getScore(b));

        let current = queue.shift(); // Pick best

        // Check WIN
        if (current.collected.length === allGems.length) {
            for (let move of current.path) {
                await movePlayer(move[0], move[1]);
                await new Promise(r => setTimeout(r, 400));
            }
            btn.innerText = "Sorted Solve";
            return;
        }

        // Expand
        for (let dir of directions) {
            let dx = dir[0];
            let dy = dir[1];

            let simX = current.x;
            let simY = current.y;
            let simCollected = [...current.collected];
            let crashed = false;

            while (true) {
                let nextX = simX + dx;
                let nextY = simY + dy;

                if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS || grid[nextY][nextX] === WALL) {
                    break;
                }

                simX = nextX;
                simY = nextY;

                if (grid[simY][simX] === GEM) {
                    let gemId = simX + "," + simY;
                    if (!simCollected.includes(gemId)) {
                        simCollected.push(gemId);
                    }
                }

                if (grid[simY][simX] === STOP) break;
                if (grid[simY][simX] === MINE) {
                    crashed = true;
                    break;
                }
            }

            if (crashed) continue;
            if (simX === current.x && simY === current.y) continue;

            simCollected.sort();
            let stateId = simX + "," + simY + "," + simCollected.join("|");

            if (!visited.has(stateId)) {
                visited.add(stateId);
                queue.push({
                    x: simX,
                    y: simY,
                    collected: simCollected,
                    path: [...current.path, [dx, dy]]
                });
            }
        }
    }

    alert("No Solution Found (Sorted)!");
    btn.innerText = "Sorted Solve";
}
