/* =========================================
   STICKERHUB - PAINEL ADMINISTRATIVO
   BACKEND: SUPABASE
========================================= */

// ELEMENTOS

const navItems = document.querySelectorAll(".nav-item");
const quickActions = document.querySelectorAll(".quick-action");
const sections = document.querySelectorAll(".admin-section");

const pageTitle = document.getElementById("pageTitle");

const stickerCount = document.getElementById("dashboardStickerCount");
const collectionCount = document.getElementById("dashboardCollectionCount");

const collectionList = document.getElementById("collectionList");

const storeNameInput = document.getElementById("storeName");
const saveSettingsButton = document.getElementById("saveSettings");

// TRAVA DE SEGURANÇA PARA O PAINEL ADMIN
async function protegerAdmin() {
    const session = await verificarSessao();

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    const isAdmin = await verificarAdmin();

    if (!isAdmin) {
        alert("Acesso restrito a administradores.");
        window.location.href = "clientes.html";
    }
}

// NAVEGAÇÃO

function showSection(sectionId) {
    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection) return;

    sections.forEach(section => section.classList.remove("active"));
    navItems.forEach(item => item.classList.remove("active"));

    selectedSection.classList.add("active");

    const selectedButton = document.querySelector(
        `.nav-item[data-section="${sectionId}"]`
    );

    if (selectedButton) selectedButton.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        stickers: "Figurinhas",
        collections: "Coleções",
        customers: "Clientes",
        settings: "Configurações"
    };

    pageTitle.textContent = titles[sectionId] || "StickerHub";

    if (sectionId === "dashboard" || sectionId === "collections") {
        updateDashboard();
    }
}

navItems.forEach(item => {
    item.addEventListener("click", () => {
        showSection(item.dataset.section);
    });
});

quickActions.forEach(button => {
    button.addEventListener("click", () => {
        showSection(button.dataset.section);
    });
});

// DASHBOARD

async function updateDashboard() {
    try {
        const [
            { data: stickers, error: stickerError },
            { data: packs, error: packError }
        ] = await Promise.all([
            supabaseClient.from("stickers").select("id, pack_id"),
            supabaseClient.from("packs").select("id, name")
        ]);

        if (stickerError) throw stickerError;
        if (packError) throw packError;

        stickerCount.textContent = stickers.length;
        collectionCount.textContent = packs.length;

        renderCollections(packs, stickers);

    } catch (error) {
        console.error("Erro ao atualizar dashboard:", error);
    }
}

// RENDERIZAR PACOTES

function renderCollections(packs, stickers) {
    if (!collectionList) return;

    collectionList.innerHTML = "";

    if (!packs || packs.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent = "Nenhum pacote criado ainda.";
        collectionList.appendChild(emptyMessage);
        return;
    }

    packs.forEach(pack => {
        const card = document.createElement("div");
        card.className = "collection-card";

        const title = document.createElement("h3");
        title.textContent = pack.name || "Sem nome";

        const total = stickers.filter(sticker => {
            return sticker.pack_id === pack.id;
        }).length;

        const description = document.createElement("p");
        description.textContent = `${total} figurinhas`;

        card.append(title, description);
        collectionList.appendChild(card);
    });
}

// CONFIGURAÇÕES

function loadSettings() {
    const savedName = localStorage.getItem("stickerhubStoreName");

    if (savedName && storeNameInput) {
        storeNameInput.value = savedName;
    }
}

function saveSettings() {
    if (!storeNameInput) return;

    const name = storeNameInput.value.trim();

    if (!name) {
        alert("Digite um nome para sua loja.");
        return;
    }

    localStorage.setItem("stickerhubStoreName", name);
    alert("Configurações salvas com sucesso! 💗");
}

if (saveSettingsButton) {
    saveSettingsButton.addEventListener("click", saveSettings);
}

// ATUALIZAÇÕES

window.addEventListener("stickerhub:updated", () => {
    updateDashboard();
});

// INICIALIZAÇÃO

protegerAdmin();
loadSettings();
updateDashboard();

// SAIR DA CONTA (ADMIN)
const adminLogoutButton = document.getElementById("adminLogoutButton");

if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", async () => {
        const confirmed = confirm("Deseja realmente sair do painel administrativo?");
        if (!confirmed) return;

        const success = await sairDaConta();
        if (success) {
            window.location.href = "index.html";
        } else {
            alert("Erro ao encerrar a sessão.");
        }
    });
}
