/* ==========================================================================
   OASIS CALCULATOR - JAVASCRIPT LOGIC & AUTOMATED TEST RUNNER
   ========================================================================== */

// State Variables
let currentExpression = '';
let currentResult = '0';
let isCalculated = false;
let memoryValue = 0;

// Setting Preferences (loaded from LocalStorage)
let isSoundEnabled = localStorage.getItem('oasis_sound') !== 'false';
let isSciMode = localStorage.getItem('oasis_sci_mode') === 'true';
let currentTheme = localStorage.getItem('oasis_theme') || 'dark';

// Audio Context for sound synthesis
let audioCtx = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    updateThemeUI();
    updateSoundUI();
    updateSciUI();
    loadHistory();
    
    // Auto-run tests if '?test=true' is in the URL (convenient for automated testing verification)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'true') {
        setTimeout(() => {
            expandTestPanel();
            runTestSuite();
        }, 800);
    }
});

function initApp() {
    // Set theme attribute on root element
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateDisplay('', '0');
}

// ==========================================================================
// DISPLAY MANAGEMENT
// ==========================================================================
function updateDisplay(expr, res) {
    const exprDisplay = document.getElementById('expression-display');
    const resDisplay = document.getElementById('result-display');
    
    // Set text contents
    exprDisplay.textContent = expr || '';
    resDisplay.textContent = res || '0';
    
    // Scroll expression to the right if it gets long
    exprDisplay.scrollLeft = exprDisplay.scrollWidth;
    
    adjustFontSize();
}

function adjustFontSize() {
    const resDisplay = document.getElementById('result-display');
    const len = resDisplay.textContent.length;
    
    if (len > 20) {
        resDisplay.style.fontSize = '1.2rem';
    } else if (len > 14) {
        resDisplay.style.fontSize = '1.7rem';
    } else if (len > 10) {
        resDisplay.style.fontSize = '2.2rem';
    } else {
        resDisplay.style.fontSize = '2.8rem';
    }
}

function showError(msg) {
    updateDisplay(currentExpression, msg);
    playClickSound('error');
    isCalculated = true;
}

// ==========================================================================
// MATHEMATICAL PARSER (SAFE & SELF-CONTAINED)
// ==========================================================================
function safeEvaluate(expr) {
    try {
        const tokens = tokenize(expr);
        const rpn = shuntingYard(tokens);
        return evaluateRPN(rpn);
    } catch (err) {
        console.warn("Parser error:", err.message);
        if (err.message === "Cannot divide by zero") {
            return "Cannot divide by zero";
        }
        return NaN;
    }
}

function tokenize(expr) {
    // Replace visual symbols and strip all whitespace
    let clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
    
    const tokens = [];
    let i = 0;
    
    while (i < clean.length) {
        const char = clean[i];
        
        if (['+', '*', '/', '^', '!', '(', ')'].includes(char)) {
            // Implicit multiplication check:
            // Number/Parenthesis preceding an opening Parenthesis, e.g., 5(3) -> 5*(3)
            if (char === '(' && tokens.length > 0) {
                const prev = tokens[tokens.length - 1];
                if (prev.type === 'NUMBER' || (prev.type === 'OPERATOR' && prev.value === ')')) {
                    tokens.push({ type: 'OPERATOR', value: '*' });
                }
            }
            tokens.push({ type: 'OPERATOR', value: char });
            i++;
            continue;
        }
        
        if (char === '-') {
            const prev = tokens[tokens.length - 1];
            const isUnary = (tokens.length === 0 || 
                             (prev.type === 'OPERATOR' && prev.value !== ')') || 
                             prev.type === 'FUNCTION');
            
            if (isUnary) {
                tokens.push({ type: 'UNARY_OP', value: 'u-' });
                i++;
            } else {
                tokens.push({ type: 'OPERATOR', value: '-' });
                i++;
            }
            continue;
        }
        
        if (/\d/.test(char) || char === '.') {
            let numStr = '';
            while (i < clean.length && (/\d/.test(clean[i]) || clean[i] === '.')) {
                numStr += clean[i];
                i++;
            }
            
            // Implicit multiplication check: e.g. (2)3 -> (2)*3
            if (tokens.length > 0) {
                const prev = tokens[tokens.length - 1];
                if (prev.type === 'OPERATOR' && prev.value === ')') {
                    tokens.push({ type: 'OPERATOR', value: '*' });
                }
            }
            
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            continue;
        }
        
        if (/[a-zA-Zπ]/.test(char)) {
            let word = '';
            while (i < clean.length && /[a-zA-Zπ\d]/.test(clean[i])) {
                word += clean[i];
                i++;
            }
            
            // Implicit multiplication check for word constants/functions, e.g., 5pi -> 5*pi
            if (tokens.length > 0) {
                const prev = tokens[tokens.length - 1];
                if (prev.type === 'NUMBER' || (prev.type === 'OPERATOR' && prev.value === ')')) {
                    tokens.push({ type: 'OPERATOR', value: '*' });
                }
            }
            
            if (word === 'π' || word === 'pi') {
                tokens.push({ type: 'NUMBER', value: Math.PI });
            } else if (word === 'e') {
                tokens.push({ type: 'NUMBER', value: Math.E });
            } else if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(word)) {
                tokens.push({ type: 'FUNCTION', value: word });
            } else {
                throw new Error("Unknown token: " + word);
            }
            continue;
        }
        
        throw new Error("Unknown character: " + char);
    }
    
    return tokens;
}

function shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];
    
    const precedence = {
        'u-': 4,
        '!': 4,
        '^': 3,
        '*': 2,
        '/': 2,
        '+': 1,
        '-': 1
    };
    
    const associativity = {
        'u-': 'RIGHT',
        '!': 'LEFT',
        '^': 'RIGHT',
        '*': 'LEFT',
        '/': 'LEFT',
        '+': 'LEFT',
        '-': 'LEFT'
    };
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (token.type === 'NUMBER') {
            outputQueue.push(token);
        } else if (token.type === 'FUNCTION') {
            operatorStack.push(token);
        } else if (token.type === 'UNARY_OP') {
            operatorStack.push(token);
        } else if (token.type === 'OPERATOR') {
            const val = token.value;
            if (val === '(') {
                operatorStack.push(token);
            } else if (val === ')') {
                let hasMatchingParenthesis = false;
                while (operatorStack.length > 0) {
                    const top = operatorStack[operatorStack.length - 1];
                    if (top.type === 'OPERATOR' && top.value === '(') {
                        operatorStack.pop();
                        hasMatchingParenthesis = true;
                        break;
                    } else {
                        outputQueue.push(operatorStack.pop());
                    }
                }
                if (!hasMatchingParenthesis) {
                    throw new Error("Mismatched parentheses");
                }
                if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
                    outputQueue.push(operatorStack.pop());
                }
            } else {
                const o1 = val;
                while (operatorStack.length > 0) {
                    const top = operatorStack[operatorStack.length - 1];
                    if (top.type === 'OPERATOR' && top.value === '(') {
                        break;
                    }
                    
                    const o2 = top.value;
                    const p1 = precedence[o1];
                    const p2 = precedence[o2] || 5; 
                    
                    const isLeftAssoc = associativity[o1] === 'LEFT';
                    
                    if ((isLeftAssoc && p1 <= p2) || (!isLeftAssoc && p1 < p2)) {
                        outputQueue.push(operatorStack.pop());
                    } else {
                        break;
                    }
                }
                operatorStack.push(token);
            }
        }
    }
    
    while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (top.type === 'OPERATOR' && (top.value === '(' || top.value === ')')) {
            throw new Error("Mismatched parentheses");
        }
        outputQueue.push(operatorStack.pop());
    }
    
    return outputQueue;
}

function evaluateRPN(rpn) {
    const stack = [];
    
    for (let i = 0; i < rpn.length; i++) {
        const token = rpn[i];
        
        if (token.type === 'NUMBER') {
            stack.push(token.value);
        } else if (token.type === 'UNARY_OP' && token.value === 'u-') {
            if (stack.length < 1) throw new Error("Invalid expression");
            const val = stack.pop();
            stack.push(-val);
        } else if (token.type === 'FUNCTION') {
            if (stack.length < 1) throw new Error("Invalid expression");
            const val = stack.pop();
            let res;
            switch (token.value) {
                case 'sin':
                    res = Math.sin(val * Math.PI / 180);
                    break;
                case 'cos':
                    res = Math.cos(val * Math.PI / 180);
                    if (Math.abs(res) < 1e-12) res = 0;
                    break;
                case 'tan':
                    res = Math.tan(val * Math.PI / 180);
                    break;
                case 'log':
                    if (val <= 0) throw new Error("Invalid input for log");
                    res = Math.log10(val);
                    break;
                case 'ln':
                    if (val <= 0) throw new Error("Invalid input for ln");
                    res = Math.log(val);
                    break;
                case 'sqrt':
                    if (val < 0) throw new Error("Invalid input for sqrt");
                    res = Math.sqrt(val);
                    break;
                default:
                    throw new Error("Unknown function: " + token.value);
            }
            stack.push(res);
        } else if (token.type === 'OPERATOR') {
            const op = token.value;
            if (op === '!') {
                if (stack.length < 1) throw new Error("Invalid expression");
                const val = stack.pop();
                if (val < 0 || !Number.isInteger(val)) {
                    throw new Error("Factorial requires non-negative integer");
                }
                stack.push(factorial(val));
            } else {
                if (stack.length < 2) throw new Error("Invalid expression");
                const b = stack.pop();
                const a = stack.pop();
                let res;
                switch (op) {
                    case '+':
                        res = a + b;
                        break;
                    case '-':
                        res = a - b;
                        break;
                    case '*':
                        res = a * b;
                        break;
                    case '/':
                        if (b === 0) {
                            throw new Error("Cannot divide by zero");
                        }
                        res = a / b;
                        break;
                    case '^':
                        res = Math.pow(a, b);
                        break;
                    default:
                        throw new Error("Unknown operator: " + op);
                }
                stack.push(res);
            }
        }
    }
    
    if (stack.length !== 1) {
        throw new Error("Invalid expression evaluation");
    }
    
    return stack[0];
}

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) {
        res *= i;
    }
    return res;
}

