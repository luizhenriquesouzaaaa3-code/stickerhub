// =========================================
// GERENCIAMENTO DE CLIENTES E ACESSOS (USER_PACKS)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    carregarClientesEfetivos();
    carregarPacotesParaClientes();
});

// Elementos da tela
const customerSelect = document.getElementById("customerSelect");
const customerPackSelect = document.getElementById("customerPackSelect");
const grantAccessButton = document.getElementById("grantAccessButton");
const customerStatus = document.getElementById("customerStatus");
const customerList = document.getElementById("customerList");
const customerCount = document.getElementById("customerCount");

// Elementos de Cadastro de Cliente
const registerClientButton = document.getElementById("registerClientButton");
const newClientEmailInput = document.getElementById("newClientEmail");
const newClientNameInput = document.getElementById("newClientName");

// 1. CADASTRAR NOVO CLIENTE DIRETAMENTE PELO PAINEL
if (registerClientButton) {
    registerClientButton.addEventListener("click", async () => {
        const email = newClientEmailInput.value.trim();
        const name = newClientNameInput ? newClientNameInput.value.trim() : "";

        if (!email) {
            alert("Por favor, digite o e-mail do cliente.");
            return;
        }

        try {
            // Insere na tabela de perfis/clientes do Supabase 
            // (Caso sua tabela de clientes use outro nome, ajuste 'profiles' para o nome correto)
            const { error } = await supabaseClient
                .from("profiles")
                .insert([{ email: email, name: name }]);

            if (error) throw error;

            alert("Cliente cadastrado com sucesso! 🌸");
            
            // Limpa os campos
            newClientEmailInput.value = "";
            if (newClientNameInput) newClientNameInput.value = "";

            // Recarrega a lista de clientes
            carregarClientesEfetivos();

        } catch (error) {
            console.error("Erro ao cadastrar cliente:", error);
            alert("Erro ao cadastrar cliente. Verifique se o e-mail já existe ou as permissões no Supabase.");
        }
    });
}

// 2. CARREGAR CLIENTES PARA O SELECT E PARA A LISTA
async function carregarClientesEfetivos() {
    if (!customerSelect && !customerList) return;

    try {
        const { data: clientes, error } = await supabaseClient
            .from("profiles")
            .select("*");

        if (error) throw error;

        if (customerCount) {
            customerCount.textContent = `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`;
        }

        // Preenche o Select de clientes
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Selecione um cliente</option>';
            clientes.forEach(cliente => {
                const option = document.createElement("option");
                option.value = cliente.id;
                option.textContent = cliente.name ? `${cliente.name} (${cliente.email})` : cliente.email;
                customerSelect.appendChild(option);
            });
        }

        // Renderiza a lista visual de clientes
        if (customerList) {
            customerList.innerHTML = "";
            if (clientes.length === 0) {
                customerList.innerHTML = '<p class="empty-message">Nenhum cliente cadastrado ainda.</p>';
                return;
            }

            clientes.forEach(cliente => {
                const card = document.createElement("div");
                card.className = "file-item"; // Reaproveita o estilo padrão de listagem
                card.style.display = "flex";
                card.style.justifyContent = "space-between";
                card.style.alignItems = "center";
                card.style.padding = "10px";
                card.style.marginBottom = "8px";
                card.style.background = "#fff";
                card.style.borderRadius = "8px";
                card.style.border = "1px solid #eee";

                card.innerHTML = `
                    <div>
                        <strong>${cliente.name || 'Sem nome'}</strong><br>
                        <small style="color: #666;">${cliente.email}</small>
                    </div>
                `;
                customerList.appendChild(card);
            });
        }

    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        if (customerList) {
            customerList.innerHTML = '<p class="empty-message">Erro ao carregar clientes.</p>';
        }
    }
}

// 3. CARREGAR PACOTES DISPONÍVEIS PARA O SELECT
async function carregarPacotesParaClientes() {
    if (!customerPackSelect) return;

    try {
        const { data: packs, error } = await supabaseClient
            .from("packs")
            .select("id, name");

        if (error) throw error;

        customerPackSelect.innerHTML = '<option value="">Selecione um pacote</option>';
        packs.forEach(pack => {
            const option = document.createElement("option");
            option.value = pack.id;
            option.textContent = pack.name || "Pacote sem nome";
            customerPackSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar pacotes para clientes:", error);
    }
}

// 4. LIBERAR ACESSO AO PACOTE (GRAVAR NA TABELA user_packs)
if (grantAccessButton) {
    grantAccessButton.addEventListener("click", async () => {
        const userId = customerSelect.value;
        const packId = customerPackSelect.value;

        if (!userId || !packId) {
            alert("Selecione um cliente e um pacote para liberar o acesso.");
            return;
        }

        if (customerStatus) customerStatus.textContent = "Liberando acesso...";

        try {
            const { error } = await supabaseClient
                .from("user_packs")
                .insert([{ user_id: userId, pack_id: packId }]);

            if (error) throw error;

            if (customerStatus) customerStatus.textContent = "Acesso liberado com sucesso! 🌸";
            alert("Acesso ao pacote liberado para o cliente com sucesso!");
            
            customerSelect.value = "";
            customerPackSelect.value = "";

        } catch (error) {
            console.error("Erro ao liberar acesso:", error);
            if (customerStatus) customerStatus.textContent = "Erro ao liberar acesso (já possui ou falha na permissão).";
            alert("Não foi possível liberar o acesso. Verifique se o cliente já possui este pacote liberado.");
        }
    });
}
