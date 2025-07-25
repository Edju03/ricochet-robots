// Game constants
const GRID_SIZE = 5;
const CELL_SIZE = 120;
const WALL_THICKNESS = 5;

// Direction enum
const Direction = {
    NORTH: { row: -1, col: 0 },
    SOUTH: { row: 1, col: 0 },
    EAST: { row: 0, col: 1 },
    WEST: { row: 0, col: -1 }
};

// Cell types
const CellType = {
    EMPTY: 'empty',
    ROBOT: 'robot',
    START: 'start',
    GOAL: 'goal',
    GEM1: 'gem1',
    GEM2: 'gem2'
};

// Position class
class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    equals(other) {
        return this.row === other.row && this.col === other.col;
    }

    add(direction) {
        return new Position(this.row + direction.row, this.col + direction.col);
    }

    toString() {
        return `${this.row},${this.col}`;
    }
}

// Wall class
class EdgeWall {
    constructor(fromPos, toPos) {
        this.fromPos = fromPos;
        this.toPos = toPos;
    }
}

// Main game class
class RicochetGame {
    constructor() {
        this.gridSize = GRID_SIZE;
        this.grid = [];
        this.walls = [];
        this.robotPos = null;
        this.startPos = null;
        this.goalPos = null;
        this.gem1Pos = null;
        this.gem2Pos = null;
        this.visitedFriends = new Set();
        this.moveCount = 0;
        this.gameWon = false;
        this.optimalMoves = null;
        
        this.initializeGrid();
    }

    initializeGrid() {
        this.grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = CellType.EMPTY;
            }
        }
    }

    isValidPosition(pos) {
        return pos.row >= 0 && pos.row < this.gridSize && 
               pos.col >= 0 && pos.col < this.gridSize;
    }

    isWallBetween(pos1, pos2) {
        return this.walls.some(wall => 
            (wall.fromPos.equals(pos1) && wall.toPos.equals(pos2)) ||
            (wall.fromPos.equals(pos2) && wall.toPos.equals(pos1))
        );
    }

    ricochetMove(startPos, direction) {
        let currentPos = startPos;
        const path = [new Position(startPos.row, startPos.col)];
        
        while (true) {
            const nextPos = currentPos.add(direction);
            
            // Check boundaries
            if (!this.isValidPosition(nextPos)) {
                return { finalPos: currentPos, path: path };
            }
            
            // Check wall collision
            if (this.isWallBetween(currentPos, nextPos)) {
                return { finalPos: currentPos, path: path };
            }
            
            currentPos = nextPos;
            path.push(new Position(currentPos.row, currentPos.col));
        }
    }

    moveRobot(direction) {
        if (this.gameWon) return null;
        
        const result = this.ricochetMove(this.robotPos, direction);
        const oldPos = new Position(this.robotPos.row, this.robotPos.col);
        
        if (!result.finalPos.equals(this.robotPos)) {
            this.robotPos = result.finalPos;
            this.moveCount++;
            
            let friendVisited = false;
            
            // Check for crystal collection and goal completion during movement
            for (let i = 1; i < result.path.length; i++) {
                const pos = result.path[i];
                if (pos.equals(this.gem1Pos) || pos.equals(this.gem2Pos)) {
                    this.visitedFriends.add(pos.toString());
                    friendVisited = true;
                }
                // Check if passing through portal after collecting both gems
                if (pos.equals(this.goalPos) && this.visitedFriends.size === 2) {
                    this.gameWon = true;
                }
            }
            
            // Also check if we landed on the goal with both gems collected
            if (result.finalPos.equals(this.goalPos) && this.visitedFriends.size === 2) {
                this.gameWon = true;
            }
            
            this.updateGrid();
            return {
                moved: true,
                oldPos: oldPos,
                newPos: result.finalPos,
                friendVisited: friendVisited
            };
        }
        
        return { moved: false };
    }

    updateGrid() {
        // Clear grid
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = CellType.EMPTY;
            }
        }
        
        // Place elements
        if (this.startPos) {
            this.grid[this.startPos.row][this.startPos.col] = CellType.START;
        }
        if (this.goalPos) {
            this.grid[this.goalPos.row][this.goalPos.col] = CellType.GOAL;
        }
        if (this.gem1Pos) {
            this.grid[this.gem1Pos.row][this.gem1Pos.col] = CellType.GEM1;
        }
        if (this.gem2Pos) {
            this.grid[this.gem2Pos.row][this.gem2Pos.col] = CellType.GEM2;
        }
        if (this.robotPos) {
            this.grid[this.robotPos.row][this.robotPos.col] = CellType.ROBOT;
        }
    }

    reset() {
        this.robotPos = new Position(this.startPos.row, this.startPos.col);
        this.visitedFriends.clear();
        this.moveCount = 0;
        this.gameWon = false;
        this.updateGrid();
    }
}

