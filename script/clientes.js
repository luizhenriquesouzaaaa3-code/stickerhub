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
const newClientPasswordInput = document.getElementById("newClientPassword");

// 1. CADASTRAR NOVO CLIENTE DIRETAMENTE PELO PAINEL
if (registerClientButton) {
    registerClientButton.addEventListener("click", async () => {
        const email = newClientEmailInput.value.trim();
        const name = newClientNameInput ? newClientNameInput.value.trim() : "";
        const password = newClientPasswordInput ? newClientPasswordInput.value.trim() : "";

        if (!email || !password) {
            alert("Por favor, preencha o e-mail e uma senha inicial (mínimo 6 caracteres) para o cliente.");
            return;
        }

        if (password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        registerClientButton.disabled = true;
        registerClientButton.textContent = "Cadastrando...";

        try {
            // Guarda a sessão atual do admin para não ser deslogado caso o signUp troque o token local
            const { data: adminSessionData } = await supabaseClient.auth.getSession();
            const adminSession = adminSessionData?.session;

            // Cria o usuário no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { name: name }
                }
            });

            if (authError) throw authError;

            // Restaura a sessão do admin imediatamente se o Supabase tiver trocado para o novo usuário
            if (adminSession) {
                await supabaseClient.auth.setSession({
                    access_token: adminSession.access_token,
                    refresh_token: adminSession.refresh_token
                });
            }

            // Garante que o perfil esteja salvo na tabela profiles com o ID gerado
            if (authData && authData.user) {
                const { error: profileError } = await supabaseClient
                    .from("profiles")
                    .upsert([
                        { 
                            id: authData.user.id, 
                            email: email, 
                            name: name 
                        }
                    ]);

                if (profileError) {
                    console.warn("Aviso ao atualizar tabela profiles:", profileError.message);
                }
            }

            alert(`Cliente cadastrado com sucesso! 🌸\nE-mail: ${email}\nSenha: ${password}`);
            
            // Limpa os campos
            newClientEmailInput.value = "";
            if (newClientNameInput) newClientNameInput.value = "";
            if (newClientPasswordInput) newClientPasswordInput.value = "";

            // Recarrega a lista de clientes
            setTimeout(() => carregarClientesEfetivos(), 500);

        } catch (error) {
            console.error("Erro ao cadastrar cliente:", error);
            if (error.message && error.message.includes("already registered")) {
                alert("Este e-mail já está cadastrado no sistema!");
            } else {
                alert(`Erro ao cadastrar: ${error.message || "Verifique as configurações do Supabase."}`);
            }
        } finally {
            registerClientButton.disabled = false;
            registerClientButton.textContent = "Cadastrar cliente";
        }
    });
}

// 2. CARREGAR CLIENTES PARA O SELECT E PARA A LISTA (FILTRANDO O ADMIN)
async function carregarClientesEfetivos() {
    if (!customerSelect && !customerList) return;

    try {
        // Pega o usuário logado atualmente (Admin) para excluí-lo da lista automaticamente
        const { data: userData } = await supabaseClient.auth.getUser();
        const adminLogado = userData?.user;

        const { data: perfis, error } = await supabaseClient
            .from("profiles")
            .select("*");

        if (error) throw error;

        // Filtra removendo:
        // - Quem tem o mesmo ID ou e-mail do admin logado agora
        // - Quem tiver role === 'admin' ou is_admin === true na tabela profiles
        const apenasClientes = perfis.filter(perfil => {
            if (adminLogado && (perfil.id === adminLogado.id || perfil.email === adminLogado.email)) {
                return false;
            }
            if (perfil.role === "admin" || perfil.is_admin === true) {
                return false;
            }
            return true;
        });

        if (customerCount) {
            customerCount.textContent = `${apenasClientes.length} cliente${apenasClientes.length === 1 ? '' : 's'}`;
        }

        // Preenche o Select de clientes (sem o admin)
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Selecione um cliente</option>';
            apenasClientes.forEach(cliente => {
                const option = document.createElement("option");
                option.value = cliente.id;
                option.textContent = cliente.name ? `${cliente.name} (${cliente.email})` : cliente.email;
                customerSelect.appendChild(option);
            });
        }

        // Renderiza a lista visual de clientes (sem o admin)
        if (customerList) {
            customerList.innerHTML = "";
            if (apenasClientes.length === 0) {
                customerList.innerHTML = '<p class="empty-message">Nenhum cliente cadastrado ainda.</p>';
                return;
            }

            apenasClientes.forEach(cliente => {
                const card = document.createElement("div");
                card.className = "file-item";
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
