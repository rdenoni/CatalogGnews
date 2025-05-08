class CardCatalogData extends CardCatalogUI {
    constructor() {
        super();
        this.cards = [];
        this.isEventListenersInitialized = false;
        this.lastDuplicateTime = 0;
        this.lastSaveTime = 0;
        this.initializeData();

    }

    initializeData() {
        console.log('Iniciando carregamento de dados...');
        if (typeof localStorage !== 'undefined') {
            try {
                const storedCards = localStorage.getItem('cards');
                console.log('Dados brutos do localStorage:', storedCards);
                if (storedCards) {
                    const parsedCards = JSON.parse(storedCards);
                    console.log('Dados parseados:', parsedCards);
                    if (Array.isArray(parsedCards)) {
                        this.cards = parsedCards;
                        console.log('Cartões carregados com sucesso:', this.cards);
                        console.log('Tamanho do armazenamento:', this.getStorageSize());
                    } else {
                        console.warn('Formato de dados inválido no localStorage. Esperado um array.');
                        this.showToast('error', 'Dados inválidos no armazenamento local. Iniciando com lista vazia.');
                        this.cards = [];
                    }
                } else {
                    console.log('Nenhum cartão encontrado no localStorage.');
                    this.cards = [];
                }
            } catch (err) {
                console.error('Erro ao carregar cartões do localStorage:', err);
                this.showToast('error', 'Erro ao carregar cartões do armazenamento local. Iniciando com lista vazia.');
                this.cards = [];
            }
        } else {
            console.warn('localStorage não disponível.');
            this.cards = [];
        }

        console.log('Estado final de this.cards:', this.cards);
        this.renderCards();
        this.updateCardCounts();
        this.updateLastUpdated();
    }


// Carrega cards no inicio
    getStorageSize() {
        if (typeof localStorage === 'undefined') return '0 MB';
        const dataStr = localStorage.getItem('cards') || '';
        const sizeInMB = (dataStr.length * 2) / (1024 * 1024); // Aproximação em MB
        return `${sizeInMB.toFixed(2)} MB`;
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
                isTrusted: e.isTrusted // Indicates if the event was triggered by a user
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

            console.log('Ação detectada:', action, 'ID do cartão:', id);

            if (action === 'open-details' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de detalhes para ID:', id);
                this.openDetailsModal(id);
            } else if (action === 'edit-card' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de edição para cartão ID:', id);
                this.openCardModal(id);
            } else if (action === 'copy-access' && access) {
                e.stopPropagation();
                console.log('Copiando acesso:', access);
                navigator.clipboard.writeText(access);
                this.showToast('success', 'Caminho copiado!');
            } else if (action === 'duplicate-card' && id) {
                e.stopPropagation();
                console.log('Duplicando cartão ID:', id);
                this.duplicateCard(id);
            } else if (action === 'delete-card' && id) {
                e.stopPropagation();
                console.log('Abrindo modal de exclusão para ID:', id);
                this.openDeleteModal(id);
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

    saveCard(e) {
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

        const name = document.getElementById('card-name').value.trim().toUpperCase();
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

        if (typeof localStorage !== 'undefined') {
            try {
                const dataStr = JSON.stringify(this.cards);
                const sizeInMB = (dataStr.length * 2) / (1024 * 1024);
                if (sizeInMB > 10) {
                    console.warn('Tamanho dos dados excede 10MB:', sizeInMB);
                    this.showToast('error', `Os dados são muito grandes (${sizeInMB.toFixed(2)} MB). Exporte os cartões, remova imagens ou cartões, e tente novamente.`);
                    saveButton.disabled = false;
                    return;
                }
                localStorage.setItem('cards', dataStr);
                console.log('Salvo no localStorage:', this.cards);
            } catch (err) {
                console.error('Erro ao salvar no localStorage:', err);
                this.showToast('error', 'Erro ao salvar no armazenamento local: ' + err.message);
                saveButton.disabled = false;
                return;
            }
        }

        this.renderCards();
        this.updateCardCounts();
        this.updateLastUpdated();
        this.closeModal('card');
        this.showToast('success', cardId ? 'Cartão atualizado com sucesso!' : 'Cartão adicionado com sucesso!');
        saveButton.disabled = false;
    }

    clearAllCards() {
        if (confirm('Tem certeza que deseja limpar todos os cartões? Esta ação não pode ser desfeita.')) {
            this.cards = [];
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem('cards');
                    console.log('localStorage limpo.');
                } catch (err) {
                    console.error('Erro ao limpar localStorage:', err);
                    this.showToast('error', 'Erro ao limpar o armazenamento local.');
                    return;
                }
            }
            this.renderCards();
            this.updateCardCounts();
            this.updateLastUpdated();
            this.showToast('success', 'Todos os cartões foram limpos com sucesso!');
        }
    }

    deleteCard(cardId) {
        console.log('Excluindo cartão com ID:', cardId);
        const initialLength = this.cards.length;
        this.cards = this.cards.filter(c => c.id !== String(cardId));
        console.log('Cartões após exclusão:', this.cards);

        if (this.cards.length === initialLength) {
            console.warn('Nenhum cartão foi excluído; ID não encontrado:', cardId);
            this.showToast('error', 'Erro ao excluir cartão: ID não encontrado.');
            return;
        }

        if (typeof localStorage !== 'undefined') {
            try {
                const dataStr = JSON.stringify(this.cards);
                const sizeInMB = (dataStr.length * 2) / (1024 * 1024);
                if (sizeInMB > 10) {
                    console.warn('Tamanho dos dados excede 10MB:', sizeInMB);
                    this.showToast('error', `Os dados são muito grandes (${sizeInMB.toFixed(2)} MB). Exporte os cartões, remova imagens ou cartões, e tente novamente.`);
                    return;
                }
                localStorage.setItem('cards', dataStr);
                console.log('localStorage atualizado após exclusão:', this.cards);
            } catch (err) {
                console.error('Erro ao salvar no localStorage após exclusão:', err);
                this.showToast('error', 'Erro ao salvar no armazenamento local: ' + err.message);
                return;
            }
        }

        this.renderCards();
        this.updateCardCounts();
        this.updateLastUpdated();
        this.showToast('success', 'Cartão excluído com sucesso!');
    }

    duplicateCard(cardId) {
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

        this.renderCards();
        this.updateCardCounts();
        this.updateLastUpdated();
        this.showToast('success', 'Cartão duplicado com sucesso!');
        this.closeModal('details');

        if (typeof localStorage !== 'undefined') {
            try {
                const dataStr = JSON.stringify(this.cards);
                const sizeInMB = (dataStr.length * 2) / (1024 * 1024);
                if (sizeInMB > 10) {
                    console.warn('Tamanho dos dados excede 10MB:', sizeInMB);
                    this.showToast('warning', `Cartão duplicado, mas os dados são muito grandes (${sizeInMB.toFixed(2)} MB). Exporte os cartões, remova imagens ou cartões, e tente salvar novamente.`);
                    return;
                }
                localStorage.setItem('cards', dataStr);
                console.log('localStorage atualizado após duplicação:', this.cards);
            } catch (err) {
                console.error('Erro ao salvar no localStorage após duplicação:', err);
                this.showToast('error', 'Erro ao salvar no armazenamento local: ' + err.message);
            }
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
            this.showToast('error', 'Nenhum cartão válido para exportar.');
            return;
        }
        try {
            if (mode === 'complete') {
                // Exportar todos os cartões em um único arquivo JSON
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
                // Exportar cada cartão em um arquivo JSON separado com uma única confirmação
                if (!window.showDirectoryPicker) {
                    // Fallback para navegadores sem suporte à API showDirectoryPicker
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
                    // Usar showDirectoryPicker para escolher um diretório
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


    importCards(e) {
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
    
                        // Verificar se é um único cartão (modo separate) ou um array (modo complete)
                        if (!Array.isArray(parsedData)) {
                            if (parsedData.cards && Array.isArray(parsedData.cards)) {
                                importedCards = parsedData.cards;
                            } else {
                                // Tratar como um único cartão
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
    
                        resolve();
                    } catch (err) {
                        console.error(`Erro ao processar arquivo ${file.name}:`, err.message);
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error(`Erro ao ler o arquivo ${file.name}`));
                reader.readAsText(file);
            });
        };
    
        Promise.allSettled(Array.from(files).map(file => processFile(file)))
            .then(results => {
                filesProcessed = totalFiles;
                const errors = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
    
                if (validCardsCount > 0) {
                    if (typeof localStorage !== 'undefined') {
                        try {
                            const dataStr = JSON.stringify(this.cards);
                            const sizeInMB = (dataStr.length * 2) / (1024 * 1024);
                            if (sizeInMB > 10) {
                                console.warn('Tamanho dos dados excede 10MB:', sizeInMB);
                                this.showToast('error', `Os dados são muito grandes (${sizeInMB.toFixed(2)} MB). Exporte os cartões, remova imagens ou cartões, e tente novamente.`);
                                return;
                            }
                            localStorage.setItem('cards', dataStr);
                        } catch (err) {
                            console.error('Erro ao salvar no localStorage:', err);
                            this.showToast('error', 'Erro ao salvar no armazenamento local: ' + err.message);
                            return;
                        }
                    }
                    this.renderCards();
                    this.updateCardCounts();
                    this.updateLastUpdated();
                    this.showToast('success', `${validCardsCount} cartão(ões) importado(s) com sucesso!`);
                } else {
                    this.showToast('error', 'Nenhum cartão válido encontrado nos arquivos.');
                }
    
                if (errors.length > 0) {
                    errors.forEach(error => {
                        this.showToast('error', `Erro ao importar um arquivo: ${error}`);
                    });
                }
            })
            .catch(err => {
                console.error('Erro geral na importação:', err);
                this.showToast('error', 'Erro inesperado ao importar arquivos.');
            });
    
        e.target.value = '';
    }
}

// Instantiate the final class
const cardCatalog = new CardCatalogData();