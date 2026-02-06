// ===== Utility Functions =====
function convertOuncesToGrams(ounces) {
    return ounces * 28.35;
}

function convertGramsToOunces(grams) {
    return grams / 28.35;
}

// ===== CoffeeAmount Class =====
class CoffeeAmount {
    constructor(options) {
        if (options.grams !== undefined) {
            this.grams = options.grams;
            this.ounces = convertGramsToOunces(options.grams);
        } else if (options.ounces !== undefined) {
            this.ounces = options.ounces;
            this.grams = convertOuncesToGrams(options.ounces);
        }
    }
}

// ===== CoffeeOrder Class =====
class CoffeeOrder {
    constructor(amount, isIced) {
        this.amount = amount; // CoffeeAmount instance
        this.isIced = isIced;
    }
}

// ===== CoffeeRecipe Class =====
class CoffeeRecipe {
    constructor(order) {
        this.producedCoffeeAmount = new CoffeeAmount({ grams: 0 });
        this.coffeeGrams = 0.0;
        this.waterGrams = 0.0;
        this.iceGrams = 0.0;

        this.changeOrder(order);
    }

    changeOrder(order) {
        this.producedCoffeeAmount = order.amount;

        if (order.isIced) {
            // Iced coffee ratio: 1 gram coffee : 7 grams water : 4.3 grams ice
            this.coffeeGrams = this.producedCoffeeAmount.grams / 11.3;
            this.waterGrams = (this.producedCoffeeAmount.grams / 11.3) * 7;
            this.iceGrams = (this.producedCoffeeAmount.grams / 11.3) * 4.3;
        } else {
            // Hot coffee ratio: 1 gram coffee : 15 grams water
            this.waterGrams = this.producedCoffeeAmount.grams;
            this.coffeeGrams = this.producedCoffeeAmount.grams / 15;
            this.iceGrams = 0;
        }
    }
}

// ===== BrewingInstructions Class =====
class BrewingInstructions {
    constructor(recipe) {
        this.recipe = recipe;
        this.baseIntervalCount = 5;
        this.baseIntervalTime = 30; // seconds

        // Calculate additional intervals for larger batches
        let additionalIntervals = 0;
        if (recipe.producedCoffeeAmount.ounces > 8.0) {
            additionalIntervals = Math.ceil((recipe.producedCoffeeAmount.ounces - 8.0) / 8.0);
        }

        this.intervalCount = this.baseIntervalCount + additionalIntervals;
        this.intervalTime = this.baseIntervalTime; // seconds
        this.totalTime = this.intervalTime * this.intervalCount; // total seconds
        this.waterPerIntervalGrams = recipe.waterGrams / this.intervalCount;

        console.log(`Interval count: ${this.intervalCount}`);
    }

    getWaterAmountForInterval(currentInterval) {
        return currentInterval * this.waterPerIntervalGrams;
    }

    // Helper to get all intervals at once
    getAllIntervals() {
        const intervals = [];
        for (let i = 1; i <= this.intervalCount; i++) {
            intervals.push({
                intervalNumber: i,
                time: (i - 1) * this.intervalTime, // time when this interval starts
                cumulativeWater: this.getWaterAmountForInterval(i),
                waterThisInterval: this.waterPerIntervalGrams,
                instruction: `Pour ${this.waterPerIntervalGrams.toFixed(0)}g (Total: ${this.getWaterAmountForInterval(i).toFixed(0)}g)`
            });
        }
        return intervals;
    }
}

// ===== Global State =====
const appState = {
    currentRecipe: null,
    currentInstructions: null,
    recipeSettings: {
        coffeeAmount: 300, // This is the desired output amount in grams
        isIced: false
    },
    brewSession: {
        isActive: false,
        isPaused: false,
        elapsedSeconds: 0,
        currentIntervalIndex: 0
    }
};

// Navigation stack to track view history
const navigationStack = ['recipe'];

// ===== Navigation Functions =====
function pushView(viewName) {
    // Hide current view
    const currentView = navigationStack[navigationStack.length - 1];
    document.getElementById(`${currentView}-view`).classList.add('hidden');
    document.getElementById(`${currentView}-view`).classList.remove('active');

    // Add new view to stack
    navigationStack.push(viewName);

    // Show new view
    const newView = document.getElementById(`${viewName}-view`);
    newView.classList.remove('hidden');
    newView.classList.add('active');

    console.log(`Navigated to ${viewName}. Stack:`, navigationStack);
}

function popView() {
    if (navigationStack.length <= 1) {
        console.log('Already at root, cannot go back');
        return;
    }

    // Hide current view
    const currentView = navigationStack.pop();
    document.getElementById(`${currentView}-view`).classList.add('hidden');
    document.getElementById(`${currentView}-view`).classList.remove('active');

    // Show previous view
    const previousView = navigationStack[navigationStack.length - 1];
    document.getElementById(`${previousView}-view`).classList.remove('hidden');
    document.getElementById(`${previousView}-view`).classList.add('active');

    console.log(`Went back to ${previousView}. Stack:`, navigationStack);
}

