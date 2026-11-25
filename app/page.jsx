import { salao, linkAgendar, canalAgendar } from "../content/salao";

const ext = { target: "_blank", rel: "noopener" };

export default function Home() {
  const agendar = linkAgendar();

  return (
    <>
      <header className="topo">
        <a href="#inicio" className="marca" aria-label="Ricca Fibras, início">
          <img src="/monograma.webp" alt="" width="36" height="36" />
          <span>Ricca Fibras</span>
        </a>
        <a className="topo-agendar" href={agendar} {...ext}>
          Agendar
        </a>
      </header>

      <main id="inicio">
        <section className="capa">
          <figure className="capa-foto">
            <img
              src="/ricca-capa.webp"
              alt="A profissional da Ricca Fibras no salão, com o logo dourado ao fundo"
              width="720"
              height="1279"
              fetchPriority="high"
            />
          </figure>
          <div className="capa-texto">
            <h1>{salao.titulo}</h1>
            <p>{salao.frase}</p>
            <div className="capa-acoes">
              <a className="botao-ouro" href={agendar} {...ext}>
                Agendar pelo {canalAgendar}
              </a>
              <a className="link-claro" href="#servicos">
                Ver serviços
              </a>
            </div>
          </div>
        </section>

        <section id="servicos" className="servicos">
          <div className="largura">
            <h2>Serviços</h2>
            <ul>
              {salao.servicos.map((s) => (
                <li key={s.nome}>
                  <div className="servico-linha">
                    <h3>{s.nome}</h3>
                    <span className="preco">{s.preco || "Sob consulta"}</span>
                  </div>
                  <p>{s.descricao}</p>
                  {s.manutencaoDias && (
                    <p className="ciclo">Manutenção a cada {s.manutencaoDias} dias</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ritual">
          <img className="marca-dagua" src="/monograma.webp" alt="" aria-hidden="true" />
          <div className="largura">
            <h2>Sua unha sempre impecável</h2>
            <p className="ritual-intro">
              Cada serviço tem o seu tempo de manutenção. A gente acompanha esse prazo por você.
            </p>
            <ol>
              <li>
                <h3>Você faz o serviço</h3>
                <p>Registramos a data e o tipo de unha ou sobrancelha.</p>
              </li>
              <li>
                <h3>Avisamos antes do prazo</h3>
                <p>Alguns dias antes da manutenção vencer, você recebe uma mensagem.</p>
              </li>
              <li>
                <h3>Você volta no tempo certo</h3>
                <p>Sem unha descolando e sem correr atrás de horário.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="visita">
          <div className="largura visita-grade">
            <div>
              <h2>Horários</h2>
              <dl>
                {salao.horarios.map((h) => (
                  <div key={h.dias}>
                    <dt>{h.dias}</dt>
                    <dd>{h.horas}</dd>
                  </div>
                ))}
              </dl>
              {salao.endereco && (
                <p className="endereco">
                  {salao.endereco}
                  <br />
                  {salao.bairroCidade}
                  <br />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${salao.endereco} ${salao.bairroCidade}`
                    )}`}
                    {...ext}
                  >
                    Abrir no mapa
                  </a>
                </p>
              )}
            </div>
            <div>
              <h2>Trabalhos</h2>
              <p>Os resultados mais recentes estão no Instagram.</p>
              <a className="botao-contorno" href={`https://instagram.com/${salao.instagram}`} {...ext}>
                @{salao.instagram}
              </a>
            </div>
          </div>
        </section>

        <section className="instalar">
          <div className="largura">
            <h2>Ricca Fibras no seu celular</h2>
            <p>
              <strong>iPhone:</strong> toque em Compartilhar e depois em “Adicionar à Tela de Início”.
            </p>
            <p>
              <strong>Android:</strong> abra o menu do navegador e toque em “Instalar app”.
            </p>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="largura rodape-grade">
          <img src="/monograma.webp" alt="" width="56" height="56" />
          <p className="rodape-nome">Ricca Fibras</p>
          <p className="rodape-links">
            <a href={`https://instagram.com/${salao.instagram}`} {...ext}>Instagram</a>
            {salao.whatsapp && <a href={agendar} {...ext}>WhatsApp</a>}
          </p>
        </div>
      </footer>

      <div className="barra-agendar">
        <a className="botao-ouro" href={agendar} {...ext}>
          Agendar pelo {canalAgendar}
        </a>
      </div>
    </>
  );
}
