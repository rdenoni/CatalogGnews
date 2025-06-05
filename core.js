const STORAGE_KEYS = {
    USER: 'user'
};

class CardCatalog {
    constructor() {
        this.cardsContainer = null; 
        if (window.location.pathname.includes('main')) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.cardsContainer = document.getElementById('cards-container');
                    if (!this.cardsContainer) {
                         console.warn('cardsContainer não encontrado após DOMContentLoaded na página principal.');
                    }
                });
            } else {
                this.cardsContainer = document.getElementById('cards-container');
                if (!this.cardsContainer) {
                     console.warn('cardsContainer não encontrado em CardCatalog constructor na página principal.');
                }
            }
        }

        const user = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USER) : null;
        
        const onMainPage = window.location.pathname.includes('main');
        const onIndexPage = window.location.pathname.includes('index.html') || 
                            window.location.pathname === '/' || 
                            (window.location.pathname.endsWith('/') && !onMainPage) ||
                            (!window.location.pathname.includes('.') && !onMainPage);

        if (!user && onMainPage) {
            console.log('Usuário não autenticado na página principal, redirecionando para index.html');
            window.location.href = 'index.html'; 
            return; 
        }

        if (user && onMainPage) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.applyUserPrivileges(user));
            } else {
                this.applyUserPrivileges(user);
            }
        }
        
        if (onIndexPage) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeLogin());
            } else {
                this.initializeLogin();
            }
        }
    }

    applyUserPrivileges(user) {
        const addCardBtn = document.getElementById('add-btn'); 
        const clearAllBtn = document.getElementById('delete-sweep-btn'); 

        if (!addCardBtn || !clearAllBtn) {
            return;
        }

        addCardBtn.classList.add('hidden');
        clearAllBtn.classList.add('hidden');

        if (user === 'Admin') {
            addCardBtn.classList.remove('hidden');
            clearAllBtn.classList.remove('hidden');
        } else if (user === 'Arte') {
            addCardBtn.classList.remove('hidden');
        } else if (user === 'Editor') {
        }
    }

    initializeLogin() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            return;
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameEl = document.getElementById('username');
            const passwordEl = document.getElementById('password');

            if (!usernameEl || !passwordEl) {
                console.error("Elementos de username ou password não encontrados no formulário de login.");
                alert('Erro interno no formulário de login.'); 
                return;
            }
            const username = usernameEl.value;
            const password = passwordEl.value;

            const validUsers = { Admin: 'admin', Arte: 'arte', Editor: 'editor' };

            if (validUsers[username] && validUsers[username] === password) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEYS.USER, username);
                } else {
                    console.warn('localStorage não está disponível. Login não será persistido.');
                     alert('Seu navegador não suporta armazenamento local. O login não será lembrado.');
                }
                setTimeout(() => {
                    window.location.href = 'main.html'; 
                }, 100); 
            } else {
                console.log('Credenciais inválidas');
                alert('Usuário ou senha inválidos!'); 
            }
        });
    }

    initializeEventListeners() {
    }

    showToast(type, message) {
        if (window.cardCatalog && typeof window.cardCatalog.showToast === 'function' && window.cardCatalog !== this) {
            window.cardCatalog.showToast(type, message);
        } else {
        }
    }

    renderCards() {}
    updateCardCounts() {}
    updateLastUpdated() {}
    filterCards() {}
}

const onMainPageGlobalCheckCore = window.location.pathname.includes('main');
const onIndexPageGlobalCheckCore = window.location.pathname.includes('index.html') || 
                            window.location.pathname === '/' || 
                            (window.location.pathname.endsWith('/') && !onMainPageGlobalCheckCore) ||
                            (!window.location.pathname.includes('.') && !onMainPageGlobalCheckCore);

if (onIndexPageGlobalCheckCore) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.cardCatalogInstance) { 
                window.cardCatalogInstance = new CardCatalog();
            }
        });
    } else {
        if (!window.cardCatalogInstance) {
            window.cardCatalogInstance = new CardCatalog();
        }
    }
}