function popToRoot() {
    // Go back to home view
    while (navigationStack.length > 1) {
        const currentView = navigationStack.pop();
        document.getElementById(`${currentView}-view`).classList.add('hidden');
        document.getElementById(`${currentView}-view`).classList.remove('active');
    }

    // Show recipe view
    document.getElementById('recipe-view').classList.remove('hidden');
    document.getElementById('recipe-view').classList.add('active');

    console.log('Returned to recipe. Stack:', navigationStack);
}

// ===== Recipe Selection =====
function selectRecipe(recipeName) {
    console.log(`Selected recipe: ${recipeName}`);

    // Set default values based on recipe (in ounces for display)
    const recipeDefaults = {
        '1CupHot': { coffeeOunces: 8, isIced: false, name: 'Hot Coffee for 1' },
        '2CupHot': { coffeeOunces: 16, isIced: false, name: 'Hot Coffee for 2' },
        '1CupIced': { coffeeOunces: 8, isIced: true, name: 'Iced Coffee for 1' },
        '2CupIced': { coffeeOunces: 16, isIced: true, name: 'Iced Coffee for 2' },
        'custom': { coffeeOunces: 10, isIced: false, name: 'Custom Recipe' }
    };

    const recipe = recipeDefaults[recipeName] || recipeDefaults['1CupHot'];

    // Store as grams internally but work with ounces for UI
    const coffeeAmountGrams = convertOuncesToGrams(recipe.coffeeOunces);
    appState.recipeSettings.coffeeAmount = coffeeAmountGrams;
    appState.recipeSettings.isIced = recipe.isIced;

    // Update recipe view
    document.getElementById('recipe-name').textContent = recipe.name;
    document.getElementById('coffee-slider').value = recipe.coffeeOunces;
    document.getElementById('coffee-slider').min = 3;
    document.getElementById('coffee-slider').max = 36;
    document.getElementById('coffee-slider').step = 1.0;
    document.getElementById('coffee-amount-display').textContent = `${recipe.coffeeOunces.toFixed(0)} oz`;
    document.getElementById('iced-toggle').checked = recipe.isIced;

    // Update recipe display
    updateRecipeDisplay();

    // Navigate to recipe view
    pushView('recipe');
}

// ===== Recipe Display Update =====
function updateRecipeDisplay() {
    const settings = appState.recipeSettings;

    // Create the order and recipe
    const amount = new CoffeeAmount({ grams: settings.coffeeAmount });
    const order = new CoffeeOrder(amount, settings.isIced);
    const recipe = new CoffeeRecipe(order);
    const instructions = new BrewingInstructions(recipe);

    // Update the display
    document.getElementById('coffee-amount-display').textContent = `${recipe.producedCoffeeAmount.ounces.toFixed(0)}oz`;
    document.getElementById('coffee-slider').value = recipe.producedCoffeeAmount.ounces.toFixed(0);
    document.getElementById('coffee-display').textContent = `${recipe.coffeeGrams.toFixed(0)}g`;
    document.getElementById('water-display').textContent = `${recipe.waterGrams.toFixed(0)}g`;
    document.getElementById('ice-display').textContent = `${recipe.iceGrams.toFixed(0)}g`;

  // Hide ice stat if zero
  const recipeIceStat = document.getElementById('recipe-ice-stat');
  if (recipe.iceGrams === 0) {
    recipeIceStat.style.display = 'none';
  } else {
    recipeIceStat.style.display = '';
  }

    // Store in state for later use
    appState.currentRecipe = recipe;
    appState.currentInstructions = instructions;

    console.log('Recipe:', recipe);
    console.log('Instructions:', instructions);
    console.log('Intervals:', instructions.getAllIntervals());
}

