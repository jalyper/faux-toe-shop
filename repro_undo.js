
// Simulation of PhotoshopEditor state
let history = [];
let historyStep = -1;

// Simulation of Canvas state
let canvasHistory = ['initial_blank'];
let canvasStep = 0;

function addToHistory(action) {
    // PhotoshopEditor logic
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(action);
    history = newHistory;
    historyStep = newHistory.length - 1;

    // Canvas logic (simplified)
    canvasHistory = canvasHistory.slice(0, canvasStep + 1);
    canvasHistory.push('state_after_' + action);
    canvasStep = canvasHistory.length - 1;

    console.log(`[Action: ${action}] Editor Step: ${historyStep}, Canvas Step: ${canvasStep}`);
}

function undo() {
    console.log('Attempting Undo...');
    // FIXED PhotoshopEditor logic
    if (historyStep >= 0) { // Changed from > 0
        historyStep--;
        // Canvas logic
        if (canvasStep > 0) {
            canvasStep--;
            console.log(`Undo Successful. Editor Step: ${historyStep}, Canvas Step: ${canvasStep}`);
        } else {
            console.log('Canvas Undo Failed (should not happen if synced)');
        }
    } else {
        console.log('Undo Blocked by Editor Logic');
    }
}

// Simulation of Brush Stroke
function onPathCreated() {
    // Logic added to Canvas.jsx
    console.log('Path Created (Brush Stroke)');
    addToHistory('Brush Stroke');
}

// Test Scenario
console.log('Initial State: Editor Step: -1, Canvas Step: 0');

// Simulate Brush Stroke
onPathCreated();
// Expected: Editor Step: 0, Canvas Step: 1

undo();
// Expected: Should go back to Editor Step: -1, Canvas Step: 0