// Puzzle Generator
class PuzzleGenerator {
    static generateGuaranteedSolvablePuzzle(game, difficulty = 'Medium') {
        const difficultyRanges = {
            'Easy': [6, 10],
            'Medium': [10, 14],
            'Hard': [14, 20]
        };
        
        const [minMoves, maxMoves] = difficultyRanges[difficulty];
        const maxAttempts = 100;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (this.generateStrategicPuzzle(game, minMoves, maxMoves)) {
                return true;
            }
        }
        
        // Fallback to a known solvable puzzle
        return this.generateOriginalStrategicPuzzle(game);
    }

    static generateStrategicPuzzle(game, minMoves, maxMoves) {
        // Clear existing setup
        game.walls = [];
        game.visitedFriends.clear();
        game.moveCount = 0;
        game.gameWon = false;
        
        // Add border walls
        this.addBorderWalls(game);
        
        // Add island walls for complexity
        this.addIslandWalls(game);
        
        // Place game elements randomly
        const positions = this.getRandomPositions(4);
        game.startPos = positions[0];
        game.robotPos = new Position(positions[0].row, positions[0].col);
        game.goalPos = positions[1];
        game.gem1Pos = positions[2];
        game.gem2Pos = positions[3];
        
        game.updateGrid();
        
        // Verify solvability and difficulty
        const solutionLength = this.computeSolutionLength(game, maxMoves + 10);
        if (solutionLength && solutionLength >= minMoves && solutionLength <= maxMoves) {
            game.optimalMoves = solutionLength;
            return true;
        }
        
        return false;
    }

    static generateOriginalStrategicPuzzle(game) {
        // Fallback to a known good puzzle
        game.walls = [];
        game.visitedFriends.clear();
        game.moveCount = 0;
        game.gameWon = false;
        
        // Add border walls
        this.addBorderWalls(game);
        
        // Add some strategic walls
        game.walls.push(new EdgeWall(new Position(1, 1), new Position(1, 2)));
        game.walls.push(new EdgeWall(new Position(2, 1), new Position(3, 1)));
        game.walls.push(new EdgeWall(new Position(2, 3), new Position(2, 4)));
        game.walls.push(new EdgeWall(new Position(3, 2), new Position(4, 2)));
        
        // Set positions
        game.startPos = new Position(0, 0);
        game.robotPos = new Position(0, 0);
        game.goalPos = new Position(4, 4);
        game.gem1Pos = new Position(1, 3);
        game.gem2Pos = new Position(3, 1);
        
        game.updateGrid();
        
        // Compute optimal solution
        game.optimalMoves = this.computeSolutionLength(game, 25);
        return true;
    }

    static addBorderWalls(game) {
        // Add walls around the perimeter
        for (let i = 0; i < game.gridSize; i++) {
            // Top border
            game.walls.push(new EdgeWall(new Position(0, i), new Position(-1, i)));
            // Bottom border
            game.walls.push(new EdgeWall(new Position(game.gridSize - 1, i), new Position(game.gridSize, i)));
            // Left border
            game.walls.push(new EdgeWall(new Position(i, 0), new Position(i, -1)));
            // Right border
            game.walls.push(new EdgeWall(new Position(i, game.gridSize - 1), new Position(i, game.gridSize)));
        }
    }

    static addIslandWalls(game) {
        // Add some strategic internal walls
        const wallConfigs = [
            // L-shaped configurations for corners
            [[new Position(0, 0), new Position(0, 1)], [new Position(0, 0), new Position(1, 0)]],
            [[new Position(0, 3), new Position(0, 4)], [new Position(0, 4), new Position(1, 4)]],
            [[new Position(3, 0), new Position(4, 0)], [new Position(4, 0), new Position(4, 1)]],
            [[new Position(3, 3), new Position(3, 4)], [new Position(4, 3), new Position(4, 4)]]
        ];
        
        // Randomly add some of these configurations
        wallConfigs.forEach(config => {
            if (Math.random() < 0.7) {
                config.forEach(wall => {
                    game.walls.push(new EdgeWall(wall[0], wall[1]));
                });
            }
        });
        
        // Add some random internal walls
        for (let i = 0; i < 3; i++) {
            const row = Math.floor(Math.random() * (game.gridSize - 1));
            const col = Math.floor(Math.random() * (game.gridSize - 1));
            
            if (Math.random() < 0.5) {
                // Horizontal wall
                game.walls.push(new EdgeWall(new Position(row, col), new Position(row + 1, col)));
            } else {
                // Vertical wall
                game.walls.push(new EdgeWall(new Position(row, col), new Position(row, col + 1)));
            }
        }
    }

    static getRandomPositions(count) {
        const positions = [];
        const used = new Set();
        
        while (positions.length < count) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const key = `${row},${col}`;
            
            if (!used.has(key)) {
                used.add(key);
                positions.push(new Position(row, col));
            }
        }
        
        return positions;
    }

    static computeSolutionLength(game, maxMoves = 30) {
        // BFS to find optimal solution
        const queue = [{
            pos: game.startPos,
            collected: new Set(),
            moves: 0
        }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { pos, collected, moves } = queue.shift();
            
            if (moves > maxMoves) continue;
            
            const stateKey = `${pos.toString()}-${Array.from(collected).sort().join(',')}`;
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            // Win condition: goal is collected
            if (collected.has(game.goalPos.toString())) {
                return moves;
            }
            
            // Try all directions
            Object.values(Direction).forEach(direction => {
                const result = game.ricochetMove(pos, direction);
                if (result.finalPos.equals(pos)) return;
                
                const newCollected = new Set(collected);
                
                // Check what we collect during this slide
                for (let i = 1; i < result.path.length; i++) {
                    const cell = result.path[i];
                    if (cell.equals(game.gem1Pos)) {
                        newCollected.add(game.gem1Pos.toString());
                    } else if (cell.equals(game.gem2Pos)) {
                        newCollected.add(game.gem2Pos.toString());
                    } else if (cell.equals(game.goalPos) && newCollected.size === 2) {
                        newCollected.add(game.goalPos.toString());
                    }
                }
                
                queue.push({
                    pos: result.finalPos,
                    collected: newCollected,
                    moves: moves + 1
                });
            });
        }
        
        return null; // No solution found
    }

    static findSolutionPath(game) {
        // BFS to find solution path
        const queue = [{
            pos: game.startPos,
            collected: new Set(),
            path: []
        }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { pos, collected, path } = queue.shift();
            
            const stateKey = `${pos.toString()}-${Array.from(collected).sort().join(',')}`;
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            // Win condition: goal is collected
            if (collected.has(game.goalPos.toString())) {
                return path;
            }
            
            // Try all directions
            Object.values(Direction).forEach(direction => {
                const result = game.ricochetMove(pos, direction);
                if (result.finalPos.equals(pos)) return;
                
                const newCollected = new Set(collected);
                
                // Check what we collect during this slide
                for (let i = 1; i < result.path.length; i++) {
                    const cell = result.path[i];
                    if (cell.equals(game.gem1Pos)) {
                        newCollected.add(game.gem1Pos.toString());
                    } else if (cell.equals(game.gem2Pos)) {
                        newCollected.add(game.gem2Pos.toString());
                    } else if (cell.equals(game.goalPos) && newCollected.size === 2) {
                        newCollected.add(game.goalPos.toString());
                    }
                }
                
                queue.push({
                    pos: result.finalPos,
                    collected: newCollected,
                    path: [...path, direction]
                });
            });
        }
        
        return null; // No solution found
    }
}

