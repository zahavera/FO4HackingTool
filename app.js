const APP_VERSION = '1.1.0';

class HackingHelper {
    constructor() {
        this.words = [];
        this.guesses = [];
        this.possibleWords = [];
        this.testMode = false;
        this.correctAnswer = null;
        this.wordSets = {
            '4': ['WORK', 'WORD', 'WARD', 'WARM', 'WARN', 'WORN', 'WORM', 'WOOD', 'WOOL', 'WEEK', 'WIND', 'WING', 'WIDE', 'WIRE', 'WINE'],
            '5': ['SAINT', 'PAINT', 'FAINT', 'TAINT', 'QUINT', 'PRINT', 'POINT', 'JOINT', 'GIANT', 'MEANT', 'SPARK', 'SHARP', 'SMART', 'START', 'STACK'],
            '6': ['SEARCH', 'SEASON', 'REASON', 'REMAIN', 'RETAIN', 'DETAIL', 'RETAIL', 'REGAIN', 'RESUME', 'RESULT', 'RANDOM', 'HANDLE', 'SYSTEM', 'SECURE', 'SIGNAL'],
            '7': ['CONTROL', 'CONSOLE', 'CONTEXT', 'CONTAIN', 'CONTACT', 'CONTENT', 'CONTEST', 'CONVERT', 'CONVICT', 'CONDUCT', 'PROGRAM', 'PRESENT', 'PROCESS', 'PRIMARY', 'PROTECT']
        };
        this.originalWordSets = JSON.parse(JSON.stringify(this.wordSets)); // Deep copy for reset
        this.sampleWords = this.wordSets['5']; // Default to 5-letter words
        this.stats = {
            gamesPlayed: 0,
            totalGuesses: 0,
            bestGame: Infinity,
            history: []
        };
        
        // Set version number on load
        document.querySelector('.revision').textContent = `REVISION ${APP_VERSION}`;
        
        this.initialize();
    }

