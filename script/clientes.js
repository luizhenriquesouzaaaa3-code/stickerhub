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

        // Filtra removendo o admin logado ou quem tiver role/flag de admin
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

        // Renderiza a lista visual de clientes com o botão de excluir
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
                    <button class="btn-excluir-cliente" onclick="excluirCliente('${cliente.id}', '${cliente.email}')" style="background-color: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; font-weight: 600;">
                        🗑️ Excluir
                    </button>
                `;
                customerList.appendChild(card);
            });
        }

    } catch (error) {
        console.error("Erro ao carregar clientes:",