function startBrewView() {
  // Make sure we have current recipe and instructions
  if (!appState.currentRecipe || !appState.currentInstructions) {
    console.warn('Recipe not initialized, creating now...');
    updateRecipeDisplay();
  }
  
  const recipe = appState.currentRecipe;
  const instructions = appState.currentInstructions;
  
  // Copy recipe settings to brew view
  document.getElementById('brew-total-coffee').textContent = `${recipe.producedCoffeeAmount.ounces.toFixed(0)}oz`;
  document.getElementById('brew-coffee').textContent = `${recipe.coffeeGrams.toFixed(0)}g`;
  document.getElementById('brew-water').textContent = `${recipe.waterGrams.toFixed(0)}g`;
  document.getElementById('brew-ice').textContent = `${recipe.iceGrams.toFixed(0)}g`;

  // Hide ice stat in brew view when zero
  const brewIceStat = document.getElementById('brew-ice-stat');
  if (recipe.iceGrams === 0) {
    brewIceStat.style.display = 'none';
  } else {
    brewIceStat.style.display = '';
  }

  // Reset brew session state
  appState.brewSession.isActive = false;
  appState.brewSession.isPaused = false;
  appState.brewSession.elapsedSeconds = 0;
  appState.brewSession.currentIntervalIndex = 0;
  
  // Initialize timers to starting values
  const totalTime = instructions.totalTime;
  const firstIntervalTime = instructions.intervalTime;
  
  document.getElementById('interval-timer-text').textContent = formatTime(firstIntervalTime);
  document.getElementById('total-timer-text').textContent = formatTime(totalTime);
  
  // Initialize pour target
  document.getElementById('pour-target').textContent = '0g';
  document.getElementById('interval-info').textContent = 'Ready to start';
  document.getElementById('pour-instruction').classList.remove('pour-active');
  
  document.getElementById('start-pause-btn').textContent = 'Start';
  document.getElementById('start-pause-btn').style.display = 'block';
  
  // Navigate to brew view
  pushView('brew');
}

// ===== Timer Variables =====
let timerInterval = null;

