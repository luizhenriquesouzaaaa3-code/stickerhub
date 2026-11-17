
const DB_NAME = "StickerHubDB";
const DB_VERSION = 1;

const modal = document.getElementById("stickerModal");
const closeModal = document.getElementById("closeModal");

const previewEmoji = document.getElementById("previewEmoji");
const previewName = document.getElementById("previewName");

const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const statusMessage = document.getElementById("statusMessage");

const stickerGrid = document.querySelector(".sticker-grid");
const collectionGallery = document.getElementById("collectionGallery");
const collectionFilter = document.getElementById("collectionFilter");
const stickerSearch = document.getElementById("stickerSearch");
const emptyMessage = document.getElementById("emptyMessage");

let db;
let stickers = [];
let collections = [];
let selectedSticker = null;
let previewURL = null;
let imageURLs = [];

// BANCO DE DADOS

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// CARREGAR DADOS

async function loadStore() {
    stickers = await getAllRecords("stickers");
    collections = await getAllRecords("collections");

    renderCollectionFilter();
    renderStickers();
}

// FILTRO DE COLEÇÕES

function renderCollectionFilter() {
    const previousValue = collectionFilter.value || "all";

    collectionFilter.innerHTML = `
        <option value="all">Todas as coleções</option>
    `;

    collections.forEach(collection => {
        const option = document.createElement("option");

        option.value = collection.id;
        option.textContent = collection.name;

        collectionFilter.appendChild(option);
    });

    const optionExists = Array.from(collectionFilter.options)
        .some(option => option.value === previousValue);

    collectionFilter.value = optionExists ? previousValue : "all";
}

// FILTRAR FIGURINHAS

function getFilteredStickers() {
    const search = stickerSearch.value
        .trim()
        .toLowerCase();

    const selectedCollection = collectionFilter.value;

    return stickers.filter(sticker => {
        const matchesName = sticker.name
            .toLowerCase()
            .includes(search);

        const matchesCollection =
            selectedCollection === "all" ||
            String(sticker.collectionId) === selectedCollection;

        return matchesName && matchesCollection;
    });
}

// RENDERIZAR GALERIA

function renderStickers() {
    imageURLs.forEach(url => URL.revokeObjectURL(url));
    imageURLs = [];

    collectionGallery.innerHTML = "";

    const filteredStickers = getFilteredStickers();

    if (filteredStickers.length === 0) {
        emptyMessage.hidden = false;
        return;
    }

    emptyMessage.hidden = true;

    const selectedCollection = collectionFilter.value;

    const visibleCollections = selectedCollection === "all"
        ? collections
        : collections.filter(collection =>
            String(collection.id) === selectedCollection
        );

    visibleCollections.forEach(collection => {
        const collectionStickers = filteredStickers.filter(
            sticker => sticker.collectionId === collection.id
        );

        if (collectionStickers.length === 0) return;

        const section = document.createElement("section");
        section.className = "collection-section";

        const title = document.createElement("h2");
        title.className = "collection-title";
        title.textContent = collection.name;

        const description = document.createElement("p");
        description.className = "collection-description";
        description.textContent =
            `${collectionStickers.length} figurinhas disponíveis`;

        const grid = document.createElement("div");
        grid.className = "sticker-grid";

        collectionStickers.forEach(sticker => {
            const card = document.createElement("button");
            card.className = "sticker-card";

            const image = document.createElement("img");
            const url = URL.createObjectURL(sticker.image);

            imageURLs.push(url);

            image.src = url;
            image.alt = sticker.name;

            const name = document.createElement("p");
            name.textContent = sticker.name;

            card.append(image, name);

            card.addEventListener("click", () => {
                openSticker(sticker);
            });

            grid.appendChild(card);
        });

        section.append(title, description, grid);
        collectionGallery.appendChild(section);
    });
}

// ABRIR FIGURINHA

function openSticker(sticker) {
    selectedSticker = sticker;

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }

    previewURL = URL.createObjectURL(sticker.image);

    previewEmoji.style.display = "none";

    let image = document.getElementById("previewImage");

    if (!image) {
        image = document.createElement("img");

        image.id = "previewImage";
        image.style.width = "220px";
        image.style.maxWidth = "100%";
        image.style.maxHeight = "220px";
        image.style.objectFit = "contain";

        document.querySelector(".sticker-preview")
            .appendChild(image);
    }

    image.src = previewURL;
    image.alt = sticker.name;

    previewName.textContent = sticker.name;
    statusMessage.textContent = "";

    modal.classList.add("active");
}

// FECHAR MODAL

function closeStickerModal() {
    modal.classList.remove("active");

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    const image = document.getElementById("previewImage");

    if (image) {
        image.removeAttribute("src");
    }

    selectedSticker = null;
}

closeModal.addEventListener("click", closeStickerModal);

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeStickerModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeStickerModal();
    }
});

// COPIAR FIGURINHA

copyButton.addEventListener("click", async () => {
    try {
        if (!selectedSticker) return;

        if (!navigator.clipboard || !window.ClipboardItem) {
            throw new Error("Cópia de imagem não suportada.");
        }

        await navigator.clipboard.write([
            new ClipboardItem({
                "image/png": selectedSticker.image
            })
        ]);

        statusMessage.textContent = "Figurinha copiada! 💗";

    } catch (error) {
        console.error(error);

        statusMessage.textContent =
            "Não foi possível copiar. Tente baixar.";
    }
});

// BAIXAR FIGURINHA

downloadButton.addEventListener("click", () => {
    if (!selectedSticker) return;

    const url = URL.createObjectURL(selectedSticker.image);

    const link = document.createElement("a");

    link.href = url;
    link.download = selectedSticker.name + ".png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    statusMessage.textContent = "Download iniciado! 💗";
});

// EVENTOS DE PESQUISA E FILTRO

stickerSearch.addEventListener("input", renderStickers);

collectionFilter.addEventListener("change", renderStickers);

// INICIALIZAÇÃO

async function initializeStore() {
    try {
        db = await openDatabase();
        await loadStore();

    } catch (error) {
        console.error("Erro ao carregar a loja:", error);

        collectionGallery.innerHTML = `
            <p>Não foi possível carregar as figurinhas.</p>
        `;
    }
}

initializeStore();
