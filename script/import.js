
/* =========================================
   STICKERHUB - IMPORTAÇÃO SUPABASE
========================================= */

const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const fileCount = document.getElementById("fileCount");
const fileList = document.getElementById("fileList");

const modal = document.getElementById("stickerModal");
const closeModal = document.getElementById("closeModal");
const modalImage = document.getElementById("modalImage");
const stickerName = document.getElementById("stickerName");
const collectionSelect = document.getElementById("collectionSelect");

const newCollectionButton = document.getElementById("newCollectionButton");
const newCollectionArea = document.getElementById("newCollectionArea");
const newCollectionName = document.getElementById("newCollectionName");
const createCollectionButton = document.getElementById("createCollectionButton");
const publishStickerButton = document.getElementById("publishSticker");

let fileQueue = [];
let currentFile = null;
let previewURL = null;
let isSaving = false;

// CONTADOR

function updateFileCount(total) {
    fileCount.textContent = `${total} figurinhas`;
}

// IMPORTAR ARQUIVOS

function handleFiles(files) {
    const images = Array.from(files).filter(file =>
        file.type.startsWith("image/")
    );

    if (images.length === 0) {
        alert("Nenhuma imagem válida foi selecionada.");
        return;
    }

    fileQueue.push(...images);
    showNextFile();
}

fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
    fileInput.value = "";
});

folderInput.addEventListener("change", () => {
    handleFiles(folderInput.files);
    folderInput.value = "";
});

// PRÓXIMA IMAGEM

function showNextFile() {
    if (fileQueue.length === 0) {
        currentFile = null;
        closeImportModal();
        renderFileList();
        return;
    }

    currentFile = fileQueue.shift();

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
    }

    previewURL = URL.createObjectURL(currentFile);

    modalImage.src = previewURL;
    stickerName.value = currentFile.name.replace(/\.[^/.]+$/, "");

    modal.classList.add("active");

    updateFileCount(fileQueue.length + 1);
}

// FECHAR MODAL

function closeImportModal() {
    modal.classList.remove("active");

    if (previewURL) {
        URL.revokeObjectURL(previewURL);
        previewURL = null;
    }

    modalImage.removeAttribute("src");
}

closeModal.addEventListener("click", closeImportModal);

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeImportModal();
    }
});

// PACOTES

async function renderCollectionOptions() {
    const { data: packs, error } = await supabaseClient
        .from("packs")
        .select("id, name")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar pacotes:", error);
        alert("Não foi possível carregar os pacotes.");
        return;
    }

    collectionSelect.innerHTML = `
        <option value="">Selecione um pacote</option>
    `;

    packs.forEach(pack => {
        const option = document.createElement("option");
        option.value = pack.id;
        option.textContent = pack.name;

        collectionSelect.appendChild(option);
    });
}

// ABRIR CRIAÇÃO DE PACOTE

newCollectionButton.addEventListener("click", () => {
    newCollectionArea.hidden = !newCollectionArea.hidden;

    if (!newCollectionArea.hidden) {
        newCollectionName.focus();
    }
});

// CRIAR PACOTE

createCollectionButton.addEventListener("click", async () => {
    const name = newCollectionName.value.trim();

    if (!name) {
        alert("Digite o nome do pacote.");
        return;
    }

    const { data: existing, error: searchError } = await supabaseClient
        .from("packs")
        .select("id")
        .ilike("name", name);

    if (searchError) {
        console.error(searchError);
        alert("Erro ao verificar pacote.");
        return;
    }

    if (existing.length > 0) {
        alert("Esse pacote já existe.");
        return;
    }

    const { error } = await supabaseClient
        .from("packs")
        .insert({
            name,
            description: "",
            published: false
        });

    if (error) {
    console.error("Erro ao criar pacote:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
    });

    alert(error.message);
    return;
} return;
    

    newCollectionName.value = "";
    newCollectionArea.hidden = true;

    await renderCollectionOptions();

    window.dispatchEvent(new Event("stickerhub:updated"));

    alert("Pacote criado com sucesso! 💗");
});

// EXTENSÃO DO ARQUIVO

function getFileExtension(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!/^[a-z0-9]{1,10}$/.test(extension)) {
        return "webp";
    }

    return extension;
}

// SALVAR FIGURINHA NA NUVEM

