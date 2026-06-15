# OASIS Calculator

A complete, premium, and professional Calculator Web Application built with clean semantic HTML5, modern responsive CSS3, and robust vanilla JavaScript. This project is prepared and packaged for the **OASIS Internship Submission**.

---

## 🌟 Features

### 1. Core Calculator Arithmetic
- **Standard Math operations**: Addition (`+`), Subtraction (`−`), Multiplication (`×`), and Division (`÷`).
- **Percentage calculation**: Computes percentages (`%`) directly on numerical inputs.
- **Decimal numbers**: Accurate float parsing and prevention of duplicate decimal points in a single value.
- **Error Handling**: Custom validation and clear messaging for critical errors (e.g., displaying `Cannot divide by zero`).
- **Editing keys**: Clear button (`C`) resets state instantly, and Backspace (`⌫`) handles character deletion.

### 2. Premium User Interface (UI) & Visual Enhancements
- **Glassmorphism Design**: Sleek frosted glass cards using high-performance CSS `backdrop-filter: blur(20px)` and subtle glowing borders.
- **Accent Theme**: Elegant Gold/Yellow accents (`#FFD700`) representing premium styling.
- **Animated Background Mesh Blobs**: Floating, blurred gradient blobs move slowly in the background behind the glass calculator, creating a modern visual aesthetic.
- **Dynamic Scale Effects**: Micro-interaction scaling and shadows on button hover and active states.
- **Smooth Theme Toggle**: Support for standard **Dark Mode** and **Light Mode** that transitions colors and background blobs cleanly.
- **Responsive Layout**: Designed to adapt fluidly to Desktop, Tablet, and Mobile screens.

### 3. Advanced Infix Expression Parser
- **Parentheses & Operator Precedence**: Supports grouping with parentheses `(` and `)` to evaluate complex nested math operations.
- **Shunting-Yard Parser Engine**: Fully custom tokenizer, parser, and evaluator (safe from `eval` exploits). Respects standard PEMDAS rules.
- **Advanced Operations**: Support for Exponents (`^` / `xʸ`), Square (`x²`), Square Root (`√`), Factorials (`n!`), base-10 Logarithms (`log`), and natural logarithms (`ln`).
- **Mathematical Constants**: Supports Euler's constant (`e`) and Pi (`π`) directly in equations.
- **Implicit Multiplication**: Automatically infers multiplication where brackets or constants are adjacent (e.g. `2(3+4)` parses to `2*(3+4)` and `5π` parses to `5*π`).

### 4. Advanced History Panel & Memory
- **Calculation History**: Stores formulas and results with live **calculation timestamps** (e.g., `12:54 PM`).
- **Individual Deletion**: Allows deleting individual history entries directly from the drawer.
- **Export Utility**: Users can download the entire history log as a structured text file (`oasis_calculator_history.txt`) with a single click.
- **Scientific memory**: MC, MR, M+ operations showing a togglable memory `M` indicator.

### 5. Interactive Self-Test Suite
- **Automated Test Runner**: A built-in testing dashboard executing 11 complete unit test cases directly inside the DOM:
  1. **Addition** (`12 + 8.5` -> `20.5`)
  2. **Subtraction** (`100 - 45` -> `55`)
  3. **Multiplication** (`6 × 7` -> `42`)
  4. **Division** (`80 ÷ 4` -> `20`)
  5. **Divide by Zero Protection** (`5 ÷ 0` -> `Cannot divide by zero`)
  6. **Consecutive Decimals Block** (`1.5.2` -> `1.52`)
  7. **History logging and recall**
  8. **Scientific functions** (`sin(30)` -> `0.5`, `sqrt(16)` -> `4`, `5²` -> `25`)
  9. **Keyboard Event simulated dispatch**
  10. **Parentheses & Factorial** (`(5+3)*2` -> `16`, `5!` -> `120`)
  11. **Logarithms & Constants** (`log(100) + ln(e)` -> `3`)
- **Test Indicator**: Glows bright green on successful verification or red if errors arise, showing live test logs.

---

## 📁 Folder Structure

```
OASIS_Calculator/
├── index.html     # Semantic markup and accessibility hooks
├── style.css      # Core styles, themes, and glassmorphic designs
├── script.js      # Safe parser, preferences, sounds, and test runner
└── README.md      # Documentation and manual
```

---

## 🛠️ Technologies Used

- **HTML5**: Structured semantic layout, layout wrapper, SVG icons.
- **CSS3**: Variables, Flexbox, CSS Grid, Glassmorphic filters, responsive media queries, and transition animations.
- **Vanilla JavaScript**: Shunting-Yard RPN mathematical parser, Web Audio synthesizer, localStorage interface, keyboard listeners, and built-in unit tests.

---

## 🚀 Installation & Running Steps

Since the application uses standard client-side languages (no heavy backend required), you can run it directly:

1. **Clone or Download** the folder `OASIS_Calculator` onto your local machine.
2. **Open index.html** in any modern web browser (Google Chrome, Microsoft Edge, Safari, Firefox).
3. **Alternatively**, serve the folder using a local web server (e.g. VS Code Live Server, or Python's server command: `python -m http.server 8000`).

### 🧪 Running the Test Suite
- To view the test console, open `index.html` in your browser, scroll to the bottom of the window, and click on **Automated Self-Test Suite** to expand it. Click **Run Tests**.
- To automatically load and execute all tests on page startup, open the page with the `?test=true` parameter in the URL (e.g., `http://127.0.0.1:8000/index.html?test=true`).

---

## 📸 Screenshots

*(Add your application screenshots here inside the submission folder)*

### Dark Theme Standard Mode
*(Calculator centered on a clean dark mesh background with gold highlights)*

### Scientific Mode Expanded
*(Shows expanded panel containing trigonometric and memory registers)*

### Light Theme Glassmorphism
*(Displays light-themed translucent panel)*
