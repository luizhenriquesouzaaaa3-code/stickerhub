const SUPABASE_URL = "https://etzeumuwhyxxxwtcwfgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_5xn3mhOoC6iDkFY1wnR27g_t_ngcLam";

// Inicialização do Supabase
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Verificar sessão atual
async function verificarSessao() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Erro ao verificar sessão:", error.message);
        return null;
    }

    return data.session;
}

// Verificar se o usuário é administrador
async function verificarAdmin() {
    const session = await verificarSessao();

    if (!session || !session.user) {
        console.warn("Nenhuma sessão de usuário encontrada.");
        return false;
    }

    console.log("Usuário logado ID:", session.user.id);

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle(); // maybeSingle evita que o código quebre ou trave se a linha não existir

    if (error) {
        console.error("Erro ao verificar administrador:", error.message);
        return false;
    }

    if (!data) {
        console.warn("Nenhum perfil encontrado na tabela 'profiles' para este usuário.");
        return false;
    }

    console.log("Role do usuário encontrado:", data.role);
    return data.role === "admin";
}

// Encerrar sessão
async function sairDaConta() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error.message);
        return false;
    }

    return true;
}

console.log("StickerHub conectado ao Supabase! 🚀");