// Helper to check if last character of a string is an operator
function isLastCharOperator() {
    const trimmed = currentExpression.trim();
    if (trimmed === '') return false;
    return ['+', '-', '×', '÷'].includes(trimmed.slice(-1));
}

// ==========================================================================
// CALCULATOR OPERATIONS
// ==========================================================================
function inputDigit(digit) {
    playClickSound('digit');
    
    if (isCalculated) {
        // If we just hit equals, starting a new digit clears the screen
        currentExpression = digit;
        currentResult = digit;
        isCalculated = false;
    } else {
        if (currentExpression === '0' || currentExpression === '') {
            currentExpression = digit;
        } else {
            currentExpression += digit;
        }
        currentResult = currentExpression;
    }
    updateDisplay(currentExpression, currentResult);
}

function handleDecimal() {
    playClickSound('digit');
    
    if (isCalculated) {
        currentExpression = '0.';
        currentResult = '0.';
        isCalculated = false;
        updateDisplay(currentExpression, currentResult);
        return;
    }
    
    // Scan backwards to find the last number token and check if it has a decimal
    let i = currentExpression.length - 1;
    let lastNum = '';
    while (i >= 0) {
        const char = currentExpression[i];
        if (['+', '-', '×', '÷', ' '].includes(char)) {
            break;
        }
        lastNum = char + lastNum;
        i--;
    }
    
    if (lastNum.includes('.')) {
        return; // Block duplicate decimal points
    }
    
    if (lastNum === '' || isLastCharOperator()) {
        currentExpression += '0.';
    } else {
        currentExpression += '.';
    }
    
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function handleOperator(op) {
    playClickSound('operator');
    
    if (isCalculated) {
        // Continue calculation on top of last result
        currentExpression = currentResult;
        isCalculated = false;
    }
    
    const expr = currentExpression.trim();
    
    // If empty expression
    if (expr === '' || expr === '0') {
        if (op === '−') {
            currentExpression = '-'; // negative sign prefix
        } else {
            currentExpression = '0 ' + op + ' ';
        }
        updateDisplay(currentExpression, currentExpression);
        return;
    }
    
    // Check if expression already ends with an operator (and spaces)
    const matches = expr.match(/\s([\+\-×÷])\s$/);
    
    if (matches) {
        const lastOp = matches[1];
        // Allow adding a negative prefix after × or ÷, e.g., "5 × -"
        if (op === '−' && (lastOp === '×' || lastOp === '÷')) {
            currentExpression = expr + '-';
        } else {
            // Replace the operator with the new operator
            currentExpression = expr.slice(0, -3) + ' ' + op + ' ';
        }
    } else if (expr.endsWith('-') && ['+', '-', '×', '÷'].includes(expr.slice(-2, -1).trim())) {
        // Replace something like "5 × -" back to the single operator
        currentExpression = expr.slice(0, -4).trim() + ' ' + op + ' ';
    } else {
        currentExpression = expr + ' ' + op + ' ';
    }
    
    updateDisplay(currentExpression, currentResult);
}

function handlePercent() {
    playClickSound('operator');
    
    if (isCalculated) {
        currentExpression = currentResult;
        isCalculated = false;
    }
    
    if (currentExpression === '' || currentExpression === '0') return;
    
    // Find the last number token in the expression
    let i = currentExpression.length - 1;
    while (i >= 0 && currentExpression[i] === ' ') i--;
    
    let numStr = '';
    while (i >= 0 && (/\d/.test(currentExpression[i]) || currentExpression[i] === '.' || (currentExpression[i] === '-' && (i === 0 || ['+', '-', '×', '÷'].includes(currentExpression[i - 1]))))) {
        numStr = currentExpression[i] + numStr;
        i--;
    }
    
    if (numStr) {
        const val = parseFloat(numStr);
        if (!isNaN(val)) {
            const percentVal = val / 100;
            // Round nicely to avoid floating point representations
            const formattedVal = parseFloat(percentVal.toFixed(12)).toString();
            currentExpression = currentExpression.slice(0, i + 1) + formattedVal;
            currentResult = currentExpression;
            updateDisplay(currentExpression, currentResult);
        }
    }
}

function clearScreen() {
    playClickSound('operator');
    currentExpression = '';
    currentResult = '0';
    isCalculated = false;
    updateDisplay(currentExpression, currentResult);
}

function deleteLast() {
    playClickSound('operator');
    
    if (isCalculated) {
        clearScreen();
        return;
    }
    
    let expr = currentExpression;
    if (expr.endsWith(' ')) {
        // If it ends with spaces (operator), remove the operator and spaces (3 characters, e.g. " + ")
        currentExpression = expr.slice(0, -3);
    } else {
        currentExpression = expr.slice(0, -1);
    }
    
    if (currentExpression === '') {
        currentResult = '0';
    } else {
        currentResult = currentExpression;
    }
    updateDisplay(currentExpression, currentResult);
}

function calculateResult() {
    if (currentExpression.trim() === '') return;
    
    const expr = currentExpression;
    let res = safeEvaluate(expr);
    
    if (res === "Cannot divide by zero") {
        showError("Cannot divide by zero");
        return;
    }
    
    if (isNaN(res)) {
        showError("Invalid Expression");
        return;
    }
    
    playClickSound('equals');
    
    // Format floats to prevent infinite precision display errors
    if (typeof res === 'number') {
        if (Math.abs(res) < 1e-12) {
            res = 0;
        } else {
            // Check if it's a floating point number and round it
            res = parseFloat(res.toFixed(12));
        }
    }
    
    currentResult = res.toString();
    updateDisplay(expr + ' =', currentResult);
    
    // Add item to history
    addHistoryItem(expr, currentResult);
    
    // Update state
    currentExpression = currentResult;
    isCalculated = true;
}

// ==========================================================================
// SCIENTIFIC FUNCTIONS
// ==========================================================================
function inputScientificFunction(funcName) {
    playClickSound('operator');
    if (isCalculated) {
        currentExpression = '';
        isCalculated = false;
    }
    
    const expr = currentExpression.trim();
    if (expr === '' || expr === '0') {
        currentExpression = funcName + '(';
    } else {
        const lastChar = expr.slice(-1);
        if (['+', '-', '×', '÷', '(', '^'].includes(lastChar)) {
            currentExpression = currentExpression + funcName + '(';
        } else {
            // Implicit multiplication
            currentExpression = currentExpression + ' × ' + funcName + '(';
        }
    }
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function inputSquare() {
    playClickSound('operator');
    if (isCalculated) {
        currentExpression = currentResult;
        isCalculated = false;
    }
    currentExpression += '^2';
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function inputPower() {
    playClickSound('operator');
    if (isCalculated) {
        currentExpression = currentResult;
        isCalculated = false;
    }
    currentExpression += ' ^ ';
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function inputFactorial() {
    playClickSound('operator');
    if (isCalculated) {
        currentExpression = currentResult;
        isCalculated = false;
    }
    currentExpression += '!';
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function inputParenthesis(char) {
    playClickSound('operator');
    if (isCalculated) {
        currentExpression = '';
        isCalculated = false;
    }
    
    const expr = currentExpression.trim();
    if (char === '(') {
        if (expr === '' || expr === '0') {
            currentExpression = '(';
        } else {
            const lastChar = expr.slice(-1);
            if (['+', '-', '×', '÷', '(', '^'].includes(lastChar)) {
                currentExpression += '(';
            } else {
                currentExpression += ' × (';
            }
        }
    } else {
        currentExpression += ')';
    }
    
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function inputConstantE() {
    playClickSound('digit');
    if (isCalculated) {
        currentExpression = '';
        isCalculated = false;
    }
    
    const expr = currentExpression.trim();
    if (expr === '' || expr === '0') {
        currentExpression = 'e';
    } else {
        const lastChar = expr.slice(-1);
        if (['+', '-', '×', '÷', '(', '^'].includes(lastChar)) {
            currentExpression += 'e';
        } else {
            currentExpression += ' × e';
        }
    }
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

function insertPi() {
    playClickSound('digit');
    if (isCalculated) {
        currentExpression = '';
        isCalculated = false;
    }
    
    const expr = currentExpression.trim();
    if (expr === '' || expr === '0') {
        currentExpression = 'π';
    } else {
        const lastChar = expr.slice(-1);
        if (['+', '-', '×', '÷', '(', '^'].includes(lastChar)) {
            currentExpression += 'π';
        } else {
            currentExpression += ' × π';
        }
    }
    currentResult = currentExpression;
    updateDisplay(currentExpression, currentResult);
}

// Memory Operations
function handleMemory(action) {
    playClickSound('operator');
    
    let val = 0;
    if (isCalculated) {
        val = parseFloat(currentResult);
    } else {
        const res = safeEvaluate(currentExpression || '0');
        if (!isNaN(res) && typeof res === 'number') {
            val = res;
        }
    }
    
    switch (action) {
        case 'mc':
            memoryValue = 0;
            document.getElementById('memory-indicator').classList.add('hidden');
            break;
        case 'mr':
            if (isCalculated) {
                currentExpression = '';
                isCalculated = false;
            }
            // Append or insert memory value
            const memoryStr = memoryValue.toString();
            const expr = currentExpression.trim();
            if (expr === '' || expr === '0') {
                currentExpression = memoryStr;
            } else {
                const lastChar = expr.slice(-1);
                if (['+', '-', '×', '÷'].includes(lastChar)) {
                    currentExpression = currentExpression + ' ' + memoryStr;
                } else {
                    currentExpression = currentExpression + ' × ' + memoryStr;
                }
            }
            currentResult = currentExpression;
            updateDisplay(currentExpression, currentResult);
            break;
        case 'mplus':
            memoryValue += val;
            if (memoryValue !== 0) {
                document.getElementById('memory-indicator').classList.remove('hidden');
            } else {
                document.getElementById('memory-indicator').classList.add('hidden');
            }
            // Trigger flash animation
            const memInd = document.getElementById('memory-indicator');
            memInd.style.opacity = '0.3';
            setTimeout(() => memInd.style.opacity = '1', 150);
            break;
    }
}

// ==========================================================================
// SOUND EFFECT GENERATOR (WEB AUDIO SYNTHESIS)
// ==========================================================================
function playClickSound(type = 'digit') {
    if (!isSoundEnabled) return;
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        if (type === 'equals') {
            // Elegant double pitch chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'operator') {
            // Subtly lower frequency pop
            osc.type = 'sine';
            osc.frequency.setValueAtTime(380, now);
            gainNode.gain.setValueAtTime(0.06, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'error') {
            // Buzz sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.25);
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else {
            // standard button click: short sine tick
            osc.type = 'sine';
            osc.frequency.setValueAtTime(650, now);
            gainNode.gain.setValueAtTime(0.04, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            osc.start(now);
            osc.stop(now + 0.035);
        }
    } catch (err) {
        console.warn('Audio Context error:', err);
    }
}

// ==========================================================================
// HISTORY MANAGEMENT
// ==========================================================================
function loadHistory() {
    const historyList = JSON.parse(localStorage.getItem('oasis_history') || '[]');
    const container = document.getElementById('history-content');
    
    if (historyList.length === 0) {
        container.innerHTML = '<div class="empty-history-msg">No history yet</div>';
        return;
    }
    
    container.innerHTML = '';
    historyList.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.setAttribute('data-index', index);
        
        div.innerHTML = `
            <div class="history-item-top">
                <span class="history-item-time">${item.time || ''}</span>
                <button class="delete-history-item-btn" data-index="${index}" title="Delete this entry">&times;</button>
            </div>
            <span class="history-item-expr">${item.expr}</span>
            <span class="history-item-result">${item.result}</span>
        `;
        
        const deleteBtn = div.querySelector('.delete-history-item-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(index);
        });
        
        div.addEventListener('click', () => {
            playClickSound('digit');
            currentExpression = item.result;
            currentResult = item.result;
            isCalculated = false;
            updateDisplay(currentExpression, currentResult);
            closeHistoryDrawer();
        });
        
        container.appendChild(div);
    });
}

function deleteHistoryItem(index) {
    playClickSound('operator');
    let historyList = JSON.parse(localStorage.getItem('oasis_history') || '[]');
    historyList.splice(index, 1);
    localStorage.setItem('oasis_history', JSON.stringify(historyList));
    loadHistory();
}

function addHistoryItem(expr, result) {
    const historyList = JSON.parse(localStorage.getItem('oasis_history') || '[]');
    
    // limit history size to 30
    if (historyList.length > 0 && historyList[0].expr === expr && historyList[0].result === result) {
        return;
    }
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    historyList.unshift({ expr, result, time });
    
    if (historyList.length > 30) {
        historyList.pop();
    }
    
    localStorage.setItem('oasis_history', JSON.stringify(historyList));
    loadHistory();
}

function clearHistory() {
    playClickSound('operator');
    localStorage.removeItem('oasis_history');
    loadHistory();
}

function downloadHistoryLogs() {
    playClickSound('operator');
    const historyList = JSON.parse(localStorage.getItem('oasis_history') || '[]');
    if (historyList.length === 0) {
        alert("No history logs to export.");
        return;
    }
    
    const dateStr = new Date().toLocaleDateString();
    let textContent = `OASIS CALCULATOR HISTORY LOG\n`;
    textContent += `Exported on: ${dateStr} - ${new Date().toLocaleTimeString()}\n`;
    textContent += `====================================================\n\n`;
    
    historyList.forEach((item, index) => {
        textContent += `[${historyList.length - index}] ${item.expr} = ${item.result}   (${item.time || ''})\n`;
    });
    
    textContent += `\n====================================================\n`;
    textContent += `Prepared for OASIS internship submission.\n`;
    
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oasis_calculator_history.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Drawers Toggle Controls
function openHistoryDrawer() {
    playClickSound('operator');
    document.getElementById('history-drawer').classList.add('open');
}

function closeHistoryDrawer() {
    playClickSound('operator');
    document.getElementById('history-drawer').classList.remove('open');
}

// ==========================================================================
// KEYBOARD HANDLER
// ==========================================================================
function setupEventListeners() {
    // Digit inputs
    document.querySelectorAll('.digit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            if (val !== null) {
                inputDigit(val);
            } else if (btn.getAttribute('data-action') === 'decimal') {
                handleDecimal();
            }
        });
    });

    // Operator inputs
    document.querySelectorAll('.operator-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            let op = '';
            if (action === 'add') op = '+';
            if (action === 'subtract') op = '−';
            if (action === 'multiply') op = '×';
            if (action === 'divide') op = '÷';
            handleOperator(op);
        });
    });

    // Function inputs
    document.getElementById('btn-clear').addEventListener('click', clearScreen);
    document.getElementById('btn-backspace').addEventListener('click', deleteLast);
    document.getElementById('btn-percent').addEventListener('click', handlePercent);
    document.getElementById('btn-equals').addEventListener('click', calculateResult);
    
    // Scientific modes
    document.getElementById('btn-sin').addEventListener('click', () => inputScientificFunction('sin'));
    document.getElementById('btn-cos').addEventListener('click', () => inputScientificFunction('cos'));
    document.getElementById('btn-tan').addEventListener('click', () => inputScientificFunction('tan'));
    document.getElementById('btn-ln').addEventListener('click', () => inputScientificFunction('ln'));
    document.getElementById('btn-log').addEventListener('click', () => inputScientificFunction('log'));
    document.getElementById('btn-sqrt').addEventListener('click', () => inputScientificFunction('sqrt'));
    document.getElementById('btn-square').addEventListener('click', inputSquare);
    document.getElementById('btn-power').addEventListener('click', inputPower);
    document.getElementById('btn-left-paren').addEventListener('click', () => inputParenthesis('('));
    document.getElementById('btn-right-paren').addEventListener('click', () => inputParenthesis(')'));
    document.getElementById('btn-factorial').addEventListener('click', inputFactorial);
    document.getElementById('btn-e').addEventListener('click', inputConstantE);
    document.getElementById('btn-pi').addEventListener('click', insertPi);
    
    // Memory
    document.getElementById('btn-mc').addEventListener('click', () => handleMemory('mc'));
    document.getElementById('btn-mr').addEventListener('click', () => handleMemory('mr'));
    document.getElementById('btn-mplus').addEventListener('click', () => handleMemory('mplus'));

    // Drawer Toggles
    document.getElementById('history-toggle').addEventListener('click', openHistoryDrawer);
    document.getElementById('close-history').addEventListener('click', closeHistoryDrawer);
    document.getElementById('clear-history').addEventListener('click', clearHistory);
    document.getElementById('download-history').addEventListener('click', downloadHistoryLogs);

    // Audio Settings Toggle
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);

    // Scientific Mode Toggle
    document.getElementById('sci-toggle').addEventListener('click', toggleSciMode);

    // Theme Mode Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Self Test Runners Toggle
    document.getElementById('test-header-toggle').addEventListener('click', (e) => {
        // Prevent toggle if clicking "Run Tests" button
        if (e.target.id === 'run-tests-btn') return;
        toggleTestPanel();
    });
    document.getElementById('run-tests-btn').addEventListener('click', runTestSuite);

    // Global Keyboard Listener
    window.addEventListener('keydown', handleKeyboardInput);
}

