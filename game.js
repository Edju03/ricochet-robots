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
    AMBER_CRYSTAL: 'amber_crystal',
    VIOLET_CRYSTAL: 'violet_crystal'
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
        this.amberCrystalPos = null;
        this.violetCrystalPos = null;
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
            
            // Check for crystal collection during movement
            for (let i = 1; i < result.path.length; i++) {
                const pos = result.path[i];
                if (pos.equals(this.amberCrystalPos) || pos.equals(this.violetCrystalPos)) {
                    this.visitedFriends.add(pos.toString());
                    friendVisited = true;
                }
            }
            
            // Check if we can reach the goal
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
        if (this.amberCrystalPos) {
            this.grid[this.amberCrystalPos.row][this.amberCrystalPos.col] = CellType.AMBER_CRYSTAL;
        }
        if (this.violetCrystalPos) {
            this.grid[this.violetCrystalPos.row][this.violetCrystalPos.col] = CellType.VIOLET_CRYSTAL;
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
        game.amberCrystalPos = positions[2];
        game.violetCrystalPos = positions[3];
        
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
        game.amberCrystalPos = new Position(1, 3);
        game.violetCrystalPos = new Position(3, 1);
        
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
                    if (cell.equals(game.amberCrystalPos)) {
                        newCollected.add(game.amberCrystalPos.toString());
                    } else if (cell.equals(game.violetCrystalPos)) {
                        newCollected.add(game.violetCrystalPos.toString());
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
                    if (cell.equals(game.amberCrystalPos)) {
                        newCollected.add(game.amberCrystalPos.toString());
                    } else if (cell.equals(game.violetCrystalPos)) {
                        newCollected.add(game.violetCrystalPos.toString());
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
                
                // Draw animated robot
                this.ctx.save();
                this.ctx.fillStyle = this.colors.secondary;
                this.ctx.strokeStyle = '#0891b2';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(currentX, currentY, 25, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
                
                // Draw trajectory path
                if (currentStep > 0) {
                    this.ctx.save();
                    this.ctx.strokeStyle = '#38bdf8';
                    this.ctx.lineWidth = 3;
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
                    setTimeout(() => this.showWinScreen(), 500);
                }
                
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    showWinScreen() {
        this.showWinOverlay = true;
        document.getElementById('winMoves').textContent = `Completed in ${this.game.moveCount} moves`;
        document.getElementById('winOverlay').classList.remove('hidden');
    }

    hideWinOverlay() {
        this.showWinOverlay = false;
        document.getElementById('winOverlay').classList.add('hidden');
    }

    newGame() {
        this.hideWinOverlay();
        const difficulty = document.getElementById('difficulty').value;
        PuzzleGenerator.generateGuaranteedSolvablePuzzle(this.game, difficulty);
        this.drawBoard();
        this.updateStatus();
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
        
        // Update crystal indicators
        const crystal1 = document.getElementById('crystal1');
        const crystal2 = document.getElementById('crystal2');
        
        crystal1.style.color = this.game.visitedFriends.has(this.game.amberCrystalPos.toString()) 
            ? this.colors.warning : this.colors.border;
        crystal2.style.color = this.game.visitedFriends.has(this.game.violetCrystalPos.toString()) 
            ? this.colors.accent : this.colors.border;
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
                
                // Cell background
                this.ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#f8fafc';
                this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Cell border
                this.ctx.strokeStyle = (i + j) % 2 === 0 ? '#e2e8f0' : '#cbd5e1';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                
                // Highlight visited friends
                if (this.game.visitedFriends.has(`${i},${j}`)) {
                    this.ctx.fillStyle = '#d1fae5';
                    this.ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
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
                // Robot with glow effect
                this.ctx.fillStyle = '#a7f3d0';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.fillStyle = this.colors.secondary;
                this.ctx.strokeStyle = '#0891b2';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Inner highlight
                this.ctx.fillStyle = '#bfdbfe';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
                this.ctx.fill();
                
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
                this.ctx.fill();
                break;
                
            case CellType.START:
                this.ctx.fillStyle = '#dcfce7';
                this.ctx.strokeStyle = this.colors.success;
                this.ctx.lineWidth = 2;
                this.ctx.fillRect(x + 25, y + 25, CELL_SIZE - 50, CELL_SIZE - 50);
                this.ctx.strokeRect(x + 25, y + 25, CELL_SIZE - 50, CELL_SIZE - 50);
                
                this.ctx.fillStyle = this.colors.success;
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('START', centerX, centerY + 4);
                break;
                
            case CellType.GOAL:
                // Diamond shape
                this.ctx.fillStyle = '#fecaca';
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, y + 18);
                this.ctx.lineTo(x + CELL_SIZE - 18, centerY);
                this.ctx.lineTo(centerX, y + CELL_SIZE - 18);
                this.ctx.lineTo(x + 18, centerY);
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.fillStyle = this.colors.danger;
                this.ctx.strokeStyle = '#991b1b';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, y + 25);
                this.ctx.lineTo(x + CELL_SIZE - 25, centerY);
                this.ctx.lineTo(centerX, y + CELL_SIZE - 25);
                this.ctx.lineTo(x + 25, centerY);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case CellType.AMBER_CRYSTAL:
                // Triangle up
                this.ctx.fillStyle = '#fed7aa';
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, y + 15);
                this.ctx.lineTo(x + CELL_SIZE - 15, y + CELL_SIZE - 15);
                this.ctx.lineTo(x + 15, y + CELL_SIZE - 15);
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.fillStyle = this.colors.warning;
                this.ctx.strokeStyle = '#d97706';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, y + 25);
                this.ctx.lineTo(x + CELL_SIZE - 25, y + CELL_SIZE - 25);
                this.ctx.lineTo(x + 25, y + CELL_SIZE - 25);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case CellType.VIOLET_CRYSTAL:
                // Triangle down
                this.ctx.fillStyle = '#ddd6fe';
                this.ctx.beginPath();
                this.ctx.moveTo(x + 15, y + 15);
                this.ctx.lineTo(x + CELL_SIZE - 15, y + 15);
                this.ctx.lineTo(centerX, y + CELL_SIZE - 15);
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.fillStyle = this.colors.accent;
                this.ctx.strokeStyle = '#7c3aed';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x + 25, y + 25);
                this.ctx.lineTo(x + CELL_SIZE - 25, y + 25);
                this.ctx.lineTo(centerX, y + CELL_SIZE - 25);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
        }
        
        this.ctx.restore();
    }

    drawWalls() {
        this.ctx.save();
        this.ctx.strokeStyle = '#374151';
        this.ctx.lineWidth = WALL_THICKNESS;
        this.ctx.lineCap = 'round';
        
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
    new RicochetGUI();
});