import Link from "next/link";
import BarraTopo from "../../components/BarraTopo";
import ListaServicos from "../../components/ListaServicos";
import { IconeConversa, IconeBrilho, IconeCurso, IconeInstagram } from "../../components/Icones";
import { salao, linkAgendar } from "../../content/salao";

export const metadata = { title: "Serviços e valores — Rica Fibras" };

const ext = { target: "_blank", rel: "noopener" };

export default function Visitante() {
  return (
    <div className="app">
      <BarraTopo
        voltar="/"
        direita={
          <Link href="/entrar" className="barra-link">
            Entrar
          </Link>
        }
      />
      <main className="tela">
        <section className="boas-vindas">
          <h1>Olá! Que bom ter você aqui.</h1>
          <p className="tela-sub">
            Veja nossos serviços e fale com a {salao.contato} para agendar.
          </p>
        </section>

        <nav className="atalhos" aria-label="Atalhos">
          <a href={linkAgendar()} {...ext}>
            <IconeConversa />
            Falar com a atendente
          </a>
          <a href="#servicos">
            <IconeBrilho />
            Serviços e valores
          </a>
          <a href="#curso">
            <IconeCurso />
            Curso {salao.curso.nome}
          </a>
          <a href={`https://instagram.com/${salao.instagram}`} {...ext}>
            <IconeInstagram />
            Nossos trabalhos
          </a>
        </nav>

        <section id="servicos" className="bloco">
          <h2>Serviços e valores</h2>
          <ListaServicos />
        </section>

        <section id="curso" className="bloco">
          <h2>Curso {salao.curso.nome}</h2>
          <div className="cartao">
            <p>{salao.curso.descricao}</p>
            <a
              className="link-ouro"
              href={linkAgendar(`Oi, Luana! Quero saber sobre o curso ${salao.curso.nome}.`)}
              {...ext}
            >
              Saber datas e valores
            </a>
          </div>
        </section>

        <section className="bloco">
          <h2>Horários</h2>
          <ul className="grupo">
            {salao.horarios.map((h) => (
              <li key={h.dias} className="grupo-linha grupo-estatica">
                <span className="grupo-titulo">{h.dias}</span>
                <span className="grupo-valor">{h.horas}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <div className="acao-fixa">
        <a className="botao-ouro" href={linkAgendar()} {...ext}>
          <IconeConversa />
          Falar com a atendente
        </a>
      </div>
    </div>
  );
}