// Game GUI Class
class RicochetGUI {
    constructor() {
        this.game = new RicochetGame();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isAnimating = false;
        this.showWinOverlay = false;
        
        this.colors = {
            bg: '#0f0f23',
            surface: '#1e1e3e',
            card: '#2a2a4a',
            primary: '#6366f1',
            secondary: '#06b6d4',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            textMuted: '#64748b',
            accent: '#8b5cf6',
            border: '#475569'
        };
        
        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.isAnimating || this.showWinOverlay) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.moveRobot(Direction.NORTH);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.moveRobot(Direction.SOUTH);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.moveRobot(Direction.WEST);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.moveRobot(Direction.EAST);
                    break;
                case ' ':
                    e.preventDefault();
                    this.newGame();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    this.resetPosition();
                    break;
            }
        });
        
        // Button controls
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetPosition());
        document.getElementById('solutionBtn').addEventListener('click', () => this.showSolution());
        document.getElementById('nextPuzzleBtn').addEventListener('click', () => {
            this.hideWinOverlay();
            this.newGame();
        });
        
        // Update difficulty selector
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.newGame();
        });
    }

    moveRobot(direction) {
        const result = this.game.moveRobot(direction);
        if (result && result.moved) {
            this.animateRobotMovement(result.oldPos, result.newPos, result.friendVisited);
        }
    }

    animateRobotMovement(startPos, endPos, friendVisited) {
        this.isAnimating = true;
        
        const startX = startPos.col * CELL_SIZE + 20 + CELL_SIZE / 2;
        const startY = startPos.row * CELL_SIZE + 20 + CELL_SIZE / 2;
        const endX = endPos.col * CELL_SIZE + 20 + CELL_SIZE / 2;
        const endY = endPos.row * CELL_SIZE + 20 + CELL_SIZE / 2;
        
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            this.isAnimating = false;
            return;
        }
        
        const steps = Math.max(Math.floor(distance / 8), 1);
        const stepX = dx / steps;
        const stepY = dy / steps;
        
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep <= steps) {
                const currentX = startX + stepX * currentStep;
                const currentY = startY + stepY * currentStep;
                
                // Redraw board without robot
                this.drawBoardStatic();
                
                // Draw animated robot with professional styling
                this.ctx.save();
                
                // Outer glow for movement
                const animGradient = this.ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 35);
                animGradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
                animGradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.3)');
                animGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
                this.ctx.fillStyle = animGradient;
                this.ctx.beginPath();
                this.ctx.arc(currentX, currentY, 35, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Main robot body
                const robotGradient = this.ctx.createRadialGradient(currentX - 6, currentY - 6, 0, currentX, currentY, 25);
                robotGradient.addColorStop(0, '#ffffff');
                robotGradient.addColorStop(0.3, '#00d4ff');
                robotGradient.addColorStop(0.8, '#0891b2');
                robotGradient.addColorStop(1, '#065f7f');
                this.ctx.fillStyle = robotGradient;
                this.ctx.strokeStyle = '#00d4ff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(currentX, currentY, 25, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.restore();
                
                // Draw trajectory path
                if (currentStep > 0) {
                    this.ctx.save();
                    this.ctx.strokeStyle = '#00d4ff';
                    this.ctx.lineWidth = 3;
                    this.ctx.shadowColor = '#00d4ff';
                    this.ctx.shadowBlur = 5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(startX, startY);
                    this.ctx.lineTo(currentX, currentY);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
                
                currentStep++;
                requestAnimationFrame(animate);
            } else {
                this.drawBoard();
                this.updateStatus();
                
                if (this.game.gameWon) {
                    this.updateGameStatus('VICTORY');
                    setTimeout(() => this.showWinScreen(), 500);
                }
                
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    showWinScreen() {
        this.showWinOverlay = true;
        document.getElementById('winMoves').textContent = this.game.moveCount;
        
        // Calculate performance rating
        const optimal = this.game.optimalMoves || this.game.moveCount;
        const performance = this.game.moveCount <= optimal ? 'PERFECT' : 
                          this.game.moveCount <= optimal + 2 ? 'EXCELLENT' : 
                          this.game.moveCount <= optimal + 5 ? 'GOOD' : 'COMPLETED';
        document.getElementById('winPerformance').textContent = performance;
        
        document.getElementById('winOverlay').classList.remove('hidden');
    }

    hideWinOverlay() {
        this.showWinOverlay = false;
        document.getElementById('winOverlay').classList.add('hidden');
    }

    newGame() {
        this.hideWinOverlay();
        const difficulty = document.getElementById('difficulty-select').value;
        PuzzleGenerator.generateGuaranteedSolvablePuzzle(this.game, difficulty);
        this.drawBoard();
        this.updateStatus();
        this.updateGameStatus('ACTIVE');
    }

    resetPosition() {
        if (!this.game.gameWon && !this.showWinOverlay) {
            this.game.reset();
            this.drawBoard();
            this.updateStatus();
        }
    }

    showSolution() {
        if (this.game.gameWon || this.showWinOverlay || this.isAnimating) return;
        
        const solutionPath = PuzzleGenerator.findSolutionPath(this.game);
        if (solutionPath) {
            this.animateSolution(solutionPath);
        }
    }

    animateSolution(solutionPath) {
        this.resetPosition();
        this.isAnimating = true;
        
        let moveIndex = 0;
        
        const animateNextMove = () => {
            if (moveIndex >= solutionPath.length) {
                this.isAnimating = false;
                return;
            }
            
            const direction = solutionPath[moveIndex];
            const result = this.game.moveRobot(direction);
            
            if (result && result.moved) {
                this.animateRobotMovement(result.oldPos, result.newPos, result.friendVisited);
                setTimeout(() => {
                    moveIndex++;
                    animateNextMove();
                }, 1000);
            } else {
                moveIndex++;
                animateNextMove();
            }
        };
        
        animateNextMove();
    }

    updateStatus() {
        document.getElementById('moveCount').textContent = this.game.moveCount;
        document.getElementById('optimalMoves').textContent = 
            this.game.optimalMoves !== null ? this.game.optimalMoves : '-';
        
        // Update objective statuses
        const gem1Collected = this.game.visitedFriends.has(this.game.gem1Pos.toString());
        const gem2Collected = this.game.visitedFriends.has(this.game.gem2Pos.toString());
        
        document.getElementById('crystal1Status').textContent = gem1Collected ? 'COLLECTED' : 'PENDING';
        document.getElementById('crystal1Status').className = gem1Collected ? 'objective-status completed' : 'objective-status';
        
        document.getElementById('crystal2Status').textContent = gem2Collected ? 'COLLECTED' : 'PENDING';
        document.getElementById('crystal2Status').className = gem2Collected ? 'objective-status completed' : 'objective-status';
        
        const goalUnlocked = gem1Collected && gem2Collected;
        document.getElementById('goalStatus').textContent = this.game.gameWon ? 'COMPLETED' : (goalUnlocked ? 'UNLOCKED' : 'LOCKED');
        document.getElementById('goalStatus').className = this.game.gameWon ? 'objective-status completed' : (goalUnlocked ? 'objective-status' : 'objective-status locked');
    }

    updateGameStatus(status) {
        const statusElement = document.getElementById('gameStatus');
        statusElement.textContent = status;
        
        // Update status indicator styling based on game state
        statusElement.className = 'status-indicator';
        if (status === 'VICTORY') {
            statusElement.style.background = 'var(--gradient-success)';
        } else if (status === 'ACTIVE') {
            statusElement.style.background = 'var(--gradient-primary)';
        }
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoardStatic();
    }

    drawBoardStatic() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const x = j * CELL_SIZE + 20;
                const y = i * CELL_SIZE + 20;
                
                // Professional cell background with subtle grid
                this.ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(30, 41, 59, 0.2)';
                this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Neon grid lines
                this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
                this.ctx.lineWidth = 0.5;
                this.ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Highlight visited friends with professional glow
                if (this.game.visitedFriends.has(`${i},${j}`)) {
                    this.ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
                    this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    
                    // Add glowing border
                    this.ctx.strokeStyle = '#00ff88';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                }
                
                // Draw cell content
                const cellType = this.game.grid[i][j];
                const centerX = x + CELL_SIZE / 2;
                const centerY = y + CELL_SIZE / 2;
                
                this.drawCellContent(cellType, centerX, centerY, x, y);
            }
        }
        
        // Draw walls
        this.drawWalls();
    }

    drawCellContent(cellType, centerX, centerY, x, y) {
        this.ctx.save();
        
        switch (cellType) {
            case CellType.ROBOT:
                // Professional Energy Orb Agent Design
                const time = Date.now() * 0.003;
                
                // Outer energy field with pulsing
                const energyGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 45);
                energyGradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)');
                energyGradient.addColorStop(0.6, 'rgba(0, 212, 255, 0.2)');
                energyGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
                this.ctx.fillStyle = energyGradient;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 45 + Math.sin(time) * 3, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Main orb body with metallic cyan
                const orbGradient = this.ctx.createRadialGradient(centerX - 8, centerY - 8, 0, centerX, centerY, 28);
                orbGradient.addColorStop(0, '#ffffff');
                orbGradient.addColorStop(0.3, '#00d4ff');
                orbGradient.addColorStop(0.8, '#0891b2');
                orbGradient.addColorStop(1, '#065f7f');
                this.ctx.fillStyle = orbGradient;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Outer ring with glow
                this.ctx.strokeStyle = '#00d4ff';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#00d4ff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                
                // Inner energy core with rotation
                const coreSize = 8 + Math.sin(time * 2) * 2;
                const innerGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
                innerGradient.addColorStop(0, '#ffffff');
                innerGradient.addColorStop(0.7, '#00d4ff');
                innerGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = innerGradient;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, coreSize, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Digital crosshair
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1.5;
                this.ctx.globalAlpha = 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - 4, centerY);
                this.ctx.lineTo(centerX + 4, centerY);
                this.ctx.moveTo(centerX, centerY - 4);
                this.ctx.lineTo(centerX, centerY + 4);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                break;
                
            case CellType.START:
                // Professional Origin Pad Design
                const padTime = Date.now() * 0.002;
                
                // Base platform with hexagonal shape
                this.ctx.strokeStyle = '#00ff88';
                this.ctx.lineWidth = 2;
                this.ctx.shadowColor = '#00ff88';
                this.ctx.shadowBlur = 8;
                
                // Draw hexagon
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const hexX = centerX + Math.cos(angle) * 25;
                    const hexY = centerY + Math.sin(angle) * 25;
                    if (i === 0) this.ctx.moveTo(hexX, hexY);
                    else this.ctx.lineTo(hexX, hexY);
                }
                this.ctx.closePath();
                
                const hexGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
                hexGradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
                hexGradient.addColorStop(1, 'rgba(0, 255, 136, 0.1)');
                this.ctx.fillStyle = hexGradient;
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                
                // Animated circuit lines
                const circuitAlpha = 0.6 + Math.sin(padTime * 3) * 0.4;
                this.ctx.globalAlpha = circuitAlpha;
                this.ctx.strokeStyle = '#00ff88';
                this.ctx.lineWidth = 1;
                
                // Cross pattern in center
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - 12, centerY);
                this.ctx.lineTo(centerX + 12, centerY);
                this.ctx.moveTo(centerX, centerY - 12);
                this.ctx.lineTo(centerX, centerY + 12);
                this.ctx.stroke();
                
                // Corner connection nodes
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2 + Math.PI / 4;
                    const nodeX = centerX + Math.cos(angle) * 15;
                    const nodeY = centerY + Math.sin(angle) * 15;
                    this.ctx.beginPath();
                    this.ctx.arc(nodeX, nodeY, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1;
                break;
                
            case CellType.GOAL:
                // High-Tech Energy Portal Design
                const portalTime = Date.now() * 0.004;
                const isUnlocked = this.game.visitedFriends.size >= 2;
                
                if (isUnlocked) {
                    // Active portal with swirling energy
                    // Outer energy ring
                    const outerGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35);
                    outerGradient.addColorStop(0, 'rgba(0, 212, 255, 0.1)');
                    outerGradient.addColorStop(0.7, 'rgba(0, 212, 255, 0.4)');
                    outerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
                    this.ctx.fillStyle = outerGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // Swirling vortex effect
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * Math.PI) / 3 + portalTime * 2;
                        const radius = 20 + Math.sin(portalTime * 3 + i) * 3;
                        const spiralX = centerX + Math.cos(angle) * radius;
                        const spiralY = centerY + Math.sin(angle) * radius;
                        
                        const spiralGradient = this.ctx.createRadialGradient(spiralX, spiralY, 0, spiralX, spiralY, 8);
                        spiralGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                        spiralGradient.addColorStop(1, 'rgba(0, 212, 255, 0.2)');
                        this.ctx.fillStyle = spiralGradient;
                        this.ctx.beginPath();
                        this.ctx.arc(spiralX, spiralY, 6, 0, 2 * Math.PI);
                        this.ctx.fill();
                    }
                    
                    // Central portal core
                    const coreGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
                    coreGradient.addColorStop(0, '#ffffff');
                    coreGradient.addColorStop(0.6, '#00d4ff');
                    coreGradient.addColorStop(1, 'rgba(0, 212, 255, 0.1)');
                    this.ctx.fillStyle = coreGradient;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
                    this.ctx.fill();
                } else {
                    // Locked portal - dormant rhombus with faint circuits
                    const lockGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
                    lockGradient.addColorStop(0, 'rgba(71, 85, 105, 0.3)');
                    lockGradient.addColorStop(1, 'rgba(71, 85, 105, 0.1)');
                    this.ctx.fillStyle = lockGradient;
                    
                    // Draw rhombus
                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, y + 20);
                    this.ctx.lineTo(x + CELL_SIZE - 20, centerY);
                    this.ctx.lineTo(centerX, y + CELL_SIZE - 20);
                    this.ctx.lineTo(x + 20, centerY);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    this.ctx.strokeStyle = '#475569';
                    this.ctx.lineWidth = 2;
                    this.ctx.globalAlpha = 0.5 + Math.sin(portalTime) * 0.2;
                    this.ctx.stroke();
                    this.ctx.globalAlpha = 1;
                }
                
                // Portal frame/ring
                this.ctx.strokeStyle = isUnlocked ? '#00d4ff' : '#475569';
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = isUnlocked ? '#00d4ff' : 'transparent';
                this.ctx.shadowBlur = isUnlocked ? 10 : 0;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                break;
                
            case CellType.GEM1:
                // Gem 1 - Hexagonal Prism Design
                const alphaTime = Date.now() * 0.004;
                const alphaRotation = alphaTime;
                
                // Outer energy field with hexagonal pattern
                const amberField = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 45);
                amberField.addColorStop(0, 'rgba(255, 171, 0, 0.6)');
                amberField.addColorStop(0.5, 'rgba(255, 171, 0, 0.3)');
                amberField.addColorStop(1, 'rgba(255, 171, 0, 0)');
                this.ctx.fillStyle = amberField;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 45 + Math.sin(alphaTime * 2) * 3, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Rotating hexagonal crystal
                this.ctx.save();
                this.ctx.translate(centerX, centerY);
                this.ctx.rotate(alphaRotation);
                
                // Main hexagonal crystal body
                const amberHexGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
                amberHexGradient.addColorStop(0, '#ffd700');
                amberHexGradient.addColorStop(0.4, '#ffab00');
                amberHexGradient.addColorStop(0.8, '#e67e00');
                amberHexGradient.addColorStop(1, '#cc5500');
                this.ctx.fillStyle = amberHexGradient;
                
                // Draw hexagon
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 60) * Math.PI / 180;
                    const x = Math.cos(angle) * 20;
                    const y = Math.sin(angle) * 20;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                
                // Hexagon edges with glow
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Inner hexagonal pattern
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.globalAlpha = 0.8;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * 60) * Math.PI / 180;
                    const x1 = Math.cos(angle) * 12;
                    const y1 = Math.sin(angle) * 12;
                    const x2 = Math.cos(angle + Math.PI) * 12;
                    const y2 = Math.sin(angle + Math.PI) * 12;
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                }
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                
                this.ctx.restore();
                
                // Pulsing outer ring
                this.ctx.shadowColor = '#ffab00';
                this.ctx.shadowBlur = 20;
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.globalAlpha = 0.8 + Math.sin(alphaTime * 3) * 0.2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                this.ctx.shadowBlur = 0;
                break;
                
            case CellType.GEM2:
                // Gem 2 - Triangular Pyramid with Spikes
                const betaTime = Date.now() * 0.007;
                const betaRotation = -betaTime * 0.8; // Slower counter-rotation
                
                // Outer energy field with triangular distortion
                const violetField = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
                violetField.addColorStop(0, 'rgba(217, 70, 239, 0.7)');
                violetField.addColorStop(0.4, 'rgba(217, 70, 239, 0.4)');
                violetField.addColorStop(1, 'rgba(217, 70, 239, 0)');
                this.ctx.fillStyle = violetField;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 50 + Math.sin(betaTime * 2.5) * 4, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Rotating spiked crystal structure
                this.ctx.save();
                this.ctx.translate(centerX, centerY);
                this.ctx.rotate(betaRotation);
                
                // Main triangular pyramid body
                const pyramidGradient = this.ctx.createLinearGradient(-18, -18, 18, 18);
                pyramidGradient.addColorStop(0, '#e879f9');
                pyramidGradient.addColorStop(0.3, '#d946ef');
                pyramidGradient.addColorStop(0.7, '#a21caf');
                pyramidGradient.addColorStop(1, '#701a75');
                this.ctx.fillStyle = pyramidGradient;
                
                // Draw main triangular pyramid
                this.ctx.beginPath();
                this.ctx.moveTo(0, -22);  // Top point
                this.ctx.lineTo(-18, 10); // Bottom left
                this.ctx.lineTo(18, 10);  // Bottom right
                this.ctx.closePath();
                this.ctx.fill();
                
                // Triangle edges
                this.ctx.strokeStyle = '#e879f9';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Add three spikes at vertices
                this.ctx.fillStyle = '#f3e8ff';
                
                // Top spike
                this.ctx.beginPath();
                this.ctx.moveTo(0, -22);
                this.ctx.lineTo(-4, -28);
                this.ctx.lineTo(4, -28);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Left spike
                this.ctx.beginPath();
                this.ctx.moveTo(-18, 10);
                this.ctx.lineTo(-24, 8);
                this.ctx.lineTo(-20, 16);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Right spike
                this.ctx.beginPath();
                this.ctx.moveTo(18, 10);
                this.ctx.lineTo(24, 8);
                this.ctx.lineTo(20, 16);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Inner crystalline lines
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.globalAlpha = 0.9;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -12);
                this.ctx.lineTo(-9, 5);
                this.ctx.moveTo(0, -12);
                this.ctx.lineTo(9, 5);
                this.ctx.moveTo(-9, 5);
                this.ctx.lineTo(9, 5);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
                
                this.ctx.restore();
                
                // Triangular outer glow pattern
                this.ctx.shadowColor = '#d946ef';
                this.ctx.shadowBlur = 15;
                this.ctx.strokeStyle = '#e879f9';
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 0.7 + Math.sin(betaTime * 4) * 0.3;
                
                // Draw triangular glow pattern
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY - 35);
                this.ctx.lineTo(centerX - 30, centerY + 18);
                this.ctx.lineTo(centerX + 30, centerY + 18);
                this.ctx.closePath();
                this.ctx.stroke();
                
                this.ctx.globalAlpha = 1;
                this.ctx.shadowBlur = 0;
                break;
        }
        
        this.ctx.restore();
    }

    drawWalls() {
        this.ctx.save();
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = WALL_THICKNESS;
        this.ctx.lineCap = 'round';
        this.ctx.shadowColor = '#00d4ff';
        this.ctx.shadowBlur = 8;
        
        for (const wall of this.game.walls) {
            const a = wall.fromPos;
            const b = wall.toPos;
            const validA = this.game.isValidPosition(a);
            const validB = this.game.isValidPosition(b);
            
            if (validA && validB) {
                const fromX = a.col * CELL_SIZE + 20;
                const fromY = a.row * CELL_SIZE + 20;
                const toX = b.col * CELL_SIZE + 20;
                const toY = b.row * CELL_SIZE + 20;
                
                if (a.row === b.row) {
                    // Vertical wall
                    const wallX = Math.max(fromX, toX);
                    const wallY1 = fromY + 10;
                    const wallY2 = fromY + CELL_SIZE - 10;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(wallX, wallY1);
                    this.ctx.lineTo(wallX, wallY2);
                    this.ctx.stroke();
                } else if (a.col === b.col) {
                    // Horizontal wall
                    const wallY = Math.max(fromY, toY);
                    const wallX1 = fromX + 10;
                    const wallX2 = fromX + CELL_SIZE - 10;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(wallX1, wallY);
                    this.ctx.lineTo(wallX2, wallY);
                    this.ctx.stroke();
                }
            } else if (validA && !validB) {
                // Border walls
                const x = a.col * CELL_SIZE + 20;
                const y = a.row * CELL_SIZE + 20;
                
                if (a.row === 0 && b.row < 0) {
                    // Top edge
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + CELL_SIZE, y);
                    this.ctx.stroke();
                } else if (a.row === GRID_SIZE - 1 && b.row > a.row) {
                    // Bottom edge
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y + CELL_SIZE);
                    this.ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
                    this.ctx.stroke();
                }
                
                if (a.col === 0 && b.col < 0) {
                    // Left edge
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x, y + CELL_SIZE);
                    this.ctx.stroke();
                } else if (a.col === GRID_SIZE - 1 && b.col > a.col) {
                    // Right edge
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + CELL_SIZE, y);
                    this.ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.restore();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game immediately
    new RicochetGUI();
});