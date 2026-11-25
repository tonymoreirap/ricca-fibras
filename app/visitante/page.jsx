import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";
import ListaServicos from "../../components/ListaServicos";
import StatusAberto from "../../components/StatusAberto";
import { BotaoConta, RodapeVisitante } from "../../components/ContaVisitante";
import {
  IconeConversa,
  IconeBrilho,
  IconeCurso,
  IconeCamera,
  IconeRelogio,
  IconeCalendario,
  IlustracaoServico,
} from "../../components/Icones";
import { salao, linkAgendar } from "../../content/salao";

export const metadata = { title: "Serviços e valores — Rica Fibras" };

const ext = { target: "_blank", rel: "noopener" };

export default function Visitante() {
  return (
    <div className="app app-visitante">
      <BarraTopo
        voltar="/"
        sobreposta
        direita={<BotaoConta />}
      />

      <section className="v-capa">
        <img
          className="v-capa-foto"
          src="/rica-fundo.webp"
          alt="Luana, da Rica Fibras"
          width="720"
          height="1080"
          fetchPriority="high"
        />
        <div className="v-capa-texto entra">
          <p className="v-capa-ola">Olá, seja bem-vinda</p>
          <h1>Fibra de vidro com acabamento de joia.</h1>
          <StatusAberto />
        </div>
      </section>

      <nav className="destaques entra" aria-label="Atalhos">
        <Link href="/agendar">
          <span className="destaque-anel"><IconeCalendario width="26" height="26" /></span>
          Agendar
        </Link>
        <a href={linkAgendar()} {...ext}>
          <span className="destaque-anel"><IconeConversa width="26" height="26" /></span>
          WhatsApp
        </a>
        <a href="#servicos">
          <span className="destaque-anel"><IconeBrilho width="26" height="26" /></span>
          Serviços
        </a>
        <a href="#curso">
          <span className="destaque-anel"><IconeCurso width="26" height="26" /></span>
          Curso
        </a>
        <a href={`https://instagram.com/${salao.instagram}`} {...ext}>
          <span className="destaque-anel"><IconeCamera width="26" height="26" /></span>
          Trabalhos
        </a>
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
          <ListaServicos />
        </section>

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
            <a
              className="botao-linha"
              href={linkAgendar(`Oi, Luana! Quero saber sobre o curso ${salao.curso.nome}.`)}
              {...ext}
            >
              Quero saber datas e valores
            </a>
          </div>
        </section>

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
          <img src="/monograma.webp" alt="" width="64" height="64" />
          <p>Rica Fibras</p>
          <span>@{salao.instagram}</span>
        </footer>
      </main>

      <RodapeVisitante />
    </div>
  );
}
