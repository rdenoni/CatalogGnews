class CardCatalogUI extends CardCatalog {
    constructor() {
        super(); 
        this._initDOMElements(); 
        
        if (typeof localStorage !== 'undefined' && localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
            if (this.darkModeToggleBtn) this.darkModeToggleBtn.textContent = 'dark_mode';
        } else {
            if (this.darkModeToggleBtn) this.darkModeToggleBtn.textContent = 'light_mode';
        }
        this.currentPedidoCardId = null;
        this.pedidoAnexos = []; 
        this.lastFocusedElementBeforeModal = null;
    }

    _initDOMElements() {
        this.cardsContainer = document.getElementById('cards-container');
        this.totalCards = document.getElementById('total-cards');
        this.filteredCards = document.getElementById('filtered-cards');
        this.lastUpdatedEl = document.getElementById('last-updated'); 

        this.searchInput = document.getElementById('search-input');
        this.clearSearch = document.getElementById('clear-search');
        this.tagFilter = document.getElementById('tag-filter');
        this.sortOrder = document.getElementById('sort-order');

        this.cardModal = document.getElementById('card-modal');
        this.detailsModal = document.getElementById('details-modal');
        this.imageModal = document.getElementById('image-modal');
        this.imageModalContent = document.getElementById('image-modal-content');
        this.deleteModal = document.getElementById('delete-modal'); 
        this.helpModal = document.getElementById('help-modal');
        this.exportModal = document.getElementById('export-modal');
        this.fazerPedidoModal = document.getElementById('fazer-pedido-modal');
        this.pedidoSuccessModal = document.getElementById('pedido-success-modal');

        this.cardForm = document.getElementById('card-form'); 
        this.fazerPedidoForm = document.getElementById('fazer-pedido-form'); 
        this.importInput = document.getElementById('import-input'); 
        this.darkModeToggleBtn = document.querySelector('.dark-mode-toggle');

        if (window.location.pathname.includes('main')) {
            const criticalElements = {
                cardsContainer: this.cardsContainer, searchInput: this.searchInput,
                cardModal: this.cardModal, importInput: this.importInput,
                fazerPedidoModal: this.fazerPedidoModal,
                pedidoSuccessModal: this.pedidoSuccessModal,
            };
            for (const key in criticalElements) {
                if (!criticalElements[key]) {
                    console.error(`Elemento DOM crítico "${key}" não encontrado durante _initDOMElements.`);
                }
            }
        }
    }
    
    escapeHTML(str) {
        if (str === null || str === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(String(str)));
        return div.innerHTML;
    }

    createCardElement(card) {
        const displayName = this.escapeHTML(card.name);
        const accessText = card.access ? this.escapeHTML(card.access) : '';
        const placeholderColorHex = 'EF4444'; 
        const cardImageSrc = card.image ? this.escapeHTML(card.image) : `https://placehold.co/300x180/${placeholderColorHex}/FFFFFF?text=GNEWS&font=poppins`;
        
        let actionMenuItemsHTML = '';
        actionMenuItemsHTML += '<li class="action-menu-item" data-action="edit-card-menu" data-id="' + card.id + '">';
        actionMenuItemsHTML += '    <span class="material-icons text-base">edit</span> Editar';
        actionMenuItemsHTML += '</li>';
        actionMenuItemsHTML += '<li class="action-menu-item" data-action="duplicate-card-menu" data-id="' + card.id + '">';
        actionMenuItemsHTML += '    <span class="material-icons text-base">content_copy</span> Duplicar';
        actionMenuItemsHTML += '</li>';
        actionMenuItemsHTML += '<li class="action-menu-item" data-action="export-card-menu" data-id="' + card.id + '">';
        actionMenuItemsHTML += '    <span class="material-icons text-base">download</span> Exportar';
        actionMenuItemsHTML += '</li>';
        actionMenuItemsHTML += '<li class="action-menu-item" data-action="delete-card-menu" data-id="' + card.id + '">';
        actionMenuItemsHTML += '    <span class="material-icons text-base">delete</span> Deletar';
        actionMenuItemsHTML += '</li>';

        const cardHeaderHTML = `
            <div class="card-header flex justify-between items-start gap-2">
                <h3 class="text-base font-poppins font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-cor-principal dark:hover:text-cor-destaque flex-1 break-words leading-tight line-clamp-2" 
                    data-action="open-details" data-id="${card.id}" title="${displayName}">
                    ${displayName}
                </h3>
                <div class="card-actions relative flex-shrink-0">
                    <button class="card-action-btn menu-btn" title="Mais ações" aria-label="Mais ações">
                        <span class="material-icons text-lg">more_vert</span>
                    </button>
                    <ul class="action-menu hidden absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl z-20 py-1 text-sm">
                        ${actionMenuItemsHTML}
                    </ul>
                </div>
            </div>`;

        const cardImageHTML = `
            <div class="relative overflow-hidden h-48 group-hover:opacity-90 transition-opacity cursor-pointer"
                 data-action="open-image" data-image="${card.image || cardImageSrc}"> 
                <img src="${cardImageSrc}" alt="Imagem do cartão ${displayName}" 
                     class="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-300 ease-in-out">
            </div>`;

        const cardFooterHTML = card.access ? `
            <div class="card-footer mt-4">
                <div class="access-path bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md p-2 flex items-start gap-1.5 text-xs font-fira-mono">
                    <button class="copy-access-btn text-gray-500 dark:text-gray-400 hover:text-cor-principal dark:hover:text-cor-destaque p-0.5" data-action="copy-access" data-access="${this.escapeHTML(card.access)}" title="Copiar caminho" aria-label="Copiar caminho">
                        <span class="material-icons text-sm">folder_copy</span>
                    </button>
                    <span class="access-path-text flex-1 cursor-pointer hover:underline" data-action="copy-access" data-access="${this.escapeHTML(card.access)}" title="${accessText}">${accessText}</span>
                </div>
            </div>
            ` : '<div class="pb-4"></div>'; 

        const div = document.createElement('div');
        div.className = 'card-preview group bg-fundo-card-claro dark:bg-fundo-card-escuro rounded-xl shadow-lg flex flex-col border border-borda-card-claro dark:border-borda-card-escuro hover:shadow-xl transition-all duration-300 overflow-hidden';
        div.dataset.id = card.id; 
        div.innerHTML = `
            ${cardHeaderHTML}
            ${cardImageHTML} 
            ${cardFooterHTML}
        `;
        return div;
    }

    renderCards() {
        if (!this.cardsContainer) {
            console.error("renderCards: cardsContainer não encontrado.");
            return;
        }
        this.cardsContainer.innerHTML = ''; 
        const filteredCards = this.getFilteredCards();
        if (filteredCards.length === 0) {
            this.cardsContainer.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 col-span-full py-10">Nenhum cartão encontrado com os filtros atuais.</p>`;
        } else {
            filteredCards.forEach(card => {
                this.cardsContainer.appendChild(this.createCardElement(card));
            });
        }
        if (typeof this.observeCardFade === 'function') { 
            this.observeCardFade();
        }
    }

    getFilteredCards() {
        if (!this.cards || !this.searchInput || !this.tagFilter || !this.sortOrder) {
            return this.cards || []; 
        }

        const search = this.searchInput.value.toLowerCase().trim();
        const tagValue = this.tagFilter.value;
        const sort = this.sortOrder.value;

        let filtered = this.cards.filter(card => {
            const nameMatch = card.name && card.name.toLowerCase().includes(search);
            const descriptionMatch = card.description && card.description.toLowerCase().includes(search);
            const codeMatch = card.code && card.code.toLowerCase().includes(search);
            const tagTextMatch = card.tag && card.tag.toLowerCase().includes(search); 

            const matchesSearch = nameMatch || descriptionMatch || codeMatch || tagTextMatch;
            const matchesTag = !tagValue || (card.tag === tagValue);
            return matchesSearch && matchesTag;
        });

        filtered.sort((a, b) => {
            if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            if (sort === 'lastEdited') return new Date(b.lastEdited || 0) - new Date(a.lastEdited || 0);
            if (sort === 'tag') return (a.tag || '').localeCompare(b.tag || '');
            return 0;
        });

        return filtered;
    }

    clearCardForm() {
        if (!this.cardForm) {
            this.showToast('error', 'Erro interno: formulário de cartão não encontrado ao limpar.');
            return;
        }
        this.cardForm.reset(); 

        const cardIdInput = document.getElementById('card-id');
        if (cardIdInput) cardIdInput.value = '';

        document.querySelectorAll('#card-form .error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('#card-form p[id$="-error"]').forEach(el => el.classList.add('hidden'));
        
        const descriptionCounter = document.getElementById('card-description-counter');
        if (descriptionCounter) descriptionCounter.textContent = '0/200';

        this.removeImagePreview('card'); 

        const cardNameInput = document.getElementById('card-name');
        if (cardNameInput) cardNameInput.focus();
    }

    clearFazerPedidoForm() {
        if (!this.fazerPedidoForm) {
            this.showToast('error', 'Erro interno: formulário de pedido não encontrado ao limpar.');
            return;
        }
        this.fazerPedidoForm.reset();
        this.currentPedidoCardId = null;
        this.pedidoAnexos = []; 

        const cardIdInput = document.getElementById('pedido-card-id');
        if (cardIdInput) cardIdInput.value = '';
        
        const cardNameInput = document.getElementById('pedido-card-name');
        if (cardNameInput) cardNameInput.value = '';
        
        const cardCodeInput = document.getElementById('pedido-card-code'); // Clear card code
        if (cardCodeInput) cardCodeInput.value = '';


        document.querySelectorAll('#fazer-pedido-form .error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('#fazer-pedido-form p[id$="-error"]').forEach(el => el.classList.add('hidden'));

        this.clearPedidoAnexosList(); 

        const nomeSolicitanteInput = document.getElementById('pedido-nome-solicitante');
        if (nomeSolicitanteInput) nomeSolicitanteInput.focus();
    }
    
    removeImagePreview(prefix = 'card') {
        const imageInput = document.getElementById(`${prefix}-image-input`); 
        const imagePreview = document.getElementById(`${prefix}-image-preview`);
        const imagePath = document.getElementById(`${prefix}-image-path`);
        const removeBtn = document.getElementById(`${prefix}-remove-image-btn`);

        if (imageInput) { 
            imageInput.value = ''; 
            imageInput.dataset.url = ''; 
        }
        if (imagePreview) { imagePreview.src = ''; imagePreview.classList.add('hidden'); }
        if (imagePath) imagePath.textContent = '';
        if (removeBtn) removeBtn.classList.add('hidden');
    }
    
    handleSingleImageUpload(e, prefix = 'card') {
        const file = e.target.files[0];
        const imagePreview = document.getElementById(`${prefix}-image-preview`);
        const imagePath = document.getElementById(`${prefix}-image-path`);
        const removeImageBtn = document.getElementById(`${prefix}-remove-image-btn`);
        const imageInput = e.target; 

        if (file && imagePreview && imagePath && removeImageBtn) {
            if (file.size > 5 * 1024 * 1024) { 
                this.showToast('error', 'Imagem > 5MB. Use uma menor.');
                imageInput.value = ''; return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                imagePreview.src = dataUrl;
                imagePreview.classList.remove('hidden');
                imagePath.textContent = file.name;
                imageInput.dataset.url = dataUrl; 
                removeImageBtn.classList.remove('hidden');
            };
            reader.onerror = (error) => {
                console.error('Erro ao ler imagem:', file.name, error);
                this.showToast('error', 'Erro ao carregar imagem.');
                imageInput.value = ''; 
            };
            reader.readAsDataURL(file);
        }
    }

    handlePedidoAnexosUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { 
                this.showToast('error', `Arquivo "${file.name}" > 10MB. Selecione arquivos menores.`);
                continue; 
            }
            if (!this.pedidoAnexos.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
                 this.pedidoAnexos.push(file);
            }
        }
        this.renderPedidoAnexosList();
        e.target.value = ''; 
    }

    renderPedidoAnexosList() {
        const listContainer = document.getElementById('pedido-anexos-list');
        if (!listContainer) return;

        listContainer.innerHTML = ''; 

        if (this.pedidoAnexos.length === 0) {
            listContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum arquivo anexado.</p>';
            return;
        }

        this.pedidoAnexos.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'flex justify-between items-center p-1 bg-gray-100 dark:bg-gray-700 rounded';
            fileElement.innerHTML = `
                <span class="truncate" title="${this.escapeHTML(file.name)}">${this.escapeHTML(file.name)}</span>
                <button type="button" class="text-red-500 hover:text-red-700 dark:text-yellow-400 dark:hover:text-yellow-600 ml-2" data-anexo-index="${index}" title="Remover anexo">
                    <span class="material-icons text-sm">delete_outline</span>
                </button>
            `;
            fileElement.querySelector('button').addEventListener('click', () => this.removePedidoAnexo(index));
            listContainer.appendChild(fileElement);
        });
    }

    removePedidoAnexo(indexToRemove) {
        this.pedidoAnexos.splice(indexToRemove, 1);
        this.renderPedidoAnexosList();
    }

    clearPedidoAnexosList() {
        const listContainer = document.getElementById('pedido-anexos-list');
        if (listContainer) {
            listContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">Nenhum arquivo anexado.</p>';
        }
        this.pedidoAnexos = []; 
        const anexoInput = document.getElementById('pedido-anexos-input');
        if (anexoInput) anexoInput.value = '';
    }

    updateCardCounts() {
        if (this.totalCards && this.filteredCards && this.cards) {
            this.totalCards.textContent = this.cards.length;
            this.filteredCards.textContent = this.getFilteredCards().length;
        }
    }

    updateLastUpdated() {
        if (this.lastUpdatedEl) { 
            const now = new Date();
            this.lastUpdatedEl.textContent = `Última atualização: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
        }
    }
    
    _openModalLogic(modalElement, type) {
        if (!modalElement) {
            this.showToast('error', `Erro interno: modal do tipo "${type}" não encontrado.`);
            return false;
        }
        if (modalElement.classList.contains('show')) {
            return false;
        }

        this.lastFocusedElementBeforeModal = document.activeElement;

        modalElement.classList.add('show');
        modalElement.classList.remove('hidden');
        modalElement.setAttribute('aria-hidden', 'false');
        modalElement.removeAttribute('inert'); 

        if (modalElement.hasAttribute('tabindex')) {
            modalElement.focus();
        } else {
            const firstFocusable = modalElement.querySelector(
                'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
        return true;
    }

    openCardModal(cardId = '') {
        if (!this._openModalLogic(this.cardModal, 'card')) return;
        
        this.clearCardForm(); 

        const modalTitleEl = this.cardModal.querySelector('#card-modal-title'); 
        if (modalTitleEl) modalTitleEl.textContent = cardId ? 'Editar Cartão' : 'Adicionar Novo Cartão';

        const cardIdInput = document.getElementById('card-id');
        if (cardIdInput) cardIdInput.value = cardId; 

        if (cardId) {
            const card = this.cards.find(c => String(c.id) === String(cardId));
            if (card) {
                document.getElementById('card-name').value = card.name; 
                document.getElementById('card-tag').value = card.tag || '';
                document.getElementById('card-youtube').value = card.youtube || '';
                document.getElementById('card-access').value = card.access || '';
                const descriptionInput = document.getElementById('card-description');
                descriptionInput.value = card.description || '';
                const counter = document.getElementById('card-description-counter');
                if (counter) counter.textContent = `${(card.description || '').length}/200`;
                
                if (card.image) {
                    const imageInput = document.getElementById('card-image-input');
                    const imagePreview = document.getElementById('card-image-preview');
                    const imagePath = document.getElementById('card-image-path');
                    const removeImageBtn = document.getElementById('remove-image-btn');

                    if (imagePreview && imagePath && imageInput && removeImageBtn) {
                        imagePreview.src = card.image;
                        imagePreview.classList.remove('hidden');
                        imagePath.textContent = 'Imagem carregada anteriormente'; 
                        imageInput.dataset.url = card.image; 
                        removeImageBtn.classList.remove('hidden');
                    }
                }
            } else {
                this.showToast('error', 'Cartão para edição não encontrado.');
                this.closeModal('card'); 
                return;
            }
        }
    }
    
    openDetailsModal(cardId) {
        const card = this.cards.find(c => String(c.id) === String(cardId));
        if (!card || !this.detailsModal) {
            this.showToast('error', 'Detalhes do cartão ou modal não encontrados.');
            return;
        }

        this.detailsModal.removeAttribute('inert');
        this.detailsModal.classList.add('show');
        this.detailsModal.classList.remove('hidden');

        this.detailsModal.querySelector('#details-name').textContent = this.escapeHTML(card.name);
        this.detailsModal.querySelector('#details-code').textContent = this.escapeHTML(card.code || 'N/A');
        
        const descriptionEl = this.detailsModal.querySelector('#details-description');
        descriptionEl.textContent = this.escapeHTML(card.description || 'Sem descrição');

        const youtubeLink = this.detailsModal.querySelector('#details-youtube');
        const youtubeContainer = youtubeLink.closest('p') || youtubeLink.parentElement; 
        if (card.youtube && this.isValidUrl(card.youtube, 'youtube')) {
            youtubeLink.href = card.youtube;
            if(youtubeContainer) youtubeContainer.style.display = 'flex'; 
        } else {
            if(youtubeContainer) youtubeContainer.style.display = 'none'; 
        }

        this.detailsModal.querySelector('#details-created').textContent = card.created ? new Date(card.created).toLocaleString('pt-BR') : 'N/A';
        this.detailsModal.querySelector('#details-last-edited').textContent = card.lastEdited ? new Date(card.lastEdited).toLocaleString('pt-BR') : 'N/A';
        
        const detailsImage = this.detailsModal.querySelector('#details-image');
        const placeholderColorHexDetails = 'EF4444'; 
        detailsImage.src = card.image || `https://placehold.co/400x300/${placeholderColorHexDetails}/FFFFFF?text=Sem+Imagem&font=poppins`; 
        detailsImage.alt = `Imagem de ${this.escapeHTML(card.name)}`;
        detailsImage.removeAttribute('data-action');
        detailsImage.classList.remove('cursor-pointer');

        const modalActionsContainer = this.detailsModal.querySelector('.modal-actions');
        if (modalActionsContainer) {
            modalActionsContainer.querySelectorAll('[data-action]').forEach(btn => {
                btn.dataset.id = cardId; 
            });
        }
    }






    //Função ENVIAR PEDIDO

    openFazerPedidoModal(cardId) {
        if (!this._openModalLogic(this.fazerPedidoModal, 'fazer-pedido')) return;

        this.closeModal('details');
        this.clearFazerPedidoForm();
        this.currentPedidoCardId = cardId;

        const cardIdInput = document.getElementById('pedido-card-id');
        if (cardIdInput) cardIdInput.value = cardId;

        const card = this.cards.find(c => String(c.id) === String(cardId));
        if (card) {
            const cardNameInput = document.getElementById('pedido-card-name');
            if (cardNameInput) cardNameInput.value = this.escapeHTML(card.name); 

            const cardCodeInput = document.getElementById('pedido-card-code'); // Populate card code
            if (cardCodeInput) cardCodeInput.value = this.escapeHTML(card.code || '');
        }

        const nomeSolicitanteInput = document.getElementById('pedido-nome-solicitante');
        if (nomeSolicitanteInput) nomeSolicitanteInput.focus();
    }




    

    //Função PEDIDO ENVIADO

    openPedidoSuccessModal() {
        if (!this._openModalLogic(this.pedidoSuccessModal, 'pedido-success')) return;
        const closeButton = this.pedidoSuccessModal.querySelector('button[onclick*="closeModal"], .btn-primary');
        if (closeButton) closeButton.focus();
    }

    openImageModal(imageUrl) {
        if (!this.imageModal || !this.imageModalContent) {
            this.showToast('error', 'Erro interno: modal de imagem não encontrado.');
            return;
        }
        
        if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.includes('placehold.co')) {
            const event = window.event; 
            if (event && event.target) {
                const cardElement = event.target.closest('.card-preview');
                const cardId = cardElement?.dataset.id;
                if (cardId) {
                    this.openDetailsModal(cardId); 
                    return;
                }
            }
            this.showToast('info', 'Nenhuma imagem válida para ampliar.');
            return;
        }

        this.lastFocusedElementBeforeModal = document.activeElement;

        this.imageModalContent.src = imageUrl;
        this.imageModal.classList.add('show');
        this.imageModal.classList.remove('hidden');
        this.imageModal.setAttribute('aria-hidden', 'false');
        this.imageModal.removeAttribute('inert'); 
        this.imageModal.focus(); 
    }

    openDeleteModal(cardId) {
        const card = this.cards.find(c => String(c.id) === String(cardId));
        if (!card) {
            this.showToast('error', 'Cartão não encontrado.');
            return;
        }
        if (!this._openModalLogic(this.deleteModal, 'delete')) return;

        const cardNameEl = this.deleteModal.querySelector('#delete-card-name');
        if (cardNameEl) cardNameEl.textContent = this.escapeHTML(card.name);
        
        const confirmBtn = this.deleteModal.querySelector('#confirm-delete');
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true); 
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.addEventListener('click', () => {
                if (typeof this.deleteCard === 'function') {
                    this.deleteCard(cardId); 
                }
                this.closeModal('delete');
            }, { once: true }); 
        }
    }

    openHelpModal() {
        if (this.helpModal) {
            this.helpModal.removeAttribute('inert');
            this.helpModal.classList.add('show');
            this.helpModal.classList.remove('hidden');
        } else {
            this.showToast('error', 'Modal de ajuda não encontrado.');
        }
    }

    // FUNCÃO FECHAR MODAL
    closeModal(type) {
        const modalToClose = document.getElementById(`${type}-modal`);
        if (modalToClose) {
            const focusedElement = modalToClose.querySelector(':focus');
            if (focusedElement) {
                focusedElement.blur();
            }
            modalToClose.setAttribute('inert', '');
            modalToClose.classList.remove('show');
            modalToClose.classList.add('hidden');
            modalToClose.removeAttribute('aria-hidden'); 

            if (this.lastFocusedElementBeforeModal && typeof this.lastFocusedElementBeforeModal.focus === 'function') {
                 // Do not restore focus if the success modal is the one being closed,
                 // or if the next modal to open will handle its own focus.
                if (type !== 'pedido-success' && type !== 'fazer-pedido') {
                    this.lastFocusedElementBeforeModal.focus();
                }
            }
            if (type !== 'pedido-success') { // Avoid clearing for the success modal itself
                 this.lastFocusedElementBeforeModal = null;
            }

        } else {
            console.warn(`Modal do tipo "${type}" não encontrado para fechar.`);
        }
    }


    filterCards() { 
        this.renderCards();
        this.updateCardCounts();
        if (this.clearSearch && this.searchInput) {
            this.clearSearch.classList.toggle('hidden', !this.searchInput.value);
        }
    }

    showToast(type, message) {
        const toastContainer = document.getElementById('toast-container') || document.body; 
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        
        toast.className = `p-4 rounded-lg shadow-xl text-sm transform transition-all duration-300 ease-out mb-2`; 
        
        let bgColorClass = '';
        let iconName = '';
        let textColorClass = 'text-white'; 

        switch (type) {
            case 'success':
                bgColorClass = 'bg-green-500 hover:bg-green-600';
                iconName = 'check_circle';
                break;
            case 'error':
                bgColorClass = 'bg-cor-principal hover:opacity-90'; 
                iconName = 'error';
                break;
            case 'warning':
                bgColorClass = 'bg-cor-destaque hover:opacity-90'; 
                textColorClass = 'text-gray-800'; 
                iconName = 'warning';
                break;
            case 'info':
            default:
                bgColorClass = 'bg-blue-500 hover:bg-blue-600';
                iconName = 'info';
                break;
        }
        toast.classList.add(...bgColorClass.split(' '), textColorClass);
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';

        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-icons text-xl">${iconName}</span>
                <span class="flex-grow">${this.escapeHTML(message)}</span>
                <button class="ml-2 p-1 rounded-full hover:bg-black/20 focus:outline-none" onclick="document.getElementById('${toastId}').remove()">
                    <span class="material-icons text-sm">close</span>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        const duration = type === 'error' ? 7000 : 5000;
        setTimeout(() => {
            const existingToast = document.getElementById(toastId);
            if (existingToast) {
                existingToast.style.opacity = '0';
                existingToast.style.transform = 'translateY(20px)';
                setTimeout(() => existingToast.remove(), 300); 
            }
        }, duration); 
    }

    isValidUrl(string, type = 'any') {
        if (!string || typeof string !== 'string') return false;
        try {
            const url = new URL(string); 
            if (type === 'youtube') {
                return (url.protocol === "http:" || url.protocol === "https:") && 
                       (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "youtu.be" || url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "youtu.be");
            }
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            if (type === 'access_path') { 
                return /^(?:[a-zA-Z]:\\|[\\\/]{2}|[~\/])(?:[\w\-\s\\\/.]*)$|^[\w\-\s\\\/.]+$/.test(string);
            }
            return false;  
        }
    }

    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        const isDarkMode = document.documentElement.classList.contains('dark');
        if (this.darkModeToggleBtn) {
            this.darkModeToggleBtn.textContent = isDarkMode ? 'dark_mode' : 'light_mode';
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('darkMode', isDarkMode); 
        }
        this.showToast('info', `Modo ${isDarkMode ? 'Escuro' : 'Claro'} ativado.`);
    }
}