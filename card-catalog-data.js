class CardCatalogData extends CardCatalogUI {
    constructor() {
        super();
        this.cards = [];
        this.isEventListenersInitialized = false;
        this.lastDuplicateTime = 0;
        this.lastSaveTime = 0;
        this.db = null;
        this.initializeData();
    }

    async initializeData() {
        try {
            this.db = await this.openDatabase();
            await this.migrateFromLocalStorage();
            this.cards = await this.loadCardsFromDB();

            if (this.cards.length === 0 && window.cardData) {
                // Simula importação com dados do data.js
                const blob = new Blob([JSON.stringify(cardData)], { type: 'application/json' });
                const file = new File([blob], 'data.json', { type: 'application/json' });
                await this.importCards({ target: { files: [file] } });
            }

            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();

            if (this.cards.length === 0) {
                this.showToast('warning', 'Nenhum cartão carregado.');
            }
        } catch (err) {
            console.error('Erro ao inicializar dados:', err);
            this.showToast('error', 'Erro ao carregar cartões.');
            this.cards = [];
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('cardCatalog', 3);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cards')) {
                    db.createObjectStore('cards', { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(new Error(`Erro ao abrir o armazenamento: ${event.target.error?.message}`));
        });
    }

    async migrateFromLocalStorage() {
        if (!localStorage.getItem('cards')) return;
        try {
            const parsedCards = JSON.parse(localStorage.getItem('cards'));
            if (!Array.isArray(parsedCards)) return;

            const validCards = parsedCards.filter(card => card.id && card.name && card.tag);
            const transaction = this.db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');
            for (const card of validCards) store.put(card);

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    localStorage.removeItem('cards');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (err) {
            console.error('Erro ao migrar dados do localStorage:', err);
            this.showToast('error', 'Erro ao migrar dados.');
        }
    }

    loadCardsFromDB() {
        return new Promise((resolve, reject) => {
            if (!this.db) reject(new Error('Banco de dados não inicializado.'));
            const transaction = this.db.transaction(['cards'], 'readonly');
            const store = transaction.objectStore('cards');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    initializeEventListeners() {
        if (this.isEventListenersInitialized) return;
        this.isEventListenersInitialized = true;
        this.cardForm.addEventListener('submit', (e) => this.saveCard(e));

        this.searchInput.addEventListener('input', () => this.filterCards());
        this.clearSearch.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearSearch.classList.add('hidden');
            this.filterCards();
        });

        this.tagFilter.addEventListener('change', () => this.filterCards());
        this.sortOrder.addEventListener('change', () => this.filterCards());

        const selectImageBtn = document.getElementById('select-image-btn');
        selectImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const imageInput = document.getElementById('card-image-input');
            imageInput.value = '';
            imageInput.click();
        });

        document.getElementById('card-image-input').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('remove-image-btn').addEventListener('click', () => this.removeImage());
        document.getElementById('card-description').addEventListener('input', (e) => {
            const counter = document.getElementById('card-description-counter');
            counter.textContent = `${e.target.value.length}/200 caracteres`;
        });

        this.importInput.addEventListener('change', (e) => this.importCards(e));

        if (!this.cardsContainer) {
            console.error('cardsContainer não encontrado no DOM.');
            this.showToast('error', 'Erro interno: contêiner de cartões não encontrado.');
            return;
        }

        this.cardsContainer.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');
            const idElement = e.target.closest('[data-id]');
            const action = actionElement?.dataset.action;
            const id = idElement?.dataset.id;
            const image = e.target.closest('[data-image]')?.dataset.image;
            const access = e.target.closest('[data-access]')?.dataset.access;

            if (action === 'open-details' && id) {
                e.stopPropagation();
                this.openDetailsModal(id);
            } else if (action === 'edit-card' && id) {
                e.stopPropagation();
                this.openCardModal(id);
            } else if (action === 'copy-access' && access) {
                e.stopPropagation();
                navigator.clipboard.writeText(access);
                this.showToast('success', 'Caminho copiado!');
            } else if (action === 'duplicate-card' && id) {
                e.stopPropagation();
                this.duplicateCard(id);
            } else if (action === 'delete-card' && id) {
                e.stopPropagation();
                this.openDeleteModal(id);
            } else if (action === 'open-image' && image) {
                e.stopPropagation();
                this.openImageModal(image);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openCardModal();
            }
            if (e.key === 'Escape') {
                if (this.cardModal.classList.contains('show')) this.closeModal('card');
                else if (this.detailsModal.classList.contains('show')) this.closeModal('details');
                else if (this.deleteModal.classList.contains('show')) this.closeModal('delete');
                else if (this.helpModal.classList.contains('show')) this.closeModal('help');
                else if (this.imageModal.classList.contains('show')) this.closeModal('image');
                else if (this.exportModal.classList.contains('show')) this.closeModal('export');
            }
            if ((e.ctrlKey && e.key === 's') || e.key === 'Enter') {
                if (this.cardModal.classList.contains('show')) {
                    e.preventDefault();
                    const now = Date.now();
                    if (this.lastSaveTime && now - this.lastSaveTime < 500) return;
                    this.cardForm.dispatchEvent(new Event('submit'));
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
                const modalType = e.target.id.split('-')[0];
                this.closeModal(modalType);
            }
        });
    }

    generateCardCode(tag) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        let code = `${hours}${minutes}`;
        let fullCode = `${tag}${code}`;

        let counter = 0;
        while (this.cards.some(card => card.code === fullCode)) {
            code = `${hours}${minutes}${Math.floor(Math.random() * 10)}`;
            fullCode = `${tag}${code}`;
            counter++;
            if (counter > 10) break;
        }

        return fullCode;
    }

    async saveCard(e) {
        e.preventDefault();
        const saveButton = document.getElementById('save-card-btn');
        saveButton.disabled = true;

        const now = Date.now();
        if (this.lastSaveTime && now - this.lastSaveTime < 500) {
            saveButton.disabled = false;
            return;
        }
        this.lastSaveTime = now;

        const name = document.getElementById('card-name').value.trim().toUpperCase();
        const tag = document.getElementById('card-tag').value || 'MKT';
        const youtube = document.getElementById('card-youtube').value.trim();
        const access = document.getElementById('card-access').value.trim();
        const description = document.getElementById('card-description').value.trim();
        const imageInput = document.getElementById('card-image-input');
        const cardId = document.getElementById('card-id').value;

        if (!name) {
            this.showToast('error', 'O nome do cartão é obrigatório.');
            document.getElementById('card-name').classList.add('error');
            document.getElementById('card-name-error').classList.remove('hidden');
            saveButton.disabled = false;
            return;
        }
        if (youtube && !this.isValidUrl(youtube, 'youtube')) {
            this.showToast('error', 'URL do YouTube inválida.');
            document.getElementById('card-youtube').classList.add('error');
            document.getElementById('card-youtube-error').classList.remove('hidden');
            saveButton.disabled = false;
            return;
        }
        if (access && !this.isValidUrl(access)) {
            this.showToast('error', 'URL de acesso inválida.');
            document.getElementById('card-access').classList.add('error');
            document.getElementById('card-access-error').classList.remove('hidden');
            saveButton.disabled = false;
            return;
        }

        const card = {
            id: cardId || Date.now().toString(),
            name,
            tag,
            code: this.generateCardCode(tag),
            youtube,
            access,
            description,
            created: cardId ? this.cards.find(c => c.id === cardId)?.created || new Date().toISOString() : new Date().toISOString(),
            lastEdited: new Date().toISOString(),
            image: imageInput.dataset.url || ''
        };

        try {
            if (!this.db) throw new Error('Banco de dados não inicializado.');
            const transaction = this.db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');

            if (cardId) {
                const index = this.cards.findIndex(c => c.id === cardId);
                if (index !== -1) {
                    this.cards[index] = card;
                    store.put(card);
                } else {
                    console.warn('ID do cartão não encontrado:', cardId);
                    this.showToast('error', 'Erro ao atualizar cartão.');
                    saveButton.disabled = false;
                    return;
                }
            } else {
                this.cards.push(card);
                store.add(card);
            }

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.closeModal('card');
            this.showToast('success', cardId ? 'Cartão atualizado!' : 'Cartão adicionado!');
        } catch (err) {
            console.error('Erro ao salvar no IndexedDB:', err);
            this.showToast('error', `Erro ao salvar: ${err.message}`);
        } finally {
            saveButton.disabled = false;
        }
    }

    async clearAllCards() {
        if (!confirm('Tem certeza que deseja limpar todos os cartões?')) return;

        try {
            if (!this.db) throw new Error('Banco de dados não inicializado.');
            const transaction = this.db.transaction(['cards'], 'readwrite');
            transaction.objectStore('cards').clear();

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            this.cards = [];
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Todos os cartões limpos!');
        } catch (err) {
            console.error('Erro ao limpar IndexedDB:', err);
            this.showToast('error', `Erro ao limpar: ${err.message}`);
        }
    }

    async deleteCard(cardId) {
        const initialLength = this.cards.length;
        this.cards = this.cards.filter(c => c.id !== String(cardId));

        if (this.cards.length === initialLength) {
            this.showToast('error', 'Erro ao excluir cartão: ID não encontrado.');
            return;
        }

        try {
            if (!this.db) throw new Error('Banco de dados não inicializado.');
            const transaction = this.db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');
            store.delete(String(cardId));

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Cartão excluído!');
        } catch (err) {
            console.error('Erro ao excluir do IndexedDB:', err);
            this.showToast('error', `Erro ao excluir: ${err.message}`);
        }
    }

    async duplicateCard(cardId) {
        const now = Date.now();
        if (now - this.lastDuplicateTime < 500) return;
        this.lastDuplicateTime = now;

        const card = this.cards.find(c => c.id === String(cardId));
        if (!card) {
            this.showToast('error', 'Erro ao duplicar cartão: ID não encontrado.');
            return;
        }

        const newCard = {
            ...card,
            id: Date.now().toString(),
            code: this.generateCardCode(card.tag),
            created: new Date().toISOString(),
            lastEdited: new Date().toISOString()
        };

        this.cards.push(newCard);

        try {
            if (!this.db) throw new Error('Banco de dados não inicializado.');
            const transaction = this.db.transaction(['cards'], 'readwrite');
            const store = transaction.objectStore('cards');
            store.add(newCard);

            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });

            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Cartão duplicado!');
            this.closeModal('details');
        } catch (err) {
            console.error('Erro ao salvar no IndexedDB:', err);
            this.showToast('error', `Erro ao salvar: ${err.message}`);
        }
    }

    removeImage() {
        document.getElementById('card-image-input').value = '';
        document.getElementById('card-image-input').dataset.url = '';
        document.getElementById('card-image-preview').classList.add('hidden');
        document.getElementById('card-image-path').textContent = '';
        document.getElementById('remove-image-btn').classList.add('hidden');
    }

    openExportModal() {
        this.exportModal = document.getElementById('export-modal');
        this.exportModal.classList.add('show');
    }

    async exportCards(mode = 'complete') {
        if (!Array.isArray(this.cards) || this.cards.length === 0) {
            this.showToast('error', 'Nenhum cartão para exportar.');
            return;
        }
        try {
            if (mode === 'complete') {
                const dataStr = JSON.stringify(this.cards, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cards_export_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('success', 'Cartões exportados!');
            } else if (mode === 'separate') {
                this.cards.forEach(card => {
                    const sanitizedName = card.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
                    const fileName = `${card.tag}_${card.id}_${sanitizedName}.json`;
                    const dataStr = JSON.stringify(card, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                });
                this.showToast('success', `${this.cards.length} cartão(ões) exportado(s)!`);
            } else {
                throw new Error('Modo de exportação inválido.');
            }
            this.closeModal('export');
        } catch (err) {
            console.error('Erro ao exportar cartões:', err);
            this.showToast('error', `Erro ao exportar: ${err.message}`);
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                document.getElementById('card-image-preview').src = dataUrl;
                document.getElementById('card-image-preview').classList.remove('hidden');
                document.getElementById('card-image-path').textContent = file.name;
                e.target.dataset.url = dataUrl;
                document.getElementById('remove-image-btn').classList.remove('hidden');
            };
            reader.onerror = () => {
                console.error('Erro ao carregar imagem:', file.name);
                this.showToast('error', 'Erro ao carregar a imagem.');
            };
            reader.readAsDataURL(file);
        }
    }

    async importCards(e) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            this.showToast('error', 'Nenhum arquivo selecionado.');
            return;
        }

        if (!this.db) {
            console.error('Banco de dados IndexedDB não inicializado.');
            this.showToast('error', 'Erro: Banco de dados não inicializado.');
            e.target.value = '';
            return;
        }

        let validCardsCount = 0;
        const totalFiles = files.length;

        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsedData = JSON.parse(reader.result);
                        let importedCards = parsedData;

                        if (!Array.isArray(parsedData)) {
                            if (parsedData.cards && Array.isArray(parsedData.cards)) {
                                importedCards = parsedData.cards;
                            } else {
                                importedCards = [parsedData];
                            }
                        }

                        if (!Array.isArray(importedCards)) {
                            throw new Error('Formato inválido: o arquivo deve conter um cartão ou array de cartões.');
                        }

                        importedCards.forEach(card => {
                            if (!card.id || !card.name || !card.tag) {
                                console.log(`Cartão inválido ignorado em ${file.name}:`, card);
                                return;
                            }

                            if (!card.code) card.code = this.generateCardCode(card.tag);
                            card.created = card.created || new Date().toISOString();
                            card.lastEdited = new Date().toISOString();

                            const existing = this.cards.find(c => c.id === card.id);
                            if (existing) {
                                card.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                                card.code = this.generateCardCode(card.tag);
                            }

                            this.cards.push(card);
                            validCardsCount++;
                        });

                        resolve(importedCards);
                    } catch (err) {
                        console.error(`Erro ao processar ${file.name}:`, err.message);
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
                reader.readAsText(file);
            });
        };

        try {
            const results = await Promise.allSettled(Array.from(files).map(file => processFile(file)));
            const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);

            if (validCardsCount > 0) {
                const transaction = this.db.transaction(['cards'], 'readwrite');
                const store = transaction.objectStore('cards');
                this.cards.forEach(card => store.put(card));

                await new Promise((resolve, reject) => {
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                });

                this.renderCards();
                this.updateCardCounts();
                this.updateLastUpdated();
                this.showToast('success', `${validCardsCount} cartão(ões) importado(s)!`);
            } else {
                this.showToast('error', 'Nenhum cartão válido encontrado.');
            }

            if (errors.length > 0) {
                errors.forEach(error => this.showToast('error', `Erro ao importar: ${error}`));
            }
        } catch (err) {
            console.error('Erro geral na importação:', err);
            this.showToast('error', `Erro inesperado: ${err.message}`);
        }

        e.target.value = '';
    }
}

const cardCatalog = new CardCatalogData();