function handleKeyboardInput(e) {
    const key = e.key;
    
    // Prevent typing keys when user is typing in a text field (if any exist)
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
    }
    
    if (/\d/.test(key)) {
        e.preventDefault();
        inputDigit(key);
    } else if (key === '.') {
        e.preventDefault();
        handleDecimal();
    } else if (key === '+') {
        e.preventDefault();
        handleOperator('+');
    } else if (key === '-') {
        e.preventDefault();
        handleOperator('−');
    } else if (key === '*') {
        e.preventDefault();
        handleOperator('×');
    } else if (key === '/') {
        e.preventDefault();
        handleOperator('÷');
    } else if (key === '%') {
        e.preventDefault();
        handlePercent();
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateResult();
    } else if (key === 'Backspace') {
        e.preventDefault();
        deleteLast();
    } else if (key === 'Escape') {
        e.preventDefault();
        clearScreen();
    } else if (key === '(') {
        e.preventDefault();
        inputParenthesis('(');
    } else if (key === ')') {
        e.preventDefault();
        inputParenthesis(')');
    } else if (key === '^') {
        e.preventDefault();
        inputPower();
    } else if (key === '!') {
        e.preventDefault();
        inputFactorial();
    } else if (key.toLowerCase() === 'e') {
        e.preventDefault();
        inputConstantE();
    } else if (key.toLowerCase() === 'p') {
        e.preventDefault();
        insertPi();
    }
}

