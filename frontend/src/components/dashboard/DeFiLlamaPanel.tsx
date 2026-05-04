import { Database } from 'lucide-react';
import type { DeFiLlamaSummary } from '../../types';
import { formatCurrency, formatPercentage } from '../../lib/cryptoData';
import { MetricTooltip } from '../ui/MetricTooltip';

interface DeFiLlamaPanelProps {
  data: DeFiLlamaSummary | null;
}

export function DeFiLlamaPanel({ data }: DeFiLlamaPanelProps) {
  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-slate-100 text-lg">Saúde DeFi</h2>
            <MetricTooltip
              title="Saúde DeFi"
              description="Painel complementar que observa a infraestrutura DeFi por TVL, chains e protocolos. Ele ajuda a entender se há liquidez e atividade estrutural para além da variação de preço dos tokens."
              calculation="Consome dados públicos da DeFiLlama, incluindo TVL por chain, TVL por protocolo, categoria, chain principal e variação diária quando disponível."
              interpretation="TVL crescente sugere maior capital alocado ou valorização dos ativos depositados. TVL em queda pode apontar saída de liquidez, queda de preços ou redução de confiança em protocolos/chains."
              caveat="TVL não separa perfeitamente preço e fluxo. Uma alta de TVL pode ocorrer só porque os ativos depositados valorizaram, sem entrada real de novos usuários/capital."
              source="DeFiLlama."
              align="left"
              widthClass="w-96"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Fonte complementar: DeFiLlama</p>
        </div>
        <Database size={18} className="text-blue-400" />
      </div>

      {!data ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
          Dados DeFi indisponíveis no momento. O dashboard principal continua funcionando com CoinGecko.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-500">Top chains por TVL</h3>
              <MetricTooltip
                title="Top chains por TVL"
                description="Lista das blockchains com maior valor total alocado em aplicações DeFi. Ajuda a mostrar onde a liquidez DeFi está mais concentrada."
                calculation="Ordenação das chains por TVL em dólar, usando os dados públicos retornados pela DeFiLlama."
                interpretation="Chains com TVL alto concentram mais capital em protocolos. A variação 24h ajuda a detectar deslocamento de liquidez ou estresse recente."
                caveat="TVL alto não significa necessariamente melhor experiência, maior segurança ou melhor desempenho do token da chain."
                source="DeFiLlama."
                align="left"
              />
            </div>
            <div className="space-y-2">
              {data.topChains.map((chain) => (
                <div key={chain.name} className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-200">{chain.name}</span>
                    <span className="text-sm font-mono text-slate-300">{formatCurrency(chain.tvl, true)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    24h: {chain.change24h == null ? 'N/A' : formatPercentage(chain.change24h)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs uppercase tracking-wider text-slate-500">Top protocolos</h3>
              <MetricTooltip
                title="Top protocolos"
                description="Lista dos maiores protocolos DeFi por valor alocado. Serve para observar quais aplicações sustentam a liquidez do ecossistema."
                calculation="Ordenação dos protocolos por TVL em dólar, incluindo categoria, chain principal e variação diária quando disponível."
                interpretation="Protocolos com grande TVL tendem a ter papel estrutural na liquidez DeFi. Variações diárias muito negativas podem sugerir saída de capital ou reação a eventos específicos."
                caveat="TVL não mede segurança do protocolo, qualidade de auditoria, risco de smart contract ou risco de governança."
                source="DeFiLlama."
              />
            </div>
            <div className="space-y-2">
              {data.topProtocols.map((protocol) => (
                <div key={protocol.name} className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-200 truncate">{protocol.name}</span>
                    <span className="text-sm font-mono text-slate-300 flex-shrink-0">{formatCurrency(protocol.tvl, true)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {protocol.category} · {protocol.chain} · 24h: {protocol.change1d == null ? 'N/A' : formatPercentage(protocol.change1d)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
