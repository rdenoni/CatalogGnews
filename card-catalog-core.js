class CardCatalog {
    constructor() {
        this.cards = []; // Inicializa vazio; dados serão carregados do IndexedDB
        this.initializeElements();
        this.initializeEventListeners();
        this.renderCards();
        this.updateCardCounts();
        this.updateLastUpdated();
    }

    initializeElements() {
        this.cardsContainer = document.getElementById('cards-container');
        this.cardModal = document.getElementById('card-modal');
        this.cardForm = document.getElementById('card-form');
        this.imageModal = document.getElementById('image-modal');
        this.imageModalContent = document.getElementById('image-modal-content');
        this.detailsModal = document.getElementById('details-modal');
        this.deleteModal = document.getElementById('delete-modal');
        this.helpModal = document.getElementById('help-modal');
        this.searchInput = document.getElementById('search-input');
        this.tagFilter = document.getElementById('tag-filter');
        this.sortOrder = document.getElementById('sort-order');
        this.totalCards = document.getElementById('total-cards');
        this.filteredCards = document.getElementById('filtered-cards');
        this.importInput = document.getElementById('import-input');
        this.clearSearch = document.getElementById('clear-search');
    }

    showToast(type, message) {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
            ${message}
        `;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    escapeHTML(str) {
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[match]);
    }

    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            localStorage.setItem('darkMode', isDark);
        }
        const darkModeToggle = document.querySelector('.dark-mode-toggle');
        darkModeToggle.textContent = isDark ? 'dark_mode' : 'light_mode';
        darkModeToggle.classList.toggle('text-gray-900', isDark);
    }

    isValidUrl(url, type = '') {
        try {
            new URL(url);
            if (type === 'youtube') {
                return url.includes('youtube.com') || url.includes('youtu.be');
            }
            return true;
        } catch {
            return false;
        }
    }
}

// Export the class for use in other files
window.CardCatalog = CardCatalog;