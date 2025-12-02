// Converter.js
// All JavaScript logic from Converter.html

// ==========================================
// APPLICATION STATE AND CONFIGURATION
// ==========================================

const CONFIG = {
    API_URL: 'https://api.exchangerate-api.com/v4/latest/',
    MAX_AMOUNT: 1000000000,
    MIN_AMOUNT: 0.01,
    CACHE_DURATION: 3600000, // 1 hour in milliseconds
    MAX_HISTORY_ITEMS: 5
};

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
    AUD: '$', CAD: '$', CHF: 'Fr', CNY: '¥', MXN: '$'
};

// Application state
let exchangeRatesCache = {};
let conversionHistory = [];

// ==========================================
// DOM ELEMENTS
// ==========================================

const elements = {
    amount: document.getElementById('amount'),
    fromCurrency: document.getElementById('fromCurrency'),
    toCurrency: document.getElementById('toCurrency'),
    swapBtn: document.getElementById('swapBtn'),
    convertBtn: document.getElementById('convertBtn'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    errorAlert: document.getElementById('errorAlert'),
    errorMessage: document.getElementById('errorMessage'),
    resultSection: document.getElementById('resultSection'),
    originalAmount: document.getElementById('originalAmount'),
    convertedAmount: document.getElementById('convertedAmount'),
    exchangeRate: document.getElementById('exchangeRate'),
    timestamp: document.getElementById('timestamp'),
    historySection: document.getElementById('historySection'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn')
};

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    loadFromLocalStorage();
    setupEventListeners();
    displayHistory();
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    elements.convertBtn.addEventListener('click', handleConvert);
    elements.swapBtn.addEventListener('click', handleSwap);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    // Allow Enter key to trigger conversion
    elements.amount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConvert();
    });
    // Real-time validation for amount input
    elements.amount.addEventListener('input', validateAmount);
    // Save selected currencies to localStorage
    elements.fromCurrency.addEventListener('change', saveToLocalStorage);
    elements.toCurrency.addEventListener('change', saveToLocalStorage);
}

// ==========================================
// CORE FUNCTIONALITY
// ==========================================

async function handleConvert() {
    // Hide previous results and errors
    hideError();
    hideResult();
    // Validate input
    const amount = parseFloat(elements.amount.value);
    if (!validateInput(amount)) return;
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    // Check if converting same currency
    if (fromCurrency === toCurrency) {
        showError('Please select different currencies to convert.');
        return;
    }
    try {
        // Show loading state
        showLoading();
        // Fetch exchange rates
        const rates = await getExchangeRates(fromCurrency);
        // Calculate conversion
        const rate = rates[toCurrency];
        const convertedValue = (amount * rate).toFixed(2);
        // Display results
        displayResult(amount, fromCurrency, convertedValue, toCurrency, rate);
        // Save to history
        saveToHistory(amount, fromCurrency, convertedValue, toCurrency, rate);
    } catch (error) {
        showError(error.message || 'Conversion failed. Please check your network or try again.');
    } finally {
        hideLoading();
    }
}

async function getExchangeRates(baseCurrency) {
    const cacheKey = baseCurrency;
    const now = Date.now();
    // Check if we have valid cached data
    if (exchangeRatesCache[cacheKey] && 
        (now - exchangeRatesCache[cacheKey].timestamp) < CONFIG.CACHE_DURATION) {
        return exchangeRatesCache[cacheKey].rates;
    }
    // Fetch fresh data from API
    try {
        const response = await fetch(`${CONFIG.API_URL}${baseCurrency}`);
        if (!response.ok) {
            throw new Error('Failed to fetch exchange rates');
        }
        const data = await response.json();
        // Cache the results
        exchangeRatesCache[cacheKey] = {
            rates: data.rates,
            timestamp: now
        };
        return data.rates;
    } catch (error) {
        throw new Error('Unable to fetch exchange rates. Please check your internet connection.');
    }
}

function handleSwap() {
    const fromValue = elements.fromCurrency.value;
    const toValue = elements.toCurrency.value;
    elements.fromCurrency.value = toValue;
    elements.toCurrency.value = fromValue;
    saveToLocalStorage();
    // If there's a result showing, recalculate
    if (elements.resultSection.classList.contains('show')) {
        handleConvert();
    }
}

