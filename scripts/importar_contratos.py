#!/usr/bin/env python3
"""
Importa contratos de armazenagem do Excel (TOTVS) para o PCP Online.
Uso: python scripts/importar_contratos.py --url http://localhost:3000 --excel Downloads/contratos.xlsx
"""
import argparse, sys, json, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime

try:
    import openpyxl
except ImportError:
    sys.exit("Instale openpyxl: pip install openpyxl")

def carregar_excel(caminho: str) -> list[dict]:
    wb = openpyxl.load_workbook(caminho, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Linha 2 = cabeçalhos; dados a partir da linha 3
    contratos = []
    for row in rows[2:]:
        if not row[1]:  # sem número de contrato
            continue
        numero       = str(row[1]).strip()
        ult_alt      = str(row[2]).strip() if row[2] else None
        descricao    = str(row[3]).strip() if row[3] else ""
        tipo_mercado = str(row[4]).strip() if row[4] else None
        data_ctr     = row[5].isoformat() if isinstance(row[5], datetime) else None
        ctr_externo  = str(row[6]).strip() if row[6] else None
        cod_entidade = str(row[7]).strip() if row[7] else None
        loj_entidade = str(row[8]).strip() if row[8] else None
        # Usa nome longo (col 9), senão nome curto (col 10)
        cliente_nome = str(row[9] or row[10] or "").strip()
        # Limpar nome da filial do início da descrição de entidade se vier junto
        safra        = str(row[11]).strip() if row[11] else None
        cod_produto  = str(row[13]).strip() if row[13] else None
        des_produto  = str(row[14]).strip() if row[14] else ""
        desc_tabela  = str(row[15]).strip() if row[15] else None
        qtd_contrat  = float(row[16]) if row[16] else 0.0
        sts_assin    = str(row[17]).strip() if row[17] else "Aberto"
        sts_fiscal   = str(row[18]).strip() if row[18] else "Aberto"
        sts_financ   = str(row[19]).strip() if row[19] else "Aberto"
        sts_estoq    = str(row[20]).strip() if row[20] else "Aberto"
        modalidade   = str(row[22]).strip() if row[22] else None
        centro_custo = str(row[32]).strip() if row[32] else None

        contratos.append({
            "numero":        numero,
            "ultAlt":        ult_alt,
            "descricao":     descricao,
            "tipoMercado":   tipo_mercado,
            "dataCtr":       data_ctr,
            "ctrExterno":    ctr_externo,
            "codEntidade":   cod_entidade,
            "lojEntidade":   loj_entidade,
            "clienteNome":   cliente_nome,
            "codProduto":    cod_produto,
            "desProduto":    des_produto,
            "descTabela":    desc_tabela,
            "qtdContratada": qtd_contrat,
            "safra":         safra,
            "stsAssinatura": sts_assin,
            "stsFiscal":     sts_fiscal,
            "stsFinanceiro": sts_financ,
            "stsEstoque":    sts_estoq,
            "modalidade":    modalidade,
            "centroCusto":   centro_custo,
        })
    return contratos

def importar(url: str, contratos: list[dict], cookie: str = "") -> None:
    endpoint = f"{url.rstrip('/')}/api/contratos"
    # Enviar em lotes de 50
    lote_size = 50
    total = len(contratos)
    criados = atualizados = 0

    for i in range(0, total, lote_size):
        lote = contratos[i:i+lote_size]
        payload = json.dumps({"contratos": lote}).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Cookie": cookie,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read())
                criados    += data.get("criados", 0)
                atualizados += data.get("atualizados", 0)
                print(f"  Lote {i//lote_size+1}: +{data.get('criados',0)} criados, ~{data.get('atualizados',0)} atualizados")
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"  ERRO {e.code}: {body}")
            sys.exit(1)

    print(f"\nImportação concluída: {criados} criados, {atualizados} atualizados (total={total})")

def main():
    ap = argparse.ArgumentParser(description="Importa contratos TOTVS → PCP Online")
    ap.add_argument("--url",   default="http://localhost:3000", help="URL do servidor")
    ap.add_argument("--excel", required=True, help="Caminho do arquivo Excel")
    ap.add_argument("--cookie", default="", help="Cookie de sessão (next-auth.session-token=...)")
    args = ap.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        sys.exit(f"Arquivo não encontrado: {excel_path}")

    print(f"Lendo {excel_path}...")
    contratos = carregar_excel(str(excel_path))
    print(f"{len(contratos)} contratos carregados do Excel.")

    print(f"Enviando para {args.url}...")
    importar(args.url, contratos, args.cookie)

if __name__ == "__main__":
    main()
