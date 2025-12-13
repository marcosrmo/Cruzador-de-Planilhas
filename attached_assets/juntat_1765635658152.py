import pandas as pd
import os
import unicodedata
import difflib

# Caminho da pasta onde estão os arquivos
pasta = r'C:\Users\ADMINISTRAÇÃO\3D Objects\PROJETO JUNTAR'

# Caminhos fixos para os arquivos
arquivo_com_telefone = os.path.join(pasta, 'arquivo_com_telefone.xlsx')
arquivo_sem_telefone = os.path.join(pasta, 'arquivo_sem_telefone.xlsx')

# Função para normalizar textos
def normalizar_texto(texto):
    texto = str(texto).strip().lower()
    texto = ' '.join(texto.split())
    texto = ''.join(c for c in unicodedata.normalize('NFKD', texto) if not unicodedata.combining(c))
    return texto

# Função para encontrar coluna parecida com o padrão
def encontrar_coluna_similar(colunas, padrao):
    colunas_normalizadas = [normalizar_texto(c) for c in colunas]
    similares = difflib.get_close_matches(padrao, colunas_normalizadas, n=1, cutoff=0.7)
    if similares:
        index = colunas_normalizadas.index(similares[0])
        return colunas[index]
    return None

# Carrega os dados
df_com = pd.read_excel(arquivo_com_telefone)
df_sem = pd.read_excel(arquivo_sem_telefone)

# Identifica as colunas
col_nome_com = encontrar_coluna_similar(df_com.columns, 'nome')
col_telefone = encontrar_coluna_similar(df_com.columns, 'telefone')
col_nome_sem = encontrar_coluna_similar(df_sem.columns, 'nome')

if not col_nome_com or not col_telefone or not col_nome_sem:
    print("❌ ERRO: Não foi possível localizar as colunas de nome e telefone corretamente.")
else:
    # Renomeia as colunas para nomes padronizados
    df_com.rename(columns={col_nome_com: 'nome', col_telefone: 'telefone'}, inplace=True)
    df_sem.rename(columns={col_nome_sem: 'nome'}, inplace=True)

    # Remove linhas com nome nulo
    df_com = df_com[df_com['nome'].notnull()]
    df_sem = df_sem[df_sem['nome'].notnull()]

    # Normaliza os nomes
    df_com['nome_normalizado'] = df_com['nome'].apply(normalizar_texto)
    df_sem['nome_normalizado'] = df_sem['nome'].apply(normalizar_texto)

    # Faz merge para permitir múltiplos telefones
    df_resultado = pd.merge(
        df_sem[['nome', 'nome_normalizado']],
        df_com[['nome_normalizado', 'telefone']],
        on='nome_normalizado',
        how='left'
    )

    # Remove coluna auxiliar
    df_resultado.drop(columns=['nome_normalizado'], inplace=True)

    # Exporta
    caminho_saida = os.path.join(pasta, 'planilha_completa.xlsx')
    df_resultado.to_excel(caminho_saida, index=False)

    # Relatório
    if 'telefone' in df_resultado.columns:
        total = len(df_resultado)
        preenchidos = df_resultado['telefone'].notnull().sum()
        vazios = total - preenchidos

        print(f"\n✅ Planilha final criada: {caminho_saida}")
        print(f"📊 Total de linhas: {total}")
        print(f"📞 Telefones preenchidos: {preenchidos}")
        print(f"🚫 Sem telefone: {vazios}")
    else:
        print("⚠️ Nenhuma coluna 'telefone' foi encontrada no resultado final.")
