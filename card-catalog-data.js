class CardCatalogData extends CardCatalogUI {
    constructor() {
        super();
        this.cards = [];
        this.isEventListenersInitialized = false;
        this.lastDuplicateTime = 0;
        this.lastSaveTime = 0;
        this.lastUploadTime = 0;
        this.uploadTimeout = null;
        this.initializeData();
    }

    debouncedUploadToGitHub() {
        const now = Date.now();
        if (this.lastUploadTime && now - this.lastUploadTime < 1000) {
            clearTimeout(this.uploadTimeout);
        }
        this.uploadTimeout = setTimeout(async () => {
            await this.uploadToGitHub();
            this.lastUploadTime = now;
        }, 1000);
    }

    clearLocalStorage() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('cards');
            console.log('LocalStorage limpo: cards removidos.');
        }
    }

    async initializeData() {
        console.log('Iniciando carregamento de dados...');
        this.clearLocalStorage();
        try {
            const response = await fetch('https://raw.githubusercontent.com/rdenoni/CatalogGnews/refs/heads/main/database.json');
            if (!response.ok) {
                throw new Error(`Erro ao carregar database.json: ${response.statusText}`);
            }
            this.cards = await response.json();
            console.log('Estado final de this.cards:', this.cards);
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.observeCardFade();
        } catch (err) {
            console.error('Erro ao inicializar dados:', err);
            this.showToast('error', 'Erro ao carregar cartões do arquivo. Iniciando com lista vazia.');
            this.cards = [];
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.observeCardFade();
        }
    }

    observeCardFade() {
        const header = document.querySelector('header');
        if (!header) {
            console.error('Header não encontrado.');
            return;
        }
        const headerHeight = header.offsetHeight;
        const fadeFactor = 4;
        const opacityFactor = 4;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const card = entry.target;
                    const cardRect = card.getBoundingClientRect();
                    const cardTop = cardRect.top;
                    const cardHeight = cardRect.height;
                    let overlap = 0;
                    if (cardTop < headerHeight && cardTop + cardHeight > 0) {
                        overlap = Math.max(0, Math.min(headerHeight, cardTop + cardHeight) - Math.max(0, cardTop));
                    }
                    let fadePercentage = 0;
                    if (overlap > 0) {
                        fadePercentage = Math.min((overlap / cardHeight) * 100 * fadeFactor, 100);
                    }
                    let opacity = 1 - (fadePercentage / 100) * opacityFactor;
                    opacity = Math.max(0, Math.min(opacity, 1));
                    card.style.setProperty('--fade-percentage', `${fadePercentage}%`);
                    card.style.setProperty('--fade-opacity', opacity);
                });
            },
            {
                root: null,
                threshold: Array.from({ length: 11 }, (_, i) => i / 10),
                rootMargin: `-${headerHeight}px 0px 0px 0px`
            }
        );

        setTimeout(() => {
            const cards = document.querySelectorAll('.card-preview');
            if (cards.length === 0) {
                return;
            }
            cards.forEach((card) => observer.observe(card));
        }, 100);
    }

    closeActionMenu(menu) {
        if (menu && menu.classList.contains('action-menu')) {
            menu.classList.add('hidden');
            console.log('Menu de ação fechado.');
        }
    }

    initializeEventListeners() {
        if (this.isEventListenersInitialized) {
            console.log('Event listeners já inicializados. Ignorando.');
            return;
        }
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
            console.log('Botão Selecionar Imagem clicado', {
                timestamp: new Date().toISOString(),
                target: e.target.id,
                isTrusted: e.isTrusted
            });
            const imageInput = document.getElementById('card-image-input');
            imageInput.value = '';
            console.log('Chamando imageInput.click()');
            try {
                imageInput.click();
            } catch (err) {
                console.error('Erro ao chamar imageInput.click():', err.message);
            }
            console.log('imageInput.click() executado');
        });

        document.getElementById('card-image-input').addEventListener('change', (e) => {
            console.log('Evento change disparado no input de imagem', {
                timestamp: new Date().toISOString(),
                files: e.target.files.length,
                isTrusted: e.isTrusted
            });
            this.handleImageUpload(e);
        });

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
            console.log('Clique em cardsContainer, elemento:', e.target);
            const actionElement = e.target.closest('[data-action]');
            const idElement = e.target.closest('[data-id]');
            const action = actionElement?.dataset.action;
            const id = idElement?.dataset.id;
            const image = e.target.closest('[data-image]')?.dataset.image;
            const access = e.target.closest('[data-access]')?.dataset.access;
            const menu = e.target.closest('.action-menu-item')?.parentElement;

            console.log('Ação detectada:', action, 'ID do cartão:', id);

            if (action === 'open-details' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de detalhes para ID:', id);
                this.openDetailsModal(id);
            } else if (action === 'edit-card-menu' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de edição para cartão ID:', id);
                this.openCardModal(id);
                this.closeActionMenu(menu);
            } else if (action === 'copy-access' && access) {
                e.stopPropagation();
                console.log('Copiando acesso:', access);
                navigator.clipboard.writeText(access);
                this.showToast('success', 'Caminho copiado!');
            } else if (action === 'duplicate-card-menu' && id) {
                e.stopPropagation();
                console.log('Duplicando cartão ID:', id);
                this.duplicateCard(id);
                this.closeActionMenu(menu);
            } else if (action === 'delete-card-menu' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de exclusão para ID:', id);
                this.openDeleteModal(id);
                this.closeActionMenu(menu);
            } else if (action === 'export-card-menu' && id) {
                e.stopPropagation();
                console.log('Exportando cartão ID:', id);
                this.exportSingleCard(id);
                this.closeActionMenu(menu);
            } else if (action === 'open-image' && image) {
                e.stopPropagation();
                console.log('Abrindo modal de imagem:', image);
                this.openImageModal(image);
            } else {
                console.log('Nenhuma ação correspondente encontrada para o clique.');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openCardModal();
            }
            if (e.key === 'Escape') {
                if (this.cardModal.classList.contains('show')) {
                    this.closeModal('card');
                } else if (this.detailsModal.classList.contains('show')) {
                    this.closeModal('details');
                } else if (this.deleteModal.classList.contains('show')) {
                    this.closeModal('delete');
                } else if (this.helpModal.classList.contains('show')) {
                    this.closeModal('help');
                } else if (this.imageModal.classList.contains('show')) {
                    this.closeModal('image');
                } else if (this.exportModal.classList.contains('show')) {
                    this.closeModal('export');
                }
            }
            if ((e.ctrlKey && e.key === 's') || e.key === 'Enter') {
                if (this.cardModal.classList.contains('show')) {
                    e.preventDefault();
                    const now = Date.now();
                    if (this.lastSaveTime && now - this.lastSaveTime < 500) {
                        console.log('Ação de salvamento por teclado ignorada devido a debounce.');
                        return;
                    }
                    this.cardForm.dispatchEvent(new Event('submit'));
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                document.querySelectorAll('.action-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });

        this.cardsContainer.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.menu-btn');
            if (menuBtn) {
                e.stopPropagation();
                const menu = menuBtn.nextElementSibling;
                if (menu && menu.classList.contains('action-menu')) {
                    document.querySelectorAll('.action-menu').forEach(otherMenu => {
                        if (otherMenu !== menu) otherMenu.classList.add('hidden');
                    });
                    menu.classList.toggle('hidden');
                }
            }
        });
    }

    generateCardCode(tag) {
        const existingCodes = this.cards
            .filter(card => card.tag === tag && card.code.startsWith(tag))
            .map(card => card.code)
            .sort();

        if (!existingCodes.length) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${tag}${hours}${minutes}`;
        }

        const latestCode = existingCodes[existingCodes.length - 1];
        const numericPart = parseInt(latestCode.replace(tag, ''), 10);
        const newNumericPart = numericPart + 1;
        const newCode = `${tag}${String(newNumericPart).padStart(4, '0')}`;

        let counter = 0;
        let finalCode = newCode;
        while (this.cards.some(card => card.code === finalCode)) {
            finalCode = `${tag}${String(newNumericPart + counter).padStart(4, '0')}`;
            counter++;
            if (counter > 10) break;
        }

        return finalCode;
    }

    async saveCard(e) {
        e.preventDefault();
        const saveButton = document.getElementById('save-card-btn');
        saveButton.disabled = true;

        const now = Date.now();
        if (this.lastSaveTime && now - this.lastSaveTime < 500) {
            console.log('Ação de salvamento ignorada devido a debounce.');
            saveButton.disabled = false;
            return;
        }
        this.lastSaveTime = now;

        let name = document.getElementById('card-name').value.trim().toUpperCase();
        const div = document.createElement('div');
        div.innerHTML = name;
        name = div.textContent || '';

        const tag = document.getElementById('card-tag').value || 'MKT';
        const youtube = document.getElementById('card-youtube').value.trim();
        const access = document.getElementById('card-access').value.trim();
        const description = document.getElementById('card-description').value.trim();
        const imageInput = document.getElementById('card-image-input');
        const cardId = document.getElementById('card-id').value;

        console.log('Salvando cartão:', { name, tag, youtube, access, description, cardId, image: imageInput.dataset.url });

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
            if (cardId) {
                const index = this.cards.findIndex(c => c.id === cardId);
                if (index !== -1) {
                    this.cards[index] = card;
                    console.log('Cartão atualizado no índice:', index, 'Novo código:', card.code);
                } else {
                    console.warn('ID do cartão não encontrado para atualização:', cardId);
                    this.showToast('error', 'Erro ao atualizar cartão: ID não encontrado.');
                    saveButton.disabled = false;
                    return;
                }
            } else {
                this.cards.push(card);
                console.log('Novo cartão adicionado:', card);
            }

            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.closeModal('card');
            this.showToast('success', cardId ? 'Cartão atualizado com sucesso!' : 'Cartão adicionado com sucesso!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao salvar cartão:', err);
            this.showToast('error', 'Erro ao salvar cartão: ' + err.message);
        } finally {
            saveButton.disabled = false;
        }
    }

    async clearAllCards() {
        if (!confirm('Tem certeza que deseja limpar todos os cartões? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            this.cards = [];
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Todos os cartões foram limpos com sucesso!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao limpar cartões:', err);
            this.showToast('error', 'Erro ao limpar cartões: ' + err.message);
        }
    }

    async deleteCard(cardId) {
        console.log('Excluindo cartão com ID:', cardId);
        const initialLength = this.cards.length;
        this.cards = this.cards.filter(c => c.id !== String(cardId));
        console.log('Cartões após exclusão:', this.cards);

        if (this.cards.length === initialLength) {
            console.warn('Nenhum cartão foi excluído; ID não encontrado:', cardId);
            this.showToast('error', 'Erro ao excluir cartão: ID não encontrado.');
            return;
        }

        try {
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Cartão excluído com sucesso!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao excluir cartão:', err);
            this.showToast('error', 'Erro ao excluir cartão: ' + err.message);
        }
    }

    async duplicateCard(cardId) {
        const now = Date.now();
        if (now - this.lastDuplicateTime < 500) {
            console.log('Ação de duplicação ignorada devido a debounce.');
            return;
        }
        this.lastDuplicateTime = now;

        console.log('Duplicando cartão com ID:', cardId);
        const card = this.cards.find(c => c.id === String(cardId));
        if (!card) {
            console.warn('Cartão não encontrado para duplicação:', cardId);
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
        console.log('Cartão duplicado:', newCard);

        try {
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Cartão duplicado com sucesso!');
            this.closeModal('details');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao salvar cartão duplicado:', err);
            this.showToast('error', 'Erro ao salvar cartão duplicado: ' + err.message);
        }
    }

    async exportSingleCard(cardId) {
        console.log('Exportando cartão único com ID:', cardId);
        const card = this.cards.find(c => c.id === String(cardId));
        if (!card) {
            console.warn('Cartão não encontrado para exportação:', cardId);
            this.showToast('error', 'Erro ao exportar cartão: ID não encontrado.');
            return;
        }

        try {
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
            this.showToast('success', 'Cartão exportado com sucesso!');
        } catch (err) {
            console.error('Erro ao exportar cartão:', err);
            this.showToast('error', 'Erro ao exportar cartão: ' + err.message);
        }
    }

    async exportCards(mode = 'complete') {
        if (!Array.isArray(this.cards) || this.cards.length === 0) {
            this.showToast('error', 'Nenhum cartão válido para exportar.');
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
                this.showToast('success', 'Cartões exportados com sucesso!');
            } else if (mode === 'separate') {
                if (!window.showDirectoryPicker) {
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
                    this.showToast('warning', `${this.cards.length} cartão(ões) exportado(s) individualmente. Use um navegador moderno para salvar em uma única pasta.`);
                } else {
                    const dirHandle = await window.showDirectoryPicker();
                    for (const card of this.cards) {
                        const sanitizedName = card.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
                        const fileName = `${card.tag}_${card.id}_${sanitizedName}.json`;
                        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        const dataStr = JSON.stringify(card, null, 2);
                        await writable.write(dataStr);
                        await writable.close();
                    }
                    this.showToast('success', `${this.cards.length} cartão(ões) exportado(s) para a pasta selecionada com sucesso!`);
                }
            } else {
                throw new Error('Modo de exportação inválido.');
            }
            this.closeModal('export');
        } catch (err) {
            console.error('Erro ao exportar cartões:', err);
            this.showToast('error', 'Erro ao exportar cartões: ' + err.message);
        }
    }

    async batchUpdateCards(updates) {
        try {
            updates.forEach(update => {
                const card = this.cards.find(c => c.id === update.id);
                if (!card) {
                    console.warn(`Cartão com ID ${update.id} não encontrado.`);
                    return;
                }
                if (update.action === 'edit') {
                    Object.assign(card, update.data, { lastEdited: new Date().toISOString() });
                } else if (update.action === 'delete') {
                    this.cards = this.cards.filter(c => c.id !== update.id);
                } else if (update.action === 'duplicate') {
                    this.duplicateCard(update.id);
                }
            });
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Cartões atualizados em massa!');
            this.debouncedUploadToGitHub();
        } catch (err) {
            console.error('Erro ao processar atualizações em massa:', err);
            this.showToast('error', 'Erro ao atualizar cartões: ' + err.message);
        }
    }

    async uploadToGitHub() {
        const token = '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'; // Insira seu novo token aqui
        const repo = 'rdenoni/CatalogGnews';
        const path = 'database.json';
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        console.log('Iniciando upload para o GitHub:', { repo, path, timestamp: new Date().toISOString() });

        try {
            const dataStr = JSON.stringify(this.cards, null, 2);
            const content = btoa(unescape(encodeURIComponent(dataStr))); // Codifica em base64, tratando caracteres especiais
            console.log('Dados preparados para upload:', { dataLength: dataStr.length, contentLength: content.length });

            // Obter o SHA atual do arquivo
            console.log('Buscando SHA do arquivo existente...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            console.log('Resposta da requisição GET:', { status: response.status, statusText: response.statusText });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao obter SHA: ${response.status} - ${errorData.message}`);
            }
            const { sha } = await response.json();
            console.log('SHA obtido:', sha);

            // Atualizar o arquivo no GitHub
            console.log('Enviando atualização para o GitHub...');
            const updateResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Atualizar database.json - ${new Date().toISOString()}`,
                    content,
                    sha
                })
            });
            console.log('Resposta da requisição PUT:', { status: updateResponse.status, statusText: updateResponse.statusText });
            if (updateResponse.ok) {
                console.log('Arquivo atualizado com sucesso no GitHub!');
                this.showToast('success', 'Arquivo atualizado no GitHub!');
            } else {
                const errorData = await updateResponse.json();
                throw new Error(`Erro ao atualizar arquivo: ${updateResponse.status} - ${errorData.message}`);
            }
        } catch (err) {
            console.error('Erro ao enviar para o GitHub:', err.message);
            this.showToast('error', `Erro ao atualizar no GitHub: ${err.message}`);
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

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('Iniciando carregamento de imagem:', file.name, 'Tamanho:', file.size, 'Tipo:', file.type);
            const startTime = performance.now();
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                document.getElementById('card-image-preview').src = dataUrl;
                document.getElementById('card-image-preview').classList.remove('hidden');
                document.getElementById('card-image-path').textContent = file.name;
                e.target.dataset.url = dataUrl;
                document.getElementById('remove-image-btn').classList.remove('hidden');
                const endTime = performance.now();
                console.log('Imagem carregada:', file.name, 'Tamanho:', (dataUrl.length * 2 / (1024 * 1024)).toFixed(2), 'MB', 'Tipo:', file.type, 'Tempo:', (endTime - startTime), 'ms');
            };
            reader.onerror = () => {
                console.error('Erro ao carregar imagem:', file.name);
                this.showToast('error', 'Erro ao carregar a imagem. Tente novamente.');
            };
            reader.readAsDataURL(file);
        }
    }

    async importCards(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let validCardsCount = 0;
        let filesProcessed = 0;
        const totalFiles = files.length;

        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        console.log(`Conteúdo do arquivo ${file.name}:`, reader.result);
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
                            throw new Error('Formato inválido: o arquivo deve conter um cartão ou um array de cartões.');
                        }

                        importedCards.forEach(card => {
                            if (!card.id || !card.name || !card.tag) {
                                console.log(`Cartão inválido ignorado no arquivo ${file.name}:`, card);
                                return;
                            }

                            if (!card.code) {
                                card.code = this.generateCardCode(card.tag);
                            }

                            const div = document.createElement('div');
                            div.innerHTML = card.name;
                            card.name = div.textContent || '';

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
                        console.error(`Erro ao processar arquivo ${file.name}:`, err.message);
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error(`Erro ao ler o arquivo ${file.name}`));
                reader.readAsText(file);
            });
        };

        try {
            const results = await Promise.allSettled(Array.from(files).map(file => processFile(file)));
            filesProcessed = totalFiles;
            const errors = results.filter(result => result.status === 'rejected').map(result => result.reason.message);

            if (validCardsCount > 0) {
                this.renderCards();
                this.updateCardCounts();
                this.updateLastUpdated();
                this.showToast('success', `${validCardsCount} cartão(ões) importado(s) com sucesso!`);
                this.debouncedUploadToGitHub();
            } else {
                this.showToast('error', 'Nenhum cartão válido encontrado nos arquivos.');
            }

            if (errors.length > 0) {
                errors.forEach(error => {
                    this.showToast('error', `Erro ao importar um arquivo: ${error}`);
                });
            }
        } catch (err) {
            console.error('Erro geral na importação:', err);
            this.showToast('error', 'Erro inesperado ao importar arquivos: ' + err.message);
        }

        e.target.value = '';
    }
}

const cardCatalog = new CardCatalogData();