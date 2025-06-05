class CardCatalogData extends CardCatalogUI {
    constructor() {
        super();
        this.cards = [];
        this.isEventListenersInitialized = false;
        this.lastDuplicateTime = 0;
        this.lastSaveTime = 0;
        this.lastUploadTime = 0;
        this.uploadTimeout = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeData());
        } else {
            this.initializeData();
        }
    }

    debouncedUploadToGitHub() {
        const now = Date.now();
        if (typeof window.AppConfig === 'undefined' || typeof window.AppConfig.GITHUB_TOKEN === 'undefined' || window.AppConfig.GITHUB_TOKEN === '') {
            return;
        }

        clearTimeout(this.uploadTimeout);
        this.uploadTimeout = setTimeout(async () => {
            await this.uploadToGitHub();
            this.lastUploadTime = Date.now();
        }, 1500);
    }

    clearLocalStorage() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('cards');
        }
    }

    async initializeData() {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/rdenoni/CatalogGnews/main/database.json?_=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status} ao carregar database.json: ${response.statusText}`);
            }
            const jsonData = await response.json();
            if (Array.isArray(jsonData)) {
                this.cards = jsonData;
            } else if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.cards)) {
                this.cards = jsonData.cards;
            } else {
                console.warn('Formato de database.json inesperado. Iniciando com lista vazia.');
                this.cards = [];
            }
        } catch (err) {
            console.error('Erro ao inicializar dados de database.json:', err);
            this.showToast('error', 'Falha ao carregar cartões do servidor. Verifique a conexão.');
            this.cards = [];
        } finally {
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.observeCardFade();
        }
    }

    observeCardFade() {
        const header = document.querySelector('header');
        if (!header) {
            return;
        }
        const headerHeight = header.offsetHeight;
        const fadeFactor = 4;

        const observerOptions = {
            root: null,
            threshold: Array.from({ length: 21 }, (_, i) => i * 0.05),
            rootMargin: `-${headerHeight}px 0px 0px 0px`
        };

        const intersectionCallback = (entries) => {
            entries.forEach((entry) => {
                const card = entry.target;
                const cardRect = card.getBoundingClientRect();
                const cardTop = cardRect.top;
                const cardHeight = cardRect.height;

                let overlap = 0;
                if (cardTop < headerHeight && cardTop + cardHeight > headerHeight * 0.1) {
                    overlap = Math.min(headerHeight - cardTop, cardHeight);
                }

                let fadePercentage = 0;
                if (overlap > 0 && cardHeight > 0) {
                    fadePercentage = Math.min((overlap / cardHeight) * 100 * fadeFactor, 100);
                }
                card.style.setProperty('--fade-percentage', `${fadePercentage}%`);
            });
        };

        const observer = new IntersectionObserver(intersectionCallback, observerOptions);

        setTimeout(() => {
            const cardsToObserve = this.cardsContainer ? this.cardsContainer.querySelectorAll('.card-preview') : [];
            if (cardsToObserve.length === 0) {
                return;
            }
            cardsToObserve.forEach((card) => observer.observe(card));
        }, 300);
    }

    closeActionMenu(menu) {
        if (menu && menu.classList.contains('action-menu')) {
            menu.classList.add('hidden');
            menu.classList.remove('show');
        }
    }

    initializeEventListeners() {
        if (this.isEventListenersInitialized) {
            return;
        }

        if (!this.cardForm || !this.searchInput || !this.clearSearch || !this.tagFilter || !this.sortOrder || !this.importInput || !this.cardsContainer || !this.fazerPedidoForm) {
            console.error('Um ou mais elementos essenciais da UI não foram encontrados. Listeners não adicionados.');
            this.showToast('error', 'Erro interno: Falha ao carregar componentes da UI.');
            return;
        }

        this.cardForm.addEventListener('submit', (e) => this.saveCard(e));
        this.searchInput.addEventListener('input', () => this.filterCards());
        this.clearSearch.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearSearch.classList.add('hidden');
            this.filterCards();
        });
        this.tagFilter.addEventListener('change', () => this.filterCards());
        this.sortOrder.addEventListener('change', () => this.filterCards());


        const helpBtn = document.querySelector('.animate-help'); // Select the help button
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.openHelpModal());
        } else {
            console.error('Botão de ajuda não encontrado. Listener não adicionado.');
        }

        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.closeModal('delete'));
        }

        // Eventos para o modal Adicionar/Editar Cartão
        const selectImageBtn = document.getElementById('select-image-btn');
        if (selectImageBtn) {
            selectImageBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const imageInput = document.getElementById('card-image-input');
                if (imageInput) { imageInput.value = ''; imageInput.click(); }
            });
        }
        const cardImageInput = document.getElementById('card-image-input');
        if (cardImageInput) {
            cardImageInput.addEventListener('change', (e) => this.handleSingleImageUpload(e, 'card'));
        }
        const removeImageBtn = document.getElementById('remove-image-btn');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => this.removeImagePreview('card'));
        }
        const cardDescription = document.getElementById('card-description');
        if (cardDescription) {
            cardDescription.addEventListener('input', (e) => {
                const counter = document.getElementById('card-description-counter');
                if (counter) counter.textContent = `${e.target.value.length}/200`;
            });
        }

        // Eventos para o NOVO modal Fazer Pedido

        const pedidoSelectAnexosBtn = document.getElementById('pedido-select-anexos-btn');
        if (pedidoSelectAnexosBtn) {
            pedidoSelectAnexosBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const anexoInput = document.getElementById('pedido-anexos-input');
                if (anexoInput) { anexoInput.value = ''; anexoInput.click(); }
            });
        }
        const pedidoAnexosInput = document.getElementById('pedido-anexos-input');
        if (pedidoAnexosInput) {
            pedidoAnexosInput.addEventListener('change', (e) => this.handlePedidoAnexosUpload(e));
        }

        const limparPedidoBtn = document.getElementById('limpar-pedido-btn');
        if (limparPedidoBtn) {
            limparPedidoBtn.addEventListener('click', () => this.clearFazerPedidoForm());
        }
        if (this.fazerPedidoForm) {
            this.fazerPedidoForm.addEventListener('submit', (e) => this.handleFazerPedidoSubmit(e));
        }


        this.importInput.addEventListener('change', (e) => this.importCards(e));

        this.cardsContainer.addEventListener('click', (e) => this.handleCardActions(e));
        document.getElementById('details-modal')?.addEventListener('click', (e) => this.handleCardActions(e));


        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions') && !e.target.closest('.menu-btn')) {
                document.querySelectorAll('.action-menu.show').forEach(menu => {
                    this.closeActionMenu(menu);
                });
            }
        });

        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));

        this.isEventListenersInitialized = true;
    }



    handleGlobalKeyDown(e) {
        const activeModal = document.querySelector('.modal.show');
        const isInputFocused = document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'SELECT';

        if (e.key === 'Escape') {
            e.preventDefault();
            if (activeModal) {
                const modalId = activeModal.id.replace('-modal', '');
                this.closeModal(modalId);
            } else {
                document.querySelectorAll('.action-menu.show').forEach(menu => this.closeActionMenu(menu));
            }
        }

        if (isInputFocused && activeModal) {
            if (activeModal.id === 'card-modal' && e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (e.ctrlKey) {
                    e.preventDefault();
                    this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
            if (activeModal.id === 'fazer-pedido-modal' && e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (e.ctrlKey) {
                    e.preventDefault();
                    this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
        }

        if (!isInputFocused || !activeModal) {
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                if (!activeModal) this.openCardModal();
            }
        }

        if (activeModal && activeModal.id === 'card-modal') {
            if ((e.ctrlKey && e.key.toLowerCase() === 's')) {
                e.preventDefault();
                const now = Date.now();
                if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
                    return;
                }
                this.lastSaveTime = now;
                this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
        if (activeModal && activeModal.id === 'fazer-pedido-modal') {
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const now = Date.now();
                if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
                    return;
                }
                this.lastSaveTime = now;
                this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
    }


    handleGlobalKeyDown(e) {
        const activeModal = document.querySelector('.modal.show');
        const isInputFocused = document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.tagName === 'SELECT';

        if (e.key === 'Escape') {
            e.preventDefault();
            if (activeModal) {
                const modalId = activeModal.id.replace('-modal', '');
                this.closeModal(modalId);
            } else {
                document.querySelectorAll('.action-menu.show').forEach(menu => this.closeActionMenu(menu));
            }
        }

        if (isInputFocused && activeModal) {
            if (activeModal.id === 'card-modal' && e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (e.ctrlKey) {
                    e.preventDefault();
                    this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
            if (activeModal.id === 'fazer-pedido-modal' && e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (e.ctrlKey) {
                    e.preventDefault();
                    this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
                return;
            }
        }

        if (!isInputFocused || !activeModal) {
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                if (!activeModal) this.openCardModal();
            }
        }

        if (activeModal && activeModal.id === 'card-modal') {
            if ((e.ctrlKey && e.key.toLowerCase() === 's')) {
                e.preventDefault();
                const now = Date.now();
                if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
                    return;
                }
                this.lastSaveTime = now;
                this.cardForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
        if (activeModal && activeModal.id === 'fazer-pedido-modal') {
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const now = Date.now();
                if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
                    return;
                }
                this.lastSaveTime = now;
                this.fazerPedidoForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        }
    }

    handleCardActions(e) {
        const targetElement = e.target;
        const actionElement = targetElement.closest('[data-action]');

        const menuBtn = targetElement.closest('.menu-btn');
        if (menuBtn) {
            e.stopPropagation();
            const actualMenu = menuBtn.nextElementSibling;
            if (actualMenu && actualMenu.classList.contains('action-menu')) {
                const isHidden = actualMenu.classList.contains('hidden');
                document.querySelectorAll('.action-menu.show').forEach(otherMenu => {
                    if (otherMenu !== actualMenu) this.closeActionMenu(otherMenu);
                });
                if (isHidden) {
                    actualMenu.classList.remove('hidden');
                    actualMenu.classList.add('show');
                } else {
                    this.closeActionMenu(actualMenu);
                }
            }
            return;
        }

        if (!actionElement) {
            if (!targetElement.closest('.action-menu')) {
                document.querySelectorAll('.action-menu.show').forEach(menu => {
                    this.closeActionMenu(menu);
                });
            }
            return;
        }

        e.stopPropagation();

        const id = actionElement.dataset.id || targetElement.closest('.card-preview')?.dataset.id || this.currentPedidoCardId;
        const action = actionElement.dataset.action;
        const image = actionElement.dataset.image;
        const access = actionElement.dataset.access;

        const menuItem = targetElement.closest('.action-menu-item, .modal-actions button');
        const menu = menuItem?.closest('.action-menu');

        switch (action) {
            case 'open-details': if (id) this.openDetailsModal(id); break;
            case 'edit-card-menu': if (id) { this.openCardModal(id); if (menu) this.closeActionMenu(menu); } break;
            case 'copy-access':
                if (access) {
                    navigator.clipboard.writeText(access).then(() => {
                        this.showToast('success', 'Caminho copiado!');
                    }).catch(err => {
                        this.showToast('error', 'Falha ao copiar.');
                        console.error('Erro ao copiar caminho:', err);
                    });
                }
                break;
            case 'duplicate-card-menu': if (id) { this.duplicateCard(id); if (menu) this.closeActionMenu(menu); } break;
            case 'delete-card-menu': if (id) { this.openDeleteModal(id); if (menu) this.closeActionMenu(menu); } break;
            case 'export-card-menu': if (id) { this.exportSingleCard(id); if (menu) this.closeActionMenu(menu); } break;
            case 'open-image':
                const imageToOpen = actionElement.dataset.image || targetElement.closest('[data-image]')?.dataset.image;
                if (imageToOpen && !imageToOpen.includes('placehold.co')) {
                    this.openImageModal(imageToOpen);
                } else if (id) {
                    this.openDetailsModal(id);
                }
                break;
            case 'copy-card-code': // Ação modificada para copiar somente o código
                if (id) {
                    const card = this.cards.find(c => c.id === id);
                    if (card && card.code) {
                        const codeToCopy = card.code;
                        navigator.clipboard.writeText(codeToCopy).then(() => {
                            this.showToast('success', `Código "${codeToCopy}" copiado!`);
                        }).catch(err => {
                            this.showToast('error', 'Falha ao copiar código.');
                            console.error('Erro ao copiar código:', err);
                        });
                    } else {
                        this.showToast('warning', 'Código não encontrado para este card.');
                    }
                }
                break;
            case 'open-fazer-pedido-modal':
                if (id) this.openFazerPedidoModal(id);
                break;
        }
    }

    generateCardCode(tag) {
        const prefix = String(tag || 'GN').toUpperCase().substring(0, 3);
        const relevantCards = this.cards.filter(card => card.tag === prefix && card.code && card.code.startsWith(prefix));

        let maxNum = 0;
        if (relevantCards.length > 0) {
            relevantCards.forEach(card => {
                const numPartMatch = card.code.substring(prefix.length).match(/\d+/);
                if (numPartMatch) {
                    const numPart = parseInt(numPartMatch[0], 10);
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                }
            });
        }

        let newNumericPart;
        if (maxNum === 0) {
            const now = new Date();
            newNumericPart = parseInt(`${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`, 10);
        } else {
            newNumericPart = maxNum + 1;
        }

        const newCode = `${prefix}${String(newNumericPart).padStart(4, '0')}`;

        if (this.cards.some(card => card.code === newCode)) {
            return `${newCode}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        }
        return newCode;
    }

    async saveCard(e) {
        e.preventDefault();
        const saveButton = document.getElementById('save-card-btn');
        if (saveButton) saveButton.disabled = true;

        const now = Date.now();
        if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
            if (saveButton) saveButton.disabled = false;
            return;
        }
        this.lastSaveTime = now;

        let name = document.getElementById('card-name').value.trim();
        const tempDiv = document.createElement('div');
        tempDiv.textContent = name;
        name = tempDiv.innerHTML.toUpperCase();


        const tag = document.getElementById('card-tag').value;
        const youtube = document.getElementById('card-youtube').value.trim();
        const access = document.getElementById('card-access').value.trim();
        const description = document.getElementById('card-description').value.trim();
        const imageInput = document.getElementById('card-image-input');
        const cardId = document.getElementById('card-id').value;

        document.querySelectorAll('#card-form .error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('#card-form p[id$="-error"]').forEach(el => el.classList.add('hidden'));

        let isValid = true;
        if (!name) {
            document.getElementById('card-name').classList.add('error');
            document.getElementById('card-name-error').classList.remove('hidden');
            isValid = false;
        }
        if (!tag) {
            document.getElementById('card-tag').classList.add('error');
            const tagErrorEl = document.getElementById('card-tag-error');
            if (tagErrorEl) tagErrorEl.classList.remove('hidden');
            isValid = false;
        }
        if (youtube && !this.isValidUrl(youtube, 'youtube')) {
            document.getElementById('card-youtube').classList.add('error');
            document.getElementById('card-youtube-error').classList.remove('hidden');
            isValid = false;
        }
        if (access && !this.isValidUrl(access, 'access_path')) {
            document.getElementById('card-access').classList.add('error');
            document.getElementById('card-access-error').classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) {
            this.showToast('error', 'Corrija os campos marcados.');
            if (saveButton) saveButton.disabled = false;
            return;
        }

        const imageUrl = imageInput.dataset.url || (cardId ? this.cards.find(c => c.id === cardId)?.image : '') || '';

        const cardData = {
            id: cardId || Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            name, tag, youtube, access, description, image: imageUrl,
            lastEdited: new Date().toISOString(),
        };

        try {
            if (cardId) {
                const index = this.cards.findIndex(c => c.id === cardId);
                if (index !== -1) {
                    const existingCard = this.cards[index];
                    cardData.created = existingCard.created;
                    cardData.code = (existingCard.tag !== cardData.tag || !existingCard.code) ? this.generateCardCode(cardData.tag) : existingCard.code;
                    this.cards[index] = { ...existingCard, ...cardData };
                } else { throw new Error('ID do cartão não encontrado para atualização.'); }
            } else {
                cardData.created = new Date().toISOString();
                cardData.code = this.generateCardCode(cardData.tag);
                this.cards.push(cardData);
            }

            this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
            this.closeModal('card');
            this.showToast('success', cardId ? 'Cartão atualizado!' : 'Cartão adicionado!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao salvar cartão:', err);
            this.showToast('error', `Erro ao salvar: ${err.message}`);
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }

    async handleFazerPedidoSubmit(e) {
        e.preventDefault();
        const submitButton = document.getElementById('enviar-pedido-btn');
        const form = e.target;

        if (submitButton) submitButton.disabled = true;

        const now = Date.now();
        if (this.lastSaveTime && now - this.lastSaveTime < 1000) {
            if (submitButton) submitButton.disabled = false;
            return;
        }
        this.lastSaveTime = now;

        const nomeSolicitante = document.getElementById('pedido-nome-solicitante').value.trim();
        const producao = document.getElementById('pedido-producao').value;
        const dataEntrega = document.getElementById('pedido-data-entrega').value;
        const horaEntrega = document.getElementById('pedido-hora-entrega').value;
        const pedidoTexto = document.getElementById('pedido-texto').value.trim();

        document.querySelectorAll('#fazer-pedido-form .error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('#fazer-pedido-form p[id$="-error"]').forEach(el => el.classList.add('hidden'));

        let isValid = true;
        if (!nomeSolicitante) {
            document.getElementById('pedido-nome-solicitante').classList.add('error');
            document.getElementById('pedido-nome-solicitante-error').classList.remove('hidden');
            isValid = false;
        }
        if (!producao) {
            document.getElementById('pedido-producao').classList.add('error');
            document.getElementById('pedido-producao-error').classList.remove('hidden');
            isValid = false;
        }
        if (!dataEntrega) {
            document.getElementById('pedido-data-entrega').classList.add('error');
            document.getElementById('pedido-data-entrega-error').classList.remove('hidden');
            isValid = false;
        }
        if (!horaEntrega) {
            document.getElementById('pedido-hora-entrega').classList.add('error');
            document.getElementById('pedido-hora-entrega-error').classList.remove('hidden');
            isValid = false;
        }
        if (!pedidoTexto) {
            document.getElementById('pedido-texto').classList.add('error');
            document.getElementById('pedido-texto-error').classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) {
            this.showToast('error', 'Corrija os campos marcados no pedido.');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        const formData = new FormData(form);

        fetch(form.action, {
            method: form.method,
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                this.closeModal('fazer-pedido');
                this.clearFazerPedidoForm();
                this.openPedidoSuccessModal(); // Open success modal
            } else {
                response.json().then(data => {
                    if (Object.hasOwn(data, 'errors')) {
                        const errorMessage = data.errors.map(error => error.message).join(", ");
                        this.showToast('error', `Erro ao enviar: ${errorMessage}`);
                        console.error("Erro Formspree (data.errors):", data.errors);
                    } else {
                        this.showToast('error', 'Oops! Houve um problema ao enviar seu pedido (ver console).');
                        console.error("Erro Formspree (resposta não OK, sem data.errors):", data);
                    }
                }).catch((jsonError) => {
                    this.showToast('error', 'Oops! Houve um problema ao enviar seu pedido (resposta inválida do servidor).');
                    console.error("Erro Formspree (resposta não JSON ou outro erro de parse):", jsonError, response);
                });
            }
        }).catch(error => {
            this.showToast('error', 'Oops! Houve um problema de rede ao enviar seu pedido.');
            console.error("Erro de rede ao enviar para Formspree:", error);
        }).finally(() => {
            if (submitButton) submitButton.disabled = false;
        });
    }


    async clearAllCards() {
        if (!confirm('Tem certeza que deseja limpar TODOS os cartões? Esta ação é IRREVERSÍVEL e afetará o arquivo no GitHub.')) {
            return;
        }

        try {
            this.cards = [];
            this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
            this.showToast('success', 'Todos os cartões foram limpos!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao limpar cartões:', err);
            this.showToast('error', `Erro ao limpar: ${err.message}`);
        }
    }

    async deleteCard(cardId) {
        const initialLength = this.cards.length;
        this.cards = this.cards.filter(c => String(c.id) !== String(cardId));

        if (this.cards.length === initialLength) {
            console.warn('ID não encontrado para exclusão:', cardId);
            this.showToast('error', 'Erro ao excluir: ID não encontrado.');
            return;
        }

        try {
            this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
            this.showToast('success', 'Cartão excluído!');
            this.closeModal('details');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro UI após excluir cartão:', err);
            this.showToast('error', `Erro UI pós-exclusão: ${err.message}`);
        }
    }

    async duplicateCard(cardId) {
        const now = Date.now();
        if (now - this.lastDuplicateTime < 1000) {
            return;
        }
        this.lastDuplicateTime = now;

        const originalCard = this.cards.find(c => String(c.id) === String(cardId));
        if (!originalCard) {
            console.warn('Cartão não encontrado para duplicação:', cardId);
            this.showToast('error', 'Erro ao duplicar: Original não encontrado.');
            return;
        }

        const newCard = {
            ...originalCard,
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            name: `${originalCard.name} (CÓPIA)`,
            code: this.generateCardCode(originalCard.tag),
            created: new Date().toISOString(),
            lastEdited: new Date().toISOString()
        };

        this.cards.push(newCard);

        try {
            this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
            this.showToast('success', 'Cartão duplicado!');
            this.closeModal('details');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro UI ao duplicar cartão:', err);
            this.showToast('error', `Erro UI pós-duplicação: ${err.message}`);
        }
    }

    async exportSingleCard(cardId) {
        const card = this.cards.find(c => String(c.id) === String(cardId));
        if (!card) {
            console.warn('Cartão não encontrado para exportação:', cardId);
            this.showToast('error', 'Erro ao exportar: Cartão não encontrado.');
            return;
        }

        try {
            const sanitizedName = (card.name || 'sem_nome').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
            const fileName = `${card.tag}_${card.id}_${sanitizedName}.json`;
            const dataStr = JSON.stringify(card, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });

            this._downloadBlob(blob, fileName);
            this.showToast('success', 'Cartão exportado!');
        } catch (err) {
            console.error('Erro ao exportar cartão:', err);
            this.showToast('error', `Erro ao exportar: ${err.message}`);
        }
    }

    _downloadBlob(blob, fileName) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    }


    async exportCards(mode = 'complete') {
        if (!Array.isArray(this.cards) || this.cards.length === 0) {
            this.showToast('info', 'Nenhum cartão para exportar.');
            return;
        }
        try {
            if (mode === 'complete') {
                const dataStr = JSON.stringify(this.cards, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                const fileName = `GNews_Catalogo_Completo_${new Date().toISOString().split('T')[0]}.json`;
                this._downloadBlob(blob, fileName);
                this.showToast('success', 'Todos os cartões exportados!');

            } else if (mode === 'separate') {
                if (window.showDirectoryPicker) {
                    try {
                        const dirHandle = await window.showDirectoryPicker();
                        for (const card of this.cards) {
                            const sanitizedName = (card.name || 'sem_nome').replace(/[^a-zA-Z0-9\s-_.]/g, '').replace(/\s+/g, '_');
                            const fileName = `${card.tag}_${card.id}_${sanitizedName}.json`;
                            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            const dataStr = JSON.stringify(card, null, 2);
                            await writable.write(dataStr);
                            await writable.close();
                        }
                        this.showToast('success', `${this.cards.length} cartão(ões) exportados para a pasta selecionada!`);
                    } catch (pickerError) {
                        if (pickerError.name === 'AbortError') {
                            this.showToast('info', 'Exportação para pasta cancelada.');
                        } else {
                            console.error('Erro showDirectoryPicker:', pickerError);
                            this.showToast('warning', 'Erro ao salvar em pasta. Tentando downloads individuais.');
                            this.downloadSeparateFilesIndividually();
                        }
                    }
                } else {
                    this.downloadSeparateFilesIndividually();
                }
            } else { throw new Error('Modo de exportação inválido.'); }
            this.closeModal('export');
        } catch (err) {
            console.error('Erro ao exportar cartões:', err);
            this.showToast('error', `Erro ao exportar: ${err.message}`);
        }
    }

    downloadSeparateFilesIndividually() {
        this.showToast('info', `Iniciando download individual de ${this.cards.length} arquivos.`);
        this.cards.forEach((card, index) => {
            setTimeout(() => {
                const sanitizedName = (card.name || 'sem_nome').replace(/[^a-zA-Z0-9\s-_.]/g, '').replace(/\s+/g, '_');
                const fileName = `${card.tag}_${card.id}_${sanitizedName}.json`;
                const dataStr = JSON.stringify(card, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                this._downloadBlob(blob, fileName);
            }, index * 350);
        });
    }


    async batchUpdateCards(updates) {
        if (!Array.isArray(updates)) {
            console.error('batchUpdateCards espera um array.'); return;
        }
        let changesMade = false;
        try {
            updates.forEach(update => {
                if (!update.id || !update.action) {
                    console.warn('Batch update ignorado: ID ou ação ausente.', update); return;
                }
                const cardIndex = this.cards.findIndex(c => c.id === update.id);

                if (update.action === 'edit' && update.data) {
                    if (cardIndex !== -1) {
                        this.cards[cardIndex] = { ...this.cards[cardIndex], ...update.data, lastEdited: new Date().toISOString() };
                        changesMade = true;
                    } else { console.warn(`Batch edit: ID ${update.id} não encontrado.`); }
                } else if (update.action === 'delete') {
                    if (cardIndex !== -1) {
                        this.cards.splice(cardIndex, 1);
                        changesMade = true;
                    } else { console.warn(`Batch delete: ID ${update.id} não encontrado.`); }
                } else if (update.action === 'duplicate') {
                    this.duplicateCard(update.id);
                    changesMade = true;
                }
            });

            if (changesMade) {
                this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
                this.showToast('success', 'Cartões atualizados em lote!');
                if (!updates.every(u => u.action === 'duplicate')) {
                    this.debouncedUploadToGitHub();
                }
            } else { this.showToast('info', 'Nenhuma alteração válida no lote.'); }
        } catch (err) {
            console.error('Erro batch updates:', err);
            this.showToast('error', `Erro atualizações em lote: ${err.message}`);
        }
    }

    async uploadToGitHub() {
        if (typeof window.AppConfig === 'undefined' || !window.AppConfig.GITHUB_TOKEN) {
            return;
        }
        const token = window.AppConfig.GITHUB_TOKEN;
        const repo = 'rdenoni/CatalogGnews';
        const path = 'database.json';
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;

        try {
            let sha;
            try {
                const getFileResponse = await fetch(url, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Cache-Control': 'no-cache' }
                });
                if (getFileResponse.ok) {
                    sha = (await getFileResponse.json()).sha;
                } else if (getFileResponse.status === 404) {
                    console.log('database.json não encontrado. Será criado.');
                } else {
                    throw new Error(`Erro ${getFileResponse.status} ao obter SHA: ${(await getFileResponse.json()).message}`);
                }
            } catch (e) {
                throw new Error(`Falha de rede ao obter SHA: ${e.message}`);
            }

            const dataStr = JSON.stringify(this.cards, null, 2);
            const content = btoa(unescape(encodeURIComponent(dataStr)));

            const body = {
                message: `Atualizar database.json - ${new Date().toLocaleString('pt-BR')}`,
                content: content, branch: 'main'
            };
            if (sha) body.sha = sha;

            const updateResponse = await fetch(url, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (updateResponse.ok) {
                this.showToast('success', 'Dados salvos no GitHub!');
            } else {
                const errorData = await updateResponse.json();
                let detailedError = errorData.message || 'Erro desconhecido do GitHub.';
                if (updateResponse.status === 409 && sha) detailedError = "Conflito de versão (SHA). Outra alteração pode ter ocorrido.";
                else if (updateResponse.status === 401 || updateResponse.status === 403) detailedError = "Token inválido ou sem permissão.";
                throw new Error(`Erro ${updateResponse.status} ao atualizar: ${detailedError}`);
            }
        } catch (err) {
            console.error('Falha no upload para GitHub:', err.message);
            this.showToast('error', `Erro upload GitHub: ${err.message.substring(0, 100)}...`);
        }
    }

    openExportModal() {
        if (this.exportModal) {
            this.exportModal.classList.add('show');
            this.exportModal.classList.remove('hidden');
        } else { this.showToast('error', 'Modal de exportação não encontrado.'); }
    }

    async importCards(e) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            this.showToast('info', 'Nenhum arquivo selecionado.'); return;
        }

        let importedCount = 0;
        let erroredFiles = [];

        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsedData = JSON.parse(reader.result);
                        let cardsFromFile = [];

                        if (Array.isArray(parsedData)) cardsFromFile = parsedData;
                        else if (parsedData && typeof parsedData === 'object' && parsedData.id && parsedData.name && parsedData.tag) cardsFromFile = [parsedData];
                        else throw new Error('Formato JSON inválido.');

                        let validCardsInFile = 0;
                        cardsFromFile.forEach(card => {
                            if (!card.id || !card.name || !card.tag) {
                                console.warn(`Cartão inválido ignorado em ${file.name}`, card); return;
                            }

                            const tempDiv = document.createElement('div');
                            tempDiv.textContent = card.name;
                            card.name = tempDiv.innerHTML.toUpperCase();

                            card.created = card.created || new Date().toISOString();
                            card.lastEdited = new Date().toISOString();
                            card.code = card.code || this.generateCardCode(card.tag);

                            if (this.cards.find(c => c.id === card.id)) {
                                console.warn(`ID ${card.id} já existe. Gerando novo ID.`);
                                card.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
                            }

                            this.cards.push(card);
                            validCardsInFile++;
                        });
                        resolve(validCardsInFile);
                    } catch (err) {
                        reject({ fileName: file.name, error: err.message });
                    }
                };
                reader.onerror = (error) => reject({ fileName: file.name, error: `Erro de leitura.` });
                reader.readAsText(file);
            });
        };

        for (const file of files) {
            try {
                const count = await processFile(file);
                importedCount += count;
            } catch (fileError) { erroredFiles.push(fileError); }
        }

        if (importedCount > 0) {
            this.renderCards(); this.updateCardCounts(); this.updateLastUpdated();
            this.showToast('success', `${importedCount} cartão(ões) importado(s)!`);
            this.debouncedUploadToGitHub();
        } else if (erroredFiles.length === files.length && files.length > 0) {
            this.showToast('error', 'Nenhum cartão válido nos arquivos.');
        }

        erroredFiles.forEach(err => {
            this.showToast('error', `Erro ${err.fileName}: ${err.error.substring(0, 100)}`);
        });
        e.target.value = '';
    }
}

// window.AppConfig é definido em config.js ou diretamente em main.html


document.addEventListener('DOMContentLoaded', () => {
    const cardCatalogInstance = new CardCatalogData();
    window.cardCatalog = cardCatalogInstance;
    cardCatalogInstance.initializeEventListeners();
});