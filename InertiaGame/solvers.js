// --- Auto Solver (Very Simple BFS) ---

async function solveGame() {
    if (isMoving || isProcessing) return;
    let btn = document.getElementById('solveBtn');
    let originalText = btn.innerText;
    btn.innerText = "BFS Solving...";
    toggleUI(true);
    await new Promise(r => setTimeout(r, 50));

    try {
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
            await checkPause();
            // Take the first item
            let current = queue.shift();

            // Check if we WON
            if (current.collected.length === allGems.length) {
                // Yes! Run the moves9
                for (let move of current.path) {
                    await checkPause();
                    await movePlayer(move[0], move[1]);
                    await new Promise(r => setTimeout(r, 1000));
                }
                btn.innerText = originalText;
                toggleUI(false);
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
    } catch (e) {
        console.error(e);
        alert("Error during solving.");
    }

    btn.innerText = originalText;
    toggleUI(false);
}

// --- Auto Solver (DFS) ---

async function solveGameDFS() {
    if (isMoving || isProcessing) return;
    let btn = document.getElementById('solveDfsBtn');
    let originalText = btn.innerText;
    btn.innerText = "DFS Solving...";
    toggleUI(true);
    await new Promise(r => setTimeout(r, 50));

    try {
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
            await checkPause();
            let current = stack.pop(); // DFS: Last In, First Out

            // Check if we WON
            if (current.collected.length === allGems.length) {
                for (let move of current.path) {
                    await checkPause();
                    await movePlayer(move[0], move[1]);
                    await new Promise(r => setTimeout(r, 400));
                }
                btn.innerText = originalText;
                toggleUI(false);
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
    } catch (e) {
        console.error(e);
        alert("Error during DFS.");
    }
    btn.innerText = originalText;
    toggleUI(false);
}

// --- Auto Solver (Sorted / Greedy Best-First) ---

async function solveGameSorted() {
    if (isMoving || isProcessing) return;
    let btn = document.getElementById('solveSortedBtn');
    let originalText = btn.innerText;
    btn.innerText = "Sorted Solving...";
    toggleUI(true);
    await new Promise(r => setTimeout(r, 50));

    try {
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
            await checkPause();
            // --- SORTING STEP ---
            // Sort queue so the state with LOWEST score is at the start (Greedy)
            queue.sort((a, b) => getScore(a) - getScore(b));

            let current = queue.shift(); // Pick best

            // Check WIN
            if (current.collected.length === allGems.length) {
                for (let move of current.path) {
                    await checkPause();
                    await movePlayer(move[0], move[1]);
                    await new Promise(r => setTimeout(r, 400));
                }
                btn.innerText = originalText;
                toggleUI(false);
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
    } catch (e) {
        console.error(e);
        alert("Error during sorted solve.");
    }
    btn.innerText = originalText;
    toggleUI(false);
}

// --- Auto Solver (Divide & Conquer) ---
// Strategy: Recursively split the gems into two spatial groups.
// Solve for Group A, then from that end position solve for Group B.
// Try both orders (A->B and B->A) and pick the shorter total path.

async function solveGameDNC() {
    if (isMoving || isProcessing) return;
    let btn = document.getElementById('solveDncBtn');
    let originalText = btn.innerText;
    btn.innerText = "D&C Thinking...";
    toggleUI(true);
    await new Promise(r => setTimeout(r, 50));

    try {
        // 1. Get initial state
        let allGems = [];
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === GEM) allGems.push({ x: x, y: y, id: x + "," + y });
            }
        }

        // BFS Helper (Finds path to collect a SPECIFIC gem from current position)
        // Returns: { path: [[dx,dy], ...], endX, endY, success: bool }
        function bfsToTarget(sx, sy, targetGem) {
            let queue = [{ x: sx, y: sy, path: [] }];
            let visited = new Set();
            // State includes position only? No, we might circle around. 
            // But for reaching a target quickly, pos is enough? 
            // Better: pos + direction arrived from? Just pos is usually fine for simple connectivity.
            visited.add(sx + "," + sy);

            let directions = [
                [0, -1], [0, 1], [-1, 0], [1, 0],
                [-1, -1], [1, -1], [-1, 1], [1, 1]
            ];

            while (queue.length > 0) {
                let current = queue.shift();

                // Optimization: If path is too long, prune? No.

                for (let dir of directions) {
                    let dx = dir[0], dy = dir[1];
                    let simX = current.x, simY = current.y;
                    let crashed = false;
                    let collectedTarget = false;

                    // Simulate Slide
                    while (true) {
                        let nextX = simX + dx;
                        let nextY = simY + dy;

                        if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS || grid[nextY][nextX] === WALL) break;

                        simX = nextX;
                        simY = nextY;

                        // Passes through target?
                        if (simX === targetGem.x && simY === targetGem.y) {
                            collectedTarget = true;
                        }

                        if (grid[simY][simX] === STOP) break;
                        if (grid[simY][simX] === MINE) { crashed = true; break; }
                    }

                    if (crashed) continue;
                    if (simX === current.x && simY === current.y) continue;

                    // If we collected our target, this is a valid step!
                    // We return immediately because BFS guarantees shortest steps (moves).
                    if (collectedTarget) {
                        return {
                            path: [...current.path, [dx, dy]],
                            endX: simX,
                            endY: simY,
                            success: true
                        };
                    }

                    let stateId = simX + "," + simY;
                    if (!visited.has(stateId)) {
                        visited.add(stateId);
                        queue.push({ x: simX, y: simY, path: [...current.path, [dx, dy]] });
                    }
                }
            }
            return { success: false };
        }

        // Recursive Solver
        function solveRecursive(startX, startY, gemsToCollect) {
            // Base Case 0: No gems
            if (gemsToCollect.length === 0) {
                return { path: [], endX: startX, endY: startY, success: true };
            }

            // Base Case 1: 1 Gem -> BFS to it
            if (gemsToCollect.length === 1) {
                return bfsToTarget(startX, startY, gemsToCollect[0]);
            }

            // --- DIVIDE ---
            // Find bounding box to determine split axis
            let minX = 100, maxX = -1, minY = 100, maxY = -1;
            gemsToCollect.forEach(g => {
                if (g.x < minX) minX = g.x;
                if (g.x > maxX) maxX = g.x;
                if (g.y < minY) minY = g.y;
                if (g.y > maxY) maxY = g.y;
            });

            let rangeX = maxX - minX;
            let rangeY = maxY - minY;
            let isSplitX = rangeX >= rangeY;

            // Sort
            let sortedGems = [...gemsToCollect].sort((a, b) => {
                return isSplitX ? (a.x - b.x) : (a.y - b.y);
            });

            // Split
            let mid = Math.floor(sortedGems.length / 2);
            let groupA = sortedGems.slice(0, mid);
            let groupB = sortedGems.slice(mid);

            // --- CONQUER ---
            let bestResult = null;
            let bestLen = 100000;

            // Try Path 1: Start -> A -> B
            let resA1 = solveRecursive(startX, startY, groupA);
            if (resA1.success) {
                let resB1 = solveRecursive(resA1.endX, resA1.endY, groupB);
                if (resB1.success) {
                    let totalLen = resA1.path.length + resB1.path.length;
                    if (totalLen < bestLen) {
                        bestLen = totalLen;
                        bestResult = {
                            path: [...resA1.path, ...resB1.path],
                            endX: resB1.endX,
                            endY: resB1.endY,
                            success: true
                        };
                    }
                }
            }

            // Try Path 2: Start -> B -> A
            let resB2 = solveRecursive(startX, startY, groupB);
            if (resB2.success) {
                let resA2 = solveRecursive(resB2.endX, resB2.endY, groupA);
                if (resA2.success) {
                    let totalLen = resB2.path.length + resA2.path.length;
                    if (totalLen < bestLen) {
                        bestLen = totalLen;
                        bestResult = {
                            path: [...resB2.path, ...resA2.path],
                            endX: resA2.endX,
                            endY: resA2.endY,
                            success: true
                        };
                    }
                }
            }

            if (bestResult) return bestResult;
            return { success: false };
        }

        // 3. Execution
        // Note: We run calculation synchronously because N=10 is small for this D&C depth.
        let result = solveRecursive(player.x, player.y, allGems);

        if (result.success) {
            btn.innerText = "Executing D&C...";
            for (let move of result.path) {
                await checkPause();
                await movePlayer(move[0], move[1]);
                await new Promise(r => setTimeout(r, 400));
            }
            btn.innerText = originalText;
        } else {
            alert("D&C Failed to find a complete path. (Likely trapped)");
            btn.innerText = originalText;
        }
    } catch (e) {
        console.error(e);
        alert("Error during D&C.");
        btn.innerText = originalText;
    }
    toggleUI(false);
}