// ==========================================================================
// PREFERENCE CONTROLLERS
// ==========================================================================
function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('oasis_sound', isSoundEnabled);
    updateSoundUI();
    if (isSoundEnabled) {
        playClickSound('digit');
    }
}

function updateSoundUI() {
    const soundOn = document.querySelector('.sound-on-icon');
    const soundOff = document.querySelector('.sound-off-icon');
    
    if (isSoundEnabled) {
        soundOn.classList.remove('hidden');
        soundOff.classList.add('hidden');
    } else {
        soundOn.classList.add('hidden');
        soundOff.classList.remove('hidden');
    }
}

function toggleSciMode() {
    isSciMode = !isSciMode;
    localStorage.setItem('oasis_sci_mode', isSciMode);
    updateSciUI();
    playClickSound('operator');
}

function updateSciUI() {
    const sciPanel = document.getElementById('scientific-panel');
    const calcCard = document.getElementById('calculator-card');
    const sciToggleBtn = document.getElementById('sci-toggle');
    
    if (isSciMode) {
        sciPanel.classList.remove('collapsed');
        calcCard.classList.add('scientific');
        sciToggleBtn.classList.add('active');
    } else {
        sciPanel.classList.add('collapsed');
        calcCard.classList.remove('scientific');
        sciToggleBtn.classList.remove('active');
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('oasis_theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeUI();
    playClickSound('operator');
}

function updateThemeUI() {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (currentTheme === 'dark') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

function toggleTestPanel() {
    const panel = document.getElementById('test-panel');
    panel.classList.toggle('expanded');
}

function expandTestPanel() {
    const panel = document.getElementById('test-panel');
    panel.classList.add('expanded');
}

// ==========================================================================
// AUTOMATED TEST SUITE ENGINE
// ==========================================================================
function logTestResult(name, passed, details) {
    const list = document.getElementById('test-list');
    const row = document.createElement('li');
    row.className = `test-row ${passed ? 'passed' : 'failed'}`;
    
    row.innerHTML = `
        <div class="test-row-name">${name}</div>
        <div class="test-row-details">${details}</div>
        <span class="test-status-badge ${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</span>
    `;
    list.appendChild(row);
}

function runTestSuite() {
    // Clear list
    const list = document.getElementById('test-list');
    list.innerHTML = '';
    
    const statsContainer = document.getElementById('test-stats');
    statsContainer.textContent = 'Running tests...';
    
    const indicator = document.getElementById('test-indicator');
    indicator.className = 'test-indicator pulse-green';
    
    // Save current user state to restore it after testing
    const originalExpr = currentExpression;
    const originalResult = currentResult;
    const originalIsCalculated = isCalculated;
    
    let passedCount = 0;
    let failedCount = 0;
    
    // Helper function to mock key presses (calls exact calculator functions to isolate UI code)
    const runTest = (name, operations, assertionFn) => {
        clearScreen();
        try {
            operations();
            const pass = assertionFn();
            if (pass) {
                passedCount++;
                logTestResult(name, true, `Expr: "${currentExpression}" | Result: "${currentResult}"`);
            } else {
                failedCount++;
                logTestResult(name, false, `Expected match. Got Expr: "${currentExpression}" | Result: "${currentResult}"`);
            }
        } catch (err) {
            failedCount++;
            logTestResult(name, false, `Throws: ${err.message}`);
        }
    };

    // --- TEST 1: Addition ---
    runTest('Addition Operation', () => {
        inputDigit('1');
        inputDigit('2');
        handleOperator('+');
        inputDigit('8');
        handleDecimal();
        inputDigit('5');
        calculateResult();
    }, () => currentResult === '20.5');

    // --- TEST 2: Subtraction ---
    runTest('Subtraction Operation', () => {
        inputDigit('1');
        inputDigit('0');
        inputDigit('0');
        handleOperator('−');
        inputDigit('4');
        inputDigit('5');
        calculateResult();
    }, () => currentResult === '55');

    // --- TEST 3: Multiplication ---
    runTest('Multiplication Operation', () => {
        inputDigit('6');
        handleOperator('×');
        inputDigit('7');
        calculateResult();
    }, () => currentResult === '42');

    // --- TEST 4: Division ---
    runTest('Division Operation', () => {
        inputDigit('8');
        inputDigit('0');
        handleOperator('÷');
        inputDigit('4');
        calculateResult();
    }, () => currentResult === '20');

    // --- TEST 5: Divide By Zero ---
    runTest('Divide By Zero Handling', () => {
        inputDigit('5');
        handleOperator('÷');
        inputDigit('0');
        calculateResult();
    }, () => currentResult === 'Cannot divide by zero');

    // --- TEST 6: Decimals Block validation ---
    runTest('Consecutive Decimals Block', () => {
        inputDigit('1');
        handleDecimal();
        inputDigit('5');
        handleDecimal(); // should block
        inputDigit('2');
        calculateResult();
    }, () => currentExpression === '1.52');

    // --- TEST 7: History Feature ---
    runTest('History Management', () => {
        // Clear history list first
        localStorage.removeItem('oasis_history');
        loadHistory();
        
        // Add a test calculation
        inputDigit('5');
        handleOperator('+');
        inputDigit('3');
        calculateResult(); // evaluates to 8, writes to history
        
        // Check local storage records
        const history = JSON.parse(localStorage.getItem('oasis_history') || '[]');
        return history.length === 1 && history[0].expr === '5 + 3' && history[0].result === '8';
    }, () => {
        const history = JSON.parse(localStorage.getItem('oasis_history') || '[]');
        return history.length === 1 && history[0].result === '8';
    });

    // --- TEST 8: Scientific Trigonometry & Roots ---
    runTest('Scientific: sin, sqrt, sqr', () => {
        // sin(30) -> 0.5
        currentExpression = 'sin(30)';
        calculateResult();
        const sinPass = (currentResult === '0.5');
        
        // sqrt(16) -> 4
        currentExpression = 'sqrt(16)';
        calculateResult();
        const sqrtPass = (currentResult === '4');
        
        // 5^2 -> 25
        currentExpression = '5^2';
        calculateResult();
        const squarePass = (currentResult === '25');
        
        return sinPass && sqrtPass && squarePass;
    }, () => currentResult === '25');

    // --- TEST 9: Keyboard Event Dispatch Simulation ---
    runTest('Keyboard Input Integration', () => {
        // Simulate physical key inputs: 7 + 8 = 15
        const pressKey = (char) => {
            const event = new KeyboardEvent('keydown', { key: char });
            window.dispatchEvent(event);
        };
        
        pressKey('7');
        pressKey('+');
        pressKey('8');
        pressKey('Enter');
    }, () => currentResult === '15');

    // --- TEST 10: Parentheses & Factorial Operations ---
    runTest('Parentheses & Factorial', () => {
        // (5 + 3) * 2 = 16
        currentExpression = '(5 + 3) × 2';
        calculateResult();
        const parenPass = (currentResult === '16');

        // 5! = 120
        currentExpression = '5!';
        calculateResult();
        const factPass = (currentResult === '120');

        return parenPass && factPass;
    }, () => currentResult === '120');

    // --- TEST 11: Logarithms & Constants ---
    runTest('Logarithms & Constants', () => {
        // log(100) + ln(e) = 3
        currentExpression = 'log(100) + ln(e)';
        calculateResult();
    }, () => currentResult === '3');

    // Restore original calculator display values
    currentExpression = originalExpr;
    currentResult = originalResult;
    isCalculated = originalIsCalculated;
    updateDisplay(currentExpression, currentResult);
    
    // Re-sync history drawer in case mock tests cleared it
    loadHistory();

    // Display total stats
    const totalCount = passedCount + failedCount;
    statsContainer.textContent = `Completed ${totalCount} tests: ${passedCount} passed, ${failedCount} failed.`;
    
    if (failedCount === 0) {
        indicator.className = 'test-indicator pulse-green';
        indicator.style.color = '#48bb78';
    } else {
        indicator.className = 'test-indicator pulse-red';
        indicator.style.color = '#e53e3e';
    }
}