// ===== Timer Functions =====
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startBrew() {
  if (!appState.currentInstructions) {
    console.error('No brewing instructions available');
    return;
  }
  
  appState.brewSession.isActive = true;
  appState.brewSession.isPaused = false;
  appState.brewSession.currentIntervalIndex = 0;
  
  const intervals = appState.currentInstructions.getAllIntervals();
  const totalTime = appState.currentInstructions.totalTime;
  
  console.log('=== BREW START ===');
  console.log('Total time:', totalTime, 'seconds');
  console.log('Intervals:', intervals);
  
  // Show first pour target immediately (interval 0)
  updatePourTarget(0);
  
  // Update button text
  document.getElementById('start-pause-btn').textContent = 'Pause';
  
  // Start the timer
  timerInterval = setInterval(() => {
    appState.brewSession.elapsedSeconds++;
    const elapsed = appState.brewSession.elapsedSeconds;
    
    // Calculate time remaining
    const totalRemaining = totalTime - elapsed;
    
    // Update total timer (counting down)
    document.getElementById('total-timer-text').textContent = formatTime(totalRemaining);
    
    // Calculate current interval countdown
    const currentIntervalIndex = appState.brewSession.currentIntervalIndex;
    
    if (currentIntervalIndex < intervals.length) {
      const currentInterval = intervals[currentIntervalIndex];
      const nextIntervalTime = currentIntervalIndex + 1 < intervals.length 
        ? intervals[currentIntervalIndex + 1].time 
        : totalTime;
      
      const intervalRemaining = nextIntervalTime - elapsed;
      
      // Update interval timer (counting down)
      document.getElementById('interval-timer-text').textContent = formatTime(intervalRemaining);
      
      // Check if we've reached the next interval
      if (currentIntervalIndex + 1 < intervals.length && 
          elapsed === intervals[currentIntervalIndex + 1].time) {
        console.log('Moving to next interval');
        appState.brewSession.currentIntervalIndex++;
        updatePourTarget(appState.brewSession.currentIntervalIndex);
        
        // Vibrate when new pour is needed
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
    
    // Check if brewing is complete
    if (elapsed >= totalTime) {
      completeBrew();
    }
  }, 1000);
  
  console.log('Brew timer started');
}

function pauseBrew() {
  appState.brewSession.isPaused = true;
  clearInterval(timerInterval);
  timerInterval = null;
  
  // Update button text
  document.getElementById('start-pause-btn').textContent = 'Resume';
  
  console.log('Brew paused');
}

function resumeBrew() {
  appState.brewSession.isPaused = false;
  
  // Update button text
  document.getElementById('start-pause-btn').textContent = 'Pause';
  
  const intervals = appState.currentInstructions.getAllIntervals();
  const totalTime = appState.currentInstructions.totalTime;
  
  // Restart the timer from current elapsed time
  timerInterval = setInterval(() => {
    appState.brewSession.elapsedSeconds++;
    const elapsed = appState.brewSession.elapsedSeconds;
    
    // Calculate time remaining
    const totalRemaining = totalTime - elapsed;
    
    // Update total timer
    document.getElementById('total-timer-text').textContent = formatTime(totalRemaining);
    
    // Calculate current interval countdown
    const currentIntervalIndex = appState.brewSession.currentIntervalIndex;
    
    if (currentIntervalIndex < intervals.length) {
      const nextIntervalTime = currentIntervalIndex + 1 < intervals.length 
        ? intervals[currentIntervalIndex + 1].time 
        : totalTime;
      
      const intervalRemaining = nextIntervalTime - elapsed;
      
      // Update interval timer
      document.getElementById('interval-timer-text').textContent = formatTime(intervalRemaining);
      
      // Check if we've reached the next interval
      if (currentIntervalIndex + 1 < intervals.length && 
          elapsed === intervals[currentIntervalIndex + 1].time) {
        appState.brewSession.currentIntervalIndex++;
        updatePourTarget(appState.brewSession.currentIntervalIndex);
        
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }
    
    // Check if brewing is complete
    if (elapsed >= totalTime) {
      completeBrew();
    }
  }, 1000);
  
  console.log('Brew resumed');
}

function stopBrew() {
  clearInterval(timerInterval);
  timerInterval = null;
  
  // Reset brew session
  appState.brewSession.isActive = false;
  appState.brewSession.isPaused = false;
  appState.brewSession.elapsedSeconds = 0;
  appState.brewSession.currentIntervalIndex = 0;
  
  console.log('Brew stopped');
  
  // Return to recipe view
  popToRoot();
}

function completeBrew() {
  clearInterval(timerInterval);
  timerInterval = null;
  
  // Update UI to show completion
  document.getElementById('interval-timer-text').textContent = '00:00';
  document.getElementById('total-timer-text').textContent = '00:00';
  
  const pourInstruction = document.getElementById('pour-instruction');
  pourInstruction.classList.remove('pour-active');
  pourInstruction.innerHTML = `
    <p style="color: #4CAF50; font-weight: bold; font-size: 24px; margin: 20px 0;">
      ✓ Brewing Complete!
    </p>
    <p style="color: #666; font-size: 18px;">
      Coffee Time! ☕
    </p>
  `;
  
  document.getElementById('start-pause-btn').style.display = 'none';
  
  // Vibrate to indicate completion
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
  
  console.log('Brew complete!');
}

function updatePourTarget(intervalIndex) {
  const intervals = appState.currentInstructions.getAllIntervals();
  
  if (intervalIndex >= intervals.length) {
    return;
  }
  
  const interval = intervals[intervalIndex];
  const pourInstruction = document.getElementById('pour-instruction');
  
  // Add pulsing animation
  pourInstruction.classList.add('pour-active');
  
  // Update the target amount (cumulative)
  document.getElementById('pour-target').textContent = `${interval.cumulativeWater.toFixed(0)}g`;
  document.getElementById('interval-info').textContent = 
    `Interval ${interval.intervalNumber} of ${intervals.length}`;

  console.log(`Pour target: ${interval.cumulativeWater.toFixed(0)}g (Interval ${interval.intervalNumber})`);
}

function updatePourInstruction(intervalIndex) {
    const intervals = appState.currentInstructions.getAllIntervals();

    if (intervalIndex >= intervals.length) {
        return;
    }

    const interval = intervals[intervalIndex];

    document.getElementById('pour-instruction').innerHTML = `
    <p style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
      Interval ${interval.intervalNumber} of ${intervals.length}
    </p>
    <p style="font-size: 20px;">
      ${interval.instruction}
    </p>
  `;

    console.log(`Pour instruction: ${interval.instruction}`);
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Coffee Calculator initialized');

    updateRecipeDisplay();

    // Set up recipe selection buttons
    document.querySelectorAll('.recipe-card').forEach(button => {
        button.addEventListener('click', (e) => {
            const recipeName = e.target.dataset.recipe;
            selectRecipe(recipeName);
        });
    });

    // Set up back buttons  
    document.getElementById('brew-back-btn').addEventListener('click', () => {
        popView();
    });

    // Set up coffee amount slider (now works in ounces)
    document.getElementById('coffee-slider').addEventListener('input', (e) => {
        const ounces = parseFloat(e.target.value);
        const grams = convertOuncesToGrams(ounces);
        appState.recipeSettings.coffeeAmount = grams;
        document.getElementById('coffee-amount-display').textContent = `${ounces.toFixed(0)} oz`;
        updateRecipeDisplay();
    });

    // Set up iced toggle
    document.getElementById('iced-toggle').addEventListener('change', (e) => {
        appState.recipeSettings.isIced = e.target.checked;
        updateRecipeDisplay();
    });

    // Set up "Start Brewing" button
    document.getElementById('start-brew-btn').addEventListener('click', () => {
        startBrewView();
    });

    // Replace the placeholder brew control handlers with these:

    // Start/Pause button
    document.getElementById('start-pause-btn').addEventListener('click', () => {
        if (!appState.brewSession.isActive) {
            // Start brewing
            startBrew();
        } else if (appState.brewSession.isPaused) {
            // Resume brewing
            resumeBrew();
        } else {
            // Pause brewing
            pauseBrew();
        }
    });

    // Stop button
    document.getElementById('stop-btn').addEventListener('click', () => {
        stopBrew();
    });
});

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}