// ==========================================
// VALIDATION
// ==========================================

function validateAmount() {
    const amount = parseFloat(elements.amount.value);
    if (elements.amount.value === '') return;
    if (isNaN(amount) || amount < 0) {
        elements.amount.classList.add('is-invalid');
    } else {
        elements.amount.classList.remove('is-invalid');
    }
}

function validateInput(amount) {
    if (!elements.amount.value || elements.amount.value.trim() === '') {
        showError('Please enter an amount to convert.');
        return false;
    }
    if (isNaN(amount)) {
        showError('Please enter a valid number.');
        return false;
    }
    if (amount < CONFIG.MIN_AMOUNT) {
        showError(`Amount must be at least ${CONFIG.MIN_AMOUNT}.`);
        return false;
    }
    if (amount > CONFIG.MAX_AMOUNT) {
        showError(`Amount cannot exceed ${CONFIG.MAX_AMOUNT.toLocaleString()}.`);
        return false;
    }
    return true;
}

// ==========================================
// UI DISPLAY FUNCTIONS
// ==========================================

function displayResult(amount, fromCurrency, convertedValue, toCurrency, rate) {
    const fromSymbol = CURRENCY_SYMBOLS[fromCurrency];
    const toSymbol = CURRENCY_SYMBOLS[toCurrency];
    elements.originalAmount.textContent = 
        `${parseFloat(amount).toFixed(2)} ${fromCurrency}`;
    elements.convertedAmount.textContent = 
        `${parseFloat(convertedValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${toCurrency}`;
    elements.exchangeRate.textContent = 
        `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
    const now = new Date();
    elements.timestamp.textContent = 
        `Rate as of ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    showResult();
}

function showResult() {
    elements.resultSection.classList.add('show');
}

function hideResult() {
    elements.resultSection.classList.remove('show');
}

function showLoading() {
    elements.convertBtn.disabled = true;
    elements.loadingSpinner.classList.add('show');
}

function hideLoading() {
    elements.convertBtn.disabled = false;
    elements.loadingSpinner.classList.remove('show');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorAlert.classList.remove('d-none');
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    elements.errorAlert.classList.add('d-none');
}

// ==========================================
// HISTORY MANAGEMENT
// ==========================================

function saveToHistory(amount, fromCurrency, convertedValue, toCurrency, rate) {
    const historyItem = {
        amount,
        fromCurrency,
        convertedValue,
        toCurrency,
        rate,
        timestamp: new Date().toISOString()
    };
    // Add to beginning of array
    conversionHistory.unshift(historyItem);
    // Keep only last 5 items
    if (conversionHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
        conversionHistory = conversionHistory.slice(0, CONFIG.MAX_HISTORY_ITEMS);
    }
    // Save to localStorage
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
    // Update display
    displayHistory();
}

function displayHistory() {
    if (conversionHistory.length === 0) {
        elements.historySection.classList.remove('show');
        return;
    }
    elements.historySection.classList.add('show');
    elements.historyList.innerHTML = '';
    conversionHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = 
            `${parseFloat(item.amount).toFixed(2)} ${item.fromCurrency} → ${parseFloat(item.convertedValue).toFixed(2)} ${item.toCurrency}`;
        elements.historyList.appendChild(historyItem);
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all conversion history?')) {
        conversionHistory = [];
        localStorage.removeItem('conversionHistory');
        displayHistory();
    }
}

// ==========================================
// LOCAL STORAGE
// ==========================================

function saveToLocalStorage() {
    localStorage.setItem('lastFromCurrency', elements.fromCurrency.value);
    localStorage.setItem('lastToCurrency', elements.toCurrency.value);
}

function loadFromLocalStorage() {
    // Load last used currencies
    const lastFrom = localStorage.getItem('lastFromCurrency');
    const lastTo = localStorage.getItem('lastToCurrency');
    if (lastFrom) elements.fromCurrency.value = lastFrom;
    if (lastTo) elements.toCurrency.value = lastTo;
    // Load conversion history
    const storedHistory = localStorage.getItem('conversionHistory');
    if (storedHistory) {
        try {
            conversionHistory = JSON.parse(storedHistory);
        } catch (e) {
            conversionHistory = [];
        }
    }
}

// ==========================================
// START APPLICATION
// ==========================================

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
