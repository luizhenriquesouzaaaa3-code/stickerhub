/* =========================================
   STICKERHUB - ÁREA DO CLIENTE
========================================= */

const packageList = document.getElementById("packageList");
const stickerSection = document.getElementById("stickerSection");
const logoutButton = document.getElementById("logoutButton");

let currentPackages = [];

// VERIFICAR CONTA

async function initializeClient() {
    if (!packageList || !stickerSection) return;

    try {
        const session = await verificarSessao();

        if (!session) {
            window.location.href = "index.html";
            return;
        }

        const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("role, full_name, email")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) throw error;

        if (!profile) {
            packageList.innerHTML = "<p>Perfil não encontrado no banco de dados.</p>";
            return;
        }

        // Permite acesso tanto para clientes quanto para administradores em teste
        if (profile.role !== "customer" && profile.role !== "admin") {
            window.location.href = "index.html";
            return;
        }

        const emailElement = document.getElementById("userEmail");

        if (emailElement) {
            emailElement.textContent = profile.email || session.user.email;
        }

        await loadCustomerPackages(session.user.id);

    } catch (error) {
        console.error("Erro ao inicializar cliente:", error);
        packageList.innerHTML = "<p>Não foi possível carregar sua conta: " + error.message + "</p>";
    }
}

// CARREGAR PACOTES LIBERADOS

async function loadCustomerPackages(userId) {
    packageList.innerHTML = "<p>Buscando seus pacotes...</p>";

    try {
        const { data, error } = await supabaseClient
            .from("user_packs")
            .select("pack_id, packs ( id, name )")
            .eq("user_id", userId);

        console.log("ID do usuário logado:", userId);
        console.log("Retorno bruto de user_packs:", data);

        if (error) throw error;

        currentPackages = (data || [])
            .filter(item => item.packs)
            .map(item => item.packs);

        const packageCount = document.getElementById("packageCount");
        if (packageCount) {
            const label = currentPackages.length === 1 ? "pacote" : "pacotes";
            packageCount.textContent = currentPackages.length + " " + label;
        }

        renderPackages();

    } catch (error) {
        console.error("Erro ao carregar pacotes:", error);
        packageList.innerHTML = "<p>Erro ao carregar pacotes: " + error.message + "</p>";
    }
}

// MOSTRAR PACOTES

function renderPackages() {
    packageList.innerHTML = "";

    if (currentPackages.length === 0) {
        packageList.innerHTML = '<p class="empty-message">Você ainda não possui pacotes liberados.</p>';
        return;
    }

    currentPackages.forEach(pack => {
        const card = document.createElement("div");
        card.className = "package-card";

        const title = document.createElement("h3");
        title.textContent = pack.name;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "open-package";
        button.textContent = "Ver figurinhas";

        button.addEventListener("click", () => {
            loadStickers(pack.id, pack.name);
        });

        card.append(title, button);
        packageList.appendChild(card);
    });
}

// CARREGAR FIGURINHAS

async function loadStickers(packId, packName) {
    stickerSection.hidden = false;
    stickerSection.innerHTML = "<p>Carregando figurinhas...</p>";

    stickerSection.scrollIntoView({
        behavior: "smooth"
    });

    try {
        const { data: stickers, error } = await supabaseClient
            .from("stickers")
            .select("id, name, image_path")
            .eq("pack_id", packId);

        if (error) throw error;

        stickerSection.innerHTML = "";

        const heading = document.createElement("h2");
        heading.textContent = packName;

        stickerSection.appendChild(heading);

        if (!stickers || stickers.length === 0) {
            stickerSection.innerHTML += '<p class="empty-message">Esse pacote ainda não possui figurinhas.</p>';
            return;
        }

        const grid = document.createElement("div");
        grid.className = "sticker-grid";

        let loadedCount = 0;

        for (const sticker of stickers) {
            const { data, error: urlError } = await supabaseClient
                .storage
                .from("stickers")
                .createSignedUrl(sticker.image_path, 3600);

            if (urlError) {
                console.error("Erro ao gerar URL:", sticker.name, urlError);
                continue;
            }

            const card = document.createElement("div");
            card.className = "sticker-card";

            const image = document.createElement("img");
            image.src = data.signedUrl;
            image.alt = sticker.name;
            image.loading = "lazy";

            image.addEventListener("error", () => {
                console.error("Falha ao exibir imagem:", sticker.name);
                image.alt = "Imagem indisponível";
            });

            const name = document.createElement("h3");
            name.textContent = sticker.name;

            const download = document.createElement("a");
            download.href = data.signedUrl;
            download.download = sticker.name;
            download.className = "download-button";
            download.textContent = "Baixar";

            card.append(image, name, download);
            grid.appendChild(card);

            loadedCount++;
        }

        if (loadedCount === 0) {
            stickerSection.innerHTML += "<p>Não foi possível carregar as imagens. Verifique as permissões do Storage.</p>";
            return;
        }

        stickerSection.appendChild(grid);

    } catch (error) {
        console.error("Erro ao carregar figurinhas:", error);
        stickerSection.innerHTML = "<p>Erro ao carregar figurinhas: " + error.message + "</p>";
    }
}

// SAIR DA CONTA

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        await sairDaConta();
        window.location.href = "index.html"; // Corrigido de login.html para index.html
    });
}

// INICIALIZAÇÃO

if (packageList && stickerSection) {
    initializeClient();
}