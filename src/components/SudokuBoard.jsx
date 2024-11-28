import React, { useEffect, useState } from "react";
import { FaHeart } from "react-icons/fa6";
import axios from "axios";

const SudokuBoard = () => {
  const [board, setBoard] = useState(Array(9).fill(Array(9).fill(0)));
  const [solution, setSolution] = useState(Array(9).fill(Array(9).fill(0)));
  const [initialFilled, setInitialFilled] = useState(
    Array(9).fill(Array(9).fill(false))
  );
  const [history, setHistory] = useState([]);
  const [highlight, setHighlight] = useState({ row: -1, col: -1 });
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [life, setLife] = useState(3);
  const [timerRunning, setTimerRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  const generateSudoku = () => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0)); // Create an empty board
    const initialFilled = Array.from({ length: 9 }, () => Array(9).fill(false)); // Initialize initialFilled array

    // Check if the number can be placed at (row, col)
    const isSafe = (board, row, col, num) => {
      for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false; // Check row
      }
      for (let i = 0; i < 9; i++) {
        if (board[i][col] === num) return false; // Check column
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
          if (board[r][c] === num) return false; // Check 3x3 subgrid
        }
      }
      return true;
    };

    // Randomize the order of numbers 1-9
    const shuffleNumbers = () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]]; // Swap numbers[i] and numbers[j]
      }
      return numbers;
    };

    // Backtracking function to fill the board with a solution
    const solveSudoku = (board) => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            const numbers = shuffleNumbers(); // Get a shuffled array of numbers 1-9
            for (let num of numbers) {
              if (isSafe(board, row, col, num)) {
                board[row][col] = num;
                if (solveSudoku(board)) return true; // Recursively solve
                board[row][col] = 0; // Backtrack if no solution
              }
            }
            return false; // If no solution found for this cell
          }
        }
      }
      return true; // Solution found
    };

    // Generate a completely filled valid solution
    solveSudoku(board);

    // Function to generate the puzzle by removing cells
    const generatePuzzle = (solution) => {
      const puzzle = solution.map((row) => row.slice()); // Create a copy of the solution board
      let attempts = 55; // Number of cells to remove
      let removedCells = 0;

      // Remove cells randomly, keeping track of initialFilled
      while (removedCells < attempts) {
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);

        // Only remove a number if it's not already removed
        if (puzzle[row][col] !== 0) {
          puzzle[row][col] = 0; // Remove the number from the puzzle
          initialFilled[row][col] = false; // Mark the cell as empty
          removedCells++;
        }
      }

      return puzzle;
    };

    // Generate the puzzle from the solution by removing numbers
    const puzzle = generatePuzzle(board);

    // Update the initialFilled array for the non-removed cells
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] !== 0) {
          initialFilled[row][col] = true; // Mark as initially filled if the number is not removed
        }
      }
    }

    setInitialFilled(initialFilled);
    setSolution(board);
    // Return the puzzle, solution, and the initialFilled array
    return { puzzle, solution: board, initialFilled };
  };

  const handleChange = (e, rowIndex, colIndex) => {
    if (gameOver) return;

    const value = e.target.value;
    if (value === "" || /^[1-9]$/.test(value)) {
      const updatedBoard = [...board];
      updatedBoard[rowIndex] = [...updatedBoard[rowIndex]];
      updatedBoard[rowIndex][colIndex] = value ? parseInt(value) : 0;

      if (
        value &&
        updatedBoard[rowIndex][colIndex] !== initialFilled[rowIndex][colIndex]
      ) {
        if (updatedBoard[rowIndex][colIndex] !== solution[rowIndex][colIndex]) {
          // Decrease lives on wrong input
          setLife((prevLife) => {
            const newLife = prevLife - 1;
            if (newLife <= 0) {
              setGameOver(true); // End the game if no lives left
            }
            return newLife;
          });
        }
      }

      setHistory([...history, board]);
      setBoard(updatedBoard);

      const winCheck = checkWin(updatedBoard);

      if (winCheck) {
        setGameOver(true);
      }
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastState = history.pop();
      setBoard(lastState);
      setHistory([...history]);
    }
  };

  const handleHighlight = (rowIndex, colIndex) => {
    setHighlight({ row: rowIndex, col: colIndex });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post("http://localhost:8080/submit");
    } catch (error) {
      console.log("error: ", error);
    }
  };

  const isHighlighted = (rowIndex, colIndex) => {
    const { row, col } = highlight;

    if (row === -1 || col === -1) return false;

    const focusedValue = board[row][col];

    const isInSameRowOrColumnOrSubgrid =
      rowIndex === row ||
      colIndex === col ||
      (Math.floor(rowIndex / 3) === Math.floor(row / 3) &&
        Math.floor(colIndex / 3) === Math.floor(col / 3));

    const isSameNumber =
      focusedValue !== 0 && board[rowIndex][colIndex] === focusedValue;

    return isInSameRowOrColumnOrSubgrid || isSameNumber;
  };

  const isWrongValue = (rowIndex, colIndex) => {
    const currentValue = board[rowIndex][colIndex];

    if (currentValue === 0) return false;

    // 1. Check for the same number in the row
    for (let col = 0; col < 9; col++) {
      if (col !== colIndex && solution[rowIndex][col] === currentValue) {
        return true;
      }
    }

    // 2. Check for the same number in the column
    for (let row = 0; row < 9; row++) {
      if (row !== rowIndex && solution[row][colIndex] === currentValue) {
        return true; // Duplicate in the same column
      }
    }

    // 3. Check for the same number in the 3x3 subgrid
    const subgridRowStart = Math.floor(rowIndex / 3) * 3;
    const subgridColStart = Math.floor(colIndex / 3) * 3;

    for (let r = subgridRowStart; r < subgridRowStart + 3; r++) {
      for (let c = subgridColStart; c < subgridColStart + 3; c++) {
        if (
          (r !== rowIndex || c !== colIndex) &&
          solution[r][c] === currentValue
        ) {
          return true; // Duplicate in the same 3x3 subgrid
        }
      }
    }

    return false; // No duplicates found, valid value
  };

  const stopTimer = () => {
    setTimerRunning(!timerRunning); // Stop the timer
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? "0" + minutes : minutes}:${
      remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds
    }`;
  };

  const handleRestart = () => {
    setGameOver(false);
    setLife(3);
    setHistory([]);
    setHighlight({ row: -1, col: -1 });
    setTime(0);
    setTimerRunning(false);

    // Reset the board to its initial state
    const fetchPuzzle = generateSudoku();
    setBoard(fetchPuzzle.puzzle);
    setInitialFilled(fetchPuzzle.initialFilled);
  };

  const checkWin = (updatedBoard) => {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (updatedBoard[i][j] !== solution[i][j]) {
          return false;
        }
      }
    }
    return true;
  };

  if (loading) {
    return <div>Loading Sudoku Puzzle...</div>;
  }

  useEffect(() => {
    const fetchPuzzle = generateSudoku();
    setBoard(fetchPuzzle.puzzle);
    setSolution(fetchPuzzle.solution);
    setInitialFilled(fetchPuzzle.initialFilled);
  }, []);

  useEffect(() => {
    if (timerRunning) {
      const timerId = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [timerRunning]);

  useEffect(() => {
    if (!gameOver) {
      const fetchPuzzle = generateSudoku();
      setBoard(fetchPuzzle.puzzle);
      setSolution(fetchPuzzle.solution);
      setInitialFilled(fetchPuzzle.initialFilled);
    }
  }, [gameOver]); // Runs when the gameOver state changes

  return (
    <div className="wrapper">
      {gameOver ? (
        <div className="game-over">
          <div>
            {gameOver && (
              <>
                {life > 0 ? <h2>You Won !</h2> : <h2>Game Over!</h2>}
                <button
                  onClick={() => handleRestart()}
                  className="restart-button"
                >
                  Restart
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="timer">
            <p>Time: {formatTime(time)}</p> {/* Display formatted time */}
            <div className="life">
              <FaHeart /> {life}
            </div>
          </div>

          <div className="sudoku-container">
            <div className="sudoku-board">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className={`sudoku-row row-${rowIndex}`}>
                  {row.map((cell, colIndex) => (
                    <input
                      key={colIndex}
                      type="text"
                      value={cell || ""}
                      onChange={(e) => handleChange(e, rowIndex, colIndex)}
                      className={`sudoku-cell 
                      ${initialFilled[rowIndex][colIndex] ? "readonly" : ""}
                      ${isHighlighted(rowIndex, colIndex) ? "highlighted" : ""}
                      ${isWrongValue(rowIndex, colIndex) ? "wrong" : ""}
                      `}
                      maxLength={1}
                      onFocus={() => handleHighlight(rowIndex, colIndex)}
                      readOnly={initialFilled[rowIndex][colIndex]}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div>
              <button onClick={handleSubmit}>Submit</button>
              <button onClick={handleUndo}>Undo</button>
              <button onClick={stopTimer}>
                {timerRunning ? "Pause" : "Start"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SudokuBoard;
