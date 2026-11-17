/* =========================================
   STICKERHUB - GERENCIAMENTO DE CLIENTES
========================================= */

const customerSelect = document.getElementById("customerSelect");
const customerPackSelect = document.getElementById("customerPackSelect");
const grantAccessButton = document.getElementById("grantAccessButton");

const customerList = document.getElementById("customerList");
const customerCount = document.getElementById("customerCount");
const customerStatus = document.getElementById("customerStatus");

// Variável global para manter a lista de clientes em cache para recarregamentos
let allCustomers = [];

// CARREGAR CLIENTES

async function loadCustomers() {
    customerList.innerHTML =
    '<p class="empty-message">Buscando clientes...</p>';
    console.log("LOAD CUSTOMERS FOI EXECUTADA!");

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("ERRO AO BUSCAR CLIENTES:", error);
        customerStatus.textContent = error.message;
        return;
    }

    console.log("CLIENTES RECEBIDOS DO SUPABASE:", data);

    allCustomers = data || []; // Salva na variável global

    customerSelect.innerHTML = '<option value="">Selecione um cliente</option>';

    allCustomers.forEach(customer => {
        const option = document.createElement("option");
        option.value = customer.id;
        option.textContent = customer.full_name || customer.email;
        customerSelect.appendChild(option);
    });

    await renderCustomers(allCustomers);
}

// CARREGAR PACOTES

async function loadCustomerPacks() {
    customerPackSelect.innerHTML =
    '<option value="">Buscando pacotes...</option>';
    const { data, error } = await supabaseClient
        .from("packs")
        .select("id, name")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        customerPackSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        return;
    }

    customerPackSelect.innerHTML = '<option value="">Selecione um pacote</option>';

    data.forEach(pack => {
        const option = document.createElement("option");
        option.value = pack.id;
        option.textContent = pack.name;
        customerPackSelect.appendChild(option);
    });
}

// RENDERIZAR CLIENTES

async function renderCustomers(customers) {
    customerList.innerHTML = "";

    customerCount.textContent =
        `${customers.length} cliente${customers.length !== 1 ? "s" : ""}`;

    if (customers.length === 0) {
        customerList.innerHTML =
            '<p class="empty-message">Nenhum cliente cadastrado.</p>';
        return;
    }

    const { data: accesses, error } = await supabaseClient
        .from("user_packs")
        .select("id, user_id, pack_id, packs(name)");

    if (error) {
        console.error(error);
        return;
    }

    customers.forEach(customer => {
        const card = document.createElement("div");
        card.className = "customer-card";

        const name = document.createElement("h3");
        name.textContent = customer.full_name || "Cliente";

        const email = document.createElement("p");
        email.textContent = customer.email;

        const packages = document.createElement("div");
        packages.className = "customer-packages";

        const customerAccesses = accesses.filter(
            access => access.user_id === customer.id
        );

        if (customerAccesses.length === 0) {
            packages.textContent = "Nenhum pacote liberado.";
        } else {
            customerAccesses.forEach(access => {
                const row = document.createElement("div");
                row.className = "customer-access-row";

                const packName = document.createElement("span");
                packName.textContent = access.packs?.name || "Pacote";

                const revokeButton = document.createElement("button");
                revokeButton.textContent = "Revogar";
                revokeButton.className = "revoke-button";
                revokeButton.type = "button"; // Evita comportamento de submit indesejado

                revokeButton.addEventListener("click", () => {
                    revokeAccess(access.id);
                });

                row.append(packName, revokeButton);
                packages.appendChild(row);
            });
        }

        card.append(name, email, packages);
        customerList.appendChild(card);
    });
}

// LIBERAR ACESSO

async function grantAccess() {
    const userId = customerSelect.value;
    const packId = customerPackSelect.value;

    customerStatus.textContent = "";

    if (!userId || !packId) {
        customerStatus.textContent = "Selecione um cliente e um pacote.";
        return;
    }

    const { error } = await supabaseClient
        .from("user_packs")
        .insert({
            user_id: userId,
            pack_id: packId
        });

    if (error) {
    console.error("ERRO AO LIBERAR ACESSO:", error);

    customerStatus.textContent =
        `Erro: ${error.message}`;

    return;
}

    customerStatus.textContent = "Acesso liberado com sucesso! 💗";

    await loadCustomers();
}

// REVOGAR ACESSO

async function revokeAccess(accessId) {
    const confirmed = confirm("Deseja realmente revogar esse acesso?");

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("user_packs")
        .delete()
        .eq("id", accessId);

    if (error) {
        console.error(error);
        alert("Não foi possível revogar o acesso.");
        return;
    }

    // Usa a lista global em cache para re-renderizar sem precisar refazer a query de perfis
    await renderCustomers(allCustomers);
}

// INICIALIZAÇÃO

async function initializeCustomerManagement() {
    // Executar somente na página administrativa
    if (!customerList || !customerStatus ||
        !customerSelect || !customerPackSelect) {
        return;
    }

    try {
        customerStatus.textContent = "Carregando gerenciamento...";

        const isAdmin = await verificarAdmin();

        if (!isAdmin) {
            customerStatus.textContent = "Acesso não autorizado.";
            customerList.textContent = "Acesso não autorizado.";
            return;
        }

        await Promise.all([
            loadCustomers(),
            loadCustomerPacks()
        ]);

        customerStatus.textContent = "";

    } catch (error) {
        console.error("ERRO AO INICIALIZAR CLIENTES:", error);

        customerStatus.textContent =
            "Erro ao carregar: " + error.message;

        customerList.textContent =
            "Não foi possível carregar os clientes.";

        customerPackSelect.innerHTML =
            '<option value="">Erro ao carregar pacotes</option>';
    }
}

if (grantAccessButton) {
    grantAccessButton.addEventListener("click", grantAccess);
}

console.count("INICIALIZAÇÃO DO GERENCIAMENTO");

initializeCustomerManagement();