async function saveSticker() {
    if (!currentFile || isSaving) return;

    const name = stickerName.value.trim();
    const packId = collectionSelect.value;

    if (!name) {
        alert("Digite um nome para a figurinha.");
        return;
    }

    if (!packId) {
        alert("Selecione um pacote.");
        return;
    }

    isSaving = true;
    publishStickerButton.disabled = true;
    publishStickerButton.textContent = "Enviando...";

    const extension = getFileExtension(currentFile);
    const fileId = crypto.randomUUID();

    // Caminho: UUID_DO_PACOTE/UUID_DA_FIGURINHA.ext
    const imagePath = `${packId}/${fileId}.${extension}`;

    try {
        // 1. Enviar imagem para o Storage

        const { error: uploadError } = await supabaseClient
            .storage
            .from("stickers")
            .upload(imagePath, currentFile, {
                contentType: currentFile.type,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 2. Registrar figurinha na tabela

        const { error: insertError } = await supabaseClient
            .from("stickers")
            .insert({
                pack_id: packId,
                name,
                image_path: imagePath
            });

        if (insertError) {
            // Se o registro falhar, tentar remover a imagem enviada.
            await supabaseClient.storage
                .from("stickers")
                .remove([imagePath]);

            throw insertError;
        }

        alert("Figurinha enviada para a nuvem! ☁️");

        closeImportModal();
        currentFile = null;

        window.dispatchEvent(new Event("stickerhub:updated"));

        await renderFileList();
        showNextFile();

    } catch (error) {
        console.error("Erro ao enviar figurinha:", error);
        alert(`Erro ao salvar: ${error.message}`);

    } finally {
        isSaving = false;
        publishStickerButton.disabled = false;
        publishStickerButton.textContent = "Publicar";
    }
}

publishStickerButton.addEventListener("click", saveSticker);

// LISTAR FIGURINHAS DA NUVEM

async function renderFileList() {
    const { data: stickers, error } = await supabaseClient
        .from("stickers")
        .select("id, name, pack_id, image_path, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar figurinhas:", error);
        fileList.innerHTML = `
            <p class="empty-message">
                Erro ao carregar figurinhas.
            </p>
        `;
        return;
    }

    fileList.innerHTML = "";
    updateFileCount(stickers.length);

    if (stickers.length === 0) {
        fileList.innerHTML = `
            <p class="empty-message">
                Nenhuma figurinha importada ainda.
            </p>
        `;
        return;
    }

    for (const sticker of stickers) {
        const card = document.createElement("div");
        card.className = "file-card";

        const image = document.createElement("img");
        image.alt = sticker.name;

        const { data: signedData, error: signedError } =
            await supabaseClient.storage
                .from("stickers")
                .createSignedUrl(sticker.image_path, 3600);

        if (signedError) {
            console.error("Erro ao gerar imagem:", signedError);
            image.alt = "Imagem indisponível";
        } else {
            image.src = signedData.signedUrl;
        }

        const name = document.createElement("p");
        name.textContent = sticker.name;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Excluir";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", () => {
            deleteSticker(sticker);
        });

        card.append(image, name, deleteButton);
        fileList.appendChild(card);
    }
}

// EXCLUIR FIGURINHA

async function deleteSticker(sticker) {
    if (!confirm(`Deseja excluir "${sticker.name}"?`)) return;

    try {
        // Primeiro remove o arquivo do Storage.

        const { error: storageError } = await supabaseClient
            .storage
            .from("stickers")
            .remove([sticker.image_path]);

        if (storageError) throw storageError;

        // Depois remove o registro.

        const { error: databaseError } = await supabaseClient
            .from("stickers")
            .delete()
            .eq("id", sticker.id);

        if (databaseError) throw databaseError;

        await renderFileList();

        window.dispatchEvent(new Event("stickerhub:updated"));

    } catch (error) {
        console.error("Erro ao excluir figurinha:", error);
        alert(`Não foi possível excluir: ${error.message}`);
    }
}

// ATUALIZAÇÕES

window.addEventListener("stickerhub:updated", () => {
    renderCollectionOptions();
    renderFileList();
});

// INICIALIZAÇÃO

async function initializeImport() {
    try {
        await renderCollectionOptions();
        await renderFileList();

        console.log("Importação Supabase iniciada! ☁️");

    } catch (error) {
        console.error("Erro ao iniciar importação:", error);
        alert("Não foi possível iniciar a importação.");
    }
}

initializeImport();