    initialize() {
        // DOM elements
        this.startButton = document.getElementById('startButton');
        this.wordList = document.getElementById('wordList');
        this.validationMessage = document.getElementById('validationMessage');
        this.gameSection = document.querySelector('.game-section');
        this.wordSelect = document.getElementById('wordSelect');
        this.likenessInput = document.getElementById('likeness');
        this.submitGuess = document.getElementById('submitGuess');
        this.guessHistory = document.getElementById('guessHistory');
        this.remainingWords = document.getElementById('remainingWords');
        this.resetButton = document.getElementById('resetButton');
        this.randomTestButton = document.getElementById('randomTestButton');
        this.testModal = document.getElementById('testModal');
        this.answerSelect = document.getElementById('answerSelect');
        this.confirmAnswer = document.getElementById('confirmAnswer');

        this.wordLengthSelect = document.createElement('select');
        this.wordLengthSelect.innerHTML = Object.keys(this.wordSets)
            .map(length => `<option value="${length}">${length} Letters</option>`)
            .join('');
        this.wordLengthSelect.addEventListener('change', () => this.changeWordLength());
        this.randomTestButton.parentNode.insertBefore(this.wordLengthSelect, this.randomTestButton);

        this.strategySelect = document.getElementById('strategySelect');
        this.statistics = document.querySelector('.statistics');
        
        this.loadStats();
        
        // Event listeners
        this.startButton.addEventListener('click', () => this.startGame());
        this.submitGuess.addEventListener('click', () => this.makeGuess());
        this.resetButton.addEventListener('click', () => this.reset());
        this.randomTestButton.addEventListener('click', () => this.startRandomTest());
        this.confirmAnswer.addEventListener('click', () => this.confirmTestAnswer());

        // Add tab functionality
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Set initial tab
        this.switchTab('tool');

        // Add license modal handlers
        this.licenseButton = document.getElementById('licenseButton');
        this.licenseModal = document.getElementById('licenseModal');
        this.closeLicense = document.getElementById('closeLicense');
        
        this.licenseButton.addEventListener('click', () => this.showLicense());
        this.closeLicense.addEventListener('click', () => this.licenseModal.style.display = 'none');

        // Load license text
        const licenseText = `MIT License

Copyright (c) 2024 zahavera

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
        
        document.getElementById('licenseText').textContent = licenseText;

        this.victoryModal = document.getElementById('victoryModal');
        this.closeVictory = document.getElementById('closeVictory');
        this.closeVictory.addEventListener('click', () => {
            this.victoryModal.style.display = 'none';
            this.reset();
        });
        // Add keyboard listener for Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.victoryModal.style.display === 'block') {
                this.victoryModal.style.display = 'none';
            }
        });
    }

    showLicense() {
        this.licenseModal.style.display = 'block';
    }

    validateWords(wordList) {
        const words = wordList.toUpperCase().split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);
        
        if (words.length < 2) {
            throw new Error('Please enter at least 2 words');
        }

        const wordLength = words[0].length;
        const invalidWords = words.filter(w => !w.match(`^[A-Z]{${wordLength}}$`));
        
        if (invalidWords.length > 0) {
            throw new Error(`Invalid words found: ${invalidWords.join(', ')}`);
        }

        return words;
    }

    startGame() {
        try {
            this.words = this.validateWords(this.wordList.value);
            this.possibleWords = [...this.words];
            this.guesses = [];
            this.updateDisplay();
            this.gameSection.style.display = 'block';
            const inputSection = document.querySelector('.input-section');
            if (inputSection) {
                inputSection.style.display = 'none';
            }
        } catch (error) {
            this.validationMessage.textContent = error.message;
        }
    }

    calculateLikeness(word1, word2) {
        let likeness = 0;
        for (let i = 0; i < word1.length; i++) {
            if (word1[i] === word2[i]) likeness++;
        }
        return likeness;
    }

    changeWordLength() {
        const length = this.wordLengthSelect.value;
        // Reset the word set to original state
        this.wordSets[length] = [...this.originalWordSets[length]];
        this.sampleWords = this.wordSets[length];
        if (this.testModal.style.display === 'block') {
            this.startRandomTest();
        }
    }

    startRandomTest() {
        const currentLength = this.wordLengthSelect.value;
        // Get fresh copy of words and shuffle them
        this.sampleWords = [...this.originalWordSets[currentLength]]
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
        
        this.wordList.value = this.sampleWords.join('\n');
        this.testModal.style.display = 'block';
        this.answerSelect.innerHTML = this.sampleWords
            .map(word => `<option value="${word}">${word}</option>`)
            .join('');
    }

    confirmTestAnswer() {
        this.testMode = true;
        this.correctAnswer = this.answerSelect.value;
        this.testModal.style.display = 'none';
        this.startGame();
    }

    makeGuess() {
        const guessedWord = this.wordSelect.value;
        let likeness;
        
        if (this.testMode) {
            likeness = this.calculateLikeness(guessedWord, this.correctAnswer);
            this.likenessInput.value = likeness;
            
            if (guessedWord === this.correctAnswer) {
                // Show victory modal with history
                const historyHTML = this.guesses
                    .map(g => {
                        const letters = g.word.split('').map((letter, index) => {
                            const isMatch = letter === this.correctAnswer[index];
                            return `<div class="letter-box${isMatch ? ' matching-letter' : ''}">${letter}</div>`;
                        }).join('');
                        
                        return `<div class="guess-row">
                            ${letters}
                            <span class="guess-info">Likeness: ${g.likeness}</span>
                        </div>`;
                    })
                    .join('');

                // Add winning guess
                const winningLetters = guessedWord.split('')
                    .map(letter => `<div class="letter-box matching-letter">${letter}</div>`)
                    .join('');

                document.querySelector('.victory-history').innerHTML = 
                    historyHTML + 
                    `<div class="guess-row">
                        ${winningLetters}
                        <span class="guess-info">Victory!</span>
                    </div>`;
                
                document.querySelector('.victory-message').textContent = 
                    `System breached in ${this.guesses.length + 1} ${this.guesses.length === 0 ? 'guess' : 'guesses'}!`;
                
                this.victoryModal.style.display = 'block';
                this.wordSelect.disabled = true;
                this.submitGuess.disabled = true;
                this.updateStats(this.guesses.length + 1);
                return;
            }
        } else {
            likeness = parseInt(this.likenessInput.value);
        }

        if (isNaN(likeness) || likeness < 0 || likeness > guessedWord.length) {
            alert('Please enter a valid likeness value');
            return;
        }

        this.guesses.push({ word: guessedWord, likeness });
        
        // Eliminate impossible words
        this.possibleWords = this.possibleWords.filter(word => {
            if (word === guessedWord) return false;
            return this.calculateLikeness(word, guessedWord) === likeness;
        });

        this.updateDisplay();
    }

    updateDisplay() {
        // Update word select
        this.wordSelect.innerHTML = this.possibleWords
            .map(word => `<option value="${word}">${word}</option>`)
            .join('');

        // Update guess history
        this.guessHistory.innerHTML = this.guesses
            .map(g => `<li><span class="guess-text">${g.word}</span><span class="guess-likeness"> - Likeness: ${g.likeness}</span></li>`)
            .join('');

        // Calculate probabilities and best guess
        const totalRemaining = this.possibleWords.length;
        const { bestWord, maxInformation } = this.calculateBestGuess();
        
        // Update remaining words with probabilities
        this.remainingWords.innerHTML = this.words
            .map(word => {
                const isEliminated = !this.possibleWords.includes(word);
                const probability = isEliminated ? 0 : (1 / totalRemaining * 100).toFixed(1);
                const isBestGuess = word === bestWord && maxInformation > 0;
                
                return `<li class="${isEliminated ? 'eliminated' : ''} ${isBestGuess ? 'best-guess' : ''}">
                    ${word}
                    ${!isEliminated ? `<span class="probability">${probability}%</span>` : ''}
                    ${isBestGuess ? '<span class="best-guess-label">Best Guess</span>' : ''}
                </li>`;
            })
            .join('');
    }

    calculateBestGuess() {
        if (this.possibleWords.length <= 1) return { bestWord: null, maxInformation: 0 };

        // If all remaining words have equal probability, don't suggest a best guess
        if (this.possibleWords.length > 0) {
            const firstLikeness = this.calculateLikeness(this.possibleWords[0], this.possibleWords[1] || this.possibleWords[0]);
            if (this.possibleWords.every(word => 
                this.possibleWords.every(other => 
                    word === other || this.calculateLikeness(word, other) === firstLikeness
                )
            )) {
                return { bestWord: null, maxInformation: 0 };
            }
        }

        // Simplified best guess calculation
        let bestWord = null;
        let maxInformation = 0;

        for (const word of this.possibleWords) {
            const distribution = new Map();
            for (const other of this.possibleWords) {
                if (word === other) continue;
                const likeness = this.calculateLikeness(word, other);
                distribution.set(likeness, (distribution.get(likeness) || 0) + 1);
            }
            
            // More even distribution = better guess
            const evenness = Array.from(distribution.values())
                .reduce((sum, count) => sum - Math.abs(count - distribution.size), 0);

            if (evenness > maxInformation) {
                maxInformation = evenness;
                bestWord = word;
            }
        }

        return { bestWord, maxInformation };
    }

    updateStats(guessCount) {
        this.stats.gamesPlayed++;
        this.stats.totalGuesses += guessCount;
        this.stats.bestGame = Math.min(this.stats.bestGame, guessCount);
        this.stats.history = [...(this.stats.history || []), guessCount].slice(-5);
        
        const avg = (this.stats.totalGuesses / this.stats.gamesPlayed).toFixed(1);
        document.getElementById('avgGuesses').textContent = avg;
        document.getElementById('gamesPlayed').textContent = this.stats.gamesPlayed;
        document.getElementById('bestGame').textContent = this.stats.bestGame;
        document.getElementById('successRate').textContent = 
            ((this.stats.gamesPlayed / (this.stats.gamesPlayed + (this.stats.failures || 0))) * 100).toFixed(0);
        document.getElementById('recentScores').textContent = 
            this.stats.history.join(', ') || '-';
        
        localStorage.setItem('hackingStats', JSON.stringify(this.stats));
    }

    loadStats() {
        const savedStats = localStorage.getItem('hackingStats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
            this.updateStats(0);
        }
    }

    reset() {
        // Clear data
        this.words = [];
        this.guesses = [];
        this.possibleWords = [];
        this.testMode = false;
        this.correctAnswer = null;

        // Reset UI elements
        this.wordList.value = '';
        this.gameSection.style.display = 'none';
        this.validationMessage.textContent = '';
        this.wordSelect.disabled = false;
        this.submitGuess.disabled = false;
        
        // Show input section
        const inputSection = document.querySelector('.input-section');
        if (inputSection) {
            inputSection.style.display = 'block';
            inputSection.classList.remove('hidden');
        }

        // Reset word sets
        this.wordSets = JSON.parse(JSON.stringify(this.originalWordSets));

        // Make sure we're on the tool tab
        this.switchTab('tool');
    }

    switchTab(tabId) {
        const toolTab = document.getElementById('tool-tab');
        const statsTab = document.getElementById('stats-tab');

        if (tabId === 'tool') {
            toolTab.style.display = 'block';
            statsTab.style.display = 'none';
            document.querySelector('[data-tab="tool"]').classList.add('active');
            document.querySelector('[data-tab="stats"]').classList.remove('active');
        } else {
            toolTab.style.display = 'none';
            statsTab.style.display = 'block';
            document.querySelector('[data-tab="tool"]').classList.remove('active');
            document.querySelector('[data-tab="stats"]').classList.add('active');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new HackingHelper();
});
