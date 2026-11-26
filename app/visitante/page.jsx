import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";
import ListaServicos from "../../components/ListaServicos";
import StatusAberto from "../../components/StatusAberto";
import { BotaoConta, RodapeVisitante } from "../../components/ContaVisitante";
import { SoNoTema } from "../../components/TemaSazonal";
import {
  IconeConversa,
  IconeBrilho,
  IconeCurso,
  IconeCamera,
  IconeRelogio,
  IconeCalendario,
  IlustracaoServico,
} from "../../components/Icones";
import { linkAgendar } from "../../lib/empresa";
import { carregarCatalogo } from "../../lib/servicos";
import { empresaDoPedido, hostDoPedido } from "../../lib/empresaServidor";
import { LogoDe } from "../../components/Empresa";

export async function generateMetadata() {
  const s = await empresaDoPedido();
  return { title: `Serviços e valores — ${s?.nome || ""}` };
}

const ext = { target: "_blank", rel: "noopener" };

export default async function Visitante() {
  const salao = await empresaDoPedido();
  const servicos = await carregarCatalogo(await hostDoPedido(), salao.slug === "rica");
  const m = salao.modulos;
  return (
    <div className="app app-visitante">
      <BarraTopo
        voltar="/"
        sobreposta
        direita={<BotaoConta />}
      />

      <section className="v-capa">
        {salao.fotoCapa ? (
          <img
            className="v-capa-foto"
            src={salao.fotoCapa}
            alt={`${salao.contato}, da ${salao.nome}`}
            width="720"
            height="1080"
            fetchPriority="high"
          />
        ) : (
          <div className="v-capa-marca" aria-hidden="true">
            <LogoDe salao={salao} tamanho={132} />
          </div>
        )}
        <div className="v-capa-texto entra">
          <SoNoTema>
            <p className="faixa-natal">Boas festas · garanta sua unha de Natal</p>
          </SoNoTema>
          <p className="v-capa-ola">{salao.ola}</p>
          <h1>{salao.titulo}</h1>
          <StatusAberto />
        </div>
      </section>

      <nav className="destaques entra" aria-label="Atalhos">
        {m.agenda && (
          <Link href="/agendar">
            <span className="destaque-anel"><IconeCalendario width="26" height="26" /></span>
            Agendar
          </Link>
        )}
        {salao.whatsapp && (
          <a href={linkAgendar(salao)} {...ext}>
            <span className="destaque-anel"><IconeConversa width="26" height="26" /></span>
            WhatsApp
          </a>
        )}
        <a href="#servicos">
          <span className="destaque-anel"><IconeBrilho width="26" height="26" /></span>
          Serviços
        </a>
        {m.curso && (
          <Link href="/curso">
            <span className="destaque-anel"><IconeCurso width="26" height="26" /></span>
            Curso
          </Link>
        )}
        {salao.instagram && (
          <a href={`https://instagram.com/${salao.instagram}`} {...ext}>
            <span className="destaque-anel"><IconeCamera width="26" height="26" /></span>
            Trabalhos
          </a>
        )}
        <a href="#horarios">
          <span className="destaque-anel"><IconeRelogio width="26" height="26" /></span>
          Horários
        </a>
      </nav>

      <main className="tela">
        <section id="servicos" className="bloco">
          <div className="bloco-cabeca">
            <h2>Serviços e valores</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <ListaServicos servicos={servicos} />
        </section>

        {(m.curso || m.rede) && (
        <section id="curso" className="bloco">
          <div className="bloco-cabeca">
            <h2>Para profissionais</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <div className="curso vidro">
            <div className="curso-topo">
              <span className="curso-arte" aria-hidden="true">
                <IlustracaoServico tipo="curso" tamanho={56} />
              </span>
              <div>
                <p className="curso-rotulo">Curso</p>
                <h3>{salao.curso.nome}</h3>
              </div>
            </div>
            <p>{salao.curso.descricao}</p>
            {m.curso && (
              <Link className="botao-linha" href="/curso">
                Conhecer o curso e as turmas
              </Link>
            )}
            {m.rede && (
              <Link className="link-claro curso-rede" href="/rede">
                Ver profissionais certificadas
              </Link>
            )}
          </div>
        </section>
        )}

        <section id="horarios" className="bloco">
          <div className="bloco-cabeca">
            <h2>Horários</h2>
            <span className="bloco-fio" aria-hidden="true" />
          </div>
          <ul className="horarios vidro">
            {salao.horarios.map((h) => (
              <li key={h.dias} className={h.abre == null ? "horario-fechado" : ""}>
                <span>{h.dias}</span>
                <span>{h.horas}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="v-rodape">
          <LogoDe salao={salao} tamanho={64} />
          <p>{salao.nome}</p>
          {salao.instagram && <span>@{salao.instagram}</span>}
          {salao.endereco && <span>{salao.endereco}{salao.bairroCidade ? `, ${salao.bairroCidade}` : ""}</span>}
        </footer>
      </main>

      <RodapeVisitante />
    </div>
  );
}
